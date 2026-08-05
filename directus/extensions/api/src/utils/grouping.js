/**
 * Generalized version of hotels' groupPrices() (utils/prices.js), parameterized by
 * field-name keys so tours/excursions/cruises can each call it with their own
 * category/date/occupancy/price FK names instead of hardcoded hotel field names.
 *
 * hotels' groupPrices stays untouched — this is an additive, separate helper.
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
      }

      const occ = occupancyByValue[p[occupancyIdKey]];
      const occId = occ ? (occ.id ?? occ.value) : p[occupancyIdKey];
      const occName = occ?.name ?? String(p[occupancyIdKey]);

      let sell = null;
      if (translationsKey) {
        const sellByLang = {};
        for (const t of p[translationsKey] ?? []) {
          const code = t.translations_id?.code ?? t.translations_id;
          const iso = localeToIso[code] ?? code;
          sellByLang[iso] = t[sellPriceKey] ?? null;
        }
        sell = lang
          ? (sellByLang[lang] ?? Object.values(sellByLang)[0] ?? null)
          : (Object.values(sellByLang)[0] ?? null);
      }

      dateMap[dateKey].prices.push({
        [occupancyOutputKey]: {
          id: occId,
          name: occName,
        },
        sell: sell !== null && sell !== undefined ? parseFloat(sell) : null,
        buy: p.buy_price !== null && p.buy_price !== undefined ? parseFloat(p.buy_price) : null,
        margin: marginPct !== null && marginPct !== undefined ? parseFloat(marginPct) : null,
      });
    }

    return {
      ...mapCategory(cat),
      [dateOutputKey]: Object.values(dateMap),
    };
  });
}
