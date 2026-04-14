// https://cms.staging-5em2ouy-sxbqtq6mu5vgm.de-2.platformsh.site/items/exchange_rate_presets?fields=*,hotel_exchange_rate_translations.*,hotel_destinations.*,hotel_destinations.translations.*,camper_exchange_rate_translations.*,camper_destinations.*,camper_destinations.translations.*,rental_car_exchange_rate_translations.*,rental_car_destinations.*,rental_car_destinations.translations.*,round_trips_exchange_rate_translations.*,round_trips_destinations.*,round_trips_destinations.translations.*,tours_exchange_rate_translations.*,tours_destinations.*,tours_destinations.translations.*
const exchange_rate_presets_response = {
  data: {
    id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-04-06T14:15:09.937Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-04-08T10:13:24.099Z",
    hotel_exchange_rate_translations: [
      {
        id: 1,
        exchange_rate_presets_id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        exchange_rate: "12c80278-68c0-473f-9296-8bce32962128",
      },
      {
        id: 2,
        exchange_rate_presets_id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        exchange_rate: "c3eadb4f-5a53-4ab6-bdb8-9defcff5ef11",
      },
      {
        id: 3,
        exchange_rate_presets_id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        exchange_rate: "8eacf075-bc1a-4aa7-bfbc-3620605f108d",
      },
    ],
    hotel_destinations: [
      {
        id: "b5cba90c-a3e1-4f93-925b-62ed49db04e8",
        sort: null,
        user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_created: "2026-04-06T14:15:09.944Z",
        user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_updated: "2026-04-08T09:47:17.701Z",
        exception_destination: "a58e1a75-cc62-4f7e-bec1-8589bcc57042",
        erp_hotel_destination_exceptions_id:
          "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations: [
          {
            id: 1,
            erp_hotel_destination_exceptions_id:
              "b5cba90c-a3e1-4f93-925b-62ed49db04e8",
            translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
            exception_exchange_rate: "8eacf075-bc1a-4aa7-bfbc-3620605f108d",
          },
          {
            id: 2,
            erp_hotel_destination_exceptions_id:
              "b5cba90c-a3e1-4f93-925b-62ed49db04e8",
            translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
            exception_exchange_rate: "12c80278-68c0-473f-9296-8bce32962128",
          },
          {
            id: 3,
            erp_hotel_destination_exceptions_id:
              "b5cba90c-a3e1-4f93-925b-62ed49db04e8",
            translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
            exception_exchange_rate: "8eacf075-bc1a-4aa7-bfbc-3620605f108d",
          },
        ],
      },
    ],
    camper_exchange_rate_translations: [
      {
        id: 1,
        exchange_rate_presets_id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        exchange_rate: "981c6979-5090-4d20-a597-ca9c71a5e07e",
      },
      {
        id: 2,
        exchange_rate_presets_id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        exchange_rate: "981c6979-5090-4d20-a597-ca9c71a5e07e",
      },
      {
        id: 3,
        exchange_rate_presets_id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        exchange_rate: "12c80278-68c0-473f-9296-8bce32962128",
      },
    ],
    camper_destinations: [
      {
        id: "97226bca-e2b9-417c-9edb-d14160902ac9",
        sort: null,
        user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_created: "2026-04-08T09:46:58.859Z",
        user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_updated: "2026-04-08T10:06:38.448Z",
        erp_camper_destination_exceptions_id:
          "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        exception_destination: "a58e1a75-cc62-4f7e-bec1-8589bcc57042",
        translations: [
          {
            id: 1,
            erp_camper_destination_exceptions_id:
              "97226bca-e2b9-417c-9edb-d14160902ac9",
            translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
            exception_exchange_rate: "8eacf075-bc1a-4aa7-bfbc-3620605f108d",
          },
          {
            id: 2,
            erp_camper_destination_exceptions_id:
              "97226bca-e2b9-417c-9edb-d14160902ac9",
            translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
            exception_exchange_rate: "8eacf075-bc1a-4aa7-bfbc-3620605f108d",
          },
          {
            id: 3,
            erp_camper_destination_exceptions_id:
              "97226bca-e2b9-417c-9edb-d14160902ac9",
            translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
            exception_exchange_rate: "8eacf075-bc1a-4aa7-bfbc-3620605f108d",
          },
        ],
      },
    ],
    rental_car_exchange_rate_translations: [
      {
        id: 1,
        exchange_rate_presets_id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        exchange_rate: "dd23092c-838d-417f-84a0-04b4d8e77db3",
      },
      {
        id: 2,
        exchange_rate_presets_id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        exchange_rate: "f23b1b26-b86e-4ba3-9100-942b7ca902b6",
      },
      {
        id: 3,
        exchange_rate_presets_id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        exchange_rate: "47bf7db4-2b85-4316-a947-fba535b6e474",
      },
    ],
    rental_car_destinations: [
      {
        id: "e508b122-e909-4518-b6d3-9624cb837f3a",
        sort: null,
        user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_created: "2026-04-08T09:50:08.888Z",
        user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_updated: "2026-04-08T10:13:24.101Z",
        erp_rental_car_destination_exceptions_id:
          "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        exception_destination: "3a0c50d6-50b1-469f-9f80-81c23fe3922f",
        translations: [
          {
            id: 1,
            erp_rental_car_destination_exceptions_id:
              "e508b122-e909-4518-b6d3-9624cb837f3a",
            translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
            exception_exchange_rate: "8eacf075-bc1a-4aa7-bfbc-3620605f108d",
          },
          {
            id: 2,
            erp_rental_car_destination_exceptions_id:
              "e508b122-e909-4518-b6d3-9624cb837f3a",
            translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
            exception_exchange_rate: "f23b1b26-b86e-4ba3-9100-942b7ca902b6",
          },
          {
            id: 3,
            erp_rental_car_destination_exceptions_id:
              "e508b122-e909-4518-b6d3-9624cb837f3a",
            translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
            exception_exchange_rate: "4d53441b-eb07-453e-9601-d4b3607c1f3a",
          },
        ],
      },
    ],
    round_trips_exchange_rate_translations: [
      {
        id: 1,
        exchange_rate_presets_id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        exchange_rate: "981c6979-5090-4d20-a597-ca9c71a5e07e",
      },
      {
        id: 2,
        exchange_rate_presets_id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        exchange_rate: "12c80278-68c0-473f-9296-8bce32962128",
      },
      {
        id: 3,
        exchange_rate_presets_id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        exchange_rate: "c3eadb4f-5a53-4ab6-bdb8-9defcff5ef11",
      },
    ],
    round_trips_destinations: [
      {
        id: "eca5e324-a1d5-4411-bd29-52453f6a3994",
        sort: null,
        user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_created: "2026-04-08T09:51:26.241Z",
        user_updated: null,
        date_updated: null,
        erp_round_trips_destination_exceptions_id:
          "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        exception_destination: "3a0c50d6-50b1-469f-9f80-81c23fe3922f",
        translations: [
          {
            id: 1,
            erp_round_trips_destination_exceptions_id:
              "eca5e324-a1d5-4411-bd29-52453f6a3994",
            translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
            exception_exchange_rate: "f23b1b26-b86e-4ba3-9100-942b7ca902b6",
          },
          {
            id: 2,
            erp_round_trips_destination_exceptions_id:
              "eca5e324-a1d5-4411-bd29-52453f6a3994",
            translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
            exception_exchange_rate: "4d53441b-eb07-453e-9601-d4b3607c1f3a",
          },
          {
            id: 3,
            erp_round_trips_destination_exceptions_id:
              "eca5e324-a1d5-4411-bd29-52453f6a3994",
            translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
            exception_exchange_rate: "0a44a0bf-585b-4c55-a8d6-562b5e531d34",
          },
        ],
      },
    ],
    tours_exchange_rate_translations: [
      {
        id: 1,
        exchange_rate_presets_id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        exchange_rate: "981c6979-5090-4d20-a597-ca9c71a5e07e",
      },
      {
        id: 2,
        exchange_rate_presets_id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        exchange_rate: "47bf7db4-2b85-4316-a947-fba535b6e474",
      },
      {
        id: 3,
        exchange_rate_presets_id: "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        exchange_rate: "f23b1b26-b86e-4ba3-9100-942b7ca902b6",
      },
    ],
    tours_destinations: [
      {
        id: "6f9ddcab-5026-4b3a-a141-9ec070b2cdaa",
        sort: null,
        user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_created: "2026-04-08T09:51:58.441Z",
        user_updated: null,
        date_updated: null,
        erp_tours_destination_exceptions_id:
          "5ba005e6-c08b-4bfb-ab35-456c879b6337",
        exception_destination: "a58e1a75-cc62-4f7e-bec1-8589bcc57042",
        translations: [
          {
            id: 1,
            erp_tours_destination_exceptions_id:
              "6f9ddcab-5026-4b3a-a141-9ec070b2cdaa",
            translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
            exception_exchange_rate: "8eacf075-bc1a-4aa7-bfbc-3620605f108d",
          },
          {
            id: 2,
            erp_tours_destination_exceptions_id:
              "6f9ddcab-5026-4b3a-a141-9ec070b2cdaa",
            translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
            exception_exchange_rate: "6324ada4-d844-4835-885d-d622f8e57d75",
          },
          {
            id: 3,
            erp_tours_destination_exceptions_id:
              "6f9ddcab-5026-4b3a-a141-9ec070b2cdaa",
            translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
            exception_exchange_rate: "dd23092c-838d-417f-84a0-04b4d8e77db3",
          },
        ],
      },
    ],
  },
};

// https://cms.staging-5em2ouy-sxbqtq6mu5vgm.de-2.platformsh.site/items/margin_presets?fields=*,tours_destinations.*,tours_destinations.translations.*,tours_margin_translations.*,camper_margin_translations.*,rental_car_margin_translation.*,round_trips_margin_translations.*,hotel_margin_translations.*,rental_car_destinations.*,rental_car_destinations.translations.*,hotel_destinations.*,hotel_destinations.translations.*,camper_destinations.*,camper_destinations.translations.*,round_trips_destinations.*,round_trips_destinations.translations.*,hotel_margin_translations.translations_id.*
const margin_presets_response = {
  data: {
    id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
    user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_created: "2026-04-06T14:13:53.489Z",
    user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    date_updated: "2026-04-09T06:37:48.192Z",
    hotel_other_default_locale: "1\n2/n3\n5\t6\n8\t87\n12",
    tours_destinations: [
      {
        id: "6869bdb8-01b2-46a8-8522-af2840ff0ebf",
        sort: null,
        user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_created: "2026-04-08T09:40:51.661Z",
        user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_updated: "2026-04-08T11:30:54.019Z",
        exception_destination: "0dba333b-ed45-47e7-8742-793b0c4e2d7d",
        mp_tours_destination_exceptions_id:
          "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations: [
          {
            id: 1,
            mp_tours_destination_exceptions_id:
              "6869bdb8-01b2-46a8-8522-af2840ff0ebf",
            translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
            exception_margin: 14,
          },
          {
            id: 2,
            mp_tours_destination_exceptions_id:
              "6869bdb8-01b2-46a8-8522-af2840ff0ebf",
            translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
            exception_margin: 15,
          },
          {
            id: 3,
            mp_tours_destination_exceptions_id:
              "6869bdb8-01b2-46a8-8522-af2840ff0ebf",
            translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
            exception_margin: 16,
          },
        ],
      },
    ],
    tours_margin_translations: [
      {
        id: 1,
        margin_presets_id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        margin: 5.5,
      },
      {
        id: 2,
        margin_presets_id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        margin: 15.15,
      },
      {
        id: 3,
        margin_presets_id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        margin: 25.25,
      },
    ],
    camper_margin_translations: [
      {
        id: 1,
        margin_presets_id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        margin: 10,
      },
      {
        id: 2,
        margin_presets_id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        margin: 20,
      },
      {
        id: 3,
        margin_presets_id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        margin: 30,
      },
    ],
    rental_car_margin_translation: [
      {
        id: 1,
        margin_presets_id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        margin: 11,
      },
      {
        id: 2,
        margin_presets_id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        margin: 12,
      },
      {
        id: 3,
        margin_presets_id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        margin: 13,
      },
    ],
    rental_car_destinations: [
      {
        id: "d400a785-31f4-465b-9c96-689514527afa",
        sort: null,
        user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_created: "2026-04-08T09:40:51.628Z",
        user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_updated: "2026-04-08T10:10:10.189Z",
        exception_destination: "3a0c50d6-50b1-469f-9f80-81c23fe3922f",
        mp_rental_car_destination_exceptions_id:
          "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations: [
          {
            id: 1,
            mp_rental_car_destination_exceptions_id:
              "d400a785-31f4-465b-9c96-689514527afa",
            translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
            exception_margin: 7,
          },
          {
            id: 2,
            mp_rental_car_destination_exceptions_id:
              "d400a785-31f4-465b-9c96-689514527afa",
            translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
            exception_margin: 7.1,
          },
          {
            id: 3,
            mp_rental_car_destination_exceptions_id:
              "d400a785-31f4-465b-9c96-689514527afa",
            translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
            exception_margin: 7.2,
          },
        ],
      },
    ],
    round_trips_margin_translations: [
      {
        id: 1,
        margin_presets_id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        margin: 8.8,
      },
      {
        id: 2,
        margin_presets_id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        margin: 9.9,
      },
      {
        id: 3,
        margin_presets_id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        margin: 10.1,
      },
    ],
    camper_destinations: [
      {
        id: "44ce2922-925d-4ffa-92e5-1319b9797fc9",
        sort: null,
        user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_created: "2026-04-08T09:34:19.233Z",
        user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_updated: "2026-04-08T13:31:52.814Z",
        exception_destination: "0dba333b-ed45-47e7-8742-793b0c4e2d7d",
        mp_camper_destination_exceptions_id:
          "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations: [
          {
            id: 1,
            mp_camper_destination_exceptions_id:
              "44ce2922-925d-4ffa-92e5-1319b9797fc9",
            translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
            exception_margin: 5,
          },
          {
            id: 2,
            mp_camper_destination_exceptions_id:
              "44ce2922-925d-4ffa-92e5-1319b9797fc9",
            translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
            exception_margin: 15,
          },
          {
            id: 3,
            mp_camper_destination_exceptions_id:
              "44ce2922-925d-4ffa-92e5-1319b9797fc9",
            translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
            exception_margin: 25,
          },
        ],
      },
    ],
    round_trips_destinations: [
      {
        id: "0e7e9a8d-27f6-4644-bdce-96d15bbb753a",
        sort: null,
        user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_created: "2026-04-08T09:40:51.645Z",
        user_updated: null,
        date_updated: null,
        exception_destination: "0dba333b-ed45-47e7-8742-793b0c4e2d7d",
        mp_round_trips_destination_exceptions_id:
          "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations: [
          {
            id: 1,
            mp_round_trips_destination_exceptions_id:
              "0e7e9a8d-27f6-4644-bdce-96d15bbb753a",
            translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
            exception_margin: 96,
          },
          {
            id: 2,
            mp_round_trips_destination_exceptions_id:
              "0e7e9a8d-27f6-4644-bdce-96d15bbb753a",
            translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
            exception_margin: 97,
          },
          {
            id: 3,
            mp_round_trips_destination_exceptions_id:
              "0e7e9a8d-27f6-4644-bdce-96d15bbb753a",
            translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
            exception_margin: 98,
          },
        ],
      },
    ],
    hotel_margin_translations: [
      {
        id: 1,
        margin_presets_id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
        margin: 11.111,
        translations_id: {
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
      },
      {
        id: 2,
        margin_presets_id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
        margin: 20,
        translations_id: {
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
      },
      {
        id: 3,
        margin_presets_id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
        margin: 25,
        translations_id: {
          id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
          status: "draft",
          sort: 6,
          user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
          date_created: "2026-01-16T08:16:09.353Z",
          user_updated: "077b9ad2-95de-41e2-a80a-024e0325bf34",
          date_updated: "2026-02-28T13:03:41.185Z",
          code: "nl-NL",
          name: "Dutch, Belgium",
        },
      },
    ],
    hotel_destinations: [
      {
        id: "d995e12f-16a0-47e6-9b57-e05e09c93396",
        sort: null,
        user_created: "dfe3f028-e8eb-4338-9f29-455b447711c4",
        date_created: "2026-04-07T06:08:48.083Z",
        user_updated: null,
        date_updated: null,
        exception_destination: "3a0c50d6-50b1-469f-9f80-81c23fe3922f",
        mp_hotel_destination_exceptions_id:
          "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations: [
          {
            id: 2,
            mp_hotel_destination_exceptions_id:
              "d995e12f-16a0-47e6-9b57-e05e09c93396",
            translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
            exception_margin: 13,
          },
          {
            id: 3,
            mp_hotel_destination_exceptions_id:
              "d995e12f-16a0-47e6-9b57-e05e09c93396",
            translations_id: null,
            exception_margin: 12,
          },
        ],
      },
      {
        id: "9a3b0bed-29f8-4d72-b6a7-e07e6a7a8610",
        sort: null,
        user_created: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_created: "2026-04-06T14:13:53.492Z",
        user_updated: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
        date_updated: "2026-04-08T13:31:03.483Z",
        exception_destination: "0dba333b-ed45-47e7-8742-793b0c4e2d7d",
        mp_hotel_destination_exceptions_id:
          "db9ff91b-3982-4ffe-890b-966f8797df5a",
        translations: [
          {
            id: 1,
            mp_hotel_destination_exceptions_id:
              "9a3b0bed-29f8-4d72-b6a7-e07e6a7a8610",
            translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
            exception_margin: 25,
          },
          {
            id: 4,
            mp_hotel_destination_exceptions_id:
              "9a3b0bed-29f8-4d72-b6a7-e07e6a7a8610",
            translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
            exception_margin: 26,
          },
          {
            id: 5,
            mp_hotel_destination_exceptions_id:
              "9a3b0bed-29f8-4d72-b6a7-e07e6a7a8610",
            translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
            exception_margin: 27,
          },
        ],
      },
    ],
  },
};

module.exports = async function (data) {
  const marginPresets = data.read_margin_presets[0] || null;
  if (!marginPresets) {
    return { isPossible: false };
  } else {
    let hotel_other_default_locale = "";
    let camper_other_default_locale = "";
    let tours_other_default_locale = "";
    let round_trips_other_default_locale = "";
    let rental_car_other_default_locale = "";

    marginPresets.hotel_margin_translations.map((item) => {
      if (!!item?.translations_id?.id) {
        hotel_other_default_locale += `${item?.translations_id?.code} : ${item?.margin ?? "-"} %\n`;
      }
    });

    marginPresets.camper_margin_translations.map((item) => {
      if (!!item?.translations_id?.id) {
        camper_other_default_locale += `${item?.translations_id?.code} : ${item?.margin ?? "-"} %\n`;
      }
    });

    marginPresets.tours_margin_translations.map((item) => {
      if (!!item?.translations_id?.id) {
        tours_other_default_locale += `${item?.translations_id?.code} : ${item?.margin ?? "-"} %\n`;
      }
    });

    marginPresets.round_trips_margin_translations.map((item) => {
      if (!!item?.translations_id?.id) {
        round_trips_other_default_locale += `${item?.translations_id?.code} : ${item?.margin ?? "-"} %\n`;
      }
    });

    marginPresets.rental_car_margin_translation.map((item) => {
      if (!!item?.translations_id?.id) {
        rental_car_other_default_locale += `${item?.translations_id?.code} : ${item?.margin ?? "-"} %\n`;
      }
    });

    return {
      isPossible: true,
      hotel_other_default_locale,
      camper_other_default_locale,
      tours_other_default_locale,
      round_trips_other_default_locale,
      rental_car_other_default_locale,
    };
  }
};

module.exports = async function (data) {
  const erPresets = data.read_exchange_rate_presets[0] || null;
  if (!erPresets) {
    return { isPossible: false };
  } else {
    let hotel_other_default_locale = "";
    let camper_other_default_locale = "";
    let tours_other_default_locale = "";
    let round_trips_other_default_locale = "";
    let rental_car_other_default_locale = "";

    erPresets.hotel_exchange_rate_translations.map((item) => {
      if (!!item?.translations_id?.id) {
        const rate = item?.exchange_rate;
        const rateStr = rate
          ? `${rate.from_currency?.code ?? "-"}=>${rate.to_currency?.code ?? "-"}@${rate.rate ?? "-"}`
          : "-";
        hotel_other_default_locale += `${item?.translations_id?.code} : ${rateStr}\n`;
      }
    });

    erPresets.camper_exchange_rate_translations.map((item) => {
      if (!!item?.translations_id?.id) {
        const rate = item?.exchange_rate;
        const rateStr = rate
          ? `${rate.from_currency?.code ?? "-"}=>${rate.to_currency?.code ?? "-"}@${rate.rate ?? "-"}`
          : "-";
        camper_other_default_locale += `${item?.translations_id?.code} : ${rateStr}\n`;
      }
    });

    erPresets.tours_exchange_rate_translations.map((item) => {
      if (!!item?.translations_id?.id) {
        const rate = item?.exchange_rate;
        const rateStr = rate
          ? `${rate.from_currency?.code ?? "-"}=>${rate.to_currency?.code ?? "-"}@${rate.rate ?? "-"}`
          : "-";
        tours_other_default_locale += `${item?.translations_id?.code} : ${rateStr}\n`;
      }
    });

    erPresets.round_trips_exchange_rate_translations.map((item) => {
      if (!!item?.translations_id?.id) {
        const rate = item?.exchange_rate;
        const rateStr = rate
          ? `${rate.from_currency?.code ?? "-"}=>${rate.to_currency?.code ?? "-"}@${rate.rate ?? "-"}`
          : "-";
        round_trips_other_default_locale += `${item?.translations_id?.code} : ${rateStr}\n`;
      }
    });

    erPresets.rental_car_exchange_rate_translations.map((item) => {
      if (!!item?.translations_id?.id) {
        const rate = item?.exchange_rate;
        const rateStr = rate
          ? `${rate.from_currency?.code ?? "-"}=>${rate.to_currency?.code ?? "-"}@${rate.rate ?? "-"}`
          : "-";
        rental_car_other_default_locale += `${item?.translations_id?.code} : ${rateStr}\n`;
      }
    });

    return {
      isPossible: true,
      hotel_other_default_locale,
      camper_other_default_locale,
      tours_other_default_locale,
      round_trips_other_default_locale,
      rental_car_other_default_locale,
    };
  }
};
