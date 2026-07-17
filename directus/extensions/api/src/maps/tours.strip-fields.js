// Top-level fields on the shaped tour object that must never appear in v1 responses.
// px_source_id IS fetched (used for id lookups) and must be stripped here before the response is sent.
export const TOURS_STRIP_FIELDS = [
  'px_source_id',
];
