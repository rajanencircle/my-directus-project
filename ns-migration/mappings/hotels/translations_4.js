// Maps API fields → hotels_translations_4 collection (image badge copy).
// Stores the teaser and detail text shown alongside the image badge.
// Directus alias field on hotels: `image_badge_translations`.

export function mapHotelTranslation4(apiHotel) {
  return {
    // hotels_id and translations_id set by caller

    image_badge_teaser:  apiHotel.hotel_picinfo_teaser || null,
    image_badge_details: apiHotel.hotel_picinfo_detail || null,
  };
}

// UNMAPPED API FIELDS (relevant to this collection but no Directus field):
// hotel_picinfo_state — TODO: possibly maps to hotels.image_badge_status; confirm with client
// picinfo_dates       — TODO: possibly maps to hotels.image_badge_start_date; confirm with client
// picinfo_dates_2     — TODO: possibly maps to hotels.image_badge_end_date; confirm with client
