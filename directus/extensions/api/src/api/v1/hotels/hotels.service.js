import { LIST_FIELDS, DETAIL_FIELDS, SURCHARGE_FIELDS } from './hotels.fields.js';
import { buildListFilter, buildSort, buildIdFilter, buildUpdatedAfterFilter } from './hotels.filters.js';
import { AppError } from '../../shared/AppError.js';
import { HTTP_STATUS } from '../../shared/constants.js';

const COLLECTION = 'hotels';
const SURCHARGES_COLLECTION = 'surcharges';

export async function listHotels({ page, limit, offset, search, country, sort, updated_after }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const hotelsService = new ItemsService(COLLECTION, { knex: database, schema });

  const listFilter = buildListFilter({ search, country });
  const deltaFilter = buildUpdatedAfterFilter(updated_after);
  const filter = listFilter && deltaFilter
    ? { _and: [listFilter, deltaFilter] }
    : (listFilter ?? deltaFilter ?? undefined);

  const [items, countResult] = await Promise.all([
    hotelsService.readByQuery({
      fields: LIST_FIELDS,
      sort: buildSort(sort),
      limit,
      offset,
      ...(filter && { filter }),
    }),
    hotelsService.readByQuery({
      aggregate: { count: ['*'] },
      ...(filter && { filter }),
    }),
  ]);

  const total = parseInt(countResult[0]?.count ?? '0', 10);
  const updatedAtMax = items.length
    ? items.reduce((max, h) => (h.date_updated > max ? h.date_updated : max), items[0].date_updated)
    : null;

  return { data: items, total, page, limit, updatedAtMax };
}

export async function getHotelDetails({ id }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const hotelsService = new ItemsService(COLLECTION, { knex: database, schema });
  const surchargesService = new ItemsService(SURCHARGES_COLLECTION, { knex: database, schema });

  const filter = buildIdFilter(id);

  const items = await hotelsService.readByQuery({
    fields: DETAIL_FIELDS,
    filter,
    limit: 1,
  });

  const hotel = items?.[0] ?? null;
  if (!hotel) {
    throw new AppError(`Hotel not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  const surcharges = await surchargesService.readByQuery({
    fields: SURCHARGE_FIELDS,
    filter: { hotel_id: { _eq: hotel.id } },
    limit: -1,
  });

  return { ...hotel, surcharges };
}
