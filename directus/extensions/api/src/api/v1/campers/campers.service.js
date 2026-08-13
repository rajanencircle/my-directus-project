import { LIST_FIELDS } from "./campers.fields.js";
import {
  SURCHARGE_FIELDS,
  ZONE_FIELDS,
  PRICE_PERIOD_FIELDS,
  RENTAL_PERIOD_FIELDS,
  PRICE_FIELDS,
  PRICE_CALCULATION_FIELDS,
  SURCHARGE_CALCULATION_FIELDS,
} from "./campers.fields.js";
import { ROOT_COLLECTION, DETAIL_RELATIONS } from "./campers.query-config.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
} from "./campers.filters.js";
import { createCollectionService } from "../../shared/createCollectionService.js";
import { fetchVehicleDetail } from "../../shared/fetchVehicleDetail.js";

const COLLECTION = "vehicles";

const { listSlim, listFull, detailFields } = createCollectionService({
  collection: COLLECTION,
  resourceLabel: "camper",
  listFields: LIST_FIELDS,
  buildListFilter,
  buildSort,
  buildUpdatedAfterFilter,
  getDetails: (params, context) => getCamperDetails(params, context),
});

export const listSlimCampers = listSlim;
export const listFullCampers = listFull;

/**
 * Retrieves and enriches the full details for a specific camper.
 * Delegates the underlying fetch and enrichment logic to the shared `fetchVehicleDetail` utility.
 *
 * @param {Object} params - The request parameters.
 * @param {string|number} params.id - The identifier of the camper.
 * @param {string} params.idFilterMode - The mode for filtering by ID (e.g., 'primary', 'object_id').
 * @param {Object} context - The Directus context.
 * @returns {Promise<Object>} The enriched camper details.
 */
export async function getCamperDetails({ id, idFilterMode }, context) {
  return fetchVehicleDetail(
    {
      id,
      idFilterMode,
      rentalType: "camper",
      resourceLabel: "Camper",
      rootCollection: ROOT_COLLECTION,
      detailRelations: DETAIL_RELATIONS,
      fields: {
        buildIdFilter,
        SURCHARGE_FIELDS,
        ZONE_FIELDS,
        PRICE_PERIOD_FIELDS,
        RENTAL_PERIOD_FIELDS,
        PRICE_FIELDS,
        PRICE_CALCULATION_FIELDS,
        SURCHARGE_CALCULATION_FIELDS,
      },
    },
    context,
  );
}
