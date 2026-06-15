# Staging Change: cruise_prices interface options fix on cruises_translations_1

**Date:** 2026-06-15
**Author:** Claude (via MCP directus-staging)
**Collection:** `cruises_translations_1`
**Field:** `cruise_prices`

---

## What Changed

The `cruise_prices` alias field on `cruises_translations_1` uses the custom `cruise-prices-table` interface. Two options were misconfigured and three options were missing, causing the table to render completely blank (no rows, no groups).

### Before

```json
{
  "calculateSellPricesFlowId": "f68baaf9-90e0-4613-93ba-aa555b3d99a7",
  "groupByParentKeyField": "cruise_id",
  "parentKeyField": "cruises_id",
  "rowStartDateField": "date_departure",
  "rowEndDateField": "date_arrival",
  "occupancyFromPriceField": "price_start",
  "rowFromPriceField": "price_start",
  "groupByField": "cruises_price_dates_id",
  "groupByLabelField": "cabin_categories"
}
```

### After

```json
{
  "foreignKeyField": "cruise_id",
  "groupByField": "cabin_category_id",
  "groupByParentKeyField": "cruise_id",
  "parentKeyField": "cruises_id",
  "rowStartDateField": "date_departure",
  "rowEndDateField": "date_arrival",
  "occupancyFromPriceField": "price_start",
  "rowFromPriceField": "price_start",
  "groupByLabelField": "cabin_categories",
  "groupFromPriceField": "price_start",
  "relatedCollection": "cruise_prices",
  "calculateSellPricesFlowId": "f68baaf9-90e0-4613-93ba-aa555b3d99a7"
}
```

---

## Root Cause

`groupByField` and `foreignKeyField` were both set to `"cruises_price_dates_id"` — a field that exists on `cruises_price_dates` (as that table's own FK back to `cruises`), but NOT on `cruise_prices`. The actual fields on `cruise_prices` are:

| Purpose | Correct field |
|---|---|
| FK linking price to parent cruise | `cruise_id` |
| FK used to group prices by cabin category | `cabin_category_id` |

### Impact of wrong values
- `foreignKeyField: "cruises_price_dates_id"` → `fetchItems()` filtered by a non-existent field, returning 0 rows → empty table
- `groupByField: "cruises_price_dates_id"` → even if items loaded, all were silently dropped (`if (!rawKey) return`) → empty grid

---

## Fields Added (were missing from staging, present on local)

| Option | Value | Purpose |
|---|---|---|
| `foreignKeyField` | `"cruise_id"` | Field on `cruise_prices` linking to parent cruise |
| `relatedCollection` | `"cruise_prices"` | The prices collection name (made explicit) |
| `groupFromPriceField` | `"price_start"` | Boolean flag on cabin category for from-price indicator |

---

## How to Revert

To restore the previous (broken) state via MCP:

```json
{
  "meta": {
    "options": {
      "calculateSellPricesFlowId": "f68baaf9-90e0-4613-93ba-aa555b3d99a7",
      "groupByParentKeyField": "cruise_id",
      "parentKeyField": "cruises_id",
      "rowStartDateField": "date_departure",
      "rowEndDateField": "date_arrival",
      "occupancyFromPriceField": "price_start",
      "rowFromPriceField": "price_start",
      "groupByField": "cruises_price_dates_id",
      "groupByLabelField": "cabin_categories"
    }
  }
}
```

Apply via `mcp__directus-staging__fields` → `update` → collection `cruises_translations_1`, field `cruise_prices`.

---

---

## Scope of MCP changes in this session

The **only** Directus data change made via MCP in this session was the `cruises_translations_1.cruise_prices` interface options update above. All other work in this session was code-only changes to the extension files:

| Change | Type | Deployed to staging? |
|---|---|---|
| `cruise_prices` interface options fix | MCP / Directus data | ✓ Applied directly via MCP |
| `InterfaceTranslations.vue` — `isDateRangeName` logic + CSS wrapping | Code | ✓ Deployed by developer |
| `InterfaceDirect.vue` — `isDateRangeName` logic + CSS wrapping | Code | ✓ Deployed by developer |
| `package.json` — added `date-fns ^4.2.1` | Code | ✓ Deployed by developer |

---

## Verified: local === staging

Confirmed on 2026-06-15 by reading both MCP servers. All 12 interface options are identical:

```json
{
  "foreignKeyField": "cruise_id",
  "groupByField": "cabin_category_id",
  "groupByParentKeyField": "cruise_id",
  "parentKeyField": "cruises_id",
  "rowStartDateField": "date_departure",
  "rowEndDateField": "date_arrival",
  "occupancyFromPriceField": "price_start",
  "rowFromPriceField": "price_start",
  "groupByLabelField": "cabin_categories",
  "groupFromPriceField": "price_start",
  "relatedCollection": "cruise_prices",
  "calculateSellPricesFlowId": "f68baaf9-90e0-4613-93ba-aa555b3d99a7"
}
```

---

## Related

- Fix was applied to `directus-local` first, then replicated here.
- Extension code changes (CSS, `isDateRangeName` logic, `date-fns` import) were deployed to staging separately by the developer — they are not tracked in this file as they live in the extension source.
