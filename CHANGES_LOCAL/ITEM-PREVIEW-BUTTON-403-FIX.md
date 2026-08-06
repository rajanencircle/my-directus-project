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
