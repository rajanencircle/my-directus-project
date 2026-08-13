import { restrictTo } from "../shared/response/visibility.js";

/**
 * How much real data a row actually carries — used to rank candidates when
 * more than one `prices` row claims the same (category, date, occupancy).
 * `hasBuy` is weighted above `sellCount` on purpose: a row with a real buy
 * price but no sell translations yet still outranks one with neither. This
 * never decides "should this row be shown at all" — a row with nothing set
 * on it (buy null/0, every sell_price null) still gets the lowest rank, not
 * dropped, so it's still returned when it's the only candidate that exists.
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
 * Multiple `prices` rows can legitimately exist for the same (category, date,
 * occupancy) today — duplicate rows from non-idempotent writes upstream, not
 * a modeling choice. Picking one silently and picking one *consistently* are
 * different problems: this ranks by real data present (buy first, then sell
 * completeness), tie-broken by most recently updated, so the API never emits
 * more than one price per occupancy per period. A row is never excluded for
 * being blank — if every candidate for a slot is blank, the best-ranked blank
 * one is still returned, so the occupancy still shows up (buy: 0, sell: null)
 * rather than vanishing. Any time there's more than one candidate at all,
 * it's logged — this is a data conflict that needs a human decision, not
 * something to resolve invisibly.
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
 * Generalized price-grouping helper, parameterized by field-name keys so each
 * of hotels/tours/excursions/cruises can call it with their own
 * category/date/occupancy/price FK names instead of hardcoded field names.
 * Originally introduced alongside hotels' now-retired groupPrices() (formerly
 * in utils/prices.js); hotels was migrated to this shared implementation once
 * parity was confirmed (see refactor-baseline/PHASE1_NOTES.md).
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
    // Bucketed by dateKey → occId so multiple `prices` rows claiming the same
    // (category, date, occupancy) — duplicates from non-idempotent writes
    // upstream, not a valid modeling case — get resolved to a single entry
    // instead of each independently pushing into the output array.
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

      // `occupancyIdKey` on `prices` rows can go stale (e.g. a regenerated M2M
      // junction row) or reference a since-nulled FK — in either case the id no
      // longer exists in the current authoritative `occupancies` map. Such a row
      // is omitted entirely: this API only ever reports prices for occupancies it
      // can properly identify, never a fabricated name. On hotels where most
      // `room_prices` rows are in this stale state, this means most of that
      // hotel's prices won't appear until the underlying links are repaired —
      // a known, accepted trade-off, not a bug.
      const occ = occupancyByValue[p[occupancyIdKey]];
      if (!occ) continue;

      const occBucket = candidatesByDateAndOcc[dateKey];
      if (!occBucket[occ.id]) occBucket[occ.id] = { occ, rows: [] };
      occBucket[occ.id].rows.push(p);
    }

    for (const dateKey of Object.keys(candidatesByDateAndOcc)) {
      for (const { occ, rows } of Object.values(candidatesByDateAndOcc[dateKey])) {
        const p = pickBestPriceRow(rows, translationsKey);

        let sell = null;
        if (translationsKey) {
          const sellByLang = {};
          for (const t of p[translationsKey] ?? []) {
            const code = t.translations_id?.code ?? t.translations_id;
            const iso = localeToIso[code] ?? code;
            const val = t[sellPriceKey] ?? null;
            // A single row's translations can list the same locale more than once
            // (junk duplicates from repeated edits) — never let a later null
            // silently clobber a real value already found for that language.
            if (val !== null || !(iso in sellByLang)) {
              sellByLang[iso] = val;
            }
          }
          sell = sellByLang[lang] ?? null;
        }

        dateMap[dateKey].prices.push({
          [occupancyOutputKey]: {
            id: occ.id,
            name: occ.name ?? null,
          },
          sell: sell !== null && sell !== undefined ? parseFloat(sell) : null,
          // buy/margin are backoffice-only per the contract's *Web price-cell variants —
          // matches PRICE_CELL_ALLOWED_KEYS in shared/response/webDetail.js today.
          buy: restrictTo(
            p.buy_price !== null && p.buy_price !== undefined ? parseFloat(p.buy_price) : null,
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
