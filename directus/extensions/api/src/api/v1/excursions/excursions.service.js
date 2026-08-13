import { LIST_FIELDS } from "./excursions.fields.js";
import { SURCHARGE_FIELDS } from "./excursions.fields.js";
import { ROOT_COLLECTION, DETAIL_RELATIONS } from "./excursions.query-config.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
} from "./excursions.filters.js";
import { buildPublicationDateRangeFilter } from "../../shared/collectionFilters.js";
import { enrichExchangeRates } from "../../../utils/ratesResolver.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";
import { buildDetailFields } from "../../../shared/query/buildQueryFields.js";
import { createCollectionService } from "../../shared/createCollectionService.js";

const COLLECTION = "excursions";
const SURCHARGES_COLLECTION = "excursions_surcharges";

const { listSlim, listFull, detailFields } = createCollectionService({
  collection: COLLECTION,
  resourceLabel: "excursion",
  listFields: LIST_FIELDS,
  buildListFilter,
  buildSort,
  buildUpdatedAfterFilter,
  getDetails: (params, context) => getExcursionDetails(params, context),
});

export const listSlimExcursions = listSlim;
export const listFullExcursions = listFull;

/**
 * Retrieves and enriches the full details for a specific excursion.
 *
 * @param {Object} params - The request parameters.
 * @param {string|number} params.id - The identifier of the excursion.
 * @param {string} params.idFilterMode - The mode for filtering by ID (e.g., 'primary', 'object_id').
 * @param {Object} context - The Directus context.
 * @param {Object} context.services - Directus services instance.
 * @param {Object} context.database - Knex database connection.
 * @param {Function} context.getSchema - Function to retrieve the current schema.
 * @returns {Promise<Object>} The enriched excursion details.
 * @throws {AppError} If the excursion is not found.
 */
export async function getExcursionDetails({ id, idFilterMode }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const excursionsService = new ItemsService(COLLECTION, { knex: database, schema });
  const surchargesService = new ItemsService(SURCHARGES_COLLECTION, { knex: database, schema });

  const filter = buildIdFilter(id, idFilterMode);

  const items = await excursionsService.readByQuery({
    fields: buildDetailFields({ schema, rootCollection: ROOT_COLLECTION, relations: DETAIL_RELATIONS }),
    filter,
    limit: 1,
  });

  const excursion = items?.[0] ?? null;
  if (!excursion) {
    throw new AppError(`Excursion not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  const dateRangeFilter = buildPublicationDateRangeFilter();

  const surcharges = await surchargesService.readByQuery({
    fields: detailFields(schema, SURCHARGES_COLLECTION, SURCHARGE_FIELDS),
    filter: {
      _and: [
        { excursion_id: { _eq: excursion.id } },
        { status: { _eq: "published" } },
        ...dateRangeFilter,
      ],
    },
    limit: -1,
  });

  const excursionData = { ...excursion, surcharges };
  const enrichedExcursion = await enrichExchangeRates(excursionData, database);
  return enrichedExcursion;
}
