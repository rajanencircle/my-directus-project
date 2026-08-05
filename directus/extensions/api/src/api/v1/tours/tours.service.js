import { LIST_FIELDS } from "./tours.fields.js";
import { SURCHARGE_FIELDS } from "./tours.fields.js";
import { ROOT_COLLECTION, DETAIL_RELATIONS } from "./tours.query-config.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
} from "./tours.filters.js";
import { enrichExchangeRates } from "../../../utils/ratesResolver.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";
import { buildDetailFields } from "../../../shared/query/buildQueryFields.js";
import { computeUpdatedAtMax } from "../../../utils/delta.js";

const COLLECTION = "tours";
const SURCHARGES_COLLECTION = "tours_surcharges";

function pickListName(translations) {
  if (!translations?.length) return null;
  const preferred = translations.find((t) => t.translations_id?.code === "de-DE") ?? translations[0];
  return preferred?.name_tour ?? null;
}

export async function listSlimTours(
  { page, limit, offset, publishing_status },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const toursService = new ItemsService(COLLECTION, { knex: database, schema });

  const filter = buildListFilter({ publishing_status });

  const [rawItems, countResult] = await Promise.all([
    toursService.readByQuery({
      fields: LIST_FIELDS,
      sort: buildSort(),
      limit,
      offset,
      filter,
    }),
    toursService.readByQuery({
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

export async function listFullTours(
  { page, limit, offset, publishing_status, updated_after },
  context,
) {
  const { services, database, getSchema } = context;
  const schema = await getSchema();
  const { ItemsService } = services;
  const toursService = new ItemsService(COLLECTION, { knex: database, schema });

  const listFilter = buildListFilter({ publishing_status });
  const deltaFilter = buildUpdatedAfterFilter(updated_after);
  const filter = deltaFilter ? { _and: [listFilter, deltaFilter] } : listFilter;

  const [rawItems, countResult] = await Promise.all([
    toursService.readByQuery({
      fields: LIST_FIELDS,
      sort: buildSort(),
      limit,
      offset,
      filter,
    }),
    toursService.readByQuery({
      aggregate: { count: ["*"] },
      filter,
    }),
  ]);

  const total = parseInt(countResult[0]?.count ?? "0", 10);
  const updatedAtMax = computeUpdatedAtMax(rawItems);

  const data = [];
  for (const item of rawItems) {
    try {
      const detail = await getTourDetails({ id: item.id.toString() }, context);
      data.push(detail);
    } catch (e) {
      console.error(`Failed to fetch full detail for tour ${item.id}`, e);
    }
  }

  return { data, total, page, limit, updatedAtMax };
}

export async function getTourDetails({ id }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const toursService = new ItemsService(COLLECTION, { knex: database, schema });
  const surchargesService = new ItemsService(SURCHARGES_COLLECTION, { knex: database, schema });

  const filter = buildIdFilter(id);

  const items = await toursService.readByQuery({
    fields: buildDetailFields({ schema, rootCollection: ROOT_COLLECTION, relations: DETAIL_RELATIONS }),
    filter,
    limit: 1,
  });

  const tour = items?.[0] ?? null;
  if (!tour) {
    throw new AppError(`Tour not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  const surcharges = await surchargesService.readByQuery({
    fields: SURCHARGE_FIELDS,
    filter: { tours_id: { _eq: tour.id } },
    limit: -1,
  });

  const tourData = { ...tour, surcharges };
  const enrichedTour = await enrichExchangeRates(tourData, database);
  return enrichedTour;
}
