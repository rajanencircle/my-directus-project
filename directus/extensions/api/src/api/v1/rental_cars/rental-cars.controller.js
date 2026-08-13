import { createCollectionController } from "../../shared/createCollectionController.js";
import { listSlimRentalCars, listFullRentalCars, getRentalCarDetails } from "./rental-cars.service.js";
import { shapeRentalCarDetail, shapeRentalCarListItem } from "../../../transformers/rental_car.transformer.js";

export const createRentalCarsController = createCollectionController({
  listSlim: listSlimRentalCars,
  listFull: listFullRentalCars,
  getDetails: getRentalCarDetails,
  shapeListItem: shapeRentalCarListItem,
  shapeDetail: shapeRentalCarDetail,
});
