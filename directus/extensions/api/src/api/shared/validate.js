import { validationResult } from 'express-validator';
import { HTTP_STATUS, ERROR_CODES } from './constants.js';

/* 422, not 400: the request is well-formed (parsable), but a parameter value violates a
 * rule (missing/invalid lang, out-of-range limit, etc.) — 400 is reserved for requests
 * that can't be parsed at all. See ERROR_CODES.VALIDATION_ERROR. */
export function validate(schema) {
  return async (req, res, next) => {
    await Promise.all(schema.map(rule => rule.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Validation Error',
        code: ERROR_CODES.VALIDATION_ERROR,
        errors: errors.array().map(e => `${e.path}: ${e.msg}`),
        meta: { page: 1, limit: 0, total: 0, returned: 0 },
      });
    }
    next();
  };
}
