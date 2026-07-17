import { DETAIL_FIELDS, SURCHARGE_FIELDS } from "./tours.fields.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
} from "./tours.filters.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";

const COLLECTION = "tours";
const SURCHARGES_COLLECTION = "tours_surcharges";

export async function listTours(
  { page, limit, offset, search, country, region, state, season, sort, updated_after },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const toursService = new ItemsService(COLLECTION, { knex: database, schema });

  const listFilter = buildListFilter({ search, country, region, state, season });
  const deltaFilter = buildUpdatedAfterFilter(updated_after);
  const filter = deltaFilter ? { _and: [listFilter, deltaFilter] } : listFilter;

  const [items, countResult] = await Promise.all([
    toursService.readByQuery({
      fields: ['id', 'name', 'object_id', 'date_updated'],
      sort: buildSort(sort),
      limit,
      offset,
      filter,
    }),
    toursService.readByQuery({
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

export async function getTourDetails({ id }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const toursService = new ItemsService(COLLECTION, { knex: database, schema });
  const surchargesService = new ItemsService(SURCHARGES_COLLECTION, { knex: database, schema });

  const filter = buildIdFilter(id);

  const items = await toursService.readByQuery({
    fields: DETAIL_FIELDS,
    filter,
    limit: 1,
  });

  const tour = items?.[0] ?? null;
  if (!tour) {
    throw new AppError(`Tour not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  // Surcharges — fetched separately to avoid Directus nested-translation resolution issues
  // (same pattern as hotels). tours_surcharges has no status/publish window fields, so all
  // rows for the tour are returned.
  const surcharges = await surchargesService.readByQuery({
    fields: SURCHARGE_FIELDS,
    filter: { tours_id: { _eq: tour.id } },
    limit: -1,
  });

  return { ...tour, surcharges };
}
