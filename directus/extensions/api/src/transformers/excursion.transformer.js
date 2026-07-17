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
    teaser: t.teaser ?? null,
    subline: t.subline ?? null,
  }));
  const filteredTranslations = lang ? (descMap[lang] ? { [lang]: descMap[lang] } : {}) : descMap;

  const shaped = {
    type: "excursion",
    id: excursion.id,
    name: excursion.name,
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
    mobility_advice_text: t.mobility_advice_text ?? null,
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

  const translations = lang ? (descMap[lang] ? { [lang]: descMap[lang] } : {}) : descMap;
  const price_info_translations = lang ? (infoMap[lang] ? { [lang]: infoMap[lang] } : {}) : infoMap;

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
    (cat) => ({
      category: cat.excursion_category_type?.designation ?? null,
      booking_code: cat.category_supplier_code ?? null,
      from: cat.category_from ?? null,
    }),
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

  // from_price computed as the lowest sell price across all category/date/occupancy cells.
  const allSells = categories.flatMap((c) => c.prices.flatMap((p) => Object.values(p.occupancies).map((o) => o.sell))).filter((v) => v !== null && v !== undefined);
  const from_price = allSells.length ? Math.min(...allSells) : null;

  return {
    type: "excursion",
    id: excursion.id,
    name: excursion.name,
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
    season: excursion.season ?? null,
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
      res_phone: excursion.res_phone ?? null,
      res_email2: excursion.res_email2 ?? null,
      contact_title: excursion.contact_title ?? null,
      contact_greeting: excursion.contact_greeting ?? null,
      contact_firstname: excursion.contact_firstname ?? null,
      contact_name: excursion.contact_name ?? null,
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
    translations,
    price_info_translations,
    categories,
    surcharges,
    from_price,
    image_badge: {
      status: excursion.image_badge_status ?? null,
      start_date: excursion.image_badge_start_date ?? null,
      end_date: excursion.image_badge_end_date ?? null,
      translations: lang ? (badgeMap[lang] ? { [lang]: badgeMap[lang] } : {}) : badgeMap,
    },
    pictures: buildImageUrls(excursion.media, lang),
  };
}
