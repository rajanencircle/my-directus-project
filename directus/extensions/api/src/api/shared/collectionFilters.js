import { AppError } from "./AppError.js";
import { HTTP_STATUS, DEFAULT_PRIMARIX_STATUS, ERROR_CODES } from "./constants.js";

/* Shared buildListFilter/buildSort/buildUpdatedAfterFilter trio for every list-resource
 * (hotels/cruises/tours/excursions/rental_cars/campers); each collection supplies its own
 * sort allowlist and (for the vehicles split) an extra rental_type filter.
 * buildIdFilter/buildPublicationDeepFilter are NOT part of it — those vary in kind (not
 * just parameters) between hotels and everything else, so they're defined directly below
 * per collection instead of forced through one signature. */
function createStandardFilters({ sortAllowlist, extraListFilter }) {
  /* Partner scoping is NOT applied here — every caller runs this filter through a
   * createScopedItemsService-wrapped ItemsService (see createCollectionService.js), which
   * already ANDs in the partner clause. Adding it here too would just AND the same clause
   * in twice (see createScopedItemsService's comment). */
  function buildListFilter({ publishing_status }) {
    const filter = extraListFilter ? extraListFilter() : {};
    // 'all' skips the status_primarix filter entirely; otherwise default to published.
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
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        null,
        null,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }
    return [sortParam];
  }

  /* Delta sync filters on source_updated_at (the legacy source's own last-modified
   * timestamp), NOT date_updated (Directus's own edit timestamp) — consumers poll using
   * this same field, which is also what each collection's service.js derives
   * updated_at_max from, keeping the two consistent. */
  function buildUpdatedAfterFilter(updatedAfter) {
    if (!updatedAfter) return null;
    return { source_updated_at: { _gte: updatedAfter } };
  }

  return { buildListFilter, buildSort, buildUpdatedAfterFilter };
}

/* Numeric path param matches either the customer-facing object_id (per the contract's
 * IdParam: "accepts the UUID or the numeric object_id") or the internal id, for backward
 * compatibility with any existing internal-id-based lookups. Used by every collection
 * whose Directus id and public object_id are both plain integers (all except hotels).
 *
 * Non-numeric strings are tried against `object_id` as a string first (some collections
 * store alphanumeric object_ids like "H1001"), then fall back to `px_source_id`.
 *
 * `mode` narrows the match to just one field ('object_id' | 'id') instead of the default
 * _or of both — used by getProductById's cross-collection lookup, which must exhaust every
 * collection's object_id first before falling back to raw id, so that two collections
 * sharing the same numeric id (but not the same object_id) don't collide (see
 * products.service.js's getProductById for why: a bare _or here previously let an
 * unrelated collection's `id` match win over the correct collection's `object_id` match).
 */
function buildIntegerIdFilter(id, mode) {
  if (/^\d+$/.test(id)) {
    const n = parseInt(id, 10);
    if (mode === "object_id") return { object_id: { _eq: n } };
    if (mode === "id") return { id: { _eq: n } };
    return { _or: [{ object_id: { _eq: n } }, { id: { _eq: n } }] };
  }
  return NEVER_MATCH_FILTER;
}

const NO_DEEP_FILTER = () => ({});

/* Every product collection is shared with partners via an m2m relation to `partner`
 * (hotels.partner; tours/cruises/excursions/vehicles.partner_selected). A partner-scoped
 * API token must only ever see records shared with its own partner — this builds that
 * clause. Filtering an m2m alias field addresses the JUNCTION row's own fields, not the
 * related collection's — `{ id: {_eq} }` matches the junction's integer PK (wrong) and
 * Directus rejects a UUID there with "Invalid numeric value"; `partner_id` is the
 * junction's FK to `partner` and is what actually scopes by partner.
 * When `visibilityField` is given, an item flagged `<visibilityField>: 'all'` is visible to
 * every partner-scoped token regardless of the junction table — it bypasses the per-partner
 * link entirely instead of also requiring one.
 *
 * `apiUserVisibility` is the API user's own partner_visibility (`all` | `selected`), not
 * the product-item field. `all` skips partner scoping entirely; `selected` without a
 * partnerId matches nothing so the token cannot fall through to seeing every row. */
const NEVER_MATCH_FILTER = { id: { _null: true } };

export function buildPartnerFilter(relationField, partnerId, visibilityField, apiUserVisibility) {
  if (apiUserVisibility === "all") return null;
  if (apiUserVisibility === "selected" && !partnerId) return NEVER_MATCH_FILTER;
  if (!relationField || !partnerId) return null;
  const junctionFilter = { [relationField]: { partner_id: { _eq: partnerId } } };
  if (!visibilityField) return junctionFilter;
  return {
    _or: [
      { [visibilityField]: { _eq: "all" } },
      junctionFilter,
    ],
  };
}

/* Generic, collection-agnostic "is this row's publish window active right now" check —
 * reusable wherever a table carries `publish_start`/`publish_end` timestamp columns with
 * the standard null-or-in-range semantics. Single-sourced here so any collection needing
 * this exact check can reuse it, while collections that don't need it
 * (tours/cruises/campers/rental_cars — see the per-collection comments below, none of
 * their nested child tables carry these columns) are left alone rather than having an
 * inapplicable filter forced onto them.
 *
 * Uses a full timestamp, not a date-only truncation — publish_start/publish_end are
 * timestamp columns, and truncating "now" to midnight would wrongly exclude a same-day row
 * whose publish_start has a later time-of-day than 00:00:00.
 */
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

/* hotels' id is a UUID (unlike every other collection's plain-integer id), so it needs its
 * own three-way dispatch instead of buildIntegerIdFilter. A numeric path param can only
 * ever mean object_id here (hotels' own id is never numeric), so mode:'id' on a numeric
 * input is intentionally a no-match filter — see buildIntegerIdFilter's comment for why
 * callers pass mode at all (getProductById's object_id-first, then id, cross-collection
 * lookup order). */
const HOTEL_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function buildHotelIdFilter(id, mode) {
  if (/^\d+$/.test(id)) {
    if (mode === "id") return { id: { _null: true } };
    return { object_id: { _eq: parseInt(id, 10) } };
  }
  if (HOTEL_UUID_RE.test(id)) {
    return { id: { _eq: id } };
  }
  if (mode === "id") return { id: { _eq: id } };
  return { object_id: { _eq: id } };
}

/* The full "is this row published right now" check: a status flag plus the publish-window
 * check above. Used wherever a filter clause needs both — deep-filtered nested relations
 * (publishedRelationFilter below) as well as standalone secondary queries against a
 * sub-collection (fetchProductDetail.js, fetchVehicleDetail.js) — for any table with
 * status/publish_start/publish_end columns (verified per-collection against the live schema;
 * see the comment above each call site for which tables qualify). */
export function buildPublishedStatusClauses() {
  return [{ status: { _eq: "published" } }, ...buildPublicationDateRangeFilter()];
}

/* Shared shape behind every collection's buildPublicationDeepFilter: a Directus `deep` clause
 * that restricts each named o2m/m2m relation to currently-published rows, for relations whose
 * table carries status/publish_start/publish_end (verified per-collection against the live
 * schema — see the comment above each buildXPublicationDeepFilter for which ones qualify and
 * which don't). */
function publishedRelationFilter(relationNames) {
  const clause = { _filter: { _and: buildPublishedStatusClauses() } };
  return Object.fromEntries(relationNames.map((name) => [name, clause]));
}

function buildHotelPublicationDeepFilter() {
  return {
    ...publishedRelationFilter(["room_categories", "price_dates"]),
    /* room_prices/room_occupancies have no status field to filter on, but without an explicit
     * _limit Directus caps o2m/m2m relations at its default page size (100). Hotels with
     * many categories x periods x occupancies (e.g. 216+ room_prices rows) silently lose
     * whole categories' worth of prices past that cutoff otherwise. */
    room_prices: { _limit: -1 },
    room_occupancies: { _limit: -1 },
    /* Hotel backoffice returns assigned media regardless of file draft_status.
     * Other products still filter published-only inside buildImageUrls. */
    media: {
      _limit: -1,
      _sort: ["sort"],
    },
  };
}

/* Field name of the m2m alias to `partner` on each product collection — hotels calls it
 * `partner`, every other product collection calls it `partner_selected` (see the
 * hotels_partner/tours_partner/etc. junction relations' one_field in the schema). */
export const PARTNER_RELATION_FIELDS = {
  hotels: "partner",
  cruises: "partner_selected",
  tours: "partner_selected",
  excursions: "partner_selected",
  vehicles: "partner_selected",
};

/* Item-level field marking a record visible to every partner, bypassing the m2m junction
 * above — hotels calls it `partner_type`, every other product collection calls it
 * `partner_visibility`. Value `'all'` means "show to all partners" (see buildPartnerFilter). */
export const PARTNER_VISIBILITY_FIELDS = {
  hotels: "partner_type",
  cruises: "partner_visibility",
  tours: "partner_visibility",
  excursions: "partner_visibility",
  vehicles: "partner_visibility",
};

/* Enforces partner scoping at the ItemsService boundary instead of relying on every caller
 * to remember to AND a partner filter into the query it builds by hand. Every caller of a
 * partner-scoped collection (hotels/tours/excursions/cruises/vehicles) only ever calls
 * `readByQuery` on it, so this returns a plain wrapper exposing just that one method, with
 * the partner filter always merged in — so even a `getDetails` that forgets to scope its own
 * filter still can't return another partner's row for that collection. Callers should build
 * their id/list filters without a partner clause and rely on this wrapper to add it — a
 * manual buildPartnerFilter() call on top would just AND the same clause in twice.
 *
 * `collection` is the underlying Directus collection name ('hotels', 'tours', 'excursions',
 * 'cruises', 'vehicles') — the same keys PARTNER_RELATION_FIELDS/PARTNER_VISIBILITY_FIELDS
 * use. A collection with no entry there (e.g. a child/join table like `surcharges` or
 * `room_categories`, which are already scoped indirectly via their parent's id) is returned
 * unwrapped — this only applies to root product collections.
 */
export function createScopedItemsService(services, collection, { knex, schema }, { partnerId, partnerVisibility } = {}) {
  const { ItemsService } = services;
  const service = new ItemsService(collection, { knex, schema });

  const relationField = PARTNER_RELATION_FIELDS[collection];
  if (!relationField) return service;

  const partnerFilter = buildPartnerFilter(
    relationField,
    partnerId,
    PARTNER_VISIBILITY_FIELDS[collection],
    partnerVisibility,
  );
  if (!partnerFilter) return service;

  return {
    readByQuery: (query = {}) =>
      service.readByQuery({
        ...query,
        filter: query.filter ? { _and: [query.filter, partnerFilter] } : partnerFilter,
      }),
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

/* cruises' PK (id) is an integer, so buildIntegerIdFilter applies as-is.
 * cruises_cabin_categories DOES have status/publish_start/publish_end (verified live) — same
 * deep publication filter shape as hotels' room_categories. cruises_occupancies has no such
 * columns, so it's left unfiltered. */
function buildCruisesPublicationDeepFilter() {
  return publishedRelationFilter(["cabin_categories"]);
}

export const cruises = {
  ...createStandardFilters({
    sortAllowlist: new Set([
      "date_updated", "-date_updated",
      "object_id", "-object_id",
      "season", "-season",
    ]),
  }),
  buildIdFilter: buildIntegerIdFilter,
  buildPublicationDeepFilter: buildCruisesPublicationDeepFilter,
};

/* 'name' is not sortable for tours — no top-level name field, only a per-language
 * descriptions_translations.name_tour (translations relation, not reliably sortable via a
 * single field). tours_categories DOES have status/publish_start/publish_end (verified live)
 * — same deep publication filter shape as hotels' room_categories. tours_dates has no such
 * columns, so it's left unfiltered.
 * tours_surcharges DOES have status/publish_start/publish_end (same as
 * hotels_surcharges/excursions_surcharges) — applied in tours.service.js's separate
 * surcharges query, same as hotels/excursions. */
function buildToursPublicationDeepFilter() {
  return publishedRelationFilter(["categories"]);
}

export const tours = {
  ...createStandardFilters({
    sortAllowlist: new Set([
      "date_updated", "-date_updated",
      "object_id", "-object_id",
      "season", "-season",
    ]),
  }),
  buildIdFilter: buildIntegerIdFilter,
  buildPublicationDeepFilter: buildToursPublicationDeepFilter,
};

/* 'name' is not sortable for excursions — same reasoning as tours. excursions_categories AND
 * excursions_price_periods DO have status/publish_start/publish_end (verified live) — same
 * deep publication filter shape as hotels' room_categories/price_dates.
 * excursions_price_categories has `status` but no publish window, a different shape, so it's
 * left unfiltered rather than guessed at. Surcharges (excursions_surcharges) DO have
 * status/publish_start/publish_end, but those are applied in the service's separate
 * surcharges query, same as hotels. */
function buildExcursionsPublicationDeepFilter() {
  return publishedRelationFilter(["categories", "price_periods"]);
}

export const excursions = {
  ...createStandardFilters({
    sortAllowlist: new Set([
      "date_updated", "-date_updated",
      "object_id", "-object_id",
      "season", "-season",
    ]),
  }),
  buildIdFilter: buildIntegerIdFilter,
  buildPublicationDeepFilter: buildExcursionsPublicationDeepFilter,
};

/* campers/rental_cars both back onto the Directus `vehicles` collection, split by
 * rental_type. No equivalent status/publish window fields on media/depots — no deep
 * publication filter needed. */
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
