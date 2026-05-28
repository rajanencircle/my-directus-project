export const LIST_FIELDS = [
  // Base (px_source_id excluded — strip field, never in output)
  'id', 'name', 'object_id', 'status_primarix', 'date_created', 'date_updated',
  // Descriptions
  'hotel_descriptions_translations.translations_id.code',
  'hotel_descriptions_translations.teaser',
  'hotel_descriptions_translations.description_short',
  // Country
  'country.id', 'country.ISO', 'country.id_primarix',
  'country.translations.name', 'country.translations.translations_id.code',
  // State
  'state.id',
  'state.translations.name', 'state.translations.translations_id.code',
  // Region
  'region.id', 'region.id_primarix',
  'region.translations.name', 'region.translations.translations_id.code',
  // Place
  'place.id', 'place.location_tour32',
  'place.translations.name', 'place.translations.translations_id.code',
  // Key relations
  'hotel_classification.id', 'hotel_classification.label',
  'hotel_group.id', 'hotel_group.label',
];

export const DETAIL_FIELDS = [
  // Base (px_source_id excluded — strip field; internal_remarks excluded — strip field)
  'id', 'name', 'object_id',
  'street', 'street_number', 'zip_code',
  'phone_general', 'phone_ah', 'email_general', 'website',
  'status_primarix', 'date_created', 'date_updated',
  'id_tour_user', 'haupt_id_tour_user',
  'booking_partner',
  'image_badge_status', 'image_badge_start_date', 'image_badge_end_date',
  // Hotel descriptions translations
  'hotel_descriptions_translations.translations_id.code',
  'hotel_descriptions_translations.teaser',
  'hotel_descriptions_translations.subline_location',
  'hotel_descriptions_translations.description_short',
  'hotel_descriptions_translations.description_rooms',
  // Price/service info translations (hotels_translations_3)
  'price_info_translations.translations_id.code',
  'price_info_translations.services_included',
  'price_info_translations.services_not_included',
  'price_info_translations.mobility_advice_text',
  // Hotel price settings per language — margin, buy entity (hotels_translations_1)
  'hotel_prices.translations_id.code',
  'hotel_prices.margin_percentage',
  'hotel_prices.buy_price_type',
  // Country
  'country.id', 'country.ISO', 'country.id_primarix',
  'country.translations.name', 'country.translations.translations_id.code',
  // State
  'state.id', 'state.ISO',
  'state.translations.name', 'state.translations.translations_id.code',
  // Region
  'region.id', 'region.id_primarix',
  'region.translations.name', 'region.translations.translations_id.code',
  // Place
  'place.id', 'place.location_tour32',
  'place.translations.name', 'place.translations.translations_id.code',
  // M2O relations
  'hotel_group.id', 'hotel_group.label',
  'hotel_classification.id', 'hotel_classification.label',
  'booking.booking_partner',
  // M2M relations
  'accommodation_type.accommodation_types_id.id',
  'accommodation_type.accommodation_types_id.label',
  'partner.partner_id.primarix_id',
  // Activities
  'hotel_activities.activities_id.id',
  'hotel_activities.activities_id.label',
  // Room categories with translations
  'room_categories.id', 'room_categories.room_category',
  'room_categories.room_category_calc_type', 'room_categories.price_start',
  'room_categories.status', 'room_categories.publish_start', 'room_categories.publish_end',
  'room_categories.translations.translations_id.code',
  'room_categories.translations.room_category_additions',
  'room_categories.translations.room_category_description',
  // Price date windows
  'price_dates.id', 'price_dates.name',
  'price_dates.start_date', 'price_dates.end_date', 'price_dates.from_price',
  'price_dates.status', 'price_dates.publish_start', 'price_dates.publish_end',
  // Room prices with sell prices per language
  'room_prices.id', 'room_prices.room_category_id',
  'room_prices.price_date_id', 'room_prices.room_occupancy_id', 'room_prices.buy_price',
  'room_prices.room_prices_translations.translations_id.code',
  'room_prices.room_prices_translations.sell_price',
  // Media / images
  'media.directus_files_id.id',
  'media.directus_files_id.filename_download',
  'media.directus_files_id.copyright',
  'media.directus_files_id.alt',
  'media.directus_files_id.expiry_date',
  'media.directus_files_id.folder.name',
  // Image badge translations (hotels_translations_4)
  'image_badge_translations.translations_id.code',
  'image_badge_translations.image_badge_teaser',
  'image_badge_translations.image_badge_details',
  // Offers / specials (JSON repeater — filtered in transformer)
  'hotels_specials',
  // Surcharges — fetched separately to avoid Directus nested-translation resolution issues
  'surcharges.id',
];

export const CHILD_RC_FIELDS = [
  'id', 'sharedId', 'room_category', 'room_category_calc_type', 'price_start',
  'status', 'publish_start', 'publish_end',
  'translations.translations_id.code',
  'translations.room_category_additions',
  'translations.room_category_description',
];

export const SURCHARGE_FIELDS = [
  'id', 'name', 'px_source_id', 'buy_price',
  'status', 'publish_start', 'publish_end',
  'translations.translations_id.code',
  'translations.surcharge_description',
];
