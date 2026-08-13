import { LOCALE_TO_ISO } from "../maps/language-code.map.js";
import { ensureUtcSuffix } from "../utils/timestamps.js";
import { groupPrices2 } from "../utils/grouping.js";
import { buildImageUrls } from "../utils/images.js";
import { toExchangeRateObject } from "../utils/prices.js";
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

const EXCURSION_GROUP_ORDER = ["main"];

/**
 * Maps database departure records into the standard `ExcursionDate` format.
 * Since excursions lack a direct `departures` column, this parses the `departure_times`
 * one-to-many relationship (`excursions_dates`), extracting availability and frequencies.
 * Departure and arrival places are derived from the primary travel route.
 *
 * @param {Array} departureTimes - The list of departure records.
 * @param {Function} shapeFrequency - Formatter function for frequencies.
 * @param {Object} departurePlace - The default departure location.
 * @param {Object} arrivalPlace - The default arrival location.
 * @returns {Array|null} Array of formatted excursion dates or null.
 */
function shapeExcursionDates(
  departureTimes,
  shapeFrequency,
  departurePlace,
  arrivalPlace,
) {
  if (!departureTimes) return null;
  return departureTimes
    .map((d) => {
      return {
        available_from: d.available_from ?? null,
        available_to: d.available_to ?? null,
        frequency: d.departure_frequencies
          ? (shapeFrequency?.(d.departure_frequencies) ?? null)
          : null,
        departure_place: departurePlace ?? null,
        arrival_place: arrivalPlace ?? null,
      };
    })
    .filter(Boolean);
}

/**
 * Shapes the raw excursion data into a summarized list item format.
 *
 * @param {Object} excursion - The raw excursion data from the database.
 * @param {string} lang - The language code for translations.
 * @returns {Object} The formatted excursion list item payload.
 */
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
    name: name_excursion ?? null,
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
    thumbnail: buildThumbnailUrl(excursion.media, lang),
    publishing_status: excursion.status_primarix ?? null,
    date_updated: ensureUtcSuffix(excursion.source_updated_at),
  };
}

/**
 * Shapes the raw excursion data into a comprehensive detail format.
 * Aggregates translations, pricing, schedules, categories, surcharges, and metadata.
 *
 * @param {Object} excursion - The raw excursion data from the database.
 * @param {string} lang - The language code for translations.
 * @param {Object} [options] - Configuration options.
 * @param {string} [options.audience] - The target audience (e.g., 'web', 'backoffice') to restrict data visibility.
 * @returns {Object} The formatted excursion detail payload.
 */
export function shapeExcursionDetail(excursion, lang, { audience } = {}) {
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
  const activePriceSettings = pickFromMap(priceSettingsMap, lang) ?? {
    marginPct: null,
    unit: null,
  };

  const surchargeSettingsMap = buildSurchargeSettingsMap(
    excursion.surcharges_translations,
  );
  const activeSurchargeSettings = pickFromMap(surchargeSettingsMap, lang) ?? {
    marginPct: null,
  };

  const parsedRoutes = parseTravelRoutes(excursion.travel_routes);
  const firstRoute = parsedRoutes?.[0] || {};
  const departurePlace = sharedShapeRoutePlace(firstRoute.tour_departure, lang);
  const arrivalPlace = sharedShapeRoutePlace(firstRoute.tour_arrival, lang);

  const departure_dates = shapeExcursionDates(
    excursion.departure_times,
    sharedShapeFrequency,
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
            const transMap = buildTranslationsMap(transList, (t) => ({
              name: t.name,
            }));
            const trans = pickFromMap(transMap, lang);
            return {
              ...pc.price_category,
              value: pc.id,
              name: trans?.name ?? null,
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
            /* Restrict sensitive internal supplier codes and original text to backoffice visibility only */
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
          buy: restrictTo(
            s.buy_price ? parseFloat(s.buy_price) : null,
            "backoffice",
          ),
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
    {
      key: "id",
      group: "main",
      value: excursion.id,
      visibleTo: ["backoffice"],
    },
    {
      key: "object_id",
      group: "main",
      value: excursion.object_id ?? null,
      visibleTo: ["backoffice"],
    },
    {
      key: "publishing_status",
      group: "main",
      value: excursion.status_primarix ?? null,
      visibleTo: ["backoffice"],
    },
    {
      key: "date_updated",
      group: "main",
      value: ensureUtcSuffix(excursion.source_updated_at),
      visibleTo: ["backoffice"],
    },
    {
      key: "season",
      group: "main",
      value: excursion.season
        ? { id: excursion.season.id, name: excursion.season.season }
        : null,
    },
    /* For web clients, the name is typically provided via the product envelope rather than the type-specific body.
     * This field is therefore restricted to backoffice visibility. */
    {
      key: "name",
      group: "main",
      value: translations?.name_excursion ?? null,
      visibleTo: ["backoffice"],
    },
    {
      key: "operator",
      group: "main",
      visibleTo: ["backoffice"],
      value: shapeOperatorAddress({
        operatorLinked: excursion.operator_linked,
        operatorDirect: excursion.operator_direct,
        nameOperator: excursion.name_operator,
        lang,
      }),
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
        countries: shapeGeoRefs(excursion.countries, "countries_id", lang),
        travel_categories: excursion.travel_categories
          ? excursion.travel_categories
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
              id: null,
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
        children_free_age: toNumOrNull(excursion?.children_free_age),
        children_free_number: toNumOrNull(excursion?.children_free_number),
        participants_min: toNumOrNull(excursion?.participants_min),
        participants_max: toNumOrNull(excursion?.participants_max),
        week_min_before_start: toNumOrNull(excursion?.week_min_before_start),
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
        special_description:
          specials_translations?.specials != null
            ? extractSpecialsDescription(specials_translations.specials)
            : null,
      },
    },
    {
      key: "image_badge",
      group: "main",
      value: buildImageBadge(excursion, badgeMap?.[lang]),
    },
    {
      key: "media",
      group: "main",
      value: buildImageUrls(excursion.media, lang),
    },
    {
      key: "booking",
      group: "main",
      visibleTo: ["backoffice"],
      value: {
        booking_channel: excursion.booking_channel ?? null,
        booking_partner: excursion.booking_partner
          ? {
              id: excursion.booking_partner.id ?? null,
              name: excursion.booking_partner.name_agency ?? null,
            }
          : null,
        service_provider_id_tour32:
          excursion.service_provider_id_tour32 ?? null,
        main_service_provider_id_tour32:
          excursion.main_service_provider_id_tour32 ?? null,
        res_phone: excursion.booking_partner?.phone_reservation ?? null,
        res_email2: excursion.booking_partner?.email_reservation ?? null,
        email_booking: excursion.email_booking ?? null,
        contact_title: excursion.booking_partner?.contact_title ?? null,
        contact_greeting: excursion.booking_partner?.contact_greeting ?? null,
        contact_firstname:
          excursion.booking_partner?.contact_first_name ?? null,
        contact_name: excursion.booking_partner?.contact_name ?? null,
        internal_remarks_reservation:
          excursion.booking_partner?.internal_remarks_reservation ?? null,
      },
    },
    {
      key: "pricing_config",
      group: "main",
      visibleTo: ["backoffice"],
      value: buildPricingConfig({
        settings: activePriceSettings,
        surchargeSettings: activeSurchargeSettings,
        exchangeRate: toExchangeRateObject(activePriceSettings?.exchangeRate),
        fromPrice: toNumOrNull(activePriceSettings?.fromPrice),
        surchargeExchangeRate: toExchangeRateObject(
          activeSurchargeSettings.exchangeRate,
        ),
      }),
    },
    {
      key: "internal",
      group: "main",
      visibleTo: ["backoffice"],
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
    audience,
  });
}
