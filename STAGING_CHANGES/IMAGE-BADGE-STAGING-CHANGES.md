# Staging — Image Badge Publication Flows (Cruises + Tours)

**Target:** `directus-staging` MCP server **only**.
**Applied:** 2026-06-11
**Type:** Purely additive — **6 new flows created, nothing existing modified, no schema changes.** Revert = delete the 6 flows.

## Goal
Replicate the hotels' image-badge automation for **cruises** and **tours**: auto-compute `image_badge_status` from `image_badge_start_date` / `image_badge_end_date`, and notify the editor 5 days before a badge's end date.

## Reference (hotels — unchanged, for context)
- `6111a945-2b7a-4049-b743-b3b847ebe0d1` — publication_date - Compute Publication Output
- `37a5bee0-dced-4f24-a173-8c550600792f` — publication_date - Daily Expiry Check
- `357e2900-2702-45ee-9a15-f9e0641a7511` — publication_date - Notify Editor Before Unpublish

The three target collections share the same fields: `image_badge_start_date` (date), `image_badge_end_date` (date), `image_badge_status` (select: `never_published` / `always_published` / `published_period`).

**Compute logic** (identical to hotels): both dates → `published_period`; start only → `always_published`; end-only or neither → `never_published`. Payload values take precedence over stored values on the merge.

---

## New flows created

### Cruises
| Flow | ID | Trigger |
|------|----|---------|
| `[Image Badge] Cruise - Compute Status` | `c3e8993d-04d7-4ad4-b4e2-fa66d3d97f78` | event `items.create`,`items.update` / `cruises` |
| `[Image Badge] Cruise - Daily Expiry Check` | `212e21fb-a322-44b7-8fdb-357a3c8128e9` | schedule `0 0 8 * * *` |
| `[Image Badge] Cruise - Notify Editor Before Unpublish` | `72ec7819-e763-4089-871d-0526b748c8bf` | operation (`return: $last`) |

### Tours
| Flow | ID | Trigger |
|------|----|---------|
| `[Image Badge] Tour - Compute Status` | `03df84db-61a7-464f-8f15-76194f651cad` | event `items.create`,`items.update` / `tours` |
| `[Image Badge] Tour - Daily Expiry Check` | `34cafee5-6228-4620-a853-18f87c536484` | schedule `0 0 8 * * *` |
| `[Image Badge] Tour - Notify Editor Before Unpublish` | `89ebae1c-200d-4353-8732-0232bf0a654e` | operation (`return: $last`) |

## Flow internals

### Compute Status (event) — chain: `resolve_key → read_item → compute_output → save_output`
- **resolve_key** (exec): item key = `$trigger.keys[0]` (update) or `$trigger.key` (create).
- **read_item** (item-read, `permissions:$trigger`, `emitEvents:false`): reads `image_badge_start_date`,`image_badge_end_date` for that key.
- **compute_output** (exec): merges `$trigger.payload` over stored values, derives `publication_status` per the logic above.
- **save_output** (item-update, `emitEvents:false`): writes `{ image_badge_status: <computed> }` back to the same item. `emitEvents:false` prevents a re-trigger loop.

Cruise op IDs: resolve_key `0ed7ba93-3bed-419e-ab36-43ab3f93a470`, read_item `71bcbe67-c8ce-4258-b004-0c5e3a2f7d10`, compute_output `fcbc793b-9c76-4a25-895d-f87dfda6d2eb`, save_output `43b930de-26c5-489f-8891-9cd58d481d35`.
Tour op IDs: resolve_key `bffde711-02e3-47b2-a2f6-eba379a5c1d1`, read_item `83e7c350-bbc4-46f5-897f-44fd3f3b4b8a`, compute_output `e24564bc-b60c-4f1a-b815-79bf9286cde4`, save_output `5bec7529-9bcb-414c-8c75-7439cfc6e0ee`.

### Daily Expiry Check (schedule, 08:00) — chain: `compute_target_date → find_expiring_items → notify_each`
- **compute_target_date** (exec): `target_date` = today + 5 days (`YYYY-MM-DD`).
- **find_expiring_items** (item-read, `permissions:$full`, `emitEvents:false`, `limit:-1`): items where `image_badge_end_date _eq target_date`, fields `id,name,image_badge_end_date,user_updated`.
- **notify_each** (trigger, `iterationMode:parallel`): runs the matching Notify flow once per found item, payload = `{{ find_expiring_items }}`.

Cruise op IDs: compute_target_date `b94bee21-a644-4ce0-a899-fdaf6e1fbf47`, find_expiring_items `cffc6bbf-e00e-4d7b-a0a6-26584ece242d`, notify_each `bbf205ef-024c-4670-82d0-9eee34168fe0` (→ flow `72ec7819`).
Tour op IDs: compute_target_date `0533376f-56a8-4db9-b4b6-28c2056c06e6`, find_expiring_items `db33705e-bef2-4461-9135-ff3a3442064c`, notify_each `2fda447d-4a3f-4b22-ba65-8c8bcf5f3ba3` (→ flow `89ebae1c`).

### Notify Editor (operation) — single op `notify_editor`
- **notify_editor** (notification): recipient `[{{ $trigger.user_updated }}]`, references the item (`collection`+`item`), message states the badge unpublishes on `{{ $trigger.image_badge_end_date }}`.

Cruise op ID: `62c5b885-3637-4b73-a884-f32253175f3e`. Tour op ID: `375534cc-f4dd-471d-870e-885c78739b72`.

> Improvement vs. the hotels reference: the notification message uses `{{ $trigger.image_badge_end_date }}` (the field actually selected by `find_expiring_items`); the hotels flow used `{{ $trigger.end_date }}`, which is not in its result set.

---

## REVERT PROCEDURE (staging only)
This task created only new flows. To fully revert, delete the 6 flows via the `directus-staging` MCP (`flows` action `delete`) — deleting a flow removes its operations automatically:

1. `c3e8993d-04d7-4ad4-b4e2-fa66d3d97f78` (Cruise Compute Status)
2. `212e21fb-a322-44b7-8fdb-357a3c8128e9` (Cruise Daily Expiry Check)
3. `72ec7819-e763-4089-871d-0526b748c8bf` (Cruise Notify Editor)
4. `03df84db-61a7-464f-8f15-76194f651cad` (Tour Compute Status)
5. `34cafee5-6228-4620-a853-18f87c536484` (Tour Daily Expiry Check)
6. `89ebae1c-200d-4353-8732-0232bf0a654e` (Tour Notify Editor)

Order: delete the Daily Expiry Check flows before the Notify flows if you want to avoid a dangling `notify_each` reference mid-revert (harmless either way). No schema, no existing-flow edits, no item data to undo.

---

## Verification
- All 6 operation chains were read back and confirmed correctly wired (first op set, resolve chain intact, `notify_each` → correct per-collection Notify flow).
- No live item mutation test was run on staging, to avoid triggering the many other cruise/tour `items.update` flows (price calc, MAT sync, publication, etc.) and leaving side effects. The flow logic is byte-identical to the already-working hotels flow `6111a945` (only the target collection differs), so behavior is equivalent.
- To smoke-test manually in the admin UI: edit a cruise/tour, set both image badge dates → save → `image_badge_status` becomes `published_period`; clear the start date → becomes `never_published`. For the schedule flow, set a record's `image_badge_end_date` to exactly 5 days out and trigger the "Daily Expiry Check" flow manually → the editor receives a notification.
