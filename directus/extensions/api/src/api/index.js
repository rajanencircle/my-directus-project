import { setupHotelsRoutes } from "./v1/hotels/hotels.routes.js";
import { setupProductsRoutes } from "./v1/products/products.routes.js";
import { setupCruisesRoutes } from "./v1/cruises/cruises.routes.js";
import { setupToursRoutes } from "./v1/tours/tours.routes.js";
import { setupExcursionsRoutes } from "./v1/excursions/excursions.routes.js";
import { setupVehiclesRoutes } from "./v1/vehicles/vehicles.routes.js";
import { setupDemoRoutes } from "./v1/demo/demo.routes.js";
import { setupDocsRoutes } from "./v1/docs/docs.routes.js";
import { errorHandler } from "./shared/errorHandler.js";
import { requestIdMiddleware } from "./shared/requestId.js";
import { rateLimiter } from "./shared/rateLimiter.js";
import { createAuthMiddleware } from "./shared/authMiddleware.js";

export function setupRouter(router, context, keyState) {
  router.use(requestIdMiddleware);
  setupDocsRoutes(router);
  // Public demo routes — registered before the auth middleware (no token required) and
  // before the protected per-product routes below, so these static "/demo" paths match
  // ahead of each product's authenticated "/:id" route.
  setupDemoRoutes(router, context);
    router.use(createAuthMiddleware(keyState));
  router.use(rateLimiter);

  setupHotelsRoutes(router, "/v1/hotels", context);
  setupProductsRoutes(router, "/v1/products", context);
  setupCruisesRoutes(router, "/v1/cruises", context);
  setupToursRoutes(router, "/v1/tours", context);
  setupExcursionsRoutes(router, "/v1/excursions", context);
  setupVehiclesRoutes(router, "/v1/vehicles", context);

  router.use(errorHandler);
}
