# Staging ← Dev data sync, preserving staging's `directus_files`

**Goal:** replace staging's DB structure/data with dev's, except keep staging's
`directus_files` table exactly as-is (21k+ real images linked to S3), then null
out any dev records left pointing at file IDs that no longer exist.

This mirrors what was already done and verified on **local** (Docker,
`directus-cms-template-database-1`). Read the "Bug we hit locally" note in
step 9 before running step 10 — it explains a mistake made the first time and
how the fixed queries avoid it.

**This touches a live client environment. Do not run these against staging
without explicit go-ahead, and log the change in
[`STAGING_CHANGES/`](../STAGING_CHANGES/) once done (rule in `CLAUDE.md`).**

Execution model assumed below: you SSH into the staging server, `scp` the dev
dump up to it, and run every command **directly on the staging box** (no
piping over SSH from your laptop). All commands use `docker exec` against the
staging DB container — confirm in step 1 whether that's actually how staging
runs Postgres before proceeding.

---

## Automated version: `migration-tool/`

This entire procedure — generalized to **any** source → target pair among
`dev`, `staging`, `main`, `local`, not just dev → staging — is automated by
[`migration-tool/migrate.js`](../migration-tool/) at the repo root:

```bash
cd migration-tool
npm install        # first time only
cp .env.example .env   # first time only — fill in SSH hosts/keys per environment
node migrate.js
```

It's fully interactive (target env → source env → which existing dump to
use → preserve toggles → dry run or execute) and implements every step below
under the hood, plus two additional preserve options this manual runbook
doesn't cover — see [`migration-tool/README.md`](../migration-tool/README.md)
for the full behavior:

- **`directus_files`** (steps 4, 7–10 below) — on by default, exactly as
  documented here.
- **`directus_users` API tokens** — off by default in this manual runbook
  (see step 15), on by default in the tool. Static tokens are plaintext in
  `directus_users.token`, so a raw restore silently rotates every
  integration's credential unless preserved.
- **`global_configurations` rows, by `entity_type`** — off by default in
  this manual runbook (see step 16), on by default in the tool for every
  `entity_type` the target currently has (`ai-api`, `directus-url`,
  `botg-api`, `user-token`, etc.), individually deselectable per run.

**Dry run is the tool's default mode** — it restores the chosen dump into a
disposable local Postgres container and previews row counts, column parity,
and orphan counts without touching the live target. You explicitly choose
"Execute" to perform the real migration, and `main` additionally requires
typing a confirmation phrase.

The manual steps below remain the reference for what the tool is actually
doing, and the fallback procedure if the tool is unavailable or a step needs
to be run/debugged by hand.

---

## Execution order (checklist)

- [ ] 1. Confirm access & container names
- [ ] 2. Full backup of staging (rollback path)
- [ ] 3. Upload the dev dump to staging
- [ ] 4. Export staging's current `directus_files` (the data you're keeping)
- [ ] 5. Confirm dev's `directus_files` columns match staging's
- [ ] 6. Wipe staging schema and restore the dev dump
- [ ] 7. Swap in staging's real `directus_files` rows
- [ ] 8. Find every FK column pointing at `directus_files`
- [ ] 9. Report orphaned references
- [ ] 10. Delete orphaned rows / null out orphaned FK values
- [ ] 11. Final verification
- [ ] 12. Restart Directus and check in the browser
- [ ] 13. Reapply known post-restore schema fixes (e.g. excursions FK)
- [ ] 14. Log the change in `STAGING_CHANGES/`
- [ ] 15. (Optional) Preserve staging's `directus_users` API tokens
- [ ] 16. (Optional) Preserve `global_configurations` rows by `entity_type`

---

## 1. Confirm access & container names

- [ ] You're SSH'd into the staging server, with a shell that can run `docker`.
- [ ] Confirm the staging DB container name (equivalent of
      `directus-cms-template-database-1` locally) and the Directus app
      container name (equivalent of `directus-cms-template-directus-1`):
      `bash
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}'
`
- [ ] Pick a low-traffic window; if there's a maintenance-mode option for the
      site, use it.

Substitute the real names for `<staging-db-container>` /
`<staging-directus-container>` everywhere below.

---

## 2. Full backup of staging (rollback path)

Do this **before touching anything else**. This is what you restore from if
something goes wrong:

```bash
docker exec -i <staging-db-container> pg_dump -U directus -d directus \
  > staging_full_backup_$(date +%F).sql
```

Copy this off the server too (e.g. `scp` it back to your laptop) — don't
leave it as the only copy on the box you're about to modify.

---

## 3. Upload the dev dump to staging

From your laptop:

```bash
scp files/dump_dev_2026-07-20_11-13-25.sql <user>@<staging-host>:~/dump_dev.sql
```

Use a fresh dev dump if significant time has passed since 2026-07-20 —
check the dump's date against what you actually want staging to end up with.

---

## 4. Export staging's current `directus_files` (the data you're keeping)

Run on staging, before wiping anything — this is the real, current
S3-linked file data you're preserving:

```bash
docker exec -i <staging-db-container> pg_dump -U directus -d directus \
  --data-only --table=directus_files \
  > staging_directus_files_backup.sql
```

Sanity check the row count matches what staging currently shows in the Media
Library:

```bash
docker exec -i <staging-db-container> psql -U directus -d directus -t \
  -c "SELECT count(*) FROM directus_files;"
```

---

## 5. Confirm dev's `directus_files` columns match staging's

**Already verified live via the `directus-staging` and `directus-dev` MCP
servers on 2026-07-21** (`fields` tool, `directus_files` collection, both
environments): both have exactly **62 real DB columns** with identical
names, types, and nullability (there are also 24 UI-only alias/divider
fields — `translations`, `album`, `curation`, various `*_group`/`*_accordion`
fields, etc. — which don't correspond to real columns and are irrelevant to
the COPY statement). No drift existed as of that check.

**Re-verify before you actually run step 7**, since schema can change
between now and execution day — either re-run the same MCP comparison, or
do it directly against the live DBs:

```bash
# columns in the dev dump you're about to restore
grep "^COPY public.directus_files " ~/dump_dev.sql | head -1
```

```bash
# columns currently on staging (before the wipe)
docker exec -i <staging-db-container> psql -U directus -d directus -t -c "
SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
FROM information_schema.columns WHERE table_name='directus_files';"
```

If dev added/removed columns since this runbook was written, the column
lists must match exactly, or the restore in step 7 will need adjusting
(don't just force it through — figure out the diff first).

---

## 6. Wipe staging schema and restore the dev dump

```bash
docker exec -i <staging-db-container> psql -U directus -d directus \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

```
docker exec -i <staging-db-container> psql -U directus -d directus \
  < ~/dump_dev.sql
```

At this point staging = dev's structure + data, including dev's own (smaller)
`directus_files`.

---

## 7. Swap in staging's real `directus_files` rows

Single transaction, FK checks off for the swap, checks back on before commit:

```bash
{
  echo "BEGIN;"
  echo "SET session_replication_role = replica;"
  echo "DELETE FROM directus_files;"
  cat staging_directus_files_backup.sql
  echo "SET session_replication_role = origin;"
  echo "COMMIT;"
} | docker exec -i <staging-db-container> psql -U directus -d directus -v ON_ERROR_STOP=1
```

Verify:

```bash
docker exec -i <staging-db-container> psql -U directus -d directus -t \
  -c "SELECT count(*) FROM directus_files;"
```

Should match the count from step 4.

---

## 8. Find every FK/relation column pointing at `directus_files`

Schema may drift between dev/staging over time, so re-derive this list live
rather than trusting the one below blindly. Two sources matter here, and
they don't always agree:

- **DB-level FK constraints** (`information_schema` — what Postgres will
  actually enforce/complain about):
  ```bash
  docker exec -i <staging-db-container> psql -U directus -d directus -t -c "
  SELECT tc.table_name, kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'directus_files'
  ORDER BY 1,2;"
  ```
- **Directus-level relations** (via MCP `relations` tool, `read` action, on
  both `directus-staging` and `directus-dev`, filtered to
  `related_collection == 'directus_files'`) — this also catches relations
  Directus manages at the app level with no matching DB constraint.

**Verified live on 2026-07-21** via the `directus-staging`/`directus-dev`
MCP `relations` tool: both environments have the identical set of **15**
relations into `directus_files`. Re-run this on execution day, don't assume
it hasn't changed:

```
albums_directus_files.directus_files_id
cruises_directus_files.directus_files_id
directus_settings.project_logo
directus_settings.public_background
directus_settings.public_favicon
directus_settings.public_foreground
directus_users.avatar                              ← DB-level FK query misses this one
excursions_directus_files.directus_files_id
hotels_directus_files.directus_files_id
hotels_files.directus_files_id
junction_directus_files_translations_2.directus_files_id
media_share_link.file
rental_companies_directus_files.directus_files_id
tours_directus_files.directus_files_id
vehicles_directus_files.directus_files_id
```

**Important:** `directus_users.avatar` has no actual Postgres FK constraint
(confirmed on local — `information_schema` returns nothing for it, and the
column is nullable with no `foreign_key_table` set), so the DB-level query
above will silently miss it. It's still a real Directus relation though —
if a dev user's avatar points at a dev-only file id, they'll see a broken
avatar in the app unless it's included in the orphan check/cleanup below.
Steps 9 and 10 already include it.

If staging's live list differs from the one above, add/remove
`SELECT`/`DELETE`/`UPDATE` lines in steps 9 and 10 to match — don't silently
skip a column this list missed.

---

## 9. Report orphaned references (dev rows pointing at file IDs staging doesn't have)

**Always guard with `IS NOT NULL`** — several of these FK columns are
nullable, and rows with a legitimate `NULL` are not orphans.

```bash
docker exec -i <staging-db-container> psql -U directus -d directus <<'SQL'
SELECT 'albums_directus_files' AS t, count(*)
FROM albums_directus_files a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id
  )

UNION ALL
SELECT 'cruises_directus_files', count(*)
FROM cruises_directus_files a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id
  )

UNION ALL
SELECT 'excursions_directus_files', count(*)
FROM excursions_directus_files a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id
  )

UNION ALL
SELECT 'hotels_directus_files', count(*)
FROM hotels_directus_files a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id
  )

UNION ALL
SELECT 'junction_directus_files_translations_2', count(*)
FROM junction_directus_files_translations_2 a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id
  )

UNION ALL
SELECT 'media_share_link', count(*)
FROM media_share_link a
WHERE a.file IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_files f WHERE f.id = a.file
  )

UNION ALL
SELECT 'rental_companies_directus_files', count(*)
FROM rental_companies_directus_files a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id
  )

UNION ALL
SELECT 'tours_directus_files', count(*)
FROM tours_directus_files a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id
  )

UNION ALL
SELECT 'vehicles_directus_files', count(*)
FROM vehicles_directus_files a
WHERE a.directus_files_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id
  )

UNION ALL
SELECT 'directus_settings.project_logo', count(*)
FROM directus_settings a
WHERE a.project_logo IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_files f WHERE f.id = a.project_logo
  )

UNION ALL
SELECT 'directus_settings.public_background', count(*)
FROM directus_settings a
WHERE a.public_background IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_files f WHERE f.id = a.public_background
  )

UNION ALL
SELECT 'directus_settings.public_favicon', count(*)
FROM directus_settings a
WHERE a.public_favicon IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_files f WHERE f.id = a.public_favicon
  )

UNION ALL
SELECT 'directus_settings.public_foreground', count(*)
FROM directus_settings a
WHERE a.public_foreground IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_files f WHERE f.id = a.public_foreground
  )

UNION ALL
SELECT 'directus_users.avatar', count(*)
FROM directus_users a
WHERE a.avatar IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_files f WHERE f.id = a.avatar
  );
SQL
```

Review the counts before proceeding to the delete/null step. On the local run
(2026-07-21) only `hotels_directus_files` (204) and
`junction_directus_files_translations_2` (72) had orphans — everything else
was 0 (this local run predates the `directus_users.avatar` addition above,
so re-check that one specifically on staging). Staging may differ; don't
assume the same numbers.

### Bug we hit locally — read before running step 10

The first attempt at the cleanup used `DELETE ... WHERE NOT EXISTS (...)`
**without** the `IS NOT NULL` guard on `a.directus_files_id`. Since
`directus_files_id` is nullable in both `hotels_directus_files` and
`junction_directus_files_translations_2`, `NOT EXISTS` is also true for NULL
values (a NULL FK isn't "found" in `directus_files` either) — so that first
pass deleted legitimately-NULL rows too (51 extra in the translations
junction, 1 extra in hotels). It was caught by comparing the delete count
against the report count above, and fixed by restoring both tables from the
dev dump and re-running with `IS NOT NULL` added. The queries in step 10
already have the guard — don't drop it.

---

## 10. Delete orphaned rows / null out orphaned FK values

```bash
docker exec -i <staging-db-container> psql -U directus -d directus -v ON_ERROR_STOP=1 <<'SQL'
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

Immediately after, confirm the delete counts match the report counts from
step 9 exactly. If they don't match, stop and investigate before doing
anything else — it likely means a guard was missed again.

---

## 11. Final verification

```bash
docker exec -i <staging-db-container> psql -U directus -d directus -t -c "
SELECT count(*) FROM directus_files;
SELECT count(*) FROM hotels_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);
SELECT count(*) FROM junction_directus_files_translations_2 a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);
SELECT count(*) FROM directus_users a WHERE a.avatar IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.avatar);
"
```

- `directus_files` count should match step 4.
- All three orphan checks should be `0`.

---

## 12. Restart Directus and check in the browser

```bash
docker restart <staging-directus-container>
```

Then manually verify at https://staging.content.botg.cloud (Media Library
shows the real files; spot-check a hotel/tour/cruise that uses
`*_directus_files` for images).

---

## 13. Reapply known post-restore schema fixes

Restoring the dev dump resets any relation/schema fixes that only exist in
staging's live DB and not in dev (the dump doesn't know about staging-only
patches). As of 2026-07-21 there are **no outstanding ones** — the
`excursions_*` FK `on_delete` inconsistency (6 tables, `NO ACTION` instead
of `CASCADE`) that used to require reapplying after every restore has been
fixed at the source on **dev** itself (and on local), so it now survives
the restore automatically. See
[`DEV_CHANGES/EXCURSIONS-ON-DELETE-CASCADE-FIX.md`](../DEV_CHANGES/EXCURSIONS-ON-DELETE-CASCADE-FIX.md)
and
[`STAGING_CHANGES/EXCURSIONS-DIRECTUS-FILES-ON-DELETE-CASCADE-FIX.md`](../STAGING_CHANGES/EXCURSIONS-DIRECTUS-FILES-ON-DELETE-CASCADE-FIX.md)
for the history.

Sanity check after any restore (should return zero rows — if it doesn't,
something regressed on dev or a new inconsistency was introduced): read all
relations via MCP and filter to `related_collection == 'excursions'` and
`schema.on_delete == 'NO ACTION'`.

(Add to this list if other staging-only relation/schema fixes are made in
the future that aren't also fixed on dev — otherwise they'll keep silently
reverting on every resync.)

---

## 14. Log the change in `STAGING_CHANGES/`

Per the repo's non-negotiable rule (`CLAUDE.md`), every direct change to
staging must be logged. Create/update a file in
[`STAGING_CHANGES/`](../STAGING_CHANGES/) recording:

- What changed (staging DB fully replaced with dev structure/data, except
  `directus_files` kept from staging's prior state)
- Date/time performed
- Row counts before/after (`directus_files`, orphan cleanup counts)
- The full backup location from step 2 (this is the revert path)
- Any collections/records with newly-broken image references (the
  `hotels_directus_files` / `junction_directus_files_translations_2` orphan
  counts from step 9, if non-zero)

---

## 15. (Optional) Preserve staging's `directus_users` API tokens

`directus_users.token` stores static API tokens **in plaintext** (unlike the
bcrypt-hashed `password` column) — client integrations authenticate with
these directly. A raw restore silently overwrites staging's tokens with
dev's, breaking every integration pointed at staging until someone notices
and manually re-issues tokens. Skip this step only if you're certain nothing
depends on staging's current tokens.

Run **before step 6** (the wipe), right after step 4:

```bash
docker exec -i <staging-db-container> psql -U directus -d directus -t -A -F'|' -c \
  "SELECT email, token FROM directus_users WHERE token IS NOT NULL AND email IS NOT NULL;" \
  > staging_user_tokens_backup.txt
```

After step 7 (or immediately after step 6 if you're not preserving
`directus_files`), restore them by matching on email — a user with no match
in dev's dump just gets no update (harmless; that user doesn't exist
post-restore):

```bash
docker exec -i <staging-db-container> psql -U directus -d directus -v ON_ERROR_STOP=1 <<'SQL'
WITH updated AS (
  UPDATE directus_users u SET token = v.token
  FROM (VALUES
    -- one ('email','token') row per line from staging_user_tokens_backup.txt
    ('user@example.com', 'the-plaintext-token-value')
  ) AS v(email, token)
  WHERE u.email = v.email AND u.token IS DISTINCT FROM v.token
  RETURNING u.email
)
SELECT count(*) FROM updated;
SQL
```

`migration-tool/migrate.js` generates this `VALUES` list automatically from
the export in step 4's equivalent — see `buildTokenRestoreSql` in
[`migration-tool/migrate.js`](../migration-tool/migrate.js) if doing this by
hand for more than a couple of users.

---

## 16. (Optional) Preserve `global_configurations` rows by `entity_type`

`global_configurations` is a flat key/value settings table — `entity` is
unique per row, `entity_type` groups related rows (e.g. all `ai-api` rows:
`token`, `url`, `model`; or `directus-url`'s `base_url`, which is inherently
environment-specific and almost never something you want dev's copy of).
Unlike `directus_files`, nothing else has a foreign key into this table
(verified via the `relations` MCP tool — only its own `user_created`/
`user_updated` point out to `directus_users`), so preservation is a plain
upsert by `entity`, no orphan reconciliation needed.

First, check which `entity_type`s exist on staging and decide which to keep:

```bash
docker exec -i <staging-db-container> psql -U directus -d directus -t -A -c \
  "SELECT DISTINCT entity_type FROM global_configurations WHERE entity_type IS NOT NULL ORDER BY entity_type;"
```

Run **before step 6**, exporting only the `entity_type`(s) you've decided to
keep (replace the `IN (...)` list):

```bash
docker exec -i <staging-db-container> psql -U directus -d directus -t -A -F'|' -c \
  "SELECT entity, entity_type, key, value FROM global_configurations WHERE entity_type IN ('ai-api', 'directus-url') AND entity IS NOT NULL;" \
  > staging_global_config_backup.txt
```

After step 6's restore, upsert them back by `entity` — staging's value wins
for any `entity` name dev's dump also has; any `entity` dev's dump uniquely
introduced under that same `entity_type` is left as-is:

```bash
docker exec -i <staging-db-container> psql -U directus -d directus -v ON_ERROR_STOP=1 <<'SQL'
WITH upserted AS (
  INSERT INTO global_configurations (entity, entity_type, key, value)
  VALUES
    -- one ('entity','entity_type','key','value') row per line from staging_global_config_backup.txt
    ('botg-ai-api-token', 'ai-api', 'token', 'sk-...')
  ON CONFLICT (entity) DO UPDATE SET
    entity_type = EXCLUDED.entity_type,
    key = EXCLUDED.key,
    value = EXCLUDED.value
  RETURNING entity
)
SELECT count(*) FROM upserted;
SQL
```

`migration-tool/migrate.js` generates this automatically per selected
`entity_type` — see `buildGlobalConfigRestoreSql` in
[`migration-tool/migrate.js`](../migration-tool/migrate.js) for the
reference implementation.

---

## What is NOT preserved from staging

Per the earlier decision on this sync: only `directus_files` itself is kept
from staging by default. `directus_folders` and everything else (all other
collection data, flows, schema) comes from dev. If staging's folder
structure for the Media Library mattered, it is now dev's — this was a
deliberate choice, not an oversight.

`directus_users` API tokens (step 15) and `global_configurations` rows
(step 16) are **also preservable, but off by default in this manual
runbook** — they were added later, driven by a client request to keep
integration tokens and per-environment config (like `ai-api` credentials)
intact across syncs. `migration-tool/migrate.js` turns both on by default
instead, since silently rotating a live integration's credentials is a
worse default than the extra prompt.
