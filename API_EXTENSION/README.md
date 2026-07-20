# API Extension — Products Expansion (Tours, Excursions, Vehicles, Cruises)

Tracking folder for the work that extended `directus/extensions/api` (the custom REST API
layer, previously hotels-only) to also serve **tours**, **excursions**, **vehicles**, and
**cruises**. This is a **code-only change** — nothing was created, modified, or deleted in
any live Directus instance (local/dev/staging/main). All schema facts below were gathered
by **reading** `directus-dev` via MCP; no writes were made there.

See [`CHANGES-2026-07-17.md`](./CHANGES-2026-07-17.md) for the full write-up: request,
plan, schema findings, files touched, and how to verify.

## Quick reference

| Product | Endpoint prefix | Pricing status |
|---|---|---|
| Hotels | `/api/v1/hotels` | Reference implementation — **untouched** by this work |
| Tours (daytrips) | `/api/v1/tours` | `buy_price` only — no sell-price field wired yet, `sell`/`from_price` always `null` |
| Excursions | `/api/v1/excursions` | Fully wired — real computed `from_price` |
| Cruises | `/api/v1/cruises` | Single per-market settings row (`price_settings`/`from_price`), no per-cabin/date matrix, no structured surcharges |
| Vehicles | `/api/v1/vehicles` | Master data/media/descriptions only — `pricing: { available: false, reason: "..." }` (no FK from pricing/surcharge collections back to `vehicles` yet) |

`/api/v1/products`, `/api/v1/products/details`, `/api/v1/products/limited-list` now fan out
across all 5 product types instead of hotels-only.
