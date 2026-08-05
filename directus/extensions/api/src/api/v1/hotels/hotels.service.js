import { LIST_FIELDS } from "./hotels.fields.js";
import {
  SURCHARGE_FIELDS,
  CHILD_RC_FIELDS,
} from "./hotels.fields.js";
import { ROOT_COLLECTION, DETAIL_RELATIONS } from "./hotels.query-config.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
  buildPublicationDeepFilter,
} from "./hotels.filters.js";
import { enrichExchangeRates } from "../../../utils/ratesResolver.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";
import { buildDetailFields } from "../../../shared/query/buildQueryFields.js";
import { computeUpdatedAtMax } from "../../../utils/delta.js";

const COLLECTION = "hotels";
const SURCHARGES_COLLECTION = "surcharges";

export async function listSlimHotels(
  { page, limit, offset, publishing_status },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const hotelsService = new ItemsService(COLLECTION, {
    knex: database,
    schema,
  });

  const filter = buildListFilter({ publishing_status });

  const [rawItems, countResult] = await Promise.all([
    hotelsService.readByQuery({
      fields: LIST_FIELDS,
      sort: buildSort(),
      limit,
      offset,
      filter,
    }),
    hotelsService.readByQuery({
      aggregate: { count: ["*"] },
      filter,
    }),
  ]);

  const total = parseInt(countResult[0]?.count ?? "0", 10);
  const items = rawItems.map(({ source_updated_at, ...rest }) => rest);

  const updatedAtMax = computeUpdatedAtMax(rawItems);
  return { data: items, total, page, limit, updatedAtMax };
}

export async function listFullHotels(
  { page, limit, offset, publishing_status, updated_after },
  context,
) {
  const { services, database, getSchema } = context;
  const schema = await getSchema();
  const { ItemsService } = services;
  const hotelsService = new ItemsService(COLLECTION, {
    knex: database,
    schema,
  });

  const listFilter = buildListFilter({ publishing_status });
  const deltaFilter = buildUpdatedAfterFilter(updated_after);
  const filter = deltaFilter ? { _and: [listFilter, deltaFilter] } : listFilter;

  const [rawItems, countResult] = await Promise.all([
    hotelsService.readByQuery({
      fields: LIST_FIELDS,
      sort: buildSort(),
      limit,
      offset,
      filter,
    }),
    hotelsService.readByQuery({
      aggregate: { count: ["*"] },
      filter,
    }),
  ]);

  const total = parseInt(countResult[0]?.count ?? "0", 10);
  const updatedAtMax = computeUpdatedAtMax(rawItems);

  // Reusing getHotelDetails for each ID to ensure all nested queries (surcharges, etc) are built identically.
  // In a high-traffic production system this should be optimized to batch queries, but for now we reuse existing logic.
  const data = [];
  for (const item of rawItems) {
    try {
      const detail = await getHotelDetails({ id: item.id.toString() }, context);
      data.push(detail);
    } catch (e) {
      console.error(`Failed to fetch full detail for hotel ${item.id}`, e);
    }
  }

  return { data, total, page, limit, updatedAtMax };
}

export async function getHotelDetails(
  { id },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const hotelsService = new ItemsService(COLLECTION, {
    knex: database,
    schema,
  });
  const surchargesService = new ItemsService(SURCHARGES_COLLECTION, {
    knex: database,
    schema,
  });
  const roomCategoriesService = new ItemsService("room_categories", {
    knex: database,
    schema,
  });

  const filter = buildIdFilter(id);

  const today = new Date().toISOString().slice(0, 10);
  const dateRangeFilter = [
    {
      _or: [
        { publish_start: { _null: true } },
        { publish_start: { _lte: today } },
      ],
    },
    {
      _or: [{ publish_end: { _null: true } }, { publish_end: { _gte: today } }],
    },
  ];

  const items = await hotelsService.readByQuery({
    fields: buildDetailFields({ schema, rootCollection: ROOT_COLLECTION, relations: DETAIL_RELATIONS }),
    filter,
    limit: 1,
    deep: buildPublicationDeepFilter(),
  });

  const hotel = items?.[0] ?? null;
  if (!hotel) {
    throw new AppError(`Hotel not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  const surchargeSettings = hotel.surcharges;

  const parentIds = (hotel.room_categories ?? []).map((rc) => rc.id);
  let childCategories = [];
  if (parentIds.length > 0) {
    childCategories = await roomCategoriesService.readByQuery({
      fields: CHILD_RC_FIELDS,
      filter: {
        _and: [
          { sharedId: { _in: parentIds } },
          { id: { _nin: parentIds } },
          { status: { _eq: "published" } },
          ...dateRangeFilter,
        ],
      },
      limit: -1,
    });
  }

  const splitParentIds = new Set(childCategories.map((c) => c.sharedId));
  const roomCategories = [
    ...(hotel.room_categories ?? []).filter((rc) => !splitParentIds.has(rc.id)),
    ...childCategories,
  ];

  const surcharges = await surchargesService.readByQuery({
    fields: SURCHARGE_FIELDS,
    filter: {
      _and: [
        { hotel_id: { _eq: hotel.id } },
        { status: { _eq: "published" } },
        ...dateRangeFilter,
      ],
    },
    limit: -1,
  });

  const hotelData = { ...hotel, room_categories: roomCategories, surcharges, surcharge_settings: surchargeSettings };
  const enrichedHotel = await enrichExchangeRates(hotelData, database);
  return enrichedHotel;
}
