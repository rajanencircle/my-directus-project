import { asyncWrapper } from "../../shared/asyncWrapper.js";
import { validate } from "../../shared/validate.js";
import { listCruisesSchema, getCruiseDetailSchema } from "./cruises.validation.js";
import { createCruisesController } from "./cruises.controller.js";

export function setupCruisesRoutes(router, prefix, context) {
  const { index, detail } = createCruisesController(context);

  router.get(prefix, validate(listCruisesSchema), asyncWrapper(index));
  router.get(`${prefix}/:id`, validate(getCruiseDetailSchema), asyncWrapper(detail));
}
