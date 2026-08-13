import { LOCALE_TO_ISO } from "../maps/language-code.map.js";
import { ensureUtcSuffix } from "../utils/timestamps.js";
import { groupPrices2 } from "../utils/grouping.js";
import { toExchangeRateObject } from "../utils/prices.js";
import { buildImageUrls } from "../utils/images.js";
import { extractSpecialsDescription, extractSpecialsValidity } from "../utils/supplementary.js";
import { assembleResponse } from "../shared/response/assembleResponse.js";
import { restrictTo } from "../shared/response/visibility.js";
import { buildTranslationsMap, pickFromMap } from "./shared/i18n.js";
import { shapeGeoRefs } from "./shared/geo.js";
import { buildThumbnailUrl, buildImageBadge } from "./shared/media.js";
import { toNumOrNull } from "./shared/numeric.js";

const CRUISE_GROUP_ORDER = ["main"];



/**
 * Shapes the raw cruise data into a summarized list item format.
 *
 * @param {Object} cruise - The raw cruise data from the database.
 * @param {string} lang - The language code for translations.
 * @returns {Object} The formatted cruise list item payload.
 */
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
      countries: shapeGeoRefs(cruise.countries, "countries_id", lang, { emptyValue: [] }),
      destinations: shapeGeoRefs(cruise.destinations, "destinations_id", lang, { codeKey: "media_code", emptyValue: [] }),
    },
    thumbnail: buildThumbnailUrl(cruise.media, lang),
    publishing_status: cruise.status_primarix ?? null,
    date_updated: ensureUtcSuffix(cruise.source_updated_at),
  };
}

/**
 * Shapes the raw cruise data into a comprehensive detail format.
 * Aggregates translations, pricing, cabin categories, schedules, and metadata.
 *
 * @param {Object} cruise - The raw cruise data from the database.
 * @param {string} lang - The language code for translations.
 * @param {Object} [options] - Configuration options.
 * @param {string} [options.audience] - The target audience (e.g., 'web', 'backoffice') to restrict data visibility.
 * @returns {Object} The formatted cruise detail payload.
 */
export function shapeCruiseDetail(cruise, lang, { audience } = {}) {
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
    deviating_cancellation_terms: t.deviating_cancellation_terms_selector ?? null,
    deviating_cancellation_terms_additions: t.deviating_cancellation_terms_text ?? null,
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
  const from_price = priceCalc?.from_price ?? null;

  const cabins = groupPrices2(
    cruise.cabin_categories ?? [],
    cruise.price_dates ?? [],
    cruise.prices ?? [],
    /* Occupancy naming is structured as a single flat `name` field rather than per-language translations. */
    (cruise.occupancies ?? [])
      .map((o) => {
        if (!o.occupancy) return null;
        return {
          ...o.occupancy,
          value: o.id,
          name: o.occupancy.name ?? null,
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
        /* Restrict sensitive internal booking codes and tour names to backoffice visibility only. */
        booking_code: restrictTo(cc.cabin_category_booking_code ?? null, "backoffice"),
        tour32_name: restrictTo(cc.cabin_category_tour32_name ?? null, "backoffice"),
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
    /* Top-level metadata is restricted to backoffice endpoints to prevent exposing internal system state to the public web. */
    { key: "id", group: "main", value: cruise.id, visibleTo: ["backoffice"] },
    { key: "object_id", group: "main", value: cruise.object_id ?? null, visibleTo: ["backoffice"] },
    { key: "publishing_status", group: "main", value: cruise.status_primarix ?? null, visibleTo: ["backoffice"] },
    { key: "date_updated", group: "main", value: ensureUtcSuffix(cruise.source_updated_at), visibleTo: ["backoffice"] },
    { key: "season", group: "main", value: cruise.season ? { id: cruise.season.id, name: cruise.season.season } : null },
    /* Explicitly reorder `name` to appear first in the response structure for web clients. */
    { key: "name", group: "main", value: price_info_translations?.name_cruise ?? null, order: { web: -20 } },
    { key: "classification", group: "main", value: {
        countries: shapeGeoRefs(cruise.countries, "countries_id", lang, { emptyValue: [] }),
        destinations: shapeGeoRefs(cruise.destinations, "destinations_id", lang, { codeKey: "media_code", emptyValue: [] }),
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
        /* `bord_languages` is expected to be an array of strings natively from the database. */
        bord_languages: Array.isArray(price_info_translations?.bord_languages)
          ? price_info_translations.bord_languages
          : price_info_translations?.bord_languages
            ? [price_info_translations.bord_languages]
            : [],
        bord_languages_additions: price_info_translations?.bord_languages_additions ?? null,
        surcharges: price_info_translations?.surcharges ?? null,
        services_included: price_info_translations?.services_included ?? null,
        services_not_included: price_info_translations?.services_not_included ?? null,
        /* Map `onboard_gratuities` from a flat string array into an array of objects to fulfill the contract shape. */
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
        /* Map `deviating_cancellation_terms` from a flat string array of codes into an array of objects to fulfill the contract shape. */
        deviating_cancellation_terms_select: Array.isArray(price_info_translations?.deviating_cancellation_terms)
          ? price_info_translations.deviating_cancellation_terms.map((t) =>
              typeof t === "string" ? { value: t } : t,
            )
          : [],
        deviating_cancellation_terms_text: price_info_translations?.deviating_cancellation_terms_additions ?? null,
        mobility_advice: price_info_translations?.mobility_advice_text ? { id: null, name: price_info_translations.mobility_advice_text } : null,
    } },
    { key: "attributes", group: "main", value: {
        participants_min: toNumOrNull(cruise?.participants_min),
        participants_max: toNumOrNull(cruise?.participants_max),
        week_min_before_start: toNumOrNull(cruise?.week_min_before_start),
    } },
    { key: "cabin_categories", group: "main", value: cabins },
    { key: "specials", group: "main", value: {
        special_description: specials_translations?.specials != null
          ? extractSpecialsDescription(specials_translations.specials)
          : null,
        /* Extract validity windows directly from the `specials` translation entries, as top-level columns are no longer used. */
        ...extractSpecialsValidity(specials_translations?.specials ?? null),
    } },
    { key: "image_badge", group: "main", value: buildImageBadge(cruise, badgeMap?.[lang]) },
    { key: "media", group: "main", value: buildImageUrls(cruise.media, lang) },
    { key: "pricing_config", group: "main", visibleTo: ["backoffice"], value: {
        buy_price_type: priceCalc?.buy_price_type ?? null,
        sell_price_type: priceCalc?.sell_price_type ?? null,
        percentage_type: priceCalc?.percentage_type ?? null,
        provision_percentage: toNumOrNull(priceCalc?.provision_percentage),
        margin_percentage: toNumOrNull(priceCalc?.margin_percentage),
        exchange_rate: toExchangeRateObject(priceCalc?.exchange_rate),
        from_price: toNumOrNull(from_price),
    } },
    { key: "internal", group: "main", visibleTo: ["backoffice"], value: {
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
    audience,
  });
}
