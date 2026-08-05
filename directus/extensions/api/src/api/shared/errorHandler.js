import { AppError } from './AppError.js';
import { HTTP_STATUS } from './constants.js';
import { sendError } from './apiResponse.js';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return sendError(res, {
      status: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
  }

  if (err.status || err.statusCode) {
    return sendError(res, {
      status: err.status ?? err.statusCode,
      message: err.message ?? 'An error occurred',
    });
  }

  console.error('[API Error]:', err);

  return sendError(res, {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: err.message || 'Internal server error',
  });
}
