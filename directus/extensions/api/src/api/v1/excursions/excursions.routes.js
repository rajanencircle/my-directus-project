import { asyncWrapper } from "../../shared/asyncWrapper.js";
import { validate } from "../../shared/validate.js";
import { listExcursionsSchema, getExcursionDetailSchema } from "./excursions.validation.js";
import { createExcursionsController } from "./excursions.controller.js";

export function setupExcursionsRoutes(router, prefix, context) {
  const { index, detail } = createExcursionsController(context);

  router.get(prefix, validate(listExcursionsSchema), asyncWrapper(index));
  router.get(`${prefix}/:id`, validate(getExcursionDetailSchema), asyncWrapper(detail));
}
