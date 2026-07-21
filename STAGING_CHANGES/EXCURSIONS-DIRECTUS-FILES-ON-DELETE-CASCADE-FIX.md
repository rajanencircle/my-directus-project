# Staging Change: excursions FK on_delete rules fixed to CASCADE (multiple tables)

> **2026-07-21 update:** the root cause has since been fixed at the source
> on **dev and local** too — see
> [`DEV_CHANGES/EXCURSIONS-ON-DELETE-CASCADE-FIX.md`](../DEV_CHANGES/EXCURSIONS-ON-DELETE-CASCADE-FIX.md).
> Because dev is now fixed, a future dev→staging resync will **no longer
> revert this** — the "reapply after every sync" warning below is now
> historical context for why this had to be patched twice, not a standing
> requirement.

**Date:** 2026-07-21 (initial fix on `excursions_directus_files.excursions_id`),
**reapplied 2026-07-21** after a subsequent dev→staging DB restore (see
[`docs/STAGING-DEV-DATA-SYNC-RUNBOOK.md`](../docs/STAGING-DEV-DATA-SYNC-RUNBOOK.md))
reset it back to `NO ACTION` — the fix lives only in staging's live DB, not
in the dev dump, so **any future restore of a dev dump onto staging will
silently revert this and must be followed by reapplying it.**
**Same day, expanded:** deleting excursions test rows kept failing on
*different* FK constraints one at a time as each was hit — turned out 5
more `excursions_*` child/junction tables had the same `NO ACTION` problem.
All 6 tables are now fixed in one pass (see "Full list of tables fixed"
below).
**Author:** Claude (via `directus-staging` MCP `relations` tool)
**Collections:** `excursions_directus_files`, `excursions_categories`,
`excursions_countries`, `excursions_partner`, `excursions_prices`,
`excursions_travel_categories`

---

## What Changed

`schema.on_delete` for the `excursions_directus_files.excursions_id` foreign
key was changed from `NO ACTION` to `CASCADE`.

```diff
- "on_delete": "NO ACTION"
+ "on_delete": "CASCADE"
```

`on_update` was left as `NO ACTION` (unchanged). The sibling FK on the same
junction table, `directus_files_id`, was already `CASCADE` and was not
touched.

---

## Why

User reported this error when trying to delete old test entries from
`excursions`:

```
delete from "excursions" where "id" in ($1, $2, $3, $4, $5, $6) -
update or delete on table "excursions" violates foreign key constraint
"excursions_directus_files_excursions_id_foreign" on table "excursions_directus_files"
```

Root cause: `excursions_directus_files.excursions_id` was the only M2M
parent-side FK across all product collections set to `NO ACTION`. Every
other product's junction table has a consistent, working `on_delete` rule
on both sides:

| Junction | `directus_files_id` | parent-side FK |
|---|---|---|
| `hotels_directus_files` | `SET NULL` | `SET NULL` |
| `cruises_directus_files` | `CASCADE` | `CASCADE` |
| `tours_directus_files` | `CASCADE` | `CASCADE` |
| `vehicles_directus_files` | `CASCADE` | `CASCADE` |
| `rental_companies_directus_files` | `CASCADE` | `CASCADE` |
| `albums_directus_files` | `SET NULL` | `SET NULL` |
| `excursions_directus_files` (before fix) | `CASCADE` | **`NO ACTION`** |

`NO ACTION` meant any delete of an `excursions` row that still had linked
media junction rows was blocked at the DB level — matched to `CASCADE` (the
tours/cruises/vehicles/rental_companies pattern) so deleting an excursion
now also removes its junction rows to `directus_files`, same as its sibling
collections.

**Note:** this was found while working through the dev→staging data sync
(see [`docs/STAGING-DEV-DATA-SYNC-RUNBOOK.md`](../docs/STAGING-DEV-DATA-SYNC-RUNBOOK.md))
but is an independent, pre-existing schema inconsistency — not something the
sync introduced.

---

## Full list of tables fixed (second pass, same day)

After reapplying the `excursions_directus_files` fix, the same delete kept
failing on a *different* FK each retry — `excursions_categories`, then it
would have hit the others below one at a time. Checked every relation with
`related_collection == 'excursions'` and compared against the equivalent
`tours_*` relations (all `CASCADE`) to find every remaining `NO ACTION`
table in one pass, instead of fixing them one error at a time:

| Table.field | Before | After |
|---|---|---|
| `excursions_directus_files.excursions_id` | `NO ACTION` | `CASCADE` |
| `excursions_categories.excursion_id` | `NO ACTION` | `CASCADE` |
| `excursions_countries.excursions_id` | `NO ACTION` | `CASCADE` |
| `excursions_partner.excursions_id` | `NO ACTION` | `CASCADE` |
| `excursions_prices.excursion_id` | `NO ACTION` | `CASCADE` |
| `excursions_travel_categories.excursions_id` | `NO ACTION` | `CASCADE` |

All matched to the equivalent `tours_*` relation, which is `CASCADE` in
every case (`tours_categories`, `tours_countries`, `tours_partner`,
`tours_prices`, `tours_travel_categories`).

**Not changed (not blocking anything, left alone deliberately):**

- `excursions_price_calculation_translations.excursions_id` — `SET NULL`
- `excursions_price_categories.excursion_id` — `SET NULL`

Both differ from their tours equivalent (`tours_price_calculation_translations`
is `CASCADE`), but `SET NULL` doesn't block a delete — it just leaves the
child row behind with a nulled `excursion_id` instead of removing it. Not
touched per "only fix what's actually broken"; flag to the client if a
fully-consistent tours-pattern match is wanted later.

---

## Verification

Confirmed via `directus-staging` MCP `relations` `read` (both single-field
reads and a full sweep filtered to `related_collection == 'excursions'`) —
all 6 tables now return `"on_delete": "CASCADE"`, and zero relations into
`excursions` remain on `NO ACTION`.

---

## How to Revert

Via `directus-staging` MCP `relations` tool, `update` action, one call per
table. Each needs its own `meta` block (shown here) since `meta` isn't
optional on update:

```json
{ "action": "update", "collection": "excursions_directus_files", "field": "excursions_id",
  "data": { "collection": "excursions_directus_files", "field": "excursions_id",
    "related_collection": "excursions", "schema": { "on_delete": "NO ACTION" },
    "meta": { "many_collection": "excursions_directus_files", "many_field": "excursions_id",
      "one_collection": "excursions", "one_field": "media", "one_collection_field": null,
      "one_allowed_collections": null, "junction_field": "directus_files_id",
      "sort_field": null, "one_deselect_action": "nullify" } } }

{ "action": "update", "collection": "excursions_categories", "field": "excursion_id",
  "data": { "collection": "excursions_categories", "field": "excursion_id",
    "related_collection": "excursions", "schema": { "on_delete": "NO ACTION" },
    "meta": { "many_collection": "excursions_categories", "many_field": "excursion_id",
      "one_collection": "excursions", "one_field": "categories", "one_collection_field": null,
      "one_allowed_collections": null, "junction_field": null,
      "sort_field": "sort", "one_deselect_action": "delete" } } }

{ "action": "update", "collection": "excursions_countries", "field": "excursions_id",
  "data": { "collection": "excursions_countries", "field": "excursions_id",
    "related_collection": "excursions", "schema": { "on_delete": "NO ACTION" },
    "meta": { "many_collection": "excursions_countries", "many_field": "excursions_id",
      "one_collection": "excursions", "one_field": "countries", "one_collection_field": null,
      "one_allowed_collections": null, "junction_field": "countries_id",
      "sort_field": null, "one_deselect_action": "nullify" } } }

{ "action": "update", "collection": "excursions_partner", "field": "excursions_id",
  "data": { "collection": "excursions_partner", "field": "excursions_id",
    "related_collection": "excursions", "schema": { "on_delete": "NO ACTION" },
    "meta": { "many_collection": "excursions_partner", "many_field": "excursions_id",
      "one_collection": "excursions", "one_field": "partner_selected", "one_collection_field": null,
      "one_allowed_collections": null, "junction_field": "partner_id",
      "sort_field": null, "one_deselect_action": "nullify" } } }

{ "action": "update", "collection": "excursions_prices", "field": "excursion_id",
  "data": { "collection": "excursions_prices", "field": "excursion_id",
    "related_collection": "excursions", "schema": { "on_delete": "NO ACTION" },
    "meta": { "many_collection": "excursions_prices", "many_field": "excursion_id",
      "one_collection": "excursions", "one_field": "prices", "one_collection_field": null,
      "one_allowed_collections": null, "junction_field": null,
      "sort_field": null, "one_deselect_action": "nullify" } } }

{ "action": "update", "collection": "excursions_travel_categories", "field": "excursions_id",
  "data": { "collection": "excursions_travel_categories", "field": "excursions_id",
    "related_collection": "excursions", "schema": { "on_delete": "NO ACTION" },
    "meta": { "many_collection": "excursions_travel_categories", "many_field": "excursions_id",
      "one_collection": "excursions", "one_field": "travel_categories", "one_collection_field": null,
      "one_allowed_collections": null, "junction_field": "travel_categories_id",
      "sort_field": null, "one_deselect_action": "nullify" } } }
```

---

## Scope of Changes

| Change | Type | Applied to staging? |
|---|---|---|
| `excursions_directus_files.excursions_id` FK `on_delete`: `NO ACTION` → `CASCADE` | Schema/relation | Yes |
| `excursions_categories.excursion_id` FK `on_delete`: `NO ACTION` → `CASCADE` | Schema/relation | Yes |
| `excursions_countries.excursions_id` FK `on_delete`: `NO ACTION` → `CASCADE` | Schema/relation | Yes |
| `excursions_partner.excursions_id` FK `on_delete`: `NO ACTION` → `CASCADE` | Schema/relation | Yes |
| `excursions_prices.excursion_id` FK `on_delete`: `NO ACTION` → `CASCADE` | Schema/relation | Yes |
| `excursions_travel_categories.excursions_id` FK `on_delete`: `NO ACTION` → `CASCADE` | Schema/relation | Yes |

No data was modified — only the FK behavior for future deletes. Not yet
checked/applied on **dev** or **local** — if the same `NO ACTION` setting
exists there too, it should be fixed the same way for consistency (not done
in this session; only staging was requested).

**Reminder:** like the first fix, all 6 of these live only in staging's DB.
A future dev→staging restore (per the sync runbook) will reset all of them
back to `NO ACTION`, not just the first one — reapply the full set of 6,
not just `excursions_directus_files`.
