# Staging — Tours/Excursions/Hotels Schema Alignment with Dev (Pre-Migration)

**Target:** `directus-staging` MCP server **only**. `directus-dev` was read-only reference throughout — never modified.
**Applied:** 2026-07-15
**Type:** Mixed — field additions, a field type fix, relation repoints, dropdown choice sync, one structural flatten (with data migration), and deletion of orphaned legacy collections/fields.
**Context:** The tours/excursions/hotels migration pipeline was validated working correctly in dev. Before running it against staging, dev and staging schemas were diffed collection-by-collection and field-by-field (97 collections compared) to find gaps. This document records every change applied to staging as a result of that diff, so staging now matches dev's schema for every collection touched by the migration.

---

## 1. Missing fields added to staging (17 fields, copied field-for-field from dev: interface, notes, defaults, sort)

**`px_source_id`** (string, hidden, legacy bestof DB oid tracking) added to:
`tours`, `tours_categories`, `tours_dates`, `tours_occupancies`, `tours_price_periods`, `tours_surcharges`, `excursions`, `excursions_categories`, `excursions_price_categories`, `excursions_price_periods`, `excursions_surcharges` (11 collections)

**`source_updated_at`** (timestamp, hidden — legacy source's own last-modified timestamp, used for incremental sync) + **`source_db`** (string select-dropdown, choices `bestof`/`karawane`) added to:
`tours`, `excursions`, `hotels` (hotels was missing only these two; it already had `px_source_id`)

**`is_map`** (boolean) + **`tour32_export`** (boolean) added to:
`tours_directus_files`, `hotels_directus_files` (per-product picture attribute flags from Primarix `pictures_objects_attributes`)

## 2. Type mismatch fixed

**`excursions.object_id`**: was `string` (not readonly) in staging → changed to `integer` (readonly, note `$t:hotels_object_id_note`, options `{min:1, max:1000000000}`) to match dev.
- Only 1 existing record, value `"2"` — converted cleanly to integer `2`.

## 3. Relations repointed from `booking_partners` → `agencies`

Dev relates these m2o fields to `agencies`; staging had them pointing at a stale `booking_partners` collection (leftover from a pre-rename schema state). Repointed via delete+recreate relation (`on_delete: SET NULL` preserved):
- `tours.operator_linked`, `tours.booking_partner` — 0 live data on both fields (verified before change), safe.
- `excursions.operator_linked`, `excursions.booking_partner` — 0 live data on both fields (verified before change), safe.
- `hotels.booking` — **1,714 of 2,000 hotel records had a non-null value here**, referencing the 55-row `booking_partners` table. Staging's `agencies` table had 0 rows at the time (confirmed identical schema to dev's `agencies` via direct field comparison). Per explicit user instruction, all 1,714 references were nulled out (data loss accepted) before repointing the relation, since there was no way to remap `booking_partners` IDs into `agencies` IDs.
  - Nulled in 5 batches of ~400 via `items` `update` (keys + `{"booking": null}`); verified count dropped to 0 afterward.
  - Relation deleted and recreated pointing at `agencies`, `on_delete: SET NULL`.

## 4. `status_primarix` dropdown choices synced to dev's full 5-value set

Staging's choice lists were missing values dev had. Updated `options.choices` + `display_options.choices` to the full set (`draft`/`published`/`unpublished`/`archived`/`deleted`, with dev's colors) on:
- `tours.status_primarix` (staging had none configured)
- `excursions.status_primarix` (staging had `published`/`draft`/`archived` only)
- `hotels.status_primarix` (staging had `published`/`draft` only)

## 5. `locations_tour32` — flattened structure to match dev, with data migration

Dev stores `name` directly on `locations_tour32` (flattened, per dev's field note: "migrated from the former de-DE-only translations junction"). Staging still used the old translated-junction model (`locations_tour32_translations`, single de-DE language only — confirmed via inspecting the `translations_id` column, which was identical across all rows).

Steps taken:
1. Added `name` field (string, required, group `section_name`, translations for de-DE/en-GB/nl-NL) to `locations_tour32` — matching dev's field spec exactly.
2. Migrated all **2,695 rows** from `locations_tour32_translations.name` → `locations_tour32.name`, matched by `locations_tour32_id` = `locations_tour32.id` (same PK numbering in both). Done in 7 batches of ~400 via `items` `update` with per-item `{id, name}` data.
   - Caught and fixed a gap: an early batch only tested 3 rows (ids 1–3) instead of sending the full first chunk (ids 4–400) — verified via `name IS NULL` count (397 missing) and re-sent the missing range.
   - Final verification: `name IS NULL` count = 0 across all 2,695 rows.
3. Set `name` field to `required: true` (matching dev).
4. Deleted the `translations` alias field from `locations_tour32`.
5. Deleted the `locations_tour32_translations` collection (now-empty of purpose, all data migrated).

## 6. Orphaned legacy collections/fields deleted (all confirmed empty or superseded before deletion)

- **`excursions_description_translations`** — old singular-name duplicate, 0 rows, superseded by `excursions_descriptions_translations` (plural, present in both dev/staging, kept).
- **`excursions_price_info_translations`** — old singular-name duplicate, 0 rows, superseded by `excursions_price_infos_translations` (plural, kept). Deleting this collection automatically removed the orphaned `excursions.price_info_translations` (singular) alias field — confirmed via `schema` detail check afterward that only the plural `price_infos_translations` alias remains on `excursions`.
- **`locations_tour32_translations`** — junction/data migrated per section 5 above, then deleted.
- **`booking_partners`** — legacy pre-rename collection (55 rows), only reachable after all referencing relations were repointed to `agencies` (section 3). Deleted per explicit user instruction accepting the data loss.

## 7. Extra field removed

**`destinations.short_code`** (string) — present in staging, absent in dev. Removed.

---

## Verification performed

- Post-change `schema` (discovery mode) diff confirmed `booking_partners`, `excursions_description_translations`, `excursions_price_info_translations`, `locations_tour32_translations` no longer appear in staging's collection list.
- `schema` detail-mode check on `excursions` confirmed `operator_linked`/`booking_partner` relate to `agencies`, and only `price_infos_translations` (plural) alias remains — no orphaned singular alias.
- `hotels.booking` relation confirmed pointing to `agencies` via `relations` read after recreation; live-data count confirmed 0 non-null values immediately before the relation swap.
- `locations_tour32.name` confirmed 0 null values across all 2,695 rows after migration.

## What was intentionally NOT touched (dev)

No writes of any kind were made to `directus-dev` at any point in this exercise — it was used exclusively as the read-only source of truth for every field spec, relation target, and choice list copied into staging.

## REVERT PROCEDURE (staging only — data loss note below)

This revert restores **schema/structure**, but note: the `hotels.booking` → `booking_partners` data (1,714 links) and the `booking_partners` collection's 55 rows, plus the `locations_tour32_translations` junction data, were deleted/migrated as part of this change and **cannot be restored from staging alone** — a fresh copy from a pre-change backup/snapshot would be required for full data revert.

Structural revert steps (in reverse order):
1. Re-add `destinations.short_code` (string) if still needed.
2. Recreate `booking_partners` collection (fields listed in the original diff — see conversation/agent transcript for full field list) if the collection itself needs restoring; data is not recoverable from staging.
3. Recreate `excursions_price_info_translations` and `excursions_description_translations` collections and their orphaned alias fields on `excursions` if needed (unlikely — both were empty and superseded).
4. Recreate `locations_tour32_translations` junction collection and the `translations` alias field on `locations_tour32`; re-add `required: false` (or leave as-is) on `locations_tour32.name`, then remove the `name` field if reverting fully to the junction model. Data would need re-population from a backup.
5. Revert `status_primarix` choices on `tours`/`excursions`/`hotels` to their prior (narrower) lists.
6. Delete the `agencies` relation on `hotels.booking`, `tours.operator_linked`, `tours.booking_partner`, `excursions.operator_linked`, `excursions.booking_partner`; recreate pointing at `booking_partners` (only meaningful if `booking_partners` is restored).
7. Revert `excursions.object_id` back to `string` (not readonly).
8. Delete the 17 added fields listed in section 1 (`px_source_id` × 11, `source_updated_at`/`source_db` × 3, `is_map`/`tour32_export` × 2 collections).

Use the `directus-staging` MCP `fields`/`relations`/`collections`/`items` tools for all of the above.
