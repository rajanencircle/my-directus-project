// Maps API fields → hotels_translations_3 collection (price info & service conditions).
// Stores service inclusions, cancellation terms, children policy, mobility text, etc.
// Directus alias field on hotels: `price_info_translations`.

export function mapHotelTranslation3(apiHotel) {
  return {
    // hotels_id and translations_id set by caller

    services_included:           apiHotel.included_services || null,
    services_not_included:       apiHotel.not_included || null,
    service_highlights:          apiHotel.smiley || null,          // field note: "aka Smilie"
    deviating_cancelation_terms: apiHotel.hotel_different_cancel_conditions || null,
    children_policy:             apiHotel.children || null,
    important_information:       apiHotel.note || null,
    mobility_advice_text:        apiHotel.mobility_advice_text || null,

    // minimum_stay is a dropdown in Directus: '1 Night' … '7 Night'
    // API returns free-text — map only if value exactly matches allowed choices, else null
    minimum_stay: normalizeMinimumStay(apiHotel.minimum_stay),

    children_free_age:    parseIntOrNull(apiHotel.children_max_age_no_cost),
    children_free_number: parseIntOrNull(apiHotel.anzahl_der_kinder_kostenfrei),

    minimum_stay_additions: null, // TODO: no API equivalent found

    // Composed from pkt_headline/pkt_text pairs
    price_infos_supplementary: buildHeadlineTextList([
      { headline: apiHotel.pkt_headline_1, text: apiHotel.pkt_text_1 },
      { headline: apiHotel.pkt_headline_2, text: apiHotel.pkt_text_2 },
    ]),
  };
}

const MINIMUM_STAY_CHOICES = ['1 Night', '2 Night', '3 Night', '4 Night', '5 Night', '6 Night', '7 Night'];

function normalizeMinimumStay(value) {
  if (!value) return null;
  const match = MINIMUM_STAY_CHOICES.find((c) => c === value);
  return match ?? null; // TODO: confirm mapping if API uses different format
}

function parseIntOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

function buildHeadlineTextList(pairs) {
  const entries = pairs.filter((p) => p.headline || p.text);
  return entries.length > 0 ? entries : null;
}
