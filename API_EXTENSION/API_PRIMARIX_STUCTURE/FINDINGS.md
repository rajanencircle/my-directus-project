# Primarix-structure API — Findings & Analysis

**Ticket:** Estimate effort for an API mirroring the Primarix XML dump structure.
**Date:** 2026-08-13
**Status:** Read-only analysis. No changes made to any environment, extension, or database.

Sources analysed:
- `directus/extensions/api` (current custom API extension, all environments)
- Directus schema on `directus-dev` (via MCP — collections, fields, relations, flows)
- Local MySQL imports of the Primarix dumps: `botg_full_20260806`, `karawane_full_20260806`
- `botg-import-service` (the existing Primarix → Directus migration pipeline)

---

## 1. What Primarix actually looks like (source system)

The ticket's framing ("translations in 1 table") is not quite accurate — the real model is more specific and matters for the estimate.

- **There is no dedicated translations table anywhere in Primarix.** Every content table (`hotels`, `tours`, `trips`, `camper`, `rentalcars`, etc.) stores language **as a row**, not a column and not a side table.
- Each entity row has: `id` (PK), **`oid`** (object id — shared across all language rows of the same entity), `parentid`, `freigabe` (published flag), `language varchar(10)`, `lastupdate`, `sort`, plus ~100 generic `field_<N>_1` columns (all descriptive/text/date/price fields for that entity) and paired `field_id_<N>` lookup-key columns.
- Confirmed on `hotels` (`oid=9`): **7 rows**, one per Primarix language code (`D`, `GB`, `NL`, `B`, `CH`, `A`, `ZA`), same `oid`, each row carrying the **entire field set duplicated** — not just translatable text. Non-translatable data (address, star rating, geo, etc.) is physically repeated 7 times per hotel.
- Auxiliary/child tables (`hotels_prices`, `hotels_seasons`, `hotels_surcharge`, etc.) **also** carry their own `language` column — pricing and season data is duplicated per language too, not shared once and translated.
- A field/label mapping table exists per main entity (referenced in the ticket) that maps `field_<N>` → human field name/label per language — this is Primarix's mechanism for making field *labels* multilingual, separate from the data duplication above.
- **`px_sprachen`** is Primarix's own 7-code language list (`D`, `GB`, `NL`, `B`, `CH`, `A`, `ZA`) — this does not map 1:1 to Directus's 3 locales (`de-DE`, `en-GB`, `nl-NL`); several Primarix codes are regional/country variants that don't have a Directus equivalent today.
- **botg vs. karawane are different schemas on the same engine.** botg has 180 tables; karawane has only 49, uses German table names for some products (`kreuzfahrten` = cruises, `studienreisen` = study trips, `touren`), and lacks camper/rentalcars/transfers/agencies/flexrates entirely. "Mirror Primarix" is not one shape — it's at least two, with different product coverage per client.

**Practical implication:** Primarix's per-language row duplication is why raw counts look large (e.g. "1810 hotels" in a dump context) even though there may be far fewer *unique* hotels — each unique `oid` produces up to 7 rows. This is the direct source of the "1810 hotels in dev, mapped from oid + language D only" question raised by the client — see Section 4.

---

## 2. What Directus actually looks like (target/current system)

Verified via MCP schema read on `directus-dev`. CLAUDE.md's PK-type claim ("hotels/cruises = UUID, tours = integer") is **stale** — only `hotels` uses UUID; every other product collection uses integer PKs.

| Product | Primary collection | PK type | Translation junction tables (per concern) | Count |
|---|---|---|---|---|
| Hotels (reference pattern) | `hotels` | uuid | `hotels_translations` (descriptions), `_translations_1` (prices/from_price), `_translations_2`, `_translations_3` (price info/MAT), `_translations_4` (image badge), `_translations_5` (specials) | 6 |
| Cruises | `cruises` | integer | `_descriptions_translations`, `_programme_translations`, `_price_infos_translations`, `_specials_translations`, `_image_badge_translations`, `_price_calculation_translations`, `_cabin_categories_translations` | 7 |
| Tours (daytrips v1) | `tours` | integer | `_descriptions_translations`, `_programme_translations`, `_price_info_translations`, `_specials_translations`, `_image_badge_translations`, `_price_calculation_translations`, `_surcharges_calculation_translations`, `_dates_translations` | 8 |
| Excursions (daytrips v2) | `excursions` | integer | `_descriptions_translations`, `_price_infos_translations`, `_specials_translations`, `_image_badge_translations`, `_price_calculation_translations`, `_surcharges_calculation_translations`, `_dates_translations`, `_prices_translations`, `_surcharges_translations`, `_categories_translations` | 10 |
| Vehicles (cars + campers, `rental_type` discriminator) | `vehicles` + `rental_companies` | integer | vehicles: `_descriptions_translations`, `_image_badge_translations`; rental_companies: `_descriptions_translations`, `_conditions_translations`, `_price_infos_translations`, `_specials_translations` | 6 total, split across two parents |
| Roundtrips | **no collection exists** | — | — | — |
| Study trips | **no collection exists** | — | — | — |

Key structural differences from Primarix:

1. **Directus splits translations by concern into 6–10 separate junction tables per product**, with a different numbering/naming convention per product (no shared pattern). Primarix has zero translation tables — language is a row attribute on the entity itself.
2. **Directus does not duplicate non-translatable data per language.** One hotel = one row in `hotels`; only the fields that actually need translation live in the junction rows (one junction row per language, only for translatable fields). This is the opposite of Primarix's "duplicate everything 7 times" model.
3. **Field labels/multilingual field names are handled natively** via Directus's field interface + language settings, stored in `directus_fields.meta` (translations config on the field definition itself) — this replaces Primarix's separate per-entity field-mapping table.
4. **Relational structure changed**: things that are flat columns or simple lookup IDs in Primarix (occupancy, categories, countries, destinations) are now M2M/O2M/M2O relations via junction collections in Directus. The way IDs are stored and traversed (junction table rows vs. a flat `field_id_<N>` column) is structurally different, not just renamed.
5. **No export/XML/feed infrastructure exists anywhere in the current Directus instance.** All ~57 flows found are internal data plumbing (price calculator sync, MAT propagation, partner sync, margin/exchange-rate presets) — none generate external feeds.
6. **Roundtrips and study trips have no Directus collections at all yet** — these two Primarix product types cannot be mirrored until that schema/import work exists, independent of any API work.
7. **Legacy IDs are preserved alongside Directus's own PKs**: `px_source_id` (written by the import service on every migrated record) holds the Primarix `oid`. `object_id`, `id_tour_user`, `haupt_id_tour_user`, `id_tour32` also appear per CLAUDE.md/domain docs. These are the join keys a mirror API would use to reconstruct legacy identity.

---

## 3. What the current custom API extension already does

`directus/extensions/api` is a mature, JSON-only Express-style hook extension. Relevant existing capability:

- **Product coverage**: `hotels`, `tours`, `excursions`, `cruises`, `rental_cars`, `campers` (rental_cars/campers both read the shared `vehicles`/`rental_companies` tables, split by `rental_type`), plus a unified `/v1/products` fan-out endpoint and cross-product `/v1/products/{id}` lookup (tries `object_id` then internal id). Roundtrips/study trips are absent (no collections exist).
- **Pagination**: offset-based (`page`/`limit`, capped at 200) plus a delta-sync cursor (`updated_after` keyed on `source_updated_at`), already built for incremental consumption.
- **Translation shaping**: `i18n.js` builds a `{iso: {fields...}}` map internally, but the API currently **resolves to one active language per response** (`?lang=`) — it does not return all 3 locales in a single response today. A Primarix mirror needs the opposite: all languages per record.
- **Shaping architecture**: a `fieldDefs` + `assembleResponse` allowlist mechanism already supports multiple output "audiences" (`web`, `backoffice`) — this is the natural seam to add a third audience (`primarix-xml`) rather than building a parallel system from scratch.
- **Known data gaps already documented in `FIELD_MAPPING.md`**: several tours/cruises/excursions sell-price fields are flagged as "hardcoded null — schema limitation" or known bugs. These would show up as missing data in a mirrored dump regardless of serialization work, until fixed.
- **No XML output exists at all** — every response terminates in `res.json(...)`. XML serialization (element/attribute decisions, CDATA for rich text, null-vs-absent-element handling) is entirely new work.
- **No full-catalog dump/export mechanism exists** — the API is designed for paginated/incremental REST calls, not a single large static file. A nightly cron-generated dump is a different code path (batch iteration + streaming/caching), not an extension of the existing per-record endpoints.

---

## 4. What the `botg-import-service` tells us (forward mapping, reusable in reverse)

- Each product has its own `field-map.js` (flat old-column → new-Directus-field declarations, typed e.g. `TRANSLATED_TO_SCALAR`, `RELATIONAL_WITH_COLLECTION`) plus per-concern mapping functions (hotels: `translations.js`, `translations_1.js`, `translations_3.js`, `translations_4.js`) and a `children.js` for nested entities (rooms/cabins/categories/prices/occupancies/seasons).
- A shared `hotel_migration_config_v2.json` supplies CID→label lookup tables (star ratings, countries, activity codes) — this part is genuinely reusable/invertible directly.
- **`px_source_id` is written on every imported record** via `upsertBySourceId()` — this is exactly the join key needed to reconstruct legacy `oid`/identity in a mirror API.
- **Product completeness in the import service** (indicates ease of building a mirror per product):
  - Fully built: **hotels**, **cruises**, **tours**, **excursions**.
  - Thin/partial: **camper**, **rentalcars** (share generic `vehicles` field-map/hooks, no dedicated children logic).
  - Effectively unimplemented: **vehicles** as a standalone entity (stub registry entry only).
  - Absent entirely: **roundtrips, study trips** (not in the product registry).
- **Reuse assessment**: the *field-name knowledge* (which Primarix column ↔ which Directus field) is directly reusable as documentation for the reverse map. The *transform functions* (date/flag normalizers, price/margin calculations, `<br>`-joined M2M text fields) are one-directional and need hand-written inverses — not automatic to invert. There is no Primarix XML schema/sample in this repo to target byte-for-byte; the actual dump shape needs to come from the client (see clarifications).

---

## 5. Direct answers to points the client raised

**"1810 hotels in dev because we map oid + language D → one Directus hotel item; non-translatable data isn't duplicated 7x anymore, only genuinely translatable fields go through Directus's translation interface."**
Confirmed by direct inspection of `botg_full_20260806.hotels`: `oid=9` has 7 rows (one per language code), each carrying the full field set duplicated. Directus collapses this to 1 entity row + N translation junction rows (only for fields actually marked translatable). This is the single biggest structural difference to reconcile and the main source of "why do the numbers look different."

**"There's a field/id/label mapping table per main table in Primarix, vs. Directus storing everything in `directus_fields`."**
Confirmed. Primarix's per-entity field-mapping table (field id ↔ field name ↔ per-language label) is functionally replaced in Directus by `directus_fields.meta` (interface + translations config per field). This is a schema-level, not data-level, difference — it affects how a mirror API derives "field labels" if the target format needs them, but does not affect the underlying data values.

**"Relations/mappings changed (occupancy, O2M/M2O/M2M ID storage, etc.)."**
Confirmed — see Section 2, point 4. Flat lookup columns and duplicated child rows in Primarix become junction-table relations in Directus. Any mirror must flatten these back out per product, and the flattening logic differs per relation type and per product (no single generalized routine).

---

## 6. Gaps / what's missing before this can be estimated firmly

1. No real Primarix XML sample or schema/DTD is available in any repo analysed — the actual target shape is not yet confirmed, only inferred from the MySQL source tables.
2. Roundtrips and study trips have no Directus collections, no import pipeline, and no field-mapping — out of scope until that schema work happens separately.
3. Camper/rentalcars/vehicles-as-standalone-entity have thin-to-no mapping in the import service — harder to mirror than hotels/tours/cruises/excursions.
4. Several fields are already known-broken/null in the current API (documented in `FIELD_MAPPING.md`) — a mirror would reproduce these gaps unless fixed separately.
5. No decision yet on: full nightly dump file vs. new paginated API endpoint vs. both; how many languages per record; which sites/products are actually in scope; botg only or karawane too; whether botg.de bypasses Directus entirely and talks to Primarix MySQL directly (a separate, out-of-band effort not reducing this scope).

See `CLIENT_REPLY.md` in this folder for the clarifying questions sent to the client and the current 3–4 day estimate for the clarification/scoping phase only (not full implementation).
