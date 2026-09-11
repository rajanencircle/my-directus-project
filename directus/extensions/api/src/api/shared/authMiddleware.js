import { sendError } from "./apiResponse.js";
import { HTTP_STATUS, ERROR_CODES } from "./constants.js";

/* The authenticate filter hook (src/authHook/index.js) grants admin access so
 * Directus doesn't block the request. This middleware performs the real auth:
 * parses the token, queries api_users, attaches req.context.apiUser, and rejects
 * invalid/revoked tokens with the correct 401/403. */
export function createAuthMiddleware({ database }) {
  return async function authMiddleware(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, {
        status: HTTP_STATUS.UNAUTHORIZED,
        code: ERROR_CODES.AUTH_HEADER_MISSING,
        errors: ["Missing or malformed Authorization header. Expected: Bearer <token>"],
      });
    }

    const token = authHeader.slice(7);
    if (!token) {
      return sendError(res, {
        status: HTTP_STATUS.UNAUTHORIZED,
        code: ERROR_CODES.AUTH_HEADER_MISSING,
        errors: ["Missing or malformed Authorization header. Expected: Bearer <token>"],
      });
    }

    const row = await database
      .select("*")
      .from("api_users")
      .where({ token })
      .first();

    if (!row) {
      return sendError(res, {
        status: HTTP_STATUS.UNAUTHORIZED,
        code: ERROR_CODES.TOKEN_UNKNOWN,
        errors: ["Invalid API token."],
      });
    }

    /* A revoked/otherwise-inactive token is still a 401 (something's wrong with the token
     * itself), never a 403 — 403 is reserved for a valid token that just doesn't cover the
     * requested product/endpoint (see requireProduct/requireBackofficeScope). */
    if (row.status !== "active") {
      if (row.status === "revoked") {
        return sendError(res, {
          status: HTTP_STATUS.UNAUTHORIZED,
          code: ERROR_CODES.TOKEN_REVOKED,
          errors: ["Your token access has been revoked."],
        });
      }
      return sendError(res, {
        status: HTTP_STATUS.UNAUTHORIZED,
        code: ERROR_CODES.TOKEN_UNKNOWN,
        errors: ["Invalid API token."],
      });
    }

    const partnerSelected = row.partner_selected;
    const partnerId =
      partnerSelected != null && typeof partnerSelected === "object"
        ? (partnerSelected.id ?? null)
        : partnerSelected;

    req.context.apiUser = {
      id: row.id,
      partnerId: partnerId ?? null,
      partnerVisibility: row.partner_visibility ?? "selected",
      accessScope: row.access_scope,
      products: Array.isArray(row.products) ? row.products : [],
      status: row.status,
    };

    return next();
  };
}
