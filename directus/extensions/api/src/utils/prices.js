/**
 * Transforms flat room_prices rows into a rooms array:
 *
 *   rooms[] → { category, prices[] → { start_date, end_date, occupancies{} → { buy, sell, margin, unit } } }
 *
 * @param {object[]} roomCategories
 * @param {object[]} priceDates
 * @param {object[]} roomPrices
 * @param {object[]} occupancies  - plain { name, value } objects from the occupancies collection
 * @param {object}   localeToIso  - locale code → ISO 639-1 map
 * @param {object}   [opts]
 * @param {string}   [opts.lang]       - active ISO 639-1 code for sell price selection
 * @param {number}   [opts.marginPct]  - margin percentage (hotel-level, per active lang)
 * @param {string}   [opts.unit]       - 'person' | 'unit' (hotel-level, per active lang)
 * @returns {object[]}
 */
export function groupPrices(roomCategories, priceDates, roomPrices, occupancies, localeToIso, { lang, marginPct, unit } = {}) {
  const priceDateMap = Object.fromEntries(priceDates.map(pd => [pd.id, pd]));
  const occupancyByValue = Object.fromEntries((occupancies ?? []).map(o => [o.value, o]));

  return roomCategories.map(cat => {
    const pricesForCat = roomPrices.filter(rp => rp.room_category_id === cat.id);

    const dateMap = {};
    for (const rp of pricesForCat) {
      const pd = priceDateMap[rp.price_date_id];
      if (!pd) continue;

      const dateKey = pd.id;
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          start_date: pd.start_date,
          end_date: pd.end_date,
          occupancies: {},
        };
      }

      const occ = occupancyByValue[rp.room_occupancy_id];
      const occKey = occ?.name ?? String(rp.room_occupancy_id);

      const sellByLang = {};
      for (const t of (rp.room_prices_translations ?? [])) {
        const code = t.translations_id?.code ?? t.translations_id;
        const iso = localeToIso[code] ?? code;
        sellByLang[iso] = t.sell_price ?? null;
      }

      const sell = lang
        ? (sellByLang[lang] ?? Object.values(sellByLang)[0] ?? null)
        : (Object.values(sellByLang)[0] ?? null);

      dateMap[dateKey].occupancies[occKey] = {
        buy: rp.buy_price ?? null,
        sell,
        margin: marginPct ?? null,
        unit: unit ?? null,
      };
    }

    return {
      category: cat.room_category,
      booking_code: cat.room_category_booking_code ?? null,
      tour32_name: cat.room_category_tour32_name ?? null,
      catering: cat.room_category_catering
        ? { id: cat.room_category_catering.id, designation: cat.room_category_catering.designation }
        : null,
      days_repeater: cat.days_repeater ?? null,
      prices: Object.values(dateMap),
    };
  });
}
