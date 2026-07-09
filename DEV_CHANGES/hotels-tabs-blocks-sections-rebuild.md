# Dev — Hotels: Tabs/Blocks/Sections Rebuild (Brief v57)

**Target:** `directus-dev` MCP server **only**.
**Applied:** 2026-07-08
**Ticket:** Hotels: Create Tabs, Blocks, Sections as in the Excel (BOTG_Brief_DEV_Set-up_Collections_26-07-02_v57.xlsx, `hotels SOLL` sheet).
**Type:** Pure UI-layout restructuring on the `hotels` collection form. **No content-field schema, type, interface, relation, or collection was touched** — only `meta.group` / `meta.sort` reassignment on existing content fields, plus creation of new group-container fields and deletion of the old ones. Revert = recreate the 20 deleted group fields below with their listed config, then move each content field's `group`/`sort` back to its old value.

## Goal
Replace the old ad-hoc nested groups under `hotel_tabs` with the 3-level Tab → Block → Section hierarchy defined in the brief. Field renames, collection splits/renames, and junction-collection internal layout noted with Δ in the brief were explicitly **out of scope** and are not part of this change (see plan gap analysis for details).

## New group fields created (all `type: alias`, `special: ["alias","no-data","group"]`)

| Field key | Interface | Parent group | Field ID | Label (EN) |
|---|---|---|---|---|
| tab_master_data | group-raw | hotel_tabs | 7775 | Master Data |
| tab_description | group-raw | hotel_tabs | 7776 | Description |
| tab_price_infos | group-raw | hotel_tabs | 7777 | Price Info |
| tab_calculator_inputs | group-raw | hotel_tabs | 7778 | Calculation Basics |
| tab_price_calculation | group-raw | hotel_tabs | 7779 | Prices |
| tab_surcharge_calculation | group-raw | hotel_tabs | 7780 | Surcharges |
| tab_specials | group-raw | hotel_tabs | 7781 | Specials |
| tab_image_badge | group-raw | hotel_tabs | 7782 | Image Badge |
| tab_media | group-raw | hotel_tabs | 7783 | Media |
| block_publication | group-raw | tab_master_data | 7784 | (unlabeled) |
| block_contacts | group-raw | tab_master_data | 7785 | (unlabeled) |
| block_price_basics | group-raw | tab_calculator_inputs | 7786 | (unlabeled) |
| block_surcharges | group-raw | tab_calculator_inputs | 7787 | (unlabeled) |
| section_id_status | group-detail (open) | block_publication | 7788 | Status & Publication |
| section_botg_filter | group-detail (open) | block_publication | 7789 | BOTG Company Assignment |
| section_address | group-detail (open) | block_contacts | 7790 | Hotel Address |
| section_reservation | group-detail (open) | block_contacts | 7791 | Reservation |
| section_classification | group-detail (open) | tab_description | 7792 | Classification |
| section_descriptions | group-detail (open) | tab_description | 7793 | Hotel Description |
| section_price_infos | group-detail (open) | tab_price_infos | 7794 | Price-relevant Information |
| section_price_basics | group-detail (**closed**) | block_price_basics | 7795 | Price Basics |
| section_surcharge_basics | group-detail (**closed**) | block_surcharges | 7796 | Surcharge Basics |
| section_units_margins | group-detail (open) | tab_price_calculation | 7797 | Units & Margins |
| section_room_prices | group-detail (open) | tab_price_calculation | 7798 | Room Prices |
| section_surcharges_calc | group-detail (open) | tab_surcharge_calculation | 7799 | Surcharges |
| section_specials | group-detail (open) | tab_specials | 7800 | Offers / Specials |
| section_image_badge | group-detail (open) | tab_image_badge | 7801 | Image Badge |
| section_media | group-detail (open) | tab_media | 7802 | Image Assignment (Primarix) |

All group-detail sections use `options.headerColor: "#008CC0"` (matching the prior scheme); `section_price_basics` and `section_surcharge_basics` additionally have `options.start: "closed"`.

Note: `section_surcharges_calc` and `section_surcharge_basics` use distinct field keys (the brief reuses the label "Surcharges"/"Surcharge Basics" as both a `hotels`-level section and a section inside other collections' layouts) — Directus field keys must be unique per collection, so keys were disambiguated while keeping the brief's labels intact.

## Content fields moved (meta.group / meta.sort only — no other property changed)

| Field | Old group | New group |
|---|---|---|
| object_id, object_info, season, status_primarix, internal_remarks, date_updated, user_updated | travel_id_group | section_id_status |
| partner_type, partner | partner_group | section_botg_filter |
| hotel_group, street, street_number, zip_code, place, location_tour32, state, region, country, phone_general, phone_ah, email_general, website | master_data | section_address |
| name | travel_id_group | section_address |
| booking_partner, booking, id_tour_user, haupt_id_tour_user, booking_email, booking_info | reservation_group | section_reservation |
| accommodation_type, hotel_classification, hotel_activities | descriptons_group | section_classification |
| hotel_descriptions_translations | descriptons_group | section_descriptions |
| price_info_translations | price_infos_group | section_price_infos |
| room_categories, divider_1, price_dates, divider_2, room_occupancies, save_and_stay_price | accordion-tjw07v | section_price_basics |
| hotels_surcharges, divider_3, save_and_stay_surcharge | surcharge_basics_group | section_surcharge_basics |
| hotel_prices | prices_group | section_units_margins |
| room_prices | *(top-level, group=null)* | section_room_prices |
| surcharges | surcharges_group | section_surcharges_calc |
| hotels_specials | offers_group | section_specials |
| image_badge_translations, image_badge_start_date, image_badge_end_date, image_badge_status | image_badge_group | section_image_badge |
| media | media_group | section_media |

Fields left untouched (no group / top-level system fields, out of scope): `id`, `sort`, `user_created`, `date_created`, `header`, `hotel_tabs`, `sell_prices_status`, `sell_prices_updated_at`, `px_source_id`, `item_preview_button`.

## Old group fields deleted (all `type: alias`, group specials — no content field deleted)

Deleted children-before-parents:
`travel_id_group`, `partner_group`, `master_data`, `accordion-cob52j`, `reservation_group`, `accordion-tjw07v`, `surcharge_basics_group`, `accordion-obvxyf`, `main_group`, `partner_raw_group`, `reservation_main_group`, `master_data_group`, `descriptons_group`, `price_infos_group`, `price_basic_group`, `prices_group`, `surcharges_group`, `offers_group`, `image_badge_group`, `media_group`.

`partner_raw_group` / `accordion-cob52j` were an orphaned, empty duplicate of the Partner Filter section (no fields ever pointed to them) — deleted with no field re-pointing needed.

## Verification performed
- Post-migration `fields` read on `hotels` (90 total fields, 29 group containers) confirmed **zero dangling `meta.group` references** (every content field's group exists) and **zero remnants** of the 20 old group field keys.
- No `schema`, `type`, `interface`, `options`, `relation`, or translation content was altered on any content field — diffed against pre-change field dump.

## Not done (explicitly out of scope — see plan gap analysis)
- No field renames (e.g. `object_info`→`object_info_primarix`, `name`→`name_hotel`, etc.)
- No collection renames/splits (`room_categories`→`hotels_room_categories`, `hotels_translations_1`→dedicated `hotels_price_calculation`, etc.)
- No new fields created for SOLL items missing from the current schema (`state_short`, `fax_general`, `res_phone`, contact_* fields, `media_object_id_primarix` and other per-image metadata, etc.)
- Not replicated to `directus-staging` — pending separate request.
