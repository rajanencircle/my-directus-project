# LOCAL — Unify partner scoping: `partner_visibility` on `directus_users` and `directus_files`

Environment: **directus-local only**. Backup taken first: `directus/local-dump/backups/pre-partner-visibility-unify-20260914-171126.sql`.

## Why

`directus_users`/`directus_files`' `partner_selected` M2M (added earlier — see `2026-09-14-media-library-tickets-changes.md`) inferred visibility from list emptiness ("empty = visible to all"). Every other partner-scoped collection in the system — products (`cruises`/`tours`/`excursions`/`vehicles` use `partner_visibility`+`partner_selected`; `hotels` uses the legacy `partner_type`+`partner`) and `api_users` (confirmed in `extensions/api/src/api/shared/authMiddleware.js`) — uses an **explicit** `all`/`selected` radio instead. The naming convention doc (`docs/conventions/BOTG_ContentHub_Namenskonventionen_v1_13.md` §4.6) calls this pair binding. This change brings `directus_users`/`directus_files` into that same explicit pattern.

## Schema changes

- **`directus_files.partner_visibility`** — string, `select-radio` (`all`/`selected`), schema default `all`. Hide-condition added to `directus_files.partner_selected` (hidden when `partner_visibility = all`), matching the exact pattern on `excursions.partner_selected`.
- **`directus_users.partner_visibility`** — same shape, schema default `all`. Same hide-condition added to `directus_users.partner_selected`.
- **Backfill** (must preserve current behavior exactly — verified before/after):
  - All 3 existing files → `partner_visibility = 'all'` (0 rows actually changed — Postgres backfilled the column default on `ADD COLUMN` automatically).
  - `directus_users`: the 2 users with a `users_partner` row (`botg@gmail.com`, `karawane@gmail.com`) → `'selected'`; the other 23 → `'all'`. Confirmed via query: exactly 2 `selected`, 23 `all`, 25 total.

## Code changes

### `directus/extensions/media-bundle/media-library/src/composables/usePartnerScope.ts` (core rewrite)

New `ViewerScope = { visibility: 'all'|'selected'; partnerIds: string[] }` type and a `NEVER_MATCH_FILTER` (`{id:{_null:true}}`, same trick as `extensions/api`'s own `NEVER_MATCH_FILTER`). `filesPartnerOrFilter`/`partnerAlbumOrFilter`/`collectPartnerFolderIds` now all take a `ViewerScope` instead of a raw partner-id array, with visibility-first logic:
- viewer `all` → unrestricted, no filter.
- viewer `selected` with zero partners → matches nothing (a real, intentional lockout — new behavior, see verification below).
- otherwise → visible if uploader/item's own `partner_visibility = 'all'`, or a shared partner id.

`usePartnerScope()` now also fetches/exposes `partnerVisibility` and a `viewerScope` computed; `isPartnerScoped` is now `partnerVisibility === 'selected'` (was `partnerScopeIds.length > 0`).

### Every consumer updated to pass `viewerScope` instead of a raw id array

`files.store.ts`, `folders.store.ts`, `albums.store.ts`, `folderDownload.ts`, `albumDownload.ts` (signatures changed from `partnerScopeIds?: string[] | null` to `viewer?: ViewerScope | null`), `MediaSidebar.vue`, `FolderDropdown.vue` (media-uploader), `AddExistingModal.vue` (both call sites).

### `directus-extension-media-uploader/src/interface.vue`

- `isFileVisibleForPartner` rewritten visibility-first (checks the file's own `partner_visibility`, falls back to the uploader's `partner_visibility`/`partner_selected` only when the file itself carries no explicit scope).
- New `productVisibilityField` — discovers the product's own visibility field name (`partner_type` on hotels, `partner_visibility` elsewhere) by reading the hide-condition already present on the M2M alias field's own `meta.conditions`, rather than hardcoding per collection.
- `checkPartnerConflicts()` updated: product's own visibility field (when `all`) now short-circuits the whole check; file-side "never a conflict" check switched from "`partner_selected` empty" to "`partner_visibility === 'all'`".
- **Bug found and fixed during verification**: `checkPartnerConflicts()` was iterating `rowsDraft` — the file list already pruned down to what the *viewing editor's own* partner scope can see. A file scoped to a different partner than the viewer (exactly the scenario the conflict dialogue exists to catch) would silently disappear before the check ever saw it. Fixed by querying every attached file directly and unfiltered, independent of the viewer's own visibility. `resolvePartnerConflictExtend`'s "already has this partner" dedup also depended on the same pruned list — switched to a new `existingPartnerIds` field captured directly on each conflict record at detection time.
- `UploadModal.vue`'s `persistFilePartners` now also `PATCH`es `partner_visibility: 'selected'` on the file when any partner is chosen (new files default to `'all'` from the schema, so nothing is written when the checklist is left empty).

### `directus/extensions/api` (flagged bug, fixed in the same pass per your direction)

`images.js`'s `filterMediaJunctionByPartner` still read `uploaded_by.partner_selected` as a single scalar — silently broken since the earlier M2M conversion. Rewrote `unwrapPartnerId` → `unwrapPartnerIds` (handles the M2M array shape), and the match logic now checks the **file's own** `partner_visibility`/`partner_selected` first (authoritative), falling back to the uploader's only when the file carries no explicit scope of its own — mirroring the client-side `isFileVisibleForPartner` logic exactly. Updated the field-selection lists in all 6 product `*.fields.js` files (`hotels`, `cruises`, `tours`, `excursions`, `campers`, `rental_cars` — 12 occurrences, 2 per file) from the old bare `media.directus_files_id.uploaded_by.partner_selected` to the correct nested paths plus the new `partner_visibility`/file-level `partner_selected` fields.

## Verification (local)

1. Schema: confirmed both new fields + conditions via `directus-local` `fields` read; confirmed backfill counts (2 users `selected` / 23 `all`; all files `all`) via direct SQL.
2. **Isolation preserved**: created a file scoped to Bestof (BoTG) as `botg@gmail.com` (`partner_visibility: 'selected'`) — confirmed `karawane@gmail.com`'s exact `filesPartnerOrFilter` query returns zero results, and `botg@gmail.com`'s own query returns the file.
3. **New lockout behavior**: temporarily set a normal seed user (`creator@gmail.com`) to `partner_visibility: 'selected'` with an empty `partner_selected`, confirmed their files query returns nothing (the `NEVER_MATCH` case), then reverted them to `'all'`.
4. **"Add Existing" modal**: opened as `botg@gmail.com` in a hotel's Media tab — loads cleanly, network requests confirmed the new visibility-first filter shape (`partner_visibility:{_eq:'all'}` OR `partner_selected.partner_id:{_in:[...]}`, both on `uploaded_by` and the file itself), both `200 OK`.
5. **Conflict dialogue**: attached a file scoped to a partner (SavannahWay.de) not in a real hotel's partner list, opened the Media tab as `botg@gmail.com` — dialogue triggered correctly even though botg's own library view couldn't see that file (this is the bug described above, caught and fixed during this same verification pass). Ran "Extend media rights" — confirmed via API the file's `files_partner` rows grew to include all 14 partners (13 hotel partners + the original), no duplicates.
6. Cleaned up all throwaway test files/records afterward.
