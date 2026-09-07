# Staging → Main data sync, preserving a fixed set of collections

**Goal:** replace `main`'s DB structure/data with `staging`'s, except keep
`main`'s **own pre-migration data** for a fixed preserve set of 5
collections — `directus_files`, `directus_users`, `global_configurations`,
`api_users`, `object_id_sequences` — then null out/reconcile any records
restored from staging that end up pointing at rows (mainly user ids) that
only existed on staging and don't exist in main's preserved data.

Worked example below is **staging → main**, since that's the direction most
recently requested and the riskiest (production). The same steps apply to
any other source → target pair (`dev`, `staging`, `main`, `local`) — just
swap the container names and dump filenames.

**This touches production. Do not run this without explicit go-ahead, and
log the change afterwards** (rule in `CLAUDE.md`) — check whether a
`MAIN_CHANGES/` tracker already exists in the repo; if not, use
[`STAGING_CHANGES/`](../STAGING_CHANGES/) as the format reference and create
an equivalent file for this run.

Execution model: SSH into the `main` server, `scp` the staging dump up to it,
and run every command **directly on the main box** (no piping over SSH from
your laptop). All commands use `docker exec` against the DB containers.

> **Note on live schema checks (2026-09-07):** the field/relation details for
> the 5 preserve-set collections below were confirmed live against
> `directus-staging` via MCP. The `directus-main` MCP server could not be
> reached this session (`401 Invalid credentials`) — its connection needs
> fixing before the schema-parity step below can be run via MCP against main.
> Until then, use the raw SQL `information_schema` queries in step 4, which
> work regardless of MCP access.

## Automated version: `migration-tool/`

Most of this is also automated by
[`migration-tool/migrate.js`](../migration-tool/) at the repo root
(`cd migration-tool && npm install && cp .env.example .env` first time, then
`node migrate.js`, interactive: target env → source env → dump → preserve
toggles → dry run or execute). As of this update, the tool only does
*partial* preservation for `directus_users` (API tokens by email match) and
`global_configurations` (rows by `entity_type`), and has no support yet for
`api_users` or `object_id_sequences`, or for a whole-table preserve of
`directus_users`. The manual procedure below is the current way to preserve
all 5 collections wholesale; if it gets ported into `migrate.js`, follow the
existing `buildTokenRestoreSql`/`buildGlobalConfigRestoreSql` pattern.

Dry run (the tool's default) restores into a disposable local container and
previews counts/parity/orphans without touching the live target — `main`
additionally requires typing a confirmation phrase to execute for real.

---

## The 5 preserved collections

| Collection | PK | Natural/unique key(s) | References out | Referenced by other tables? |
|---|---|---|---|---|
| `directus_files` | `uuid` | — | — | yes — ~15 known relations, listed in step 5 |
| `directus_users` | `uuid` | `email`, `token`, `external_identifier` (all unique) | `role`→`directus_roles`, `avatar`→`directus_files`, `partner_selected`→`partner` | **yes, extensively** — `user_created`/`user_updated` on nearly every collection, plus `directus_sessions`, `directus_activity`, `directus_revisions`, `directus_notifications`, `directus_comments`, `directus_shares`, `directus_access`, etc. |
| `global_configurations` | `integer` (sequence `global_configurations_id_seq`) | `entity` (unique) | `user_created`/`user_updated`→`directus_users` | no (confirmed via MCP `relations`, staging, 2026-09-07) |
| `api_users` | `uuid` | `token` (unique) | `partner_selected`→`partner`, `user_created`/`user_updated`→`directus_users` | no (confirmed via MCP `relations`, staging, 2026-09-07) |
| `object_id_sequences` | `uuid` | `collection` (unique) | none | no (confirmed via MCP `relations`, staging, 2026-09-07) |

`directus_users` is the odd one out: it's the only preserve-set collection
that lots of *other* tables point into. Restoring main's own users after the
staging dump lands means every row the staging dump brought in whose
`user_created`/`user_updated` points at a staging-only user id becomes an
orphan — across dozens of tables, not a fixed short list. Step 5 below finds
all of them with a query instead of a hand-maintained list.

`global_configurations` is the only preserve-set collection with an
`integer`/sequence PK instead of `uuid` — its sequence needs resyncing after
restore (step 9) or the next INSERT can collide with a restored id.

---

## Step 1 — Confirm access & container names

- [ ] SSH'd into the main server, shell can run `docker`.
- [ ] Confirm container names:
  ```bash
  docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}'
  ```
  Substitute the real names for `<main-db-container>` / `<main-directus-container>`
  everywhere below.
- [ ] Pick a low-traffic window; use maintenance mode if main has one.

---

## Step 2 — Full backup of main (rollback path)

Do this **before touching anything else** — this is what you restore from if
something goes wrong:

```bash
docker exec -i <main-db-container> pg_dump -U directus -d directus \
  > main_full_backup_$(date +%F).sql
```

Copy this off the server too (e.g. `scp` back to your laptop) — don't leave
it as the only copy on the box you're about to modify.

---

## Step 3 — Upload the staging dump to main

From your laptop:

```bash
scp files/dump_staging_<date>.sql <user>@<main-host>:~/dump_staging.sql
```

Use a fresh staging dump — check its date against what you actually want
main to end up with.

---

## Step 4 — Confirm schema/column parity for all 5 preserve-set collections

Do this **before** exporting anything — if staging and main have diverged on
any of these 5 tables' columns, the combined restore in step 9 will fail or
silently misalign columns. Don't force it through; resolve the diff first
(see gotcha #2 in `CLAUDE.md` for a related class of schema-drift crash).

Columns currently on main:

```bash
for t in directus_files directus_users global_configurations api_users object_id_sequences; do
  echo "== $t (main) =="
  docker exec -i <main-db-container> psql -U directus -d directus -t -c "
    SELECT string_agg(column_name || ':' || data_type, ', ' ORDER BY ordinal_position)
    FROM information_schema.columns WHERE table_name='$t';"
done
```

Columns in the staging dump you're about to restore:

```bash
for t in directus_files directus_users global_configurations api_users object_id_sequences; do
  echo "== $t (staging dump) =="
  grep "^COPY public.$t " ~/dump_staging.sql | head -1
done
```

Compare the two outputs for each of the 5 tables — names, order, and types
must match exactly. Also re-run the MCP `fields` and `relations` comparison
(both environments, once `directus-main` MCP access is restored) for each of
the 5 collections — this catches app-level relations without a DB-level FK,
the same class of gotcha as `directus_users.avatar` in step 5.

---

## Step 5 — Find every FK/relation column pointing at any of the 5 preserved collections

Do this now, before the wipe, so the list is ready for the orphan
report/cleanup in steps 10–11.

`directus_files` has a known, hand-verified list (re-verify, don't trust
blindly — last confirmed identical on staging/dev on 2026-07-21, 15
relations):

```
albums_directus_files.directus_files_id
cruises_directus_files.directus_files_id
directus_settings.project_logo
directus_settings.public_background
directus_settings.public_favicon
directus_settings.public_foreground
directus_users.avatar                              ← no DB-level FK, app-level relation only
excursions_directus_files.directus_files_id
hotels_directus_files.directus_files_id
hotels_files.directus_files_id
junction_directus_files_translations_2.directus_files_id
media_share_link.file
rental_companies_directus_files.directus_files_id
tours_directus_files.directus_files_id
vehicles_directus_files.directus_files_id
```

For the other 4 — especially `directus_users`, which Directus wires into
nearly every collection by default via `user_created`/`user_updated` — use an
automated query instead of hand-listing:

```bash
docker exec -i <main-db-container> psql -U directus -d directus -t -c "
SELECT tc.table_name, kcu.column_name, ccu.table_name AS references_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name IN ('directus_files','directus_users','global_configurations','api_users','object_id_sequences')
ORDER BY ccu.table_name, tc.table_name, kcu.column_name;"
```

Cross-check against the MCP `relations` tool (`read`, no collection filter,
then filter results client-side to `related_collection` in the 5 names) —
this also catches relations with no DB-level FK constraint, same as
`directus_users.avatar` above. Save the combined output; it's the input list
for steps 10–11.

---

## Step 6 — Export main's current preserve-set rows, in one combined dump

Run on main, before wiping anything:

```bash
docker exec -i <main-db-container> pg_dump -U directus -d directus \
  --data-only \
  --table=directus_files \
  --table=directus_users \
  --table=global_configurations \
  --table=api_users \
  --table=object_id_sequences \
  > main_preserve_backup.sql
```

---

## Step 7 — Sanity-check row counts before the wipe

```bash
docker exec -i <main-db-container> psql -U directus -d directus -t -c "
SELECT 'directus_files', count(*) FROM directus_files
UNION ALL SELECT 'directus_users', count(*) FROM directus_users
UNION ALL SELECT 'global_configurations', count(*) FROM global_configurations
UNION ALL SELECT 'api_users', count(*) FROM api_users
UNION ALL SELECT 'object_id_sequences', count(*) FROM object_id_sequences;"
```

Keep this output — it's what you compare against after step 9 and again in
step 12.

---

## Step 8 — Wipe main's schema and restore the staging dump

```bash
docker exec -i <main-db-container> psql -U directus -d directus \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

```bash
docker exec -i <main-db-container> psql -U directus -d directus \
  < ~/dump_staging.sql
```

At this point main = staging's structure + data, including staging's own
versions of all 5 preserve-set collections (about to be overwritten in the
next step).

---

## Step 9 — Reimport main's preserved rows for all 5 collections, in one combined restore

Single transaction, FK checks off for the swap, checks back on before
commit. **Write the script to a file first, then run it with `-f`/`<`** —
do not pipe a giant multi-line heredoc directly into an interactive SSH
paste. Large pastes into a live terminal can silently drop or merge
characters depending on the terminal's buffering (this bit a real run of
this exact command — see the incident note at the end of this step).

```bash
{
  echo "BEGIN;"
  echo "SET session_replication_role = replica;"
  echo "DELETE FROM directus_files;"
  echo "DELETE FROM api_users;"
  echo "DELETE FROM object_id_sequences;"
  echo "DELETE FROM global_configurations;"
  echo "DELETE FROM directus_users;"
  cat main_preserve_backup.sql
  echo "SET search_path TO public;"
  echo "SET session_replication_role = origin;"
  echo "SELECT setval(pg_get_serial_sequence('public.global_configurations','id'), COALESCE((SELECT MAX(id) FROM public.global_configurations), 1));"
  echo "COMMIT;"
} > restore_preserve.sql

docker exec -i <main-db-container> psql -U directus -d directus -v ON_ERROR_STOP=1 < restore_preserve.sql
```

The `setval(...)` line is required — `global_configurations` is the one
preserve-set collection with an integer/sequence PK, and without resyncing
it, the next row Directus inserts via the app can collide with a restored id.

**Why `SET search_path TO public;` and the `public.` qualifiers are
required:** `pg_dump`'s output (inside `main_preserve_backup.sql`) always
opens with `SELECT pg_catalog.set_config('search_path', '', false);` so its
own `COPY` statements don't depend on search_path — but that setting then
stays in effect for the rest of the psql session, including any SQL you add
*after* the `cat`. An unqualified `setval(pg_get_serial_sequence(...))` call
placed there will fail with `relation "global_configurations" does not
exist`, `ON_ERROR_STOP=1` will abort the script before `COMMIT;` ever runs,
and — because the transaction was opened with an explicit `BEGIN;` and never
committed — Postgres will roll back the *entire* transaction (all 5
`DELETE`s and all the restored rows) the moment the connection closes. That
means a failure at this last line silently undoes the whole restore, not
just the sequence resync, leaving the target still on whatever it had before
this step ran.

> **Incident (2026-09-07, production `main`):** an earlier version of this
> step didn't have the `SET search_path TO public;` line or the `public.`
> qualifiers, and was run twice against `directus-prod-database-1` piped
> directly from a heredoc pasted into an interactive SSH session. Both runs
> hit exactly the error described above and rolled back (confirmed by
> row counts matching before/after each attempt). Separately, in the same
> session, an unplanned manual `TRUNCATE TABLE public.directus_extensions
> RESTART IDENTITY;` was run outside of any script — that one **did**
> commit (autocommit, no wrapping transaction), since Directus rebuilds
> `directus_extensions` from disk at boot but this should always be
> confirmed, not assumed. Lessons folded into this step: qualify every
> identifier used after a restored `pg_dump` payload, verify a backup
> file's actual row counts independently before trusting it (see the `awk`
> snippet below), and never run ad hoc unplanned SQL against production
> mid-procedure — if something needs investigating, stop and figure it out
> before typing more commands into the live session.

Before restoring, it's worth independently confirming `main_preserve_backup.sql`
actually contains full data for all 5 tables (don't just trust the dump
command exited without a visible error):

```bash
awk '
/^COPY public\./ {
  table=$3
  count=0
  while ((getline line) > 0) {
    if (line == "\\.") break
    count++
  }
  print table, count
}' main_preserve_backup.sql
```

This should print exactly 5 lines, one per preserve-set table, with row
counts matching step 7's sanity check. If a table is missing or its count
looks wrong, don't restore from this file — re-derive the 5 tables' data
from the full backup taken in step 2 instead.

Verify row counts match step 7:

```bash
docker exec -i <main-db-container> psql -U directus -d directus -t -c "
SELECT 'directus_files', count(*) FROM directus_files
UNION ALL SELECT 'directus_users', count(*) FROM directus_users
UNION ALL SELECT 'global_configurations', count(*) FROM global_configurations
UNION ALL SELECT 'api_users', count(*) FROM api_users
UNION ALL SELECT 'object_id_sequences', count(*) FROM object_id_sequences;"
```

---

## Step 10 — Report orphaned references

**Always guard with `IS NOT NULL`** — several of these FK columns are
nullable, and rows with a legitimate `NULL` are not orphans. (See the "Bug we
hit locally" note below — dropping this guard once caused real data loss.)

For `directus_files`, the known 15-relation list:

```bash
docker exec -i <main-db-container> psql -U directus -d directus <<'SQL'
SELECT 'albums_directus_files' AS t, count(*) FROM albums_directus_files a
WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL
SELECT 'cruises_directus_files', count(*) FROM cruises_directus_files a
WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL
SELECT 'excursions_directus_files', count(*) FROM excursions_directus_files a
WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL
SELECT 'hotels_directus_files', count(*) FROM hotels_directus_files a
WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL
SELECT 'junction_directus_files_translations_2', count(*) FROM junction_directus_files_translations_2 a
WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL
SELECT 'media_share_link', count(*) FROM media_share_link a
WHERE a.file IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.file)
UNION ALL
SELECT 'rental_companies_directus_files', count(*) FROM rental_companies_directus_files a
WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL
SELECT 'tours_directus_files', count(*) FROM tours_directus_files a
WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL
SELECT 'vehicles_directus_files', count(*) FROM vehicles_directus_files a
WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL
SELECT 'directus_settings.project_logo', count(*) FROM directus_settings a
WHERE a.project_logo IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.project_logo)
UNION ALL
SELECT 'directus_settings.public_background', count(*) FROM directus_settings a
WHERE a.public_background IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.public_background)
UNION ALL
SELECT 'directus_settings.public_favicon', count(*) FROM directus_settings a
WHERE a.public_favicon IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.public_favicon)
UNION ALL
SELECT 'directus_settings.public_foreground', count(*) FROM directus_settings a
WHERE a.public_foreground IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.public_foreground)
UNION ALL
SELECT 'directus_users.avatar', count(*) FROM directus_users a
WHERE a.avatar IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.avatar);
SQL
```

For every `(table, column, references_table)` row the step 5 automated query
found for `directus_users`, `global_configurations`, `api_users`, and
`object_id_sequences`, run the same `IS NOT NULL`-guarded count pattern
(swap in the table/column names it found — the shape is identical to the
queries above).

Review every count before proceeding to step 11. Expect nonzero counts on
`user_created`/`user_updated` columns almost everywhere — that just reflects
staging having different authors than main's preserved user set, not a bug.

### Bug we hit locally — read before running step 11

The first attempt at this cleanup (on `directus_files`, local environment)
used `DELETE ... WHERE NOT EXISTS (...)` **without** the `IS NOT NULL` guard
on `directus_files_id`. Since that column is nullable, `NOT EXISTS` is also
true for `NULL` values (a `NULL` FK isn't "found" in `directus_files`
either) — so that pass deleted legitimately-`NULL` rows too (51 extra in a
translations junction, 1 extra in hotels). Caught by comparing the delete
count against the report count above; fixed by restoring both tables and
re-running with `IS NOT NULL` added. Every query in this doc already has the
guard — don't drop it, and make sure any query you add for the other 4
collections keeps it too.

---

## Step 11 — Delete orphaned rows / null out orphaned FK values

For `directus_files`:

```bash
docker exec -i <main-db-container> psql -U directus -d directus -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

DELETE FROM albums_directus_files a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);

DELETE FROM cruises_directus_files a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);

DELETE FROM excursions_directus_files a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);

DELETE FROM hotels_directus_files a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);

DELETE FROM junction_directus_files_translations_2 a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);

DELETE FROM rental_companies_directus_files a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);

DELETE FROM tours_directus_files a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);

DELETE FROM vehicles_directus_files a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);

UPDATE media_share_link
SET file = NULL
WHERE file IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = media_share_link.file);

UPDATE directus_settings
SET project_logo = NULL
WHERE project_logo IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = directus_settings.project_logo);

UPDATE directus_settings
SET public_background = NULL
WHERE public_background IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = directus_settings.public_background);

UPDATE directus_settings
SET public_favicon = NULL
WHERE public_favicon IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = directus_settings.public_favicon);

UPDATE directus_settings
SET public_foreground = NULL
WHERE public_foreground IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = directus_settings.public_foreground);

UPDATE directus_users
SET avatar = NULL
WHERE avatar IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = directus_users.avatar);

COMMIT;
SQL
```

For the `directus_users`/`global_configurations`/`api_users`/
`object_id_sequences` references found in step 5: for every column,
default to **nulling** rather than deleting the row — a dangling
`user_created`/`user_updated` is a harmless cosmetic loss (record just shows
no author), whereas deleting a whole `hotels` or `directus_activity` row
because of one dangling reference is far more destructive. Use the same
guarded pattern:

```sql
UPDATE <table>
SET <column> = NULL
WHERE <column> IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM <references_table> r WHERE r.id = <table>.<column>);
```

Immediately after, confirm every delete/update count matches the report
counts from step 10 exactly. If they don't match, stop and investigate before
doing anything else — it likely means an `IS NOT NULL` guard was missed.

---

## Step 12 — Final verification (check data before vs. after)

```bash
docker exec -i <main-db-container> psql -U directus -d directus -t -c "
SELECT 'directus_files', count(*) FROM directus_files
UNION ALL SELECT 'directus_users', count(*) FROM directus_users
UNION ALL SELECT 'global_configurations', count(*) FROM global_configurations
UNION ALL SELECT 'api_users', count(*) FROM api_users
UNION ALL SELECT 'object_id_sequences', count(*) FROM object_id_sequences;

SELECT count(*) FROM hotels_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);
SELECT count(*) FROM junction_directus_files_translations_2 a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);
SELECT count(*) FROM directus_users a WHERE a.avatar IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.avatar);
"
```

- The 5 preserve-set row counts should match step 7 exactly (before vs.
  after the whole migration).
- All orphan checks — the `directus_files` ones above plus whatever you ran
  for `directus_users`/`global_configurations`/`api_users`/
  `object_id_sequences` in step 10 — should be `0`.

---

## Step 13 — Restart Directus and check in the browser

```bash
docker restart <main-directus-container>
```

Then manually verify in the browser: Media Library shows main's real files;
log in as an existing main user (confirms `directus_users` really came back
as main's own, not staging's); spot-check a hotel/tour/cruise using
`*_directus_files` for images; check `api_users` and `global_configurations`
entries are main's originals, not staging's.

---

## Step 14 — Reapply known post-restore schema fixes

Restoring the staging dump resets any relation/schema fixes that only exist
in main's live DB and not in staging (the dump doesn't know about
main-only patches). Check whether any exist for main before this run — as of
the last check on staging (2026-07-21) the `excursions_*` FK `on_delete`
inconsistency was already fixed at the source (dev/staging), so it survives
restores automatically; confirm the same applies going into staging → main.

Sanity check after any restore (should return zero rows): read all relations
via MCP and filter to `related_collection == 'excursions'` and
`schema.on_delete == 'NO ACTION'`.

(Add to this list if other main-only relation/schema fixes exist that aren't
also fixed on staging — otherwise they'll keep silently reverting on every
resync.)

---

## Step 15 — Log the change

Per the repo's non-negotiable rule (`CLAUDE.md`), every direct change to a
live environment must be logged. Create a dated file (in `STAGING_CHANGES/`
if a `MAIN_CHANGES/` equivalent doesn't exist yet — check first) recording:

- What changed: main's DB fully replaced with staging's structure/data,
  except `directus_files`, `directus_users`, `global_configurations`,
  `api_users`, and `object_id_sequences` kept from main's prior state
- Date/time performed
- Row counts before/after for all 5 preserve-set collections (step 7 vs.
  step 12)
- Orphan cleanup counts (step 10/11)
- The full backup location from step 2 — this is the revert path
- Any collections/records with newly-broken references (nonzero orphan
  counts from step 10, if any)

---

## What is NOT preserved

Only the 5 collections listed above are kept from main. Everything else —
`directus_folders`, flows, schema, and all other collection data — comes
from staging. This is a deliberate choice, not an oversight — if something
else needs preserving on a future run, add it to the collection table above
and repeat steps 4–13 for it.

**Tradeoff of whole-table preserve:** any row staging added to one of these
5 collections since main's last sync — a new user, a new `api_users`
integration token, a new `object_id_sequences` counter for a product added
on staging — is **not** carried over, because main's pre-migration snapshot
fully replaces whatever staging's dump brought in for these 5 tables. If
that's not acceptable for a given run (e.g. a new hire's account needs to
exist on main too), handle it as a manual follow-up after the sync — add
that one row by hand rather than re-running the whole procedure.

**Narrower alternative for `directus_users` and `global_configurations`:** if
you'd rather take staging's version of most rows but protect only a specific
column or subset — e.g. keep staging's new users but preserve main's plaintext
API tokens by email match, or keep staging's `global_configurations` rows but
preserve only certain `entity_type`s by upsert — that's a different, narrower
procedure (export just that column/subset before the wipe, upsert it back by
natural key after, no full-table delete). Ask if you need this written up as
its own step-by-step; it's not covered above since the current requirement is
the full whole-table preserve for all 5 collections.
