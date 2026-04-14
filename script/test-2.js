module.exports = async function (data) {
  const exchangePresets = data.get_presets || [];
  const rates = data.get_rates || [];
  const defaultExchangePreset =
    exchangePresets.length > 0 ? exchangePresets[0] : null;

  function roundHalf(val) {
    if (val == null) return null;
    const floored = Math.floor(val);
    return val - floored >= 0.5 ? floored + 1 : floored;
  }

  function calculateProductUpdates(items, type) {
    const results = [];
    if (!items) return results;

    const destProp = `${type}_destinations`;
    const rateTransProp = `${type}_exchange_rate_translations`;

    for (const item of items) {
      const buyPrice = item.buy_price;
      const destinationId = item.destination;

      let matchedPreset = null;
      let matchedException = null;
      for (const p of exchangePresets) {
        if (p[destProp]) {
          const exc = p[destProp].find(
            (ex) => ex.exception_destination === destinationId,
          );
          if (exc) {
            matchedPreset = p;
            matchedException = exc;
            break;
          }
        }
      }

      for (const trans of item.translations || []) {
        const localeId = trans.translations_id;
        const margin = trans.margin || 0;

        let exchangeRateId = null;
        if (
          matchedPreset &&
          matchedException &&
          matchedException.translations
        ) {
          const et = matchedException.translations.find(
            (t) => t.translations_id === localeId,
          );
          exchangeRateId = et ? et.exception_exchange_rate : null;
        } else if (
          defaultExchangePreset &&
          defaultExchangePreset[rateTransProp]
        ) {
          const pt = defaultExchangePreset[rateTransProp].find(
            (t) => t.translations_id === localeId,
          );
          exchangeRateId = pt ? pt.exchange_rate : null;
        }

        let rateValue = 1;
        if (exchangeRateId) {
          const r = rates.find((rate) => rate.id === exchangeRateId);
          rateValue = r ? parseFloat(r.rate) : 1;
        }

        const calculatedSellPrice =
          buyPrice != null
            ? roundHalf(buyPrice * rateValue * (1 + margin / 100))
            : null;

        results.push({
          id: trans.id,
          exchange_rate: exchangeRateId,
          sell_price: calculatedSellPrice,
        });
      }
    }
    return results;
  }

  return {
    data,
    exchangePresets,
    rates,
    defaultExchangePreset,
    hotels: calculateProductUpdates(data.get_hotels, "hotel"),
    campers: calculateProductUpdates(data.get_campers, "camper"),
    rental_cars: calculateProductUpdates(data.get_rental_cars, "rental_car"),
    round_trips: calculateProductUpdates(data.get_round_trips, "round_trips"),
    tours: calculateProductUpdates(data.get_tours, "tours"),
  };
};
