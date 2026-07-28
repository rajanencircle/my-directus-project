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
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
};

// Allowed values of the `status_primarix` field, shared by every product collection
// (hotels/tours/excursions/cruises/vehicles). Used both to validate the `status` query
// param and as the default applied when it's omitted.
export const PRIMARIX_STATUS_VALUES = ['draft', 'published', 'unpublished', 'archived', 'deleted'];
export const DEFAULT_PRIMARIX_STATUS = 'published';

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
  501: 'Not Implemented',
  503: 'Service Unavailable',
};
