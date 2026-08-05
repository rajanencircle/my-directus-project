import { DETAIL_FIELDS } from "./hotels.fields.js";

export const ROOT_COLLECTION = "hotels";

// Derived from DETAIL_FIELDS rather than hand-copied, so this can never drift out of sync
// with the field list hotel.transformer.js was written against. Top-level scalar fields
// (no dot) are covered by the "*" selector in buildDetailFields instead of being
// enumerated — relation paths (containing a dot) stay explicit and bounded exactly as
// they were in DETAIL_FIELDS.
export const DETAIL_RELATIONS = DETAIL_FIELDS.filter((field) => field.includes("."));
