import { LOCALE_TO_ISO } from "../maps/language-code.map.js";
import { restrictTo } from "../shared/response/visibility.js";
import { getRequestBaseUrl } from "../api/shared/requestContext.js";

function unwrapPartnerId(value) {
  if (value == null || value === "") return null;
  if (typeof value === "object") {
    const id = value.id;
    return id != null && id !== "" ? String(id) : null;
  }
  return String(value);
}

/**
 * Restricts assigned product media to the API user's partner.
 * All → keep every assigned file (including uploaders with no partner).
 * Selected → keep only files whose uploader's partner_selected matches; drop nulls.
 */
export function filterMediaJunctionByPartner(
  mediaJunctionRows,
  { partnerId, partnerVisibility } = {},
) {
  const rows = mediaJunctionRows ?? [];
  if (partnerVisibility !== "selected") return rows;
  const expected = unwrapPartnerId(partnerId);
  if (!expected) return [];
  return rows.filter((row) => {
    const uploader = row?.directus_files_id?.uploaded_by;
    const uploaderPartner =
      uploader != null && typeof uploader === "object"
        ? unwrapPartnerId(uploader.partner_selected)
        : null;
    return uploaderPartner != null && uploaderPartner === expected;
  });
}

export function applyPartnerMediaFilter(item, apiUser) {
  if (!item || !Array.isArray(item.media)) return item;
  return {
    ...item,
    media: filterMediaJunctionByPartner(item.media, {
      partnerId: apiUser?.partnerId,
      partnerVisibility: apiUser?.partnerVisibility,
    }),
  };
}

/**
 * @description Builds picture objects for media files, handling translations and visibility.
 *
 * Iterates through a junction collection (e.g. `hotels` -> `directus_files`). By default
 * it keeps only files that are strictly "published"; hotel backoffice opts out so assigned
 * unpublished files still appear. For each file it builds a translation map and extracts
 * captions and alt text for the requested language. The full asset URL is constructed using
 * the current request's base URL so it matches the active environment (staging/dev/local).
 * Internal metadata fields (like `is_map` or `object_id_primarix`) are restricted to the
 * "backoffice" audience via `restrictTo`.
 *
 * Resource transformers use this to format their media arrays consistently, applying both
 * localization and audience-based field restrictions in one place.
 *
 * @param {Array<Object>} mediaJunctionRows - Rows from a media junction collection.
 * @param {String|null} [lang=null] - ISO 639-1 language code for fetching translations.
 * @param {Object} [options]
 * @param {Boolean} [options.publishedOnly=true] - When true, keep only files with
 *   draft_status "published". Hotel backoffice passes false so assigned (including
 *   unpublished) images still appear.
 * @returns {Array<Object>} Array of formatted image objects.
 */
export function buildImageUrls(
  mediaJunctionRows,
  lang = null,
  { publishedOnly = true } = {},
) {
  const base = (getRequestBaseUrl() ?? "").replace(/\/$/, "");

  /*
   * Contract for web/product endpoints: "Only 'published' media are returned."
   * directus_files.draft_status is a two-value enum (published/unpublished) —
   * anything not explicitly "published" (including legacy NULLs) must not surface
   * unless the caller opts out (hotel backoffice).
   */
  return (mediaJunctionRows ?? [])
    .filter((row) =>
      publishedOnly
        ? row.directus_files_id?.draft_status === "published"
        : Boolean(row.directus_files_id?.id),
    )
    .map((row) => {
      const file = row.directus_files_id;
      if (!file?.id) return null;

      /* Build caption_i18n translations map from junction_directus_files_translations_2. */
      const captionMap = {};
      const altMap = {};
      for (const t of file.translations ?? []) {
        const code =
          typeof t.translations_id === "object"
            ? t.translations_id?.code
            : t.translations_id;
        const iso = LOCALE_TO_ISO[code];
        if (iso) {
          captionMap[iso] = t.caption_i18n ?? null;
          altMap[iso] = t.alt_text ?? null;
        }
      }
      const caption_i18n =
        Object.keys(captionMap).length === 0
          ? null
          : (captionMap[lang] ?? null);
      const alt_text =
        Object.keys(altMap).length === 0 ? null : (altMap[lang] ?? null);

      return {
        id: file.id,
        url: `${base}/assets/${file.id}`,
        alt: alt_text ?? null,
        sort: row.sort ?? null,
        copyright: file.copyright ?? null,
        /* Backoffice-only per the contract (MediaItem = MediaItemWeb + these 4) — restricted
         * the same way every other transformer restricts backoffice-only fields, via
         * restrictTo()/assembleResponse() (see shared/response/visibility.js). */
        is_map: restrictTo(row.is_map ?? file.is_map ?? null, "backoffice"),
        object_id_primarix: restrictTo(
          file.primarix_picid ?? null,
          "backoffice",
        ),
        filename_fotoweb: restrictTo(
          file.original_filename ?? file.fotoware_file_name ?? null,
          "backoffice",
        ),
        use_tour32: restrictTo(
          row.tour32_export ?? file.tour32_export ?? null,
          "backoffice",
        ),
      };
    })
    .filter(Boolean);
}
