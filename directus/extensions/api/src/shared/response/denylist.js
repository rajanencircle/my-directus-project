// Fields that must never surface through the generic "remaining fields" pass, regardless
// of resource. These are legacy/internal scalars present on all 5 collections that have
// never been part of any response — switching to '*' querying fetches them automatically,
// so they must be explicitly suppressed here.
//
// - px_source_id: legacy source identifier, never in any response
// - sort: Directus internal sort column, not a business field
// - source_db: legacy ETL provenance column, internal only
// - source_updated_at: used for delta computation in list queries but stripped before
//     return; must not appear in detail responses either
// - sell_prices_status / sell_prices_updated_at: internal pricing pipeline metadata
export const SHARED_DENYLIST = [
  "px_source_id",
  "sort",
  "source_db",
  "source_updated_at",
  "sell_prices_status",
  "sell_prices_updated_at",
];

// Per-resource additions on top of SHARED_DENYLIST — legacy/internal scalar columns
// that exist on the underlying Directus collection but have never been part of any
// response (and should not start appearing now via the "remaining" passthrough).
// All entries here were confirmed against the live Directus schema via /fields/<collection>.
//
// NOTE: the branch's denylist also listed cruise.partner_visibility and
// tour/excursion.internal_remarks_reservation — those have been intentionally omitted
// here because today's transformers explicitly surface both fields. Blindly porting the
// branch's list would silently re-hide fields we just spent time exposing.
export const RESOURCE_DENYLIST = {
  // hotel.test_field: internal/test column, confirmed on hotels collection.
  // No media_* legacy cols exist on hotels (confirmed via /fields/hotels).
  hotel: [
    "test_field",
    "ui_tabs",
    "item_preview_button",
    "header",
    "save_and_stay_price",
    "hotel_tabs",
    "tab_master_data",
    "tab_description",
    "tab_price_infos",
    "tab_tour_dates",
    "tab_calculator_inputs",
    "tab_price_calculation",
    "tab_surcharge_calculation",
    "tab_specials",
    "tab_image_badge",
    "tab_media",
    "block_publication",
    "block_contacts",
    "section_id_status",
    "block_price_basics",
    "block_surcharges",
    "section_price_infos",
    "section_reservation",
    "section_classification",
    "section_descriptions",
    "section_attributes",
    "section_image_badge",
    "section_media",
    "section_botg_filter",
    "section_operator",
    "section_dates",
    "section_price_basics",
    "section_surcharges",
    "section_units_margins",
    "section_vehicle_prices",
    "section_units_margins_surcharge_calculation",
    "section_surcharges_surcharge_calculation",
    "section_specials",
    "section_room_prices",
    "section_surcharges_calc",
    "section_address",
    "divider_1",
    "divider_2",
    "divider_3",
    "save_and_stay_surcharge",
    "res_phone",
    "res_email2",
    "contact_title",
    "contact_greeting",
    "contact_firstname",
    "contact_name",
    "media_object_id_primarix",
    "media_filename_fotoweb",
    "media_sort",
    "is_map",
    "use_tour32",
    "media_copyright",
    "partner_visibility"
  ],

  // Legacy media/tour32 scalar columns on cruises (mirrored from the media junction
  // as flat denormalised columns; not part of any cruise response).
  cruise: [
    "media_object_id_primarix",
    "media_filename_fotoweb",
    "media_sort",
    "is_map",
    "use_tour32",
    "media_copyright",
  ],

  // Same media set as cruises, plus is_axolot_export (tour-specific legacy flag).
  tour: [
    "media_object_id_primarix",
    "media_filename_fotoweb",
    "media_sort",
    "is_map",
    "use_tour32",
    "media_copyright",
    "is_axolot_export",
    "status",
    "object_info_primarix",
    "internal_remarks",
    "partner_visibility",
    "operator_direct",
    "operator_linked",
    "name_operator",
    "street",
    "street_number",
    "postcode",
    "place",
    "location_tour32",
    "country",
    "state",
    "phone_general",
    "phone_after_hours",
    "email_general",
    "website",
    "booking_channel",
    "service_provider_id_tour32",
    "main_service_provider_id_tour32",
    "email_booking",
    "internal_remarks_reservation",
    "flight_service",
    "airlines",
    "supplier_product_code",
    "price_subline",
    "mobility_advice_text",
    "children_free_age",
    "children_free_number",
    "participants_min",
    "participants_max",
    "week_min_before_start",
    "dates_translations",
    "prices",
    "departure_times",
    "block_publication",
    "block_contacts",
    "block_price_basics",
    "block_surcharges",
    "ui_tabs",
    "item_preview_button",
    "header",
    "section_publication",
    "section_botg_filter",
    "tab_price_infos",
    "tab_tour_dates",
    "tab_calculator_inputs",
    "tab_price_calculation",
    "tab_master_data",
    "tab_description",
    "tab_tour_programme",
    "tab_surcharge_calculation",
    "tab_specials",
    "tab_image_badge",
    "tab_media",
    "accommodation_types",
    "departure_airports",
    "travel_routes",
    "travel_categories",
    "price_periods",
    "occupancies",
    "price_info_translations",
    "partner_selected",
    "section_operator",
    "section_reservation",
    "section_classification",
    "section_descriptions",
    "section_flight_info",
    "section_tour_programme",
    "section_dates",
    "section_price_infos",
    "section_attributes",
    "section_price_basics",
    "section_surcharges",
    "section_units_margins",
    "section_trip_prices",
    "section_units_margins_surcharge_calculation",
    "section_surcharges_surcharge_calculation",
    "section_specials",
    "section_image_badge",
    "section_media"
  ],

  // Same legacy media set as cruises/tours. partner_visibility is also denylisted —
  // vehicle detail shape does not expose it (filtering is handled via partner_selected/
  // partner_filter_ids), and no decision was made today to surface it for vehicles.
  vehicle: [
    "media_object_id_primarix",
    "media_filename_fotoweb",
    "media_sort",
    "is_map",
    "use_tour32",
    "media_copyright",
    "partner_visibility",
  ],

  // Same legacy media set. partner_visibility denylisted for same reason as vehicles.
  // object_info_primarix: present on excursions schema but never output (no transformer
  // reads it). res_phone/res_email2/contact_title etc. are now fetched via booking_partner
  // relation (agencies collection) rather than as flat columns — those flat columns no
  // longer exist on excursions in the live schema so they won't appear via '*' anyway;
  // listed here defensively.
  excursion: [
    "media_object_id_primarix",
    "media_filename_fotoweb",
    "media_sort",
    "is_map",
    "use_tour32",
    "media_copyright",
    "partner_visibility",
    "object_info_primarix",
    // UI/admin-only alias fields that appear as scalar columns on excursions
    "ui_tabs", "item_preview_button", "header",
    "save_and_stay_price",
    "tab_master_data", "tab_description", "tab_price_infos", "tab_tour_dates",
    "tab_calculator_inputs", "tab_price_calculation", "tab_surcharge_calculation",
    "tab_specials", "tab_image_badge", "tab_media",
    "block_publication", "block_contacts", "section_id_status", "block_price_basics",
    "block_surcharges", "section_price_infos", "section_reservation",
    "section_classification", "section_descriptions", "section_attributes",
    "section_image_badge", "section_media",
    "section_botg_filter", "section_operator", "section_dates", "section_price_basics",
    "section_surcharges", "section_units_margins", "section_vehicle_prices",
    "section_units_margins_surcharge_calculation", "section_surcharges_surcharge_calculation",
    "section_specials",
    // Legacy flat columns (res_phone, res_email2, etc. now live on agencies via booking_partner)
    "res_phone", "res_email2", "contact_title", "contact_greeting",
    "contact_firstname", "contact_name",
    // Raw alias fields already consumed/renamed by the transformer
    "specials", "departures", "routes", "name", "operator_linked",
    "surcharges_translations",
  ],
};

// Convenience helper: SHARED_DENYLIST + this resource's additions.
export function buildDenylist(resourceKey) {
  return [...SHARED_DENYLIST, ...(RESOURCE_DENYLIST[resourceKey] ?? [])];
}
