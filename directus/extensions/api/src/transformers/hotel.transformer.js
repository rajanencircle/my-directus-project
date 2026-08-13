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
import { getGeoName } from "./shared/geo.js";
import { buildThumbnailUrl, buildImageBadge } from "./shared/media.js";
import { toNumOrNull } from "./shared/numeric.js";
import {
  buildPricingConfig,
  buildPriceSettingsMap,
  buildSurchargeSettingsMap,
} from "./shared/pricing.js";

/**
 * Determines if a given item is currently active for publication.
 * Validates the status and checks if the current timestamp falls within
 * the allowed `publish_start` and `publish_end` timeframe.
 *
 * @param {Object} item - The item to evaluate, expecting `status`, `publish_start`, and `publish_end`.
 * @param {string|Date} now - The current timestamp for comparison.
 * @returns {boolean} True if the item is published and within the active time range.
 */
function isPublicationActive(item, now) {
  if (item.status === "unpublished") return false;

  if (item.publish_end && now > item.publish_end) return false;
  if (item.publish_start && now < item.publish_start) return false;
  return true;
}

/**
 * Shapes the raw hotel data into a summarized list item format.
 *
 * @param {Object} hotel - The raw hotel data from the database.
 * @param {string} lang - The language code for translations.
 * @returns {Object} The formatted hotel list item payload.
 */
export function shapeHotelListItem(hotel, lang) {
  const classification = hotel.hotel_classification
    ? {
        id: hotel.hotel_classification.id,
        name: hotel.hotel_classification.label ?? null,
      }
    : null;

  return {
    id: hotel.id,
    object_id: hotel.object_id ?? null,
    name: hotel.name ?? null,
    classification,
    geo: {
      country: hotel.country
        ? {
            id: hotel.country.id,
            name: getGeoName(hotel.country, lang) ?? null,
            code: hotel.country.ISO ?? null,
          }
        : null,
      region: hotel.region
        ? {
            id: hotel.region.id,
            name: getGeoName(hotel.region, lang) ?? null,
            code: null,
          }
        : null,
    },
    thumbnail: buildThumbnailUrl(hotel.media, lang),
    publishing_status: hotel.status_primarix ?? null,
    date_updated: ensureUtcSuffix(hotel.source_updated_at),
  };
}

/**
 * Shapes the raw hotel data into a comprehensive detail format.
 * Aggregates translations, pricing, rooms, surcharges, and metadata based on the requested language and audience.
 *
 * @param {Object} hotel - The raw hotel data from the database.
 * @param {string} lang - The language code for translations.
 * @param {Object} [options] - Configuration options.
 * @param {string} [options.audience] - The target audience (e.g., 'web', 'backoffice') to restrict data visibility.
 * @returns {Object} The formatted hotel detail payload.
 */
export function shapeHotelDetail(hotel, lang, { audience } = {}) {
  const descMap = buildTranslationsMap(
    hotel.hotel_descriptions_translations,
    (t) => ({
      subline_location: t.subline_location ?? null,
      teaser: t.teaser ?? null,
      description_short: t.description_short ?? null,
      description_surrounding: t.description_surrounding ?? null,
      description_rooms: t.description_rooms ?? null,
      total_number_of_rooms: t.total_number_of_rooms ?? null,
      remarks_arrival: t.remarks_arrival ?? null,
      description_supplementary: t.description_supplementary ?? null,
    }),
  );

  const infoMap = buildTranslationsMap(hotel.price_info_translations, (t) => ({
    services_included: t.services_included ?? null,
    services_not_included: t.services_not_included ?? null,
    service_highlights: t.service_highlights ?? null,
    minimum_stay: t.minimum_stay ?? null,
    minimum_stay_additions: t.minimum_stay_additions ?? null,
    deviating_cancelation_terms: t.deviating_cancelation_terms ?? null,
    children_policy: t.children_policy ?? null,
    children_free_age: t.children_free_age ?? null,
    children_free_number: t.children_free_number ?? null,
    important_information: t.important_information ?? null,
    mobility_advice_text: t.mobility_advice_text ?? null,
    price_infos_supplementary: t.price_infos_supplementary ?? null,
  }));

  const translations = pickFromMap(descMap, lang);
  const price_info_translations = pickFromMap(infoMap, lang);

  const priceSettingsMap = buildPriceSettingsMap(hotel.hotel_prices);
  const activeSettings = pickFromMap(priceSettingsMap, lang) ?? {
    marginPct: null,
    unit: null,
  };

  const surchargeSettingsMap = buildSurchargeSettingsMap(
    hotel.surcharge_settings,
  );
  const activeSurchargeSettings = pickFromMap(surchargeSettingsMap, lang) ?? {
    marginPct: null,
  };

  const badgeTranslations = buildTranslationsMap(
    hotel.image_badge_translations,
    (t) => ({
      image_badge_teaser: t.image_badge_teaser ?? null,
      image_badge_details: t.image_badge_details ?? null,
    }),
  );

  const specialsMap = buildTranslationsMap(
    hotel.specials_translations,
    (t) => t.specials ?? [],
  );
  const activeSpecials = pickFromMap(specialsMap, lang) ?? [];
  const special_description = extractSpecialsDescription(activeSpecials);

  const now = new Date().toISOString();

  const roomCategories = (hotel.room_categories ?? []).filter((rc) =>
    isPublicationActive(rc, now),
  );
  // A price period can be `status: "published"` with no publish window set and
  // still have already ended (its own `end_date` is in the past) — isPublicationActive
  // only checks the CMS publish window, not whether the booking period itself is over.
  const today = now.slice(0, 10);
  const priceDates = (hotel.price_dates ?? []).filter(
    (pd) => isPublicationActive(pd, now) && (!pd.end_date || pd.end_date >= today),
  );
  const roomPrices = hotel.room_prices ?? [];
  
  /*
   * Resolves and formats room occupancies, ensuring translations are applied.
   * The `value` key explicitly maps to the junction row ID, aligning with `room_prices` references.
   */
  const occupancies = (hotel.room_occupancies ?? [])
    .map((r) => {
      if (!r.occupancies_id) return null;
      const nameMap = buildTranslationsMap(
        r.occupancies_id.translations,
        (t) => t.occupancy ?? null,
      );
      return {
        id: r.occupancies_id.id,
        value: r.id,
        name: pickFromMap(nameMap, lang),
      };
    })
    .filter(Boolean);
  const rooms = hotel.room_categories
    ? groupPrices2(
        roomCategories,
        priceDates,
        roomPrices,
        occupancies,
        LOCALE_TO_ISO,
        {
          categoryIdKey: "room_category_id",
          dateIdKey: "price_date_id",
          occupancyIdKey: "room_occupancy_id",
          translationsKey: "room_prices_translations",
          sellPriceKey: "sell_price",
        },
        (cat) => {
          const catMap = buildTranslationsMap(cat.translations, (t) => ({
            additions: t.room_category_additions ?? null,
            description: t.room_category_description ?? null,
          }));
          const active = pickFromMap(catMap, lang) ?? {};

          const categoryNameMap = buildTranslationsMap(
            cat.room_category?.translations,
            (t) => t.name ?? null,
          );
          const categoryName = pickFromMap(categoryNameMap, lang);

          return {
            category: cat.room_category
              ? { id: cat.room_category.id, name: categoryName }
              : null,
            sort: cat.sort ?? null,
            additions: active.additions ?? null,
            description: active.description ?? null,
            /* Restrict sensitive internal supplier codes to backoffice visibility only */
            booking_code: restrictTo(
              cat.room_category_booking_code ?? null,
              "backoffice",
            ),
            catering: restrictTo(
              cat.room_category_catering
                ? {
                    id: cat.room_category_catering.id,
                    name: cat.room_category_catering.designation,
                  }
                : null,
              "backoffice",
            ),
            calc_type: restrictTo(
              cat.room_category_calc_type ?? null,
              "backoffice",
            ),
            tour32_name: restrictTo(
              cat.room_category_tour32_name ?? null,
              "backoffice",
            ),
          };
        },
        {
          lang,
          marginPct: activeSettings.marginPct,
          unit: activeSettings.unit,
        },
      )
    : null;

  const price_options = hotel.surcharges
    ? (hotel.surcharges ?? [])
        .filter((s) => isPublicationActive(s, now))
        .map((s) => {
          const translationsMap = buildTranslationsMap(s.translations, (t) => ({
            description: t.surcharge_description ?? null,
            booking_name: t.surcharge_booking_name ?? null,
            sell_price: t.sell_price ?? null,
            type: t.surcharge_type?.designation ?? null,
            catering: t.surcharge_catering
              ? {
                  id: t.surcharge_catering.id,
                  name: t.surcharge_catering.designation,
                }
              : null,
            calc_type: t.surcharge_calc_type?.designation ?? null,
          }));
          const active = pickFromMap(translationsMap, lang) ?? {};
          const buy = s.buy_price ? parseFloat(s.buy_price) : null;
          const margin =
            activeSurchargeSettings.marginPct !== undefined &&
            activeSurchargeSettings.marginPct !== null
              ? parseFloat(activeSurchargeSettings.marginPct)
              : null;
          return {
            booking_name: active.booking_name ?? null,
            description: active.description ?? null,
            sell:
              active.sell_price !== undefined && active.sell_price !== null
                ? parseFloat(active.sell_price)
                : null,
            /* Restrict internal pricing, margins, and calculation details to backoffice visibility.
             * The public web payload is limited to `booking_name`, `description`, and `sell` price. */
            type: restrictTo(active.type ?? null, "backoffice"),
            catering: restrictTo(active.catering ?? null, "backoffice"),
            calc_type: restrictTo(active.calc_type ?? null, "backoffice"),
            buy: restrictTo(buy, "backoffice"),
            margin: restrictTo(margin, "backoffice"),
          };
        })
    : null;

  const fieldDefs = [
    /* Top-level metadata is restricted to backoffice endpoints to prevent exposing internal system state to the public web. */
    { key: "id", group: "main", value: hotel.id, visibleTo: ["backoffice"] },
    {
      key: "object_id",
      group: "main",
      value: hotel.object_id ?? null,
      visibleTo: ["backoffice"],
    },
    {
      key: "publishing_status",
      group: "main",
      value: hotel.status_primarix ?? null,
      visibleTo: ["backoffice"],
    },
    {
      key: "date_updated",
      group: "main",
      value: ensureUtcSuffix(hotel.source_updated_at),
      visibleTo: ["backoffice"],
    },
    {
      key: "season",
      group: "main",
      value: hotel.season
        ? { id: hotel.season.id, name: hotel.season.season }
        : null,
    },
    /* Explicitly reorder `name` and `hotel_group` to appear first in the response structure for web clients. */
    {
      key: "name",
      group: "main",
      value: hotel.name ?? null,
      order: { web: -20 },
    },
    {
      key: "hotel_group",
      group: "main",
      value: hotel.hotel_group
        ? { id: hotel.hotel_group.id, name: hotel.hotel_group.label }
        : null,
      order: { web: -10 },
    },
    {
      key: "address",
      group: "main",
      value: {
        street: hotel.street ?? null,
        street_number: hotel.street_number ?? null,
        zip_code: hotel.zip_code ?? null,
        place: hotel.place
          ? {
              id: hotel.place.id,
              name: getGeoName(hotel.place, lang) ?? null,
              code: null,
            }
          : null,
        country: hotel.country
          ? {
              id: hotel.country.id,
              name: getGeoName(hotel.country, lang) ?? null,
              code: hotel.country.ISO ?? null,
            }
          : null,
        state: hotel.state
          ? {
              id: hotel.state.id,
              name: getGeoName(hotel.state, lang) ?? null,
              code: hotel.state.ISO ?? null,
            }
          : null,
        region: hotel.region
          ? {
              id: hotel.region.id,
              name: getGeoName(hotel.region, lang) ?? null,
              code: null,
            }
          : null,
        phone_general: hotel.phone_general ?? null,
        phone_after_hours: hotel.phone_ah ?? null,
        email_general: hotel.email_general ?? null,
        website: hotel.website ?? null,
      },
    },
    {
      key: "classification",
      group: "main",
      value: {
        accommodation_types: hotel.accommodation_type
          ? hotel.accommodation_type
              .map((a) =>
                a.accommodation_types_id
                  ? {
                      id: a.accommodation_types_id.id,
                      name: a.accommodation_types_id.label,
                    }
                  : null,
              )
              .filter(Boolean)
          : null,
        hotel_classification: hotel.hotel_classification
          ? {
              id: hotel.hotel_classification.id,
              name: hotel.hotel_classification.label,
            }
          : null,
        activities: hotel.hotel_activities
          ? hotel.hotel_activities
              .map((a) =>
                a.activities_id
                  ? { id: a.activities_id.id, name: a.activities_id.label }
                  : null,
              )
              .filter(Boolean)
          : null,
      },
    },
    {
      key: "descriptions",
      group: "main",
      value: {
        subline_location: translations?.subline_location ?? null,
        teaser: translations?.teaser ?? null,
        description_short: translations?.description_short ?? null,
        description_surrounding: translations?.description_surrounding ?? null,
        description_rooms: translations?.description_rooms ?? null,
        remarks_arrival: translations?.remarks_arrival ?? null,
        total_number_of_rooms: toNumOrNull(translations?.total_number_of_rooms),
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
        service_highlights: price_info_translations?.service_highlights ?? null,
        minimum_stay: price_info_translations?.minimum_stay ?? null,
        minimum_stay_additions:
          price_info_translations?.minimum_stay_additions ?? null,
        deviating_cancellation_terms:
          price_info_translations?.deviating_cancelation_terms ?? null,
        children_policy: price_info_translations?.children_policy ?? null,
        children_free_age: toNumOrNull(
          price_info_translations?.children_free_age,
        ),
        children_free_number: toNumOrNull(
          price_info_translations?.children_free_number,
        ),
        important_information:
          price_info_translations?.important_information ?? null,
        mobility_advice: price_info_translations?.mobility_advice_text
          ? { id: null, name: price_info_translations.mobility_advice_text }
          : null,
        supplementary: toSupplementaryBlocks(
          price_info_translations?.price_infos_supplementary,
        ),
        price_info_markdown: null,
      },
    },
    { key: "rooms", group: "main", value: rooms },
    { key: "surcharges", group: "main", value: price_options },
    {
      key: "specials",
      group: "main",
      value: {
        special_description,
      },
    },
    {
      key: "image_badge",
      group: "main",
      value: buildImageBadge(hotel, pickFromMap(badgeTranslations, lang)),
    },
    {
      key: "media",
      group: "main",
      value: buildImageUrls(hotel.media, lang) ?? null,
    },
    {
      key: "booking",
      group: "main",
      visibleTo: ["backoffice"],
      value: {
        booking_channel: hotel.booking_partner ?? null,
        booking_partner: hotel.booking
          ? {
              id: hotel.booking.id ?? null,
              name: hotel.booking.name_agency ?? null,
            }
          : null,
        id_service_provider_tour32: hotel.id_tour_user ?? null,
        id_main_service_provider_tour32: hotel.haupt_id_tour_user ?? null,
        res_phone: hotel.booking?.phone_reservation ?? null,
        email_booking: hotel.booking_email ?? null,
        res_email2: hotel.booking?.email_reservation ?? null,
        contact_title: hotel.booking?.contact_title ?? null,
        contact_greeting: hotel.booking?.contact_greeting ?? null,
        contact_firstname: hotel.booking?.contact_first_name ?? null,
        contact_name: hotel.booking?.contact_name ?? null,
        internal_remarks_reservation:
          hotel.booking?.internal_remarks_reservation ?? null,
        it_code: hotel.booking?.it_code ?? null,
      },
    },
    {
      key: "pricing_config",
      group: "main",
      visibleTo: ["backoffice"],
      value: buildPricingConfig({
        settings: activeSettings,
        surchargeSettings: activeSurchargeSettings,
        exchangeRate: toNumOrNull(activeSettings?.exchangeRate?.rate),
        fromPrice: activeSettings.fromPrice ?? null,
        surchargeExchangeRate: toNumOrNull(
          activeSurchargeSettings?.exchangeRate?.rate,
        ),
      }),
    },
    {
      key: "internal",
      group: "main",
      visibleTo: ["backoffice"],
      value: {
        internal_remarks: hotel.internal_remarks ?? null,
        object_info_primarix: hotel.object_info ?? null,
        location_tour32: hotel.location_tour32
          ? { id: hotel.location_tour32.id, name: hotel.location_tour32.name }
          : null,
        sell_prices_status: hotel.sell_prices_status ?? null,
        sell_prices_updated_at: hotel.sell_prices_updated_at
          ? ensureUtcSuffix(hotel.sell_prices_updated_at)
          : null,
      },
    },
  ];

  return assembleResponse({
    fieldDefs,
    groupOrder: ["main"],
    audience,
  });
}
