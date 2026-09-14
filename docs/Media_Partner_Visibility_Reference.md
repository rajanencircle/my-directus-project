# Media Partner Visibility — Reference

How partner-scoped media visibility actually resolves, with a full worked example. This describes **current behavior** of the media-bundle extension (not a plan, not a change log — those live in `docs/plans/LOCAL/` and `docs/changes/LOCAL/`; this doc is the plain-English reference for how the resulting system behaves, useful once this logic ships beyond local too).

## The rule

**Visibility is decided only between a *viewer* and an *image* — never by the product the image happens to be attached to.**

- `directus_users.partner_visibility` (`all` / `selected`) + `partner_selected` (M2M → `partner`) — who a viewer *is*.
- `directus_files.partner_visibility` (`all` / `selected`) + `partner_selected` (M2M → `partner`) — who an image is *scoped to*.
- A viewer sees an image if either side says `all`, or if the two `partner_selected` lists overlap.
- A product's own `partner_visibility`/`partner_selected` (`partner_type`/`partner` on `hotels`; `partner_visibility`/`partner_selected` on `cruises`/`tours`/`excursions`/`vehicles`) controls who the **product** is scoped to — for the public API's product feed — and has **no bearing** on which of its attached media a given editor sees in the product's Media tab.
- There is no interactive "resolve this conflict" step. A product can hold media that doesn't cover every one of its own partners; each editor simply sees whichever subset of the attached media matches their own scope, silently, every time they open the tab.
- Enforcement is application-level (inside the Media Library's own queries), not a Directus row-level permission — a request outside that UI is only as restricted as its Directus role otherwise allows.

## Worked example

**Partners:** `p1`, `p2`, `p3`

**Users** (`directus_users`)

| User | partner_visibility | partner_selected |
|---|---|---|
| u1 | selected | p1 |
| u2 | selected | p2, p3 |
| u3 | **all** | — (unrestricted) |

**Images** (`directus_files`)

| Image | uploaded_by | partner_visibility | partner_selected |
|---|---|---|---|
| i1 | u1 | selected | p1 |
| i2 | u2 | selected | **p2 only** — even though u2 belongs to p2 *and* p3, the file's own scope wins, not the uploader's |
| i3 | u3 | **all** | — (visible to everyone) |

**Hotels** (`hotels.partner_type` + `partner`)

| Hotel | partner_type | partner |
|---|---|---|
| h1 | selected | p1 |
| h2 | selected | p2, p3 |
| h3 | **all** | — |

**Cruises** (`cruises.partner_visibility` + `partner_selected`)

| Cruise | partner_visibility | partner_selected |
|---|---|---|
| c1 | selected | p1, p2 |
| c2 | selected | **p3 only** |
| c3 | **all** | — |

**Media attached to each product's Media tab:**

| Product | Attached images |
|---|---|
| h1 | i1, i3 |
| h2 | i2, i3 |
| h3 | i1, i2, i3 |
| c1 | i1, i2 |
| c2 | i1, i3 — deliberate mismatch: i1 is p1-only, c2 is p3-only |
| c3 | i2 |

### Global visibility matrix (the core table — everything below is derived from this)

| Viewer | i1 (p1) | i2 (p2) | i3 (all) |
|---|---|---|---|
| **u1** (p1) | visible | hidden | visible |
| **u2** (p2, p3) | hidden | visible | visible |
| **u3** (all) | visible | visible | visible |

### Per-product: what each user actually sees

| Product | u1 sees | u2 sees | u3 sees |
|---|---|---|---|
| **h1** (i1, i3) | i1, i3 (2/2) | i3 (1/2) | i1, i3 (2/2) |
| **h2** (i2, i3) | i3 (1/2) | i2, i3 (2/2) | i2, i3 (2/2) |
| **h3** (i1, i2, i3) | i1, i3 (2/3) | i2, i3 (2/3) | i1, i2, i3 (3/3) |
| **c1** (i1, i2) | i1 (1/2) | i2 (1/2) | i1, i2 (2/2) |
| **c2** (i1, i3) ⚠️ | i1, i3 (2/2) | i3 (1/2) | i1, i3 (2/2) |
| **c3** (i2) | *nothing* (0/1) | i2 (1/1) | i2 (1/1) |

### The case worth remembering: `c2`

c2 is scoped to **p3 only**, but has a **p1-only** image (i1) attached — nothing blocks that at attach-time. So:
- **u1** (p1) opens c2's Media tab and sees i1, even though c2 itself has nothing to do with p1 — purely because i1's own scope covers u1.
- **u2** (p2, p3) — the partner c2 is actually *for* — doesn't see i1 at all, only i3.

This is exactly the scenario the earlier "conflict dialogue" prototype used to interrupt an editor to resolve. It's since been removed in favor of the silent, per-viewer show/hide demonstrated above.

### The less obvious consequence: `c3`

c3 is unrestricted (`all`) as a *product*, but its only attached image (i2) is locked to p2 — so **u1 opens an "open to everyone" cruise and finds an empty Media tab.** Same rule, just a less intuitive result of it: product-level `all` never overrides an image's own restriction.

## Where this is implemented

- `directus/extensions/media-bundle/media-library/src/composables/usePartnerScope.ts` — `filesPartnerOrFilter`, `partnerAlbumOrFilter`, `collectPartnerFolderIds`, `ViewerScope`.
- `directus/extensions/media-bundle/directus-extension-media-uploader/src/interface.vue` — `isFileVisibleForPartner`, `splitRowsByPartner` (the per-viewer show/hide inside a product's Media tab).
- `directus/extensions/api/src/utils/images.js` — `filterMediaJunctionByPartner` (the equivalent rule for the public product API, keyed off an `api_users` token's own `partner_visibility`/`partner_selected` instead of a `directus_users` session).

Full change history: `docs/changes/LOCAL/2026-09-14-partner-visibility-unification.md` and `docs/changes/LOCAL/2026-09-14-partner-visibility-bugfix-and-conflict-dialogue-removal.md`.
