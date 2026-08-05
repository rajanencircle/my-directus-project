import { LOCALE_TO_ISO } from "../maps/language-code.map.js";
import { ensureUtcSuffix } from "../utils/timestamps.js";
import { groupPrices2 } from "../utils/grouping.js";
import { toExchangeRateObject } from "../utils/prices.js";
import { buildImageUrls } from "../utils/images.js";
import { toSupplementaryBlocks, extractSpecialsDescription } from "../utils/supplementary.js";
import { assembleResponse } from "../shared/response/assembleResponse.js";
import { getGroupOrder } from "../shared/response/groupOrder.js";
import { buildDenylist } from "../shared/response/denylist.js";

const TOUR_GROUP_ORDER = ["main"];
const TOUR_DENYLIST = buildDenylist("tour");

const CONSUMED_SOURCE_KEYS = [
  "id",
  "object_id",
  "name_tour",
  "partner",
  "tour_types",
  "activities",
  "sustainability_certifications",
  "departures",
  "tours_prices",
  "status_primarix",
  "status",
  "partner_visibility",
  "date_created",
  "date_updated",
  "descriptions_translations",
  "operator_direct",
  "operator_linked",
  "name_operator",
  "booking_partner",
  "partner_selected",
  "street",
  "street_number",
  "postcode",
  "place",
  "state",
  "country",
  "location_tour32",
  "destinations",
  "countries",
  "phone_general",
  "phone_after_hours",
  "email_general",
  "website",
  "booking_channel",
  "email_booking",
  "service_provider_id_tour32",
  "main_service_provider_id_tour32",
  "supplier_product_code",
  "price_subline",
  "participants_min",
  "participants_max",
  "children_free_number",
  "children_free_age",
  "week_min_before_start",
  "mobility_advice_text",
  "flight_service",
  "airlines",
  "travel_routes",
  "departure_times",
  "dates_translations",
  "travel_categories",
  "accommodation_types",
  "departure_airports",
  "price_info_translations",
  "programme_translations",
  "image_badge_translations",
  "specials_translations",
  "price_calculation_translations",
  "surcharges_calculation_translations",
  "categories",
  "price_periods",
  "prices",
  "occupancies",
  "surcharges",
  "image_badge_status",
  "image_badge_start_date",
  "image_badge_end_date",
  "media",
  "user_created",
  "user_updated",
  "season",
  "internal_remarks",
  "internal_remarks_reservation",
  "sell_prices_status",
  "sell_prices_updated_at",
  "object_info_primarix",
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
  if (translationsMap["de-DE"]) return translationsMap["de-DE"];
  if (translationsMap["en-GB"]) return translationsMap["en-GB"];
  const firstKey = Object.keys(translationsMap)[0];
  return translationsMap[firstKey];
}

function getGeoName(geo, lang) {
  if (!geo) return null;
  const map = buildTranslationsMap(geo.translations, (t) => t.name ?? null);
  return pickFromMap(map, lang);
}

function buildPriceSettingsMap(priceCalculationRows) {
  const map = {};
  for (const row of priceCalculationRows ?? []) {
    const locale = getLocaleCode(row.translations_id);
    const iso = LOCALE_TO_ISO[locale];
    if (!iso) continue;
    map[iso] = {
      marginPct: row.margin_percentage ?? null,
      unit:
        row.buy_price_type === "per_person"
          ? "person"
          : row.buy_price_type === "per_unit"
            ? "unit"
            : null,
      fromPrice: row.from_price ?? null,
      buyPriceType: row.buy_price_type ?? null,
      sellPriceType: row.sell_price_type ?? null,
      percentageType: row.percentage_type ?? null,
      provisionPercentage: row.provision_percentage ?? null,
      exchangeRate: toExchangeRateObject(row.exchange_rate),
    };
  }
  return map;
}

function buildSurchargeSettingsMap(surchargesCalculationRows) {
  const map = {};
  for (const row of surchargesCalculationRows ?? []) {
    const locale = getLocaleCode(row.translations_id);
    const iso = LOCALE_TO_ISO[locale];
    if (!iso) continue;
    map[iso] = {
      marginPct: row.surcharge_margin_percentage ?? null,
      percentageType: row.surcharge_percentage_type ?? null,
      provisionPercentage: row.surcharge_provision_percentage ?? null,
      exchangeRate: toExchangeRateObject(row.surcharge_exchange_rate),
    };
  }
  return map;
}

function shapeDestinations(rows, idKey, lang) {
  if (!rows) return null;
  return rows
    .filter((r) => r && r[idKey])
    .map((r) => {
      const d = r[idKey];
      return {
        id: d.id,
        name: getGeoName(d, lang),
        code: d.media_code ?? null,
      };
    });
}

function shapeCountries(rows, idKey, lang) {
  if (!rows) return null;
  return rows
    .map((r) => r[idKey])
    .filter(Boolean)
    .map((c) => ({ id: c.id, name: getGeoName(c, lang), code: c.ISO ?? null }));
}

export function shapeTourListItem(tour, lang) {
  const descMap = buildTranslationsMap(tour.descriptions_translations, (t) => ({
    name_tour: t.name_tour ?? null,
  }));
  const name_tour = pickFromMap(descMap, lang)?.name_tour ?? null;

  return {
    id: tour.id,
    object_id: tour.object_id ?? null,
    name: name_tour ?? tour.name ?? null,
    geo: {
      countries: shapeCountries(tour.countries, "countries_id", lang),
      destinations: shapeDestinations(
        tour.destinations,
        "destinations_id",
        lang,
      ),
    },
    thumbnail: (() => {
      const u = buildImageUrls(tour.media, lang)?.[0]?.url;
      return u ? `${u}?width=400&height=300&fit=cover` : null;
    })(),
    publishing_status: tour.status_primarix ?? null,
    date_updated: ensureUtcSuffix(tour.date_updated),
  };
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

  const programmeMap = buildTranslationsMap(
    tour.programme_translations,
    (t) => ({
      tour_programme_disclaimer: t.tour_programme_disclaimer ?? null,
      tour_programme: t.tour_programme ?? null,
    }),
  );

  const specialsMap = buildTranslationsMap(tour.specials_translations, (t) => ({
    specials: t.specials ?? null,
  }));

  const badgeMap = buildTranslationsMap(tour.image_badge_translations, (t) => ({
    image_badge_teaser: t.image_badge_teaser ?? null,
    image_badge_details: t.image_badge_details ?? null,
  }));

  const priceSettingsMap = buildPriceSettingsMap(
    tour.price_calculation_translations,
  );
  const activeSettings = pickFromMap(priceSettingsMap, lang) ?? {
    marginPct: null,
    unit: null,
    fromPrice: null,
  };

  const surchargeSettingsMap = buildSurchargeSettingsMap(
    tour.surcharges_calculation_translations,
  );
  const activeSurchargeSettings = pickFromMap(surchargeSettingsMap, lang) ?? {
    marginPct: null,
  };

  const translations = pickFromMap(descMap, lang);
  const price_info_translations = pickFromMap(infoMap, lang);
  const programme_translations = pickFromMap(programmeMap, lang);
  const specials_translations = pickFromMap(specialsMap, lang);

  const formatFrequencyName = (freq) => {
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
  };

  let parsedRoutes = [];
  if (typeof tour.travel_routes === "string") {
    try {
      parsedRoutes = JSON.parse(tour.travel_routes);
    } catch (e) {}
  } else if (Array.isArray(tour.travel_routes)) {
    parsedRoutes = tour.travel_routes;
  }
  const firstRoute = parsedRoutes?.[0] || {};
  const shapeRoutePlace = (place) =>
    place ? { id: place.id ?? null, name: getGeoName(place, lang) ?? null, code: null } : null;
  const tourDeparturePlace =
    shapeRoutePlace(firstRoute.tour_departure) ??
    (firstRoute.from ? { id: null, name: String(firstRoute.from), code: null } : null);
  const tourArrivalPlace =
    shapeRoutePlace(firstRoute.tour_arrival) ??
    (firstRoute.to ? { id: null, name: String(firstRoute.to), code: null } : null);

  // Format a frequency value. The m2m resolves to { trips_frequencies_id: { id, name } };
  // fall back to the legacy free-text/JSON shape for old data. Preserves `formatFrequencyName`
  // for the free-text weekday parser where a plain string/JSON object is present.
  // Emits an array of refs so every selected frequency is surfaced.
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

  const departure_dates = tour.departure_times
    ? tour.departure_times.map((d) => {
        return {
          available_from: d.available_from ?? null,
          available_to: d.available_to ?? null,
          frequency: d.departure_frequencies
            ? shapeFrequency(d.departure_frequencies)
            : null,
          trip_duration: d.trip_duration ?? null,
          departure_place: tourDeparturePlace,
          arrival_place: tourArrivalPlace,
        };
      })
    : null;

  const departuresTextMap = {};
  for (const t of tour.dates_translations ?? []) {
    const locale = getLocaleCode(t.translations_id);
    const iso = LOCALE_TO_ISO[locale];
    if (!iso || departuresTextMap[iso]) continue;
    if (t.departures_text) departuresTextMap[iso] = t.departures_text;
  }
  const departures_text = pickFromMap(departuresTextMap, lang);

  const categories = tour.categories
    ? groupPrices2(
        tour.categories,
        tour.price_periods ?? [],
        tour.prices ?? [],
        (tour.occupancies ?? [])
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
          name: trans?.name ?? o.occupancy.name ?? null,
        };
      })
      .filter(Boolean),
    LOCALE_TO_ISO,
    {
      categoryIdKey: "tours_category_id",
      dateIdKey: "price_period_id",
      occupancyIdKey: "occupancy_id",
      dateStartKey: "price_period_start",
      dateEndKey: "price_period_end",
      dateFromKey: "price_period_from",
    },
    (cat) => {
      const catMap = buildTranslationsMap(cat.translations, (t) => ({
        text: t.category_text ?? null,
        original: t.category_original ?? null,
      }));
      const catTrans = pickFromMap(catMap, lang);

      const typeTranslations = cat.tour_category_type?.translations ?? [];
      const typeTrans =
        typeTranslations.find(
          (x) => x.languages_code === lang || x.translations_id?.code === lang,
        ) || typeTranslations[0];
      const typeName = typeTrans?.name ?? cat.tour_category_type?.name ?? null;

      return {
        type: cat.tour_category_type
          ? { id: cat.tour_category_type.id, name: typeName }
          : null,
        text: catTrans?.text ?? null,
        original: catTrans?.original ?? null,
        supplier_code: cat.category_supplier_code ?? null,
        from: !!cat.category_from,
      };
    },
    { lang, marginPct: activeSettings.marginPct, unit: activeSettings.unit },
      )
    : null;

  const surcharges = tour.surcharges
    ? tour.surcharges.map((s) => {
        const translationsMap = buildTranslationsMap(s.translations, (t) => ({
          description: t.surcharge_description ?? null,
        }));
        const active = pickFromMap(translationsMap, lang) ?? {};
        return {
          booking_name: s.surcharge_booking_name ?? null,
          description: active.description ?? null,
          sell: null,
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
          buy: null,
          margin:
            activeSurchargeSettings.marginPct !== undefined &&
            activeSurchargeSettings.marginPct !== null
              ? parseFloat(activeSurchargeSettings.marginPct)
              : null,
    };
    })
    : null;

  const fieldDefs = [
    { key: "id", group: "main", value: tour.id },
    { key: "object_id", group: "main", value: tour.object_id ?? null },
    {
      key: "publishing_status",
      group: "main",
      value: tour.status_primarix ?? null,
    },
    {
      key: "date_updated",
      group: "main",
      value: ensureUtcSuffix(tour.date_updated),
    },
    {
      key: "season",
      group: "main",
      value: tour.season
        ? { id: tour.season.id, name: tour.season.season }
        : null,
    },
    {
      key: "name",
      group: "main",
      value: translations?.name_tour ?? tour.name ?? null,
    },
    {
      key: "operator",
      group: "main",
      value: {
        operator_direct: tour.operator_direct ?? null,
        operator_linked: tour.operator_linked
          ? {
              id: tour.operator_linked.id,
              name: tour.operator_linked.name_agency ?? null,
            }
          : null,
        name_operator: tour.name_operator ?? null,
        street: tour.street ?? null,
        street_number: tour.street_number ?? null,
        postcode: tour.postcode ?? null,
        place: tour.place
          ? {
              id: tour.place.id,
              name: getGeoName(tour.place, lang) ?? null,
              code: null,
            }
          : null,
        state: tour.state
          ? {
              id: tour.state.id,
              name: getGeoName(tour.state, lang) ?? null,
              code: tour.state.ISO ?? null,
            }
          : null,
        country: tour.country
          ? {
              id: tour.country.id,
              name: getGeoName(tour.country, lang) ?? null,
              code: tour.country.ISO ?? null,
            }
          : null,
        location_tour32: tour.location_tour32
          ? {
              id: tour.location_tour32.id,
              name: tour.location_tour32.name ?? null,
            }
          : null,
        phone_general: tour.phone_general ?? null,
        phone_after_hours: tour.phone_after_hours ?? null,
        email_general: tour.email_general ?? null,
        website: tour.website ?? null,
      },
    },
    {
      key: "classification",
      group: "main",
      value: {
        destinations: shapeDestinations(
          tour.destinations,
          "destinations_id",
          lang,
        ),
        countries: shapeCountries(tour.countries, "countries_id", lang),
        travel_categories: tour.travel_categories
          ? tour.travel_categories
              .map((t) => t.travel_categories_id)
              .filter(Boolean)
              .map((t) => {
                const tr = (t.translations ?? []).find(
                  (x) => x.languages_code === lang,
                );
                return { id: t.id, name: tr?.name ?? t.name ?? null };
              })
          : null,
        accommodation_types: tour.accommodation_types
          ? tour.accommodation_types
              .map((a) => a.accommodation_types_id)
              .filter(Boolean)
              .map((a) => ({ id: a.id, name: a.label ?? null }))
          : null,
      },
    },
    {
      key: "descriptions",
      group: "main",
      value: {
        subline: translations?.subline ?? null,
        teaser: translations?.teaser ?? null,
        at_a_glance: translations?.at_a_glance ?? null,
        from_to: translations?.from_to ?? null,
        supplementary: toSupplementaryBlocks(
          translations?.description_supplementary,
        ),
        descriptions_markdown: null,
      },
    },
    {
      key: "flight_info",
      group: "main",
      value: {
        flight_service: tour.flight_service
          ? { id: tour.flight_service.id, name: tour.flight_service.name }
          : null,
        airlines: tour.airlines
          ? [{ id: tour.airlines.id, name: tour.airlines.name }]
          : null,
        departure_airports: tour.departure_airports
          ? tour.departure_airports
              .map((a) => a.airports_id)
              .filter(Boolean)
              .map((a) => ({ id: a.id, name: a.name }))
          : null,
        flights_recommended: translations?.flights_recommended ?? null,
        additional_recommendations:
          translations?.additional_recommendations ?? null,
      },
    },
    {
      key: "programme",
      group: "main",
      value: {
        disclaimer: programme_translations?.tour_programme_disclaimer ?? null,
        days: Array.isArray(programme_translations?.tour_programme)
          ? programme_translations.tour_programme.map((d) => ({
              day_destinations: d.day_destinations ?? null,
              day_description: d.day_description ?? null,
              day_accommodation_note: d.day_accommodation_note ?? null,
            }))
          : null,
      },
    },
    {
      key: "price_info",
      group: "main",
      value: {
        services_included: price_info_translations?.services_included ?? null,
        services_not_included:
          price_info_translations?.services_not_included ?? null,
        services_optional: price_info_translations?.services_optional ?? null,
        service_highlights: price_info_translations?.service_highlights ?? null,
        deviating_cancellation_terms:
          price_info_translations?.deviating_cancellation_terms ?? null,
        important_information:
          price_info_translations?.important_information ?? null,
        departure: price_info_translations?.departure ?? null,
        children_policy: price_info_translations?.children_policy ?? null,
        participants_text: price_info_translations?.participants_text ?? null,
        mobility_advice: tour.mobility_advice_text?.id
          ? {
              id: tour.mobility_advice_text.id,
              name: pickFromMap(
                buildTranslationsMap(
                  tour.mobility_advice_text.hotel_translations,
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
          tour.children_free_age !== undefined &&
          tour.children_free_age !== null
            ? Number(tour.children_free_age)
            : null,
        children_free_number:
          tour.children_free_number !== undefined &&
          tour.children_free_number !== null
            ? Number(tour.children_free_number)
            : null,
        participants_min:
          tour.participants_min !== undefined && tour.participants_min !== null
            ? Number(tour.participants_min)
            : null,
        participants_max:
          tour.participants_max !== undefined && tour.participants_max !== null
            ? Number(tour.participants_max)
            : null,
        week_min_before_start:
          tour.week_min_before_start !== undefined &&
          tour.week_min_before_start !== null
            ? Number(tour.week_min_before_start)
            : null,
      },
    },
    {
      key: "dates",
      group: "main",
      value: {
        departures_text: departures_text,
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
      value: tour.image_badge_status
        ? {
            teaser: badgeMap?.[lang]?.image_badge_teaser ?? null,
            details: badgeMap?.[lang]?.image_badge_details ?? null,
            start_date: tour.image_badge_start_date ?? null,
            end_date: tour.image_badge_end_date ?? null,
            status: tour.image_badge_status ?? null,
          }
        : null,
    },
    { key: "media", group: "main", value: tour.media ? buildImageUrls(tour.media, lang) : null },
    {
      key: "booking",
      group: "main",
      value: {
        booking_channel: tour.booking_channel ?? null,
        booking_partner: tour.booking_partner
          ? {
              id: tour.booking_partner.id ?? null,
              name: tour.booking_partner.name_agency ?? null,
            }
          : null,
        id_service_provider_tour32: tour.service_provider_id_tour32 ?? null,
        id_main_service_provider_tour32:
          tour.main_service_provider_id_tour32 ?? null,
        res_phone: tour.booking_partner?.phone_reservation ?? null,
        res_email2: tour.booking_partner?.email_reservation ?? null,
        email_booking: tour.email_booking ?? null,
        contact_title: tour.booking_partner?.contact_title ?? null,
        contact_greeting: tour.booking_partner?.contact_greeting ?? null,
        contact_firstname: tour.booking_partner?.contact_first_name ?? null,
        contact_name: tour.booking_partner?.contact_name ?? null,
        internal_remarks_reservation: tour.internal_remarks_reservation ?? null,
      },
    },
    {
      key: "pricing_config",
      group: "main",
      value: {
        buy_price_type: activeSettings.buyPriceType ?? null,
        sell_price_type: activeSettings.sellPriceType ?? null,
        percentage_type: activeSettings.percentageType ?? null,
        provision_percentage:
          activeSettings.provisionPercentage !== undefined &&
          activeSettings.provisionPercentage !== null
            ? Number(activeSettings.provisionPercentage)
            : null,
        margin_percentage:
          activeSettings.marginPct !== undefined &&
          activeSettings.marginPct !== null
            ? Number(activeSettings.marginPct)
            : null,
        exchange_rate: activeSettings.exchangeRate ?? null,
        from_price: activeSettings.fromPrice ?? null,
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
        surcharge_exchange_rate: activeSurchargeSettings.exchangeRate ?? null,
      },
    },
    {
      key: "internal",
      group: "main",
      value: {
        object_info_primarix: tour.object_info_primarix ?? null,
        internal_remarks: tour.internal_remarks ?? null,
        price_subline: tour.price_subline ?? null,
        supplier_product_code: tour.supplier_product_code ?? null,
        sell_prices_status: tour.sell_prices_status ?? null,
        sell_prices_updated_at: ensureUtcSuffix(tour.sell_prices_updated_at),
      },
    },
  ];

  return assembleResponse({
    fieldDefs,
    groupOrder: TOUR_GROUP_ORDER,
    rawItem: tour,
    consumedSourceKeys: CONSUMED_SOURCE_KEYS,
    denylist: TOUR_DENYLIST,
  });
}
