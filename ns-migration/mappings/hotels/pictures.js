// Maps API picture objects → directus_files upload metadata.
// Pictures are stored as Directus files and linked to hotels via the hotels_files junction.
// The caller is responsible for downloading the file from the CDN, uploading it, and
// then creating the hotels_files junction record.

// TODO: confirm the CDN base URL for constructing the full image URL from filename + workspace.
// Observed pattern from API: workspace="2020", filename="AUS_WA_017_20150909_BR.jpg"
const CDN_BASE = 'TODO_CONFIRM_CDN_BASE_URL';

export function mapPicture(apiPicture) {
  return {
    // Fields used when uploading to Directus via multipart or URL import
    url:      `${CDN_BASE}/${apiPicture.workspace}/${apiPicture.filename}`,
    filename: apiPicture.filename,

    // directus_files metadata fields
    title:         apiPicture.filename,               // TODO: use a meaningful title if available
    copyright:     apiPicture.copyright || null,

    // Not stored in directus_files — used only during migration logic
    // picid:      apiPicture.picid     — external picture ID (TODO: store in custom field if needed)
    // workspace:  apiPicture.workspace — used to build CDN URL only
    // expiryDate: apiPicture.expiryDate — no equivalent in directus_files (TODO: confirm if needed)
  };
}

// UNMAPPED API FIELDS:
// picid       — external picture ID; no directus_files field; TODO: add custom field if traceability needed
// workspace   — CDN path segment; consumed when building URL, not stored separately
// expiryDate  — no equivalent in directus_files; stored as '0000-00-00' for most records (likely unused)
