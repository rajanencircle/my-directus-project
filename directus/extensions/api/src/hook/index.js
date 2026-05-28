import { setupRouter } from "../api/index.js";
import { loadApiKey } from "../api/shared/authMiddleware.js";

export default {
  id: "api",
  handler: (router, context) => {
    const { logger } = context;
    const keyState = { apiKey: undefined };

    (async () => {
      try {
        keyState.apiKey = await loadApiKey(context);
        logger.info('[api-extension] API key loaded successfully.');
      } catch (err) {
        keyState.apiKey = null;
        logger.fatal(`[api-extension] FATAL: Failed to load API key — all requests will return 503. Reason: ${err.message}`);
      }
    })();

    setupRouter(router, context, keyState);
  },
};
