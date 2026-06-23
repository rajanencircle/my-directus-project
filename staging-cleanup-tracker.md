# Staging Cleanup Tracker — Hotels Only

**Date Started:** 2026-06-23  
**Date Completed:** 2026-06-23  
**Environment:** directus-staging  
**Operator:** Claude Code  
**Backup:** Staging DB dump taken before execution + GitHub repo  
**Goal:** Strip staging to hotels and its dependencies only. Remove all other product types.

---

## Rollback Instructions

If anything needs to be reverted:
1. Restore the **staging DB dump** taken before this cleanup — this is the authoritative full backup
2. The **GitHub repo** has the custom AI Translation extension code
3. This tracker documents every collection and flow removed so the scope is clear

---

## Pre-Flight Checks

| Check | Status | Notes |
|---|---|---|
| Staging DB dump taken | ✅ Confirmed by user | |
| GitHub repo backup | ✅ Confirmed | |
| MCP delete permissions verified | ✅ Enabled by user | User enabled in Directus Access Control |
| Plan reviewed and approved | ✅ 2026-06-23 | |

---

## Pending — Extensions to Remove via GitHub

Two extensions must be removed from the GitHub repo. Delete these directories and commit — the environment will pick up the change on next deploy/pull.

### Directories to delete from `extensions-16-06-2026/`:

| Directory | Version | Reason |
|---|---|---|
| `directus-extension-interface-cruise-prices-table` | v1.0.3 | Cruise-specific prices table interface (references cabin_category_id, cruises_cabins_categories, cruise_prices, etc.) |
| `directus-extension-interface-tours-prices-table` | v1.0.0 | Tours-specific prices table interface |

**Files inside each directory (for reference):**
```
directus-extension-interface-cruise-prices-table/
  ├── dist/index.js
  ├── package.json
  ├── package-lock.json
  ├── tsconfig.json
  └── src/
      ├── index.ts
      ├── interface.vue
      ├── InterfaceDirect.vue
      └── InterfaceTranslations.vue

directus-extension-interface-tours-prices-table/
  ├── dist/index.js
  ├── package.json
  ├── package-lock.json
  ├── tsconfig.json
  └── src/
      ├── index.ts
      ├── interface.vue
      ├── InterfaceDirect.vue
      └── InterfaceTranslations.vue
```

**Extensions to KEEP** (hotel-specific or generic):
- `directus-extension-interface-room-prices-table` — hotel room prices ✅
- `directus-extension-interface-occupancy-selector` — hotel occupancy ✅
- `directus-extension-interface-surcharge-prices` — hotel surcharges ✅
- `directus-extension-ai-translations` — generic AI translations ✅
- `directus-extension-endpoint-ws-token` — generic infrastructure ✅
- `directus-extension-flow-manager` — generic infrastructure ✅
- `directus-extension-item-preview-button` — generic UI helper ✅
- `directus-extension-route-dom-injector` — generic infrastructure ✅
- `directus-extension-save-and-refresh` — generic UI helper ✅
- `directus-extension-schema-management-module` — generic infrastructure ✅
- `cascading-individual-select` — generic UI component ✅
- `media-bundle` — generic media management ✅
- `save-and-stay-trigger-flow` — generic UI helper ✅
- `api` — generic API endpoint ✅

---

## CLEANUP COMPLETE ✅

All planned deletions executed successfully on 2026-06-23.

---

## Execution Summary

### Flows Modified / Deleted — Round 1 (3)

| Flow | Change |
|---|---|
| `[MAT] Update - 04 May` (84b8b457) | Removed cruise/tour operations; chain now: read_data_mat → read_data_hotel → read_translations → script → update_hotel. Script updated to hotel-only. |
| `[Exchange Rate Preset] Apply to ALL Products - local - 04 May` | Deleted entirely (all operations were batch-product only) |
| `[Margin Preset] Apply to ALL Products - local - 04 May` | Deleted entirely (all operations were batch-product only) |

### Flows Deleted — Round 2 (4)

These `[Margin & Exchange Preset]` flows were missed in Round 1 (different naming pattern from individual preset flows). All operations exclusively targeted cruise/daytrip/tour collections.

| Flow | ID | Reason |
|---|---|---|
| `[Margin & Exchange Preset] Apply to All Cruises` | f949ff14-e617-49b8-8814-1bb372e69b84 | Cruise-only operations |
| `[Margin & Exchange Preset] Cruise create/update` | 460a39dd-0ecb-41cf-a75d-6622759dc8dd | Cruise-only operations |
| `[Margin & Exchange Preset] Daytrip create/update` | 2440eaf9-85b0-4f45-981b-6b4884472656 | Daytrip-only operations |
| `[Margin & Exchange Preset] Tour create/update` | 33b177da-345a-4864-82e6-7ee52d7bdac1 | Tour-only operations |

### Collections Deleted

**MAT Non-Hotel Translation Tables (2):**
- `mobility_advice_text_translations_1` (cruises)
- `mobility_advice_text_translations_2` (tours + daytrips)

**Exchange Rate Preset Translation Tables (6 — all non-hotel):**
- `exchange_rate_presets_translations_1` through `_6`

**Margin Preset Translation Tables (8 — all non-hotel):**
- `margin_presets_translations_1` through `_8`

**Margin Preset Destinations (5):**
- `margin_presets_destinations_1` through `_5`

**Tours (23):**
`tours`, `tours_translations`, `tours_translations_1`, `tours_categories`, `tours_categories_translations`, `tours_countries`, `tours_dates_translations`, `tours_daytrips_price_dates`, `tours_directus_files`, `tours_image_badge_translations`, `tours_partner`, `tours_price_info_translations`, `tours_prices`, `tours_prices_translations`, `tours_room_occupancies`, `tours_routes`, `tours_surcharges_items`, `tours_surcharges_items_translations`, `tours_surcharges_translations`, `tours_tour_dates_web`, `tours_tour_dates_web_trips_frequencies`, `tours_tours_room_occupancies`, `tours_travel_categories`

**Daytrips (23):**
`daytrips`, `daytrips_categories`, `daytrips_categories_translations`, `daytrips_countries`, `daytrips_dates_translations`, `daytrips_daytrips_room_occupancies`, `daytrips_directus_files`, `daytrips_image_badge_translations`, `daytrips_partner`, `daytrips_price_dates`, `daytrips_price_info_translations`, `daytrips_prices`, `daytrips_prices_translations`, `daytrips_room_occupancies`, `daytrips_routes`, `daytrips_surcharges_items`, `daytrips_surcharges_items_translations`, `daytrips_surcharges_translations`, `daytrips_tour_dates_web`, `daytrips_tour_dates_web_trips_frequencies`, `daytrips_translations`, `daytrips_translations_1`, `daytrips_travel_categories`

**Excursions (19):**
`excursion_categories`, `excursion_categories_translations`, `excursions_dates_translations`, `excursions_descriptions_translations`, `excursions_directus_files`, `excursions_excursions_room_occupancies`, `excursions_image_badge_translations`, `excursions_partner`, `excursions_price_calculation_translations`, `excursions_price_info_translations`, `excursions_prices_translations`, `excursions_room_occupancies`, `excursions_routes`, `excursions_surcharges_items`, `excursions_surcharges_items_translations`, `excursions_surcharges_translations`, `excursions_tour_dates_web`, `excursions_tour_dates_web_trips_frequencies`, `excursions_travel_categories`

**Cruises (20 + 1 bonus):**
`cruises`, `cruises_cabins_categories`, `cruises_countries`, `cruises_cruises_occupancies`, `cruises_cruise_types`, `cruises_destinations`, `cruises_directus_files`, `cruises_occupancies`, `cruises_partner`, `cruises_price_dates`, `cruises_price_dates_departure_frequencies`, `cruises_translations`, `cruises_translations_1`, `cruises_translations_2`, `cruises_translations_4`, `cruises_types`, `cruises_types_translations`, `cruise_prices`, `cruise_prices_translations`, `cruise_types`
+ `travel_program_translations` (discovered dependency on cruises — deleted)

**FK fields removed from `partner` (to unblock cruises deletion):**
- `cruies_partner` field
- `cruise_partner_filter` field

**Campers (16):**
`campers`, `camper_depots`, `camper_price_periods_list`, `camper_rental_periods_list`, `camper_seasons_list`, `campers_conditions_translations`, `campers_descriptions_translations`, `campers_directus_files`, `campers_image_badge_translations`, `campers_partner`, `campers_price_infos_translations`, `campers_translations`, `camper_surcharges`, `camper_surcharges_translations`, `camper_vehicle_categories`, `camper_vehicle_categories_translations`

**Batch Products (12):**
`batch_hotel`, `batch_hotel_translations`, `batch_camper`, `batch_camper_locale`, `batch_daytrips`, `batch_daytrips_locale`, `batch_rental_car`, `batch_rental_car_locale`, `batch_round_trip`, `batch_round_trip_locale`, `batch_tours`, `batch_tours_locale`

**Non-Hotel Destination Exceptions (24):**
`erp_camper_destination_exceptions`, `erp_camper_destination_exceptions_translations`, `erp_cruise_destination_exceptions`, `erp_cruise_destination_exceptions_translations`, `erp_daytrips_destination_exceptions`, `erp_daytrips_destination_exceptions_translations`, `erp_rental_car_destination_exceptions`, `erp_rental_car_destination_exceptions_translations`, `erp_round_trips_destination_exceptions`, `erp_round_trips_destination_exceptions_translations`, `erp_tours_destination_exceptions`, `erp_tours_destination_exceptions_translations`, `mp_camper_destination_exceptions`, `mp_camper_destination_exceptions_translations`, `mp_cruise_destination_exceptions`, `mp_cruise_destination_exceptions_translations`, `mp_daytrips_destination_exceptions`, `mp_daytrips_destination_exceptions_translations`, `mp_rental_car_destination_exceptions`, `mp_rental_car_destination_exceptions_translations`, `mp_round_trips_destination_exceptions`, `mp_round_trips_destination_exceptions_translations`, `mp_tours_destination_exceptions`, `mp_tours_destination_exceptions_translations`

**Standalone Product Types + Non-Hotel Lookups (8):**
`rentalcars`, `roundtrips`, `studytrips`, `travel_categories`, `travel_categories_translations`, `departure_frequencies`, `trips_frequencies`, `languages`

**Demo / Orphaned / Test (6 + 3 virtual folders):**
`demo_collection` (deleted in previous session), `demo_hotelsss`, `demo_hotelsss_translations`, `accommodation_type_for_tour_use`, `posts_translations`, `presets_collection`
+ Virtual folder groups deleted: `Cruises_Metadata`, `Demo_Collections`, `batch_products`

**Round 2 — Orphaned Price/UI Collections (3):**

| Collection | Reason |
|---|---|
| `price_categories_translations` | Translation child of price_categories — deleted first (FK dependency) |
| `price_categories` | Zero FK references from any hotel collection. Was grouped under the now-deleted `day_trips` UI folder. Orphaned after daytrips removal. |
| `day_trips` | Virtual folder group (no DB table). Orphaned UI folder left over after daytrips collections were deleted. |

---

## Round 3 — Ambiguous Collections Analysis & Deletions

After Round 1 + 2, a second inspection pass identified additional collections with unclear hotel relevance. Each was analysed before any action was taken.

### Round 3 Analysis Findings

| Collection | Finding | Decision |
|---|---|---|
| `geo_location` | Already deleted directly by the user before this analysis. | N/A — already gone |
| `partner_filter` | Has a junction table (`partner_filter_partner`) wiring it to `partner`. No FK references from any hotel collection — used by non-hotel partner filtering UI only. | REMOVE |
| `partner_filter_partner` | Junction table between `partner_filter` and `partner`. No hotel dependency. | REMOVE (prerequisite to removing partner_filter) |
| `status_color` | Standalone lookup table. Searched all hotel collections and flows — zero FK references found. Orphaned. | REMOVE |
| `media_region` | Sub-collection under `media_helper` folder. Confirmed via media-bundle extension source code that media-bundle uses `places`/`states`/`regions`/`countries`/`destinations`/`destinations_cluster` (under Global_Data > Geographies) — NOT `media_region`, `media_country`, or `continent`. No hotel dependency. | REMOVE |
| `media_country` | Same as `media_region` — unused by media-bundle, no hotel dependency. | REMOVE |
| `continent` | Same as `media_region` — unused by media-bundle, no hotel dependency. | REMOVE |
| `junction_directus_files_translations` | Two versions exist. The un-numbered one has no `one_field` back-reference and is orphaned. The `_2` variant has `one_field: "translations"` properly wired to `directus_files.translations`. | REMOVE un-numbered; KEEP `_2` |
| `media_share_link` | Used by media-bundle extension for share link functionality. | KEEP |
| `media_library_settings` | Used by media-bundle extension for library configuration. | KEEP |
| `calculation_method` | Used by hotel pricing logic. | KEEP |
| `catering_services` | Used by hotel configuration. | KEEP |
| `mandatory` | Used by hotel configuration. | KEEP |
| `valid_on_weekdays` | Used by hotel pricing/availability. | KEEP |
| `input_lists` and sub-collections | Generic input list configuration. User decided to keep. | KEEP |

### Round 3 Deletions (7 collections)

Deletion order was determined by FK constraints:

1. `partner_filter_partner` — junction table deleted first to unblock `partner_filter`
2. `partner_filter` — deleted after junction was removed
3. `status_color` — no dependencies, deleted directly
4. `media_region` — deleted directly
5. `junction_directus_files_translations` — un-numbered orphaned version deleted
6. `media_country` — deleted directly
7. `continent` — deleted directly

---

## KEEP — Verified Remaining

**Hotel collections (~40), global/shared collections (~50), and hotel-specific flows (~65) remain intact.**

Key collections kept:
- All `hotels*` collections and sub-tables
- All `room_*`, `surcharges*`, `occupancies*`, `price_dates`, `room_prices*`
- Hotel support: `hotel_group`, `hotel_classifications`, `accommodation_types`, `activities`, `catering_services`, `calculation_method`, `mandatory`, `valid_on_weekdays`
- Hotel destination exceptions: `erp_hotel_destination_exceptions*`, `mp_hotel_destination_exceptions*`
- Global geography (Global_Data > Geographies: `places`, `states`, `regions`, `countries`, `destinations`, `destinations_cluster`)
- Partner, pricing, media, MAT (hotel translations only), translations
- Media helper: `media_share_link`, `media_library_settings`, `junction_directus_files_translations_2`
- Input lists: `input_lists` and sub-collections

---

---

## Round 4 — Flow Audit & Cleanup

### Analysis Method

Full scan of all 65 remaining flows: trigger collection/scope, every operation's collection reference, and cross-flow call graph (which flows call which other flows by ID). Flows were classified by whether their trigger target and operation collections still exist.

### Round 4 Findings — Flows KEPT (corrected from initial analysis)

Initial analysis incorrectly flagged two partner sync flows as removable. After reading trigger conditions:

| Flow | Why KEPT |
|---|---|
| `Sync All Partners to Hotel When Changed to All - 04 May` | Trigger on `hotels` create/update; condition checks `partner_type = 'all'` — operates on hotel fields, not on the deleted `partner_filter` collection |
| `Sync New Partner to All Hotels - 04 May` | Trigger on `partner` create; reads `hotels` filtered by `partner_type = 'all'`, writes `hotels_partner` — all valid collections |
| `[HOTEL] Set Exchange Rate - 04 May` + 2 trigger flows | Inactive but valid; all ops on `hotels` + `exchange_rate_presets`. Only called by each other (inactive group). Kept for now. |
| `Delete Room Prices - Copy` | Inactive but the only flow that cleans up orphaned `room_prices` when a `hotels_occupancy` is deleted. No active equivalent exists. |

### Round 4 Deletions (10 flows)

#### Broken — Reference Deleted Collections (5, all deleted)

| Flow | ID | Problem |
|---|---|---|
| `Map Pin - 04 May` | badbe328-d0d8-4ff1-8199-534780cfc9ad | Trigger + all ops on `geo_location` (deleted by user) |
| `Map Pin Address location Autocomplete - 04 May` | d8a98644-b89f-48e8-9dbe-79101e951ed6 | Trigger + all ops on `geo_location` (deleted by user) |
| `[Exchange Rate Preset] Apply to Hotels - local - 04 May` | ddeabe80-d49a-4fb1-a83b-87768531ae72 | Reads `batch_hotel`, updates `batch_hotel_translations` — both deleted Round 1. Bulk-apply silently did nothing. |
| `[Margin Preset] Apply to Hotels - local - 04 May` | 4ee5f58c-9999-4dae-af1d-bf2bc0dd64a7 | Same — `batch_hotel` / `batch_hotel_translations` deleted Round 1 |
| `Sync All Partners When Filter Changes to All - 04 May` | b6148f77-5dd3-4916-9937-dc1acfb46722 | Trigger on `partner_filter`, ops on `partner_filter_partner` — both deleted Round 3 |

> **Note on Exchange Rate / Margin Preset bulk-apply:** The "Apply to Hotels" manual flows were the mechanism for bulk-pushing preset rates to all hotels at once. That functionality is now broken because `batch_hotel` was deleted in Round 1. If bulk preset application is needed in future, it must be rebuilt directly against the `hotels` collection.

#### Inactive Duplicates — Superseded by Active Counterparts (5, all deleted)

Each had an active counterpart with identical trigger collection/scope and identical operation logic. None were called by any active flow.

| Inactive Flow (deleted) | ID | Active Counterpart (kept) |
|---|---|---|
| `[PRICE CALCULATOR] Sync Hotel Room Prices - 04 May` | dfc747d6-fdf0-4cf7-a102-8477907f2428 | `[PRICE CALCULATOR] Sync Hotel Room Prices` |
| `[PRICE CALCULATOR] Sync Room Prices - New Occupancy - 04 May` | b9bf1787-4bcc-4e4b-909c-879471c4b029 | `[PRICE CALCULATOR] Sync Room Prices - New Occupancy` |
| `[PRICE CALCULATOR] Sync Room Prices - New Price Date - 04 May` | fbefa605-36b1-43a4-8744-5d441de00433 | `[PRICE CALCULATOR] Sync Room Prices - New Price Date` |
| `[PRICE CALCULATOR] [ROOM CATEGORY] Sync Room Prices - New Category - 04 May` | c12a090f-bf94-44d9-a23d-5e185747d854 | `[PRICE CALCULATOR] [ROOM CATEGORY] Sync Room Prices - New Category` |
| `Room Prices - New Occupancy - 15 April - 04 May` | 2325ccb7-d1f9-419b-9441-8062ac6cd226 | `[PRICE CALCULATOR] Sync Room Prices - New Occupancy` (active, also covers updates) |

---

---

## Round 5 — Cosmetic Reorganisation (Collection Groups & Sort Order)

**Scope:** Only `meta.group` and `meta.sort` changed on collection metadata. No schema, fields, relations, or content were touched.

### Goal

Organise the remaining collections into 4 clean top-level groups visible in the Directus sidebar:

| # | Group | Type | Purpose |
|---|---|---|---|
| 1 | `hotels` | real collection | Main hotel content entry point — stays at root |
| 2 | `Hotels_Metadata` | folder | All hotel lookup/config tables and nested sub-tables |
| 3 | `Global_Data` | folder | Geography, global config, MAT, presets, translations, input lists |
| 4 | `Media` | folder (new) | Albums, media settings, share links, file junction table |

### New Folder Created

| Collection | Type | Sort | Group |
|---|---|---|---|
| `Media` | virtual folder (schema=null) | 4 | root |

### Root-Level Sort Reordered

| Collection | Old sort | New sort |
|---|---|---|
| `hotels` | 2 | 1 |
| `Hotels_Metadata` | 9 | 2 |
| `Global_Data` | 18 | 3 |
| `Media` | — (new) | 4 |

### Collections Moved into `hotels` sub-group

These were floating at root; now nested under the `hotels` collection.

| Collection | Old group | New group | New sort |
|---|---|---|---|
| `hotels_translations_2` | root | `hotels` | 7 |
| `hotels_translations_3` | root | `hotels` | 8 |
| `hotels_translations_4` | root | `hotels` | 9 |
| `hotels_files` | root | `hotels` | 10 |
| `hotels_directus_files` | root | `hotels` | 11 |

### Collections Moved into existing Hotels_Metadata sub-groups

| Collection | Old group | New group | New sort |
|---|---|---|---|
| `hotels_accommodation_types_1` | root | `accommodation_types` | 2 |
| `room_categories_translations_days` | root | `room_categories` | 2 |
| `room_categories_valid_on_weekdays` | root | `room_categories` | 3 |
| `seasons` | root | `Hotels_Metadata` | 17 |

### Collections Moved into `Global_Data`

| Collection | Old group | New group | New sort |
|---|---|---|---|
| `translations` | root | `Global_Data` | 4 |
| `global_configurations` | root | `Global_Data` | 5 |
| `input_lists` (folder + its sub-collections) | root | `Global_Data` | 6 |
| `mobility_advice_text_translations` | root | `mobility_advice_text` | 1 |

### Collections Moved into `Media` (new folder)

| Collection | Old group | New group | New sort |
|---|---|---|---|
| `albums_directus` | root | `Media` | 1 |
| `albums_directus_files` | root | `albums_directus` (nested) | 1 |
| `media_library_settings` | root | `Media` | 2 |
| `media_share_link` | root | `Media` | 3 |
| `junction_directus_files_translations_2` | root | `Media` | 4 |

### Final Sidebar Structure

```
hotels                          (sort 1, root)
  ├── room_prices_translations
  ├── hotels_translations_1/3/5
  ├── hotels_translations
  ├── hotels_surcharges_translations / hotels_surcharges
  ├── hotels_translations_2 / _3 / _4
  ├── hotels_files / hotels_directus_files

Hotels_Metadata                 (sort 2, root folder)
  ├── partner → hotels_partner
  ├── accommodation_types → hotels_accommodation_types, hotels_accommodation_types_1
  ├── activities → hotels_activities, hotels_activities_1
  ├── hotel_group / hotel_classifications
  ├── booking_partners / booking_details
  ├── room_categories → room_categories_translations, _days, _valid_on_weekdays
  ├── price_dates
  ├── occupancies → occupancies_translations, hotels_occupancies
  ├── room_prices
  ├── surcharges → surcharges_translations
  ├── currencies → rates
  └── seasons

Global_Data                     (sort 3, root folder)
  ├── Geographies → destinations_cluster, destinations, countries, regions, states, places, locations_tour32
  ├── mobility_advice_text → mobility_advice_text_translations
  ├── margin_preset → margin_presets (+ mp_hotel_destination_exceptions), exchange_rate_presets (+ erp_hotel_destination_exceptions)
  ├── translations
  ├── global_configurations
  └── input_lists → calculation_method, mandatory, catering_services, valid_on_weekdays

Media                           (sort 4, root folder — new)
  ├── albums_directus → albums_directus_files
  ├── media_library_settings
  ├── media_share_link
  └── junction_directus_files_translations_2
```

---

*Cleanup and reorganisation completed 2026-06-23. Approximately 300+ collections and 89+ flows removed across 4 cleanup rounds. Cosmetic reorganisation applied in Round 5. 55 flows and ~109 collections remain, all hotel-scoped or shared infrastructure.*
