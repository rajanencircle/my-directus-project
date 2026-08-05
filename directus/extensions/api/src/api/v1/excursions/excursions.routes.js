import { asyncWrapper } from "../../shared/asyncWrapper.js";
import { validate } from "../../shared/validate.js";
import { listSlimExcursionsSchema, listFullExcursionsSchema, getExcursionDetailSchema } from "./excursions.validation.js";
import { createExcursionsController } from "./excursions.controller.js";

export function setupExcursionsRoutes(router, prefix, context) {
  const { index, fullList, detail } = createExcursionsController(context);

  router.get(prefix, validate(listSlimExcursionsSchema), asyncWrapper(index));
  router.get(`${prefix}/full`, validate(listFullExcursionsSchema), asyncWrapper(fullList));
  router.get(`${prefix}/:id`, validate(getExcursionDetailSchema), asyncWrapper(detail));
}
