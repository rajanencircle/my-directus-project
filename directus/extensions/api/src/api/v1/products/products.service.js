import { LIST_FIELDS as HOTELS_LIST_FIELDS } from "../hotels/hotels.fields.js";
import { hotels as hotelFilters } from "../../shared/collectionFilters.js";
import { LIST_FIELDS as TOURS_LIST_FIELDS } from "../tours/tours.fields.js";
import { buildUpdatedAfterFilter as buildToursUpdatedAfterFilter } from "../tours/tours.filters.js";
import { LIST_FIELDS as EXCURSIONS_LIST_FIELDS } from "../excursions/excursions.fields.js";
import { buildUpdatedAfterFilter as buildExcursionsUpdatedAfterFilter } from "../excursions/excursions.filters.js";
import { LIST_FIELDS as CRUISES_LIST_FIELDS } from "../cruises/cruises.fields.js";
import { buildUpdatedAfterFilter as buildCruisesUpdatedAfterFilter } from "../cruises/cruises.filters.js";
import { LIST_FIELDS as CAMPERS_LIST_FIELDS } from "../campers/campers.fields.js";
import { buildUpdatedAfterFilter as buildCampersUpdatedAfterFilter } from "../campers/campers.filters.js";
import { LIST_FIELDS as RENTAL_CARS_LIST_FIELDS } from "../rental_cars/rental-cars.fields.js";
import { buildUpdatedAfterFilter as buildRentalCarsUpdatedAfterFilter } from "../rental_cars/rental-cars.filters.js";
import {
  ROOT_COLLECTION as HOTELS_ROOT,
  DETAIL_RELATIONS as HOTELS_RELATIONS,
} from "../hotels/hotels.service.js";
import {
  ROOT_COLLECTION as TOURS_ROOT,
  DETAIL_RELATIONS as TOURS_RELATIONS,
} from "../tours/tours.query-config.js";
import {
  ROOT_COLLECTION as EXCURSIONS_ROOT,
  DETAIL_RELATIONS as EXCURSIONS_RELATIONS,
} from "../excursions/excursions.query-config.js";
import {
  ROOT_COLLECTION as CRUISES_ROOT,
  DETAIL_RELATIONS as CRUISES_RELATIONS,
} from "../cruises/cruises.query-config.js";
import {
  ROOT_COLLECTION as CAMPERS_ROOT,
  DETAIL_RELATIONS as CAMPERS_RELATIONS,
} from "../campers/campers.query-config.js";
import {
  ROOT_COLLECTION as RENTAL_CARS_ROOT,
  DETAIL_RELATIONS as RENTAL_CARS_RELATIONS,
} from "../rental_cars/rental-cars.query-config.js";
import { buildDetailFields } from "../../../shared/query/buildQueryFields.js";
import { getHotelDetails } from "../hotels/hotels.service.js";
import { getTourDetails } from "../tours/tours.service.js";
import { getExcursionDetails } from "../excursions/excursions.service.js";
import { getCruiseDetails } from "../cruises/cruises.service.js";
import { getRentalCarDetails } from "../rental_cars/rental-cars.service.js";
import { getCamperDetails } from "../campers/campers.service.js";
import { shapeHotelListItem } from "../../../transformers/hotel.transformer.js";
import { shapeTourListItem } from "../../../transformers/tour.transformer.js";
import { shapeExcursionListItem } from "../../../transformers/excursion.transformer.js";
import { shapeCruiseListItem } from "../../../transformers/cruise.transformer.js";
import { shapeRentalCarListItem } from "../../../transformers/rental_car.transformer.js";
import { shapeCamperListItem } from "../../../transformers/camper.transformer.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";
import { DEFAULT_PRIMARIX_STATUS } from "../../shared/constants.js";

const { buildUpdatedAfterFilter, buildPublicationDeepFilter } = hotelFilters;

const HOTELS_COLLECTION = "hotels";
const TOURS_COLLECTION = "tours";
const EXCURSIONS_COLLECTION = "excursions";
const CRUISES_COLLECTION = "cruises";
const VEHICLES_COLLECTION = "vehicles";

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
/**
 * Registry configuration for product types.
 *
 * @property {string} key - Property-name prefix used to build Service/Filter entries (e.g., 'hotels').
 * @property {string} productType - The singular tag assigned to `_productType` / `ProductListItem.product_type`.
 * @property {Function|null} deepFilter - Nested publication filtering. Currently, only 'hotels' utilizes this for 
 *   `room_categories`/`price_dates`; all other types are null.
 * @property {Object} detailRoot/detailRelations - Schema-validated field-path configurations for full detail fetches.
 * @property {Array|Function} listFields/listShaper - Static field list and list-item transformation logic for slim fetches.
 *
 * @note Order of insertion is strictly critical. `listProducts` and `listProductsSlim` construct their aggregated 
 * arrays by iterating over this registry sequentially. The final sorting comparator relies entirely on this insertion 
 * order to provide stable tie-breaking for records sharing identical update timestamps. 
 * Do not alter this sequence (hotels, tours, excursions, cruises, campers, rentalCars) without addressing the 
 * underlying tie-break logic.
 */
const PRODUCT_TYPE_REGISTRY = [
  {
    key: "hotels",
    productType: "hotel",
    collection: HOTELS_COLLECTION,
    buildUpdatedAfterFilter,
    extraFilter: null,
    deepFilter: buildPublicationDeepFilter,
    detailRoot: HOTELS_ROOT,
    detailRelations: HOTELS_RELATIONS,
    listFields: HOTELS_LIST_FIELDS,
    listShaper: shapeHotelListItem,
  },
  {
    key: "tours",
    productType: "tour",
    collection: TOURS_COLLECTION,
    buildUpdatedAfterFilter: buildToursUpdatedAfterFilter,
    extraFilter: null,
    deepFilter: null,
    detailRoot: TOURS_ROOT,
    detailRelations: TOURS_RELATIONS,
    listFields: TOURS_LIST_FIELDS,
    listShaper: shapeTourListItem,
  },
  {
    key: "excursions",
    productType: "excursion",
    collection: EXCURSIONS_COLLECTION,
    buildUpdatedAfterFilter: buildExcursionsUpdatedAfterFilter,
    extraFilter: null,
    deepFilter: null,
    detailRoot: EXCURSIONS_ROOT,
    detailRelations: EXCURSIONS_RELATIONS,
    listFields: EXCURSIONS_LIST_FIELDS,
    listShaper: shapeExcursionListItem,
  },
  {
    key: "cruises",
    productType: "cruise",
    collection: CRUISES_COLLECTION,
    buildUpdatedAfterFilter: buildCruisesUpdatedAfterFilter,
    extraFilter: null,
    deepFilter: null,
    detailRoot: CRUISES_ROOT,
    detailRelations: CRUISES_RELATIONS,
    listFields: CRUISES_LIST_FIELDS,
    listShaper: shapeCruiseListItem,
  },
  {
    key: "campers",
    productType: "camper",
    collection: VEHICLES_COLLECTION,
    buildUpdatedAfterFilter: buildCampersUpdatedAfterFilter,
    extraFilter: { rental_type: { _eq: "camper" } },
    deepFilter: null,
    detailRoot: CAMPERS_ROOT,
    detailRelations: CAMPERS_RELATIONS,
    listFields: CAMPERS_LIST_FIELDS,
    listShaper: shapeCamperListItem,
  },
  {
    key: "rentalCars",
    productType: "rental_car",
    collection: VEHICLES_COLLECTION,
    buildUpdatedAfterFilter: buildRentalCarsUpdatedAfterFilter,
    extraFilter: { rental_type: { _eq: "car" } },
    deepFilter: null,
    detailRoot: RENTAL_CARS_ROOT,
    detailRelations: RENTAL_CARS_RELATIONS,
    listFields: RENTAL_CARS_LIST_FIELDS,
    listShaper: shapeRentalCarListItem,
  },
];

async function fetchAllProductTypes(
  { updated_after, includeTombstones = false },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;

  /*
   * Full snapshots strictly mandate published records. 
   * However, when utilizing a delta cursor (`updated_after`) alongside `includeTombstones` 
   * (applicable to `/products/full`), status filtering is bypassed. This ensures records transitioning 
   * out of 'published' status are surfaced, enabling `shapeProduct()` to generate a tombstone payload 
   * `{ publishing_status, details: null }` rather than silently dropping from sync updates.
   * Conversely, the slim list (`/products`) retains strict published-only filtering across all queries.
   */
  const statusFilter = DEFAULT_PRIMARIX_STATUS;
  const publishedFilter = (delta) => {
    if (delta && includeTombstones) return delta;
    const statusClause = { status_primarix: { _eq: statusFilter } };
    if (delta) return { _and: [statusClause, delta] };
    return statusClause;
  };

  const result = { schema };
  for (const entry of PRODUCT_TYPE_REGISTRY) {
    result[`${entry.key}Service`] = new ItemsService(entry.collection, {
      knex: database,
      schema,
    });
    const filter = publishedFilter(
      entry.buildUpdatedAfterFilter(updated_after),
    );
    result[`${entry.key}Filter`] = entry.extraFilter
      ? { _and: [filter, entry.extraFilter] }
      : filter;
  }
  return result;
}

export async function listProducts(
  { page, limit, offset, updated_after },
  context,
) {
  const result = await fetchAllProductTypes(
    { updated_after, includeTombstones: true },
    context,
  );
  const { schema } = result;

  /*
   * Field selection operates via schema-validation per type rather than relying on raw static `DETAIL_FIELDS` arrays.
   * This architectural choice ensures that if a Directus field is renamed or removed, the query gracefully degrades 
   * the specific field to a 'missing' state, preventing systemic 403 authorization failures across the entire 
   * aggregated endpoint for all product types.
   */
  const perTypeResults = await Promise.all(
    PRODUCT_TYPE_REGISTRY.map((entry) =>
      result[`${entry.key}Service`].readByQuery({
        fields: buildDetailFields({
          schema,
          rootCollection: entry.detailRoot,
          relations: entry.detailRelations,
        }),
        ...(entry.deepFilter ? { deep: entry.deepFilter() } : {}),
        filter: result[`${entry.key}Filter`],
        limit: -1,
      }),
    ),
  );

  const tagged = PRODUCT_TYPE_REGISTRY.flatMap((entry, i) =>
    perTypeResults[i].map((item) => ({
      ...item,
      _productType: entry.productType,
    })),
  );

  tagged.sort((a, b) => {
    if (b.source_updated_at !== a.source_updated_at) {
      return b.source_updated_at > a.source_updated_at ? 1 : -1;
    }
    if (b._productType !== a._productType) {
      return b._productType > a._productType ? 1 : -1;
    }
    return b.id - a.id;
  });

  const total = tagged.length;
  const data = tagged.slice(offset, offset + limit);
  const updatedAtMax = tagged.length
    ? tagged.reduce(
        (max, h) => (h.source_updated_at > max ? h.source_updated_at : max),
        tagged[0].source_updated_at,
      )
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
  const result = await fetchAllProductTypes({ updated_after }, context);

  const perTypeResults = await Promise.all(
    PRODUCT_TYPE_REGISTRY.map((entry) =>
      result[`${entry.key}Service`].readByQuery({
        fields: entry.listFields,
        ...(entry.deepFilter ? { deep: entry.deepFilter() } : {}),
        filter: result[`${entry.key}Filter`],
        limit: -1,
      }),
    ),
  );

  /*
   * Geolocation normalization. Disparate product types expose geolocation data under unique keys 
   * (e.g., hotels use `{ country, region }`, tours use `{ countries[], destinations[] }`). 
   * This transformation enforces a standardized `{ country, region }` envelope. 
   * Fallback logic resolves `country` from the first `countries[]` entry and `region` from the 
   * first `destinations[]` or `place` entity when a native `region` is absent.
   */
  const toProductListItem = (productType, listItem) => ({
    id: listItem.id,
    object_id: listItem.object_id ?? null,
    product_type: productType,
    title: listItem.name ?? null,
    geo: {
      country: listItem.geo?.country ?? listItem.geo?.countries?.[0] ?? null,
      region:
        listItem.geo?.region ??
        listItem.geo?.destinations?.[0] ??
        listItem.geo?.place ??
        null,
    },
    thumbnail: listItem.thumbnail ?? null,
    date_updated: listItem.date_updated,
  });

  const tagged = PRODUCT_TYPE_REGISTRY.flatMap((entry, i) =>
    perTypeResults[i].map((item) =>
      toProductListItem(entry.productType, entry.listShaper(item, lang)),
    ),
  );

  tagged.sort((a, b) => {
    if (b.date_updated !== a.date_updated) {
      return b.date_updated > a.date_updated ? 1 : -1;
    }
    if (b._productType !== a._productType) {
      return b._productType > a._productType ? 1 : -1;
    }
    return b.id - a.id;
  });

  const total = tagged.length;
  const data = tagged.slice(offset, offset + limit);
  const updatedAtMax = tagged.length
    ? tagged.reduce(
        (max, h) => (h.date_updated > max ? h.date_updated : max),
        tagged[0].date_updated,
      )
    : null;

  return { data, total, page, limit, updatedAtMax };
}

/**
 * Cross-collection single lookup (GET /products/{id}) — the contract's IdParam accepts the
 * UUID or the numeric object_id, so we try each type's own id filter/lookup in turn and
 * return the first match.
 *
 * For a numeric id this runs in two passes — every type's object_id first, then every
 * type's raw internal id — instead of checking both per-type before moving to the next
 * type. object_id is the customer-facing identifier the contract's IdParam is documented
 * around, while the internal id is only a legacy/backward-compat fallback; a bare
 * "check both, per type, in registry order" previously let one type's raw id accidentally
 * win over the actually-intended type's object_id whenever both were numerically equal
 * (e.g. object_id 161 on a cruise vs. internal id 161 on an unrelated hotel row) — since
 * hotels is checked first in the registry, the wrong record could be returned. Exhausting
 * object_id across every type before ever falling back to id removes that ambiguity for
 * the common case; it remains ambiguous only if two types share both fields with the same
 * value, which the contract doesn't otherwise disambiguate.
 */
export async function getProductById({ id }, context) {
  const lookups = [
    { type: "hotel", get: getHotelDetails },
    { type: "tour", get: getTourDetails },
    { type: "excursion", get: getExcursionDetails },
    { type: "cruise", get: getCruiseDetails },
    { type: "rental_car", get: getRentalCarDetails },
    { type: "camper", get: getCamperDetails },
  ];

  const idFilterModes = /^\d+$/.test(id) ? ["object_id", "id"] : [undefined];

  for (const idFilterMode of idFilterModes) {
    for (const { type, get } of lookups) {
      try {
        const item = await get({ id, idFilterMode }, context);
        return { ...item, _productType: type };
      } catch (e) {
        if (e instanceof AppError && e.statusCode === HTTP_STATUS.NOT_FOUND)
          continue;
        throw e;
      }
    }
  }

  throw new AppError(`Product not found: ${id}`, HTTP_STATUS.NOT_FOUND);
}
