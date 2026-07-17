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
 * @param {function} [mapCategory] - (cat) => object, additional per-category fields to merge into the output (besides `category`/`prices`)
 * @param {object}   [opts]
 * @param {string}   [opts.lang]
 * @param {number}   [opts.marginPct]
 * @param {string}   [opts.unit]
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
  { lang, marginPct, unit } = {},
) {
  const {
    categoryIdKey,
    dateIdKey,
    occupancyIdKey,
    translationsKey,
    sellPriceKey = 'sell_price',
    dateStartKey = 'start_date',
    dateEndKey = 'end_date',
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
        dateMap[dateKey] = {
          start_date: dateRow[dateStartKey] ?? null,
          end_date: dateRow[dateEndKey] ?? null,
          occupancies: {},
        };
      }

      const occ = occupancyByValue[p[occupancyIdKey]];
      const occKey = occ?.name ?? String(p[occupancyIdKey]);

      let sell = null;
      let sellTranslations = {};
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
        sellTranslations = lang
          ? (sellByLang[lang] !== undefined ? { [lang]: sellByLang[lang] } : {})
          : sellByLang;
      }

      dateMap[dateKey].occupancies[occKey] = {
        buy: p.buy_price ?? null,
        sell,
        translations: sellTranslations,
        margin: marginPct ?? null,
        unit: unit ?? null,
      };
    }

    return {
      ...mapCategory(cat),
      prices: Object.values(dateMap),
    };
  });
}
