# BOTG ContentHub — Cruises: DEV Schema Brief

**Version 1.0 · 23-06-26 · EN**

**Target artefacts:** `cruises_schema_26-06-23.yaml` (Directus snapshot) · `cruises_erd_26-06-23.png` / `.svg` (ERD)
**Scope:** schema structure only. **No data migration** — no cruise data has been imported yet. This lets us take the clean-slate route: drop the legacy cruise subgraph, then create the target collections from the snapshot.

---

## Background — why a rebuild rather than a patch

The current cruise collections are an accreted legacy set from the Primarix import and earlier iterations. The defects below cannot be patched in place cleanly, and since there is no data to preserve, a clean rebuild is both safer and faster:

- `cruises` has a **uuid primary key** — must be `integer` auto-increment per the platform PK/FK rule (uuid only for FKs onto uuid-PK targets).
- **Numbered translation collections** `cruises_translations_1 / _2 / _4` (plus the old `cruises_translations` and `travel_program_translations`) — numbered companions are disallowed; the target uses theme-qualified translation collections.
- **Double-prefix junction artefact** `cruises_cruises_occupancies`.
- **Twin type lookups** — both `cruise_types` (integer) and `cruises_types` (uuid) exist for the same concept.
- `cruises_cabins_categories` (plural “cabins”) instead of the convention `cruises_cabin_categories`.
- `Cruises_Metadata` (capitalised, table-less) instead of a lowercase snake_case nav folder.

---

## 1 — Leave untouched

Do **not** touch the following; they are outside this work and other parts of the platform depend on them:

- **Shared / external collections** referenced by cruises (referenced, not redefined, by the snapshot): `countries`, `destinations`, `partner`, `seasons`, `directus_users`, `directus_files`, `translations`, `departure_frequencies`, `mobility_advice_text`.
- **Calculator preset exception tables** (shared exchange-rate / margin-preset infrastructure): `erp_cruise_destination_exceptions` (+ `_translations`), `mp_cruise_destination_exceptions` (+ `_translations`).

---

## 2 — Drop the legacy cruise subgraph (22 collections)

No data exists, so a plain drop is safe. Mind FK cascades when dropping the parent `cruises`.

| Group | Collections to drop | Reason |
|---|---|---|
| Product | `cruises` | uuid PK → rebuilt as integer |
| Type lookups | `cruise_types`, `cruises_types`, `cruises_types_translations` | twin lookups; rebuilt as one integer-PK `cruises_types` |
| Legacy translations | `cruises_translations`, `cruises_translations_1`, `cruises_translations_2`, `cruises_translations_4`, `travel_program_translations` | numbered / non-conformant companions |
| Legacy prices | `cruise_prices`, `cruise_prices_translations` | superseded by the new calculator + `cruises_prices` matrix |
| Cabin / occupancy | `cruises_cabins_categories`, `cruises_occupancies` | wrong naming / model; rebuilt as repeater + lookup |
| Junctions | `cruises_countries`, `cruises_cruise_types`, `cruises_cruises_occupancies`, `cruises_destinations`, `cruises_directus_files`, `cruises_partner`, `cruises_price_dates`, `cruises_price_dates_departure_frequencies` | rebuilt identically/cleanly by the snapshot (`cruises_cruises_occupancies` is a double-prefix artefact) |
| Nav folder | `Cruises_Metadata` | replaced by lowercase `cruises_meta` |

> `travel_program_translations` is only related to `cruises` (its only FK is `cruises_id`); confirm no other product references it before dropping.

---

## 3 — Create the target model (25 collections)

Apply `cruises_schema_26-06-23.yaml`. It creates the clean model:

- **Product `cruises`** (integer auto-increment PK) — 10 tabs: master data, description, travel programme, price infos, calculator inputs, prices, specials, image badge, media. **No surcharge-calculation tab** — cruises have no surcharges; only a free-text `surcharges` field in price infos.
- **6 theme-qualified translation collections** (central pattern: `cruises_id` integer FK + `translations_id` uuid FK): `cruises_descriptions_translations`, `cruises_programme_translations`, `cruises_price_infos_translations`, `cruises_price_calculation_translations`, `cruises_specials_translations`, `cruises_image_badge_translations`.
- **Calculator on Hotel logic** — `cruises_cabin_categories` (blocks) × `cruises_price_dates` (rows) × `cruises_occupancies` (columns) feeding the `cruises_prices` matrix; `cruises_price_calculation_translations` holds buy/sell types, provision/margin %, exchange rate, from-price, and the prices-table interface.
- **New cruise-specific lookups** under the `cruises_meta` folder: `cruise_cabin_categories`, `cruise_occupancies`, and `cruises_types` (the surviving type lookup, now integer PK) — each with a translations companion.
- **M2M** junctions: countries, destinations, cruise_types (→ `cruises_types`), partner, media (→ `directus_files`); plus price-dates ↔ `departure_frequencies`.
- **Media** as scalar fields + the `cruises_directus_files` junction (no JSON blob), consistent with excursions/tours.

Target counts: **25 collections / 216 fields / 46 relations**, 0 integrity findings, all user-facing fields labelled (DE/EN/NL).

---

## 4 — Resolved structural decisions (for the record)

- **Type lookup:** `cruises_types` is canonical; `cruise_types` is dropped.
- **Cabin / occupancy lookups** are new and cruise-specific — they do **not** reuse the hotel room lookups.
- **`departure_number` is not created** (removed from the brief). The per-voyage identifier is `travel_id_karawane` (string), so alphanumeric codes are covered.
- **`participants_legacy` is retained.**
- **No surcharge calculation** — `tab_surcharge_calculation` is omitted.
- **`ship`, `at_a_glance`, `services_included`, `important_information`, `good_to_know`** use the Markdown editor (`input-rich-text-md`), not a rich-text editor.

---

## 5 — Procedure

1. **Back up** the current schema snapshot.
2. **Drop** the 22 legacy collections (§2). Drop the parent `cruises` last / mind cascades.
3. **Dry-run apply** `cruises_schema_26-06-23.yaml`; confirm it creates the 25 target collections and does **not** propose dropping any non-cruise collection.
4. **Apply.**
5. **Verify:** `cruises.id` is integer auto-increment; nav placement (cruises top-level, lookups under `cruises_meta`); open a record and confirm tabs / blocks / sections, `header`, the calculator (prices-table) and translation forms render; M2M pickers resolve.

---

*Companion document: `BOTG_ContentHub_Cruises_Manual_Schema_ToDo_EN_26-06-23.md` — the same transformation as a manual, step-by-step checklist for editing the current schema by hand instead of applying the snapshot.*
