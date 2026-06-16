import { LOCALE_TO_ISO } from "../maps/language-code.map.js";

/**
 * Builds picture objects for hotel media files.
 * Uses DIRECTUS_PUBLIC_URL env var as the base URL for asset links.
 *
 * @param {object[]} mediaJunctionRows - rows from hotels.media (hotels_directus_files junction)
 * @param {string|null} lang - ISO 639-1 language code for caption_i18n selection
 * @returns {object[]}
 */
export function buildImageUrls(mediaJunctionRows, lang = null) {
  const base = (process.env.DIRECTUS_PUBLIC_URL ?? "").replace(/\/$/, "");

  return (mediaJunctionRows ?? [])
    .filter((row) => row.directus_files_id?.draft_status !== 'draft')
    .map((row, index) => {
      const file = row.directus_files_id;
      if (!file?.id) return null;

      // Build caption_i18n translations map from junction_directus_files_translations_2
      const captionMap = {};
      for (const t of file.translations ?? []) {
        const code =
          typeof t.translations_id === "object"
            ? t.translations_id?.code
            : t.translations_id;
        const iso = LOCALE_TO_ISO[code] ?? code;
        if (iso) captionMap[iso] = t.caption_i18n ?? null;
      }
      const caption_i18n =
        Object.keys(captionMap).length === 0
          ? null
          : lang && captionMap[lang] !== undefined
            ? captionMap[lang]
            : captionMap;

      return {
        id: file.id,
        filename: file.filename_download ?? null,
        url: `${base}/assets/${file.id}`,
        thumbnail_url: `${base}/assets/${file.id}?width=400&height=300&fit=cover`,
        copyright: file.copyright ?? null,
        alt_text: file.alt_text ?? null,
        caption_i18n,
        is_map: file.is_map ?? null,
        tour32_export: file.tour32_export ?? null,
        dimensions_px: file.dimensions_px ?? null,
        keyword_ids: file.keyword_ids ?? null,
        folder: file.folder
          ? { id: file.folder.id ?? null, name: file.folder.name ?? null }
          : null,
        expiry_date: file.expiry_date ?? null,
        sort: index + 1,
      };
    })
    .filter(Boolean);
}
