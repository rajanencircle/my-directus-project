module.exports = async function (data) {
  const matData = data.read_data_mat[0];
  const cruisesTranslation = data.read_data_cruise;
  const hotelTranslation = data.read_data_hotel;
  const cruisesTranslationDataToUpdate = [];
  const hotelTranslationDataToUpdate = [];
  if (Array.isArray(cruisesTranslation) && cruisesTranslation.length > 0) {
    cruisesTranslation.map((c) => {
      const matDataForTranslation = matData.cruises_translations.find(
        (m) => m.translations_id === c.translations_id,
      );

      if (matDataForTranslation) {
        cruisesTranslationDataToUpdate.push({
          id: c.id,
          mobility_advice_text: matDataForTranslation.cruises_mobility_advice,
        });
      }
    });
  }
  if (Array.isArray(hotelTranslation) && hotelTranslation.length > 0) {
    hotelTranslation.map((c) => {
      const matDataForTranslation = matData.hotel_translations.find(
        (m) => m.translations_id === c.translations_id,
      );

      if (matDataForTranslation) {
        hotelTranslationDataToUpdate.push({
          id: c.id,
          mobility_advice_text:
            matDataForTranslation.hotel_mobility_advice_text,
        });
      }
    });
  }

  return { cruisesTranslationDataToUpdate, hotelTranslationDataToUpdate };
};

const data = {
  read_data_mat: [
    {
      id: "40ddf499-41f6-4db8-a2c8-85563653afe7",
      hotel_translations: [
        {
          id: 1,
          mobility_advice_text_id: "40ddf499-41f6-4db8-a2c8-85563653afe7",
          translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
          hotel_mobility_advice_text: "654000000",
        },
        {
          id: 2,
          mobility_advice_text_id: "40ddf499-41f6-4db8-a2c8-85563653afe7",
          translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
          hotel_mobility_advice_text: "4145",
        },
        {
          id: 3,
          mobility_advice_text_id: "40ddf499-41f6-4db8-a2c8-85563653afe7",
          translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
          hotel_mobility_advice_text: "57787897",
        },
      ],
      cruises_translations: [
        {
          id: 1,
          mobility_advice_text_id: "40ddf499-41f6-4db8-a2c8-85563653afe7",
          translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
          cruises_mobility_advice: "100001kajsdhjh",
        },
        {
          id: 2,
          mobility_advice_text_id: "40ddf499-41f6-4db8-a2c8-85563653afe7",
          translations_id: "263b1ac9-aa7a-48f4-b472-b816dfa3d921",
          cruises_mobility_advice: "2",
        },
        {
          id: 3,
          mobility_advice_text_id: "40ddf499-41f6-4db8-a2c8-85563653afe7",
          translations_id: "fe5d14c3-0051-47a5-97a3-679e05fa3dc9",
          cruises_mobility_advice: "8d3",
        },
      ],
    },
  ],
  read_data_cruise: [
    {
      id: 1,
      cruises_id: null,
      translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
      reise_abbis: "aa",
      trip_title: "aa",
      bord_languages: "Deutsch",
      bord_languages_additions: "a",
      surcharges: "a",
      services_included: "<p>aa</p>",
      services_not_included: "<p>a</p>",
      onboard_gratuities:
        "Trinkgelder sind bereits im Reisepreis eingeschlossen",
      onboard_gratuities_additions: "a",
      participants_min: "aa",
      participants_max_value: 12,
      important_information: "<p>21</p>",
      good_to_know: "<p>21</p>",
      occupancy_single: " d12",
      deviating_cancelation_terms:
        "Für diese Reise gelten abweichende Stornogebühren",
      deviating_cancelation_terms_additions: "ewe",
      mobility_advice_text: null,
    },
    {
      id: 2,
      cruises_id: "004b7609-f3b4-4e8e-94a9-f276f0bc20fd",
      translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
      reise_abbis: null,
      trip_title: null,
      bord_languages: null,
      bord_languages_additions: null,
      surcharges: null,
      services_included: null,
      services_not_included: "<p>ss</p>",
      onboard_gratuities: null,
      onboard_gratuities_additions: null,
      participants_min: null,
      participants_max_value: null,
      important_information: null,
      good_to_know: null,
      occupancy_single: null,
      deviating_cancelation_terms: "Keine",
      deviating_cancelation_terms_additions: null,
      mobility_advice_text: null,
    },
    {
      id: 3,
      cruises_id: "491ecd67-4344-42dd-8d89-650e2e9fe7b5",
      translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
      reise_abbis: null,
      trip_title: null,
      bord_languages: null,
      bord_languages_additions: null,
      surcharges: null,
      services_included: null,
      services_not_included: null,
      onboard_gratuities: "Trinkgelder werden nicht erwartet",
      onboard_gratuities_additions: null,
      participants_min: null,
      participants_max_value: null,
      important_information: null,
      good_to_know: null,
      occupancy_single: null,
      deviating_cancelation_terms:
        "Für diese Reise gelten abweichende Stornogebühren",
      deviating_cancelation_terms_additions: null,
      mobility_advice_text: null,
    },
  ],
  read_data_hotel: [
    {
      id: 1,
      hotels_id: "d4ac7522-daa6-4207-b721-91d553172f2d",
      translations_id: "a66beb5e-af3c-4e47-9c7a-101bd5be1a2a",
      services_included: "1",
      services_not_included: "2",
      service_highlights: null,
      minimum_stay_additions: null,
      deviating_cancelation_terms: null,
      children_policy: null,
      children_free_age: null,
      children_free_number: null,
      important_information: null,
      mobility_advice_text: null,
      price_infos: null,
    },
  ],
};
