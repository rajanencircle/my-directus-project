# Local Change: item-preview-button 403 fix + resilient fetch + tours/excursions config

**Date:** 2026-08-06
**Author:** Claude (via `directus-local` MCP `fields` tool + direct edits to
`directus/extensions/directus-extension-item-preview-button`)
**Environment:** `directus-local` ONLY. Not applied to dev/staging/main.
**Collections:** `hotels`, `tours`, `excursions` (field `item_preview_button` on each)
**Extension:** `directus/extensions/directus-extension-item-preview-button`

---

## What changed

### 1. Root cause fix — hotels 403

`hotels.item_preview_button` → `meta.options.groups[reservation_group].fields[].value`:

```diff
- "value": "booking.booking_partner"
+ "value": "booking.name_agency"
```

`hotels.booking` is an M2O to the `agencies` collection. `agencies` has no
`booking_partner` field — the field that actually holds the booking
partner/tour operator name is `agencies.name_agency` (its own field note:
*"Buchungspartner oder Tour Operator"*). The bad path made the whole
`/items/hotels/:id` REST call fail with a 403 (`FORBIDDEN` / field-does-not-exist),
which blanked the entire preview modal — not just that one field.

Nothing else in hotels' `item_preview_button` config was touched.

### 2. Extension code — resilient fetch (all products)

File: `src/components/PreviewOverlay.vue` (+ new `src/composables/useRelationMap.ts`,
+ changes to `src/composables/useDisplayTree.ts`)

Previously a single bad/forbidden field in the configured `groups` JSON made
`fetchData()` throw, and the whole modal fell back to a generic error state
— nothing rendered even though every other field was valid.

Now:
- `fetchData()` fetches `/relations` once (cached module-wide) to build a
  `collection.field -> related_collection` lookup.
- On a 403/"does not exist" error, the offending `field`/`collection` is
  parsed out of the Directus error message, matched back to the configured
  path that produced it (by walking the path through the relation map), and
  **only that path** is dropped from the request. The request is retried
  with the reduced field list — looping until it succeeds or no further bad
  field can be identified (safety valve against infinite loops).
- Fields dropped this way render in the modal as **"⚠ No access"** instead
  of silently going blank or blanking the entire modal.
- The "No fields configured" empty-state message (shown when a product's
  `groups` array is empty, as tours/excursions were before this change) is
  unchanged — that's a separate, correct state from a fetch failure.

### 3. Extension code — translated title support (all products)

`itemTitle` previously did a direct property read (`rawItem.value[tf]`),
which only works if the title field is a plain top-level column (true for
hotels' `name`, false for tours/excursions which have no direct name field —
their display name lives in a `descriptions_translations` junction row).

`extractApiFields` and a new `resolveTitle()` helper now resolve `config.title`
the same way any other `translated`/dot-path field is resolved (including
fetching the `translations_id` helper field needed for language matching).
This is what makes `descriptions_translations.name_tour` /
`descriptions_translations.name_excursion` usable as the `title` config value
below.

### 4. tours & excursions — built out `groups` config

Both were previously either `options: null` (tours) or `options.groups: []`
(excursions) — i.e. "No fields configured". Built a groups structure mirroring
hotels' structure, using each collection's real fields (verified via `schema`/
`relations` MCP calls, not guessed):

| Hotels group | Tours equivalent | Excursions equivalent |
|---|---|---|
| general | general | general |
| partner_group | operator_group | operator_group |
| master_data | master_data | master_data |
| reservation_group | reservation_group | reservation_group |
| hotel_descriptions | tour_descriptions | excursion_descriptions |
| image_stamp | image_stamp | image_stamp |
| Price | Price | Price |

Key differences from hotels, deliberately not force-fit:
- No `name` field on tours/excursions — title = `descriptions_translations.name_tour`
  / `name_excursion` (translated), also surfaced in the `general` group.
- No `region` relation on tours/excursions (hotels has one) — omitted, not stubbed.
- `booking_partner` is already a direct M2O to `agencies` on tours/excursions
  (unlike hotels, which has both a legacy text field `booking_partner` and a
  separate `booking` M2O) — mapped as `booking_partner.name_agency`.
- excursions' price-info junction is `price_infos_translations` (plural
  "infos") vs tours' `price_info_translations` — used the correct name per
  collection, verified via the `schema` MCP tool.
- Dropped a planned `mobility_advice_text` field from excursions' `Price`
  group: `excursions.mobility_advice_text` is an M2O to the global
  `mobility_advice_text` collection, which has no `label` field (only a
  `hotel_translations` alias) — resolving the actual text would need a
  nested translation lookup that wasn't verified, so it was left out rather
  than guessed. (Tours does have a resolved copy at
  `price_info_translations.mobility_advice_text` — kept, works.)

All three configs were verified end-to-end via `directus-local` MCP
`items.read` calls with the full field list each interface now requests —
no permission/unknown-field errors on any of the three collections.

---

## How to revert

**hotels**: change `booking.name_agency` back to `booking.booking_partner`
in `hotels.item_preview_button.meta.options` via the `fields` MCP tool (or
Directus admin → Settings → Data Model → hotels → item_preview_button).

**tours / excursions**: set `meta.options` back to `null` (tours) / set
`options.groups` back to `[]` (excursions) via the same route — see git
history of this file for the exact prior payloads (also logged in the tool
transcript for this session).

**Extension code**: `git diff` / `git checkout --` on
`directus/extensions/directus-extension-item-preview-button/src/` to revert
to the pre-fix behavior (single-shot fetch, blank-on-error, direct-field-only
title). Rebuild (`npm run build` in that extension's folder) and restart the
`directus` container afterward either way.

---

## Files touched (extension code)

- `src/composables/useRelationMap.ts` — new; cached `/relations` lookup + leaf-path resolver.
- `src/composables/useDisplayTree.ts` — `extractApiFields` now resolves the title
  path like a translated field; new `resolveTitle()`; `buildFieldNodes` accepts
  a `noAccessPaths` set and renders "⚠ No access" for dropped fields.
- `src/components/PreviewOverlay.vue` — retry-loop `fetchData()`, `noAccessPaths`
  state, `itemTitle` now uses `resolveTitle()`.

Extension was rebuilt (`npm run build`) and the local `directus` container
restarted to pick up the new bundle (extensions are volume-mounted, no
rebuild-into-image needed).

---

## 2026-08-06 (same day, follow-up) — groups restructured to match brief + live data model

**Ask:** align the preview `groups` JSON with `BOTG_Brief_DEV_Set-up_Collections_26-07-02_v57.xlsx`
(sheets `hotels SOLL`, `#3 excursions (aka daytrips)`, `#4 tours (aka roundtrips)`)
and with the actual Tab → Block → Section nesting each collection has live in
Directus (`meta.group` chain on the `tab_*`/`block_*`/`section_*` alias fields).

**What changed:** the ad-hoc group ids used in the first pass above
(`general`, `partner_group`, `hotel_descriptions`, `Price`, …) were replaced
with the **real `section_*` field names** from each collection's live data
model, in live Tab/Section order, e.g. hotels: `section_id_status` →
`section_botg_filter` → `section_address` → `section_reservation` →
`section_classification` → `section_descriptions` → `section_price_infos` →
`section_specials` → `section_image_badge`.

Using the real section id as the group `id` means `useFieldLabels`'
existing auto-detection (`rootLabels.get(g.id)`) now pulls each group's
DE/EN/NL header straight from that section field's own `meta.translations`
live in Directus — no hardcoded `label` needed on almost any group anymore.

Read (not modified) to build this:
- `BOTG_Brief_DEV_Set-up_Collections_26-07-02_v57.xlsx` (repo root) — brief structure/order.
- `directus_fields` (via `fields`/`schema` MCP tools) for `hotels`, `tours`,
  `excursions` and every lookup/junction collection referenced below — live
  `meta.group`/`sort`/`translations` tree, confirmed close to (but not
  identical to) the brief; live model was treated as source of truth where
  the two disagreed, per the task ("matching the same in the way it is
  placed in the data model").

### Scope decision (all three collections, consistent)

Included: every Tab/Section that holds plain scalar fields, translated text,
or simple relation labels — `master_data` (all its sections),  `description`
(classification + descriptions), `price_infos`/`price_info`, `specials`,
`image_badge`, `media` (tours/excursions only — hotels' media tab has no
plain fields, only the file-upload alias itself).

Excluded (same as the original pass, now on firmer footing): `calculator_inputs`,
`price_calculation`, `surcharge_calculation` — these are relational
price-matrix builders (category × period × occupancy grids, `room_prices`/
`prices`-table extensions) with no flat field path to preview meaningfully.
`tab_tour_dates`/`tab_tour_programme` (tours) — only their simple translated
text (`departures_text`, `tour_programme_disclaimer`) was pulled in; the
O2M date-range/route arrays and the day-by-day JSON repeater's array wrapper
were left out of scope (only `programme_translations.tour_programme` itself,
as a `repeater` field, was included — its `day_destinations`/`day_description`/
`day_accommodation_note` sub-fields render automatically).

### New / previously-missing sections now covered

- **`section_specials`** (all three) — was entirely missing from the first
  pass. `specials_translations.specials` is a JSON repeater
  (`name`/`special_description`/`status`/`publish_start`/`publish_end`),
  same shape across hotels/tours/excursions.
- **`section_classification`** (hotels) — previously merged into
  `hotel_descriptions`; now its own group, matching the live model exactly.
- **`section_media`** (tours, excursions) — `media_object_id_primarix`,
  `media_filename_fotoweb`, `media_sort`, `is_map`, `use_tour32`,
  `media_copyright`. Not added for hotels — hotels' `section_media` only has
  the file-upload alias itself, no plain fields.
- **`season`** (all three) — was missing from the first pass entirely.
  `seasons` collection's label field is `season` (string), not `label` —
  mapped as `season.season`.
- **tours: `section_flight_info`, `section_tour_programme`** — new.
- **excursions: `mobility_advice_text`** — first pass dropped this (no
  `label` field on the target collection, flagged as unresolved). Now
  resolved: it's `mobility_advice_text.hotel_translations.hotel_mobility_advice_text`
  (the M2O's own translations junction — collection name `mobility_advice_text_translations`,
  alias field on the parent is called `hotel_translations`). Verified via
  `items.read` — returns real DE/EN/NL text, no error.

### Lookup-collection label fields used (verified via `schema` MCP tool, not guessed)

`accommodation_types.label`, `activities.label`, `hotel_classifications.label`,
`hotel_group.label`, `flight_options.name`, `airlines.name`, `airports.name`,
`partner.label` (via junction `partner_id`), `travel_categories.translations.name`,
`destinations.translations.name`, `agencies.name_agency` (already fixed above).

### Verification

Same method as the first pass: flattened every group's field paths per
collection (56 for hotels, 76 for tours, 65 for excursions) and ran them
through `items.read` against a real record in each collection via the
`directus-local` MCP `items` tool. All three returned clean — no
permission/unknown-field errors.

### How to revert this follow-up

The `meta.options` payload from the *first* pass (documented above, "How to
revert" section originally referred to the pre-existing-bug state, not this
restructure) is preserved in the tool-call transcript for this session. To
roll back to the flatter ad-hoc grouping instead of the current
brief-aligned one, restore that earlier payload via the `fields` MCP tool.
No extension code changed in this follow-up — only the three `item_preview_button.meta.options.groups` payloads.

---

## 2026-08-06 (same day, second follow-up) — added item_preview_button to cruises + vehicles

**Ask:** apply the same brief/data-model-aligned treatment to "the main 5"
product collections. Checked all product collections first — only
`hotels`, `tours`, `excursions` had an `item_preview_button` field at all;
`cruises` and `vehicles` (the collection backing both campers and rental
cars, split via `rental_type`) had none. Confirmed with the user before
proceeding, since adding the field is a **schema change** (new field), not
just a JSON options edit like the rest of this tracker.

**What changed:**
- **New field** `item_preview_button` created on `cruises` (id 7976, sort 12)
  and `vehicles` (id 7977, sort 10) — same shape as the existing field on
  tours/excursions: `type: alias`, `schema: null`,
  `meta.special: ["alias","no-data"]`, `meta.interface: "item-preview-button"`,
  `width: "full"`, `group: null`.
- Both ship with a full `groups` config built the same way as the
  hotels/tours/excursions restructure above: group ids are the collections'
  real live `section_*` field names (so labels auto-resolve from
  `meta.translations`), in live Tab/Section order, verified via `schema`/
  `relations` MCP calls — not guessed.

### cruises — groups (Tab order: master_data → description → travel_programme → price_infos → specials → image_badge → media)

`section_id_status`, `section_botg_filter`, `section_reservation`,
`section_classification`, `section_descriptions`, `section_travel_programme`,
`section_price_infos`, `section_attributes`, `section_specials`,
`section_image_badge`, `section_media`. Title = `descriptions_translations.headline`
(cruises has no direct `name`-style field — confirmed via `cruises_descriptions_translations`
schema that `headline` is the display title, `subline`/`teaser`/`ship`/`at_a_glance`
are secondary). Excluded (same rule as before): `tab_calculator_inputs` and
`tab_price_calculation` are dev-note-only / relational price matrices with no
flat field to preview.

### vehicles — groups (Tab order: master_data → description → image_badge → media)

`section_publication`, `section_botg_companies`, `section_type_company`,
`section_attributes`, `section_descriptions`, `section_image_badge`,
`section_media`. Title = `name_vehicle` (direct field — vehicles, unlike the
other 4 products, has no separate translated name field). Excluded:
`tab_calculator_inputs`, `tab_price_calculation`, `tab_surcharge_calculation`
are all dev-note-placeholder tabs on this collection (no real fields yet).
`section_camper_descriptions` (hidden, under `tab_description`) was skipped —
hidden in the live model and not populated.

### Lookup fields used (verified via `schema` MCP tool)

`cruise_types.name` (direct, not translated), `rental_companies.name_company`,
`vehicle_categories.name`, `rental_depots.name_depot` (via
`depots_selected.rental_depots_id.name_depot`), `seasons.season`. Same
`countries`/`destinations` M2M `.translations.name` pattern as tours.

### Verification

Flattened both groups configs (44 paths for cruises, 34 for vehicles) and
ran them through `items.read` against a real record in each collection via
the `directus-local` MCP `items` tool. Both returned clean — no
permission/unknown-field errors.

### How to revert

Delete the `item_preview_button` field entirely on `cruises` and `vehicles`
via the `fields` MCP tool (`action: "delete"`) — this removes both the
schema addition and its JSON in one step, since the field didn't exist
before this change.
