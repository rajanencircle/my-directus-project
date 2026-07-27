import { DETAIL_FIELDS, CAMPER_SPECS_FIELDS } from "./vehicles.fields.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
} from "./vehicles.filters.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";

const COLLECTION = "vehicles";
const CAMPER_SPECS_COLLECTION = "camper_specs";

export async function listVehicles(
  { page, limit, offset, search, category, rental_type, sort, updated_after },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const vehiclesService = new ItemsService(COLLECTION, { knex: database, schema });

  const listFilter = buildListFilter({ search, category, rental_type });
  const deltaFilter = buildUpdatedAfterFilter(updated_after);
  const filter = deltaFilter ? { _and: [listFilter, deltaFilter] } : listFilter;

  const [items, countResult] = await Promise.all([
    vehiclesService.readByQuery({
      fields: ['id', 'object_id', 'name_vehicle', 'date_updated'],
      sort: buildSort(sort),
      limit,
      offset,
      filter,
    }),
    vehiclesService.readByQuery({
      aggregate: { count: ["*"] },
      filter,
    }),
  ]);

  const total = parseInt(countResult[0]?.count ?? "0", 10);
  const updatedAtMax = items.length
    ? items.reduce((max, h) => (h.date_updated > max ? h.date_updated : max), items[0].date_updated)
    : null;

  return { data: items, total, page, limit, updatedAtMax };
}

export async function getVehicleDetails({ id }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const vehiclesService = new ItemsService(COLLECTION, { knex: database, schema });
  const camperSpecsService = new ItemsService(CAMPER_SPECS_COLLECTION, { knex: database, schema });

  const filter = buildIdFilter(id);

  const items = await vehiclesService.readByQuery({
    fields: DETAIL_FIELDS,
    filter,
    limit: 1,
  });

  const vehicle = items?.[0] ?? null;
  if (!vehicle) {
    throw new AppError(`Vehicle not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  // camper_specs has no reverse alias on vehicles (O2O, one_field is null) — fetched
  // separately by filtering on its `vehicle` FK. Only relevant for rental_type=Camper,
  // but the lookup itself is harmless/empty for cars.
  const camperSpecsRows = await camperSpecsService.readByQuery({
    fields: CAMPER_SPECS_FIELDS,
    filter: { vehicle: { _eq: vehicle.id } },
    limit: 1,
  });

  return { ...vehicle, camper_specs: camperSpecsRows?.[0] ?? null };
}
