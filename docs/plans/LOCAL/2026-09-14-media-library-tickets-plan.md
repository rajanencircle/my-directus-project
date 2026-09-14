# Media Library — Final Plan: Partner Separation + Non-Destination Folders

**Status: both tickets implemented and verified on `directus-local`. Nothing applied to dev/staging/main.**

This is the consolidated, current-state plan for the two ClickUp tickets against `directus/extensions/media-bundle/`. It supersedes the original planning doc (`2026-09-11-media-partner-and-non-destination-folders.md`) wherever the two disagree — several things changed shape after implementation started, based on the user's own corrections. See `docs/changes/LOCAL/2026-09-14-media-library-tickets-changes.md` for the exact fields/collections/ids created and the verification steps run.

## Context

BOTG's media library needed two things the legacy (FotoWare-imported) structure didn't support:

1. **"Separating libraries correctly"** — media should be scoped to the partner(s) it belongs to (BoTG, Karawane, and others in the future), with a user able to belong to more than one partner, a visible distinction for partner-limited media, and a way to resolve the conflict when a product (hotel, cruise, tour...) gains a partner that doesn't cover its existing media.
2. **"Separate folders for portraits and other non-destination images"** — some uploads (travel-expert portraits, etc.) aren't tied to a destination and need their own folder structure, separate from the geography-driven destination clusters.

## Ticket 1 — Multi-partner media library

### Data model

- `partner` — pre-existing collection, unchanged (label, partner_type, visually accent color, status).
- `directus_users.partner_selected` — converted from a single M2O to an **M2M** via a new junction `users_partner`. A user can now belong to any number of partners. (Old scalar column kept as `partner_selected_legacy`, unused, not yet dropped.)
- `directus_files.partner_selected` — **new M2M** via a new junction `files_partner`. **No separate visibility toggle** — the rule is simply: empty list = visible to every partner (no regression for existing/untagged files); non-empty = visible only to those partners.
- Both new junctions are named without the reserved `directus_` prefix (`users_partner`, `files_partner`), per Directus's naming restriction on custom collections — kept as close to the existing `<collection>_partner` convention as that restriction allows.

### Upload flow

The upload modal (shared by the Media Library and every product's Media tab) gained a **"Partner Selected"** checklist, populated only from the current user's own partners (never the full global list, to avoid accidental mis-scoping), defaulting to all of them. The selection is written to `files_partner` right after the file record is created.

### Library visibility & UI

Every partner-scoping read path in the bundle (file/folder/album stores, download utilities, the media-uploader interface, "Add Existing" picker, folder tree) was converted from single-partner to multi-partner logic: a file/folder/album is visible if it's unrestricted, or if the viewer shares at least one partner with it. Partner-limited media gets a colored accent (its partner's color when scoped to one, a neutral "mixed" accent when scoped to several); an info dialog lists every partner a file belongs to.

### Conflict dialogue (the "if more partners are added to a product" requirement)

Two designs were considered:

- **Option A** (chosen): reconcile whenever a product's Media tab is opened — no live interception of the partner-picker field, no new extension, no Flow. Trade-off: an unresolved mismatch resurfaces on every visit to the tab, since there's no "already seen this" tracking.
- Option B (not built): a Flow-based diff on save that only surfaces genuinely *new* conflicts, via a small intermediate "pending conflict" collection. Left as a possible future refinement if Option A's repeat-prompting turns out to be noisy in practice.

Implementation lives entirely in the **existing** `directus-extension-media-uploader` interface (no new extension — an earlier attempt at a standalone custom field interface, `directus-extension-interface-partner-guard`, was built, tested, then explicitly deleted per the user's direction in favor of this approach). It auto-discovers each product collection's partner M2M relation the same way it already discovers the media M2M relation, so it works generically across hotels, cruises, tours/excursions, rental companies — any collection following the existing `<collection>_partner` junction convention — without per-collection configuration. When a mismatch is found, a dialog offers: **Extend media rights** (add the product's partners to the conflicting file), **Remove media from item** (unlink the file from the product, never deletes the file), or **Leave as-is**.

## Ticket 2 — Destination Upload vs. Other (non-destination) Upload

### Data model

- `directus_folders.destinations_cluster` — new field (M2O → `destinations_cluster`). A folder with this set is a canonical destination-cluster folder; a folder with it `null` is eligible for non-destination ("Other") uploads.
- **Course correction:** the existing folder tree (`BILDERARCHIV BOTG`/`BILDERARCHIV KARAWANE` → `BILDER` → region subfolders) turned out to be a **legacy import from the old FotoWare system**, not the intended target structure, and per-brand folder duplication is unnecessary now that partner scoping lives on the file itself (Ticket 1). The plan was corrected mid-implementation: instead of tagging the legacy folders, **8 new canonical folders** were created — one per `destinations_cluster` (Afrika, Asien, Europa, Lateinamerika, Nordamerika, Ozeanien, Polarregionen, Sonstiges) — flat under the existing "Destination Clusters" root. The legacy tree is untouched, un-tagged, and now purely historical.
- A new root folder **"OTHER UPLOADS"** (with a **"Portraits"** child) holds non-destination content going forward.

### Upload flow

A **Destination Upload / Other Upload** radio sits at the top of the upload modal (shown only when the instance has geography enabled at all):

- **Destination Upload**: geography fields shown as before; **no folder field is shown at all**. Selecting a destination silently resolves `destinations.destinations_cluster_id` → the matching canonical folder and assigns it in the background.
- **Other Upload**: geography fields hidden; a manual folder picker is shown instead, filtered to exclude every folder tagged with a `destinations_cluster` **and** every folder that merely *contains* one (so container folders like "Destination Clusters" itself are hidden too, not just the cluster folders directly).

### Migrating existing media

A new script, `scripts/migrate-media-to-destination-cluster-folders.js`, moves already-uploaded files out of the legacy folder tree into their canonical cluster folder, based on each file's `destination`. CommonJS, env-var credentials, `--dry-run` by default, backs up every moved file's previous folder before writing. Tested end-to-end on local; **not yet run against staging** — that's a separate step to trigger explicitly when ready.

## Verification approach used throughout

Every schema change was applied via the `directus-local` MCP tools (or direct SQL only where the MCP tooling had no path — always backed up first, always documented). Every code change was rebuilt (`npm run build` in `directus/extensions/media-bundle`) and exercised live in the browser as multiple real users (`admin@gmail.com`, `botg@gmail.com`, `karawane@gmail.com`) with throwaway test files/records created and cleaned up via the API — never left behind. See the changes doc for the specific scenarios run.
