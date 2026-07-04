# FotoWare Source System Analysis (BOTG Media Migration)

Living knowledge base for everything discovered about the client's legacy **FotoWare/Fotoweb** installation, as part of migrating its media library to Directus + S3 (Hetzner). Source materials live in [`media/`](../): a SQL Server backup, a metadata schema XML, and a ChatGPT session transcript from a live session on the client's FotoWare server.

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

**`allfiles` is almost certainly the master asset index** — the name directly matches the `FotoWare Index Manager` Windows service ("*Provides index and search services to FotoWare applications*", confirmed running in §1). `allfolders` is presumably the archive/folder tree; `allservers` likely relates to multi-server/federated FotoWare deployments (probably a single small doc on this single-server install).

**Not yet confirmed** (pending live-session output): the actual document shape of `allfiles` — specifically whether it carries pixel dimensions/EXIF/IPTC per asset, and its document count (to cross-check against the ~125,007 lower-bound estimate derived from SQL audit logs, §3.8).

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

---

## 5. Open items / next steps

1. **MongoDB dump in progress (2026-07-04), not yet pulled into this repo.** Commands run live on the server per §4.4, writing to `D:\Migration\MongoBackup`. Still need to: (a) confirm the dump completed, (b) transfer `D:\Migration\` off the server into this repo (e.g. `media/fw-mediabotg-mongodump/`), (c) restore locally via a `mongo:4.4` Docker container (native arm64 image, no emulation needed unlike SQL Server) for analysis.
2. **`fotoware.allfiles` document shape not yet confirmed.** Still need `db.allfiles.findOne()` and `db.allfiles.countDocuments({})` output from the live session to verify it actually carries dimensions/EXIF/IPTC per asset, and to cross-check its count against the ~125,007 lower-bound estimate derived from SQL audit logs (§3.8).
3. The live server has since been upgraded to SQL Server 2019 (`MSSQL15.FOTOWARE`), while the `.bak` in this repo dates from 2020-09-16 on the older SQL 2008 R2 layout — confirm with the client whether a fresher SQL backup exists/is needed before final migration. **Update:** a fresh `COPY_ONLY` backup was taken live on 2026-07-04 to `D:\Migration\FW-MEDIABOTG.bak` (§4.4) — still needs to be pulled into this repo.
4. `media/fw-mediabotg.zip` is a redundant copy of the same `.bak` — no new information; safe to disregard as a distinct source.
5. Cross-reference `media/MetadataConfiguration.xml` field-by-field against `IptcField` table and against the target `directus_files` schema documented in [`Media_Library_Fields_Report.md`](Media_Library_Fields_Report.md) once MongoDB metadata is available.
6. User PII in the `User` table (19 accounts, SQL side) should be handled per data-protection requirements before any migration/export step touches it — likely also duplicated in `fotoweb.users` (Mongo side), same caveat applies once inspected.
7. `FOTOWARE` SQL instance confirmed to be **Express Edition** (10GB/db cap, no backup compression) — flag to client if data volume is expected to grow significantly before migration completes.

---

## 6. Local analysis environment

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

---

*Log of updates:*
- **2026-07-04** — initial version, compiled from direct SQL Server restore/analysis + `media/chatgpt-chat-history/` transcript and screenshots (a live PowerShell/SQL session on the client's actual FotoWare server, `FW-SERVER-2018\FOTOWARE`).
- **2026-07-04** — added live MongoDB findings from a follow-up live session on the same server: confirmed two Mongo databases (`fotoware` = index/search, `fotoweb` = application layer), full collection lists for both, identified `fotoware.allfiles` as the likely master asset index, documented the safe `D:\Migration\` backup procedure (mongodump + SQL `COPY_ONLY` backup), and confirmed the `FOTOWARE` SQL instance is Express Edition (no compression support, 10GB/db cap). File relocated from `docs/Media/` to `media/docs/` (by the user, to keep source data + its analysis co-located).
