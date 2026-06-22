# Directus Local Instance — Change Tracking Log

## Purpose

This file tracks **all changes made to the local Directus instance** that differ from the original staging state. Use it to:
- **Migrate to staging**: Apply each change listed here to the staging instance (via `mcp__directus-staging__*` tools)
- **Revert changes**: Use the "Revert" column to undo any change
- **Audit**: Understand what was changed and why

> **IMPORTANT:** Changes are LOCAL ONLY until explicitly migrated to staging.
> Only `meta.hidden`, `meta.group`, `meta.sort`, `meta.icon`, `meta.color`, `meta.translations` were changed on collections. No field, relation, schema, or flow logic was modified.

---

## How to Apply Changes to Staging

Use the `mcp__directus-staging__collections` tool with the same format:
```json
{
  "action": "update",
  "data": [
    {"collection": "<name>", "meta": {"hidden": false, "group": "parent", "sort": 1}}
  ]
}
```

For flows use `mcp__directus-staging__flows`:
```json
{"action": "update", "key": "<flow-uuid>", "data": {"name": "New Name"}}
```

---

## How to Revert Changes

Run the same MCP tool with the original values (listed in each section's revert table).

---

---

# PHASE 1 — COMPLETE ✅
**Date completed:** 2026-06-19
**Scope:** Collection regrouping + hidden status + sort fixes + 139 flow renames

---

## 1.1 Flow Renames (139 flows)

All 139 flows were renamed to the convention: `[DOMAIN] Entity - Description`

### Naming convention applied
| Old pattern | New pattern |
|------------|-------------|
| `[MAT] Hotel CREATE - 04 May` | `[MAT] Hotel - On Create` |
| `[PRICE CALCULATOR] [RO] hotel Create - 04 May` | `[PRICE] Hotel - On Create` |
| `[Margin Preset] Update - local - 04 May` | `[MARGIN] Preset - On Update` |
| `IPTC Metadata Auto-Fill` | `[MEDIA] File - Auto-Fill IPTC Metadata` |
| `Map Pin - 04 May` | `[GEO] Location - Set Map Pin` |
| Inactive flows | `[DEPRECATED] ...` |

### Domains renamed
- `[MAT]` — 13 flows (Mobility Advice Text sync for Hotel/Tour/Daytrip/Cruise)
- `[HOTEL]` — 11 flows (Hotel event triggers, price dates, publication, partner reconciliation)
- `[PRICE]` — 46 flows (Price calculator for all products and room categories)
- `[BADGE]` — 9 flows (Image badge compute/expiry for Tour/Daytrip/Cruise)
- `[MARGIN]` — 14 flows (Margin preset application, seeding on create/update)
- `[ERP]` — 8 flows (Exchange rate preset application)
- `[BATCH]` — 11 flows (Batch sell price calculation for all products)
- `[AI]` — 5 flows (AI translation triggers and sub-flows)
- `[MEDIA]` — 5 flows (File metadata auto-fill, mandatory fields)
- `[GEO]` — 2 flows (Map pin, address autocomplete)
- `[DEPRECATED]` — 16 flows (Inactive flows kept for reference)

**To revert flow names:** The original names are in the plan file at `/Users/rajan/.claude/plans/iterative-sprouting-mango.md` under "Phase 1 — Complete" section. Apply reverse renames using `mcp__directus-local__flows` with `action: "update"`.

---

## 1.2 Collection Regrouping (Phase 1)

### Daytrips sub-collections — grouped under `daytrips`
All 25+ daytrips junction/translation tables were:
- Set `hidden: true`
- Set `group: "daytrips"`

| Collection | Was hidden | Was group |
|-----------|-----------|-----------|
| daytrips_categories_translations | false | null |
| daytrips_prices | false | null |
| daytrips_room_occupancies | false | null |
| daytrips_surcharges_items | false | null |
| daytrips_price_dates | true | tours |
| *(all other daytrips_* tables)* | varies | null |

### Tours sub-collections — grouped under `tours`
| Collection | Was hidden | Was group |
|-----------|-----------|-----------|
| tours_surcharges_items | false | null |
| tours_surcharges_items_translations | true | null |
| tours_surcharges_translations | true | null |
| tours_directus_files | true | null |
| tours_daytrips_price_dates | true | null |
| tours_translations_1 | false | tours |
| tours_prices | false | tours |
| tours_room_occupancies | false | tours |

### Cruises orphaned junction tables — grouped under `cruises`
| Collection | Was group |
|-----------|-----------|
| cruises_cruise_types | null |
| cruises_destinations | null |
| cruises_directus_files | null |
| cruises_partner | null |
| cruises_price_dates_departure_frequencies | null |
| erp_cruise_destination_exceptions | null → exchange_rate_presets |
| mp_cruise_destination_exceptions | null → margin_presets |

### Hotels scattered tables — grouped under `hotels`
| Collection | Was group |
|-----------|-----------|
| hotels_translations_2 | null |
| hotels_translations_3 | null |
| hotels_translations_4 | null |
| hotels_directus_files | null |
| hotels_accommodation_types_1 | null |
| hotels_files | null |

### Other scattered tables fixed
| Collection | Old group | New group |
|-----------|-----------|-----------|
| room_categories_translations_days | null | room_categories |
| room_categories_valid_on_weekdays | null | room_categories |
| campers_translations | null | campers |
| exchange_rate_presets_translations_5 | null | exchange_rate_presets |
| exchange_rate_presets_translations_6 | null | exchange_rate_presets |
| margin_presets_translations_7 | null | margin_presets |
| margin_presets_translations_8 | null | margin_presets |
| mobility_advice_text_translations_2 | null | mobility_advice_text |
| junction_directus_files_translations_2 | null | media_helper |
| erp_daytrips_destination_exceptions | null | exchange_rate_presets |
| mp_daytrips_destination_exceptions | null | margin_presets |

### input_lists — made visible
| Collection | Was hidden | Now hidden |
|-----------|-----------|-----------|
| input_lists | true | false |

### Top-level sort order (Phase 1 sort)
| Sort | Collection |
|------|-----------|
| 1 | hotels |
| 2 | Hotels_Metadata |
| 3 | roundtrips |
| 4 | day_trips |
| 5 | cruises |
| 6 | Cruises_Metadata |
| 7 | campers |
| 8 | rentalcars |
| 9 | studytrips |
| 10 | Global_Data |
| 11 | margin_preset (inside Global_Data) |
| 12 | albums_directus |
| 13 | Demo_Collections |

---

---

# PHASE 2 — IN PROGRESS 🔄
**Date started:** 2026-06-19
**Scope:** Top-level navigation restructure, metadata folders, Global_Data cleanup, visibility fixes

---

## 2.1 New Folder Collections Created

| Collection | Sort | Type |
|-----------|------|------|
| Roundtrips_Metadata | 10 | Folder (placeholder) |
| Campers_Metadata | 13 | Folder (with 6 camper lookup tables) |
| Rentalcars_Metadata | 14 | Folder (placeholder) |
| Studytrips_Metadata | 15 | Folder (placeholder) |

**To revert:** Delete these collections using `mcp__directus-local__collections` with `action: "delete"` and `keys: ["Roundtrips_Metadata", "Campers_Metadata", "Rentalcars_Metadata", "Studytrips_Metadata"]` — only if they are empty at time of deletion.

---

## 2.2 Top-Level Sort Order Restructure

### New sort order (Phase 2)

| Sort | Collection | Old sort | Old group | Group change |
|------|-----------|---------|-----------|-------------|
| 1 | hotels | 1 | null | — |
| 2 | roundtrips | 3 | null | — |
| 3 | daytrips | 2 (in day_trips) | **day_trips** | → **null** |
| 4 | tours | 4 (in day_trips) | **day_trips** | → **null** |
| 5 | cruises | 5 | null | — |
| 6 | campers | 7 | null | — |
| 7 | rentalcars | 8 | null | — |
| 8 | studytrips | 9 | null | — |
| 9 | Hotels_Metadata | 2 | null | — |
| 10 | Roundtrips_Metadata | NEW | null | — |
| 11 | day_trips | 4 | null | — |
| 12 | Cruises_Metadata | 6 | null | — |
| 13 | Campers_Metadata | NEW | null | — |
| 14 | Rentalcars_Metadata | NEW | null | — |
| 15 | Studytrips_Metadata | NEW | null | — |
| 16 | Global_Data | 10 | null | — |
| 17 | albums_directus | 12 | null | — |
| 18 | media_helper | 11 | null | hidden→visible |
| 19 | Demo_Collections | 13 | null | — |

**To revert top-level sort:** Apply Phase 1 sort order from section 1.2 above.
**To revert daytrips/tours group:** Set `group: "day_trips"` for both daytrips and tours.

---

## 2.3 day_trips Folder Display Name

| Property | Old value | New value |
|---------|-----------|-----------|
| meta.translations (en-US) | "Day Trips" | "Daytrips & Tours Metadata" |

**To revert:** Set translations back to original value.

---

## 2.4 Visibility Fixes

| Collection | Old hidden | New hidden | Reason |
|-----------|-----------|-----------|--------|
| surcharges | true | false | Editors need to add/manage surcharge types directly |
| cruises_cabins_categories | true | false | Cabin categories need direct editing |
| cruises_price_dates | true | false | Price date definitions need direct access |
| media_helper | true | false | Contains visible sub-collections (media_country, media_region, continent) that were inaccessible |

**To revert:** Set `hidden: true` for each.

---

## 2.5 Camper Sub-collections Moved to Campers_Metadata

| Collection | Old group | Old sort | New group | New sort |
|-----------|-----------|---------|-----------|---------|
| camper_vehicle_categories | campers | 1 | Campers_Metadata | 1 |
| camper_surcharges | campers | 2 | Campers_Metadata | 2 |
| camper_depots | campers | 3 | Campers_Metadata | 3 |
| camper_price_periods_list | campers | null | Campers_Metadata | 4 |
| camper_rental_periods_list | campers | null | Campers_Metadata | 5 |
| camper_seasons_list | campers | null | Campers_Metadata | 6 |

**To revert:** Set `group: "campers"` for all 6.

---

## 2.6 Collections Moved to Global_Data

| Collection | Old group | Old sort | New group | New sort |
|-----------|-----------|---------|-----------|---------|
| currencies | Hotels_Metadata | 16 | Global_Data | 3 |
| seasons | null | 37 | Global_Data | 4 |
| global_configurations | null | 32 | Global_Data | 5 |
| input_lists | null | 12 | Global_Data | 6 |
| media_library_settings | null | 35 | Global_Data | 7 |
| media_share_link | null | 36 | Global_Data | 8 |
| margin_preset | Global_Data | 11 | Global_Data | 9 (sort fix) |

**To revert currencies:** Set `group: "Hotels_Metadata"`, `sort: 16`
**To revert others:** Set `group: null` and restore original sort numbers.

---

## 2.7 Collections Moved to Demo_Collections

| Collection | Old group | Old sort | New group |
|-----------|-----------|---------|-----------|
| demo_hotelsss | null | 14 | Demo_Collections |
| demo_hotelsss_translations | null | 15 | Demo_Collections |
| demo_collection | null | 17 | Demo_Collections |

**To revert:** Set `group: null` for all 3.

---

## 2.8 albums_directus_files Group Fix

| Collection | Old group | New group |
|-----------|-----------|-----------|
| albums_directus_files | null | albums_directus |

**To revert:** Set `group: null`

---

## 2.9 Sort=9999 Fixes (Orphaned Sort Values)

| Collection | Group | Old sort | New sort |
|-----------|-------|---------|---------|
| batch_daytrips | batch_products | 9999 | 11 |
| batch_daytrips_locale | batch_products | 9999 | 12 |
| erp_cruise_destination_exceptions | exchange_rate_presets | 9999 | 11 |
| erp_daytrips_destination_exceptions | exchange_rate_presets | 9999 | 12 |
| exchange_rate_presets_translations_5 | exchange_rate_presets | 9999 | 13 |
| exchange_rate_presets_translations_6 | exchange_rate_presets | 9999 | 14 |
| mp_cruise_destination_exceptions | margin_presets | 9999 | 18 |
| mp_daytrips_destination_exceptions | margin_presets | 9999 | 19 |
| margin_presets_translations_7 | margin_presets | 9999 | 19 |
| margin_presets_translations_8 | margin_presets | 9999 | 20 |
| mobility_advice_text_translations_2 | mobility_advice_text | 9999 | 3 |
| erp_cruise_destination_exceptions_translations | erp_cruise_destination_exceptions | 9999 | 1 |
| erp_daytrips_destination_exceptions_translations | erp_daytrips_destination_exceptions | 9999 | 1 |
| mp_cruise_destination_exceptions_translations | mp_cruise_destination_exceptions | 9999 | 1 |
| mp_daytrips_destination_exceptions_translations | mp_daytrips_destination_exceptions | 9999 | 1 |
| camper_price_periods_list | Campers_Metadata | 9999 | 4 |
| camper_rental_periods_list | Campers_Metadata | 9999 | 5 |
| camper_seasons_list | Campers_Metadata | 9999 | 6 |

---

---

# PHASE 3 — PENDING ⏳
**Scope:** Master Flow Consolidation (operation-level changes inside flows)
**Prerequisite:** Test on staging FIRST via `mcp__directus-staging__*` tools before applying to local

## 3.1 Planned: Hotel Master Flows
Expand `[HOTEL] Master - On Create` and `[HOTEL] Master - On Update` to call MAT, Price, Translation sub-flows in sequence.
Then deactivate the individual event-triggered sub-flows.

## 3.2 Planned: Tour / Daytrip / Cruise Master Flows
Create new `[TOUR] Master`, `[DAYTRIP] Master`, `[CRUISE] Master` event-triggered flows.
Each calls: MAT Sync → Margin Seed → Badge Compute.

---

---

# MIGRATION TO STAGING CHECKLIST

When ready to migrate all changes to staging:

1. **Phase 1 Flow Renames** — apply all 139 flow renames to staging (use `mcp__directus-staging__flows`)
2. **Phase 1 Collection Regrouping** — apply all group/hidden changes to staging
3. **Phase 2 Create Folders** — create Roundtrips_Metadata, Campers_Metadata, Rentalcars_Metadata, Studytrips_Metadata on staging
4. **Phase 2 Sort + Group** — apply top-level sort order to staging
5. **Phase 2 day_trips rename** — apply translation rename on staging
6. **Phase 2 Visibility** — surcharges, cruises_cabins_categories, cruises_price_dates, media_helper → visible on staging
7. **Phase 2 Move to Campers_Metadata** — apply group changes for 6 camper tables on staging
8. **Phase 2 Move to Global_Data** — apply group changes for currencies, seasons, etc. on staging
9. **Phase 2 Move to Demo_Collections** — apply group changes for demo tables on staging
10. **Phase 2 Sort fixes** — apply all 9999→sequential sort fixes on staging
