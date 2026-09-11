# Occupancy Selector: Sortable "Selected" Pane — Implementation Log

Implements the plan in [`docs/plans/LOCAL/2026-09-11-occupancy-selector-sortable.md`](../../plans/LOCAL/2026-09-11-occupancy-selector-sortable.md). LOCAL-ONLY. No changes made on dev/staging/main.

## Files changed

`directus/extensions/directus-extension-interface-occupancy-selector/`

- **`src/index.ts`** — added two new interface options:
  - `sortable` (boolean, default `true`) — toggles drag-and-drop on/off per field.
  - `sortField` (string, default `sort`) — junction-collection field to store manual order; empty = auto-detect from the relation.
- **`src/interface.vue`**
  - Imported `vuedraggable` (`Draggable`).
  - New props `sortable` / `sortField`, new refs `resolvedSortField`, `lastKnownSort`.
  - `resolveJunctionInfo()` now also resolves `resolvedSortField` = `props.sortField || relation.meta.sort_field || 'sort'`.
  - `fetchSavedSelection()` now requests the sort field and passes `sort: [resolvedSortField]` to the junction query, so `savedJunctionRows`/`selectedGroupMap` come back in persisted order; also records each row's last-known sort value in `lastKnownSort` (used to avoid emitting no-op updates).
  - `emitDiffFromMap()` — previously hardcoded `update: []`. Now walks the selection in current order and:
    - includes the sort index on every `create` payload,
    - emits `update: [{ id, [sortField]: index }]` for existing junction rows whose position changed.
  - New `reorderSelected(newOrderKeys)` + `draggableEntries` computed wire a `Draggable` list around the Selected pane (`handle=".drag-handle"`), with a small drag-indicator icon per row (shown only when `canReorder` — i.e. `sortable !== false` and a sort field was resolved).
  - Added `.drag-handle` / `.sortable-ghost` styles.
- **`package.json`** — added `vuedraggable: ^4.1.0` (devDependency, same version pin as `directus-extension-flow-manager`); version bumped `1.1.0` → `1.2.0`.

## Schema/data changes

**None.** Verified via `directus-local` MCP before implementing: `hotels_occupancies`, `tours_occupancies_selected`, `cruises_occupancies_selected`, and `excursions_price_categories_selected` already had a `sort` integer column and the corresponding parent→junction relation already had `meta.sort_field: "sort"` set. The bug was purely that the custom interface never read/wrote it. No `fields`/`relations`/`collections` MCP calls were made.

## Build & deploy (local only)

```bash
cd directus/extensions/directus-extension-interface-occupancy-selector
npm install   # pulled in vuedraggable
npm run build # directus-extension build — succeeded
```

Restarted the local Directus container (`docker compose restart directus`) to reload the rebuilt `dist/index.js`. Startup log confirms `directus-extension-interface-occupancy-selector` loaded cleanly alongside the other extensions, no errors.

## Manual verification (browser, local instance)

1. **Tours** (`tours` id `2468`, field `occupancies` → junction `tours_occupancies_selected`):
   - Before: junction rows had `sort: null` for both selected occupancies ("1 Pers." id 2704, "2 Pers." id 2705).
   - Dragged "2 Pers." above "1 Pers." in the UI, saved the item → toast confirmed "Item Updated".
   - Verified via `items` MCP read: `tours_occupancies_selected` rows now have `{id: 2705, sort: 0}`, `{id: 2704, sort: 1}` — matches the dragged order exactly.
   - Reloaded the item in the browser → "2 Pers." rendered first, "1 Pers." second, confirming the read path (fetch + sort) round-trips correctly.
2. **Hotels** (`hotels` id `3e0c0daf-e423-4ba6-a3e1-e62ef5a7ad32`, field `room_occupancies` → junction `hotels_occupancies` — this is the exact "ROOM OCCUPANCY" field from the original ClickUp screenshot): confirmed the field renders with drag handles on both selected rows, and the "from price" toggle + remove icon are still present and functional. Network tab shows the interface's junction fetch now includes `fields[]=sort&sort[]=sort`.
3. Checked browser console/network for errors: the only errors were unrelated `403`s on a `directus_files` asset thumbnail (pre-existing permissions issue, unrelated to this interface).
4. Did not repeat the full drag+save+reload cycle on Cruises/Excursions individually (same shared component, same code path, same verified relation shape — `cruises_occupancies_selected` / `excursions_price_categories_selected` both already confirmed to have `sort_field: "sort"` during planning) — flagged here in case the user wants that extra check before promoting to dev/staging.

## Not done / explicitly deferred

- No promotion to `dev`, `staging`, or `main` — per instruction, this stays local until requested.
- No field-level `meta.options` changes were made on the actual `hotels.room_occupancies` / `tours.occupancies` / `cruises.occupancies` / `excursions.price_categories` fields — the new `sortField`/`sortable` options default correctly (auto-detect) so no field reconfiguration was needed for this to work.
