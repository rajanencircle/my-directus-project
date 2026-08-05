import { openapiSpec } from "./openapi.spec.js";
import { setRedocCsp, setSwaggerCsp } from "../shared/docsCsp.js";

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

    #api-banner .api-contract-link {
      color: #a0b4cc;
      text-decoration: none;
      font-size: 13px;
    }

    #api-banner .api-contract-link:hover {
      color: #fff;
    }

    #api-banner .api-swagger-link {
      color: #a0b4cc;
      text-decoration: none;
      font-size: 13px;
    }

    #api-banner .api-swagger-link:hover {
      color: #fff;
    }
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

  <!-- Pinned to 2.1.5 for stability -->
  <script
    src="https://cdn.jsdelivr.net/npm/redoc@2.1.5/bundles/redoc.standalone.js"
    integrity="sha384-0GrsyTQc9Oqd8h+b2dbc4XdR2T/DYpy0tLNNstyx+LBMUyiBbcWPbEs9aRmUcaxD"
    crossorigin="anonymous"
  ></script>
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
    body {
      margin: 0;
      padding: 0;
      font-family: sans-serif;
    }

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

  <!-- Pinned to 5.17.14 for stability -->
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css"
    integrity="sha384-wxLW6kwyHktdDGr6Pv1zgm/VGJh99lfUbzSn6HNHBENZlCN7W602k9VkGdxuFvPn"
    crossorigin="anonymous"
  />
</head>

<body>


  <div id="swagger-ui"></div>

  <!-- Pinned to 5.17.14 for stability -->
  <script
    src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"
    integrity="sha384-wmyclcVGX/WhUkdkATwhaK1X1JtiNrr2EoYJ+diV3vj4v6OC5yCeSu+yW13SYJep"
    crossorigin="anonymous"
  ></script>
  <script
    src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"
    integrity="sha384-2YH8WDRaj7V2OqU/trsmzSagmk/E2SutiCsGkdgoQwC9pNUJV1u/141DHB6jgs8t"
    crossorigin="anonymous"
  ></script>
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

export function setupInternalDocsRoutes(router) {
  /**
   * OpenAPI JSON (our implementation-derived spec)
   */
  router.get("/v1/internal-openapi.json", (req, res) => {
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
  router.get("/v1/internal-docs", (_req, res) => {
    setRedocCsp(res);
    res.setHeader("Content-Type", "text/html");
    res.send(REDOC_HTML);
  });

  /**
   * Swagger UI page (sandbox — "try it out" with a token)
   */
  router.get("/v1/internal-docs/swagger", (_req, res) => {
    setSwaggerCsp(res);
    res.setHeader("Content-Type", "text/html");
    res.send(SWAGGER_HTML);
  });
}
