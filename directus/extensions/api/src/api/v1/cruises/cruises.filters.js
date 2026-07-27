import { AppError } from '../../shared/AppError.js';
import { HTTP_STATUS } from '../../shared/constants.js';

const SORT_ALLOWLIST = new Set([
  'date_updated', '-date_updated',
  'object_id', '-object_id',
  'season', '-season',
]);

export function buildListFilter({ search, country, destination, season }) {
  const filter = {
    status_primarix: { _eq: 'published' },
  };

  if (search) {
    filter._or = [
      { 'descriptions_translations.headline': { _icontains: search } },
      { 'descriptions_translations.teaser': { _icontains: search } },
    ];
  }

  if (country) {
    filter.countries = { countries_id: { id: { _eq: parseInt(country, 10) } } };
  }

  if (destination) {
    filter.destinations = { destinations_id: { id: { _eq: parseInt(destination, 10) } } };
  }

  if (season) {
    filter.season = { _eq: season };
  }

  return filter;
}

// NOTE: cruises_cabin_categories DOES have a `status` field (unlike price_dates/occupancies),
// so a deep publication filter analogous to hotels' room_categories one is possible but not
// implemented yet — left as {} (no filtering) rather than guessed at.
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

// cruises' PK (id) is an integer, so a numeric path param is treated as the internal
// id directly, not object_id.
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
