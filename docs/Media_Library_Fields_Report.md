## Overview

This report documents every field in the `directus_files` collection as currently implemented on staging, cross-referenced against the field sheet. Fields are organised into three groups:

1. **Directus Default Fields** — built-in system fields provided by Directus out of the box; cannot be renamed, moved into groups, or deleted.
2. **Custom Added Fields** — fields added to fulfil the media library requirements.
3. **Handled via Custom Extension** — items covered through custom-built UI extensions rather than native `directus_files` fields.

Where applicable, each field entry includes context notes, the Directus default it maps to (if any), flow changes made, and developer notes.

---

## Section 1 — Master Data

### 1.1 Generated File Name

| Attribute           | Value                        |
| ------------------- | ---------------------------- |
| **API Key**         | `generated_filename`         |
| **Type**            | String (varchar 255)         |
| **Category**        | Custom Added Field           |
| **Required**        | No (generated automatically) |
| **Status in Sheet** | Done                         |

**Formula:** `[3L Destination Cluster]` + `[3L Country]` + `[YYYYMMDD]` + `[Editor Initials]` + `[_NNN]`. Numbering continues per editor/day/destination.

---

### 1.2 Unique Media ID (Media ID)

| Attribute      | Value                  |
| -------------- | ---------------------- |
| **API Key**    | `id`                   |
| **Type**       | UUID (Primary Key)     |
| **Category**   | Directus Default Field |
| **Schema Key** | `media_id`             |

**Note:** This maps directly to the Directus native `id` field (UUID primary key). It is a protected system field — it **cannot be renamed, re-keyed, or moved into an accordion group**. It is exposed as `id` in all API responses. For any integrations where the label "Media ID" is preferred, the `id` value should be referenced accordingly.

---

### 1.3 Upload Date

| Attribute      | Value                  |
| -------------- | ---------------------- |
| **API Key**    | `uploaded_on`          |
| **Type**       | Timestamp              |
| **Category**   | Directus Default Field |
| **Schema Key** | `upload_date`          |

**Note:** Maps to the Directus native `uploaded_on` field. This is a protected system field — it **cannot be moved into an accordion group** in the UI. It is hidden by default in the Directus interface. Directus also has a separate `created_on` field (record creation timestamp); `uploaded_on` is specifically populated on file upload.

---

### 1.4 Uploaded By

| Attribute       | Value                       |
| --------------- | --------------------------- |
| **API Key**     | `uploaded_by`               |
| **Type**        | UUID → M2O `directus_users` |
| **Category**    | Directus Default Field      |
| **Fotoweb Key** | `metadata_361`              |

**Note:** Directus native `uploaded_by` field — protected system field, **cannot be moved into a group**. Hidden by default in the UI but available via API.

---

### 1.5 Editor Initials

| Attribute      | Value                                                                      |
| -------------- | -------------------------------------------------------------------------- |
| **API Key**    | `initials` (on `directus_users`)                                           |
| **Type**       | String (2–3 chars)                                                         |
| **Category**   | Custom Added Field — on `directus_users` collection (not `directus_files`) |
| **Schema Key** | `editor_initials`                                                          |

**Dev Note:** This is not a standalone field on `directus_files`. It is sourced from the user profile — added to the `directus_users` collection where it is manually set per editor. It is consumed by the Flow that auto-generates the `generated_filename` on upload.

---

### 1.6 Last Modified

| Attribute       | Value                  |
| --------------- | ---------------------- |
| **API Key**     | `modified_on`          |
| **Type**        | Timestamp (read-only)  |
| **Category**    | Directus Default Field |
| **Fotoweb Key** | `asset_modified`       |
| **Schema Key**  | `last_modified_at`     |

**Note:** Maps to Directus native `modified_on`. Protected system field — **cannot be moved into a group**. Auto-updated by Directus on every save.

---

### 1.7 Last Modified By

| Attribute      | Value                                   |
| -------------- | --------------------------------------- |
| **API Key**    | `modified_by`                           |
| **Type**       | UUID → M2O `directus_users` (read-only) |
| **Category**   | Directus Default Field                  |
| **Schema Key** | `last_modified_by`                      |

**Note:** Maps to Directus native `modified_by`. Protected system field — **cannot be moved into a group**. Auto-updated by Directus on every save.

---

## Section 2 — Geographies

All geography fields are implemented using a **cascading select interface** — selecting a Place auto-populates State/Region/Country/Destination in a cascading hierarchy. All geography fields live in the `geographies` accordion group.

### 2.1 Place (City)

| Attribute       | Value                       |
| --------------- | --------------------------- |
| **API Key**     | `place`                     |
| **Type**        | Integer → M2O `places`      |
| **Category**    | Custom Added Field          |
| **Interface**   | Cascading Individual Select |
| **Fotoweb Key** | `metadata_90`               |

---

### 2.2 State

| Attribute     | Value                                               |
| ------------- | --------------------------------------------------- |
| **API Key**   | `state`                                             |
| **Type**      | Integer → M2O `states`                              |
| **Category**  | Custom Added Field                                  |
| **Interface** | Cascading Individual Select (cascades from `place`) |

---

### 2.3 Region

| Attribute       | Value                                               |
| --------------- | --------------------------------------------------- |
| **API Key**     | `region`                                            |
| **Type**        | Integer → M2O `regions`                             |
| **Category**    | Custom Added Field                                  |
| **Interface**   | Cascading Individual Select (cascades from `place`) |
| **Fotoweb Key** | `metadata_90`                                       |

---

### 2.4 Country

| Attribute       | Value                                               |
| --------------- | --------------------------------------------------- |
| **API Key**     | `country`                                           |
| **Type**        | Integer → M2O `countries`                           |
| **Category**    | Custom Added Field                                  |
| **Required**    | Yes                                                 |
| **Interface**   | Cascading Individual Select (cascades from `place`) |
| **Fotoweb Key** | `metadata_101`                                      |

---

### 2.5 Destination

| Attribute     | Value                                                 |
| ------------- | ----------------------------------------------------- |
| **API Key**   | `destination`                                         |
| **Type**      | Integer → M2O `destinations`                          |
| **Category**  | Custom Added Field                                    |
| **Interface** | Cascading Individual Select (cascades from `country`) |

---

### 2.6 Categories

| Attribute    | Value                         |
| ------------ | ----------------------------- |
| **API Key**  | — (no separate field)         |
| **Category** | Covered by Geographies module |

**Note:** This is fully covered by the cascading Place → State/Region → Country → Destination hierarchy. No separate `categories` field is needed.

---

### 2.7 Keywords

| Attribute           | Value                                        |
| ------------------- | -------------------------------------------- |
| **API Keys**        | `keyword_ids` (primary), `keywords` (legacy) |
| **Type**            | JSON (tag input — stores array)              |
| **Category**        | Custom Added Field                           |
| **Fotoweb Key**     | `metadata_25`                                |
| **Status in Sheet** | Done (with note)                             |

**Note:** The field sheet outlines a relation to a dedicated Keywords collection (taxonomy-style). This is not directly achievable with the standard Directus files interface — `directus_files` cannot use M2M relations the same way as regular collections without significant custom work. **Current implementation:** `keyword_ids` stores keywords as a JSON tag array (free-text strings).

> Two keyword fields currently exist — `keywords` and `keyword_ids`. `keyword_ids` is the primary field. The legacy `keywords` field can be removed once confirmed no longer needed.

---

## Section 3 — Media Rights

All fields in this section are **custom added fields** in the `media_rights` accordion group.

### 3.1 Photographer

| Attribute           | Value                |
| ------------------- | -------------------- |
| **API Key**         | `photographer`       |
| **Type**            | String (varchar 255) |
| **Required**        | Yes                  |
| **Fotoweb Key**     | `metadata_122`       |
| **Status in Sheet** | Done                 |

Populated from IPTC/EXLIF on upload if available; otherwise manually entered.

---

### 3.2 Company Name

| Attribute           | Value                      |
| ------------------- | -------------------------- |
| **API Key**         | `company_name`             |
| **Type**            | String (varchar 255)       |
| **Required**        | Yes                        |
| **Translations**    | de-DE, de-CH, en-GB, nl-NL |
| **Status in Sheet** | Done                       |

---

### 3.3 Contact Email

| Attribute           | Value                      |
| ------------------- | -------------------------- |
| **API Key**         | `contact_email`            |
| **Type**            | String (varchar 255)       |
| **Required**        | Yes                        |
| **Translations**    | de-DE, de-CH, en-GB, nl-NL |
| **Status in Sheet** | Done                       |

---

### 3.4 Copyright

| Attribute           | Value                |
| ------------------- | -------------------- |
| **API Key**         | `copyright`          |
| **Type**            | String (varchar 255) |
| **Required**        | Yes                  |
| **Default Value**   | `@`                  |
| **Fotoweb Key**     | `metadata_116`       |
| **Status in Sheet** | Done                 |

**Dev Note:** The current default value is `@`. As defined in the field sheet, when IPTC/EXLIF is empty the default should be `© none`, and the UI should always prefix `©`. The default value should be updated to `© none` and the prefix display option confirmed.

---

### 3.5 Expiry Date

| Attribute           | Value               |
| ------------------- | ------------------- |
| **API Key**         | `expiry_date`       |
| **Type**            | Date                |
| **Required**        | Yes                 |
| **Translations**    | en-GB, de-DE, nl-NL |
| **Fotoweb Key**     | `metadata_428`      |
| **Status in Sheet** | Done                |

Media approaching or past expiry will trigger editor warnings. Visual marker logic is handled by Flow/extension.

---

### 3.6 Original File Name

| Attribute           | Value                |
| ------------------- | -------------------- |
| **API Key**         | `original_filename`  |
| **Type**            | String (varchar 255) |
| **Required**        | Yes                  |
| **Translations**    | en-GB, de-DE, nl-NL  |
| **Fotoweb Key**     | `metadata_21`        |
| **Status in Sheet** | Done                 |

**Note:** Directus also stores `filename_disk` (system field — actual filename on storage) and `filename_download` (system field — filename presented on download). `original_filename` is a separate custom field capturing the user's original upload filename including extension, kept for auditing purposes.

---

## Section 4 — Description

### 4.1 Media Description

| Attribute      | Value                  |
| -------------- | ---------------------- |
| **API Key**    | `description`          |
| **Type**       | Text (unlimited)       |
| **Category**   | Directus Default Field |
| **Schema Key** | `description`          |

**Note:** Maps to the Directus native `description` field. It is a protected system field — **cannot be moved into a group or renamed**. It remains at the root level of the file record. AI-assisted description generation (using the original filename as input) is noted as a possible future enhancement.

---

### 4.2 Alt Text

| Attribute           | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| **API Key**         | `alt_text`                                             |
| **Type**            | String (varchar 255)                                   |
| **Required**        | Yes                                                    |
| **Category**        | Custom Added Field                                     |
| **Fotoweb Key**     | `builtin_description`                                  |
| **Group**           | `description_raw_group` (inside Description accordion) |
| **Translations**    | de-DE, en-GB, nl-NL                                    |
| **Status in Sheet** | Done                                                   |
| **Flow Changes**    | Yes                                                    |

**Flow Change:** On file upload, the Flow reads IPTC/EXLIF `builtin_description` and auto-populates `alt_text`. Editors can manually override.

---

### 4.3 Creation Date (IPTC)

| Attribute        | Value                   |
| ---------------- | ----------------------- |
| **API Key**      | `iptc_creation_date`    |
| **Type**         | Date                    |
| **Category**     | Custom Added Field      |
| **Fotoweb Key**  | `metadata_55`           |
| **Group**        | `description_raw_group` |
| **Flow Changes** | Yes                     |

**Flow Change:** Populated from IPTC/EXLIF `metadata_55` on upload.

---

### 4.4 Creation Time (IPTC)

| Attribute        | Value                   |
| ---------------- | ----------------------- |
| **API Key**      | `iptc_creation_time`    |
| **Type**         | Time                    |
| **Category**     | Custom Added Field      |
| **Fotoweb Key**  | `metadata_60`           |
| **Group**        | `description_raw_group` |
| **Translations** | en-GB, de-DE, nl-NL     |
| **Flow Changes** | Yes                     |

**Flow Change:** Populated from IPTC/EXLIF `metadata_60` on upload. Stored as time (hh:mm:ss); source value may be in `HHMMSS` format — the Flow handles the conversion.

---

## Section 5 — Curation

### 5.1 Folder (Destination)

| Attribute      | Value                                     |
| -------------- | ----------------------------------------- |
| **API Key**    | `folder`                                  |
| **Type**       | UUID → M2O `directus_folders` (read-only) |
| **Category**   | Directus Default Field                    |
| **Schema Key** | `folder_destination_id`                   |

**Note:** Directus natively provides a `folder` field (read-only, M2O to `directus_folders`) which covers this requirement. No additional field was added. The folder value is set when a file is uploaded or moved, and is accessible via API as the `folder` property.

---

### 5.2 Assigned to ID(s)

| Attribute           | Value                               |
| ------------------- | ----------------------------------- |
| **API Key**         | `action` (custom extension display) |
| **Category**        | Handled via Custom Extension        |
| **Schema Key**      | `assigned_entity_ids`               |
| **Status in Sheet** | Done                                |

**Implementation Note:** Covered by the custom `file-media-extras` interface on the `action` alias field, which displays reverse-link assignments via the `hotels_directus_files` junction. The "Hotels using this file" table is shown directly in the file detail view.

**Dev Note:** Population of hotel assignments via API uses a custom function — editors manage assignments through the hotel/entity records rather than directly on the file.

---

### 5.3 Album(s) / Lightbox

| Attribute           | Value                        |
| ------------------- | ---------------------------- |
| **API Key**         | `album` (alias field)        |
| **Category**        | Handled via Custom Extension |
| **Schema Key**      | `album_ids`                  |
| **Status in Sheet** | Done                         |

**Implementation Note:** Covered by the custom `file-albums` interface connected to the `albums_directus` junction collection. Media can appear in multiple albums without physical duplication.

---

### 5.4 Caption (Multilingual)

| Attribute           | Value                                          |
| ------------------- | ---------------------------------------------- |
| **API Key**         | `translations` (alias — translations relation) |
| **Category**        | Custom Added Field                             |
| **Schema Key**      | `caption_i18n`                                 |
| **Interface**       | `ai-translations`                              |
| **Group**           | `curation`                                     |
| **Status in Sheet** | Done                                           |
| **Flow Changes**    | Yes                                            |

Multilingual caption stored via Directus translations interface. Supports all configured languages (de-DE, de-CH, en-GB, nl-NL).

---

### 5.5 Is Map

| Attribute        | Value                      |
| ---------------- | -------------------------- |
| **API Key**      | `is_map`                   |
| **Type**         | Boolean (default: `false`) |
| **Category**     | Custom Added Field         |
| **Schema Key**   | `is_map`                   |
| **Translations** | de-DE, en-GB, nl-NL        |
| **Group**        | `curation`                 |

**Note:** The field is present in `directus_files` on staging and functions as a data flag — the custom extension reads this value to trigger the sticky box behaviour in the frontend. Both the field and the extension work together.

---

### 5.6 Tour32 Export

| Attribute        | Value                      |
| ---------------- | -------------------------- |
| **API Key**      | `tour32_export`            |
| **Type**         | Boolean (default: `false`) |
| **Category**     | Custom Added Field         |
| **Schema Key**   | `tour32_export`            |
| **Translations** | de-DE, en-GB, nl-NL        |
| **Group**        | `curation`                 |

**Note:** Similar to `is_map` — the boolean field is present in `directus_files` on staging and serves as the data store that the extension reads and writes. Both the field and the extension are required.

---

### 5.7 On-demand Formats

| Attribute      | Value                        |
| -------------- | ---------------------------- |
| **Category**   | Handled Natively by Directus |
| **Schema Key** | `files_on_demand`            |

**Note:** Directus natively handles on-demand format generation via its image transformation pipeline — formats are generated at request time and cached. No additional field is needed.

---

## Section 6 — Media Data

### 6.1 Draft / Published Status

| Attribute         | Value               |
| ----------------- | ------------------- |
| **API Key**       | `draft_status`      |
| **Type**          | String → Dropdown   |
| **Default Value** | `draft`             |
| **Category**      | Custom Added Field  |
| **Schema Key**    | `draft_status`      |
| **Group**         | `media_data`        |
| **Translations**  | de-DE, en-GB, nl-NL |

**Note:** The field sheet describes this as a "Draft / Paused State" boolean. The implementation provides a dropdown with two states: `draft` and `published` — covering both states in a single field rather than a boolean. This aligns better with standard CMS patterns and leaves room for additional states if needed down the line.

---

### 6.2 Original Format (Saved)

| Attribute      | Value                        |
| -------------- | ---------------------------- |
| **Category**   | Handled Natively by Directus |
| **Schema Key** | `file_original`              |

**Note:** Directus always retains the original uploaded file. No additional field is needed.

---

### 6.3 Auto-generated Formats

| Attribute      | Value                        |
| -------------- | ---------------------------- |
| **Category**   | Handled Natively by Directus |
| **Schema Key** | `files_auto_generated`       |

**Note:** Directus handles image format transformations natively via its asset pipeline. No additional field is needed.

---

### 6.4 File Size

| Attribute              | Value                                                   |
| ---------------------- | ------------------------------------------------------- |
| **Directus Default**   | `filesize` (bigInteger, bytes, read-only, system field) |
| **Custom Added Field** | `file_size_mb` (float)                                  |
| **Fotoweb Key**        | `asset_filesize`                                        |
| **Group**              | `media_data`                                            |

**Note:** Directus natively stores `filesize` in bytes. `file_size_mb` (float) was added as a companion field storing the size in megabytes for editor display convenience. Both values are available — `filesize` remains the authoritative system value.

---

### 6.5 File Format / Type

| Attribute              | Value                                              |
| ---------------------- | -------------------------------------------------- |
| **Directus Default**   | `type` (MIME type string, read-only, system field) |
| **Custom Added Field** | `file_format` (string, group: `media_data`)        |

**Note:** Directus natively stores `type` as a MIME type (e.g. `image/jpeg`). `file_format` was added as a human-readable format label (e.g. `JPG`, `PNG`, `MP4`) for display in the media library UI.

---

### 6.6 Dimensions (px)

| Attribute              | Value                                                                        |
| ---------------------- | ---------------------------------------------------------------------------- |
| **Directus Defaults**  | `width` (integer, read-only) + `height` (integer, read-only) — system fields |
| **Custom Added Field** | `dimensions_px` (string, group: `media_data`)                                |

**Note:** Directus stores `width` and `height` as separate read-only system fields. `dimensions_px` was added as a combined display string (e.g. `3840 × 2160`) populated automatically.

---

### 6.7 Resolution (dpi)

| Attribute           | Value               |
| ------------------- | ------------------- |
| **API Key**         | `resolution_dpi`    |
| **Type**            | BigInteger          |
| **Category**        | Custom Added Field  |
| **Translations**    | de-DE, en-GB, nl-NL |
| **Group**           | `media_data`        |
| **Status in Sheet** | Done                |

---

### 6.8 Media Sizes in cm

| Attribute           | Value                      |
| ------------------- | -------------------------- |
| **API Key**         | `media_sizes_cm`           |
| **Type**            | String (varchar 255)       |
| **Category**        | Custom Added Field         |
| **Translations**    | de-DE, de-CH, en-GB, nl-NL |
| **Group**           | `media_data`               |
| **Status in Sheet** | Done                       |

Calculated field — stores three print sizes (at 300 dpi, 150 dpi, 72 dpi) derived from pixel dimensions. Applies to images only.

---

### 6.9 Color Space

| Attribute           | Value               |
| ------------------- | ------------------- |
| **API Key**         | `color_space`       |
| **Type**            | String → Dropdown   |
| **Category**        | Custom Added Field  |
| **Fotoweb Key**     | `attr_colorspace`   |
| **Translations**    | de-DE, en-GB, nl-NL |
| **Group**           | `media_data`        |
| **Status in Sheet** | Done                |

**Dropdown choices:** RGB, CMYK, Grayscale, Lab, YCbCr, XYZ, HSV, HLS.

---

### 6.10 Direct / Share Link

| Attribute           | Value                        |
| ------------------- | ---------------------------- |
| **API Key**         | `share` (alias field)        |
| **Category**        | Handled via Custom Extension |
| **Schema Key**      | `share_link_url`             |
| **Interface**       | `media-share-button`         |
| **Status in Sheet** | Done                         |

**Implementation Note:** Covered by the custom `media-share-button` interface on the `share` alias field, which generates and displays the shareable direct link for the file. No separate URL string field is stored.

---

## Summary Tables

### A. Directus Default Fields (Cannot be moved/renamed/deleted)

| Field                | Directus API Key    | Type          | Notes                                               |
| -------------------- | ------------------- | ------------- | --------------------------------------------------- |
| Unique Media ID      | `id`                | UUID          | Primary key — exposed as `id` in API                |
| Upload Date          | `uploaded_on`       | Timestamp     | Hidden by default in UI                             |
| Uploaded By          | `uploaded_by`       | UUID → User   | Hidden by default in UI                             |
| Last Modified        | `modified_on`       | Timestamp     | Read-only, auto-updated                             |
| Last Modified By     | `modified_by`       | UUID → User   | Read-only, auto-updated                             |
| Media Description    | `description`       | Text          | Cannot be grouped                                   |
| Folder (Destination) | `folder`            | UUID → Folder | Read-only, set on upload                            |
| File Size (bytes)    | `filesize`          | BigInteger    | System value in bytes                               |
| Width                | `width`             | Integer       | System read-only                                    |
| Height               | `height`            | Integer       | System read-only                                    |
| MIME Type            | `type`              | String        | e.g. `image/jpeg`                                   |
| Filename on Disk     | `filename_disk`     | String        | System read-only                                    |
| Download Filename    | `filename_download` | String        |                                                     |
| Title                | `title`             | String        | Native Directus field (not in use)                  |
| Location             | `location`          | Text          | Native Directus field (not in use)                  |
| Tags (native)        | `tags`              | JSON          | Native Directus field (not in use — see `keywords`) |

### B. Custom Added Fields

| Field                  | API Key              | Type                   | Group/Accordion | Required | Flow                 |
| ---------------------- | -------------------- | ---------------------- | --------------- | -------- | -------------------- |
| Generated File Name    | `generated_filename` | String                 | Root            | No       | —                    |
| Place (City)           | `place`              | Int → M2O places       | Geographies     | No       | —                    |
| State                  | `state`              | Int → M2O states       | Geographies     | No       | —                    |
| Region                 | `region`             | Int → M2O regions      | Geographies     | No       | —                    |
| Country                | `country`            | Int → M2O countries    | Geographies     | No       | —                    |
| Destination            | `destination`        | Int → M2O destinations | Geographies     | No       | —                    |
| Keywords               | `keyword_ids`        | JSON (tags)            | Geographies     | No       | —                    |
| Photographer           | `photographer`       | String                 | Media Rights    | **Yes**  | —                    |
| Company Name           | `company_name`       | String                 | Media Rights    | **Yes**  | —                    |
| Contact Email          | `contact_email`      | String                 | Media Rights    | **Yes**  | —                    |
| Copyright              | `copyright`          | String                 | Media Rights    | **Yes**  | —                    |
| Expiry Date            | `expiry_date`        | Date                   | Media Rights    | **Yes**  | —                    |
| Original File Name     | `original_filename`  | String                 | Media Rights    | **Yes**  | —                    |
| Alt Text               | `alt_text`           | String                 | Description     | **Yes**  | ✓ IPTC auto-populate |
| Creation Date (IPTC)   | `iptc_creation_date` | Date                   | Description     | No       | ✓ IPTC auto-populate |
| Creation Time (IPTC)   | `iptc_creation_time` | Time                   | Description     | No       | ✓ IPTC auto-populate |
| Is Map                 | `is_map`             | Boolean                | Curation        | No       | —                    |
| Tour32 Export          | `tour32_export`      | Boolean                | Curation        | No       | —                    |
| Caption (multilingual) | `translations`       | Alias → Translations   | Curation        | No       | ✓                    |
| Draft/Published Status | `draft_status`       | String (dropdown)      | Media Data      | No       | —                    |
| File Size (MB)         | `file_size_mb`       | Float                  | Media Data      | No       | —                    |
| File Format            | `file_format`        | String                 | Media Data      | No       | —                    |
| Dimensions (px)        | `dimensions_px`      | String                 | Media Data      | No       | —                    |
| Resolution (dpi)       | `resolution_dpi`     | BigInteger             | Media Data      | No       | —                    |
| Media Sizes in cm      | `media_sizes_cm`     | String                 | Media Data      | No       | —                    |
| Color Space            | `color_space`        | String (dropdown)      | Media Data      | No       | —                    |

### C. Covered via Custom Extension (no direct field)

| Field               | Extension                          | Notes                                                                                   |
| ------------------- | ---------------------------------- | --------------------------------------------------------------------------------------- |
| Assigned to ID(s)   | `file-media-extras` (action field) | Shows hotel/entity assignments via reverse junction; API population via custom function |
| Album(s) / Lightbox | `file-albums` (album field)        | Manages album membership via `albums_directus` junction                                 |
| Direct / Share Link | `media-share-button` (share field) | Generates shareable link dynamically                                                    |

### D. Handled Natively by Directus (no field needed)

| Field                   | How it is covered                                            |
| ----------------------- | ------------------------------------------------------------ |
| Original Format (saved) | Directus always retains the original uploaded file           |
| Auto-generated Formats  | Directus asset transformation pipeline handles this natively |
| On-demand Formats       | Directus generates formats on-demand via asset endpoint      |

### E. Fields with Flow Changes

| Field                  | API Key              | Flow Action                                                                  |
| ---------------------- | -------------------- | ---------------------------------------------------------------------------- |
| Alt Text               | `alt_text`           | Auto-populated from IPTC/EXLIF `builtin_description` on upload               |
| Creation Date          | `iptc_creation_date` | Auto-populated from IPTC `metadata_55` on upload                             |
| Creation Time          | `iptc_creation_time` | Auto-populated from IPTC `metadata_60` on upload; `HHMMSS` → time conversion |
| Caption (multilingual) | `translations`       | AI-assisted translation flow                                                 |
