import { setupRouter } from "../api/index.js";
import { loadApiKey } from "../api/shared/authMiddleware.js";
import { loadDocsAuthConfig } from "../api/shared/docsAuthMiddleware.js";

export default {
  id: "api",
  handler: (router, context) => {
    const { logger } = context;
    const keyState = { apiKey: undefined };
    const docsAuthState = { config: undefined };

    (async () => {
      try {
        keyState.apiKey = await loadApiKey(context);
        logger.info('[api-extension] API key loaded successfully.');
      } catch (err) {
        keyState.apiKey = null;
        logger.fatal(`[api-extension] FATAL: Failed to load API key — all requests will return 503. Reason: ${err.message}`);
      }
    })();

    try {
      docsAuthState.config = loadDocsAuthConfig();
      logger.info('[api-extension] Internal docs auth configured successfully.');
    } catch (err) {
      docsAuthState.config = null;
      logger.error(`[api-extension] Internal docs auth NOT configured — internal-docs routes will return 503. Reason: ${err.message}`);
    }

    setupRouter(router, context, keyState, docsAuthState);
  },
};
