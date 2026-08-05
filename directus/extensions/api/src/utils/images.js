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
    .filter((row) => row.directus_files_id?.draft_status !== "draft")
    .map((row) => {
      const file = row.directus_files_id;
      if (!file?.id) return null;

      // Build caption_i18n translations map from junction_directus_files_translations_2
      const captionMap = {};
      for (const t of file.translations ?? []) {
        const code =
          typeof t.translations_id === "object"
            ? t.translations_id?.code
            : t.translations_id;
        // Unmapped locales (e.g. de-CH) are intentionally excluded, not passed through.
        const iso = LOCALE_TO_ISO[code];
        if (iso) captionMap[iso] = t.caption_i18n ?? null;
      }
      const caption_i18n =
        Object.keys(captionMap).length === 0
          ? null
          : (captionMap[lang] ?? null);

      return {
        id: file.id,
        url: `${base}/assets/${file.id}`,
        alt: file.alt_text ?? null,
        sort: row.sort ?? null,
        copyright: file.copyright ?? null,
        is_map: row.is_map ?? file.is_map ?? null,
        object_id_primarix: file.primarix_picid ?? null,
        filename_fotoweb: file.fotoware_file_name ?? null,
        use_tour32: row.tour32_export ?? file.tour32_export ?? null,
      };
    })
    .filter(Boolean);
}
