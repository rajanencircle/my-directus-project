# API Response ↔ Directus Field Mapping

This document maps every field in the BOTG Product API's JSON responses back to the exact
Directus collection/relation/field it is sourced from, per product type. It reflects the
code as of this session, including the schema-drift fixes applied on 2026-08-05 (see notes
inline where relevant).

**Format:** `api_response_path : <collection>.<field>.<path>`
`->` in the left column shows JSON nesting in the response. `.` in the right column shows
the Directus collection/relation/field path actually queried. Where a resource fetches a
child collection via its own separate `ItemsService` query (filtered by the parent id)
instead of through an o2m alias, the path is written as `<collection>.<field>` and flagged
"separate query" — it is not a resolvable relation path from the root collection.
Hardcoded/static values (no real Directus source) and derived/computed values (built from
multiple source fields) are called out explicitly rather than given a fake path.

**Web vs backoffice:** fields marked "web-stripped" are omitted from the public/web detail
body (`GET /products/{id}`, `GET /products/full`) — they remain present on the backoffice
per-type endpoints (`GET /hotels/{id}`, etc). As of 2026-08-07 this is enforced by the same
allowlist mechanism described below, not a separate step: each transformer's `fieldDefs`
carries `visibleTo`/`restrictTo(...)` visibility metadata (`src/shared/response/
visibility.js`), and `assembleResponse()` (`src/shared/response/assembleResponse.js`)
resolves it per-audience when called with `{ audience: "web" }`. The former separate
post-processing step — `src/shared/response/webDetail.js`'s `stripToWebDetail()`, a
deny-list applied by deep-cloning the full backoffice object and deleting keys — has been
removed; the two response shapes (backoffice, web) now come from one allowlist mechanism
applied twice (once per audience) to the same `fieldDefs`, instead of one allowlist build
followed by a separate deny-list subtraction. Verified equivalent to the old two-step
pipeline for all 6 collections × 3 languages before the old code was deleted (see
`refactor-baseline/PHASE2_NOTES.md`).

**Completeness guarantee (2026-08-07, extended 2026-08-07):** response assembly
(`src/shared/response/assembleResponse.js`) is allowlist-only for **both** audiences — a
response contains exactly the fields declared in a transformer's `fieldDefs` and visible to
the requested audience, nothing else. There is no automatic passthrough of unconsumed raw
Directus fields (there used to be, gated by a per-transformer `CONSUMED_SOURCE_KEYS` list
plus `shared/response/denylist.js`; both were removed once verified — against the live
schema and real records for one id per collection — that the passthrough had never actually
surfaced anything beyond Directus Studio UI-only "no-data" alias fields). This guarantee
originally covered only the backoffice per-type endpoints; it now covers the web
(`/products`) path too, since both are built by the same `assembleResponse()` call against
the same `fieldDefs` — a field's web/backoffice visibility is declared once, next to the
field itself, rather than maintained as a second, separately-verified deny-list.
Practically: **this document is now the exhaustive list of every field either audience's
response can ever contain** — a field not written down here cannot appear in the API, by
construction, not just by convention.

---

## Hotels

Directus root collection: `hotels`.

### Top-level

```
id : hotels.id
object_id : hotels.object_id
publishing_status : hotels.status_primarix
date_updated : hotels.date_updated
season->id : hotels.season.id
season->name : hotels.season.season
name : hotels.name
hotel_group->id : hotels.hotel_group.id
hotel_group->name : hotels.hotel_group.label
```
Web-stripped: `id`, `object_id`, `publishing_status`, `date_updated`, `sell_prices_status`,
`sell_prices_updated_at`, plus the whole `pricing_config`/`internal`/`booking` groups.
`name` is retained (and promoted to the leading key) for the hotel web response.

### Address

```
address->street : hotels.street
address->street_number : hotels.street_number
address->zip_code : hotels.zip_code
address->place->id : hotels.place.id
address->place->name : hotels.place.translations.name (locale-matched via place.translations.translations_id.code)
address->place->code : (hardcoded null — no code field modeled for place)
address->country->id : hotels.country.id
address->country->name : hotels.country.translations.name (locale-matched via country.translations.translations_id.code)
address->country->code : hotels.country.ISO
address->state->id : hotels.state.id
address->state->name : hotels.state.translations.name (locale-matched via state.translations.translations_id.code)
address->state->code : hotels.state.ISO
address->region->id : hotels.region.id
address->region->name : hotels.region.translations.name (locale-matched via region.translations.translations_id.code)
address->region->code : (hardcoded null — no code field modeled for region)
address->phone_general : hotels.phone_general
address->phone_after_hours : hotels.phone_ah
address->email_general : hotels.email_general
address->website : hotels.website
```

### Classification

```
classification->accommodation_types[]->id : hotels.accommodation_type.accommodation_types_id.id
classification->accommodation_types[]->name : hotels.accommodation_type.accommodation_types_id.label
classification->hotel_classification->id : hotels.hotel_classification.id
classification->hotel_classification->name : hotels.hotel_classification.label
classification->activities[]->id : hotels.hotel_activities.activities_id.id
classification->activities[]->name : hotels.hotel_activities.activities_id.label
```

### Descriptions

Locale selection: rows in `hotel_descriptions_translations` grouped per language via
`LOCALE_TO_ISO`, then the active `lang` picked (falling back to de-DE, then en-GB, then
first available).

```
descriptions->subline_location : hotels.hotel_descriptions_translations.subline_location
descriptions->teaser : hotels.hotel_descriptions_translations.teaser
descriptions->description_short : hotels.hotel_descriptions_translations.description_short
descriptions->description_surrounding : hotels.hotel_descriptions_translations.description_surrounding
descriptions->description_rooms : hotels.hotel_descriptions_translations.description_rooms
descriptions->remarks_arrival : hotels.hotel_descriptions_translations.remarks_arrival
descriptions->total_number_of_rooms : hotels.hotel_descriptions_translations.total_number_of_rooms (cast to Number)
descriptions->supplementary[]->headline : hotels.hotel_descriptions_translations.description_supplementary (JSON repeater; parsed by toSupplementaryBlocks())
descriptions->supplementary[]->text : hotels.hotel_descriptions_translations.description_supplementary (same field, text/content/description/body extraction)
descriptions->descriptions_markdown : (hardcoded null — not yet modeled in Directus)
```

### Price Info

```
price_info->services_included : hotels.price_info_translations.services_included
price_info->services_not_included : hotels.price_info_translations.services_not_included
price_info->service_highlights : hotels.price_info_translations.service_highlights
price_info->minimum_stay : hotels.price_info_translations.minimum_stay
price_info->minimum_stay_additions : hotels.price_info_translations.minimum_stay_additions
price_info->deviating_cancellation_terms : hotels.price_info_translations.deviating_cancelation_terms (note: Directus field is spelled "cancelation", one L)
price_info->children_policy : hotels.price_info_translations.children_policy
price_info->children_free_age : hotels.price_info_translations.children_free_age (cast to Number)
price_info->children_free_number : hotels.price_info_translations.children_free_number (cast to Number)
price_info->important_information : hotels.price_info_translations.important_information
price_info->mobility_advice->id : (hardcoded null — hotels have no m2o relation to a mobility_advice collection; flat text field only, this is expected/correct, managed by a Directus Flow)
price_info->mobility_advice->name : hotels.price_info_translations.mobility_advice_text
price_info->supplementary[]->headline : hotels.price_info_translations.price_infos_supplementary (JSON repeater; toSupplementaryBlocks())
price_info->supplementary[]->text : hotels.price_info_translations.price_infos_supplementary
price_info->price_info_markdown : (hardcoded null — not yet modeled in Directus)
```

### Rooms & Prices

Built by `groupPrices()` in `src/utils/prices.js`, joining `room_categories`, `price_dates`,
`room_prices`, and `room_occupancies`. Only publication-active rows are included.

```
rooms[]->category->id : hotels.room_categories.id
rooms[]->category->name : hotels.room_categories.room_category
rooms[]->sort : hotels.room_categories.sort
rooms[]->additions : hotels.room_categories.translations.room_category_additions
rooms[]->description : hotels.room_categories.translations.room_category_description
rooms[]->booking_code : hotels.room_categories.room_category_booking_code
rooms[]->catering->id : hotels.room_categories.room_category_catering.id
rooms[]->catering->name : hotels.room_categories.room_category_catering.designation
rooms[]->calc_type : hotels.room_categories.room_category_calc_type
rooms[]->tour32_name : hotels.room_categories.room_category_tour32_name
rooms[]->periods[]->period->start : hotels.price_dates.start_date
rooms[]->periods[]->period->end : hotels.price_dates.end_date
rooms[]->periods[]->period->from : hotels.price_dates.from_price (coerced to boolean)
rooms[]->periods[]->prices[]->occupancy->id : hotels.room_occupancies.occupancies_id.id
rooms[]->periods[]->prices[]->occupancy->name : hotels.room_occupancies.occupancies_id.translations.occupancy
rooms[]->periods[]->prices[]->sell : hotels.room_prices.room_prices_translations.sell_price (parsed to float)
rooms[]->periods[]->prices[]->buy : hotels.room_prices.buy_price (parsed to float) — web-stripped
rooms[]->periods[]->prices[]->margin : hotels.hotel_prices.margin_percentage (hotel-level setting, same value on every row) — web-stripped
```
Also web-stripped from each room: `booking_code`, `tour32_name`, `catering`, `calc_type`.
> Fixed this session: `webDetail.js` previously checked the wrong path (`room.prices[]`
> instead of `room.periods[].prices[]`), so `buy`/`margin` leaked into the web response.

### Surcharges

Line items come from the shared `surcharges` catalog collection (attached to hotels via
the `hotels.hotels_surcharges` M2M), fetched by `hotels.service.js` with a separate query
on `surcharges` filtered by `hotel_id`. Per-line translations live on
`surcharges.translations` → `surcharges_translations`.

```
surcharges[]->booking_name : surcharges.translations.surcharge_booking_name (separate query on the `surcharges` catalog)
surcharges[]->description : surcharges.translations.surcharge_description
surcharges[]->sell : surcharges.translations.sell_price (parsed to float)
surcharges[]->type : surcharges.translations.surcharge_type.designation — web-stripped
surcharges[]->catering->id : surcharges.translations.surcharge_catering.id — web-stripped
surcharges[]->catering->name : surcharges.translations.surcharge_catering.designation — web-stripped
surcharges[]->calc_type : surcharges.translations.surcharge_calc_type.designation — web-stripped
surcharges[]->buy : surcharges.buy_price (parsed to float) — web-stripped
surcharges[]->margin : hotels.surcharges.surcharge_margin_percentage (hotel-level setting from `hotels_surcharges_translations`; `hotels.surcharges` is the settings alias, renamed to `surcharge_settings` by hotels.service.js) — web-stripped
```

### Specials

```
specials->special_description : hotels.specials_translations.specials (JSON repeater; extractSpecialsDescription() reads text ?? special_description ?? description per entry, joins with blank lines)
```

### Image Badge

Whole object null unless `hotels.image_badge_status` is set.

```
image_badge->teaser : hotels.image_badge_translations.image_badge_teaser
image_badge->details : hotels.image_badge_translations.image_badge_details
image_badge->start_date : hotels.image_badge_start_date
image_badge->end_date : hotels.image_badge_end_date
image_badge->status : hotels.image_badge_status
```

### Media

```
media[]->id : hotels.media.directus_files_id.id
media[]->url : derived — `${request protocol+host}/assets/<file id>`
media[]->alt : hotels.media.directus_files_id.alt_text
media[]->sort : hotels.media.sort
media[]->copyright : hotels.media.directus_files_id.copyright
media[]->is_map : hotels.media.is_map (falls back to media.directus_files_id.is_map) — web-stripped
media[]->object_id_primarix : hotels.media.directus_files_id.primarix_picid — web-stripped
media[]->filename_fotoweb : hotels.media.directus_files_id.fotoware_file_name — web-stripped
media[]->use_tour32 : hotels.media.tour32_export (falls back to media.directus_files_id.tour32_export) — web-stripped
```

### Booking — entire group web-stripped (backoffice-only)

```
booking->booking_channel : hotels.booking_partner (Directus scalar `booking_partner`, not the `booking` relation below)
booking->booking_partner->id : hotels.booking.id
booking->booking_partner->name : hotels.booking.name_agency
booking->id_service_provider_tour32 : hotels.id_tour_user
booking->id_main_service_provider_tour32 : hotels.haupt_id_tour_user
booking->res_phone : hotels.booking.phone_reservation
booking->email_booking : hotels.booking_email
booking->res_email2 : hotels.booking.email_reservation
booking->contact_title : hotels.booking.contact_title
booking->contact_greeting : hotels.booking.contact_greeting
booking->contact_firstname : hotels.booking.contact_first_name
booking->contact_name : hotels.booking.contact_name
booking->internal_remarks_reservation : hotels.booking.internal_remarks_reservation
booking->it_code : hotels.booking.it_code
```

### Operator

Not produced for hotels — no `operator` key in the hotel transformer's output.

### Pricing Config — entire group web-stripped (backoffice-only)

```
pricing_config->buy_price_type : hotels.hotel_prices.buy_price_type
pricing_config->sell_price_type : hotels.hotel_prices.sell_price_type
pricing_config->percentage_type : hotels.hotel_prices.percentage_type
pricing_config->provision_percentage : hotels.hotel_prices.provision_percentage (cast to Number)
pricing_config->margin_percentage : hotels.hotel_prices.margin_percentage (cast to Number)
pricing_config->exchange_rate : hotels.hotel_prices.exchange_rate (via toExchangeRateObject(), .rate cast to Number; `.id` is null — hotel_prices stores a bare decimal, no `rates`-collection relation)
pricing_config->from_price : hotels.hotel_prices.from_price.room_prices_translations.sell_price (hotel_prices' `from_price` M2O points at a room_prices row; its translated sell_price is used)
pricing_config->surcharge_percentage_type : hotels.surcharges.surcharge_percentage_type (service alias — hotels.service.js renames the `surcharges` relation to `surcharge_settings` before the transformer reads it; resolves to hotels_surcharges_translations)
pricing_config->surcharge_provision_percentage : hotels.surcharges.surcharge_provision_percentage (same alias; cast to Number)
pricing_config->surcharge_margin_percentage : hotels.surcharges.surcharge_margin_percentage (same alias; cast to Number)
pricing_config->surcharge_exchange_rate : hotels.surcharges.surcharge_exchange_rate (same alias; via toExchangeRateObject(), .rate cast to Number; `.id` is null — same bare-decimal case as exchange_rate above)
```

### Internal — entire group web-stripped (backoffice-only)

```
internal->internal_remarks : hotels.internal_remarks
internal->object_info_primarix : hotels.object_info
internal->location_tour32->id : hotels.location_tour32.id
internal->location_tour32->name : hotels.location_tour32.name
internal->sell_prices_status : hotels.sell_prices_status
internal->sell_prices_updated_at : hotels.sell_prices_updated_at
```

---

## Tours

Directus root collection: `tours`.

> Fixed this session: `id_service_provider_tour32`/`id_main_service_provider_tour32` were
> previously misnamed as `service_provider_id_tour32`/`main_service_provider_id_tour32`
> (the real tours field names) — corrected. `mobility_advice` previously assumed a
> nonexistent m2o relation copied from excursions; now correctly reads the flat text field
> `price_info_translations.mobility_advice_text` (same pattern as hotels/cruises — `id` is
> always `null` since tours has no real relation for this).

### Top-level

```
id : tours.id
object_id : tours.object_id
publishing_status : tours.status_primarix
date_updated : tours.date_updated
season->id : tours.season.id
season->name : tours.season.season
name : tours.descriptions_translations.name_tour (falls back to tours.name)
```
Web-stripped: `id`, `object_id`, `publishing_status`, `date_updated`, `name` (tours carry
title via the outer product envelope), plus whole `internal`/`booking`/`operator`/
`pricing_config` groups.

### Descriptions

```
descriptions->subline : tours.descriptions_translations.subline
descriptions->teaser : tours.descriptions_translations.teaser
descriptions->at_a_glance : tours.descriptions_translations.at_a_glance
descriptions->from_to : tours.descriptions_translations.from_to
descriptions->supplementary : tours.descriptions_translations.description_supplementary (via toSupplementaryBlocks())
descriptions->descriptions_markdown : (hardcoded null — not wired for tours)
```

### Classification

```
classification->destinations[]->id : tours.destinations.destinations_id.id
classification->destinations[]->name : tours.destinations.destinations_id.translations.name
classification->destinations[]->code : tours.destinations.destinations_id.media_code
classification->countries[]->id : tours.countries.countries_id.id
classification->countries[]->name : tours.countries.countries_id.translations.name
classification->countries[]->code : tours.countries.countries_id.ISO
classification->travel_categories[]->id : tours.travel_categories.travel_categories_id.id
classification->travel_categories[]->name : tours.travel_categories.travel_categories_id.translations.name (matched via languages_code, falls back to travel_categories_id.name)
classification->accommodation_types[]->id : tours.accommodation_types.accommodation_types_id.id
classification->accommodation_types[]->name : tours.accommodation_types.accommodation_types_id.label
```

### Attributes

```
attributes->children_free_age : tours.children_free_age (cast to Number)
attributes->children_free_number : tours.children_free_number (cast to Number)
attributes->participants_min : tours.participants_min (cast to Number)
attributes->participants_max : tours.participants_max (cast to Number)
attributes->week_min_before_start : tours.week_min_before_start (cast to Number)
```

### Price Info

```
price_info->services_included : tours.price_info_translations.services_included
price_info->services_not_included : tours.price_info_translations.services_not_included
price_info->services_optional : tours.price_info_translations.services_optional
price_info->service_highlights : tours.price_info_translations.service_highlights
price_info->deviating_cancellation_terms : tours.price_info_translations.deviating_cancellation_terms
price_info->important_information : tours.price_info_translations.important_information
price_info->departure : tours.price_info_translations.departure
price_info->children_policy : tours.price_info_translations.children_policy
price_info->participants_text : tours.price_info_translations.participants_text
price_info->mobility_advice->id : (hardcoded null — tours has no m2o relation; flat text field only)
price_info->mobility_advice->name : tours.price_info_translations.mobility_advice_text
price_info->supplementary : tours.price_info_translations.price_info_supplementary (via toSupplementaryBlocks())
price_info->price_info_markdown : (hardcoded null — not wired for tours)
```

### Categories & Prices

Built by `groupPrices2()`, joining `categories`, `price_periods`, `prices`, `occupancies`.

```
categories[]->type->id : tours.categories.tour_category_type.id
categories[]->type->name : tours.categories.tour_category_type.translations.name (falls back to .name)
categories[]->text : tours.categories.translations.category_text
categories[]->original : tours.categories.translations.category_original — web-stripped
categories[]->supplier_code : tours.categories.category_supplier_code — web-stripped
categories[]->from : tours.categories.category_from (coerced to boolean)
categories[]->periods[]->period->start : tours.price_periods.price_period_start
categories[]->periods[]->period->end : tours.price_periods.price_period_end
categories[]->periods[]->period->from : tours.price_periods.price_period_from (coerced to boolean)
categories[]->periods[]->prices[]->occupancy->id : tours.occupancies.occupancy.id (the transformer spreads ...o.occupancy, so id is the related occupancies record id — not the tours_occupancies junction row id)
categories[]->periods[]->prices[]->occupancy->name : tours.occupancies.occupancy.translations.name (falls back to occupancies.occupancy.name)
categories[]->periods[]->prices[]->sell : (hardcoded null — tours_prices has no sell-price column or translations table anywhere in Directus; schema limitation, not a code bug)
categories[]->periods[]->prices[]->buy : tours.prices.buy_price (parsed to float) — web-stripped
categories[]->periods[]->prices[]->margin : tours.price_calculation_translations.margin_percentage (same value on every row) — web-stripped
```

### Surcharges

The o2m alias on `tours` is `surcharges` (→ `tours_surcharges`), not `tours_surcharges`.

```
surcharges[]->booking_name : tours.surcharges.surcharge_booking_name
surcharges[]->description : tours.surcharges.translations.surcharge_description
surcharges[]->sell : (hardcoded null — tours_surcharges/tours_surcharges_translations have no sell-price column at all; schema limitation)
surcharges[]->type->id : tours.surcharges.surcharge_type.id — web-stripped
surcharges[]->type->name : tours.surcharges.surcharge_type.designation — web-stripped
surcharges[]->calculation_method->id : tours.surcharges.calculation_method.id — web-stripped
surcharges[]->calculation_method->name : tours.surcharges.calculation_method.designation — web-stripped
surcharges[]->buy : (hardcoded null — tours_surcharges has no buy_price column either; schema limitation)
surcharges[]->margin : tours.surcharges_calculation_translations.surcharge_margin_percentage — web-stripped
```

### Dates

```
dates->departures_text : tours.dates_translations.departures_text
dates->dates[]->available_from : tours.departure_times.available_from
dates->dates[]->available_to : tours.departure_times.available_to
dates->dates[]->frequency[]->id : tours.departure_times.departure_frequencies.trips_frequencies_id.id (null if legacy JSON format used)
dates->dates[]->frequency[]->name : tours.departure_times.departure_frequencies.trips_frequencies_id.name (or computed weekday label from legacy JSON via formatFrequencyName())
dates->dates[]->trip_duration : tours.departure_times.trip_duration
dates->dates[]->departure_place->id : tours.travel_routes[0].tour_departure.id (only the FIRST travel_routes entry is used, applied to every date)
dates->dates[]->departure_place->name : tours.travel_routes[0].tour_departure.translations.name (or raw travel_routes[0].from string as fallback)
dates->dates[]->departure_place->code : (hardcoded null)
dates->dates[]->arrival_place->id : tours.travel_routes[0].tour_arrival.id (same first-entry-only pattern)
dates->dates[]->arrival_place->name : tours.travel_routes[0].tour_arrival.translations.name
dates->dates[]->arrival_place->code : (hardcoded null)
```

### Flight Info

```
flight_info->flight_service->id : tours.flight_service.id
flight_info->flight_service->name : tours.flight_service.name
flight_info->airlines[]->id : tours.airlines.id (single m2o wrapped in a one-element array)
flight_info->airlines[]->name : tours.airlines.name
flight_info->departure_airports[]->id : tours.departure_airports.airports_id.id
flight_info->departure_airports[]->name : tours.departure_airports.airports_id.name
flight_info->flights_recommended : tours.descriptions_translations.flights_recommended
flight_info->additional_recommendations : tours.descriptions_translations.additional_recommendations
```

### Specials

```
specials->special_description : tours.specials_translations.specials (via extractSpecialsDescription())
```

### Image Badge

```
image_badge->teaser : tours.image_badge_translations.image_badge_teaser
image_badge->details : tours.image_badge_translations.image_badge_details
image_badge->start_date : tours.image_badge_start_date
image_badge->end_date : tours.image_badge_end_date
image_badge->status : tours.image_badge_status
```

### Media

```
media[] : tours.media.directus_files_id.* (via buildImageUrls())
```
Web-stripped from each item: `is_map`, `object_id_primarix`, `filename_fotoweb`, `use_tour32`.

### Internal — entire group web-stripped (backoffice-only)

```
internal->object_info_primarix : tours.object_info_primarix
internal->internal_remarks : tours.internal_remarks
internal->price_subline : tours.price_subline
internal->supplier_product_code : tours.supplier_product_code
internal->sell_prices_status : tours.sell_prices_status
internal->sell_prices_updated_at : tours.sell_prices_updated_at
```

### Booking — entire group web-stripped (backoffice-only)

```
booking->booking_channel : tours.booking_channel
booking->booking_partner->id : tours.booking_partner.id
booking->booking_partner->name : tours.booking_partner.name_agency
booking->id_service_provider_tour32 : tours.id_service_provider_tour32
booking->id_main_service_provider_tour32 : tours.id_main_service_provider_tour32
booking->res_phone : tours.booking_partner.phone_reservation
booking->res_email2 : tours.booking_partner.email_reservation
booking->email_booking : tours.email_booking
booking->contact_title : tours.booking_partner.contact_title
booking->contact_greeting : tours.booking_partner.contact_greeting
booking->contact_firstname : tours.booking_partner.contact_first_name
booking->contact_name : tours.booking_partner.contact_name
booking->internal_remarks_reservation : tours.internal_remarks_reservation
```

### Operator — entire group web-stripped (backoffice-only)

```
operator->operator_direct : tours.operator_direct
operator->operator_linked->id : tours.operator_linked.id
operator->operator_linked->name : tours.operator_linked.name_agency
operator->name_operator : tours.name_operator
operator->street : tours.street
operator->street_number : tours.street_number
operator->postcode : tours.postcode
operator->place->id : tours.place.id
operator->place->name : tours.place.translations.name
operator->place->code : (hardcoded null)
operator->state->id : tours.state.id
operator->state->name : tours.state.translations.name
operator->state->code : tours.state.ISO
operator->country->id : tours.country.id
operator->country->name : tours.country.translations.name
operator->country->code : tours.country.ISO
operator->location_tour32->id : tours.location_tour32.id
operator->location_tour32->name : tours.location_tour32.name
operator->phone_general : tours.phone_general
operator->phone_after_hours : tours.phone_after_hours
operator->email_general : tours.email_general
operator->website : tours.website
```

### Pricing Config — entire group web-stripped (backoffice-only)

```
pricing_config->buy_price_type : tours.price_calculation_translations.buy_price_type
pricing_config->sell_price_type : tours.price_calculation_translations.sell_price_type
pricing_config->percentage_type : tours.price_calculation_translations.percentage_type
pricing_config->provision_percentage : tours.price_calculation_translations.provision_percentage (cast to Number)
pricing_config->margin_percentage : tours.price_calculation_translations.margin_percentage (cast to Number)
pricing_config->exchange_rate : tours.price_calculation_translations.exchange_rate (via toExchangeRateObject(); this field's UI is a `rates`-collection picker — a `{key, collection:'rates'}` stub is resolved to a real `{id, currency, rate}` by enrichExchangeRates() in tours.service.js before the transformer runs, so `.id` can be non-null; a bare decimal here still yields `.id: null`)
pricing_config->from_price : tours.price_calculation_translations.from_price
pricing_config->surcharge_percentage_type : tours.surcharges_calculation_translations.surcharge_percentage_type
pricing_config->surcharge_provision_percentage : tours.surcharges_calculation_translations.surcharge_provision_percentage (cast to Number)
pricing_config->surcharge_margin_percentage : tours.surcharges_calculation_translations.surcharge_margin_percentage (cast to Number)
pricing_config->surcharge_exchange_rate : tours.surcharges_calculation_translations.surcharge_exchange_rate (via toExchangeRateObject(); same `rates`-collection picker/enrichExchangeRates() resolution as exchange_rate above, so `.id` can be non-null)
```

---

## Excursions

Directus root collection: `excursions`.

> Fixed this session: `service_provider_id_tour32`/`main_service_provider_id_tour32` were
> previously misnamed as `id_service_provider_tour32`/`id_main_service_provider_tour32`
> (the swap in the opposite direction from tours) — corrected.
>
> **Excursions is the one product type where `mobility_advice.id` is real** —
> `excursions.mobility_advice_text` is a genuine m2o relation to the shared
> `mobility_advice_text` collection, unlike hotels/tours/cruises/rental companies which only
> have a flat text field with no id.

### Top-level

```
id : excursions.id
object_id : excursions.object_id
publishing_status : excursions.status_primarix
date_updated : excursions.date_updated
name : excursions.descriptions_translations.name_excursion (falls back to excursions.name)
season->id : excursions.season.id
season->name : excursions.season.season
```
Web-stripped: `id`, `object_id`, `publishing_status`, `date_updated`, `name` (title travels
via the product envelope), plus whole `internal`/`booking`/`operator`/`pricing_config` groups.

### Classification

```
classification->destination->id : excursions.destination.id
classification->destination->name : excursions.destination.translations.name
classification->destination->code : excursions.destination.media_code
classification->countries[]->id : excursions.countries.countries_id.id
classification->countries[]->name : excursions.countries.countries_id.translations.name
classification->countries[]->code : excursions.countries.countries_id.ISO
classification->travel_categories[]->id : excursions.travel_categories.travel_categories_id.id
classification->travel_categories[]->name : excursions.travel_categories.travel_categories_id.name
```

### Descriptions

```
descriptions->subline : excursions.descriptions_translations.subline
descriptions->teaser : excursions.descriptions_translations.teaser
descriptions->programme_disclaimer : excursions.descriptions_translations.excursion_programme_disclaimer
descriptions->programme : excursions.descriptions_translations.excursion_programme
descriptions->recommendations : excursions.descriptions_translations.recommendations
descriptions->supplementary : excursions.descriptions_translations.description_supplementary (via toSupplementaryBlocks())
descriptions->descriptions_markdown : (hardcoded null)
```

### Price Info

```
price_info->services_included : excursions.price_infos_translations.services_included
price_info->services_not_included : excursions.price_infos_translations.services_not_included
price_info->additional_information : excursions.price_infos_translations.additional_information
price_info->deviating_cancellation_terms : excursions.price_infos_translations.deviating_cancellation_terms
price_info->children_policy : excursions.price_infos_translations.children_policy
price_info->participants_text : excursions.price_infos_translations.participants_text
price_info->mobility_advice->id : excursions.mobility_advice_text.id  (real relation id — see note above)
price_info->mobility_advice->name : excursions.mobility_advice_text.hotel_translations.hotel_mobility_advice_text
price_info->supplementary : excursions.price_infos_translations.price_info_supplementary (via toSupplementaryBlocks())
price_info->price_info_markdown : (hardcoded null)
```

### Attributes

```
attributes->children_free_age : excursions.children_free_age (cast to Number)
attributes->children_free_number : excursions.children_free_number (cast to Number)
attributes->participants_min : excursions.participants_min (cast to Number)
attributes->participants_max : excursions.participants_max (cast to Number)
attributes->week_min_before_start : excursions.week_min_before_start (cast to Number)
```

### Dates

```
dates->departures_text : excursions.dates_translations.departures_text
dates->dates[]->available_from : excursions.departure_times.available_from
dates->dates[]->available_to : excursions.departure_times.available_to
dates->dates[]->frequency[]->id : excursions.departure_times.departure_frequencies.trips_frequencies_id.id (null for legacy JSON format)
dates->dates[]->frequency[]->name : excursions.departure_times.departure_frequencies.trips_frequencies_id.name (or computed weekday label via formatFrequencyName())
dates->dates[]->departure_place->id : excursions.travel_routes[0].tour_departure.id (first entry only, applied to every date)
dates->dates[]->departure_place->name : excursions.travel_routes[0].tour_departure.translations.name
dates->dates[]->departure_place->code : (hardcoded null)
dates->dates[]->arrival_place->id : excursions.travel_routes[0].tour_arrival.id (first entry only)
dates->dates[]->arrival_place->name : excursions.travel_routes[0].tour_arrival.translations.name
dates->dates[]->arrival_place->code : (hardcoded null)
```

### Categories & Prices

```
categories[]->type->id : excursions.categories.excursion_category_type.id
categories[]->type->name : excursions.categories.excursion_category_type.name
categories[]->text : excursions.categories.translations.category_text
categories[]->original : excursions.categories.translations.category_original — web-stripped
categories[]->supplier_code : excursions.categories.category_supplier_code — web-stripped
categories[]->from : excursions.categories.category_from (coerced to boolean)
categories[]->periods[]->period->start : excursions.price_periods.price_period_start
categories[]->periods[]->period->end : excursions.price_periods.price_period_end
categories[]->periods[]->period->from : excursions.price_periods.price_period_from (coerced to boolean)
categories[]->periods[]->prices[]->price_category->id : excursions.price_categories.price_category.id (the transformer spreads ...pc.price_category, so id is the related price_categories record id — not the excursions_price_categories junction row id)
categories[]->periods[]->prices[]->price_category->name : excursions.price_categories.price_category.translations.name (falls back to .name)
categories[]->periods[]->prices[]->sell : (currently always null — KNOWN BUG, deferred: `excursions.prices.excursions_prices_translations.sell_price` does not resolve. The relation `excursions_prices_translations.excursions_prices_id` has `meta.one_field = "translations"` while the actual alias field on `excursions_prices` is named `excursions_prices_translations`, so Directus silently drops the nested expansion and the `sell_price` data (which exists in `excursions_prices_translations`) is never loaded)
categories[]->periods[]->prices[]->buy : excursions.prices.buy_price (parsed to float) — web-stripped
categories[]->periods[]->prices[]->margin : excursions.price_calculation_translations.margin_percentage (same value on every row) — web-stripped
```
Note: `buy` uses the hotels pattern (buy_price on the prices row, sell_price on a sibling
`*_translations` row). The `sell` leg is documented as a known bug above — the data model
has the column, but the alias mismatch in the live Directus relation metadata keeps it from
loading; hotels remains the only product type where sell is wired end-to-end today.

### Surcharges

The o2m alias on `excursions` is `surcharges_items` (→ `excursions_surcharges`), not
`surcharges`; fetched separately via the service's `SURCHARGE_FIELDS` query.

```
surcharges[]->booking_name : excursions.surcharges_items.translations.surcharge_booking_name
surcharges[]->description : excursions.surcharges_items.translations.surcharge_description
surcharges[]->sell : excursions.surcharges_items.translations.sell_price (parsed to float)
surcharges[]->type->id : excursions.surcharges_items.surcharge_type.id — web-stripped
surcharges[]->type->name : excursions.surcharges_items.surcharge_type.designation — web-stripped
surcharges[]->calculation_method->id : excursions.surcharges_items.calculation_method.id — web-stripped
surcharges[]->calculation_method->name : excursions.surcharges_items.calculation_method.designation — web-stripped
surcharges[]->buy : excursions.surcharges_items.buy_price (parsed to float) — web-stripped
surcharges[]->margin : excursions.surcharges_translations.surcharge_margin_percentage — web-stripped
```

### Specials

```
specials->special_description : excursions.specials_translations.specials (via extractSpecialsDescription())
```

### Image Badge

```
image_badge->teaser : excursions.image_badge_translations.image_badge_teaser
image_badge->details : excursions.image_badge_translations.image_badge_details
image_badge->start_date : excursions.image_badge_start_date
image_badge->end_date : excursions.image_badge_end_date
image_badge->status : excursions.image_badge_status
```

### Media

```
media[] : excursions.media.directus_files_id.* (via buildImageUrls())
```
Web-stripped from each item: `is_map`, `object_id_primarix`, `filename_fotoweb`, `use_tour32`.

### Internal — entire group web-stripped (backoffice-only)

```
internal->object_info_primarix : excursions.object_info_primarix
internal->internal_remarks : excursions.internal_remarks
internal->price_subline : excursions.price_subline
internal->supplier_product_code : excursions.supplier_product_code
internal->sell_prices_status : excursions.sell_prices_status
internal->sell_prices_updated_at : excursions.sell_prices_updated_at
```

### Booking — entire group web-stripped (backoffice-only)

```
booking->booking_channel : excursions.booking_channel
booking->booking_partner->id : excursions.booking_partner.id
booking->booking_partner->name : excursions.booking_partner.name_agency
booking->service_provider_id_tour32 : excursions.service_provider_id_tour32
booking->main_service_provider_id_tour32 : excursions.main_service_provider_id_tour32
booking->res_phone : excursions.booking_partner.phone_reservation
booking->res_email2 : excursions.booking_partner.email_reservation
booking->email_booking : excursions.email_booking
booking->contact_title : excursions.booking_partner.contact_title
booking->contact_greeting : excursions.booking_partner.contact_greeting
booking->contact_firstname : excursions.booking_partner.contact_first_name
booking->contact_name : excursions.booking_partner.contact_name
booking->internal_remarks_reservation : excursions.internal_remarks_reservation
```

### Operator — entire group web-stripped (backoffice-only)

```
operator->operator_direct : excursions.operator_direct
operator->operator_linked->id : excursions.operator_linked.id
operator->operator_linked->name : excursions.operator_linked.name_agency
operator->name_operator : excursions.name_operator
operator->street : excursions.street
operator->street_number : excursions.street_number
operator->postcode : excursions.postcode
operator->place->id : excursions.place.id
operator->place->name : excursions.place.translations.name
operator->place->code : (hardcoded null)
operator->state->id : excursions.state.id
operator->state->name : excursions.state.translations.name
operator->state->code : excursions.state.ISO
operator->country->id : excursions.country.id
operator->country->name : excursions.country.translations.name
operator->country->code : excursions.country.ISO
operator->location_tour32->id : excursions.location_tour32.id
operator->location_tour32->name : excursions.location_tour32.name (no translations relation on location_tour32; raw name field)
operator->phone_general : excursions.phone_general
operator->phone_after_hours : excursions.phone_after_hours
operator->email_general : excursions.email_general
operator->website : excursions.website
```

### Pricing Config — entire group web-stripped (backoffice-only)

```
pricing_config->buy_price_type : excursions.price_calculation_translations.buy_price_type
pricing_config->sell_price_type : excursions.price_calculation_translations.sell_price_type
pricing_config->percentage_type : excursions.price_calculation_translations.percentage_type
pricing_config->provision_percentage : excursions.price_calculation_translations.provision_percentage (cast to Number)
pricing_config->margin_percentage : excursions.price_calculation_translations.margin_percentage (cast to Number)
pricing_config->exchange_rate : excursions.price_calculation_translations.exchange_rate (via toExchangeRateObject(); same `rates`-collection picker as tours — enrichExchangeRates() in excursions.service.js resolves a `{key, collection:'rates'}` stub to a real `{id, currency, rate}`, so `.id` can be non-null; a bare decimal here still yields `.id: null`)
pricing_config->from_price : excursions.price_calculation_translations.from_price (cast to Number)
pricing_config->surcharge_percentage_type : excursions.surcharges_translations.surcharge_percentage_type
pricing_config->surcharge_provision_percentage : excursions.surcharges_translations.surcharge_provision_percentage (cast to Number)
pricing_config->surcharge_margin_percentage : excursions.surcharges_translations.surcharge_margin_percentage (cast to Number)
pricing_config->surcharge_exchange_rate : excursions.surcharges_translations.surcharge_exchange_rate (via toExchangeRateObject(); same `rates`-collection picker/enrichExchangeRates() resolution as exchange_rate above, so `.id` can be non-null)
```

---

## Cruises

Directus root collection: `cruises`.

> Fixed this session (schema drift): (1) `cruises.special_valid_from`/`special_valid_to`
> top-level columns no longer exist — the validity window now comes from
> `cruises_specials_translations.specials` (a JSON array of `{name, special_description,
> special_valid_from, special_valid_to}` entries), read via `extractSpecialsValidity()`.
> (2) `cruise_occupancies` no longer has a translations relation — occupancy naming is now
> a flat `name` field read directly, not via `.translations`.

### Top-level

```
id : cruises.id
object_id : cruises.object_id
publishing_status : cruises.status_primarix
date_updated : cruises.date_updated
season->id : cruises.season.id
season->name : cruises.season.season
name : cruises.price_infos_translations.name_cruise
```
Web-stripped: `id`, `object_id`, `publishing_status`, `date_updated`, plus whole
`internal`/`pricing_config` groups. `name` is retained for cruises.

### Classification

```
classification->countries[]->id : cruises.countries.countries_id.id
classification->countries[]->name : cruises.countries.countries_id.translations.name
classification->countries[]->code : cruises.countries.countries_id.ISO
classification->destinations[]->id : cruises.destinations.destinations_id.id
classification->destinations[]->name : cruises.destinations.destinations_id.translations.name
classification->destinations[]->code : cruises.destinations.destinations_id.media_code
classification->cruise_types[]->id : cruises.cruise_types.cruise_types_id.id
classification->cruise_types[]->name : cruises.cruise_types.cruise_types_id.name
```

### Descriptions

```
descriptions->headline : cruises.descriptions_translations.headline
descriptions->subline : cruises.descriptions_translations.subline
descriptions->teaser : cruises.descriptions_translations.teaser
descriptions->ship : cruises.descriptions_translations.ship
descriptions->at_a_glance : cruises.descriptions_translations.at_a_glance
```

### Programme

```
programme->days[]->day_destinations : cruises.programme_translations.programme (JSON repeater column — per-entry key `day_destinations`)
programme->days[]->day_description : cruises.programme_translations.programme (JSON repeater column — per-entry key `day_description`)
programme->days[]->day_accommodation_note : cruises.programme_translations.programme (JSON repeater column — per-entry key `day_accommodation_note`)
```

### Price Info

```
price_info->departure_arrival : cruises.price_infos_translations.departure_arrival
price_info->bord_languages : cruises.price_infos_translations.bord_languages (normalized to array)
price_info->bord_languages_additions : cruises.price_infos_translations.bord_languages_additions
price_info->surcharges : cruises.price_infos_translations.surcharges (free-text field — cruises have no surcharges array)
price_info->services_included : cruises.price_infos_translations.services_included
price_info->services_not_included : cruises.price_infos_translations.services_not_included
price_info->onboard_gratuities[]->text : cruises.price_infos_translations.onboard_gratuities (string[] wrapped as {text} objects)
price_info->onboard_gratuities_additions : cruises.price_infos_translations.onboard_gratuities_additions
price_info->important_information : cruises.price_infos_translations.important_information
price_info->good_to_know : cruises.price_infos_translations.good_to_know
price_info->occupancy_single : cruises.price_infos_translations.occupancy_single
price_info->participants_legacy : cruises.price_infos_translations.participants_legacy
price_info->deviating_cancellation_terms_select[]->value : cruises.price_infos_translations.deviating_cancellation_terms_selector (falls back to legacy deviating_cancellation_terms)
price_info->deviating_cancellation_terms_text : cruises.price_infos_translations.deviating_cancellation_terms_text (falls back to legacy deviating_cancellation_terms_additions)
price_info->mobility_advice->id : (hardcoded null — cruises has no m2o relation; flat text field only)
price_info->mobility_advice->name : cruises.price_infos_translations.mobility_advice_text
```

### Attributes

```
attributes->participants_min : cruises.participants_min (cast to Number)
attributes->participants_max : cruises.participants_max (cast to Number)
attributes->week_min_before_start : cruises.week_min_before_start (cast to Number)
```

### Cabin Categories & Prices

Built by `groupPrices2()`, joining `cabin_categories`, `price_dates`, `prices`, `occupancies`.

```
cabin_categories[]->category->id : cruises.cabin_categories.cabin_category.id
cabin_categories[]->category->name : cruises.cabin_categories.cabin_category.name
cabin_categories[]->additions : cruises.cabin_categories.translations.cabin_category_additions
cabin_categories[]->description : cruises.cabin_categories.translations.cabin_category_description
cabin_categories[]->booking_code : cruises.cabin_categories.cabin_category_booking_code — web-stripped
cabin_categories[]->tour32_name : cruises.cabin_categories.cabin_category_tour32_name — web-stripped
cabin_categories[]->from : cruises.cabin_categories.cabin_category_from (coerced to boolean)
cabin_categories[]->sailings[]->date_departure : cruises.price_dates.date_departure
cabin_categories[]->sailings[]->date_arrival : cruises.price_dates.date_arrival
cabin_categories[]->sailings[]->frequency[]->id : cruises.price_dates.departure_frequencies.cruises_frequencies_id.id
cabin_categories[]->sailings[]->frequency[]->name : cruises.price_dates.departure_frequencies.cruises_frequencies_id.name
cabin_categories[]->sailings[]->prices[]->occupancy->id : cruises.occupancies.occupancy.id (the transformer spreads ...o.occupancy, so id is the related cruise_occupancies record id — not the cruises_occupancies junction row id; groupPrices2() resolves occ.id ?? occ.value and the spread's id wins)
cabin_categories[]->sailings[]->prices[]->occupancy->name : cruises.occupancies.occupancy.name (flat field — no translations relation exists; fixed this session)
cabin_categories[]->sailings[]->prices[]->sell : (hardcoded null — cruises_prices has no sell-price column or translations table; schema limitation)
cabin_categories[]->sailings[]->prices[]->buy : cruises_prices.buy_price (separate query on the `cruises_prices` collection filtered by `cruises_id`, joined into sailings; parsed to float) — web-stripped
cabin_categories[]->sailings[]->prices[]->margin : cruises.price_calculation[0].margin_percentage (same value on every row) — web-stripped
```

### Specials

```
specials->special_description : cruises.specials_translations.specials (JSON array; extractSpecialsDescription())
specials->valid_from : cruises.specials_translations.specials (JSON repeater column — per-entry key `special_valid_from`; extractSpecialsValidity() walks the array and returns the FIRST entry where either special_valid_from or special_valid_to is non-null; fixed this session — the old top-level cruises.special_valid_from/to columns no longer exist)
specials->valid_to : cruises.specials_translations.specials (JSON repeater column — per-entry key `special_valid_to`; same winning entry as valid_from)
```

### Image Badge

```
image_badge->teaser : cruises.image_badge_translations.image_badge_teaser
image_badge->details : cruises.image_badge_translations.image_badge_details
image_badge->start_date : cruises.image_badge_start_date
image_badge->end_date : cruises.image_badge_end_date
image_badge->status : cruises.image_badge_status
```

### Media

```
media[] : cruises.media.directus_files_id.* (via buildImageUrls())
```
Web-stripped from each item: `is_map`, `object_id_primarix`, `filename_fotoweb`, `use_tour32`.

### Pricing Config — entire group web-stripped (backoffice-only)

```
pricing_config->buy_price_type : cruises.price_calculation[0].buy_price_type
pricing_config->sell_price_type : cruises.price_calculation[0].sell_price_type
pricing_config->percentage_type : cruises.price_calculation[0].percentage_type
pricing_config->provision_percentage : cruises.price_calculation[0].provision_percentage (cast to Number)
pricing_config->margin_percentage : cruises.price_calculation[0].margin_percentage (cast to Number)
pricing_config->exchange_rate : cruises.price_calculation[0].exchange_rate (via toExchangeRateObject(); `.id` is null here — cruises stores a bare decimal, no `rates`-collection relation)
pricing_config->from_price : cruises.price_calculation[0].from_price (fixed this session — no longer falls back to price_calculation[0].translations.sell_price)
```

### Internal — entire group web-stripped (backoffice-only)

```
internal->object_info_primarix : cruises.object_info_primarix
internal->travel_id_karawane : cruises.travel_id_karawane
internal->id_tour32 : cruises.id_tour32
internal->real_url : cruises.real_url
internal->sell_prices_status : cruises.sell_prices_status
internal->sell_prices_updated_at : cruises.sell_prices_updated_at
```

---

## Rental Cars

Directus root collection: `vehicles` (filtered `rental_type: 'car'`).

### Top-level

```
id : vehicles.id
object_id : vehicles.object_id
publishing_status : vehicles.status_primarix
date_updated : vehicles.date_updated
season->id : vehicles.rental_company.season.id (fixed this session — was hardcoded null)
season->name : vehicles.rental_company.season.season
name : vehicles.name_vehicle
rental_type : vehicles.rental_type
category->id : vehicles.category.id
category->name : vehicles.category.name
supplier_product_code : vehicles.supplier_product_code
depot_availability : vehicles.depot_availability
sell_prices_status : vehicles.rental_company.sell_prices_status
sell_prices_updated_at : vehicles.rental_company.sell_prices_updated_at
```
Web-stripped: `pricing_config`, `internal`, `booking`, `operator` groups, plus
`sell_prices_status`, `sell_prices_updated_at`, `id`, `object_id`, `publishing_status`,
`date_updated`, `supplier_product_code`, `rental_type`, `name` (title travels via envelope).

### Attributes

```
attributes->drive_type : vehicles.drive_type
attributes->persons_max : vehicles.persons_max (cast to Number)
attributes->suitcase_big : vehicles.suitcase_big (cast to Number)
attributes->suitcase_small : vehicles.suitcase_small (cast to Number)
```

### Descriptions

```
descriptions->subline : vehicles.descriptions_translations.subline
descriptions->teaser : vehicles.descriptions_translations.teaser
descriptions->description : vehicles.descriptions_translations.description
descriptions->equipment : vehicles.descriptions_translations.equipment
descriptions->bond : vehicles.descriptions_translations.bond
descriptions->supplementary : vehicles.descriptions_translations.description_supplementary (via toSupplementaryBlocks())
descriptions->descriptions_markdown : (hardcoded null)
```

### Rental Company

```
rental_company->name_company : vehicles.rental_company.name_company
rental_company->rental_type : vehicles.rental_company.rental_type
rental_company->street : vehicles.rental_company.street
rental_company->street_number : vehicles.rental_company.street_number
rental_company->zip_code : vehicles.rental_company.zip_code
rental_company->place->id : vehicles.rental_company.place.id
rental_company->place->name : vehicles.rental_company.place.translations.name (falls back to .name)
rental_company->place->code : (hardcoded null — `places` has no ISO column; the shared geoRef() reads `.ISO` on the place object, which is always undefined → null. country/state codes below DO resolve via `.ISO`)
rental_company->state->id : vehicles.rental_company.state.id
rental_company->state->name : vehicles.rental_company.state.translations.name (falls back to .name)
rental_company->state->code : vehicles.rental_company.state.ISO
rental_company->country->id : vehicles.rental_company.country.id
rental_company->country->name : vehicles.rental_company.country.translations.name (falls back to .name)
rental_company->country->code : vehicles.rental_company.country.ISO
rental_company->phone_general : vehicles.rental_company.phone_general
rental_company->phone_after_hours : vehicles.rental_company.phone_after_hours
rental_company->email_general : vehicles.rental_company.email_general
rental_company->website : vehicles.rental_company.website
rental_company->countries[]->id : vehicles.rental_company.countries.countries_id.id
rental_company->countries[]->name : vehicles.rental_company.countries.countries_id.translations.name
rental_company->countries[]->code : vehicles.rental_company.countries.countries_id.ISO
rental_company->subline : vehicles.rental_company.descriptions_translations.subline
rental_company->teaser : vehicles.rental_company.descriptions_translations.teaser
rental_company->text_positive : vehicles.rental_company.descriptions_translations.text_positive
rental_company->text_negative : vehicles.rental_company.descriptions_translations.text_negative
rental_company->description_supplementary : vehicles.rental_company.descriptions_translations.description_supplementary (via toSupplementaryBlocks())
rental_company->location_tour32->id : vehicles.rental_company.location_tour32.id — web-stripped
rental_company->location_tour32->name : vehicles.rental_company.location_tour32.name — web-stripped
rental_company->object_info_primarix : vehicles.rental_company.object_info_primarix — web-stripped
rental_company->internal_remarks : vehicles.rental_company.internal_remarks — web-stripped
rental_company->booking_channel : vehicles.rental_company.booking_channel — web-stripped
rental_company->booking_partner->id : vehicles.rental_company.booking_partner.id — web-stripped
rental_company->booking_partner->name : vehicles.rental_company.booking_partner.name_agency — web-stripped
rental_company->email_booking : vehicles.rental_company.email_booking — web-stripped
rental_company->internal_remarks_reservation : vehicles.rental_company.internal_remarks_reservation — web-stripped
```

### Rental Company → Conditions

```
rental_company->conditions->minimum_rental_days : vehicles.rental_company.minimum_rental_days (cast to Number)
rental_company->conditions->conditions_calculation_day : vehicles.rental_company.conditions_calculation_day
rental_company->conditions->conditions_calculation_season : vehicles.rental_company.conditions_calculation_season
rental_company->conditions->conditions_driver : vehicles.rental_company.conditions_translations.conditions_driver
rental_company->conditions->conditions_licence : vehicles.rental_company.conditions_translations.conditions_licence
rental_company->conditions->conditions_calculation : vehicles.rental_company.conditions_translations.conditions_calculation
rental_company->conditions->conditions_oneway : vehicles.rental_company.conditions_translations.conditions_oneway
rental_company->conditions->has_multi_rental_discount : vehicles.rental_company.has_multi_rental_discount (coerced to boolean)
rental_company->conditions->conditions_multi_rental_discount : vehicles.rental_company.conditions_translations.conditions_multi_rental_discount
rental_company->conditions->conditions_restricted_area : vehicles.rental_company.conditions_translations.conditions_restricted_area
rental_company->conditions->conditions_border_crossing : vehicles.rental_company.conditions_translations.conditions_border_crossing
rental_company->conditions->conditions_insurance : vehicles.rental_company.conditions_translations.conditions_insurance
rental_company->conditions->conditions_insurance_options : vehicles.rental_company.conditions_translations.conditions_insurance_options
rental_company->conditions->conditions_all_inclusive : vehicles.rental_company.conditions_translations.conditions_all_inclusive
rental_company->conditions->conditions_insurance_exclusions : vehicles.rental_company.conditions_translations.conditions_insurance_exclusions
rental_company->conditions->conditions_deposit : vehicles.rental_company.conditions_translations.conditions_deposit
rental_company->conditions->minimum_rental_text : vehicles.rental_company.conditions_translations.minimum_rental_text
rental_company->conditions->conditions_notes : vehicles.rental_company.conditions_translations.conditions_notes
rental_company->conditions->supplementary : vehicles.rental_company.conditions_translations.conditions_supplementary (via toSupplementaryBlocks())
rental_company->conditions->conditions_markdown : (hardcoded null)
```

### Rental Company → Price Info

```
rental_company->price_info->price_type : vehicles.rental_company.price_infos_translations.price_type
rental_company->price_info->flex_price_text : vehicles.rental_company.price_infos_translations.flex_price_text
rental_company->price_info->services_included : vehicles.rental_company.price_infos_translations.services_included
rental_company->price_info->services_not_included : vehicles.rental_company.price_infos_translations.services_not_included
rental_company->price_info->services_optional : vehicles.rental_company.price_infos_translations.services_optional
rental_company->price_info->deviating_cancellation_terms : vehicles.rental_company.price_infos_translations.deviating_cancellation_terms
rental_company->price_info->important_information : vehicles.rental_company.price_infos_translations.important_information
rental_company->price_info->supplementary : vehicles.rental_company.price_infos_translations.price_infos_supplementary (via toSupplementaryBlocks())
rental_company->price_info->price_info_markdown : (hardcoded null)
rental_company->price_info->mobility_advice->id : (hardcoded null — no m2o relation for rental companies)
rental_company->price_info->mobility_advice->name : vehicles.rental_company.price_infos_translations.mobility_advice_text
```

### Depots

```
depots[]->name_depot : vehicles.depots_selected.rental_depots_id.name_depot
depots[]->category->id : vehicles.depots_selected.rental_depots_id.category.id
depots[]->category->name : vehicles.depots_selected.rental_depots_id.category.name
depots[]->rental_zone->id : vehicles.depots_selected.rental_depots_id.rental_zone.id
depots[]->rental_zone->name : vehicles.depots_selected.rental_depots_id.rental_zone.name
depots[]->street : vehicles.depots_selected.rental_depots_id.street
depots[]->street_number : vehicles.depots_selected.rental_depots_id.street_number
depots[]->zip_code : vehicles.depots_selected.rental_depots_id.zip_code
depots[]->place : vehicles.depots_selected.rental_depots_id.place.{id,translations.name}
depots[]->state : vehicles.depots_selected.rental_depots_id.state.{id,ISO,translations.name}
depots[]->country : vehicles.depots_selected.rental_depots_id.country.{id,ISO,translations.name}
depots[]->phone_general : vehicles.depots_selected.rental_depots_id.phone_general
depots[]->email : vehicles.depots_selected.rental_depots_id.email
depots[]->office_hours_deviating : rental_depots.office_hours_translations.office_hours_deviating — fetched via a separate knex query (no Directus relation graph path exists), attached per-depot before shaping
depots[]->object_id : vehicles.depots_selected.rental_depots_id.object_id — web-stripped
depots[]->status : vehicles.depots_selected.rental_depots_id.status_primarix — web-stripped
depots[]->rental_company->id : vehicles.depots_selected.rental_depots_id.rental_company.id (fixed this session — was the vehicle's own rental_company, a cross-entity substitution; a depot's rental_company can differ from its parent vehicle's) — web-stripped
depots[]->rental_company->name : vehicles.depots_selected.rental_depots_id.rental_company.name_company (fixed this session, see above) — web-stripped
```

### Zones & Prices

Built by `buildRentalZones()`, joining `zones`, `price_periods`, `rental_periods`, `prices`.
None of these are o2m aliases on `vehicles` — the service fetches each via its own
`ItemsService` query (on `vehicles_rental_zones`, `vehicles_price_periods`,
`vehicles_rental_periods`, `vehicles_prices`, `vehicles_price_calculation`) and joins them.

```
zones[]->zone->id : vehicles.depots_selected.rental_depots_id.rental_zone.id (fixed this session — was vehicles_rental_zones.id via a separate query keyed off vehicles_prices.rental_zone, which is frequently null even when the vehicle's depots each have a real, distinct rental_zone; the depot-sourced zone now wins and takes precedence in the zone lookup)
zones[]->zone->name : vehicles.depots_selected.rental_depots_id.rental_zone.name (see note above)
> Array coverage: every zone found across the vehicle's depots_selected now gets its own
> entry in `zones[]` (with `periods: []` if no price row carries that zone id), instead of
> only zones that happen to appear in vehicles_prices.rental_zone.
zones[]->periods[]->period->start : vehicles_price_periods.price_period_start (separate query)
zones[]->periods[]->period->end : vehicles_price_periods.price_period_end
zones[]->periods[]->period->from : vehicles_price_periods.price_period_from (coerced to boolean)
zones[]->periods[]->prices[]->depot_category->id : vehicles_rental_periods.rental_period_depot_category.id (separate query)
zones[]->periods[]->prices[]->depot_category->name : vehicles_rental_periods.rental_period_depot_category.name
zones[]->periods[]->prices[]->duration_min : vehicles_rental_periods.rental_period_min (cast to Number)
zones[]->periods[]->prices[]->duration_max : vehicles_rental_periods.rental_period_max (cast to Number)
zones[]->periods[]->prices[]->duration_label : vehicles_rental_periods.rental_period_duration
zones[]->periods[]->prices[]->duration_from : vehicles_rental_periods.rental_period_from (coerced to boolean)
zones[]->periods[]->prices[]->sell : (hardcoded null — vehicles_prices has no sell_price column anywhere in Directus; schema limitation)
zones[]->periods[]->prices[]->buy : vehicles_prices.buy_price (parsed to float) — web-stripped
zones[]->periods[]->prices[]->margin : vehicles_price_calculation.margin_percentage (same value on every row) — web-stripped
```

### Surcharges

Fetched via a separate query on `vehicles_surcharges` (filtered by the vehicle's
`rental_company`), not an o2m alias on `vehicles`.

```
surcharges[]->booking_name : vehicles_surcharges.surcharge_booking_name (separate query)
surcharges[]->description : vehicles_surcharges.surcharge_translations.surcharge_description
surcharges[]->sell : (hardcoded null — no sell column on vehicles_surcharges/surcharge_translations)
surcharges[]->type->id : (hardcoded null — surcharge_type is a plain string, not a relation)
surcharges[]->type->name : vehicles_surcharges.surcharge_type
surcharges[]->calc_type->id : (hardcoded null) — web-stripped
surcharges[]->calc_type->name : vehicles_surcharges.surcharge_calc_type — web-stripped
surcharges[]->buy : (hardcoded null — vehicles_surcharges has no buy_price column) — web-stripped
surcharges[]->margin : vehicles_surcharges_calculation.surcharge_margin_percentage (separate query) — web-stripped
```

### Specials

```
specials->special_description : vehicles.rental_company.specials_translations.specials (via extractSpecialsDescription())
```

### Image Badge

```
image_badge->teaser : vehicles.image_badge_translations.image_badge_teaser
image_badge->details : vehicles.image_badge_translations.image_badge_details
image_badge->start_date : vehicles.image_badge_start_date
image_badge->end_date : vehicles.image_badge_end_date
image_badge->status : vehicles.image_badge_status
```

### Media

```
media[] : vehicles.media.directus_files_id.* (via buildImageUrls())
```
Web-stripped from each item: `is_map`, `object_id_primarix`, `filename_fotoweb`, `use_tour32`.

### Rental Car Conditions

```
rental_car->conditions_hotel_delivery : vehicles.rental_company.conditions_translations.conditions_hotel_delivery
rental_car->conditions_pickup_airport_ferry : vehicles.rental_company.conditions_translations.conditions_pickup_airport_ferry
rental_car->conditions_toll : vehicles.rental_company.conditions_translations.conditions_toll
rental_car->conditions_ferry : vehicles.rental_company.conditions_translations.conditions_ferry
```

### Pricing Config — entire group web-stripped (backoffice-only)

Both settings rows are fetched via separate queries (on `vehicles_price_calculation` and
`vehicles_surcharges_calculation`, filtered by `vehicle_id`) — not aliases on `vehicles`.

```
pricing_config->buy_price_type : vehicles_price_calculation.buy_price_type (separate query)
pricing_config->sell_price_type : vehicles_price_calculation.sell_price_type
pricing_config->percentage_type : vehicles_price_calculation.percentage_type
pricing_config->provision_percentage : vehicles_price_calculation.provision_percentage (cast to Number)
pricing_config->margin_percentage : vehicles_price_calculation.margin_percentage (cast to Number)
pricing_config->exchange_rate->id : (hardcoded null via toExchangeRateObject() — vehicles_price_calculation.exchange_rate is a bare decimal, no `rates`-collection relation)
pricing_config->exchange_rate->currency : (resolved from the family's exchange_rate_presets default-locale text — rental_car_other_default_locale / camper_other_default_locale, format "<locale> : <FROM>=><TO>@<rate>" — matched by rate to the stored decimal, using the TO currency; else null)
pricing_config->exchange_rate->rate : vehicles_price_calculation.exchange_rate (cast to Number)
pricing_config->from_price : vehicles_price_calculation.from_price (cast to Number)
pricing_config->surcharge_percentage_type : vehicles_surcharges_calculation.surcharge_percentage_type (separate query)
pricing_config->surcharge_provision_percentage : vehicles_surcharges_calculation.surcharge_provision_percentage (cast to Number)
pricing_config->surcharge_margin_percentage : vehicles_surcharges_calculation.surcharge_margin_percentage (cast to Number)
pricing_config->surcharge_exchange_rate->id : (hardcoded null via toExchangeRateObject() — vehicles_surcharges_calculation.surcharge_exchange_rate is a bare decimal, no `rates`-collection relation)
pricing_config->surcharge_exchange_rate->currency : (resolved from the family's exchange_rate_presets default-locale text — rental_car_other_default_locale / camper_other_default_locale, format "<locale> : <FROM>=><TO>@<rate>" — matched by rate to the stored decimal, using the TO currency; else null)
pricing_config->surcharge_exchange_rate->rate : vehicles_surcharges_calculation.surcharge_exchange_rate (cast to Number)
```

---

## Campers

Directus root collection: `vehicles` (filtered `rental_type: 'camper'`). Campers reuse most
of rental cars' builder functions (`buildRentalZones`, `shapeRentalSurcharges`,
`shapeRentalCompany`, `shapeDepot`, `getCompanyConditionsRow`, `geoRef`,
`toExchangeRateObject`) from `rental_car.transformer.js` — every mapping in those shared
groups is identical to the rental cars section above except where noted.

### Top-level

```
id : vehicles.id
object_id : vehicles.object_id
publishing_status : vehicles.status_primarix
date_updated : vehicles.date_updated
season->id : vehicles.rental_company.season.id (fixed this session — was hardcoded null)
season->name : vehicles.rental_company.season.season
name : vehicles.name_vehicle
rental_type : vehicles.rental_type — web-stripped
supplier_product_code : vehicles.supplier_product_code — web-stripped
depot_availability : vehicles.depot_availability
sell_prices_status : vehicles.rental_company.sell_prices_status — web-stripped
sell_prices_updated_at : vehicles.rental_company.sell_prices_updated_at — web-stripped
```

### Classification

```
category->id : vehicles.category.id
category->name : vehicles.category.name
```

### Attributes

```
attributes->drive_type : vehicles.drive_type
attributes->persons_max : vehicles.persons_max (cast to Number)
attributes->suitcase_big : vehicles.suitcase_big (cast to Number)
attributes->suitcase_small : vehicles.suitcase_small (cast to Number)
```

### Descriptions

```
descriptions->subline : vehicles.descriptions_translations.subline
descriptions->teaser : vehicles.descriptions_translations.teaser
descriptions->description : vehicles.descriptions_translations.description
descriptions->equipment : vehicles.descriptions_translations.equipment
descriptions->bond : vehicles.descriptions_translations.bond
descriptions->supplementary : vehicles.descriptions_translations.description_supplementary (via toSupplementaryBlocks())
descriptions->descriptions_markdown : (hardcoded null)
```

### Camper-Specific Details

```
camper->bedsize : vehicles.descriptions_translations.bedsize (camper-only translation field)
camper->camping_equipment : vehicles.descriptions_translations.camping_equipment (camper-only translation field)
camper->conditions_towaway : vehicles.rental_company.conditions_translations.conditions_towaway (shared getCompanyConditionsRow(); same source row rental_cars uses for its `rental_car` group, surfaced standalone here instead)
```

### Rental Company (shared with rental_cars — same mapping as above)

All `rental_company->*` and `rental_company->conditions->*` / `rental_company->price_info->*`
mappings are identical to the Rental Cars section, including
`rental_company->price_info->mobility_advice->id` being hardcoded null (no real relation).
One difference: camper's `rental_company->conditions` does not surface
`conditions_hotel_delivery`/`conditions_pickup_airport_ferry`/`conditions_toll`/
`conditions_ferry` (those stay rental_car-only); campers instead surface
`conditions_towaway` under the top-level `camper` group (see above).

### Depots, Zones & Prices, Surcharges, Specials, Image Badge, Media

Identical mapping to the Rental Cars section (shared functions `shapeDepot()`,
`buildRentalZones()`, `shapeRentalSurcharges()`) — same hardcoded-null sell/buy/type
limitations apply (no sell-price column anywhere in the vehicles pricing schema).

### Pricing Config — entire group web-stripped (backoffice-only)

Identical mapping to the Rental Cars section.

---

## Cross-cutting notes

- **Sell price is only modeled end-to-end for Hotels today.** Excursions have the
  `sell_price` column in `excursions_prices_translations`, but it never loads — the
  relation metadata (`excursions_prices_translations.excursions_prices_id` →
  `meta.one_field = "translations"`) doesn't match the actual alias field
  (`excursions_prices_translations`), so the nested query is silently dropped and `sell`
  stays `null` (known bug, deferred). Tours, Cruises, Rental Cars, and Campers have no
  sell-price column or translations table at all — `sell` is hardcoded `null` for those
  four product types until a schema change adds one. This is a data-model gap, not a code
  defect.
- **`mobility_advice.id` is only ever real for Excursions** (genuine m2o relation to the
  shared `mobility_advice_text` collection). Hotels, Tours, Cruises, and Rental
  Companies/Campers only have a flat per-language text field with no relation, so `id` is
  correctly `null` for those — this is expected behavior per the current schema, not a bug
  (hotels' flat-text field is populated by a Directus Flow).
- **`/products/full` field selection is now schema-validated** for every product type
  (routed through the same `buildDetailFields()` + `DETAIL_RELATIONS` mechanism each type's
  own `/{id}` endpoint already used) instead of raw static field lists — a renamed/removed
  Directus field now degrades to "missing from that record" instead of 403-ing the entire
  aggregated endpoint for all six product types at once.
