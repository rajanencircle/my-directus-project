# Staging — Item Preview Button for Cruises & Tours

**Target:** `directus-staging` MCP server **only**.
**Applied:** 2026-06-11
**Type:** Purely additive — **2 new alias fields created, nothing else changed.** Revert = delete the 2 fields.

## Goal
Add the same "item preview" button that `hotels` has to the `cruises` and `tours` collections. The button opens a read-only, per-language overlay of the item's key fields (powered by the custom interface extension).

## Extension dependency
- Interface: **`item-preview-button`**, provided by the repo extension `directus/extensions/directus-extension-item-preview-button`.
- The field configs were sourced **verbatim** from the old-local dump at `directus/local-dump/directus_dump.sql` (table `directus_fields`, rows `cruises|item_preview_button` and `tours|item_preview_button`), where this had already been implemented.
- ⚠️ **The interface only renders if the `directus-extension-item-preview-button` extension is deployed/loaded on the staging instance.** The field + config are now in staging's data model regardless; if the extension isn't present on staging yet, the field will fall back to a raw/empty display until it is deployed. (No data is affected either way.)

## What was created (both are `type: alias`, `special: ["alias","no-data"]`, `interface: "item-preview-button"`, `width: full`, `group: null`, hidden/readonly = false)

| Collection | Field | sort | note |
|-----------|-------|------|------|
| `cruises` | `item_preview_button` | 12 | "Opens a read-only preview overlay of this cruise's key fields per language." |
| `tours` | `item_preview_button` | 60 | "Opens a read-only preview overlay of this tour's key fields per language." |

Shared `options`: `translation_collection: "translations"`, `icon: "visibility"`, `title: "name"`, `defaultLang: "de-DE"`, `langField: "code"`, `buttonLabel: "$t:preview"`, plus a `groups` array (below). Field value-path types: `direct` (scalar), `dropdown` (select value), `relation` (m2o/m2m display path), `translated` (per-language path; `labelType:"leaf"` shows just the leaf field name as the label).

### Cruises — preview groups
- **general** (open): name, object_info_primarix, object_id, status_primarix (dropdown), travel_id_karawane, id_tour32, season → `season.season` (relation)
- **partner_group**: partner_type (dropdown), partner → `partner.partner_id.label`
- **master_data**: countries → `countries.countries_id.translations.name`, destinations → `destinations.destinations_id.translations.name`, cruise_types → `cruise_types.cruise_types_id.label`
- **descriptions** (`translations` → cruises_translations): headline, subline, teaser, ship, at_a_glance
- **price_infos** (`price_infos_translations` → cruises_translations_4): services_included, services_not_included, bord_languages, important_information, good_to_know, deviating_cancelation_terms, mobility_advice_text
- **image_badge** (`image_badge_translations` → cruises_translations_2): image_badge_teaser, image_badge_details, + image_badge_start_date, image_badge_end_date, image_badge_status (direct/dropdown)

### Tours — preview groups
- **general** (open): name, object_id, object_info_primarix, status_primarix (dropdown), season → `season.season`, internal_remarks
- **partner_group**: partner_type (dropdown), partner → `partner.partner_id.label`
- **tour_operator**: operator (dropdown), operator_fk → `operator_fk.booking_partner`
- **tour_details**: street, street_number, zip_code, place/location_tour32/state/country → `*.translations.name`, phone_general, phone_ah, email_general, website
- **reservation_group**: booking_partner (dropdown), id_tour_user, haupt_id_tour_user, booking_email, internal_remarks_reservation
- **description_group**: destination/countries → translated names, travel_categories → `travel_categories.travel_categories_id.name`, + `tours_description_translations` → tours_translations: tour_title, subline, teaser, tour_programm, recommendations
- **price_info_group**: participants_min, participants_max, children_free_age, children_free_number, week_min_before_start, price_subline, supplier_product_code, + `price_info` → tours_price_info_translations: services_included, services_not_included, children_policy, additional_information
- **image_badge** (`image_badge_translations` → tours_image_badge_translations): image_badge_teaser, image_badge_details, + image_badge_start_date, image_badge_end_date, image_badge_status

All translation-alias paths were confirmed against staging relations:
`cruises.translations`→cruises_translations, `cruises.image_badge_translations`→cruises_translations_2, `cruises.price_infos_translations`→cruises_translations_4; `tours.tours_description_translations`→tours_translations, `tours.image_badge_translations`→tours_image_badge_translations, `tours.price_info`→tours_price_info_translations.

## Verification
- Both fields created successfully via the `directus-staging` MCP `fields` tool; create responses returned the full stored `meta`/`options` matching the dump.
- The configs are byte-equivalent to the hotels pattern (same interface, option keys, value-path conventions), retargeted to each collection's real fields/relations/translation collections.
- Not yet visually smoke-tested in the staging admin UI (depends on the extension being loaded on staging — see dependency note).

## REVERT PROCEDURE (staging only)
Delete the two alias fields via the `directus-staging` MCP (`fields` action `delete`):
1. collection `cruises`, field `item_preview_button`
2. collection `tours`, field `item_preview_button`

These are `alias`/`no-data` fields (no DB column, no stored item data), so deletion is clean and affects nothing else. Hotels' existing `item_preview_button` was **not** touched.
