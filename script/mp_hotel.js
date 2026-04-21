module.exports = async function (data) {
  //   const presets = data.read_data_margin_preset || [];
  //   const preset = presets.length > 0 ? presets[0] : null;
  //   const hotels = data.read_data_hotel || [];
  //   const hotel = hotels.length > 0 ? hotels[0] : null;
  //   if (!preset || !hotel || !hotel.translations) return [];
  //   const marginTranslations = preset.hotel_margin_translations || [];
  //   const exceptions = preset.hotel_destinations || [];
  //   const marginMatchedException = exceptions.find(
  //     (e) => e.exception_destination === hotel.destination,
  //   );
  //   const updates = [];
  //   for (const trans of hotel.translations) {
  //     if (trans.margin_percentage != null) {
  //       continue;
  //     }
  //     const localeId = trans.translations_id;
  //     let margin = null;
  //     if (marginMatchedException && marginMatchedException.translations) {
  //       const et = marginMatchedException.translations.find(
  //         (t) => t.translations_id === localeId,
  //       );
  //       if (et && et.exception_margin != null) {
  //         margin = et.exception_margin;
  //       }
  //     }
  //     if (margin == null && marginTranslations) {
  //       const pt = marginTranslations.find((t) => t.translations_id === localeId);
  //       if (pt && pt.margin != null) {
  //         margin = pt.margin;
  //       }
  //     }
  //     if (margin != null) {
  //       updates.push({
  //         id: trans.id,
  //         margin_percentage: margin,
  //       });
  //     }
  //   }
  //   return updates;
  const presets = data.read_data_margin_preset || [];
  const preset = presets.length > 0 ? presets[0] : null;
  const hotel_id = data.transform_payload.id;
  const hotel_translations = data.read_data_hotel_translations;
  const hotel = data.read_data_hotel;
  const margin_preset = data.read_data_margin_preset;
  const updates = [];
  const marginTranslations = preset.hotel_margin_translations || [];
  const exceptions = preset.hotel_destinations || [];
  if (!preset || !hotel || !hotel_translations) return [];
  if (
    hotel_translations &&
    Array.isArray(hotel_translations) &&
    hotel_translations.length > 0
  ) {
    hotel_translations.map((ht) => {
      if (ht.margin_percentage === null) {
        updates.push({
          id: ht.id,
          margin_percentage: margin,
        });
      }
    });
  }
};

transform_payload = {
  id: "d4ac7522-daa6-4207-b721-91d553172f2d",
};

read_data_margin_preset = [
  {
    id: "db9ff91b-3982-4ffe-890b-966f8797df5a",
    hotel_margin_translations: [
      {
        translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
        margin: 16,
      },
      {
        translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
        margin: 20,
      },
      {
        translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
        margin: 25,
      },
    ],
    hotel_destinations: [
      {
        exception_destination: 2,
        translations: [
          {
            translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
            exception_margin: 25,
          },
          {
            translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
            exception_margin: 26,
          },
          {
            translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
            exception_margin: 27,
          },
        ],
      },
      {
        exception_destination: 6,
        translations: [
          {
            translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
            exception_margin: 13,
          },
          {
            translations_id: null,
            exception_margin: 12,
          },
        ],
      },
    ],
  },
];

read_data_translations = [
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

read_data_hotel = [
  {
    id: "d4ac7522-daa6-4207-b721-91d553172f2d",
    destination: "a9ebff19-71b8-4ca8-91e0-4ea31cb4d47e",
  },
];

read_data_hotel_translations = [
  {
    id: 9,
    margin_percentage: 25,
    hotels_id: "d4ac7522-daa6-4207-b721-91d553172f2d",
    translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
  },
  {
    id: 24,
    margin_percentage: null,
    hotels_id: "d4ac7522-daa6-4207-b721-91d553172f2d",
    translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
  },
];
