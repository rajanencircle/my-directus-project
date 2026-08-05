import { LOCALE_TO_ISO } from "../maps/language-code.map.js";
import { ensureUtcSuffix } from "../utils/timestamps.js";
import { groupPrices2 } from "../utils/grouping.js";
import { toExchangeRateObject } from "../utils/prices.js";
import { buildImageUrls } from "../utils/images.js";
import { extractSpecialsDescription } from "../utils/supplementary.js";
import { assembleResponse } from "../shared/response/assembleResponse.js";
import { getGroupOrder } from "../shared/response/groupOrder.js";
import { buildDenylist } from "../shared/response/denylist.js";

const CRUISE_GROUP_ORDER = ["main"];
const CRUISE_DENYLIST = buildDenylist("cruise");

const CONSUMED_SOURCE_KEYS = [
  "id", "object_id", "status_primarix", "date_created", "date_updated",
  "travel_id_karawane", "id_tour32", "real_url",
  "participants_min", "participants_max", "week_min_before_start",
  "special_valid_from", "special_valid_to", "partner_visibility",
  "cruise_types", "countries", "destinations", "partner_selected",
  "descriptions_translations", "programme_translations", "price_infos_translations",
  "specials_translations", "image_badge_translations",
  "cabin_categories", "price_dates", "prices", "occupancies",
  "image_badge_status", "image_badge_start_date", "image_badge_end_date",
  "media", "user_created", "user_updated", "season", "object_info_primarix",
  "price_calculation", "sell_prices_status", "sell_prices_updated_at",
];

function getLocaleCode(translationsId) {
  return typeof translationsId === "object" ? translationsId?.code : translationsId;
}

function buildTranslationsMap(rows, pickFields) {
  const map = {};
  for (const row of rows ?? []) {
    const locale = getLocaleCode(row.translations_id);
    const iso = LOCALE_TO_ISO[locale];
    if (!iso) continue;
    map[iso] = pickFields(row);
  }
  return map;
}

function pickFromMap(translationsMap, lang) {
  if (!translationsMap || Object.keys(translationsMap).length === 0)
    return null;
  if (lang && translationsMap[lang]) return translationsMap[lang];
  return null;
}

function shapeDestinations(rows, idKey, lang) {
  return (rows ?? [])
    .map((r) => r[idKey])
    .filter(Boolean)
    .map((d) => {
      const nameMap = buildTranslationsMap(d.translations, (t) => t.name ?? null);
      return { id: d.id, name: pickFromMap(nameMap, lang), code: d.media_code ?? null };
    });
}

function shapeCountries(rows, idKey, lang) {
  return (rows ?? [])
    .map((r) => r[idKey])
    .filter(Boolean)
    .map((c) => {
      const nameMap = buildTranslationsMap(c.translations, (t) => t.name ?? null);
      return { id: c.id, name: pickFromMap(nameMap, lang), code: c.ISO ?? null };
    });
}

export function shapeCruiseListItem(cruise, lang) {
  const descMap = buildTranslationsMap(cruise.descriptions_translations, (t) => ({
    headline: t.headline ?? null,
  }));
  const infoMap = buildTranslationsMap(cruise.price_infos_translations, (t) => ({
    name_cruise: t.name_cruise ?? null,
  }));
  const headline = pickFromMap(descMap, lang)?.headline ?? null;
  const name_cruise = pickFromMap(infoMap, lang)?.name_cruise ?? null;

  return {
    id: cruise.id,
    object_id: cruise.object_id ?? null,
    name: name_cruise,
    title: headline,
    geo: {
      countries: shapeCountries(cruise.countries, "countries_id", lang),
      destinations: shapeDestinations(cruise.destinations, "destinations_id", lang),
    },
    thumbnail: (() => { const u = buildImageUrls(cruise.media, lang)?.[0]?.url; return u ? `${u}?width=400&height=300&fit=cover` : null; })(),
    publishing_status: cruise.status_primarix ?? null,
    date_updated: ensureUtcSuffix(cruise.date_updated),
  };
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
    programme: t.programme ?? [],
  }));
  const programme = pickFromMap(programmeMap, lang);

  const infoMap = buildTranslationsMap(cruise.price_infos_translations, (t) => ({
    name_cruise: t.name_cruise ?? null,
    departure_arrival: t.departure_arrival ?? null,
    bord_languages: t.bord_languages ?? null,
    bord_languages_additions: t.bord_languages_additions ?? null,
    surcharges: t.surcharges ?? null,
    services_included: t.services_included ?? null,
    services_not_included: t.services_not_included ?? null,
    onboard_gratuities: t.onboard_gratuities ?? null,
    onboard_gratuities_additions: t.onboard_gratuities_additions ?? null,
    important_information: t.important_information ?? null,
    good_to_know: t.good_to_know ?? null,
    occupancy_single: t.occupancy_single ?? null,
    deviating_cancellation_terms: t.deviating_cancellation_terms_selector ?? t.deviating_cancellation_terms ?? null,
    deviating_cancellation_terms_additions: t.deviating_cancellation_terms_text ?? t.deviating_cancellation_terms_additions ?? null,
    mobility_advice_text: t.mobility_advice_text ?? null,
    participants_legacy: t.participants_legacy ?? null,
  }));

  const specialsMap = buildTranslationsMap(cruise.specials_translations, (t) => ({
    specials: t.specials ?? null,
  }));

  const badgeMap = buildTranslationsMap(cruise.image_badge_translations, (t) => ({
    image_badge_teaser: t.image_badge_teaser ?? null,
    image_badge_details: t.image_badge_details ?? null,
  }));

  const translations = pickFromMap(descMap, lang);
  const price_info_translations = pickFromMap(infoMap, lang);
  const specials_translations = pickFromMap(specialsMap, lang);

  const priceCalc = cruise.price_calculation?.[0] ?? null;
  const sellByLang = {};
  for (const t of priceCalc?.translations ?? []) {
    const code = t.translations_id?.code ?? t.translations_id;
    const iso = LOCALE_TO_ISO[code];
    if (!iso) continue;
    sellByLang[iso] = t.sell_price ?? null;
  }
  const from_price = priceCalc?.from_price ?? (lang ? (sellByLang[lang] ?? null) : (Object.values(sellByLang)[0] ?? null));

  const cabins = groupPrices2(
    cruise.cabin_categories ?? [],
    cruise.price_dates ?? [],
    cruise.prices ?? [],
    (cruise.occupancies ?? [])
      .map((o) => {
        if (!o.occupancy) return null;
        const occTrans = o.occupancy.translations ?? [];
        const trans =
          occTrans.find(
            (x) =>
              x.languages_code === lang || x.translations_id?.code === lang,
          ) || occTrans[0];
        return {
          ...o.occupancy,
          value: o.id,
          name: trans?.occupancy ?? trans?.name ?? o.occupancy.name ?? null,
        };
      })
      .filter(Boolean),
    LOCALE_TO_ISO,
    {
      categoryIdKey: 'cabin_category',
      dateIdKey: 'price_date',
      occupancyIdKey: 'occupancy',
      dateStartKey: 'date_departure',
      dateEndKey: 'date_arrival',
    },
    (cc) => {
      const catMap = buildTranslationsMap(cc.translations, (t) => ({
        cabin_category_additions: t.cabin_category_additions ?? null,
        cabin_category_description: t.cabin_category_description ?? null,
      }));
      const trans = pickFromMap(catMap, lang);
      return {
        category: cc.cabin_category ? { id: cc.cabin_category.id, name: cc.cabin_category.name } : null,
        additions: trans?.cabin_category_additions ?? null,
        description: trans?.cabin_category_description ?? null,
        booking_code: cc.cabin_category_booking_code ?? null,
        tour32_name: cc.cabin_category_tour32_name ?? null,
        from: !!cc.cabin_category_from,
      };
    },
    {
      lang,
      marginPct: priceCalc?.margin_percentage ?? null,
      unit: priceCalc?.buy_price_type ?? null,
      dateOutputKey: 'sailings',
      occupancyOutputKey: 'occupancy',
      buildDateEntry: (pd) => {
        const frequencies = (pd.departure_frequencies ?? [])
          .map((row) => row?.cruises_frequencies_id ?? null)
          .filter(Boolean)
          .map((cf) => ({ id: cf.id ?? null, name: cf.name ?? null }));
        return {
          date_departure: pd.date_departure ?? null,
          date_arrival: pd.date_arrival ?? null,
          frequency: frequencies.length > 0 ? frequencies : null,
        };
      },
    },
  );

  const fieldDefs = [
    { key: "id", group: "main", value: cruise.id },
    { key: "object_id", group: "main", value: cruise.object_id ?? null },
    { key: "publishing_status", group: "main", value: cruise.status_primarix ?? null },
    { key: "date_updated", group: "main", value: ensureUtcSuffix(cruise.date_updated) },
    { key: "season", group: "main", value: cruise.season ? { id: cruise.season.id, name: cruise.season.season } : null },
    { key: "name", group: "main", value: price_info_translations?.name_cruise ?? null },
    { key: "classification", group: "main", value: {
        countries: shapeCountries(cruise.countries, "countries_id", lang),
        destinations: shapeDestinations(cruise.destinations, "destinations_id", lang),
        cruise_types: (cruise.cruise_types ?? []).map((t) => t.cruise_types_id).filter(Boolean).map(t => ({ id: t.id, name: t.name })),
    } },
    { key: "descriptions", group: "main", value: {
        headline: translations?.headline ?? null,
        subline: translations?.subline ?? null,
        teaser: translations?.teaser ?? null,
        ship: translations?.ship ?? null,
        at_a_glance: translations?.at_a_glance ?? null,
    } },
    { key: "programme", group: "main", value: {
        days: (programme?.programme ?? []).map((d) => ({
          day_destinations: d.day_destinations ?? null,
          day_description: d.day_description ?? null,
          day_accommodation_note: d.day_accommodation_note ?? null,
        })),
    } },
    { key: "price_info", group: "main", value: {
        departure_arrival: price_info_translations?.departure_arrival ?? null,
        // DB stores bord_languages as an array of strings already (['Deutsch', 'Englisch']).
        bord_languages: Array.isArray(price_info_translations?.bord_languages)
          ? price_info_translations.bord_languages
          : price_info_translations?.bord_languages
            ? [price_info_translations.bord_languages]
            : [],
        bord_languages_additions: price_info_translations?.bord_languages_additions ?? null,
        surcharges: price_info_translations?.surcharges ?? null,
        services_included: price_info_translations?.services_included ?? null,
        services_not_included: price_info_translations?.services_not_included ?? null,
        // Contract: array of objects (TBD exact shape). Source is a string[] — wrap each in { text }.
        onboard_gratuities: Array.isArray(price_info_translations?.onboard_gratuities)
          ? price_info_translations.onboard_gratuities.map((g) =>
              typeof g === "string" ? { text: g } : g,
            )
          : [],
        onboard_gratuities_additions: price_info_translations?.onboard_gratuities_additions ?? null,
        important_information: price_info_translations?.important_information ?? null,
        good_to_know: price_info_translations?.good_to_know ?? null,
        occupancy_single: price_info_translations?.occupancy_single ?? null,
        participants_legacy: price_info_translations?.participants_legacy ?? null,
        // Contract: array of objects (TBD exact shape). Source is a string[] of codes — wrap each in { value }.
        deviating_cancellation_terms_select: Array.isArray(price_info_translations?.deviating_cancellation_terms)
          ? price_info_translations.deviating_cancellation_terms.map((t) =>
              typeof t === "string" ? { value: t } : t,
            )
          : [],
        deviating_cancellation_terms_text: price_info_translations?.deviating_cancellation_terms_additions ?? null,
        mobility_advice: price_info_translations?.mobility_advice_text ? { id: null, name: price_info_translations.mobility_advice_text } : null,
    } },
    { key: "attributes", group: "main", value: {
        participants_min: cruise.participants_min !== undefined && cruise.participants_min !== null ? Number(cruise.participants_min) : null,
        participants_max: cruise.participants_max !== undefined && cruise.participants_max !== null ? Number(cruise.participants_max) : null,
        week_min_before_start: cruise.week_min_before_start !== undefined && cruise.week_min_before_start !== null ? Number(cruise.week_min_before_start) : null,
    } },
    { key: "cabin_categories", group: "main", value: cabins },
    { key: "specials", group: "main", value: {
        special_description: specials_translations?.specials != null
          ? extractSpecialsDescription(specials_translations.specials)
          : null,
        valid_from: cruise.special_valid_from ?? null,
        valid_to: cruise.special_valid_to ?? null,
    } },
    { key: "image_badge", group: "main", value: cruise.image_badge_status ? {
        teaser: badgeMap?.[lang]?.image_badge_teaser ?? null,
        details: badgeMap?.[lang]?.image_badge_details ?? null,
        start_date: cruise.image_badge_start_date ?? null,
        end_date: cruise.image_badge_end_date ?? null,
        status: cruise.image_badge_status ?? null,
    } : null },
    { key: "media", group: "main", value: buildImageUrls(cruise.media, lang) },
    { key: "pricing_config", group: "main", value: {
        buy_price_type: priceCalc?.buy_price_type ?? null,
        sell_price_type: priceCalc?.sell_price_type ?? null,
        percentage_type: priceCalc?.percentage_type ?? null,
        provision_percentage: priceCalc?.provision_percentage !== undefined && priceCalc?.provision_percentage !== null ? Number(priceCalc.provision_percentage) : null,
        margin_percentage: priceCalc?.margin_percentage !== undefined && priceCalc?.margin_percentage !== null ? Number(priceCalc.margin_percentage) : null,
        exchange_rate: toExchangeRateObject(priceCalc?.exchange_rate),
        from_price: from_price !== undefined && from_price !== null ? Number(from_price) : null,
    } },
    { key: "internal", group: "main", value: {
        object_info_primarix: cruise.object_info_primarix ?? null,
        travel_id_karawane: cruise.travel_id_karawane ?? null,
        id_tour32: cruise.id_tour32 ?? null,
        real_url: cruise.real_url ?? null,
        sell_prices_status: cruise.sell_prices_status ?? null,
        sell_prices_updated_at: ensureUtcSuffix(cruise.sell_prices_updated_at),
    } },
  ];

  return assembleResponse({
    fieldDefs,
    groupOrder: CRUISE_GROUP_ORDER,
    rawItem: cruise,
    consumedSourceKeys: CONSUMED_SOURCE_KEYS,
    denylist: CRUISE_DENYLIST,
  });
}
