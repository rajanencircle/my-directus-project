import { validationResult } from 'express-validator';
import { HTTP_STATUS } from './constants.js';

export function validate(schema) {
  return async (req, res, next) => {
    await Promise.all(schema.map(rule => rule.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
        meta: { requestId: req.id ?? null, timestamp: new Date().toISOString() },
      });
    }
    next();
  };
}
