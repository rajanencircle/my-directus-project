import { asyncWrapper } from "../../shared/asyncWrapper.js";
import { validate } from "../../shared/validate.js";
import { demoSchema } from "./demo.validation.js";
import { createDemoController } from "./demo.controller.js";

/**
 * Public, unauthenticated demo routes — must be registered BEFORE the auth middleware
 * in api/index.js (same as docs), and BEFORE the protected per-product routes so these
 * static "/demo" paths are matched ahead of each product's authenticated "/:id" route.
 */
export function setupDemoRoutes(router, context) {
  const { hotel, tour, excursion, cruise, vehicle, products } = createDemoController(context);

  router.get("/v1/hotels/demo", validate(demoSchema), asyncWrapper(hotel));
  router.get("/v1/tours/demo", validate(demoSchema), asyncWrapper(tour));
  router.get("/v1/excursions/demo", validate(demoSchema), asyncWrapper(excursion));
  router.get("/v1/cruises/demo", validate(demoSchema), asyncWrapper(cruise));
  router.get("/v1/vehicles/demo", validate(demoSchema), asyncWrapper(vehicle));
  router.get("/v1/products/demo", validate(demoSchema), asyncWrapper(products));
}
