# API extension changes — tours, excursions, vehicles, cruises

**Date:** 2026-07-28
**Scope:** `directus/extensions/api` only — no changes were made to any Directus instance (local/dev/staging/main), schema, or data. This documents pure API-code changes made after a read-only gap analysis against the live `directus-dev` schema.

## Background

A schema-vs-API gap analysis was run against `directus-dev` for the tours, excursions, vehicles, and cruises product families (fields, sub-collections, relations, and translation junctions). The findings below were then implemented as code-only fixes/additions in the extension.

---

## Tours

**Files:** `src/api/v1/tours/tours.fields.js`, `tours.service.js`, `tours.filters.js`, `src/transformers/tour.transformer.js`

- **Fixed bug:** `tours` has no top-level `name` field. `LIST_FIELDS`/`DETAIL_FIELDS` and the transformer previously read a non-existent `tour.name`, so every response returned `name: null`/`undefined`. Now resolved from `descriptions_translations.name_tour` (list endpoint picks `de-DE`, falling back to the first available translation; detail endpoint honors the `lang` query param).
- **Fixed bug:** `DETAIL_FIELDS` queried a field called `"routes"`, which doesn't exist on `tours` — the real alias is `travel_routes` (→ `tours_routes`). Travel routes were silently never returned. Now queries `travel_routes.*` and the transformer maps departure/arrival place names.
- **Fixed bug:** the search filter (`tours.filters.js`) filtered on the same non-existent `name` field. Now searches `descriptions_translations.name_tour`. Removed `name`/`-name` from the sort allowlist (not reliably sortable — it's a per-language translation, not a single field).
- **Added:** departure dates — `departure_times` (available_from/to, trip_duration, departure_frequencies) and `dates_translations` (departures_text), previously not queried at all. Exposed as `departure_dates[]` and `dates_translations` in the detail response.
- **Added:** `specials_translations` (promotional/offer blocks), previously not queried or exposed. Exposed as `specials_translations` in the detail response.
- **Removed:** a leftover dead/broken `"dates.*"` field block in `DETAIL_FIELDS` (same "wrong alias name" bug as `routes`, now superseded by the correct `departure_times.*` block).

## Excursions

**Files:** `src/api/v1/excursions/excursions.fields.js`, `excursions.service.js`, `excursions.filters.js`, `src/transformers/excursion.transformer.js`

- **Fixed critical bug:** `excursions` has no top-level `name` field either. This was the most severe finding — every excursion was returning no name at all via list, detail, search, and sort. Fixed the same way as tours, using `descriptions_translations.name_excursion`. Removed `name`/`-name` from the sort allowlist.
- **Added:** `price_calculation_translations` (buy/sell price type, margin, exchange rate, and the authoritative `from_price` pointer). Previously `from_price` was only ever computed client-side as `min(sell)` across price cells. Now resolves the authoritative value first (FK chain `price_calculation_translations.from_price` → `excursions_prices` → `excursions_prices_translations.sell_price`, mirroring the exact pattern already used by hotels' `buildPriceSettingsMap`), falling back to the computed minimum only if the authoritative value isn't set yet. Also exposes `price_settings` (buy/sell price type, percentage type, provision %, margin %) in the detail response.
- **Added:** departure dates (`departure_times`, `dates_translations`) and travel routes (`travel_routes` → `excursions_routes`), exactly analogous to the tours fixes above — both were entirely unqueried before.
- **Added:** `specials_translations`.
- **Added:** localized category text — `excursions_categories_translations.category_text`/`category_original`, and per-language names for `excursion_category_types` and `excursion_price_categories_names` (previously only the untranslated default name surfaced). Exposed via a `category_translations`/`text` block per category in the grouped `categories[]` output.
- **Fixed bug:** the search filter referenced the same non-existent `name` field — now searches `descriptions_translations.name_excursion`.

## Vehicles

**Files:** `src/api/v1/vehicles/vehicles.fields.js`, `vehicles.service.js`, `src/transformers/vehicle.transformer.js`

- **Added:** `camper_specs` (+ `camper_specs_equipment` → `camper_equipment`) integration. This collection now has a working FK back to `vehicles` (confirmed live) but had zero API integration. `camper_specs` has no reverse alias on `vehicles`, so it's fetched via a separate query filtered by `vehicle: {_eq: id}` — same pattern already used for tours/excursions surcharges. Exposed as `camper_specs` in the vehicle detail response (berths, dimensions, fuel/tank capacities, beds, highlights, rating, and equipment list with per-vehicle availability).
- **Not changed (schema-blocked):** real per-vehicle pricing (`vehicles_prices`, `vehicles_price_calculation`, `vehicles_surcharges_calculation`) still has no FK back to `vehicles` in the live schema. The existing `PRICING_UNAVAILABLE` stub is accurate and was left as-is. Wiring this up requires a Directus schema change (adding relations), which is out of scope for an API-code-only task and needs separate sign-off before touching any instance.

## Cruises

**Files:** `src/api/v1/cruises/cruises.fields.js`, `cruises.service.js`, `cruises.filters.js`, `src/transformers/cruise.transformer.js`, and the shared `src/utils/images.js`

- **Added:** `cruises_prices` — a genuine per-cabin_category × price_date × occupancy price matrix with working FKs that was completely unused (the old code comment claiming "no price matrix exists for cruises" was factually wrong against the live schema). It has no o2m alias on `cruises`, so it's fetched via a separate query filtered by `cruises_id`, then grouped with the same `groupPrices2` helper already used by tours/excursions. Exposed as a new `categories[]` field in the cruise detail response (existing `cabin_categories`/`price_dates`/`occupancies` outputs were left in place for backward compatibility — they carry per-cabin translation text that the grouped view doesn't include). No sell price junction exists for `cruises_prices` (only `buy_price`), so `sell` is always `null` in the grouped output — same honest-degradation pattern as tours' pricing.
- **Fixed bug:** `deviating_cancellation_terms`/`deviating_cancellation_terms_additions` were queried/read under the wrong field names. The real fields are `deviating_cancellation_terms_selector`/`deviating_cancellation_terms_text`. These previously always resolved to `null`.
- **Fixed bug:** `media.directus_files_id.is_map`/`tour32_export` were queried at the wrong nesting level. These are junction-level fields on `cruises_directus_files` (per-product, can differ across products sharing the same file), not fields on the shared `directus_files` record. Fixed to `media.is_map`/`media.tour32_export`. The shared `buildImageUrls` helper (`utils/images.js`) was updated to check the junction-level value first, falling back to the file-level value — this keeps tours/excursions/vehicles/hotels (which still query it at the file level) working unchanged.
- **Added:** `percentage_type`/`provision_percentage` to `price_settings` — previously only `margin_percentage` was exposed, so provision-based cruises could misreport their effective margin.
- **Updated:** stale code comments that no longer matched the live schema (the "no price matrix" and "no status field on cabin_categories" claims).

---

## Explicitly not done in this pass

- **Vehicles real pricing wiring** — requires adding FK relations in Directus itself (`vehicles_prices.vehicle_id` → `vehicles`, etc.). Schema change, needs separate approval before touching `directus-dev`.
- **Cruises publication deep-filter** — `cruises_cabin_categories.status` exists and could support a hotels-style deep publication filter, but this wasn't implemented (left as `{}`, comment updated to note the possibility rather than guessing at untested filter logic).
- **Other products' `media.is_map` junction-level bug** — the same file-vs-junction mismatch fixed for cruises likely also exists for tours/excursions/vehicles (their `*_directus_files` junctions have the same `is_map`/`tour32_export` shape), but this wasn't in the originally agreed scope for those products and was left untouched. Worth a follow-up.

## Verification

All edited files were syntax-checked with `node --check` (see file list above) — all passed. A full extension build (`npm run build` via `directus-extension build`) could not be run because `node_modules` isn't installed in this checkout; this wasn't in scope for this task and would need a separate `npm install` step. Field-path correctness was cross-checked against the live `directus-dev` schema (fetched read-only via MCP) rather than assumed.
