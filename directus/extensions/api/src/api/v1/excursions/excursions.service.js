import { DETAIL_FIELDS, SURCHARGE_FIELDS } from "./excursions.fields.js";
import {
  buildListFilter,
  buildSort,
  buildIdFilter,
  buildUpdatedAfterFilter,
} from "./excursions.filters.js";
import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";

const COLLECTION = "excursions";
const SURCHARGES_COLLECTION = "excursions_surcharges";

// excursions has no top-level `name` field — the display name only exists per-language
// on descriptions_translations.name_excursion. Prefers de-DE, falls back to the first
// translation row present (list endpoint has no `lang` query param today).
function pickListName(translations) {
  if (!translations?.length) return null;
  const preferred = translations.find((t) => t.translations_id?.code === "de-DE") ?? translations[0];
  return preferred?.name_excursion ?? null;
}

export async function listExcursions(
  { page, limit, offset, search, country, region, state, season, destination, sort, updated_after, status },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const excursionsService = new ItemsService(COLLECTION, { knex: database, schema });

  const listFilter = buildListFilter({ search, country, region, state, season, destination, status });
  const deltaFilter = buildUpdatedAfterFilter(updated_after);
  const filter = deltaFilter ? { _and: [listFilter, deltaFilter] } : listFilter;

  const [rawItems, countResult] = await Promise.all([
    excursionsService.readByQuery({
      fields: ['id', 'object_id', 'date_updated', 'source_updated_at', 'descriptions_translations.translations_id.code', 'descriptions_translations.name_excursion'],
      sort: buildSort(sort),
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

export async function getExcursionDetails({ id }, { services, database, getSchema }) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const excursionsService = new ItemsService(COLLECTION, { knex: database, schema });
  const surchargesService = new ItemsService(SURCHARGES_COLLECTION, { knex: database, schema });

  const filter = buildIdFilter(id);

  const items = await excursionsService.readByQuery({
    fields: DETAIL_FIELDS,
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

  // Surcharges — fetched separately to avoid Directus nested-translation resolution issues
  // (same pattern as hotels). excursions_surcharges DOES have status/publish window fields.
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

  return { ...excursion, surcharges };
}
