import { setupRouter } from "../api/index.js";
import { loadDocsAuthConfig } from "../api/shared/docsAuthMiddleware.js";

/**
 * @description The main entry point for the custom API extension hook.
 *
 * When Directus starts, it loads this extension and calls the handler. The handler
 * loads the internal documentation authentication configuration and passes the
 * router, context, and auth state to `setupRouter` to initialize all custom API
 * endpoints.
 *
 * Partner token authentication is handled by the separate authHook
 * (src/authHook/index.js), which validates tokens directly against the
 * `api_users` table via a database query.
 *
 * Directus uses this hook to register the custom API routes and endpoints under
 * the extension namespace.
 */
export default {
  id: "api",
  handler: (router, context) => {
    const { logger } = context;
    const docsAuthState = { config: undefined };

    try {
      docsAuthState.config = loadDocsAuthConfig();
      logger.info('[api-extension] Internal docs auth configured successfully.');
    } catch (err) {
      docsAuthState.config = null;
      logger.error(`[api-extension] Internal docs auth NOT configured — internal-docs routes will return 503. Reason: ${err.message}`);
    }

    setupRouter(router, context, docsAuthState);
  },
};
