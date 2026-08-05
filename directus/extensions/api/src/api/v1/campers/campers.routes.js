import { asyncWrapper } from "../../shared/asyncWrapper.js";
import { validate } from "../../shared/validate.js";
import { listSlimCampersSchema, listFullCampersSchema, getCamperDetailSchema } from "./campers.validation.js";
import { createCampersController } from "./campers.controller.js";

export function setupCampersRoutes(router, prefix, context) {
  const { index, fullList, detail } = createCampersController(context);

  router.get(prefix, validate(listSlimCampersSchema), asyncWrapper(index));
  router.get(`${prefix}/full`, validate(listFullCampersSchema), asyncWrapper(fullList));
  router.get(`${prefix}/:id`, validate(getCamperDetailSchema), asyncWrapper(detail));
}
