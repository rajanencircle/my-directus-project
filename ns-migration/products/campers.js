export const campersProduct = {
  name: "campers",
  sql: {
    table: "campers",
    mappingParent: "campers",
    idColumn: "oid",
    externalIdField: "object_id",
    overviewQuery: `
      SELECT oid AS travel_id, language,
             name,
             country,
             city,
             region
      FROM campers
      WHERE language IN (?)
      ORDER BY oid, language
    `,
  },
  directus: {
    collection: "campers",
    translationCollections: [
      {
        alias: null,
        collection: "campers_translations",
        mapper: "mapCamperTranslation",
      },
    ],
  },
  relationLookups: [
    { targetField: "country", collection: "countries", lookupField: "name" },
    { targetField: "place", collection: "places", lookupField: "name" },
  ],
  languages: ["D", "GB", "NL", "CH"],
};
