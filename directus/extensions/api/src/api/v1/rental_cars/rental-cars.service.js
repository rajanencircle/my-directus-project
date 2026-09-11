import {
  DETAIL_FIELDS,
  SURCHARGE_FIELDS,
  ZONE_FIELDS,
  PRICE_PERIOD_FIELDS,
  RENTAL_PERIOD_FIELDS,
  PRICE_FIELDS,
  RENTAL_COMPANY_PRICE_FIELDS,
  PRICE_CALCULATION_FIELDS,
  SURCHARGE_CALCULATION_FIELDS,
} from "./rental-cars.fields.js";
import { rentalCars as rentalCarsFilters } from "../../shared/collectionFilters.js";
const { buildIdFilter } = rentalCarsFilters;
import { createQueryConfig } from "../../shared/createQueryConfig.js";
import { fetchVehicleDetail } from "../../shared/fetchVehicleDetail.js";

const COLLECTION = "vehicles";

export const { ROOT_COLLECTION, DETAIL_RELATIONS } = createQueryConfig(
  COLLECTION,
  DETAIL_FIELDS,
);

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
export async function getRentalCarDetails({ id, idFilterMode, partnerId, partnerVisibility }, context) {
  return fetchVehicleDetail(
    {
      id,
      idFilterMode,
      partnerId,
      partnerVisibility,
      rentalType: "car",
      resourceLabel: "Rental Car",
      rootCollection: ROOT_COLLECTION,
      detailRelations: DETAIL_RELATIONS,
      fields: {
        buildIdFilter,
        SURCHARGE_FIELDS,
        ZONE_FIELDS,
        PRICE_PERIOD_FIELDS,
        RENTAL_PERIOD_FIELDS,
        PRICE_FIELDS,
        RENTAL_COMPANY_PRICE_FIELDS,
        PRICE_CALCULATION_FIELDS,
        SURCHARGE_CALCULATION_FIELDS,
      },
    },
    context,
  );
}
