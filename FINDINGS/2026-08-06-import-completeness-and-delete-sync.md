# Import completeness + delete-sync — full analysis and implementation plan

**Ticket:** (1) hotels/tours are missing records vs the source dump after import; (2) client requirement — Primarix dumps are the single source of truth, editors delete items in Primarix, Directus must delete them too.
**Date:** 2026-08-06
**Environments checked:** `directus-local`, cross-referenced against `botg_full_20260806` / `karawane_full_20260806` (Homebrew MySQL, localhost:3306)

---

## 1. Current state (directus-local vs dump)

| Collection | Directus | Dump (distinct oid) | Verdict |
|---|---|---|---|
| hotels | 1,554 | 1,928 | **-374 missing — real import gap** |
| tours | 975 | 1,620 | **-645 missing — real import gap** |
| excursions | 550 | 550 | complete |
| cruises | 559 | 556 | **+3 over — stale deleted-in-source records never removed** |
| vehicles | 388 | camper_vehicle=172 + rentalcars_vehicle=210 = 382 | complete (within noise) |

Two independent problems, confirmed separately — fixing one does not fix the other:

- **A. Import incompleteness** (hotels, tours): the pipeline never got a clean full run.
- **B. No delete-sync** (cruises, and latent in every other collection): nothing in the pipeline has ever removed a Directus record whose source row disappeared from Primarix. Cruises is the only collection where it's currently visible because cruises happens to be the one collection with zero missing-record debt masking it. The same drift is silently possible in hotels/tours/excursions/vehicles too — it just isn't currently visible because those collections are net short, not net long.

---

## 2. Root cause — Problem A (import incompleteness)

Confirmed via `logs/2026-07-22.log`: a full run for `tours` and `excursions` hit `connect ECONNREFUSED 127.0.0.1:3308` mid-run:
- tours: 71 succeeded / 1590 failed
- excursions: 114 succeeded / 436 failed (excursions was later fully backfilled by a subsequent run; hotels/tours never were)

Two compounding defects in the pipeline make this kind of failure both likely and silent:

1. **No circuit breaker on connection loss** (`migrations/pipeline/run.js:216-346`). Every item is wrapped in its own try/catch (`run.js:338-345`) that logs the failure and moves on. When the source MySQL connection itself is down, this doesn't fail fast — it burns through every remaining item in the queue, individually, as a "failure," instead of recognizing "the source is unreachable, stop and retry."
2. **A shared-source race between concurrent jobs** (`server/loaders/queue.loader.js:20,35-72,393-401`). `MIGRATION_WORKER_CONCURRENCY` defaults to 3. Hotels, tours, excursions, and vehicles all read from the same `bestof` database. `ensureSourceFresh()` only locks the *refresh* step (drop-database + reimport) — it does nothing to stop a **different concurrent job** (e.g. a tours run) from querying `bestof` while a hotels job's refresh is mid-flight dropping and recreating that exact database underneath it. This is the most plausible trigger for a mid-run `ECONNREFUSED`.
3. **No post-run completeness check.** `fetchOidCount()` already exists (`migrations/sources/sql.js:73-82`) but nothing compares it against what a run actually processed. A run that's short by hundreds of records produces no alert — it was only caught today by manual inspection, a full two weeks after the failed run.

---

## 3. Root cause — Problem B (no delete-sync) + the FK blocker

The pipeline (`migrations/pipeline/run.js`) only ever upserts. There is no step, anywhere, that looks at what a product's Directus collection contains and removes items whose source row no longer exists. Per the client: **editors delete records directly in Primarix, and the next dump reflects that deletion — Directus must delete them too.** Cruises id 4 (`px_source_id=15784`) and id 21 (`px_source_id=22834`) are the visible symptom: real historical cruise content (`source_updated_at` from 2013/2017) that's absent from the current dump — i.e., deleted in Primarix — but still live in Directus.

Before any delete routine can run safely, every child table under the 5 product collections must actually cascade cleanly, or a bulk delete run will either **hard-fail** (blocking the whole routine) or **silently leave orphaned rows behind** (slow-burning data debris that never gets cleaned, defeating the point of the routine). I re-audited all relations pointing at `hotels`/`tours`/`excursions`/`cruises`/`vehicles` in `directus-local` (82 relations total) — this supersedes the narrower 5-table list in `2026-08-05-excursions-routes-delete-fk-constraint.md`, which only checked O2M repeater tables and missed translation tables and most of `hotels`' children:

| Collection | CASCADE (fine) | Needs fixing | Fixed already |
|---|---|---|---|
| cruises | 15/15 | 0 | — |
| excursions | 14/18 | 3 (`SET NULL`) | 1 (`excursions_routes` → CASCADE, done 2026-08-05) |
| tours | 20/22 | 2 (`SET NULL`) | — |
| hotels | 7/21 | **14 (`SET NULL`)** | — |
| vehicles | 5/6 | 1 (`SET NULL`) | — |

Full list still needing `on_delete: CASCADE` (currently `SET NULL`, which lets deletes through but orphans the child row forever — `parent_id = null`, never cleaned up):

```
excursions_dates.excursions_id
excursions_price_calculation_translations.excursions_id
excursions_price_categories.excursion_id
tours_dates_translations.tours_id
tours_routes.tours_id
hotels_accommodation_types.hotels_id
hotels_accommodation_types_1.hotels_id
hotels_activities.hotels_id
hotels_activities_1.hotels_id
hotels_directus_files.hotels_id        <- media junction; SET NULL here leaks directus_files links forever
hotels_files.hotels_id
hotels_partner.hotels_id
hotels_translations.hotels_id
hotels_translations_1.hotels_id
hotels_translations_2.hotels_id
hotels_translations_3.hotels_id
hotels_translations_4.hotels_id
hotels_translations_5.hotels_id
room_prices.hotel_id
camper_specs.vehicle
```

`cruises` needed zero fixes — which is exactly why it's the collection where the delete-sync gap became visible: it's the only one of the five with no missing-import debt to obscure it.

---

## 4. Implementation plan

### Phase 0 — FK cascade audit (prerequisite, do first, schema-only, no data migration)
1. Apply `on_delete: CASCADE` (+ `meta.one_deselect_action: "delete"`) to all 19 relations listed above, in `directus-local` first.
2. Verify: delete a throwaway parent row with children populated in each affected child table; confirm cascade, no FK errors, no orphaned rows left behind.
3. Port to `directus-dev` → `directus-staging` → `directus-main`, same order as the excursions_routes fix.

### Phase 1 — Fix import reliability (must land before any backfill run, or the backfill can fail the same way)
1. **Serialize source access.** Extend the Redis lock so it covers the whole migration, not just the refresh step: increment a per-source "in use" counter before `forkMigrationRun`, decrement after; `ensureSourceFresh` must wait for that counter to reach 0 before dropping/recreating the shared source DB. (Cheap interim mitigation: set `MIGRATION_WORKER_CONCURRENCY=1`.)
2. **Circuit breaker in `run.js`'s per-item catch.** Classify connection-level errors (`ECONNREFUSED`, `PROTOCOL_CONNECTION_LOST`, `ETIMEDOUT`) separately from per-item data errors. On N consecutive connection errors: pause, probe the pool (`SELECT 1`) with backoff, and either resume once healthy or abort the run with a clear "source unreachable" status — never keep marking hundreds of good records "failed" one by one.
3. **Post-run completeness check.** After a full (unscoped) run, compare `fetchOidCount(product)` against the number of items actually processed this run + already up to date; log/alert loudly on any mismatch instead of relying on manual discovery.

### Phase 2 — Backfill hotels & tours (after Phase 1 lands)
Run one full, unscoped migration each for `hotels` and `tours` against `directus-local`; verify post-run counts match the dump before promoting the same run to dev/staging/main.

### Phase 3 — Delete-sync routine (new capability, after Phase 0 is live everywhere it will run)
For each product, after its normal upsert pass completes successfully (and only then — never on a partial/scoped run):
1. Fetch the full current set of source ids for that product's table(s) (hotels/trips/tours/kreuzfahrten, and **both** `camper`+`rentalcars` for vehicles) — reuse the existing overview-query machinery, just the id column.
2. Fetch all Directus items for that collection with their `px_source_id`/`object_id` (and `source_db`, to avoid cross-source collisions on shared collections).
3. `stale = Directus ids not present in the current source id set`.
4. **Safety guardrails before deleting anything:**
   - Only run delete-sync after a run that itself passed the Phase 1 completeness check (never delete based on a partial dump read/download).
   - Abort delete-sync (log + alert, don't delete) if the fetched source id count for this run is implausibly smaller than the last known good count (e.g. >5–10% drop) — that pattern means "the dump/download broke," not "editors deleted a lot of records."
   - Dry-run first: log the exact stale-id list without deleting, for at least one full cycle per collection, so someone can eyeball it before trusting the routine unattended.
5. Delete the stale items via the Directus API (now safe post-Phase-0 — cascades clean up all child rows).

### Order matters
Phase 0 → Phase 1 → Phase 2 → Phase 3, strictly in that order. Running Phase 3 before Phase 0 risks hard FK failures (hotels) or silent orphaned debris (everywhere else). Running Phase 3 before Phase 1/2 would let a still-buggy, still-incomplete import feed bad "current source id" sets into the delete routine.

## Status

**Plan only — nothing beyond the 2026-08-05 `excursions_routes` fix has been applied.** Awaiting go-ahead per phase.
