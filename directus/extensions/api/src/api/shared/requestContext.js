import { AsyncLocalStorage } from "node:async_hooks";

// Lets deeply-nested helpers (e.g. utils/images.js building asset URLs) read the
// current request's base URL without threading it through every transformer
// function signature across all 6 collections.
const requestContext = new AsyncLocalStorage();

export function baseUrlMiddleware(req, res, next) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];
  const protocol = forwardedProto ?? req.protocol;
  const host = forwardedHost ?? req.get("host");
  const baseUrl = host ? `${protocol}://${host}` : null;

  requestContext.run({ baseUrl }, () => next());
}

export function getRequestBaseUrl() {
  return requestContext.getStore()?.baseUrl ?? null;
}
