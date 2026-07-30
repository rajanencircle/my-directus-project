import { DETAIL_FIELDS, SURCHARGE_FIELDS } from "./tours.fields.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
} from "./tours.filters.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";

const COLLECTION = "tours";
const SURCHARGES_COLLECTION = "tours_surcharges";

// tours has no top-level `name` field — the display name only exists per-language
// on descriptions_translations.name_tour. Prefers de-DE, falls back to the first
// translation row present (list endpoint has no `lang` query param today).
function pickListName(translations) {
  if (!translations?.length) return null;
  const preferred = translations.find((t) => t.translations_id?.code === "de-DE") ?? translations[0];
  return preferred?.name_tour ?? null;
}

export async function listTours(
  { page, limit, offset, search, country, state, season, sort, updated_after, status_primarix },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const toursService = new ItemsService(COLLECTION, { knex: database, schema });

  const listFilter = buildListFilter({ search, country, state, season, status_primarix });
  const deltaFilter = buildUpdatedAfterFilter(updated_after);
  const filter = deltaFilter ? { _and: [listFilter, deltaFilter] } : listFilter;

  const [rawItems, countResult] = await Promise.all([
    toursService.readByQuery({
      fields: ['id', 'object_id', 'date_updated', 'source_updated_at', 'descriptions_translations.translations_id.code', 'descriptions_translations.name_tour'],
      sort: buildSort(sort),
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
  // updated_at_max is derived from source_updated_at (not date_updated) so a client can
  // feed it straight back in as the next updated_after value.
  const updatedAtMax = rawItems.length
    ? rawItems.reduce((max, h) => (h.source_updated_at > max ? h.source_updated_at : max), rawItems[0].source_updated_at)
    : null;

  const items = rawItems.map(({ descriptions_translations, source_updated_at, ...rest }) => ({
    ...rest,
    name: pickListName(descriptions_translations),
  }));

  return { data: items, total, page, limit, updatedAtMax };
}

export async function getTourDetails({ id }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const toursService = new ItemsService(COLLECTION, { knex: database, schema });
  const surchargesService = new ItemsService(SURCHARGES_COLLECTION, { knex: database, schema });

  const filter = buildIdFilter(id);

  const items = await toursService.readByQuery({
    fields: DETAIL_FIELDS,
    filter,
    limit: 1,
  });

  const tour = items?.[0] ?? null;
  if (!tour) {
    throw new AppError(`Tour not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  // Surcharges — fetched separately to avoid Directus nested-translation resolution issues
  // (same pattern as hotels). tours_surcharges has no status/publish window fields, so all
  // rows for the tour are returned.
  const surcharges = await surchargesService.readByQuery({
    fields: SURCHARGE_FIELDS,
    filter: { tours_id: { _eq: tour.id } },
    limit: -1,
  });

  return { ...tour, surcharges };
}
