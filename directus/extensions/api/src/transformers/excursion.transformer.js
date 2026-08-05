import { LOCALE_TO_ISO } from "../maps/language-code.map.js";
import { ensureUtcSuffix } from "../utils/timestamps.js";
import { groupPrices2 } from "../utils/grouping.js";
import { buildImageUrls } from "../utils/images.js";
import { toExchangeRateObject } from "../utils/prices.js";
import { toSupplementaryBlocks, extractSpecialsDescription } from "../utils/supplementary.js";
import { assembleResponse } from "../shared/response/assembleResponse.js";
import { getGroupOrder } from "../shared/response/groupOrder.js";
import { buildDenylist } from "../shared/response/denylist.js";

const EXCURSION_GROUP_ORDER = ["main"];
const EXCURSION_DENYLIST = buildDenylist("excursion");

const CONSUMED_SOURCE_KEYS = [
  "id",
  "object_id",
  "status_primarix",
  "internal_remarks",
  "internal_remarks_reservation",
  "date_created",
  "date_updated",
  "user_created",
  "user_updated",
  "season",
  "operator_direct",
  "operator_linked",
  "name_operator",
  "object_info_primarix",
  "sell_prices_status",
  "sell_prices_updated_at",
  "street",
  "street_number",
  "postcode",
  "place",
  "state",
  "country",
  "location_tour32",
  "phone_general",
  "phone_after_hours",
  "email_general",
  "website",
  "booking_channel",
  "email_booking",
  "booking_partner",
  "partner_selected",
  "id_service_provider_tour32",
  "id_main_service_provider_tour32",
  "supplier_product_code",
  "price_subline",
  "participants_min",
  "participants_max",
  "children_free_number",
  "children_free_age",
  "week_min_before_start",
  "mobility_advice_text",
  "destination",
  "travel_categories",
  "countries",
  "travel_routes",
  "departure_times",
  "descriptions_translations",
  "price_infos_translations",
  "image_badge_translations",
  "dates_translations",
  "specials_translations",
  "price_calculation_translations",
  "surcharges_translations",
  "categories",
  "price_periods",
  "prices",
  "price_categories",
  "surcharges",
  "image_badge_status",
  "image_badge_start_date",
  "image_badge_end_date",
  "media",
  "surcharges_items",
];

function getLocaleCode(translationsId) {
  return typeof translationsId === "object"
    ? translationsId?.code
    : translationsId;
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

function getGeoName(geo, lang) {
  if (!geo) return null;
  const map = buildTranslationsMap(geo.translations, (t) => t.name ?? null);
  return pickFromMap(map, lang);
}

// Format a legacy free-text/JSON weekday frequency into a readable label. The m2m
// (trips_frequencies) path is handled by shapeFrequency; this handles old data.
function formatFrequencyName(freq) {
  if (!freq) return null;
  let parsed = freq;
  if (typeof freq === "string") {
    try {
      parsed = JSON.parse(freq);
    } catch (e) {
      return freq;
    }
  }
  if (typeof parsed !== "object" || parsed === null) return String(parsed);
  const days = [];
  if (parsed.monday) days.push("Monday");
  if (parsed.tuesday) days.push("Tuesday");
  if (parsed.wednesday) days.push("Wednesday");
  if (parsed.thursday) days.push("Thursday");
  if (parsed.friday) days.push("Friday");
  if (parsed.saturday) days.push("Saturday");
  if (parsed.sunday) days.push("Sunday");
  return days.length > 0 ? days.join(", ") : null;
}

function buildPriceSettingsMap(priceCalcRows) {
  const map = {};
  for (const row of priceCalcRows ?? []) {
    const locale = getLocaleCode(row.translations_id);
    const iso = LOCALE_TO_ISO[locale];
    if (!iso) continue;
    map[iso] = {
      marginPct: row.margin_percentage ?? null,
      buyPriceType: row.buy_price_type ?? null,
      sellPriceType: row.sell_price_type ?? null,
      percentageType: row.percentage_type ?? null,
      provisionPercentage: row.provision_percentage ?? null,
      exchangeRate: row.exchange_rate ?? null,
      fromPrice: row.from_price ?? null,
    };
  }
  return map;
}

function buildSurchargesCalculationMap(surchargesCalculationRows) {
  const map = {};
  for (const row of surchargesCalculationRows ?? []) {
    const locale = getLocaleCode(row.translations_id);
    const iso = LOCALE_TO_ISO[locale];
    if (!iso) continue;
    map[iso] = {
      marginPct: row.surcharge_margin_percentage ?? null,
      percentageType: row.surcharge_percentage_type ?? null,
      provisionPercentage: row.surcharge_provision_percentage ?? null,
      exchangeRate: row.surcharge_exchange_rate ?? null,
    };
  }
  return map;
}

function shapeCountries(rows, idKey, lang) {
  if (!rows) return null;
  return rows
    .map((r) => r[idKey])
    .filter(Boolean)
    .map((c) => ({ id: c.id, name: getGeoName(c, lang), code: c.ISO ?? null }));
}

// excursions has no `departures` column. The real o2m alias is `departure_times` →
// excursions_dates (available_from/available_to). Free-text schedules are exposed via the
// top-level `dates_translations.departures_text`. Maps each date into the contract's
// ExcursionDate shape. Frequency comes from the excursions_dates m2m `departure_frequencies`
// → trips_frequencies; departure/arrival places come from the first travel route.
function shapeExcursionDates(departureTimes, shapeFrequency, departurePlace, arrivalPlace) {
  if (!departureTimes) return null;
  return departureTimes
    .map((d) => {
      return {
        available_from: d.available_from ?? null,
        available_to: d.available_to ?? null,
        frequency: d.departure_frequencies
          ? shapeFrequency?.(d.departure_frequencies) ?? null
          : null,
        departure_place: departurePlace ?? null,
        arrival_place: arrivalPlace ?? null,
      };
    })
    .filter(Boolean);
}

export function shapeExcursionListItem(excursion, lang) {
  const descMap = buildTranslationsMap(
    excursion.descriptions_translations,
    (t) => ({
      name_excursion: t.name_excursion ?? null,
    }),
  );
  const name_excursion = pickFromMap(descMap, lang)?.name_excursion ?? null;

  return {
    id: excursion.id,
    object_id: excursion.object_id ?? null,
    name: name_excursion ?? excursion.name ?? null,
    geo: {
      country: excursion.country
        ? {
            id: excursion.country.id,
            name: getGeoName(excursion.country, lang) ?? null,
            code: excursion.country.ISO ?? null,
          }
        : null,
      destination: excursion.destination
        ? {
            id: excursion.destination.id,
            name: getGeoName(excursion.destination, lang) ?? null,
            code: excursion.destination.media_code ?? null,
          }
        : null,
    },
    thumbnail: (() => {
      const u = buildImageUrls(excursion.media, lang)?.[0]?.url;
      return u ? `${u}?width=400&height=300&fit=cover` : null;
    })(),
    publishing_status: excursion.status_primarix ?? null,
    date_updated: ensureUtcSuffix(excursion.date_updated),
  };
}

export function shapeExcursionDetail(excursion, lang) {
  const descMap = buildTranslationsMap(
    excursion.descriptions_translations,
    (t) => ({
      name_excursion: t.name_excursion ?? null,
      subline: t.subline ?? null,
      teaser: t.teaser ?? null,
      excursion_programme_disclaimer: t.excursion_programme_disclaimer ?? null,
      excursion_programme: t.excursion_programme ?? null,
      recommendations: t.recommendations ?? null,
      description_supplementary: t.description_supplementary ?? null,
    }),
  );

  const infoMap = buildTranslationsMap(
    excursion.price_infos_translations,
    (t) => ({
      services_included: t.services_included ?? null,
      services_not_included: t.services_not_included ?? null,
      deviating_cancellation_terms: t.deviating_cancellation_terms ?? null,
      children_policy: t.children_policy ?? null,
      participants_text: t.participants_text ?? null,
      additional_information: t.additional_information ?? null,
      price_info_supplementary: t.price_info_supplementary ?? null,
    }),
  );

  const datesTranslationsMap = buildTranslationsMap(
    excursion.dates_translations,
    (t) => ({
      departures_text: t.departures_text ?? null,
    }),
  );

  const specialsMap = buildTranslationsMap(
    excursion.specials_translations,
    (t) => ({
      specials: t.specials ?? [],
    }),
  );

  const badgeMap = buildTranslationsMap(
    excursion.image_badge_translations,
    (t) => ({
      image_badge_teaser: t.image_badge_teaser ?? null,
      image_badge_details: t.image_badge_details ?? null,
    }),
  );

  const translations = pickFromMap(descMap, lang);
  const price_info_translations = pickFromMap(infoMap, lang);
  const dates_translations = pickFromMap(datesTranslationsMap, lang);
  const specials_translations = pickFromMap(specialsMap, lang);

  const priceSettingsMap = buildPriceSettingsMap(
    excursion.price_calculation_translations,
  );
  const activePriceSettings =
    lang && priceSettingsMap[lang]
      ? priceSettingsMap[lang]
      : (Object.values(priceSettingsMap)[0] ?? null);

  const surchargeSettingsMap = buildSurchargesCalculationMap(
    excursion.surcharges_translations,
  );
  const activeSurchargeSettings =
    lang && surchargeSettingsMap[lang]
      ? surchargeSettingsMap[lang]
      : (Object.values(surchargeSettingsMap)[0] ?? {});

  const shapeFrequency = (freq) => {
    if (!freq) return null;
    if (Array.isArray(freq)) {
      const refs = freq
        .map((row) => row?.trips_frequencies_id ?? row ?? null)
        .filter(Boolean)
        .map((first) =>
          first.name ? { id: first.id ?? null, name: first.name } : null,
        )
        .filter(Boolean);
      return refs.length > 0 ? refs : null;
    }
    const parsed = formatFrequencyName(freq);
    return parsed ? [{ id: null, name: parsed }] : null;
  };

  const shapeRoutePlace = (place) =>
    place ? { id: place.id ?? null, name: getGeoName(place, lang) ?? null, code: null } : null;

  let parsedRoutes = [];
  if (typeof excursion.travel_routes === "string") {
    try {
      parsedRoutes = JSON.parse(excursion.travel_routes);
    } catch (e) {}
  } else if (Array.isArray(excursion.travel_routes)) {
    parsedRoutes = excursion.travel_routes;
  }
  const firstRoute = parsedRoutes?.[0] || {};
  const departurePlace = shapeRoutePlace(firstRoute.tour_departure);
  const arrivalPlace = shapeRoutePlace(firstRoute.tour_arrival);

  const departure_dates = shapeExcursionDates(
    excursion.departure_times,
    shapeFrequency,
    departurePlace,
    arrivalPlace,
  );

  const categories = excursion.categories
    ? groupPrices2(
        excursion.categories,
        excursion.price_periods ?? [],
        excursion.prices ?? [],
        (excursion.price_categories ?? [])
          .map((pc) => {
            if (!pc.price_category) return null;
            const transList = pc.price_category.translations ?? [];
            const trans =
              transList.find(
                (x) =>
                  x.languages_code === lang || x.translations_id?.code === lang,
              ) || transList[0];
            return {
              ...pc.price_category,
              value: pc.id,
              name: trans?.name ?? pc.price_category.name ?? null,
            };
          })
          .filter(Boolean),
        LOCALE_TO_ISO,
        {
          categoryIdKey: "excursions_category_id",
          dateIdKey: "price_period_id",
          occupancyIdKey: "excursions_price_category_id",
          dateStartKey: "price_period_start",
          dateEndKey: "price_period_end",
          dateFromKey: "price_period_from",
          translationsKey: "excursions_prices_translations",
        },
        (cat) => {
          const catType = cat.excursion_category_type;
          const catMap = buildTranslationsMap(cat.translations, (t) => ({
            text: t.category_text ?? null,
            original: t.category_original ?? null,
          }));
          const catTrans = pickFromMap(catMap, lang);
          return {
            type: catType ? { id: catType.id, name: catType.name } : null,
            text: catTrans?.text ?? null,
            original: catTrans?.original ?? null,
            supplier_code: cat.category_supplier_code ?? null,
            from: !!cat.category_from,
          };
        },
        {
          lang,
          marginPct: activePriceSettings?.marginPct ?? null,
          occupancyOutputKey: "price_category",
        },
      )
    : null;

  const surcharges = excursion.surcharges
    ? excursion.surcharges.map((s) => {
        const translationsMap = buildTranslationsMap(s.translations, (t) => ({
          booking_name: t.surcharge_booking_name ?? null,
          description: t.surcharge_description ?? null,
          sell_price: t.sell_price ?? null,
        }));
        const active = pickFromMap(translationsMap, lang) ?? {};
        return {
          booking_name: active.booking_name ?? null,
          description: active.description ?? null,
          sell: active.sell_price ? parseFloat(active.sell_price) : null,
      type: s.surcharge_type
        ? {
            id: s.surcharge_type.id,
            name: s.surcharge_type.designation ?? null,
          }
        : null,
      calculation_method: s.calculation_method
        ? {
            id: s.calculation_method.id,
            name: s.calculation_method.designation ?? null,
          }
        : null,
      buy: s.buy_price ? parseFloat(s.buy_price) : null,
      margin:
        activeSurchargeSettings.marginPct !== undefined &&
        activeSurchargeSettings.marginPct !== null
          ? parseFloat(activeSurchargeSettings.marginPct)
          : null,
    };
    })
    : null;


  const fieldDefs = [
    { key: "id", group: "main", value: excursion.id },
    { key: "object_id", group: "main", value: excursion.object_id ?? null },
    {
      key: "publishing_status",
      group: "main",
      value: excursion.status_primarix ?? null,
    },
    {
      key: "date_updated",
      group: "main",
      value: ensureUtcSuffix(excursion.date_updated),
    },
    {
      key: "season",
      group: "main",
      value: excursion.season
        ? { id: excursion.season.id, name: excursion.season.season }
        : null,
    },
    { key: "name", group: "main", value: translations?.name_excursion ?? excursion.name ?? null },
    {
      key: "operator",
      group: "main",
      value: {
        operator_direct: excursion.operator_direct ?? null,
        operator_linked: excursion.operator_linked
          ? {
              id: excursion.operator_linked.id,
              name: excursion.operator_linked.name_agency ?? null,
            }
          : null,
        name_operator: excursion.name_operator ?? null,
        street: excursion.street ?? null,
        street_number: excursion.street_number ?? null,
        postcode: excursion.postcode ?? null,
        place: excursion.place
          ? {
              id: excursion.place.id,
              name: getGeoName(excursion.place, lang) ?? null,
              code: null,
            }
          : null,
        state: excursion.state
          ? {
              id: excursion.state.id,
              name: getGeoName(excursion.state, lang) ?? null,
              code: excursion.state.ISO ?? null,
            }
          : null,
        country: excursion.country
          ? {
              id: excursion.country.id,
              name: getGeoName(excursion.country, lang) ?? null,
              code: excursion.country.ISO ?? null,
            }
          : null,
        location_tour32: excursion.location_tour32
          ? {
              id: excursion.location_tour32.id,
              // locations_tour32 has no translations relation — fall back to the raw name
              name: getGeoName(excursion.location_tour32, lang) ?? excursion.location_tour32.name ?? null,
            }
          : null,
        phone_general: excursion.phone_general ?? null,
        phone_after_hours: excursion.phone_after_hours ?? null,
        email_general: excursion.email_general ?? null,
        website: excursion.website ?? null,
      },
    },
    {
      key: "classification",
      group: "main",
      value: {
        destination: excursion.destination
          ? {
              id: excursion.destination.id,
              name: getGeoName(excursion.destination, lang) ?? null,
              code: excursion.destination.media_code ?? null,
            }
          : null,
        countries: shapeCountries(excursion.countries, "countries_id", lang),
        travel_categories: excursion.travel_categories
          ? excursion.travel_categories
              .map((t) => t.travel_categories_id)
              .filter(Boolean)
              .map((t) => ({ id: t.id, name: t.name }))
          : null,
      },
    },
    {
      key: "descriptions",
      group: "main",
      value: {
        subline: translations?.subline ?? null,
        teaser: translations?.teaser ?? null,
        programme_disclaimer:
          translations?.excursion_programme_disclaimer ?? null,
        programme: translations?.excursion_programme ?? null,
        recommendations: translations?.recommendations ?? null,
        supplementary: toSupplementaryBlocks(
          translations?.description_supplementary,
        ),
        descriptions_markdown: null,
      },
    },
    {
      key: "price_info",
      group: "main",
      value: {
        services_included: price_info_translations?.services_included ?? null,
        services_not_included:
          price_info_translations?.services_not_included ?? null,
        additional_information:
          price_info_translations?.additional_information ?? null,
        deviating_cancellation_terms:
          price_info_translations?.deviating_cancellation_terms ?? null,
        children_policy: price_info_translations?.children_policy ?? null,
        participants_text: price_info_translations?.participants_text ?? null,
        mobility_advice: excursion.mobility_advice_text?.id
          ? {
              id: excursion.mobility_advice_text.id,
              name: pickFromMap(
                buildTranslationsMap(
                  excursion.mobility_advice_text.hotel_translations,
                  (t) => t.hotel_mobility_advice_text ?? null,
                ),
                lang,
              ),
            }
          : null,
        supplementary: toSupplementaryBlocks(
          price_info_translations?.price_info_supplementary,
        ),
        price_info_markdown: null,
      },
    },
    {
      key: "attributes",
      group: "main",
      value: {
        children_free_age:
          excursion.children_free_age !== undefined &&
          excursion.children_free_age !== null
            ? Number(excursion.children_free_age)
            : null,
        children_free_number:
          excursion.children_free_number !== undefined &&
          excursion.children_free_number !== null
            ? Number(excursion.children_free_number)
            : null,
        participants_min:
          excursion.participants_min !== undefined &&
          excursion.participants_min !== null
            ? Number(excursion.participants_min)
            : null,
        participants_max:
          excursion.participants_max !== undefined &&
          excursion.participants_max !== null
            ? Number(excursion.participants_max)
            : null,
        week_min_before_start:
          excursion.week_min_before_start !== undefined &&
          excursion.week_min_before_start !== null
            ? Number(excursion.week_min_before_start)
            : null,
      },
    },
    {
      key: "dates",
      group: "main",
      value: {
        departures_text: dates_translations?.departures_text ?? null,
        dates: departure_dates,
      },
    },
    { key: "categories", group: "main", value: categories },
    { key: "surcharges", group: "main", value: surcharges },
    {
      key: "specials",
      group: "main",
      value: {
        special_description: specials_translations?.specials != null
          ? extractSpecialsDescription(specials_translations.specials)
          : null,
      },
    },
    {
      key: "image_badge",
      group: "main",
      value: excursion.image_badge_status
        ? {
            teaser: badgeMap?.[lang]?.image_badge_teaser ?? null,
            details: badgeMap?.[lang]?.image_badge_details ?? null,
            start_date: excursion.image_badge_start_date ?? null,
            end_date: excursion.image_badge_end_date ?? null,
            status: excursion.image_badge_status ?? null,
          }
        : null,
    },
    {
      key: "media",
      group: "main",
      value: buildImageUrls(excursion.media, lang),
    },
    {
      key: "booking",
      group: "main",
      value: {
        booking_channel: excursion.booking_channel ?? null,
        booking_partner: excursion.booking_partner
          ? {
              id: excursion.booking_partner.id ?? null,
              name: excursion.booking_partner.name_agency ?? null,
            }
          : null,
        service_provider_id_tour32:
          excursion.id_service_provider_tour32 ?? null,
        main_service_provider_id_tour32:
          excursion.id_main_service_provider_tour32 ?? null,
        res_phone: excursion.booking_partner?.phone_reservation ?? null,
        res_email2: excursion.booking_partner?.email_reservation ?? null,
        email_booking: excursion.email_booking ?? null,
        contact_title: excursion.booking_partner?.contact_title ?? null,
        contact_greeting: excursion.booking_partner?.contact_greeting ?? null,
        contact_firstname:
          excursion.booking_partner?.contact_first_name ?? null,
        contact_name: excursion.booking_partner?.contact_name ?? null,
        internal_remarks_reservation:
          excursion.internal_remarks_reservation ?? null,
      },
    },
    {
      key: "pricing_config",
      group: "main",
      value: {
        buy_price_type: activePriceSettings?.buyPriceType ?? null,
        sell_price_type: activePriceSettings?.sellPriceType ?? null,
        percentage_type: activePriceSettings?.percentageType ?? null,
        provision_percentage:
          activePriceSettings?.provisionPercentage !== undefined &&
          activePriceSettings?.provisionPercentage !== null
            ? Number(activePriceSettings.provisionPercentage)
            : null,
        margin_percentage:
          activePriceSettings?.marginPct !== undefined &&
          activePriceSettings?.marginPct !== null
            ? Number(activePriceSettings.marginPct)
            : null,
        exchange_rate: toExchangeRateObject(
          activePriceSettings?.exchangeRate,
        ),
        from_price:
          activePriceSettings?.fromPrice !== undefined &&
          activePriceSettings?.fromPrice !== null
            ? Number(activePriceSettings.fromPrice)
            : null,
        surcharge_percentage_type:
          activeSurchargeSettings.percentageType ?? null,
        surcharge_provision_percentage:
          activeSurchargeSettings.provisionPercentage !== undefined &&
          activeSurchargeSettings.provisionPercentage !== null
            ? Number(activeSurchargeSettings.provisionPercentage)
            : null,
        surcharge_margin_percentage:
          activeSurchargeSettings.marginPct !== undefined &&
          activeSurchargeSettings.marginPct !== null
            ? Number(activeSurchargeSettings.marginPct)
            : null,
        surcharge_exchange_rate: toExchangeRateObject(
          activeSurchargeSettings.exchangeRate,
        ),
      },
    },
    {
      key: "internal",
      group: "main",
      value: {
        object_info_primarix: excursion.object_info_primarix ?? null,
        internal_remarks: excursion.internal_remarks ?? null,
        price_subline: excursion.price_subline ?? null,
        supplier_product_code: excursion.supplier_product_code ?? null,
        sell_prices_status: excursion.sell_prices_status ?? null,
        sell_prices_updated_at: ensureUtcSuffix(
          excursion.sell_prices_updated_at,
        ),
      },
    },
  ];

  return assembleResponse({
    fieldDefs,
    groupOrder: EXCURSION_GROUP_ORDER,
    rawItem: excursion,
    consumedSourceKeys: CONSUMED_SOURCE_KEYS,
    denylist: EXCURSION_DENYLIST,
  });
}
