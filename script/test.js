const rtesad = {
  message:
    'select "demo_hotel"."id", "demo_hotel"."exchange_rate", "demo_hotel"."surcharge_exchange_rate", "demo_hotel"."sort", "demo_hotel"."price_type", "demo_hotel"."surcharge_margin_percentage", "demo_hotel"."user_created", "demo_hotel"."margin_percentage", "demo_hotel"."surcharge_percentage_type", "demo_hotel"."date_created", "demo_hotel"."percentage_type", "demo_hotel"."surcharge_provision_percentage", "demo_hotel"."user_updated", "demo_hotel"."provision_percentage", "demo_hotel"."date_updated", "demo_hotel"."name", "demo_hotel"."special", "demo_hotel"."room_prices" from "demo_hotel" where "demo_hotel"."id" = $1 order by "demo_hotel"."sort" asc limit $2 - column demo_hotel.room_prices does not exist',
  extensions: {
    code: "INTERNAL_SERVER_ERROR",
  },
};

module.exports = async function (data) {
  function generateUUIDv4() {
    function randomHex(length) {
      let str = "";
      for (let i = 0; i < length; i++) {
        str += Math.floor(Math.random() * 16).toString(16);
      }
      return str;
    }

    // Variant: must be 8, 9, a, or b
    function getVariant() {
      return (8 + Math.floor(Math.random() * 4)).toString(16);
    }

    return (
      randomHex(8) +
      "-" +
      randomHex(4) +
      "-" +
      "4" +
      randomHex(3) +
      "-" + // version 4
      getVariant() +
      randomHex(3) +
      "-" +
      randomHex(12)
    );
  }
  const repeater = data.$trigger.payload.room_occupancies_repeater || [];
  let changed = false;
  const updated = repeater.map((entry) => {
    if (!entry.id) {
      changed = true;
      return { ...entry, id: generateUUIDv4() };
    }
    return entry;
  });
  return { updated, changed };
};
