module.exports = async function (data) {
  const marginPresets = data.get_presets || [];
  const rates = data.get_rates || [];
  const defaultMarginPreset =
    marginPresets.length > 0 ? marginPresets[0] : null;

  function roundHalf(val) {
    if (val == null) return null;
    const floored = Math.floor(val);
    return val - floored >= 0.5 ? floored + 1 : floored;
  }

  function calculateProductUpdates(items, type) {
    const results = [];
    if (!items) return results;

    const destProp =
      type === "round_trip"
        ? "round_trips_destinations"
        : type === "rental_car"
          ? "rental_car_destinations"
          : type === "tours"
            ? "tours_destinations"
            : `${type}_destinations`;
    const marginTransProp =
      type === "round_trip"
        ? "round_trips_margin_translations"
        : type === "rental_car"
          ? "rental_car_margin_translation"
          : type === "tours"
            ? "tours_margin_translations"
            : `${type}_margin_translations`;

    for (const item of items) {
      const buyPrice = item.buy_price;
      const destinationId = item.destination;

      let matchedPreset = null;
      let matchedException = null;
      for (const p of marginPresets) {
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
        let marginValue = 0;

        if (
          matchedPreset &&
          matchedException &&
          matchedException.translations
        ) {
          const et = matchedException.translations.find(
            (t) => t.translations_id === localeId,
          );
          marginValue = et ? et.exception_margin : 0;
        } else if (
          defaultMarginPreset &&
          defaultMarginPreset[marginTransProp]
        ) {
          const pt = defaultMarginPreset[marginTransProp].find(
            (t) => t.translations_id === localeId,
          );
          if (pt) {
            if (type === "rental_car" || type === "tours") {
              // Use margin_remaining if available, otherwise fallback to margin
              marginValue =
                pt.margin_remaining != null
                  ? pt.margin_remaining
                  : (pt.margin ?? 0);
            } else {
              marginValue = pt.margin ?? 0;
            }
          }
        }

        const currentExchangeRateId = trans.exchange_rate;
        let rateValue = 1;
        if (currentExchangeRateId) {
          const r = rates.find((rate) => rate.id === currentExchangeRateId);
          rateValue = r ? parseFloat(r.rate) : 1;
        }

        const calculatedSellPrice =
          buyPrice != null
            ? roundHalf(buyPrice * rateValue * (1 + marginValue / 100))
            : null;

        results.push({
          id: trans.id,
          margin: marginValue,
          sell_price: calculatedSellPrice,
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
