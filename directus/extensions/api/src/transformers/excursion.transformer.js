import { EXCURSIONS_STRIP_FIELDS } from "../maps/excursions.strip-fields.js";
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
    // Unmapped locales (e.g. de-CH) are intentionally excluded, not passed through.
    const iso = LOCALE_TO_ISO[locale];
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

// Builds a per-language map of { marginPct, unit, fromPrice, buyPriceType, sellPriceType,
// percentageType, provisionPercentage } from excursions_price_calculation_translations rows.
// Mirrors hotels' buildPriceSettingsMap (hotel.transformer.js) — same from_price FK-resolution
// pattern (M2O to excursions_prices → excursions_prices_translations per language).
function buildPriceSettingsMap(priceCalcRows) {
  const map = {};
  for (const row of priceCalcRows ?? []) {
    const locale = getLocaleCode(row.translations_id);
    // Unmapped locales (e.g. de-CH) are intentionally excluded, not passed through.
    const iso = LOCALE_TO_ISO[locale];
    if (!iso) continue;

    let fromPrice = null;
    for (const t of row.from_price?.excursions_prices_translations ?? []) {
      const tLocale = getLocaleCode(t.translations_id);
      const tIso = LOCALE_TO_ISO[tLocale];
      if (tIso === iso) {
        fromPrice = t.sell_price ?? null;
        break;
      }
    }

    map[iso] = {
      marginPct: row.margin_percentage ?? null,
      buyPriceType: row.buy_price_type ?? null,
      sellPriceType: row.sell_price_type ?? null,
      percentageType: row.percentage_type ?? null,
      provisionPercentage: row.provision_percentage ?? null,
      fromPrice,
    };
  }
  return map;
}

// Publication filter rules — same as hotels' isPublicationActive.
function isPublicationActive(item, today) {
  if (item.status === "unpublished") return false;
  const start = item.publish_start ? item.publish_start.slice(0, 10) : null;
  const end = item.publish_end ? item.publish_end.slice(0, 10) : null;
  if (end && today > end) return false;
  if (start && today < start) return false;
  return true;
}

export function shapeExcursionListItem(excursion, lang) {
  const descMap = buildTranslationsMap(excursion.descriptions_translations, (t) => ({
    name_excursion: t.name_excursion ?? null,
    teaser: t.teaser ?? null,
    subline: t.subline ?? null,
  }));
  const filteredTranslations = lang ? (descMap[lang] ? { [lang]: descMap[lang] } : {}) : descMap;

  const shaped = {
    type: "excursion",
    id: excursion.id,
    // excursions has no top-level `name` field — the display name only exists
    // per-language on descriptions_translations.name_excursion.
    name: pickFromMap(descMap, lang)?.name_excursion ?? null,
    object_id: excursion.object_id ?? null,
    status: excursion.status_primarix ?? null,
    date_created: ensureUtcSuffix(excursion.date_created),
    date_updated: ensureUtcSuffix(excursion.date_updated),
    translations: filteredTranslations,
    description: pickFromMap(descMap, lang),
    country: shapeGeo(excursion.country, lang),
    state: shapeGeo(excursion.state, lang),
    place: shapeGeo(excursion.place, lang),
    destination: excursion.destination ? { id: excursion.destination.id, name: getGeoName(excursion.destination, lang) } : null,
  };

  stripFields(shaped, EXCURSIONS_STRIP_FIELDS);
  return shaped;
}

export function shapeExcursionDetail(excursion, lang) {
  const descMap = buildTranslationsMap(excursion.descriptions_translations, (t) => ({
    name_excursion: t.name_excursion ?? null,
    subline: t.subline ?? null,
    teaser: t.teaser ?? null,
    excursion_programme_disclaimer: t.excursion_programme_disclaimer ?? null,
    excursion_programme: t.excursion_programme ?? null,
    recommendations: t.recommendations ?? null,
    // Per-language mobility advice text field was removed from
    // excursions_descriptions_translations; the top-level `mobility_advice_text`
    // m2o (global MAT record id) is the only source for excursions now.
    description_supplementary: t.description_supplementary ?? null,
  }));

  const infoMap = buildTranslationsMap(excursion.price_infos_translations, (t) => ({
    services_included: t.services_included ?? null,
    services_not_included: t.services_not_included ?? null,
    deviating_cancellation_terms: t.deviating_cancellation_terms ?? null,
    children_policy: t.children_policy ?? null,
    participants_text: t.participants_text ?? null,
    additional_information: t.additional_information ?? null,
    price_info_supplementary: t.price_info_supplementary ?? null,
  }));

  const badgeMap = buildTranslationsMap(excursion.image_badge_translations, (t) => ({
    image_badge_teaser: t.image_badge_teaser ?? null,
    image_badge_details: t.image_badge_details ?? null,
  }));

  const datesTextMap = buildTranslationsMap(excursion.dates_translations, (t) => ({
    departures_text: t.departures_text ?? null,
  }));

  const specialsMap = buildTranslationsMap(excursion.specials_translations, (t) => ({
    specials: t.specials ?? [],
  }));

  const priceSettingsMap = buildPriceSettingsMap(excursion.price_calculation_translations);
  const activePriceSettings =
    lang && priceSettingsMap[lang]
      ? priceSettingsMap[lang]
      : (Object.values(priceSettingsMap)[0] ?? null);

  const departure_dates = (excursion.departure_times ?? []).map((d) => ({
    id: d.id,
    available_from: d.available_from ?? null,
    available_to: d.available_to ?? null,
    frequencies: (d.departure_frequencies ?? []).map((f) => f.trips_frequencies_id?.name).filter(Boolean),
  }));

  const routes = (excursion.travel_routes ?? []).map((r) => ({
    id: r.id,
    departure: getGeoName(r.tour_departure, lang),
    arrival: getGeoName(r.tour_arrival, lang),
  }));

  const translations = lang ? (descMap[lang] ? { [lang]: descMap[lang] } : {}) : descMap;
  const price_info_translations = lang ? (infoMap[lang] ? { [lang]: infoMap[lang] } : {}) : infoMap;
  const dates_translations = lang ? (datesTextMap[lang] ? { [lang]: datesTextMap[lang] } : {}) : datesTextMap;
  const specials_translations = lang ? (specialsMap[lang] ? { [lang]: specialsMap[lang] } : {}) : specialsMap;

  // Categories/prices grouped via the generic groupPrices2 helper.
  // Unlike tours, excursions_prices HAS a per-language sell price junction
  // (excursions_prices_translations), so `sell` is populated here.
  const categories = groupPrices2(
    excursion.categories ?? [],
    excursion.price_periods ?? [],
    excursion.prices ?? [],
    (excursion.price_categories ?? []).map((pc) => pc.price_category).filter(Boolean),
    LOCALE_TO_ISO,
    {
      categoryIdKey: 'excursions_category_id',
      dateIdKey: 'price_period_id',
      occupancyIdKey: 'excursions_price_category_id',
      translationsKey: 'excursions_prices_translations',
      dateStartKey: 'price_period_start',
      dateEndKey: 'price_period_end',
    },
    (cat) => {
      const categoryTypeNameMap = buildTranslationsMap(cat.excursion_category_type?.translations, (t) => t.name ?? null);
      const categoryTextMap = buildTranslationsMap(cat.translations, (t) => ({
        category_text: t.category_text ?? null,
        category_original: t.category_original ?? null,
      }));
      return {
        category: cat.excursion_category_type?.name ?? null,
        category_translations: lang ? (categoryTypeNameMap[lang] ? { [lang]: categoryTypeNameMap[lang] } : {}) : categoryTypeNameMap,
        booking_code: cat.category_supplier_code ?? null,
        from: cat.category_from ?? null,
        text: lang ? (categoryTextMap[lang] ? { [lang]: categoryTextMap[lang] } : {}) : categoryTextMap,
      };
    },
    { lang },
  );

  const today = new Date().toISOString().slice(0, 10);
  const surcharges = (excursion.surcharges ?? [])
    .filter((s) => isPublicationActive(s, today))
    .map((s) => {
      const translationsMap = buildTranslationsMap(s.translations, (t) => ({
        booking_name: t.surcharge_booking_name ?? null,
        description: t.surcharge_description ?? null,
        sell_price: t.sell_price ?? null,
      }));
      const active = pickFromMap(translationsMap, lang) ?? {};
      return {
        id: s.id,
        name: s.name ?? null,
        buy: s.buy_price ? parseFloat(s.buy_price) : null,
        sell: active.sell_price ?? null,
        booking_name: active.booking_name ?? null,
        description: active.description ?? null,
        type: s.surcharge_type?.designation ?? null,
        calculation_method: s.calculation_method?.designation ?? null,
        translations: lang ? (translationsMap[lang] ? { [lang]: translationsMap[lang] } : {}) : translationsMap,
      };
    });

  // from_price: prefer the authoritative value stored on price_calculation_translations
  // (resolved via its from_price FK → excursions_prices → excursions_prices_translations).
  // Falls back to the lowest sell price across all category/date/occupancy cells if that
  // hasn't been computed/set yet.
  const allSells = categories.flatMap((c) => c.prices.flatMap((p) => Object.values(p.occupancies).map((o) => o.sell))).filter((v) => v !== null && v !== undefined);
  const from_price = activePriceSettings?.fromPrice ?? (allSells.length ? Math.min(...allSells) : null);

  return {
    type: "excursion",
    id: excursion.id,
    // excursions has no top-level `name` field — the display name only exists
    // per-language on descriptions_translations.name_excursion.
    name: pickFromMap(descMap, lang)?.name_excursion ?? null,
    object_id: excursion.object_id ?? null,
    status: excursion.status_primarix ?? null,
    internal_remarks: excursion.internal_remarks ?? null,
    date_created: ensureUtcSuffix(excursion.date_created),
    date_updated: ensureUtcSuffix(excursion.date_updated),
    user_created: excursion.user_created
      ? { id: excursion.user_created.id ?? null, first_name: excursion.user_created.first_name ?? null, last_name: excursion.user_created.last_name ?? null }
      : null,
    user_updated: excursion.user_updated
      ? { id: excursion.user_updated.id ?? null, first_name: excursion.user_updated.first_name ?? null, last_name: excursion.user_updated.last_name ?? null }
      : null,
    season: excursion.season?.season ?? null,
    operator: {
      direct: excursion.operator_direct ?? null,
      name: excursion.name_operator ?? null,
    },
    address: {
      street: excursion.street ?? null,
      street_number: excursion.street_number ?? null,
      postcode: excursion.postcode ?? null,
      place: getGeoName(excursion.place, lang),
      state: getGeoName(excursion.state, lang),
      country: getGeoName(excursion.country, lang),
      country_code: excursion.country?.ISO ?? null,
      // Extra field beyond the reference shape:
      location_tour32: getGeoName(excursion.location_tour32, lang),
    },
    contact: {
      phone_general: excursion.phone_general ?? null,
      phone_after_hours: excursion.phone_after_hours ?? null,
      email_general: excursion.email_general ?? null,
      website: excursion.website ?? null,
    },
    booking: {
      channel: excursion.booking_channel ?? null,
      email_booking: excursion.email_booking ?? null,
      // Reservation contact details now live on the linked booking-partner
      // agency record (agencies collection) rather than as flat columns here.
      res_phone: excursion.booking_partner?.phone_reservation ?? null,
      res_email2: excursion.booking_partner?.email_reservation ?? null,
      contact_title: excursion.booking_partner?.contact_title ?? null,
      contact_greeting: excursion.booking_partner?.contact_greeting ?? null,
      contact_firstname: excursion.booking_partner?.contact_first_name ?? null,
      contact_name: excursion.booking_partner?.contact_name ?? null,
      id_service_provider_tour32: excursion.id_service_provider_tour32 ?? null,
      id_main_service_provider_tour32: excursion.id_main_service_provider_tour32 ?? null,
    },
    supplier_product_code: excursion.supplier_product_code ?? null,
    price_subline: excursion.price_subline ?? null,
    participants_min: excursion.participants_min ?? null,
    participants_max: excursion.participants_max ?? null,
    max_children_free: excursion.children_free_number ?? null,
    max_children_free_age: excursion.children_free_age ?? null,
    week_min_before_start: excursion.week_min_before_start ?? null,
    mobility_advice_text: excursion.mobility_advice_text?.id ?? null,
    destination: excursion.destination ? { id: excursion.destination.id, name: getGeoName(excursion.destination, lang) } : null,
    travel_categories: (excursion.travel_categories ?? []).map((t) => t.travel_categories_id).filter(Boolean),
    countries: (excursion.countries ?? []).map((c) => c.countries_id).filter(Boolean).map((c) => ({ id: c.id, name: getGeoName(c, lang) })),
    partner_filter_ids: (excursion.partner_selected ?? [])
      .map((p) => {
        const n = parseInt(p.partner_id?.primarix_id, 10);
        return isNaN(n) ? null : n;
      })
      .filter((n) => n !== null),
    routes,
    departure_dates,
    translations,
    price_info_translations,
    dates_translations,
    specials_translations,
    categories,
    surcharges,
    from_price,
    price_settings: activePriceSettings
      ? {
          buy_price_type: activePriceSettings.buyPriceType,
          sell_price_type: activePriceSettings.sellPriceType,
          percentage_type: activePriceSettings.percentageType,
          provision_percentage: activePriceSettings.provisionPercentage,
          margin_percentage: activePriceSettings.marginPct,
        }
      : null,
    image_badge: {
      status: excursion.image_badge_status ?? null,
      start_date: excursion.image_badge_start_date ?? null,
      end_date: excursion.image_badge_end_date ?? null,
      translations: lang ? (badgeMap[lang] ? { [lang]: badgeMap[lang] } : {}) : badgeMap,
    },
    pictures: buildImageUrls(excursion.media, lang),
  };
}
