# `excursions.image_badge_translations` — missing `junction_field` fix

**Target:** `directus-local`, `directus-dev`, `directus-staging` — all three, applied in that order per user instruction (local first, confirmed, then dev + staging).
**Applied:** 2026-07-20
**Type:** `directus_relations.meta.junction_field` update only. No fields, collections, or content data touched.

## Root cause

`excursions_image_badge_translations` (the junction collection behind `excursions.image_badge_translations`, a `special: ["translations"]` alias field) had `meta.junction_field: null` on **both** of its relation rows (`excursions_id` and `translations_id`). This is the same class of bug found earlier in `tours`'s M2M relations (see `STAGING-CHANGES.md`) — without `junction_field`, Directus can't resolve which side of the junction maps back to which, breaking the translations interface for that field (can't reliably match a `translations` row to its language/parent, so the image-badge multilingual editor doesn't work correctly).

Confirmed via comparison against the two working reference patterns:
- `hotels_translations_4` (hotels' image-badge translations junction): `excursions_id`-equivalent row has `junction_field: "translations_id"`; `translations_id` row has `junction_field: "hotels_id"`.
- `tours_image_badge_translations`: same pattern — `junction_field` set on both rows.

**Important — this bug pre-exists on `directus-dev` itself**, not just local. Confirmed by reading `excursions_image_badge_translations` relations directly on dev: both rows show `junction_field: null` there too. This is not a dev→local sync gap; it's a real misconfiguration on dev that needs the same fix applied there before dev can be trusted as source-of-truth for this field.

**Broader finding (not yet fixed anywhere):** the same missing-`junction_field` pattern was found on two other excursions translation junctions checked for comparison — `excursions_descriptions_translations` and `excursions_dates_translations` — both also `junction_field: null` on dev. This strongly suggests **every** excursions `*_translations` junction (price_calculation, price_infos, programme, specials, surcharges_translations, prices_translations, surcharges_calculation_translations) has the same bug, though only `image_badge_translations` was confirmed broken by the user and fixed here. Flagged for a follow-up scope decision — not fixed in this pass.

## Fix applied (local, dev, staging — identical on all three)

`excursions_image_badge_translations`:
| Relation row (`field`) | Before | After |
|---|---|---|
| `excursions_id` | `junction_field: null` | `junction_field: "translations_id"` |
| `translations_id` | `junction_field: null` | `junction_field: "excursions_id"` |

No schema (`on_delete`/FK), collection, or other relation properties changed on any environment.

## Revert

Set `junction_field` back to `null` on both rows (on whichever environment needs reverting) via `relations` update action.

## Verification

Re-read `excursions_image_badge_translations` relations on all three environments immediately after each update; confirmed both rows now carry the correct `junction_field` everywhere, matching the `hotels_translations_4`/`tours_image_badge_translations` reference pattern.

## Next steps (open item, not yet actioned)

Decide whether to audit/fix the other excursions `*_translations` junctions flagged above (`descriptions_translations`, `dates_translations`, and likely price_calculation/price_infos/programme/specials/surcharges/prices_translations too) — systemic, not isolated to `image_badge_translations`. Confirmed present on dev itself for at least the two spot-checked junctions; not yet fixed anywhere.
