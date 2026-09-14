# Unify partner scoping: add `partner_visibility` to `directus_users` and `directus_files`

## Context

Ticket 1 ("Separating libraries correctly") gave `directus_users` and `directus_files` a `partner_selected` M2M field, with the rule "empty list = visible to everyone" inferred implicitly from array emptiness. Everywhere else in this system — every product collection (`cruises`/`tours`/`excursions`/`vehicles` use `partner_visibility`+`partner_selected`; `hotels` uses the non-compliant `partner_type`+`partner`) and the `api_users` token collection (`partner_visibility`+`partner_selected`, confirmed in `authMiddleware.js`/`collectionFilters.js`) — visibility is an **explicit** radio field (`all`/`selected`), never inferred from list emptiness. The project's own naming convention doc (`docs/conventions/BOTG_ContentHub_Namenskonventionen_v1_13.md` §4.6) calls `partner_visibility`/`partner_selected` the binding standard pair and flags hotels as the outlier to be aligned to it.

The user wants `directus_users` and `directus_files` brought into that same explicit pattern: add a real `partner_visibility` field next to the existing `partner_selected` M2M on both, matching the products/`api_users` convention (including a visible All/Selected radio in the UI), rather than continuing to infer visibility from an empty array. While investigating, also found that `directus/extensions/api`'s `images.js` still treats `uploaded_by.partner_selected` as a single scalar — broken silently by Ticket 1's M2O→M2M conversion — to be fixed in the same pass.

## Schema changes (local only)

Mirror the exact pattern already used on `cruises`/`tours`/`excursions`/`vehicles` (confirmed via `directus-schema-import/current-snapshot.json` and `STAGING_CHANGES/TOURS-SECTION-BOTG-FILTER-CHANGES.md`):

1. **`directus_files.partner_visibility`** — string, `select-radio` interface, choices `All`(`all`)/`Selected`(`selected`), **default `all`** (matches products' default and today's effective "empty = visible to all" behavior for every existing file). Add the same `conditions` block already used on `excursions.partner_selected` (hide `partner_selected` when `partner_visibility = all`) onto `directus_files.partner_selected`.
2. **`directus_users.partner_visibility`** — string, `select-radio`, choices `all`/`selected`, schema default `all` (so a newly-created user is never accidentally locked out). Same hide-condition added to `directus_users.partner_selected`.
3. **Backfill (critical, must preserve current behavior exactly — no user or file should gain or lose access from this migration):**
   - `directus_files`: no file currently has `partner_selected` set → every file gets `partner_visibility = 'all'`. No behavior change.
   - `directus_users`: only `botg@gmail.com` and `karawane@gmail.com` currently have a `partner_selected` value → those two get `partner_visibility = 'selected'`; every other user gets `'all'`. This preserves exactly who is currently scoped vs. unscoped — critical because flipping the *default* to `'selected'` project-wide would lock out every other existing user (empty `partner_selected` + `visibility='selected'` = sees nothing, per the `api_users` `NEVER_MATCH` precedent).

## Code changes

### `usePartnerScope.ts` — filter logic becomes visibility-first, mirroring `buildPartnerFilter` (`extensions/api/src/api/shared/collectionFilters.js:95-107`)

Replace the "empty array ⇒ unrestricted" inference with the same four-branch logic already proven server-side:
- Viewer `partner_visibility = 'all'` → no filtering, sees everything (regardless of their own `partner_selected`).
- Viewer `partner_visibility = 'selected'` with an empty `partner_selected` → sees nothing (a real, intentional lockout state — matches `api_users`/`NEVER_MATCH_FILTER` semantics).
- Otherwise → visible if the item's own `partner_visibility = 'all'` OR the item's `partner_selected` overlaps the viewer's partner ids.
- `isPartnerScoped` becomes `partner_visibility === 'selected'` instead of `partnerScopeIds.length > 0`.

This touches `usePartnerScope()`'s `init()` (fetch `partner_visibility` alongside `partner_selected.partner_id.id` from `/users/me`), `filesPartnerOrFilter`, `partnerAlbumOrFilter`, and `collectPartnerFolderIds`/folder-visibility helpers that currently reason from list emptiness.

### Upload modal (`UploadModal.vue`) and conflict check (`interface.vue`)

- On upload, `persistFilePartners` also `PATCH`es `partner_visibility` on the new file: `'selected'` if any partners were chosen, `'all'` if none — computed automatically from the same checklist, no new upload-modal UI (the checklist already communicates this; a visibility radio belongs on the file/user *edit* screens, not the upload flow).
- `checkPartnerConflicts()`'s "is this file/product unrestricted" checks switch from "`partner_selected` is empty" to "`partner_visibility === 'all'`" for both the product side (already correct today via `partner_type`/`partner_visibility`, just confirm the collection-appropriate field name via the existing generic discovery) and the file side.

### Native UI radio (no new code — schema-only)

Per your answer, expose the field explicitly: because `partner_visibility` gets the same `select-radio` interface and the M2M gets the same hide-`conditions` as the products pattern, Directus renders the All/Selected radio automatically wherever `partner_selected` already appears in the app — the user-edit screen (`directus_users`) and any file-detail view exposing `directus_files.partner_selected`. No custom Vue code needed for this part.

### `extensions/api` fix — `images.js` M2M compatibility

`filterMediaJunctionByPartner`/`unwrapPartnerId` (`directus/extensions/api/src/utils/images.js:5-34`) currently reads `uploader.partner_selected` as a single scalar/object — broken since `directus_users.partner_selected` became an M2M array. Update to unwrap the array (`partner_selected.map(p => p.partner_id?.id ?? p.partner_id)`) and check membership instead of equality, and add the new `uploader.partner_visibility` into the match logic (uploader `all` ⇒ counts as covering every viewer partner) so this stays consistent with the same visibility-first semantics rolled out above. Also fetch `partner_visibility` in whatever query populates `uploader` for this path.

## Files to touch

- `directus-local` schema: `directus_files`, `directus_users` (2 new fields + 2 condition updates), one-time SQL/API backfill (documented like every prior migration in `docs/changes/LOCAL/`, backed up first).
- `directus/extensions/media-bundle/media-library/src/composables/usePartnerScope.ts` (core logic change).
- `directus/extensions/media-bundle/directus-extension-media-uploader/src/components/UploadModal.vue` (write `partner_visibility` on upload).
- `directus/extensions/media-bundle/directus-extension-media-uploader/src/interface.vue` (conflict-check "unrestricted" logic).
- Any other `usePartnerScope`/`filesPartnerOrFilter` consumers already touched in the earlier M2M migration — re-verify each still behaves correctly under the new visibility-first rule (same file list as `docs/changes/LOCAL/2026-09-14-media-library-tickets-changes.md`'s "Ticket 1" section).
- `directus/extensions/api/src/utils/images.js` (M2M-compatibility fix).

## Verification

1. Schema: confirm both new fields + conditions via `directus-local` `fields` read; confirm backfill row counts match exactly (2 users `selected`, rest `all`; all files `all`) before/after.
2. Re-run the same isolation test as before (`botg@gmail.com` vs `karawane@gmail.com`, a file scoped to one partner) to confirm no regression, plus a new case: set a user's `partner_visibility` to `'selected'` with an empty `partner_selected` and confirm they now see zero media (the new intentional-lockout behavior).
3. Confirm the "Add Existing" modal (the one that broke earlier from the `.partner_id` bug) still works under the new filter shape.
4. Confirm the conflict dialogue still triggers/resolves correctly using the new `partner_visibility`-based "unrestricted" check.
5. Manually verify the `extensions/api` fix against a request that includes uploader-scoped media, comparing before/after JSON output for a known test file.
