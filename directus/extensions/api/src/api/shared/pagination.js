/* Parses and clamps pagination parameters from a request query. The `page` starts at 1,
 * `limit` is bounded to the configured maximum, and the resulting SQL offset is derived
 * as (page - 1) * limit. */
export function parsePagination(
  query,
  { defaultLimit = 50, maxLimit = 200 } = {},
) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10));
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(query.limit ?? String(defaultLimit), 10)),
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
