# Fix `excursions_*` FK `on_delete` rules — `NO ACTION` → `CASCADE`

**Target:** `directus-dev` and `directus-local` (source of the bug).
**Applied:** 2026-07-21
**Type:** Schema/relation change only. No data modified.
**Also applied to:** `directus-staging` (inherits schema from dev via the
dev→staging data sync) — see
[`STAGING_CHANGES/EXCURSIONS-DIRECTUS-FILES-ON-DELETE-CASCADE-FIX.md`](../STAGING_CHANGES/EXCURSIONS-DIRECTUS-FILES-ON-DELETE-CASCADE-FIX.md).

---

## Why

Deleting `excursions` items failed repeatedly with FK violations, one
constraint at a time as each was hit:

```
delete from "excursions" where "id" in (...) - update or delete on table
"excursions" violates foreign key constraint
"excursions_directus_files_excursions_id_foreign" on table "excursions_directus_files"
```
then, after fixing that one:
```
... violates foreign key constraint "excursions_categories_excursion_id_foreign"
on table "excursions_categories"
```

Traced to the root cause on **dev** (not just staging): 6 child/junction
tables under `excursions` have their parent-side FK set to `NO ACTION`,
while every equivalent `tours_*` table (the closer reference pattern for
this collection) is consistently `CASCADE`. This was first patched directly
on staging as a stopgap, but staging inherits its schema from dev on every
resync (see
[`docs/STAGING-DEV-DATA-SYNC-RUNBOOK.md`](../docs/STAGING-DEV-DATA-SYNC-RUNBOOK.md)),
so the stopgap kept silently reverting. Fixing it at the source (dev) —
and on local, which had the identical bug — means it no longer needs to be
reapplied after every sync.

---

## What Changed

`schema.on_delete` changed from `NO ACTION` to `CASCADE` on both `directus-dev`
and `directus-local`, for the parent-side FK of these 6 tables:

| Table | Field | Before | After |
|---|---|---|---|
| `excursions_directus_files` | `excursions_id` | `NO ACTION` | `CASCADE` |
| `excursions_categories` | `excursion_id` | `NO ACTION` | `CASCADE` |
| `excursions_countries` | `excursions_id` | `NO ACTION` | `CASCADE` |
| `excursions_partner` | `excursions_id` | `NO ACTION` | `CASCADE` |
| `excursions_prices` | `excursion_id` | `NO ACTION` | `CASCADE` |
| `excursions_travel_categories` | `excursions_id` | `NO ACTION` | `CASCADE` |

`on_update` (`NO ACTION`) was left unchanged on all 6 — only `on_delete` was
touched.

Confirmed via `directus-dev`/`directus-local` MCP `relations` `read`, full
sweep filtered to `related_collection == 'excursions'`: zero relations
remain on `NO ACTION` on either environment.

---

## Not Changed (deliberately)

- `excursions_price_calculation_translations.excursions_id` — `SET NULL`
- `excursions_price_categories.excursion_id` — `SET NULL`

Both differ from their `tours_*` equivalent (`CASCADE`), but `SET NULL`
doesn't block a delete — it just leaves the child row behind with a nulled
FK instead of removing it. Left alone since nothing was reported broken by
this; revisit only if the client wants full parity with the tours pattern.

---

## How to Revert

Via the `directus-dev` / `directus-local` MCP `relations` tool, `update`
action, one call per table (same shape used to apply the fix, `meta` is
required on update). See the "How to Revert" section in
[`STAGING_CHANGES/EXCURSIONS-DIRECTUS-FILES-ON-DELETE-CASCADE-FIX.md`](../STAGING_CHANGES/EXCURSIONS-DIRECTUS-FILES-ON-DELETE-CASCADE-FIX.md)
for the exact JSON payloads (identical shape, just swap the target MCP
server to `directus-dev`/`directus-local` and set `schema.on_delete` back to
`"NO ACTION"`).

---

## Scope of Changes

| Change | Type | dev | local | staging |
|---|---|---|---|---|
| 6× `excursions_*` FK `on_delete` → `CASCADE` | Schema/relation | Yes | Yes | Yes (applied earlier same day, see staging tracker) |

No item data was modified on any environment — this only changes what
happens automatically when an `excursions` row is deleted going forward.
