# `directus-extension-media-uploader`

Directus **Interface** extension (`id: media-uploader`) that turns a **Many-to-Many (M2M) relation to `directus_files`** into a mini file manager:

- Upload files
- Link existing files
- Preview thumbnails
- Open file details drawer
- Remove (unlink) from the record
- Optional: permanently delete the underlying file
- “Download all” helper

## Directus collections it uses

### Dynamic (relation-derived)

This interface is designed to be **re-usable** on *any* collection.

It derives the junction collection and FK field names at runtime using Directus’ relation metadata:

- `junctionTable` comes from `relationsStore` (the M2M relation whose `meta.one_field === props.field`)
- `filesFkField` comes from `m2mRelation.meta.junction_field`

So the junction table name is **dynamic** (example: `hotels_directus_files`, `cruises_directus_files`, etc.).

### Static / project-specific defaults

The interface’s **options** include project-specific JSON defaults (safe to edit when moving projects):

- `file_reverse_links` default JSON contains `hotels_directus_files` and other example junctions
- `download_format_presets` controls which download options appear (thumbnail menus, download-all, file details drawer, linked-collections dialog)
- Geography defaults (`geo_levels`, `geo_cascades`, `geo_filter_mappings`) reference collections like `places`, `states`, `destinations`, etc.

Also note:

- `directus_files` is always the related collection (hard requirement)
- The interface reads `/settings` to get `storage_default_folder`

## Required schema (minimum)

On whatever collection you want to use it:

1) Create a **Many-to-Many** field to `directus_files` (Directus will create a junction table)
2) Use this interface (`media-uploader`) on that M2M alias field

This interface will refuse to run if the related collection is not `directus_files`.

## How to use in Directus

- Add a **M2M** field from your collection to `directus_files`
- Set its interface to **Media Uploader**

## Static vs dynamic behavior

- **Dynamic**: Junction table and FK fields are derived from relation metadata (portable across collections).
- **Static (defaults only)**: Some option defaults assume your project has specific reverse-link junctions and geography collections.

## Moving this extension to another project

### Required files

Copy:

- `directus/extensions/directus-extension-media-uploader/`

Build it with `directus-extension build`.

### Required Directus setup in the target project

- No specific “albums” collections required
- You just need M2M relations to `directus_files` on the collections where you want to use it

### What you may need to change manually (common)

1) **Update option defaults** in `src/index.ts` — especially `DEFAULT_FILE_REVERSE_LINKS` and geography config defaults, to match the target project's collections.

2) Configure `download_format_presets` in the Studio field options. Defaults to JPG, PNG, WebP, TIFF when empty.

   ```json
   [
     { "label": "WebP 1200px", "format": "webp", "width": 1200, "fit": "contain" },
     { "label": "JPG original", "format": "jpg" }
   ]
   ```

3) For downloads + usage tables on the native **`directus_files`** detail page, install and configure `directus-extension-file-media-extras` (see that package's README).

