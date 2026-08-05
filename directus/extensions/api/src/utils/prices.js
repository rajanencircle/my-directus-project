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
  const occupancyMap = Object.fromEntries(
    (occupancies ?? []).flatMap(o => {
      if (o.junction_id !== undefined && o.junction_id !== null) {
        return [[o.junction_id, o]];
      }
      return [[o.value, o], [o.id, o]];
    })
  );

  return roomCategories.map(cat => {
    const pricesForCat = roomPrices.filter(rp => rp.room_category_id === cat.id);

    const dateMap = {};
    for (const rp of pricesForCat) {
      const pd = priceDateMap[rp.price_date_id];
      if (!pd) continue;

      const dateKey = pd.id;
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          period: {
            start: pd.start_date ?? null,
            end: pd.end_date ?? null,
            from: !!pd.from_price,
          },
          prices: [],
        };
      }

      const occ = occupancyMap[rp.room_occupancy_id];
      const occId = occ ? (occ.id ?? occ.value) : rp.room_occupancy_id;

      let occNameStr = String(rp.room_occupancy_id);
      if (occ) {
        const transByLang = {};
        for (const t of (occ.translations ?? [])) {
          const code = t.translations_id?.code ?? t.translations_id;
          const iso = localeToIso[code] ?? code;
          transByLang[iso] = t.occupancy ?? null;
        }
        occNameStr = lang ? (transByLang[lang] ?? null) : null;
      }
      const occName = occNameStr;

      const sellByLang = {};
      for (const t of (rp.room_prices_translations ?? [])) {
        const code = t.translations_id?.code ?? t.translations_id;
        const iso = localeToIso[code] ?? code;
        sellByLang[iso] = t.sell_price ?? null;
      }

      const sell = lang ? (sellByLang[lang] ?? null) : null;

      dateMap[dateKey].prices.push({
        occupancy: {
          id: occId,
          name: occName,
        },
        sell: sell !== null ? parseFloat(sell) : null,
        buy: rp.buy_price !== null && rp.buy_price !== undefined ? parseFloat(rp.buy_price) : null,
        margin: marginPct !== null && marginPct !== undefined ? parseFloat(marginPct) : null,
      });
    }

    const additionsByLang = {};
    const descByLang = {};
    const transIdByLang = {};
    for (const t of (cat.translations ?? [])) {
      const code = t.translations_id?.code ?? t.translations_id;
      const iso = localeToIso[code] ?? code;
      additionsByLang[iso] = t.room_category_additions ?? null;
      descByLang[iso] = t.room_category_description ?? null;
      transIdByLang[iso] = t.id ?? null;
    }
    
    const activeAdditions = lang ? (additionsByLang[lang] ?? null) : null;

    const activeDesc = lang ? (descByLang[lang] ?? null) : null;

    const activeTransId = lang ? (transIdByLang[lang] ?? null) : null;

    return {
      category: {
        id: cat.id,
        name: cat.room_category ?? null,
      },
      sort: cat.sort ?? null,
      additions: activeAdditions,
      description: activeDesc,
      booking_code: cat.room_category_booking_code ?? null,
      catering: cat.room_category_catering
        ? { id: cat.room_category_catering.id, name: cat.room_category_catering.designation }
        : null,
      calc_type: cat.room_category_calc_type ?? null,
      tour32_name: cat.room_category_tour32_name ?? null,
      periods: Object.values(dateMap),
    };
  });
}


export function toExchangeRateObject(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "object") return value;
  const rate = Number(value);
  if (Number.isNaN(rate)) return null;
  return { currency: null, rate };
}
