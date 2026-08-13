import { LIST_FIELDS } from "./tours.fields.js";
import { SURCHARGE_FIELDS } from "./tours.fields.js";
import { ROOT_COLLECTION, DETAIL_RELATIONS } from "./tours.query-config.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
} from "./tours.filters.js";
import { enrichExchangeRates } from "../../../utils/ratesResolver.js";
import { buildPublicationDateRangeFilter } from "../../shared/collectionFilters.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";
import { buildDetailFields } from "../../../shared/query/buildQueryFields.js";
import { createCollectionService } from "../../shared/createCollectionService.js";

const COLLECTION = "tours";
const SURCHARGES_COLLECTION = "tours_surcharges";

const { listSlim, listFull, detailFields } = createCollectionService({
  collection: COLLECTION,
  resourceLabel: "tour",
  listFields: LIST_FIELDS,
  buildListFilter,
  buildSort,
  buildUpdatedAfterFilter,
  getDetails: (params, context) => getTourDetails(params, context),
});

export const listSlimTours = listSlim;
export const listFullTours = listFull;

/**
 * Retrieves and enriches the full details for a specific tour.
 *
 * @param {Object} params - The request parameters.
 * @param {string|number} params.id - The identifier of the tour.
 * @param {string} params.idFilterMode - The mode for filtering by ID (e.g., 'primary', 'object_id').
 * @param {Object} context - The Directus context.
 * @param {Object} context.services - Directus services instance.
 * @param {Object} context.database - Knex database connection.
 * @param {Function} context.getSchema - Function to retrieve the current schema.
 * @returns {Promise<Object>} The enriched tour details.
 * @throws {AppError} If the tour is not found.
 */
export async function getTourDetails({ id, idFilterMode }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const toursService = new ItemsService(COLLECTION, { knex: database, schema });
  const surchargesService = new ItemsService(SURCHARGES_COLLECTION, { knex: database, schema });

  const filter = buildIdFilter(id, idFilterMode);

  const items = await toursService.readByQuery({
    fields: buildDetailFields({ schema, rootCollection: ROOT_COLLECTION, relations: DETAIL_RELATIONS }),
    filter,
    limit: 1,
  });

  const tour = items?.[0] ?? null;
  if (!tour) {
    throw new AppError(`Tour not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  const dateRangeFilter = buildPublicationDateRangeFilter();

  const surcharges = await surchargesService.readByQuery({
    fields: detailFields(schema, SURCHARGES_COLLECTION, SURCHARGE_FIELDS),
    filter: {
      _and: [
        { tours_id: { _eq: tour.id } },
      ],
    },
    limit: -1,
  });

  const tourData = { ...tour, surcharges };
  const enrichedTour = await enrichExchangeRates(tourData, database);
  return enrichedTour;
}
