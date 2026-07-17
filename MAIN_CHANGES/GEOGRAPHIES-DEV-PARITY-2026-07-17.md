# Main (Production) — Geographies Collection Group: Dev Parity

**Target:** `directus-main` MCP server **only**. `directus-dev` was read-only reference throughout — never modified.
**Applied:** 2026-07-17
**Type:** Field deletions (with data backup below), one field addition + 2,695-row data backfill + nullability fix, and a field deletion completing a structural migration.
**Context:** Full field-by-field comparison of the "Geographies" collection group (`countries`, `destinations`, `destinations_cluster`, `locations_tour32`, `places`, `regions`, `states`) against dev found main to be the most out of sync of the two non-dev environments. This document records every change applied to main so it now matches dev's schema exactly for this group.
**Note on delete permission:** the `directus-main` MCP `fields` tool initially rejected delete actions (`Delete actions are disabled`). The user enabled delete permission mid-task to allow the field deletions below; per project convention, assume this permission reverts to disabled after this task.

---

## 1. `destinations.short_code` — extra field deleted (not present in dev or staging)

**Backed-up data before deletion** (14 rows, `id` = `destinations.id`, continent-style codes):

| id | short_code |
|----|-----------|
| 1  | AF |
| 2  | AN |
| 3  | AR |
| 4  | AS |
| 5  | AU |
| 6  | CB |
| 7  | CA |
| 8  | EU |
| 9  | IO |
| 10 | ME |
| 11 | NZ |
| 12 | NA |
| 13 | SA |
| 14 | SP |

- **`short_code`** — type `string`, interface `input`, no group. Deleted via `fields` `delete` action, per explicit user instruction after data was reviewed and backed up above.

**Revert path:** re-add `short_code` as `string`/`input` on `destinations`, then restore values from the table above via `items` `update` keyed by `id`.

## 2. `destinations_cluster` — 2 extra fields deleted (not present in dev)

Identical data to what was found on staging (see `STAGING_CHANGES/GEOGRAPHIES-DEV-PARITY-2026-07-17.md`, section 1) — same 7 rows, same values, confirmed cross-environment before deletion.

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

**Revert path:** re-add both fields as `string`/`input`, then restore values from the table above via `items` `update` keyed by `id`.

## 3. `locations_tour32` — structural migration to match dev (add `name`, backfill, drop `translations`)

Main still used the old translated-junction model (`locations_tour32_translations`, 2,695 rows, 1:1 with `locations_tour32`) that dev had already migrated away from (dev stores `name` directly, per dev's field note: "migrated from the former de-DE-only translations junction").

Steps taken:
1. Added `name` field (`string`, `input` interface, group `section_name`, translations for de-DE/en-GB/nl-NL, note copied verbatim from dev) to `locations_tour32` on main — initially **nullable**, since the column couldn't be added `NOT NULL` on a populated table without a backfill first.
2. Backfilled all **2,695 rows** via `migration/sync-collection-data.js` (`SOURCE_ENV: dev`, `TARGET_ENV: main`, `COLLECTION: locations_tour32`, `FIELDS: ["name"]`, `SELECTOR: {mode: "all"}`, `CREATE_IF_MISSING: false`, `CONFIRM_MAIN: true`) — matched by `id` (same PK numbering in both environments).
   - Dry run performed first and reviewed before the live run.
   - Dev has 2,716 `locations_tour32` rows vs main's 2,695 — the 21 dev-only rows (ids 2696–2716) were correctly skipped (`CREATE_IF_MISSING: false`), **not** created on main. This is a separate data-parity gap, not addressed here (see "Not touched" below).
   - Verified after: `name IS NULL` count = 0 across all 2,695 rows on main.
3. Set `name` field schema `is_nullable` → `false` (matching dev's `NOT NULL` constraint), now safe since all rows are populated.
4. Deleted the `translations` alias field from `locations_tour32` on main. The underlying `locations_tour32_translations` junction collection/table was **left in place** (not dropped), per explicit user instruction — it's now unused/orphaned but still holds its original 2,695 rows.

**Revert path:**
- Re-add `translations` field (`alias`/`translations` special, `interface: translations`) and its relation (`locations_tour32_translations.locations_tour32_id` → `locations_tour32`, junction field `translations_id` → `translations`) — relation details in `locations_tour32_translations` (unchanged, still present).
- Delete `name` field from `locations_tour32` (junction data is untouched, so no data is lost by this revert).

## Not touched (out of scope / flagged only)

- **21-row data gap**: dev has 2,716 `locations_tour32` rows vs main's 2,695 (same gap as staging). Not addressed — this is item-level data reconciliation, not schema/field parity, which was the scope of this task.
- `countries`, `places`, `regions`, `states` — already matched dev exactly, no changes needed.
