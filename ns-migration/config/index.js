export const PRODUCT = process.env.PRODUCT ?? "hotels";

export const LANGUAGES_TO_MIGRATE =
  process.env.LANGUAGES_TO_MIGRATE?.split(",").map((s) => s.trim()) ??
  ["D", "GB", "NL", "CH"];

export const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? "50", 10);
export const SLEEP_BETWEEN_REQUESTS_MS = parseInt(
  process.env.SLEEP_BETWEEN_REQUESTS_MS ?? "500",
  10,
);

export const STATE_DIR = process.env.STATE_DIR ?? "./state";
export const STATE_FILE = `${STATE_DIR}/migration-state.json`;

export { sqlConfig } from "./sql.config.js";
export { directusConfig } from "./directus.config.js";
