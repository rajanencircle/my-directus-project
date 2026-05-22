import { openapiSpec } from "./openapi.spec.js";

const REDOC_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>BOTG API Docs</title>

  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <style>
    body {
      margin: 0;
      padding: 0;
    }
  </style>
</head>

<body>
  <redoc spec-url="/api/v1/openapi.json"></redoc>

  <script src="https://cdn.jsdelivr.net/npm/redoc/bundles/redoc.standalone.js"></script>
</body>
</html>`;

export function setupDocsRoutes(router) {
  /**
   * OpenAPI JSON
   */
  router.get("/v1/openapi.json", (_req, res) => {
    res.json(openapiSpec);
  });

  /**
   * ReDoc page
   */
  router.get("/v1/docs", (_req, res) => {
    /**
     * CSP headers
     * Allow jsdelivr CDN for ReDoc
     */
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

    res.setHeader("Content-Type", "text/html");

    res.send(REDOC_HTML);
  });
}
