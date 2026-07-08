# Staging — Sidebar Color for Global_Data / Hotels_Metadata / trips_meta Trees

**Target:** `directus-staging` MCP server **only**.
**Applied:** 2026-07-08
**Type:** Meta-only cosmetic change (`meta.color`) — no schema, fields, or flows touched.

## Goal
Give the three root data-model groups `Global_Data`, `Hotels_Metadata`, and `trips_meta`, plus **every collection nested under them at any depth**, a consistent sidebar color of `#6B7785`.

## Scope decision
User confirmed recursive scope (all descendants, not just direct children) via clarifying question.

## What changed
71 collections had `meta.color` set to `#6B7785`. Before the change:
- `Global_Data`, `Hotels_Metadata`, `trips_meta`, `agencies` were already `#6B7785` (no-op, left as is).
- `travel_categories` and `trips_frequencies` were `#7B61FF` → changed to `#6B7785`.
- All other 69 collections listed below had `color: null` → changed to `#6B7785`.

### Full list of collections updated (color set to `#6B7785`)
Geographies, accommodation_types, activities, airlines, airports, booking_details, booking_partners, calculation_method, catering_services, countries, countries_translations, currencies, destinations, destinations_cluster, destinations_cluster_translations, destinations_translations, erp_hotel_destination_exceptions, erp_hotel_destination_exceptions_translations, exchange_rate_presets, exchange_rate_presets_translations, excursion_category_types, excursion_price_categories_names, flight_options, global_configurations, hotel_classifications, hotel_group, hotels_accommodation_types, hotels_accommodation_types_1, hotels_activities, hotels_activities_1, hotels_occupancies, hotels_partner, input_lists, locations_tour32, locations_tour32_translations, mandatory, margin_preset, margin_presets, margin_presets_translations, media_library_settings, mobility_advice_text, mobility_advice_text_translations, mp_hotel_destination_exceptions, mp_hotel_destination_exceptions_translations, occupancies, occupancies_translations, partner, places, places_translations, price_dates, rates, regions, regions_countries, regions_translations, room_categories, room_categories_translations, room_categories_translations_days, room_categories_valid_on_weekdays, room_prices, seasons, states, states_translations, surcharges, surcharges_translations, tour_category_types, tour_occupancies_names, translations, travel_categories, travel_categories_translations, trips_frequencies, valid_on_weekdays

## Verification
Update calls returned the full stored `meta` for each collection with `color: "#6B7785"` confirmed.

## REVERT PROCEDURE (staging only)
- Restore `color: null` for the 69 collections that were previously `null`.
- Restore `color: "#7B61FF"` for `travel_categories` and `trips_frequencies`.
- Leave `Global_Data`, `Hotels_Metadata`, `trips_meta`, `agencies` untouched (already `#6B7785` before this change).
Use the `directus-staging` MCP `collections` tool, action `update`, per collection: `{"collection": "<name>", "meta": {"color": <old_value>}}`.
