/* Attaches a request id (an inbound X-Request-ID or a fresh UUID) to every request,
 * echoes it back on the response, and records the start time for latency tracking.
 * First middleware to run, so it's what initializes req.context — every later
 * middleware (auth, access control) adds its own piece to the same object instead of
 * scattering request-scoped state across separate top-level req.* properties. */
export function requestIdMiddleware(req, res, next) {
  const id = req.headers['x-request-id'] ?? crypto.randomUUID();
  req.context = { requestId: id };
  req._startTime = Date.now();
  res.setHeader('X-Request-ID', id);
  next();
}
