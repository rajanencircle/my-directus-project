export const LIST_FIELDS = [
  "id",
  "object_id",
  "status_primarix",
  "name_vehicle",
  "rental_type",
  "date_created",
  "date_updated",
  "source_updated_at",
  "descriptions_translations.translations_id.code",
  "descriptions_translations.teaser",
  /* 
   * Geolocation mapping for list items. Note that individual vehicles do not possess intrinsic
   * country or place attributes; these are inherited from the parent rental company.
   */
  "rental_company.country.id",
  "rental_company.country.ISO",
  "rental_company.country.translations.name",
  "rental_company.country.translations.translations_id.code",
  "rental_company.place.id",
  "rental_company.place.translations.name",
  "rental_company.place.translations.translations_id.code",
  // Media fields for thumbnail
  "media.sort",
  "media.directus_files_id.id",
  "media.directus_files_id.partner_visibility",
  "media.directus_files_id.partner_selected.partner_id.id",
  "media.directus_files_id.uploaded_by.partner_visibility",
  "media.directus_files_id.uploaded_by.partner_selected.partner_id.id",
  "media.directus_files_id.primarix_picid",
  "media.directus_files_id.fotoware_file_name",
  "media.directus_files_id.filename_download",
  "media.directus_files_id.draft_status",
  "media.directus_files_id.copyright",
  "media.directus_files_id.primarix_workspace",
  "media.directus_files_id.translations.alt_text",
  "media.directus_files_id.expiry_date",
  "media.directus_files_id.is_map",
  "media.tour32_export",
  "media.directus_files_id.dimensions_px",
  "media.directus_files_id.keyword_ids",
  "media.directus_files_id.folder.id",
  "media.directus_files_id.folder.name",
  "media.directus_files_id.translations.translations_id.code",
  "media.directus_files_id.translations.caption_i18n",
];

export const DETAIL_FIELDS = [
  "id",
  "object_id",
  "status_primarix",
  "partner_visibility",
  "rental_type",
  "name_vehicle",
  "supplier_product_code",
  "depot_availability",
  "drive_type",
  "persons_max",
  "suitcase_big",
  "suitcase_small",
  "image_badge_status",
  "image_badge_start_date",
  "image_badge_end_date",
  "date_created",
  "date_updated",
  "user_created.id",
  "user_created.first_name",
  "user_created.last_name",
  "user_updated.id",
  "user_updated.first_name",
  "user_updated.last_name",
  // Rental company — public + backoffice fields
  "rental_company.id",
  "rental_company.name_company",
  "rental_company.rental_type",
  "rental_company.street",
  "rental_company.street_number",
  "rental_company.zip_code",
  "rental_company.place.id",
  "rental_company.place.translations.name",
  "rental_company.place.translations.translations_id.code",
  "rental_company.state.id",
  "rental_company.state.ISO",
  "rental_company.state.translations.name",
  "rental_company.state.translations.translations_id.code",
  "rental_company.country.id",
  "rental_company.country.ISO",
  "rental_company.country.translations.name",
  "rental_company.country.translations.translations_id.code",
  "rental_company.phone_general",
  "rental_company.phone_after_hours",
  "rental_company.email_general",
  "rental_company.website",
  "rental_company.countries.countries_id.id",
  "rental_company.countries.countries_id.ISO",
  "rental_company.countries.countries_id.translations.name",
  "rental_company.countries.countries_id.translations.translations_id.code",
  "rental_company.minimum_rental_days",
  "rental_company.conditions_calculation_day",
  "rental_company.conditions_calculation_season",
  "rental_company.season.id",
  "rental_company.season.season",
  "rental_company.sell_prices_status",
  "rental_company.sell_prices_updated_at",
  "rental_company.location_tour32.id",
  "rental_company.location_tour32.name",
  "rental_company.object_info_primarix",
  "rental_company.internal_remarks",
  "rental_company.booking_channel",
  "rental_company.booking_partner.id",
  "rental_company.booking_partner.name_agency",
  "rental_company.booking_partner.internal_remarks_reservation",
  "rental_company.email_booking",
  "rental_company.internal_remarks_reservation",
  "rental_company.descriptions_translations.translations_id.code",
  "rental_company.descriptions_translations.subline",
  "rental_company.descriptions_translations.teaser",
  "rental_company.descriptions_translations.text_positive",
  "rental_company.descriptions_translations.text_negative",
  "rental_company.descriptions_translations.description_supplementary",
  "rental_company.conditions_translations.translations_id.code",
  "rental_company.conditions_translations.has_multi_rental_discount",
  "rental_company.conditions_translations.conditions_driver",
  "rental_company.conditions_translations.conditions_licence",
  "rental_company.conditions_translations.conditions_calculation",
  "rental_company.conditions_translations.conditions_oneway",
  "rental_company.conditions_translations.conditions_multi_rental_discount",
  "rental_company.conditions_translations.conditions_restricted_area",
  "rental_company.conditions_translations.conditions_border_crossing",
  "rental_company.conditions_translations.conditions_insurance",
  "rental_company.conditions_translations.conditions_insurance_options",
  "rental_company.conditions_translations.conditions_all_inclusive",
  "rental_company.conditions_translations.conditions_insurance_exclusions",
  "rental_company.conditions_translations.conditions_deposit",
  "rental_company.conditions_translations.minimum_rental_text",
  "rental_company.conditions_translations.conditions_notes",
  "rental_company.conditions_translations.conditions_hotel_delivery",
  "rental_company.conditions_translations.conditions_pickup_airport_ferry",
  "rental_company.conditions_translations.conditions_toll",
  "rental_company.conditions_translations.conditions_ferry",
  "rental_company.conditions_translations.conditions_towaway",
  "rental_company.conditions_translations.conditions_supplementary",
  "rental_company.price_infos_translations.translations_id.code",
  "rental_company.price_infos_translations.price_type",
  "rental_company.price_infos_translations.flex_price_text",
  "rental_company.price_infos_translations.services_included",
  "rental_company.price_infos_translations.services_not_included",
  "rental_company.price_infos_translations.services_optional",
  "rental_company.price_infos_translations.deviating_cancellation_terms",
  "rental_company.price_infos_translations.important_information",
  "rental_company.price_infos_translations.price_infos_supplementary",
  "rental_company.price_infos_translations.mobility_advice_text",
  "rental_company.specials_translations.translations_id.code",
  "rental_company.specials_translations.specials",
  "category.id",
  "category.name",
  // Descriptions translations
  "descriptions_translations.translations_id.code",
  "descriptions_translations.subline",
  "descriptions_translations.teaser",
  "descriptions_translations.description",
  "descriptions_translations.equipment",
  "descriptions_translations.bond",
  "descriptions_translations.description_supplementary",
  "descriptions_translations.bedsize",
  /* camping_equipment lives directly on `vehicles`, not per-language on descriptions_translations. */
  "camping_equipment",
  // Image badge translations
  "image_badge_translations.translations_id.code",
  "image_badge_translations.image_badge_teaser",
  "image_badge_translations.image_badge_details",
  // m2m — depots (full DepotWeb + backoffice fields)
  "depots_selected.rental_depots_id.id",
  "depots_selected.rental_depots_id.object_id",
  "depots_selected.rental_depots_id.status_primarix",
  "depots_selected.rental_depots_id.name_depot",
  "depots_selected.rental_depots_id.category.id",
  "depots_selected.rental_depots_id.category.name",
  "depots_selected.rental_depots_id.rental_zone.id",
  "depots_selected.rental_depots_id.rental_zone.name",
  "depots_selected.rental_depots_id.street",
  "depots_selected.rental_depots_id.street_number",
  "depots_selected.rental_depots_id.zip_code",
  "depots_selected.rental_depots_id.place.id",
  "depots_selected.rental_depots_id.place.translations.name",
  "depots_selected.rental_depots_id.place.translations.translations_id.code",
  "depots_selected.rental_depots_id.state.id",
  "depots_selected.rental_depots_id.state.ISO",
  "depots_selected.rental_depots_id.state.translations.name",
  "depots_selected.rental_depots_id.state.translations.translations_id.code",
  "depots_selected.rental_depots_id.country.id",
  "depots_selected.rental_depots_id.country.ISO",
  "depots_selected.rental_depots_id.country.translations.name",
  "depots_selected.rental_depots_id.country.translations.translations_id.code",
  "depots_selected.rental_depots_id.phone_general",
  "depots_selected.rental_depots_id.email",
  "depots_selected.rental_depots_id.rental_company.id",
  "depots_selected.rental_depots_id.rental_company.name_company",
  /* 
   * `office_hours_translations` lacks a formal Directus relation on `rental_depots_translations`. 
   * Consequently, translations are retrieved directly via Knex in the service layer 
   * and subsequently appended to each depot row.
   */
  // Media
  "media.sort",
  "media.directus_files_id.id",
  "media.directus_files_id.partner_visibility",
  "media.directus_files_id.partner_selected.partner_id.id",
  "media.directus_files_id.uploaded_by.partner_visibility",
  "media.directus_files_id.uploaded_by.partner_selected.partner_id.id",
  "media.directus_files_id.primarix_picid",
  "media.directus_files_id.fotoware_file_name",
  "media.directus_files_id.filename_download",
  "media.directus_files_id.draft_status",
  "media.directus_files_id.copyright",
  "media.directus_files_id.primarix_workspace",
  "media.directus_files_id.translations.alt_text",
  "media.directus_files_id.expiry_date",
  "media.directus_files_id.is_map",
  "media.tour32_export",
  "media.directus_files_id.dimensions_px",
  "media.directus_files_id.keyword_ids",
  "media.directus_files_id.folder.id",
  "media.directus_files_id.folder.name",
  "media.directus_files_id.translations.translations_id.code",
  "media.directus_files_id.translations.caption_i18n",
];

/**
 * `vehicles_surcharges`, `vehicles_rental_zones`, `vehicles_price_periods`, and
 * `vehicles_rental_periods` aren't relations on `vehicles` itself — they're fetched via
 * dedicated queries in fetchVehicleDetail.js: surcharges filtered by rental_company_id,
 * zones/price periods/rental periods filtered by the ids actually referenced in the
 * vehicle's own `vehicles_prices` rows.
 */
export const SURCHARGE_FIELDS = [
  "id",
  "surcharge_booking_name",
  "buy_price",
  /* surcharge_type/surcharge_calc_type are m2o relations (-> mandatory / calculation_method),
   * not plain strings — fetch id + designation so the transformer can output a real name
   * instead of the raw relation id. */
  "surcharge_type.id",
  "surcharge_type.designation",
  "surcharge_calc_type.id",
  "surcharge_calc_type.designation",
  "px_source_id",
  "surcharge_translations.translations_id.code",
  "surcharge_translations.surcharge_description",
  "surcharge_translations.sell_price",
];

export const ZONE_FIELDS = ["id", "name"];

export const PRICE_PERIOD_FIELDS = ["id", "price_period_start", "price_period_end", "price_period_from"];

export const RENTAL_PERIOD_FIELDS = [
  "id",
  "rental_period_min",
  "rental_period_max",
  "rental_period_duration",
  "rental_period_from",
  "rental_period_depot_category.id",
  "rental_period_depot_category.name",
];

/**
 * Vehicle-specific pricing and calculations (`vehicles_prices`, `vehicles_price_calculation`, `vehicles_surcharges_calculation`) 
 * are directly scoped to the `vehicle_id` and are retrieved via dedicated queries.
 */
export const PRICE_FIELDS = ["id", "rental_zone", "price_period", "rental_period", "buy_price"];

/**
 * The real sell-price counterpart to `vehicles_prices`. `rental_companies_prices` is scoped
 * to `vehicle_id` (no zone dimension) and carries `buy_price` values that mirror
 * `vehicles_prices` exactly for the same (price_period, rental_period) — its own
 * `prices_translations` relation is where sell price actually lives.
 */
export const RENTAL_COMPANY_PRICE_FIELDS = [
  "id",
  "price_period_id",
  "rental_period_id",
  "prices_translations.translations_id.code",
  "prices_translations.sell_price",
];

/*
 * `vehicles_price_calculation`/`vehicles_surcharges_calculation` (keyed by vehicle_id) hold
 * zero rows live — the real settings are scoped to the *company*, one row per language, under
 * `rental_companies_price_calculation_translations`/`rental_companies_surcharges_calculation_
 * translations` (see fetchVehicleDetail.js). `from_price` is a real m2o to
 * `rental_companies_prices` (the hotel-standard pattern — see buildPriceSettingsMap()), so its
 * nested sell-price translations are fetched here too.
 */
export const PRICE_CALCULATION_FIELDS = [
  "translations_id.code",
  "buy_price_type",
  "sell_price_type",
  "percentage_type",
  "provision_percentage",
  "margin_percentage",
  "exchange_rate",
  "from_price.prices_translations.translations_id.code",
  "from_price.prices_translations.sell_price",
];

export const SURCHARGE_CALCULATION_FIELDS = [
  "translations_id.code",
  "surcharge_percentage_type",
  "surcharge_provision_percentage",
  "surcharge_margin_percentage",
  "surcharge_exchange_rate",
];

