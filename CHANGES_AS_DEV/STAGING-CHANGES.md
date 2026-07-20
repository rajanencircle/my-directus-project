# Staging changes — sync field order/interfaces to dev + fix tours M2M relation bug

**Target:** `directus-staging` only.
**Applied:** 2026-07-20
**Type:** `directus_fields.meta` updates (`sort`, `interface`, `options`) + `directus_relations.meta.junction_field` updates, via the `fields`/`relations` MCP tools. No collections, schema types, or content-field data touched.
**Revert:** re-apply the "Before" value shown for each field/relation below.

## hotels

| Field | Before (`sort`) | After (`sort`) |
|---|---|---|
| `px_source_id` | 10 | 9 |
| `source_updated_at` | 15 | 10 |
| `source_db` | 16 | 11 |
| `item_preview_button` | 11 | 12 |

## tours

| Field | Before | After |
|---|---|---|
| `id` | sort: null | sort: 1 |
| `sort` | sort: null | sort: 2 |
| `status` | sort: null | sort: 3 |
| `user_created` | sort: null | sort: 4 |
| `date_created` | sort: null | sort: 5 |
| `header` | sort: null; `options: null` | sort: 6; `options: {"title":"{{name}}","subtitle":"{{object_id}} - {{season.season}}"}` |
| `ui_tabs` | sort: null | sort: 7 |
| `sell_prices_status` | sort: null | sort: 8 |
| `source_updated_at` | sort: 1 | sort: 9 |
| `px_source_id` | sort: 3 | sort: 10 |
| `sell_prices_updated_at` | sort: null | sort: 11 |
| `source_db` | sort: 2 | sort: 12 |
| `item_preview_button` | sort: null | sort: 13 |

## excursions

| Field | Before | After |
|---|---|---|
| `id` | 1 | 1 (unchanged) |
| `sort` | 2 | 2 (unchanged) |
| `user_created` | 3 | 3 (unchanged) |
| `date_created` | 4 | 4 (unchanged) |
| `header` | null | 5 |
| `ui_tabs` | null | 6 |
| `sell_prices_status` | 7 | 7 (unchanged) |
| `sell_prices_updated_at` | 8 | 8 (unchanged) |
| `px_source_id` | 214 | 9 |
| `source_updated_at` | 212 | 10 |
| `source_db` | 213 | 11 |
| `item_preview_button` | null | 12 |

## vehicles

| Field | Before | After |
|---|---|---|
| `header` | `interface: "presentation-divider"`, `options: {"title":"Header"}`, sort: 1 | `interface: "header"`, `options: {"title":"{{name_vehicle}}","subtitle":"{{object_id}} - {{season.season}}"}`, sort: 5 |
| `ui_tabs` | `interface: "group-raw"`, sort: 2 | `interface: "group-tabs"`, sort: 6 |
| `id` | sort: 1 | sort: 1 (unchanged) |
| `sort` | sort: 2 | sort: 2 (unchanged) |
| `user_created` | sort: 3 | sort: 3 (unchanged) |
| `date_created` | sort: 4 | sort: 4 (unchanged) |
| `user_updated` | sort: 5 | sort: 7 |
| `date_updated` | sort: 6 | sort: 8 |
| `px_source_id` | sort: 10 | sort: 9 |
| `source_updated_at` | sort: 8 | sort: 10 |
| `source_db` | sort: 9 | sort: 11 |

## cruises

| Field | Before | After |
|---|---|---|
| `header` | `interface: "presentation-divider"`, `options: {"title":"Header"}`, sort: 1 (tied with `id`) | `interface: "header"`, `options: {"title":"{{object_info_primarix}}","subtitle":"{{object_id}} - {{season.season}}"}`, sort: 5 |
| `ui_tabs` | `interface: "group-raw"`, sort: 4 (tied with `user_created`) | `interface: "group-tabs"`, sort: 6 |
| `id` | sort: 1 | sort: 1 (unchanged) |
| `sort` | sort: 2 | sort: 2 (unchanged) |
| `user_created` | sort: 3 | sort: 3 (unchanged) |
| `date_created` | sort: 4 | sort: 4 (unchanged) |
| `user_updated` | sort: 5 | sort: 7 |
| `date_updated` | sort: 6 | sort: 8 |
| `px_source_id` | sort: 10 | sort: 11 |
| `source_updated_at` | sort: 11 | sort: 12 |
| `source_db` | sort: 12 | sort: 13 |

## Functional fix: `tours` M2M `junction_field` relations

Six M2M relations rooted on `tours` had `meta.junction_field: null` on **both** relation rows (both directions of each junction), where dev had it correctly set. This breaks the M2M picker UI for these fields on staging (Directus can't resolve which junction column points back to which side). Fixed via `relations` update action — only `meta.junction_field` changed, no schema/FK/collection changes.

| Junction collection | Row (`field`) | Before | After |
|---|---|---|---|
| `tours_destinations` | `tours_id` | `junction_field: null` | `destinations_id` |
| `tours_destinations` | `destinations_id` | `junction_field: null` | `tours_id` |
| `tours_partner` | `tours_id` | `junction_field: null` | `partner_id` |
| `tours_partner` | `partner_id` | `junction_field: null` | `tours_id` |
| `tours_directus_files` | `tours_id` | `junction_field: null` | `directus_files_id` |
| `tours_directus_files` | `directus_files_id` | `junction_field: null` | `tours_id` |
| `tours_countries` | `tours_id` | `junction_field: null` | `countries_id` |
| `tours_countries` | `countries_id` | `junction_field: null` | `tours_id` |
| `tours_travel_categories` | `tours_id` | `junction_field: null` | `travel_categories_id` |
| `tours_travel_categories` | `travel_categories_id` | `junction_field: null` | `tours_id` |
| `tours_airports` | `tours_id` | `junction_field: null` | `airports_id` |
| `tours_airports` | `airports_id` | `junction_field: null` | `tours_id` |

Affects these `tours` fields in the UI: `destinations`, `partner_selected`, `media`, `countries`, `travel_categories`, `departure_airports`.

## Verification performed

Re-ran raw `fields`/`relations` reads on all touched collections/relations immediately after each update; confirmed the returned values now match dev exactly (see `00-ANALYSIS-SUMMARY.md` for the source diff).

## Not yet applied — see `00-ANALYSIS-SUMMARY.md` "Lower-priority drift" section

Broader cosmetic/i18n drift found during the original scan (cascading-select config, `headerColor`, display templates, translation-alias options, `hidden`/`width` flags, stray `en-US` entries, `hotels` collection-label) was intentionally left untouched pending a scope decision — not silently applied.
