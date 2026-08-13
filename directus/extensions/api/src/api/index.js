import { setupHotelsRoutes } from "./v1/hotels/hotels.routes.js";
import { setupProductsRoutes } from "./v1/products/products.routes.js";
import { setupCruisesRoutes } from "./v1/cruises/cruises.routes.js";
import { setupToursRoutes } from "./v1/tours/tours.routes.js";
import { setupExcursionsRoutes } from "./v1/excursions/excursions.routes.js";
import { setupRentalCarsRoutes } from "./v1/rental_cars/rental-cars.routes.js";
import { setupCampersRoutes } from "./v1/campers/campers.routes.js";
import { setupMetadataRoutes } from "./v1/metadata/metadata.routes.js";
import { setupContractDocsRoutes } from "./v1/docs/contract/docs.routes.js";
import { setupInternalDocsRoutes } from "./v1/docs/internal/docs.routes.js";
import { setupDocsLoginRoutes } from "./v1/docs/internal/login.routes.js";
import { errorHandler } from "./shared/errorHandler.js";
import { requestIdMiddleware } from "./shared/requestId.js";
import { apiVersionMiddleware } from "./shared/apiVersion.js";
import { baseUrlMiddleware } from "./shared/requestContext.js";
import { rateLimiter } from "./shared/rateLimiter.js";
import { createAuthMiddleware } from "./shared/authMiddleware.js";
import { createDocsAuthMiddleware } from "./shared/docsAuthMiddleware.js";

export function setupRouter(router, context, keyState, docsAuthState) {
  router.use(requestIdMiddleware);
  router.use(apiVersionMiddleware);
  router.use(baseUrlMiddleware);
  setupContractDocsRoutes(router);
  setupDocsLoginRoutes(router, docsAuthState);
  setupInternalDocsRoutes(router, createDocsAuthMiddleware(docsAuthState));
  router.use(createAuthMiddleware(keyState));
  router.use(rateLimiter);

  setupHotelsRoutes(router, "/v1/hotels", context);
  setupProductsRoutes(router, "/v1/products", context);
  setupCruisesRoutes(router, "/v1/cruises", context);
  setupToursRoutes(router, "/v1/tours", context);
  setupExcursionsRoutes(router, "/v1/excursions", context);
  setupRentalCarsRoutes(router, "/v1/rental_cars", context);
  setupCampersRoutes(router, "/v1/campers", context);
  setupMetadataRoutes(router, "/v1/metadata", context);

  router.use(errorHandler);
}
