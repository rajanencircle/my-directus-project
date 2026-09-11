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
import { requireProduct, requireBackofficeScope } from "./shared/accessControlMiddleware.js";

export function setupRouter(router, context, docsAuthState) {
  router.use(requestIdMiddleware);
  router.use(apiVersionMiddleware);
  router.use(baseUrlMiddleware);
  setupContractDocsRoutes(router);
  setupDocsLoginRoutes(router, docsAuthState);
  setupInternalDocsRoutes(router, createDocsAuthMiddleware(docsAuthState));
  /* Rate-limit before auth: auth does a DB lookup per request, so throttling first stops a
   * flood of bogus/garbage tokens from hitting the database at all, instead of rate-limiting
   * only after every request has already paid that cost. */
  router.use(rateLimiter);
  router.use(createAuthMiddleware(context));

  /* /v1/products is web-tier and fans out only to the sub-products the token is
   authorized for (see products.service.js) — no blanket product/scope gate here. */
  setupProductsRoutes(router, "/v1/products", context);

  /* Every other resource is backoffice-tier, gated on both the matching `products`
   * entry and access_scope = web_and_backoffice. */
  router.use("/v1/hotels", requireProduct("hotels"), requireBackofficeScope());
  setupHotelsRoutes(router, "/v1/hotels", context);

  router.use("/v1/cruises", requireProduct("cruises"), requireBackofficeScope());
  setupCruisesRoutes(router, "/v1/cruises", context);

  router.use("/v1/tours", requireProduct("tours"), requireBackofficeScope());
  setupToursRoutes(router, "/v1/tours", context);

  router.use("/v1/excursions", requireProduct("excursions"), requireBackofficeScope());
  setupExcursionsRoutes(router, "/v1/excursions", context);

  router.use("/v1/rental_cars", requireProduct("rental_cars"), requireBackofficeScope());
  setupRentalCarsRoutes(router, "/v1/rental_cars", context);

  router.use("/v1/campers", requireProduct("campers"), requireBackofficeScope());
  setupCampersRoutes(router, "/v1/campers", context);

  /* /v1/metadata is web-tier too (no requireProduct/requireBackofficeScope) — it only
   * exposes field-map/labels/product-types reference data, not product records themselves. */
  setupMetadataRoutes(router, "/v1/metadata", context);

  router.use(errorHandler);
}
