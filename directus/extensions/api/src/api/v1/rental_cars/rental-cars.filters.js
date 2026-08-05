import { AppError } from '../../shared/AppError.js';
import { HTTP_STATUS, DEFAULT_PRIMARIX_STATUS } from '../../shared/constants.js';

const SORT_ALLOWLIST = new Set([
  'name_rentalCar', '-name_rentalCar',
  'date_updated', '-date_updated',
  'object_id', '-object_id',
]);

export function buildListFilter({ publishing_status }) {
  const filter = { rental_type: { _eq: 'car' } };
  // 'all' means don't filter by status_primarix at all — otherwise default to published.
  if (publishing_status !== 'all') {
    filter.status_primarix = { _eq: publishing_status ?? DEFAULT_PRIMARIX_STATUS };
  }

  return filter;
}

// rental-cars has no equivalent status/publish window fields on media/depots — no deep
// publication filter needed.
export function buildPublicationDeepFilter() {
  return {};
}

export function buildSort(sortParam) {
  if (!sortParam) return ['-date_updated'];
  if (!SORT_ALLOWLIST.has(sortParam)) {
    throw new AppError(`Invalid sort value: ${sortParam}`, HTTP_STATUS.BAD_REQUEST);
  }
  return [sortParam];
}

// Numeric path param matches either the customer-facing object_id (per the contract's
// IdParam: "accepts the UUID or the numeric object_id") or the internal id, for backward
// compatibility with any existing internal-id-based lookups.
export function buildIdFilter(id) {
  if (/^\d+$/.test(id)) {
    const n = parseInt(id, 10);
    return { _or: [{ object_id: { _eq: n } }, { id: { _eq: n } }] };
  }
  return { px_source_id: { _eq: id } };
}

// Delta sync filters on source_updated_at (the legacy source's own last-modified
// timestamp), NOT date_updated (Directus's own edit timestamp) — consumers poll using
// the value the API previously returned as updated_at_max, which is now also derived
// from source_updated_at (see rental-cars.service.js) to keep the two consistent.
export function buildUpdatedAfterFilter(updatedAfter) {
  if (!updatedAfter) return null;
  return { source_updated_at: { _gt: updatedAfter } };
}
