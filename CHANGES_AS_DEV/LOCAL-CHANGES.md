# Local changes — sync field order/interfaces to dev

**Target:** `directus-local` only.
**Applied:** 2026-07-20
**Type:** Pure `directus_fields.meta` updates (`sort`, `interface`, `options`) via the `fields` MCP tool. No collections, relations, or content-field data touched.
**Revert:** re-apply the "Before" value shown for each field below.

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
| `header` | 10 | 5 |
| `ui_tabs` | 11 | 6 |
| `sell_prices_status` | 5 | 7 |
| `sell_prices_updated_at` | 6 | 8 |
| `px_source_id` | 9 | 9 (unchanged) |
| `source_updated_at` | 7 | 10 |
| `source_db` | 8 | 11 |
| `item_preview_button` | 12 | 12 (unchanged) |

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
| `header` | already `interface: "header"` with correct template options; sort: 1 (tied with `id`) | sort: 5 (only sort changed) |
| `ui_tabs` | already `interface: "group-tabs"`; sort: 4 (tied with `user_created`) | sort: 6 (only sort changed) |
| `id` | sort: 1 | sort: 1 (unchanged) |
| `sort` | sort: 2 | sort: 2 (unchanged) |
| `user_created` | sort: 3 | sort: 3 (unchanged) |
| `date_created` | sort: 4 | sort: 4 (unchanged) |
| `user_updated` | sort: 5 | sort: 7 |
| `date_updated` | sort: 6 | sort: 8 |
| `px_source_id` | sort: 10 | sort: 11 |
| `source_updated_at` | sort: 11 | sort: 12 |
| `source_db` | sort: 12 | sort: 13 |

## Verification performed

Re-ran a raw `fields` read on all 5 collections immediately after each update batch; confirmed the returned `meta.sort`/`interface`/`options` for every touched field now matches dev's values exactly (see `00-ANALYSIS-SUMMARY.md` for the source diff).
