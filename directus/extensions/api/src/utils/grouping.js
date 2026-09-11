import { restrictTo } from "../shared/response/visibility.js";

/**
 * @description Evaluates how much real data a price row carries.
 *
 * Calculates a completeness score for a price row by checking whether it has a non-zero
 * `buy_price` and counting how many valid `sell_price` translations it has. `hasBuy`
 * is intentionally weighted over `sellCount`.
 *
 * This is used internally by `pickBestPriceRow` to rank conflicting duplicate price rows,
 * ensuring the most complete row wins.
 * 
 * @param {Object} p - The price row object.
 * @param {String} translationsKey - The key holding sell translations.
 * @returns {Object} An object `{ hasBuy, sellCount }`.
 */
function priceCompleteness(p, translationsKey) {
  const buy = p.buy_price;
  const hasBuy = buy !== null && buy !== undefined && parseFloat(buy) !== 0;
  const translations = translationsKey ? (p[translationsKey] ?? []) : [];
  const sellCount = translations.filter(
    (t) => t.sell_price !== null && t.sell_price !== undefined,
  ).length;
  return { hasBuy, sellCount };
}

/**
 * @description Selects the best price row when multiple rows claim the same category, date, and occupancy.
 *
 * Sorts duplicate rows by data completeness (using `priceCompleteness`), breaking ties with
 * `date_updated` and `id`. It logs a warning when conflicts occur, since these represent
 * underlying data issues upstream that need manual review.
 *
 * `groupPrices2` uses this to guarantee the API never emits more than one price per occupancy
 * per period, resolving duplicates consistently.
 * 
 * @param {Array<Object>} candidates - Array of conflicting price row objects.
 * @param {String} translationsKey - The key holding sell translations.
 * @returns {Object} The single best price row.
 */
function pickBestPriceRow(candidates, translationsKey) {
  if (candidates.length === 1) return candidates[0];
  const sorted = [...candidates].sort((a, b) => {
    const ca = priceCompleteness(a, translationsKey);
    const cb = priceCompleteness(b, translationsKey);
    if (ca.hasBuy !== cb.hasBuy) return ca.hasBuy ? -1 : 1;
    if (ca.sellCount !== cb.sellCount) return cb.sellCount - ca.sellCount;
    const updatedA = a.date_updated ?? "";
    const updatedB = b.date_updated ?? "";
    if (updatedA !== updatedB) return updatedA < updatedB ? 1 : -1;
    return String(a.id).localeCompare(String(b.id));
  });
  // eslint-disable-next-line no-console
  console.warn(
    "[groupPrices2] multiple price rows for the same category/date/occupancy — " +
      `picked ${sorted[0].id}, ignored [${sorted.slice(1).map((c) => c.id).join(", ")}]. ` +
      "This is a data conflict, not a resolved one — needs manual review.",
  );
  return sorted[0];
}

/**
 * @description A generalized helper for grouping flat price rows into structured category/date/occupancy arrays.
 *
 * Iterates through categories, filtering the prices that belong to them. Prices are bucketed
 * by date and occupancy, with duplicate rows resolved via `pickBestPriceRow`. Every configured
 * occupancy is listed for every date bucket (showing nulls where data is missing), and the
 * correct `buy`, `sell`, and `margin` values are mapped, with sensitive data restricted to
 * the `backoffice` audience.
 *
 * Resource transformers (e.g. hotels, tours, cruises) use this heavily to reshape flat
 * relational pricing data from Directus into the nested, period-based structure required
 * by the API contract.
 *
 * Transforms flat price rows into a categories array:
 *   categories[] → { category, ..., prices[] → { start_date, end_date, occupancies{} → { buy, sell, margin, unit } } }
 *
 * @param {object[]} categories
 * @param {object[]} dates
 * @param {object[]} prices
 * @param {object[]} occupancies - plain { name, value } objects
 * @param {object}   localeToIso - locale code → ISO 639-1 map
 * @param {object} keys
 * @param {string} keys.categoryIdKey    - field on `prices` pointing at a category id
 * @param {string} keys.dateIdKey        - field on `prices` pointing at a date id
 * @param {string} keys.occupancyIdKey   - field on `prices` pointing at an occupancy id
 * @param {string} [keys.translationsKey] - field on `prices` holding the per-language sell-price rows (omit if no sell price is wired)
 * @param {string} [keys.sellPriceKey='sell_price'] - field on each translation row holding the sell price
 * @param {string} [keys.dateStartKey='start_date']
 * @param {string} [keys.dateEndKey='end_date']
 * @param {string} [keys.dateFromKey='from_price'] - field on `dates` rows holding the "from price" flag
 * @param {function} [mapCategory] - (cat) => object, additional per-category fields to merge into the output (besides `category`/`prices`)
 * @param {object}   [opts]
 * @param {function} [opts.mapDate] - (dateRow) => object, additional per-date fields to merge into each prices[] entry (besides start_date/end_date/occupancies)
 * @param {string}   [opts.lang]
 * @param {number}   [opts.marginPct]
 * @param {string}   [opts.unit]
 * @param {function} [opts.buildDateEntry] - (dateRow) => object, returns the full per-date entry (replacing the default PricePeriod
 *   `{ period: { start, end, from } }` block). Used by cruises to emit the contract's sailing rows instead of periods.
 * @param {string}   [opts.dateOutputKey='periods'] - key under which per-date entries are collected (cruises: 'sailings').
 * @returns {object[]}
 */
export function groupPrices2(
  categories,
  dates,
  prices,
  occupancies,
  localeToIso,
  keys,
  mapCategory = (cat) => ({ category: cat.id }),
  { lang, marginPct, unit, mapDate = () => ({}), buildDateEntry, dateOutputKey = 'periods', occupancyOutputKey = 'occupancy' } = {},
) {
  const {
    categoryIdKey,
    dateIdKey,
    occupancyIdKey,
    translationsKey,
    sellPriceKey = 'sell_price',
    dateStartKey = 'start_date',
    dateEndKey = 'end_date',
    dateFromKey = 'from_price',
  } = keys;

  const dateMapById = Object.fromEntries((dates ?? []).map((d) => [d.id, d]));
  const occupancyByValue = Object.fromEntries((occupancies ?? []).map((o) => [o.value ?? o.id, o]));

  return (categories ?? []).map((cat) => {
    const pricesForCat = (prices ?? []).filter((p) => p[categoryIdKey] === cat.id);

    const dateMap = {};
    /*
     * Bucketed by dateKey -> occId so multiple `prices` rows claiming the same
     * (category, date, occupancy) — duplicates from non-idempotent writes upstream,
     * not a valid modeling case — get resolved to a single entry instead of each
     * independently pushing into the output array.
     */
    const candidatesByDateAndOcc = {};

    for (const p of pricesForCat) {
      const dateRow = dateMapById[p[dateIdKey]];
      if (!dateRow) continue;

      const dateKey = dateRow.id;
      if (!dateMap[dateKey]) {
        const entry = buildDateEntry
          ? buildDateEntry(dateRow)
          : {
              period: {
                start: dateRow[dateStartKey] ?? null,
                end: dateRow[dateEndKey] ?? null,
                from: !!dateRow[dateFromKey],
                ...mapDate(dateRow),
              },
            };
        dateMap[dateKey] = { ...entry, prices: [] };
        candidatesByDateAndOcc[dateKey] = {};
      }

      /*
       * `occupancyIdKey` on `prices` rows can go stale (e.g. a regenerated M2M junction
       * row) or reference a since-nulled FK — in either case the id no longer exists in
       * the current authoritative `occupancies` map. Such a row is omitted entirely: this
       * API only ever reports prices for occupancies it can properly identify, never a
       * fabricated name. On hotels where most `room_prices` rows are in this stale state,
       * most of that hotel's prices won't appear until the underlying links are repaired —
       * a known, accepted trade-off, not a bug.
       */
      const occ = occupancyByValue[p[occupancyIdKey]];
      if (!occ) continue;

      const occBucket = candidatesByDateAndOcc[dateKey];
      if (!occBucket[occ.id]) occBucket[occ.id] = { occ, rows: [] };
      occBucket[occ.id].rows.push(p);
    }

    for (const dateKey of Object.keys(candidatesByDateAndOcc)) {
      const occBucket = candidatesByDateAndOcc[dateKey];
      /*
      * Every occupancy configured for this product is listed for every date that has any
      * price data at all — not just the occupancies that happen to have their own price row
      * for this date. An occupancy with no row here gets buy/sell: null (margin is a
      * product-level config, not tied to a specific row, so it's still shown). This makes
      * gaps in upstream pricing visible as "no price yet" instead of the occupancy silently
      * not appearing.
      */
      for (const occ of occupancies ?? []) {
        const bucketEntry = occBucket[occ.id];
        const rows = bucketEntry?.rows ?? [];
        const p = rows.length ? pickBestPriceRow(rows, translationsKey) : null;

        let sell = null;
        if (p && translationsKey) {
          const sellByLang = {};
          for (const t of p[translationsKey] ?? []) {
            const code = t.translations_id?.code ?? t.translations_id;
            const iso = localeToIso[code] ?? code;
            const val = t[sellPriceKey] ?? null;
            /* A single row's translations can list the same locale more than once
            (junk duplicates from repeated edits) — never let a later null
            silently clobber a real value already found for that language. */
            if (val !== null || !(iso in sellByLang)) {
              sellByLang[iso] = val;
            }
          }
          sell = sellByLang[lang] ?? null;
        } else if (p && sellPriceKey) {
          /* No per-language translations table for this product type — `sellPriceKey` is a
           * plain (non-localized) column directly on the price row itself (e.g. cruises'
           * `cruises_prices.sell_price`). */
          sell = p[sellPriceKey] ?? null;
        }

        dateMap[dateKey].prices.push({
          [occupancyOutputKey]: {
            id: occ.id,
            name: occ.name ?? null,
          },
          sell: sell !== null && sell !== undefined ? parseFloat(sell) : null,
          /* buy/margin are backoffice-only per the contract's *Web price-cell variants. */
          buy: restrictTo(
            p?.buy_price !== null && p?.buy_price !== undefined ? parseFloat(p.buy_price) : null,
            "backoffice",
          ),
          margin: restrictTo(
            marginPct !== null && marginPct !== undefined ? parseFloat(marginPct) : null,
            "backoffice",
          ),
        });
      }
    }

    const sortedDates = Object.values(dateMap).sort((a, b) => {
      const getStart = (entry) => {
        if (entry.period && entry.period.start) return entry.period.start;
        if (entry.start) return entry.start;
        if (entry.start_date) return entry.start_date;
        return "";
      };
      const startA = getStart(a);
      const startB = getStart(b);
      if (startA < startB) return -1;
      if (startA > startB) return 1;
      return 0;
    });

    return {
      ...mapCategory(cat),
      [dateOutputKey]: sortedDates,
    };
  });
}
