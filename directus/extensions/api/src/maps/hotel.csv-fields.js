// Fields in the hotels schema that are stored as CSV strings and must be split into arrays.
// Schema inspection (2026-05-18) found no CSV-typed fields in the hotels collection.
// All multi-value fields use JSON or proper M2M relations.
export const HOTEL_CSV_FIELDS = [];
