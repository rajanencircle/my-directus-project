# Directus Staging Changes Log

---

## 2026-06-15 — Tour From Price Selection Flow

**Scope:** Tours collection — from_price automation flow.

**Purpose:** Mirror the hotel and cruise `from_price` systems for tours. The flow reads price candidates flagged via `price_start` boolean fields across tour categories, price dates (`daytrips_price_dates`), and room occupancies (`tours_room_occupancies`), then sets `tours_translations_1.from_price` to the `tours_prices` row with the lowest sell price for each market language.

**No fields or collections were added** — all required fields (`price_start` on `tours_categories`, `daytrips_price_dates`, `tours_room_occupancies`; `from_price` M2O on `tours_translations_1`) were already in place. Only the flow and its operations were created.

---

### Flow Created

#### `[PRICE CALCULATOR] Tour From Price Selection`
- **Flow ID:** `f0778792-ec90-403a-a7d7-05e597ec4393`
- **Status:** `active`
- **Trigger:** `event` → `items.update` on collections: `tours`, `tours_prices_translations`
- **URL:** http://localhost:8055/admin/settings/flows/f0778792-ec90-403a-a7d7-05e597ec4393
- **Equivalent to:**
  - Hotel: `[PRICE CALCULATOR] From Price Selection - 14 April - 04 May` (`b7f975e6-8ee2-4b60-af7e-f608839c196b`)
  - Cruise: `[PRICE CALCULATOR] Cruise From Price Selection` (`0f17cb08-cde0-4194-badb-f417e980e801`)

---

### Operations Chain (11 operations)

| # | Key | Type | UUID | Purpose |
|---|-----|------|------|---------|
| 1 | `extract_trigger` | exec | `015afb0a-edf9-4f59-b8e1-9a3db8452518` | Reads `$trigger`, extracts `tour_id` (direct if tours trigger) or `key` (for translation lookup) |
| 2 | `read_translation_tour` | item-read | `1c1836bc-17c4-4609-a8da-40055ca131a4` | Reads `tours_prices_translations` to resolve `tours_prices_id.tour_id` when triggered by a sell price update |
| 3 | `transform_payload` | exec | `2767a007-1900-4ff8-8e32-7ab94a50e10f` | Normalises both trigger paths into `{ tour_id }` |
| 4 | `tour` | item-read | `12f93bc1-6b9a-406d-bba9-9ab6d9951628` | Reads the tour record |
| 5 | `tour_translations` | item-read | `7aa6c245-9953-441a-81fa-c87dc8b7b445` | Reads all `tours_translations_1` rows for the tour |
| 6 | `tour_categories` | item-read | `e946e361-90ee-433e-bfa1-5dcd59d313c0` | Reads `tours_categories` — includes `price_start` |
| 7 | `price_dates` | item-read | `0afbd3d1-1b91-415c-910e-4aa9e8beb6e8` | Reads `daytrips_price_dates` for the tour — includes `price_start` |
| 8 | `occupancies` | item-read | `1bd63392-b294-426f-b674-e2efa21dbca6` | Reads `tours_tours_room_occupancies` junction — includes `tours_room_occupancies_id.price_start` |
| 9 | `tour_prices` | item-read | `1e7627d1-7035-4580-8828-14d0cc91c813` | Reads all `tours_prices` with nested `tours_prices_translations.*` |
| 10 | `from_price` | exec | `514ea2f8-8cae-4bfe-ac85-79b71fcf82bd` | Calculates lowest sell price per language using `price_start` flags; falls back to global minimum if none flagged |
| 11 | `update_from_price` | item-update | `df241970-1043-48fc-b7a8-0c4bb98d3a29` | Batch-updates `tours_translations_1.from_price` with the winning `tours_prices.id` |

---

### Schema Mapping (Tours vs Cruise)

| Role | Cruise Collection | Tours Collection |
|------|-------------------|-----------------|
| Parent | `cruises` | `tours` |
| Translation trigger | `cruise_prices_translations` | `tours_prices_translations` |
| Category | `cruises_cabins_categories` | `tours_categories` |
| Category FK in prices | `cabin_category_id` | `tours_category_id` |
| Price dates | `cruises_price_dates` | `daytrips_price_dates` |
| Price date FK in prices | `price_date_id` | `price_date_id` |
| Occupancy junction | `cruises_cruises_occupancies` | `tours_tours_room_occupancies` |
| Junction field | `cruises_occupancies_id` | `tours_room_occupancies_id` |
| Occupancy FK in prices | `cruise_occupancy_id` | `tours_room_occupancy_id` |
| Price translations | `cruise_prices_translations` | `tours_prices_translations` |
| Target result field | `cruises_translations_1.from_price` | `tours_translations_1.from_price` |

---

### Calculation Logic (operation 10: `from_price`)

A `tours_prices` row is a **candidate** if any of:
- Its `tours_category_id` → `tours_categories.price_start === true`
- Its `price_date_id` → `daytrips_price_dates.price_start === true`
- Its `tours_room_occupancy_id` → `tours_room_occupancies.price_start === true`

For each `tours_translations_1` row (= market language), the candidate with the **lowest positive sell price** in the matching language wins. If no candidates are flagged, falls back to the global minimum sell price across all tour prices for that language.

---

### How to Revert (full rollback)

**Remove operations and flow via SQL:**
```sql
DELETE FROM directus_operations WHERE flow = 'f0778792-ec90-403a-a7d7-05e597ec4393';
DELETE FROM directus_flows WHERE id = 'f0778792-ec90-403a-a7d7-05e597ec4393';
```

**Remove individual operations by UUID (if needed individually):**
```sql
-- Op 1: extract_trigger
DELETE FROM directus_operations WHERE id = '015afb0a-edf9-4f59-b8e1-9a3db8452518';
-- Op 2: read_translation_tour
DELETE FROM directus_operations WHERE id = '1c1836bc-17c4-4609-a8da-40055ca131a4';
-- Op 3: transform_payload
DELETE FROM directus_operations WHERE id = '2767a007-1900-4ff8-8e32-7ab94a50e10f';
-- Op 4: tour
DELETE FROM directus_operations WHERE id = '12f93bc1-6b9a-406d-bba9-9ab6d9951628';
-- Op 5: tour_translations
DELETE FROM directus_operations WHERE id = '7aa6c245-9953-441a-81fa-c87dc8b7b445';
-- Op 6: tour_categories
DELETE FROM directus_operations WHERE id = 'e946e361-90ee-433e-bfa1-5dcd59d313c0';
-- Op 7: price_dates
DELETE FROM directus_operations WHERE id = '0afbd3d1-1b91-415c-910e-4aa9e8beb6e8';
-- Op 8: occupancies
DELETE FROM directus_operations WHERE id = '1bd63392-b294-426f-b674-e2efa21dbca6';
-- Op 9: tour_prices
DELETE FROM directus_operations WHERE id = '1e7627d1-7035-4580-8828-14d0cc91c813';
-- Op 10: from_price
DELETE FROM directus_operations WHERE id = '514ea2f8-8cae-4bfe-ac85-79b71fcf82bd';
-- Op 11: update_from_price
DELETE FROM directus_operations WHERE id = 'df241970-1043-48fc-b7a8-0c4bb98d3a29';
```

**Or via UI:** Settings → Flows → `[PRICE CALCULATOR] Tour From Price Selection` → Delete.

**Note:** No fields or collections were created by this change. Reverting the flow is sufficient for a complete rollback.

---

### Pre-existing Reference Flows

| Flow | ID | Trigger Collections | Result Field |
|------|----|---------------------|--------------|
| Hotel | `b7f975e6-8ee2-4b60-af7e-f608839c196b` | `hotels`, `room_prices_translations` | `hotels_translations_1.from_price` → `room_prices` |
| Cruise | `0f17cb08-cde0-4194-badb-f417e980e801` | `cruises`, `cruise_prices_translations` | `cruises_translations_1.from_price` → `cruise_prices` |
| **Tour** | **`f0778792-ec90-403a-a7d7-05e597ec4393`** | **`tours`, `tours_prices_translations`** | **`tours_translations_1.from_price` → `tours_prices`** |
