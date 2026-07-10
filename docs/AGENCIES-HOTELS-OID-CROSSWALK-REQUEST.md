# Hotels ↔ Agencies linking — open question for the client

**Context:** As part of retiring `booking_partners` in favor of the new `agencies` collection, we went to wire up the Hotels import so each hotel resolves its agency purely via the Primarix `object_id` (OID) — the same natural key `agencies.object_id` already uses. During implementation we found the source data doesn't support a direct OID join, so we're pausing this specific piece and asking for your input before writing any matching logic.

## What we found

The field on the legacy hotel record that currently selects a "booking partner" (`botg.hotels`, field id `365`) does not store the same OID as `agencies.object_id`. It stores an ID from a separate Primarix dropdown list (`px_feldlisten`, list id 35 — 170 entries total). We confirmed this directly: looking up one of these IDs (e.g. `4919`) in the `agencies` source table returns nothing, but the same ID exists in the dropdown list with the label "Across Australia (Goway Travel)".

In short: **there's no field on the legacy hotel row today that carries the real `agencies.object_id`.** The only thing we can go on is the agency's *name*, and names have drifted slightly between the two datasets over time.

## What matching by name gets us

Of 1,175 hotels, 1,019 have a booking-partner selection (45 distinct values):

- **7 hotels** use the value "- Buchung direkt" — this isn't a real agency, it's Primarix's marker for "hotel books directly." We'll treat these as having no agency link, same as before.
- **639 hotels** (across 38 distinct agency names) match an existing `agencies` record exactly once we ignore case, whitespace, and a couple of character-encoding artifacts from the export. We're confident in these.
- **373 hotels** (across 6 distinct agency names) have a name that's close but not identical to an agency we already imported. We'd like you to confirm these before we link them, since one of them alone affects 238 hotels:

| Legacy hotel label | Closest `agencies` match | Hotels affected |
|---|---|---|
| Across Australia (Goway Travel) | Across Australia (AU) (was Goway Travel) | 238 |
| Pacific Destinations (Rest New Zealand) | Pacific Destinations | 111 |
| Hello Island Mauritius | Hello Islands Mauritius | 17 |
| Goway Travel (NZ) | Goway Inbound (NZ) | 5 |
| Andes Nativa - Responsible Tourism | Andes Viva - Responsible Tourism | 1 |
| Eden + | *(no candidate found in the 183 imported agencies)* | 1 |

## What we need from you

Either of these unblocks us:

1. **Confirm the 6 matches above** (or correct them) so we can link by name, or
2. **Provide a mapping** from the old dropdown list (`px_feldlisten`, list id 35) to the corresponding `agencies.object_id` — this would let us join by ID exactly as originally planned, for all 44 agencies, not just the 6 in question.

Once we have either, wiring up the actual `hotels.booking` writes is a small change (the lookup plumbing is already in place in `scripts/migrate-hotels-mysql.js`).
