import { LIST_FIELDS } from "./rental-cars.fields.js";
import { CAMPER_SPECS_FIELDS } from "./rental-cars.fields.js";
import {
  SURCHARGE_FIELDS,
  ZONE_FIELDS,
  PRICE_PERIOD_FIELDS,
  RENTAL_PERIOD_FIELDS,
  PRICE_FIELDS,
  PRICE_CALCULATION_FIELDS,
  SURCHARGE_CALCULATION_FIELDS,
} from "./rental-cars.fields.js";
import { ROOT_COLLECTION, DETAIL_RELATIONS } from "./rental-cars.query-config.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
} from "./rental-cars.filters.js";
import { enrichExchangeRates } from "../../../utils/ratesResolver.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";
import { buildDetailFields } from "../../../shared/query/buildQueryFields.js";
import { computeUpdatedAtMax } from "../../../utils/delta.js";
import { enrichDepotOfficeHours } from "../../../utils/depotOfficeHours.js";

const COLLECTION = "vehicles";
const CAMPER_SPECS_COLLECTION = "camper_specs";
const SURCHARGES_COLLECTION = "vehicles_surcharges";
const ZONES_COLLECTION = "vehicles_rental_zones";
const PRICE_PERIODS_COLLECTION = "vehicles_price_periods";
const RENTAL_PERIODS_COLLECTION = "vehicles_rental_periods";
const PRICES_COLLECTION = "vehicles_prices";
const PRICE_CALCULATION_COLLECTION = "vehicles_price_calculation";
const SURCHARGE_CALCULATION_COLLECTION = "vehicles_surcharges_calculation";

export async function listSlimRentalCars(
  { page, limit, offset, publishing_status },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const rentalCarsService = new ItemsService(COLLECTION, { knex: database, schema });

  const filter = buildListFilter({ publishing_status });

  const [rawItems, countResult] = await Promise.all([
    rentalCarsService.readByQuery({
      fields: LIST_FIELDS,
      sort: buildSort(),
      limit,
      offset,
      filter,
    }),
    rentalCarsService.readByQuery({
      aggregate: { count: ["*"] },
      filter,
    }),
  ]);

  const total = parseInt(countResult[0]?.count ?? "0", 10);
  const items = rawItems.map(({ source_updated_at, ...rest }) => rest);

  const updatedAtMax = computeUpdatedAtMax(rawItems);
  return { data: items, total, page, limit, updatedAtMax };
}

export async function listFullRentalCars(
  { page, limit, offset, publishing_status, updated_after },
  context,
) {
  const { services, database, getSchema } = context;
  const schema = await getSchema();
  const { ItemsService } = services;
  const rentalCarsService = new ItemsService(COLLECTION, { knex: database, schema });

  const listFilter = buildListFilter({ publishing_status });
  const deltaFilter = buildUpdatedAfterFilter(updated_after);
  const filter = deltaFilter ? { _and: [listFilter, deltaFilter] } : listFilter;

  const [rawItems, countResult] = await Promise.all([
    rentalCarsService.readByQuery({
      fields: LIST_FIELDS,
      sort: buildSort(),
      limit,
      offset,
      filter,
    }),
    rentalCarsService.readByQuery({
      aggregate: { count: ["*"] },
      filter,
    }),
  ]);

  const total = parseInt(countResult[0]?.count ?? "0", 10);
  const updatedAtMax = computeUpdatedAtMax(rawItems);

  const data = [];
  for (const item of rawItems) {
    try {
      const detail = await getRentalCarDetails({ id: item.id.toString() }, context);
      data.push(detail);
    } catch (e) {
      console.error(`Failed to fetch full detail for rental car ${item.id}`, e);
    }
  }

  return { data, total, page, limit, updatedAtMax };
}

export async function getRentalCarDetails({ id }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const rentalCarsService = new ItemsService(COLLECTION, { knex: database, schema });
  const camperSpecsService = new ItemsService(CAMPER_SPECS_COLLECTION, { knex: database, schema });
  const surchargesService = new ItemsService(SURCHARGES_COLLECTION, { knex: database, schema });
  const zonesService = new ItemsService(ZONES_COLLECTION, { knex: database, schema });
  const pricePeriodsService = new ItemsService(PRICE_PERIODS_COLLECTION, { knex: database, schema });
  const rentalPeriodsService = new ItemsService(RENTAL_PERIODS_COLLECTION, { knex: database, schema });
  const pricesService = new ItemsService(PRICES_COLLECTION, { knex: database, schema });
  const priceCalculationService = new ItemsService(PRICE_CALCULATION_COLLECTION, { knex: database, schema });
  const surchargeCalculationService = new ItemsService(SURCHARGE_CALCULATION_COLLECTION, { knex: database, schema });

  const filter = { _and: [buildIdFilter(id), { rental_type: { _eq: 'car' } }] };

  const items = await rentalCarsService.readByQuery({
    fields: buildDetailFields({ schema, rootCollection: ROOT_COLLECTION, relations: DETAIL_RELATIONS }),
    filter,
    limit: 1,
  });

  const rentalCar = items?.[0] ?? null;
  if (!rentalCar) {
    throw new AppError(`RentalCar not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  const rentalCompanyId = rentalCar.rental_company?.id ?? null;

  const [camperSpecsRows, prices, priceCalcRows, surchargeCalcRows] = await Promise.all([
    camperSpecsService.readByQuery({ fields: CAMPER_SPECS_FIELDS, filter: { vehicle: { _eq: rentalCar.id } }, limit: 1 }),
    pricesService.readByQuery({ fields: PRICE_FIELDS, filter: { vehicle_id: { _eq: rentalCar.id } }, limit: -1 }),
    priceCalculationService.readByQuery({ fields: PRICE_CALCULATION_FIELDS, filter: { vehicle_id: { _eq: rentalCar.id } }, limit: 1 }),
    surchargeCalculationService.readByQuery({ fields: SURCHARGE_CALCULATION_FIELDS, filter: { vehicle_id: { _eq: rentalCar.id } }, limit: 1 }),
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
      surchargesService.readByQuery({ fields: SURCHARGE_FIELDS, filter: { rental_company: { _eq: rentalCompanyId } }, limit: -1 }),
      zoneIds.length ? zonesService.readByQuery({ fields: ZONE_FIELDS, filter: { id: { _in: zoneIds } }, limit: -1 }) : [],
      periodIds.length ? pricePeriodsService.readByQuery({ fields: PRICE_PERIOD_FIELDS, filter: { id: { _in: periodIds } }, limit: -1 }) : [],
      rentalPeriodIds.length ? rentalPeriodsService.readByQuery({ fields: RENTAL_PERIOD_FIELDS, filter: { id: { _in: rentalPeriodIds } }, limit: -1 }) : [],
    ]);
  }

  // office_hours_translations has no Directus relation on rental_depots_translations,
  // so Directus drops the translations_id.code join — fetch it directly via knex.
  const depotObjects = (rentalCar.depots_selected ?? [])
    .map((d) => d.rental_depots_id)
    .filter(Boolean);
  await enrichDepotOfficeHours(depotObjects, database);

  const rentalCarData = {
    ...rentalCar,
    camper_specs: camperSpecsRows?.[0] ?? null,
    surcharges,
    zones,
    price_periods: pricePeriods,
    rental_periods: rentalPeriods,
    prices,
    price_calculation: priceCalcRows?.[0] ?? null,
    surcharge_calculation: surchargeCalcRows?.[0] ?? null,
  };
  const enrichedRentalCar = await enrichExchangeRates(rentalCarData, database);
  return enrichedRentalCar;
}
