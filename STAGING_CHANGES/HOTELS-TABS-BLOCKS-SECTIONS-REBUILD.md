# Staging — Hotels: Tabs/Blocks/Sections Rebuild (Brief v57)

**Target:** `directus-staging` MCP server.
**Applied:** 2026-07-09
**Ticket:** Hotels: Create Tabs, Blocks, Sections as in the Excel (BOTG_Brief_DEV_Set-up_Collections_26-07-02_v57.xlsx, `hotels SOLL` sheet).
**Type:** UI-layout restructuring on the `hotels` collection form, replicating the same change already applied on `directus-dev` (see `DIRECTUS_DEV_CHANGES/hotels-tabs-blocks-sections-rebuild.md`). **No content-field schema, type, interface, relation, or collection was touched** — only `meta.group` / `meta.sort` reassignment on existing content fields, plus creation/deletion of group-container fields. **Fully complete** — old groups deleted 2026-07-09 once delete permission was enabled by the client.

## Pre-check
Read staging `hotels` fields before starting: baseline was byte-for-byte the same 82-field / 20-old-group structure that dev had before its rebuild (`master_data_group`, `descriptons_group`, `price_infos_group`, `price_basic_group`, `prices_group`, `surcharges_group`, `offers_group`, `image_badge_group`, `media_group` and their nested sub-groups). Confirmed safe to replicate the identical migration.

## New group fields created (identical set/config to dev — see dev tracker for full field-ID table and per-field details)
9 tabs (`tab_master_data`, `tab_description`, `tab_price_infos`, `tab_calculator_inputs`, `tab_price_calculation`, `tab_surcharge_calculation`, `tab_specials`, `tab_image_badge`, `tab_media`), 4 blocks (`block_publication`, `block_contacts`, `block_price_basics`, `block_surcharges`), 16 sections (`section_id_status`, `section_botg_filter`, `section_address`, `section_reservation`, `section_classification`, `section_descriptions`, `section_price_infos`, `section_price_basics` [closed], `section_surcharge_basics` [closed], `section_units_margins`, `section_room_prices`, `section_surcharges_calc`, `section_specials`, `section_image_badge`, `section_media`). All `type: alias`, `special: ["alias","no-data","group"]`, with matching DE/EN/NL translations and `headerColor: "#008CC0"` on group-detail sections.

## Content fields moved (meta.group / meta.sort only)
Identical mapping to dev — see the table in `DIRECTUS_DEV_CHANGES/hotels-tabs-blocks-sections-rebuild.md` ("Content fields moved" section). Applied and verified on staging:
- Post-move `fields` read on `hotels` (110 total fields, 49 group containers — staging had a few extra pre-existing groups from other work) confirmed **zero dangling `meta.group` references**.
- Confirmed no content field still points to any of the 20 old group keys — only the old (now-empty) group containers still reference each other, exactly as expected pre-deletion.

## Old group fields deleted (all `type: alias`, group specials — no content field deleted)

First attempt returned `INVALID_PAYLOAD` / "Delete actions are disabled" on `directus-staging` (same delete-disabled posture the repo already documents for the `items` tool). Client enabled delete permission on 2026-07-09; deletion then completed successfully, children-before-parents:

`travel_id_group`, `partner_group`, `master_data`, `accordion-cob52j`, `reservation_group`, `accordion-tjw07v`, `surcharge_basics_group`, `accordion-obvxyf`, `main_group`, `partner_raw_group`, `reservation_main_group`, `master_data_group`, `descriptons_group`, `price_infos_group`, `price_basic_group`, `prices_group`, `surcharges_group`, `offers_group`, `image_badge_group`, `media_group`.

## Final verification
Post-deletion `fields` read on `hotels` (staging): **90 total fields, 29 group containers, zero dangling `meta.group` references, zero remnants of the 20 old group keys** — identical final shape to `directus-dev`.

**Note:** if delete permission for `directus_fields` was only temporarily enabled for this task, it can now be reverted — this change is complete and no further deletes are needed on this collection.
