import { LIST_FIELDS } from "./rental-cars.fields.js";
import { CAMPER_SPECS_FIELDS } from "./rental-cars.fields.js";
import {
  SURCHARGE_FIELDS,
  ZONE_FIELDS,
  PRICE_PERIOD_FIELDS,
  RENTAL_PERIOD_FIELDS,
  PRICE_FIELDS,
  PRICE_CALCULATION_FIELDS,
  SURCHARGE_CALCULATION_FIELDS,
} from "./rental-cars.fields.js";
import { ROOT_COLLECTION, DETAIL_RELATIONS } from "./rental-cars.query-config.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
} from "./rental-cars.filters.js";
import { createCollectionService } from "../../shared/createCollectionService.js";
import { fetchVehicleDetail } from "../../shared/fetchVehicleDetail.js";

const COLLECTION = "vehicles";
const CAMPER_SPECS_COLLECTION = "camper_specs";

const { listSlim, listFull, detailFields } = createCollectionService({
  collection: COLLECTION,
  resourceLabel: "rental car",
  listFields: LIST_FIELDS,
  buildListFilter,
  buildSort,
  buildUpdatedAfterFilter,
  getDetails: (params, context) => getRentalCarDetails(params, context),
});

export const listSlimRentalCars = listSlim;
export const listFullRentalCars = listFull;

/**
 * Retrieves and enriches the full details for a specific rental car.
 * Delegates the underlying fetch and enrichment logic to the shared `fetchVehicleDetail` utility.
 *
 * @param {Object} params - The request parameters.
 * @param {string|number} params.id - The identifier of the rental car.
 * @param {string} params.idFilterMode - The mode for filtering by ID (e.g., 'primary', 'object_id').
 * @param {Object} context - The Directus context.
 * @returns {Promise<Object>} The enriched rental car details.
 */
export async function getRentalCarDetails({ id, idFilterMode }, context) {
  return fetchVehicleDetail(
    {
      id,
      idFilterMode,
      rentalType: "car",
      resourceLabel: "RentalCar",
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
      /* 
       * Retrieve `camper_specs` via an explicit query, as it lacks a reverse alias on `rental-cars`.
       * This payload enhancement is specific to rental cars.
       */
      extraFetch: async ({ vehicle, itemsServiceFactory, detailFields }) => {
        const camperSpecsService = itemsServiceFactory(CAMPER_SPECS_COLLECTION);
        const camperSpecsRows = await camperSpecsService.readByQuery({
          fields: detailFields(CAMPER_SPECS_COLLECTION, CAMPER_SPECS_FIELDS),
          filter: { vehicle: { _eq: vehicle.id } },
          limit: 1,
        });
        return { camper_specs: camperSpecsRows?.[0] ?? null };
      },
    },
    context,
  );
}
