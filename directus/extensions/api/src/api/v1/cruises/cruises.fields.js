/**
 * Defines the raw fields retrieved from Directus for the cruises collection queries.
 * This determines only the database fetch scope — response shape/audience visibility
 * is controlled independently by cruise.transformer.js's fieldDefs.
 */
export const LIST_FIELDS = [
  "id",
  "object_id",
  "status_primarix",
  "date_created",
  "date_updated",
  "source_updated_at",
  "descriptions_translations.translations_id.code",
  "descriptions_translations.headline",
  "descriptions_translations.subline",
  "descriptions_translations.teaser",
  "destinations.destinations_id.id",
  "destinations.destinations_id.media_code",
  "destinations.destinations_id.translations.name",
  "destinations.destinations_id.translations.translations_id.code",
  "countries.countries_id.id",
  "countries.countries_id.ISO",
  "countries.countries_id.translations.name",
  "countries.countries_id.translations.translations_id.code",
  "countries.countries_id.destination_id.id",
  "countries.countries_id.destination_id.translations.name",
  "countries.countries_id.destination_id.translations.translations_id.code",
  /* Price info translations, which provide the display name for list items. */
  "price_infos_translations.translations_id.code",
  "price_infos_translations.name_cruise",
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
  "object_info_primarix",
  "status_primarix",
  "partner_visibility",
  "travel_id_karawane",
  "id_tour32",
  "real_url",
  "participants_min",
  "participants_max",
  "week_min_before_start",
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
  "season.id",
  "season.season",
  "sell_prices_status",
  "sell_prices_updated_at",
  // Descriptions translations
  "descriptions_translations.translations_id.code",
  "descriptions_translations.headline",
  "descriptions_translations.subline",
  "descriptions_translations.teaser",
  "descriptions_translations.ship",
  "descriptions_translations.at_a_glance",
  // Programme translations
  "programme_translations.translations_id.code",
  "programme_translations.programme",
  // Price info translations
  "price_infos_translations.translations_id.code",
  "price_infos_translations.name_cruise",
  "price_infos_translations.departure_arrival",
  "price_infos_translations.bord_languages",
  "price_infos_translations.bord_languages_additions",
  "price_infos_translations.surcharges",
  "price_infos_translations.services_included",
  "price_infos_translations.services_not_included",
  "price_infos_translations.onboard_gratuities",
  "price_infos_translations.onboard_gratuities_additions",
  "price_infos_translations.important_information",
  "price_infos_translations.good_to_know",
  "price_infos_translations.occupancy_single",
  "price_infos_translations.participants_legacy",
  /* Custom cancellation terms defined via a JSON selector and/or free text. */
  "price_infos_translations.deviating_cancellation_terms_selector",
  "price_infos_translations.deviating_cancellation_terms_text",
  "price_infos_translations.mobility_advice_text",
  // Specials translations
  "specials_translations.translations_id.code",
  "specials_translations.specials",
  // Image badge translations
  "image_badge_translations.translations_id.code",
  "image_badge_translations.image_badge_teaser",
  "image_badge_translations.image_badge_details",
  // m2m
  "cruise_types.cruise_types_id.id",
  "cruise_types.cruise_types_id.name",
  "cruise_types.cruise_types_id.status",
  "destinations.destinations_id.id",
  "destinations.destinations_id.media_code",
  "destinations.destinations_id.translations.name",
  "destinations.destinations_id.translations.translations_id.code",
  "countries.countries_id.id",
  "countries.countries_id.ISO",
  "countries.countries_id.translations.name",
  "countries.countries_id.translations.translations_id.code",
  "countries.countries_id.destination_id.id",
  "countries.countries_id.destination_id.translations.name",
  "countries.countries_id.destination_id.translations.translations_id.code",
  "partner_selected.partner_id.id",
  "partner_selected.partner_id.label",
  "partner_selected.partner_id.partner_type",
  "partner_selected.partner_id.status",
  // Cabin categories
  "cabin_categories.id",
  "cabin_categories.cabin_category.id",
  "cabin_categories.cabin_category.name",
  "cabin_categories.cabin_category.status",
  "cabin_categories.cabin_category_booking_code",
  "cabin_categories.cabin_category_tour32_name",
  "cabin_categories.cabin_category_from",
  "cabin_categories.translations.translations_id.code",
  "cabin_categories.translations.cabin_category_additions",
  "cabin_categories.translations.cabin_category_description",
  // Price dates
  "price_dates.id",
  "price_dates.date_departure",
  "price_dates.date_arrival",
  "price_dates.departure_frequencies.cruises_frequencies_id.id",
  "price_dates.departure_frequencies.cruises_frequencies_id.name",
  "price_dates.departure_frequencies.cruises_frequencies_id.status",
  /* Occupancies resolve through the `cruises_occupancies_selected` junction (`cruises.occupancies`
   * is an o2m alias). The junction row carries only `cruises_occupancies_id`, and the label/status
   * live one level deeper still under that row's own `occupancy` m2o to `cruise_occupancies`. */
  "occupancies.id",
  "occupancies.cruises_occupancies_id.id",
  "occupancies.cruises_occupancies_id.value",
  "occupancies.cruises_occupancies_id.occupancy_from",
  "occupancies.cruises_occupancies_id.occupancy.id",
  "occupancies.cruises_occupancies_id.occupancy.name",
  "occupancies.cruises_occupancies_id.occupancy.status",
  /*
   * Price calculation settings per market, including margins — these are plain top-level
   * fields on `cruises` itself, not a nested relation. `from_price` is the one exception:
   * BUG-FIXED — it's actually an M2O to `cruises_prices` (confirmed via schema:
   * foreign_key_table cruises_prices), same shape as hotels'/tours'/excursions'
   * from_price wiring, not a plain value. `cruises_prices.sell_price` is a plain
   * (non-localized) column directly on that row (no per-language translations table for
   * cruises prices), so the nested field below is enough — no further translations join
   * needed the way tours/excursions/hotels require. Previously only the bare row id was
   * fetched here and cruise.transformer.js read it directly as if it were already the sell
   * price.
   */
  "buy_price_type",
  "sell_price_type",
  "percentage_type",
  "provision_percentage",
  "margin_percentage",
  "exchange_rate",
  "from_price",
  "from_price.sell_price",
  /* 
   * Media mappings. Note that `is_map` and `tour32_export` are junction-level fields
   * on `cruises_directus_files`, allowing overrides per product for the same file.
   */
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
  "media.is_map",
  "media.tour32_export",
  "media.directus_files_id.dimensions_px",
  "media.directus_files_id.keyword_ids",
  "media.directus_files_id.folder.id",
  "media.directus_files_id.folder.name",
  "media.directus_files_id.translations.translations_id.code",
  "media.directus_files_id.translations.caption_i18n",
];

/**
 * Defines fields for `cruises_prices`, the actual price matrix per cabin category, date, and occupancy.
 * Fetched as a separate query filtered by `cruises_id` as no o2m alias exists on `cruises`.
 * `sell_price` is a plain (non-localized) column directly on this row — unlike other
 * product types, there's no per-language translations table for it here.
 */
export const CRUISES_PRICES_FIELDS = [
  "id",
  "cabin_category",
  "price_date",
  "occupancy",
  "buy_price",
  "sell_price",
];
