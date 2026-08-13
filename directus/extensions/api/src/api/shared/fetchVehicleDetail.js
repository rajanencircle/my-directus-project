import { buildDetailFields } from "../../shared/query/buildQueryFields.js";
import { enrichExchangeRates, enrichVehicleRateCurrency } from "../../utils/ratesResolver.js";
import { enrichDepotOfficeHours } from "../../utils/depotOfficeHours.js";
import { AppError } from "./AppError.js";
import { HTTP_STATUS } from "./constants.js";

const SURCHARGES_COLLECTION = "vehicles_surcharges";
const ZONES_COLLECTION = "vehicles_rental_zones";
const PRICE_PERIODS_COLLECTION = "vehicles_price_periods";
const RENTAL_PERIODS_COLLECTION = "vehicles_rental_periods";
const PRICES_COLLECTION = "vehicles_prices";
const PRICE_CALCULATION_COLLECTION = "vehicles_price_calculation";
const SURCHARGE_CALCULATION_COLLECTION = "vehicles_surcharges_calculation";

/**
 * Shared entity fetcher utilized by both `campers.service.js` and `rental-cars.service.js`.
 * 
 * Note: Both collections read from the unified `vehicles` table (partitioned by `rental_type`) 
 * and access the same `vehicles_*` child collections. The `extraFetch` parameter allows 
 * `rental-cars` to inject specific lookups (e.g., `camper_specs`) seamlessly without coupling 
 * this helper to domain-specific knowledge.
 */
export async function fetchVehicleDetail(
  { id, idFilterMode, rentalType, resourceLabel, rootCollection, detailRelations, fields, extraFetch },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const vehiclesService = new ItemsService("vehicles", { knex: database, schema });
  const surchargesService = new ItemsService(SURCHARGES_COLLECTION, { knex: database, schema });
  const zonesService = new ItemsService(ZONES_COLLECTION, { knex: database, schema });
  const pricePeriodsService = new ItemsService(PRICE_PERIODS_COLLECTION, { knex: database, schema });
  const rentalPeriodsService = new ItemsService(RENTAL_PERIODS_COLLECTION, { knex: database, schema });
  const pricesService = new ItemsService(PRICES_COLLECTION, { knex: database, schema });
  const priceCalculationService = new ItemsService(PRICE_CALCULATION_COLLECTION, { knex: database, schema });
  const surchargeCalculationService = new ItemsService(SURCHARGE_CALCULATION_COLLECTION, { knex: database, schema });

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

  const [extra, prices, priceCalcRows, surchargeCalcRows] = await Promise.all([
    extraFetch ? extraFetch({ vehicle, itemsServiceFactory: (collection) => new ItemsService(collection, { knex: database, schema }), detailFields }) : Promise.resolve(undefined),
    pricesService.readByQuery({ fields: detailFields(PRICES_COLLECTION, fields.PRICE_FIELDS), filter: { vehicle_id: { _eq: vehicle.id } }, limit: -1 }),
    priceCalculationService.readByQuery({ fields: detailFields(PRICE_CALCULATION_COLLECTION, fields.PRICE_CALCULATION_FIELDS), filter: { vehicle_id: { _eq: vehicle.id } }, limit: 1 }),
    surchargeCalculationService.readByQuery({ fields: detailFields(SURCHARGE_CALCULATION_COLLECTION, fields.SURCHARGE_CALCULATION_FIELDS), filter: { vehicle_id: { _eq: vehicle.id } }, limit: 1 }),
  ]);

  let surcharges = [];
  let zones = [];
  let pricePeriods = [];
  let rentalPeriods = [];

  if (rentalCompanyId) {
    const zoneIds = [...new Set(prices.map((p) => p.rental_zone).filter((v) => v !== null && v !== undefined))];
    const periodIds = [...new Set(prices.map((p) => p.price_period).filter((v) => v !== null && v !== undefined))];
    const rentalPeriodIds = [...new Set(prices.map((p) => p.rental_period).filter((v) => v !== null && v !== undefined))];

    [surcharges, zones, pricePeriods, rentalPeriods] = await Promise.all([
      surchargesService.readByQuery({ fields: detailFields(SURCHARGES_COLLECTION, fields.SURCHARGE_FIELDS), filter: { rental_company: { _eq: rentalCompanyId } }, limit: -1 }),
      zoneIds.length ? zonesService.readByQuery({ fields: detailFields(ZONES_COLLECTION, fields.ZONE_FIELDS), filter: { id: { _in: zoneIds } }, limit: -1 }) : [],
      periodIds.length ? pricePeriodsService.readByQuery({ fields: detailFields(PRICE_PERIODS_COLLECTION, fields.PRICE_PERIOD_FIELDS), filter: { id: { _in: periodIds } }, limit: -1 }) : [],
      rentalPeriodIds.length ? rentalPeriodsService.readByQuery({ fields: detailFields(RENTAL_PERIODS_COLLECTION, fields.RENTAL_PERIOD_FIELDS), filter: { id: { _in: rentalPeriodIds } }, limit: -1 }) : [],
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
    price_calculation: priceCalcRows?.[0] ?? null,
    surcharge_calculation: surchargeCalcRows?.[0] ?? null,
  };
  const enrichedVehicle = await enrichExchangeRates(vehicleData, database);
  /*
   * `exchange_rate` exists as a primitive decimal on vehicles. This explicitly attaches the 
   * preset's currency (sourced from `exchange_rate_presets`) to ensure the response payload 
   * returns `{ currency, rate }` rather than a null currency object.
   */
  return enrichVehicleRateCurrency(enrichedVehicle, database, rentalType === "car" ? "rental_car" : "camper");
}
