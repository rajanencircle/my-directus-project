import { asyncWrapper } from "../../shared/asyncWrapper.js";
import { validate } from "../../shared/validate.js";
import { listSlimToursSchema, listFullToursSchema, getTourDetailSchema } from "./tours.validation.js";
import { createToursController } from "./tours.controller.js";

export function setupToursRoutes(router, prefix, context) {
  const { index, fullList, detail } = createToursController(context);

  router.get(prefix, validate(listSlimToursSchema), asyncWrapper(index));
  router.get(`${prefix}/full`, validate(listFullToursSchema), asyncWrapper(fullList));
  router.get(`${prefix}/:id`, validate(getTourDetailSchema), asyncWrapper(detail));
}
