import { LIST_FIELDS } from "./excursions.fields.js";
import { SURCHARGE_FIELDS } from "./excursions.fields.js";
import { ROOT_COLLECTION, DETAIL_RELATIONS } from "./excursions.query-config.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
} from "./excursions.filters.js";
import { enrichExchangeRates } from "../../../utils/ratesResolver.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";
import { buildDetailFields } from "../../../shared/query/buildQueryFields.js";
import { computeUpdatedAtMax } from "../../../utils/delta.js";

const COLLECTION = "excursions";
const SURCHARGES_COLLECTION = "excursions_surcharges";

function pickListName(translations) {
  if (!translations?.length) return null;
  const preferred = translations.find((t) => t.translations_id?.code === "de-DE") ?? translations[0];
  return preferred?.name_excursion ?? null;
}

export async function listSlimExcursions(
  { page, limit, offset, publishing_status },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const excursionsService = new ItemsService(COLLECTION, { knex: database, schema });

  const filter = buildListFilter({ publishing_status });

  const [rawItems, countResult] = await Promise.all([
    excursionsService.readByQuery({
      fields: LIST_FIELDS,
      sort: buildSort(),
      limit,
      offset,
      filter,
    }),
    excursionsService.readByQuery({
      aggregate: { count: ["*"] },
      filter,
    }),
  ]);

  const total = parseInt(countResult[0]?.count ?? "0", 10);
  const items = rawItems.map(({ descriptions_translations, source_updated_at, ...rest }) => ({
    ...rest,
    name: pickListName(descriptions_translations),
  }));

  const updatedAtMax = computeUpdatedAtMax(rawItems);
  return { data: items, total, page, limit, updatedAtMax };
}

export async function listFullExcursions(
  { page, limit, offset, publishing_status, updated_after },
  context,
) {
  const { services, database, getSchema } = context;
  const schema = await getSchema();
  const { ItemsService } = services;
  const excursionsService = new ItemsService(COLLECTION, { knex: database, schema });

  const listFilter = buildListFilter({ publishing_status });
  const deltaFilter = buildUpdatedAfterFilter(updated_after);
  const filter = deltaFilter ? { _and: [listFilter, deltaFilter] } : listFilter;

  const [rawItems, countResult] = await Promise.all([
    excursionsService.readByQuery({
      fields: LIST_FIELDS,
      sort: buildSort(),
      limit,
      offset,
      filter,
    }),
    excursionsService.readByQuery({
      aggregate: { count: ["*"] },
      filter,
    }),
  ]);

  const total = parseInt(countResult[0]?.count ?? "0", 10);
  const updatedAtMax = computeUpdatedAtMax(rawItems);

  const data = [];
  for (const item of rawItems) {
    try {
      const detail = await getExcursionDetails({ id: item.id.toString() }, context);
      data.push(detail);
    } catch (e) {
      console.error(`Failed to fetch full detail for excursion ${item.id}`, e);
    }
  }

  return { data, total, page, limit, updatedAtMax };
}

export async function getExcursionDetails({ id }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const excursionsService = new ItemsService(COLLECTION, { knex: database, schema });
  const surchargesService = new ItemsService(SURCHARGES_COLLECTION, { knex: database, schema });

  const filter = buildIdFilter(id);

  const items = await excursionsService.readByQuery({
    fields: buildDetailFields({ schema, rootCollection: ROOT_COLLECTION, relations: DETAIL_RELATIONS }),
    filter,
    limit: 1,
  });

  const excursion = items?.[0] ?? null;
  if (!excursion) {
    throw new AppError(`Excursion not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  const today = new Date().toISOString().slice(0, 10);
  const dateRangeFilter = [
    { _or: [{ publish_start: { _null: true } }, { publish_start: { _lte: today } }] },
    { _or: [{ publish_end: { _null: true } }, { publish_end: { _gte: today } }] },
  ];

  const surcharges = await surchargesService.readByQuery({
    fields: SURCHARGE_FIELDS,
    filter: {
      _and: [
        { excursion_id: { _eq: excursion.id } },
        { status: { _eq: "published" } },
        ...dateRangeFilter,
      ],
    },
    limit: -1,
  });

  const excursionData = { ...excursion, surcharges };
  const enrichedExcursion = await enrichExchangeRates(excursionData, database);
  return enrichedExcursion;
}
