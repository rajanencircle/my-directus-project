# Price Table Interface — Occupancy (Column) Sort Field Not Working

Extension: `directus-extension-interface-price-table`
Affected field instance: `hotels_translations_1.room_prices` (the price table placed on the hotel translations/junction collection)
Symptom reported: setting **Occupancy (Column) Sort Field** = `sort` in the interface options has no effect — the price table's occupancy columns don't reorder.

## 1. Root cause

Two independent problems, both needed to actually see column reordering:

### 1a. Code bug — the sort field was always read from the wrong collection

The interface option's own note says:

> "Field on the occupancy record used to sort columns left-to-right."

But "the occupancy record" is ambiguous — there are two different collections a per-hotel occupancy column can pull fields from:

- `occupancies` — the **global master list** of occupancy types (`1 Pers.`, `2 Pers.`, …), shared across every hotel.
- `hotels_occupancies` — the **per-hotel junction row** (an M2M between `hotels` and `occupancies`) that links one hotel to one occupancy type. This is also where Directus stores **manual drag-reorder position**: `directus_relations.sort_field = "sort"` for the `hotels.room_occupancies` relation, and the `directus-extension-interface-occupancy-selector` field placed on `hotels.room_occupancies` writes exactly this — a per-hotel `sort` integer — when an admin drags an occupancy chip into a new position.

The price-table extension's field-fetching code (`fetchOccupanciesFromJunction` and `fetchParentRecord` in `src/composables/usePriceTableData.ts`) always nested every optional occupancy field — including the configured **Occupancy Sort Field** — under the *related* occupancy record:

```
occupancies_id.sort   (deep field request built via `nestedOrOwn(...)`)
```

This is correct for a field like `value` (guest count), which really is a property of the global occupancy type. It is **wrong** for `sort`, which is a per-hotel manual order living on the junction row itself (`hotels_occupancies.sort`, i.e. `room_occupancies.sort` from the hotel's point of view) — that field was never requested or read anywhere in the codebase, so setting `occupancySortField = "sort"` silently sorted by the (empty) `occupancies.sort` column instead.

`normalizeOccupancyFromJunction` (in `src/composables/priceTableCore.ts`) made this worse: it built the returned column object as `{ ...relatedRecord, id, [label]: ..., value, from_price }` — a plain spread of the related record's fields, with no explicit handling for a configurable sort field at all. Even if the junction row's own `sort` had been fetched, it would never have survived onto the object `useColumns` reads (`a[sf]` in `priceTableCore.ts`).

### 1b. Data — no per-hotel manual order has ever been set

Independent of the code bug, the actual data was checked directly against the local Postgres database:

```sql
-- occupancies.sort: NULL for all 126 rows
-- hotels_occupancies.sort: NULL for every (hotel, occupancy) pairing checked
```

So even after the code correctly reads `hotels_occupancies.sort`, every column currently has no value to sort by until an admin actually drags/reorders a hotel's occupancy list at least once (via the "Room Occupancies" field on the hotel, which uses `directus-extension-interface-occupancy-selector` and does write this field on reorder).

## 2. Fix applied

Files changed (all within `directus/extensions/directus-extension-interface-price-table/src/`):

- **`types.ts`** — added `occupancySortField?: string` to `OccupancyConfig` so the normalizer can see it.
- **`composables/priceTableCore.ts`** (`normalizeOccupancyFromJunction`) — the sort field is now resolved explicitly, junction row first, falling back to the related master record, mirroring the exact pattern already used for `value`:
  ```ts
  [sortField]:
    getNestedValue(junctionRow, sortField) ??
    getNestedValue(relatedRecord, sortField) ??
    null,
  ```
  This is set *after* the `...relatedRecord` spread, so a real per-hotel `sort` value is never shadowed by an empty same-named field spread in from the master occupancy record.
- **`composables/usePriceTableData.ts`**:
  - `fetchOccupanciesFromJunction` (used by `occupancySourceMode: "junction"` and as the `auto`-mode fallback) now also requests the bare, unnested sort field on the junction collection itself (`hotels_occupancies.sort`), guarded by a schema check (`hasValueField`) so it's only requested when that collection actually has the field — skipped entirely when the sort field equals the value field (already covered) or when there's no `relatedField` (the existing bare-field path already covers that case).
  - `fetchParentRecord` (the `occupancySourceMode: "parent_field" / "auto"` deep-fetch off the parent record) now additionally requests `${occupanciesField}.${sortField}` (e.g. `room_occupancies.sort`) alongside the existing nested `room_occupancies.occupancies_id.sort`, so both mode paths resolve the same way.
- **`index.ts`** — reworded the **Occupancy (Column) Sort Field** option's help note to explain the junction-row-first / master-record-fallback resolution order, and that a `sort`-based manual order only takes effect once each record's occupancies have actually been drag-reordered at least once.

The extension was rebuilt (`npm run build`) and Directus was restarted to pick up the new `dist/index.js`.

No other field-instance configs (`tours_price_calculation_translations`, `excursions_price_calculation_translations`, `cruises`, `rental_companies_price_calculation_translations`) are affected differently than before: their `occupancySortField` is `"value"` (already correctly resolved from the master/related record) or, for vehicles, a field that lives directly on the junction row with no `relatedField` configured at all (already worked via the existing bare-field path).

## 3. What still needs to happen (data, not code)

The code fix alone will not visibly reorder any hotel's columns yet, because no hotel currently has per-occupancy `sort` values set. Two options, not mutually exclusive:

1. **Manual, per record** — an admin opens each hotel, drags the occupancy chips in the "Room Occupancies" field into the desired order, and saves. This writes `hotels_occupancies.sort` for that hotel only. From then on the price table's columns for that hotel will honor the new order.
2. **One-off backfill** — if a sensible default order can be derived (e.g. ascending by the existing global `occupancies.value`), a migration script could seed `hotels_occupancies.sort` per hotel from that ordering as a starting point, which admins can then fine-tune by dragging. This was **not** run as part of this fix, since it touches production content data and several `occupancies.value` rows share the same value (e.g. many "Child"/"VIP" entries default to `value = 1`), so a value-based backfill would still leave ties — worth a explicit decision from whoever owns this content before running it.

## 4. Verification performed

- `npm run build` succeeded with no TypeScript errors after each change.
- Confirmed via direct Postgres queries against the local dev database that:
  - `directus_relations` designates `hotels_occupancies.sort` as the manual `sort_field` for the `hotels.room_occupancies` M2M relation.
  - `directus-extension-interface-occupancy-selector` (the interface used on `hotels.room_occupancies`) writes exactly this field on drag-reorder.
  - Both `occupancies.sort` and `hotels_occupancies.sort` are currently empty for all existing rows, confirming point 3 above.
- Live UI verification (loading a hotel's price table in the browser) was not completed — it requires signing in as an existing admin user, and this session does not have credentials for one and is not permitted to reset a real user's password to obtain them. A temporary test value was written to and then immediately reverted from one hotel's `hotels_occupancies.sort` rows while tracing the fetch logic; no data was left modified.

**Recommended next step:** sign in as an existing admin, open a hotel with 3+ selected occupancies, drag-reorder them in "Room Occupancies", save, then open that hotel's price table — the columns should now follow the new order.
