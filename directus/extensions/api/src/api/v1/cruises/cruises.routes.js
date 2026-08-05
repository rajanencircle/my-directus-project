import { asyncWrapper } from "../../shared/asyncWrapper.js";
import { validate } from "../../shared/validate.js";
import { listSlimCruisesSchema, listFullCruisesSchema, getCruiseDetailSchema } from "./cruises.validation.js";
import { createCruisesController } from "./cruises.controller.js";

export function setupCruisesRoutes(router, prefix, context) {
  const { index, fullList, detail } = createCruisesController(context);

  router.get(prefix, validate(listSlimCruisesSchema), asyncWrapper(index));
  router.get(`${prefix}/full`, validate(listFullCruisesSchema), asyncWrapper(fullList));
  router.get(`${prefix}/:id`, validate(getCruiseDetailSchema), asyncWrapper(detail));
}
