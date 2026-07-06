# FotoWare Source System Analysis (BOTG Media Migration)

Living knowledge base for everything discovered about the client's legacy **FotoWare/Fotoweb** installation and its **Primarix** (MySQL) source data, as part of migrating the media library to Directus + S3 (Hetzner). Source materials live in [`media/`](../): a SQL Server backup, a MongoDB dump, a metadata schema XML, and a ChatGPT session transcript from live sessions on the client's FotoWare server. The Primarix MySQL dump itself (`bestof_full_01-07-2026` and siblings) lives locally in Homebrew MySQL, not in this repo.

**Update this file whenever a new finding surfaces** — append, don't rewrite history; note the date and source of each addition.

---

## 1. System architecture

FotoWare/Fotoweb runs on a Windows server (`FW-SERVER-2018\FOTOWARE`) and is backed by **two databases**, not one:

| Component | Role |
|---|---|
| **SQL Server** (instance `FOTOWARE`, DB `FW-MEDIABOTG`) | FotoWeb admin/config data: users, groups, archives, IPTC field dictionary, processing profiles, and a large volume of usage/audit event logs |
| **MongoDB** (v4.4.13, port `7200`) | FotoWeb's search index and application/asset metadata — almost certainly where the actual asset catalog (filenames, dimensions, per-asset IPTC/EXIF, etc.) lives |

Confirmed Windows services on the server (from `chatgpt-chat-history` transcript + screenshots, 2026-07-04):

- `FotoWeb MongoDB Server` (`FWMongoDB`) — "Built-in MongoDB Server for FotoWeb" — Running, Automatic
- `SQL Server (FOTOWARE)` (`MSSQL$FOTOWARE`) — Running, Automatic
- `SQL Server-CEIP-Dienst (FOTOWARE)` — Running (telemetry, not relevant)
- `FotoWare Index Manager` — "Provides index and search services to FotoWare applications" — Running
- `FotoWare LogServer Service` — Running
- `FotoWare Operations Center` — Running
- `FotoWeb Server` — "Processes FotoWeb API requests" — Running
- `FotoWeb Service Engine` — "performs maintenance tasks" — Running
- `FotoWeb Workflow Service` — "Performs background processing of workflow requests" — Running
- Also present but unrelated: `SQL Server (SQLEXPRESS)`, `SQL Server (SQLEXPRESS01)` (Stopped), `SchneiderUPSMySQL` (Running — a UPS monitoring tool, unrelated to FotoWare)

**Key inference:** the SQL Server database contains no asset-level table (no `Asset`/`File`/`Media` table; `Albums*` tables are all empty — see §3). ChatGPT independently reached the same conclusion when inspecting the live server: *"The SQL database contains only 38 tables, all standard FotoWeb tables... I don't see any custom BOTG or Directus application tables."* This strongly implies the real per-asset catalog (dimensions, capture metadata, search index) is stored in **MongoDB**. **Confirmed 2026-07-04**: MongoDB holds two databases, `fotoware` (index/search — includes an `allfiles` collection, the likely master asset catalog) and `fotoweb` (application layer) — see §4.

---

## 2. SQL Server details

| Property | Value |
|---|---|
| Server | `FW-SERVER-2018\FOTOWARE` |
| Instance name | `FOTOWARE` |
| Database name | `FW-MEDIABOTG` |
| Live DB size (as of live inspection) | 720 MB total (~278 MB data, ~29 MB index, ~92 MB unused) |
| Live data file path | `C:\Program Files\Microsoft SQL Server\MSSQL15.FOTOWARE\MSSQL\DATA\FW-MEDIABOTG.mdf` (SQL Server **2019** — `MSSQL15`) |
| Backup file in repo (`media/fw-mediabotg.bak`) | 745,756,160 bytes, dated 2020-09-16. Its internal file-header metadata records the *original* physical path as `MSSQL10_50.FOTOWARE` (SQL Server **2008 R2**) — meaning this specific backup predates a later SQL Server upgrade (2008 R2 → 2019) that the live server has since gone through. On restore into SQL Server 2022 the DB auto-upgraded through internal versions 661 → 957 with no errors. |
| Backup command in use on the live server | `BACKUP DATABASE [FW-MEDIABOTG] TO DISK='D:\Backup\FW-MEDIABOTG.bak' WITH INIT, COMPRESSION;` |

`media/fw-mediabotg.zip` was checked and contains nothing new — it's just this same `.bak` file re-zipped (745,756,160 bytes, same date), not a separate/newer backup.

---

## 3. SQL Server schema & data (from direct restore + analysis, 2026-07-04)

Restored locally via Docker (`media/docker-compose.yaml`, `mcr.microsoft.com/mssql/server:2022-latest`, `linux/amd64` emulated — no arm64 SQL Server image exists). Credentials in `media/.env` (gitignored).

**Databases on the instance:** only `FW-MEDIABOTG` is a user database; `master`/`model`/`msdb`/`tempdb` are SQL Server system DBs.

**All 37 tables in `FW-MEDIABOTG` (schema `dbo`), with row counts:**

| Table | Rows | Notes |
|---|---|---|
| EventLogReport | 311,872 | audit/event log |
| ALEventLog | 290,789 | audit/event log — appears to mirror `EventLogReport` (identical distinct-value counts) |
| EventLogReportView | 248,245 | audit/event log |
| ALEventLogIptc | 85,800 | per-event IPTC snapshot (Byline/Title/Source) |
| EventLogReportIptc | 70,743 | per-event IPTC snapshot |
| ALSearchWords | 40,609 | search query log |
| ALSearchLog | 21,083 | search query log |
| TimeDimension | 18,628 | date dimension table for reporting |
| IptcField | 338 | standard IPTC field code→name dictionary |
| Actions | 62 | |
| UserMembership | 57 | user↔group memberships |
| ProcessingProfile | 21 | image derivative/rendition presets |
| User | 19 | accounts (contains PII: email/address/phone) |
| Activity | 12 | audit action-type dictionary |
| Archive | 5 | media libraries |
| Group | 5 | permission groups |
| Report, CustomSort | 4 each | |
| ReportGroup, ReportHistory | 3 each | |
| ReportMail, ReportChart | 1 each | |
| ReportEvent, ReportField, ReportFilter, ReportArchive, ReportSortDescriptor, ReportGroupDescriptor, DBProperties, Destination, EventLogReportMembership, CustomName, AlbumAccessLists, AlbumEntries, AlbumEvents, AlbumInvitations, AlbumKeywords, Albums | 0 each | Albums feature unused on this instance |

**Total ~1,089,589 rows, ~98% of which is audit/event-log data.** The actual config footprint is tiny (~500 rows across `Archive`, `Group`, `User`, `IptcField`, `ProcessingProfile`, `Activity`, `UserMembership`, `Actions`).

### 3.1 Archives (media libraries)

| Id | ArchiveId | Name |
|---|---|---|
| 1 | 0 | Unknown |
| 2 | 5000 | BOTG |
| 3 | 5001 | KARAWANE |
| 4 | 5002 | Mein Upload |
| 5 | 5006 | Bildeingänge |

### 3.2 Groups

Everyone, Registered Users, Administratoren, BOTG User, KARAWANE User (IDs 10000–10004).

### 3.3 Users (19 total)

Accounts map to BOTG's sub-brands: `BoTG Admin/Pro/Standard/Grafik`, `BoTG CRU` (Cruising Reise), `BoTG DIA` (DIAMIR Erlebnisreisen), `BoTG DTT` (Dreamtime Travel), `BoTG HOR` (Horizont Fernreisen), `BoTG AUP` (Australia PLUS Reisen), `BoTG KAR` (Karawane Reisen), `BoTG PIT` (Pacific Island Travel), plus `System Admin` (Inka van Baal), `xenario` (vendor support account), and three `KAR Fotoweb` variants (Susanne Weigel / Karawane Reisen). `User` table also has `Company`, `City`, `Country`, `ZipCode`, `Address1-4`, `PhoneNumber`, `Email` columns — PII, handle carefully.

### 3.4 Processing profiles (21)

Image rendition presets: `JPG CMYK`, `JPG sRGB`, `TIFF JPG CMYK`, `Primarix`, `Primarix Full HD RGB`, `Print (300 dpi, Originalgröße, CMYK)`, `WEB (900 Pixel, 72dpi, RGB)`, `WEB (72dpi, 450 Pixel, JPG, RGB)`, `ORIGINAL`, `2400 PIX, 300 dpi, RGB`, `JPG, 300 dpi, CMYK`, `manuelle Änderung`, `Headerbilder Web`, `<ORIGINAL_FILE>`, plus 5 profiles named as raw GUIDs (likely auto-generated/orphaned).

### 3.5 Activity types (12)

Search, Login, Logout, Delete, EditText (metadata edit), Crop, Upload, Download, Workflow, Order, Details (view asset details), Place.

### 3.6 IptcField (338 rows)

Standard IPTC field code dictionary (e.g. code 5 = Title, code 80 = Byline, code 25 = Keywords, code 115 = Source). Matches the namespace/field structure documented in `media/MetadataConfiguration.xml` (FotoWare's own XMP/IPTC schema config — includes `exif`/`tiff` namespaces too, i.e. FotoWare's *metadata schema* is aware of EXIF/dimension-type fields even though none of that data is stored in this SQL database).

**This is the authoritative key→name dictionary for `fotoware.allfiles.metadata` too** (§4.2/§4.6) — see the correction there; an earlier note in this doc claiming the two didn't match was based on too small a sample and has been corrected.

### 3.7 Event log columns (audit trail, not an asset catalog)

`ALEventLog` / `EventLogReport` columns include: `EventName`, `EventTime`, `UserID`, `ArchiveID`, `FileName`, `FilePath`, `ImageSize` (bytes, **not** pixel dimensions), `ProcessingProfileName`, `PersistentUrl`, `ThumbnailHref`. Per-event IPTC key/value snapshots live in `ALEventLogIptc`/`EventLogReportIptc`, keyed by `IptcCode`.

Distinct `EventName` values actually logged in `ALEventLog`: **Workflow** (269,885), **Download** (8,752), **Delete** (7,574), **Login** (4,578) — notably **no `Upload` events** with file details are logged in this table, despite `Activity` listing `Upload` as a valid type. This means any file uploaded but never downloaded/deleted/workflow-processed leaves no trace here.

IPTC codes actually populated in the logs: `Byline` (photographer, code 80) — 55,202 occurrences; `Title` (code 5) — 24,926; `Source` (code 115) — 5,672.

### 3.8 Derived "asset" count (best-effort, not authoritative)

No dedicated asset table exists, so a count was derived by deduplicating `PersistentUrl` (full archive-relative path) across `ALEventLog`/`EventLogReport`:

- Distinct filenames only: **114,007**
- Distinct full paths (`PersistentUrl`): **125,007** ← safer count, since filenames recur across different archive folders
- `ALEventLog` and `EventLogReport` yielded identical distinct sets — they appear to mirror the same underlying events; UNION-ing them added nothing new

**Caveat:** this is a lower bound derived from *access/action* logs, not a true inventory — assets uploaded but never downloaded/deleted/workflow-touched are invisible to this method (see §3.7). The real total living in FotoWare's archive storage / MongoDB index could be higher.

---

## 4. MongoDB details

| Property | Value |
|---|---|
| Version | 4.4.13 (Windows x86_64, WiredTiger engine) |
| Service name | `FWMongoDB` / display name `FotoWeb MongoDB Server` |
| Port | **7200** (non-default — default MongoDB port is 27017) |
| Data path | `C:\ProgramData\FotoWare\FotoWeb\Operations\MongoDBData` |
| Log path | `C:\ProgramData\FotoWare\FotoWeb\Operations\Logs\MongoDB\mongod.log` |
| Config file | `C:\ProgramData\FotoWare\FotoWeb\Server Settings\Configuration\mongodb.conf` |
| Journaling | enabled |
| Available client tools | `mongo.exe`, `mongodump.exe`, `mongorestore.exe` — all present at `C:\Program Files (x86)\FotoWare\FotoWeb\MongoDB\` (dated 2023-05-05) |

**⚠️ Do not upgrade `mongod.exe` independently** — it's bundled with FotoWeb; only upgrade via a FotoWeb version upgrade, or FotoWeb may become incompatible with its own database (explicit caution raised during the live session).

### 4.1 Databases on the live Mongo instance (confirmed via `show dbs`, 2026-07-04)

| Database | Size | Notes |
|---|---|---|
| `fotoware` | 0.057 GB | **Prime suspect for the actual asset catalog** — see §4.2 |
| `fotoweb` | 0.012 GB | Application layer (albums, orders, exports, users, auth) |
| `admin`, `config`, `local` | 0.000 GB each | MongoDB internals, not FotoWare-specific |
| `videotrs` | 0.000 GB | Likely video-transcoding related; empty/negligible |

### 4.2 `fotoware` db — collections

```
allfiles
allfolders
allservers
counters
```

**`allfiles` is confirmed as the master asset index** (verified 2026-07-06 by restoring the mongodump locally and querying directly — see §4.5). The name directly matches the `FotoWare Index Manager` Windows service ("*Provides index and search services to FotoWare applications*", confirmed running in §1).

**Document counts:** `allfiles` = **95,941**, `allfolders` = **51**, `allservers` = **1** (single-server deployment, `FW-SERVER-2018`, as expected).

Note: 95,941 is *lower* than the ~125,007 lower-bound estimate derived from SQL audit logs (§3.8) — likely because the audit logs count every distinct path a file was ever downloaded/moved under over time (renames/relocations inflate that count), while `allfiles` reflects current live state only. Treat `allfiles`' count as the more authoritative "how many assets exist right now" figure.

**Confirmed document shape** (sample from `fotoware.allfiles`, restored locally):

```json
{
  "_id": "a02e30790b57481aa985cf8ff5c1f74e",
  "create_time": "2020-04-17T08:28:06.776Z",
  "update_time": "2021-05-11T22:00:54.318Z",
  "revision": 3,
  "server_index": [
    { "server": "FW-SERVER-2018", "index": "KARAWANE", "display_path": "Karawane/Bilder/ASIEN/ASN_ID_310_20070515_KA.jpg", "path": "KARAWANE/BILDER/ASIEN/ASN_ID_310_20070515_KA.JPG" }
  ],
  "file_time": "2018-03-24T16:14:44Z",
  "file_size": 166912,
  "file_path": "\\\\FW-SERVER-2018\\ARCHIVE\\BILDERARCHIV KARAWANE\\BILDER\\ASIEN\\ASN_ID_310_20070515_KA.JPG",
  "display_path": "\\\\FW-SERVER-2018\\Archive\\Bilderarchiv KARAWANE\\Bilder\\ASIEN\\ASN_ID_310_20070515_KA.jpg",
  "file_type": "JPEG",
  "file_extension": "JPG",
  "display_filename": "ASN_ID_310_20070515_KA.jpg",
  "folder_name": "ASIEN",
  "type_info": { "has_sidecar": "false" },
  "image_info": { "pixel_width": 685, "pixel_height": 425, "resolution": 300, "rotation": 0, "color_space": "cmyk" },
  "metadata_etag": 3856489820,
  "metadata": { "317": "False", "350": "2018-03-24T17:14:42", "426": "image/jpeg" }
}
```

**This closes the open question from earlier sessions** — pixel dimensions (`image_info.pixel_width`/`pixel_height`), resolution/DPI, color space, real file size, and both the raw UNC file path and a display-friendly path are all here, none of it existed on the SQL side. The restored index list also confirms `video_info.preview.*` / `audio_info.preview.*` fields exist on `allfiles` — i.e. it indexes video/audio assets too, not just images.

**Correction (2026-07-06):** the sparse `metadata` object's numeric keys **do** match the SQL `IptcField.IptcCode` dictionary (§3.6) — the original claim above (based on only 3 codes, all ≥300) was wrong. See §4.6 for the full mapping, confirmed against ~80 distinct codes sampled from real documents.

### 4.3 `fotoweb` db — collections

```
_locks, _scheduled_tasks, _sso_state, album_assets, album_share_messages, album_shares,
albums, archives, auth_device_tokens, auth_upload_tokens, background_tasks, bookmarks,
comments, config.archive_mapping, config.server_mapping, consent_form_templates,
consent_forms, counters, crop_download_presets, events, events_queue, export_presets,
exports, exports_deleted, groups, memberships, notifications, oauth_applications,
oauth_refresh_tokens, orders, persistent_logins, pools, search_results, searches,
sessions, smartfolders, taxonomy_items, upload_chunks, userpreferences, users, webhooks
```

This is the FotoWeb **application/API layer**: albums (`albums`/`album_assets`/`album_shares`), orders, exports, auth/SSO/OAuth infrastructure, user/group management, saved searches (`searches`/`search_results`/`smartfolders`), consent-form (GDPR) management, and webhooks/notifications/background jobs. Notably **no raw asset/file collection lives here** — it references assets by ID/archive and delegates the actual file index to `fotoware.allfiles` (§4.2). This confirms the two-database split: `fotoware` = index/search engine data, `fotoweb` = web-app/business-logic data.

### 4.4 Safe backup procedure (used live on the production server, 2026-07-04)

Target: `D:\Migration\` on the FotoWare server (kept separate from the earlier `D:\Backup\` used in the original chat session).

```powershell
New-Item -ItemType Directory -Path D:\Migration -Force

# MongoDB — logical dump, non-blocking on a standalone instance; throttled to limit IO/CPU impact
& "C:\Program Files (x86)\FotoWare\FotoWeb\MongoDB\mongodump.exe" --host localhost --port 7200 --out D:\Migration\MongoBackup --numParallelCollections=1

# SQL Server — COPY_ONLY so it can't disturb any existing scheduled backup chain/differential base
sqlcmd -S .\FOTOWARE -E -Q "BACKUP DATABASE [FW-MEDIABOTG] TO DISK = 'D:\Migration\FW-MEDIABOTG.bak' WITH COPY_ONLY, INIT, STATS = 10;"
```

**New finding:** the `FOTOWARE` SQL Server instance is confirmed to be **SQL Server Express Edition (64-bit)** — attempting `WITH COMPRESSION` failed with *"BACKUP DATABASE WITH COMPRESSION wird für Express Edition (64-bit) nicht unterstützt"* (error 1844). Express Edition also caps each database at 10GB — `FW-MEDIABOTG` is ~720MB today, so no immediate concern, but worth flagging to the client if data volume grows substantially before migration completes.

### 4.5 Local Mongo restore + Compass access (2026-07-06)

The `D:\Migration\MongoBackup` dump from §4.4 was retrieved and placed at `media/MongoBackup/`. Added a second service to the same `media/docker-compose.yaml` used for SQL Server:

```yaml
  fw-mongo:
    image: mongo:4.4 # matches the live FotoWeb MongoDB version; native arm64 image, no emulation needed
    container_name: fw-mediabotg-mongo
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - ./MongoBackup:/dump:ro
      - fw-mongo-data:/data/db
    healthcheck:
      test: ["CMD", "mongo", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 15s
```

Unlike SQL Server, official `mongo:4.4` images have a native `linux/arm64` manifest, so no `platform:` override/emulation is needed on Apple Silicon.

Restore command:
```bash
docker compose up -d fw-mongo
docker exec fw-mediabotg-mongo mongorestore /dump
```
Result: **146,348 documents restored across all databases, 0 failed** (covers `fotoware`, `fotoweb`, `videotrs`, `admin`).

**MongoDB Compass connection string:** `mongodb://localhost:27017` — no auth configured (matches the source server, which also runs the local Mongo service without authentication). Browse to database `fotoware` → collection `allfiles` for the asset catalog, or `fotoweb` for the application-layer collections (§4.3).

Querying via shell:
```bash
docker exec fw-mediabotg-mongo mongo --quiet --eval "db.getSiblingDB('fotoware').allfiles.countDocuments({})"
```

### 4.6 `allfiles.metadata` field mapping — resolved (2026-07-06)

The sparse `metadata: { "317": "False", "350": "...", ... }` object seen on every `allfiles` document uses numeric keys that are **literally `IptcField.IptcCode` values from the SQL side (§3.6)** — confirmed by sampling ~80 distinct codes across a batch of documents and cross-checking every one against the SQL `IptcField` table. All matched, no exceptions found. Selected mappings (see `IptcField` for the full 338-row dictionary):

| Code | Field | Code | Field | Code | Field |
|---|---|---|---|---|---|
| 5 | Title | 105 | Headline | 320 | Rating |
| 10 | Status | 110 | Credit | 325 | ICC Profile |
| 15 | Category | 115 | Source | 330 / 331 | Camera Make / Model |
| 20 | Supplemental Category | 116 | Copyright String | 350 / 351 | Original / Digitized Date |
| 25 | Keywords | 120 | Description | 352 | ISO Speed Ratings |
| 40 | Special Instructions | 122 | Caption Writer | 354 | Image Unique ID |
| 55 / 60 | Created Date / Time | 187 | Unique Document ID | 355 / 356 | GPS Latitude / Longitude |
| 65 | Originating Program | 231 | History | 357 | Serial Number |
| 80 / 85 | Byline / Byline Title | 232 | EXIF Camera Info | 360 / 361 | Uploaded By / Full Name |
| 90 / 95 | City / Province State | 300 | Location | 362 | Upload Time |
| 100 / 101 | Country Code / Country | 302 | Scene | 363 / 364 | Transferred By / Full Name |
| 103 | Original Transmission Ref | 304–311 | Contact Info block (city/address/postal/state/email/phone/URL/country) | 373 | Transferred By (Email) |
| | | 315 / 316 | Rights Usage Terms / Copyright URL | 426 / 428 | File Type / Expiry Date |

Codes `2, 3, 11, 12, 13, 21, 62, 63, 92, 99, 221, 242, 254, 255` also exist in `IptcField` but are literally named **"User defined NNN"** in the dictionary itself — meaning even the source system never gave those specific fields a real name on this install; they can't be resolved further without asking the client what they were used for. Interesting real-world example values observed: code `360`/`361` (Uploaded By / Full Name) held values like `"BoTG Pro"` / `"Best of Travel Group"`, matching entries in the SQL `User` table (§3.3) — i.e. per-asset upload attribution ties back to that same user list.

Full 338-row `IptcCode → FieldName` export available on request (pulled once already during analysis, not committed to the repo).

---

## 5. MySQL Primarix source (`bestof_full_01-07-2026`) — hotels media

**2026-07-06.** Local MySQL (Homebrew, root/no password) has several dated snapshot databases: `bestof`, `bestof_0906`, `bestof_full`, `bestof_full_01-07-2026`, `bestof_full_latest_19_06_2026`, `bestof_full_new`, plus `botg`, `cruising_import`, `karawane`. `bestof_full_01-07-2026` (most recent full snapshot, 2026-07-01) was used for this analysis. `scripts/migrate-hotels-mysql.js` connects the same way (`mysql -u root`, no password) but against the `botg` DB — the dated `bestof_full_*` snapshots and `botg` appear to be different points-in-time / working copies of the same underlying Primarix data; verify which one is authoritative before relying on exact counts for a production migration run.

### 5.1 `pictures` / `pictures_objects` — the media↔object junction

| Table | Columns | Rows |
|---|---|---|
| `pictures` | `picid` (PK), `filename`, `workspace`, `copyright`, `expiryDate` | 41,991 |
| `pictures_objects` | `id` (PK, auto_increment), `picid`, `oid`, `sort` | 53,687 (shared across **all** Primarix product types — hotels, cruises, tours, etc., not hotels-specific) |

`oid` = the Primarix object ID (same value as `hotels.oid` and Directus `hotels.object_id`/`px_source_id`). `sort` = display order of that picture within that object's gallery. No exact-duplicate `(oid, picid)` rows exist (clean data); 7,136 `picid`s are shared across more than one `oid` (stock/generic shots reused across multiple hotels/products).

Example: `SELECT * FROM pictures_objects WHERE oid = '9'` → **11 rows** (sort 0–10) → hotel **"Stay at Alice Springs"** (see §5.2).

### 5.2 `hotels` table (Primarix)

Columns: `id` (PK), `oid`, `parentid`, `freigabe` (publish flag), `objectinfo`, `language`, `lastupdate`, `sort`, plus ~100 `field_<N>_1` columns (Primarix's generic EAV-style field storage — e.g. `field_41_1` = hotel name, used by `scripts/migrate-hotels-mysql.js`).

- Total rows (all languages): **14,000**
- Rows where `language='D'` (canonical/source-of-truth language per the existing migration script): **2,000** — 1 row per hotel
- `oid = 9` → **"Stay at Alice Springs"** (7 language variants: A, B, CH, D, GB, NL, ZA — confirmed this maps to the exact same hotel as MongoDB/SQL Server filename matches below)

### 5.3 Total media to migrate for the `hotels` collection

| Scope | Hotels | Distinct pictures (`picid`) | Hotels w/ 0 pictures | Avg/hotel | Max/hotel |
|---|---|---|---|---|---|
| **Full legacy catalog** (`language='D'`, all 2,000 canonical hotels) | 2,000 | **22,404** | 149 | 12.4 | 79 |
| **Hotels currently in Directus dev** (1,232 — all 1,232 matched 1:1 to MySQL `hotels.oid` via Directus `hotels.object_id`) | 1,232 | **13,980** | 118 | ~12 | — |

**Current migration progress in Directus dev: 0.** Every hotel's `media` (M2M → `directus_files`) field checked was empty; the `hotels_directus_files` junction table has only 12 rows, all with `hotels_id: null` (orphaned test rows, not real links). The hotel-level scalar fields `media_object_id_primarix`, `media_filename_fotoweb`, `media_copyright`, `media_sort` (present on the `hotels` collection itself, sitting alongside the `media` M2M field in `media_group`) are also `null` on every hotel checked — these look like staging/reference fields meant to record the legacy source of an image during import, not yet populated.

So **13,980–22,404 distinct images still need to be migrated** for hotels, depending on whether the full 2,000-hotel legacy catalog or just the 1,232 hotels already created in Directus dev is the target scope.

---

## 6. Cross-system correlation (MySQL Primarix ↔ SQL Server ↔ MongoDB ↔ Directus)

**2026-07-06.** Established and verified the join key that ties all four systems together for a given media asset:

```
Directus hotels.object_id / px_source_id  ═══  MySQL hotels.oid  ═══  MySQL pictures_objects.oid
                                                                              │
                                                                     pictures_objects.picid
                                                                              │
                                                                     MySQL pictures.filename
                                                                              │
                              ┌───────────────────────────────────────────────┴──────────────────────────────────┐
                              ▼                                                                                    ▼
                SQL Server ALEventLog.FileName                                              MongoDB fotoware.allfiles.display_filename
                (ArchiveID → Archive.Name, e.g. 5000 = "BOTG")                              (server_index.index → same archive name, e.g. "BOTG")
                audit/access trail only — no dimensions, no live file                        the real asset: full path, pixel_width/height, file_size,
                                                                                               color_space, resolution — this is what to actually fetch
```

**Filename is the practical join key** between the Primarix/MySQL side and the FotoWare side (SQL Server + MongoDB); `oid`/`object_id` is the join key between Directus and MySQL. Verified concretely:

- **Directus ↔ MySQL**: queried Directus `hotels` for `object_id = 9` → returned `"Stay at Alice Springs"`, `px_source_id: "9"` — exact match to MySQL `hotels.oid = 9` / `pictures_objects.oid = 9` (§5.1–5.2).
- **MySQL ↔ MongoDB**: all 5 filenames from `pictures_objects WHERE oid=9` (`AUS_NT_20190730_BR.jpg`, `AUS_NT_20190730_BR_1.jpg`, `AUS_NT_006_20121030_BR.jpg`, `AUS_NT_20190730_BR_3.jpg`, `AUS_NT_701_20110704_BR.jpg`) were found in `fotoware.allfiles` via `display_filename`, all under archive `BOTG`, with full dimensions (e.g. 2896×1944, 6713×3776) and file sizes.
- **Broader spot-check**: a random sample of **20 filenames** drawn from across the *entire* hotel picture set (not just one hotel) matched `fotoware.allfiles` **20/20 (100%)** — strong evidence the filename join holds catalog-wide, not just for this one example. **Not yet an exhaustive check** — only spot-checked, see §7.
- **MySQL ↔ SQL Server, with a time-coverage caveat**: the same filenames were checked against `ALEventLog` (SQL Server). Older files (dated 2009, 2016 in the filename) were found, all under `ArchiveID = 5000` (= `BOTG` per the `Archive` table, §3.1). Files dated 2025/2026 were **not** found — expected, since the SQL Server `.bak` in this repo is from 2020-09-16 and predates them. This confirms **MongoDB (`allfiles`) is the current, authoritative, up-to-date asset index**, while the SQL Server backup is a stale historical audit trail that stops in 2020.

**Practical migration pipeline implied by this**: `hotels.object_id` (Directus) → `pictures_objects.oid` (MySQL) → `pictures.filename` (MySQL) → `fotoware.allfiles.display_filename` (MongoDB) → use that document's `file_path`/`image_info`/`file_size` to actually fetch and describe the binary for upload into Directus.

---

## 7. Open items / next steps

1. ~~MongoDB dump not yet pulled into this repo.~~ **Done 2026-07-06** — `media/MongoBackup/` retrieved, restored locally, `allfiles` confirmed as the asset catalog (§4.5).
2. ~~`fotoware.allfiles` document shape not yet confirmed.~~ **Done 2026-07-06** — see §4.2 for full sample document and counts.
3. ~~Map the `allfiles.metadata` numeric field codes.~~ **Done 2026-07-06** — they match `IptcField.IptcCode` exactly; see §4.6 for the full mapping. A handful of codes (2, 3, 11, 12, 13, 21, 62, 63, 92, 99, 221, 242, 254, 255) remain generically named "User defined NNN" in the source system itself — can't be resolved further without asking the client.
4. **Cross-check `allfiles` count (95,941) against the client's expectation** of total asset volume, and investigate whether soft-deleted assets are excluded (the schema has a `server_index.delete_time` field, suggesting deletes may be tracked via a flag rather than removal — worth confirming whether deleted-but-present documents inflate or are excluded from the 95,941 figure).
5. The `D:\Migration\FW-MEDIABOTG.bak` (fresh `COPY_ONLY` SQL backup taken 2026-07-04, §4.4) still needs to be pulled into this repo alongside the Mongo dump, to have a fully synced pair of source backups.
6. The live server has since been upgraded to SQL Server 2019 (`MSSQL15.FOTOWARE`), while the original `.bak` in this repo dates from 2020-09-16 on the older SQL 2008 R2 layout — the fresh backup in item 5 above supersedes this once retrieved.
7. `media/fw-mediabotg.zip` is a redundant copy of the original 2020 `.bak` — no new information; safe to disregard as a distinct source.
8. Cross-reference `media/MetadataConfiguration.xml` field-by-field against both the SQL `IptcField` table (now confirmed to also key `allfiles.metadata`, §4.6), and against the target `directus_files` schema documented in [`Media_Library_Fields_Report.md`](Media_Library_Fields_Report.md).
9. User PII in the SQL `User` table (19 accounts) should be handled per data-protection requirements before any migration/export step touches it — `fotoweb.users` (Mongo side) likely duplicates this and deserves the same caution once inspected.
10. `FOTOWARE` SQL instance confirmed to be **Express Edition** (10GB/db cap, no backup compression) — flag to client if data volume is expected to grow significantly before migration completes.
11. `allfiles` schema shows `video_info`/`audio_info` fields — confirm whether the client's archives actually contain video/audio assets, or whether this is just unused schema headroom from a generic FotoWare install.
12. **The MySQL↔MongoDB filename join (§6) is spot-checked, not exhaustive** — verified on 1 full hotel (5/5) + a random 20-filename sample (20/20). Before relying on it for an actual migration run, do a full crosswalk: every `picture.filename` linked to a hotel `oid` vs. every `fotoware.allfiles.display_filename`, to quantify exact match/miss rates and catch any filename-collision edge cases (recall 7,136 `picid`s are shared across multiple `oid`s, §5.1).
13. **Multiple MySQL snapshot databases exist locally** (`bestof`, `bestof_full`, `bestof_full_01-07-2026`, `bestof_full_latest_19_06_2026`, `bestof_full_new`, `botg`, `bestof_0906`) — `scripts/migrate-hotels-mysql.js` uses `botg`, this analysis used `bestof_full_01-07-2026`. Confirm with the client/team which is the authoritative source before any migration counts are treated as final.
14. The hotel-level fields `media_object_id_primarix`/`media_filename_fotoweb`/`media_copyright`/`media_sort` on the Directus `hotels` collection are null on every hotel checked — clarify their intended purpose (legacy-reference staging fields for the import process?) before or during the actual media migration build-out.
15. 149 of the 2,000 canonical legacy hotels (118 of the 1,232 already in Directus) have **zero** pictures in Primarix — confirm with the client whether this is expected (e.g. new/inactive hotels) or a data gap.
16. ~~Actual IIS binding for `media.botg.de` not yet identified.~~ **Done 2026-07-06** — it's a virtual application `/fotoweb/` under the generic `Default Web Site` (bound on `*:80`/`*:443`, no host-header-specific binding), not a separate named site or ARR reverse proxy as originally guessed. Full vdir map in §9.3.
17. ~~Not yet checked: Node.js/Python/git installed? Existing scheduled import tasks?~~ **Done 2026-07-06** — neither Node nor Python is on `PATH` (§9.4); no relevant scheduled tasks exist, only generic OS time-sync tasks. Installing Node.js would be a prerequisite before running our existing `scripts/*.js` migration scripts directly on `FW-SERVER-2018`.
18. ~~Inspect `Scripts` and `Recipes`.~~ **Done 2026-07-06** (§9.5) — `Recipes` is generic vendor image-effect presets, not relevant. `Scripts\Python` contains a `fotoware` Python package + `requirements.txt` + PyCharm project files (`.idea`) — **still needs a deeper look** (read `requirements.txt` and the `fotoware` package contents) to determine whether this is vendor SDK boilerplate or actual client-specific customization/automation. This remains the most promising lead for where a future import script would integrate.
19. **`activityLogging.events.upload` is configured `true` in the FotoWeb site config (§9.6), yet no `Upload`-type rows with filenames appear in `ALEventLog`** (§3.7) — reconcile this discrepancy; upload events may log to a different table/mechanism, or with the filename field empty, or the config may not reflect what actually happened historically on the pre-2020 data captured in the `.bak`.
20. **Security note, not yet actioned**: the loopback-only FotoWeb Config API (`http://localhost:7103/sites/MEDIABOTG/`) returns a `processAccount` block containing a service-account username/domain/password (the password appears encrypted/DPAPI-protected, not cleartext) — see §9.6. Handle the same way as the other previously-flagged exposed credentials in this repo (`unrotated-exposed-tokens-2026-07-03`): don't expose this API beyond loopback, avoid pasting its full response into less-controlled channels, rotation is the user's call.

---

## 8. Local analysis environment

Set up under `media/`:
- `docker-compose.yaml` — SQL Server 2022 (`linux/amd64`, emulated on Apple Silicon), backup folder mounted read-only, persistent volume `fw-mssql-data`
- `.env` (gitignored) / `.env.example` — SA credentials
- Restore command used:
  ```sql
  RESTORE DATABASE [FW-MEDIABOTG] FROM DISK = N'/var/opt/mssql/backup/fw-mediabotg.bak'
  WITH MOVE N'FW-MEDIABOTG' TO N'/var/opt/mssql/data/FW-MEDIABOTG.mdf',
       MOVE N'FW-MEDIABOTG_log' TO N'/var/opt/mssql/data/FW-MEDIABOTG_log.ldf',
       REPLACE, STATS = 10;
  ```
- Query access:
  ```bash
  cd media && source .env
  docker exec -it fw-mediabotg-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d FW-MEDIABOTG
  ```
- Mongo side (same `docker-compose.yaml`, added 2026-07-06): `mongo:4.4` service (`fw-mediabotg-mongo`), `media/MongoBackup/` mounted read-only, restored via `docker exec fw-mediabotg-mongo mongorestore /dump`. Compass connection: `mongodb://localhost:27017` (no auth). Full detail in §4.5.
- MySQL side (not in Docker — local Homebrew install): `mysql -u root` (no password) gives access to all Primarix snapshot DBs directly, e.g.:
  ```bash
  mysql -u root -N -B -D "bestof_full_01-07-2026" -e "SELECT * FROM pictures_objects WHERE oid = 9;"
  ```

---

## 9. FotoWeb application identity & network topology (`media.botg.de`)

**2026-07-06.** Identified what application actually serves `media.botg.de`, and confirmed it's the same physical server (`FW-SERVER-2018`) used throughout this whole investigation — established via read-only DNS lookups, HTTP header checks against the live public domain, and PowerShell commands run directly on the server.

### 9.1 What's running, and where

Confirmed via HTTP fingerprint (`curl -I https://media.botg.de/fotoweb/`, read-only, no data submitted):

```
Server: Microsoft-IIS/10.0
x-powered-by: FotoWare (https://www.fotoware.com/)
fotoweb-server: Product-Version=8.1.1223.0; Level=Standard;
location: /fotoweb/views/login?to=%2Ffotoweb%2F...   (unauthenticated → redirected to login)
```

The app is **FotoWare FotoWeb, version 8.1.1223.0, "Standard" license tier** — a commercial, closed-source product from FotoWare AS (Norway). There is no client-owned/readable "codebase" to browse in the usual sense — the "code" on disk is FotoWare's own vendor binaries plus whatever admin-level customization the client has layered on top (custom metadata field labels/`IptcField` naming, processing profiles, archives — all already catalogued in §3). Any future customization would go through FotoWare's own supported extensibility points (workflows/actions), not raw source edits.

### 9.2 Network path — confirmed on-premises, not cloud-hosted

```
media.botg.de  →  DNS A record  →  37.24.27.233
                                     │ reverse DNS: ip-037-024-027-233.um08.pools.vodafone-ip.de
                                     │ (Vodafone Germany business/residential IP pool — NOT a datacenter/cloud IP)
                                     ▼
                              router/firewall NAT (see below)
                                     ▼
                         FW-SERVER-2018, internal IP 192.168.1.220 ("Main" interface)
                                     ▼
                              IIS 10 → FotoWeb (login-gated)
```

Confirmed via PowerShell run directly on `FW-SERVER-2018`:
```powershell
PS> hostname
FW-SERVER-2018
PS> Get-NetIPAddress -AddressFamily IPv4 | Select IPAddress, InterfaceAlias
IPAddress     InterfaceAlias
192.168.1.220 Main
127.0.0.1     Loopback Pseudo-Interface 1
```

This confirms the earlier caveat: the public IP (`37.24.27.233`) is **not** this server's own address — there's a router/firewall doing NAT/port-forwarding from the public IP to `192.168.1.220` internally. No CDN/WAF layer is visible in the HTTP headers (no `Via`, `CF-Ray`, `X-Forwarded-*`), so the forwarding is a simple network-level port-forward, not an application-level reverse proxy service. **This is a genuinely on-premises physical server** sitting on the client's own internet connection (Vodafone Germany), not hosted in any cloud/datacenter — matching the user's own description of "everything is stored locally."

### 9.3 IIS topology — fully resolved (2026-07-06)

Corrected `appcmd.exe` invocation (the earlier failure was a `%windir%`-vs-`$env:windir` cmd/PowerShell syntax issue, not absence) gave the real picture:

```
SITE "Default Web Site" (bindings: http/*:80:, https/*:443:, state: Started)
SITE "_FotoWebConfigServer" (bindings: http/127.0.0.1:7103:*, http/[::1]:7103:*, state: Started)

VDIR "Default Web Site/"                        → %SystemDrive%\inetpub\wwwroot
VDIR "Default Web Site/fotoweb/"                → C:\ProgramData\FotoWare\FotoWeb\Site Settings\MEDIABOTG\Documents
VDIR "Default Web Site/fotoweb/_static"         → C:\ProgramData\FotoWare\FotoWeb\Server Settings\Resource Templates\Static
VDIR "Default Web Site/fotoweb/embed"           → C:\ProgramData\FotoWare\FotoWeb\Operations\Embed\MEDIABOTG
VDIR "Default Web Site/fotoweb/reports"         → C:\ProgramData\FotoWare\FotoWeb\Operations\Reports\MEDIABOTG
VDIR "Default Web Site/fotoweb/_videoproxy..."  → C:\ProgramData\FotoWare\FotoWeb\Operations\Proxies\Video
VDIR "Default Web Site/fotoweb/cache/"          → C:\ProgramData\FotoWare\FotoWeb\Operations\Cache\MEDIABOTG
VDIR "Default Web Site/fotoweb/api/"            → C:\Program Files (x86)\FotoWare\FotoWeb\FotoWebAPI
VDIR "_FotoWebConfigServer/"                    → C:\ProgramData\FotoWare\FotoWeb\Operations\ConfigServer
```

**Resolved — my earlier ARR/reverse-proxy guess was wrong.** `media.botg.de` is served directly as a **virtual application `/fotoweb/` under the plain `Default Web Site`** (bound generically on `*:80`/`*:443`, not on a host-header-specific binding — the router/NAT forwards public 80/443 straight to this). No separate named FotoWeb IIS site, no ARR reverse proxy. The `/fotoweb/api/` vdir maps straight to the `FotoWebAPI` folder found in §9.4. `_FotoWebConfigServer` is confirmed **loopback-only** (`127.0.0.1`/`[::1]:7103`) — an internal configuration API reachable only from a session running directly on `FW-SERVER-2018` itself, not from the network. Open item 16 is now closed.

### 9.4 Runtimes, scheduled tasks, and install layout — confirmed 2026-07-06

Run directly on `FW-SERVER-2018`:

```powershell
PS> Get-Command node, npm, python, pwsh, git -ErrorAction SilentlyContinue
PS> node -v; python --version
node : ... CommandNotFoundException
python : ... CommandNotFoundException
```
**Node.js and Python are not installed system-wide / not on `PATH`.** Running our existing Node-based `scripts/*.js` migration scripts directly on this box would require installing Node.js first — nothing is there today.

```powershell
PS> Get-ScheduledTask | Where-Object { $_.TaskName -match "import|botg|migration|sync|fotoweb" } | Select TaskName, State, Actions

TaskName                      State
--------                      -----
Background Synchronization Disabled
Logon Synchronization      Disabled
ForceSynchronizeTime          Ready
SynchronizeTimeZone           Ready
```
All four matches are **generic Windows OS tasks** (time-sync, OneDrive/account sync), unrelated to any import work. **Confirmed: no existing automated media-import/sync job runs on this server.**

```powershell
PS> Get-ChildItem "C:\Program Files (x86)\FotoWare\FotoWeb" -Directory

Apache  ConfigApp  FotoWebAPI  Icc  IJG-Jpeg  ImageFormats  MongoDB  MongoDB_2_6
platforms  Python  Recipes  ReportModule  Scripts

PS> Get-ChildItem "C:\ProgramData\FotoWare\FotoWeb" -Directory

Operations  Server Settings  Site Settings   (dated 05.04.2018 — original install date evidence)
```

Notable folders:
- **`MongoDB_2_6`** alongside the current `MongoDB` (dated 30.04.2024) — leftover from an older bundled MongoDB version, corroborating the in-place-upgrade history already inferred from the SQL Server 2008R2→2019 jump (§2).
- **`Python`** — FotoWeb ships its **own embedded Python runtime**, used internally for server-side workflow "Actions." This is separate from (and not a substitute for) a general-purpose Python install — it's not on `PATH` and is meant for FotoWeb's own scripting engine, not arbitrary scripts.
- **`FotoWebAPI`** — confirmed (§9.3) as the actual physical path behind the public `/fotoweb/api/` endpoint.
- **`ReportModule`** — matches the `Report*` tables found in SQL Server (§3).
- **`Icc`/`IJG-Jpeg`/`ImageFormats`** — image-processing libraries backing the `ProcessingProfile` presets (§3.4).
- `ProgramData\...\Site Settings` dated **2018-04-05** — hard evidence of the original install date, well before the 2020 SQL backup in this repo.

### 9.5 `Scripts` / `Recipes` contents — inspected 2026-07-06

```powershell
PS> Get-ChildItem "...\FotoWeb\Scripts" -Recurse -Depth 1
Scripts\Python\.idea               ← PyCharm project metadata
Scripts\Python\fotoware            ← a Python package
Scripts\Python\README-tests.txt
Scripts\Python\requirements.txt

PS> Get-ChildItem "...\FotoWeb\Recipes" -Recurse -Depth 1
blacktransparentframe.rxf, dropshadow.rxf, etched.rxf, Greyscale.rxf, illustration.rxf,
Lo-Fi.rxf, oldprintborder.rxf, Painting.rxf, sc.rxf, Sepia.rxf, tearoffborder.rxf,
That70slook.rxf, whitelinedborder.rxf, whitetransparentframe.rxf, X-Pro_II.rxf
(+ 2 reference images: brokenbordertrans.png, Media_not_available.png)
```

**`Recipes` is generic vendor content** — stock FotoWare image-effect presets (sepia, greyscale, drop-shadow, vintage borders, etc., `.rxf` = FotoWare's recipe format). Nothing client-specific, not relevant to import automation. Open item 18 (Recipes half) is closed.

**`Scripts\Python` is more interesting** — the presence of a `.idea` folder (PyCharm project files), a `fotoware` Python package, `requirements.txt`, and a `README-tests.txt` strongly suggests active or past custom Python development tied to FotoWeb's scripting engine on this exact server — not just vendor boilerplate. **Not yet inspected further** — the contents of the `fotoware` package and `requirements.txt` haven't been read. This is now the single most promising lead for "where would a media-import script actually run/integrate" (see open item 18, redefined).

### 9.6 FotoWeb Config API — site configuration dump (2026-07-06)

Browsed directly on `FW-SERVER-2018` (the config API is loopback-only, §9.3, so this had to be done from a session on the server itself):

```
GET http://localhost:7103/                  → {"sitelist": "/sites/", "version": 1}
GET http://localhost:7103/sites/            → {"sites": [{"host": "media.botg.de", "href": "/sites/MEDIABOTG/", "name": "MEDIABOTG"}]}
GET http://localhost:7103/sites/MEDIABOTG/  → full site configuration JSON
```

Key fields from the `MEDIABOTG` site config:

- **`id: "MEDIABOTG"`** — matches the SQL Server DB name (`FW-MEDIABOTG`) and MongoDB `fotoware`/`fotoweb` naming throughout this whole investigation. One config record ties the entire stack together.
- **`serverPort: 7000`** — this is the port referenced in the `fwp://localhost:7000/fotoware/im/1.0/BOTG/...` URLs seen much earlier in `ALEventLog.PersistentUrl` (§3.7) — confirms that internal `fwp://` scheme is FotoWeb's own image-serving protocol on this specific port, now cross-referenced to its source config.
- **`activityLogging`**: `logToDatabase: true`, `metaDataToDatabase: true`, `flushAfterDays: 180`, and a per-event-type map — `workflow: true, upload: true, download: true, login: true, delete: true, zoom: true, preview: true`, but `pageView/previewAgent/crop/logout/details/editMetaData/place/order: false`. This explains exactly why `ALEventLog` only contains `Workflow`/`Download`/`Delete`/`Login` events (§3.7) — `upload` is configured `true` here, yet no `Upload`-typed rows with filenames were found in `ALEventLog`; worth reconciling (new open item).
- **`processAccount`**: `{"username": "fotoware", "domain": "FW-SERVER-2018", "password": "mygAtU1Jq9ynIzb25/yjHQ=="}` — **⚠️ a service-account credential, returned in plaintext JSON by this API** (the password value itself appears to be an encrypted/DPAPI-style blob, not cleartext, but its presence in an unauthenticated-from-the-box API response is still a real exposure). Treat this the same way as the other previously-found exposed tokens in this repo (see `unrotated-exposed-tokens-2026-07-03` memory) — flagged, not rotated, at the user's discretion. **Do not expose the `_FotoWebConfigServer` API beyond loopback**, and avoid pasting its full response into less-controlled channels.
- **`fileTypes`**: a large (100+) generic vendor-default registry of every file type/extension FotoWeb can recognize (images, video, audio, Office docs, CAD, etc.) — confirms the *platform* supports video/audio generically, but says nothing about whether the client's actual archives contain any (open item 11 remains open on that specific question).
- Everything else (`directoryService`, `signupSettings`, `consentFormSettings`, `shoppingCartSettings`) is disabled/empty on this install — no LDAP, no self-signup, no e-commerce checkout in use.

---

*Log of updates:*
- **2026-07-04** — initial version, compiled from direct SQL Server restore/analysis + `media/chatgpt-chat-history/` transcript and screenshots (a live PowerShell/SQL session on the client's actual FotoWare server, `FW-SERVER-2018\FOTOWARE`).
- **2026-07-04** — added live MongoDB findings from a follow-up live session on the same server: confirmed two Mongo databases (`fotoware` = index/search, `fotoweb` = application layer), full collection lists for both, identified `fotoware.allfiles` as the likely master asset index, documented the safe `D:\Migration\` backup procedure (mongodump + SQL `COPY_ONLY` backup), and confirmed the `FOTOWARE` SQL instance is Express Edition (no compression support, 10GB/db cap). File relocated from `docs/Media/` to `media/docs/` (by the user, to keep source data + its analysis co-located).
- **2026-07-06** — retrieved `media/MongoBackup/` (the mongodump from the live server), restored it locally into a `mongo:4.4` container added to the same `media/docker-compose.yaml`, and confirmed via direct query: `fotoware.allfiles` (95,941 docs) is the real asset catalog, with pixel dimensions, file size, color space, and full paths per asset — closing the biggest open question from prior sessions. Documented the Compass connection (`mongodb://localhost:27017`) and flagged a new open item: the per-file `metadata` numeric codes don't match the SQL-side `IptcField` dictionary and need separate mapping.
- **2026-07-06** — brought the Primarix MySQL source into scope (§5) and established the full cross-system correlation (§6): analyzed `pictures`/`pictures_objects`/`hotels` in the local `bestof_full_01-07-2026` MySQL DB, computed the total media volume to migrate for the `hotels` collection (22,404 across the full 2,000-hotel legacy catalog; 13,980 for the 1,232 hotels currently in Directus dev — 0 migrated so far), and verified the `oid`/`object_id` + filename join across Directus ↔ MySQL ↔ SQL Server ↔ MongoDB using a concrete example (hotel "Stay at Alice Springs", `oid=9`) plus a 20-filename random sample (100% match against `fotoware.allfiles`). All analysis was read-only — no data was changed in MySQL, SQL Server, MongoDB, or Directus.
- **2026-07-06** — resolved the `allfiles.metadata` numeric-code mapping (§4.6), correcting an earlier wrong claim in this doc that it didn't match `IptcField` — it does, confirmed against ~80 sampled codes with zero mismatches. Added §9: identified the live app behind `media.botg.de` as FotoWare FotoWeb 8.1.1223.0 (Standard), confirmed via DNS/HTTP fingerprinting and PowerShell commands run on `FW-SERVER-2018` itself that this is a genuinely on-premises server (internal IP `192.168.1.220`, public via Vodafone Germany + router NAT, no cloud/CDN layer), and found that the public FotoWeb binding isn't an obviously-named IIS site — follow-up commands drafted (§9.4, open items 16–17) but not yet run.
- **2026-07-06** — ran the drafted follow-up commands on `FW-SERVER-2018` (§9.4): confirmed neither Node.js nor Python is installed system-wide (would need installing before running our Node scripts there directly), confirmed no scheduled task does any import/sync work today, and discovered the full FotoWeb install layout — notably an embedded `Python` runtime (internal to FotoWeb's own workflow engine) and `Scripts`/`Recipes` folders (FotoWare's supported customization points, not yet inspected — new open item 18), plus a leftover `MongoDB_2_6` folder corroborating the in-place-upgrade history. The `appcmd.exe` IIS-binding command failed on a `%windir%`-vs-`$env:windir` syntax issue (cmd vs. PowerShell), not because it's unavailable — corrected command drafted in §9.5, still not run (open item 16 remains open).
- **2026-07-06** — ran the corrected `appcmd.exe`/`Get-WebBinding` commands and fully resolved the IIS topology (§9.3): `media.botg.de` is a virtual application `/fotoweb/` under the plain `Default Web Site`, not a separate named site or ARR reverse proxy as earlier guessed; closed open item 16. Inspected `Scripts`/`Recipes` (§9.5): `Recipes` is generic vendor content, but `Scripts\Python` contains a `fotoware` Python package + `requirements.txt` + PyCharm project files — still worth a deeper look, most promising lead for future import-script integration. Also browsed the loopback-only FotoWeb Config API (`localhost:7103`, §9.6) and captured the full `MEDIABOTG` site config — confirmed `serverPort: 7000` matches the `fwp://` URLs seen earlier in `ALEventLog`, explained the `activityLogging` event-type settings, and flagged a service-account credential (`processAccount`, password appears encrypted) returned by that API as a security note (new open item 20) rather than something to action unilaterally. New open item 19 raised: `upload` logging is configured `true` but no `Upload` rows with filenames were found in `ALEventLog`, needs reconciling.
