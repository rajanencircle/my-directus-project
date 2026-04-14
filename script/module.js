module.exports = async function (data) {
  const marginPresets = data.get_presets;
  const exchangePresets = data.get_exchange_presets;
  const rates = data.get_rates;

  const defaultMarginPreset = marginPresets[0];
  const defaultExchangePreset = exchangePresets[0];

  function roundHalf(val) {
    if (val == null) return null;
    const floored = Math.floor(val);
    return val - floored >= 0.5 ? floored + 1 : floored;
  }

  function calculateProductUpdates(items, type) {
    const results = [];

    const destProp =
      type === "round_trip"
        ? "round_trips_destinations"
        : type === "rental_car"
          ? "rental_car_destinations"
          : `${type}_destinations`;

    for (const item of items) {
      const buyPrice = item.buy_price || 0;
      const destinationId = item.destination;

      let mMatchedPreset = null;
      let eMatchedPreset = null;
      let mException = null;
      let eException = null;

      if (type === "hotel" || type === "camper") {
        if (defaultMarginPreset) {
          mException = (defaultMarginPreset[destProp] || []).find(
            (d) => d.exception_destination === destinationId,
          );
          mMatchedPreset = defaultMarginPreset;
        }

        if (defaultExchangePreset) {
          eException = (defaultExchangePreset[destProp] || []).find(
            (d) => d.exception_destination === destinationId,
          );
          eMatchedPreset = defaultExchangePreset;
        }
      } else {
        for (const p of marginPresets) {
          if (
            (p[destProp] || [])
              .map((d) => d.exception_destination)
              .includes(destinationId)
          ) {
            mMatchedPreset = p;
            break;
          }
        }

        for (const p of exchangePresets) {
          if (
            (p[destProp] || [])
              .map((d) => d.exception_destination)
              .includes(destinationId)
          ) {
            eMatchedPreset = p;
            break;
          }
        }
      }

      const baseMarginPreset = mMatchedPreset || defaultMarginPreset;
      const baseExchangePreset = eMatchedPreset || defaultExchangePreset;

      for (const trans of item.translations || []) {
        const localeId = trans.translations_id;

        let margin = 0;
        let exchangeRateId = null;

        // ------------------------
        // Margin Logic
        // ------------------------
        if (type === "hotel" || type === "camper") {
          if (mException) {
            const et = (mException.translations || []).find(
              (t) => t.translations_id === localeId,
            );
            margin = et ? et.exception_margin : 0;
          } else if (baseMarginPreset) {
            const pt = (
              baseMarginPreset[`${type}_margin_translations`] || []
            ).find((t) => t.translations_id === localeId);

            margin = pt ? pt.margin : 0;
          }
        } else {
          if (baseMarginPreset) {
            const pt = (
              baseMarginPreset[
                type === "round_trip"
                  ? "round_trips_margin_translations"
                  : type === "rental_car"
                    ? "rental_car_margin_translation"
                    : "tours_margin_translations"
              ] || []
            ).find((t) => t.translations_id === localeId);

            margin = mMatchedPreset
              ? (pt?.margin_selected ?? 0)
              : (pt?.margin_remaining ?? 0);
          }
        }

        // ------------------------
        // Exchange Logic
        // ------------------------
        if (type === "hotel" || type === "camper") {
          if (eException) {
            const et = (eException.translations || []).find(
              (t) => t.translations_id === localeId,
            );

            exchangeRateId = et ? et.exception_exchange_rate : null;
          } else if (baseExchangePreset) {
            const pt = (
              baseExchangePreset[`${type}_exchange_rate_translations`] || []
            ).find((t) => t.translations_id === localeId);

            exchangeRateId = pt ? pt.exchange_rate : null;
          }
        } else {
          if (baseExchangePreset) {
            const pt = (
              baseExchangePreset[
                type === "round_trip"
                  ? "round_trips_exchange_rate_translations"
                  : type === "rental_car"
                    ? "rental_car_exchange_rate_translations"
                    : "tours_exchange_rate_translations"
              ] || []
            ).find((t) => t.translations_id === localeId);

            if (type === "tours") {
              exchangeRateId = pt ? pt.exchange_rate : null;
            } else {
              exchangeRateId = eMatchedPreset
                ? (pt?.exchange_rate_selected ?? null)
                : (pt?.exchange_rate_remaining ?? null);
            }
          }
        }

        // ------------------------
        // Rate lookup
        // ------------------------
        let rateValue = 1;

        if (exchangeRateId) {
          const r = rates.find((rate) => rate.id === exchangeRateId);
          rateValue = r ? parseFloat(r.rate) : 1;
        }

        // ------------------------
        // Sell price
        // ------------------------
        const sellPrice =
          buyPrice != null
            ? roundHalf(buyPrice * rateValue * (1 + margin / 100))
            : null;

        results.push({
          id: trans.id,
          margin,
          exchange_rate: exchangeRateId,
          sell_price: sellPrice,
        });
      }
    }

    return results;
  }

  return {
    hotels: calculateProductUpdates(data.get_hotels, "hotel"),
    campers: calculateProductUpdates(data.get_campers, "camper"),
    rental_cars: calculateProductUpdates(data.get_rental_cars, "rental_car"),
    round_trips: calculateProductUpdates(data.get_round_trips, "round_trip"),
    tours: calculateProductUpdates(data.get_tours, "tours"),
  };
};
