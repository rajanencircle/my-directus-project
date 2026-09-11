/* Derives DETAIL_RELATIONS from a collection's own DETAIL_FIELDS so it can never drift
 * out of sync with the field list each transformer is written against. Top-level scalar
 * fields (no dot) are covered by the "*" selector in buildDetailFields instead of being
 * enumerated — relation paths (containing a dot) stay explicit and bounded exactly as they
 * appear in DETAIL_FIELDS. */
export function createQueryConfig(rootCollection, detailFields) {
  return {
    ROOT_COLLECTION: rootCollection,
    DETAIL_RELATIONS: detailFields.filter((field) => field.includes(".")),
  };
}
