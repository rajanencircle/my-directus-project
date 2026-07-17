import { AppError } from '../../shared/AppError.js';
import { HTTP_STATUS } from '../../shared/constants.js';

const SORT_ALLOWLIST = new Set([
  'name_vehicle', '-name_vehicle',
  'date_updated', '-date_updated',
  'object_id', '-object_id',
]);

export function buildListFilter({ search, category, rental_type }) {
  const filter = {
    status_primarix: { _eq: 'published' },
  };

  if (search) {
    filter._or = [
      { name_vehicle: { _icontains: search } },
      { 'descriptions_translations.teaser': { _icontains: search } },
    ];
  }

  if (category) {
    filter.category = { id: { _eq: parseInt(category, 10) } };
  }

  if (rental_type) {
    filter.rental_type = { _eq: rental_type };
  }

  return filter;
}

// vehicles has no equivalent status/publish window fields on media/depots — no deep
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

// vehicles' PK (id) is an integer, so a numeric path param is treated as the internal
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
