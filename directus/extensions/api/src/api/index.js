import { setupHotelsRoutes } from "./v1/hotels/hotels.routes.js";
import { setupProductsRoutes } from "./v1/products/products.routes.js";
import { setupCruisesRoutes } from "./v1/cruises/cruises.routes.js";
import { setupDocsRoutes } from "./v1/docs/docs.routes.js";
import { errorHandler } from "./shared/errorHandler.js";
import { requestIdMiddleware } from "./shared/requestId.js";
import { rateLimiter } from "./shared/rateLimiter.js";
import { createAuthMiddleware } from "./shared/authMiddleware.js";

export function setupRouter(router, context, keyState) {
  router.use(requestIdMiddleware);
  setupDocsRoutes(router);
    router.use(createAuthMiddleware(keyState));
  router.use(rateLimiter);

  setupHotelsRoutes(router, "/v1/hotels", context);
  setupProductsRoutes(router, "/v1/products", context);
  setupCruisesRoutes(router, "/v1/cruises");

  router.use(errorHandler);
}
