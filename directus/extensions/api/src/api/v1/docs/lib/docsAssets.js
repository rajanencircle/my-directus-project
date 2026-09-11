/* BUG/DRIFT RISK: despite the name and intent, only internal/docs.routes.js actually
 * imports these constants — contract/docs.routes.js still inlines its own independent copy
 * of the same banner CSS / pinned CDN `<script>`/`<link>` tags (with matching integrity
 * hashes) instead of importing from here. So this file does NOT currently prevent the two
 * pages' shared markup from drifting apart (e.g. an integrity-hash bump landing in only one
 * copy) — it only centralizes internal/docs.routes.js's own copy. To actually fix the drift
 * risk, contract/docs.routes.js needs to import and use these same constants instead of its
 * inline duplicates. */

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

/* Pinned to 2.1.5 for stability */
export const REDOC_CDN_SCRIPT = `<script
    src="https://cdn.jsdelivr.net/npm/redoc@2.1.5/bundles/redoc.standalone.js"
    integrity="sha384-0GrsyTQc9Oqd8h+b2dbc4XdR2T/DYpy0tLNNstyx+LBMUyiBbcWPbEs9aRmUcaxD"
    crossorigin="anonymous"
  ></script>`;

/* Pinned to 5.17.14 for stability */
export const SWAGGER_CDN_CSS = `<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css"
    integrity="sha384-wxLW6kwyHktdDGr6Pv1zgm/VGJh99lfUbzSn6HNHBENZlCN7W602k9VkGdxuFvPn"
    crossorigin="anonymous"
  />`;

/* Pinned to 5.17.14 for stability */
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
