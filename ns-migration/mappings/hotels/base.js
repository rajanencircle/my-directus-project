export function mapHotel(record) {
  return {
    name:              record.name ?? null,
    street:            record.street ?? null,
    street_number:     record.street_number ?? null,
    zip_code:          record.zip_code ?? null,
    phone_general:     record.phone_general ?? null,
    phone_ah:          record.phone_ah ?? null,
    email_general:     record.email_general ?? null,
    website:           record.website ?? null,
    id_tour_user:      record.id_tour_user ?? null,
    haupt_id_tour_user: record.haupt_id_tour_user ?? null,
    booking_info:      record.booking_info ?? null,
    internal_remarks:  record.internal_remarks ?? null,

    // Relations resolved by pipeline via lookupCache (country, place, etc.)
    // hotel_classification, booking, accommodation_type, hotel_group — pending
  };
}
