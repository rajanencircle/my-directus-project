# Media Library — Consolidated LOCAL Changes: Partner Separation + Non-Destination Folders

Environment: **directus-local only** (`http://localhost:8055`). Nothing applied to dev/staging/main. This consolidates the incremental logs written during implementation into one authoritative record; the originals are kept for detailed blow-by-blow history:

- `2026-09-11-media-partner-multipartner-schema.md`
- `2026-09-11-media-destination-folders-schema.md`
- `2026-09-11-media-bundle-code-changes.md`
- `2026-09-11-media-destination-folders-course-correction.md`
- `2026-09-14-media-partner-conflict-dialogue.md`

**Backup taken before any schema change:** `directus/local-dump/backups/pre-partner-migration-20260911-163148.sql` (full `pg_dump`, gitignored).

## Schema changes

### Ticket 1 — partner M2M

| What | Detail |
|---|---|
| `directus_users.partner_selected` | Renamed to `partner_selected_legacy` (SQL rename, no API path exists for field-key renames) — kept, unused, hidden. |
| `users_partner` (new collection) | Junction: `id` (int PK), `directus_users_id` (uuid → `directus_users`, `ON DELETE CASCADE`), `partner_id` (uuid → `partner`, `ON DELETE CASCADE`), `sort`. |
| `directus_users.partner_selected` (new) | Alias field, `special: m2m`, `list-m2m` interface, backed by `users_partner`. Backfilled from the 2 users who had a value: `karawane@gmail.com` → Karawane Reisen, `botg@gmail.com` → Bestof (BoTG). |
| `files_partner` (new collection) | Junction: `id` (int PK), `directus_files_id` (uuid → `directus_files`, `ON DELETE CASCADE`), `partner_id` (uuid → `partner`, `ON DELETE CASCADE`). |
| `directus_files.partner_selected` (new) | Alias field, `special: m2m`, backed by `files_partner`, grouped under the existing `media_rights` field group. No prior data — every existing file starts unrestricted (empty list). |

Junction names avoid the reserved `directus_` prefix (Directus rejects custom collections starting with it).

### Ticket 2 — destination-cluster folders

| What | Detail |
|---|---|
| `directus_folders.destinations_cluster` | New field, M2O → `destinations_cluster`, `ON DELETE SET NULL`. Confirmed (by trying it) that custom fields on `directus_folders` work, contrary to the original plan's uncertainty. |
| 8 canonical folders | Created flat under "Destination Clusters" (`b7cd350a-2c37-48fc-b068-cea72ff5a12d`), each tagged with its cluster: Afrika `c3c7cc88-1cfe-4921-bb78-4284aff99a95` (cluster 1), Asien `832a1e63-2dfb-4b98-81a2-f68560abd645` (2), Europa `ba554c9e-3eaa-444f-90d5-6bd710528309` (3), Lateinamerika `a332412e-6d40-4ac1-9554-957f979e45d8` (4), Nordamerika `5c376f75-e895-44d4-8aeb-1c4e2e693a41` (5), Ozeanien `236f7512-7ce9-4ecb-8289-07581ea265a3` (6), Polarregionen `08cc8198-0370-45ed-912d-87713ebccbf9` (7), Sonstiges `e1ea9b47-b84b-4e1b-8d3d-25f2a0e204b9` (8). |
| Legacy folders | The 16 region folders under `BILDERARCHIV BOTG`/`BILDERARCHIV KARAWANE` → `BILDER` were briefly tagged with `destinations_cluster`, then **reverted to `null`** once it was clarified that tree is legacy FotoWare content, not the target structure. They carry no cluster tag today. |
| `OTHER UPLOADS` (new root folder) | `6f4180f4-9f08-4c3f-8368-085d4a802514`, with child `Portraits` `7a40934d-01c1-4a6f-ac16-bed226952c0d`. |

## Code changes (`directus/extensions/media-bundle/`)

### Ticket 1

- `media-library/src/composables/usePartnerScope.ts` — `partnerScopeIds: string[]` replaces the old single id; added `filesPartnerOrFilter`, generalized `partnerAlbumOrFilter`, `collectPartnerFolderIds`, `partnerIdsFromCreatedBy`, `partnerVisuallyListFromCreatedBy`.
- `media-library/src/utils/partnerAccent.ts` — list-based variants (`partnerVisuallyListFromRelation`, `partnerLabelListFromRelation`, `partnerAccentStyleForList`).
- Every read-side consumer converted to the M2M shape: `files.store.ts`, `folders.store.ts`, `albums.store.ts`, `folderDownload.ts`, `albumDownload.ts`, `MediaSidebar.vue`, `directus-extension-media-uploader/src/interface.vue`, `AddExistingModal.vue`, `FolderDropdown.vue` (both packages), `FolderTreeItem.vue` (all three copies), `ThumbnailCard.vue`, `MediaLibraryGridCard.vue`.
- `UploadModal.vue` — "Partner Selected" checklist (own partners only, defaults to all), persists via `POST /items/files_partner` after upload.
- **Conflict dialogue** — built into `directus-extension-media-uploader/src/interface.vue`: `collectionPartnerRelation` (generic discovery, mirrors the existing media-relation discovery), `checkPartnerConflicts()` (runs after `loadFiles()`, on mount and on `primaryKey` change), and a `v-dialog` with the three resolutions (Extend / Remove / Leave as-is). No new extension — the earlier standalone attempt (`directus-extension-interface-partner-guard`) was deleted; `hotels.partner`'s interface was reverted to plain `list-m2m`.
- **Bug fix (2026-09-14):** `partnerAlbumOrFilter`'s `user_created` clause and `filesPartnerOrFilter`'s `uploaded_by` clause were still filtering `partner_selected` directly with `_in` (a holdover from when it was a scalar M2O column). Since it's now an M2M alias, that made Directus fall back to matching the junction table's own integer PK, throwing `Invalid numeric value`. Fixed by routing both through `.partner_id.id`.

### Ticket 2

- `directus-extension-media-uploader/src/composables/useDestinationFolderResolver.ts` (new) — `resolveDestinationFolder()` walks `destinations.destinations_cluster_id` → matching canonical folder, with a typed result (`resolved` / `no-cluster` / `no-folder-for-cluster` / `error`).
- `FolderDropdown.vue` (media-uploader) — `nonDestinationOnly` prop; also computes `ancestorsOfClusterFolders` so container folders (e.g. "Destination Clusters") are hidden too, not just the cluster folders themselves.
- `UploadModal.vue` — Destination Upload / Other Upload radio. Destination mode shows no folder UI at all (silent background resolution via a `watch` on the destination geography field); Other mode shows the filtered `FolderDropdown`.
- `scripts/migrate-media-to-destination-cluster-folders.js` (new) — moves existing files from the legacy tree to canonical folders based on `destination`.

## Verification log

All performed locally as `admin@gmail.com` (super-admin, no partner), `botg@gmail.com` (Bestof/BoTG), and `karawane@gmail.com` (Karawane Reisen), using throwaway files/junction rows created and deleted via direct API calls — nothing left behind:

1. **M2M partner data**: created `users_partner` rows for the 2 seed users, confirmed via nested-field read (`directus_users_id.email`, `partner_id.label`) that both resolve correctly.
2. **File visibility isolation**: created a file scoped to Bestof (BoTG) as `botg@gmail.com`; ran the exact `filesPartnerOrFilter` logic as `karawane@gmail.com` — correctly returned zero results (file invisible to Karawane).
3. **Destination folder auto-resolution**: picked "Afrika" in Destination Upload mode → silently resolved to the canonical `Afrika` folder (only one unambiguous match, confirmed via `/folders?filter[destinations_cluster][_eq]=1`). Picked "Antarktis" (Polarregionen, briefly before that cluster had a folder) → correctly surfaced a specific "no folder yet" console warning rather than failing silently.
4. **Other Upload folder filtering**: confirmed the "Destination Clusters" container and all 16 legacy region folders under it that carry no cluster tag still show; confirmed none of the 8 canonical cluster folders leak through.
5. **Conflict dialogue — all three resolutions**, tested on a real hotel ("Capella Lodge", `0ab04c79-0c31-44f6-8bd3-2b8ecbb4f84e`):
   - Auto-triggers on opening the Media tab when a mismatch exists — no manual action needed.
   - **Remove**: confirmed the `hotels_directus_files` junction row was deleted (file untouched); dialog didn't reappear.
   - **Leave as-is**: confirmed no data changed; dialog correctly reappeared on the next tab visit.
   - **Extend**: confirmed via API that the file's `files_partner` rows grew to include all 13 of the hotel's partners (not just one); dialog didn't reappear.
6. **Bug-fix verification**: reproduced the reported `Invalid numeric value` error as `botg@gmail.com` opening "Add Existing"; after the fix, the same request returns `200 OK` with `.partner_id.` present in the filter path.

## Still open

- Migration script (`scripts/migrate-media-to-destination-cluster-folders.js`) not yet run against staging — needs an explicit go-ahead.
- Editing a file's `partner_selected` after upload has no dedicated UI yet (only set at upload time).
- Conflict dialogue is "Option A" (reconcile on every Media tab visit) — if that proves noisy once there's a backlog of long-standing mismatches, "Option B" (Flow-based, new-conflicts-only) remains a documented alternative, not built.
