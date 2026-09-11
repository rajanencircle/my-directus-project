# Media Library: Multi-Partner Media + Non-Destination Upload Folders

## Context

Two ClickUp tickets against the custom `media-bundle` extension (Directus 11.17.4, BOTG ContentHub):

1. **Partner separation** — media today is only implicitly partner-scoped (via the uploader's single `partner_selected`). The client wants media itself to carry partner ownership, support more than one partner per user/file, and handle the conflict that arises when a product gains a partner whose users shouldn't see media scoped to a different partner. The client's own message says this is still pending their final confirmation of "Option B" (multi-partner) — **the user (Rajan) has decided to build Option B now**, including the conflict dialogue, rather than wait.
2. **Non-destination upload folders** — BoTG wants a "Portraits" (and future similar) folder for travel-expert photos that isn't tied to a destination. Today every upload carries optional geography metadata and a fully manual folder pick; there is no auto-assignment from geography to a destination-cluster folder. The user has asked to build that auto-assignment too, and to distinguish destination vs. non-destination folders via **a new field on `directus_folders` that links to `destinations_cluster`** (his own suggestion), reusing the existing geo-cluster model rather than inventing a new one.

Both features are LOCAL-ONLY for now. Nothing changes on dev/staging/main. Every schema/data change made locally must be documented in `docs/changes/LOCAL/` and the plan doc in `docs/plans/LOCAL/`, per repo convention.

## What already exists (verified via directus-local MCP + code reading)

- `partner` collection (`label`, `partner_type`, `visually` accent color, `status`).
- `directus_users.partner_selected` — **M2O** to `partner` (one partner per user today).
- `directus_files` — **no partner field at all**. Visibility is derived transitively today via `uploaded_by.partner_selected` in `usePartnerScope.ts`, `files.store.ts`, `folders.store.ts`, and the public API (`extensions/api/src/api/shared/authMiddleware.js`, `utils/images.js`).
- The canonical BOTG pattern for multi-partner scoping **already exists and is battle-tested on products**: `partner_visibility` (radio `all`/`selected`, default `all`) + `partner_selected` (M2M list, hidden when visibility=`all`) on `hotels`, `cruises`, `tours`/`excursions`, `rental_companies`, via `<product>_partner` junctions. Confirmed field-for-field on `excursions`. Flow families already exist per product: `Sync New Partner to All X`, `Sync All Partners to X When Changed to All`, `Reconcile X Partner Visibility`. We reuse the `partner_selected` M2M half of this pattern on `directus_users`/`directus_files` (per user direction, **without** the `partner_visibility` toggle — see below) — see `docs/conventions/BOTG_ContentHub_Namenskonventionen_v1_13.md` §4.6.
- **Naming constraint (user-flagged):** new collections/junctions must NOT start with `directus_` — that prefix is reserved for system tables.
- Geography model: `directus_files.destination` → `destinations` → `destinations.destinations_cluster_id` → `destinations_cluster` (the continent-level groups — "EUROPA", "AFRIKA", etc., matching the existing `directus_folders` names under the "Destination Clusters" root). This is the exact join path we'll use to auto-resolve a folder from geography.
- `Enforce publish-mandatory fields on files` flow confirms geography is **not** currently mandatory and no flow auto-assigns folders — this is genuinely new logic, not a hidden existing behavior.
- Folder tree has two folders literally named "UPLOAD" (a root one, `bcf1c565…`, and one nested under "Destination Clusters", `c60f225e…`) — **must be disambiguated during implementation** (read-only check first; do not guess).

## Ticket 1 — Multi-partner media library

### Schema changes (local only)

> **Naming note:** junction/collection names must NOT start with `directus_` — that prefix is reserved for system tables and Directus will reject/mishandle a custom collection named that way. Junctions below are named `users_partner` and `files_partner` (dropping the `directus_` prefix), matching the existing `<collection>_partner` convention (`hotels_partner`, `excursions_partner`, etc.) as closely as the prefix restriction allows.

1. **`directus_users.partner_selected`**: convert single M2O → M2M, following the existing product pattern but without a `partner_visibility` radio (no "all partners" concept needed for users — admins already bypass via role permissions).
   - Create new M2M via a junction collection named `users_partner` (fields: `id`, `directus_users_id`, `partner_id`, `sort` — mirroring `hotels_partner`'s shape), backfill it from the existing `partner_selected` UUID values for every user (one row per user who has a value).
   - Rename the existing scalar column out of the way first (e.g. `partner_selected` → `partner_selected_legacy`, hidden), then add the new M2M field named `partner_selected` (matching convention) as an alias/list-m2m pointing at the new junction.
   - Do not delete `partner_selected_legacy` until the migration is verified end-to-end; log the rename/backfill in `docs/changes/LOCAL/`.
2. **`directus_files`**: add multi-partner scoping, simplified from the product pattern per the user's direction — **no `partner_visibility` toggle field needed**:
   - `partner_selected` only (M2M via new junction `files_partner`, fields `id`, `directus_files_id`, `partner_id`, `sort`), template `{{partner_id.label}}`.
   - Visibility rule: **empty `partner_selected` = visible to all partners** (no regressions for existing/untagged files); **non-empty = visible only to the listed partners**. All filter logic below implements this rule directly instead of checking a separate visibility flag.
   - Keep `uploaded_by` as-is — it's the "owner" of record per the client's requirement #5; `partner_selected` is *access*, `uploaded_by` is *ownership*.

### Upload modal changes

- `directus-extension-media-uploader/src/components/UploadModal.vue` (shared by Media Library + product Media tabs): add a "Partner Selected" multi-select, defaulted to the current user's own `partner_selected` list, and **restricted to only that list** (per the client's own "important consideration" — do not expose the full global partner list to avoid mis-assignment). Fetch the current user's partners via the same `/users/me` pattern `usePartnerScope.ts` already uses, extended for M2M.
- On save, write the chosen partner IDs to the new `directus_files.partner_selected` junction (via `files_partner`); leaving it empty means visible to all partners, per the visibility rule above.
- Editors can later edit the list from the file detail view (`FileDetailView.vue`) — expose the same multi-select there, reusing `directus-extension-file-media-extras` or the existing detail sidebar pattern.

### Read-side filtering updates (multi-partner aware)

Replace every single-partner check with an M2M-aware one (file visible if its `partner_selected` is empty, OR any of the current user's partners is in the file's `partner_selected`):
- `media-library/src/composables/usePartnerScope.ts` — `partnerAlbumOrFilter`, partner-scope state (now a list, not a single id).
- `media-library/src/stores/files.store.ts` (`buildFilter`), `folders.store.ts` (`applyPartnerPrune`, `collectPartnerFolderIds`).
- `media-library/src/utils/folderDownload.ts`, `albumDownload.ts`.
- `directus-extension-media-uploader/src/interface.vue`, `components/AddExistingModal.vue`.
- `extensions/api/src/utils/images.js` (`filterMediaJunctionByPartner`/`applyPartnerMediaFilter`) and `collectionFilters.js` (`buildPartnerFilter`) — same M2M generalization for the public API read side.

### Visual distinction for partner-limited media

- Extend `media-library/src/utils/partnerAccent.ts` to handle multiple partners: single accent color when one partner is set, a distinct "multi-partner" treatment (e.g. neutral/mixed border) when more than one, none when `partner_selected` is empty (visible to all).
- Extend `directus-extension-media-uploader/src/components/PartnerInfoDialog.vue` to list **all** partners for a file (client's own suggested UX: keep one (i) icon, click opens a popover/dialog listing every partner) instead of a single partner name.

### Conflict dialogue (product gains a partner that doesn't cover its media)

This must run client-side, before a product's partner change is committed, since it needs a modal decision from the editor:
- Build one new reusable interface extension for the `partner_selected` field on product collections (hotels, cruises, tours/excursions, rental_companies) that replaces the native `list-m2m` interface. On selecting a new partner:
  1. Query the product's attached media (via its media M2M junction) for files whose `partner_selected` is **non-empty and does not include** the newly-added partner (an empty `partner_selected` means the file is already visible to everyone, so it's never a conflict).
  2. If any exist, show a dialog with the three options from the ticket: **extend** (add the new partner(s) to those files' `partner_selected`), **remove** (unlink those files from the product's media relation only — never delete the file), or **cancel** (revert the pending partner addition, don't save).
  3. Only commit the product's `partner_selected` change after a choice is made.
- Model the dialog on the existing `AddToAlbumModal.vue` / `BatchEditDrawer.vue` modal patterns already in `media-library/src/components/`.

### Documentation

- `docs/plans/LOCAL/2026-09-11-media-partner-multipartner.md` — this plan, expanded with exact field IDs once created.
- `docs/changes/LOCAL/` — one file logging every schema/data change (new fields, junctions, the `partner_selected` rename+backfill, migration script used).

## Ticket 2 — Destination vs. Other (non-destination) uploads

### Schema changes (local only)

- Add `destinations_cluster` (integer, M2O → `destinations_cluster`) to **`directus_folders`**. First verify in the local sandbox that Directus allows custom fields on the `directus_folders` system collection (not yet confirmed) — if it doesn't, fall back to a small side-table (`folder_destinations_cluster` keyed by folder id) and note the deviation.
- One-time data script (`scripts/`, CommonJS, `--dry-run` support, per repo convention) to populate `destinations_cluster` on the existing folders under "Destination Clusters" by matching folder name → `destinations_cluster.translations.name` (case-insensitive; the folder names are German/uppercase like "EUROPA", "AFRIKA" — check both `de-DE`/`en-GB` translations). Folders left with `destinations_cluster = null` (e.g. a new "Portraits" folder) are the non-destination set — no separate flag needed, per the user's own suggestion.
- Resolve the duplicate "UPLOAD" folder naming (`bcf1c565…` root vs `c60f225e…` nested under Destination Clusters) before building the "Other Upload" folder list — confirm with a quick read which one is meant to hold non-destination categories, rename if ambiguous, log in `docs/changes/LOCAL/`.
- Create the actual "Portraits" folder (and any other agreed non-destination folders) under the correct non-destination root, per partner (BoTG/Karawane) if that separation still applies post-Ticket-1.

### Upload modal changes

Applies to both `directus-extension-media-uploader/src/components/UploadModal.vue` and its thin wrapper `media-library/src/components/upload/UploadModal.vue` (both product Media tab and Media Library uploads, per the client's requirement):

- Add a top-level radio: **Destination Upload** / **Other Upload** (default: Destination Upload).
- **Destination Upload**: show `GeographiesEditor.vue`/`GeoIndividualSelect.vue` as today; hide `FolderDropdown.vue`. On the `destination` geography field changing, resolve the target folder automatically: `destination` → `destinations.destinations_cluster_id` → find the folder under "Destination Clusters" (partner-scoped, per Ticket 1) whose `destinations_cluster` matches → set the hidden `folder` value. Surface a small inline note if no matching folder is found (don't silently fail).
- **Other Upload**: hide the Geographies fields; show `FolderDropdown.vue` filtered to folders where `destinations_cluster IS NULL` (i.e., exclude the entire "Destination Clusters" subtree). No destination cluster gets set on the file.
- New small composable, e.g. `useDestinationFolderResolver.ts`, alongside the existing `useGeographyFieldMaps.ts`/`geoLevels.ts` utilities, to keep the resolution logic in one place shared by both packages.

### Documentation

- `docs/plans/LOCAL/2026-09-11-media-other-upload-folders.md`.
- `docs/changes/LOCAL/` entry for the new `directus_folders.destinations_cluster` field, the backfill script run, and any folder renames/creations.

## Verification (local)

1. Schema: confirm new fields/junctions via `directus-local` `fields`/`relations` read after creation; sanity-check the `partner_selected` rename+backfill row counts against the original `directus_users.partner_selected` values before touching the legacy column.
2. UI: run the local Directus + extensions build, open the Media Library and a Hotels item's Media tab in the browser:
   - Upload a file as a partner-limited user, confirm it only shows the assigned/selectable partners, confirm visual accent and the info-popover list all partners.
   - Change a product's partners to trigger the conflict dialogue against a file scoped to a different partner; test all three resolutions.
   - Toggle Destination/Other Upload; confirm field show/hide, confirm a destination pick auto-selects the right cluster folder, confirm Other Upload only lists non-destination folders (e.g. Portraits).
3. Confirm existing single-partner files/users still resolve correctly post-migration (no files/users lose access due to the M2O→M2M conversion).
4. Only after local verification is signed off should the same steps be repeated against `directus-dev`, each logged the same way.
