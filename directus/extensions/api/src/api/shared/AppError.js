/* Operational error thrown deliberately by route/service code (auth failures, validation,
 * not-found) so errorHandler.js can trust `statusCode`/`code` instead of treating it as an
 * unexpected crash. `errors` defaults to a single-message array to match the ErrorResponse
 * contract's `errors` field when the caller doesn't supply a field-level list. */
export class AppError extends Error {
  constructor(message, statusCode = 500, errors = null, meta = null, code = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors ?? [message];
    this.meta = meta;
    this.code = code;
    this.isOperational = true;
  }
}
