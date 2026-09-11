import { DETAIL_FIELDS, SURCHARGE_FIELDS } from "./excursions.fields.js";
import { excursions as excursionsFilters } from "../../shared/collectionFilters.js";
const { buildIdFilter, buildPublicationDeepFilter } = excursionsFilters;
import { createQueryConfig } from "../../shared/createQueryConfig.js";
import { fetchProductDetail } from "../../shared/fetchProductDetail.js";

const COLLECTION = "excursions";
const SURCHARGES_COLLECTION = "excursions_surcharges";

export const { ROOT_COLLECTION, DETAIL_RELATIONS } = createQueryConfig(
  COLLECTION,
  DETAIL_FIELDS,
);

/**
 * Retrieves and enriches the full details for a specific excursion.
 *
 * @param {Object} params - The request parameters.
 * @param {string|number} params.id - The identifier of the excursion.
 * @param {string} params.idFilterMode - The mode for filtering by ID (e.g., 'primary', 'object_id').
 * @param {Object} context - The Directus context.
 * @returns {Promise<Object>} The enriched excursion details.
 * @throws {AppError} If the excursion is not found.
 */
export async function getExcursionDetails({ id, idFilterMode, partnerId, partnerVisibility }, context) {
  return fetchProductDetail(
    { id, idFilterMode, partnerId, partnerVisibility },
    {
      collection: COLLECTION,
      resourceLabel: "Excursion",
      rootCollection: ROOT_COLLECTION,
      detailRelations: DETAIL_RELATIONS,
      buildIdFilter,
      buildPublicationDeepFilter,
      subCollection: {
        name: SURCHARGES_COLLECTION,
        idField: "excursion_id",
        fields: SURCHARGE_FIELDS,
        resultKey: "surcharges",
        /* excursions_surcharges carries status/publish_start/publish_end (verified live) — see
         * fetchProductDetail's publicationFiltered comment. */
        publicationFiltered: true,
      },
    },
    context,
  );
}
