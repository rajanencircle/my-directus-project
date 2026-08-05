export async function enrichExchangeRates(items, database) {
  if (!items) return items;
  
  // 1. Collect all unique keys that need to be resolved
  const keysToResolve = new Set();
  
  function scan(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    if (Array.isArray(obj)) {
      for (const item of obj) scan(item);
      return;
    }
    
    // Check if this object is a rates stub
    if (obj.key && (obj.collection === 'rates' || obj.collection === 'exchange_rate_presets')) {
      keysToResolve.add(obj.key);
    }
    
    // Traverse children
    for (const key of Object.keys(obj)) {
      scan(obj[key]);
    }
  }
  
  scan(items);
  
  if (keysToResolve.size === 0) {
    return items; // Nothing to do
  }
  
  // 2. Fetch all required rates from the database (join currencies for the name)
  let ratesRows = [];
  const selectRateRows = (table) =>
    database(table)
      .whereIn(`${table}.id`, Array.from(keysToResolve))
      .leftJoin('currencies', `${table}.to_currency`, 'currencies.id')
      .select(
        `${table}.id`,
        `${table}.rate`,
        'currencies.description as currency',
        'currencies.code as currency_code',
      );
  try {
    // Attempt to query 'rates' table
    ratesRows = await selectRateRows('rates');
  } catch (err) {
    console.warn("Failed to fetch from 'rates', trying 'exchange_rate_presets'", err.message);
    try {
      ratesRows = await selectRateRows('exchange_rate_presets');
    } catch (e2) {
      console.error("Failed to resolve exchange rates entirely.", e2.message);
    }
  }

  // Build lookup map
  const ratesMap = {};
  for (const row of ratesRows) {
    ratesMap[row.id] = {
      id: row.id,
      currency: row.currency || row.currency_code || null,
      rate: row.rate !== null && row.rate !== undefined ? Number(row.rate) : null,
    };
  }
  
  // 3. Replace stubs in-place
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
          const resolved = ratesMap[v.key];
          if (resolved) {
            // Replace with resolved { id, currency, rate } object
            obj[k] = {
              id: resolved.id,
              currency: resolved.currency,
              rate: resolved.rate,
            };
          } else {
            // Rate not found in DB, fallback to nulls
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
