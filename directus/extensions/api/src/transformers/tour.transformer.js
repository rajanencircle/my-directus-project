import { LOCALE_TO_ISO } from "../maps/language-code.map.js";
import { ensureUtcSuffix } from "../utils/timestamps.js";
import { groupPrices2 } from "../utils/grouping.js";
import { toExchangeRateObject } from "../utils/prices.js";
import { buildImageUrls } from "../utils/images.js";
import {
  toSupplementaryBlocks,
  extractSpecialsDescription,
} from "../utils/supplementary.js";
import { assembleResponse } from "../shared/response/assembleResponse.js";
import { restrictTo } from "../shared/response/visibility.js";
import {
  getLocaleCode,
  buildTranslationsMap,
  pickFromMap,
} from "./shared/i18n.js";
import { getGeoName, shapeGeoRefs } from "./shared/geo.js";
import { buildThumbnailUrl, buildImageBadge } from "./shared/media.js";
import { toNumOrNull } from "./shared/numeric.js";
import {
  buildPricingConfig,
  buildPriceSettingsMap,
  buildSurchargeSettingsMap,
} from "./shared/pricing.js";
import { shapeOperatorAddress } from "./shared/address.js";
import {
  shapeFrequency as sharedShapeFrequency,
  parseTravelRoutes,
  shapeRoutePlace as sharedShapeRoutePlace,
} from "./shared/departures.js";

const TOUR_GROUP_ORDER = ["main"];

/**
 * Shapes the raw tour data into a summarized list item format.
 *
 * @param {Object} tour - The raw tour data from the database.
 * @param {string} lang - The language code for translations.
 * @returns {Object} The formatted tour list item payload.
 */
export function shapeTourListItem(tour, lang) {
  const descMap = buildTranslationsMap(tour.descriptions_translations, (t) => ({
    name_tour: t.name_tour ?? null,
  }));
  const name_tour = pickFromMap(descMap, lang)?.name_tour ?? null;

  return {
    id: tour.id,
    object_id: tour.object_id ?? null,
    name: name_tour ?? null,
    geo: {
      countries: shapeGeoRefs(tour.countries, "countries_id", lang),
      destinations: shapeGeoRefs(tour.destinations, "destinations_id", lang, {
        codeKey: "media_code",
      }),
    },
    thumbnail: buildThumbnailUrl(tour.media, lang),
    publishing_status: tour.status_primarix ?? null,
    date_updated: ensureUtcSuffix(tour.source_updated_at),
  };
}

/**
 * Shapes the raw tour data into a comprehensive detail format.
 * Aggregates translations, pricing, schedules, flight info, categories, surcharges, and metadata.
 *
 * @param {Object} tour - The raw tour data from the database.
 * @param {string} lang - The language code for translations.
 * @param {Object} [options] - Configuration options.
 * @param {string} [options.audience] - The target audience (e.g., 'web', 'backoffice') to restrict data visibility.
 * @returns {Object} The formatted tour detail payload.
 */
export function shapeTourDetail(tour, lang, { audience } = {}) {
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
    mobility_advice_text: t.mobility_advice_text ?? null,
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

  const parsedRoutes = parseTravelRoutes(tour.travel_routes);
  const firstRoute = parsedRoutes?.[0] || {};
  const tourDeparturePlace =
    sharedShapeRoutePlace(firstRoute.tour_departure, lang) ??
    (firstRoute.from
      ? { id: null, name: String(firstRoute.from), code: null }
      : null);
  const tourArrivalPlace =
    sharedShapeRoutePlace(firstRoute.tour_arrival, lang) ??
    (firstRoute.to
      ? { id: null, name: String(firstRoute.to), code: null }
      : null);

  const sortedDepartureTimes = tour.departure_times
    ? [...tour.departure_times].sort(
        (a, b) => (a.sort ?? 9999) - (b.sort ?? 9999),
      )
    : null;

  const departure_dates = sortedDepartureTimes
    ? sortedDepartureTimes.map((d) => {
        return {
          available_from: d.available_from ?? null,
          available_to: d.available_to ?? null,
          frequency: d.departure_frequencies
            ? sharedShapeFrequency(d.departure_frequencies)
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
            const occTransMap = buildTranslationsMap(
              o.occupancy.translations,
              (t) => ({ name: t.name }),
            );
            const occTrans = pickFromMap(occTransMap, lang);
            return {
              ...o.occupancy,
              value: o.id,
              name: occTrans?.name ?? null,
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

          const typeTransMap = buildTranslationsMap(
            cat.tour_category_type?.translations,
            (t) => ({ name: t.name }),
          );
          const typeTrans = pickFromMap(typeTransMap, lang);
          const typeName = typeTrans?.name ?? null;

          return {
            type: cat.tour_category_type
              ? { id: cat.tour_category_type.id, name: typeName }
              : null,
            text: catTrans?.text ?? null,
            /* Restrict sensitive internal supplier codes and original text to backoffice visibility only. */
            original: restrictTo(catTrans?.original ?? null, "backoffice"),
            supplier_code: restrictTo(
              cat.category_supplier_code ?? null,
              "backoffice",
            ),
            from: !!cat.category_from,
          };
        },
        {
          lang,
          marginPct: activeSettings.marginPct,
          unit: activeSettings.unit,
        },
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
          /* Restrict internal pricing, margins, and calculation details to backoffice visibility.
           * The public web payload is limited to `booking_name`, `description`, and `sell` price. */
          type: restrictTo(
            s.surcharge_type
              ? {
                  id: s.surcharge_type.id,
                  name: s.surcharge_type.designation ?? null,
                }
              : null,
            "backoffice",
          ),
          calculation_method: restrictTo(
            s.calculation_method
              ? {
                  id: s.calculation_method.id,
                  name: s.calculation_method.designation ?? null,
                }
              : null,
            "backoffice",
          ),
          buy: restrictTo(null, "backoffice"),
          margin: restrictTo(
            activeSurchargeSettings.marginPct !== undefined &&
              activeSurchargeSettings.marginPct !== null
              ? parseFloat(activeSurchargeSettings.marginPct)
              : null,
            "backoffice",
          ),
        };
      })
    : null;

  const fieldDefs = [
    /* Top-level metadata is restricted to backoffice endpoints to prevent exposing internal system state to the public web. */
    { key: "id", group: "main", value: tour.id, visibleTo: ["backoffice"] },
    {
      key: "object_id",
      group: "main",
      value: tour.object_id ?? null,
      visibleTo: ["backoffice"],
    },
    {
      key: "publishing_status",
      group: "main",
      value: tour.status_primarix ?? null,
      visibleTo: ["backoffice"],
    },
    {
      key: "date_updated",
      group: "main",
      value: ensureUtcSuffix(tour.source_updated_at),
      visibleTo: ["backoffice"],
    },
    {
      key: "season",
      group: "main",
      value: tour.season
        ? { id: tour.season.id, name: tour.season.season }
        : null,
    },
    /* For web clients, the tour name is provided via the product envelope rather than the type-specific body.
     * Therefore, this field is restricted to backoffice visibility. */
    {
      key: "name",
      group: "main",
      value: translations?.name_tour ?? null,
      visibleTo: ["backoffice"],
    },
    {
      key: "operator",
      group: "main",
      visibleTo: ["backoffice"],
      value: shapeOperatorAddress({
        operatorLinked: tour.operator_linked,
        operatorDirect: tour.operator_direct,
        nameOperator: tour.name_operator,
        lang,
      }),
    },
    {
      key: "classification",
      group: "main",
      value: {
        destinations: shapeGeoRefs(tour.destinations, "destinations_id", lang, {
          codeKey: "media_code",
        }),
        countries: shapeGeoRefs(tour.countries, "countries_id", lang),
        travel_categories: tour.travel_categories
          ? tour.travel_categories
              .map((t) => t.travel_categories_id)
              .filter(Boolean)
              .map((t) => {
                const trMap = buildTranslationsMap(t.translations, (x) => ({
                  name: x.name,
                }));
                const tr = pickFromMap(trMap, lang);
                return { id: t.id, name: tr?.name ?? null };
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
          : [],
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
          : [],
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
        /* Tours map `mobility_advice_text` as a flat per-language string, so the `id` is explicitly null. */
        mobility_advice: price_info_translations?.mobility_advice_text
          ? { id: null, name: price_info_translations.mobility_advice_text }
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
        children_free_age: toNumOrNull(tour?.children_free_age),
        children_free_number: toNumOrNull(tour?.children_free_number),
        participants_min: toNumOrNull(tour?.participants_min),
        participants_max: toNumOrNull(tour?.participants_max),
        week_min_before_start: toNumOrNull(tour?.week_min_before_start),
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
        special_description:
          specials_translations?.specials != null
            ? extractSpecialsDescription(specials_translations.specials)
            : null,
      },
    },
    {
      key: "image_badge",
      group: "main",
      value: buildImageBadge(tour, badgeMap?.[lang]),
    },
    {
      key: "media",
      group: "main",
      value: tour.media ? buildImageUrls(tour.media, lang) : null,
    },
    {
      key: "booking",
      group: "main",
      visibleTo: ["backoffice"],
      value: {
        booking_channel: tour.booking_channel ?? null,
        booking_partner: tour.booking_partner
          ? {
              id: tour.booking_partner.id ?? null,
              name: tour.booking_partner.name_agency ?? null,
            }
          : null,
        id_service_provider_tour32: tour.id_service_provider_tour32 ?? null,
        id_main_service_provider_tour32:
          tour.id_main_service_provider_tour32 ?? null,
        res_phone: tour.booking_partner?.phone_reservation ?? null,
        res_email2: tour.booking_partner?.email_reservation ?? null,
        email_booking: tour.email_booking ?? null,
        contact_title: tour.booking_partner?.contact_title ?? null,
        contact_greeting: tour.booking_partner?.contact_greeting ?? null,
        contact_firstname: tour.booking_partner?.contact_first_name ?? null,
        contact_name: tour.booking_partner?.contact_name ?? null,
        internal_remarks_reservation:
          tour.booking_partner?.internal_remarks_reservation ?? null,
      },
    },
    {
      key: "pricing_config",
      group: "main",
      visibleTo: ["backoffice"],
      value: buildPricingConfig({
        settings: activeSettings,
        surchargeSettings: activeSurchargeSettings,
        exchangeRate: activeSettings.exchangeRate ?? null,
        fromPrice: activeSettings.fromPrice ?? null,
        surchargeExchangeRate: activeSurchargeSettings.exchangeRate ?? null,
      }),
    },
    {
      key: "internal",
      group: "main",
      visibleTo: ["backoffice"],
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
    audience,
  });
}
