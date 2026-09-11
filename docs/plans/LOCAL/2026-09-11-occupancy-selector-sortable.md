# Occupancy Selector: Sortable "Selected" Pane (Drag & Drop)

## Ticket

**ClickUp: "Occupancy selection order cannot be rearranged"**

> DESC: Praktisch die Auswahl per Klick; die getroffene Auswahl erscheint unter SELECTED aber genau in der Klick-Folge und die Reihenfolge kann anscheinend nicht mehr geändert werden?
>
> Client reply: this could be a problem: currently the order of occupancies cannot be changed after creation. If editors enter prices and then realize they made a mistake, they have to delete the occupancies and start new. Can we make the occupancy sortable?

Ask: update `directus-extension-interface-occupancy-selector` to let editors drag-and-drop reorder the "Selected" pane, and add an interface option to pick which field on the junction collection holds the sort order.

**Scope:** LOCAL-ONLY code change to the extension source. No MCP/schema/data changes on any Directus environment (local/dev/staging/main) are needed or planned — see findings below, the sort columns already exist everywhere this interface is used.

## Extension analysed

`directus/extensions/directus-extension-interface-occupancy-selector/` — a custom two-pane M2M interface (`src/interface.vue`, `src/index.ts`). It replaces the native `list-m2m`/`selection` interfaces for occupancy-style pickers across four products. Key facts from reading the code:

- It resolves its own junction collection/related collection at runtime via `useRelationsStore()` (`resolveJunctionInfo()`), not from options — so it already knows the junction table name (`junctionCollection`) at runtime.
- Selection state lives in `selectedGroupMap` (a `Map`), built once from `fetchSavedSelection()` (which queries the junction collection filtered by parent ID, **fields: `["id", relatedKey]` only — the junction's sort column is never fetched**) and mutated by `selectEntry`/`deselectEntry`/`toggleFromPrice`.
- Render order for the "Selected" pane (`selectedGroupStates`) is simply `Array.from(selectedGroupMap.value.values())` — i.e. **whatever order the junction rows came back from the API in** (effectively primary-key/insertion order, since no `sort` param is passed to the GET), not any deliberate order. This matches the screenshot and the bug report exactly.
- `emitDiffFromMap()` only ever emits `{ create, update: [], delete }` — `update` is hardcoded empty. There is no code path that would ever persist a reordering even if the UI allowed one.
- There is no drag-and-drop affordance in the template at all (`v-for` over `selectedGroupStates`, no draggable wrapper, no drag handle icon).

Conclusion: this is not a bug in existing sort logic — the interface never implemented ordering. The fix is net-new: read the junction sort field, order by it, add drag-and-drop, and write updated sort values back through the `update` array that already exists in the `input` event contract (the parent form's `useRelationMultiple`-equivalent consumer already knows how to apply `create/update/delete`, since that's the standard Directus M2M interface-value shape).

## Schema/relations verified via `directus-local` MCP (read-only)

Checked every collection that uses this interface pattern (`*_occupancies_selected`-style junctions plus the hotels/tours/cruises/excursions equivalents):

| Product | Junction collection | Junction already has `sort` column? | Relation `meta.sort_field` (on the parent→junction relation) already set? |
|---|---|---|---|
| Hotels | `hotels_occupancies` | ✅ yes | ✅ `"sort"` (relation `one_field: "room_occupancies"`) |
| Tours | `tours_occupancies_selected` | ✅ yes | ✅ `"sort"` (relation `one_field: "occupancies"`) |
| Cruises | `cruises_occupancies_selected` | ✅ yes | ✅ `"sort"` (relation `one_field: "occupancies"`) |
| Excursions | `excursions_price_categories_selected` | ✅ yes | ✅ `"sort"` (relation `one_field: "price_categories"`) |

**Important finding:** every junction this interface is used against already has a working `sort` integer column, and Directus' own relations metadata already has `sort_field: "sort"` configured on each. This is exactly the setup Directus' native `list-m2m` interface would use to enable drag-and-drop automatically. Nothing is missing or misconfigured on the schema/relations side — **the custom interface simply never reads or writes it.** This confirms: no `fields`/`relations`/`collections` MCP writes are needed on local, dev, staging, or main. Pure extension-code fix.

## Native Directus reference read

Read `directus-main/app/src/interfaces/list-m2m/list-m2m.vue` (per CLAUDE.md convention — replicate native patterns from source, don't guess) to see how Directus' own M2M interface handles this:

- `allowDrag` is only true when a sort field exists (`relationInfo.sortField !== undefined`).
- Reordering (`sortItems()`) re-numbers every visible item in the new order (`sortField: index + 1`) and calls its generic `update()` — which, for **already-persisted** junction rows, stages a partial update `{ [junctionPkField]: id, [sortField]: newIndex }`, and for **not-yet-saved** rows (still only a local `create` entry), mutates that pending create payload's sort value directly instead of emitting a separate update.
- Drag-and-drop itself uses `vuedraggable` (`Draggable` component, `handle=".drag-handle"`).

This is the same shape of fix I'll apply, adapted to this custom interface's own state model (`selectedGroupMap`, `emitDiffFromMap`) instead of `useRelationMultiple`.

`vuedraggable` (`^4.1.0`) is already a `devDependency` in this repo's `directus-extension-flow-manager` and used in `media-bundle`'s `MediaGrid.vue`, so adding it here follows an existing, proven convention rather than introducing a new library.

## Plan

### 1. New interface option: `sortField`

In `src/index.ts`, add one new option (same style/pattern as the existing `groupFields`/`fromPriceField` plain-text options — per CLAUDE.md, these interfaces are driven entirely by `meta.options`, never hardcoded collection/field names):

```ts
{
  field: 'sortField',
  name: 'Sort Field (Junction)',
  type: 'string',
  meta: {
    width: 'half',
    interface: 'input',
    note: 'Field on the junction collection that stores the manual sort order for the Selected pane. Leave empty to auto-detect from the relation, falling back to "sort".',
    options: { placeholder: 'sort' },
  },
  schema: { default_value: 'sort' },
},
```

Also add a companion boolean option `sortable` (default `true`, width `half`) so the drag-and-drop UI can be turned off per-field if ever needed without removing the option — matches the "don't hardcode, make it configurable per the existing options pattern" convention.

### 2. `interface.vue` changes

**a. Resolve the sort field name**
- New prop `sortField?: string` (default `''`).
- In `resolveJunctionInfo()`, after resolving `junctionRel`, also read `junctionRel.meta.sort_field` as an auto-detected fallback (mirrors native `list-m2m`'s `relationInfo.sortField`).
- Effective sort field = `props.sortField || junctionRel.meta.sort_field || 'sort'`. Store in a new ref `resolvedSortField`.

**b. Fetch and respect existing order**
- `fetchSavedSelection()`: add the resolved sort field to the `fields` param (`["id", resolvedRelatedKey.value, resolvedSortField.value]`) and add `sort: [resolvedSortField.value]` to the query params, so `savedJunctionRows` comes back pre-ordered.
- `initSelectedFromIds(ids)` already iterates `ids` in array order and inserts into the `Map` in that order — since `ids` will now be derived from a sorted `rows` array, the `Map`'s insertion order (which JS guarantees is iteration order) will match, so `selectedGroupStates` renders correctly ordered with **no change needed** to the state model itself. This is the key reason a `Map` was already a reasonable choice here.

**c. New selections append at the end (already true)** — `selectEntry` already does `next.set(entry.key, ...)` on a copy of the existing map, and `Map.set` for a new key appends at the end of iteration order. No change needed here.

**d. Reordering**
- New function `reorderSelected(newOrderKeys: string[])`: rebuild `selectedGroupMap` as a fresh `Map`, re-inserting existing `SelectedGroupState` values in `newOrderKeys` order, then call `emitDiffFromMap(next)`.
- Wire up `vuedraggable` in the template around the "Selected" pane's `v-for`, `handle=".drag-handle"`, disabled when `!props.sortable` or fewer than 2 selected items. On `@update:model-value`/`@end`, compute the new key order from the dragged array and call `reorderSelected()`.
- Add a small drag-handle icon (`v-icon name="drag_indicator"`) to each selected row, left of the label, visible only when sortable.

**e. Persist sort values through the existing `create/update/delete` contract**
- `emitDiffFromMap()` currently hardcodes `update: []`. Change it to compute, for the current map iteration order (`index` = new sort value):
  - `create`: for newly-selected items not in `savedJunctionRows`, include the sort field in the payload: `{ [rk]: id, [resolvedSortField.value]: index }` (previously just `{ [rk]: id }`).
  - `update`: for items that **are** in `savedJunctionRows` (persisted rows) whose current index differs from their last-known persisted sort value, emit `{ id: junctionRowId, [resolvedSortField.value]: index }`. Track each row's last-known sort value from the fetched `savedJunctionRows` (already fetched in (b)) to avoid emitting no-op updates when nothing moved.
- This reuses the exact `{ create, update, delete }` shape the surrounding Directus form already expects from an `alias`/`m2m` interface's `input` event — no changes needed outside this extension.

**f. Backward compatibility**
- If `resolvedSortField` can't be resolved at all (custom/future collection with no sort column), fall back to current behavior (no drag handle rendered, `update` stays empty) rather than erroring — checked via `isRelationalField`-style guard (verify the field actually exists in a sample junction row / relation meta before enabling drag).

### 3. `package.json`

- Add `vuedraggable: ^4.1.0` (devDependency, matching `directus-extension-flow-manager`'s version pin) and bump `vue` devDependency range to match if needed for the import to work with the SDK's Vue instance (flow-manager pins `vue: ^3.4.26`; current file pins `^3.3.0` — will verify at implementation time whether a bump is actually required or the existing range already resolves fine).
- Bump extension `version` in `package.json` (currently `1.1.0` → `1.2.0`) per semantic versioning for a new feature.

### 4. Build & manual verification (local only)

- `npm install` + `npm run build` inside the extension folder.
- Restart/reload the local Directus container so the rebuilt `dist/index.js` is picked up.
- Manually test on **all four** products that use this interface (hotels room occupancy, tours occupancies, cruises occupancies, excursions price categories) since each has its own junction/relation — per CLAUDE.md rule #2 (touch only what's named, but verify the shared component doesn't regress any of its consumers):
  1. Select 3+ items, confirm click-order still works as today.
  2. Drag to reorder, save the item, reload the page, confirm order persisted (i.e. `sort` column values updated correctly in each junction table via the `directus-local` MCP `items` tool, read-only check).
  3. Confirm the existing "from price" toggle and group-exclusion logic are unaffected.
  4. Confirm the currently-untouched `groupFields`/`fromPriceField`/label options on each of the four fields' existing configs keep working (no options were removed, only added).

### 5. Documentation

- This plan file.
- After implementation, log the concrete diff (files touched, before/after option list, version bump) in `docs/changes/LOCAL/2026-09-11-occupancy-selector-sortable.md`, per repo convention for local extension changes (separate from `STAGING_CHANGES/`, since nothing is touched on staging).

## Explicitly out of scope

- No changes to `dev`, `staging`, or `main` Directus instances (schema, data, or deployed extension build) — this stays local until the user asks for promotion.
- No changes to other interfaces/extensions.
- No changes to the four products' field configuration (`meta.options` on the actual `hotels.room_occupancies` / `tours.occupancies` / `cruises.occupancies` / `excursions.price_categories` fields) beyond what's needed to pick up the new `sortField`/`sortable` options — and even that can default correctly (`sort_field` auto-detected from the relation) so **no field-config edits should be strictly required**, only confirmed working with defaults.
