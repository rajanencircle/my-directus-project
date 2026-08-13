import { ensureUtcSuffix } from "../utils/timestamps.js";
import { buildImageUrls } from "../utils/images.js";
import { toSupplementaryBlocks, extractSpecialsDescription } from "../utils/supplementary.js";
import { assembleResponse } from "../shared/response/assembleResponse.js";
import { restrictTo } from "../shared/response/visibility.js";
import { buildThumbnailUrl, buildImageBadge } from "./shared/media.js";
import { toNumOrNull } from "./shared/numeric.js";
import {
  buildPricingConfig,
  fromRawPriceCalc,
  fromRawSurchargeCalc,
} from "./shared/pricing.js";
import { geoRef } from "./shared/geo.js";
import {
  buildTranslationsMap,
  pickFromMap,
  shapeRentalCompany,
  shapeDepot,
  buildRentalZones,
  buildDepotZones,
  shapeRentalSurcharges,
  getCompanyConditionsRow,
  toExchangeRateObject,
} from "./shared/vehicle.js";

const CAMPER_GROUP_ORDER = ["main"];

/**
 * Shapes the raw camper data into a summarized list item format.
 *
 * @param {Object} camper - The raw camper data from the database.
 * @param {string} lang - The language code for translations.
 * @returns {Object} The formatted camper list item payload.
 */
export function shapeCamperListItem(camper, lang) {
  return {
    id: camper.id,
    object_id: camper.object_id ?? null,
    name: camper.name_vehicle ?? null,
    geo: {
      country: geoRef(camper.rental_company?.country, lang),
      place: geoRef(camper.rental_company?.place, lang),
    },
    thumbnail: buildThumbnailUrl(camper.media, lang),
    publishing_status: camper.status_primarix ?? null,
    date_updated: ensureUtcSuffix(camper.source_updated_at),
  };
}

/**
 * Shapes the raw camper data into a comprehensive detail format.
 * Aggregates translations, pricing, depots, rental zones, and metadata.
 *
 * @param {Object} camper - The raw camper data from the database.
 * @param {string} lang - The language code for translations.
 * @param {Object} [options] - Configuration options.
 * @param {string} [options.audience] - The target audience (e.g., 'web', 'backoffice') to restrict data visibility.
 * @returns {Object} The formatted camper detail payload.
 */
export function shapeCamperDetail(camper, lang, { audience } = {}) {
  const descMap = buildTranslationsMap(
    camper.descriptions_translations,
    (t) => ({
      subline: t.subline ?? null,
      teaser: t.teaser ?? null,
      description: t.description ?? null,
      equipment: t.equipment ?? null,
      bond: t.bond ?? null,
      description_supplementary: t.description_supplementary ?? null,
      bedsize: t.bedsize ?? null,
      camping_equipment: t.camping_equipment ?? null,
    }),
  );
  const badgeMap = buildTranslationsMap(
    camper.image_badge_translations,
    (t) => ({
      image_badge_teaser: t.image_badge_teaser ?? null,
      image_badge_details: t.image_badge_details ?? null,
    }),
  );

  const specialsMap = buildTranslationsMap(
    camper.rental_company?.specials_translations,
    (t) => ({
      specials: t.specials ?? [],
    }),
  );

  const translations = pickFromMap(descMap, lang);
  const activeSpecials = pickFromMap(specialsMap, lang);
  const priceCalc = camper.price_calculation;
  const surchargeCalc = camper.surcharge_calculation;
  const rentalCompany = camper.rental_company;
  const companyConditions = getCompanyConditionsRow(rentalCompany, lang);

  const fieldDefs = [
    /* Top-level metadata is restricted to backoffice endpoints to prevent exposing internal system state to the public web. */
    { key: "id", group: "main", value: camper.id, visibleTo: ["backoffice"] },
    { key: "object_id", group: "main", value: camper.object_id ?? null, visibleTo: ["backoffice"] },
    {
      key: "publishing_status",
      group: "main",
      value: camper.status_primarix ?? null,
      visibleTo: ["backoffice"],
    },
    {
      key: "date_updated",
      group: "main",
      value: ensureUtcSuffix(camper.source_updated_at),
      visibleTo: ["backoffice"],
    },
    {
      key: "season",
      group: "main",
      value: camper.rental_company?.season
        ? { id: camper.rental_company.season.id, name: camper.rental_company.season.season ?? null }
        : null,
    },
    { key: "name", group: "main", value: camper.name_vehicle ?? null, visibleTo: ["backoffice"] },
    { key: "rental_type", group: "main", value: camper.rental_type ?? null, visibleTo: ["backoffice"] },
    {
      key: "category",
      group: "main",
      value: camper.category
        ? { id: camper.category.id, name: camper.category.name }
        : null,
    },
    {
      key: "supplier_product_code",
      group: "main",
      value: camper.supplier_product_code ?? null,
      visibleTo: ["backoffice"],
    },
    {
      key: "depot_availability",
      group: "main",
      value: camper.depot_availability ?? null,
    },
    {
      key: "attributes",
      group: "main",
      value: {
        drive_type: camper.drive_type ?? null,
        persons_max:
          toNumOrNull(camper?.persons_max),
        suitcase_big:
          toNumOrNull(camper?.suitcase_big),
        suitcase_small:
          toNumOrNull(camper?.suitcase_small),
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
      value: (camper.depots_selected ?? [])
        .map((d) => shapeDepot(d.rental_depots_id, lang))
        .filter(Boolean),
    },
    {
      key: "zones",
      group: "main",
      value: buildRentalZones(
        camper.zones,
        camper.price_periods,
        camper.rental_periods,
        camper.prices,
        priceCalc,
        buildDepotZones(camper.depots_selected),
      ),
    },
    {
      key: "surcharges",
      group: "main",
      value: shapeRentalSurcharges(camper.surcharges, lang, surchargeCalc),
    },
    { 
      key: "specials", 
      group: "main", 
      value: { special_description: activeSpecials?.specials != null ? extractSpecialsDescription(activeSpecials.specials) : null } 
    },
    {
      key: "image_badge",
      group: "main",
      value: buildImageBadge(camper, badgeMap?.[lang]),
    },
    { key: "media", group: "main", value: buildImageUrls(camper.media, lang) },
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

    /* Camper-specific physical details and conditions mapped for the client output. */
    {
      key: "camper",
      group: "main",
      value: {
        bedsize: translations?.bedsize ?? null,
        camping_equipment: translations?.camping_equipment ?? null,
        conditions_towaway: companyConditions?.conditions_towaway ?? null,
      },
    },
  ];

  return assembleResponse({
    fieldDefs,
    groupOrder: CAMPER_GROUP_ORDER,
    audience,
  });
}
