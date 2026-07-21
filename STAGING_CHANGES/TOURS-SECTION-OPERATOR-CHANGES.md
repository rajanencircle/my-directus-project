# Tour Operator Section (`section_operator`) — Field Updates

**Date:** 2026-07-20
**Applied to:** Local, Staging (matching Dev as reference)

## What changed

All 14 fields in the `section_operator` group of the `tours` collection were updated on Local and Staging to match the Dev configuration. Dev was the source of truth.

### Changes per field

| Field | Property | Local before | Staging before | After (both) |
|-------|----------|-------------|----------------|--------------|
| `operator_direct` | `width` | `half` | `full` | `full` |
| `operator_direct` | `options.choices` | null | Yes/No | `[{"text":"Yes","value":"Yes"},{"text":"No","value":"No"}]` |
| `operator_linked` | `options` | null | null | `{filter, template}` |
| `name_operator` | `hidden` | `false` | `true` | `true` |
| `name_operator` | `conditions` | null | 1 | 1 (Show on No) |
| `street` | `hidden` | `false` | `false` | `true` |
| `street` | `conditions` | null | null | 1 (Show on No) |
| `street_number` | `hidden` | `false` | `false` | `true` |
| `street_number` | `conditions` | null | null | 1 (Show on No) |
| `postcode` | `hidden` | `false` | `false` | `true` |
| `postcode` | `conditions` | null | null | 1 (Show on No) |
| `place` | `interface` | `select-dropdown-m2o` | `select-dropdown-m2o` | `cascading-individual-select` |
| `place` | `options` | null | null | `{filterBy, icon, searchLimit, target_collection}` |
| `place` | `hidden` | `false` | `false` | `true` |
| `place` | `conditions` | null | null | 1 (Show on No) |
| `location_tour32` | `interface` | `select-dropdown-m2o` | `select-dropdown-m2o` | `cascading-individual-select` |
| `location_tour32` | `options` | null | null | `{target_collection, icon, searchLimit, labelField, cascadeFrom}` |
| `location_tour32` | `hidden` | `false` | `false` | `true` |
| `location_tour32` | `conditions` | null | null | 1 (Show on No) |
| `country` | `interface` | `select-dropdown-m2o` | `select-dropdown-m2o` | `cascading-individual-select` |
| `country` | `options` | null | null | `{cascadeFrom, icon, searchLimit, target_collection}` |
| `country` | `hidden` | `false` | `false` | `true` |
| `country` | `conditions` | null | null | 1 (Show on No) |
| `state` | `interface` | `select-dropdown-m2o` | `select-dropdown-m2o` | `cascading-individual-select` |
| `state` | `options` | null | null | `{cascadeFrom, icon, searchLimit, target_collection}` |
| `state` | `hidden` | `false` | `false` | `true` |
| `state` | `conditions` | null | null | 1 (Show on No) |
| `phone_general` | `hidden` | `false` | `false` | `true` |
| `phone_general` | `conditions` | null | null | 1 (Show on No) |
| `phone_after_hours` | `hidden` | `false` | `false` | `true` |
| `phone_after_hours` | `conditions` | null | null | 1 (Show on No) |
| `email_general` | `hidden` | `false` | `false` | `true` |
| `email_general` | `conditions` | null | null | 1 (Show on No) |
| `website` | `hidden` | `false` | `false` | `true` |
| `website` | `conditions` | null | null | 1 (Show on No) |

### Condition logic (all fields except `operator_direct` and `operator_linked`)

```json
[{"name": "Show on No", "rule": {"_and": [{"operator_direct": {"_eq": "No"}}]}, "hidden": false}]
```

### Interface changes

`place`, `location_tour32`, `country`, `state` — changed from `select-dropdown-m2o` to `cascading-individual-select` (custom extension, installed on all environments).

## How to revert

- `operator_direct`: set `width` back to `half`, clear `options.choices`
- `operator_linked`: clear `options`
- `street`, `street_number`, `postcode`: set `hidden` to `false`, clear `conditions`
- `place`, `location_tour32`, `country`, `state`: set `interface` back to `select-dropdown-m2o`, clear `options`, set `hidden` to `false`, clear `conditions`
- `phone_general`, `phone_after_hours`, `email_general`, `website`: set `hidden` to `false`, clear `conditions`
