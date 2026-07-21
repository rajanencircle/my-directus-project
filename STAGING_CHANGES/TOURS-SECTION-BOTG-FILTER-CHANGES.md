# Tours `section_botg_filter` — Staging Changes

**Date:** 2026-07-20  
**Collection:** `tours`  
**Group:** `section_botg_filter`  
**Source of truth:** Dev (`https://dev.content.botg.cloud`)

## Changes Made to Staging

### 1. `partner_visibility`

| Property | Before | After |
|----------|--------|-------|
| `options` | `null` | `{choices:[{text:"All",value:"all"},{text:"Selected",value:"selected"}]}` |
| `translations` | `[{de:"- (no label)"},{en:"- (no label)"},{nl:"- (no label)"}]` | `null` |

### 2. `partner_selected`

| Property | Before | After |
|----------|--------|-------|
| `options` | `null` | `{template:"{{partner_id.label}}"}` |
| `conditions` | `null` | `[{hidden:true,name:"hide",rule:{_and:[{partner_visibility:{_eq:"all"}}]}}]` |
| `translations` | `[{de:"- (no label)"},{en:"- (no label)"},{nl:"- (no label)"}]` | `null` |

### 3. `is_axolot_export`

No changes needed — already matches Dev.

## Revert Instructions

```bash
# Revert partner_visibility
curl -s -X PATCH "https://staging.content.botg.cloud/fields/tours/partner_visibility" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"meta": {"options": null}}'

# Revert partner_selected
curl -s -X PATCH "https://staging.content.botg.cloud/fields/tours/partner_selected" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"meta": {"options": null, "conditions": null}}'
```
