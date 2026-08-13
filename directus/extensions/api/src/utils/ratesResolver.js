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

/**
 * Vehicles (rental cars / campers) natively store `exchange_rate` as a primitive decimal without a currency reference. 
 * To satisfy the API contract, this must be resolved into a `{ currency, rate }` object. 
 * 
 * Unlike hotels which utilize a foreign key (`hotel_exchange_rate_translations`), vehicle presets store the rate as 
 * free text in `exchange_rate_presets` (e.g., `rental_car_other_default_locale`). This utility extracts the currency code 
 * from that text payload (e.g., "1.086 EUR"). If no valid ISO 4217 token is found, it safely falls back to `{ currency: null, rate }`.
 * 
 * Note: Only recognized currency codes (dynamically fetched from the database) are accepted to prevent false positives 
 * from generic 3-letter words in the prose.
 */

/**
 * Matches the live preset format in the database.
 * Expected structure per line: "<locale> : <FROM>=><TO>@<rate>" (e.g., "de-DE : EUR=>EUR@3.50000").
 * The rate's currency is explicitly defined by the `<TO>` segment.
 */
const VEHICLE_PRESET_LINE_RE =
  /^([a-z]{2}(?:-[A-Z]{2})?)\s*:\s*([A-Z]{3})=>([A-Z]{3})@\s*([\d.,]+)\s*$/gim;

/**
 * Parses preset text payloads into a structured array of `{ locale, from, to, rate }` objects.
 * 
 * @param {string} text - The raw preset text payload.
 * @returns {Array} An array of parsed rate objects, or an empty array if parsing fails.
 */
function parseVehiclePresetLines(text) {
  const lines = [];
  if (!text) return lines;
  let m;
  const re = new RegExp(VEHICLE_PRESET_LINE_RE.source, "gim");
  while ((m = re.exec(String(text))) !== null) {
    lines.push({
      locale: m[1],
      from: m[2],
      to: m[3],
      rate: parseFloat(m[4].replace(",", ".")),
    });
  }
  return lines;
}

async function resolveVehiclePresetLines(database, family) {
  const presetTextField =
    family === "camper"
      ? "camper_other_default_locale"
      : "rental_car_other_default_locale";
  try {
    const rows = await database("exchange_rate_presets")
      .select("id", presetTextField)
      .whereNotNull(presetTextField)
      .orderBy("date_updated", "desc")
      .limit(1);
    return parseVehiclePresetLines(rows?.[0]?.[presetTextField]);
  } catch (err) {
    console.warn(
      "[exchange-rate] could not resolve vehicle preset currency",
      err.message,
    );
    return [];
  }
}

/**
 * In-place mutation of a raw vehicle item, converting bare decimal exchange rates into structured `{ currency, rate }` objects.
 * This ensures compatibility with the `toExchangeRateObject()` transformer method.
 * 
 * Resolution Logic:
 * The preset line whose rate strictly matches the stored decimal dictates the applied currency.
 * As different locale lines within the same preset may specify differing currencies, a lack of an exact rate match 
 * gracefully degrades the currency to `null` to avoid erroneous assumptions.
 * 
 * @note Surcharge rates inherit the matched line's currency, as vehicle presets provide a unified rate payload per family.
 */
export async function enrichVehicleRateCurrency(item, database, family) {
  const lines = await resolveVehiclePresetLines(database, family);
  if (lines.length === 0) return item;

  // Dynamically fetch valid currency codes from the database
  let validCurrencyCodes = new Set();
  try {
    const validCodes = await database("currencies").select("code");
    validCurrencyCodes = new Set(validCodes.map((c) => c.code));
  } catch (err) {
    console.warn(
      "[exchange-rate] could not fetch currency codes, falling back to empty set",
      err.message,
    );
  }

  const pickCurrency = (rate) => {
    if (rate === null || rate === undefined) return null;
    const num = Number(rate);
    const match = lines.find(
      (l) => Number.isFinite(l.rate) && Math.abs(l.rate - num) < 1e-9,
    );
    const code = match?.to;
    return code && validCurrencyCodes.has(code) ? code : null;
  };
  const patch = (calc, key) => {
    const value = calc?.[key];
    if (value === null || value === undefined) return;
    const currency = pickCurrency(value);
    if (!currency) return;
    calc[key] = { currency, rate: Number(value) };
  };
  patch(item?.price_calculation, "exchange_rate");
  patch(item?.surcharge_calculation, "surcharge_exchange_rate");
  return item;
}
