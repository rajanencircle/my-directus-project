# BestOf Migration — Database Comparison & Findings

> **UPDATE 2026-06-11 — see [§6 New dump `bestof_full_new_09-06-2026.sql`](#6-update-2026-06-11--new-dump-with-freigabe) at the bottom.** The client delivered a corrected dump that **resolves the two open blockers**: `freigabe` (active/inactive) is now present on 51 tables, and `px_feldlisten` is restored. Active/inactive is fully answered there.

**Date:** 2026-06-08
**Databases compared (local MySQL):**

| Alias | Database | Role |
|---|---|---|
| OLD | `bestof` | Earlier dump |
| LATEST | `bestof_full` | Latest dump from the same app (Primarix) being migrated old → new Directus |

**Scope:** Read-only comparison and analysis of both dumps. No data, table, or schema was modified.

---

## 1. Table-level comparison

| Metric | Value |
|---|---|
| Tables in OLD (`bestof`) | 191 |
| Tables in LATEST (`bestof_full`) | 178 |
| Tables in both | 177 |
| Tables only in OLD | 14 |
| Tables only in LATEST | 1 |

**Schema of the 177 shared tables is identical** — no column was added, removed, renamed, retyped, or re-keyed. The only structural differences are which tables exist; the rest is data volume.

### 1a. Tables present in OLD but MISSING from LATEST (14)

| Table | Rows (OLD) | Note |
|---|---:|---|
| **px_feldlisten** | 6,455 | **⚠️ REQUIRED for migration** — holds the field value/option lists (e.g. Hotel/Lodge/Gästehaus). Columns: `id, cid, label, short, aktiv, sort`. Present earlier, missing in latest dump. **Needs to be re-shared.** |
| aa_plzverteiler | 48 | Legacy postal-code distribution |
| aa_plzverteiler_normal | 48 | Legacy |
| plzverteiler | 48 | Legacy |
| plzverteiler_normal | 48 | Legacy |
| plzverteiler_karawane | 48 | Legacy (client-specific) |
| plzverteiler_ab_01-03-25 | 48 | Dated snapshot |
| container2 | 0 | Empty / scratch |
| hotels_ | 0 | Empty / leftover |
| pictures0 | 20,290 | Old pictures snapshot |
| tmp | 44 | Temporary |
| web_export | 0 | Superseded by `web_export_new` (in both) |
| web_karawane_bestof | 310 | Client-specific export |
| web_karawane_mapping | 2 | Client-specific mapping |

Most are legacy/temporary/snapshot tables and not required. **`px_feldlisten` is the exception — it is needed for the migration** because it contains field mappings (value/option lists).

### 1b. Tables present in LATEST but NOT in OLD (1)

| Table | Rows (LATEST) | Note |
|---|---:|---|
| **objects_calculation** | 19,701 | New. Holds price-calculation config per object & language. Columns: `oid, wek (buy currency), wvk (sell currency), kursglobal (exchange rate), pek, pvk, marge (margin), nettobrutto, provision (commission), sprachid (language), datum, userid, hinweis`. |

---

## 2. Data volume (LATEST is a much fuller dataset)

Of the 177 shared tables: **113 have identical row counts, 64 grew.** No table shrank materially (one row of noise: `objects_attributes` −12). Largest growth:

| Table | OLD | LATEST | Δ |
|---|---:|---:|---:|
| hotels_prices | 156,647 | 240,446 | +83,799 |
| pictures_text | 146,397 | 207,238 | +60,841 |
| pictures_objects_attributes | 3,495 | 45,121 | +41,626 |
| trips_prices | 28,977 | 58,157 | +29,180 |
| hotels_price_periods | 40,131 | 65,093 | +24,962 |
| pictures_objects | 33,098 | 53,446 | +20,348 |
| trips_tour_dates_web | 17,262 | 36,596 | +19,334 |
| trips_price_periods | 18,536 | 36,204 | +17,668 |
| hotels_room_occupancy | 20,531 | 35,777 | +15,246 |
| hotels_room_categories | 19,124 | 32,620 | +13,496 |

Notably the `flex_prices_*` family is empty in OLD but populated in LATEST (a feature that came online between dumps).

> Note: row counts are `information_schema.table_rows` (an InnoDB estimate). The direction (much more data in LATEST) is reliable; exact counts need `COUNT(*)` per table.

---

## 3. New hotels in the latest dump

Hotels are grouped by `oid` (each hotel = one `oid`, with 7 language rows: A, B, CH, D, GB, NL, ZA). The German `D` row is used for name/country/destination.

| Metric | Value |
|---|---:|
| Distinct hotels in OLD | 1,178 |
| Distinct hotels in LATEST | 1,995 |
| **New hotels (in LATEST, not in OLD)** | **817** |
| Removed hotels (in OLD, not in LATEST) | 0 |

LATEST is a clean superset: every old hotel survived, plus 817 net-new.

**Deliverable:** [`new_hotels_bestof_full.csv`](new_hotels_bestof_full.csv) — all 817 new hotels, columns: `id, oid, name, country, destination`. (`id` = hotel `D`-row id; `destination` = field_1342_1 "Suchort/search location"; 6 records have no name and are labelled `(no name)`.)

### 3a. Active vs inactive — UNRESOLVED (flag not in the dump)

The publish flag used in the admin panel — **`freigabe`** (set 1/0 via `controller=container`) — **does not exist in either dump.** Exhaustive search confirmed:

- No `freigabe` column in any table of `bestof` or `bestof_full`.
- The `hotels` table has no per-hotel active/publish column (verified by dumping every column for known active/inactive examples).
- `objects_attributes` (the generic key-value/EAV table) has **no rows for hotel oids**.
- `container` is only field-label definitions; the only `aktiv` columns are on unrelated tables (`fieldlists`, `lists`, `web_export_new`, `plzverteiler`).

**Conclusion:** the dumps contain catalog/content data but **not the editorial publish state (`freigabe`)**. To tag hotels active/inactive we need either the `freigabe` data exported from the source (an `oid → freigabe` mapping is enough) or DBA guidance on where it lives.

**Price-recency proxy (imperfect — do not rely on for migration):** based on latest price-period end date of the 817 new hotels — 44 have prices into 2026+, 660 ended before 2026, 113 have no price data. This does **not** match `freigabe`: a confirmed-active example (`oid 113795`) has prices only to Feb-2025, so any "current prices" cutoff misclassifies it.

Reference examples (client-confirmed):

| oid | name | latest price period ends | client label |
|---|---|---|---|
| 112417 | 124 on Brunswick | 2022-03-31 | inactive |
| 124897 | Absolute Riverside B&B | 2023-03-31 (objectinfo: "+++ Fake Price +++") | inactive |
| 113795 | Accent House B&B | 2025-02-28 | active |

---

## 4. Price calculation

- The new **`objects_calculation`** table holds the calculator fields required for price calculation (buy/sell currency, exchange rate `kursglobal`, margin `marge`, commission `provision`) per object per language (`sprachid`).
- The relations to objects are present (e.g. `oid 443` has 6 rows, one per language).
- **However, the calculation data is mismatched between Primarix and the dump** — for `oid 443` the values in the dump do not match what Primarix shows. So while structure and relations exist, the underlying data appears out of sync.

### Hotel data relations (as observed in the dump)

- A hotel = `hotels.oid` (7 language rows each).
- Child records link via `parentid = hotel.oid`: `hotels_price_periods`, `hotels_room_categories`, `hotels_room_occupancy`.
- `hotels_prices` links to a price period via `subcontainer_oid_24 = hotels_price_periods.oid`; period validity dates are `field_382_1`/`field_382_2`.
- Other product families (campers, rental cars, tours, trips, transfers) follow the same `oid`/`parentid`/`subcontainer_*` pattern.

---

## 5. Open questions / guidance requested from the DB administrator

1. **`px_feldlisten`** — please re-share an up-to-date copy (or its replacement). Required for field mappings.
2. **Price calculation** — how it is carried out and stored, how `objects_calculation` is applied, and why values differ between Primarix and the dump.
3. **Relations** — how relations are structured and where stored across hotels, room categories, price periods, occupancies, surcharges, etc.
4. **Active/inactive (`freigabe`)** — where it is stored and how to include it in an export.
5. Same details for the **other products** (campers, rental cars, tours, trips, transfers).

---

## Appendix — connection & method

- MySQL local, user `root`. Compared via `information_schema` (tables, columns) and direct reads.
- Table/column diffs computed by set comparison; row deltas from `information_schema.table_rows`.
- New-hotel list = `oid` in `bestof_full.hotels` not in `bestof.hotels`, named from the `D`-language row.
- **No write operations were performed on either database.**

---

## 6. UPDATE 2026-06-11 — New dump with freigabe

**File:** `bestof_full_new_09-06-2026.sql` (307 MB), imported to local DB **`bestof_0906`** (179 tables).
This corrected dump resolves both open blockers from the earlier analysis.

### 6a. Schema changes vs the previous full dump (`bestof_full`)

| Change | Detail |
|---|---|
| **+ Table `px_feldlisten` restored** | The field value/option-list mapping table is back (was missing before; required for migration). |
| **+ Column `freigabe`** | Added as `int(11) NOT NULL` on **51 tables** (the publish / active-inactive flag). |
| **+ Column `objects_calculation.kid`** | New column on the calculation table. |
| Columns removed | None |
| Tables removed | None |

So: `bestof_0906` = `bestof_full` + `px_feldlisten` + `freigabe` (51 tables) + `objects_calculation.kid`.

### 6b. The 51 tables carrying `freigabe`

agencies, camper, camper_depots, camper_price_periods, camper_rental_period, camper_specials, camper_surcharges, camper_vehicle, flex_prices, flex_prices_columns, flex_prices_depots, flex_prices_lines, flex_prices_price_periods, flex_prices_reduction, hotels, hotels_price_periods, hotels_room_categories, hotels_room_occupancy, hotels_specials, hotels_surcharges, image_pages, rentalcars, rentalcars_avisonewaytabna, rentalcars_avisonewaytabsa, rentalcars_avisonewaytabunlimited, rentalcars_avistabcharges, rentalcars_avistabcrossborgercharges, rentalcars_depots, rentalcars_onewaytableaud, rentalcars_price_periods, rentalcars_rental_period, rentalcars_specials, rentalcars_surcharges, rentalcars_vehicle, tours, tours_categories, tours_price_periods, tours_room_occupancy, tours_routes, tours_specials, tours_surcharges, tours_tour_dates_web, trips, trips_category, trips_price_periods, trips_room_occupancy, trips_routes, trips_specials, trips_surcharges, trips_tour_dates_catalogue, trips_tour_dates_web.

Notes: `freigabe` is consistent across all 7 language rows of a given `oid` (0 hotels have mixed values). `freigabe=1` = active/published, `freigabe=0` = inactive.

### 6c. Active / inactive by product (distinct oid)

| Product | Active (1) | Inactive (0) | Total |
|---|---:|---:|---:|
| hotels | 1,179 | 816 | 1,995 |
| trips | 751 | 882 | 1,633 |
| tours | 346 | 204 | 550 |
| agencies | 152 | 31 | 183 |
| image_pages | 92 | 71 | 163 |
| camper | 23 | 12 | 35 |
| rentalcars | 22 | 12 | 34 |
| flex_prices | 0 | 25 | 25 |

### 6d. Key insight — the old `bestof` dump was the ACTIVE subset

- All **1,178** hotels in the old `bestof` dump are `freigabe=1` (active) in the new dump — **0** of them are now inactive.
- The new dump has **1,179** active hotels = those 1,178 + exactly **1 brand-new active hotel**: **Tufi Resort** (oid 93889, Papua-Neuguinea).
- The remaining **816** of the previously-identified 817 "new" hotels are all **inactive** (`freigabe=0`) — they were simply not part of the old published subset.

This confirms `freigabe` is the correct active/inactive flag and explains the earlier "new hotels" count.

### 6e. Note on reference example `oid 113795`

Earlier this hotel (Accent House B&B) was thought to be active, but in this authoritative dump it is **`freigabe=0` (inactive)** across all languages — consistent with its prices only running to Feb-2025. The other two references (112417, 124897) are also `freigabe=0`. (Original recollection was uncertain; the dump is authoritative.)

### 6f. Deliverable updated

[`new_hotels_bestof_full.csv`](new_hotels_bestof_full.csv) now includes `freigabe` + `status` columns. Columns: `id, oid, freigabe, status, name, country, destination`. Of the 817 new hotels: **1 active, 816 inactive.**

### Still open
- `objects_calculation` data mismatch vs Primarix (e.g. oid 443) — still pending DBA guidance.
- DBA explanation of calculation logic and relations across products — still requested.
