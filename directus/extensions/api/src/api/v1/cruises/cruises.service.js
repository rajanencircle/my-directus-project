import { LIST_FIELDS } from "./cruises.fields.js";
import { CRUISES_PRICES_FIELDS } from "./cruises.fields.js";
import { ROOT_COLLECTION, DETAIL_RELATIONS } from "./cruises.query-config.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
} from "./cruises.filters.js";
import { enrichExchangeRates } from "../../../utils/ratesResolver.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";
import { buildDetailFields } from "../../../shared/query/buildQueryFields.js";
import { createCollectionService } from "../../shared/createCollectionService.js";

const COLLECTION = "cruises";
const PRICES_COLLECTION = "cruises_prices";

const { listSlim, listFull, detailFields } = createCollectionService({
  collection: COLLECTION,
  resourceLabel: "cruise",
  listFields: LIST_FIELDS,
  buildListFilter,
  buildSort,
  buildUpdatedAfterFilter,
  getDetails: (params, context) => getCruiseDetails(params, context),
});

export const listSlimCruises = listSlim;
export const listFullCruises = listFull;

/**
 * Retrieves and enriches the full details for a specific cruise.
 *
 * @param {Object} params - The request parameters.
 * @param {string|number} params.id - The identifier of the cruise.
 * @param {string} params.idFilterMode - The mode for filtering by ID (e.g., 'primary', 'object_id').
 * @param {Object} context - The Directus context.
 * @param {Object} context.services - Directus services instance.
 * @param {Object} context.database - Knex database connection.
 * @param {Function} context.getSchema - Function to retrieve the current schema.
 * @returns {Promise<Object>} The enriched cruise details.
 * @throws {AppError} If the cruise is not found.
 */
export async function getCruiseDetails({ id, idFilterMode }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const cruisesService = new ItemsService(COLLECTION, { knex: database, schema });
  const pricesService = new ItemsService(PRICES_COLLECTION, { knex: database, schema });

  const filter = buildIdFilter(id, idFilterMode);

  const items = await cruisesService.readByQuery({
    fields: buildDetailFields({ schema, rootCollection: ROOT_COLLECTION, relations: DETAIL_RELATIONS }),
    filter,
    limit: 1,
  });

  const cruise = items?.[0] ?? null;
  if (!cruise) {
    throw new AppError(`Cruise not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  const prices = await pricesService.readByQuery({
    fields: detailFields(schema, PRICES_COLLECTION, CRUISES_PRICES_FIELDS),
    filter: { cruises_id: { _eq: cruise.id } },
    limit: -1,
  });

  const cruiseData = { ...cruise, prices };
  const enrichedCruise = await enrichExchangeRates(cruiseData, database);
  return enrichedCruise;
}
