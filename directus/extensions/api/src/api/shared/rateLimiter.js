import { rateLimit } from 'express-rate-limit';
import { sendError } from './apiResponse.js';
import { HTTP_STATUS } from './constants.js';

/* Global request throttle. Window and limit are env-configurable; a 429 is returned
 * once the quota is exhausted. */
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  handler: (req, res) => {
    return sendError(res, {
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
      errors: ['Too many requests, please try again later.'],
    });
  },
});
