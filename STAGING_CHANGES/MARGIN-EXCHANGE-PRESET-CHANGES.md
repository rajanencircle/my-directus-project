# Staging — Margin & Exchange Rate Preset Flows for Cruises

**Target:** `directus-staging` MCP server **only**.
**Applied:** 2026-06-11
**Type:** Purely additive — new collections, new fields on existing collections, 1 new flow. Nothing modified or deleted.

---

## Goal

Add full margin & exchange rate preset parity for **cruises**, mirroring the existing tours pattern (`33b177da`). When a cruise is created or updated, the flow fills empty `margin_percentage` and `exchange_rate` fields on its `cruises_translations_1` rows from the active preset's per-locale values. If the cruise's destination matches an exception entry in the preset, the exception value is used instead of the global value. Existing non-empty values are never overwritten.

---

## New Collections Created

### 1. `margin_presets_translations_7`
Junction table for cruise global margin defaults (per locale).

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer PK (auto-increment) | hidden |
| `margin_presets_id` | uuid → `margin_presets` | hidden, FK ON DELETE SET NULL |
| `translations_id` | uuid → `translations` | hidden, FK ON DELETE SET NULL |
| `margin` | float | required, min 0, max 100, iconRight: percent |

**Relations created:**
- `margin_presets_translations_7.margin_presets_id` → `margin_presets` (one_field: `cruise_margin_translations`, junction_field: `translations_id`, ON DELETE SET NULL)
- `margin_presets_translations_7.translations_id` → `translations` (ON DELETE SET NULL)

---

### 2. `exchange_rate_presets_translations_5`
Junction table for cruise global exchange rate defaults (per locale).

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer PK (auto-increment) | hidden |
| `exchange_rate_presets_id` | uuid → `exchange_rate_presets` | hidden, FK ON DELETE SET NULL |
| `translations_id` | uuid → `translations` | hidden, FK ON DELETE SET NULL |
| `exchange_rate` | uuid → `rates` | m2o, template: `{{from_currency.code}}=>{{to_currency.code}}@{{rate}}` |

**Relations created:**
- `exchange_rate_presets_translations_5.exchange_rate_presets_id` → `exchange_rate_presets` (one_field: `cruise_exchange_rate_translations`, junction_field: `translations_id`, ON DELETE SET NULL)
- `exchange_rate_presets_translations_5.translations_id` → `translations` (ON DELETE SET NULL)
- `exchange_rate_presets_translations_5.exchange_rate` → `rates` (ON DELETE SET NULL)

---

### 3. `mp_cruise_destination_exceptions`
Per-destination margin overrides for cruise presets.

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer PK (auto-increment) | hidden (auto-created) |
| `sort` | integer | hidden |
| `user_created` / `date_created` / `user_updated` / `date_updated` | system | hidden |
| `exception_destination` | integer → `destinations` | m2o, ON DELETE SET NULL |
| `mp_cruise_destination_exceptions_id` | uuid → `margin_presets` | hidden FK (no DB constraint — integer PK mismatch), ON DELETE CASCADE |
| `exception_margin` | float | min 0, max 100, label: "Exception Margin (%)" |
| `translations` | alias | translations interface (present but non-functional without DB FK fix — see notes) |

**Relations created:**
- `mp_cruise_destination_exceptions.mp_cruise_destination_exceptions_id` → `margin_presets` (one_field: `cruise_destinations`, ON DELETE CASCADE)
- `mp_cruise_destination_exceptions.exception_destination` → `destinations` (ON DELETE SET NULL)

> **Note:** `exception_margin` is stored directly (not per-locale) due to the exception base table having an integer PK. The `translations` alias and `mp_cruise_destination_exceptions_translations` table exist but are not functionally connected (DB FK type mismatch: UUID col vs integer PK). Direct SQL `ALTER TABLE` is needed to fully fix the translations FK. This does not affect the flow, which reads `exception_margin` directly.

---

### 4. `mp_cruise_destination_exceptions_translations`
Created as part of the exception schema but has a column type mismatch (UUID FK → integer PK) that prevents the DB FK. Currently non-functional for the UI translations interface. The flow does not use this table — it reads `exception_margin` directly from `mp_cruise_destination_exceptions`.

**Relations created (partial):**
- `mp_cruise_destination_exceptions_translations.translations_id` → `translations` (ON DELETE CASCADE) ✓
- `mp_cruise_destination_exceptions_translations.mp_cruise_destination_exceptions_id` → `mp_cruise_destination_exceptions` ✗ (type mismatch, no DB FK)

---

### 5. `erp_cruise_destination_exceptions`
Per-destination exchange rate overrides for cruise presets.

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer PK (auto-increment) | hidden |
| `sort` | integer | hidden |
| system fields | — | hidden |
| `exception_destination` | integer → `destinations` | m2o, ON DELETE SET NULL |
| `erp_cruise_destination_exceptions_id` | uuid → `exchange_rate_presets` | hidden FK, ON DELETE CASCADE |
| `exception_exchange_rate` | uuid → `rates` | m2o, template: `{{from_currency.code}}=>{{to_currency.code}}@{{rate}}` |
| `translations` | alias | non-functional (same integer PK mismatch — see note above) |

**Relations created:**
- `erp_cruise_destination_exceptions.erp_cruise_destination_exceptions_id` → `exchange_rate_presets` (one_field: `cruise_destinations`, ON DELETE CASCADE)
- `erp_cruise_destination_exceptions.exception_destination` → `destinations` (ON DELETE SET NULL)
- `erp_cruise_destination_exceptions.exception_exchange_rate` → `rates` (ON DELETE SET NULL)

---

### 6. `erp_cruise_destination_exceptions_translations`
Same situation as `mp_cruise_destination_exceptions_translations` — exists but the parent FK has a type mismatch.

**Relations created (partial):**
- `erp_cruise_destination_exceptions_translations.translations_id` → `translations` (ON DELETE CASCADE) ✓
- `erp_cruise_destination_exceptions_translations.erp_cruise_destination_exceptions_id` → `erp_cruise_destination_exceptions` ✗ (type mismatch)
- `erp_cruise_destination_exceptions_translations.exception_exchange_rate` → `rates` (ON DELETE SET NULL) ✓

---

## New Alias Fields Added to Existing Collections

### `margin_presets` — Cruises group (sort 11, top-level)

| Field | Type | Interface | Group | Sort |
|-------|------|-----------|-------|------|
| `cruises_group` | alias (group-raw) | group-raw | null (top-level) | 11 |
| `accordion-cruise-mp` | alias (group-accordion) | group-accordion | `cruises_group` | 1 |
| `cruises` | alias (group-raw) | group-raw | `accordion-cruise-mp` | 1 |
| `cruise_margin_translations` | alias (translations) | translations | `cruises` | 1 |
| `cruise_destinations` | alias (o2m) | list-o2m | `cruises` | 2 |
| `cruises_other_default_locale` | text | input-multiline, readonly | `cruises` | 3 |
| `trigger_cruises` | alias (flow-triggers-interface) | flow-triggers-interface | `cruises` | 4 |

### `exchange_rate_presets` — Cruises group (sort 11, top-level)

| Field | Type | Interface | Group | Sort |
|-------|------|-----------|-------|------|
| `cruises_group` | alias (group-raw) | group-raw | null (top-level) | 11 |
| `accordion-cruise-erp` | alias (group-accordion) | group-accordion | `cruises_group` | 1 |
| `cruises` | alias (group-raw) | group-raw | `accordion-cruise-erp` | 1 |
| `cruise_exchange_rate_translations` | alias (translations) | translations | `cruises` | 1 |
| `cruise_destinations` | alias (o2m) | list-o2m | `cruises` | 2 |
| `cruises_other_default_locale` | text | input-multiline, readonly | `cruises` | 3 |
| `trigger_cruises` | alias (flow-triggers-interface) | flow-triggers-interface | `cruises` | 4 |

---

## New Flows

### `[Margin & Exchange Preset] Apply to All Cruises` *(manual)*
- **Flow ID:** `f949ff14-e617-49b8-8814-1bb372e69b84`
- **Trigger:** `manual`, collections: `margin_presets`, `exchange_rate_presets`
- **Confirmation:** "Apply margin and exchange rate presets to all cruises (fills empty values only)?"
- **Location:** collection (button shown on preset collection list/detail pages)
- **Async:** true (runs in background)

Applies the active margin and exchange rate presets to **all cruises at once**. For each cruise × locale combination, fills `margin_percentage` and `exchange_rate` on `cruises_translations_1` if the value is currently empty. Uses the same exception logic as the auto flow (first matching destination exception wins over the global per-locale value). Never overwrites existing non-empty values.

**Operation chain:**

| Op key | Op ID | Type | Description |
|--------|-------|------|-------------|
| `read_all_cruises` | `19e065d9` | item-read | All `cruises` with `destinations.destinations_id`, limit -1 |
| `read_margin_preset` | `59f46124` | item-read | All `margin_presets` with `cruise_margin_translations.*` + `cruise_destinations.exception_destination/exception_margin` |
| `read_exchange_preset` | `16fa92fa` | item-read | All `exchange_rate_presets` with `cruise_exchange_rate_translations.*` + `cruise_destinations.exception_destination/exception_exchange_rate` |
| `read_translations` | `b107c518` | item-read | All `translations` (id, code), limit -1 |
| `read_existing` | `edb84564` | item-read | ALL `cruises_translations_1` rows (id, cruises_id, translations_id, margin_percentage, exchange_rate), limit -1 |
| `compute_all` | `29c46c9a` | exec | Script — iterates all cruises × all locales, builds `create[]` and `update[]` payloads (fill-if-empty) |
| `create_rows` | `69d8d886` | item-create | Create new `cruises_translations_1` rows |
| `update_rows` | `8a947628` | item-update | Patch existing `cruises_translations_1` rows |

**Trigger button wiring:**
- `margin_presets.trigger_cruises` → points to this flow (updated from `460a39dd`)
- `exchange_rate_presets.trigger_cruises` → points to this flow (updated from `460a39dd`)

---

### `[Margin & Exchange Preset] Cruise create/update` *(auto event)*
- **Flow ID:** `460a39dd-0ecb-41cf-a75d-6622759dc8dd`
- **Trigger:** `event`, type `action`, scope `items.create + items.update`, collection `cruises`

**Operation chain:**

| Op key | Op ID | Type | Description |
|--------|-------|------|-------------|
| `resolve_key` | `2760608d` | exec | Extract cruise ID from `$trigger.key` / `$trigger.keys[0]` |
| `read_margin_preset` | `9a6f104b` | item-read | All `margin_presets` with `cruise_margin_translations.*` + `cruise_destinations.exception_destination/exception_margin` |
| `read_exchange_preset` | `1dc87d56` | item-read | All `exchange_rate_presets` with `cruise_exchange_rate_translations.*` + `cruise_destinations.exception_destination/exception_exchange_rate` |
| `read_translations` | `92dcbed8` | item-read | All `translations` (id, code), limit -1 |
| `read_cruise` | `ba0ccab4` | item-read | This cruise's `destinations.destinations_id` (m2m) |
| `read_existing` | `91020744` | item-read | Existing `cruises_translations_1` rows for this cruise |
| `compute` | `86d0993c` | exec | Script (see below) |
| `create_rows` | `3f7fb6aa` | item-create | Create new `cruises_translations_1` rows |
| `update_rows` | `e6d569b9` | item-update | Patch existing `cruises_translations_1` rows |

**Compute script logic:**
1. Collect cruise destination IDs from m2m `cruise.destinations[].destinations_id`
2. Find first matching exception in `mp.cruise_destinations` (by `exception_destination` in cruise's destination list)
3. For margin: use `marginExc.exception_margin` if match found, otherwise `marginGlobal[locale].margin`
4. For exchange rate: use `rateExc.exception_exchange_rate` (UUID → rates) if match, otherwise `rateGlobal[locale].exchange_rate`
5. For each locale: fill `margin_percentage` only if currently null/undefined; fill `exchange_rate` only if currently empty
6. Store exchange rate as `{ key: uuid, collection: 'rates' }` (JSON format used by `cruises_translations_1.exchange_rate`)
7. Creates new rows for locales with no existing `cruises_translations_1` row

---

## Known Limitations / TODO

- **Exception translations FK mismatch**: `mp_cruise_destination_exceptions` and `erp_cruise_destination_exceptions` were created with integer serial PKs (default Directus behavior), but their `_translations` junction tables reference them via UUID columns. The DB FK constraint cannot be created (PostgreSQL type mismatch 42804). To fix this properly, run the following SQL directly on the staging DB:

  ```sql
  ALTER TABLE mp_cruise_destination_exceptions_translations
    DROP COLUMN mp_cruise_destination_exceptions_id,
    ADD COLUMN mp_cruise_destination_exceptions_id integer;

  ALTER TABLE erp_cruise_destination_exceptions_translations
    DROP COLUMN erp_cruise_destination_exceptions_id,
    ADD COLUMN erp_cruise_destination_exceptions_id integer;
  ```

  Then re-create the FK relations via the MCP `relations` tool. The flow itself is unaffected since it reads `exception_margin`/`exception_exchange_rate` directly (not through the translations junction).

---

## REVERT PROCEDURE (staging only)

**Revert in this order:**

1. **Delete the flows** (stops the triggers):
   - Flow ID `f949ff14-e617-49b8-8814-1bb372e69b84` — `[Margin & Exchange Preset] Apply to All Cruises`
   - Flow ID `460a39dd-0ecb-41cf-a75d-6622759dc8dd` — `[Margin & Exchange Preset] Cruise create/update`

2. **Delete alias fields from `margin_presets`** (fields tool, action delete):
   - `trigger_cruises`, `cruise_destinations`, `cruise_margin_translations`, `cruises_other_default_locale`, `cruises`, `accordion-cruise-mp`, `cruises_group`

3. **Delete alias fields from `exchange_rate_presets`**:
   - `trigger_cruises`, `cruise_destinations`, `cruise_exchange_rate_translations`, `cruises_other_default_locale`, `cruises`, `accordion-cruise-erp`, `cruises_group`

4. **Drop the 6 new collections** (collections tool, action delete):
   - `mp_cruise_destination_exceptions_translations`
   - `erp_cruise_destination_exceptions_translations`
   - `mp_cruise_destination_exceptions`
   - `erp_cruise_destination_exceptions`
   - `margin_presets_translations_7`
   - `exchange_rate_presets_translations_5`

   > If collection delete is disabled via MCP, drop directly in the DB:
   > ```sql
   > DROP TABLE IF EXISTS mp_cruise_destination_exceptions_translations;
   > DROP TABLE IF EXISTS erp_cruise_destination_exceptions_translations;
   > DROP TABLE IF EXISTS mp_cruise_destination_exceptions;
   > DROP TABLE IF EXISTS erp_cruise_destination_exceptions;
   > DROP TABLE IF EXISTS margin_presets_translations_7;
   > DROP TABLE IF EXISTS exchange_rate_presets_translations_5;
   > ```
   > Also clean up `directus_collections`, `directus_fields`, `directus_relations` for these collections.
