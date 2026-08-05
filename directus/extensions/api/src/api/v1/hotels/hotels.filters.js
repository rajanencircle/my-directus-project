import { AppError } from '../../shared/AppError.js';
import { HTTP_STATUS, DEFAULT_PRIMARIX_STATUS } from '../../shared/constants.js';

const SORT_ALLOWLIST = new Set([
  'name', '-name',
  'date_updated', '-date_updated',
  'object_id', '-object_id',
  'season', '-season',
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildListFilter({ publishing_status }) {
  const filter = {};
  // 'all' means don't filter by status_primarix at all — otherwise default to published.
  if (publishing_status !== 'all') {
    filter.status_primarix = { _eq: publishing_status ?? DEFAULT_PRIMARIX_STATUS };
  }
  return filter;
}

export function buildPublicationDeepFilter() {
  const today = new Date().toISOString().slice(0, 10);
  const dateRangeFilter = [
    { _or: [{ publish_start: { _null: true } }, { publish_start: { _lte: today } }] },
    { _or: [{ publish_end: { _null: true } }, { publish_end: { _gte: today } }] },
  ];
  return {
    room_categories: { _filter: { _and: [{ status: { _eq: 'published' } }, ...dateRangeFilter] } },
    price_dates: { _filter: { _and: [{ status: { _eq: 'published' } }, ...dateRangeFilter] } },
    media: {
      _filter: {
        directus_files_id: {
          _or: [
            { draft_status: { _null: true } },
            { draft_status: { _neq: 'draft' } },
          ],
        },
      },
    },
  };
}

export function buildSort(sortParam) {
  if (!sortParam) return ['-date_updated'];
  if (!SORT_ALLOWLIST.has(sortParam)) {
    throw new AppError(`Invalid sort value: ${sortParam}`, HTTP_STATUS.BAD_REQUEST);
  }
  return [sortParam];
}

export function buildIdFilter(id) {
  if (/^\d+$/.test(id)) {
    return { object_id: { _eq: parseInt(id, 10) } };
  }
  if (!UUID_RE.test(id)) {
    return { px_source_id: { _eq: id } };
  }
  return { id: { _eq: id } };
}

// Delta sync filters on source_updated_at (the legacy source's own last-modified
// timestamp), NOT date_updated (Directus's own edit timestamp) — consumers poll using
// the value the API previously returned as updated_at_max, which is now also derived
// from source_updated_at (see hotels.service.js) to keep the two consistent.
export function buildUpdatedAfterFilter(updatedAfter) {
  if (!updatedAfter) return null;
  return { source_updated_at: { _gt: updatedAfter } };
}
