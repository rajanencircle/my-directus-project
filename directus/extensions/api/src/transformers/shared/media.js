import { buildImageUrls } from "../../utils/images.js";

export function buildThumbnailUrl(
  media,
  lang,
  { key = "thumbnail" } = {},
) {
  const url = buildImageUrls(media, lang)?.[0]?.url;
  return url ? `${url}?key=${key}` : null;
}

// item is whichever resource the field block belongs to (hotel/cruise/tour/etc); the
// caller passes in its own already-resolved badge-translation object for the active
// language (e.g. `pickFromMap(badgeMap, lang)` or `badgeMap?.[lang]`) — this helper only
// assembles the final shape, it doesn't touch how that translation lookup happens.
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
