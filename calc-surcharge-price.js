const calculate_surcharge_price = (data) => {
  const languages = data.languages; // from 'translations' collection
  const hotel_data = data.hotel_data; // from 'hotels_surcharges_translations'
  const surcharges = data.surcharges; // from 'surcharges'
  const rates = data.rates; // from 'rates'
  const existing_translations = data.existing_translations; // from 'surcharges_translations'

  function roundHalf(val) {
    const floored = Math.floor(val);
    return val - floored >= 0.5 ? floored + 1 : floored;
  }

  function calculateSellPrice(buy, config, rateValue) {
    console.log("buy", buy);
    console.log("config", config);
    console.log("rateValue", rateValue);
    if (buy == null) return null;
    const margin = (config.surcharge_margin_percentage || 0) / 100;
    const provision = (config.surcharge_provision_percentage || 0) / 100;
    const converted_buy = buy * rateValue;
    console.log("margin", margin);
    console.log("provision", provision);
    console.log("converted_buy", converted_buy);
    console.log("surcharge_percentage_type", config.surcharge_percentage_type);

    let sell = null;
    if (config.surcharge_percentage_type === "net") {
      sell = converted_buy / (1 - margin);
    } else if (config.surcharge_percentage_type === "gross") {
      sell = (converted_buy * (1 - provision)) / (1 - margin);
    }
    console.log("sell", sell);
    console.log("========================");
    return sell != null ? roundHalf(sell) : null;
  }

  const surcharge_updates = [];

  // Iterate over each language
  for (const lang of languages) {
    const lang_id = lang.id;

    // Find config for this language in hotel_data
    const config = hotel_data.find((c) => c.translations_id === lang_id);
    if (!config) continue; // Skip if no config for this language

    const exchange_rate_info = config.surcharge_exchange_rate;
    let rateValue = 1;
    if (exchange_rate_info && exchange_rate_info.key) {
      const rateRecord = rates.find((r) => r.id === exchange_rate_info.key);
      if (rateRecord) {
        rateValue = parseFloat(rateRecord.rate);
      }
    }

    // For each surcharge, calculate/update translation
    for (const surcharge of surcharges) {
      const sell_price = calculateSellPrice(
        surcharge.buy_price,
        config,
        rateValue,
      );

      const existing = existing_translations.find(
        (t) =>
          t.surcharges_id === surcharge.id && t.translations_id === lang_id,
      );

      // Prepare nested update/create structure for the surcharge
      let surcharge_update = surcharge_updates.find(
        (u) => u.id === surcharge.id,
      );
      if (!surcharge_update) {
        surcharge_update = {
          id: surcharge.id,
          translations: { create: [], update: [] },
        };
        surcharge_updates.push(surcharge_update);
      }

      if (existing) {
        surcharge_update.translations.update.push({
          id: existing.id,
          sell_price: sell_price,
        });
      } else {
        surcharge_update.translations.create.push({
          translations_id: lang_id,
          sell_price: sell_price,
        });
      }
    }
  }
  console.log("surcharge_updates", JSON.stringify(surcharge_updates));
  return surcharge_updates;
};

transform_payload = {
  hotel_id: "d4ac7522-daa6-4207-b721-91d553172f2d",
};

hotel_data = [
  {
    id: 1,
    hotels_id: "d4ac7522-daa6-4207-b721-91d553172f2d",
    translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
    surcharge_percentage_type: "net",
    surcharge_provision_percentage: null,
    surcharge_margin_percentage: 20,
    surcharge_exchange_rate: {
      key: "4d53441b-eb07-453e-9601-d4b3607c1f3a",
      collection: "rates",
    },
  },
  {
    id: 2,
    hotels_id: "d4ac7522-daa6-4207-b721-91d553172f2d",
    translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
    surcharge_percentage_type: "net",
    surcharge_provision_percentage: null,
    surcharge_margin_percentage: 30,
    surcharge_exchange_rate: {
      key: "4d53441b-eb07-453e-9601-d4b3607c1f3a",
      collection: "rates",
    },
  },
  {
    id: 3,
    hotels_id: "d4ac7522-daa6-4207-b721-91d553172f2d",
    translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
    surcharge_percentage_type: "net",
    surcharge_provision_percentage: null,
    surcharge_margin_percentage: 10,
    surcharge_exchange_rate: {
      key: "12c80278-68c0-473f-9296-8bce32962128",
      collection: "rates",
    },
  },
];

surcharge_exchange_rate = [
  {
    id: "981c6979-5090-4d20-a597-ca9c71a5e07e",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-02-02T06:57:04.375Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-03-05T07:36:04.406Z",
    from_currency: "4d6c6942-9c0c-4c30-91c4-cf6f473556e2",
    to_currency: "7ec4bbda-fe27-4e0b-bbca-c5a7380d0daf",
    rate: "0.60000",
    info: "Test",
    valid_from: "2025-11-01",
    valid_to: "2027-03-31",
  },
  {
    id: "12c80278-68c0-473f-9296-8bce32962128",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-03-02T12:36:09.641Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-03-05T07:36:54.093Z",
    from_currency: "4d6c6942-9c0c-4c30-91c4-cf6f473556e2",
    to_currency: "7ec4bbda-fe27-4e0b-bbca-c5a7380d0daf",
    rate: "0.63000",
    info: "0.63",
    valid_from: "2025-03-01",
    valid_to: "2080-08-01",
  },
  {
    id: "c3eadb4f-5a53-4ab6-bdb8-9defcff5ef11",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-04-02T14:29:01.948Z",
    user_updated: null,
    date_updated: null,
    from_currency: "4d6c6942-9c0c-4c30-91c4-cf6f473556e2",
    to_currency: "2c84af96-c5b3-44a4-8f94-c8e1661079bd",
    rate: "0.64000",
    info: null,
    valid_from: "2025-12-01",
    valid_to: "2028-04-20",
  },
  {
    id: "8eacf075-bc1a-4aa7-bfbc-3620605f108d",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-04-02T14:29:33.795Z",
    user_updated: null,
    date_updated: null,
    from_currency: "4d6c6942-9c0c-4c30-91c4-cf6f473556e2",
    to_currency: "2d7acc55-dd88-4110-8d24-b67acf22b1af",
    rate: "0.64000",
    info: null,
    valid_from: "2000-04-01",
    valid_to: "2050-04-01",
  },
  {
    id: "6324ada4-d844-4835-885d-d622f8e57d75",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-04-08T09:47:56.983Z",
    user_updated: null,
    date_updated: null,
    from_currency: "56fb9eee-c839-45c0-9ea8-760bf94820c4",
    to_currency: "6026e3e8-dd76-4320-8deb-3bbf1e8f1217",
    rate: "0.02000",
    info: null,
    valid_from: "2026-04-01",
    valid_to: "2026-04-21",
  },
  {
    id: "dd23092c-838d-417f-84a0-04b4d8e77db3",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-04-08T09:48:11.787Z",
    user_updated: null,
    date_updated: null,
    from_currency: "6026e3e8-dd76-4320-8deb-3bbf1e8f1217",
    to_currency: "56fb9eee-c839-45c0-9ea8-760bf94820c4",
    rate: "95.00000",
    info: null,
    valid_from: "2026-04-01",
    valid_to: "2026-04-21",
  },
  {
    id: "f23b1b26-b86e-4ba3-9100-942b7ca902b6",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-04-08T09:48:27.083Z",
    user_updated: null,
    date_updated: null,
    from_currency: "7ec4bbda-fe27-4e0b-bbca-c5a7380d0daf",
    to_currency: "a8eb9d69-79e1-49df-83f4-4e6f1e4c5a0a",
    rate: "1.20000",
    info: null,
    valid_from: "2026-04-01",
    valid_to: "2026-04-17",
  },
  {
    id: "4d53441b-eb07-453e-9601-d4b3607c1f3a",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-04-08T09:48:42.580Z",
    user_updated: null,
    date_updated: null,
    from_currency: "a8eb9d69-79e1-49df-83f4-4e6f1e4c5a0a",
    to_currency: "7ec4bbda-fe27-4e0b-bbca-c5a7380d0daf",
    rate: "0.80000",
    info: null,
    valid_from: "2026-04-01",
    valid_to: "2026-04-11",
  },
  {
    id: "0a44a0bf-585b-4c55-a8d6-562b5e531d34",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-04-08T09:49:13.504Z",
    user_updated: null,
    date_updated: null,
    from_currency: "4d6c6942-9c0c-4c30-91c4-cf6f473556e2",
    to_currency: "7ec4bbda-fe27-4e0b-bbca-c5a7380d0daf",
    rate: "0.75000",
    info: null,
    valid_from: "2026-04-02",
    valid_to: "2026-04-17",
  },
  {
    id: "47bf7db4-2b85-4316-a947-fba535b6e474",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-04-08T09:49:33.198Z",
    user_updated: null,
    date_updated: null,
    from_currency: "7ec4bbda-fe27-4e0b-bbca-c5a7380d0daf",
    to_currency: "7ec4bbda-fe27-4e0b-bbca-c5a7380d0daf",
    rate: "3.50000",
    info: null,
    valid_from: "2026-02-10",
    valid_to: "2026-04-17",
  },
];

surcharges = [
  {
    id: "b4915b37-061f-4691-93f1-61dd84913c7e",
    sort: 1,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-04-23T12:10:16.398Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-04-23T12:47:11.978Z",
    name: "1",
    buy_price: "100.00",
    hotel_id: "d4ac7522-daa6-4207-b721-91d553172f2d",
    translations: [2, 3, 4],
  },
];

existing_translations = [
  {
    id: 2,
    surcharges_id: "b4915b37-061f-4691-93f1-61dd84913c7e",
    translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
    description_catalog_text: null,
    name_original_and_or_booking_code: null,
    mandatory_optional: null,
    catering: null,
    calculation_method_for_it_use: null,
    sell_price: "100.00",
    surcharge_booking_name: null,
    surcharge_description: null,
    surcharge_type: null,
    surcharge_catering: null,
    surcharge_calc_type: null,
  },
  {
    id: 3,
    surcharges_id: "b4915b37-061f-4691-93f1-61dd84913c7e",
    translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
    description_catalog_text: null,
    name_original_and_or_booking_code: null,
    mandatory_optional: null,
    catering: null,
    calculation_method_for_it_use: null,
    sell_price: "114.00",
    surcharge_booking_name: null,
    surcharge_description: null,
    surcharge_type: null,
    surcharge_catering: null,
    surcharge_calc_type: null,
  },
  {
    id: 4,
    surcharges_id: "b4915b37-061f-4691-93f1-61dd84913c7e",
    translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
    description_catalog_text: null,
    name_original_and_or_booking_code: null,
    mandatory_optional: null,
    catering: null,
    calculation_method_for_it_use: null,
    sell_price: "89.00",
    surcharge_booking_name: null,
    surcharge_description: null,
    surcharge_type: null,
    surcharge_catering: null,
    surcharge_calc_type: null,
  },
];

calculated_surcharge_prices = [
  {
    id: "b4915b37-061f-4691-93f1-61dd84913c7e",
    translations: {
      create: [],
      update: [
        {
          id: 2,
          sell_price: 100,
        },
        {
          id: 3,
          sell_price: 114,
        },
        {
          id: 4,
          sell_price: 70,
        },
      ],
    },
  },
];

languages = [
  {
    id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
    status: "draft",
    sort: 1,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-01-16T08:15:34.353Z",
    user_updated: "077b9ad2-95de-41e2-a80a-024e0325bf34",
    date_updated: "2026-02-02T16:04:55.524Z",
    code: "de-DE",
    name: "German, Germany",
  },
  {
    id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
    status: "draft",
    sort: 2,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-01-16T08:16:09.353Z",
    user_updated: "077b9ad2-95de-41e2-a80a-024e0325bf34",
    date_updated: "2026-02-28T13:03:41.185Z",
    code: "nl-NL",
    name: "Dutch, Belgium",
  },
  {
    id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
    status: "draft",
    sort: 3,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-01-16T08:16:28.613Z",
    user_updated: "077b9ad2-95de-41e2-a80a-024e0325bf34",
    date_updated: "2026-02-02T16:04:48.066Z",
    code: "de-CH",
    name: "German, Switzerland",
  },
];

console.log(
  calculate_surcharge_price({
    languages: languages,
    hotel_data: hotel_data,
    surcharges: surcharges,
    rates: surcharge_exchange_rate,
    existing_translations: existing_translations,
  }),
);
