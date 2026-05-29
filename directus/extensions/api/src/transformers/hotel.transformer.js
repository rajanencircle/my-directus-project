import { HOTEL_STRIP_FIELDS } from "../maps/hotel.strip-fields.js";
import { LOCALE_TO_ISO } from "../maps/language-code.map.js";
import { ensureUtcSuffix } from "../utils/timestamps.js";
import { groupPrices } from "../utils/prices.js";
import { buildImageUrls } from "../utils/images.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getLocaleCode(translationsId) {
  return typeof translationsId === "object"
    ? translationsId?.code
    : translationsId;
}

function buildTranslationsMap(rows, pickFields) {
  const map = {};
  for (const row of rows ?? []) {
    const locale = getLocaleCode(row.translations_id);
    const iso = LOCALE_TO_ISO[locale] ?? locale;
    if (!iso) continue;
    map[iso] = pickFields(row);
  }
  return map;
}

function pickFromMap(translationsMap, lang) {
  if (!translationsMap || Object.keys(translationsMap).length === 0)
    return null;
  if (lang && translationsMap[lang]) return translationsMap[lang];
  const firstKey = Object.keys(translationsMap)[0];
  return translationsMap[firstKey] ?? null;
}

function shapeGeo(geo, lang) {
  if (!geo) return null;
  const transMap = buildTranslationsMap(geo.translations, (t) => ({
    name: t.name ?? null,
  }));
  const filteredTransMap = lang
    ? transMap[lang]
      ? { [lang]: transMap[lang] }
      : {}
    : transMap;
  return {
    id: geo.id,
    ...(geo.ISO !== undefined && { iso: geo.ISO }),
    ...(geo.id_primarix !== undefined && { id_primarix: geo.id_primarix }),
    ...(geo.location_tour32 !== undefined && {
      location_tour32: geo.location_tour32,
    }),
    translations: filteredTransMap,
  };
}

function getGeoName(geo, lang) {
  if (!geo) return null;
  const map = buildTranslationsMap(geo.translations, (t) => t.name ?? null);
  return pickFromMap(map, lang);
}

function stripFields(obj, fields) {
  for (const f of fields) {
    delete obj[f];
  }
}

// Publication filter rules:
// - unpublished → exclude
// - start set, end not set → include (open-ended)
// - start set, end set → include only if today is within [start, end]
// - start not set, end set → exclude (invalid range)
// - neither set → include (no date restriction)
function isPublicationActive(item, today) {
  if (item.status === "unpublished") return false;
  const start = item.publish_start ?? null;
  const end = item.publish_end ?? null;
  if (!start && end) return false;
  if (start && end) return today >= start && today <= end;
  return true;
}

const SUPPLIER_TYPE_MAP = {
  Yes: "Independent",
  No: "Partner",
};

/**
 * Builds a per-language map of { marginPct, unit } from hotel_prices rows.
 */
function buildPriceSettingsMap(hotelPricesRows) {
  const map = {};
  for (const row of hotelPricesRows ?? []) {
    const locale = getLocaleCode(row.translations_id);
    const iso = LOCALE_TO_ISO[locale] ?? locale;
    if (!iso) continue;
    map[iso] = {
      marginPct: row.margin_percentage ?? null,
      unit:
        row.buy_price_type === "per_person"
          ? "person"
          : row.buy_price_type === "per_unit"
            ? "unit"
            : null,
    };
  }
  return map;
}

// ---------------------------------------------------------------------------
// Public transformer functions
// ---------------------------------------------------------------------------

/**
 * Shapes a single hotel list item.
 * If `lang` is provided (ISO 639-1 short code), `description` is populated from that language.
 * `translations` always contains all available languages.
 */
export function shapeHotelListItem(hotel, lang) {
  const descTranslationsMap = buildTranslationsMap(
    hotel.hotel_descriptions_translations,
    (t) => ({
      teaser: t.teaser ?? null,
      description_short: t.description_short ?? null,
    }),
  );

  const filteredTranslations = lang
    ? descTranslationsMap[lang]
      ? { [lang]: descTranslationsMap[lang] }
      : {}
    : descTranslationsMap;

  const shaped = {
    type: "hotel",
    season: hotel.season ?? null,
    id: hotel.id,
    name: hotel.name,
    object_id: hotel.object_id ?? null,
    status_primarix: hotel.status_primarix ?? null,
    date_created: ensureUtcSuffix(hotel.date_created),
    date_updated: ensureUtcSuffix(hotel.date_updated),
    translations: filteredTranslations,
    description: pickFromMap(descTranslationsMap, lang),
    country: shapeGeo(hotel.country, lang),
    state: shapeGeo(hotel.state, lang),
    region: shapeGeo(hotel.region, lang),
    place: shapeGeo(hotel.place, lang),
    hotel_classification: hotel.hotel_classification
      ? {
          id: hotel.hotel_classification.id,
          label: hotel.hotel_classification.label,
        }
      : null,
    hotel_group: hotel.hotel_group
      ? { id: hotel.hotel_group.id, label: hotel.hotel_group.label }
      : null,
  };

  stripFields(shaped, HOTEL_STRIP_FIELDS);
  return shaped;
}

/**
 * Shapes a full hotel detail item.
 * `lang` is an ISO 639-1 short code (e.g. 'de', 'en', 'nl') or null.
 */
export function shapeHotelDetail(hotel, lang) {
  // Merged translations map (descriptions + services/info per language)
  const descMap = buildTranslationsMap(
    hotel.hotel_descriptions_translations,
    (t) => ({
      subline_location: t.subline_location ?? null,
      teaser: t.teaser ?? null,
      description_short: t.description_short ?? null,
      description_surrounding: t.description_surrounding ?? null,
      description_rooms: t.description_rooms ?? null,
      total_number_of_rooms: t.total_number_of_rooms ?? null,
      remarks_arrival: t.remarks_arrival ?? null,
      description_supplementary: t.description_supplementary ?? null,
    }),
  );

  const infoMap = buildTranslationsMap(hotel.price_info_translations, (t) => ({
    services_included: t.services_included ?? null,
    services_not_included: t.services_not_included ?? null,
    service_highlights: t.service_highlights ?? null,
    minimum_stay: t.minimum_stay ?? null,
    minimum_stay_additions: t.minimum_stay_additions ?? null,
    deviating_cancelation_terms: t.deviating_cancelation_terms ?? null,
    children_policy: t.children_policy ?? null,
    children_free_age: t.children_free_age ?? null,
    children_free_number: t.children_free_number ?? null,
    important_information: t.important_information ?? null,
    mobility_advice_text: t.mobility_advice_text ?? null,
    price_infos_supplementary: t.price_infos_supplementary ?? null,
  }));

  const allLangs = new Set([...Object.keys(descMap), ...Object.keys(infoMap)]);
  const allTranslations = {};
  for (const iso of allLangs) {
    allTranslations[iso] = { ...(descMap[iso] ?? {}), ...(infoMap[iso] ?? {}) };
  }
  const translations = lang
    ? allTranslations[lang]
      ? { [lang]: allTranslations[lang] }
      : {}
    : allTranslations;

  // Per-language price settings (margin, buy entity)
  const priceSettingsMap = buildPriceSettingsMap(hotel.hotel_prices);
  const activeSettings =
    lang && priceSettingsMap[lang]
      ? priceSettingsMap[lang]
      : (Object.values(priceSettingsMap)[0] ?? { marginPct: null, unit: null });

  // Image badge translations
  const badgeTranslations = buildTranslationsMap(
    hotel.image_badge_translations,
    (t) => ({
      image_badge_teaser: t.image_badge_teaser ?? null,
      image_badge_details: t.image_badge_details ?? null,
    }),
  );

  const today = new Date().toISOString().slice(0, 10);

  // Specials — filter by publication status and date range
  const specials = (hotel.hotels_specials ?? []).filter((s) =>
    isPublicationActive(s, today),
  );

  // Rooms with new shape — filter room_categories and price_dates by publication
  const roomCategories = (hotel.room_categories ?? []).filter((rc) =>
    isPublicationActive(rc, today),
  );
  const priceDates = (hotel.price_dates ?? []).filter((pd) =>
    isPublicationActive(pd, today),
  );
  const roomPrices = hotel.room_prices ?? [];
  const occupancies = (hotel.room_occupancies ?? [])
    .map((r) => r.occupancies_id)
    .filter(Boolean);
  const rooms = groupPrices(
    roomCategories,
    priceDates,
    roomPrices,
    occupancies,
    LOCALE_TO_ISO,
    {
      lang,
      marginPct: activeSettings.marginPct,
      unit: activeSettings.unit,
    },
  );

  // Surcharges → price_options — filter by publication status and date range
  const price_options = (hotel.surcharges ?? [])
    .filter((s) => isPublicationActive(s, today))
    .map((s) => {
      const descMap = buildTranslationsMap(
        s.translations,
        (t) => t.surcharge_description ?? null,
      );
      const buy = s.buy_price ? parseFloat(s.buy_price) : null;
      const marginPct = activeSettings.marginPct;
      const sell = s.sell_price ?? null;
      return {
        id: s.id,
        description: pickFromMap(descMap, lang),
        buy,
        sell,
        margin: marginPct ?? null,
      };
    });

  return {
    type: "hotel",
    id: hotel.id,
    name: hotel.name,
    season: hotel.season?.season ?? null,
    object_id: hotel.object_id ?? null,
    object_info: hotel.object_info ?? null,
    internal_remarks: hotel.internal_remarks ?? null,
    status_primarix: hotel.status_primarix ?? null,
    date_created: ensureUtcSuffix(hotel.date_created),
    date_updated: ensureUtcSuffix(hotel.date_updated),
    user_created: hotel.user_created
      ? {
          id: hotel.user_created.id ?? null,
          first_name: hotel.user_created.first_name ?? null,
          last_name: hotel.user_created.last_name ?? null,
        }
      : null,
    user_updated: hotel.user_updated
      ? {
          id: hotel.user_updated.id ?? null,
          first_name: hotel.user_updated.first_name ?? null,
          last_name: hotel.user_updated.last_name ?? null,
        }
      : null,
    partner_type: hotel.partner_type ?? null,
    hotel_group: hotel.hotel_group
      ? { id: hotel.hotel_group.id, label: hotel.hotel_group.label }
      : null,
    address: {
      street: hotel.street ?? null,
      street_number: hotel.street_number ?? null,
      zip_code: hotel.zip_code ?? null,
      town: getGeoName(hotel.place, lang),
      state: getGeoName(hotel.state, lang),
      region: getGeoName(hotel.region, lang),
      country: getGeoName(hotel.country, lang),
      location_tour32: getGeoName(hotel.location_tour32, lang),
    },
    contact: {
      phone_general: hotel.phone_general ?? null,
      phone_ah: hotel.phone_ah ?? null,
      email_general: hotel.email_general ?? null,
      website: hotel.website ?? null,
    },
    partner_filter_ids: (hotel.partner ?? [])
      .map((p) => {
        const n = parseInt(p.partner_id?.primarix_id, 10);
        return isNaN(n) ? null : n;
      })
      .filter((n) => n !== null),
    supplier: {
      type: SUPPLIER_TYPE_MAP[hotel.booking_partner] ?? null,
      id_tour_user: hotel.id_tour_user ?? null,
      haupt_id_tour_user: hotel.haupt_id_tour_user ?? null,
      booking_partner: hotel.booking?.booking_partner ?? null,
      booking_email: hotel.booking_email ?? null,
      booking_info: hotel.booking_info ?? null,
    },
    accommodation_type:
      hotel.accommodation_type?.[0]?.accommodation_types_id?.label ?? null,
    classification: hotel.hotel_classification?.label ?? null,
    activities: (hotel.hotel_activities ?? [])
      .map((a) => a.activities_id)
      .filter(Boolean)
      .map((a) => ({ id: a.id, label: a.label })),
    translations,
    rooms,
    price_options,
    specials,
    image_badge: {
      status: hotel.image_badge_status ?? null,
      start_date: hotel.image_badge_start_date ?? null,
      end_date: hotel.image_badge_end_date ?? null,
      translations: badgeTranslations,
    },
    pictures: buildImageUrls(hotel.media, lang),
  };
}
