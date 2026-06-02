# `directus-extension-interface-file-albums`

Directus **Interface** extension (`id: file-albums`) for managing **Album membership for a single file**.

This interface is intended to be used on **`directus_files`** (or any collection that has a `primaryKey` equal to a file id), and it writes to a junction table to link a file to one or more albums.

## Purpose / what it does

- Shows which **albums** the current file is in
- Lets you **add** the current file to an existing album
- Lets you **create a new album** and immediately add the current file
- Lets you **remove** the file from an album (deletes the junction row)

## Directus collections it uses

**Static (hardcoded) collection names and endpoints** (must exist in the Directus project):

- `albums`
- `albums_directus_files` (junction)
- `directus_files` (the file itself)

API endpoints used:

- `GET /items/albums`
- `POST /items/albums`
- `GET /items/albums_directus_files`
- `POST /items/albums_directus_files`
- `DELETE /items/albums_directus_files/:id`

## Required schema (minimum)

Create these in Directus:

### `albums`

- `id` (any PK type is fine, typically `uuid` or `integer`)
- `name` (string, **UNIQUE**, required)

### `albums_directus_files` (junction)

- `id` (PK, typically integer auto-increment)
- `albums_id` (M2O → `albums.id`, required)
- `directus_files_id` (M2O → `directus_files.id`, required)
- Unique index on (`albums_id`, `directus_files_id`) to prevent duplicate file assignment

## How to use in Directus (recommended)

- Add an **alias / presentation field** to `directus_files` (e.g. field name: `albums_panel`)
- Set the interface to **File Albums** (`file-albums`)

## Static vs dynamic behavior

- **Static**: Assumes the junction is `albums_directus_files` and the file FK is `directus_files_id`.
- **Not dynamic**: Does not derive collection/field names from relation metadata.

## Moving this extension to another project

### Required files

Copy the whole folder:

- `directus/extensions/directus-extension-interface-file-albums/`

Then build it with:

- `directus-extension build`

### Required Directus setup in the target project

- Create collections: `albums`, `albums_directus_files`
- Ensure the junction fields match (`albums_id`, `directus_files_id`)
- Assign interface `file-albums` to a presentation/alias field on `directus_files` (or equivalent file-detail view)

### What you may need to change in code

If your target project uses different names, update these **hardcoded** endpoints inside:

- `src/interface.vue`

Search/replace:

- `/items/albums` → your albums collection endpoint
- `/items/albums_directus_files` → your junction collection endpoint
- `albums_id` / `directus_files_id` → your junction field names

# `directus-extension-interface-file-albums`

Directus **Interface** extension (`id: file-albums`) for managing **Album membership for a single file**.

This interface is intended to be used on **`directus_files`** (or any collection that has a `primaryKey` equal to a file id), and it writes to a junction table to link a file to one or more albums.

## Purpose / what it does

- Shows which **albums** the current file is in
- Lets you **add** the current file to an existing album
- Lets you **create a new album** and immediately add the current file
- Lets you **remove** the file from an album (deletes the junction row)

## Directus collections it uses

**Static (hardcoded) collection names and endpoints** (must exist in the Directus project):

- `albums`
- `albums_directus_files` (junction)
- `directus_files` (the file itself)

API endpoints used:

- `GET /items/albums`
- `POST /items/albums`
- `GET /items/albums_directus_files`
- `POST /items/albums_directus_files`
- `DELETE /items/albums_directus_files/:id`

## Required schema (minimum)

Create these in Directus:

### `albums`

- `id` (any PK type is fine, typically `uuid` or `integer`)
- `name` (string, **UNIQUE**, required)

### `albums_directus_files` (junction)

- `id` (PK, typically integer auto-increment)
- `albums_id` (M2O → `albums.id`, required)
- `directus_files_id` (M2O → `directus_files.id`, required)
- Unique index on (`albums_id`, `directus_files_id`) to prevent duplicate file assignment

## How to use in Directus (recommended)

- Add an **alias / presentation field** to `directus_files` (e.g. field name: `albums_panel`)
- Set the interface to **File Albums** (`file-albums`)

## Static vs dynamic behavior

- **Static**: This extension assumes the junction is exactly `albums_directus_files` and the file FK is `directus_files_id`.
- **Not dynamic**: It does not derive collection/field names from relation metadata.

## Moving this extension to another project

### Required files

Copy the whole folder:

- `directus/extensions/directus-extension-interface-file-albums/`

Then build it with:

- `directus-extension build`

### Required Directus setup in the target project

- Create collections: `albums`, `albums_directus_files`
- Ensure the junction fields match (`albums_id`, `directus_files_id`)
- Assign interface `file-albums` to a presentation/alias field on `directus_files` (or equivalent file-detail view)

### What you may need to change in code

If your target project uses different names, update these **hardcoded** endpoints inside:

- `src/interface.vue`

Search/replace:

- `/items/albums` → your albums collection endpoint
- `/items/albums_directus_files` → your junction collection endpoint
- `albums_id` / `directus_files_id` → your junction field names

