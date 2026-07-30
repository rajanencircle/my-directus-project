import { openapiSpec } from "./openapi.spec.js";
import { setRedocCsp, setSwaggerCsp } from "../shared/docsCsp.js";

const contractTitle = openapiSpec?.info?.title ?? "BOTG ContentHub API";
const contractVersion = openapiSpec?.info?.version ?? "";

const REDOC_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>${contractTitle} — Contract</title>

  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${contractTitle} — contract documentation, contributed via BOTG_API_Contract.json.">

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

    #api-banner .api-internal-link {
      color: #a0b4cc;
      text-decoration: none;
      font-size: 13px;
    }

    #api-banner .api-internal-link:hover {
      color: #fff;
    }
  </style>
</head>

<body>
  <div id="api-banner">
    <span class="api-title">${contractTitle}</span>
    <span class="api-version">${contractVersion}</span>
    <span style="color:#a0b4cc; font-size:13px;">Contract (source of truth)</span>
    <a class="api-internal-link" href="/api/v1/internal-docs" target="_blank">Internal implementation docs ↗</a>
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

const SWAGGER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>${contractTitle} — Swagger UI</title>

  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${contractTitle} — contract documentation (Swagger UI), contributed via BOTG_API_Contract.json.">

  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: sans-serif;
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
        url: "/api/v1/openapi.json",
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout",
      });
    };
  </script>
</body>
</html>`;

export function setupContractDocsRoutes(router) {
  /**
   * OpenAPI JSON (client contract — BOTG_API_Contract.json)
   */
  router.get("/v1/openapi.json", (_req, res) => {
    res.json(openapiSpec);
  });

  /**
   * ReDoc page
   */
  router.get("/v1/docs", (_req, res) => {
    setRedocCsp(res);
    res.setHeader("Content-Type", "text/html");
    res.send(REDOC_HTML);
  });

  /**
   * Swagger UI page
   */
  router.get("/v1/api-docs", (_req, res) => {
    setSwaggerCsp(res);
    res.setHeader("Content-Type", "text/html");
    res.send(SWAGGER_HTML);
  });
}
