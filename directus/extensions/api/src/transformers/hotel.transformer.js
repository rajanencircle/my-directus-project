import { HOTEL_STRIP_FIELDS } from '../maps/hotel.strip-fields.js';
import { LOCALE_TO_ISO } from '../maps/language-code.map.js';
import { ensureUtcSuffix } from '../utils/timestamps.js';
import { groupPrices } from '../utils/prices.js';
import { buildImageUrls } from '../utils/images.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getLocaleCode(translationsId) {
  return typeof translationsId === 'object' ? translationsId?.code : translationsId;
}

function buildTranslationsMap(rows, pickFields) {
  const map = {};
  for (const row of (rows ?? [])) {
    const locale = getLocaleCode(row.translations_id);
    const iso = LOCALE_TO_ISO[locale] ?? locale;
    if (!iso) continue;
    map[iso] = pickFields(row);
  }
  return map;
}

function pickFromMap(translationsMap, lang) {
  if (!translationsMap || Object.keys(translationsMap).length === 0) return null;
  if (lang && translationsMap[lang]) return translationsMap[lang];
  const firstKey = Object.keys(translationsMap)[0];
  return translationsMap[firstKey] ?? null;
}

function shapeGeo(geo) {
  if (!geo) return null;
  const transMap = buildTranslationsMap(geo.translations, t => ({ name: t.name ?? null }));
  return {
    id: geo.id,
    ...(geo.ISO !== undefined && { iso: geo.ISO }),
    ...(geo.id_primarix !== undefined && { id_primarix: geo.id_primarix }),
    ...(geo.location_tour32 !== undefined && { location_tour32: geo.location_tour32 }),
    translations: transMap,
  };
}

function getGeoName(geo, lang) {
  if (!geo) return null;
  const map = buildTranslationsMap(geo.translations, t => t.name ?? null);
  return pickFromMap(map, lang);
}

function stripFields(obj, fields) {
  for (const f of fields) {
    delete obj[f];
  }
}

const SUPPLIER_TYPE_MAP = {
  direct_booking: 'Independent',
  partner_booking: 'Partner',
};

/**
 * Builds a per-language map of { marginPct, unit } from hotel_prices rows.
 */
function buildPriceSettingsMap(hotelPricesRows) {
  const map = {};
  for (const row of (hotelPricesRows ?? [])) {
    const locale = getLocaleCode(row.translations_id);
    const iso = LOCALE_TO_ISO[locale] ?? locale;
    if (!iso) continue;
    map[iso] = {
      marginPct: row.margin_percentage ?? null,
      unit: row.buy_price_type === 'per_person' ? 'person' : (row.buy_price_type === 'per_unit' ? 'unit' : null),
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
    t => ({
      teaser: t.teaser ?? null,
      description_short: t.description_short ?? null,
    }),
  );

  const shaped = {
    type: 'hotel',
    id: hotel.id,
    name: hotel.name,
    object_id: hotel.object_id ?? null,
    status: hotel.status_primarix ?? null,
    date_created: ensureUtcSuffix(hotel.date_created),
    date_updated: ensureUtcSuffix(hotel.date_updated),
    translations: descTranslationsMap,
    description: pickFromMap(descTranslationsMap, lang),
    country: shapeGeo(hotel.country),
    state: shapeGeo(hotel.state),
    region: shapeGeo(hotel.region),
    place: shapeGeo(hotel.place),
    hotel_classification: hotel.hotel_classification
      ? { id: hotel.hotel_classification.id, label: hotel.hotel_classification.label }
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
  const descMap = buildTranslationsMap(hotel.hotel_descriptions_translations, t => ({
    introduction: t.teaser ?? null,
    description_main: t.description_short ?? null,
    description_location: t.subline_location ?? null,
    description_rooms: t.description_rooms ?? null,
  }));

  const infoMap = buildTranslationsMap(hotel.price_info_translations, t => ({
    included_services: t.services_included ?? null,
    not_included: t.services_not_included ?? null,
    mobility_advice: t.mobility_advice_text ?? null,
  }));

  const allLangs = new Set([...Object.keys(descMap), ...Object.keys(infoMap)]);
  const translations = {};
  for (const iso of allLangs) {
    translations[iso] = { ...(descMap[iso] ?? {}), ...(infoMap[iso] ?? {}) };
  }

  // Per-language price settings (margin, buy entity)
  const priceSettingsMap = buildPriceSettingsMap(hotel.hotel_prices);
  const activeSettings = (lang && priceSettingsMap[lang])
    ? priceSettingsMap[lang]
    : (Object.values(priceSettingsMap)[0] ?? { marginPct: null, unit: null });

  // Image badge translations
  const badgeTranslations = buildTranslationsMap(hotel.image_badge_translations, t => ({
    teaser: t.image_badge_teaser ?? null,
    detail: t.image_badge_details ?? null,
  }));

  // Rooms with new shape
  const roomCategories = hotel.room_categories ?? [];
  const priceDates = hotel.price_dates ?? [];
  const roomPrices = hotel.room_prices ?? [];
  const occupancies = (hotel.room_occupancies ?? []).map(r => r.occupancies_id).filter(Boolean);
  const rooms = groupPrices(roomCategories, priceDates, roomPrices, occupancies, LOCALE_TO_ISO, {
    lang,
    marginPct: activeSettings.marginPct,
    unit: activeSettings.unit,
  });

  // Surcharges → price_options
  const price_options = (hotel.surcharges ?? []).map(s => {
    const descMap = buildTranslationsMap(s.translations, t => t.surcharge_description ?? null);
    const buy = s.buy_price ?? null;
    const marginPct = activeSettings.marginPct;
    const sell = (buy !== null && marginPct !== null)
      ? Math.round(buy * (1 - marginPct / 100))
      : null;
    return {
      id: s.id,
      description: pickFromMap(descMap, lang),
      buy,
      sell,
      margin: marginPct ?? null,
    };
  });

  return {
    id: hotel.id,
    object_id: hotel.object_id ?? null,
    type: 'hotel',
    status: hotel.status_primarix ?? null,
    date_created: ensureUtcSuffix(hotel.date_created),
    date_updated: ensureUtcSuffix(hotel.date_updated),
    name: hotel.name,
    classification: hotel.hotel_classification?.label ?? null,
    accommodation_type: hotel.accommodation_type?.[0]?.accommodation_types_id?.label ?? null,
    supplier: {
      type: SUPPLIER_TYPE_MAP[hotel.booking_partner] ?? null,
      id_tour_user: hotel.id_tour_user ?? null,
      haupt_id_tour_user: hotel.haupt_id_tour_user ?? null,
      booking_partner: hotel.booking?.booking_partner ?? null,
    },
    partner_filter_ids: (hotel.partner ?? [])
      .map(p => {
        const n = parseInt(p.partner_id?.primarix_id, 10);
        return isNaN(n) ? null : n;
      })
      .filter(n => n !== null),
    address: {
      street: hotel.street ?? null,
      street_number: hotel.street_number ?? null,
      zip_code: hotel.zip_code ?? null,
      town: getGeoName(hotel.place, lang),
      state: getGeoName(hotel.state, lang),
      state_code: hotel.state?.ISO ?? null,
      region: getGeoName(hotel.region, lang),
      country: getGeoName(hotel.country, lang),
      country_code: hotel.country?.ISO ?? null,
      geo: null,
    },
    contact: {
      phone: hotel.phone_general ?? null,
      phone_emergency: hotel.phone_ah ?? null,
      email: hotel.email_general ?? null,
      website: hotel.website ?? null,
    },
    translations,
    rooms,
    price_options,
    image_badge: {
      status: hotel.image_badge_status ?? null,
      start_date: hotel.image_badge_start_date ?? null,
      end_date: hotel.image_badge_end_date ?? null,
      translations: badgeTranslations,
    },
    activities: (hotel.hotel_activities ?? [])
      .map(a => a.activities_id)
      .filter(Boolean)
      .map(a => ({ id: a.id, label: a.label })),
    pictures: buildImageUrls(hotel.media),
  };
}
