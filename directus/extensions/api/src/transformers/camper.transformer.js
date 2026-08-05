import { ensureUtcSuffix } from "../utils/timestamps.js";
import { buildImageUrls } from "../utils/images.js";
import { toSupplementaryBlocks, extractSpecialsDescription } from "../utils/supplementary.js";
import { assembleResponse } from "../shared/response/assembleResponse.js";
import { buildDenylist } from "../shared/response/denylist.js";
import {
  buildTranslationsMap,
  pickFromMap,
  shapeRentalCompany,
  shapeDepot,
  buildRentalZones,
  shapeRentalSurcharges,
  getCompanyConditionsRow,
  geoRef,
  toExchangeRateObject,
} from "./rental_car.transformer.js";

const CAMPER_GROUP_ORDER = ["main"];
const CAMPER_DENYLIST = buildDenylist("vehicle");

const CONSUMED_SOURCE_KEYS = [
  "id",
  "object_id",
  "status_primarix",
  "partner_visibility",
  "rental_type",
  "name_vehicle",
  "supplier_product_code",
  "depot_availability",
  "drive_type",
  "persons_max",
  "suitcase_big",
  "suitcase_small",
  "image_badge_status",
  "image_badge_start_date",
  "image_badge_end_date",
  "date_created",
  "date_updated",
  "user_created",
  "user_updated",
  "rental_company",
  "category",
  "descriptions_translations",
  "image_badge_translations",
  "depots_selected",
  "partner_selected",
  "media",
  "season",
  "camper_specs",
  "surcharges",
  "zones",
  "price_periods",
  "rental_periods",
  "prices",
  "price_calculation",
  "surcharge_calculation",
];

export function shapeCamperListItem(camper, lang) {
  return {
    id: camper.id,
    object_id: camper.object_id ?? null,
    name: camper.name_vehicle ?? null,
    geo: {
      country: geoRef(camper.rental_company?.country, lang),
      place: geoRef(camper.rental_company?.place, lang),
    },
    thumbnail: (() => {
      const u = buildImageUrls(camper.media, lang)?.[0]?.url;
      return u ? `${u}?width=400&height=300&fit=cover` : null;
    })(),
    publishing_status: camper.status_primarix ?? null,
    date_updated: ensureUtcSuffix(camper.date_updated),
  };
}

export function shapeCamperDetail(camper, lang) {
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
    { key: "id", group: "main", value: camper.id },
    { key: "object_id", group: "main", value: camper.object_id ?? null },
    {
      key: "publishing_status",
      group: "main",
      value: camper.status_primarix ?? null,
    },
    {
      key: "date_updated",
      group: "main",
      value: ensureUtcSuffix(camper.date_updated),
    },
    { key: "season", group: "main", value: null },
    { key: "name", group: "main", value: camper.name_vehicle ?? null },
    { key: "rental_type", group: "main", value: camper.rental_type ?? null },
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
          camper.persons_max !== undefined && camper.persons_max !== null
            ? Number(camper.persons_max)
            : null,
        suitcase_big:
          camper.suitcase_big !== undefined && camper.suitcase_big !== null
            ? Number(camper.suitcase_big)
            : null,
        suitcase_small:
          camper.suitcase_small !== undefined && camper.suitcase_small !== null
            ? Number(camper.suitcase_small)
            : null,
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
        .map((d) =>
          shapeDepot(
            d.rental_depots_id,
            rentalCompany?.id,
            rentalCompany?.name_company,
            lang,
          ),
        )
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
      value: camper.image_badge_status
        ? {
            teaser: badgeMap?.[lang]?.image_badge_teaser ?? null,
            details: badgeMap?.[lang]?.image_badge_details ?? null,
            start_date: camper.image_badge_start_date ?? null,
            end_date: camper.image_badge_end_date ?? null,
            status: camper.image_badge_status ?? null,
          }
        : null,
    },
    { key: "media", group: "main", value: buildImageUrls(camper.media, lang) },
    {
      key: "pricing_config",
      group: "main",
      value: {
        buy_price_type: priceCalc?.buy_price_type ?? null,
        sell_price_type: priceCalc?.sell_price_type ?? null,
        percentage_type: priceCalc?.percentage_type ?? null,
        provision_percentage:
          priceCalc?.provision_percentage !== undefined &&
          priceCalc?.provision_percentage !== null
            ? Number(priceCalc.provision_percentage)
            : null,
        margin_percentage:
          priceCalc?.margin_percentage !== undefined &&
          priceCalc?.margin_percentage !== null
            ? Number(priceCalc.margin_percentage)
            : null,
        exchange_rate: toExchangeRateObject(priceCalc?.exchange_rate),
        from_price:
          priceCalc?.from_price !== undefined && priceCalc?.from_price !== null
            ? Number(priceCalc.from_price)
            : null,
        surcharge_percentage_type:
          surchargeCalc?.surcharge_percentage_type ?? null,
        surcharge_provision_percentage:
          surchargeCalc?.surcharge_provision_percentage !== undefined &&
          surchargeCalc?.surcharge_provision_percentage !== null
            ? Number(surchargeCalc.surcharge_provision_percentage)
            : null,
        surcharge_margin_percentage:
          surchargeCalc?.surcharge_margin_percentage !== undefined &&
          surchargeCalc?.surcharge_margin_percentage !== null
            ? Number(surchargeCalc.surcharge_margin_percentage)
            : null,
        surcharge_exchange_rate: toExchangeRateObject(
          surchargeCalc?.surcharge_exchange_rate,
        ),
      },
    },
    {
      key: "sell_prices_status",
      group: "main",
      value: rentalCompany?.sell_prices_status ?? null,
    },
    {
      key: "sell_prices_updated_at",
      group: "main",
      value: ensureUtcSuffix(rentalCompany?.sell_prices_updated_at),
    },

    // CamperDetails
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
    rawItem: camper,
    consumedSourceKeys: CONSUMED_SOURCE_KEYS,
    denylist: CAMPER_DENYLIST,
  });
}
