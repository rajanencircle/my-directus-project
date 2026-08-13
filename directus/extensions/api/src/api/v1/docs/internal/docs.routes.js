import { openapiSpec } from "./openapi.spec.js";
import { setRedocCsp, setSwaggerCsp } from "../shared/docsCsp.js";
import {
  BASE_DOCS_BODY_STYLE,
  API_BANNER_BASE_STYLE,
  API_BANNER_JSON_LINK_STYLE,
  API_BANNER_SWAGGER_LINK_STYLE,
  REDOC_CDN_SCRIPT,
  SWAGGER_CDN_CSS,
  SWAGGER_CDN_SCRIPTS,
} from "../shared/docsAssets.js";

// Derive the displayed version from the spec itself so the banner can't drift
// from the contract's info.version again (it used to be hardcoded as v1.2.0).
const SPEC_VERSION = openapiSpec?.info?.version ?? "1.1.0";

const REDOC_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>BOTG API v1 — Internal Docs</title>

  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="BOTG REST API internal documentation — hotels, products, and more.">

  <style>
    ${BASE_DOCS_BODY_STYLE}

    ${API_BANNER_BASE_STYLE}

    ${API_BANNER_JSON_LINK_STYLE}

    #api-banner .api-contract-link {
      color: #a0b4cc;
      text-decoration: none;
      font-size: 13px;
    }

    #api-banner .api-contract-link:hover {
      color: #fff;
    }

    ${API_BANNER_SWAGGER_LINK_STYLE}
  </style>
</head>

<body>
  <div id="api-banner">
    <span class="api-title">BOTG API — Internal</span>
    <span class="api-version">v${SPEC_VERSION}</span>
    <span style="color:#a0b4cc; font-size:13px;">Hotels · Products · Cruises · Tours · Excursions · Rental Cars · Campers · Metadata</span>
    <a class="api-contract-link" href="/api/v1/docs" target="_blank">Client contract docs ↗</a>
    <a class="api-swagger-link" href="/api/v1/internal-docs/swagger" target="_blank">Try it out (Swagger) ↗</a>
    <a class="api-json-link" href="/api/v1/internal-openapi.json" target="_blank">OpenAPI JSON ↗</a>
  </div>

  <redoc
    spec-url="/api/v1/internal-openapi.json"
    expand-responses="200,201"
    hide-single-request-sample-tab
    path-in-middle-panel
    required-props-first
    sort-props-alphabetically="false"
    show-extensions
    no-auto-auth
  ></redoc>

  ${REDOC_CDN_SCRIPT}
</body>
</html>`;

const SWAGGER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>BOTG API v1 — Internal Swagger UI</title>

  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="BOTG REST API internal documentation (Swagger UI) — hotels, products, and more.">

  <style>
    ${BASE_DOCS_BODY_STYLE}

    /* Force the servers label to say "API version" */
    .swagger-ui .servers > label {
      font-size: 0 !important;
    }
    .swagger-ui .servers > label > span, 
    .swagger-ui .servers-title {
      display: none !important;
    }
    .swagger-ui .servers > label::before {
      content: "API version";
      font-size: 14px;
      font-family: sans-serif;
      display: inline-block;
      margin-bottom: 5px;
      font-weight: 700;
      color: #3b4151;
    }
    .swagger-ui .servers > label > select {
      font-size: 14px !important;
      display: block;
      margin-top: 5px;
    }
  </style>

  ${SWAGGER_CDN_CSS}
</head>

<body>


  <div id="swagger-ui"></div>

  ${SWAGGER_CDN_SCRIPTS}
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: "/api/v1/internal-openapi.json",
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout",
      });

      // Observer to rename "Servers" and format dropdown options to just "v1", "v2"
      const observer = new MutationObserver(() => {
        // Broad search for any label
        const labels = document.querySelectorAll('.swagger-ui label');
        labels.forEach(label => {
          Array.from(label.childNodes).forEach(child => {
            if (child.nodeType === 3 && child.textContent.trim() === 'Servers') { // Node.TEXT_NODE
              child.textContent = 'API version';
            } else if (child.nodeType === 1 && child.tagName === 'SPAN' && child.textContent.trim() === 'Servers') { // Node.ELEMENT_NODE
              child.textContent = 'API version';
            }
          });
        });

        // Broad search for any option in a select
        const options = document.querySelectorAll('.swagger-ui select option');
        options.forEach(opt => {
          // If it says "/api/v1 - v1", or "/api/v1", simplify it to "v1"
          const match = opt.textContent.match(/\\/api\\/(v\\d+)/);
          if (match) {
            opt.textContent = match[1];
          }
        });
      });
      observer.observe(document.getElementById('swagger-ui'), { childList: true, subtree: true });
    };
  </script>
</body>
</html>`;

export function setupInternalDocsRoutes(router, requireDocsAuth) {
  /**
   * OpenAPI JSON (our implementation-derived spec)
   */
  router.get("/v1/internal-openapi.json", requireDocsAuth, (req, res) => {
    const spec = {
      ...openapiSpec,
      servers: [
        {
          url: "/api/v1"
        }
      ]
    };
    res.json(spec);
  });

  /**
   * ReDoc page
   */
  router.get("/v1/internal-docs", requireDocsAuth, (_req, res) => {
    setRedocCsp(res);
    res.setHeader("Content-Type", "text/html");
    res.send(REDOC_HTML);
  });

  /**
   * Swagger UI page (sandbox — "try it out" with a token)
   */
  router.get("/v1/internal-docs/swagger", requireDocsAuth, (_req, res) => {
    setSwaggerCsp(res);
    res.setHeader("Content-Type", "text/html");
    res.send(SWAGGER_HTML);
  });
}
