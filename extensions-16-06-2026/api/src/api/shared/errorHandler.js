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

  return sendError(res, {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
