import { DETAIL_FIELDS, CRUISES_PRICES_FIELDS } from "./cruises.fields.js";
import { cruises as cruisesFilters } from "../../shared/collectionFilters.js";
const { buildIdFilter, buildPublicationDeepFilter } = cruisesFilters;
import { createQueryConfig } from "../../shared/createQueryConfig.js";
import { fetchProductDetail } from "../../shared/fetchProductDetail.js";

const COLLECTION = "cruises";
const PRICES_COLLECTION = "cruises_prices";

export const { ROOT_COLLECTION, DETAIL_RELATIONS } = createQueryConfig(
  COLLECTION,
  DETAIL_FIELDS,
);

/**
 * Retrieves and enriches the full details for a specific cruise.
 *
 * @param {Object} params - The request parameters.
 * @param {string|number} params.id - The identifier of the cruise.
 * @param {string} params.idFilterMode - The mode for filtering by ID (e.g., 'primary', 'object_id').
 * @param {Object} context - The Directus context.
 * @returns {Promise<Object>} The enriched cruise details.
 * @throws {AppError} If the cruise is not found.
 */
export async function getCruiseDetails({ id, idFilterMode, partnerId, partnerVisibility }, context) {
  return fetchProductDetail(
    { id, idFilterMode, partnerId, partnerVisibility },
    {
      collection: COLLECTION,
      resourceLabel: "Cruise",
      rootCollection: ROOT_COLLECTION,
      detailRelations: DETAIL_RELATIONS,
      buildIdFilter,
      buildPublicationDeepFilter,
      subCollection: {
        name: PRICES_COLLECTION,
        idField: "cruises_id",
        fields: CRUISES_PRICES_FIELDS,
        resultKey: "prices",
        /* cruises_prices has no status/publish_start/publish_end columns (verified live) —
         * unlike tours_surcharges/excursions_surcharges, so no publication filter applies. */
        publicationFiltered: false,
      },
    },
    context,
  );
}
