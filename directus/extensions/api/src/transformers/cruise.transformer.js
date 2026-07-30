import { CRUISES_STRIP_FIELDS } from "../maps/cruises.strip-fields.js";
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

function stripFields(obj, fields) {
  for (const f of fields) delete obj[f];
}

export function shapeCruiseListItem(cruise, lang) {
  const descMap = buildTranslationsMap(cruise.descriptions_translations, (t) => ({
    headline: t.headline ?? null,
    subline: t.subline ?? null,
    teaser: t.teaser ?? null,
  }));
  const filteredTranslations = lang ? (descMap[lang] ? { [lang]: descMap[lang] } : {}) : descMap;

  const shaped = {
    type: "cruise",
    id: cruise.id,
    object_id: cruise.object_id ?? null,
    status: cruise.status_primarix ?? null,
    date_created: ensureUtcSuffix(cruise.date_created),
    date_updated: ensureUtcSuffix(cruise.date_updated),
    translations: filteredTranslations,
    headline: pickFromMap(descMap, lang)?.headline ?? null,
    destinations: (cruise.destinations ?? []).map((d) => d.destinations_id).filter(Boolean).map((d) => ({ id: d.id })),
    countries: (cruise.countries ?? []).map((c) => c.countries_id).filter(Boolean).map((c) => ({ id: c.id })),
  };

  stripFields(shaped, CRUISES_STRIP_FIELDS);
  return shaped;
}

export function shapeCruiseDetail(cruise, lang) {
  const descMap = buildTranslationsMap(cruise.descriptions_translations, (t) => ({
    headline: t.headline ?? null,
    subline: t.subline ?? null,
    teaser: t.teaser ?? null,
    ship: t.ship ?? null,
    at_a_glance: t.at_a_glance ?? null,
  }));

  const programmeMap = buildTranslationsMap(cruise.programme_translations, (t) => ({
    programme: t.programme ?? null,
  }));

  const infoMap = buildTranslationsMap(cruise.price_infos_translations, (t) => ({
    name_cruise: t.name_cruise ?? null,
    departure_arrival: t.departure_arrival ?? null,
    bord_languages: t.bord_languages ?? null,
    bord_languages_additions: t.bord_languages_additions ?? null,
    // NOTE: free-text field, not a structured surcharges relation — cruises has no
    // surcharges collection (confirmed against directus-dev schema).
    surcharges_text: t.surcharges ?? null,
    services_included: t.services_included ?? null,
    services_not_included: t.services_not_included ?? null,
    onboard_gratuities: t.onboard_gratuities ?? null,
    onboard_gratuities_additions: t.onboard_gratuities_additions ?? null,
    important_information: t.important_information ?? null,
    good_to_know: t.good_to_know ?? null,
    occupancy_single: t.occupancy_single ?? null,
    deviating_cancellation_terms: t.deviating_cancellation_terms ?? null,
    deviating_cancellation_terms_additions: t.deviating_cancellation_terms_additions ?? null,
    mobility_advice_text: t.mobility_advice_text ?? null,
  }));

  const specialsMap = buildTranslationsMap(cruise.specials_translations, (t) => ({
    special_description: t.special_description ?? null,
  }));

  const badgeMap = buildTranslationsMap(cruise.image_badge_translations, (t) => ({
    image_badge_teaser: t.image_badge_teaser ?? null,
    image_badge_details: t.image_badge_details ?? null,
  }));

  const translations = lang ? (descMap[lang] ? { [lang]: descMap[lang] } : {}) : descMap;
  const programme_translations = lang ? (programmeMap[lang] ? { [lang]: programmeMap[lang] } : {}) : programmeMap;
  const price_info_translations = lang ? (infoMap[lang] ? { [lang]: infoMap[lang] } : {}) : infoMap;
  const specials_translations = lang ? (specialsMap[lang] ? { [lang]: specialsMap[lang] } : {}) : specialsMap;

  // price_calculation is a per-market pricing-settings row (structurally like hotels'
  // hotel_prices) — margin/exchange config, separate from the actual per-cabin/date/
  // occupancy price cells, which DO exist in cruises_prices (fetched separately, see
  // `categories` below, grouped the same way as tours/excursions via groupPrices2).
  const priceCalc = cruise.price_calculation?.[0] ?? null;
  const sellByLang = {};
  for (const t of priceCalc?.translations ?? []) {
    const code = t.translations_id?.code ?? t.translations_id;
    // Unmapped locales (e.g. de-CH) are intentionally excluded, not passed through.
    const iso = LOCALE_TO_ISO[code];
    if (!iso) continue;
    sellByLang[iso] = t.sell_price ?? null;
  }
  const from_price = priceCalc?.from_price ?? (lang ? (sellByLang[lang] ?? null) : (Object.values(sellByLang)[0] ?? null));

  const cabin_categories = (cruise.cabin_categories ?? []).map((cc) => {
    const catMap = buildTranslationsMap(cc.translations, (t) => ({
      cabin_category_additions: t.cabin_category_additions ?? null,
      cabin_category_description: t.cabin_category_description ?? null,
    }));
    return {
      id: cc.id,
      name: cc.cabin_category?.name ?? null,
      booking_code: cc.cabin_category_booking_code ?? null,
      tour32_name: cc.cabin_category_tour32_name ?? null,
      from: cc.cabin_category_from ?? null,
      translations: lang ? (catMap[lang] ? { [lang]: catMap[lang] } : {}) : catMap,
    };
  });

  const price_dates = (cruise.price_dates ?? []).map((pd) => ({
    id: pd.id,
    date_departure: pd.date_departure ?? null,
    date_arrival: pd.date_arrival ?? null,
    frequencies: (pd.departure_frequencies ?? []).map((f) => f.cruises_frequencies_id?.name).filter(Boolean),
  }));

  const occupancies = (cruise.occupancies ?? []).map((o) => ({
    id: o.id,
    name: o.occupancy?.name ?? null,
    from: o.occupancy_from ?? null,
  }));

  // Categories/prices grouped via the generic groupPrices2 helper (same pattern as
  // tours/excursions). cruises_prices only stores buy_price — no sell_price/translations
  // junction is wired for cruises yet, so `sell` is always null here (honest degradation,
  // same as tours' pricing gap).
  const categories = groupPrices2(
    cruise.cabin_categories ?? [],
    cruise.price_dates ?? [],
    cruise.prices ?? [],
    (cruise.occupancies ?? []).map((o) => o.occupancy).filter(Boolean),
    LOCALE_TO_ISO,
    {
      categoryIdKey: 'cabin_category',
      dateIdKey: 'price_date',
      occupancyIdKey: 'occupancy',
      dateStartKey: 'date_departure',
      dateEndKey: 'date_arrival',
      // no translationsKey — no sell price source exists
    },
    (cc) => ({
      id: cc.id,
      category: cc.cabin_category?.name ?? null,
      booking_code: cc.cabin_category_booking_code ?? null,
      from: cc.cabin_category_from ?? null,
    }),
    { lang },
  );

  return {
    type: "cruise",
    id: cruise.id,
    object_id: cruise.object_id ?? null,
    object_info: cruise.object_info_primarix ?? null,
    status: cruise.status_primarix ?? null,
    date_created: ensureUtcSuffix(cruise.date_created),
    date_updated: ensureUtcSuffix(cruise.date_updated),
    user_created: cruise.user_created
      ? { id: cruise.user_created.id ?? null, first_name: cruise.user_created.first_name ?? null, last_name: cruise.user_created.last_name ?? null }
      : null,
    user_updated: cruise.user_updated
      ? { id: cruise.user_updated.id ?? null, first_name: cruise.user_updated.first_name ?? null, last_name: cruise.user_updated.last_name ?? null }
      : null,
    season: cruise.season?.season ?? null,
    travel_id_karawane: cruise.travel_id_karawane ?? null,
    id_tour32: cruise.id_tour32 ?? null,
    real_url: cruise.real_url ?? null,
    participants_min: cruise.participants_min ?? null,
    participants_max: cruise.participants_max ?? null,
    week_min_before_start: cruise.week_min_before_start ?? null,
    special_valid_from: cruise.special_valid_from ?? null,
    special_valid_to: cruise.special_valid_to ?? null,
    cruise_types: (cruise.cruise_types ?? []).map((t) => t.cruise_types_id).filter(Boolean),
    destinations: (cruise.destinations ?? []).map((d) => d.destinations_id).filter(Boolean),
    countries: (cruise.countries ?? []).map((c) => c.countries_id).filter(Boolean),
    partner_filter_ids: (cruise.partner_selected ?? [])
      .map((p) => {
        const n = parseInt(p.partner_id?.primarix_id, 10);
        return isNaN(n) ? null : n;
      })
      .filter((n) => n !== null),
    translations,
    programme_translations,
    price_info_translations,
    specials_translations,
    cabin_categories,
    price_dates,
    occupancies,
    categories,
    from_price,
    price_settings: priceCalc
      ? {
          buy_price_type: priceCalc.buy_price_type ?? null,
          sell_price_type: priceCalc.sell_price_type ?? null,
          percentage_type: priceCalc.percentage_type ?? null,
          provision_percentage: priceCalc.provision_percentage ?? null,
          margin_percentage: priceCalc.margin_percentage ?? null,
        }
      : null,
    image_badge: {
      status: cruise.image_badge_status ?? null,
      start_date: cruise.image_badge_start_date ?? null,
      end_date: cruise.image_badge_end_date ?? null,
      translations: lang ? (badgeMap[lang] ? { [lang]: badgeMap[lang] } : {}) : badgeMap,
    },
    pictures: buildImageUrls(cruise.media, lang),
  };
}
