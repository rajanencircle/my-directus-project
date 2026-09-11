/* Wraps an async handler so any rejected promise is forwarded to Express's error
 * middleware instead of crashing the request. */
export const asyncWrapper = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
