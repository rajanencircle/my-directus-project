import { AppError } from '../../shared/AppError.js';
import { HTTP_STATUS } from '../../shared/constants.js';

const SORT_ALLOWLIST = new Set([
  'name', '-name',
  'date_updated', '-date_updated',
  'object_id', '-object_id',
  'season', '-season',
]);

export function buildListFilter({ search, country, region, state, season }) {
  const filter = {
    status_primarix: { _eq: 'published' },
  };

  if (search) {
    filter._or = [
      { name: { _icontains: search } },
      { 'descriptions_translations.teaser': { _icontains: search } },
    ];
  }

  if (country) {
    filter.country = { id: { _eq: parseInt(country, 10) } };
  }

  if (region) {
    filter.region = { id: { _eq: parseInt(region, 10) } };
  }

  if (state) {
    filter.state = { id: { _eq: parseInt(state, 10) } };
  }

  if (season) {
    filter.season = { _eq: season };
  }

  return filter;
}

// tours' categories/dates/surcharges have no status/publish_start/publish_end fields
// (unlike hotels' room_categories/price_dates) — no deep publication filter is applicable.
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

// tours' PK (id) is itself an integer (unlike hotels' UUID id), so a numeric path
// param is treated as the internal id directly, not object_id.
export function buildIdFilter(id) {
  if (/^\d+$/.test(id)) {
    return { id: { _eq: parseInt(id, 10) } };
  }
  return { px_source_id: { _eq: id } };
}

export function buildUpdatedAfterFilter(updatedAfter) {
  if (!updatedAfter) return null;
  return { date_updated: { _gt: updatedAfter } };
}
