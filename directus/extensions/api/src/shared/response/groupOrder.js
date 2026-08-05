// Canonical group tags, in a sensible default order. Used as-is by resources whose
// historical field order happens to fit it cleanly (today: vehicles). Any field declared
// under a group not in the resource's chosen order is appended after all known groups
// (see assembleResponse.js), so a typo'd group tag degrades safely rather than disappearing.
export const CANONICAL_GROUP_ORDER = [
  'identifiers',
  'status',
  'basic',
  'structured',
  'filters',
  'translations',
  'relations',
  'calculated',
  'media',
  'remaining',
];

// Per-resource group order, centralized here rather than inline per transformer so the
// exact response ordering for every resource is auditable from one place. Each array
// below reproduces that resource's exact pre-existing response key order (derived from
// today's actual shapeXxxDetail return literals), rather than forcing the canonical order
// onto data that doesn't fit it.
//
// Group name semantics (used as tags only — no meaning beyond ordering):
//   identifiers   id, object_id, type
//   basic         name, classification, scalar business fields
//   supplier      supplier contact block (hotels/tours)
//   filters       partner_type/filter_ids, partners, cruise_types
//   structured    address, contact, operator, booking blocks
//   misc          per-resource miscellaneous scalars (supplier_product_code, etc.) for tours
//   translations  translations, programme_translations etc.
//   content       rooms/cabins/categories, image_badge, activities/pictures
//   media         same semantic as content — used for resources where it fits better
//   audit         user_created/updated, season, internal_remarks, hotel_group
//   pricing       from_price, price_settings, surcharge_settings
//   pricing_translations  price_info_translations, specials_translations
export const RESOURCE_GROUP_ORDER = {
  // hotel return key order (shapeHotelDetail):
  //   id, object_id, type, status_primarix, date_created, date_updated
  //   name, classification, accommodation_type
  //   supplier{}
  //   partner_type, partner_filter_ids, partners
  //   address{}, contact{}
  //   translations, rooms, price_options
  //   image_badge, activities, pictures
  //   user_created, user_updated, season, object_info, internal_remarks, hotel_group
  //   from_price, price_settings, surcharge_settings
  //   price_info_translations, specials_translations
  hotel: [
    'identifiers', 'basic', 'supplier', 'filters', 'structured',
    'translations', 'content', 'audit', 'pricing', 'pricing_translations', 'remaining',
  ],

  // cruise return key order (shapeCruiseDetail):
  //   id, object_id, type, status_primarix, date_created, date_updated
  //   travel_id_karawane, id_tour32, real_url, participants{}, special_valid_from/to, partner_visibility
  //   cruise_types, address{}
  //   partner_filter_ids, partners
  //   translations
  //   cabins, image_badge, pictures
  //   user_created, user_updated, season, object_info
  //   from_price, price_settings
  //   programme_translations, price_info_translations, specials_translations
  cruise: [
    'identifiers', 'basic', 'structured', 'filters',
    'translations', 'content', 'audit', 'pricing', 'pricing_translations', 'remaining',
  ],

  // tour return key order (shapeTourDetail):
  //   id, object_id, type, status_primarix, status, partner_type, date_created, date_updated
  //   name
  //   operator{}, supplier{}
  //   partner_filter_ids, partners
  //   address{}, contact{}, booking{}
  //   supplier_product_code, price_subline, participants{}, mobility_advice_text, flight_service, airlines
  //   travel{}
  //   translations
  //   categories, surcharges
  //   image_badge, pictures
  //   user_created, user_updated, season, internal_remarks, internal_remarks_reservation
  //   from_price, price_settings, surcharge_settings
  //   price_info_translations, programme_translations, specials_translations
  tour: [
    'identifiers', 'basic', 'supplier', 'filters', 'structured', 'misc',
    'translations', 'content', 'audit', 'pricing', 'pricing_translations', 'remaining',
  ],

  // vehicle uses the canonical order — untouched today, branch version accurate
  vehicle: CANONICAL_GROUP_ORDER,

  // excursion return key order (shapeExcursionDetail):
  //   type, id, name, object_id
  //   status, internal_remarks, date_created, date_updated, user_created, user_updated, season
  //   operator{}, address{}, contact{}, booking{}
  //   supplier_product_code, price_subline, participants_min/max, max_children_free, mobility_advice_text
  //   destination, travel_categories, countries, partner_filter_ids
  //   routes, departure_dates
  //   translations, price_info_translations, dates_translations, specials_translations
  //   categories, surcharges, from_price, price_settings
  //   image_badge, pictures
  excursion: [
    'identifiers', 'status', 'structured', 'basic', 'filters', 'relations',
    'translations', 'pricing', 'media', 'remaining',
  ],
};

// Convenience helper: this resource's group order, falling back to the canonical default
// for a resource not (yet) listed above.
export function getGroupOrder(resourceKey) {
  return RESOURCE_GROUP_ORDER[resourceKey] ?? CANONICAL_GROUP_ORDER;
}
