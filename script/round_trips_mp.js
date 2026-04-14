module.exports = async function (data) {
  const marginPresets = data.get_presets;
  const rates = data.get_rates || [];
  const items = data.get_batch_items || [];

  function roundHalf(val) {
    if (val == null) return null;
    const floored = Math.floor(val);
    return val - floored >= 0.5 ? floored + 1 : floored;
  }

  const updates = [];
  const defaultMarginPreset =
    marginPresets && marginPresets.length > 0 ? marginPresets[0] : null;

  for (const item of items) {
    const buyPrice = item.buy_price;
    const destinationId = item.destination;

    let marginMatchedException = null;
    if (defaultMarginPreset && defaultMarginPreset.round_trips_destinations) {
      marginMatchedException =
        defaultMarginPreset.round_trips_destinations.find(
          (d) => d.exception_destination === destinationId,
        );
    }

    for (const trans of item.translations || []) {
      const localeId = trans.translations_id;

      let margin = 0;
      if (marginMatchedException && marginMatchedException.translations) {
        const et = marginMatchedException.translations.find(
          (t) => t.translations_id === localeId,
        );
        margin = et ? et.exception_margin : 0;
      } else if (
        defaultMarginPreset &&
        defaultMarginPreset.round_trips_margin_translations
      ) {
        const pt = defaultMarginPreset.round_trips_margin_translations.find(
          (t) => t.translations_id === localeId,
        );
        margin = pt ? pt.margin : 0;
      }

      const currentExchangeRateId = trans.exchange_rate;
      let rateValue = 1;
      if (currentExchangeRateId) {
        const r = rates.find((rate) => rate.id === currentExchangeRateId);
        rateValue = r ? parseFloat(r.rate) : 1;
      }

      const sellPrice =
        buyPrice != null
          ? roundHalf(buyPrice * rateValue * (1 + margin / 100))
          : null;

      updates.push({
        id: trans.id,
        margin: margin,
        sell_price: sellPrice,
      });
    }
  }

  return updates;
};
