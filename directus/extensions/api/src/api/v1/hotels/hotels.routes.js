import { asyncWrapper } from "../../shared/asyncWrapper.js";
import { validate } from "../../shared/validate.js";
import { listSlimHotelsSchema, listFullHotelsSchema, getHotelDetailSchema } from "./hotels.validation.js";
import { createHotelsController } from "./hotels.controller.js";

export function setupHotelsRoutes(router, prefix, context) {
  const { index, fullList, detail } = createHotelsController(context);

  router.get(prefix, validate(listSlimHotelsSchema), asyncWrapper(index));
  router.get(`${prefix}/full`, validate(listFullHotelsSchema), asyncWrapper(fullList));
  router.get(`${prefix}/:id`, validate(getHotelDetailSchema), asyncWrapper(detail));
}
