// Every collection's query-config.js derived DETAIL_RELATIONS from its own DETAIL_FIELDS
// the same way — rather than hand-copied, so it can never drift out of sync with the field
// list each transformer was written against. Top-level scalar fields (no dot) are covered
// by the "*" selector in buildDetailFields instead of being enumerated — relation paths
// (containing a dot) stay explicit and bounded exactly as they were in DETAIL_FIELDS.
export function createQueryConfig(rootCollection, detailFields) {
  return {
    ROOT_COLLECTION: rootCollection,
    DETAIL_RELATIONS: detailFields.filter((field) => field.includes(".")),
  };
}
