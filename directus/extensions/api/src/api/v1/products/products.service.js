import { LIST_FIELDS } from '../hotels/hotels.fields.js';
import { buildListFilter, buildSort, buildUpdatedAfterFilter } from '../hotels/hotels.filters.js';

const HOTELS_COLLECTION = 'hotels';

/**
 * Fetches all product types concurrently and merges them into a single paginated result.
 * Currently supports hotels only. Add additional collections here as new product types mature.
 *
 * Each item gets a `_productType` field (stripped by the transformer after dispatch)
 * so the product transformer can route to the correct per-type shaper.
 */
export async function listProducts(
  { page, limit, offset, search, country, sort, updated_after },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const hotelsService = new ItemsService(HOTELS_COLLECTION, { knex: database, schema });

  const listFilter = buildListFilter({ search, country });
  const deltaFilter = buildUpdatedAfterFilter(updated_after);
  const filter = listFilter && deltaFilter
    ? { _and: [listFilter, deltaFilter] }
    : (listFilter ?? deltaFilter ?? undefined);

  const sortClause = buildSort(sort);

  const [hotels, hotelCount] = await Promise.all([
    hotelsService.readByQuery({
      fields: LIST_FIELDS,
      sort: sortClause,
      limit,
      offset,
      ...(filter && { filter }),
    }),
    hotelsService.readByQuery({
      aggregate: { count: ['*'] },
      ...(filter && { filter }),
    }),
  ]);

  const taggedHotels = hotels.map(h => ({ ...h, _productType: 'hotel' }));

  const total = parseInt(hotelCount[0]?.count ?? '0', 10);
  const updatedAtMax = taggedHotels.length
    ? taggedHotels.reduce(
        (max, h) => (h.date_updated > max ? h.date_updated : max),
        taggedHotels[0].date_updated,
      )
    : null;

  return { data: taggedHotels, total, page, limit, updatedAtMax };
}
