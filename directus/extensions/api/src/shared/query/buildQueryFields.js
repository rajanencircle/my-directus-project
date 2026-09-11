import { filterValidFieldPaths } from './validateFieldPaths.js';

/**
 * @description Constructs robust field queries for detail endpoints.
 *
 * Safely combines the top-level wildcard (`*`) with a bounded, explicitly defined set of
 * relation paths. Every relation path is strictly validated against the live Directus schema
 * before the query runs; any path that fails resolution (e.g. due to a renamed or dropped
 * field/collection) is silently omitted from the query payload.
 *
 * This resilience mechanism is used when building queries to Directus, guaranteeing that
 * isolated schema drift (a renamed/removed field) degrades gracefully to a missing value
 * rather than Directus rejecting the whole query with a raw ForbiddenException (403) —
 * see createCollectionService.js's and products.service.js's comments for the incident
 * this was written to fix (the /products slim-list 403 bug).
 *
 * @param {Object} params - The build parameters.
 * @param {Object} params.schema - The live Directus schema object.
 * @param {string} params.rootCollection - The root collection name.
 * @param {string} [params.top='*'] - The top-level field selector.
 * @param {string[]} [params.relations=[]] - The explicit array of relational field paths.
 * @returns {string[]} The validated array of query fields.
 */
export function buildDetailFields({ schema, rootCollection, top = '*', relations = [] }) {
  const validRelations = filterValidFieldPaths(schema, rootCollection, relations);
  return [top, ...validRelations];
}
