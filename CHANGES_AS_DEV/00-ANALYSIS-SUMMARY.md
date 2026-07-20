# Analysis: dev vs local/staging drift — hotels, tours, excursions, vehicles, cruises

**Date:** 2026-07-20
**Source of truth:** `directus-dev`. `directus-main` explicitly excluded from this task (per user instruction) — not read, not compared, not touched.
**Scope:** `hotels`, `tours`, `excursions`, `vehicles`, `cruises` and their direct sub-collections (translations, junctions, categories, prices, surcharges, price periods, etc).

## Method

1. Confirmed via `schema` discovery that dev/local/staging have an **identical set of 172 collections** — no collections are missing anywhere. All drift is in field/relation/collection *meta*.
2. Ran full read-only diffs (collections/fields/relations tools) across dev↔local and dev↔staging for the 5 product groups.
3. Cross-checked against `DEV_CHANGES/hotels-tabs-blocks-sections-rebuild.md` (existing tracker for a 2026-07-08 hotels tab/block/section restructuring done directly on dev).
4. Verified the user's specific clarification — that the main dev changes were **field order (`meta.sort`) on the 5 parent collections** and **interface/settings changes on the `header` field** — with direct raw `fields` reads (not the summarized schema tool, which does not surface `meta.group`/`sort` reliably) for all 5 parent collections across all three environments.

## Confirmed root cause

Both `local` and `staging` are behind a **pre-existing baseline bug** that dev fixed at some point (independently of the Jul 8 hotels tab rebuird, which — per direct raw-field comparison — is already in sync on both local and staging). The baseline bug, present identically on both local and staging before this task:

- **Broken/missing `meta.sort`** on top-level (ungrouped) system fields of `tours`, `excursions`, `cruises`, `hotels`, `vehicles` — sort values were `null`, pushed to abnormally high numbers (e.g. `excursions.source_updated_at` at sort `212` instead of `10`), or simply out of dev's order.
- **`header` field interface regression** on `vehicles` and `cruises`: both had `interface: "presentation-divider"` with a static `{"title": "Header"}` instead of dev's `interface: "header"` with a dynamic title/subtitle template (e.g. `{{name_vehicle}}` / `{{object_id}} - {{season.season}}`). `tours`/`excursions` already had the correct `header` interface but were missing the template `options` (local/staging had `options: null`).
- **`ui_tabs` field interface regression** on `vehicles` (both envs) and `cruises` (staging only): `interface: "group-raw"` instead of dev's `interface: "group-tabs"` — this breaks the tabbed layout, falling back to a flat/raw group.
- **Functional bug, staging only**: 6 M2M relations rooted on `tours` (`tours_destinations`, `tours_partner`, `tours_directus_files`, `tours_countries`, `tours_travel_categories`, `tours_airports`) had `meta.junction_field: null` on both relation rows (both directions) where dev has it correctly set — this breaks those M2M pickers in the staging UI.

## Fixes applied

See `LOCAL-CHANGES.md` and `STAGING-CHANGES.md` for the exact field-by-field before/after values and revert instructions.

## Lower-priority drift NOT yet applied (staging only)

An earlier broader scan (before the user narrowed scope to sort-order + header) also surfaced secondary staging-only drift, none of it structural/functional:
- `tours`/`excursions`: lost cascading-geo-picker config on `place`/`location_tour32`/`country`/`state` (staging shows plain `select-dropdown-m2o`), lost `options.headerColor` on `section_*` dividers, lost `display:"related-values"` templates on some relation fields, lost `languageField`/`languageDirectionField` options on translation-alias fields, inconsistent `hidden` flags on contact/address field clusters, stray `en-US` translation entries (project only uses de-DE/en-GB/nl-NL).
- `hotels`: collection-level `meta.translations` label missing on staging; stray `en-US` entries on `room_categories`/`valid_on_weekdays`.
- `vehicles`/`rental_companies`: only unconfirmed field-ordering differences (no option/type/relation differences) — needs a follow-up read to confirm before any fix.

These were intentionally **not** applied in this pass since the user twice narrowed the ask to specifically field-order and header/interface settings. Flagged for a separate go/no-go decision rather than silently expanding scope.
