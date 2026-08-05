export function stripToWebDetail(detail, { productType } = {}) {
  if (!detail || typeof detail !== "object") return detail;

  // Clone to avoid mutating the original object deeply
  const web = JSON.parse(JSON.stringify(detail));

  // Internal service discriminator — never part of the public payload
  delete web._productType;

  // Web media exposes only the object-storage reference fields.
  const cleanMedia = (media) => {
    if (!Array.isArray(media)) return;
    for (const m of media) {
      delete m.is_map;
      delete m.object_id_primarix;
      delete m.filename_fotoweb;
      delete m.use_tour32;
    }
  };
  cleanMedia(web.media);

  // Top-level groups to remove
  delete web.pricing_config;
  delete web.internal;
  delete web.booking;
  delete web.operator;
  delete web.sell_prices_status;
  delete web.sell_prices_updated_at;

  // Top-level metadata to remove
  delete web.id;
  delete web.object_id;
  delete web.publishing_status;
  delete web.date_updated;
  delete web.supplier_product_code;
  delete web.rental_type;

  // `name` is only part of the web body for hotels and cruises (HotelWebDetail /
  // CruiseWebDetail). Tours, excursions and rentals carry their title via the product
  // envelope, not inside the type-specific body.
  if (productType === "tour" || productType === "excursion" || productType === "rental_car" || productType === "camper") {
    delete web.name;
  }

  // Recursively clean arrays
  const cleanPrices = (prices) => {
    if (!Array.isArray(prices)) return;
    for (const p of prices) {
      delete p.buy;
      delete p.margin;
    }
  };

  const cleanSurcharges = (surcharges) => {
    if (!Array.isArray(surcharges)) return;
    for (const s of surcharges) {
      delete s.buy;
      delete s.margin;
      delete s.calc_type;
      delete s.catering;
      delete s.type;
      delete s.calculation_method;
    }
  };

  if (Array.isArray(web.surcharges)) {
    cleanSurcharges(web.surcharges);
  }

  if (Array.isArray(web.rooms)) {
    for (const r of web.rooms) {
      delete r.booking_code;
      delete r.tour32_name;
      delete r.catering;
      delete r.calc_type;
      
      if (Array.isArray(r.prices)) {
        for (const pd of r.prices) {
          cleanPrices(pd.occupancies);
        }
      }
    }
  }

  if (Array.isArray(web.categories)) {
    for (const cat of web.categories) {
      delete cat.original;
      delete cat.supplier_code;

      if (Array.isArray(cat.periods)) {
        for (const p of cat.periods) {
          cleanPrices(p.prices);
        }
      }
    }
  }

  if (Array.isArray(web.cabin_categories)) {
    for (const cc of web.cabin_categories) {
      delete cc.booking_code;
      delete cc.tour32_name;

      if (Array.isArray(cc.sailings)) {
        for (const s of cc.sailings) {
          cleanPrices(s.prices);
        }
      }

      if (Array.isArray(cc.periods)) {
        for (const p of cc.periods) {
          cleanPrices(p.prices);
        }
      }
    }
  }

  if (Array.isArray(web.zones)) {
    for (const z of web.zones) {
      if (Array.isArray(z.periods)) {
        for (const p of z.periods) {
          cleanPrices(p.prices);
        }
      }
    }
  }

  if (web.rental_company && typeof web.rental_company === "object") {
    delete web.rental_company.location_tour32;
    delete web.rental_company.object_info_primarix;
    delete web.rental_company.internal_remarks;
    delete web.rental_company.booking_channel;
    delete web.rental_company.booking_partner;
    delete web.rental_company.email_booking;
    delete web.rental_company.internal_remarks_reservation;
  }

  if (Array.isArray(web.depots)) {
    for (const d of web.depots) {
      delete d.object_id;
      delete d.status;
      delete d.rental_company;
    }
  }

  // `name` is the leading property of the hotel and cruise web bodies. Stripping
  // the top-level metadata above can leave another key first; restore contract order.
  if (Object.hasOwn(web, "name") && typeof web.name === "string") {
    const { name, ...rest } = web;
    return { name, ...rest };
  }

  return web;
}
