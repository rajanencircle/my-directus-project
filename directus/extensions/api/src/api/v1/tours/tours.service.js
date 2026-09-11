import { DETAIL_FIELDS, SURCHARGE_FIELDS } from "./tours.fields.js";
import { tours as toursFilters } from "../../shared/collectionFilters.js";
const { buildIdFilter, buildPublicationDeepFilter } = toursFilters;
import { createQueryConfig } from "../../shared/createQueryConfig.js";
import { fetchProductDetail } from "../../shared/fetchProductDetail.js";

const COLLECTION = "tours";
const SURCHARGES_COLLECTION = "tours_surcharges";

export const { ROOT_COLLECTION, DETAIL_RELATIONS } = createQueryConfig(
  COLLECTION,
  DETAIL_FIELDS,
);

/**
 * Retrieves and enriches the full details for a specific tour.
 *
 * @param {Object} params - The request parameters.
 * @param {string|number} params.id - The identifier of the tour.
 * @param {string} params.idFilterMode - The mode for filtering by ID (e.g., 'primary', 'object_id').
 * @param {Object} context - The Directus context.
 * @returns {Promise<Object>} The enriched tour details.
 * @throws {AppError} If the tour is not found.
 */
export async function getTourDetails({ id, idFilterMode, partnerId, partnerVisibility }, context) {
  return fetchProductDetail(
    { id, idFilterMode, partnerId, partnerVisibility },
    {
      collection: COLLECTION,
      resourceLabel: "Tour",
      rootCollection: ROOT_COLLECTION,
      detailRelations: DETAIL_RELATIONS,
      buildIdFilter,
      buildPublicationDeepFilter,
      subCollection: {
        name: SURCHARGES_COLLECTION,
        idField: "tours_id",
        fields: SURCHARGE_FIELDS,
        resultKey: "surcharges",
        /* tours_surcharges carries status/publish_start/publish_end (verified live) — see
         * fetchProductDetail's publicationFiltered comment. */
        publicationFiltered: true,
      },
    },
    context,
  );
}
