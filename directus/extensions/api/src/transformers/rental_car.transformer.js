import { LOCALE_TO_ISO } from "../maps/language-code.map.js";
import { ensureUtcSuffix } from "../utils/timestamps.js";
import { toExchangeRateObject } from "../utils/prices.js";
import { buildImageUrls } from "../utils/images.js";
import { assembleResponse } from "../shared/response/assembleResponse.js";
import { buildDenylist } from "../shared/response/denylist.js";
import { toSupplementaryBlocks, extractSpecialsDescription } from "../utils/supplementary.js";

const RENTALCAR_GROUP_ORDER = ["main"];
const RENTALCAR_DENYLIST = buildDenylist("vehicle");

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

export function getLocaleCode(translationsId) {
  return typeof translationsId === "object"
    ? translationsId?.code
    : translationsId;
}

export function buildTranslationsMap(rows, pickFields) {
  const map = {};
  for (const row of rows ?? []) {
    const locale = getLocaleCode(row.translations_id);
    const iso = LOCALE_TO_ISO[locale];
    if (!iso) continue;
    map[iso] = pickFields(row);
  }
  return map;
}

export function pickFromMap(translationsMap, lang) {
  if (!translationsMap || Object.keys(translationsMap).length === 0)
    return null;
  if (lang && translationsMap[lang]) return translationsMap[lang];
  return null;
}

// Source tables store only a bare rate with no currency; the contract wants an object.
// currency is null when the source doesn't provide it (only tours store a currency).
export { toExchangeRateObject };

function getGeoName(geo, lang) {
  if (!geo) return null;
  const map = buildTranslationsMap(geo.translations, (t) => t.name ?? null);
  return pickFromMap(map, lang) ?? geo.name ?? null;
}

export function geoRef(geo, lang) {
  return geo
    ? { id: geo.id, name: getGeoName(geo, lang) ?? null, code: geo.ISO ?? null }
    : null;
}

export function getCompanyConditionsRow(company, lang) {
  const condMap = buildTranslationsMap(
    company?.conditions_translations,
    (t) => ({
      conditions_driver: t.conditions_driver ?? null,
      conditions_licence: t.conditions_licence ?? null,
      conditions_calculation: t.conditions_calculation ?? null,
      conditions_oneway: t.conditions_oneway ?? null,
      conditions_multi_rental_discount:
        t.conditions_multi_rental_discount ?? null,
      conditions_restricted_area: t.conditions_restricted_area ?? null,
      conditions_border_crossing: t.conditions_border_crossing ?? null,
      conditions_insurance: t.conditions_insurance ?? null,
      conditions_insurance_options: t.conditions_insurance_options ?? null,
      conditions_all_inclusive: t.conditions_all_inclusive ?? null,
      conditions_insurance_exclusions:
        t.conditions_insurance_exclusions ?? null,
      conditions_deposit: t.conditions_deposit ?? null,
      minimum_rental_text: t.minimum_rental_text ?? null,
      conditions_notes: t.conditions_notes ?? null,
      conditions_hotel_delivery: t.conditions_hotel_delivery ?? null,
      conditions_pickup_airport_ferry:
        t.conditions_pickup_airport_ferry ?? null,
      conditions_toll: t.conditions_toll ?? null,
      conditions_ferry: t.conditions_ferry ?? null,
      conditions_towaway: t.conditions_towaway ?? null,
      conditions_supplementary: t.conditions_supplementary ?? null,
    }),
  );
  return pickFromMap(condMap, lang);
}

export function shapeRentalCompany(company, lang) {
  if (!company) return null;

  const descMap = buildTranslationsMap(
    company.descriptions_translations,
    (t) => ({
      subline: t.subline ?? null,
      teaser: t.teaser ?? null,
      text_positive: t.text_positive ?? null,
      text_negative: t.text_negative ?? null,
      description_supplementary: t.description_supplementary ?? null,
    }),
  );
  const desc = pickFromMap(descMap, lang);

  const cond = getCompanyConditionsRow(company, lang);

  const priceInfoMap = buildTranslationsMap(
    company.price_infos_translations,
    (t) => ({
      price_type: t.price_type ?? null,
      flex_price_text: t.flex_price_text ?? null,
      services_included: t.services_included ?? null,
      services_not_included: t.services_not_included ?? null,
      services_optional: t.services_optional ?? null,
      deviating_cancellation_terms: t.deviating_cancellation_terms ?? null,
      important_information: t.important_information ?? null,
      price_infos_supplementary: t.price_infos_supplementary ?? null,
      mobility_advice_text: t.mobility_advice_text ?? null,
    }),
  );
  const priceInfo = pickFromMap(priceInfoMap, lang);

  return {
    name_company: company.name_company ?? null,
    rental_type: company.rental_type ?? null,
    street: company.street ?? null,
    street_number: company.street_number ?? null,
    zip_code: company.zip_code ?? null,
    place: geoRef(company.place, lang),
    state: geoRef(company.state, lang),
    country: geoRef(company.country, lang),
    phone_general: company.phone_general ?? null,
    phone_after_hours: company.phone_after_hours ?? null,
    email_general: company.email_general ?? null,
    website: company.website ?? null,
    countries: (company.countries ?? [])
      .map((c) => c.countries_id)
      .filter(Boolean)
      .map((c) => geoRef(c, lang)),
    subline: desc?.subline ?? null,
    teaser: desc?.teaser ?? null,
    text_positive: desc?.text_positive ?? null,
    text_negative: desc?.text_negative ?? null,
    description_supplementary: toSupplementaryBlocks(
      desc?.description_supplementary,
    ),
    conditions: {
      minimum_rental_days:
        company.minimum_rental_days !== undefined &&
        company.minimum_rental_days !== null
          ? Number(company.minimum_rental_days)
          : null,
      conditions_calculation_day: company.conditions_calculation_day ?? null,
      conditions_calculation_season:
        company.conditions_calculation_season ?? null,
      conditions_driver: cond?.conditions_driver ?? null,
      conditions_licence: cond?.conditions_licence ?? null,
      conditions_calculation: cond?.conditions_calculation ?? null,
      conditions_oneway: cond?.conditions_oneway ?? null,
      has_multi_rental_discount: !!company.has_multi_rental_discount,
      conditions_multi_rental_discount:
        cond?.conditions_multi_rental_discount ?? null,
      conditions_restricted_area: cond?.conditions_restricted_area ?? null,
      conditions_border_crossing: cond?.conditions_border_crossing ?? null,
      conditions_insurance: cond?.conditions_insurance ?? null,
      conditions_insurance_options: cond?.conditions_insurance_options ?? null,
      conditions_all_inclusive: cond?.conditions_all_inclusive ?? null,
      conditions_insurance_exclusions:
        cond?.conditions_insurance_exclusions ?? null,
      conditions_deposit: cond?.conditions_deposit ?? null,
      minimum_rental_text: cond?.minimum_rental_text ?? null,
      conditions_notes: cond?.conditions_notes ?? null,
      supplementary: toSupplementaryBlocks(cond?.conditions_supplementary),
      conditions_markdown: null,
    },
    price_info: {
      price_type: priceInfo?.price_type ?? null,
      flex_price_text: priceInfo?.flex_price_text ?? null,
      services_included: priceInfo?.services_included ?? null,
      services_not_included: priceInfo?.services_not_included ?? null,
      services_optional: priceInfo?.services_optional ?? null,
      deviating_cancellation_terms:
        priceInfo?.deviating_cancellation_terms ?? null,
      important_information: priceInfo?.important_information ?? null,
      supplementary: toSupplementaryBlocks(
        priceInfo?.price_infos_supplementary,
      ),
      price_info_markdown: null,
      mobility_advice: priceInfo?.mobility_advice_text
        ? { id: null, name: priceInfo.mobility_advice_text }
        : null,
    },
    location_tour32: company.location_tour32
      ? {
          id: company.location_tour32.id,
          name: getGeoName(company.location_tour32, lang),
        }
      : null,
    object_info_primarix: company.object_info_primarix ?? null,
    internal_remarks: company.internal_remarks ?? null,
    booking_channel: company.booking_channel ?? null,
    booking_partner: company.booking_partner
      ? {
          id: company.booking_partner.id ?? null,
          name: company.booking_partner.name_agency ?? null,
        }
      : null,
    email_booking: company.email_booking ?? null,
    internal_remarks_reservation: company.internal_remarks_reservation ?? null,
  };
}

export function shapeDepot(depot, rentalCompanyId, rentalCompanyName, lang) {
  if (!depot) return null;
  const officeHoursMap = buildTranslationsMap(
    depot.office_hours_translations,
    (t) => t.office_hours_deviating ?? null,
  );
  return {
    name_depot: depot.name_depot ?? null,
    category: depot.category
      ? { id: depot.category.id, name: depot.category.name ?? null }
      : null,
    rental_zone: depot.rental_zone
      ? { id: depot.rental_zone.id, name: depot.rental_zone.name ?? null }
      : null,
    street: depot.street ?? null,
    street_number: depot.street_number ?? null,
    zip_code: depot.zip_code ?? null,
    place: geoRef(depot.place, lang),
    state: geoRef(depot.state, lang),
    country: geoRef(depot.country, lang),
    phone_general: depot.phone_general ?? null,
    email: depot.email ?? null,
    office_hours_deviating: pickFromMap(officeHoursMap, lang),
    object_id: depot.object_id ?? null,
    status: depot.status_primarix ?? null,
    rental_company: depot.id
      ? { id: rentalCompanyId ?? null, name: rentalCompanyName ?? null }
      : null,
  };
}

export function buildRentalZones(
  zones,
  pricePeriods,
  rentalPeriods,
  prices,
  priceCalc,
) {
  const zoneMap = Object.fromEntries((zones ?? []).map((z) => [z.id, z]));
  const periodMap = Object.fromEntries(
    (pricePeriods ?? []).map((p) => [p.id, p]),
  );
  const rentalPeriodMap = Object.fromEntries(
    (rentalPeriods ?? []).map((rp) => [rp.id, rp]),
  );

  const marginPct =
    priceCalc?.margin_percentage !== undefined &&
    priceCalc?.margin_percentage !== null
      ? parseFloat(priceCalc.margin_percentage)
      : null;

  const byZone = {};
  for (const p of prices ?? []) {
    const zoneId = p.rental_zone ?? "__none__";
    const periodId = p.price_period;
    if (periodId === null || periodId === undefined) continue;
    if (!byZone[zoneId]) byZone[zoneId] = {};
    if (!byZone[zoneId][periodId]) byZone[zoneId][periodId] = [];
    byZone[zoneId][periodId].push(p);
  }

  return Object.entries(byZone).map(([zoneId, periodsMap]) => {
    const zone = zoneMap[zoneId];
    return {
      zone: zone ? { id: zone.id, name: zone.name ?? null } : null,
      periods: Object.entries(periodsMap).map(([periodId, priceRows]) => {
        const period = periodMap[periodId];
        return {
          period: {
            start: period?.price_period_start ?? null,
            end: period?.price_period_end ?? null,
            from: !!period?.price_period_from,
          },
          prices: priceRows.map((p) => {
            const rp = rentalPeriodMap[p.rental_period];
            return {
              depot_category: rp?.rental_period_depot_category
                ? {
                    id: rp.rental_period_depot_category.id,
                    name: rp.rental_period_depot_category.name ?? null,
                  }
                : null,
              duration_min:
                rp?.rental_period_min !== undefined &&
                rp?.rental_period_min !== null
                  ? Number(rp.rental_period_min)
                  : null,
              duration_max:
                rp?.rental_period_max !== undefined &&
                rp?.rental_period_max !== null
                  ? Number(rp.rental_period_max)
                  : null,
              duration_label: rp?.rental_period_duration ?? null,
              duration_from: !!rp?.rental_period_from,
              sell: null,
              buy:
                p.buy_price !== null && p.buy_price !== undefined
                  ? parseFloat(p.buy_price)
                  : null,
              margin: marginPct,
            };
          }),
        };
      }),
    };
  });
}

export function shapeRentalSurcharges(surcharges, lang, surchargeCalc) {
  const marginPct =
    surchargeCalc?.surcharge_margin_percentage !== undefined &&
    surchargeCalc?.surcharge_margin_percentage !== null
      ? parseFloat(surchargeCalc.surcharge_margin_percentage)
      : null;

  return (surcharges ?? []).map((s) => {
    const translationsMap = buildTranslationsMap(
      s.surcharge_translations,
      (t) => ({
        description: t.surcharge_description ?? null,
      }),
    );
    const active = pickFromMap(translationsMap, lang) ?? {};
    return {
      booking_name: s.surcharge_booking_name ?? null,
      description: active.description ?? null,
      sell: null,
      type: s.surcharge_type ? { id: null, name: s.surcharge_type } : null,
      calc_type: s.surcharge_calc_type
        ? { id: null, name: s.surcharge_calc_type }
        : null,
      buy: null,
      margin: marginPct,
    };
  });
}

export function shapeRentalCarListItem(rentalCar, lang) {
  return {
    id: rentalCar.id,
    object_id: rentalCar.object_id ?? null,
    name: rentalCar.name_vehicle ?? null,
    geo: {
      country: geoRef(rentalCar.rental_company?.country, lang),
      place: geoRef(rentalCar.rental_company?.place, lang),
    },
    thumbnail: (() => {
      const u = buildImageUrls(rentalCar.media, lang)?.[0]?.url;
      return u ? `${u}?width=400&height=300&fit=cover` : null;
    })(),
    publishing_status: rentalCar.status_primarix ?? null,
    date_updated: ensureUtcSuffix(rentalCar.date_updated),
  };
}

export function shapeRentalCarDetail(rentalCar, lang) {
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
    { key: "id", group: "main", value: rentalCar.id },
    { key: "object_id", group: "main", value: rentalCar.object_id ?? null },
    {
      key: "publishing_status",
      group: "main",
      value: rentalCar.status_primarix ?? null,
    },
    {
      key: "date_updated",
      group: "main",
      value: ensureUtcSuffix(rentalCar.date_updated),
    },
    { key: "season", group: "main", value: null },
    { key: "name", group: "main", value: rentalCar.name_vehicle ?? null },
    { key: "rental_type", group: "main", value: rentalCar.rental_type ?? null },
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
          rentalCar.persons_max !== undefined && rentalCar.persons_max !== null
            ? Number(rentalCar.persons_max)
            : null,
        suitcase_big:
          rentalCar.suitcase_big !== undefined &&
          rentalCar.suitcase_big !== null
            ? Number(rentalCar.suitcase_big)
            : null,
        suitcase_small:
          rentalCar.suitcase_small !== undefined &&
          rentalCar.suitcase_small !== null
            ? Number(rentalCar.suitcase_small)
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
      value: (rentalCar.depots_selected ?? [])
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
        rentalCar.zones,
        rentalCar.price_periods,
        rentalCar.rental_periods,
        rentalCar.prices,
        priceCalc,
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
      value: rentalCar.image_badge_status
        ? {
            teaser: badgeMap?.[lang]?.image_badge_teaser ?? null,
            details: badgeMap?.[lang]?.image_badge_details ?? null,
            start_date: rentalCar.image_badge_start_date ?? null,
            end_date: rentalCar.image_badge_end_date ?? null,
            status: rentalCar.image_badge_status ?? null,
          }
        : null,
    },
    {
      key: "media",
      group: "main",
      value: buildImageUrls(rentalCar.media, lang),
    },
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

    // RentalCarConditions — sourced from the rental company's conditions (rental-car-only subset)
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
    rawItem: rentalCar,
    consumedSourceKeys: CONSUMED_SOURCE_KEYS,
    denylist: RENTALCAR_DENYLIST,
  });
}
