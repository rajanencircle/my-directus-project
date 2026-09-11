import { buildDetailFields } from "../../shared/query/buildQueryFields.js";
import { filterValidFieldPaths } from "../../shared/query/validateFieldPaths.js";
import { computeUpdatedAtMax } from "../../utils/delta.js";
import { createScopedItemsService } from "./collectionFilters.js";

/**
 * Provides a standardized shape for every collection's `listSlim` and `listFull` methods.
 * Abstracts the boilerplate for schema/ItemsService setup, parallelized list/count retrieval,
 * delta-filter composition, and the per-ID detail-refetch loop in `listFull`.
 * 
 * Note: Detail retrieval (`getDetails`) remains explicitly hand-written per collection to accommodate
 * domain-specific joins, deep filtering (e.g., hotels), and complex data fan-outs (e.g., vehicles).
 *
 * `listFields` is run through `filterValidFieldPaths` before every query (same mechanism
 * `buildDetailFields` uses for detail endpoints): a renamed/removed field degrades to
 * "silently omitted" instead of Directus throwing a raw ForbiddenException that fails the
 * whole list/full request with a bare, unhelpful 403 (see the /products slim-list bug).
 */
export function createCollectionService({
  collection,
  resourceLabel,
  listFields,
  buildListFilter,
  buildSort,
  buildUpdatedAfterFilter,
  getDetails,
}) {
  async function listSlim(
    { page, limit, offset, publishing_status, apiUser },
    { services, database, getSchema },
  ) {
    const schema = await getSchema();
    const itemsService = createScopedItemsService(services, collection, { knex: database, schema }, {
      partnerId: apiUser?.partnerId,
      partnerVisibility: apiUser?.partnerVisibility,
    });

    const filter = buildListFilter({
      publishing_status,
      partnerId: apiUser?.partnerId,
      partnerVisibility: apiUser?.partnerVisibility,
    });

    const [rawItems, countResult] = await Promise.all([
      itemsService.readByQuery({
        fields: filterValidFieldPaths(schema, collection, listFields),
        sort: buildSort(),
        limit,
        offset,
        filter,
      }),
      itemsService.readByQuery({
        aggregate: { count: ["*"] },
        filter,
      }),
    ]);

    const total = parseInt(countResult[0]?.count ?? "0", 10);
    const items = rawItems;

    const updatedAtMax = computeUpdatedAtMax(rawItems);
    return { data: items, total, page, limit, updatedAtMax };
  }

  async function listFull(
    { page, limit, offset, publishing_status, updated_after, apiUser },
    context,
  ) {
    const { services, database, getSchema } = context;
    const schema = await getSchema();
    const itemsService = createScopedItemsService(services, collection, { knex: database, schema }, {
      partnerId: apiUser?.partnerId,
      partnerVisibility: apiUser?.partnerVisibility,
    });

    const listFilter = buildListFilter({
      publishing_status,
      partnerId: apiUser?.partnerId,
      partnerVisibility: apiUser?.partnerVisibility,
    });
    const deltaFilter = buildUpdatedAfterFilter(updated_after);
    const filter = deltaFilter ? { _and: [listFilter, deltaFilter] } : listFilter;

    const [rawItems, countResult] = await Promise.all([
      itemsService.readByQuery({
        fields: filterValidFieldPaths(schema, collection, listFields),
        sort: buildSort(),
        limit,
        offset,
        filter,
      }),
      itemsService.readByQuery({
        aggregate: { count: ["*"] },
        filter,
      }),
    ]);

    const total = parseInt(countResult[0]?.count ?? "0", 10);
    const updatedAtMax = computeUpdatedAtMax(rawItems);

    /*
     * Detail Retrieval and Error Boundary
     * 
     * Leverages the shared `getDetails` method per ID to guarantee identical query construction.
     * Executed concurrently via `Promise.allSettled` to optimize performance (Phase 3 refactor).
     * 
     * In the event of a per-item failure, the erroneous record is excluded from the final `data` payload
     * and logged as a structured warning. This prevents a single malformed record from triggering a 500 
     * response for the entire page, safeguarding `/full` delta-sync consumers.
     * 
     * Note: Consequently, `meta.returned` may read lower than `limit` even if it is not the final page.
     * Monitor the structured warning logs, rather than the payload length, to identify dropped records.
     */
    const results = await Promise.allSettled(
      rawItems.map((item) =>
        getDetails(
          {
            id: item.id.toString(),
            partnerId: apiUser?.partnerId,
            partnerVisibility: apiUser?.partnerVisibility,
          },
          context,
        ),
      ),
    );
    const data = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled") {
        data.push(result.value);
      } else {
        console.error(
          JSON.stringify({
            level: "warn",
            event: "listFull.detailFetchFailed",
            resource: resourceLabel,
            collection,
            id: rawItems[i].id,
            error: result.reason?.message ?? String(result.reason),
          }),
        );
      }
    }

    return { data, total, page, limit, updatedAtMax };
  }

  /*
   * Validates each sub-collection's field list against the active schema, analogous to `DETAIL_RELATIONS` 
   * for root queries. This ensures that a missing or renamed field gracefully degrades to 'omitted' 
   * rather than triggering a hard 403 authorization error for the entire request.
   */
  function detailFields(schema, rootCollection, fieldList) {
    return buildDetailFields({
      schema,
      rootCollection,
      relations: fieldList.filter((f) => f.includes(".")),
    });
  }

  return { listSlim, listFull, detailFields };
}
