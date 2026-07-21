# Tours: Check input mask — Changes

## "Last Update" & "by" fields — Repositioned in `section_publication`

**Date:** 2026-07-20
**Applied to:** Local, Dev, Staging

### What changed

The `date_updated` (Last Update) and `user_updated` (by) system fields in the `tours` collection were reconfigured to match the hotels reference pattern and moved to the **end** of the "Status & publication" section (after `internal_remarks`).

### Field changes (identical across all three environments)

| Field | Property | Before | After |
|-------|----------|--------|-------|
| `date_updated` | `sort` | null | 10 |
| `date_updated` | `readonly` | false | true |
| `date_updated` | `options` | null | `{"format": "dd.MM.yyyy HH:mm:ss"}` |
| `date_updated` | `display` | null | `"datetime"` |
| `date_updated` | `display_options` | null | `{"relative": true}` |
| `date_updated` | `conditions` | null | `[{"name":"View on Edit","rule":{"_and":[{"id":{"_nnull":true}}]},"readonly":true,"hidden":false}]` |
| `user_updated` | `sort` | null | 11 |
| `user_updated` | `readonly` | false | true |
| `user_updated` | `options` | null | `{"template": "{{first_name}} {{last_name}}"}` |
| `user_updated` | `display` | null | `"user"` |
| `user_updated` | `conditions` | null | `[{"name":"View on Edit","rule":{"_and":[{"id":{"_nnull":true}}]},"readonly":true,"hidden":false}]` |

### Field order in "Status & publication" (after change)

1. (other fields with sort=null appear first in their original order)
2. `internal_remarks` (sort=null — last of the null-sort fields)
3. **`date_updated`** (sort=10) ← moved here
4. **`user_updated`** (sort=11) ← moved here

### How to revert

Set `sort` back to `null`, `readonly` to `false`, and clear `options`/`display`/`display_options`/`conditions` on both fields.

---

## Tour Operator Section (`section_operator`) — Synced to Dev

**Date:** 2026-07-20
**Applied to:** Local, Staging

### What changed

All 14 fields in the `section_operator` group of the `tours` collection were updated to match the Dev configuration (source of truth).

### Key changes

- **`operator_direct`**: width changed to `full`, added Yes/No choices
- **`operator_linked`**: added filter/template options
- **`place`, `location_tour32`, `country`, `state`**: interface changed from `select-dropdown-m2o` → `cascading-individual-select`, added cascade options
- **11 fields** (`street`, `street_number`, `postcode`, `place`, `location_tour32`, `country`, `state`, `phone_general`, `phone_after_hours`, `email_general`, `website`): set `hidden: true` + added conditional visibility (Show on No)

### How to revert

See `STAGING_CHANGES/TOURS-SECTION-OPERATOR-CHANGES.md` for per-field revert instructions.
