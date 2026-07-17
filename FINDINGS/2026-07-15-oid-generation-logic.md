# OIDs — What We Found & How We Recommend Handling New IDs

**Ticket:** Logic for OIDs — "Do we have the logic for generating new OIDs in place? Should we take the latest number from Primarix, add XXX and start counting up from there?"
**Date:** 2026-07-15

---

## Internal findings log (supporting detail)

### Data collected

- **Source:** local MySQL dumps `botg_20260714` and `karawane_20260714`, queried directly.
- **botg**: 148 tables carry an `oid` column. Global range 9 – 225,162. 71,371 distinct OIDs.
- **karawane**: 38 tables carry an `oid` column. Global range 6 – 46,693. 17,502 distinct OIDs.
- **Overlap**: 6,536 OID values exist in both dumps (computed via full distinct-set intersection across all tables in both databases).
- **Mechanism**: OID is a single global counter per Primarix instance, not per table/product-type. Verified by cross-referencing `oid` magnitude against `lastupdate` timestamps across unrelated tables (hotels/camper/rentalcars/tours/trips) — numerically close OIDs land in the same time window regardless of table, which only happens with one shared, chronological counter. Supported further by a generic "object" model in the schema (`container` table = object-type registry, `objects_attributes` table = generic per-object attribute rows keyed by the same `oid` space).
- **Growth rate** (using `lastupdate` as a creation-date proxy):
  - botg: ~6,600 new OIDs in the last 6 months, ~16,300 in the last 12 months.
  - karawane: ~1,000 new OIDs in the last 6 months, ~1,700 in the last 12 months.

### Current Directus state

- `px_source_id` exists on all product collections (`hotels`, `tours`, `vehicles`, `cruises`, and now `excursions`), typed as `varchar(255)`, nullable, **not unique, not indexed** at the DB level. Uniqueness is enforced only by application logic (`migrations/clients/find-or-create.js:100`, `upsertBySourceId`), scoped per collection.
- No existing mechanism (constant, sequence, Directus flow, or extension) allocates an OID for natively-created records. Confirmed absent from `migrations/config`, `migrations/constants`, and the Directus schema itself.
- Each product collection today is sourced from exactly one legacy dump (`hotels`/`tours`/`excursions`/`vehicles` ← botg; `cruises` ← karawane) — so the 6,536 cross-dump overlapping OIDs cause no live collision today. This would only become a live issue if a future decision merges same-type records from both dumps into one collection (e.g. botg `tours` + karawane `touren` both into Directus `tours`) — in that case `px_source_id` alone can no longer disambiguate, and a companion `px_source_system` field (`bestof` / `karawane`) would be needed alongside it. Not required now; flagged for awareness only.

### Decisions confirmed by client

1. New OIDs must be globally unique across **all** product collections — one shared counter, matching Primarix's own model (not per-collection counters).
2. No unique DB constraint added to `px_source_id` — correct given the confirmed cross-dump overlap; the field will simply auto-populate for natively-created records.
3. Auto-increment mechanism and counter storage: to be implemented as described below.

### Recommended implementation

- **Two paths, one field.** `px_source_id` keeps behaving exactly as it does today for anything the nightly import touches: the legacy OID from the dump is written in as-is, unchanged, no offset applied. The **only** new behavior is for records that never came from Primarix at all — created directly in Directus — which get a number from the new native counter instead. Nothing about the existing import logic changes.
- **Threshold:** `NEW_OID_RANGE_START = 1,000,000` — permanent, not reviewed again post-migration.
- **Why not "current highest dump OID + a buffer" instead of a fixed round number:** that approach freezes the buffer at a single point in time, but the dumps don't freeze — Primarix keeps running for the full 6-month transition, and the daily import keeps pulling in whatever new legacy OIDs appear each night. A buffer sized against *today's* highest OID only stays safe if nothing in either dump ever grows past it — but we measured real, ongoing growth (~6,600/6mo in botg, ~1,000/6mo in karawane), so a tight buffer calculated once would start eroding from day one and could eventually be caught up to by legitimate new legacy OIDs arriving through the daily import — which would then collide with native-Directus OIDs occupying the same numbers. A large fixed round number (1,000,000) sidesteps this entirely: it doesn't need to track a moving target, it just needs to sit far enough above every plausible legacy OID for the rest of Primarix's life, which it comfortably does (~20x the realistic 6-month growth, ~3.4x botg's entire multi-year history).
- **Counter:** a real Postgres `SEQUENCE` (`native_oid_seq`, `START WITH 1000000`) — atomic under concurrent creates, unlike a plain counter field read/updated via a Flow.
- **Assignment logic:** a Directus **hook extension** (`filter` on `items.create`, scoped to all product collections) — not a Flow, since Flows have no atomic increment primitive without building a custom operation extension anyway (same effort, worse safety). The hook only acts when `px_source_id` is empty (i.e. not set by the import pipeline); it then pulls `nextval('native_oid_seq')` and writes it in.
- **Visibility:** a small singleton collection (e.g. `oid_registry`) with a read-only mirror field showing the next OID to be issued, for the team's benefit — not the source of truth itself.
- **Open item:** confirm where Directus extensions are deployed/managed for `directus-staging`/`directus-dev` (not present in the `botg-import-service` repo) so the hook can be built in the right place.
