const foo = (data) => {
  const roomCategories = data.child_room_categories || [];
  const priceDates = data.price_dates || [];
  const roomOccupancies = data.occupancies || [];
  const roomPrices = data.room_prices || [];
  const hotelTranslations = data.hotel_translations || [];

  const roomCategoryMap = Object.fromEntries(
    roomCategories.map((rc) => [rc.id, rc]),
  );
  const priceDateMap = Object.fromEntries(priceDates.map((pd) => [pd.id, pd]));
  const occupancyMap = Object.fromEntries(
    roomOccupancies.map((o) => [o.id, o]),
  );

  const updates = [];

  hotelTranslations.forEach((ht) => {
    const langId = ht.translations_id;
    let lowestRoomPrice = null;
    let minSellPrice = Infinity;

    roomPrices.forEach((rp) => {
      const rc = roomCategoryMap[rp.room_category_id];
      const pd = priceDateMap[rp.price_date_id];
      const ro = occupancyMap[rp.room_occupancy_id];

      const isFromPriceCandidate =
        rc?.price_start === true ||
        pd?.from_price === true ||
        ro?.occupancies_id?.from_price === true;

      if (isFromPriceCandidate) {
        const translations = rp.room_prices_translations || [];
        const targetTranslation = translations.find(
          (t) => t.translations_id === langId,
        );

        if (targetTranslation) {
          const sellPrice = Number(targetTranslation.sell_price);
          if (
            sellPrice !== null &&
            !isNaN(sellPrice) &&
            sellPrice > 0 &&
            sellPrice < minSellPrice
          ) {
            minSellPrice = sellPrice;
            lowestRoomPrice = rp;
          }
        }
      }
    });
    if (!lowestRoomPrice) {
      //   console.log(lowestRoomPrice);
      let fallbackMinSellPrice = Infinity;

      roomPrices.forEach((rp) => {
        const translations = rp.room_prices_translations || [];
        const targetTranslation = translations.find(
          (t) => t.translations_id === langId,
        );
        // console.log(1, targetTranslation);
        if (targetTranslation) {
          const sellPrice = Number(targetTranslation.sell_price);
          console.log(2, sellPrice);
          if (
            sellPrice !== null &&
            !isNaN(sellPrice) &&
            sellPrice > 0 &&
            sellPrice < fallbackMinSellPrice
          ) {
            fallbackMinSellPrice = sellPrice;
            lowestRoomPrice = rp;
          }
        }
      });
    }

    updates.push({
      id: ht.id,
      from_price: lowestRoomPrice ? lowestRoomPrice.id : null,
    });
  });

  return {
    hotel_translations_updates: updates,
  };
};

const child_room_categories = [
  {
    id: "96973ed6-1a26-4199-9d98-eda3b604281b",
    room_category: "test rc 2 hotel 2 (Mo, Di, Mi)",
    price_start: false,
    sharedId: "c5e8fc0a-b56e-4c46-8756-454fa0937c17",
  },
  {
    id: "d30b6cfe-eb46-4621-a481-f9743f4b0348",
    room_category: "test rc 2 hotel 2 (Fr, Sa, So)",
    price_start: false,
    sharedId: "c5e8fc0a-b56e-4c46-8756-454fa0937c17",
  },
];
const price_dates = [
  {
    id: "fff2576d-13e3-438e-a38b-df69c0b0beb6",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-05-04T06:24:01.303Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-05-04T06:24:01.656Z",
    name: "28.04.2026 - 29.05.2026",
    start_date: "2026-04-28",
    end_date: "2026-05-29",
    from_price: true,
    hotel_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
  },
  {
    id: "bbb24c57-ca3c-4223-83ff-5b6b20ccf3db",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-05-04T06:24:01.305Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-05-04T06:24:01.684Z",
    name: "20.05.2026 - 30.05.2026",
    start_date: "2026-05-20",
    end_date: "2026-05-30",
    from_price: false,
    hotel_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
  },
];
const occupancies = [
  {
    id: 106,
    occupancies_id: {
      id: "2b3589db-0032-4683-a398-7e68da8093f5",
      name: "Ext. Night 2",
      value: 1,
      from_price: true,
    },
  },
  {
    id: 107,
    occupancies_id: {
      id: "e23d627b-1392-4f55-af63-4ecabf487d3e",
      name: "2 Pers.",
      value: 2,
      from_price: false,
    },
  },
];
const room_prices = [
  {
    id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
    sort: null,
    user_created: null,
    date_created: "2026-05-04T06:24:01.923Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-05-04T06:24:26.026Z",
    room_category_id: "96973ed6-1a26-4199-9d98-eda3b604281b",
    price_date_id: "fff2576d-13e3-438e-a38b-df69c0b0beb6",
    buy_price: "70.00",
    hotel_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
    room_occupancy_id: 106,
    room_prices_translations: [
      {
        id: 17217,
        room_prices_id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17218,
        room_prices_id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17219,
        room_prices_id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17234,
        room_prices_id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17236,
        room_prices_id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17237,
        room_prices_id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17239,
        room_prices_id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17241,
        room_prices_id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17244,
        room_prices_id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17250,
        room_prices_id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17255,
        room_prices_id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: "100.00",
      },
      {
        id: 17257,
        room_prices_id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17260,
        room_prices_id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17262,
        room_prices_id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17265,
        room_prices_id: "27580afb-0921-4163-81c5-e6c8957d3ed4",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
    ],
  },
  {
    id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
    sort: null,
    user_created: null,
    date_created: "2026-05-04T06:24:01.979Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-05-04T06:24:26.059Z",
    room_category_id: "d30b6cfe-eb46-4621-a481-f9743f4b0348",
    price_date_id: "bbb24c57-ca3c-4223-83ff-5b6b20ccf3db",
    buy_price: "140.00",
    hotel_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
    room_occupancy_id: 107,
    room_prices_translations: [
      {
        id: 17246,
        room_prices_id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17249,
        room_prices_id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17253,
        room_prices_id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17320,
        room_prices_id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17324,
        room_prices_id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17327,
        room_prices_id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17328,
        room_prices_id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17332,
        room_prices_id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17336,
        room_prices_id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17349,
        room_prices_id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17353,
        room_prices_id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17357,
        room_prices_id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17358,
        room_prices_id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: "100.00",
      },
      {
        id: 17362,
        room_prices_id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17366,
        room_prices_id: "35eba020-5194-48c2-a6c4-c5c297faa39a",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
    ],
  },
  {
    id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
    sort: null,
    user_created: null,
    date_created: "2026-05-04T06:24:01.976Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-05-04T06:24:26.075Z",
    room_category_id: "d30b6cfe-eb46-4621-a481-f9743f4b0348",
    price_date_id: "bbb24c57-ca3c-4223-83ff-5b6b20ccf3db",
    buy_price: "130.00",
    hotel_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
    room_occupancy_id: 106,
    room_prices_translations: [
      {
        id: 17238,
        room_prices_id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17240,
        room_prices_id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17243,
        room_prices_id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17308,
        room_prices_id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17313,
        room_prices_id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17315,
        room_prices_id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17317,
        room_prices_id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17319,
        room_prices_id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17323,
        room_prices_id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17337,
        room_prices_id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17341,
        room_prices_id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17345,
        room_prices_id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17346,
        room_prices_id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: "186.00",
      },
      {
        id: 17350,
        room_prices_id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17354,
        room_prices_id: "bb0cbf42-525a-4ec1-afad-f9bedddd2b7a",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
    ],
  },
  {
    id: "7762656b-cedb-4094-811e-53e5499b7bf1",
    sort: null,
    user_created: null,
    date_created: "2026-05-04T06:24:01.969Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-05-04T06:24:26.097Z",
    room_category_id: "d30b6cfe-eb46-4621-a481-f9743f4b0348",
    price_date_id: "fff2576d-13e3-438e-a38b-df69c0b0beb6",
    buy_price: "110.00",
    hotel_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
    room_occupancy_id: 106,
    room_prices_translations: [
      {
        id: 17229,
        room_prices_id: "7762656b-cedb-4094-811e-53e5499b7bf1",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17230,
        room_prices_id: "7762656b-cedb-4094-811e-53e5499b7bf1",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17231,
        room_prices_id: "7762656b-cedb-4094-811e-53e5499b7bf1",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17279,
        room_prices_id: "7762656b-cedb-4094-811e-53e5499b7bf1",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17284,
        room_prices_id: "7762656b-cedb-4094-811e-53e5499b7bf1",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17288,
        room_prices_id: "7762656b-cedb-4094-811e-53e5499b7bf1",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17289,
        room_prices_id: "7762656b-cedb-4094-811e-53e5499b7bf1",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17292,
        room_prices_id: "7762656b-cedb-4094-811e-53e5499b7bf1",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17297,
        room_prices_id: "7762656b-cedb-4094-811e-53e5499b7bf1",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17312,
        room_prices_id: "7762656b-cedb-4094-811e-53e5499b7bf1",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17316,
        room_prices_id: "7762656b-cedb-4094-811e-53e5499b7bf1",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17321,
        room_prices_id: "7762656b-cedb-4094-811e-53e5499b7bf1",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17322,
        room_prices_id: "7762656b-cedb-4094-811e-53e5499b7bf1",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: "157.00",
      },
      {
        id: 17326,
        room_prices_id: "7762656b-cedb-4094-811e-53e5499b7bf1",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17330,
        room_prices_id: "7762656b-cedb-4094-811e-53e5499b7bf1",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
    ],
  },
  {
    id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
    sort: null,
    user_created: null,
    date_created: "2026-05-04T06:24:01.934Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-05-04T06:24:26.106Z",
    room_category_id: "96973ed6-1a26-4199-9d98-eda3b604281b",
    price_date_id: "fff2576d-13e3-438e-a38b-df69c0b0beb6",
    buy_price: "80.00",
    hotel_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
    room_occupancy_id: 107,
    room_prices_translations: [
      {
        id: 17220,
        room_prices_id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17221,
        room_prices_id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17222,
        room_prices_id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17242,
        room_prices_id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17245,
        room_prices_id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17247,
        room_prices_id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17248,
        room_prices_id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17251,
        room_prices_id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17254,
        room_prices_id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17267,
        room_prices_id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17272,
        room_prices_id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17274,
        room_prices_id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: "57.00",
      },
      {
        id: 17277,
        room_prices_id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17280,
        room_prices_id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17285,
        room_prices_id: "cf2dfc23-2c77-46c8-b315-c7cf05d3f367",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
    ],
  },
  {
    id: "bfc1d534-1d47-4032-94ac-d86637abd258",
    sort: null,
    user_created: null,
    date_created: "2026-05-04T06:24:01.945Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-05-04T06:24:26.118Z",
    room_category_id: "96973ed6-1a26-4199-9d98-eda3b604281b",
    price_date_id: "bbb24c57-ca3c-4223-83ff-5b6b20ccf3db",
    buy_price: "90.00",
    hotel_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
    room_occupancy_id: 106,
    room_prices_translations: [
      {
        id: 17223,
        room_prices_id: "bfc1d534-1d47-4032-94ac-d86637abd258",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17224,
        room_prices_id: "bfc1d534-1d47-4032-94ac-d86637abd258",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17225,
        room_prices_id: "bfc1d534-1d47-4032-94ac-d86637abd258",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17252,
        room_prices_id: "bfc1d534-1d47-4032-94ac-d86637abd258",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17256,
        room_prices_id: "bfc1d534-1d47-4032-94ac-d86637abd258",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17259,
        room_prices_id: "bfc1d534-1d47-4032-94ac-d86637abd258",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17261,
        room_prices_id: "bfc1d534-1d47-4032-94ac-d86637abd258",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17264,
        room_prices_id: "bfc1d534-1d47-4032-94ac-d86637abd258",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17269,
        room_prices_id: "bfc1d534-1d47-4032-94ac-d86637abd258",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17282,
        room_prices_id: "bfc1d534-1d47-4032-94ac-d86637abd258",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17287,
        room_prices_id: "bfc1d534-1d47-4032-94ac-d86637abd258",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17291,
        room_prices_id: "bfc1d534-1d47-4032-94ac-d86637abd258",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17293,
        room_prices_id: "bfc1d534-1d47-4032-94ac-d86637abd258",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: "129.00",
      },
      {
        id: 17299,
        room_prices_id: "bfc1d534-1d47-4032-94ac-d86637abd258",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17305,
        room_prices_id: "bfc1d534-1d47-4032-94ac-d86637abd258",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
    ],
  },
  {
    id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
    sort: null,
    user_created: null,
    date_created: "2026-05-04T06:24:01.973Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-05-04T06:24:26.137Z",
    room_category_id: "d30b6cfe-eb46-4621-a481-f9743f4b0348",
    price_date_id: "fff2576d-13e3-438e-a38b-df69c0b0beb6",
    buy_price: "120.00",
    hotel_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
    room_occupancy_id: 107,
    room_prices_translations: [
      {
        id: 17232,
        room_prices_id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17233,
        room_prices_id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17235,
        room_prices_id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17294,
        room_prices_id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17298,
        room_prices_id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17302,
        room_prices_id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17303,
        room_prices_id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17306,
        room_prices_id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17311,
        room_prices_id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17325,
        room_prices_id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17329,
        room_prices_id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17333,
        room_prices_id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17334,
        room_prices_id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: "86.00",
      },
      {
        id: 17338,
        room_prices_id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17342,
        room_prices_id: "6a8db031-6b0f-4935-8414-01a2f93a96ed",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
    ],
  },
  {
    id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-05-04T06:24:03.057Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-05-04T06:24:26.147Z",
    room_category_id: "a198e279-6840-4d39-bc31-7a61d6253cea",
    price_date_id: "bbb24c57-ca3c-4223-83ff-5b6b20ccf3db",
    buy_price: "50.00",
    hotel_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
    room_occupancy_id: 106,
    room_prices_translations: [
      {
        id: 17286,
        room_prices_id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17290,
        room_prices_id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17295,
        room_prices_id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17355,
        room_prices_id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17359,
        room_prices_id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17363,
        room_prices_id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17364,
        room_prices_id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17368,
        room_prices_id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17372,
        room_prices_id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17384,
        room_prices_id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17386,
        room_prices_id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17387,
        room_prices_id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: "71.00",
      },
      {
        id: 17388,
        room_prices_id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17389,
        room_prices_id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17391,
        room_prices_id: "c7aa02eb-22e0-48f4-9f90-2ab2b9ee96e0",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
    ],
  },
  {
    id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-05-04T06:24:03.060Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-05-04T06:24:26.151Z",
    room_category_id: "a198e279-6840-4d39-bc31-7a61d6253cea",
    price_date_id: "bbb24c57-ca3c-4223-83ff-5b6b20ccf3db",
    buy_price: "60.00",
    hotel_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
    room_occupancy_id: 107,
    room_prices_translations: [
      {
        id: 17300,
        room_prices_id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17304,
        room_prices_id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17309,
        room_prices_id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17367,
        room_prices_id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17371,
        room_prices_id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17375,
        room_prices_id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17376,
        room_prices_id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17379,
        room_prices_id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17381,
        room_prices_id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17390,
        room_prices_id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17392,
        room_prices_id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17393,
        room_prices_id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: "43.00",
      },
      {
        id: 17394,
        room_prices_id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17395,
        room_prices_id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17396,
        room_prices_id: "eb2f173c-3151-4b22-8de2-30c8d53e4adc",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
    ],
  },
  {
    id: "6ab79aab-2604-43ab-a468-341f781a0214",
    sort: null,
    user_created: null,
    date_created: "2026-05-04T06:24:01.960Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-05-04T06:24:26.165Z",
    room_category_id: "96973ed6-1a26-4199-9d98-eda3b604281b",
    price_date_id: "bbb24c57-ca3c-4223-83ff-5b6b20ccf3db",
    buy_price: "100.00",
    hotel_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
    room_occupancy_id: 107,
    room_prices_translations: [
      {
        id: 17226,
        room_prices_id: "6ab79aab-2604-43ab-a468-341f781a0214",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17227,
        room_prices_id: "6ab79aab-2604-43ab-a468-341f781a0214",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17228,
        room_prices_id: "6ab79aab-2604-43ab-a468-341f781a0214",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17266,
        room_prices_id: "6ab79aab-2604-43ab-a468-341f781a0214",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17270,
        room_prices_id: "6ab79aab-2604-43ab-a468-341f781a0214",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17273,
        room_prices_id: "6ab79aab-2604-43ab-a468-341f781a0214",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17275,
        room_prices_id: "6ab79aab-2604-43ab-a468-341f781a0214",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17278,
        room_prices_id: "6ab79aab-2604-43ab-a468-341f781a0214",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17283,
        room_prices_id: "6ab79aab-2604-43ab-a468-341f781a0214",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17296,
        room_prices_id: "6ab79aab-2604-43ab-a468-341f781a0214",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17301,
        room_prices_id: "6ab79aab-2604-43ab-a468-341f781a0214",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17307,
        room_prices_id: "6ab79aab-2604-43ab-a468-341f781a0214",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17310,
        room_prices_id: "6ab79aab-2604-43ab-a468-341f781a0214",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: "71.00",
      },
      {
        id: 17314,
        room_prices_id: "6ab79aab-2604-43ab-a468-341f781a0214",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17318,
        room_prices_id: "6ab79aab-2604-43ab-a468-341f781a0214",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
    ],
  },
  {
    id: "c9294c91-92c3-4755-9548-89815972f5c2",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-05-04T06:24:03.054Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-05-04T06:24:26.178Z",
    room_category_id: "a198e279-6840-4d39-bc31-7a61d6253cea",
    price_date_id: "fff2576d-13e3-438e-a38b-df69c0b0beb6",
    buy_price: "40.00",
    hotel_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
    room_occupancy_id: 107,
    room_prices_translations: [
      {
        id: 17271,
        room_prices_id: "c9294c91-92c3-4755-9548-89815972f5c2",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17276,
        room_prices_id: "c9294c91-92c3-4755-9548-89815972f5c2",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17281,
        room_prices_id: "c9294c91-92c3-4755-9548-89815972f5c2",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17343,
        room_prices_id: "c9294c91-92c3-4755-9548-89815972f5c2",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17347,
        room_prices_id: "c9294c91-92c3-4755-9548-89815972f5c2",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17351,
        room_prices_id: "c9294c91-92c3-4755-9548-89815972f5c2",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17352,
        room_prices_id: "c9294c91-92c3-4755-9548-89815972f5c2",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17356,
        room_prices_id: "c9294c91-92c3-4755-9548-89815972f5c2",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17360,
        room_prices_id: "c9294c91-92c3-4755-9548-89815972f5c2",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17374,
        room_prices_id: "c9294c91-92c3-4755-9548-89815972f5c2",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17378,
        room_prices_id: "c9294c91-92c3-4755-9548-89815972f5c2",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17380,
        room_prices_id: "c9294c91-92c3-4755-9548-89815972f5c2",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: "29.00",
      },
      {
        id: 17382,
        room_prices_id: "c9294c91-92c3-4755-9548-89815972f5c2",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17383,
        room_prices_id: "c9294c91-92c3-4755-9548-89815972f5c2",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17385,
        room_prices_id: "c9294c91-92c3-4755-9548-89815972f5c2",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
    ],
  },
  {
    id: "2ce01fd7-ca95-4896-b691-b606c5246449",
    sort: null,
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-05-04T06:24:03.050Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-05-04T06:24:26.195Z",
    room_category_id: "a198e279-6840-4d39-bc31-7a61d6253cea",
    price_date_id: "fff2576d-13e3-438e-a38b-df69c0b0beb6",
    buy_price: "30.00",
    hotel_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
    room_occupancy_id: 106,
    room_prices_translations: [
      {
        id: 17258,
        room_prices_id: "2ce01fd7-ca95-4896-b691-b606c5246449",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17263,
        room_prices_id: "2ce01fd7-ca95-4896-b691-b606c5246449",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17268,
        room_prices_id: "2ce01fd7-ca95-4896-b691-b606c5246449",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17331,
        room_prices_id: "2ce01fd7-ca95-4896-b691-b606c5246449",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17335,
        room_prices_id: "2ce01fd7-ca95-4896-b691-b606c5246449",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17339,
        room_prices_id: "2ce01fd7-ca95-4896-b691-b606c5246449",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17340,
        room_prices_id: "2ce01fd7-ca95-4896-b691-b606c5246449",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17344,
        room_prices_id: "2ce01fd7-ca95-4896-b691-b606c5246449",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17348,
        room_prices_id: "2ce01fd7-ca95-4896-b691-b606c5246449",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17361,
        room_prices_id: "2ce01fd7-ca95-4896-b691-b606c5246449",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: null,
      },
      {
        id: 17365,
        room_prices_id: "2ce01fd7-ca95-4896-b691-b606c5246449",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17369,
        room_prices_id: "2ce01fd7-ca95-4896-b691-b606c5246449",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
      {
        id: 17370,
        room_prices_id: "2ce01fd7-ca95-4896-b691-b606c5246449",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        sell_price: "43.00",
      },
      {
        id: 17373,
        room_prices_id: "2ce01fd7-ca95-4896-b691-b606c5246449",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        sell_price: null,
      },
      {
        id: 17377,
        room_prices_id: "2ce01fd7-ca95-4896-b691-b606c5246449",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        sell_price: null,
      },
    ],
  },
];
const hotel_translations = [
  {
    id: 152,
    hotels_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
    translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
    buy_price_type: "per_unit",
    sell_price_type: "per_person",
    percentage_type: "net",
    provision_percentage: null,
    margin_percentage: 16,
    exchange_rate: {
      key: "f23b1b26-b86e-4ba3-9100-942b7ca902b6",
      collection: "rates",
    },
    from_price: null,
  },
  {
    id: 153,
    hotels_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
    translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
    buy_price_type: null,
    sell_price_type: null,
    percentage_type: null,
    provision_percentage: null,
    margin_percentage: 25,
    exchange_rate: null,
    from_price: null,
  },
  {
    id: 154,
    hotels_id: "b190437a-e4b6-4bf2-92df-d6ae2b73fea3",
    translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
    buy_price_type: null,
    sell_price_type: null,
    percentage_type: null,
    provision_percentage: null,
    margin_percentage: 20,
    exchange_rate: null,
    from_price: null,
  },
];

console.log(
  foo({
    child_room_categories,
    price_dates,
    occupancies,
    room_prices,
    hotel_translations,
  }),
);
