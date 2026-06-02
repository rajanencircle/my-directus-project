import { asyncWrapper } from "../../shared/asyncWrapper.js";
import { validate } from "../../shared/validate.js";
import { listHotelsSchema, getHotelDetailSchema } from "./hotels.validation.js";
import { createHotelsController } from "./hotels.controller.js";

export function setupHotelsRoutes(router, prefix, context) {
  const { index, detail } = createHotelsController(context);

  router.get(prefix, validate(listHotelsSchema), asyncWrapper(index));
  router.get(`${prefix}/:id`, validate(getHotelDetailSchema), asyncWrapper(detail));
}
