// Genuinely byte-identical fragments shared between contract/docs.routes.js and
// internal/docs.routes.js. This is intentionally NOT a template/factory for the two pages
// themselves — those stay separate files with separate render logic, because the ~90%
// visual overlap between them is deliberate (same underlying contract, different UI
// wrapper — internal docs carries an extra CSS override + MutationObserver script the
// public docs don't). Only the pieces below are byte-for-byte identical in both files
// today; extracting them removes the risk of, e.g., an integrity-hash update landing in
// only one of the two copies.

export const BASE_DOCS_BODY_STYLE = `body {
      margin: 0;
      padding: 0;
      font-family: sans-serif;
    }`;

export const API_BANNER_BASE_STYLE = `/* Top banner */
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
    }`;

export const API_BANNER_JSON_LINK_STYLE = `#api-banner .api-json-link {
      margin-left: auto;
      color: #a0b4cc;
      text-decoration: none;
      font-size: 13px;
    }

    #api-banner .api-json-link:hover {
      color: #fff;
    }`;

export const API_BANNER_SWAGGER_LINK_STYLE = `#api-banner .api-swagger-link {
      color: #a0b4cc;
      text-decoration: none;
      font-size: 13px;
    }

    #api-banner .api-swagger-link:hover {
      color: #fff;
    }`;

// Pinned to 2.1.5 for stability
export const REDOC_CDN_SCRIPT = `<script
    src="https://cdn.jsdelivr.net/npm/redoc@2.1.5/bundles/redoc.standalone.js"
    integrity="sha384-0GrsyTQc9Oqd8h+b2dbc4XdR2T/DYpy0tLNNstyx+LBMUyiBbcWPbEs9aRmUcaxD"
    crossorigin="anonymous"
  ></script>`;

// Pinned to 5.17.14 for stability
export const SWAGGER_CDN_CSS = `<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css"
    integrity="sha384-wxLW6kwyHktdDGr6Pv1zgm/VGJh99lfUbzSn6HNHBENZlCN7W602k9VkGdxuFvPn"
    crossorigin="anonymous"
  />`;

// Pinned to 5.17.14 for stability
export const SWAGGER_CDN_SCRIPTS = `<script
    src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"
    integrity="sha384-wmyclcVGX/WhUkdkATwhaK1X1JtiNrr2EoYJ+diV3vj4v6OC5yCeSu+yW13SYJep"
    crossorigin="anonymous"
  ></script>
  <script
    src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"
    integrity="sha384-2YH8WDRaj7V2OqU/trsmzSagmk/E2SutiCsGkdgoQwC9pNUJV1u/141DHB6jgs8t"
    crossorigin="anonymous"
  ></script>`;
