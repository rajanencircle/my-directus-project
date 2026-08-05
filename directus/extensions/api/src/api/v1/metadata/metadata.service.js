import { ISO_TO_LOCALE } from "../../../maps/language-code.map.js";
import { DEFAULT_PRIMARIX_STATUS } from "../../shared/constants.js";

const FIELD_DICTIONARY_COLLECTION = "field_dictionary";

// The API-facing product-type collection names (used by /metadata/labels' `collection`
// param and /metadata/product-types) don't all map 1:1 to Directus collection names —
// rental_cars/campers both live in the single `vehicles` Directus collection.
const LABEL_COLLECTION_TO_DIRECTUS = {
  hotels: "hotels",
  cruises: "cruises",
  excursions: "excursions",
  tours: "tours",
  rental_cars: "vehicles",
  campers: "vehicles",
};

const FIELD_MAP_FIELDS = [
  "target_collection",
  "field_name",
  "data_type",
  "interface",
  "api_field_name",
  "audience",
  "status",
  "since_version",
  "label_de",
  "label_en",
  "label_nl",
  "tab",
  "section",
  "transform_note",
  "primarix_sources",
];

// `audience` is stored as a CSV/array on each row (e.g. ["public","backoffice"]) since a
// field can be relevant to more than one audience. Rows tagged ONLY "internal" (or with no
// audience at all) are never exposed, per the contract's field-map description. Rows with
// a mix are exposed once, reporting the most-public audience they carry.
function resolveExposedAudience(audience) {
  const list = Array.isArray(audience) ? audience : (audience ? [audience] : []);
  if (list.includes("public")) return "public";
  if (list.includes("backoffice")) return "backoffice";
  return null;
}

// `status` isn't populated in the underlying data today — derived instead from whether
// the row has a mapped api_field_name and/or legacy primarix_sources, per the contract's
// own description of what `new`/`outdated` rows look like. Falls back to "active" for a
// normally-mapped row, since "renamed" isn't derivable from the data available. Any
// stored value outside the contract enum is ignored so the response always conforms.
const FIELD_MAP_STATUSES = ["active", "renamed", "new", "outdated"];

function resolveStatus(row) {
  if (row.status && FIELD_MAP_STATUSES.includes(row.status)) return row.status;
  const hasSources = Array.isArray(row.primarix_sources) && row.primarix_sources.length > 0;
  if (!row.api_field_name) return "outdated";
  if (!hasSources) return "new";
  return "active";
}

export async function getFieldMap({ collection, status, shape = "flat" }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const dictionaryService = new ItemsService(FIELD_DICTIONARY_COLLECTION, { knex: database, schema });

  const filter = collection ? { target_collection: { _eq: collection } } : {};

  const rows = await dictionaryService.readByQuery({
    fields: FIELD_MAP_FIELDS,
    filter,
    limit: -1,
  });

  const exposed = rows
    .map((row) => ({ row, audience: resolveExposedAudience(row.audience) }))
    .filter(({ audience }) => audience !== null)
    .map(({ row, audience }) => ({ row, audience, resolvedStatus: resolveStatus(row) }))
    .filter(({ resolvedStatus }) => !status || resolvedStatus === status);

  if (shape === "nested") {
    const data = exposed.map(({ row, audience, resolvedStatus }) => ({
      api_field_name: row.api_field_name ?? null,
      field_name: row.field_name ?? null,
      target_collection: row.target_collection ?? null,
      data_type: row.data_type ?? null,
      interface: row.interface ?? null,
      status: resolvedStatus,
      audience,
      since_version: row.since_version ?? null,
      label_de: row.label_de ?? null,
      label_en: row.label_en ?? null,
      label_nl: row.label_nl ?? null,
      tab: row.tab ?? null,
      section: row.section ?? null,
      transform_note: row.transform_note ?? null,
      primarix_sources: (row.primarix_sources ?? []).map((s) => ({
        system: s.system ?? null,
        table: s.table ?? null,
        fieldid: s.fieldid ?? null,
        field_name: s.field_name ?? null,
        label_de: s.label_de ?? null,
      })),
    }));
    return { data, total: data.length };
  }

  // flat: one row per legacy source; fields with no primarix_sources (status=new) get a
  // single row with null legacy_* columns.
  const data = [];
  for (const { row, audience, resolvedStatus } of exposed) {
    const sources = Array.isArray(row.primarix_sources) && row.primarix_sources.length > 0
      ? row.primarix_sources
      : [null];
    for (const source of sources) {
      data.push({
        system: source?.system ?? null,
        legacy_table: source?.table ?? null,
        legacy_fieldid: source?.fieldid ?? null,
        legacy_field_name: source?.field_name ?? null,
        legacy_label_de: source?.label_de ?? null,
        target_collection: row.target_collection ?? null,
        api_field_name: row.api_field_name ?? null,
        data_type: row.data_type ?? null,
        status: resolvedStatus,
        audience,
        since_version: row.since_version ?? null,
        label_de: row.label_de ?? null,
        label_en: row.label_en ?? null,
        label_nl: row.label_nl ?? null,
        transform_note: row.transform_note ?? null,
      });
    }
  }

  return { data, total: data.length };
}

export async function getLabels({ lang, collection }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { FieldsService } = services;
  const fieldsService = new FieldsService({ knex: database, schema });

  const locale = ISO_TO_LOCALE[lang];
  const collections = collection
    ? [collection]
    : Object.keys(LABEL_COLLECTION_TO_DIRECTUS);

  const data = {};
  for (let i = 0; i < collections.length; i++) {
    const apiCollectionName = collections[i];
    const directusCollectionName = LABEL_COLLECTION_TO_DIRECTUS[apiCollectionName] ?? apiCollectionName;
    if (data[apiCollectionName]) continue;

    const fields = await fieldsService.readAll(directusCollectionName);
    const labels = {};
    for (const field of fields ?? []) {
      const translations = field.meta?.translations ?? [];
      const match = translations.find((t) => t.language === locale);
      if (match?.translation) {
        labels[field.field] = match.translation;
      }
    }
    data[apiCollectionName] = labels;
  }

  return { data };
}

export async function getProductTypesCatalog({ services, database, getSchema }, { publishing_status } = {}) {
  const schema = await getSchema();
  const { ItemsService } = services;

  const collections = [
    { product_type: 'hotel', collection: 'hotels', list_url: '/api/v1/hotels', full_url: '/api/v1/hotels/full', detail_url: '/api/v1/hotels/{id}' },
    { product_type: 'tour', collection: 'tours', list_url: '/api/v1/tours', full_url: '/api/v1/tours/full', detail_url: '/api/v1/tours/{id}' },
    { product_type: 'excursion', collection: 'excursions', list_url: '/api/v1/excursions', full_url: '/api/v1/excursions/full', detail_url: '/api/v1/excursions/{id}' },
    { product_type: 'cruise', collection: 'cruises', list_url: '/api/v1/cruises', full_url: '/api/v1/cruises/full', detail_url: '/api/v1/cruises/{id}' },
    { product_type: 'rental_car', collection: 'vehicles', filter: { rental_type: 'car' }, list_url: '/api/v1/rental_cars', full_url: '/api/v1/rental_cars/full', detail_url: '/api/v1/rental_cars/{id}' },
    { product_type: 'camper', collection: 'vehicles', filter: { rental_type: 'camper' }, list_url: '/api/v1/campers', full_url: '/api/v1/campers/full', detail_url: '/api/v1/campers/{id}' },
  ];

  const statusFilter = publishing_status === 'all' ? null : (publishing_status ?? DEFAULT_PRIMARIX_STATUS);
  const counts = await Promise.all(
    collections.map((item) => {
      const service = new ItemsService(item.collection, { knex: database, schema });
      let filter = statusFilter ? { status_primarix: { _eq: statusFilter } } : {};
      if (item.filter) {
        filter = { _and: [filter, item.filter] };
      }
      return service.readByQuery({ aggregate: { count: ['*'] }, filter });
    }),
  );

  return collections.map(({ product_type, list_url, full_url, detail_url }, i) => ({
    product_type,
    total: parseInt(counts[i][0]?.count ?? '0', 10),
    list_url,
    full_url,
    detail_url,
  }));
}
