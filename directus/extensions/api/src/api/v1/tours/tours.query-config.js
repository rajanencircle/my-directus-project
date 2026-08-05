import { DETAIL_FIELDS } from "./tours.fields.js";

export const ROOT_COLLECTION = "tours";

// Derived from DETAIL_FIELDS rather than hand-copied, so this can never drift out of sync
// with the field list tour.transformer.js was written against. Top-level scalar fields
// (no dot) are covered by the "*" selector in buildDetailFields instead of being
// enumerated — relation paths (containing a dot) stay explicit and bounded exactly as
// they were in DETAIL_FIELDS.
export const DETAIL_RELATIONS = DETAIL_FIELDS.filter((field) => field.includes("."));
