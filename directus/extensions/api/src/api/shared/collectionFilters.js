import { AppError } from "./AppError.js";
import { HTTP_STATUS, DEFAULT_PRIMARIX_STATUS } from "./constants.js";

// Every list-resource's filters.js (hotels/cruises/tours/excursions/rental_cars/campers)
// declared the same buildListFilter/buildSort/buildUpdatedAfterFilter trio, differing only
// in the sort allowlist and (for the vehicles split) an extra rental_type filter. This
// factory is that shared shape. buildIdFilter/buildPublicationDeepFilter are NOT part of
// it — those vary in kind (not just parameters) between hotels and everything else, so
// they're defined directly below per collection instead of forced through one signature.
function createStandardFilters({ sortAllowlist, extraListFilter }) {
  function buildListFilter({ publishing_status }) {
    const filter = extraListFilter ? extraListFilter() : {};
    // 'all' means don't filter by status_primarix at all — otherwise default to published.
    if (publishing_status !== "all") {
      filter.status_primarix = {
        _eq: publishing_status ?? DEFAULT_PRIMARIX_STATUS,
      };
    }
    return filter;
  }

  function buildSort(sortParam) {
    if (!sortParam) return ["-date_updated"];
    if (!sortAllowlist.has(sortParam)) {
      throw new AppError(
        `Invalid sort value: ${sortParam}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    return [sortParam];
  }

  // Delta sync filters on source_updated_at (the legacy source's own last-modified
  // timestamp), NOT date_updated (Directus's own edit timestamp) — consumers poll using
  // the value the API previously returned as updated_at_max, which is also derived from
  // source_updated_at in each collection's service.js, to keep the two consistent.
  function buildUpdatedAfterFilter(updatedAfter) {
    if (!updatedAfter) return null;
    return { source_updated_at: { _gte: updatedAfter } };
  }

  return { buildListFilter, buildSort, buildUpdatedAfterFilter };
}

// Numeric path param matches either the customer-facing object_id (per the contract's
// IdParam: "accepts the UUID or the numeric object_id") or the internal id, for backward
// compatibility with any existing internal-id-based lookups. Used by every collection
// whose Directus id and public object_id are both plain integers (all except hotels).
//
// `mode` narrows the match to just one field ('object_id' | 'id') instead of the default
// _or of both — used by getProductById's cross-collection lookup, which must exhaust every
// collection's object_id first before falling back to raw id, so that two collections
// sharing the same numeric id (but not the same object_id) don't collide (see
// products.service.js's getProductById for why: a bare _or here previously let an
// unrelated collection's `id` match win over the correct collection's `object_id` match).
function buildIntegerIdFilter(id, mode) {
  if (/^\d+$/.test(id)) {
    const n = parseInt(id, 10);
    if (mode === "object_id") return { object_id: { _eq: n } };
    if (mode === "id") return { id: { _eq: n } };
    return { _or: [{ object_id: { _eq: n } }, { id: { _eq: n } }] };
  }
  return { px_source_id: { _eq: id } };
}

const NO_DEEP_FILTER = () => ({});

// Generic, collection-agnostic "is this row's publish window active right now"
// check — reusable wherever a table carries `publish_start`/`publish_end` timestamp
// columns with the standard null-or-in-range semantics. Previously hand-duplicated
// verbatim in three places (this file's hotel deep-filter, hotels.service.js's child
// room-category/surcharges queries, and excursions.service.js's surcharges query) —
// single-sourced here so any collection needing this exact check can reuse it, while
// collections that don't need it (tours/cruises/campers/rental_cars — see the
// per-collection comments below, none of their nested child tables carry these
// columns) are left alone rather than having an inapplicable filter forced onto them.
//
// Full timestamp, not a date-only truncation — publish_start/publish_end are
// timestamp columns, and truncating "now" to midnight would wrongly exclude a
// same-day row whose publish_start has a later time-of-day than 00:00:00.
export function buildPublicationDateRangeFilter() {
  const now = new Date().toISOString();
  return [
    {
      _or: [
        { publish_start: { _null: true } },
        { publish_start: { _lte: now } },
      ],
    },
    {
      _or: [{ publish_end: { _null: true } }, { publish_end: { _gte: now } }],
    },
  ];
}

// hotels' id is a UUID (unlike every other collection's plain-integer id), so it needs its
// own three-way dispatch instead of buildIntegerIdFilter. A numeric path param can only ever
// mean object_id here (hotels' own id is never numeric), so mode:'id' on a numeric input is
// intentionally a no-match filter — see buildIntegerIdFilter's comment for why callers pass
// mode at all (getProductById's object_id-first, then id, cross-collection lookup order).
const HOTEL_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function buildHotelIdFilter(id, mode) {
  if (/^\d+$/.test(id)) {
    if (mode === "id") return { id: { _null: true } };
    return { object_id: { _eq: parseInt(id, 10) } };
  }
  if (!HOTEL_UUID_RE.test(id)) {
    return { px_source_id: { _eq: id } };
  }
  return { id: { _eq: id } };
}

function buildHotelPublicationDeepFilter() {
  const dateRangeFilter = buildPublicationDateRangeFilter();
  return {
    room_categories: {
      _filter: { _and: [{ status: { _eq: "published" } }, ...dateRangeFilter] },
    },
    price_dates: {
      _filter: { _and: [{ status: { _eq: "published" } }, ...dateRangeFilter] },
    },
    media: {
      _filter: {
        directus_files_id: {
          // draft_status is a two-value enum (published/unpublished). "published" only —
          // the previous _neq:'draft' matched everything, leaking unpublished media.
          draft_status: { _eq: "published" },
        },
      },
    },
  };
}

export const hotels = {
  ...createStandardFilters({
    sortAllowlist: new Set([
      "name", "-name",
      "date_updated", "-date_updated",
      "object_id", "-object_id",
      "season", "-season",
    ]),
  }),
  buildIdFilter: buildHotelIdFilter,
  buildPublicationDeepFilter: buildHotelPublicationDeepFilter,
};

// cruises' PK (id) is an integer, so buildIntegerIdFilter applies as-is. cruises_cabin_categories
// DOES have a `status` field (unlike price_dates/occupancies), so a deep publication filter
// analogous to hotels' room_categories one is possible but not implemented yet — left as
// NO_DEEP_FILTER rather than guessed at.
export const cruises = {
  ...createStandardFilters({
    sortAllowlist: new Set([
      "date_updated", "-date_updated",
      "object_id", "-object_id",
      "season", "-season",
    ]),
  }),
  buildIdFilter: buildIntegerIdFilter,
  buildPublicationDeepFilter: NO_DEEP_FILTER,
};

// 'name' is not sortable for tours — no top-level name field, only a per-language
// descriptions_translations.name_tour (translations relation, not reliably sortable via a
// single field). tours' categories/dates/surcharges have no status/publish window fields
// (unlike hotels' room_categories/price_dates) — no deep publication filter is applicable.
export const tours = {
  ...createStandardFilters({
    sortAllowlist: new Set([
      "date_updated", "-date_updated",
      "object_id", "-object_id",
      "season", "-season",
    ]),
  }),
  buildIdFilter: buildIntegerIdFilter,
  buildPublicationDeepFilter: NO_DEEP_FILTER,
};

// 'name' is not sortable for excursions — same reasoning as tours. excursions_categories/
// price_periods/price_categories have no status/publish window fields — no deep publication
// filter needed for those. Surcharges (excursions_surcharges) DO have status/publish_start/
// publish_end, but those are applied in the service's separate surcharges query, same as hotels.
export const excursions = {
  ...createStandardFilters({
    sortAllowlist: new Set([
      "date_updated", "-date_updated",
      "object_id", "-object_id",
      "season", "-season",
    ]),
  }),
  buildIdFilter: buildIntegerIdFilter,
  buildPublicationDeepFilter: NO_DEEP_FILTER,
};

// campers/rental_cars both back onto the Directus `vehicles` collection, split by
// rental_type. No equivalent status/publish window fields on media/depots — no deep
// publication filter needed.
export const campers = {
  ...createStandardFilters({
    sortAllowlist: new Set([
      "name_camper", "-name_camper",
      "date_updated", "-date_updated",
      "object_id", "-object_id",
    ]),
    extraListFilter: () => ({ rental_type: { _eq: "camper" } }),
  }),
  buildIdFilter: buildIntegerIdFilter,
  buildPublicationDeepFilter: NO_DEEP_FILTER,
};

export const rentalCars = {
  ...createStandardFilters({
    sortAllowlist: new Set([
      "name_rentalCar", "-name_rentalCar",
      "date_updated", "-date_updated",
      "object_id", "-object_id",
    ]),
    extraListFilter: () => ({ rental_type: { _eq: "car" } }),
  }),
  buildIdFilter: buildIntegerIdFilter,
  buildPublicationDeepFilter: NO_DEEP_FILTER,
};
