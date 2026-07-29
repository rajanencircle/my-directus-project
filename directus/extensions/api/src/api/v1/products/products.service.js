import { DETAIL_FIELDS as HOTELS_DETAIL_FIELDS } from '../hotels/hotels.fields.js';
import { buildListFilter, buildSort, buildUpdatedAfterFilter, buildPublicationDeepFilter } from '../hotels/hotels.filters.js';
import { DETAIL_FIELDS as TOURS_DETAIL_FIELDS } from '../tours/tours.fields.js';
import { buildUpdatedAfterFilter as buildToursUpdatedAfterFilter } from '../tours/tours.filters.js';
import { DETAIL_FIELDS as EXCURSIONS_DETAIL_FIELDS } from '../excursions/excursions.fields.js';
import { buildUpdatedAfterFilter as buildExcursionsUpdatedAfterFilter } from '../excursions/excursions.filters.js';
import { DETAIL_FIELDS as CRUISES_DETAIL_FIELDS } from '../cruises/cruises.fields.js';
import { buildUpdatedAfterFilter as buildCruisesUpdatedAfterFilter } from '../cruises/cruises.filters.js';
import { DETAIL_FIELDS as VEHICLES_DETAIL_FIELDS } from '../vehicles/vehicles.fields.js';
import { buildUpdatedAfterFilter as buildVehiclesUpdatedAfterFilter } from '../vehicles/vehicles.filters.js';
import { DEFAULT_PRIMARIX_STATUS } from '../../shared/constants.js';

const HOTELS_COLLECTION = 'hotels';
const TOURS_COLLECTION = 'tours';
const EXCURSIONS_COLLECTION = 'excursions';
const CRUISES_COLLECTION = 'cruises';
const VEHICLES_COLLECTION = 'vehicles';

const LIMITED_FIELDS = [
  'id', 'name', 'object_id', 'status_primarix', 'date_created', 'date_updated',
];
// tours/excursions/cruises/vehicles don't all have a `name` field (cruises has none;
// vehicles' is `name_vehicle`) — the limited-list shaper falls back gracefully per type.
const LIMITED_FIELDS_GENERIC = [
  'id', 'object_id', 'status_primarix', 'date_created', 'date_updated',
];

/**
 * Fetches all product types concurrently and merges them into a single paginated result.
 * Each product type's own filters/fields are used — only hotels gets the rich cross-field
 * `search`/`country`/`hotel_group`/etc. filter set (matching its existing dedicated endpoint);
 * other types are filtered only by publish status + `updated_after`, to avoid inventing a
 * unified filter scheme across dissimilar product schemas.
 *
 * Each item gets a `_productType` field (stripped by the transformer after dispatch)
 * so the product transformer can route to the correct per-type shaper.
 */
async function fetchAllProductTypes({ updated_after, status_primarix }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;

  const hotelsService = new ItemsService(HOTELS_COLLECTION, { knex: database, schema });
  const toursService = new ItemsService(TOURS_COLLECTION, { knex: database, schema });
  const excursionsService = new ItemsService(EXCURSIONS_COLLECTION, { knex: database, schema });
  const cruisesService = new ItemsService(CRUISES_COLLECTION, { knex: database, schema });
  const vehiclesService = new ItemsService(VEHICLES_COLLECTION, { knex: database, schema });

  const hotelsDelta = buildUpdatedAfterFilter(updated_after);
  const toursDelta = buildToursUpdatedAfterFilter(updated_after);
  const excursionsDelta = buildExcursionsUpdatedAfterFilter(updated_after);
  const cruisesDelta = buildCruisesUpdatedAfterFilter(updated_after);
  const vehiclesDelta = buildVehiclesUpdatedAfterFilter(updated_after);

  const statusFilter = status_primarix ?? DEFAULT_PRIMARIX_STATUS;
  const publishedFilter = (delta) => (delta
    ? { _and: [{ status_primarix: { _eq: statusFilter } }, delta] }
    : { status_primarix: { _eq: statusFilter } });

  return {
    hotelsService, toursService, excursionsService, cruisesService, vehiclesService,
    hotelsFilter: publishedFilter(hotelsDelta),
    toursFilter: publishedFilter(toursDelta),
    excursionsFilter: publishedFilter(excursionsDelta),
    cruisesFilter: publishedFilter(cruisesDelta),
    vehiclesFilter: publishedFilter(vehiclesDelta),
  };
}

export async function listProducts(
  { page, limit, offset, search, country, hotel_group, hotel_classification, region, state, activity, season, sort, updated_after, status_primarix },
  context,
) {
  const {
    hotelsService, toursService, excursionsService, cruisesService, vehiclesService,
    hotelsFilter, toursFilter, excursionsFilter, cruisesFilter, vehiclesFilter,
  } = await fetchAllProductTypes({ updated_after, status_primarix }, context);

  const hotelsListFilter = buildListFilter({ search, country, hotel_group, hotel_classification, region, state, activity, season, status_primarix });
  const hotelsDelta = buildUpdatedAfterFilter(updated_after);
  const hotelsCombinedFilter = hotelsDelta ? { _and: [hotelsListFilter, hotelsDelta] } : hotelsListFilter;

  const [hotels, tours, excursions, cruises, vehicles] = await Promise.all([
    hotelsService.readByQuery({ fields: HOTELS_DETAIL_FIELDS, deep: buildPublicationDeepFilter(), filter: hotelsCombinedFilter, limit: -1 }),
    toursService.readByQuery({ fields: TOURS_DETAIL_FIELDS, filter: toursFilter, limit: -1 }),
    excursionsService.readByQuery({ fields: EXCURSIONS_DETAIL_FIELDS, filter: excursionsFilter, limit: -1 }),
    cruisesService.readByQuery({ fields: CRUISES_DETAIL_FIELDS, filter: cruisesFilter, limit: -1 }),
    vehiclesService.readByQuery({ fields: VEHICLES_DETAIL_FIELDS, filter: vehiclesFilter, limit: -1 }),
  ]);

  const tagged = [
    ...hotels.map((h) => ({ ...h, _productType: 'hotel' })),
    ...tours.map((t) => ({ ...t, _productType: 'tour' })),
    ...excursions.map((e) => ({ ...e, _productType: 'excursion' })),
    ...cruises.map((c) => ({ ...c, _productType: 'cruise' })),
    ...vehicles.map((v) => ({ ...v, _productType: 'vehicle' })),
  ];

  const sortDesc = !sort || sort.startsWith('-');
  tagged.sort((a, b) => (sortDesc ? (b.date_updated > a.date_updated ? 1 : -1) : (a.date_updated > b.date_updated ? 1 : -1)));

  const total = tagged.length;
  const data = tagged.slice(offset, offset + limit);
  const updatedAtMax = tagged.length
    ? tagged.reduce((max, h) => (h.date_updated > max ? h.date_updated : max), tagged[0].date_updated)
    : null;

  return { data, total, page, limit, updatedAtMax };
}

export async function listProductsLimited(
  { page, limit, offset, search, country, hotel_group, hotel_classification, region, state, activity, season, sort, updated_after, status_primarix },
  context,
) {
  const {
    hotelsService, toursService, excursionsService, cruisesService, vehiclesService,
    toursFilter, excursionsFilter, cruisesFilter, vehiclesFilter,
  } = await fetchAllProductTypes({ updated_after, status_primarix }, context);

  const hotelsListFilter = buildListFilter({ search, country, hotel_group, hotel_classification, region, state, activity, season, status_primarix });
  const hotelsDelta = buildUpdatedAfterFilter(updated_after);
  const hotelsCombinedFilter = hotelsDelta ? { _and: [hotelsListFilter, hotelsDelta] } : hotelsListFilter;

  const [hotels, tours, excursions, cruises, vehicles] = await Promise.all([
    hotelsService.readByQuery({ fields: LIMITED_FIELDS, filter: hotelsCombinedFilter, limit: -1 }),
    toursService.readByQuery({ fields: LIMITED_FIELDS, filter: toursFilter, limit: -1 }),
    excursionsService.readByQuery({ fields: LIMITED_FIELDS, filter: excursionsFilter, limit: -1 }),
    cruisesService.readByQuery({ fields: LIMITED_FIELDS_GENERIC, filter: cruisesFilter, limit: -1 }),
    vehiclesService.readByQuery({ fields: [...LIMITED_FIELDS_GENERIC, 'name_vehicle'], filter: vehiclesFilter, limit: -1 }),
  ]);

  const tagged = [
    ...hotels.map((h) => ({ ...h, _productType: 'hotel' })),
    ...tours.map((t) => ({ ...t, _productType: 'tour' })),
    ...excursions.map((e) => ({ ...e, _productType: 'excursion' })),
    ...cruises.map((c) => ({ ...c, _productType: 'cruise' })),
    ...vehicles.map((v) => ({ ...v, name: v.name_vehicle, _productType: 'vehicle' })),
  ];

  const sortDesc = !sort || sort.startsWith('-');
  tagged.sort((a, b) => (sortDesc ? (b.date_updated > a.date_updated ? 1 : -1) : (a.date_updated > b.date_updated ? 1 : -1)));

  const total = tagged.length;
  const data = tagged.slice(offset, offset + limit);
  const updatedAtMax = tagged.length
    ? tagged.reduce((max, h) => (h.date_updated > max ? h.date_updated : max), tagged[0].date_updated)
    : null;

  return { data, total, page, limit, updatedAtMax };
}

export async function getProductCatalog({ services, database, getSchema }, { status_primarix } = {}) {
  const schema = await getSchema();
  const { ItemsService } = services;

  const collections = [
    { type: 'hotel', collection: HOTELS_COLLECTION, list_url: '/api/v1/hotels', detail_url: '/api/v1/hotels/{id}' },
    { type: 'tour', collection: TOURS_COLLECTION, list_url: '/api/v1/tours', detail_url: '/api/v1/tours/{id}' },
    { type: 'excursion', collection: EXCURSIONS_COLLECTION, list_url: '/api/v1/excursions', detail_url: '/api/v1/excursions/{id}' },
    { type: 'cruise', collection: CRUISES_COLLECTION, list_url: '/api/v1/cruises', detail_url: '/api/v1/cruises/{id}' },
    { type: 'vehicle', collection: VEHICLES_COLLECTION, list_url: '/api/v1/vehicles', detail_url: '/api/v1/vehicles/{id}' },
  ];

  const statusFilter = status_primarix ?? DEFAULT_PRIMARIX_STATUS;
  const counts = await Promise.all(
    collections.map(({ collection }) => {
      const service = new ItemsService(collection, { knex: database, schema });
      return service.readByQuery({ aggregate: { count: ['*'] }, filter: { status_primarix: { _eq: statusFilter } } });
    }),
  );

  return collections.map(({ type, list_url, detail_url }, i) => ({
    type,
    total: parseInt(counts[i][0]?.count ?? '0', 10),
    list_url,
    detail_url,
  }));
}
