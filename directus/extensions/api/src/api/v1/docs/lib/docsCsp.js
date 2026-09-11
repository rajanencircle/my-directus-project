export function setRedocCsp(res) {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net",
      "script-src-elem 'self' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "worker-src 'self' blob:",
    ].join("; "),
  );
}

export function setSwaggerCsp(res) {
  /**
   * 'unsafe-inline' on script-src is required for the small inline SwaggerUIBundle
   * initializer (Swagger UI itself ships no separate init entry point that can be
   * loaded as an external script).
   */
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
    ].join("; "),
  );
}
