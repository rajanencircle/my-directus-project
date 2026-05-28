import { AppError } from '../../shared/AppError.js';
import { HTTP_STATUS } from '../../shared/constants.js';

const SORT_ALLOWLIST = new Set(['name', '-name', 'date_updated', '-date_updated']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildListFilter({ search, country }) {
  const filter = {
    status_primarix: { _eq: 'published' },
  };

  if (search) {
    filter._or = [
      { name: { _icontains: search } },
      { 'hotel_descriptions_translations.teaser': { _icontains: search } },
    ];
  }

  if (country) {
    filter.country = { id: { _eq: parseInt(country, 10) } };
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

export function buildUpdatedAfterFilter(updatedAfter) {
  if (!updatedAfter) return null;
  return { date_updated: { _gt: updatedAfter } };
}
