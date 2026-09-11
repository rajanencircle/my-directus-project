export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/* Base path prefix for all custom API routes. The authenticate filter uses this
 * to decide which requests need partner-token validation. */
export const API_BASE_PATH = "/api/v1";

/* Allowed values of the `status_primarix` field, shared by every product collection
 * (hotels/tours/excursions/cruises/vehicles). Used both to validate the `status` query
 * param and as the default applied when it's omitted. */
export const PRIMARIX_STATUS_VALUES = ['draft', 'published', 'unpublished', 'archived', 'deleted'];
export const DEFAULT_PRIMARIX_STATUS = 'published';
/* 'all' is an API-only sentinel meaning "don't filter by status_primarix at all" — it is
 * never a real value stored in the database, so it's kept out of PRIMARIX_STATUS_VALUES
 * (which mirrors the actual column's value set) and only added here for query validation. */
export const PRIMARIX_STATUS_QUERY_VALUES = [...PRIMARIX_STATUS_VALUES, 'all'];

export const HTTP_MESSAGE = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  422: 'Validation failed',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

/* Supported response languages, shared by every `lang` query-param validator across the
 * API (products, per-collection resources, metadata/labels). */
export const VALID_LANG_CODES = ['de', 'en', 'nl'];

/* Allowed values of /metadata/field-map's `status` query param. Also used by
 * metadata.service.js's resolveStatus(), which derives and validates against the same values. */
export const FIELD_MAP_STATUSES = ['active', 'renamed', 'new', 'outdated'];

/* Allowed values of /metadata/field-map's `shape` query param — not duplicated elsewhere,
 * relocated here for consistency with the rest of this feature's validation enums. */
export const VALID_SHAPE_VALUES = ['flat', 'nested'];

/* Allowed `collection` values for /metadata/field-map. Not duplicated elsewhere in code —
 * relocated here (from metadata.validation.js) for consistency of "where do constants
 * live," not because of a fixed duplicate. */
export const VALID_MAP_COLLECTIONS = [
  'hotels', 'tours', 'excursions', 'vehicles', 'cruises', 'rental_companies', 'rental_depots',
];

/* Machine-readable error codes for the ErrorResponse.code field (see the contract's
 * ErrorResponse schema) — lets clients branch on the failure class without parsing the
 * message. AUTH_HEADER_MISSING/TOKEN_UNKNOWN/TOKEN_REVOKED/TOKEN_EXPIRED are always 401
 * (something is wrong with the token itself); FORBIDDEN is 403 (the token is fine, it just
 * doesn't cover this product/endpoint); VALIDATION_ERROR is 422 (well-formed request, bad
 * parameter value). Partner scoping (partner_selected/partner_visibility) deliberately has
 * no code here — it must never surface as an error, only as silent query filtering. */
export const ERROR_CODES = {
  AUTH_HEADER_MISSING: 'AUTH_HEADER_MISSING',
  TOKEN_UNKNOWN: 'TOKEN_UNKNOWN',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
};

/* Canonical, human-readable product names, keyed by the lowercase/plural product label used
 * for access-control checks (req.context.apiUser.products entries, requireProduct() route mounts).
 * Used to keep 403 ("not authorized for the '<product>' product") and 404 ("<Resource> not
 * found") messages consistent instead of each hardcoding its own casing/pluralization. */
export const PRODUCT_DISPLAY_NAMES = {
  hotels: 'Hotel',
  cruises: 'Cruise',
  tours: 'Tour',
  excursions: 'Excursion',
  rental_cars: 'Rental Car',
  campers: 'Camper',
};
