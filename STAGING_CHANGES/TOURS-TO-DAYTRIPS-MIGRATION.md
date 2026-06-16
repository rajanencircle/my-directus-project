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
