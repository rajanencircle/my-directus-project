import { DETAIL_FIELDS, SURCHARGE_FIELDS, CHILD_RC_FIELDS } from "./hotels.fields.js";
import { hotels as hotelFilters } from "../../shared/collectionFilters.js";
const { buildIdFilter, buildPublicationDeepFilter } = hotelFilters;
import { buildPublicationDateRangeFilter } from "../../shared/collectionFilters.js";
import { enrichExchangeRates } from "../../../utils/ratesResolver.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";
import { buildDetailFields } from "../../../shared/query/buildQueryFields.js";
import { createQueryConfig } from "../../shared/createQueryConfig.js";

const COLLECTION = "hotels";
const SURCHARGES_COLLECTION = "surcharges";
const ROOM_CATEGORIES_COLLECTION = "room_categories";

export const { ROOT_COLLECTION, DETAIL_RELATIONS } = createQueryConfig(
  COLLECTION,
  DETAIL_FIELDS,
);

function detailFields(schema, rootCollection, fieldList) {
  return buildDetailFields({
    schema,
    rootCollection,
    relations: fieldList.filter((f) => f.includes(".")),
  });
}

/**
 * Retrieves and enriches the full details for a specific hotel.
 *
 * @param {Object} params - The request parameters.
 * @param {string|number} params.id - The identifier of the hotel.
 * @param {string} params.idFilterMode - The mode for filtering by ID (e.g., 'primary', 'object_id').
 * @param {Object} context - The Directus context.
 * @param {Object} context.services - Directus services instance.
 * @param {Object} context.database - Knex database connection.
 * @param {Function} context.getSchema - Function to retrieve the current schema.
 * @returns {Promise<Object>} The enriched hotel details.
 * @throws {AppError} If the hotel is not found.
 */
export async function getHotelDetails(
  { id, idFilterMode },
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
  const roomCategoriesService = new ItemsService(ROOM_CATEGORIES_COLLECTION, {
    knex: database,
    schema,
  });

  const filter = buildIdFilter(id, idFilterMode);

  const dateRangeFilter = buildPublicationDateRangeFilter();

  const items = await hotelsService.readByQuery({
    fields: buildDetailFields({
      schema,
      rootCollection: ROOT_COLLECTION,
      relations: DETAIL_RELATIONS,
    }),
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
      fields: detailFields(schema, ROOM_CATEGORIES_COLLECTION, CHILD_RC_FIELDS),
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

  /*
   * Construct a map of parent categories. Child rows only carry their own structural identifiers,
   * while all rich metadata is sourced from the parent, ensuring a single canonical source of truth.
   */
  const parentCatMap = new Map(
    (hotel.room_categories ?? []).map((rc) => [rc.id, rc]),
  );
  const enrichedChildCategories = childCategories.map((child) => {
    const parent = parentCatMap.get(child.sharedId);
    if (!parent) return child;
    return {
      ...child,
      /* Populate child row with parent metadata, as child rows act merely as weekday-split artifacts. */
      room_category: parent.room_category,
      room_category_catering: parent.room_category_catering,
      room_category_calc_type: parent.room_category_calc_type,
      room_category_booking_code: parent.room_category_booking_code,
      room_category_tour32_name: parent.room_category_tour32_name,
      translations: parent.translations,
      status: parent.status,
      publish_start: parent.publish_start,
      publish_end: parent.publish_end,
    };
  });

  const splitParentIds = new Set(
    enrichedChildCategories.map((c) => c.sharedId),
  );
  const roomCategories = [
    ...(hotel.room_categories ?? []).filter((rc) => !splitParentIds.has(rc.id)),
    ...enrichedChildCategories,
  ];

  const surcharges = await surchargesService.readByQuery({
    fields: detailFields(schema, SURCHARGES_COLLECTION, SURCHARGE_FIELDS),
    filter: {
      _and: [
        { hotel_id: { _eq: hotel.id } },
        { status: { _eq: "published" } },
        ...dateRangeFilter,
      ],
    },
    limit: -1,
  });

  const hotelData = {
    ...hotel,
    room_categories: roomCategories,
    surcharges,
    surcharge_settings: surchargeSettings,
  };
  const enrichedHotel = await enrichExchangeRates(hotelData, database);
  return enrichedHotel;
}
