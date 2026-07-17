# Staging — Geographies Collection Group: Dev Parity

**Target:** `directus-staging` MCP server **only**. `directus-dev` was read-only reference throughout — never modified.
**Applied:** 2026-07-17
**Type:** Field deletions (with data backup below) + one schema-level nullability fix. No structural/data migration needed on staging — `locations_tour32.name` already existed here from a prior migration (see `TOURS-EXCURSIONS-HOTELS-DEV-PARITY-SCHEMA-ALIGNMENT.md`, section 5).
**Context:** Full field-by-field comparison of the "Geographies" collection group (`countries`, `destinations`, `destinations_cluster`, `locations_tour32`, `places`, `regions`, `states`) against dev found 2 collections with extra/mismatched fields on staging. This document records the fixes applied so staging now matches dev's schema exactly for this group.

---

## 1. `destinations_cluster` — 2 extra fields deleted (not present in dev)

Both fields existed on staging with real, identical data to what was also found on main (see `MAIN_CHANGES/GEOGRAPHIES-DEV-PARITY-2026-07-17.md`). Confirmed dev never had these fields — deleted per explicit user instruction, after confirming/backing up the data below.

**Backed-up data before deletion** (7 rows, `id` = `destinations_cluster.id`):

| id | short_code | ISO_alpha_3_code |
|----|-----------|------------------|
| 7  | null      | null             |
| 1  | AF        | FFF              |
| 2  | AS        | ABB              |
| 3  | IO        | IOC              |
| 4  | LA        | SRR              |
| 5  | NA        | NNN              |
| 6  | OC        | UUU              |

- **`short_code`** — type `string`, interface `input`. Deleted via `fields` `delete` action.
- **`ISO_alpha_3_code`** — type `string`, interface `input`. Deleted via `fields` `delete` action.

**Revert path:** re-add both fields as `string`/`input` (no group, matching main's pre-deletion definition), then restore values from the table above via `items` `update` keyed by `id`.

## 2. `locations_tour32.name` — nullability fix

Dev enforces `NOT NULL` at the DB level on `name` (schema `is_nullable: false`); staging had the field but as nullable (`is_nullable: true`), even though `meta.required: true` was already set at the UI level and all 2,695 existing rows already had non-null values (verified via `name IS NULL` count = 0 before the change).

- Changed `locations_tour32.name` schema `is_nullable` → `false` via `fields` `update` action. No data affected.

**Revert path:** `fields` `update` on `locations_tour32.name`, set `schema.is_nullable` back to `true`.

## Not touched (out of scope / flagged only)

- `locations_tour32` has 2,695 rows on staging vs 2,716 on dev — a 21-row **data** gap (dev has additional Tour32 locations not yet present on staging), unrelated to schema/fields. Not addressed here since the task was schema parity, not full data reconciliation.
- `countries`, `places`, `regions`, `states` — already matched dev exactly, no changes needed.
