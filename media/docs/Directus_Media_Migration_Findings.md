# Directus Media Migration — Findings from the Import Build (July 2026)

_Companion to `FotoWare_Source_System_Analysis.md`. These findings came out of actually building and running the media-import pipeline (lives in `botg-import-service/media-import/`, see its `docs/MEDIA-IMPORT-PLAN.md` for the implementation record). Several correct or extend claims in the earlier analysis doc — noted inline._

## 1. Directus thumbnail/transformation limit — action needed on all environments

Directus refuses to generate thumbnails or any image transformation for files whose **source** width or height exceeds `ASSETS_TRANSFORM_IMAGE_MAX_DIMENSION` (default **6000px**). The request fails with `ILLEGAL_ASSET_TRANSFORMATION` — in the media library UI this looks like broken/missing thumbnails, even though the file record (filesize, pixels, type) is completely correct. Verified against Directus core source (`api/src/services/assets.ts`, the guard is deliberate memory protection) and reproduced live on dev with migrated hotel photos.

Scale, measured on the full real catalog (95,941 assets):

| Threshold | Assets exceeding it |
|---|---|
| 6000px (the default limit) | **8,780 (~9.2%)** |
| 8000px | 2,396 |
| 10000px | 218 |

**Recommendation**: set `ASSETS_TRANSFORM_IMAGE_MAX_DIMENSION=12000` in each Directus instance's environment (dev → staging → prod) and restart. That unblocks all but ~100-odd extreme panoramas while keeping a sane memory ceiling (the guard exists because a 145 MP transform can eat ~600 MB of RAM). This is a hosting-side change on the Directus instances themselves.

## 1b. Custom Media Library thumbnails showing gray for migrated files — fixed in code, needs deploy

**Symptom**: after replacing placeholder uploads with real photos, migrated files rendered correctly (with thumbnails) in Directus's native File Library (`/admin/files`) but as gray boxes in the custom Media Library module (`/admin/media-library`, from `directus/extensions/media-bundle`).

**Root cause (verified, not guessed)**: the browser's asset cache, not a rendering failure or the transform-dimension limit above.
- Directus serves `/assets/*` with `cache-control: private, max-age=2592000` (30 days).
- The migrated files' binaries were replaced **in place** (same file id → same asset URL) — so any thumbnail URL a browser had already loaded during the placeholder era keeps serving that cached (wrong) image for up to 30 days after the real photo replaces it.
- The custom module's thumbnail URLs (`media-library/src/composables/useAssetUrl.ts`, and `directus-extension-media-uploader/src/components/FileThumbPreview.vue`/`FileDetailPreview.vue`) had **no cache-busting parameter** — `/assets/<id>?width=48&height=48&fit=cover`, identical before and after replacement.
- Directus's **native** File Library avoids this entirely: every asset URL it builds includes `&v=<file.modified_on>` (confirmed in Directus core source, `app/src/utils/get-asset-url.ts` + `app/src/displays/image/image.vue`) — the URL changes whenever the file's content changes, so the browser can never serve a stale cached copy.
- Fetching the module's exact (un-cache-busted) URLs fresh from the server returned the correct real-photo JPEGs — confirming the server/transform pipeline was never the problem.

**Fix applied**: added the same `v=<modified_on>` cache-buster pattern to the custom bundle, matching native behavior exactly:
- `media-library/src/composables/useAssetUrl.ts` — `getAssetUrl`/`getThumbnailUrl`/`getPreviewUrl` now accept a `cacheBuster` param appended as `v=`.
- `media-library/src/views/MediaLibraryView.vue` (list + grid thumbnails) and `FileDetailView.vue` (preview) — pass `item.modified_on`/`file.modified_on` at each call site.
- `directus-extension-media-uploader/src/components/FileThumbPreview.vue` and `FileDetailPreview.vue` — new `modifiedOn` prop, appended as `&v=`.
- `ThumbnailCard.vue`, `AddExistingModal.vue`, `interface.vue` — pass `modified_on` down, and added it to each component's `/files` fetch field list where it was missing.
- Rebuilt (`npm run build`) and verified the compiled `dist/app.js` contains the `v=` construction in all the above spots.

**Status**: code fixed and built locally; **not yet deployed** to the running dev/staging/prod Directus instances — this repo has no deploy script for the extension bundle, so pushing `dist/app.js` to a live instance needs whatever manual process the team already uses.

**Prevention for the full-scale migration**: this bug only manifests when someone has *already browsed* a file in the custom module before its binary gets replaced — so it will recur for any newly-migrated files at scale unless the fix is deployed before large runs begin, or unless nobody browses the media library between initial (placeholder) upload and real-file replacement.

## 2. No video or audio assets exist — corrects §4.2 / closes open item #11 of the source-system analysis

Direct full-collection queries: **0** of 95,941 `allfiles` documents have `video_info` or `audio_info`. The catalog is 100% still images:

| file_type | Count |
|---|---|
| JPEG | 95,919 |
| PNG | 14 |
| EPSF | 4 |
| PDF | 3 |
| TIFF | 1 |

The earlier doc inferred video/audio support from index definitions (`video_info.preview.*` etc.) — that's unused schema headroom, not real data.

## 3. Catalog extremes (max pixels / max file size)

- **Largest by total pixels**: `AUS_NT_20181031_IVB.jpg` — **22406×8292 (185.8 MP)**, 75.5 MB — `\\FW-SERVER-2018\ARCHIVE\BILDERARCHIV BOTG\BILDER\AUSTRALIEN\`
- **Widest**: `RSA_MPL_302_20170707_AD.jpg` — **28530×5080** panorama, **179.5 MB** (also the largest plausible file by size) — `...\BILDER\AFRIKA\`
- **Tallest**: `ASI_BHU_004_20130614_PP.jpg` — **10200×13600**, 42.0 MB — `...\BILDER\ASIEN\`
- **Largest files by size**: `YPII_Main Deck.png` and `YPII_Main Deck (1).png` (in `\\FW-SERVER-2018\ARCHIVE\UPLOAD\BOTG AUP\`), **1,437 MB each** at 1063×591 px — confirmed genuinely that size by the client (not a catalog error). They are upload-area files, not product-linked, so they fall outside migration scope (see §3b).
- No videos exist (see §2), so there is no "largest video."

## 3b. File-size distribution (import planning)

Measured from the `allfiles` dump; "product-linked" = distinct filenames joined from MySQL `pictures`×`pictures_objects` (all product types; the hotels-only subset from the earlier analysis is ~22.4k pictures).

**Scope (client-confirmed)**: product-linked is only the *current* need — **the end goal is migrating the entire catalog, all ~95,941 assets (695.6 GB), linked or not, into Directus + S3**. Unlinked assets will exist as library-only files (no product junction) and need a filename/Mongo-`_id` dedup key, since the MySQL `picid` key only exists for product-linked pictures.

| Bucket | Whole catalog (95,941) | Product-linked (42,015 filenames) |
|---|---|---|
| 0–5 MB | 47,847 | 19,902 |
| 5–10 MB | 23,370 | 10,412 |
| 10–25 MB | 21,262 | 10,055 |
| 25–50 MB | 3,169 | 1,594 |
| 50–100 MB | 282 | 177 |
| 100–200 MB | 9 | 2 |
| 200 MB+ | 2 | 0 |
| **Total volume** | **695.6 GB** (avg 7.42 MB) | **326.7 GB** (avg 7.94 MB) |

- All 11 files over 100 MB are enumerated in the import repo's plan doc; the largest *product-linked* file is `NA_REG_404_20120626_ss.jpg` (127.8 MB, 12911×5177 — a panorama).
- The two 1,437 MB PNGs (`YPII_Main Deck.png` / `YPII_Main Deck (1).png`, `\ARCHIVE\UPLOAD\BOTG AUP\`) are confirmed genuinely that size by the client — but they are **not** product-linked (upload-area files), so they fall outside migration scope.
- 3 catalog entries have `file_size: 0` (all in `\ARCHIVE\UPLOAD\BOTG AFRIKA\`: `img_1828.jpg`, `Walkers Plains Camp Firepit.jpg`, `Cycling at Ai Aiba in rainy season .jpg`) — likely failed/incomplete uploads.
- **Dedup edge case**: 127 product-linked filenames match more than one `allfiles` document (same filename in two archives, e.g. BOTG and KARAWANE) — the filename→asset join is not perfectly 1:1; which archive copy is authoritative needs a client decision before full-scale migration.

## 4. Geography resolution — the filename prefix, not IPTC free text, is the reliable key

The originally-planned matching of IPTC City (`metadata.90`) / Country (`metadata.101`) free text against the Directus `places`/`countries` taxonomy turned out to be untrustworthy in real data: `metadata.101` has **465 distinct values** mixing real countries with Australian states, category labels (`Regional`, `KREUZFAHRT`, `Transport`, `Diverses`), and `Sonstiges` (the single most common "City" value — 13,094 occurrences).

What works instead: **`countries.media_code_legacy_botg` and `states.media_code_legacy_botg`** (fields the client's team had already populated — 71 countries, 29 states) encode exactly the Fotoware filename prefix convention: `AUS_NT_20190730_BR.jpg` → state code `AUS_NT` → Northern Territory → country Australia → destination Australien. Verified against 2,000 random real filenames. The import resolves `country`/`state`/`destination` this way; `place`/`region` are deferred (no equivalent code-based key exists).

## 5. IPTC dictionary gaps — extends §4.6 of the source-system analysis

Full-collection diff of every metadata code actually present (143 distinct) against the SQL Server `IptcField` dictionary (338 rows) found **5 codes in real data with no dictionary entry**: **312, 321, 386, 390, 391**. Notably 321 (21.5% of all assets — looks like a modify-timestamp) and 386 (structured Shutterstock/licensor attribution, ~1%). The earlier doc's "all sampled codes matched, no exceptions" was a sampling artifact.

Also: `metadata.200`/`metadata.202` ("Custom Field 1/3") carry the literal constant **"PRIMARIX"** on 61%/18% of assets — a provenance breadcrumb tying assets to the Primarix import origin.

## 6. Directus data/config gaps found during the build (fixed on dev, need repeating on staging/prod)

- `translations` (languages) collection had **no `en-GB` row** (only de-DE, nl-NL, de-CH) — English captions had nowhere to attach. Row created on dev.
- `directus_files` gained `fotoware_picture_id` (integer — the Primarix `picid`, the migration's dedup key) and `fotoware_is_placeholder` (boolean); the pre-existing, never-populated `fotoware_file_name` field was reused as intended.
- `hotels_directus_files` junction gained a `sort` column (integer) to carry the legacy per-hotel photo order (`pictures_objects.sort`).
- Two active Flows on `directus_files` (undocumented in the earlier analysis): **"IPTC Metadata Auto-Fill"** (files.upload → IPTC extraction + AI-vision alt/description/captions) and **"Generated Filename Auto-Fill"**. The import pipeline works *with* them: it lets them run, then overrides captions (with the authentic legacy MySQL `pictures_text` captions) and the media_data/media_rights/description fields (with authoritative Fotoware catalog values) in follow-up passes.

## 7. Migration status snapshot (as of 2026-07-07)

Hotels 9, 13, 14 fully migrated on dev as the pilot: 65 photos uploaded/linked (63 with the real binaries, 2 still placeholders pending 2 missing source files), each with geography, flags (`is_map`/`tour32_export`), per-hotel sort order, legacy captions, and full Fotoware metadata. Idempotency verified (re-runs create no duplicates). The implementation and its phase-by-phase verification record live in `botg-import-service/media-import/docs/`.
