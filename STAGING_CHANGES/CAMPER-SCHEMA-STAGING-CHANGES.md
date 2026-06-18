# Camper Schema — Staging Changes

**Project:** BOTG Primarix-to-Directus Migration  
**Product:** Campers  
**Environment:** `directus-staging` (staging.content.botg.cloud)  
**Reference doc:** `docs/camper-schema-mapping.md`  
**Local changelog:** `docs/camper-schema-changelog.md`

> All changes here were applied via the `directus-staging` MCP server unless marked **[SQL]** (requires direct DB access).  
> To revert, execute in **reverse section order** (bottom → top).

---

## ⚠️ Known Blockers — Require Staging DB SQL Access

Two issues are blocked because the staging Directus API **always attempts to create a real DB FK** even when `schema: null` is passed, and the staging MCP has delete disabled.

### Blocker 1 — `camper_vehicle_categories_translations.camper_vehicle_categories_id` wrong type

The field was created as `uuid` but `camper_vehicle_categories.id` on staging is `integer`. PostgreSQL cannot cast UUID to integer, so the FK relation cannot be created.

**SQL fix (run on staging DB):**
```sql
ALTER TABLE camper_vehicle_categories_translations DROP COLUMN camper_vehicle_categories_id;
ALTER TABLE camper_vehicle_categories_translations ADD COLUMN camper_vehicle_categories_id integer;
```

**After the SQL fix**, create the relation via MCP:
```
collection: camper_vehicle_categories_translations
field: camper_vehicle_categories_id
related_collection: camper_vehicle_categories
schema: { on_delete: CASCADE }
meta: { one_field: "translations", junction_field: "languages_code", one_deselect_action: "nullify" }
```

### Blocker 2 — 6 metadata-only `languages_code → translations` relations

The `translations` collection uses UUID for its `id`, but `languages_code` is varchar. A real FK cannot be created between these types. On local these were inserted directly into `directus_relations`. The staging API ignores `schema: null` and always tries a real FK.

**SQL fix (run on staging DB):**
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

**After** the SQL fix, restart Directus to reload the schema cache.

**Why this matters:** Without these rows, the `ai-translations` interface shows "Interface not found" in Data Model settings, and the content form cannot enumerate available language tabs.

**Revert SQL:**
```sql
DELETE FROM directus_relations
WHERE many_field = 'languages_code'
  AND one_collection = 'translations'
  AND many_collection IN (
    'campers_descriptions_translations',
    'campers_price_infos_translations',
    'campers_conditions_translations',
    'campers_image_badge_translations',
    'camper_vehicle_categories_translations',
    'camper_surcharges_translations'
  );
```

---

## Section 1 — Collections & Fields (Prior Session)

> These were applied in the session before this document was created. Listed for completeness and revert coverage.

### 1a — `campers` — 44 scalar fields added

| Batch | Fields |
|---|---|
| Batch 1 | `object_info_primarix`, `internal_remarks`, `season`, `sell_prices_status`, `sell_prices_updated_at`, `px_source_id` |
| Batch 2 | `partner_type`, `name`, `street`, `street_number`, `zip_code`, `place`, `location_tour32`, `state`, `country`, `phone_general`, `phone_ah`, `email_general`, `website` |
| Batch 3 | `booking_partner`, `booking`, `res_phone`, `res_email`, `id_tour_user`, `haupt_id_tour_user`, `booking_info`, `minimum_rental_days`, `price_type`, `camper_calculation_day`, `camper_calculation_season`, `image_badge_start_date`, `image_badge_end_date`, `image_badge_status`, `camper_specials`, `flex_head`, `flex_explanation`, `flex_table`, `flex_prices_supplier_code`, `price_sample_camper`, `price_sample_1_date_from`, `price_sample_1_date_to`, `price_sample_2_date_from`, `price_sample_2_date_to`, `price_sample_footnote` |

**Revert:** Delete all 44 fields from `campers` via MCP fields delete.

### 1b — `campers` — 14 tab/group alias fields added

`camper_tabs`, `master_data_group`, `descriptions_group`, `price_infos_group`, `conditions_group`, `price_basic_group`, `prices_group`, `offers_group`, `surcharges_group`, `depots_group`, `image_badge_group`, `media_group`, `partner_group`, `reservation_group`

**Revert:** Delete all 14 alias fields from `campers` (delete child groups before parents).

### 1c — `campers` — 12 O2M/M2M/translations alias fields added

`partner`, `descriptions`, `price_infos`, `conditions`, `vehicle_categories`, `price_periods`, `rental_periods`, `camper_seasons`, `surcharges_list`, `depots`, `image_badge`, `media`

**Revert:** Delete all 12 alias fields from `campers`.

### 1d — Sub-collections created with all fields

| Collection | Purpose |
|---|---|
| `camper_vehicle_categories` | Vehicle categories per rental company. Fields: `id` (int PK), `campers_id`, `sort`, `headline`, `subline`, `number_persons_max`, `mode_of_drive`, `supplier_product_code`, `url_alias`, `depots_available`, `camping_equipment`, `translations` (alias) |
| `camper_surcharges` | Surcharges per rental company. Fields: `id` (int PK), `campers_id`, `sort`, `title_booking_name`, `mandatory_optional`, `surcharge_calc_type`, `translations` (alias) |
| `camper_depots` | Depot locations per rental company. Fields: `id` (int PK), `campers_id`, `sort`, `depot_type`, `name`, `street`, `street_number`, `zip_code`, `town`, `state`, `country`, `phone`, `fax`, `email`, `depot_surcharge`, `office_hours` |

**Revert:** Drop `camper_vehicle_categories`, `camper_surcharges`, `camper_depots` collections (Directus cascades field/meta deletion).

### 1e — Translation junction collections created with all fields

| Collection | Parent FK | Content Fields |
|---|---|---|
| `campers_descriptions_translations` | `campers_id` | `teaser`, `text_positive`, `text_negative`, `description_supplementary` |
| `campers_price_infos_translations` | `campers_id` | `services_included`, `services_not_included`, `additional_bookable`, `deviating_cancelation_terms`, `note`, `mobility_advice_text` |
| `campers_conditions_translations` | `campers_id` | `cond_driver`, `cond_licence`, `cond_minimum_rental`, `cond_calculation`, `cond_oneway`, `cond_cumulate`, `cond_restricted_area`, `cond_border_crossing`, `cond_insurance`, `cond_additional_insurance`, `cond_allinclusive`, `cond_not_covered_insurance`, `cond_bond`, `cond_towaway` |
| `campers_image_badge_translations` | `campers_id` | `image_badge_teaser`, `image_badge_details` |
| `camper_vehicle_categories_translations` | `camper_vehicle_categories_id` (⚠️ currently UUID — see Blocker 1) | `text_introduction`, `description`, `bedsize`, `equipment`, `note` |
| `camper_surcharges_translations` | `camper_surcharges_id` | `description` |

**Revert:** Drop all 6 translation collections.

---

## Section 2 — Relations (Prior Session, IDs 1347–1363)

These 17 relations were created in the session before this document:

| ID | Relation | Type |
|---|---|---|
| 1347 | `camper_vehicle_categories.campers_id → campers` | O2M |
| 1348 | `camper_surcharges.campers_id → campers` | O2M |
| 1349 | `camper_depots.campers_id → campers` | O2M |
| 1350 | `campers_descriptions_translations.campers_id → campers` | Translation FK |
| 1351 | `campers_price_infos_translations.campers_id → campers` | Translation FK |
| 1352 | `campers_conditions_translations.campers_id → campers` | Translation FK |
| 1353 | `campers_image_badge_translations.campers_id → campers` | Translation FK |
| 1354 | `camper_surcharges_translations.camper_surcharges_id → camper_surcharges` | Translation FK |
| 1355 | `campers.season → seasons` | M2O |
| 1356 | `campers.place → places` | M2O |
| 1357 | `campers.location_tour32 → locations_tour32` | M2O |
| 1358 | `campers.state → states` | M2O |
| 1359 | `campers.country → countries` | M2O |
| 1360 | `campers.booking → booking_details` | M2O |
| 1361 | `camper_depots.town → places` | M2O |
| 1362 | `camper_depots.state → states` | M2O |
| 1363 | `camper_depots.country → countries` | M2O |

**Revert:** Delete these 17 relations via MCP relations delete (by collection+field).

---

## Section 3 — Missing Sub-Collections Created (This Session)

**Date:** 2026-06-18

### `camper_price_periods_list`

Date-based price periods per rental company.  
Fields: `id` (int PK), `sort`, `campers_id` (uuid FK), `price_period_start` (date), `price_period_end` (date), `price_start` (boolean)  
Meta: `group: campers`, `hidden: true`, `sort_field: sort`

### `camper_rental_periods_list`

Min/max rental day definitions per rental company.  
Fields: `id` (int PK), `sort`, `campers_id` (uuid FK), `min_days` (integer), `max_days` (integer)  
Meta: `group: campers`, `hidden: true`, `sort_field: sort`

### `camper_seasons_list`

Season definitions with date ranges per rental company.  
Fields: `id` (int PK), `sort`, `campers_id` (uuid FK), `season_label` (integer M2O → seasons), `season_start` (date), `season_end` (date)  
Meta: `group: campers`, `hidden: true`, `sort_field: sort`

**Revert:** Drop `camper_price_periods_list`, `camper_rental_periods_list`, `camper_seasons_list`.

---

## Section 4 — Junction Collections Created (This Session)

**Date:** 2026-06-18

### `campers_partner`

M2M junction between `campers` ↔ `partner`.  
Fields: `id` (int PK), `campers_id` (uuid), `partner_id` (uuid)  
Meta: `group: campers`, `hidden: true`

### `campers_directus_files`

M2M junction between `campers` ↔ `directus_files` (media tab).  
Fields: `id` (int PK), `campers_id` (uuid), `directus_files_id` (uuid)  
Meta: `group: campers`, `hidden: true`

**Revert:** Drop `campers_partner` and `campers_directus_files`.

---

## Section 5 — Relations Created (This Session, IDs 1364–1371)

**Date:** 2026-06-18

| ID | Relation | Type | On Delete |
|---|---|---|---|
| 1364 | `camper_price_periods_list.campers_id → campers` (one_field: `price_periods`, sort: `sort`) | O2M | CASCADE |
| 1365 | `camper_rental_periods_list.campers_id → campers` (one_field: `rental_periods`, sort: `sort`) | O2M | CASCADE |
| 1366 | `camper_seasons_list.campers_id → campers` (one_field: `camper_seasons`, sort: `sort`) | O2M | CASCADE |
| 1367 | `camper_seasons_list.season_label → seasons` | M2O | SET NULL |
| 1368 | `campers_partner.campers_id → campers` (one_field: `partner`, junction: `partner_id`) | M2M | CASCADE |
| 1369 | `campers_directus_files.campers_id → campers` (one_field: `media`, junction: `directus_files_id`) | M2M | CASCADE |
| 1370 | `campers_partner.partner_id → partner` (junction: `campers_id`) | M2M | CASCADE |
| 1371 | `campers_directus_files.directus_files_id → directus_files` (junction: `campers_id`) | M2M | CASCADE |

**Revert:** Delete relations 1364–1371 via MCP (delete by collection+field, or by ID if API supports it).

---

## Section 6 — Field Group Assignments (This Session, Batch 9 equivalent)

**Date:** 2026-06-18  
Updated `group` meta on all scalar `campers` fields so they render in the correct tabs.

| Group | Fields Assigned |
|---|---|
| `default_group` | `object_info_primarix`, `internal_remarks`, `season`, `sell_prices_status`, `sell_prices_updated_at`, `px_source_id` |
| `partner_group` | `partner_type` |
| `master_data_group` | `name`, `street`, `street_number`, `zip_code`, `place`, `location_tour32`, `state`, `country`, `phone_general`, `phone_ah`, `email_general`, `website` |
| `reservation_group` | `booking_partner`, `booking`, `res_phone`, `res_email`, `id_tour_user`, `haupt_id_tour_user`, `booking_info` |
| `conditions_group` | `minimum_rental_days`, `price_type`, `camper_calculation_day`, `camper_calculation_season` |
| `offers_group` | `camper_specials`, `flex_head`, `flex_explanation`, `flex_table`, `flex_prices_supplier_code`, `price_sample_camper`, `price_sample_1_date_from`, `price_sample_1_date_to`, `price_sample_2_date_from`, `price_sample_2_date_to`, `price_sample_footnote` |
| `image_badge_group` | `image_badge_start_date`, `image_badge_end_date`, `image_badge_status` |

**Revert:** Set `group: null` on all fields listed above via MCP fields update.

---

## Section 7 — Field Notes & Translations (This Session, Batch 12 Part B equivalent)

**Date:** 2026-06-18

| Field | Change |
|---|---|
| `object_id` | Added `note: "$t:hotels_object_id_note"`, replaced `en-US` translation with `nl-NL: "Object-ID"` |
| `status_primarix` | Added `nl-NL: "Status (Primarix)"` translation |
| `user_updated` | Added translations: de-DE "Zuletzt geändert von", en-GB "Updated by", nl-NL "Bijgewerkt door" |
| `date_updated` | Added translations: de-DE "Zuletzt geändert am", en-GB "Updated at", nl-NL "Bijgewerkt op" |

> Note: `internal_remarks`, `sell_prices_status`, `sell_prices_updated_at`, `px_source_id`, `partner_type`, `booking_partner`, `place`, `country`, `id_tour_user`, `haupt_id_tour_user`, `booking_info`, `default_group` were already updated in the prior session.

**Revert:** Set `note: null` and restore original translations on the 4 fields above via MCP fields update.

---

## Section 8 — Field Options & Conditions on `campers` (This Session)

**Date:** 2026-06-18

Applied missing `options` and `conditions` to 17 `campers` fields on **both local and staging**.

### Cascading Interface Options (fixes "viewing data not working")

| Field | Options Applied |
|---|---|
| `place` | `{"target_collection": "places", "icon": "location_city", "searchLimit": 200, "filterBy": [{"fieldKey": "country", "fk": "country_id"}]}` |
| `location_tour32` | `{"target_collection": "locations_tour32", "searchLimit": 200, "icon": "pin_drop", "cascadeFrom": [{"fieldKey": "place", "parentCollection": "places", "fk": "location_tour32"}]}` |
| `country` | `{"target_collection": "countries", "icon": "flag", "searchLimit": 200, "cascadeFrom": [{"fieldKey": "place", "parentCollection": "places", "fk": "country_id"}]}` |
| `state` | `{"target_collection": "states", "icon": "map", "searchLimit": 200, "cascadeFrom": [{"fieldKey": "place", "parentCollection": "places", "fk": "state_id"}]}` |

### M2O / Dropdown Options

| Field | Options Applied |
|---|---|
| `season` | `{"template": "{{season}}", "enableCreate": false}` |
| `booking` | `{"enableCreate": false}` + `hidden: true` |
| `partner` | `{"template": "{{partner_id.label}}", "limit": 20, "enableCreate": false}` |
| `partner_group` | `{"start": "open"}` |
| `reservation_group` | `{"start": "open"}` |

### List O2M Options (`enableCreate: true, enableSelect: false`)

`vehicle_categories`, `price_periods`, `rental_periods`, `camper_seasons`, `surcharges_list`, `depots`

### Conditions

| Field | Condition |
|---|---|
| `booking` | Show when `booking_partner = "selected"` (hidden by default) |
| `partner` | Hide when `partner_type = "all"` |
| `user_updated` | Readonly + visible when `id` is not null (View on Edit) |
| `date_updated` | Readonly + visible when `id` is not null (View on Edit) |

**Revert:** Set `options: null` and `conditions: null` on all 17 fields listed above via MCP fields update on both local and staging.

---

## Section 9 — `camper_depots` Cascading Options (This Session)

**Date:** 2026-06-18

Applied cascading interface options to `camper_depots.town/state/country` on **both local and staging**.

| Field | Options Applied |
|---|---|
| `town` | `{"target_collection": "places", "icon": "location_city", "searchLimit": 200, "filterBy": [{"fieldKey": "country", "fk": "country_id"}]}` |
| `state` | `{"target_collection": "states", "icon": "map", "searchLimit": 200, "cascadeFrom": [{"fieldKey": "town", "parentCollection": "places", "fk": "state_id"}]}` |
| `country` | `{"target_collection": "countries", "icon": "flag", "searchLimit": 200, "cascadeFrom": [{"fieldKey": "town", "parentCollection": "places", "fk": "country_id"}]}` |

**Revert:** Set `options: null` on `town`, `state`, `country` in `camper_depots` via MCP fields update on both environments.

---

## Section 10 — `batch_camper` & `batch_camper_locale` on Staging (Confirmed Existing)

**Date:** 2026-06-18

Both collections were confirmed to already exist on staging and are fully in sync with local. No changes were needed.

| Collection | Fields | Status |
|---|---|---|
| `batch_camper` | id, sort, user_created, date_created, user_updated, date_updated, name, destination, buy_price, notice-myss4a, translations | ✅ Already synced |
| `batch_camper_locale` | id, batch_camper_id, translations_id, margin, exchange_rate, sell_price | ✅ Already synced |

---

## Section 12 — Field Label & Options Sync (This Session)

**Date:** 2026-06-18

Applied after a full local↔staging diff. All changes are on **staging only**.

### `campers` — 4 fields

| Field | What changed |
|---|---|
| `status_primarix` | Translations fixed: `"Status (Primarix)"` → `"Status Primarix"` (all 3 languages, to match hotels pattern) |
| `user_updated` | Translations fixed: `"Updated by"/"Zuletzt geändert von"/"Bijgewerkt door"` → `"by"/"von"/"door"` (hotels pattern). Template fixed: `{{avatar}} {{first_name}} {{last_name}}` → `{{first_name}} {{last_name}}` (avatar reference was causing display issues) |
| `date_updated` | Translations fixed: `"Updated at"/"Zuletzt geändert am"/"Bijgewerkt op"` → `"Last Update"/"Zuletzt aktualisiert"/"Laatste update"` (hotels pattern). Options added: `{"format": "dd.MM.yyyy HH:mm:ss"}` |
| `camper_specials` | Sub-field `title` name fixed: `"Title"` → `"Titel"` (German label). Sub-field `text` width fixed: `"full"` → `"half"` (matches local) |

### `camper_price_periods_list` — 3 fields

| Field | Translations (de-DE / en-GB / nl-NL) |
|---|---|
| `price_period_start` | `"Preiszeitraum: von"` / `"Price Period: From"` / `"Prijsperiode: van"` |
| `price_period_end` | `"Preiszeitraum: bis"` / `"Price Period: To"` / `"Prijsperiode: tot"` |
| `price_start` | `"Ab-Preis"` / `"Starting Price"` / `"Vanaf-prijs"` |

### `camper_rental_periods_list` — 2 fields

| Field | Translations (de-DE / en-GB / nl-NL) |
|---|---|
| `min_days` | `"Mindestmietdauer (Tage)"` / `"Min. Rental Days"` / `"Min. huur (dagen)"` |
| `max_days` | `"Maximale Mietdauer (Tage)"` / `"Max. Rental Days"` / `"Max. huur (dagen)"` |

### `camper_seasons_list` — 3 fields + 1 special fix

| Field | Change |
|---|---|
| `season_label` | `special` fixed: `null` → `["m2o"]`. Translations: `"Saison"` / `"Season Label"` / `"Seizoenlabel"` |
| `season_start` | Translations: `"Saison: von"` / `"Season: From"` / `"Seizoen: van"` |
| `season_end` | Translations: `"Saison: bis"` / `"Season: To"` / `"Seizoen: tot"` |

**Revert:** Set translations back to the staging-created short labels and set `season_label.special` back to `null` via MCP fields update.

---

## Section 11 — Missing `sort` Fields on Sub-Collections (This Session)

**Date:** 2026-06-18

Three sub-collections created in an earlier session were missing the `sort` field on staging. The `list-o2m` interface always requests `sort` for drag-to-reorder, causing a "field does not exist" error when opening any camper item.

| Collection | Field Added | Type |
|---|---|---|
| `camper_vehicle_categories` | `sort` | integer, hidden, nullable |
| `camper_surcharges` | `sort` | integer, hidden, nullable |
| `camper_depots` | `sort` | integer, hidden, nullable |

Note: `camper_price_periods_list`, `camper_rental_periods_list`, and `camper_seasons_list` already had `sort` — they were created in a later session that included it.

**Revert:** Delete `sort` field from `camper_vehicle_categories`, `camper_surcharges`, `camper_depots` on staging via MCP fields delete.

---

## Section 13 — Relations Status After Full Diff

**Date:** 2026-06-18

### Relations already correct on staging (CASCADE — appropriate for junction tables)

| Junction | Field | on_delete |
|---|---|---|
| `campers_partner.campers_id → campers` | campers_id | CASCADE ✅ |
| `campers_partner.partner_id → partner` | partner_id | CASCADE ✅ |
| `campers_directus_files.campers_id → campers` | campers_id | CASCADE ✅ |
| `campers_directus_files.directus_files_id → directus_files` | directus_files_id | CASCADE ✅ |

> Note: local has SET NULL for these — CASCADE is more correct for M2M junction tables. No change needed on staging.

### Still blocked — requires staging DB SQL (see Blockers 1 & 2 above)

| Missing relation | Blocker |
|---|---|
| `camper_vehicle_categories_translations.camper_vehicle_categories_id → camper_vehicle_categories` | Blocker 1 — UUID/integer type mismatch on PK |
| `campers_descriptions_translations.languages_code → translations` | Blocker 2 — metadata-only relation |
| `campers_price_infos_translations.languages_code → translations` | Blocker 2 |
| `campers_conditions_translations.languages_code → translations` | Blocker 2 |
| `campers_image_badge_translations.languages_code → translations` | Blocker 2 |
| `camper_vehicle_categories_translations.languages_code → translations` | Blocker 2 |
| `camper_surcharges_translations.languages_code → translations` | Blocker 2 |

---

## Full Revert Order

To fully remove the camper schema from staging, run in this order:

1. **Section 12** — Revert labels on 12 fields across 4 collections; revert `season_label.special` to null
2. **Section 11** — Delete `sort` from `camper_vehicle_categories`, `camper_surcharges`, `camper_depots`
3. **Section 9** — Set `options: null` on `camper_depots.town/state/country`
4. **Section 8** — Set `options: null` and `conditions: null` on 17 `campers` fields
5. **Section 7** — Restore original field notes/translations on 4 fields
6. **Section 6** — Set `group: null` on all 44 assigned fields
7. **Section 5** — Delete relations 1364–1371
8. **Section 4** — Drop `campers_partner`, `campers_directus_files`
9. **Section 3** — Drop `camper_price_periods_list`, `camper_rental_periods_list`, `camper_seasons_list`
10. **Section 2** — Delete relations 1347–1363
11. **Section 1e** — Drop all 6 translation collections
12. **Section 1d** — Drop `camper_vehicle_categories`, `camper_surcharges`, `camper_depots`
13. **Section 1c** — Delete 12 O2M/M2M/translation alias fields from `campers`
14. **Section 1b** — Delete 14 tab/group alias fields from `campers`
15. **Section 1a** — Delete 44 scalar fields from `campers`

If the SQL blockers (Blocker 1 & 2) were applied, revert those first:
- Delete the 6 languages_code → translations relation rows from `directus_relations`
- Drop and recreate `camper_vehicle_categories_translations.camper_vehicle_categories_id` as UUID (to restore original broken state), or just leave it as integer if you prefer
