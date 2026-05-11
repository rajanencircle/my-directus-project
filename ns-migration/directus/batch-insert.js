import { directusConfig } from "../config/directus.config.js";
import { logger } from "../utils/logger.js";
import { createRecord, createRecords, findByExternalId } from "./client.js";

export async function batchInsert(client, collection, items, externalIdField = "object_id") {
  const inserted = [];
  const skipped = [];
  const failed = [];

  for (let i = 0; i < items.length; i += directusConfig.batchSize) {
    const batch = items.slice(i, i + directusConfig.batchSize);
    const batchToInsert = [];

    for (const item of batch) {
      const externalId = item[externalIdField];

      if (externalId) {
        const existing = await findByExternalId(client, collection, externalIdField, externalId);

        if (existing) {
          logger.debug(
            `[Insert] Skip existing: ${collection} ${externalIdField}=${externalId}`,
          );
          skipped.push({ id: existing.id, externalId });
          continue;
        }
      }

      batchToInsert.push(item);
    }

    if (batchToInsert.length === 0) continue;

    if (batchToInsert.length === 1) {
      try {
        const result = await createRecord(client, collection, batchToInsert[0]);
        inserted.push(result);
      } catch (err) {
        failed.push({ item: batchToInsert[0], error: err.message });
      }
    } else {
      try {
        const results = await createRecords(client, collection, batchToInsert);
        inserted.push(...results);
      } catch (err) {
        logger.error(`[Insert] Batch failed: ${err.message} — falling back to individual inserts`);
        for (const item of batchToInsert) {
          try {
            const result = await createRecord(client, collection, item);
            inserted.push(result);
          } catch (innerErr) {
            failed.push({ item, error: innerErr.message });
          }
        }
      }
    }
  }

  return { inserted, skipped, failed };
}

export async function batchUpdate(client, collection, updates, idField = "id") {
  const updated = [];
  const failed = [];

  for (const item of updates) {
    const id = item[idField];
    if (!id) {
      failed.push({ item, error: "Missing ID field" });
      continue;
    }

    const { [idField]: _, ...data } = item;

    try {
      const result = await client.request(updateItem(collection, id, data));
      updated.push(result);
    } catch (err) {
      failed.push({ item, error: err.message });
    }
  }

  return { updated, failed };
}
