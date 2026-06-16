// Maps Directus field names to v1 API output names.
// Only fields that differ between Directus and the v1 response are listed.
// Fields not in this map are passed through with their Directus name.
export const HOTEL_FIELD_MAP = {
  status_primarix: 'status',
  children_free_number: 'max_children_free',
  children_free_age: 'max_children_free_age',
};
