import { asyncWrapper } from "../../shared/asyncWrapper.js";
import { validate } from "../../shared/validate.js";
import { listToursSchema, getTourDetailSchema } from "./tours.validation.js";
import { createToursController } from "./tours.controller.js";

export function setupToursRoutes(router, prefix, context) {
  const { index, detail } = createToursController(context);

  router.get(prefix, validate(listToursSchema), asyncWrapper(index));
  router.get(`${prefix}/:id`, validate(getTourDetailSchema), asyncWrapper(detail));
}
