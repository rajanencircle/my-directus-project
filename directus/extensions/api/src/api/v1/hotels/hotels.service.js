import {
  DETAIL_FIELDS,
  SURCHARGE_FIELDS,
  CHILD_RC_FIELDS,
} from "./hotels.fields.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
  buildPublicationDeepFilter,
} from "./hotels.filters.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";

const COLLECTION = "hotels";
const SURCHARGES_COLLECTION = "surcharges";

export async function listHotels(
  { page, limit, offset, search, country, sort, updated_after },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const hotelsService = new ItemsService(COLLECTION, {
    knex: database,
    schema,
  });

  const listFilter = buildListFilter({ search, country });
  const deltaFilter = buildUpdatedAfterFilter(updated_after);
  const filter = deltaFilter ? { _and: [listFilter, deltaFilter] } : listFilter;

  const [items, countResult] = await Promise.all([
    hotelsService.readByQuery({
      fields: ['id', 'name', 'object_id', 'date_updated'],
      sort: buildSort(sort),
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
  const updatedAtMax = items.length
    ? items.reduce(
        (max, h) => (h.date_updated > max ? h.date_updated : max),
        items[0].date_updated,
      )
    : null;

  return { data: items, total, page, limit, updatedAtMax };
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
    fields: DETAIL_FIELDS,
    filter,
    limit: 1,
    deep: buildPublicationDeepFilter(),
  });

  const hotel = items?.[0] ?? null;
  if (!hotel) {
    throw new AppError(`Hotel not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  // Fetch child room categories (hotel_id = null, linked via sharedId)
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

  // If a parent has been split (children exist), exclude it — show children only
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

  return { ...hotel, room_categories: roomCategories, surcharges };
}
