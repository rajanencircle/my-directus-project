# LOCAL course correction — canonical destination-cluster folders (Ticket 2)

Supersedes the folder-tagging approach in `2026-09-11-media-destination-folders-schema.md`. The user clarified after reviewing that plan: the existing folder tree (`BILDERARCHIV BOTG` / `BILDERARCHIV KARAWANE` → `BILDER` → region subfolders like `AFRIKA`, `ASIEN`, `SUEDAMERIKA`, ...) is a **legacy import from the old FotoWare system**, not the intended target structure — and per-brand folder duplication is no longer needed now that Ticket 1's `partner_selected` field handles partner scoping at the file level instead of via folders.

## What changed

1. **Reverted** the `destinations_cluster` tagging on the 16 legacy region folders (BoTG's and Karawane's `AFRIKA`, `ASIEN`, `EUROPA`, etc. under their respective `BILDER` folders) — set back to `null`. They remain in the tree untouched, as historical/legacy content, just no longer participate in the new auto-assignment logic. **This also means the ARABIEN / NAHER-OSTEN / INDISCHER OZEAN cluster-mapping question from earlier is now moot** — those legacy folders don't need a cluster mapping at all.
2. **Created 8 new canonical folders**, one per `destinations_cluster` row, flat under the existing "Destination Clusters" root (`b7cd350a-2c37-48fc-b068-cea72ff5a12d`), each tagged with its matching cluster:

   | Folder | id | destinations_cluster |
   |---|---|---|
   | Afrika | `c3c7cc88-1cfe-4921-bb78-4284aff99a95` | 1 |
   | Asien | `832a1e63-2dfb-4b98-81a2-f68560abd645` | 2 |
   | Europa | `ba554c9e-3eaa-444f-90d5-6bd710528309` | 3 |
   | Lateinamerika | `a332412e-6d40-4ac1-9554-957f979e45d8` | 4 |
   | Nordamerika | `5c376f75-e895-44d4-8aeb-1c4e2e693a41` | 5 |
   | Ozeanien | `236f7512-7ce9-4ecb-8289-07581ea265a3` | 6 |
   | Polarregionen | `08cc8198-0370-45ed-912d-87713ebccbf9` | 7 |
   | Sonstiges | `e1ea9b47-b84b-4e1b-8d3d-25f2a0e204b9` | 8 |

   These are the only folders `directus_folders.destinations_cluster` now points to — every cluster has exactly one canonical folder, so the resolver (`findFolderForCluster` in `useDestinationFolderResolver.ts`) never has to guess between duplicates.

3. **Removed the "Destination folder" UI entirely** from `UploadModal.vue` in Destination Upload mode — no field, no status note, nothing shown. The folder is assigned silently in the background (`autoResolveDestinationFolder`, unchanged logic, now resolving against the canonical folders above) and only surfaces as a `console.warn` if it can't resolve. Other Upload mode is unaffected — it still shows the manual `FolderDropdown` filtered to `destinations_cluster IS NULL`, exactly as before (and as re-confirmed by the user).

4. **New migration script** `scripts/migrate-media-to-destination-cluster-folders.js` — moves *existing* files out of the legacy FotoWare-imported folder tree into their canonical destination-cluster folder, based on `file.destination → destinations.destinations_cluster_id → folder.destinations_cluster`. CommonJS, env-var credentials (no hardcoded secrets), `--dry-run` default, explicit `--yes` to write, backs up every moved file's previous `folder` to `scripts/backups/` before writing, extra "MAIN" confirmation gate for production. Skips (and reports, never guesses) files with no destination, a destination with no cluster, or a cluster with no canonical folder yet.

## Verification (local)

- Browser: Destination Upload now shows straight to geography fields, no folder UI. Picking "Afrika" resolves silently; confirmed via `/folders?filter[destinations_cluster][_eq]=1` returning exactly one match (no ambiguity).
- Script: created a throwaway test file (`destination=1` / Afrika, sitting in the legacy `AFRIKA` folder), ran `--dry-run` (correctly identified the move, wrote nothing), then `--yes` (wrote the move, backup file created), confirmed via API the file's `folder` was now the canonical `Afrika` folder, deleted the test file.

## Follow-up refinement (2026-09-14)

The "Other Upload" folder dropdown initially only excluded folders that were themselves tagged with `destinations_cluster` — but their *ancestor containers* (e.g. the "Destination Clusters" root, once all 8 of its children became canonical cluster folders) still showed up as empty, pointless picks. Updated `FolderDropdown.vue` (media-uploader) with `ancestorsOfClusterFolders`: any folder that has a cluster-tagged folder anywhere among its descendants (direct or nested) is now hidden too, not just the cluster folders themselves. Browser-verified: "Destination Clusters" no longer appears at all in Other Upload; the legacy `BILDERARCHIV BOTG` → `BILDER` → `AFRIKA` path (untagged, no cluster-tagged descendants) still shows correctly.

## Still open

- No folder exists yet for cluster 7 (Polarregionen) is now moot — a canonical one was just created, so this is resolved.
- The migration script has **not** been run against staging — only local, and only with a throwaway test file. Run it there (starting with `--dry-run`) only when the user explicitly asks, per the repo's local-first / staging-on-request convention.
