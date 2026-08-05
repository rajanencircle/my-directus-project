# Can't delete an excursion — `excursions_routes` FK blocks it (and the same class of bug exists elsewhere)

**Ticket:** Deleting a stray test record (`excursions` id 567, staging) fails with:
`update or delete on table "excursions" violates foreign key constraint "excursions_routes_excursions_id_foreign" on table "excursions_routes"`
**Date:** 2026-08-05

---

## Root cause

`excursions_routes.excursions_id` — the FK backing the `excursions.travel_routes` O2M repeater field — is defined with:

```
on_update: NO ACTION
on_delete: NO ACTION
```

`NO ACTION` is Postgres's default when a relation is created without an explicit `on_delete`. Every *other* O2M "owned child" table under `excursions` (categories, price_periods, surcharges, prices, plus the M2M junctions) is correctly set to `CASCADE`. `excursions_routes` is the one relation where that default was never overridden, so deleting any excursions row that has ≥1 route row fails outright instead of cleaning up its children.

This is not `excursions`-specific — it's a pattern that slipped in whenever a new repeater child table was added by hand. Auditing every O2M child across `hotels`, `tours`, `cruises`, and `excursions` in `directus-dev` turned up the same class of oversight in five places total:

| Table | FK column | Current `on_delete` | Should be | Blocks delete today? |
|---|---|---|---|---|
| `excursions_routes` | `excursions_id` | **NO ACTION** | `CASCADE` | **Yes — this is the reported bug** |
| `excursions_dates` | `excursions_id` | `SET NULL` | `CASCADE` | No, but orphans rows (parent id nulled, row never cleaned up) |
| `excursions_price_categories` | `excursion_id` | `SET NULL` | `CASCADE` | No, but orphans rows |
| `tours_routes` | `tours_id` | `SET NULL` | `CASCADE` | No, but orphans rows |
| `room_prices` | `hotel_id` | `SET NULL` | `CASCADE` | No, but orphans rows |

Everything else checked (`cruises_*` children, `tours_categories/prices/surcharges/occupancies/price_periods/dates`, `hotels`' `surcharges`/`price_dates`/`room_categories`/`hotels_surcharges`) already correctly uses `CASCADE` on the parent-id FK. So this isn't a systemic "the whole schema is wrong" problem — it's a handful of tables where the on_delete was left at the Postgres default or set to the wrong non-default value when the table was created, and nothing since has caught it.

`excursions_routes` is the only one that actively **blocks deletes** (true `NO ACTION`). The other four use `SET NULL`, which lets the delete through but silently leaves orphaned rows behind (a `tours_routes` row with `tours_id = null`, forever) — a slower-burning version of the same mistake, and worth fixing at the same time rather than waiting for the next support ticket.

## Why this matters beyond the one stray record

- Every one of these tables has `sort_field` set and is exposed as a `list-o2m` repeater on the parent (`meta.one_field`) — i.e. Directus/the team's own convention treats these rows as *owned* by the parent, not independent entities. `CASCADE` is the correct semantics for "owned child," matching every sibling table that already has it right.
- Until fixed, **any** attempt to delete an excursion that has route data (not just test records — any real excursion with a "travel route" repeater filled in) will hit this same FK error in the Directus UI or API, in both dev and staging (same schema).
- No data-loss risk in fixing it: cascading a route/date/price-category/room-price row when its parent excursion/tour/hotel is deleted is exactly what would already happen for every sibling repeater table.

## Recommended fix

1. **Relation-level change** (via `relations` tool, `action: update`, since only `schema.on_delete`/`meta` are mutable post-creation) for each of the 5 rows above:
   - `excursions_routes.excursions_id`: `schema.on_delete` → `CASCADE`; also align `meta.one_deselect_action` from `"nullify"` to `"delete"` to match every other CASCADE sibling's metadata.
   - `excursions_dates.excursions_id`, `excursions_price_categories.excursion_id`, `tours_routes.tours_id`, `room_prices.hotel_id`: same two changes.
2. **Apply in `directus-dev` first**, verify by deleting a throwaway parent row with children in each of the 5 tables, then confirm no FK error and children are gone.
3. **Port the same relation changes to `directus-staging`** (and `directus-main` if/when it exists) — this is a schema-only change, no data migration needed, safe to apply directly.
4. **Then** retry deleting the original stray test record, `excursions` id 567, in staging.

## Process recommendation (to avoid the next occurrence)

Whenever a new O2M repeater child table is added under any product collection (hotels/tours/cruises/excursions/vehicles), explicitly set `schema.on_delete: "CASCADE"` and `meta.one_deselect_action: "delete"` on the parent-id relation at creation time — don't rely on the Directus UI default or a bare `relations.create` call without `schema`. Consider a short periodic audit (a one-off script hitting `directus-dev`'s relations for every collection whose name matches a known product prefix, flagging any parent-id FK that isn't `CASCADE`) so a similar gap doesn't sit unnoticed until the next delete attempt fails in production.

## Status

**Plan only — no schema changes applied yet.** Awaiting go-ahead to apply the 5 relation updates in `directus-dev`, verify, then port to `directus-staging`.
