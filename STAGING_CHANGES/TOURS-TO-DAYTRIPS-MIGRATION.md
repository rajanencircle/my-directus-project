# Tours → Daytrips Migration — Staging Changes Log

**Started:** 2026-06-15  
**Environment:** Directus Staging  
**Strategy:** Create all new daytrips infrastructure WITHOUT touching existing tours collections. Tours collections will be deleted after migration is verified.

---

## Rules
- ✅ CREATE new collections/fields/flows for daytrips
- ✅ UPDATE daytrips and daytrips_categories (daytrips-related only)
- ❌ DO NOT modify or delete anything prefixed `tours_`
- ❌ DO NOT modify tours collection itself yet
- ❌ DO NOT modify unrelated collections (hotels, cruises, margin_presets, etc.)

---

## Collections to DELETE after migration is verified (tours cleanup)
> These are marked for future deletion once daytrips is fully operational

| Collection | Status |
|---|---|
| `tours` | 🗑️ DELETE LATER |
| `tours_categories` | 🗑️ DELETE LATER |
| `tours_categories_translations` | 🗑️ DELETE LATER |
| `tours_countries` | 🗑️ DELETE LATER |
| `tours_dates_translations` | 🗑️ DELETE LATER |
| `tours_daytrips_price_dates` | 🗑️ DELETE LATER |
| `tours_directus_files` | 🗑️ DELETE LATER |
| `tours_image_badge_translations` | 🗑️ DELETE LATER |
| `tours_partner` | 🗑️ DELETE LATER |
| `tours_price_info_translations` | 🗑️ DELETE LATER |
| `tours_prices` | 🗑️ DELETE LATER |
| `tours_prices_translations` | 🗑️ DELETE LATER |
| `tours_room_occupancies` | 🗑️ DELETE LATER |
| `tours_routes` | 🗑️ DELETE LATER |
| `tours_surcharges_items` | 🗑️ DELETE LATER |
| `tours_surcharges_items_translations` | 🗑️ DELETE LATER |
| `tours_surcharges_translations` | 🗑️ DELETE LATER |
| `tours_tour_dates_web` | 🗑️ DELETE LATER |
| `tours_tour_dates_web_trips_frequencies` | 🗑️ DELETE LATER |
| `tours_tours_room_occupancies` | 🗑️ DELETE LATER |
| `tours_translations` | 🗑️ DELETE LATER |
| `tours_translations_1` | 🗑️ DELETE LATER |
| `tours_travel_categories` | 🗑️ DELETE LATER |
| `erp_tours_destination_exceptions` | 🗑️ DELETE LATER |
| `erp_tours_destination_exceptions_translations` | 🗑️ DELETE LATER |
| `mp_tours_destination_exceptions` | 🗑️ DELETE LATER |
| `mp_tours_destination_exceptions_translations` | 🗑️ DELETE LATER |
| `batch_tours` | 🗑️ DELETE LATER |
| `batch_tours_locale` | 🗑️ DELETE LATER |

---

## Flows to DEACTIVATE/DELETE after migration is verified
| Flow Name | Flow ID | Status |
|---|---|---|
| `[Image Badge] Tour - Compute Status` | `03df84db-...` | 🗑️ DELETE LATER |
| `[Image Badge] Tour - Daily Expiry Check` | `34cafee5-...` | 🗑️ DELETE LATER |
| `[Image Badge] Tour - Notify Editor Before Unpublish` | `89ebae1c-...` | 🗑️ DELETE LATER |
| `[MAT] Tour CREATE - 04 May` | `67c362ac-...` | 🗑️ DELETE LATER |
| `[MAT] Tour UPDATE - 04 May` | `3366935b-...` | 🗑️ DELETE LATER |
| `[MAT] Tour TRIGGER - 04 May` | `1e9e258b-...` | 🗑️ DELETE LATER |
| `[Margin & Exchange Preset] Tour create/update` | `33b177da-...` | 🗑️ DELETE LATER |
| `[Init] Default Margins - Batch Tours - local - 04 May` | `54508ef8-...` | 🗑️ DELETE LATER |
| `[PRICE CALCULATOR] [TOUR] Trigger on Price Date - 05 Jun` | `23c293e7-...` | 🗑️ DELETE LATER |
| `[PRICE CALCULATOR] [TOUR] Trigger on Category - 05 Jun` | `71ed67c8-...` | 🗑️ DELETE LATER |
| `[PRICE CALCULATOR] [TOUR] Trigger on Occupancy - 05 Jun` | `92831c3c-...` | 🗑️ DELETE LATER |
| `[PRICE CALCULATOR] [TOUR] Sync Tour Prices - 05 Jun` | `68c6a1af-...` | 🗑️ DELETE LATER |
| `[PRICE CALCULATOR] [TOUR] Init Default Margins - 05 Jun` | `ac42171d-...` | 🗑️ DELETE LATER |
| `Tours - Cleanup - Null Orphaned Prices` | `16cc09f6-...` | 🗑️ DELETE LATER |
| `Tours - Cleanup - Prices on Occupancy Unlink` | `62930229-...` | 🗑️ DELETE LATER |
| `Calculate Surcharge Prices - Tours - 11 Jun` | `829e1984-...` | 🗑️ DELETE LATER |
| `[Margin Preset] Apply to Tours - local - 04 May` | `25ef4365-...` | 🗑️ DELETE LATER |
| `[Exchange Rate Preset] Apply to Tours - local - 04 May` | `6dd48e2f-...` | 🗑️ DELETE LATER |

---

## Changes Log

### 2026-06-15

---

#### ✅ PHASE 1: Expand `daytrips` Core Fields

**Fields added to `daytrips` collection:**

| Field | Type | Notes |
|---|---|---|
| `name` | string | Tour/daytrip name |
| `partner_type` | string | Radio: all/selected |
| `operator` | string | Radio: Yes/No |
| `booking_partner` | string | Radio: Yes/No |
| `supplier_product_code` | integer | External supplier code |
| `object_info_primarix` | string | Readonly, from Primarix |
| `street` | string | Address |
| `street_number` | string | Address |
| `zip_code` | string | Address |
| `id_tour_user` | string | Legacy Primarix ID |
| `haupt_id_tour_user` | string | Legacy main Primarix ID |
| `children_free_age` | integer | Max age for free children |
| `children_free_number` | integer | Number of free children |
| `internal_remarks` | text | Internal notes from Primarix |
| `internal_remarks_reservation` | text | Internal reservation notes |
| `booking_email` | string | Booking contact email |
| `participants_min` | integer | Minimum participants |
| `participants_max` | integer | Maximum participants |
| `week_min_before_start` | integer | Min weeks before departure |
| `price_subline` | string | Import only, hidden |
| `mobility_advice_text` | text | Readonly, from MAT flow |
| `sell_prices_status` | string | Readonly: idle/processing/done/failed |
| `sell_prices_updated_at` | timestamp | Readonly, last price calc |
| `phone_general` | string | General phone |
| `phone_ah` | string | After-hours phone |
| `email_general` | string | General email |
| `website` | string | Website URL |
| `image_badge_start_date` | date | Badge publish start |
| `image_badge_end_date` | date | Badge publish end |
| `image_badge_status` | string | never_published/always_published/published_period |
| `daytrips_specials` | json | Special offers list |
| `destination` | integer | M2O → destinations |
| `operator_fk` | uuid | M2O → booking_partners |
| `booking` | uuid | M2O → booking_partners |
| `season` | integer | M2O → seasons |
| `place` | integer | M2O → places |
| `state` | integer | M2O → states |
| `country` | integer | M2O → countries |
| `location_tour32` | integer | M2O → locations_tour32 |

---

#### ✅ PHASE 1b: Update `daytrips_categories`

**Fields added to `daytrips_categories`:**

| Field | Type | Notes |
|---|---|---|
| `daytrip_id` | uuid | M2O → daytrips (FK, ON DELETE CASCADE) |
| `category_supplier_code` | string | External supplier category code |
| `price_start` | boolean | Mark as starting price reference for from_price |

---

#### ✅ PHASE 2a: New Collection `daytrips_room_occupancies`

New standalone occupancy lookup table (clone of tours_room_occupancies structure):

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `sort` | integer | Manual sort |
| `name` | string | Required |
| `price_start` | boolean | Starting price reference |
| `value` | integer | Required, occupancy value |

---

#### ✅ PHASE 2b: New Collection `daytrips_translations`

Main content translations for daytrips (equivalent of tours_translations):

| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK auto-increment |
| `daytrips_id` | uuid | FK → daytrips (ON DELETE SET NULL) |
| `translations_id` | uuid | FK → translations |
| `tour_title` | string | Translated title |
| `subline` | string | Translated subline |
| `teaser` | text | Translated teaser |
| `disclaimer_tour_programm` | text | Program disclaimer |
| `tour_programm` | text | Full program text |
| `recommendations` | text | Recommendations |
| `px_source_id` | string | Primarix source ID |
| `description_supplementary` | json | Additional description blocks |
| `mobility_advice_text` | text | Readonly, MAT-synced |

---

#### ✅ PHASE 2c: New Collection `daytrips_translations_1`

Per-market pricing configuration (equivalent of tours_translations_1):

| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK auto-increment |
| `daytrips_id` | uuid | FK → daytrips (ON DELETE SET NULL) |
| `translations_id` | uuid | FK → translations |
| `buy_price_type` | string | per_unit / per_person |
| `sell_price_type` | string | per_unit / per_person |
| `percentage_type` | string | net / gross |
| `provision_percentage` | float | Only if buy_price_type = gross |
| `margin_percentage` | float | Margin % |
| `exchange_rate` | json | Collection-item-dropdown: rates |
| `from_price` | uuid | M2O → daytrips_prices (added after daytrips_prices created) |

---

#### ✅ PHASE 2d: New Collection `daytrips_image_badge_translations`

| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK |
| `daytrips_id` | uuid | FK → daytrips (ON DELETE CASCADE) |
| `translations_id` | uuid | FK → translations |
| `image_badge_teaser` | string | Badge teaser text |
| `image_badge_details` | text | Badge detail text |

---

#### ✅ PHASE 2e: New Collection `daytrips_price_info_translations`

| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK |
| `daytrips_id` | uuid | FK → daytrips (ON DELETE CASCADE) |
| `translations_id` | uuid | FK → translations |
| `services_included` | text | Included services |
| `services_not_included` | text | Excluded services |
| `deviating_cancelation_terms` | text | Special cancellation terms |
| `children_policy` | text | Children policy |
| `participants_text` | string | Participant info text |
| `additional_information` | text | Extra booking info |
| `price_infos_supplementary` | json | Additional price info blocks |

---

#### ✅ PHASE 2f: New Collection `daytrips_dates_translations`

| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK |
| `daytrips_id` | uuid | FK → daytrips (ON DELETE CASCADE) |
| `translations_id` | uuid | FK → translations |
| `depatures_text` | text | AI-translated departure text |

---

#### ✅ PHASE 2g: New Collection `daytrips_surcharges_translations`

| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK |
| `daytrips_id` | uuid | FK → daytrips (ON DELETE CASCADE) |
| `translations_id` | uuid | FK → translations |
| `surcharge_percentage_type` | string | net / gross |
| `surcharge_provision_percentage` | float | Readonly |
| `surcharge_margin_percentage` | float | Margin % for surcharges |
| `surcharge_exchange_rate` | json | Collection-item-dropdown: rates |

---

#### ✅ PHASE 2h: New Collection `daytrips_routes`

| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK |
| `sort` | integer | Sort order |
| `daytrip_id` | uuid | FK → daytrips (ON DELETE SET NULL) |
| `tour_departure` | integer | M2O → places |
| `tour_arrival` | integer | M2O → places |

---

#### ✅ PHASE 2i: New Collections `daytrips_tour_dates_web` + `daytrips_tour_dates_web_trips_frequencies`

**daytrips_tour_dates_web:**
| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK |
| `sort` | integer | Sort |
| `daytrip_id` | uuid | FK → daytrips (ON DELETE SET NULL) |
| `available_from` | date | Departure window start |
| `available_to` | date | Departure window end |

**daytrips_tour_dates_web_trips_frequencies:**
| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK |
| `daytrips_tour_dates_web_id` | integer | FK → daytrips_tour_dates_web (CASCADE) |
| `trips_frequencies_id` | uuid | FK → trips_frequencies (CASCADE) |

---

#### ✅ PHASE 2j: New Collections `daytrips_surcharges_items` + `daytrips_surcharges_items_translations`

**daytrips_surcharges_items:**
| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK |
| `sort` | integer | Sort |
| `user_created` | uuid | Audit |
| `date_created` | timestamp | Audit |
| `user_updated` | uuid | Audit |
| `date_updated` | timestamp | Audit |
| `name` | string | Required |
| `buy_price` | decimal | Buy price |
| `daytrip_id` | uuid | Required, FK → daytrips (ON DELETE CASCADE) |
| `status` | string | published/unpublished |
| `publish_start` | dateTime | Optional active from |
| `publish_end` | dateTime | Optional active until |
| `px_source_id` | integer | Primarix source ID |

**daytrips_surcharges_items_translations:**
| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK |
| `daytrips_surcharges_items_id` | integer | FK → daytrips_surcharges_items (SET NULL) |
| `translations_id` | uuid | FK → translations (SET NULL) |
| `surcharge_booking_name` | string | Booking display name |
| `surcharge_description` | text | Description |
| `surcharge_type` | uuid | M2O → mandatory (SET NULL) |
| `surcharge_calc_type` | uuid | M2O → calculation_method (CASCADE) |
| `sell_price` | decimal | Readonly, calculated |

---

#### ✅ PHASE 3a: M2M Junction Tables Created

**daytrips_countries** (daytrips ↔ countries):
| Field | Type |
|---|---|
| `id` | integer PK |
| `daytrips_id` | uuid → daytrips (CASCADE) |
| `countries_id` | integer → countries (CASCADE) |

**daytrips_directus_files** (daytrips ↔ directus_files):
| Field | Type |
|---|---|
| `id` | integer PK |
| `daytrips_id` | uuid → daytrips (SET NULL) |
| `directus_files_id` | uuid → directus_files (SET NULL) |

**daytrips_partner** (daytrips ↔ partner):
| Field | Type |
|---|---|
| `id` | integer PK |
| `daytrips_id` | uuid → daytrips (CASCADE) |
| `partner_id` | uuid → partner (CASCADE) |

**daytrips_travel_categories** (daytrips ↔ travel_categories):
| Field | Type |
|---|---|
| `id` | integer PK |
| `daytrips_id` | uuid → daytrips (CASCADE) |
| `travel_categories_id` | uuid → travel_categories (CASCADE) |

**daytrips_daytrips_room_occupancies** (daytrips ↔ daytrips_room_occupancies):
| Field | Type |
|---|---|
| `id` | integer PK |
| `daytrips_id` | uuid → daytrips (CASCADE) |
| `daytrips_room_occupancies_id` | uuid → daytrips_room_occupancies (SET NULL) |

---

#### ✅ PHASE 3b: Pricing Collections

**daytrips_prices:**
| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK |
| `daytrip_id` | uuid | FK → daytrips (CASCADE) |
| `daytrips_category_id` | uuid | FK → daytrips_categories (CASCADE) |
| `price_date_id` | integer | FK → daytrips_price_dates (CASCADE) |
| `daytrips_room_occupancy_id` | uuid | FK → daytrips_room_occupancies (CASCADE) |
| `buy_price` | decimal | Buy price |

**daytrips_prices_translations:**
| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK |
| `daytrips_prices_id` | integer | FK → daytrips_prices (CASCADE) |
| `translations_id` | uuid | FK → translations (SET NULL) |
| `sell_price` | decimal | Readonly, calculated sell price |

---

#### ✅ PHASE 4: Batch Pricing System

**batch_daytrips:**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `sort` | integer | Sort |
| `user_created/updated` | uuid | Audit |
| `name` | string | Required |
| `buy_price` | float | Required |
| `destination` | integer | M2O → destinations (SET NULL) |

**batch_daytrips_locale:**
| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK |
| `batch_daytrips_id` | uuid | FK → batch_daytrips (CASCADE) |
| `translations_id` | uuid | FK → translations (CASCADE) |
| `margin` | float | Required |
| `exchange_rate` | uuid | M2O → rates (SET NULL) |
| `sell_price` | float | Readonly, calculated |

---

#### ✅ PHASE 5: ERP/MP Exception Tables

**erp_daytrips_destination_exceptions:**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `sort` | integer | |
| `user_created/updated` | uuid | Audit |
| `exception_destination` | integer | M2O → destinations (SET NULL) |

**erp_daytrips_destination_exceptions_translations:**
| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK |
| `erp_daytrips_destination_exceptions_id` | uuid | FK → erp_daytrips_destination_exceptions (CASCADE) |
| `translations_id` | uuid | FK → translations (CASCADE) |
| `exception_exchange_rate` | uuid | M2O → rates (SET NULL) |

**mp_daytrips_destination_exceptions:**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `sort` | integer | |
| `user_created/updated` | uuid | Audit |
| `exception_destination` | integer | M2O → destinations (SET NULL) |

**mp_daytrips_destination_exceptions_translations:**
| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK |
| `mp_daytrips_destination_exceptions_id` | uuid | FK → mp_daytrips_destination_exceptions (CASCADE) |
| `translations_id` | uuid | FK → translations (CASCADE) |
| `exception_margin` | float | Required |

---

#### ✅ PHASE 6: Alias Fields Added to `daytrips`

| Alias Field | Type | Points To |
|---|---|---|
| `partner` | M2M alias | partner via daytrips_partner |
| `countries` | M2M alias | countries via daytrips_countries |
| `daytrips_description_translations` | ai-translations alias | daytrips_translations |
| `price_info` | ai-translations alias | daytrips_price_info_translations |
| `media` | M2M alias | directus_files via daytrips_directus_files |
| `tour_prices` | translations alias | daytrips_translations_1 |
| `daytrips_routes` | O2M alias | daytrips_routes |
| `image_badge_translations` | translations alias | daytrips_image_badge_translations |
| `tour_dates` | O2M alias | daytrips_tour_dates_web |
| `daytrips_price_periods` | O2M alias | daytrips_price_dates |
| `daytrips_categories_list` | O2M alias | daytrips_categories |
| `daytrips_room_occupancy` | M2M alias | daytrips_room_occupancies via junction |
| `daytrips_surcharges_calc` | translations alias | daytrips_surcharges_translations |
| `daytrips_surcharges` | O2M alias | daytrips_surcharges_items |
| `travel_categories` | M2M alias | travel_categories via daytrips_travel_categories |
| `daytrips_dates_translations` | ai-translations alias | daytrips_dates_translations |

---

#### ✅ PHASE 7: Flows Cloned for Daytrips

All 18 daytrips flows created with full operation chains. Flow UUIDs:

| New Flow Name | Flow UUID | Trigger |
|---|---|---|
| `[Image Badge] Daytrip - Compute Status` | `36f38355-...` | `daytrips` create/update |
| `[Image Badge] Daytrip - Daily Expiry Check` | `81c8d8b8-...` | Schedule daily 08:00 |
| `[Image Badge] Daytrip - Notify Editor Before Unpublish` | `2b7b4719-...` | Operation sub-flow |
| `[MAT] Daytrip CREATE - 04 May` | `8dc9509e-...` | `daytrips` create |
| `[MAT] Daytrip UPDATE - 04 May` | `050076c6-...` | `daytrips` update |
| `[MAT] Daytrip TRIGGER - 04 May` | `d03cd399-...` | Operation sub-flow |
| `[Margin & Exchange Preset] Daytrip create/update` | `2440eaf9-...` | `daytrips` create/update |
| `[Init] Default Margins - Batch Daytrips - local - 04 May` | `c683ccc4-...` | `batch_daytrips` create |
| `[PRICE CALCULATOR] [DAYTRIP] Trigger on Price Date - 05 Jun` | `a45928ab-...` | `daytrips_price_dates` create/update |
| `[PRICE CALCULATOR] [DAYTRIP] Trigger on Category - 05 Jun` | `0c125f45-...` | `daytrips_categories` create |
| `[PRICE CALCULATOR] [DAYTRIP] Trigger on Occupancy - 05 Jun` | `fda5ecd4-...` | `daytrips_daytrips_room_occupancies` create/update |
| `[PRICE CALCULATOR] [DAYTRIP] Sync Daytrip Prices - 05 Jun` | `b8197146-...` | Operation sub-flow |
| `[PRICE CALCULATOR] [DAYTRIP] Init Default Margins - 05 Jun` | `5c1c5c7a-...` | `daytrips_translations_1` create |
| `Daytrips - Cleanup - Null Orphaned Prices` | `70ab8dc9-...` | `daytrips_categories`/`daytrips_price_dates` delete |
| `Daytrips - Cleanup - Prices on Occupancy Unlink` | `3e40ff28-...` | `daytrips_daytrips_room_occupancies` delete |
| `Calculate Surcharge Prices - Daytrips - 11 Jun` | `d0369091-...` | Webhook POST |
| `[Margin Preset] Apply to Daytrips - local - 04 May` | `0771e5d9-...` | `margin_presets` manual |
| `[Exchange Rate Preset] Apply to Daytrips - local - 04 May` | `4606a575-...` | `exchange_rate_presets` manual |

---

#### ✅ PHASE 8: Preset Translation Tables for Daytrips

**New collection `margin_presets_translations_8`** (daytrips global margin defaults per locale):
| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK auto-increment |
| `margin_presets_id` | uuid | FK → margin_presets (SET NULL), one_field=`daytrips_margin_translations` |
| `translations_id` | uuid | FK → translations (SET NULL) |
| `margin` | float | Required, 0–100% |

**New collection `exchange_rate_presets_translations_6`** (daytrips global exchange rate defaults per locale):
| Field | Type | Notes |
|---|---|---|
| `id` | integer | PK auto-increment |
| `exchange_rate_presets_id` | uuid | FK → exchange_rate_presets (SET NULL), one_field=`daytrips_exchange_rate_translations` |
| `translations_id` | uuid | FK → translations (SET NULL) |
| `exchange_rate` | uuid | M2O → rates (SET NULL) |

**Alias fields added to `margin_presets`** (daytrips section, group=`daytrips_group`):
| Field | Type | Notes |
|---|---|---|
| `daytrips_group` | alias group | Top-level group container (sort=12) |
| `accordion-daytrips-mp` | alias accordion | Inside daytrips_group |
| `daytrips` | alias group-raw | Inside accordion |
| `daytrips_margin_translations` | translations alias | → margin_presets_translations_8 |
| `daytrips_destinations` | O2M alias | → mp_daytrips_destination_exceptions (one_field updated) |
| `daytrips_other_default_locale` | text | Readonly, other locale defaults |
| `trigger_daytrips` | flow-trigger alias | Fires flow `0771e5d9` (Apply to Daytrips) |

**Alias fields added to `exchange_rate_presets`** (daytrips section, group=`daytrips_group`):
| Field | Type | Notes |
|---|---|---|
| `daytrips_group` | alias group | Top-level group container (sort=12) |
| `accordion-daytrips-erp` | alias accordion | Inside daytrips_group |
| `daytrips` | alias group-raw | Inside accordion |
| `daytrips_exchange_rate_translations` | translations alias | → exchange_rate_presets_translations_6 |
| `daytrips_destinations` | O2M alias | → erp_daytrips_destination_exceptions (one_field updated) |
| `daytrips_other_default_locale` | text | Readonly |
| `trigger_daytrips` | flow-trigger alias | Fires flow `4606a575` (Apply to Daytrips) |

**Relations updated:**
- `mp_daytrips_destination_exceptions.mp_daytrips_destination_exceptions_id` → `margin_presets` — added `one_field=daytrips_destinations`
- `erp_daytrips_destination_exceptions.erp_daytrips_destination_exceptions_id` → `exchange_rate_presets` — added `one_field=daytrips_destinations`

---

#### ✅ PHASE 9: MAT (Mobility Advice Text) for Daytrips

**Field added to existing shared collection `mobility_advice_text_translations_2`:**
| Field | Type | Notes |
|---|---|---|
| `daytrips_mobility_advice_text` | text | Daytrips MAT text per locale (alongside existing `tours_mobility_advice_text`) |

**3 new MAT flows created** (see Phase 7 for UUIDs):
- `[MAT] Daytrip CREATE - 04 May` (`8dc9509e`) — 2 ops: transform_payload → trigger
- `[MAT] Daytrip UPDATE - 04 May` (`050076c6`) — 2 ops: transform_payload → trigger  
- `[MAT] Daytrip TRIGGER - 04 May` (`d03cd399`) — 7 ops: transform_payload → read_data_mat → read_translations → read_data_tour → script → update_tour → create_tour

The TRIGGER sub-flow reads `mobility_advice_text` via the existing `tours_translations.*` alias (which returns rows from `mobility_advice_text_translations_2`), then reads `daytrips_mobility_advice_text` from each row to sync into `daytrips_translations.mobility_advice_text`.

**Field to also UPDATE to add `daytrips` field on `mobility_advice_text` admin UI:** The `tours_translations` alias on `mobility_advice_text` exposes all rows in `mobility_advice_text_translations_2`. The new `daytrips_mobility_advice_text` column is automatically included when editing those rows.

---

#### ✅ PHASE 10: Data Migration

**Date:** 2026-06-16

**Pre-migration schema addition:**
- Added `daytrip_id` UUID field to `daytrips_price_dates`
- Created relation: `daytrips_price_dates.daytrip_id → daytrips` (ON DELETE CASCADE, `one_field = price_periods`)

**Daytrips created (3 records):**

| UUID | Source Tour | Notes |
|---|---|---|
| `fb272d8a-2491-4bde-a2c4-ee457873210a` | tour id=1 | name="Name in Operator asd", operator="Yes", season=5 |
| `ee5e5edb-1224-4212-9586-c96cbbaea5c6` | tour id=2 | empty |
| `6619ef61-1830-4732-801f-0487d893acb1` | tour id=3 | empty |

**daytrips_room_occupancies (3 records, same UUIDs as tours_room_occupancies):**

| UUID | name | value | price_start |
|---|---|---|---|
| `362ede85-1d61-4efe-b1fd-a4def004bf76` | 1 | 1 | true |
| `6f15b8f4-39d9-427a-8805-d2f692dfcad8` | 2 | 2 | true |
| `e5c987a5-5f6a-4432-91f4-b0342a000e9c` | 3 | 3 | false |

**daytrips_translations (9 rows):**
- ids 1–3: D2 (ee5e5edb) × 3 locales (de-DE, nl-NL, de-CH)
- ids 4–6: D1 (fb272d8a) × 3 locales
- ids 7–9: D3 (6619ef61) × 3 locales

**daytrips_translations_1 (3 rows for D1 only):**
- id=1: de-DE, from_price=5, margin=5.5%, exchange_rate=0a44a0bf
- id=2: nl-NL, margin=25.25%, exchange_rate=f23b1b26
- id=3: de-CH, margin=15.15%, exchange_rate=47bf7db4

**daytrips_surcharges_translations (1 row for D1):**
- id=1: de-DE, surcharge_percentage_type=net, surcharge_margin_percentage=20

**daytrips_categories instance for D1:**
- UUID=`a40d09ba-7a98-4718-b4de-e30972682e0e`, name="fasdfs", daytrip_id=D1, price_start=true

**daytrips_surcharges_items + translations (D1 only):**
- item id=1: name="1", buy_price=300 → translation id=1: de-DE, sell_price=1313
- item id=2: name="2", buy_price=200 → translation id=2: de-DE, sell_price=875

**daytrips_daytrips_room_occupancies junction (3 rows, D1):**
- ids 1–3: D1 × all 3 occupancy UUIDs

**daytrips_price_dates updated:**
- id=1: daytrip_id=D1 (was tour_id=1 only; tour_id unchanged)
- id=2: daytrip_id=D1 (same)

**daytrips_prices (8 records for D1, category=a40d09ba):**

| id | price_date_id | occupancy_id (short) | buy_price |
|---|---|---|---|
| 1 | 1 | 6f15b8f4 | 800 |
| 2 | 1 | 362ede85 | 0 |
| 3 | 1 | 362ede85 | 400 |
| 4 | 1 | e5c987a5 | 0 |
| 5 | 1 | e5c987a5 | 300 |
| 6 | 2 | 6f15b8f4 | 600 |
| 7 | 2 | 362ede85 | 500 |
| 8 | 2 | e5c987a5 | 700 |

**daytrips_prices_translations (8 rows, de-DE):**
- sell prices: 502 / 0 / 251 / 0 / 188 / 376 / 313 / 439

**batch_daytrips:**
- UUID=`b2ab17a5-9bc0-4ede-b969-d45711d67532`, name="Tours 1", buy_price=600

**batch_daytrips_locale (3 rows):**
- de-DE: margin=14, sell_price=438
- de-CH: margin=15, sell_price=14
- nl-NL: margin=16, sell_price=66120

**erp_daytrips_destination_exceptions:**
- UUID=`d2d40d6a-ac2f-45f3-8898-d02ea7b01f34`, exception_destination=null
- 3 translations (1 per locale) with exchange_rate copied from erp_tours equivalent

**mp_daytrips_destination_exceptions:**
- UUID=`69fdde38-72d0-4a3d-8bc0-63ca1779cb08`, exception_destination=10
- 3 translations: de-DE margin=14, de-CH margin=15, nl-NL margin=16

---

## Revert Instructions

To fully revert this migration (before data migration):

1. **Delete all 18 daytrips flows** (UUIDs in Phase 7 above)

2. **Delete collections in this order** (respect FK dependencies):
   - `daytrips_prices_translations`
   - `daytrips_prices`
   - `daytrips_translations_1`
   - `daytrips_translations`
   - `daytrips_image_badge_translations`
   - `daytrips_price_info_translations`
   - `daytrips_dates_translations`
   - `daytrips_surcharges_translations`
   - `daytrips_surcharges_items_translations`
   - `daytrips_surcharges_items`
   - `daytrips_tour_dates_web_trips_frequencies`
   - `daytrips_tour_dates_web`
   - `daytrips_routes`
   - `daytrips_countries`
   - `daytrips_directus_files`
   - `daytrips_partner`
   - `daytrips_travel_categories`
   - `daytrips_daytrips_room_occupancies`
   - `daytrips_room_occupancies`
   - `batch_daytrips_locale`
   - `batch_daytrips`
   - `erp_daytrips_destination_exceptions_translations`
   - `erp_daytrips_destination_exceptions`
   - `mp_daytrips_destination_exceptions_translations`
   - `mp_daytrips_destination_exceptions`
   - `margin_presets_translations_8`
   - `exchange_rate_presets_translations_6`

3. **Remove added fields from `daytrips`** (name, partner_type, operator, booking_partner, destination, all Phase 1 fields + all alias fields from Phase 6)

4. **Remove added fields from `daytrips_categories`** (daytrip_id, category_supplier_code, price_start)

5. **Remove added fields from `margin_presets`**: daytrips_group, accordion-daytrips-mp, daytrips, daytrips_margin_translations, daytrips_destinations, daytrips_other_default_locale, trigger_daytrips

6. **Remove added fields from `exchange_rate_presets`**: daytrips_group, accordion-daytrips-erp, daytrips, daytrips_exchange_rate_translations, daytrips_destinations, daytrips_other_default_locale, trigger_daytrips

7. **Remove `daytrips_mobility_advice_text` field** from `mobility_advice_text_translations_2`

8. **Reset relations**: Update `mp_daytrips_destination_exceptions.mp_daytrips_destination_exceptions_id` and `erp_daytrips_destination_exceptions.erp_daytrips_destination_exceptions_id` — set `one_field` back to null

9. **Remove `daytrip_id` field** from `daytrips_price_dates` (added in Phase 10 pre-migration)

10. **Delete migrated data** (if data migration has run):
    - Delete all items in `daytrips_prices_translations`
    - Delete all items in `daytrips_prices`
    - Delete all items in `daytrips_surcharges_items_translations`
    - Delete all items in `daytrips_surcharges_items`
    - Delete all items in `daytrips_surcharges_translations`
    - Delete all items in `daytrips_translations_1`
    - Delete all items in `daytrips_translations`
    - Delete all items in `daytrips_daytrips_room_occupancies`
    - Delete all items in `daytrips_room_occupancies`
    - Delete all items in `daytrips_categories` where daytrip_id IS NOT NULL
    - Delete all items in `daytrips` (the 3 migrated records)
    - Delete all items in `batch_daytrips_locale`
    - Delete all items in `batch_daytrips`
    - Delete all items in `erp_daytrips_destination_exceptions_translations`
    - Delete all items in `erp_daytrips_destination_exceptions`
    - Delete all items in `mp_daytrips_destination_exceptions_translations`
    - Delete all items in `mp_daytrips_destination_exceptions`
    - Update `daytrips_price_dates` id=1,2: set daytrip_id=null

11. **`tours` and all `tours_*` collections remain untouched throughout**

---

## Phase 11: Tab Structure (UI Layout)

**Date:** 2026-06-18  
**Goal:** Add the same tab layout to `daytrips` as exists in `tours`

### Stage 1–3: Tab group containers created on `daytrips`

| Field | Interface | Parent | Sort | Notes |
|---|---|---|---|---|
| `tabs` | group-tabs | (root) | 6 | Root tabs container |
| `master_data_group` | group-raw | tabs | 1 | Master Data tab |
| `partner_filter_group` | group-raw | tabs | 2 | Partner Filter tab |
| `tour_operator_group` | group-raw | tabs | 3 | Tour Operator tab |
| `reservation_group` | group-raw | tabs | 4 | Reservation tab |
| `description_group` | group-raw | tabs | 5 | Description tab |
| `tour_dates_group` | group-raw | tabs | 6 | Tour Dates tab |
| `price_info_group` | group-raw | tabs | 7 | Price Info tab |
| `price_basics` | group-raw | tabs | 8 | Price Basics tab |
| `locale_prices` | group-raw | tabs | 9 | Locale Prices tab (equivalent of tours "prices" tab) |
| `offer_specials_group` | group-raw | tabs | 10 | Offer Specials tab |
| `surcharge_group` | group-raw | tabs | 11 | Surcharges tab |
| `image_badge_group` | group-raw | tabs | 12 | Image Badge tab |
| `media_group` | group-raw | tabs | 13 | Media tab |
| `main_group` | group-raw | master_data_group | 1 | Nested sub-group in Master Data |
| `tour_details_group` | group-raw | tour_operator_group | 3 | Nested (hidden) sub-group in Tour Operator |
| `tour_departures_group` | group-raw | tour_dates_group | 2 | Nested sub-group for departures |
| `tour_routes_group` | group-raw | tour_dates_group | 3 | Nested sub-group for routes |
| `divider_1` | presentation-divider | price_basics | 2 | Divider between categories and price_periods |
| `divider_2` | presentation-divider | price_basics | 4 | Divider between price_periods and room_occupancies |
| `header` | header | (root) | 5 | Display header: `{{name}}` / `{{object_id}} - {{season.season}}` |

> **Note:** `locale_prices` is named differently from tours (where the tab is called `prices`) because in daytrips, `prices` is already an O2M alias field pointing to `daytrips_prices`.

### Stage 4: All fields assigned to correct groups

All existing daytrips fields updated with correct `group` and `sort` values:

| Field | Group | Sort |
|---|---|---|
| object_id | main_group | 1 |
| object_info_primarix | main_group | 2 |
| season | main_group | 3 |
| status_primarix | main_group | 4 |
| internal_remarks | main_group | 5 |
| date_updated | main_group | 6 |
| user_updated | main_group | 7 |
| partner_type | partner_filter_group | 1 |
| partner | partner_filter_group | 2 |
| operator | tour_operator_group | 1 |
| operator_fk | tour_operator_group | 2 |
| name | tour_details_group | 1 |
| street | tour_details_group | 2 |
| street_number | tour_details_group | 3 |
| zip_code | tour_details_group | 4 |
| place | tour_details_group | 5 |
| location_tour32 | tour_details_group | 6 |
| state | tour_details_group | 7 |
| country | tour_details_group | 8 |
| phone_general | tour_details_group | 9 |
| phone_ah | tour_details_group | 10 |
| email_general | tour_details_group | 11 |
| website | tour_details_group | 12 |
| booking_partner | reservation_group | 1 |
| booking | reservation_group | 2 |
| id_tour_user | reservation_group | 3 |
| haupt_id_tour_user | reservation_group | 4 |
| booking_email | reservation_group | 5 |
| internal_remarks_reservation | reservation_group | 6 |
| destination | description_group | 1 |
| countries | description_group | 2 |
| travel_categories | description_group | 3 |
| translations | description_group | 4 |
| dates_translations | tour_dates_group | 1 |
| tour_dates_web | tour_departures_group | 1 |
| routes | tour_routes_group | 1 |
| supplier_product_code | price_info_group | 1 |
| price_subline | price_info_group | 2 |
| price_info_translations | price_info_group | 3 |
| children_free_age | price_info_group | 4 |
| children_free_number | price_info_group | 5 |
| participants_min | price_info_group | 6 |
| participants_max | price_info_group | 7 |
| week_min_before_start | price_info_group | 8 |
| mobility_advice_text | price_info_group | 9 |
| categories | price_basics | 1 |
| divider_1 | price_basics | 2 |
| price_periods | price_basics | 3 |
| divider_2 | price_basics | 4 |
| room_occupancies | price_basics | 5 |
| prices | price_basics | 6 |
| sell_prices_status | price_basics | 7 |
| sell_prices_updated_at | price_basics | 8 |
| translations_1 | locale_prices | 1 |
| daytrips_specials | offer_specials_group | 1 |
| surcharges_translations | surcharge_group | 1 |
| surcharges_items | surcharge_group | 2 |
| image_badge_translations | image_badge_group | 1 |
| image_badge_start_date | image_badge_group | 2 |
| image_badge_end_date | image_badge_group | 3 |
| image_badge_status | image_badge_group | 4 |
| media | media_group | 1 |

### Cleanup
- `default_group` (original flat structure container) — set `hidden: true`

### Revert Steps for Phase 11
1. Delete all tab/group alias fields created in Stage 1–3 (tabs, master_data_group, partner_filter_group, tour_operator_group, reservation_group, description_group, tour_dates_group, price_info_group, price_basics, locale_prices, offer_specials_group, surcharge_group, image_badge_group, media_group, main_group, tour_details_group, tour_departures_group, tour_routes_group, divider_1, divider_2, header)
2. Reset all field `group` values back to `null` (or `default_group`)
3. Set `default_group` hidden back to `false`

---

## Phase 12: Beautification — Labels, Translations, Notes, Widths

**Date:** 2026-06-18  
**Goal:** Match all daytrips field labels, multilingual translations, notes, and widths to the tours collection. Also fix surcharges sort order and add tab group translations.

### What changed

All updates were applied via the Directus fields API (`PATCH /fields/daytrips`).

#### Tab group container translations (all 4 languages: en-GB / de-DE / nl-NL + en-US where applicable)

| Field (alias group) | en-GB | de-DE | nl-NL |
|---|---|---|---|
| `master_data_group` | Master Data | Stammdaten | Stamgegevens |
| `partner_filter_group` | Partner Filter | Partner Filter | Partner Filter |
| `tour_operator_group` | Operator | Veranstalter | Organisator |
| `reservation_group` | Reservation | Reservierung | Reservering |
| `description_group` | Description | Beschreibung | Beschrijving |
| `tour_dates_group` | Travel Dates | Reise-Termine | Reisdata |
| `price_info_group` | Price Information | Preis-Infos | Prijsinformatie |
| `price_basics` | Price Basics | Preisgrundlagen | Prijsgrondslagen |
| `locale_prices` | Prices | Preise | Prijzen |
| `offer_specials_group` | Offers | Angebote / Specials | Aanbiedingen |
| `surcharge_group` | Surcharges | Zuschläge | Toeslagen |
| `image_badge_group` | Image Badge | Bild Hinweis | Afbeelding badge |
| `media_group` | Media | Medien | Media |

#### Field-level changes

| Field | Label (en-US) | en-GB | de-DE | nl-NL | Width | Note |
|---|---|---|---|---|---|---|
| `object_id` | — | Object-ID | Objekt-ID | Object-ID | half | "Automatically set from Primarix." |
| `object_info_primarix` | — | Object Title Primarix | Objekt Titel Primarix | Objecttitel Primarix | half | — |
| `season` | Season Validity | Season Validity | Saison-Gültigkeit | Seizoengeldigheid | half | — |
| `internal_remarks` | Internal Remarks | Internal Remarks | Interne Hinweise | Interne opmerking | full | "Internal Remarks from Primarix. - Please consider for the future the Comments-Feature (Icon on right side)." |
| `date_updated` | — | Last Update | Zuletzt aktualisiert | Laatste update | half | — |
| `user_updated` | — | by | von | door | half | — |
| `partner_type` | Partner Filter | — | — | — | full | — |
| `operator` | Trip Operator? | Trip Operator? | Veranstalter mit mehreren Angeboten | Reisorganisator? | full | — |
| `operator_fk` | Tour Operator | Tour Operator | Tour Operator | Touroperator | full | — |
| `name` | Name | Name | Name | Naam | **half** | — |
| `street` | Street | Street | Straße | Straat | **half** | — |
| `street_number` | Street Number | Street Number | Hausnummer | Huisnummer | **half** | — |
| `zip_code` | Postal Code | Postal Code | PLZ | Postcode | **half** | — |
| `place` | City/Town | City/Town | Ort | Plaats | **half** | — |
| `location_tour32` | Search Location (Tour32 only) | Search Location (Tour User only) | Suchort (Tour User only) | Zoeklocatie (Tour User only) | **half** | — |
| `state` | State / Province | State / Province | Staat / Bundesland | Staat / Provincie | **half** | — |
| `country` | Country | Country | Land | Land | **half** | — |
| `phone_general` | Phone (General) | Phone (general) | Telefon (allgemein) | Telefoon (algemeen) | **half** | — |
| `phone_ah` | Phone (After Hours) | Phone (after hours) | Telefon (after hours) | Telefoon (na kantooruren) | **half** | — |
| `email_general` | Email (General) | E-mail (general) | Email (allgemein) | Email (algemeen) | **half** | — |
| `website` | Website | Web Site | Webseite | Homepage | **half** | — |
| `booking` | Booking via | Booking via | Buchung über | Boeking via | full | — |
| `id_tour_user` | Service Provider (Tour32 only) | Service Provider (Tour32 only) | Leistungsträger (Tour32 only) | Dienstverlener (Tour32 only) | **half** | — |
| `haupt_id_tour_user` | Main Service Provider (Tour32 only) | Main Service Provider (Tour32 only) | Haupt-Leistungsträger (Tour32 only) | Hoofddienstverlener (Tour32 only) | **half** | — |
| `booking_email` | Email Reservation | E-Mail Reservation | Email Reservierung | Email reservering | **half** | — |
| `internal_remarks_reservation` | Internal Reservation Infos / Remarks | Internal Reservation Infos / Remarks | Interne Buchungsinfos /-Hinweise | Interne boekingsinfo / -opmerkingen | **half** | — |
| `destination` | Continent | Continent | Kontinent | Continent | full | — |
| `countries` | Countries | Countries | Länder | Landen | full | — |
| `travel_categories` | Tour Types | Tour Type | Reiseart | Type Reis | full | — |
| `translations` | Description | Description | Beschreibung | Beschrijving | full | — |
| `dates_translations` | Travel Dates | Travel Dates | Reise-Termine | Reisdata | full | — |
| `tour_dates_web` | Departure Times | Departure Times | Abfahrtszeiten | Vertrektijden | full | — |
| `routes` | Daytrip Routes | Daytrip Routes | Tagesausflug-Routen | Dagtochten Routes | full | — |
| `supplier_product_code` | Daytrip Code(s) | Daytrip Code(s) | Tagesausflug-Code(s) | Dagtochten Code(s) | full | — |
| `price_subline` | Trip Subline (Duration + Days) | Trip Subline (Duration + Days) | Reise-Subline (Dauer + Tage) | Reis-subline (duur + dagen) | full | "Import only — hidden in UI." |
| `price_info_translations` | Price Information | Price Information | Preis-Infos | Prijsinformatie | full | — |
| `children_free_age` | Max. Child Age (Free) | Max. Child Age | Max. Kindesalter kostenfrei | Max. kinderleeftijd | full | "Maximales Alter (in Jahren) bis zu dem Kinder kostenlos mitreisen." |
| `children_free_number` | Number of Children Free of Charge | Number of Children Free of Charge | Anzahl Kinder kostenfrei | Aantal kinderen gratis | full | "Anzahl der Kinder die kostenlos mitreisen können." |
| `participants_min` | Minimum Number of Participants | Minimum Number of Participants | Mindestanzahl Teilnehmer | Minimum aantal deelnemers | full | — |
| `participants_max` | Maximum Number of Participants | Maximum Number of Participants | Maximalanzahl Teilnehmer | Maximaal aantal deelnemers | full | — |
| `week_min_before_start` | Min. Participants up to x Weeks before Departure | Min. Participants up to x Weeks before Departure | Min. Teilnehmer bis x Wochen vor Reiseantritt | Min. deelnemers tot x weken voor vertrek | full | — |
| `mobility_advice_text` | Text Mobility Advice | Text Mobility Advice | Text Mobilitätshinweis | Tekst mobiliteitsadvies | full | — |
| `room_occupancies` | Price Categories | — | Preiskategorien | Prijscategorieën | full | — |
| `prices` | Daytrip Prices | Daytrip Prices | Tagesausflug Preise | Dagtochten Prijzen | full | — |
| `sell_prices_status` | Sell Prices Status | — | Verkaufspreise Status | — | **half** | — |
| `sell_prices_updated_at` | Sell Prices Updated At | — | Verkaufspreise aktualisiert am | — | **half** | "Last successful sell price calculation" |
| `translations_1` | Prices | Prices | Preise | Prijzen | full | — |
| `daytrips_specials` | Specials | Specials | Angebote | Aanbiedingen | full | — |
| `surcharges_items` | Surcharges | Surcharges | Zuschläge | Toeslagen | full | sort → **1** (was 2) |
| `surcharges_translations` | Surcharge Calculator | Surcharge Calculator | Zuschlagsrechner | Toeslag Rekenmachine | full | sort → **2** (was 1) |
| `image_badge_translations` | Image Badge | Image Badge | Bild Hinweis | Afbeelding badge | full | — |
| `image_badge_start_date` | Start Date | Start Date | Startdatum | Startdatum | **half** | — |
| `image_badge_end_date` | End Date | End Date | Enddatum | Einddatum | **half** | — |
| `image_badge_status` | Status | Status | Status | Status | full | "Define as non-editable field. In case of editing in Directus the flag is being set automatically." |
| `media` | Media | Media | Medien | Media | full | — |

> **Bold width** = changed from the previous `full` default to `half` to match tours layout.  
> **Surcharges sort** = swapped: items list first (sort=1), calculator/translations second (sort=2).

### Revert Steps for Phase 12

To revert these beautification changes:

1. **Reset field translations** — for each field in the table above, set `translations` back to `[{"language": "en-US", "translation": "<original single label>"}]`
2. **Reset field notes** — set `note: null` for all fields that previously had no note; restore original note text where it existed
3. **Reset field widths** — set `width: "full"` for all fields that were changed to `"half"` (see **bold** entries above)
4. **Reset surcharges sort** — set `surcharges_items` sort=2, `surcharges_translations` sort=1
5. **Reset tab group translations** — set `translations: null` on all group alias fields (master_data_group, partner_filter_group, tour_operator_group, reservation_group, description_group, tour_dates_group, price_info_group, price_basics, locale_prices, offer_specials_group, surcharge_group, image_badge_group, media_group)

---

## Phase 13: Make daytrips Identical to tours — Missing Fields, Relations, and Settings

**Date:** 2026-06-18  
**Goal:** Close all remaining gaps between daytrips and tours by adding missing fields, creating `daytrips_categories_translations`, and fixing settings (conditions, options, templates, widths, readonly, display) across all sub-collections.

> **IMPORTANT:** All changes are additive to daytrips. NO tours changes were made. Flow IDs referencing tours-specific flows are set to `null` as placeholder — update when daytrips-specific flows are created in a later phase.

---

### A. New Fields Added

#### `daytrips_tour_dates_web` — added `departure_frequencies`
- type: alias, special: [m2m], interface: list-m2m
- options: `{"template": "{{trips_frequencies_id.name}}"}`
- sort: 6, width: full
- M2M junction: `daytrips_tour_dates_web_trips_frequencies` (already existed; relations already wired)
- Translations: en-US/en-GB "Frequency / Weekdays", de-DE "Frequenz / Wochentage", nl-NL "Frequentie / Weekdagen"

#### `daytrips_surcharges_translations` — added `save_stay_surcharge` + `rate_table`
- `save_stay_surcharge`: interface save-and-stay-trigger-flow, sort=24, flowId=null (placeholder)
- `rate_table`: interface directus-extension-interface-surcharge-prices, sort=25
  - options: surchargesCollection=daytrips_surcharges_items, translationsCollection=daytrips_surcharges_items_translations, hotelField=daytrip_id, junctionHotelField=daytrips_id, translationsSurchargeField=daytrips_surcharges_items_id, calculateFlowId=null
  - Translations: en-GB "Surcharge Prices", de-DE "Aufpreise", nl-NL "Toeslag Prijzen"

#### `daytrips_surcharges_items` — added `translations` alias
- type: alias, special: [translations], interface: translations
- options: languageField=code, languageDirectionField=code, userLanguage=true
- sort: 11, width: full
- Translations: en-GB "Surcharge Details", de-DE "Zuschlagsdetails", nl-NL "Toeslag Details"

#### `daytrips` — added `save_and_stay_price` + `item_preview_button`
- `save_and_stay_price`: interface save-and-stay-trigger-flow, group=price_basics, sort=9, flowId=null (placeholder)
- `item_preview_button`: interface item-preview-button, sort=10, group=null
  - Adapted groups config for daytrips field names: translations (was tours_description_translations), price_info_translations (was price_info)
  - Note: "Opens a read-only preview overlay of this daytrip's key fields per language."

#### `daytrips_translations_1` — added `daytrip_prices` alias
- type: alias, special: [alias, no-data], interface: tours-prices-table
- options: parentKeyField=daytrips_id, label="Save and Calculate", calculateSellPricesFlowId=null
- sort: 10, width: full
- Translations: en-US/en-GB "Daytrip Prices", de-DE "Tagesausflugpreise", nl-NL "Daguitstapprijzen"

#### `daytrips_prices` — added `daytrips_prices_translations` alias
- type: alias, special: [translations], interface: translations, sort: 8, width: full
- Translations: en-US/en-GB "Sell Prices", de-DE "Verkaufspreise", nl-NL "Verkoopprijzen"

---

### B. New Collection: `daytrips_categories_translations`

**Purpose:** Per-locale category name overrides for `daytrips_categories` (equivalent of `tours_categories_translations`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer PK | auto-increment, hidden |
| `daytrips_categories_id` | uuid | FK → daytrips_categories.id, hidden |
| `translations_id` | uuid | FK → translations.id, hidden |
| `category_original` | text | interface: input-multiline, sort=4; en-US "Original Name" |
| `category_text` | string | interface: input, sort=5; en-US "Free Text (alternative)" |

**Relations created:**
- `daytrips_categories_translations.daytrips_categories_id → daytrips_categories` (ON DELETE CASCADE, one_field=translations, junction_field=translations_id)
- `daytrips_categories_translations.translations_id → translations` (ON DELETE SET NULL)

**`translations` alias added to `daytrips_categories`:**
- type: alias, special: [translations], interface: translations, sort=13, width: full
- Translations: en-US/en-GB "Category Translations", de-DE "Kategorie-Übersetzungen", nl-NL "Categorie-vertalingen"

**DAYTRIPS-SPECIFIC — delete when reverting daytrips:**
- Collection `daytrips_categories_translations` and all its fields
- Field `translations` on `daytrips_categories`
- Relations: daytrips_categories_translations.daytrips_categories_id and daytrips_categories_translations.translations_id

---

### C. `daytrips_translations_1` Field Fixes

| Field | What Changed |
|-------|--------------|
| `buy_price_type` | width: full → **half**; choices: ["Per Unit","Per Person"] → ["Price Per Unit","Price Per Person"]; translations: +en-GB/de-DE/nl-NL (Buy Entity / Einkauf Einheit / Inkoopeenheid) |
| `sell_price_type` | width: full → **half**; same choice fix; translations: +en-GB/de-DE/nl-NL (Sell Entity / Verkauf Einheit / Verkoopeenheid) |
| `percentage_type` | width: full → **half**; choices: ["Net","Gross"] → ["Net (excl. Commission)","Gross (incl. Commission)"]; translations: +en-GB/de-DE/nl-NL (Buy Price Type / Einkaufspreis Art / Inkoopprijstype) |
| `provision_percentage` | width: full → **half**; options: added placeholder="5%", min=0, max=100; **conditions added**: net→readonly, gross→required; translations: +en-GB/de-DE/nl-NL |
| `margin_percentage` | width: full → **half**; options: added placeholder="20%", min=0, max=35; translations: +en-GB/de-DE/nl-NL |
| `exchange_rate` | width: full → **half**; options.template: "{{name}}" → "{{from_currency.code}}->{{to_currency.code}}@{{rate}}"; translations: +en-GB/de-DE/nl-NL |
| `from_price` | readonly: false → **true**; sort: 10 → **11**; options.template added (daytrips field names); translations: +en-GB/de-DE/nl-NL |

**Revert:** Set widths back to "full", restore original choice texts, remove conditions from provision_percentage, reset exchange_rate template to "{{name}}", set from_price readonly=false.

---

### D. `daytrips_surcharges_translations` Field Fixes

| Field | What Changed |
|-------|--------------|
| `surcharge_percentage_type` | width: full → **half**; sort: 4 → **20**; choices: ["Net","Gross"] → ["$t:net_excl_commission","$t:gross_incl_commission"]; translations: +en-GB/de-DE/nl-NL |
| `surcharge_provision_percentage` | width: full → **half**; sort: 5 → **21**; options: added placeholder="5%", min=0, max=100; **conditions added**: net→readonly, gross→required; translations: +en-GB/de-DE/nl-NL |
| `surcharge_margin_percentage` | width: full → **half**; sort: 6 → **22**; options: added placeholder="20%", min=0, max=35; translations: +en-GB/de-DE/nl-NL |
| `surcharge_exchange_rate` | width: full → **half**; sort: 7 → **23**; options.template: "{{name}}" → "{{from_currency.code}}->{{to_currency.code}}@{{rate}}"; translations: +nl-NL |

---

### E. `daytrips_surcharges_items` Field Fixes

| Field | What Changed |
|-------|--------------|
| `name` | width: full → **half**; translations: +en-GB/de-DE/nl-NL (Surcharge Name / Zuschlagsname / Toeslagnaam) |
| `buy_price` | width: full → **half**; options: added min=0; translations: +en-GB/de-DE/nl-NL |
| `status` | display: null → **labels**; display_options added (published=#2ECDA7, unpublished=#A2B5CD) |
| `px_source_id` | hidden: false → **true** |

---

### F. `daytrips_surcharges_items_translations` Field Fixes

| Field | What Changed |
|-------|--------------|
| `sell_price` | hidden: false → **true**; options: added placeholder="Sell Price"; translations: +en-GB/de-DE/nl-NL |
| `surcharge_type` | options: added template="{{designation}}", enableCreate=false; translations: +en-GB/de-DE/nl-NL |
| `surcharge_calc_type` | options: added template="{{designation}}", enableCreate=false; translations: +en-GB/de-DE/nl-NL (Calculation Method for IT Systems) |
| `surcharge_booking_name` | translations: changed to +en-GB/de-DE/nl-NL (Original / Booking Name) |

---

### G. `daytrips_translations` Sub-collection Fixes

| Field | What Changed |
|-------|--------------|
| `tour_title` | width: full → **half**; translations: +de-DE/en-GB/nl-NL (Tour-Titel / Tour Title / Tourtitel) |
| `subline` | width: full → **half**; translations: +de-DE/en-GB/nl-NL (Subline Tour / Tour Subline / Subline tour) |
| `px_source_id` | hidden: false → **true** |
| `mobility_advice_text` | **conditions added**: when value is _nnull (has a value), set readonly=true; translations: +en-GB/de-DE/nl-NL |

---

### H. `daytrips_prices` + `daytrips_prices_translations` Fixes

| Collection | Field | What Changed |
|------------|-------|--------------|
| `daytrips_prices` | `daytrips_category_id` | readonly: false → **true** |
| `daytrips_prices` | `price_date_id` | readonly: false → **true** |
| `daytrips_prices` | `daytrips_room_occupancy_id` | readonly: false → **true** |
| `daytrips_prices` | `buy_price` | width: full → **half**; translations: +en-GB/de-DE/nl-NL |
| `daytrips_prices_translations` | `sell_price` | width: full → **half**; options: added min=0; translations: +en-GB/de-DE/nl-NL |

---

### I. `daytrips_room_occupancies` Fixes

| Field | What Changed |
|-------|--------------|
| `id` | special: null → **["uuid"]** |
| `price_start` | schema.default_value: null → **false** |
| `value` | options: null → **{min: 1}** |

---

### J. Multilingual Labels Applied to Sub-collections

| Collection | Fields Updated |
|------------|---------------|
| `daytrips_price_info_translations` | services_included, services_not_included, deviating_cancelation_terms, children_policy, participants_text, additional_information, price_infos_supplementary |
| `daytrips_image_badge_translations` | image_badge_teaser, image_badge_details |
| `daytrips_dates_translations` | depatures_text |
| `daytrips_tour_dates_web` | available_from (From / In der Zeit von / Van), available_to (To / bis / tot) |
| `daytrips_routes` | tour_departure (+template {{translations.name}}), tour_arrival (+template {{translations.name}}) |

---

### Revert Steps for Phase 13

**A. New fields to delete:**
- `daytrips_tour_dates_web.departure_frequencies` (note: this only removes the alias — the junction table `daytrips_tour_dates_web_trips_frequencies` is not affected)
- `daytrips_surcharges_translations.save_stay_surcharge`
- `daytrips_surcharges_translations.rate_table`
- `daytrips_surcharges_items.translations`
- `daytrips.save_and_stay_price`
- `daytrips.item_preview_button`
- `daytrips_translations_1.daytrip_prices`
- `daytrips_prices.daytrips_prices_translations`

**B. New collection to delete:**
- Delete collection `daytrips_categories_translations` (drops table + fields + relations)
- Delete field `daytrips_categories.translations`

**C–J. Setting reversals:**
- `daytrips_translations_1`: set widths=full, restore original choice labels, remove conditions from provision_percentage, reset exchange_rate template to "{{name}}", set from_price readonly=false/sort=10/options=null
- `daytrips_surcharges_translations`: set widths=full, restore original choice labels, remove conditions from surcharge_provision_percentage, reset exchange_rate template to "{{name}}", restore original sorts (4/5/6/7)
- `daytrips_surcharges_items`: set name/buy_price width=full, remove buy_price options, set status display=null/display_options=null, set px_source_id hidden=false
- `daytrips_surcharges_items_translations`: set sell_price hidden=false/options=null, clear surcharge_type/surcharge_calc_type options, restore surcharge_booking_name translation to en-US "Booking Name"
- `daytrips_translations`: set tour_title/subline width=full, restore single en-US translations, set px_source_id hidden=false, remove mobility_advice_text conditions
- `daytrips_prices`: set daytrips_category_id/price_date_id/daytrips_room_occupancy_id readonly=false, set buy_price width=full
- `daytrips_prices_translations`: set sell_price width=full, remove options
- `daytrips_room_occupancies`: remove special from id, set price_start default_value=null, remove value options
- Sub-collection labels: reset to single en-US translations for all fields listed in section J
