module.exports = async function (data) {
  const hotel_data = data.hotel_data[0];
  const room_prices = data.room_prices;

  const price_type = hotel_data.price_type; //"per_person" or "per_unit"
  const percentage_type = hotel_data.percentage_type; //"net" or "gross"
  const margin_percentage = hotel_data.margin_percentage;
  const provision_percentage = hotel_data.provision_percentage;
  const exchange_rate = data.exchange_rate[0].rate;
  const occupancies = data.occupancies;

  function roundHalf(val) {
    const floored = Math.floor(val);
    return val - floored >= 0.5 ? floored + 1 : floored;
  }

  function calculateSellPrice(buy, occupancy_id) {
    if (buy == null) return null;
    const margin = margin_percentage / 100;
    const provision = provision_percentage / 100;
    const converted_buy = buy * exchange_rate;

    let sell = null;
    if (percentage_type === "net") {
      sell = converted_buy / (1 - margin);
    }
    if (percentage_type === "gross") {
      sell = (converted_buy * (1 - provision)) / (1 - margin);
    }

    if (price_type === "per_unit") {
      return roundHalf(sell);
    }
    if (price_type === "per_person") {
      const occupancy = occupancies.find((o) => o.id === occupancy_id);
      return roundHalf(sell / (occupancy?.value ?? 1));
    }

    return null;
  }

  const calculated_sell_prices = room_prices.map((item) => {
    const buy = item.buy_price;
    const occupancy_id = item.occupancy_id;
    const sell = calculateSellPrice(buy, occupancy_id);

    return {
      id: item.id,
      sell_price: sell,
    };
  });

  return calculated_sell_prices;
};
