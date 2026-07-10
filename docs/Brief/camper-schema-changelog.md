# Camper Schema Changelog

**Project:** BOTG Primarix-to-Directus Migration  
**Product:** Campers  
**Environment:** `directus-local` (localhost:8055)  
**Reference doc:** `docs/camper-schema-mapping.md`

---

## How to Use This File

- Each section is a discrete batch of changes.
- **Revert** instructions appear under each batch — run them in **reverse order** (bottom → top) to undo.
- All MCP actions use the `directus-local` MCP server unless noted.
- DB-level changes (marked **[DB]**) require: `docker exec directus-cms-template-database-1 psql -U directus -d directus`

---

## Batch 1 — Core Scalar Fields on `campers` (Object Info + Status)

**Date:** 2026-06-18  
**Fields added to:** `campers`

| Field | Type | Interface | Notes |
|---|---|---|---|
| `object_info_primarix` | string | input | PX: `objectinfo` |
| `internal_remarks` | text | input-multiline | PX: `field_1330_1` |
| `season` | integer | select-dropdown-m2o | M2O → `seasons` |
| `sell_prices_status` | string | select-dropdown | hidden; choices: idle/processing/done/failed |
| `sell_prices_updated_at` | timestamp | datetime | hidden |
| `px_source_id` | string | input | hidden |

**Revert:** Delete these 6 fields from `campers` via Directus Data Model UI or `fields` MCP delete action.

---

## Batch 2 — Partner + Address + Contact Fields on `campers`

**Date:** 2026-06-18  
**Fields added to:** `campers`

| Field | Type | Interface | Notes |
|---|---|---|---|
| `partner_type` | string | select-radio | choices: all / selected |
| `name` | string | input | PX: `field_268_1` — Company name |
| `street` | string | input | PX: `field_269_1` |
| `street_number` | string | input | PX: `field_270_1` |
| `zip_code` | string | input | PX: `field_272_1` |
| `place` | integer | cascading-individual-select | M2O → `places` |
| `location_tour32` | integer | cascading-individual-select | M2O → `locations_tour32` |
| `state` | integer | cascading-individual-select | M2O → `states` |
| `country` | integer | cascading-individual-select | M2O → `countries` |
| `phone_general` | string | input | PX: `field_277_1` |
| `phone_ah` | string | input | PX: `field_386_1` |
| `email_general` | string | input | PX: `field_279_1` |
| `website` | string | input | PX: `field_280_1` |

**Revert:** Delete these 13 fields from `campers`.

---

## Batch 3 — Reservation + Conditions + Image Badge + Specials/Flex Fields on `campers`

**Date:** 2026-06-18  
**Fields added to:** `campers`

| Field | Type | Interface | Notes |
|---|---|---|---|
| `booking_partner` | string | select-radio | choices: all / selected |
| `booking` | uuid | select-dropdown-m2o | M2O → `booking_details` |
| `res_phone` | string | input | PX: `field_296_1` |
| `res_email` | string | input | PX: `field_298_1` |
| `id_tour_user` | string | input | Tour32 service provider ID |
| `haupt_id_tour_user` | string | input | Main Tour32 service provider ID |
| `booking_info` | text | input-multiline | PX: `field_393_1` |
| `minimum_rental_days` | integer | input | PX: `field_1064_1` |
| `price_type` | string | select-dropdown | choices: flex / standard |
| `camper_calculation_day` | string | input | PX: `field_1333_1` |
| `camper_calculation_season` | string | input | PX: `field_1336_1` |
| `image_badge_start_date` | date | datetime | PX: `field_1509_1` |
| `image_badge_end_date` | date | datetime | PX: `field_1509_2` |
| `image_badge_status` | string | select-dropdown | choices: active / inactive |
| `camper_specials` | json | list (repeater) | PX: `field_690_1`; fields: title, text |
| `flex_head` | text | input-multiline | PX: `field_870_1` |
| `flex_explanation` | text | input-multiline | PX: `field_913_1` |
| `flex_table` | text | input-multiline | PX: `field_830_1` |
| `flex_prices_supplier_code` | string | input | PX: `field_1367_1` |
| `price_sample_camper` | text | input-multiline | PX: `field_1436_1` |
| `price_sample_1_date_from` | date | datetime | PX: `field_1437_1` |
| `price_sample_1_date_to` | date | datetime | PX: `field_1437_2` |
| `price_sample_2_date_from` | date | datetime | PX: `field_1446_1` |
| `price_sample_2_date_to` | date | datetime | PX: `field_1446_2` |
| `price_sample_footnote` | text | input-multiline | PX: `field_1438_1` |

**Revert:** Delete these 25 fields from `campers`.

---

## Batch 4 — Tab / Group Alias Fields on `campers`

**Date:** 2026-06-18  
**Alias fields added to:** `campers`

| Field | Interface | Parent Group | Label (de-DE / en-GB / nl-NL) |
|---|---|---|---|
| `camper_tabs` | group-tabs | — | Camper Tabs |
| `master_data_group` | group-raw | camper_tabs | Stammdaten / Master Data / Stamgegevens |
| `descriptions_group` | group-raw | camper_tabs | Beschreibung / Description / Beschrijving |
| `price_infos_group` | group-raw | camper_tabs | Preisinformationen / Price Information / Prijsinformatie |
| `conditions_group` | group-raw | camper_tabs | Mietbedingungen / Rental Conditions / Huurvoorwaarden |
| `price_basic_group` | group-raw | camper_tabs | Kalkulationsgrundlagen / Calculation Basics / Berekeningsbeginselen |
| `prices_group` | group-raw | camper_tabs | Preiskalkulator / Price Calculator / Prijscalculator |
| `offers_group` | group-raw | camper_tabs | Specials / Specials / Specials |
| `surcharges_group` | group-raw | camper_tabs | Zuschläge / Surcharges / Toeslagen |
| `depots_group` | group-raw | camper_tabs | Depots / Depots / Depots |
| `image_badge_group` | group-raw | camper_tabs | Image Badge / Image Badge / Image Badge |
| `media_group` | group-raw | camper_tabs | Medien / Media / Media |
| `partner_group` | group-detail | master_data_group | Partner / Partner / Partner |
| `reservation_group` | group-detail | master_data_group | Reservierung / Reservation / Reservering |

**Revert:** Delete all 14 alias fields from `campers` (delete child groups before parents).

---

## Batch 5 — Sub-Collections Created

**Date:** 2026-06-18

### `camper_vehicle_categories`
Vehicle categories/types per camper rental company. Group: `campers`.

Fields: `id` (uuid PK), `sort`, `campers_id` (FK), `headline`, `subline`, `number_persons_max`, `mode_of_drive`, `supplier_product_code`, `url_alias`, `depots_available`, `camping_equipment`, `translations` (alias → `camper_vehicle_categories_translations`)

### `camper_price_periods_list`
Date-based price periods per company. Group: `campers`.

Fields: `id` (int PK), `sort`, `campers_id` (FK), `price_period_start`, `price_period_end`, `price_start`

### `camper_rental_periods_list`
Min/max rental day definitions per company. Group: `campers`.

Fields: `id` (int PK), `sort`, `campers_id` (FK), `min_days`, `max_days`

### `camper_seasons_list`
Season definitions with date ranges per company. Group: `campers`.

Fields: `id` (int PK), `sort`, `campers_id` (FK), `season_label` (M2O → `seasons`), `season_start`, `season_end`

### `camper_surcharges`
Surcharge instances per company. Group: `campers`.

Fields: `id` (int PK), `sort`, `campers_id` (FK), `title_booking_name`, `mandatory_optional`, `surcharge_calc_type`, `translations` (alias → `camper_surcharges_translations`)

### `camper_depots`
Pickup/dropoff depot locations per company. Group: `campers`.

Fields: `id` (int PK), `sort`, `campers_id` (FK), `depot_type`, `name`, `street`, `street_number`, `zip_code`, `town` (M2O → `places`), `state` (M2O → `states`), `country` (M2O → `countries`), `phone`, `fax`, `email`, `depot_surcharge`, `office_hours`

**Revert:** Drop all 6 collections (Directus will cascade-delete their fields and meta).

---

## Batch 6 — Translation Collections Created

**Date:** 2026-06-18

| Collection | Parent FK Field | Content Fields | Junction Field |
|---|---|---|---|
| `campers_descriptions_translations` | `campers_id` | teaser, text_positive, text_negative, description_supplementary | `languages_code` |
| `campers_price_infos_translations` | `campers_id` | services_included, services_not_included, additional_bookable, deviating_cancelation_terms, note, mobility_advice_text | `languages_code` |
| `campers_conditions_translations` | `campers_id` | cond_driver, cond_licence, cond_minimum_rental, cond_calculation, cond_oneway, cond_cumulate, cond_restricted_area, cond_border_crossing, cond_insurance, cond_additional_insurance, cond_allinclusive, cond_not_covered_insurance, cond_bond, cond_towaway | `languages_code` |
| `campers_image_badge_translations` | `campers_id` | image_badge_teaser, image_badge_details | `languages_code` |
| `camper_vehicle_categories_translations` | `camper_vehicle_categories_id` | text_introduction, description, bedsize, equipment, note | `languages_code` |
| `camper_surcharges_translations` | `camper_surcharges_id` | description | `languages_code` |

All translation collections: `hidden: true`, `group: campers`.

**Revert:** Drop all 6 translation collections.

---

## Batch 7 — O2M + M2M + Translations Alias Fields on `campers`

**Date:** 2026-06-18  
**Alias fields added to:** `campers`

| Field | Type/Special | Interface | Group | Target Collection |
|---|---|---|---|---|
| `partner` | alias / m2m | list-m2m | master_data_group | → `partner` via `campers_partner` |
| `descriptions` | alias / translations | translations | descriptions_group | → `campers_descriptions_translations` |
| `price_infos` | alias / translations | translations | price_infos_group | → `campers_price_infos_translations` |
| `conditions` | alias / translations | translations | conditions_group | → `campers_conditions_translations` |
| `vehicle_categories` | alias / o2m | list-o2m | price_basic_group | → `camper_vehicle_categories` |
| `price_periods` | alias / o2m | list-o2m | price_basic_group | → `camper_price_periods_list` |
| `rental_periods` | alias / o2m | list-o2m | price_basic_group | → `camper_rental_periods_list` |
| `camper_seasons` | alias / o2m | list-o2m | price_basic_group | → `camper_seasons_list` |
| `surcharges_list` | alias / o2m | list-o2m | surcharges_group | → `camper_surcharges` |
| `depots` | alias / o2m | list-o2m | depots_group | → `camper_depots` |
| `image_badge` | alias / translations | translations | image_badge_group | → `campers_image_badge_translations` |
| `media` | alias / files | files | media_group | → `directus_files` via `campers_directus_files` |

**Revert:** Delete these 12 alias fields from `campers`.

---

## Batch 8 — Directus Relations

**Date:** 2026-06-18

### M2O Relations on `campers`

| Field | → Related Collection | On Delete |
|---|---|---|
| `season` | `seasons` | SET NULL |
| `place` | `places` | SET NULL |
| `location_tour32` | `locations_tour32` | SET NULL |
| `state` | `states` | SET NULL |
| `country` | `countries` | SET NULL |
| `booking` | `booking_details` | SET NULL |

### O2M Relations (sub-collections → campers)

| Junction FK | Related Collection | One Field on campers | Sort Field |
|---|---|---|---|
| `camper_vehicle_categories.campers_id` | `campers` | `vehicle_categories` | sort |
| `camper_price_periods_list.campers_id` | `campers` | `price_periods` | sort |
| `camper_rental_periods_list.campers_id` | `campers` | `rental_periods` | sort |
| `camper_seasons_list.campers_id` | `campers` | `camper_seasons` | sort |
| `camper_surcharges.campers_id` | `campers` | `surcharges_list` | sort |
| `camper_depots.campers_id` | `campers` | `depots` | sort |

All with `ON DELETE CASCADE`.

### M2O Relations in Sub-collections

| Collection.Field | → Related Collection | On Delete |
|---|---|---|
| `camper_seasons_list.season_label` | `seasons` | SET NULL |
| `camper_depots.town` | `places` | SET NULL |
| `camper_depots.state` | `states` | SET NULL |
| `camper_depots.country` | `countries` | SET NULL |

### Translations Relations (FK + junction_field)

| Translation Collection | FK Field | → Parent | One Field | Junction Field |
|---|---|---|---|---|
| `campers_descriptions_translations` | `campers_id` | `campers` | `descriptions` | `languages_code` |
| `campers_price_infos_translations` | `campers_id` | `campers` | `price_infos` | `languages_code` |
| `campers_conditions_translations` | `campers_id` | `campers` | `conditions` | `languages_code` |
| `campers_image_badge_translations` | `campers_id` | `campers` | `image_badge` | `languages_code` |
| `camper_vehicle_categories_translations` | `camper_vehicle_categories_id` | `camper_vehicle_categories` | `translations` | `languages_code` |
| `camper_surcharges_translations` | `camper_surcharges_id` | `camper_surcharges` | `translations` | `languages_code` |

All with `ON DELETE CASCADE`.

### M2M Relations

#### `campers` ↔ `partner` via `campers_partner`

| Junction Collection | Field | → Collection | Junction Field |
|---|---|---|---|
| `campers_partner` | `campers_id` | `campers` (one_field: `partner`) | `partner_id` |
| `campers_partner` | `partner_id` | `partner` | `campers_id` |

> **[DB fix applied]** `partner_id` was initially created as `integer` — had to be dropped and recreated as `uuid` via:
> ```sql
> ALTER TABLE campers_partner DROP COLUMN partner_id;
> ALTER TABLE campers_partner ADD COLUMN partner_id uuid;
> ```

#### `campers` ↔ `directus_files` via `campers_directus_files`

| Junction Collection | Field | → Collection | Junction Field |
|---|---|---|---|
| `campers_directus_files` | `campers_id` | `campers` (one_field: `media`) | `directus_files_id` |
| `campers_directus_files` | `directus_files_id` | `directus_files` | `campers_id` |

**Revert:** Delete all relations listed above via Directus Relations UI, then drop the junction collections `campers_partner` and `campers_directus_files`.

---

## Batch 9 — Field Group Assignment

**Date:** 2026-06-18  
Updated `group` property on all scalar fields so they appear in the correct tabs.

| Group | Fields Assigned |
|---|---|
| `default_group` | object_info_primarix, internal_remarks, season, sell_prices_status, sell_prices_updated_at, px_source_id |
| `partner_group` | partner_type, partner |
| `master_data_group` | name, street, street_number, zip_code, place, location_tour32, state, country, phone_general, phone_ah, email_general, website |
| `reservation_group` | booking_partner, booking, res_phone, res_email, id_tour_user, haupt_id_tour_user, booking_info |
| `conditions_group` | minimum_rental_days, price_type, camper_calculation_day, camper_calculation_season, conditions |
| `offers_group` | camper_specials, flex_head, flex_explanation, flex_table, flex_prices_supplier_code, price_sample_camper, price_sample_1_date_from, price_sample_1_date_to, price_sample_2_date_from, price_sample_2_date_to, price_sample_footnote |
| `image_badge_group` | image_badge_start_date, image_badge_end_date, image_badge_status, image_badge |

**Revert:** Set `group: null` on all fields listed above.

---

## Full Revert Order

To fully revert the camper schema, execute in this order:

1. **Batch 9** — Set `group: null` on all assigned fields
2. **Batch 8** — Delete all relations (M2O, O2M, translations, M2M); drop `campers_partner` and `campers_directus_files`
3. **Batch 7** — Delete the 12 alias fields from `campers`
4. **Batch 6** — Drop all 6 translation collections
5. **Batch 5** — Drop all 6 sub-collections
6. **Batch 4** — Delete the 14 group/tab alias fields from `campers`
7. **Batches 1–3** — Delete the 44 scalar fields from `campers`

---

## Batch 10 — Bugfix: `"group"` Missing from Group Field Specials

**Date:** 2026-06-18  
**Problem:** Opening `/admin/content/campers/+` threw repeated `[interface-group-raw-error]: You need to pass either the collection or fields prop` errors in the console and fields failed to render.

**Root cause:** All 14 group/tab alias fields were created with `special: ["alias", "no-data"]`. Directus 11 requires `"group"` as a third entry — `special: ["alias", "no-data", "group"]` — for the `group-raw`/`group-detail`/`group-tabs` interfaces to correctly pass the `collection` prop to their internal `v-form` component.

A secondary issue was also found: during the special-array update, 10 of the 11 `group-raw` tab fields had their `group: "camper_tabs"` parent reference cleared to `null`. This was fixed immediately after.

**Fix applied:**
1. Updated all 14 group fields to add `"group"` to their `special` array.
2. Restored `group: "camper_tabs"` on the 10 affected tab fields (`descriptions_group`, `price_infos_group`, `conditions_group`, `price_basic_group`, `prices_group`, `offers_group`, `surcharges_group`, `depots_group`, `image_badge_group`, `media_group`).

**Fields updated:** `camper_tabs`, `master_data_group`, `descriptions_group`, `price_infos_group`, `conditions_group`, `price_basic_group`, `prices_group`, `offers_group`, `surcharges_group`, `depots_group`, `image_badge_group`, `media_group`, `partner_group`, `reservation_group`

**Lesson for future collections:** Always include `"group"` in the special array when creating any group interface alias field:
```json
"special": ["alias", "no-data", "group"]
```

**Revert:** Set `special: ["alias", "no-data"]` on all 14 fields (reverts to broken state — not recommended).

---

## Batch 11 — Bugfix: Translation Interface Fields Not Working

**Date:** 2026-06-18  
**Problem:** All `translations`/`ai-translations` alias fields in the campers form were broken — clicking them showed no language tabs or content.

**Root cause:** Two errors in how the translation alias fields were created:

1. **Wrong `options` keys** — fields were created with `{ languagesCollection: "languages", defaultLanguage: "de-DE", userLanguage: false }` but Directus requires `{ languageField: "code", languageDirectionField: "code" }`. The `languageField: "code"` tells the interface which field on the languages collection holds the language code (e.g. `"de-DE"`).

2. **Wrong interface name** — content translation fields (descriptions, price_infos, conditions, vehicle_categories) should use `ai-translations` (the project's custom AI translation extension), not the built-in `translations`. Only image_badge and surcharges use plain `translations` — matching the hotels pattern.

**Fix applied:** Updated options and interface on all 6 translation alias fields.

| Collection | Field | Interface (before → after) | Options fix |
|---|---|---|---|
| `campers` | `descriptions` | `translations` → `ai-translations` | languageField/languageDirectionField: `"code"` |
| `campers` | `price_infos` | `translations` → `ai-translations` | languageField/languageDirectionField: `"code"` |
| `campers` | `conditions` | `translations` → `ai-translations` | languageField/languageDirectionField: `"code"` |
| `campers` | `image_badge` | `translations` (unchanged) | languageField/languageDirectionField: `"code"` |
| `camper_vehicle_categories` | `translations` | `translations` → `ai-translations` | languageField/languageDirectionField: `"code"` |
| `camper_surcharges` | `translations` | `translations` (unchanged) | languageField/languageDirectionField: `"code"` |

**Lesson for future collections:** Always use these options for translation alias fields:
```json
{
  "interface": "ai-translations",
  "special": ["translations"],
  "options": { "languageField": "code", "languageDirectionField": "code" }
}
```
Use `translations` (not `ai-translations`) only for non-content translation fields like image_badge and surcharge descriptions.

**Revert:** Set options back to `{ languagesCollection: "languages", defaultLanguage: "de-DE" }` and interface back to `translations` on all 6 fields (reverts to broken state).

---

## Batch 12 — Field Labels, Notes & Missing Translations

**Date:** 2026-06-18

### Part A — Missing M2O relation metadata for translation junctions

**Problem:** All 6 camper translation junction collections were missing the second `directus_relations` row (the M2O from `languages_code → translations`). This caused:
- `ai-translations` fields showing **"Interface not found"** in the Data Model settings page (the options function needs `relations.m2o?.related_collection` to render its config panel)
- `image_badge` translation not working in the content form (native `translations` interface also needs this relation to enumerate available languages)

**Fix applied:** Directly inserted 6 rows into `directus_relations` and restarted Directus to reload schema cache.

```sql
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, junction_field, one_deselect_action)
VALUES
  ('campers_descriptions_translations',       'languages_code', 'translations', NULL, 'campers_id',                   'nullify'),
  ('campers_price_infos_translations',        'languages_code', 'translations', NULL, 'campers_id',                   'nullify'),
  ('campers_conditions_translations',         'languages_code', 'translations', NULL, 'campers_id',                   'nullify'),
  ('campers_image_badge_translations',        'languages_code', 'translations', NULL, 'campers_id',                   'nullify'),
  ('camper_vehicle_categories_translations',  'languages_code', 'translations', NULL, 'camper_vehicle_categories_id', 'nullify'),
  ('camper_surcharges_translations',          'languages_code', 'translations', NULL, 'camper_surcharges_id',         'nullify');
```

**Note:** `translations.id` is UUID and `languages_code` is varchar — types don't match for a DB-level FK, so this is metadata-only. The interface resolves language tabs using `languageField: "code"` (matches `translations.code` = "de-DE", "nl-NL", "de-CH").

**Lesson:** Every translation junction collection needs TWO `directus_relations` rows — one for the parent FK and one for the language FK pointing to `translations`.

**Revert [DB]:**
```sql
DELETE FROM directus_relations WHERE id IN (1375, 1376, 1377, 1378, 1379, 1380);
```
Then restart Directus.

---

### Part B — Notes and missing translations on `campers` fields

**Problem:** All `campers` fields had `note: null`. Several fields were also missing translations entirely (`user_updated`, `date_updated`, `partner_type`, `booking_partner`, `sell_prices_status`, `sell_prices_updated_at`, `px_source_id`, `default_group`). `object_id` had `en-US` instead of `nl-NL`. `status_primarix` was missing `nl-NL`.

**Fix applied (via MCP):** Updated 16 fields on `campers` collection.

| Field | Note added | Translations fixed |
|---|---|---|
| `object_id` | `$t:hotels_object_id_note` | replaced `en-US` with `nl-NL` |
| `status_primarix` | — | added `nl-NL` |
| `internal_remarks` | `$t:hotel_internal_remarks_note` | — |
| `sell_prices_status` | `$t:sell_price_status` | added all 3 languages |
| `sell_prices_updated_at` | `Last successful sell price calculation` | added all 3 languages |
| `px_source_id` | — | added all 3 languages |
| `partner_type` | — | added all 3 languages |
| `booking_partner` | — | added all 3 languages |
| `place` | `$t:hotels_place` | — |
| `country` | `$t:hotels_country` | — |
| `id_tour_user` | `$t:hotels_id_tour_user_note` | — |
| `haupt_id_tour_user` | `$t:hotels_haupt_id_tour_user_note` | — |
| `booking_info` | `$t:hotels_booking_info_note` | — |
| `user_updated` | — | added all 3 languages |
| `date_updated` | — | added all 3 languages |
| `default_group` | — | added "Name & Publication" in all 3 languages |

**Note:** Sub-collections (`camper_vehicle_categories`, `camper_surcharges`, `camper_depots`, all `*_translations` junctions) already had correct translations — no changes needed.

**Revert:** Set all updated fields back to `note: null` and restore original translations arrays via MCP.

---

## Future Work / Not Yet Implemented

| Item | Notes |
|---|---|
| Price Calculator sub-collection | 3-way matrix: vehicle × date period × rental period. Needs `camper_prices` collection + price calculator tab wiring |
| `campers_translations` content | The pre-existing `campers_translations` junction (→ global `translations`) is unused — evaluate whether to populate or deprecate |
| `px_source_id` migration script | Import job needs to populate `px_source_id` from Primarix `camper.oid` for all 246 records |
