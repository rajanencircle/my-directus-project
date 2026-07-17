import { DETAIL_FIELDS } from "./cruises.fields.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
} from "./cruises.filters.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";

const COLLECTION = "cruises";

export async function listCruises(
  { page, limit, offset, search, country, destination, season, sort, updated_after },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const cruisesService = new ItemsService(COLLECTION, { knex: database, schema });

  const listFilter = buildListFilter({ search, country, destination, season });
  const deltaFilter = buildUpdatedAfterFilter(updated_after);
  const filter = deltaFilter ? { _and: [listFilter, deltaFilter] } : listFilter;

  const [items, countResult] = await Promise.all([
    cruisesService.readByQuery({
      fields: ['id', 'object_id', 'date_updated'],
      sort: buildSort(sort),
      limit,
      offset,
      filter,
    }),
    cruisesService.readByQuery({
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

export async function getCruiseDetails({ id }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const cruisesService = new ItemsService(COLLECTION, { knex: database, schema });

  const filter = buildIdFilter(id);

  const items = await cruisesService.readByQuery({
    fields: DETAIL_FIELDS,
    filter,
    limit: 1,
  });

  const cruise = items?.[0] ?? null;
  if (!cruise) {
    throw new AppError(`Cruise not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  return cruise;
}
