/**
 * @description Recursively resolves exchange rate stubs into full `{ id, currency, rate }` objects.
 *
 * 1. Scans the entire object tree for rate stubs (objects with a `key` and `collection: 'rates'`
 *    — the `collection-item-dropdown` field also lets an editor pick `exchange_rate_presets`,
 *    but that collection has no per-row `rate`/`to_currency` columns at all, so it can never be
 *    resolved through this id/rate/currency lookup. A stub pointing there degrades gracefully to
 *    nulls below.
 * 2. Fetches the actual rates and currency codes from the database in a single query.
 * 3. Mutates the original object tree in-place, replacing stubs with fully resolved rate objects.
 *
 * This runs as a post-processing step after fetching data from Directus, ensuring any
 * relational exchange rate pointers are fully resolved before the transformer processes them.
 *
 * @param {Object|Array} items - The raw data tree from Directus.
 * @param {Object} database - Directus knex database instance.
 * @returns {Promise<Object|Array>} The same tree, mutated in place.
 */
export async function enrichExchangeRates(items, database) {
  if (!items) return items;

  /* 1. Collect all unique keys that need to be resolved. */
  const keysToResolve = new Set();

  function scan(obj) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      for (const item of obj) scan(item);
      return;
    }

    /* Detect a rates stub. Only `collection: 'rates'` is ever resolvable — see the doc
     * comment above for why `exchange_rate_presets` isn't. */
    if (obj.key && obj.collection === 'rates') {
      keysToResolve.add(obj.key);
    }

    /* Traverse child values. */
    for (const key of Object.keys(obj)) {
      scan(obj[key]);
    }
  }

  scan(items);

  if (keysToResolve.size === 0) {
    return items; // Nothing to do
  }

  /* 2. Fetch all required rates from the database (joined with currencies for the name). */
  const ratesRows = await database('rates')
    .whereIn('rates.id', Array.from(keysToResolve))
    .leftJoin('currencies', 'rates.to_currency', 'currencies.id')
    .select('rates.id', 'rates.rate', 'currencies.description as currency', 'currencies.code as currency_code')
    .catch((err) => {
      console.error("Failed to fetch exchange rates from 'rates'", err.message);
      return [];
    });

  /* Build a lookup map keyed by rate id. */
  const ratesMap = {};
  for (const row of ratesRows) {
    ratesMap[row.id] = {
      id: row.id,
      currency: row.currency || row.currency_code || null,
      rate: row.rate !== null && row.rate !== undefined ? Number(row.rate) : null,
    };
  }

  /* 3. Replace the stubs in-place. */
  function mutate(obj) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      for (const item of obj) mutate(item);
      return;
    }

    // Traverse object properties
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === 'object') {
        if (v.key && (v.collection === 'rates' || v.collection === 'exchange_rate_presets')) {
          const resolved = v.collection === 'rates' ? ratesMap[v.key] : undefined;
          if (resolved) {
            /* Replace the stub with its fully resolved { id, currency, rate } object. */
            obj[k] = {
              id: resolved.id,
              currency: resolved.currency,
              rate: resolved.rate,
            };
          } else {
            /* Rate not found in DB (or the stub points at the un-resolvable
             * `exchange_rate_presets` collection) — fall back to nulls. */
            obj[k] = { id: null, currency: null, rate: null };
          }
        } else {
          mutate(v);
        }
      }
    }
  }

  mutate(items);

  return items;
}
