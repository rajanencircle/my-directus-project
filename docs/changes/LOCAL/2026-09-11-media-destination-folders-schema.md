# LOCAL schema changes — Non-destination upload folders (Ticket 2)

Environment: **directus-local only**. Same backup as Ticket 1 covers this: `directus/local-dump/backups/pre-partner-migration-20260911-163148.sql`.

## 1. New field `directus_folders.destinations_cluster`

Confirmed (by trying it) that Directus **does** allow custom fields on the `directus_folders` system collection — no fallback side-table needed.

- Field: `destinations_cluster` (integer, M2O → `destinations_cluster`, `on_delete: SET NULL`), added via `directus-local` MCP `fields`/`relations` tools.
- Meaning: a folder with this set is a destination-cluster folder (used by Ticket 2's auto-assignment); a folder with it `null` is a non-destination folder (eligible for the "Other Upload" folder picker, e.g. Portraits).

**Revert:** delete the relation and the field on `directus_folders`.

## 2. Backfill of existing folders → `destinations_cluster`

`destinations_cluster` reference data (8 clusters): 1 Afrika, 2 Asien, 3 Europa, 4 Lateinamerika, 5 Nordamerika, 6 Ozeanien, 7 Polarregionen, 8 Sonstiges (non-geographic).

Could not use the `directus-local` `folders`/`items` MCP tools for this write — both reject `directus_folders` as a "core collection" (items) or don't accept custom fields (folders tool's schema is fixed to `id`/`name`/`parent`). Did the backfill via direct SQL in the local Postgres container instead (same justification as the Ticket 1 field rename: local-only, backed up, no supported tool path).

**16 folders backfilled with a confident 1:1 name → cluster match** (both the BoTG and Karawane "BILDER" destination subtrees):

| Folder name | Folder id | → Cluster |
|---|---|---|
| SUEDAMERIKA ×2 (BoTG + Karawane) | `1270a14d…`, `0939e621…` | Lateinamerika |
| MITTELAMERIKA (Karawane) | `4faad1a0…` | Lateinamerika |
| NORDAMERIKA ×2 | `9b44b712…`, `cf5062ea…` | Nordamerika |
| AFRIKA ×3 (two BoTG, one Karawane) | `4b5c6acb…`, `50d3a916…`, `509c0642…` | Afrika |
| ASIEN ×2 | `d91059cd…`, `e243b44b…` | Asien |
| EUROPA (Karawane) | `fc880319…` | Europa |
| NEUSEELAND, SUEDSEE, AUSTRALIEN, PAZIFIK (BoTG/Karawane) | `332348c7…`, `4c138f7f…`, `83fa8993…`, `eed6d43c…` | Ozeanien |
| SONSTIGE (BoTG) | `5c9233dd…` | Sonstiges |

Verified via `directus-local` `folders` read after the SQL update — all 16 resolve correctly.

### ⚠️ Left un-mapped — needs a BOTG/domain-expert decision, not guessed

Three existing folders have **no clean 1:1 match** against the 8-cluster taxonomy and were deliberately left with `destinations_cluster = null` rather than force a guess that could mis-route future auto-assigned uploads:

- **ARABIEN** (`a7a0629d…`, under BoTG) — Arabia isn't its own cluster; candidates are Asien or a possible future dedicated cluster.
- **NAHER-OSTEN** (`de2c6336…`, under Karawane) — same ambiguity as above (Middle East).
- **INDISCHER OZEAN** (`effa6dda…`, under Karawane) — Indian Ocean islands are sometimes bundled with Afrika, sometimes with Asien depending on the operator's convention.

**Action needed:** confirm with BOTG which cluster (existing or new) these three should map to before the Destination Upload auto-assignment logic is relied on for images filed under them — until then, uploads with a geography resolving to one of these three will fall through to "no matching folder found" in the new upload flow and need a manual folder pick.

### Folders intentionally left `null` (correctly non-destination, not an oversight)

`REISELEITER` (tour guides), `KREUZFAHRTEN` (cruises), `LOGOS` (branding assets), `NEU` (uncategorized), plus every folder under the "UPLOAD" staging trees (`BOTG ADMIN`, `BOTG PRO`, `BOTG CRU`, `BOTG KAR I/II`, `BOTG AFRIKA`, `BOTG AUP`, `BOTG GRAFIK`, `KAR FOTOWEB`, `KAR FOTOWEB II`, `HOR JS`, `BOTG`) and the container folders themselves (`BILDER`, both `BILDERARCHIV BOTG`, `BILDERARCHIV KARAWANE`, `Destination Clusters`, both `UPLOAD`). These are exactly the kind of non-destination content the "Other Upload" picker is meant to surface — no change needed, this is a useful validation that the ticket is solving a real, pre-existing gap (this content already lives outside the destination-cluster tree, just without a formal flag).

### ⚠️ Pre-existing folder-naming ambiguity (found, not caused by this work)

Two pairs of duplicate folder names exist in the tree, unrelated to this change but relevant to building the "Other Upload" folder list cleanly:

- **"UPLOAD"** appears twice: a root folder (`bcf1c565…`, parent `null`, holds e.g. `HOR JS`) and a folder nested under "Destination Clusters" (`c60f225e…`, holds the `BOTG …` staging subfolders).
- **"BILDERARCHIV BOTG"** appears twice: a root folder (`30a4e27f…`, parent `null`) and one nested under "Destination Clusters" (`3c1e604d…`).

**Action needed:** before finalizing which folders populate the "Other Upload" dropdown, confirm with the user/client which of each duplicate pair is the intended long-term home for non-destination uploads (e.g. Portraits), and consider renaming one of each pair for clarity. Not renamed yet — flagged here rather than guessed.

## Still pending (UI/logic layer)

- Upload modal radio (Destination/Other Upload), geography→folder auto-resolution, folder-dropdown filtering by `destinations_cluster IS NULL`.
- Creating the actual "Portraits" folder(s) once the duplicate-"UPLOAD" ambiguity above is resolved.

See `docs/plans/LOCAL/2026-09-11-media-partner-and-non-destination-folders.md` for the full plan.
