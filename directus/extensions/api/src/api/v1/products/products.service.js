import { DETAIL_FIELDS as HOTELS_DETAIL_FIELDS, LIST_FIELDS as HOTELS_LIST_FIELDS } from '../hotels/hotels.fields.js';
import { buildListFilter, buildSort, buildUpdatedAfterFilter, buildPublicationDeepFilter } from '../hotels/hotels.filters.js';
import { DETAIL_FIELDS as TOURS_DETAIL_FIELDS, LIST_FIELDS as TOURS_LIST_FIELDS } from '../tours/tours.fields.js';
import { buildUpdatedAfterFilter as buildToursUpdatedAfterFilter } from '../tours/tours.filters.js';
import { DETAIL_FIELDS as EXCURSIONS_DETAIL_FIELDS, LIST_FIELDS as EXCURSIONS_LIST_FIELDS } from '../excursions/excursions.fields.js';
import { buildUpdatedAfterFilter as buildExcursionsUpdatedAfterFilter } from '../excursions/excursions.filters.js';
import { DETAIL_FIELDS as CRUISES_DETAIL_FIELDS, LIST_FIELDS as CRUISES_LIST_FIELDS } from '../cruises/cruises.fields.js';
import { buildUpdatedAfterFilter as buildCruisesUpdatedAfterFilter } from '../cruises/cruises.filters.js';
import { DETAIL_FIELDS as CAMPERS_DETAIL_FIELDS, LIST_FIELDS as CAMPERS_LIST_FIELDS } from '../campers/campers.fields.js';
import { buildUpdatedAfterFilter as buildCampersUpdatedAfterFilter } from '../campers/campers.filters.js';
import { DETAIL_FIELDS as RENTAL_CARS_DETAIL_FIELDS, LIST_FIELDS as RENTAL_CARS_LIST_FIELDS } from '../rental_cars/rental-cars.fields.js';
import { buildUpdatedAfterFilter as buildRentalCarsUpdatedAfterFilter } from '../rental_cars/rental-cars.filters.js';
import { getHotelDetails } from '../hotels/hotels.service.js';
import { getTourDetails } from '../tours/tours.service.js';
import { getExcursionDetails } from '../excursions/excursions.service.js';
import { getCruiseDetails } from '../cruises/cruises.service.js';
import { getRentalCarDetails } from '../rental_cars/rental-cars.service.js';
import { getCamperDetails } from '../campers/campers.service.js';
import { shapeHotelListItem } from '../../../transformers/hotel.transformer.js';
import { shapeTourListItem } from '../../../transformers/tour.transformer.js';
import { shapeExcursionListItem } from '../../../transformers/excursion.transformer.js';
import { shapeCruiseListItem } from '../../../transformers/cruise.transformer.js';
import { shapeRentalCarListItem } from '../../../transformers/rental_car.transformer.js';
import { shapeCamperListItem } from '../../../transformers/camper.transformer.js';
import { AppError } from '../../shared/AppError.js';
import { HTTP_STATUS } from '../../shared/constants.js';
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
async function fetchAllProductTypes({ updated_after }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;

  const hotelsService = new ItemsService(HOTELS_COLLECTION, { knex: database, schema });
  const toursService = new ItemsService(TOURS_COLLECTION, { knex: database, schema });
  const excursionsService = new ItemsService(EXCURSIONS_COLLECTION, { knex: database, schema });
  const cruisesService = new ItemsService(CRUISES_COLLECTION, { knex: database, schema });
  const campersService = new ItemsService(VEHICLES_COLLECTION, { knex: database, schema });
  const rentalCarsService = new ItemsService(VEHICLES_COLLECTION, { knex: database, schema });

  const hotelsDelta = buildUpdatedAfterFilter(updated_after);
  const toursDelta = buildToursUpdatedAfterFilter(updated_after);
  const excursionsDelta = buildExcursionsUpdatedAfterFilter(updated_after);
  const cruisesDelta = buildCruisesUpdatedAfterFilter(updated_after);
  const campersDelta = buildCampersUpdatedAfterFilter(updated_after);
  const rentalCarsDelta = buildRentalCarsUpdatedAfterFilter(updated_after);

  // Web endpoints always return published records
  const statusFilter = DEFAULT_PRIMARIX_STATUS;
  const publishedFilter = (delta) => {
    const statusClause = { status_primarix: { _eq: statusFilter } };
    if (delta) return { _and: [statusClause, delta] };
    return statusClause;
  };

  return {
    hotelsService, toursService, excursionsService, cruisesService, campersService, rentalCarsService,
    hotelsFilter: publishedFilter(hotelsDelta),
    toursFilter: publishedFilter(toursDelta),
    excursionsFilter: publishedFilter(excursionsDelta),
    cruisesFilter: publishedFilter(cruisesDelta),
    campersFilter: { _and: [publishedFilter(campersDelta), { rental_type: { _eq: 'camper' } }] },
    rentalCarsFilter: { _and: [publishedFilter(rentalCarsDelta), { rental_type: { _eq: 'car' } }] },
  };
}

export async function listProducts(
  { page, limit, offset, updated_after },
  context,
) {
  const {
    hotelsService, toursService, excursionsService, cruisesService, campersService, rentalCarsService,
    hotelsFilter, toursFilter, excursionsFilter, cruisesFilter, campersFilter, rentalCarsFilter,
  } = await fetchAllProductTypes({ updated_after }, context);

  const [hotels, tours, excursions, cruises, campers, rental_cars] = await Promise.all([
    hotelsService.readByQuery({ fields: HOTELS_DETAIL_FIELDS, deep: buildPublicationDeepFilter(), filter: hotelsFilter, limit: -1 }),
    toursService.readByQuery({ fields: TOURS_DETAIL_FIELDS, filter: toursFilter, limit: -1 }),
    excursionsService.readByQuery({ fields: EXCURSIONS_DETAIL_FIELDS, filter: excursionsFilter, limit: -1 }),
    cruisesService.readByQuery({ fields: CRUISES_DETAIL_FIELDS, filter: cruisesFilter, limit: -1 }),
    campersService.readByQuery({ fields: CAMPERS_DETAIL_FIELDS, filter: campersFilter, limit: -1 }),
    rentalCarsService.readByQuery({ fields: RENTAL_CARS_DETAIL_FIELDS, filter: rentalCarsFilter, limit: -1 }),
  ]);

  const tagged = [
    ...hotels.map((h) => ({ ...h, _productType: 'hotel' })),
    ...tours.map((t) => ({ ...t, _productType: 'tour' })),
    ...excursions.map((e) => ({ ...e, _productType: 'excursion' })),
    ...cruises.map((c) => ({ ...c, _productType: 'cruise' })),
    ...campers.map((c) => ({ ...c, _productType: 'camper' })),
    ...rental_cars.map((r) => ({ ...r, _productType: 'rental_car' })),
  ];

  tagged.sort((a, b) => (b.date_updated > a.date_updated ? 1 : -1));

  const total = tagged.length;
  const data = tagged.slice(offset, offset + limit);
  const updatedAtMax = tagged.length
    ? tagged.reduce((max, h) => (h.date_updated > max ? h.date_updated : max), tagged[0].date_updated)
    : null;

  return { data, total, page, limit, updatedAtMax };
}

export async function listProductsLimited(
  { page, limit, offset, updated_after },
  context,
) {
  const {
    hotelsService, toursService, excursionsService, cruisesService, campersService, rentalCarsService,
    hotelsFilter, toursFilter, excursionsFilter, cruisesFilter, campersFilter, rentalCarsFilter,
  } = await fetchAllProductTypes({ updated_after }, context);

  const [hotels, tours, excursions, cruises, campers, rental_cars] = await Promise.all([
    hotelsService.readByQuery({ fields: LIMITED_FIELDS, filter: hotelsFilter, limit: -1 }),
    toursService.readByQuery({ fields: LIMITED_FIELDS, filter: toursFilter, limit: -1 }),
    excursionsService.readByQuery({ fields: LIMITED_FIELDS, filter: excursionsFilter, limit: -1 }),
    cruisesService.readByQuery({ fields: LIMITED_FIELDS_GENERIC, filter: cruisesFilter, limit: -1 }),
    campersService.readByQuery({ fields: [...LIMITED_FIELDS_GENERIC, 'name_vehicle'], filter: campersFilter, limit: -1 }),
    rentalCarsService.readByQuery({ fields: [...LIMITED_FIELDS_GENERIC, 'name_vehicle'], filter: rentalCarsFilter, limit: -1 }),
  ]);

  const tagged = [
    ...hotels.map((h) => ({ ...h, _productType: 'hotel' })),
    ...tours.map((t) => ({ ...t, _productType: 'tour' })),
    ...excursions.map((e) => ({ ...e, _productType: 'excursion' })),
    ...cruises.map((c) => ({ ...c, _productType: 'cruise' })),
    ...campers.map((c) => ({ ...c, name: c.name_vehicle, _productType: 'camper' })),
    ...rental_cars.map((r) => ({ ...r, name: r.name_vehicle, _productType: 'rental_car' })),
  ];

  tagged.sort((a, b) => (b.date_updated > a.date_updated ? 1 : -1));

  const total = tagged.length;
  const data = tagged.slice(offset, offset + limit);
  const updatedAtMax = tagged.length
    ? tagged.reduce((max, h) => (h.date_updated > max ? h.date_updated : max), tagged[0].date_updated)
    : null;

  return { data, total, page, limit, updatedAtMax };
}

/**
 * ProductListItem[] — the contract's slim cross-product directory (GET /products).
 * Reuses each type's own list-item shaper for geo/thumbnail, then normalizes into the
 * common {id, object_id, product_type, title, geo:{country,region}, thumbnail,
 * date_updated} envelope. Geo keys differ per type (hotels {country, region};
 * tours/cruises {countries[], destinations[]}; excursions {country, destination};
 * rental_cars/campers {country, place}) — toProductListItem normalizes them, falling
 * back to the first array entry for tours/cruises.
 */
export async function listProductsSlim(
  { page, limit, offset, updated_after, lang },
  context,
) {
  const {
    hotelsService, toursService, excursionsService, cruisesService, campersService, rentalCarsService,
    hotelsFilter, toursFilter, excursionsFilter, cruisesFilter, campersFilter, rentalCarsFilter,
  } = await fetchAllProductTypes({ updated_after }, context);

  const [hotels, tours, excursions, cruises, campers, rental_cars] = await Promise.all([
    hotelsService.readByQuery({ fields: HOTELS_LIST_FIELDS, deep: buildPublicationDeepFilter(), filter: hotelsFilter, limit: -1 }),
    toursService.readByQuery({ fields: TOURS_LIST_FIELDS, filter: toursFilter, limit: -1 }),
    excursionsService.readByQuery({ fields: EXCURSIONS_LIST_FIELDS, filter: excursionsFilter, limit: -1 }),
    cruisesService.readByQuery({ fields: CRUISES_LIST_FIELDS, filter: cruisesFilter, limit: -1 }),
    campersService.readByQuery({ fields: CAMPERS_LIST_FIELDS, filter: campersFilter, limit: -1 }),
    rentalCarsService.readByQuery({ fields: RENTAL_CARS_LIST_FIELDS, filter: rentalCarsFilter, limit: -1 }),
  ]);

  // Each type's list shaper exposes geo under its own keys: hotels use { country, region };
  // tours/cruises use { countries[], destinations[] }; excursions { country, destination };
  // rental_cars/campers { country, place }. Normalize into the common { country, region }
  // envelope — country falls back to the first countries[] entry, region to the first
  // destinations[] entry when the type only exposes arrays.
  const toProductListItem = (productType, listItem) => ({
    id: listItem.id,
    object_id: listItem.object_id ?? null,
    product_type: productType,
    title: listItem.name ?? null,
    geo: {
      country:
        listItem.geo?.country ?? listItem.geo?.countries?.[0] ?? null,
      region:
        listItem.geo?.region ?? listItem.geo?.destinations?.[0] ?? null,
    },
    thumbnail: listItem.thumbnail ?? null,
    date_updated: listItem.date_updated,
  });

  const tagged = [
    ...hotels.map((h) => toProductListItem('hotel', shapeHotelListItem(h, lang))),
    ...tours.map((t) => toProductListItem('tour', shapeTourListItem(t, lang))),
    ...excursions.map((e) => toProductListItem('excursion', shapeExcursionListItem(e, lang))),
    ...cruises.map((c) => toProductListItem('cruise', shapeCruiseListItem(c, lang))),
    ...campers.map((c) => toProductListItem('camper', shapeCamperListItem(c, lang))),
    ...rental_cars.map((r) => toProductListItem('rental_car', shapeRentalCarListItem(r, lang))),
  ];

  tagged.sort((a, b) => (b.date_updated > a.date_updated ? 1 : -1));

  const total = tagged.length;
  const data = tagged.slice(offset, offset + limit);
  const updatedAtMax = tagged.length
    ? tagged.reduce((max, h) => (h.date_updated > max ? h.date_updated : max), tagged[0].date_updated)
    : null;

  return { data, total, page, limit, updatedAtMax };
}

/**
 * Cross-collection single lookup (GET /products/{id}) — the contract's IdParam accepts the
 * UUID or the numeric object_id, so we try each type's own id filter/lookup in turn and
 * return the first match. Ambiguous only in the pathological case of two types sharing the
 * same numeric object_id, which the contract doesn't otherwise disambiguate.
 */
export async function getProductById({ id }, context) {
  const lookups = [
    { type: 'hotel', get: getHotelDetails },
    { type: 'tour', get: getTourDetails },
    { type: 'excursion', get: getExcursionDetails },
    { type: 'cruise', get: getCruiseDetails },
    { type: 'rental_car', get: getRentalCarDetails },
    { type: 'camper', get: getCamperDetails },
  ];

  for (const { type, get } of lookups) {
    try {
      const item = await get({ id }, context);
      return { ...item, _productType: type };
    } catch (e) {
      if (e instanceof AppError && e.statusCode === HTTP_STATUS.NOT_FOUND) continue;
      throw e;
    }
  }

  throw new AppError(`Product not found: ${id}`, HTTP_STATUS.NOT_FOUND);
}

export async function getProductCatalog({ services, database, getSchema }, { publishing_status } = {}) {
  const schema = await getSchema();
  const { ItemsService } = services;

  const collections = [
    { type: 'hotel', collection: HOTELS_COLLECTION, list_url: '/api/v1/hotels', detail_url: '/api/v1/hotels/{id}' },
    { type: 'tour', collection: TOURS_COLLECTION, list_url: '/api/v1/tours', detail_url: '/api/v1/tours/{id}' },
    { type: 'excursion', collection: EXCURSIONS_COLLECTION, list_url: '/api/v1/excursions', detail_url: '/api/v1/excursions/{id}' },
    { type: 'cruise', collection: CRUISES_COLLECTION, list_url: '/api/v1/cruises', detail_url: '/api/v1/cruises/{id}' },
    { type: 'camper', collection: VEHICLES_COLLECTION, filter: { rental_type: 'camper' }, list_url: '/api/v1/campers', detail_url: '/api/v1/campers/{id}' },
    { type: 'rental_car', collection: VEHICLES_COLLECTION, filter: { rental_type: 'car' }, list_url: '/api/v1/rental_cars', detail_url: '/api/v1/rental_cars/{id}' },
  ];

  // 'all' means don't filter by status at all — otherwise default to published.
  const statusFilter = publishing_status === 'all' ? null : (publishing_status ?? DEFAULT_PRIMARIX_STATUS);
  const counts = await Promise.all(
    collections.map((item) => {
      const service = new ItemsService(item.collection, { knex: database, schema });
      let filter = statusFilter ? { status_primarix: { _eq: statusFilter } } : {};
      if (item.filter) {
        filter = { _and: [filter, item.filter] };
      }
      return service.readByQuery({ aggregate: { count: ['*'] }, filter });
    }),
  );

  return collections.map(({ type, list_url, detail_url }, i) => ({
    type,
    total: parseInt(counts[i][0]?.count ?? '0', 10),
    list_url,
    detail_url,
  }));
}
