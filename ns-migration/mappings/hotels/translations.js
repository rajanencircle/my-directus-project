// Maps API fields → hotels_translations collection (main editorial descriptions).
// This is the primary translation table for hotel content (teaser, descriptions, rooms).
// Directus alias field on hotels: `hotel_descriptions_translations` (ai-translations).
// Each record links: hotels_id (uuid) + translations_id (uuid from languages table).

export function mapHotelTranslation(apiHotel) {
  return {
    // hotels_id and translations_id are set by the caller, not mapped here

    total_number_of_rooms: apiHotel.total_number_of_rooms
      ? parseInt(apiHotel.total_number_of_rooms, 10) || null
      : null,

    // TODO: confirm — no direct API field for these; may come from a separate editorial source
    teaser:                  null, // TODO: no API equivalent found
    description_short:       null, // TODO: no API equivalent found
    description_surrounding: null, // TODO: no API equivalent found
    remarks_arrival:         null, // TODO: no API equivalent found
    description_rooms:       null, // TODO: no API equivalent found
    subline_location:        null, // TODO: confirm — possibly apiHotel.brox_subline_city

    // Composed from headline_1/text_1 + headline_2/text_2 pairs
    description_supplementary: buildHeadlineTextList([
      { headline: apiHotel.headline_1, text: apiHotel.text_1 },
      { headline: apiHotel.headline_2, text: apiHotel.text_2 },
    ]),
  };
}

function buildHeadlineTextList(pairs) {
  const entries = pairs.filter((p) => p.headline || p.text);
  return entries.length > 0 ? entries : null;
}
