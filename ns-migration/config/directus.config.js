export const directusConfig = {
  url: process.env.DIRECTUS_URL ?? "http://localhost:8055",
  token: process.env.DIRECTUS_TOKEN ?? "",
  batchSize: parseInt(process.env.DIRECTUS_BATCH_SIZE ?? "25", 10),
  retryAttempts: parseInt(process.env.DIRECTUS_RETRY_ATTEMPTS ?? "3", 10),
  retryDelayMs: parseInt(process.env.DIRECTUS_RETRY_DELAY_MS ?? "2000", 10),
};
