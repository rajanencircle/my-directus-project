import { asyncWrapper } from "../../shared/asyncWrapper.js";
import { validate } from "../../shared/validate.js";
import { listSlimRentalCarsSchema, listFullRentalCarsSchema, getRentalCarDetailSchema } from "./rental-cars.validation.js";
import { createRentalCarsController } from "./rental-cars.controller.js";

export function setupRentalCarsRoutes(router, prefix, context) {
  const { index, fullList, detail } = createRentalCarsController(context);

  router.get(prefix, validate(listSlimRentalCarsSchema), asyncWrapper(index));
  router.get(`${prefix}/full`, validate(listFullRentalCarsSchema), asyncWrapper(fullList));
  router.get(`${prefix}/:id`, validate(getRentalCarDetailSchema), asyncWrapper(detail));
}
