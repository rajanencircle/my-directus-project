import { buildDetailFields } from "../../shared/query/buildQueryFields.js";
import { enrichExchangeRates } from "../../utils/ratesResolver.js";
import { enrichDepotOfficeHours } from "../../utils/depotOfficeHours.js";
import { AppError } from "./AppError.js";
import { HTTP_STATUS } from "./constants.js";
import { buildPublishedStatusClauses, createScopedItemsService } from "./collectionFilters.js";

const SURCHARGES_COLLECTION = "vehicles_surcharges";
const ZONES_COLLECTION = "vehicles_rental_zones";
const PRICE_PERIODS_COLLECTION = "vehicles_price_periods";
const RENTAL_PERIODS_COLLECTION = "vehicles_rental_periods";
const PRICES_COLLECTION = "vehicles_prices";
/*
 * Pricing settings (margin, buy/sell price type, exchange rate) and sell prices are scoped
 * to the rental company, not the individual vehicle: `rental_companies_price_calculation_
 * translations`/`rental_companies_surcharges_calculation_translations` hold one row per
 * language, keyed by rental_company_id. `rental_companies_prices` holds the sell-price
 * counterpart to `vehicles_prices`, keyed by vehicle_id + price_period_id + rental_period_id,
 * with sell price on its own `prices_translations` relation — matched onto `vehicles_prices`
 * rows by (price_period, rental_period) in buildRentalZones().
 */
const RENTAL_COMPANY_PRICE_CALCULATION_COLLECTION = "rental_companies_price_calculation_translations";
const RENTAL_COMPANY_SURCHARGE_CALCULATION_COLLECTION = "rental_companies_surcharges_calculation_translations";
const RENTAL_COMPANY_PRICES_COLLECTION = "rental_companies_prices";

/**
 * Shared entity fetcher utilized by both `campers.service.js` and `rental-cars.service.js`.
 *
 * Note: Both collections read from the unified `vehicles` table (partitioned by `rental_type`)
 * and access the same `vehicles_*` child collections. `extraFetch` is an optional extension
 * point for a caller-specific lookup that isn't part of the shared vehicle shape, run
 * alongside the prices/rental-company-prices fetch and merged into the result — it keeps
 * this helper collection-agnostic without hardcoding either caller's domain fields into it.
 * Currently neither campers.service.js nor rental-cars.service.js passes one.
 */
export async function fetchVehicleDetail(
  { id, idFilterMode, rentalType, resourceLabel, rootCollection, detailRelations, fields, extraFetch, partnerId, partnerVisibility },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const vehiclesService = createScopedItemsService(services, "vehicles", { knex: database, schema }, {
    partnerId,
    partnerVisibility,
  });
  const surchargesService = new ItemsService(SURCHARGES_COLLECTION, { knex: database, schema });
  const zonesService = new ItemsService(ZONES_COLLECTION, { knex: database, schema });
  const pricePeriodsService = new ItemsService(PRICE_PERIODS_COLLECTION, { knex: database, schema });
  const rentalPeriodsService = new ItemsService(RENTAL_PERIODS_COLLECTION, { knex: database, schema });
  const pricesService = new ItemsService(PRICES_COLLECTION, { knex: database, schema });
  const rentalCompanyPriceCalculationService = new ItemsService(RENTAL_COMPANY_PRICE_CALCULATION_COLLECTION, { knex: database, schema });
  const rentalCompanySurchargeCalculationService = new ItemsService(RENTAL_COMPANY_SURCHARGE_CALCULATION_COLLECTION, { knex: database, schema });
  const rentalCompanyPricesService = new ItemsService(RENTAL_COMPANY_PRICES_COLLECTION, { knex: database, schema });

  const filter = { _and: [fields.buildIdFilter(id, idFilterMode), { rental_type: { _eq: rentalType } }] };

  const items = await vehiclesService.readByQuery({
    fields: buildDetailFields({ schema, rootCollection, relations: detailRelations }),
    filter,
    limit: 1,
  });

  const vehicle = items?.[0] ?? null;
  if (!vehicle) {
    throw new AppError(`${resourceLabel} not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  const rentalCompanyId = vehicle.rental_company?.id ?? null;

  const detailFields = (collection, fieldList) =>
    buildDetailFields({ schema, rootCollection: collection, relations: fieldList.filter((f) => f.includes(".")) });

  const [extra, prices, rentalCompanyPrices] = await Promise.all([
    extraFetch ? extraFetch({ vehicle, itemsServiceFactory: (collection) => new ItemsService(collection, { knex: database, schema }), detailFields }) : Promise.resolve(undefined),
    pricesService.readByQuery({ fields: detailFields(PRICES_COLLECTION, fields.PRICE_FIELDS), filter: { vehicle_id: { _eq: vehicle.id } }, limit: -1 }),
    /* rental_companies_prices' real parent-scoping key is `rental_company` (confirmed via the
     * Directus "save-and-calculate" widget config on rental_companies_price_calculation_
     * translations.vehicle_prices: foreignKeyField "rental_company", vehicle_id only a
     * secondary group-by) — AND it in here too, same as the surcharges/price-calculation
     * queries below, so a vehicle reassigned to a new company can't surface stale price rows
     * left behind under its old company. */
    rentalCompanyPricesService.readByQuery({
      fields: detailFields(RENTAL_COMPANY_PRICES_COLLECTION, fields.RENTAL_COMPANY_PRICE_FIELDS),
      filter: rentalCompanyId
        ? { _and: [{ vehicle_id: { _eq: vehicle.id } }, { rental_company: { _eq: rentalCompanyId } }] }
        : { vehicle_id: { _eq: vehicle.id } },
      limit: -1,
    }),
  ]);

  let surcharges = [];
  let zones = [];
  let pricePeriods = [];
  let rentalPeriods = [];
  let priceCalcRows = [];
  let surchargeCalcRows = [];

  if (rentalCompanyId) {
    const zoneIds = [...new Set(prices.map((p) => p.rental_zone).filter((v) => v !== null && v !== undefined))];
    const periodIds = [...new Set(prices.map((p) => p.price_period).filter((v) => v !== null && v !== undefined))];
    const rentalPeriodIds = [...new Set(prices.map((p) => p.rental_period).filter((v) => v !== null && v !== undefined))];

    [surcharges, zones, pricePeriods, rentalPeriods, priceCalcRows, surchargeCalcRows] = await Promise.all([
      /* vehicles_surcharges carries status/publish_start/publish_end (verified live), same as
       * vehicles_price_periods — filtered here for the same reason. */
      surchargesService.readByQuery({
        fields: detailFields(SURCHARGES_COLLECTION, fields.SURCHARGE_FIELDS),
        filter: { _and: [{ rental_company: { _eq: rentalCompanyId } }, ...buildPublishedStatusClauses()] },
        limit: -1,
      }),
      zoneIds.length ? zonesService.readByQuery({ fields: detailFields(ZONES_COLLECTION, fields.ZONE_FIELDS), filter: { id: { _in: zoneIds } }, limit: -1 }) : [],
      /* vehicles_price_periods carries status/publish_start/publish_end (verified live), same
       * as tours_surcharges/excursions_surcharges — filtered here since this is a standalone
       * secondary query, not a nested relation on the root vehicle query. */
      periodIds.length ? pricePeriodsService.readByQuery({
        fields: detailFields(PRICE_PERIODS_COLLECTION, fields.PRICE_PERIOD_FIELDS),
        filter: { _and: [{ id: { _in: periodIds } }, ...buildPublishedStatusClauses()] },
        limit: -1,
      }) : [],
      rentalPeriodIds.length ? rentalPeriodsService.readByQuery({ fields: detailFields(RENTAL_PERIODS_COLLECTION, fields.RENTAL_PERIOD_FIELDS), filter: { id: { _in: rentalPeriodIds } }, limit: -1 }) : [],
      rentalCompanyPriceCalculationService.readByQuery({ fields: detailFields(RENTAL_COMPANY_PRICE_CALCULATION_COLLECTION, fields.PRICE_CALCULATION_FIELDS), filter: { rental_company_id: { _eq: rentalCompanyId } }, limit: -1 }),
      rentalCompanySurchargeCalculationService.readByQuery({ fields: detailFields(RENTAL_COMPANY_SURCHARGE_CALCULATION_COLLECTION, fields.SURCHARGE_CALCULATION_FIELDS), filter: { rental_company_id: { _eq: rentalCompanyId } }, limit: -1 }),
    ]);
  }

  /*
   * `office_hours_translations` lacks a formal Directus relation on `rental_depots_translations`.
   * To prevent Directus from dropping the `translations_id.code` join, translations are fetched
   * directly via Knex and appended.
   */
  const depotObjects = (vehicle.depots_selected ?? [])
    .map((d) => d.rental_depots_id)
    .filter(Boolean);
  await enrichDepotOfficeHours(depotObjects, database);

  const vehicleData = {
    ...vehicle,
    ...(extra ?? {}),
    surcharges,
    zones,
    price_periods: pricePeriods,
    rental_periods: rentalPeriods,
    prices,
    /* One row per language — the transformer resolves the active language itself via
     * buildPriceSettingsMap()/buildSurchargeSettingsMap(), same pattern as tours/excursions. */
    price_calculation: priceCalcRows,
    surcharge_calculation: surchargeCalcRows,
    /* Sell price for the price matrix; matched onto `prices` by (price_period, rental_period)
     * in buildRentalZones(). */
    rental_company_prices: rentalCompanyPrices,
  };
  /* exchange_rate/surcharge_exchange_rate on the rental_companies_* rows are
   * `{key, collection: 'rates'}` stubs, same picker tours/cruises/excursions use. */
  return enrichExchangeRates(vehicleData, database);
}
