export function requestIdMiddleware(req, res, next) {
  const id = req.headers['x-request-id'] ?? crypto.randomUUID();
  req.id = id;
  req._startTime = Date.now();
  res.setHeader('X-Request-ID', id);
  next();
}
