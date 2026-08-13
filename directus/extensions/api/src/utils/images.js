import { LOCALE_TO_ISO } from "../maps/language-code.map.js";
import { restrictTo } from "../shared/response/visibility.js";
import { getRequestBaseUrl } from "../api/shared/requestContext.js";

/**
 * Builds picture objects for hotel media files.
 * Uses the current request's own protocol+host (so staging/dev/local all resolve
 * to the domain that was actually called).
 *
 * @param {object[]} mediaJunctionRows - rows from hotels.media (hotels_directus_files junction)
 * @param {string|null} lang - ISO 639-1 language code for caption_i18n selection
 * @returns {object[]}
 */
export function buildImageUrls(mediaJunctionRows, lang = null) {
  const base = (getRequestBaseUrl() ?? "").replace(/\/$/, "");

  // Contract: "Only 'published' media are returned." directus_files.draft_status is a
  // two-value enum (published/unpublished) — anything not explicitly "published"
  // (including legacy NULLs) must not surface.
  return (mediaJunctionRows ?? [])
    .filter((row) => row.directus_files_id?.draft_status === "published")
    .map((row) => {
      const file = row.directus_files_id;
      if (!file?.id) return null;

      // Build caption_i18n translations map from junction_directus_files_translations_2
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
        // Backoffice-only per the contract (MediaItem = MediaItemWeb + these 4) — matches
        // what shared/response/webDetail.js's cleanMedia() strips today for the web path.
        is_map: restrictTo(row.is_map ?? file.is_map ?? null, "backoffice"),
        object_id_primarix: restrictTo(
          file.primarix_picid ?? null,
          "backoffice",
        ),
        filename_fotoweb: restrictTo(
          file.fotoware_file_name ?? null,
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
