import { filterValidFieldPaths } from './validateFieldPaths.js';

/**
 * Constructs robust field queries for detail endpoints.
 * 
 * Safely aggregates the top-level wildcard (`*`) with a bounded, explicitly defined set of relation paths.
 * Every relation path is strictly validated against the live Directus schema prior to query execution.
 * 
 * Note: If a relation path fails resolution (e.g., due to a renamed or dropped field/collection), 
 * it is silently omitted from the query payload. This resilience mechanism guarantees that 
 * isolated schema drifts gracefully degrade to null/missing values rather than triggering 
 * catastrophic 500 errors across the entire request.
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
