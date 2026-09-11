import { openapiSpec } from "../v1/docs/contract/openapi.spec.js";

/* Exposes the contract's version (from the OpenAPI spec, not a separately hardcoded value)
 * as an X-API-Version header so consumers can detect API changes without fetching the spec. */
const API_VERSION = openapiSpec?.info?.version ?? "";

export function apiVersionMiddleware(req, res, next) {
  res.setHeader("X-API-Version", API_VERSION);
  next();
}
