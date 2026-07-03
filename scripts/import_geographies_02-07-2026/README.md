# Geographies Import 26-06-30 (directus-dev)

Imports the new geographies flat-list delivery
(`scripts/geographies_list_02-07-2026/Geographies 26-06-30/import-files/`)
into the updated geo collections on **directus-dev**.

Successor of `scripts/import-csv.js` (which imported the 26-04-10 list from
`scripts/geographies list/`).

## What changed vs. the old import

**Data (old 26-04-10 → new 26-06-30):**

| Collection | Old rows | New rows | New columns |
|---|---|---|---|
| destinations_cluster | 7 | 8 | `is_non_geographic` (‑`short_code`) |
| destinations | 13 | 18 | `status`, `media_code`×3, `is_non_geographic` (‑`short_code`) |
| countries | 235 | 222 | `status`, `ISO_alpha_3_code`, `media_code`×3 |
| regions | 186 | 169 | `status` |
| states | 55 | 102 | `status`, `media_code`×3 |
| places | 695 | 1373 | `status` |
| locations_tour32 | 2694 | 2716 | `status` |

- The new list uses a **completely new id numbering** (old countries id 1 =
  Afghanistan, new id 1 = Egypt). Upsert by id is impossible → wipe & reimport.
- ids are sequential 1..N in every file and all FK columns reference those same
  ids (verified: 0 missing references). The script therefore imports **explicit
  ids** and writes FK values straight from the CSVs — the old script's
  `sort`-based FK remapping is gone.
- `mapper-files/` (remap/recode tables) are **not** imported — the client
  already applied them when producing the import files (that's where the
  `in review` statuses come from).

**Schema on dev AND local (both verified via MCP, 03-07-2026 — identical):**

- `status` (new/active/in review/archived, default `new`) on all 6 levels below
  destinations_cluster; `is_non_geographic` on destinations_cluster +
  destinations; `media_code`, `media_code_legacy_botg`,
  `media_code_legacy_karawane` on destinations/countries/states;
  `ISO_alpha_3_code` on countries. `short_code` fields are gone.
- `regions.country_id` is an **M2M** via junction `regions_countries`
  (junction field `countries_id` — the old script used `countries_geo_id`).
- `locations_tour32.name` is now a **direct field** (the de-DE-only
  translations junction was removed) + `status`.
- Translation junctions unchanged: `<collection>_translations` with
  `<collection>_id` + `translations_id` + `name`.
- Locales on dev and local: `de-DE`, `de-CH`, `nl-NL` — **no `en-GB`**, so the
  `name_en-GB` columns are skipped (the script imports them automatically if
  the locale is ever added).
- Write path live-tested on directus-local (03-07-2026): batch POST with
  explicit id + nested `translations` + nested `country_id: [{countries_id}]`
  M2M creates all rows correctly; DELETE with an id array works and cascades
  clean up junction/translation rows.

## Usage

```bash
export DIRECTUS_URL="https://dev.content.botg.cloud"
export DIRECTUS_TOKEN="<admin token>"   # never hardcode

# offline CSV validation only (no server access needed)
node import-geographies.js validate

# full dry run against the instance (read-only)
node import-geographies.js all --dry-run --clear --fix-sequences

# real import: JSON backup → wipe → import → fix sequences
node import-geographies.js all --clear --fix-sequences
```

Import order: locations_tour32 → destinations_cluster → destinations →
countries → states → regions → places. Translations and the regions↔countries
M2M are created nested in the same batched POST (50 items/request).

## ⚠ Consequences of `--clear` on dev

- Product references to geo rows (`hotels.country`, `tours.place`,
  `excursions.state`, `directus_files.region`, agencies, rental_*, …) are
  **SET NULL** at DB level.
- Product↔geo junction rows (`tours_countries`, `cruises_countries`,
  `excursions_countries`, `rental_companies_countries`, `tours_destinations`,
  `cruises_destinations`) are **CASCADE-deleted**.
- Since the new list re-numbers everything, those assignments could not survive
  anyway — re-linking products to the new geo ids is a separate task.
- Geo-internal children (`*_translations`, `regions_countries`, and
  places/states under countries) are CASCADE-deleted automatically; the script
  still deletes child collections first.

**Rollback path:** `--clear` writes a full JSON export of all 7 collections
(incl. nested translations/M2M) to `backups/<timestamp>/` before deleting.
The old CSVs also remain in `scripts/geographies list/`.

## Data quirks handled

- `id_primarix` contains semicolon-separated multi-values in 72 rows
  (66 countries, 4 regions, 2 places — merged legacy entities). The field is
  integer in Directus → the script imports the **first** value and logs the
  full original value as a warning (`import-warnings-*.log`).
- `regions.country_id` multi-values (`178;170`, 8 rows) → M2M junction rows.
- Empty `name_ch-DE` (118 rows) / `name_nl-NL` (104 rows) → that translation
  row is simply not created.
- `--fix-sequences`: explicit-id inserts don't advance Postgres autoincrement
  sequences, so a later UI-created geo item would collide with an imported id
  (critical for states 55→102, places 696→1373, destinations 14→18,
  locations_tour32 2695→2716). The flag probes each sequence with disposable
  id-less inserts until it passes the imported max id, then deletes them.
  Alternative if DB access is available:
  `SELECT setval('<table>_id_seq', (SELECT MAX(id) FROM <table>));`
