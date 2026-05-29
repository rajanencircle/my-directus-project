import { openapiSpec } from "./openapi.spec.js";

const REDOC_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>BOTG API v1 — Documentation</title>

  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="BOTG REST API documentation — hotels, products, and more.">

  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: sans-serif;
    }

    /* Top banner */
    #api-banner {
      background: #1a1a2e;
      color: #fff;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      letter-spacing: 0.02em;
      position: sticky;
      top: 0;
      z-index: 999;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }

    #api-banner .api-title {
      font-weight: 700;
      font-size: 16px;
    }

    #api-banner .api-version {
      background: #4f8ef7;
      color: #fff;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 600;
    }

    #api-banner .api-json-link {
      margin-left: auto;
      color: #a0b4cc;
      text-decoration: none;
      font-size: 13px;
    }

    #api-banner .api-json-link:hover {
      color: #fff;
    }
  </style>
</head>

<body>
  <div id="api-banner">
    <span class="api-title">BOTG API</span>
    <span class="api-version">v1.1.0</span>
    <span style="color:#a0b4cc; font-size:13px;">Hotels · Products · Cruises</span>
    <a class="api-json-link" href="/api/v1/openapi.json" target="_blank">OpenAPI JSON ↗</a>
  </div>

  <redoc
    spec-url="/api/v1/openapi.json"
    expand-responses="200,201"
    hide-single-request-sample-tab
    path-in-middle-panel
    required-props-first
    sort-props-alphabetically="false"
    show-extensions
    no-auto-auth
  ></redoc>

  <!-- Pinned to 2.1.5 for stability -->
  <script
    src="https://cdn.jsdelivr.net/npm/redoc@2.1.5/bundles/redoc.standalone.js"
    integrity="sha384-0GrsyTQc9Oqd8h+b2dbc4XdR2T/DYpy0tLNNstyx+LBMUyiBbcWPbEs9aRmUcaxD"
    crossorigin="anonymous"
  ></script>
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
