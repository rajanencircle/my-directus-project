import { toExchangeRateObject } from "../../utils/prices.js";
import { toSupplementaryBlocks } from "../../utils/supplementary.js";
import { buildTranslationsMap, pickFromMap } from "./i18n.js";
import { geoRef, getGeoName } from "./geo.js";
import { restrictTo } from "../../shared/response/visibility.js";

/**
 * Shared shaping logic for the "vehicles" Directus collection, split by
 * rental_type into rental_car and camper transformers. Both used to reach
 * into rental_car.transformer.js's internals via a cross-import; this module
 * is the single source of truth for that shared shaping instead.
 */

export { toExchangeRateObject, geoRef, buildTranslationsMap, pickFromMap };

/**
 * @description Extracts and maps translated company conditions.
 *
 * Builds a translation map from `conditions_translations`, extracting insurance, deposit,
 * toll, ferry, and other rental condition texts. Returns the block matching the requested
 * language.
 *
 * This is used internally by `shapeRentalCompany`.
 * 
 * @param {Object} company - The raw company object.
 * @param {string} lang - The requested language code.
 * @returns {Object|null} The resolved conditions block.
 */
export function getCompanyConditionsRow(company, lang) {
  const condMap = buildTranslationsMap(
    company?.conditions_translations,
    (t) => ({
      conditions_driver: t.conditions_driver ?? null,
      conditions_licence: t.conditions_licence ?? null,
      conditions_calculation: t.conditions_calculation ?? null,
      conditions_oneway: t.conditions_oneway ?? null,
      has_multi_rental_discount: t.has_multi_rental_discount ?? null,
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

/**
 * @description Shapes the complete rental company information block.
 *
 * Gathers descriptions, conditions, and price information via translation maps. Contact
 * details and geographic references are formatted, and sensitive fields (like
 * `internal_remarks` and `booking_channel`) are restricted to the backoffice audience with
 * `restrictTo`.
 *
 * The camper and rental car detail transformers use this to build the provider/company block.
 * 
 * @param {Object} company - The raw company data.
 * @param {string} lang - The requested language code.
 * @returns {Object|null} The formatted rental company block.
 */
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
      has_multi_rental_discount: !!cond?.has_multi_rental_discount,
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
    /* Restrict sensitive company data (e.g. internal remarks, tour32 ids) to backoffice endpoints. */
    location_tour32: restrictTo(
      company.location_tour32
        ? {
            id: company.location_tour32.id,
            name: getGeoName(company.location_tour32, lang),
          }
        : null,
      "backoffice",
    ),
    object_info_primarix: restrictTo(
      company.object_info_primarix ?? null,
      "backoffice",
    ),
    internal_remarks: restrictTo(
      company.internal_remarks ?? null,
      "backoffice",
    ),
    booking_channel: restrictTo(company.booking_channel ?? null, "backoffice"),
    booking_partner: restrictTo(
      company.booking_partner
        ? {
            id: company.booking_partner.id ?? null,
            name: company.booking_partner.name_agency ?? null,
          }
        : null,
      "backoffice",
    ),
    email_booking: restrictTo(company.email_booking ?? null, "backoffice"),
    internal_remarks_reservation: restrictTo(
      company.booking_partner?.internal_remarks_reservation ?? null,
      "backoffice",
    ),
  };
}

/**
 * @description Shapes a vehicle depot (pickup/dropoff location).
 *
 * Extracts basic details like name, category, and address. It also retrieves office hours
 * translations and secures internal identifiers (such as `object_id` and `status`) for
 * backoffice-only visibility.
 *
 * The camper and rental car transformers use this to map their `depots_selected` junction arrays.
 * 
 * @param {Object} depot - The raw depot object.
 * @param {string} lang - The requested language code.
 * @returns {Object|null} The formatted depot block.
 */
export function shapeDepot(depot, lang) {
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
    /* Restrict sensitive depot data to backoffice endpoints. */
    object_id: restrictTo(depot.object_id ?? null, "backoffice"),
    status: restrictTo(depot.status_primarix ?? null, "backoffice"),
    rental_company: restrictTo(
      depot.rental_company
        ? {
            id: depot.rental_company.id ?? null,
            name: depot.rental_company.name_company ?? null,
          }
        : null,
      "backoffice",
    ),
  };
}

/**
 * @description Extracts unique rental zones from an array of depots.
 *
 * Iterates over the selected depots and stores unique `rental_zone` assignments in a map to
 * avoid duplicates, then returns them as an array.
 *
 * This is used to discover which dynamic pricing zones actually apply to the vehicle based on
 * its selected depots.
 * 
 * @param {Array<Object>} depotsSelected - Array of selected depots.
 * @returns {Array<Object>} Array of unique rental zones.
 */
export function buildDepotZones(depotsSelected) {
  const map = new Map();
  for (const d of depotsSelected ?? []) {
    const zone = d.rental_depots_id?.rental_zone;
    if (zone?.id != null && !map.has(zone.id)) {
      map.set(zone.id, { id: zone.id, name: zone.name ?? null });
    }
  }
  return [...map.values()];
}

/**
 * @description Constructs the hierarchical `rental_zones` pricing structure for vehicles.
 *
 * Groups prices first by zone ID, then by price period. Every defined zone is guaranteed to
 * appear in the payload, even when it has no pricing rows (preventing silent drops). Durations
 * are formatted and the `buy` and `margin` fields are restricted to the backoffice audience.
 *
 * The camper and rental car transformers use this to assemble their matrix of prices that
 * vary by zone, season, and rental duration.
 * 
 * @param {Array} zones - Array of rental zones.
 * @param {Array} pricePeriods - Array of price period definitions.
 * @param {Array} rentalPeriods - Array of rental duration buckets.
 * @param {Array} prices - The raw flat `vehicles_prices` rows (buy price + zone granularity).
 * @param {number|null} marginPct - The resolved margin percentage for the active language.
 * @param {Array} [depotZones=[]] - Zones derived from `buildDepotZones`.
 * @param {Array} [rentalCompanyPrices=[]] - The parallel `rental_companies_prices` rows (keyed
 *   by vehicle + price_period + rental_period, no zone dimension) — the only place sell price
 *   for the vehicle price matrix actually lives; matched onto each `vehicles_prices` cell by
 *   (price_period, rental_period), since sell doesn't vary by zone in this data model.
 * @param {string} [lang] - Active language, used to resolve `rentalCompanyPrices`' sell price.
 * @returns {Array<Object>} The nested rental zones payload.
 */
export function buildRentalZones(
  zones,
  pricePeriods,
  rentalPeriods,
  prices,
  marginPct,
  depotZones = [],
  rentalCompanyPrices = [],
  lang,
) {
  const zoneMap = Object.fromEntries((zones ?? []).map((z) => [z.id, z]));
  /* depots_selected.rental_depots_id.rental_zone is the real per-depot zone assignment —
   * prefer its id/name over the vehicles_rental_zones lookup above when both exist. */
  for (const dz of depotZones) {
    if (dz?.id != null) zoneMap[dz.id] = dz;
  }
  const periodMap = Object.fromEntries(
    (pricePeriods ?? []).map((p) => [p.id, p]),
  );
  const rentalPeriodMap = Object.fromEntries(
    (rentalPeriods ?? []).map((rp) => [rp.id, rp]),
  );

  const resolvedMarginPct =
    marginPct !== undefined && marginPct !== null ? parseFloat(marginPct) : null;

  const sellByPeriodKey = new Map();
  for (const rcp of rentalCompanyPrices ?? []) {
    const sellMap = buildTranslationsMap(rcp.prices_translations, (t) => ({
      sell: t.sell_price ?? null,
    }));
    const active = pickFromMap(sellMap, lang);
    if (active?.sell !== null && active?.sell !== undefined) {
      sellByPeriodKey.set(`${rcp.price_period_id}:${rcp.rental_period_id}`, active.sell);
    }
  }

  const byZone = {};
  for (const p of prices ?? []) {
    const zoneId = p.rental_zone ?? "__none__";
    const periodId = p.price_period;
    if (periodId === null || periodId === undefined) continue;
    if (!byZone[zoneId]) byZone[zoneId] = {};
    if (!byZone[zoneId][periodId]) byZone[zoneId][periodId] = [];
    byZone[zoneId][periodId].push(p);
  }
  /* Every depot's zone must show up in the array even when no price row carries that
   * zone id — otherwise a depot's zone silently disappears from the response. */
  for (const dz of depotZones) {
    if (dz?.id != null && !byZone[dz.id]) byZone[dz.id] = {};
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
              sell: (() => {
                const sell = sellByPeriodKey.get(`${p.price_period}:${p.rental_period}`);
                return sell !== undefined ? parseFloat(sell) : null;
              })(),
              /* Restrict internal pricing data (buy rates, margins) to backoffice endpoints. */
              buy: restrictTo(
                p.buy_price !== null && p.buy_price !== undefined
                  ? parseFloat(p.buy_price)
                  : null,
                "backoffice",
              ),
              margin: restrictTo(resolvedMarginPct, "backoffice"),
            };
          }),
        };
      }),
    };
  });
}

/**
 * @description Shapes the array of vehicle surcharges.
 *
 * Translates the surcharge descriptions and extracts the calculation logic. The `type`,
 * `calc_type`, `buy`, and `margin` fields are explicitly hidden from public web requests
 * using `restrictTo`.
 *
 * This is used by the camper and rental car detail transformers.
 * 
 * @param {Array<Object>} surcharges - The raw surcharges array.
 * @param {string} lang - The requested language code.
 * @param {Object} surchargeCalc - The surcharge calculation configuration.
 * @returns {Array<Object>} The formatted surcharges array.
 */
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
        sell_price: t.sell_price ?? null,
      }),
    );
    const active = pickFromMap(translationsMap, lang) ?? {};
    return {
      booking_name: s.surcharge_booking_name ?? null,
      description: active.description ?? null,
      sell: active.sell_price !== null && active.sell_price !== undefined ? parseFloat(active.sell_price) : null,
      /* Restrict internal pricing and calculation data to backoffice endpoints.
       * The public web payload only receives booking_name, description, and sell.
       * surcharge_type/surcharge_calc_type are real m2o relations (-> mandatory /
       * calculation_method), not plain strings — read the resolved id/designation. */
      type: restrictTo(
        s.surcharge_type
          ? { id: s.surcharge_type.id, name: s.surcharge_type.designation ?? null }
          : null,
        "backoffice",
      ),
      calc_type: restrictTo(
        s.surcharge_calc_type
          ? { id: s.surcharge_calc_type.id, name: s.surcharge_calc_type.designation ?? null }
          : null,
        "backoffice",
      ),
      buy: restrictTo(
        s.buy_price !== null && s.buy_price !== undefined ? parseFloat(s.buy_price) : null,
        "backoffice",
      ),
      margin: restrictTo(marginPct, "backoffice"),
    };
  });
}
