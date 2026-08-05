import { validationResult } from 'express-validator';
import { HTTP_STATUS } from './constants.js';

export function validate(schema) {
  return async (req, res, next) => {
    await Promise.all(schema.map(rule => rule.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Validation Error',
        errors: errors.array().map(e => `${e.path}: ${e.msg}`),
        meta: { page: 1, limit: 0, total: 0, returned: 0 },
      });
    }
    next();
  };
}
