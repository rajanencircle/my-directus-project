# Directus Staging Changes Log

---

## 2026-06-15 — Activate Cruise From Price Selection Flow

**Change:** Activated the `[PRICE CALCULATOR] Cruise From Price Selection` flow (status changed `inactive` → `active`).

**Flow ID:** `0f17cb08-cde0-4194-badb-f417e980e801`

**Why now:** All prerequisite fields (`price_start` flags on cabin categories, price dates, and occupancies; `from_price` M2O on `cruises_translations_1`) and all 10 flow operations were already in place and verified correct. The flow was left inactive when first built pending sign-off.

**What this enables:** From this point on, whenever a `cruises` item is saved or a `cruise_prices_translations` sell price is updated, the flow automatically calculates the lowest sell price (respecting `price_start` flags) and writes the winning `cruise_prices.id` to `cruises_translations_1.from_price` for each market language.

### Revert
```sql
UPDATE directus_flows SET status = 'inactive' WHERE id = '0f17cb08-cde0-4194-badb-f417e980e801';
```
Or via UI: Settings → Flows → `[PRICE CALCULATOR] Cruise From Price Selection` → toggle status to Inactive.

---

Track of schema and flow changes made in the **directus-staging** server.
Use this file to audit what was added, understand intent, and revert if needed.

---

## 2026-06-11 (Update) — Align Price Basics flags to `price_start` consistently

**Change:** Replaced the initial `from_price` naming on price dates and occupancies with `price_start` to be consistent across all three Price Basics items (cabin categories, price dates, occupancies). The result field `cruises_translations_1.from_price` is unchanged.

### What changed vs the initial setup

| Collection | Field | Action |
|---|---|---|
| `cruises_price_dates` | `from_price` | Unused — field delete is disabled on staging; field remains in schema but is **not read by the flow**. Treat as dead column. |
| `cruises_price_dates` | `price_start` | **Added** (boolean, default false) — replaces `from_price` as the candidate flag |
| `cruises_occupancies` | `price_start` | **Added** (boolean, default false) — replaces pre-existing `from_price` as the candidate flag used by the flow |
| `cruises_occupancies` | `from_price` | Pre-existing field — no longer read by the flow; left untouched |

### Flow operations updated

| Operation UUID | Key | Change |
|---|---|---|
| `eab5be7a-8815-4e68-89c9-93c4e65e65e3` | `price_dates` | Fields query now fetches `price_start` instead of `from_price` |
| `e650a868-64ee-4836-8d60-68b67f7eb7ae` | `occupancies` | Fields query now fetches `cruises_occupancies_id.price_start` instead of `cruises_occupancies_id.from_price` |
| `e8e61a03-a8ab-4e67-a3fb-1ca5365477ba` | `from_price` | Calc logic updated: all three checks now use `.price_start` (`cc?.price_start`, `pd?.price_start`, `co?.price_start`) |

### Revert for this update
```sql
-- Remove the newly added price_start fields
DELETE FROM directus_fields WHERE collection = 'cruises_price_dates' AND field = 'price_start';
DELETE FROM directus_fields WHERE collection = 'cruises_occupancies' AND field = 'price_start';
ALTER TABLE cruises_price_dates DROP COLUMN IF EXISTS price_start;
ALTER TABLE cruises_occupancies DROP COLUMN IF EXISTS price_start;
```
Then re-apply the flow operation changes from the original section below (restoring `from_price` field names in queries).

---

## 2026-06-11 — Cruise From Price: Price Basics Fields + Calculation Flow

**Scope:** Cruises collection — Price Basics section (cabin categories, price dates, occupancies), market pricing config, and automation flow.

**Purpose:** Mirror the hotel `from_price` system for cruises. The flow reads price candidates flagged via `price_start` boolean fields across cabin categories, price dates, and occupancies, then sets `cruises_translations_1.from_price` to the `cruise_prices` row with the lowest sell price for each market language.

---

### Fields Added

#### `cruises_cabins_categories.price_start` (boolean)
- **Type:** `boolean` (default: `false`)
- **Interface:** toggle
- **Purpose:** Flag a cabin category as the starting price reference. When `true`, all `cruise_prices` rows linked to this cabin category are candidates for the from_price calculation.
- **Equivalent to:** `room_categories.price_start` in the hotel system

#### `cruises_price_dates.price_start` (boolean)
- **Type:** `boolean` (default: `false`)
- **Interface:** toggle
- **Purpose:** Flag a price date window as a price_start candidate. When `true`, cruise prices linked to this date are candidates.
- **Note:** A `from_price` field also exists on this collection (added in the same session, now unused). It cannot be deleted via the staging API — treat it as a dead column.

#### `cruises_occupancies.price_start` (boolean)
- **Type:** `boolean` (default: `false`)
- **Interface:** toggle
- **Purpose:** Flag an occupancy as the starting price reference. When `true`, cruise prices linked to this occupancy are candidates.
- **Note:** A pre-existing `from_price` field also exists on `cruises_occupancies` — it is no longer read by this flow.

#### `cruises_translations_1.from_price` (integer, M2O → `cruise_prices`)
- **Type:** `integer`, readonly, nullable
- **Interface:** select-dropdown-m2o
- **Relation:** M2O → `cruise_prices.id` (ON DELETE SET NULL)
- **Purpose:** Stores a pointer to the `cruise_prices` row representing the lowest from_price for this market/language configuration. Set automatically by the flow below.
- **Equivalent to:** `hotels_translations_1.from_price` (M2O → `room_prices`)

---

### Flow Created

#### `[PRICE CALCULATOR] Cruise From Price Selection`
- **Flow ID:** `0f17cb08-cde0-4194-badb-f417e980e801`
- **Status:** `inactive` *(activate when ready to use)*
- **Trigger:** `event` → `items.update` on collections: `cruises`, `cruise_prices_translations`
- **URL:** http://localhost:8055/admin/settings/flows/0f17cb08-cde0-4194-badb-f417e980e801
- **Equivalent to:** `[PRICE CALCULATOR] From Price Selection - 14 April - 04 May` (hotel flow ID: `b7f975e6-8ee2-4b60-af7e-f608839c196b`)

#### Operations Chain (11 operations)

| # | Key | Type | UUID | Purpose |
|---|-----|------|------|---------|
| 1 | `extract_trigger` | exec | `789d79ce-8524-4b84-b69f-ea53985f8d9d` | Reads `$trigger`, extracts `cruise_id` (direct if cruises trigger) or `key` (for translation lookup) |
| 2 | `read_translation_cruise` | item-read | `f44e4e96-f6a3-4e9b-ac9c-31b19657ad64` | Reads `cruise_prices_translations` to resolve `cruise_prices_id.cruise_id` when triggered by price translation update |
| 3 | `transform_payload` | exec | `49ac0e1d-2f89-4011-926b-236663ef276d` | Normalises both trigger paths into `{ cruise_id }` |
| 4 | `cruise` | item-read | `c52f2131-57c0-4a9d-a582-da4ba8897544` | Reads the cruise record |
| 5 | `cruise_translations` | item-read | `f9ba8a9e-9c0a-4928-8074-71b9e8406cde` | Reads all `cruises_translations_1` rows for the cruise |
| 6 | `cabin_categories` | item-read | `fc82ef27-4105-48b6-bc88-8fa002fe5a22` | Reads `cruises_cabins_categories` — includes `price_start` |
| 7 | `price_dates` | item-read | `eab5be7a-8815-4e68-89c9-93c4e65e65e3` | Reads `cruises_price_dates` — includes `price_start` |
| 8 | `occupancies` | item-read | `e650a868-64ee-4836-8d60-68b67f7eb7ae` | Reads `cruises_cruises_occupancies` junction — includes `cruises_occupancies_id.price_start` |
| 9 | `cruise_prices` | item-read | `c3c42703-d290-4454-9286-1866203d9ed2` | Reads all `cruise_prices` with nested `cruise_prices_translations.*` |
| 10 | `from_price` | exec | `e8e61a03-a8ab-4e67-a3fb-1ca5365477ba` | Calculates lowest sell price per language using `price_start` flags; falls back to global minimum if none flagged |
| 11 | `update_from_price` | item-update | `fde0be7a-98da-41f9-b78f-b73db1d1621c` | Batch-updates `cruises_translations_1.from_price` with the winning `cruise_prices` ID |

#### Calculation Logic (operation 10: `from_price`)
A `cruise_prices` row is a **candidate** if any of:
- Its `cabin_category_id` → `cruises_cabins_categories.price_start === true`
- Its `price_date_id` → `cruises_price_dates.price_start === true`
- Its `cruise_occupancy_id` → `cruises_occupancies.price_start === true`

For each `cruises_translations_1` row (= market language), the candidate with the **lowest positive sell price** in the matching language wins. If no candidates are flagged, falls back to the global minimum sell price across all cruise prices for that language.

---

### How to Revert (full rollback)

**Remove fields:**
```sql
DELETE FROM directus_fields WHERE collection = 'cruises_cabins_categories' AND field = 'price_start';
DELETE FROM directus_fields WHERE collection = 'cruises_price_dates' AND field = 'price_start';
DELETE FROM directus_fields WHERE collection = 'cruises_price_dates' AND field = 'from_price';
DELETE FROM directus_fields WHERE collection = 'cruises_occupancies' AND field = 'price_start';
DELETE FROM directus_fields WHERE collection = 'cruises_translations_1' AND field = 'from_price';
ALTER TABLE cruises_cabins_categories DROP COLUMN IF EXISTS price_start;
ALTER TABLE cruises_price_dates DROP COLUMN IF EXISTS price_start;
ALTER TABLE cruises_price_dates DROP COLUMN IF EXISTS from_price;
ALTER TABLE cruises_occupancies DROP COLUMN IF EXISTS price_start;
ALTER TABLE cruises_translations_1 DROP COLUMN IF EXISTS from_price;
```

**Remove flow:**
```sql
DELETE FROM directus_operations WHERE flow = '0f17cb08-cde0-4194-badb-f417e980e801';
DELETE FROM directus_flows WHERE id = '0f17cb08-cde0-4194-badb-f417e980e801';
```

Or via UI: Settings → Flows → `[PRICE CALCULATOR] Cruise From Price Selection` → Delete.

---

## Pre-existing Reference: Hotel From Price Flow

| Item | Value |
|------|-------|
| Flow name | `[PRICE CALCULATOR] From Price Selection - 14 April - 04 May` |
| Flow ID | `b7f975e6-8ee2-4b60-af7e-f608839c196b` |
| Trigger collections | `hotels`, `room_prices_translations` |
| Result field | `hotels_translations_1.from_price` → M2O `room_prices` |
| Candidate flags | `room_categories.price_start`, `price_dates.from_price`, `occupancies.from_price` |
