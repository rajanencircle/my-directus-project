---
name: directus
description: Use this skill whenever the user asks to do anything with Directus — create or update collections, fields, relations, or flows; manage data in collections; set up automation; explore the schema; or use the directus-local MCP server. Trigger on phrases like "in directus", "create a collection", "add a field", "create a flow", "update the schema", "directus-local", "batch", "geo_location", or any reference to the Directus admin UI at localhost:8055.
version: 1.0.0
allowed-tools:
  - mcp__directus-local__collections
  - mcp__directus-local__fields
  - mcp__directus-local__relations
  - mcp__directus-local__flows
  - mcp__directus-local__operations
  - mcp__directus-local__items
  - mcp__directus-local__schema
  - mcp__directus-local__system-prompt
---

# Directus Skill

## Instance
- **URL:** http://localhost:8055
- **MCP Server:** `directus-local`
- **Version:** Directus 11.12.0
- **Database:** PostgreSQL with PostGIS (geometry fields supported)
- **Admin UI:** http://localhost:8055/admin

---

## Critical Patterns

### 1. Collections: Real Table vs Folder
- `"schema": {}` → creates a real DB table (required for storing data, relations, or fields)
- `"schema": null` → creates a folder/group collection (no DB table — cannot have relations or real fields)
- **Always use `"schema": {}`** unless explicitly creating a UI grouping folder

### 2. Flow Operation Chaining (MANDATORY pattern)
Operations must be created with `resolve: null` first, then linked by UUID, then the flow entry point set:
```
Step 1: Create all operations with resolve: null, reject: null
Step 2: Update each operation's resolve to the next operation's UUID
Step 3: Update flow.operation = first operation UUID (entry point)
```
Never try to set resolve UUIDs at creation time — they reference operations not yet created.

### 3. Translations / Junction Tables
- Real junction table needs `"schema": {}` (NOT null)
- Alias field on parent collection: `type: "alias"`, `special: ["translations"]`
- Two relations required:
  1. `junction.parent_id → parent_collection` with `one_field: "translations"`, `junction_field: "translations_id"`
  2. `junction.translations_id → translations` with `junction_field: "parent_id"`, `on_delete: "CASCADE"`
- Use `_locale` suffix for new junction tables (existing `batch_hotel_translations` is legacy)

### 4. Geometry / Map Fields
- Type: `geometry` with schema `data_type: "geometry(Point, 4326)"`
- Interface: `map`
- Options: `geometryType: "Point"`, `defaultView: {center, zoom, bearing, pitch}`
- PostGIS is available — geometry fields work natively

### 5. Parallel API Calls
Always create independent operations/fields/relations in parallel (single message, multiple tool calls) to maximise speed. Only chain sequentially when one call's UUID is needed by the next.

---

## Known Locales (4 total)
| UUID | Code | Language |
|---|---|---|
| `a66beb5e-af3c-4e47-9c7a-101bd5be1a2a` | de-DE | German (Germany) |
| `a2358e99-f939-4957-9b4f-6b0dcbaadb0c` | en-GB | English (UK) |
| `263b1ac9-aa7a-48f4-b472-b816dfa3d921` | de-CH | German (Switzerland) |
| `fe5d14c3-0051-47a5-97a3-679e05fa3dc9` | nl-NL | Dutch (Belgium) |

---

## Key Collections

### Batch Product Collections (pricing/margins)
| Collection | Junction Table | FK Field |
|---|---|---|
| `batch_hotel` | `batch_hotel_translations` | `batch_hotel_id` |
| `batch_camper` | `batch_camper_locale` | `batch_camper_id` |
| `batch_rental_car` | `batch_rental_car_locale` | `batch_rental_car_id` |
| `batch_round_trip` | `batch_round_trip_locale` | `batch_round_trip_id` |
| `batch_tours` | `batch_tours_locale` | `batch_tours_id` |

Junction table fields: `id` (int PK), `<product>_id` (uuid FK), `translations_id` (uuid FK), `margin` (float), `sell_price` (float, readonly)

**Sell price formula:** `sell_price = roundHalf(buy_price * (1 + margin / 100))`
```js
function roundHalf(val) {
  if (val == null) return null;
  const floored = Math.floor(val);
  return val - floored >= 0.5 ? floored + 1 : floored;
}
```

### Margin Presets (`margin_presets`)
Controls batch pricing. Has per-product destination lists and per-locale margin translations (margin_selected / margin_remaining).

### Geo Location (`geo_location`)
Has address, latitude, longitude, and `point_location` (geometry.Point, map interface).

### Geographic Hierarchy
`destinations` → `regions` → `states` → `countries` → `continent`

---

## Active Flows Reference

### Sell Price Calculation (manual, per-item)
- `[Batch] Calculate Sell Prices - Hotel` — batch_hotel
- `[Batch] Calculate Sell Prices - Camper` — batch_camper
- `[Batch] Calculate Sell Prices - Rental Car` — batch_rental_car
- `[Batch] Calculate Sell Prices - Round Trip` — batch_round_trip
- `[Batch] Calculate Sell Prices - Tours` — batch_tours

### Margin Preset Application (manual, collection-level)
- `[Margin Preset] Apply to Hotels/Campers/Rental Cars/Round Trips/Tours`
- `[Margin Preset] Apply to ALL Products` (master flow, ID: `e839b8cc-d63b-4d46-a1d9-ce4a83873d85`)

### Default Margin Initialization (event: items.create)
- `[Init] Default Margins - Batch Hotel/Camper/Rental Car/Round Trip/Tours`
- Creates locale records with margin=0, sell_price=buy_price for any missing locales

---

## MCP Tool Quick Reference
```
collections → action: "create" | "read" | "update" | "delete", key (for update/delete)
fields      → action: "create" | "read" | "update" | "delete", collection, key (field name for update/delete)
relations   → action: "create" | "read" | "update" | "delete"
flows       → action: "create" | "read" | "update" | "delete", key (UUID)
operations  → action: "create" | "read" | "update" | "delete", key (UUID)
items       → action: "create" | "read" | "update" | "delete", collection, key (for single item)
schema      → action: "read" | "apply" | "snapshot" | "diff"
```

### Flow Operation Types
| Type | Purpose |
|---|---|
| `item-read` | Read one or many items from a collection |
| `item-create` | Create one or many items |
| `item-update` | Update items by key(s) |
| `exec` | Run a Node.js module (`module.exports = async function(data) {...}`) |
| `condition` | Branch on a Directus filter rule |
| `request` | HTTP request to an external URL |
| `trigger` | Trigger another flow |
| `log` | Log a value (debugging) |

---

## Common Recipes

### Create a collection with translations
1. Create main collection (`schema: {}`, accountability: "all")
2. Create junction table (`schema: {}`)
3. Add fields to both (id, FKs, margin, sell_price, etc.)
4. Create relation: junction → parent with `one_field`, `junction_field`
5. Create relation: junction → translations
6. Add alias field on parent: `type: "alias"`, `special: ["translations"]`

### Create a flow with chained operations
1. `flows.create` (trigger, options)
2. Create ALL operations in parallel with `resolve: null`
3. Update each op's `resolve` to the next op's UUID (in parallel where independent)
4. `flows.update(flowId, {operation: firstOpUUID})`

### Read nested relations in a flow
Use dot notation in fields array: `["id", "buy_price", "translations.id", "translations.margin"]`