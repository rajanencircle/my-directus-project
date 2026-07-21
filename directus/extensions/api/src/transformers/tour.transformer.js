import { TOURS_STRIP_FIELDS } from "../maps/tours.strip-fields.js";
import { LOCALE_TO_ISO } from "../maps/language-code.map.js";
import { ensureUtcSuffix } from "../utils/timestamps.js";
import { groupPrices2 } from "../utils/grouping.js";
import { buildImageUrls } from "../utils/images.js";

function getLocaleCode(translationsId) {
  return typeof translationsId === "object" ? translationsId?.code : translationsId;
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
  if (!translationsMap || Object.keys(translationsMap).length === 0) return null;
  if (lang && translationsMap[lang]) return translationsMap[lang];
  const firstKey = Object.keys(translationsMap)[0];
  return translationsMap[firstKey] ?? null;
}

function shapeGeo(geo, lang) {
  if (!geo) return null;
  const transMap = buildTranslationsMap(geo.translations, (t) => ({ name: t.name ?? null }));
  const filteredTransMap = lang ? (transMap[lang] ? { [lang]: transMap[lang] } : {}) : transMap;
  return {
    id: geo.id,
    ...(geo.ISO !== undefined && { iso: geo.ISO }),
    ...(geo.id_primarix !== undefined && { id_primarix: geo.id_primarix }),
    translations: filteredTransMap,
  };
}

function getGeoName(geo, lang) {
  if (!geo) return null;
  const map = buildTranslationsMap(geo.translations, (t) => t.name ?? null);
  return pickFromMap(map, lang);
}

function stripFields(obj, fields) {
  for (const f of fields) delete obj[f];
}

export function shapeTourListItem(tour, lang) {
  const descMap = buildTranslationsMap(tour.descriptions_translations, (t) => ({
    teaser: t.teaser ?? null,
    subline: t.subline ?? null,
  }));
  const filteredTranslations = lang ? (descMap[lang] ? { [lang]: descMap[lang] } : {}) : descMap;

  const shaped = {
    type: "tour",
    id: tour.id,
    name: tour.name,
    object_id: tour.object_id ?? null,
    status: tour.status_primarix ?? null,
    date_created: ensureUtcSuffix(tour.date_created),
    date_updated: ensureUtcSuffix(tour.date_updated),
    translations: filteredTranslations,
    description: pickFromMap(descMap, lang),
    country: shapeGeo(tour.country, lang),
    state: shapeGeo(tour.state, lang),
    place: shapeGeo(tour.place, lang),
    location_tour32: shapeGeo(tour.location_tour32, lang),
  };

  stripFields(shaped, TOURS_STRIP_FIELDS);
  return shaped;
}

export function shapeTourDetail(tour, lang) {
  const descMap = buildTranslationsMap(tour.descriptions_translations, (t) => ({
    name_tour: t.name_tour ?? null,
    subline: t.subline ?? null,
    teaser: t.teaser ?? null,
    at_a_glance: t.at_a_glance ?? null,
    from_to: t.from_to ?? null,
    flights_recommended: t.flights_recommended ?? null,
    additional_recommendations: t.additional_recommendations ?? null,
    description_supplementary: t.description_supplementary ?? null,
  }));

  const infoMap = buildTranslationsMap(tour.price_info_translations, (t) => ({
    services_included: t.services_included ?? null,
    services_not_included: t.services_not_included ?? null,
    services_optional: t.services_optional ?? null,
    service_highlights: t.service_highlights ?? null,
    deviating_cancellation_terms: t.deviating_cancellation_terms ?? null,
    important_information: t.important_information ?? null,
    departure: t.departure ?? null,
    children_policy: t.children_policy ?? null,
    participants_text: t.participants_text ?? null,
    price_info_supplementary: t.price_info_supplementary ?? null,
  }));

  const programmeMap = buildTranslationsMap(tour.programme_translations, (t) => ({
    tour_programme_disclaimer: t.tour_programme_disclaimer ?? null,
    tour_programme: t.tour_programme ?? null,
  }));

  const badgeMap = buildTranslationsMap(tour.image_badge_translations, (t) => ({
    image_badge_teaser: t.image_badge_teaser ?? null,
    image_badge_details: t.image_badge_details ?? null,
  }));

  const translations = lang ? (descMap[lang] ? { [lang]: descMap[lang] } : {}) : descMap;
  const price_info_translations = lang ? (infoMap[lang] ? { [lang]: infoMap[lang] } : {}) : infoMap;
  const programme_translations = lang ? (programmeMap[lang] ? { [lang]: programmeMap[lang] } : {}) : programmeMap;

  // Categories/prices grouped via the generic groupPrices2 helper.
  // NOTE: tours_prices only stores buy_price — no sell_price/translations junction is wired
  // for tours yet (confirmed against directus-dev schema), so `sell` is always null here.
  // This mirrors the vehicles pricing gap: honest degradation, not fabricated data.
  const categories = groupPrices2(
    tour.categories ?? [],
    tour.price_periods ?? [],
    tour.prices ?? [],
    (tour.occupancies ?? []).map((o) => o.occupancy).filter(Boolean),
    LOCALE_TO_ISO,
    {
      categoryIdKey: 'tours_category_id',
      dateIdKey: 'price_period_id',
      occupancyIdKey: 'occupancy_id',
      dateStartKey: 'price_period_start',
      dateEndKey: 'price_period_end',
      // no translationsKey — no sell price source exists
    },
    (cat) => ({
      category: cat.tour_category_type?.name ?? null,
      booking_code: cat.category_supplier_code ?? null,
      from: cat.category_from ?? null,
    }),
    { lang },
  );

  const surcharges = (tour.surcharges ?? []).map((s) => {
    const translationsMap = buildTranslationsMap(s.translations, (t) => ({
      description: t.surcharge_description ?? null,
    }));
    const active = pickFromMap(translationsMap, lang) ?? {};
    return {
      id: s.id,
      booking_name: s.surcharge_booking_name ?? null,
      type: s.surcharge_type?.designation ?? null,
      calculation_method: s.calculation_method?.designation ?? null,
      description: active.description ?? null,
      translations: lang ? (translationsMap[lang] ? { [lang]: translationsMap[lang] } : {}) : translationsMap,
    };
  });

  return {
    type: "tour",
    id: tour.id,
    name: tour.name,
    object_id: tour.object_id ?? null,
    status: tour.status ?? null,
    status_primarix: tour.status_primarix ?? null,
    internal_remarks: tour.internal_remarks ?? null,
    date_created: ensureUtcSuffix(tour.date_created),
    date_updated: ensureUtcSuffix(tour.date_updated),
    user_created: tour.user_created
      ? { id: tour.user_created.id ?? null, first_name: tour.user_created.first_name ?? null, last_name: tour.user_created.last_name ?? null }
      : null,
    user_updated: tour.user_updated
      ? { id: tour.user_updated.id ?? null, first_name: tour.user_updated.first_name ?? null, last_name: tour.user_updated.last_name ?? null }
      : null,
    season: tour.season ?? null,
    operator: {
      direct: tour.operator_direct ?? null,
      name: tour.name_operator ?? null,
    },
    address: {
      street: tour.street ?? null,
      street_number: tour.street_number ?? null,
      postcode: tour.postcode ?? null,
      place: getGeoName(tour.place, lang),
      state: getGeoName(tour.state, lang),
      country: getGeoName(tour.country, lang),
      location_tour32: getGeoName(tour.location_tour32, lang),
    },
    contact: {
      phone_general: tour.phone_general ?? null,
      phone_after_hours: tour.phone_after_hours ?? null,
      email_general: tour.email_general ?? null,
      website: tour.website ?? null,
    },
    booking: {
      channel: tour.booking_channel ?? null,
      email_booking: tour.email_booking ?? null,
      service_provider_id_tour32: tour.service_provider_id_tour32 ?? null,
      main_service_provider_id_tour32: tour.main_service_provider_id_tour32 ?? null,
    },
    supplier_product_code: tour.supplier_product_code ?? null,
    price_subline: tour.price_subline ?? null,
    participants_min: tour.participants_min ?? null,
    participants_max: tour.participants_max ?? null,
    max_children_free: tour.children_free_number ?? null,
    max_children_free_age: tour.children_free_age ?? null,
    week_min_before_start: tour.week_min_before_start ?? null,
    mobility_advice_text: tour.mobility_advice_text?.id ?? null,
    flight_service: tour.flight_service ? { id: tour.flight_service.id, label: tour.flight_service.name } : null,
    airlines: tour.airlines ? { id: tour.airlines.id, label: tour.airlines.name } : null,
    routes: tour.routes ?? null,
    travel_categories: (tour.travel_categories ?? []).map((t) => t.travel_categories_id).filter(Boolean),
    accommodation_types: (tour.accommodation_types ?? []).map((a) => a.accommodation_types_id).filter(Boolean),
    departure_airports: (tour.departure_airports ?? []).map((a) => a.airports_id).filter(Boolean),
    destinations: (tour.destinations ?? []).map((d) => d.destinations_id).filter(Boolean).map((d) => ({ id: d.id, name: getGeoName(d, lang) })),
    countries: (tour.countries ?? []).map((c) => c.countries_id).filter(Boolean).map((c) => ({ id: c.id, name: getGeoName(c, lang) })),
    partner_filter_ids: (tour.partner_selected ?? [])
      .map((p) => {
        const n = parseInt(p.partner_id?.primarix_id, 10);
        return isNaN(n) ? null : n;
      })
      .filter((n) => n !== null),
    translations,
    price_info_translations,
    programme_translations,
    categories,
    surcharges,
    // Computed sell-price-derived from_price is not available — tours' pricing schema
    // currently only stores buy_price (no sell_price wired). See categories[].prices note above.
    from_price: null,
    image_badge: {
      status: tour.image_badge_status ?? null,
      start_date: tour.image_badge_start_date ?? null,
      end_date: tour.image_badge_end_date ?? null,
      translations: lang ? (badgeMap[lang] ? { [lang]: badgeMap[lang] } : {}) : badgeMap,
    },
    pictures: buildImageUrls(tour.media, lang),
  };
}
