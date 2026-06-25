# BOTG ContentHub — Cruises: Manual Schema ToDo

**Version 1.0 · 23-06-26 · EN**

Alternative to applying the snapshot. This is the hands-on checklist for reaching the target model by **manual edits in Directus** (Data Model UI / SQL), starting from the current JSON schema. Schema only — **no data migration** (no cruise data imported yet).

Authoritative target spec: `cruises_schema_26-06-23.yaml` + `cruises_erd_26-06-23.(png|svg)`. Where this list and the snapshot disagree, the snapshot wins.

**Conventions to apply throughout:** integer auto-increment PK on every product-owned collection; FK type = target PK type (uuid only onto uuid-PK targets: `translations`, `partner`, `mobility_advice_text`, `directus_users`, `directus_files`); every user-facing field carries DE/EN/NL labels; layout hierarchy `ui_tabs > tab_ > [block_] > section_ > fields`.

---

## A — Drop legacy (22 collections)

Drop child/junction/translation collections first, the parent `cruises` last.

**Junctions & translations**
- [ ] `cruises_price_dates_departure_frequencies`
- [ ] `cruises_cruises_occupancies` *(double-prefix artefact)*
- [ ] `cruises_countries`, `cruises_destinations`, `cruises_directus_files`, `cruises_partner`, `cruises_cruise_types`
- [ ] `cruises_translations`, `cruises_translations_1`, `cruises_translations_2`, `cruises_translations_4`
- [ ] `travel_program_translations` *(confirm it is cruises-only first)*
- [ ] `cruises_types_translations`, `cruise_prices_translations`

**Tables & lookups**
- [ ] `cruise_prices`
- [ ] `cruises_price_dates`, `cruises_occupancies`, `cruises_cabins_categories`
- [ ] `cruise_types`, `cruises_types` *(both twins go; the surviving lookup is rebuilt in C3)*

**Product & folder**
- [ ] `cruises` *(drop last — mind FK cascades)*
- [ ] `Cruises_Metadata` *(nav folder)*

---

## B — Leave untouched (verify, do not edit)

- [ ] Shared/external: `countries`, `destinations`, `partner`, `seasons`, `directus_users`, `directus_files`, `translations`, `departure_frequencies`, `mobility_advice_text`.
- [ ] Presets: `erp_cruise_destination_exceptions` (+ `_translations`), `mp_cruise_destination_exceptions` (+ `_translations`).

---

## C — Recreate the target model

### C1 — Product `cruises` (integer PK)
- [ ] Create `cruises`, **integer auto-increment** PK, icon `directions_boat`, archive on `status`, sort on `sort`.
- [ ] System / above-tabs fields (hidden): `status`, `user_created`, `date_created`, `sell_prices_status`, `sell_prices_updated_at`; presentation aliases `header`, `item_preview_button`.
- [ ] Tab container `ui_tabs`, then tabs: `tab_master_data`, `tab_description`, `tab_travel_programme`, `tab_price_infos`, `tab_calculator_inputs`, `tab_price_calculation`, `tab_specials`, `tab_image_badge`, `tab_media`. *(No `tab_surcharge_calculation`.)*
- [ ] Blocks: `block_publication`, `block_contacts` (under master data), `block_price_basics` (under calculator inputs).
- [ ] Sections per ERD: `section_id_status`, `section_botg_filter` (under publication); `section_reservation` (under contacts); `section_classification`, `section_descriptions`; `section_travel_programme`; `section_price_infos`, `section_attributes`; `section_price_basics`; `section_units_margins`, `section_cabin_prices`; `section_specials`; `section_image_badge`; `section_media`.
- [ ] Scalar fields onto `cruises` (with labels): `object_id`, `object_info_primarix` (ro), `season` (M2O `seasons`), `status_primarix`, `date_updated`/`user_updated` (hidden); `partner_visibility`, `partner_selected` (M2M `partner`); `travel_id_karawane`, `id_tour32`; `real_url`; `mobility_advice_text` (M2O); `participants_min`, `participants_max`, `week_min_before_start`; `special_valid_from`, `special_valid_to`; `image_badge_start_date`, `image_badge_end_date`, `image_badge_status` (ro); media block (see C4).

### C2 — Translation collections (central pattern)
Each: integer PK, `cruises_id` (integer FK → `cruises`, CASCADE, the `one_field` is the matching alias on `cruises`), `translations_id` (uuid FK → `translations`, CASCADE), all content fields full-width + labelled.
- [ ] `cruises_descriptions_translations`: `headline`, `subline`, `teaser`, `ship` (md), `at_a_glance` (md)
- [ ] `cruises_programme_translations`: `travel_programme` (JSON repeater; item fields `day_destinations`, `day_description`, `day_accommodation_note`)
- [ ] `cruises_price_infos_translations`: `name_cruise`, `departure_arrival`, `bord_languages` (json), `bord_languages_additions`, `surcharges`, `services_included` (md), `services_not_included`, `onboard_gratuities` (json), `onboard_gratuities_additions`, `important_information` (md), `good_to_know` (md), `occupancy_single`, `participants_legacy`, `deviating_cancellation_terms_selector` (json), `deviating_cancellation_terms_text`
- [ ] `cruises_specials_translations`: `special_description`
- [ ] `cruises_image_badge_translations`: `image_badge_teaser`, `image_badge_details`
- [ ] `cruises_price_calculation_translations`: see C3

### C3 — Calculator (Hotel logic)
**Lookups** (folder `cruises_meta`, integer PK, each with a `_translations` companion):
- [ ] `cruise_cabin_categories`, `cruise_occupancies`, `cruises_types`

**Input repeaters** (integer PK, `cruises_id` FK with the matching o2m alias on `cruises` in `section_price_basics`):
- [ ] `cruises_cabin_categories` — `cabin_category` (M2O → `cruise_cabin_categories`), `cabin_category_booking_code`, `cabin_category_tour32_name`, `cabin_category_from` (bool); + `cruises_cabin_categories_translations` (`cabin_category_additions`, `cabin_category_description`)
- [ ] `cruises_price_dates` — `date_departure`, `date_arrival`, `departure_frequencies` (M2M → `departure_frequencies`)
- [ ] `cruises_occupancies` — `occupancy` (M2O → `cruise_occupancies`), `occupancy_from` (bool)

**Matrix & calc translations:**
- [ ] `cruises_prices` — `cabin_category_id` (M2O → `cruises_cabin_categories`), `price_date_id` (M2O → `cruises_price_dates`), `occupancy_id` (M2O → `cruises_occupancies`), `buy_price` (decimal); `prices` o2m alias on `cruises` in `section_cabin_prices`
- [ ] `cruises_price_calculation_translations` — `buy_price_type`, `sell_price_type`, `percentage_type`, `provision_percentage` (float), `margin_percentage` (float), `exchange_rate` (json), `from_price` (M2O → `cruises_price_dates`), `cabin_prices` (prices-table alias), `save_stay_cruise` (alias)

### C4 — M2M junctions (both FKs hidden, CASCADE)
- [ ] `cruises_countries` (alias `countries` in `section_classification`)
- [ ] `cruises_destinations` (alias `destinations`)
- [ ] `cruises_cruise_types` (alias `cruise_types`; target `cruises_types` → FK `cruises_types_id`)
- [ ] `cruises_partner` (alias `partner_selected` in `section_botg_filter`)
- [ ] `cruises_directus_files` (alias `media` in `section_media`) + scalar media fields: `media_object_id_primarix`, `media_filename_fotoweb` (hidden), `media_sort`, `is_map` (hidden, bool), `use_tour32` (bool), `media_copyright`

### C5 — Labels
- [ ] Every user-facing field (incl. `tab_/block_/section_` groups) has DE/EN/NL labels. System/hidden fields (`id`, `sort`, audit, `*_id` FKs, `status`, `object_id`, `*_primarix`, `*_tour32`, `translations_id`) need none.

---

## D — Verify
- [ ] All product-owned PKs are integer auto-increment; no uuid PK remains on `cruises`.
- [ ] Nav: `cruises` top-level; the three lookups grouped under `cruises_meta`.
- [ ] Open a record: tabs / blocks / sections render; `header` and `item_preview_button` present; calculator (prices-table) and all translation forms load; M2M pickers resolve.
- [ ] No orphaned relations; no `cruises_cruises_*` double-prefix collection; no numbered translation collection.
