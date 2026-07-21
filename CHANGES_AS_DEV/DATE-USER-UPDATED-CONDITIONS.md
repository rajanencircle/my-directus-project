# `date_updated`/`user_updated` — "View on Edit" condition parity

**Target:** `directus-dev`, `directus-local`, `directus-staging` (all three — per explicit user instruction, unlike the earlier local/staging-only sync task).
**Applied:** 2026-07-20
**Type:** `directus_fields.meta` updates (`conditions`, plus `readonly`/`options`/`display`/`display_options` on local `tours` only). No collections, relations, or content-field data touched.

## Reference pattern (from `hotels`, already present)

`hotels.date_updated` / `hotels.user_updated` carry a condition that keeps the field read-only/visible only once the record has an `id` (i.e. not on create):
```json
[{"name": "View on Edit", "rule": {"_and": [{"id": {"_nnull": true}}]}, "readonly": true, "hidden": false}]
```
`tours` already had this exact pattern on dev and staging. Labels (`de-DE`/`en-GB`/`nl-NL` translations) were already identical across all 5 collections in all 3 environments — no label changes were needed anywhere.

## Gap found

- **dev**: `excursions`, `vehicles`, `cruises` were missing the condition entirely on both fields (`tours`/`hotels` already had it).
- **local**: same gap as dev, **plus** `tours.date_updated`/`tours.user_updated` were missing the condition AND had `readonly: false` (instead of `true`) and `options`/`display`/`display_options` unset (dev/staging tours had a datetime format + user template configured).
- **staging**: same gap as dev for `excursions`/`vehicles`/`cruises`; `tours` already matched dev.

## Changes applied

### `directus-dev`
Added the condition to: `excursions.date_updated`, `excursions.user_updated`, `vehicles.date_updated`, `vehicles.user_updated`, `cruises.date_updated`, `cruises.user_updated`.

### `directus-local`
- `tours.date_updated`: `readonly` false→true; `options` null→`{"format":"dd.MM.yyyy HH:mm:ss"}`; `display` null→`"datetime"`; `display_options` null→`{"relative":true}`; added condition.
- `tours.user_updated`: `readonly` false→true; `options` null→`{"template":"{{first_name}} {{last_name}}"}`; `display` null→`"user"`; added condition.
- Added the condition to: `excursions.date_updated`, `excursions.user_updated`, `vehicles.date_updated`, `vehicles.user_updated`, `cruises.date_updated`, `cruises.user_updated`.

### `directus-staging`
Added the condition to: `excursions.date_updated`, `excursions.user_updated`, `vehicles.date_updated`, `vehicles.user_updated`, `cruises.date_updated`, `cruises.user_updated`. (`tours` already matched dev — no change needed.)

## Revert

Set `conditions` back to `null` for the fields listed above on the environment(s) in question. On local `tours`, also revert `readonly` to `false` and `options`/`display`/`display_options` back to `null`.

## Verification

Re-read every touched field on all three environments immediately after each update batch; confirmed `conditions` (and, for local `tours`, `readonly`/`options`/`display`/`display_options`) now match dev's `hotels`/`tours` reference pattern exactly.
