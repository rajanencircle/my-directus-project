import { ensureUtcSuffix } from "../utils/timestamps.js";
import { buildImageUrls } from "../utils/images.js";
import { assembleResponse } from "../shared/response/assembleResponse.js";
import { restrictTo } from "../shared/response/visibility.js";
import { toSupplementaryBlocks, extractSpecialsDescription } from "../utils/supplementary.js";
import { buildThumbnailUrl, buildImageBadge } from "./shared/media.js";
import { toNumOrNull } from "./shared/numeric.js";
import {
  buildPricingConfig,
  fromRawPriceCalc,
  fromRawSurchargeCalc,
} from "./shared/pricing.js";
import { geoRef } from "./shared/geo.js";
import {
  toExchangeRateObject,
  buildTranslationsMap,
  pickFromMap,
  getCompanyConditionsRow,
  shapeRentalCompany,
  shapeDepot,
  buildDepotZones,
  buildRentalZones,
  shapeRentalSurcharges,
} from "./shared/vehicle.js";

const RENTALCAR_GROUP_ORDER = ["main"];

/**
 * Shapes the raw rental car data into a summarized list item format.
 *
 * @param {Object} rentalCar - The raw rental car data from the database.
 * @param {string} lang - The language code for translations.
 * @returns {Object} The formatted rental car list item payload.
 */
export function shapeRentalCarListItem(rentalCar, lang) {
  return {
    id: rentalCar.id,
    object_id: rentalCar.object_id ?? null,
    name: rentalCar.name_vehicle ?? null,
    geo: {
      country: geoRef(rentalCar.rental_company?.country, lang),
      place: geoRef(rentalCar.rental_company?.place, lang),
    },
    thumbnail: buildThumbnailUrl(rentalCar.media, lang),
    publishing_status: rentalCar.status_primarix ?? null,
    date_updated: ensureUtcSuffix(rentalCar.source_updated_at),
  };
}

/**
 * Shapes the raw rental car data into a comprehensive detail format.
 * Aggregates translations, pricing, depots, rental zones, and metadata.
 *
 * @param {Object} rentalCar - The raw rental car data from the database.
 * @param {string} lang - The language code for translations.
 * @param {Object} [options] - Configuration options.
 * @param {string} [options.audience] - The target audience (e.g., 'web', 'backoffice') to restrict data visibility.
 * @returns {Object} The formatted rental car detail payload.
 */
export function shapeRentalCarDetail(rentalCar, lang, { audience } = {}) {
  const descMap = buildTranslationsMap(
    rentalCar.descriptions_translations,
    (t) => ({
      subline: t.subline ?? null,
      teaser: t.teaser ?? null,
      description: t.description ?? null,
      equipment: t.equipment ?? null,
      bond: t.bond ?? null,
      description_supplementary: t.description_supplementary ?? null,
    }),
  );
  const badgeMap = buildTranslationsMap(
    rentalCar.image_badge_translations,
    (t) => ({
      image_badge_teaser: t.image_badge_teaser ?? null,
      image_badge_details: t.image_badge_details ?? null,
    }),
  );
  const specialsMap = buildTranslationsMap(
    rentalCar.rental_company?.specials_translations,
    (t) => ({
      specials: t.specials ?? [],
    }),
  );

  const translations = pickFromMap(descMap, lang);
  const activeSpecials = pickFromMap(specialsMap, lang);
  const priceCalc = rentalCar.price_calculation;
  const surchargeCalc = rentalCar.surcharge_calculation;
  const rentalCompany = rentalCar.rental_company;
  const companyConditions = getCompanyConditionsRow(rentalCompany, lang);

  const fieldDefs = [
    /* Top-level metadata is restricted to backoffice endpoints to prevent exposing internal system state to the public web.
     * Note: The `name` field is fully restricted, as the title comes from the product envelope for rental cars. */
    { key: "id", group: "main", value: rentalCar.id, visibleTo: ["backoffice"] },
    { key: "object_id", group: "main", value: rentalCar.object_id ?? null, visibleTo: ["backoffice"] },
    {
      key: "publishing_status",
      group: "main",
      value: rentalCar.status_primarix ?? null,
      visibleTo: ["backoffice"],
    },
    {
      key: "date_updated",
      group: "main",
      value: ensureUtcSuffix(rentalCar.source_updated_at),
      visibleTo: ["backoffice"],
    },
    {
      key: "season",
      group: "main",
      value: rentalCar.rental_company?.season
        ? { id: rentalCar.rental_company.season.id, name: rentalCar.rental_company.season.season ?? null }
        : null,
    },
    { key: "name", group: "main", value: rentalCar.name_vehicle ?? null, visibleTo: ["backoffice"] },
    { key: "rental_type", group: "main", value: rentalCar.rental_type ?? null, visibleTo: ["backoffice"] },
    {
      key: "category",
      group: "main",
      value: rentalCar.category
        ? { id: rentalCar.category.id, name: rentalCar.category.name }
        : null,
    },
    {
      key: "supplier_product_code",
      group: "main",
      value: rentalCar.supplier_product_code ?? null,
      visibleTo: ["backoffice"],
    },
    {
      key: "depot_availability",
      group: "main",
      value: rentalCar.depot_availability ?? null,
    },
    {
      key: "attributes",
      group: "main",
      value: {
        drive_type: rentalCar.drive_type ?? null,
        persons_max:
          toNumOrNull(rentalCar?.persons_max),
        suitcase_big:
          toNumOrNull(rentalCar?.suitcase_big),
        suitcase_small:
          toNumOrNull(rentalCar?.suitcase_small),
      },
    },
    {
      key: "descriptions",
      group: "main",
      value: {
        subline: translations?.subline ?? null,
        teaser: translations?.teaser ?? null,
        description: translations?.description ?? null,
        equipment: translations?.equipment ?? null,
        bond: translations?.bond ?? null,
        supplementary: toSupplementaryBlocks(
          translations?.description_supplementary,
        ),
        descriptions_markdown: null,
      },
    },
    {
      key: "rental_company",
      group: "main",
      value: shapeRentalCompany(rentalCompany, lang),
    },
    {
      key: "depots",
      group: "main",
      value: (rentalCar.depots_selected ?? [])
        .map((d) => shapeDepot(d.rental_depots_id, lang))
        .filter(Boolean),
    },
    {
      key: "zones",
      group: "main",
      value: buildRentalZones(
        rentalCar.zones,
        rentalCar.price_periods,
        rentalCar.rental_periods,
        rentalCar.prices,
        priceCalc,
        buildDepotZones(rentalCar.depots_selected),
      ),
    },
    {
      key: "surcharges",
      group: "main",
      value: shapeRentalSurcharges(rentalCar.surcharges, lang, surchargeCalc),
    },
    { 
      key: "specials", 
      group: "main", 
      value: { special_description: activeSpecials?.specials != null ? extractSpecialsDescription(activeSpecials.specials) : null } 
    },
    {
      key: "image_badge",
      group: "main",
      value: buildImageBadge(rentalCar, badgeMap?.[lang]),
    },
    {
      key: "media",
      group: "main",
      value: buildImageUrls(rentalCar.media, lang),
    },
    {
      key: "pricing_config",
      group: "main",
      visibleTo: ["backoffice"],
      value: buildPricingConfig({
        settings: fromRawPriceCalc(priceCalc),
        surchargeSettings: fromRawSurchargeCalc(surchargeCalc),
        exchangeRate: toExchangeRateObject(priceCalc?.exchange_rate),
        fromPrice: toNumOrNull(priceCalc?.from_price),
        surchargeExchangeRate: toExchangeRateObject(
          surchargeCalc?.surcharge_exchange_rate,
        ),
      }),
    },
    {
      key: "sell_prices_status",
      group: "main",
      value: rentalCompany?.sell_prices_status ?? null,
      visibleTo: ["backoffice"],
    },
    {
      key: "sell_prices_updated_at",
      group: "main",
      value: ensureUtcSuffix(rentalCompany?.sell_prices_updated_at),
      visibleTo: ["backoffice"],
    },

    /* Rental car-specific physical details and conditions mapped for the client output, sourced from the rental company conditions. */
    {
      key: "rental_car",
      group: "main",
      value: rentalCompany
        ? {
            conditions_hotel_delivery:
              companyConditions?.conditions_hotel_delivery ?? null,
            conditions_pickup_airport_ferry:
              companyConditions?.conditions_pickup_airport_ferry ?? null,
            conditions_toll: companyConditions?.conditions_toll ?? null,
            conditions_ferry: companyConditions?.conditions_ferry ?? null,
          }
        : {
            conditions_hotel_delivery: null,
            conditions_pickup_airport_ferry: null,
            conditions_toll: null,
            conditions_ferry: null,
          },
    },
  ];

  return assembleResponse({
    fieldDefs,
    groupOrder: RENTALCAR_GROUP_ORDER,
    audience,
  });
}
