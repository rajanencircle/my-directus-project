import { LIST_FIELDS } from "./cruises.fields.js";
import { CRUISES_PRICES_FIELDS } from "./cruises.fields.js";
import { ROOT_COLLECTION, DETAIL_RELATIONS } from "./cruises.query-config.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
} from "./cruises.filters.js";
import { enrichExchangeRates } from "../../../utils/ratesResolver.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";
import { buildDetailFields } from "../../../shared/query/buildQueryFields.js";
import { computeUpdatedAtMax } from "../../../utils/delta.js";

const COLLECTION = "cruises";
const PRICES_COLLECTION = "cruises_prices";

export async function listSlimCruises(
  { page, limit, offset, publishing_status },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const cruisesService = new ItemsService(COLLECTION, { knex: database, schema });

  const filter = buildListFilter({ publishing_status });

  const [rawItems, countResult] = await Promise.all([
    cruisesService.readByQuery({
      fields: LIST_FIELDS,
      sort: buildSort(),
      limit,
      offset,
      filter,
    }),
    cruisesService.readByQuery({
      aggregate: { count: ["*"] },
      filter,
    }),
  ]);

  const total = parseInt(countResult[0]?.count ?? "0", 10);
  const items = rawItems.map(({ source_updated_at, ...rest }) => rest);

  const updatedAtMax = computeUpdatedAtMax(rawItems);
  return { data: items, total, page, limit, updatedAtMax };
}

export async function listFullCruises(
  { page, limit, offset, publishing_status, updated_after },
  context,
) {
  const { services, database, getSchema } = context;
  const schema = await getSchema();
  const { ItemsService } = services;
  const cruisesService = new ItemsService(COLLECTION, { knex: database, schema });

  const listFilter = buildListFilter({ publishing_status });
  const deltaFilter = buildUpdatedAfterFilter(updated_after);
  const filter = deltaFilter ? { _and: [listFilter, deltaFilter] } : listFilter;

  const [rawItems, countResult] = await Promise.all([
    cruisesService.readByQuery({
      fields: LIST_FIELDS,
      sort: buildSort(),
      limit,
      offset,
      filter,
    }),
    cruisesService.readByQuery({
      aggregate: { count: ["*"] },
      filter,
    }),
  ]);

  const total = parseInt(countResult[0]?.count ?? "0", 10);
  const updatedAtMax = computeUpdatedAtMax(rawItems);

  const data = [];
  for (const item of rawItems) {
    try {
      const detail = await getCruiseDetails({ id: item.id.toString() }, context);
      data.push(detail);
    } catch (e) {
      console.error(`Failed to fetch full detail for cruise ${item.id}`, e);
    }
  }

  return { data, total, page, limit, updatedAtMax };
}

export async function getCruiseDetails({ id }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const cruisesService = new ItemsService(COLLECTION, { knex: database, schema });
  const pricesService = new ItemsService(PRICES_COLLECTION, { knex: database, schema });

  const filter = buildIdFilter(id);

  const items = await cruisesService.readByQuery({
    fields: buildDetailFields({ schema, rootCollection: ROOT_COLLECTION, relations: DETAIL_RELATIONS }),
    filter,
    limit: 1,
  });

  const cruise = items?.[0] ?? null;
  if (!cruise) {
    throw new AppError(`Cruise not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  const prices = await pricesService.readByQuery({
    fields: CRUISES_PRICES_FIELDS,
    filter: { cruises_id: { _eq: cruise.id } },
    limit: -1,
  });

  const cruiseData = { ...cruise, prices };
  const enrichedCruise = await enrichExchangeRates(cruiseData, database);
  return enrichedCruise;
}
