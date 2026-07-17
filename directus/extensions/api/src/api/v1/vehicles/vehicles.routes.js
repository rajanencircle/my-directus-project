import { asyncWrapper } from "../../shared/asyncWrapper.js";
import { validate } from "../../shared/validate.js";
import { listVehiclesSchema, getVehicleDetailSchema } from "./vehicles.validation.js";
import { createVehiclesController } from "./vehicles.controller.js";

export function setupVehiclesRoutes(router, prefix, context) {
  const { index, detail } = createVehiclesController(context);

  router.get(prefix, validate(listVehiclesSchema), asyncWrapper(index));
  router.get(`${prefix}/:id`, validate(getVehicleDetailSchema), asyncWrapper(detail));
}
