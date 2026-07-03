# CLAUDE.md

## What this project is

This is the working repository for the **BOTG (Best of the Globe) ContentHub** — a migration of the client's legacy **Primarix** CMS (travel products: hotels, cruises, tours/daytrips, roundtrips, campers, rental cars, excursions, study trips) to **Directus 11.17.4**. The client also runs **Fotoware/Fotoweb** for media, which is being migrated to Directus + S3 (Hetzner).

It is NOT a single app codebase. It holds: custom Directus extensions, migration/utility scripts, client schema YAMLs, change-tracking logs, custom CSS, DB dumps, and client documentation. Most actual "state" (collections, fields, flows) lives inside the Directus instances and is managed via MCP servers — not in git.

The local Directus runs via Docker (`directus/docker-compose.yaml`): `directus/directus:11.17.4` + PostGIS + Redis, on `localhost:8055`.

## Environments & MCP servers

| MCP server | URL | Notes |
|---|---|---|
| `directus-local` | http://localhost:8055 | Local Docker instance — safe sandbox, test here first |
| `directus-dev` | https://dev.content.botg.cloud | Client DEV — current primary build target |
| `directus-staging` | https://staging.content.botg.cloud | Client staging — every direct change MUST be logged (see below) |
| `directus-main` | (production) | **NEVER touch unless explicitly instructed.** A separate server — do not confuse with local |

- Work ONLY in the environment named in the task. "Local" ≠ "main" ≠ "dev" ≠ "staging".
- The MCP `items` tool has **delete disabled** on most environments. Don't fight it: either ask the user to delete manually / enable permission, or clear data with update-to-null. If delete was enabled for a task, assume it gets disabled again after.

## Non-negotiable working rules

These come from repeated explicit instructions across the entire project history:

1. **Analyse and plan first, change nothing until approved.** Almost every task starts read-only: scan collections/fields/relations/flows via MCP, present findings and a plan, then wait for the go-ahead.
2. **Touch only what the task names.** If the task is "add flows for tours", do not modify fields, other flows, or other collections. Scope creep into "sensitive" schema has broken things before.
3. **Log every direct change made to a live instance in a markdown tracker:**
   - Staging changes → new/updated file in `STAGING_CHANGES/` (see existing files there for the format: what changed, IDs, how to revert).
   - Local cosmetic/organisational changes → `DIRECTUS_LOCAL_COSMETIC_CHANGES.md`.
   - Large cleanups get their own tracker (e.g. `staging-cleanup-tracker.md`).
   The reason: changes made via MCP leave no git trail; these files are the only migration/revert record.
4. **Never hardcode secrets** (Directus tokens, AWS keys) in scripts — read from env vars. This has been flagged repeatedly; leaked tokens had to be rotated.
5. **The `hotels` collection is the reference pattern** for everything: field naming, tab/group structure, translation labels (de-DE / en-GB / nl-NL), flows (MAT, from_price, image badge, surcharge calculation). New products replicate hotels' structure.
6. **New collections/fields must follow the client naming convention:** `docs/conventions/BOTG_ContentHub_Namenskonventionen_v1_13.md` (also `claude-knowledge-base/`). The client brief Excel in `docs/latest_brief/` is the field-level source of truth.

## Repository map

- `directus/` — Docker compose, `.env`, `uploads/`, `extensions/` (the real code in this repo), `monitor-retention.sh`, `local-dump/` (pre-migration flow/schema dumps)
- `directus/extensions/` — custom extensions (see next section)
- `scripts/` — one-off Node utility scripts (CommonJS, built-in `fetch`, inline CONFIG objects, `process.argv` args, `--dry-run` support). Examples: `csv-to-directus-updater.js`, `delete-collections.js`, `import-csv.js`, `migrate-hotels-mysql.js`
- `directus-schema-import/` — **additive** schema importer (merge YAML into live snapshot; see gotcha #1)
- `YAMLs/` — client-provided schema YAMLs (excursions, tours) + backups
- `STAGING_CHANGES/` — change/revert trackers for every staging modification
- `files-local-to-s3/`, `files-s3-to-s3/` — media/asset migration scripts between storage backends and environment buckets
- `css/` — custom Directus CSS per environment, in dated folders (applied via Directus Settings → Custom CSS, not files on the server)
- `docs/` — client docs, price-calculator documentation, briefs, conventions
- `claude-knowledge-base/` — naming conventions, navigation docs, layout mockups
- `bestof-migration-analysis/`, `*.dump`, `*.sql` — Primarix (MySQL, DBs `bestof`/`bestof_full`) dumps and analysis; large files, don't load whole
- Related repos outside this one: `/Users/rajan/Documents/RAJAN/directus/directus-main` (Directus core source — used as reference for native UI patterns) and `/Users/rajan/Documents/RAJAN/GIT/nanditencircle/botg-migration` (the Primarix→Directus migration app)

## Custom extensions (`directus/extensions/`)

Vue 3 + `@directus/extensions-sdk`. Key ones:

- **Price-table interfaces**: `directus-extension-interface-room-prices-table` (hotels — the reference), `-cruise-prices-table`, `-tours-prices-table`, `-surcharge-prices`. All were made **dynamic**: collection/field names come from interface options (stored in `directus_fields.meta.options`), never hardcoded. Follow that pattern for any change. They fetch child data via nested O2M fields on the parent (e.g. `cabin_categories.*`) to avoid 403s from roles lacking direct child-collection read access.
- **`directus-extension-ai-translations`** — translation interface + endpoint; reads its API url/key/model from the `global_configurations` collection (entity type `ai-api`), configurable via interface options, not app env.
- **`media-bundle`** — bundle extension (7 sub-extensions, unified build so building the bundle builds all) providing the custom Media Library module, incl. Revisions/Comments sidebars, @-mention autocomplete and emoji picker cloned from native Directus (`directus-main/app/src/views/private/components/comment-input.vue`).
- **`api`** — custom REST endpoints (`/hotels`, `/products`, `/hotels/:id`); single `shapeHotelDetail` transformer for list + detail, translation-map pattern for language-aware fields.
- Others: `cascading-individual-select` (geo pickers), `directus-extension-item-preview-button`, `flow-manager`, `schema-management-module`, `save-and-refresh`, `occupancy-selector`, `route-dom-injector`, `endpoint-ws-token`.

When asked to replicate native Directus UI/behavior, read the actual source in `directus-main` first rather than approximating.

## Domain model essentials

- **Languages:** `de-DE`, `en-GB`, `nl-NL`. Field labels get translations in all three.
- **Translation pattern:** parent collection has alias fields (special `translations`, often the `ai-translations` interface) pointing at numbered junction collections — e.g. hotels: `hotels_translations` (descriptions), `hotels_translations_1` (prices, holds `from_price`), `hotels_translations_3` (price info / MAT target), `hotels_translations_4` (image badge). Numbered suffixes differ per product — always verify via MCP, never guess.
- **Pricing (hotels pattern):** price basics = categories (`room_categories` / `cabin_categories` / `tours_categories`) × price dates × occupancies, each with `price_start` flags; flows compute the lowest sell price and set `from_price` on `*_translations_1`. Surcharges are a separate O2M collection with a surcharge calculator flow. Margin/exchange-rate presets fill-if-empty (never overwrite non-empty values). Full write-up: `docs/Hotel_Price_Calculator_Documentation.md`.
- **Flows live in the DB, not the repo.** Major systems: MAT (Mobility Advice Text sync — global record → per-product translation rows), from_price setters, image-badge/publication-date flows (+ cron notifications), generated-filename auto-fill (`[3L cluster][3L country][YYYYMMDD][editor initials]_NNN`), margin/exchange-rate preset flows. Flow writes use `permissions: "$trigger"` + `emitEvents: false` to bypass readonly UI flags without event loops.
- **PK types are mixed:** hotels/cruises = UUID, tours = integer. Check before creating FKs — type mismatch breaks relations.
- **Tours naming:** the collection `tours` is the product the client calls **daytrips**; `excursions` is daytrips v2; roundtrips is a separate product. A tours→daytrips migration exists (`STAGING_CHANGES/TOURS-TO-DAYTRIPS-MIGRATION.md`).

## Hard-won gotchas

1. **`directus schema apply` is a destructive full replacement** — it deletes every collection not present in the YAML. Client YAMLs are generated from lean instances; applying one raw to a full instance would wipe all products. Use the additive approach instead: GET `/schema/snapshot`, merge in only new collections/fields/relations, POST `/schema/diff?force=true` (needed for cross-version snapshots), inspect the diff for any `kind: "D"` entries (abort if present), then POST `/schema/apply`. That's what `directus-schema-import/` implements.
2. **Schema import crash "Cannot read properties of undefined (reading 'fields')"**: a collection whose `meta.group` points to a parent that doesn't exist (and isn't created in the same run) is silently skipped, but its fields still get attempted. Fix: pre-create the missing parent as a folder collection (`schema: null`) or null the child's `meta.group`.
3. **Directus data retention** (`RETENTION_*` env vars) fails with an FK violation unless `directus_revisions.parent` FK is `ON DELETE SET NULL` (a Directus upgrade may revert this). Monitor with `directus/monitor-retention.sh`; deletes don't shrink disk — needs `--vacuum` (VACUUM FULL).
4. **Deleting collections**: children/junctions before parents (FK order); the `directus_collections.group` self-FK means group references must be nulled before deleting a parent used as a UI group. `DROP TABLE ... CASCADE` drops referencing FKs, not the referencing tables.
5. **Flow operation `resolve` pointers are unique** — re-wiring an operation chain requires nulling all existing `resolve` values in the chain first, then reconnecting in order.
6. **Custom CSS**: standalone `group-detail` sections (no `group-raw` ancestor — e.g. the geo collections) match `.v-detail.group-detail:not(.group-raw .group-detail)`, NOT `.content-wrapper .v-form .group-detail`. Always verify selectors against the live rendered DOM. The one-frame-vs-two-frames rendering of `group-raw` wrappers depends on `first-visible-field` nesting order, not field meta.
7. **Collection organisation is meta-only**: reorganising the sidebar (folders, hiding, ordering) may only touch `meta.hidden`, `meta.group`, `meta.sort`, `meta.icon`, `meta.color` — nothing that affects schema or flows.
8. **CSV parsing**: client CSVs contain quoted values with commas — use a proper quote-aware parser, not `split(',')`.
9. **Geo cascade**: `places` is the geo source of truth (cascades `state_id`, `region_id`, `location_tour32`); `locations_tour32` (~2,695 rows) is German-only Tour User search keys, being made non-translatable. ID systems: `object_id`/`px_source_id` = Primarix OID, `id_tour_user`/`haupt_id_tour_user` = TourUser.

## Workflow habits the user expects

- Tasks usually arrive as ClickUp tickets pasted into chat — often in German or with German labels. Read the whole ticket, flag anything ambiguous or risky in the brief before executing (the client explicitly asks for this).
- When asked to draft a client reply, write it structured, point-wise, in a soft/easy-to-understand tone.
- Back up before destructive operations (schema snapshot / DB dump) and say what the rollback path is.
- Test on `directus-local` (or dev) first, then replicate the exact same changes to staging on request — and update the corresponding `STAGING_CHANGES/` file in the same turn.
- Dumps and `.sql` files in the repo root are hundreds of MB — grep/stream them, never read whole.
