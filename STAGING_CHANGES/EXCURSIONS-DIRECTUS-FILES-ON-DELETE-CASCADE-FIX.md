# Staging Change: excursions_directus_files.excursions_id — on_delete fixed to CASCADE

**Date:** 2026-07-21
**Author:** Claude (via `directus-staging` MCP `relations` tool)
**Collection:** `excursions_directus_files` (M2M junction between `excursions` and `directus_files`)
**Field:** `excursions_id`

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

## Verification

Confirmed via `directus-staging` MCP `relations` `read` after the update —
`schema.on_delete` now returns `"CASCADE"`:

```json
{
  "collection": "excursions_directus_files",
  "field": "excursions_id",
  "related_collection": "excursions",
  "schema": {
    "constraint_name": "excursions_directus_files_excursions_id_foreign",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  }
}
```

---

## How to Revert

Via `directus-staging` MCP `relations` tool, `update` action:

```json
{
  "action": "update",
  "collection": "excursions_directus_files",
  "field": "excursions_id",
  "data": {
    "collection": "excursions_directus_files",
    "field": "excursions_id",
    "related_collection": "excursions",
    "schema": { "on_delete": "NO ACTION" },
    "meta": {
      "many_collection": "excursions_directus_files",
      "many_field": "excursions_id",
      "one_collection": "excursions",
      "one_field": "media",
      "one_collection_field": null,
      "one_allowed_collections": null,
      "junction_field": "directus_files_id",
      "sort_field": null,
      "one_deselect_action": "nullify"
    }
  }
}
```

---

## Scope of Changes

| Change | Type | Applied to staging? |
|---|---|---|
| `excursions_directus_files.excursions_id` FK `on_delete`: `NO ACTION` → `CASCADE` | Schema/relation | Yes |

No data was modified — only the FK behavior for future deletes. Not yet
checked/applied on **dev** or **local** — if the same `NO ACTION` setting
exists there too, it should be fixed the same way for consistency (not done
in this session; only staging was requested).
