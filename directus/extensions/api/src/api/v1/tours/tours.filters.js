import { AppError } from '../../shared/AppError.js';
import { HTTP_STATUS, DEFAULT_PRIMARIX_STATUS } from '../../shared/constants.js';

// 'name' is not sortable — tours has no top-level name field, only a per-language
// descriptions_translations.name_tour (translations relation, not reliably sortable
// via a single field).
const SORT_ALLOWLIST = new Set([
  'date_updated', '-date_updated',
  'object_id', '-object_id',
  'season', '-season',
]);

export function buildListFilter({ search, country, region, state, season, status }) {
  const filter = {
    status_primarix: { _eq: status ?? DEFAULT_PRIMARIX_STATUS },
  };

  if (search) {
    // tours has no top-level `name` field — search the translated name instead.
    filter._or = [
      { 'descriptions_translations.name_tour': { _icontains: search } },
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

// Delta sync filters on source_updated_at (the legacy source's own last-modified
// timestamp), NOT date_updated (Directus's own edit timestamp) — consumers poll using
// the value the API previously returned as updated_at_max, which is now also derived
// from source_updated_at (see tours.service.js) to keep the two consistent.
export function buildUpdatedAfterFilter(updatedAfter) {
  if (!updatedAfter) return null;
  return { source_updated_at: { _gt: updatedAfter } };
}
