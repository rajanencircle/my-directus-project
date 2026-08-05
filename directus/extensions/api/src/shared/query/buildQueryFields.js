import { filterValidFieldPaths } from './validateFieldPaths.js';

// List endpoints keep an explicit, narrow field list — no wildcard, no validation
// overhead needed since the list is short and hand-maintained (see architecture review
// "Keep These Decisions": explicit list queries stay explicit).
export function buildListFields(listFields) {
  return [...listFields];
}

// Detail endpoints: top-level "*" (always safe — Directus only ever returns fields that
// exist) plus a bounded, explicit set of relation paths, each validated against the live
// schema before being sent to readByQuery. A relation path that no longer resolves
// (renamed/removed field or collection) is silently dropped instead of being sent —
// this is what turns "whole request throws" into "that relation comes back absent",
// converting a 500 into a null/missing value further down the pipeline.
export function buildDetailFields({ schema, rootCollection, top = '*', relations = [] }) {
  const validRelations = filterValidFieldPaths(schema, rootCollection, relations);
  return [top, ...validRelations];
}
