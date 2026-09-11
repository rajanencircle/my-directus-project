import { buildDetailFields } from "../../shared/query/buildQueryFields.js";
import { enrichExchangeRates } from "../../utils/ratesResolver.js";
import { AppError } from "./AppError.js";
import { HTTP_STATUS } from "./constants.js";
import { buildPublishedStatusClauses, createScopedItemsService } from "./collectionFilters.js";

function detailFields(schema, rootCollection, fieldList) {
  return buildDetailFields({
    schema,
    rootCollection,
    relations: fieldList.filter((f) => f.includes(".")),
  });
}

/*
 * Shared detail fetcher for the tours/excursions/cruises shape: fetch the root row by id
 * (applying the collection's own `buildPublicationDeepFilter` to any nested relations fetched
 * inline as part of that root query — e.g. tours' `categories`, excursions'
 * `categories`/`price_periods`, cruises' `cabin_categories`), then fetch one *separate*
 * sub-collection (surcharges, prices, ...) filtered by the root row's id, merge it onto the
 * root row under `subCollection.resultKey`, and enrich exchange rates.
 * `subCollection.publicationFiltered` is for that separate sub-collection query specifically —
 * only set it when that sub-collection's table carries status/publish_start/publish_end
 * (verified live: tours_surcharges and excursions_surcharges do, cruises_prices does not).
 *
 * Hotels keeps its own hand-written fetch (parent/child room-category split across multiple
 * deep-filtered relations) — that shape doesn't fit this single-sub-collection helper.
 */
export async function fetchProductDetail(
  { id, idFilterMode, partnerId, partnerVisibility },
  { collection, resourceLabel, rootCollection, detailRelations, buildIdFilter, buildPublicationDeepFilter, subCollection },
  { services, database, getSchema },
) {
  const schema = await getSchema();
  const { ItemsService } = services;
  const rootService = createScopedItemsService(services, collection, { knex: database, schema }, {
    partnerId,
    partnerVisibility,
  });
  const subService = new ItemsService(subCollection.name, { knex: database, schema });

  const filter = buildIdFilter(id, idFilterMode);

  const items = await rootService.readByQuery({
    fields: buildDetailFields({ schema, rootCollection, relations: detailRelations }),
    filter,
    limit: 1,
    deep: buildPublicationDeepFilter(),
  });

  const item = items?.[0] ?? null;
  if (!item) {
    throw new AppError(`${resourceLabel} not found: ${id}`, HTTP_STATUS.NOT_FOUND);
  }

  const subFilterClauses = [{ [subCollection.idField]: { _eq: item.id } }];
  if (subCollection.publicationFiltered) {
    subFilterClauses.push(...buildPublishedStatusClauses());
  }

  const subItems = await subService.readByQuery({
    fields: detailFields(schema, subCollection.name, subCollection.fields),
    filter: subFilterClauses.length > 1 ? { _and: subFilterClauses } : subFilterClauses[0],
    limit: -1,
  });

  const data = { ...item, [subCollection.resultKey]: subItems };
  return enrichExchangeRates(data, database);
}
