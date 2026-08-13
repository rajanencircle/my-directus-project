import { openapiSpec } from "../v1/docs/contract/openapi.spec.js";

const API_VERSION = openapiSpec?.info?.version ?? "";

export function apiVersionMiddleware(req, res, next) {
  res.setHeader("X-API-Version", API_VERSION);
  next();
}
