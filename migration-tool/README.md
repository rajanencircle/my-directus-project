# migration-tool

Interactive script that automates
[`docs/STAGING-DEV-DATA-SYNC-RUNBOOK.md`](../docs/STAGING-DEV-DATA-SYNC-RUNBOOK.md):
replace one Directus environment's database with another's, choosing any
source → target pair among `dev`, `staging`, `main`, `local`.

## What this tool does and does not do

- **Does not take its own source backups.** It only *reads* `.sql.gz` dumps
  that already exist under `BACKUP_ROOT` (`BOTG/Backup/botg/<date>/<env>/`),
  produced by running `BOTG/Backup/backup/index.js` separately. If none
  exist for the environment you pick as source, it tells you to run that
  tool first and exits.
- **Always takes a fresh backup of the target** immediately before touching
  it — this is the rollback path, not a migration input, and is saved into
  the same `BACKUP_ROOT/<date>/<target>/` folder as
  `pre-migration-rollback_<timestamp>.sql.gz`.
- **Defaults to preserving the target's `directus_files`** (its real,
  S3-linked media rows), reconciling any FK references left dangling by the
  swap — exactly what the runbook does. You can opt out per run and let the
  source dump's own `directus_files` win instead.
- **Defaults to preserving the target's `directus_users` API tokens.**
  `directus_users.token` holds static API tokens in plaintext (unlike the
  bcrypt-hashed `password` column) — client integrations authenticate with
  these directly, so a wipe+restore must not silently rotate them. The tool
  captures the target's non-null tokens (by email) before restoring, then
  writes them back onto the matching restored users afterward. A user with
  no email match in the source dump just gets no update — harmless, since
  that user doesn't exist post-restore anyway. Opt out per run to let the
  source dump's own tokens win instead.
- **Lets you preserve `global_configurations` rows by `entity_type`.**
  `global_configurations` is a flat key/value settings table (`entity` is
  unique, `entity_type` groups related rows — e.g. all `ai-api` rows: token,
  url, model). It has no inbound foreign keys (verified via the `relations`
  MCP tool), so preservation is a plain upsert-by-`entity`: whichever
  `entity_type`s you check keep the target's current key/value for every
  row of that type, regardless of what the source dump has for the same
  `entity`. The prompt lists whatever `entity_type`s actually exist on the
  target, all pre-checked by default — uncheck any you want the source
  dump's values to win for instead.
- **Dry run is the default mode.** It restores the chosen dump into a
  disposable local Postgres container and previews row counts, column
  parity, and orphan counts — without touching any live environment beyond
  two read-only exports from the target. You explicitly choose "Execute" to
  perform the real migration.
- **`main` (production) requires typing a confirmation phrase** in addition
  to the normal "type the target name" confirmation, mirroring
  `BOTG/Backup/backup/db-cleanup.js`'s existing safeguard.
- **Logs every real migration** to `STAGING_CHANGES/`, `DEV_CHANGES/`,
  `MAIN_CHANGES/`, or `CHANGES_AS_DEV/LOCAL-CHANGES.md` (matching the target),
  per this repo's CLAUDE.md rule that every direct change to a live instance
  must be tracked.

## Setup

```bash
cd migration-tool
npm install
cp .env.example .env   # if you don't already have a real .env here
```

Fill in `.env` with real SSH hosts/keys and container names for each
environment (see `.env.example` for what each var means). `local` needs no
SSH settings — it talks to this machine's own
`directus/docker-compose.yaml` containers directly via `docker exec`.

## Usage

```bash
node migrate.js
```

Everything is interactive:

1. Pick the **target** environment (gets overwritten).
2. Pick the **source** environment (dump to migrate from).
3. Pick which existing dump under `BACKUP_ROOT` to use.
4. Choose whether to **preserve the target's `directus_files`** (default:
   yes).
5. Choose whether to **preserve the target's `directus_users` API tokens**
   (default: yes).
6. Choose which **`global_configurations` `entity_type`(s) to preserve**
   (all pre-checked; e.g. `ai-api`, `directus-url`, `botg-api`, `user-token`).
7. Choose **Dry run** (default) or **Execute**.

Run it once as a dry run, read the report, then run it again and choose
Execute when you're satisfied — the tool doesn't remember your previous
choice, so this is a genuine two-pass workflow, not just a flag.

## Requirements

- Node.js, `docker` CLI available locally (used for the dry-run's throwaway
  Postgres container even when migrating between two remote environments).
- SSH key access to the target host's `functional` user for
  `dev`/`staging`/`main`.
- `sudo docker` on the remote hosts must not require an interactive
  password for the SSH user (matches the existing `BOTG/Backup` tooling's
  assumption).
