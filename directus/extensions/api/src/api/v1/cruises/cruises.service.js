import { DETAIL_FIELDS, CRUISES_PRICES_FIELDS } from "./cruises.fields.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
} from "./cruises.filters.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";

const COLLECTION = "cruises";
const PRICES_COLLECTION = "cruises_prices";

export async function listCruises(
  { page, limit, offset, search, country, destination, season, sort, updated_after, status_primarix },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const cruisesService = new ItemsService(COLLECTION, { knex: database, schema });

  const listFilter = buildListFilter({ search, country, destination, season, status_primarix });
  const deltaFilter = buildUpdatedAfterFilter(updated_after);
  const filter = deltaFilter ? { _and: [listFilter, deltaFilter] } : listFilter;

  const [rawItems, countResult] = await Promise.all([
    cruisesService.readByQuery({
      fields: ['id', 'object_id', 'date_updated', 'source_updated_at'],
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
  // updated_at_max is derived from source_updated_at (not date_updated) so a client can
  // feed it straight back in as the next updated_after value.
  const updatedAtMax = rawItems.length
    ? rawItems.reduce((max, h) => (h.source_updated_at > max ? h.source_updated_at : max), rawItems[0].source_updated_at)
    : null;

  const items = rawItems.map(({ source_updated_at, ...rest }) => rest);

  return { data: items, total, page, limit, updatedAtMax };
}

export async function getCruiseDetails({ id }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const cruisesService = new ItemsService(COLLECTION, { knex: database, schema });
  const pricesService = new ItemsService(PRICES_COLLECTION, { knex: database, schema });

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

  // cruises_prices (the real per-cabin/date/occupancy price matrix) has no o2m alias on
  // cruises — fetched separately, same pattern as tours/excursions surcharges.
  const prices = await pricesService.readByQuery({
    fields: CRUISES_PRICES_FIELDS,
    filter: { cruises_id: { _eq: cruise.id } },
    limit: -1,
  });

  return { ...cruise, prices };
}
