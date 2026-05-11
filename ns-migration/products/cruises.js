export const cruisesProduct = {
  name: "cruises",
  sql: {
    table: "cruises",
    mappingParent: "cruises",
    idColumn: "oid",
    externalIdField: "object_id",
    overviewQuery: `
      SELECT oid AS travel_id, language,
             name,
             country,
             city,
             region
      FROM cruises
      WHERE language IN (?)
      ORDER BY oid, language
    `,
  },
  directus: {
    collection: "cruises",
    translationCollections: [
      {
        alias: null,
        collection: "cruises_translations",
        mapper: "mapCruiseTranslation",
      },
    ],
  },
  relationLookups: [
    { targetField: "countries", collection: "countries", lookupField: "name" },
  ],
  languages: ["D", "GB", "NL", "CH"],
};
