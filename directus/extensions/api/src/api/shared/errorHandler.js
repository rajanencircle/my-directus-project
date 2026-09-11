import { AppError } from './AppError.js';
import { HTTP_STATUS } from './constants.js';
import { sendError } from './apiResponse.js';

/* Central error handler. Known AppErrors are serialized with their status and details;
 * anything else is logged and returned as a generic error, preferring an upstream
 * status code when one is available and falling back to a 500. */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return sendError(res, {
      status: err.statusCode,
      code: err.code,
      errors: err.errors,
      meta: err.meta,
    });
  }

  console.error('[API Error]:', err);

  if (err.status || err.statusCode) {
    return sendError(res, {
      status: err.status ?? err.statusCode,
    });
  }

  return sendError(res, {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  });
}
