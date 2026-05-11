export const hotelsProduct = {
  name: "hotels",
  sql: {
    table: "hotels",
    mappingParent: "hotels",
    idColumn: "oid",
    externalIdField: "object_id",
    overviewQuery: `
      SELECT oid AS travel_id, language,
             field_41_1 AS name,
             field_1031_1 AS country,
             field_28_1 AS city,
             field_1032_1 AS region
      FROM hotels
      WHERE language IN (?)
      ORDER BY oid, language
    `,
  },
  directus: {
    collection: "hotels",
    translationCollections: [
      {
        alias: "hotel_descriptions_translations",
        collection: "hotels_translations",
        mapper: "mapHotelTranslation",
      },
    ],
  },
  relationLookups: [
    { targetField: "country", collection: "countries", lookupField: "name" },
    { targetField: "place", collection: "places", lookupField: "name" },
  ],
  languages: ["D", "GB", "NL", "CH"],
};
