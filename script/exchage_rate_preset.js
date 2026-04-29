module.exports = async function (data) {
  const hotel =
    data.read_hotel && data.read_hotel[0] ? data.read_hotel[0] : null;
  let presets = data.read_presets;
  if (Array.isArray(presets)) presets = presets[0];

  if (!hotel || !presets) return [];

  const destId =
    hotel.country && hotel.country.destination_id
      ? hotel.country.destination_id
      : null;

  let exception = null;
  if (destId && presets.hotel_destinations) {
    exception = presets.hotel_destinations.find(
      (d) => d.exception_destination === destId,
    );
  }

  let ratesToApply = [];
  if (exception && exception.translations) {
    ratesToApply = exception.translations.map((t) => ({
      translations_id: t.translations_id,
      exchange_rate: t.exception_exchange_rate,
    }));
  } else if (presets.hotel_exchange_rate_translations) {
    ratesToApply = presets.hotel_exchange_rate_translations.map((t) => ({
      translations_id: t.translations_id,
      exchange_rate: t.exchange_rate,
    }));
  }

  const updates = [];
  const existingPrices = hotel.hotel_prices || [];

  for (const existing of existingPrices) {
    const rateObj = ratesToApply.find(
      (r) => r.translations_id === existing.translations_id,
    );
    if (rateObj && rateObj.exchange_rate) {
      let currentRateKey = null;
      if (
        existing.exchange_rate &&
        typeof existing.exchange_rate === "object"
      ) {
        currentRateKey = existing.exchange_rate.key;
      } else if (typeof existing.exchange_rate === "string") {
        currentRateKey = existing.exchange_rate;
      }

      if (currentRateKey !== rateObj.exchange_rate) {
        updates.push({
          id: existing.id,
          exchange_rate: {
            key: rateObj.exchange_rate,
            collection: "rates",
          },
        });
      }
    }
  }

  return updates;
};

transform_payload = {
  id: "67487c23-6869-44b1-9425-c024fed5563b",
};

read_hotel = [
  {
    id: "67487c23-6869-44b1-9425-c024fed5563b",
    country: {
      destination_id: 5,
    },
    hotel_prices: [],
  },
];
