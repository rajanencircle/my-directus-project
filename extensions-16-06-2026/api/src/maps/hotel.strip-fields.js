// Top-level fields on the shaped hotel object that must never appear in v1 responses.
// internal_remarks and res_email_1/res_phone are not fetched (excluded from field projections),
// so they never reach the transformer. px_source_id IS fetched (used for id lookups) and
// must be stripped here before the response is sent.
export const HOTEL_STRIP_FIELDS = [
  'px_source_id',
];
