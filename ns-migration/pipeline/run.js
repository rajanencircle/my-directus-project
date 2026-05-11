import { PRODUCT, LANGUAGES_TO_MIGRATE, SLEEP_BETWEEN_REQUESTS_MS, STATE_FILE } from "../config/index.js";
import { getProduct } from "../products/index.js";
import { initFieldRegistry } from "../registry/field-registry.js";
import { fetchAllOverview, fetchDetail, closePool } from "../sources/sql.js";
import { groupByTravelId, normalizeSqlRow } from "../normalizer/index.js";
import { createClient, createRecord, findByExternalId, updateRecord } from "../directus/client.js";
import { lookupCache } from "../directus/lookup-cache.js";
import {
  loadState,
  saveState,
  markProductCompleted,
  markProductFailed,
  markProductSkipped,
  getPendingProducts,
} from "../state/index.js";
import { toDirectusLanguage } from "../mappings/language.map.js";
import { sleep } from "../utils/sleep.js";
import { logger } from "../utils/logger.js";

async function loadMappers(productName) {
  try {
    const module = await import(`../mappings/${productName}/index.js`);
    return module;
  } catch {
    logger.warn(`[Pipeline] No mappers found for "${productName}" — translations will skip mapping`);
    return {};
  }
}

export async function run() {
  logger.info(`[Pipeline] Starting migration — product: ${PRODUCT}`);

  const product = getProduct(PRODUCT);
  const client = createClient();
  const state = loadState(STATE_FILE);
  const mappers = await loadMappers(PRODUCT);

  // Phase 1: Initialize field registry
  logger.info(`[Pipeline] Phase 1: Loading field registry for "${product.name}"...`);
  await initFieldRegistry(product);

  // Phase 2: Fetch overview from SQL
  logger.info(`[Pipeline] Phase 2: Fetching ${product.name} overview...`);
  const allRecords = await fetchAllOverview(product, product.languages);

  // Phase 3: Group by travel_id
  const grouped = groupByTravelId(allRecords);
  logger.info(
    `[Pipeline] Found ${grouped.length} unique ${product.name} across ${product.languages.join(", ")}`,
  );

  // Phase 4: Preload lookup caches
  logger.info("[Pipeline] Phase 3: Preloading caches...");
  await lookupCache.preload(client, "languages", "code");

  for (const lookup of product.relationLookups ?? []) {
    await lookupCache.preload(client, lookup.collection, lookup.lookupField);
  }
  logger.info(`[Pipeline] Cache size: ${lookupCache.size()} entries`);

  // Phase 5: Filter to pending (resume support)
  const pending = getPendingProducts(state, grouped);
  logger.info(
    `[Pipeline] Phase 4: ${pending.length} ${product.name} pending (${state.stats.totalSucceeded} previously completed)`,
  );

  // Phase 6: Process each product
  for (const item of pending) {
    await sleep(SLEEP_BETWEEN_REQUESTS_MS);

    const travelId = item.travel_id;

    try {
      const itemLanguages = item.languages.filter((l) =>
        product.languages.includes(l),
      );

      if (itemLanguages.length === 0) {
        markProductSkipped(state, travelId, STATE_FILE);
        continue;
      }

      // Check if already exists by external_id
      const existing = await findByExternalId(
        client,
        product.directus.collection,
        product.sql.externalIdField,
        travelId,
      );
      let directusId;

      if (existing) {
        directusId = existing.id;
        logger.info(
          `[Pipeline] ${product.name} exists: travel_id=${travelId} → id=${directusId} | updating`,
        );
      }

      // Fetch detail for each language from SQL
      const detailsByLang = {};
      for (const lang of itemLanguages) {
        await sleep(SLEEP_BETWEEN_REQUESTS_MS);
        const detail = await fetchDetail(product, travelId, lang);
        detailsByLang[lang] = normalizeSqlRow(detail, product);
      }

      // Map base record (use first language for non-translatable fields)
      const baseRecord = detailsByLang[itemLanguages[0]];
      const mapFn = mappers.mapHotel ?? mappers.mapBase ?? mappers.map;

      const basePayload = mapFn ? mapFn(baseRecord) : { ...baseRecord };
      basePayload[product.sql.externalIdField] = travelId;

      // Resolve relations using lookupCache
      for (const lookup of product.relationLookups ?? []) {
        const sourceValue = baseRecord[lookup.lookupField];
        if (sourceValue) {
          const resolvedId = lookupCache.get(lookup.collection, lookup.lookupField, sourceValue);
          basePayload[lookup.targetField] = resolvedId ?? null;
        }
      }

      if (existing) {
        await updateRecord(client, product.directus.collection, directusId, basePayload);
      } else {
        const result = await createRecord(client, product.directus.collection, basePayload);
        directusId = result?.id ?? result;

        logger.info(
          `[Pipeline] Created ${product.name}: travel_id=${travelId} → id=${directusId} | name="${item.name}"`,
        );
      }

      // Process translations
      for (const lang of itemLanguages) {
        const record = detailsByLang[lang];
        const locale = toDirectusLanguage(lang);

        if (!locale) {
          logger.warn(`[Pipeline] No locale mapping for language: ${lang} — skipping translation`);
          continue;
        }

        const langEntry = lookupCache.get("languages", "code", locale);
        if (!langEntry) {
          logger.warn(`[Pipeline] No language entry for ${locale} — skipping translation`);
          continue;
        }

        for (const tc of product.directus.translationCollections) {
          const mapFnName = tc.mapper;
          const mapFn = mappers[mapFnName];
          if (!mapFn) {
            logger.debug(`[Pipeline] No mapper "${mapFnName}" found — skipping ${tc.collection}`);
            continue;
          }

          const translationPayload = mapFn(record);
          translationPayload[`${product.directus.collection}_id`] = directusId;
          translationPayload.translations_id = langEntry;

          await createRecord(client, tc.collection, translationPayload);
        }
      }

      markProductCompleted(state, travelId, STATE_FILE);
    } catch (err) {
      logger.error(
        `[Pipeline] Failed ${product.name} travel_id=${travelId}: ${err.message}`,
      );
      markProductFailed(state, travelId, err, STATE_FILE);
    }
  }

  // Phase 7: Summary
  logger.info(`[Pipeline] Migration complete for "${product.name}"`);
  logger.info(
    `[Pipeline] Summary: ${state.stats.totalSucceeded} succeeded, ${state.stats.totalFailed} failed, ${state.stats.totalSkipped} skipped`,
  );

  // Cleanup SQL pool
  await closePool();
}
