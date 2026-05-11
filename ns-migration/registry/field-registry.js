import { fetchFieldRegistry } from "../sources/sql.js";
import { logger } from "../utils/logger.js";

const columnToField = new Map();
const fieldIdToField = new Map();
const parentFields = new Map();

const registries = new Map();

export async function initFieldRegistry(productConfig) {
  const key = productConfig.name;
  if (registries.has(key)) return registries.get(key);

  try {
    const records = await fetchFieldRegistry(productConfig.sql.mappingParent);

    for (const record of records) {
      const entry = {
        fieldId: record.fieldid,
        parent: record.parent,
        uid: record.uid,
        label: record.label,
        labels: {
          D: record.D,
          GB: record.GB,
          NL: record.NL,
          B: record.B,
          CH: record.CH,
          A: record.A,
          ZA: record.ZA,
        },
      };

      columnToField.set(record.uid, entry);
      fieldIdToField.set(record.fieldid, entry);

      if (!parentFields.has(record.parent)) {
        parentFields.set(record.parent, []);
      }
      parentFields.get(record.parent).push(entry);
    }

    const registry = {
      resolveByUid: (uid) => columnToField.get(uid) ?? null,
      resolveByFieldId: (fieldId) => fieldIdToField.get(fieldId) ?? null,
      getFieldsByParent: (parent) => parentFields.get(parent) ?? [],
      getAllFields: () => Array.from(columnToField.values()),
      getSqlColumnNames: () => Array.from(columnToField.keys()),
      fieldCount: columnToField.size,
      parentCount: parentFields.size,
    };

    registries.set(key, registry);

    logger.info(
      `[Registry] Loaded ${registry.fieldCount} fields across ${registry.parentCount} parents for "${key}"`,
    );

    return registry;
  } catch (err) {
    logger.error(`[Registry] Failed to load field registry for "${key}": ${err.message}`);
    throw err;
  }
}

export function getFieldRegistry(productName) {
  return registries.get(productName) ?? null;
}
