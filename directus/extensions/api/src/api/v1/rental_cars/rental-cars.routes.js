import { createCollectionResource } from "../../shared/createCollectionResource.js";
import { rentalCars as filters } from "../../shared/collectionFilters.js";
import { LIST_FIELDS } from "./rental-cars.fields.js";
import { shapeRentalCarListItem, shapeRentalCarDetail } from "../../../transformers/rental_car.transformer.js";
import { getRentalCarDetails } from "./rental-cars.service.js";

export const setupRentalCarsRoutes = createCollectionResource({
  collection: "vehicles",
  resourceLabel: "rental car",
  listFields: LIST_FIELDS,
  filters: filters,
  getDetails: getRentalCarDetails,
  shapeListItem: shapeRentalCarListItem,
  shapeDetail: shapeRentalCarDetail,
});
