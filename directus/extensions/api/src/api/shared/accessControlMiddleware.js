import { sendError } from "./apiResponse.js";
import { HTTP_STATUS, PRODUCT_DISPLAY_NAMES, ERROR_CODES } from "./constants.js";

/* Requires the token's `products` list to include the given label — the lowercase/plural
 * key used to mount each router group ('hotels', 'tours', 'excursions', 'rental_cars',
 * 'campers', 'cruises'), not the PRODUCT_DISPLAY_NAMES value — before allowing the request
 * through to that per-product-type router group. */
export function requireProduct(productLabel) {
  return function requireProductMiddleware(req, res, next) {
    const products = req.context.apiUser?.products ?? [];
    if (!products.includes(productLabel)) {
      const displayName = PRODUCT_DISPLAY_NAMES[productLabel] ?? productLabel;
      return sendError(res, {
        status: HTTP_STATUS.FORBIDDEN,
        code: ERROR_CODES.FORBIDDEN,
        errors: [`This token is not authorized for the '${displayName}' product.`],
      });
    }
    req.context.authorization = { ...req.context.authorization, product: productLabel };
    return next();
  };
}

/* Requires the token's access_scope to cover the backoffice tier before allowing the
 * request through to a backoffice-tier router group. Web-tier routes need no check —
 * every valid token can reach them regardless of access_scope. */
export function requireBackofficeScope() {
  return function requireBackofficeScopeMiddleware(req, res, next) {
    if (req.context.apiUser?.accessScope !== "web_and_backoffice") {
      return sendError(res, {
        status: HTTP_STATUS.FORBIDDEN,
        code: ERROR_CODES.FORBIDDEN,
        errors: ["This token's access_scope does not permit backoffice endpoints."],
      });
    }
    return next();
  };
}
