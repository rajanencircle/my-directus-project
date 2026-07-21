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
- [ ] 13. Log the change in `STAGING_CHANGES/`

---

## 1. Confirm access & container names

- [ ] You're SSH'd into the staging server, with a shell that can run `docker`.
- [ ] Confirm the staging DB container name (equivalent of
      `directus-cms-template-database-1` locally) and the Directus app
      container name (equivalent of `directus-cms-template-directus-1`):
      ```bash
      docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}'
      ```
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
SELECT 'albums_directus_files' t, count(*) FROM albums_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL SELECT 'cruises_directus_files', count(*) FROM cruises_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL SELECT 'excursions_directus_files', count(*) FROM excursions_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL SELECT 'hotels_directus_files', count(*) FROM hotels_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL SELECT 'hotels_files', count(*) FROM hotels_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL SELECT 'junction_directus_files_translations_2', count(*) FROM junction_directus_files_translations_2 a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL SELECT 'media_share_link', count(*) FROM media_share_link a WHERE a.file IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.file)
UNION ALL SELECT 'rental_companies_directus_files', count(*) FROM rental_companies_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL SELECT 'tours_directus_files', count(*) FROM tours_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL SELECT 'vehicles_directus_files', count(*) FROM vehicles_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id)
UNION ALL SELECT 'directus_settings.project_logo', count(*) FROM directus_settings a WHERE a.project_logo IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.project_logo)
UNION ALL SELECT 'directus_settings.public_background', count(*) FROM directus_settings a WHERE a.public_background IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.public_background)
UNION ALL SELECT 'directus_settings.public_favicon', count(*) FROM directus_settings a WHERE a.public_favicon IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.public_favicon)
UNION ALL SELECT 'directus_settings.public_foreground', count(*) FROM directus_settings a WHERE a.public_foreground IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.public_foreground)
UNION ALL SELECT 'directus_users.avatar', count(*) FROM directus_users a WHERE a.avatar IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.avatar);
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

DELETE FROM albums_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);
DELETE FROM cruises_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);
DELETE FROM excursions_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);
DELETE FROM hotels_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);
DELETE FROM hotels_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);
DELETE FROM junction_directus_files_translations_2 a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);
DELETE FROM rental_companies_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);
DELETE FROM tours_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);
DELETE FROM vehicles_directus_files a WHERE a.directus_files_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a.directus_files_id);

UPDATE media_share_link SET file = NULL WHERE file IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = media_share_link.file);
UPDATE directus_settings SET project_logo = NULL WHERE project_logo IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = directus_settings.project_logo);
UPDATE directus_settings SET public_background = NULL WHERE public_background IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = directus_settings.public_background);
UPDATE directus_settings SET public_favicon = NULL WHERE public_favicon IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = directus_settings.public_favicon);
UPDATE directus_settings SET public_foreground = NULL WHERE public_foreground IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = directus_settings.public_foreground);
UPDATE directus_users SET avatar = NULL WHERE avatar IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = directus_users.avatar);

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

## 13. Log the change in `STAGING_CHANGES/`

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

## What is NOT preserved from staging

Per the earlier decision on this sync: only `directus_files` itself is kept
from staging. `directus_folders` and everything else (all collection data,
flows, schema) comes from dev. If staging's folder structure for the Media
Library mattered, it is now dev's — this was a deliberate choice, not an
oversight.
