export const LIST_FIELDS = [
  "id",
  "object_id",
  "status_primarix",
  "date_created",
  "date_updated",
  "descriptions_translations.translations_id.code",
  "descriptions_translations.headline",
  "descriptions_translations.subline",
  "descriptions_translations.teaser",
  "destinations.destinations_id.id",
  "destinations.destinations_id.translations.name",
  "destinations.destinations_id.translations.translations_id.code",
  "countries.countries_id.id",
  "countries.countries_id.translations.name",
  "countries.countries_id.translations.translations_id.code",
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
  "special_valid_from",
  "special_valid_to",
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
  "season",
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
  // NOTE: field names are `_selector`/`_text`, not `deviating_cancellation_terms`/`_additions`
  // (that mismatch previously made these always resolve to null).
  "price_infos_translations.deviating_cancellation_terms_selector",
  "price_infos_translations.deviating_cancellation_terms_text",
  "price_infos_translations.mobility_advice_text",
  // Specials translations
  "specials_translations.translations_id.code",
  "specials_translations.special_description",
  // Image badge translations
  "image_badge_translations.translations_id.code",
  "image_badge_translations.image_badge_teaser",
  "image_badge_translations.image_badge_details",
  // m2m
  "cruise_types.cruise_types_id.id",
  "cruise_types.cruise_types_id.name",
  "destinations.destinations_id.id",
  "destinations.destinations_id.translations.name",
  "destinations.destinations_id.translations.translations_id.code",
  "countries.countries_id.id",
  "countries.countries_id.translations.name",
  "countries.countries_id.translations.translations_id.code",
  "partner_selected.partner_id.primarix_id",
  // Cabin categories
  "cabin_categories.id",
  "cabin_categories.cabin_category.id",
  "cabin_categories.cabin_category.name",
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
  "price_dates.departure_frequencies.cruises_frequencies_id.name",
  // Occupancies
  "occupancies.id",
  "occupancies.occupancy.id",
  "occupancies.occupancy.name",
  "occupancies.occupancy_from",
  // Price calculation — per-market pricing settings + from_price. This is a settings row
  // (like hotels' hotel_prices), separate from the actual per-cabin/date/occupancy price
  // matrix which lives in cruises_prices (fetched separately below, no alias on cruises).
  "price_calculation.buy_price_type",
  "price_calculation.sell_price_type",
  "price_calculation.percentage_type",
  "price_calculation.provision_percentage",
  "price_calculation.margin_percentage",
  "price_calculation.from_price",
  "price_calculation.translations.translations_id.code",
  "price_calculation.translations.sell_price",
  // Media — is_map/tour32_export are junction-level fields on cruises_directus_files
  // (per-product, can differ across products sharing the same file), NOT fields on the
  // shared directus_files record.
  "media.directus_files_id.id",
  "media.directus_files_id.filename_download",
  "media.directus_files_id.draft_status",
  "media.directus_files_id.copyright",
  "media.directus_files_id.alt_text",
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

// cruises_prices (the real per-cabin_category x price_date x occupancy price matrix) has
// no o2m alias on `cruises` — fetched as a separate query filtered by cruises_id, same
// pattern as tours/excursions surcharges. No sell_price/translations junction exists for
// cruises_prices (only buy_price), so `sell` is always null once grouped — same honest
// degradation as tours' pricing.
export const CRUISES_PRICES_FIELDS = [
  "id",
  "cabin_category",
  "price_date",
  "occupancy",
  "buy_price",
];
