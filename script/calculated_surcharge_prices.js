module.exports = async function (data) {
  const hotel_data = data.hotel_data[0];
  const surcharges = data.surcharges;

  const price_type = hotel_data.surcharge_price_type; //"per_person" or "per_unit"
  const percentage_type = hotel_data.surcharge_percentage_type; //"net" or "gross"
  const margin_percentage = hotel_data.surcharge_margin_percentage;
  const provision_percentage = hotel_data.surcharge_provision_percentage;
  const exchange_rate = data.surcharge_exchange_rate[0].rate;

  function roundHalf(val) {
    const floored = Math.floor(val);
    return val - floored >= 0.5 ? floored + 1 : floored;
  }

  function calculateSellPrice(buy) {
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
    return roundHalf(sell);
  }

  const calculated_sell_prices = surcharges.map((item) => {
    const buy = item.buy_price;
    const sell = calculateSellPrice(buy);

    return {
      id: item.id,
      sell_price: sell,
    };
  });

  return calculated_sell_prices;
};
