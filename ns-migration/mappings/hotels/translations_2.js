// Maps API fields → hotels_translations_2 collection (Tour32 content block).
// Stores the Tour32-specific editorial fields: intro text, location prose, room description, etc.
// Directus alias field on hotels: unclear — TODO: confirm which alias links to hotels_translations_2.

export function mapHotelTranslation2(apiHotel) {
  return {
    // hotels_id and translations_id set by caller

    introduction_text:    apiHotel.introduction_text || null,
    hotel_name:           apiHotel.hotel_name || null,
    location:             apiHotel.location || null,
    room:                 apiHotel.room || null,
    total_number_of_rooms: apiHotel.total_number_of_rooms || null, // stored as string here
    access:               apiHotel.access || null,

    // Composed from headline/text pairs
    headline_and_text: buildHeadlineTextList([
      { headline: apiHotel.headline_1, text: apiHotel.text_1 },
      { headline: apiHotel.headline_2, text: apiHotel.text_2 },
    ]),
  };
}

function buildHeadlineTextList(pairs) {
  const entries = pairs.filter((p) => p.headline || p.text);
  return entries.length > 0 ? entries : null;
}
