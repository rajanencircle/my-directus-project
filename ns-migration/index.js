import "./utils/loadEnv.js";
import { PRODUCT } from "./config/index.js";
import { run } from "./pipeline/run.js";
import { logger } from "./utils/logger.js";

logger.info(`Hotel Migration — product: ${PRODUCT}`);

run()
  .catch((err) => {
    logger.error(`Fatal: ${err.message}`, err);
    process.exit(1);
  })
  .finally(() => {
    logger.info("Migration process exited.");
    process.exit(0);
  });
