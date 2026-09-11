import { buildImageUrls } from "../../utils/images.js";

/**
 * @description Builds a thumbnail URL from a media array.
 *
 * Delegates to `buildImageUrls` to resolve the full list of media objects, taking the URL
 * from the first resulting image. A Directus transformation query string (e.g. `?key=thumbnail`)
 * is then appended so the image server resizes it on the fly.
 *
 * List endpoints use this to grab a lightweight preview image for the resource.
 * 
 * @param {Array<Object>} media - Array of media junction rows.
 * @param {String} lang - The requested language code.
 * @param {Object} [options] - Configuration options.
 * @param {String} [options.key='thumbnail'] - The Directus preset key for the thumbnail.
 * @param {Boolean} [options.publishedOnly=true] - Forwarded to buildImageUrls.
 * @returns {String|null} The resolved thumbnail URL, or null if no media exists.
 */
export function buildThumbnailUrl(
  media,
  lang,
  { key = "thumbnail", publishedOnly = true } = {},
) {
  const url = buildImageUrls(media, lang, { publishedOnly })?.[0]?.url;
  return url ? `${url}?key=${key}` : null;
}

/**
 * @description Constructs an image badge object for promotional or informational overlays.
 *
 * Checks whether the resource has an active `image_badge_status`. If so, it merges the badge
 * status and dates with the provided translated teaser/details text.
 *
 * Item transformers use this to format badge data. The caller resolves the translations
 * first and passes them in; this helper just standardizes the output shape.
 * 
 * @param {Object} item - The main resource item (e.g., hotel, tour).
 * @param {Object} activeBadgeTranslations - The pre-resolved translated texts for the badge.
 * @returns {Object|null} The formatted image badge, or null if disabled.
 */
export function buildImageBadge(item, activeBadgeTranslations) {
  return item.image_badge_status
    ? {
        teaser: activeBadgeTranslations?.image_badge_teaser ?? null,
        details: activeBadgeTranslations?.image_badge_details ?? null,
        start_date: item.image_badge_start_date ?? null,
        end_date: item.image_badge_end_date ?? null,
        status: item.image_badge_status ?? null,
      }
    : null;
}
