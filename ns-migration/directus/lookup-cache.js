import { readItems } from "@directus/sdk";
import { logger } from "../utils/logger.js";

class LookupCache {
  constructor() {
    this.cache = new Map();
  }

  getKey(collection, lookupField, lookupValue) {
    return `${collection}:${lookupField}:${String(lookupValue).toLowerCase()}`;
  }

  get(collection, lookupField, lookupValue) {
    const key = this.getKey(collection, lookupField, lookupValue);
    return this.cache.get(key) ?? null;
  }

  set(collection, lookupField, lookupValue, id) {
    const key = this.getKey(collection, lookupField, lookupValue);
    this.cache.set(key, id);
  }

  has(collection, lookupField, lookupValue) {
    const key = this.getKey(collection, lookupField, lookupValue);
    return this.cache.has(key);
  }

  async preload(client, collection, lookupField, returnField = "id", displayField = "name") {
    logger.info(
      `[Cache] Preloading ${collection} (${lookupField} → ${returnField})`,
    );

    try {
      const all = await client.request(
        readItems(collection, {
          fields: [returnField, lookupField, displayField].filter(Boolean),
          limit: -1,
        }),
      );

      if (!all || !Array.isArray(all)) return 0;

      let count = 0;
      for (const item of all) {
        const lookupVal = item[lookupField];
        if (lookupVal !== undefined && lookupVal !== null) {
          this.set(collection, lookupField, lookupVal, item[returnField]);
          count++;
        }
      }

      logger.info(`[Cache] Preloaded ${count} entries for ${collection}`);
      return count;
    } catch (err) {
      logger.warn(
        `[Cache] Failed to preload ${collection}: ${err.message} — will resolve on-demand`,
      );
      return 0;
    }
  }

  size() {
    return this.cache.size;
  }

  clear() {
    this.cache.clear();
  }
}

export const lookupCache = new LookupCache();
