# Environment Variables — Repository Map

This repo uses **one `.env` per folder that needs configuration, plus one at the repo
root**. Every `.env` is gitignored; every location has a tracked `.env.example`
template with placeholders only. **Never commit real tokens, passwords, or keys.**

Last organized: 2026-07-04.

## Layout

| Location | Env file (gitignored) | Template (tracked) | Loaded by |
|---|---|---|---|
| repo root | `.env` | `.env.example` | `node --env-file=.env scripts/set-users-language.js` (Node ≥ 20.6); also the canonical reference for per-environment Directus URLs/tokens |
| `directus/` | `directus/.env` | `directus/.env.example` | Docker Compose auto-loads it for `${VAR}` interpolation in `docker-compose.yaml`; `monitor-retention.sh` greps it for `DB_USER`/`DB_DATABASE` |
| `directus-schema-import/` | `.env` | `.env.example` | `require("dotenv").config()` in `build-apply-json.js`, `import.js`, `merge-yaml.js` (run from that folder) |
| `files-local-to-s3/` | `.env` | `.env.example` | `import "dotenv/config"` in `migrate.js`, `cleanup-s3.js` (run from that folder) |
| `files-s3-to-s3/` | `.env` | `.env.example` | `import "dotenv/config"` in `migrate.js`, `cleanup-s3.js` (run from that folder) |
| `scripts/` | `.env` | `.env.example` | No dotenv in these scripts — use `node --env-file=.env <script>` from that folder |

Folders that intentionally have **no** env file: `script/` (singular — pure local JSON
transforms, no config), `translations/` (only a hardcoded local Ollama URL in
`translate-yaml.js`), `directus/extensions/` (see "Runtime-provided variables" below).

## Keys per location

### Repo root `.env`
`DIRECTUS_LOCAL_URL`, `DIRECTUS_LOCAL_TOKEN`, `DIRECTUS_DEV_URL`, `DIRECTUS_DEV_TOKEN`,
`DIRECTUS_STAGING_URL`, `DIRECTUS_STAGING_TOKEN`, `DIRECTUS_MAIN_URL`, `DIRECTUS_MAIN_TOKEN`
— read by `scripts/set-users-language.js` (multi-environment runner).

### `directus/.env` (Directus runtime, consumed by `docker-compose.yaml`)
- Database: `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- Core: `DIRECTUS_PORT`, `DIRECTUS_SECRET`, `HOST`
- Cache: `CACHE_ENABLED`, `CACHE_AUTO_PURGE`
- Admin bootstrap: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- URL/CORS: `PUBLIC_URL`, `CORS_ENABLED`, `CORS_ORIGIN`
- Cookies: `REFRESH_TOKEN_COOKIE_{SECURE,SAME_SITE,DOMAIN}`, `SESSION_COOKIE_{SECURE,SAME_SITE,DOMAIN}`
- Extensions: `EXTENSIONS_PATH`, `EXTENSIONS_AUTO_RELOAD`, `EXTENSIONS_ROLLDOWN`
- CSP: `CONTENT_SECURITY_POLICY_DIRECTIVES__{FRAME_SRC,SCRIPT_SRC,IMG_SRC}`
- Flows/files: `FLOWS_EXEC_ALLOWED_MODULES`, `FILE_METADATA_ALLOW_LIST`
- WebSockets: `WEBSOCKETS_ENABLED`, `WEBSOCKETS_REST_AUTH`
- Retention: `RETENTION_{ENABLED,SCHEDULE,BATCH}`, `ACTIVITY_RETENTION`, `REVISIONS_RETENTION`, `FLOW_LOGS_RETENTION`
- Assets: `ASSETS_TRANSFORM_IMAGE_MAX_DIMENSION`
- Email (**optional — currently commented out**): `EMAIL_TRANSPORT`, `EMAIL_FROM`,
  `EMAIL_SMTP_{HOST,PORT,USER,PASSWORD}`. `docker-compose.yaml` references these;
  while unset they resolve to empty strings (compose prints a warning, mail is
  non-functional). Uncomment and fill in `directus/.env` to enable mail.

### `directus-schema-import/.env`
`DIRECTUS_{LOCAL,STAGING,PROD}_{URL,TOKEN}` — read by all three scripts via a
`CONFIG` object; environment is chosen by CLI arg.

### `files-local-to-s3/.env`
`DIRECTUS_URL`, `DIRECTUS_TOKEN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`AWS_REGION`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_PREFIX`, `S3_DISK_NAME`, `TAR_PATH`.
The file holds one block per environment (dev/staging/prod); exactly **one block is
active** at a time, the others stay commented.

### `files-s3-to-s3/.env`
`SRC_S3_BUCKET`, `SRC_S3_PREFIX`, `DST_S3_BUCKET`, `DST_S3_PREFIX`,
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_ENDPOINT`.
`SRC_DIRECTUS_URL`/`SRC_DIRECTUS_TOKEN` also appear in the file but are **not read
by any code** — kept for reference only.

### `scripts/.env`
`DIRECTUS_URL`, `DIRECTUS_TOKEN` — read by
`import_geographies_02-07-2026/import-geographies.js` and `migrate-hotels-mysql.js`.
Point at ONE environment at a time. `set-users-language.js` is the exception: it
reads the multi-environment names, so run it from the repo root against the root `.env`.

## How to run

```bash
# scripts/ folder (no dotenv — Node's --env-file, requires Node >= 20.6)
cd scripts
node --env-file=.env import_geographies_02-07-2026/import-geographies.js --dry-run
node --env-file=.env migrate-hotels-mysql.js

# set-users-language.js — from the REPO ROOT (uses root .env)
node --env-file=.env scripts/set-users-language.js

# directus-schema-import / files-local-to-s3 / files-s3-to-s3 — dotenv, run in-folder
cd directus-schema-import && node import.js local
cd files-local-to-s3 && node migrate.js --dry-run

# Local Directus stack — compose auto-loads directus/.env
cd directus && docker compose up -d
```

## Runtime-provided variables (not in any repo `.env`)

Read by extension code but supplied by the **server environment** where Directus
runs (or its defaults), not by files in this repo:

- `NODE_ENV` — `directus/extensions/api/src/api/shared/errorHandler.js`
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` — `directus/extensions/api/src/api/shared/rateLimiter.js`
- `DIRECTUS_PUBLIC_URL` — `directus/extensions/api/src/utils/images.js`

The `ai-translations` extension and the `api` extension read their API keys from the
`global_configurations` collection in the database, not from env files.

## Gitignore rules

Root and `directus/` `.gitignore`s ignore `.env`, `.env.*`, and `.env-*` while
allowlisting `!.env.example` / `!.env.test`. (`.env-*` was added because the glob
`.env.*` does not match hyphenated names like `.env-2` — which is how
`directus/.env-2` was once committed.) `files-local-to-s3/` and `files-s3-to-s3/`
carry the same rules in their own `.gitignore`s. The root `.env` rule (no leading
slash) applies at every depth, which is what keeps `scripts/.env` ignored.

## Known discrepancies (intentional, kept per-folder by decision on 2026-07-04)

Token **values** were deliberately NOT unified across folders — each folder keeps
the value that is known to work for its tooling:

1. `DIRECTUS_LOCAL_TOKEN` in the root `.env` differs from the one in
   `directus-schema-import/.env` (different service tokens for the same local instance).
2. The root `.env` currently uses one identical token value for LOCAL, DEV and
   STAGING; the (commented) DEV token in `files-local-to-s3/.env` is a different
   dev token.
3. `directus/.env-2` still exists on disk as an untracked personal reference
   (old LAN `192.168.11.75` config). It was removed from git tracking on 2026-07-04
   but its `DIRECTUS_SECRET`/`ADMIN_PASSWORD` values remain in **git history**;
   purging requires a history rewrite, rotating those values is the practical fix.

## Known debt — hardcoded secrets in tracked code (NOT fixed here; needs code changes)

The following **git-tracked** files still contain hardcoded Directus tokens and/or an
AI API key inline instead of reading env vars. They were intentionally left untouched
by the env reorganization (no-code-change constraint). Until they are refactored and
the tokens **rotated**, treat every token appearing in them as compromised:

- `scripts/csv-to-directus-updater.js` — active prod URL + token; commented local/staging/dev tokens
- `scripts/data-transformer.js` — active prod token; commented tokens + AI API key
- `scripts/data-transformer copy.js` — active dev token + **active AI API key** (botg.ai-playground.pro)
- `scripts/data-transformer copy 2.js` — active dev token + **active AI API key**
- `scripts/delete-collections.js` and `scripts/delete-collections copy.js` — local token
- `scripts/import-csv.js` and `scripts/import-csv copy.js` — local tokens; commented staging/dev tokens
- `scripts/set-users-language.js:50` — a real token string sits where the env-var
  *name* `DIRECTUS_DEV_TOKEN` belongs (bug: the dev slot resolves to `undefined`,
  and the token is leaked). Fix requires a one-line code change + token rotation.
- `scripts/migrate-hotels-mysql.js` — no secret, but the MySQL call is hardcoded
  (`mysql -u root`, DB `botg`) rather than using `MYSQL_*` env vars.
- `script/staging-flow.json` — a tracked Directus flow export containing the same
  AI API key twice (as `Authorization: Bearer` headers inside flow operations).

Recommendation: rotate the exposed tokens in Directus (Settings → Users → token),
then refactor these scripts to `process.env.*` in a separate, code-touching task.
