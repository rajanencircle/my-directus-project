# `directus-extension-file-media-extras`

Presentation interface (`id: file-media-extras`) for the native **`directus_files`** detail page in Directus Studio.

Adds two blocks to any file's detail form:

1. **Downloads** — configurable format buttons; default set is JPG, PNG, WebP, TIFF.
2. **Usage / assignments** — one or more tables showing which collection records use this file, driven by reverse junction queries.

---

## Installation

Build and copy the `dist/` output into your Directus extensions folder (same way as other extensions in this repo), or run `npm run build` inside this package.

```bash
cd directus/extensions/directus-extension-file-media-extras
npm install && npm run build
```

The `build.sh` script in `directus/extensions/` already includes this package.

---

## Studio setup

1. Open **Settings → Data Model → `directus_files`**.
2. Add a new field → choose **Presentation** → select **"File Downloads & Usage"**.
3. In the field options, paste your `download_format_presets` and/or `file_reverse_links` JSON (see below).
4. Drag the field **above** the `file-albums` presentation field so it appears in the desired order.
5. Save the data model and reload.

---

## Options

### `download_format_presets`

JSON array of download button definitions. Each entry creates one button.

| Key | Type | Description |
|-----|------|-------------|
| `label` | string (required) | Button label |
| `format` | string? | `jpg`, `png`, `webp`, `tiff`, `auto` |
| `width` | number? | Output width in pixels |
| `height` | number? | Output height in pixels |
| `fit` | string? | `cover`, `contain`, `inside`, `outside` |
| `quality` | number? | 1–100 |

**Default** (used when empty or invalid):
```json
[
  { "label": "JPG", "format": "jpg" },
  { "label": "PNG", "format": "png" },
  { "label": "WebP", "format": "webp" },
  { "label": "TIFF", "format": "tiff" }
]
```

**Custom example:**
```json
[
  { "label": "WebP 1200px", "format": "webp", "width": 1200, "fit": "contain" },
  { "label": "JPG large", "format": "jpg", "width": 2400 },
  { "label": "JPG original", "format": "jpg" }
]
```

For non-image files (PDF, video, etc.) the download buttons are replaced by a single "Download original" button regardless of presets.

---

### `file_reverse_links`

JSON array defining usage/assignment lookup queries. Each entry produces a table showing which items in a junction collection reference the current file.

| Key | Type | Description |
|-----|------|-------------|
| `junction_collection` | string (required) | Junction table name |
| `file_field` | string (required) | FK field on the junction pointing to `directus_files` |
| `section_title` | string? | Table heading |
| `fields` | string or string[]? | Fields to fetch (e.g. `["*", "hotels_id.*"]`) |
| `table_headers` | string[]? | Column headers |
| `table_paths` | string[]? | Dot-paths into each row (same length as `table_headers`) |
| `limit` | number? | Max rows (default 50, max 500) |

**Example:**
```json
[
  {
    "junction_collection": "hotels_directus_files",
    "file_field": "directus_files_id",
    "fields": ["*", "hotels_id.*"],
    "table_headers": ["Junction ID", "Hotel ID", "Hotel name"],
    "table_paths": ["id", "hotels_id.id", "hotels_id.name"],
    "section_title": "Hotels using this file",
    "limit": 50
  }
]
```

Use `[]` to disable the usage section entirely.

When rules are configured but a file has no assignments, each section shows **"No assignments found."** instead of being hidden.

---

## Relationship to `directus-extension-media-uploader`

The M2M media uploader already shows the file details drawer (with downloads + usage) when you click a thumbnail. This extension provides the **same information directly on the native `/admin/files/:id` page**, so editors can see it without going through a parent record.

Both extensions accept the same JSON option shapes. You can paste the same JSON in both places, or configure them independently per field.
