import { VEHICLES_STRIP_FIELDS } from "../maps/vehicles.strip-fields.js";
import { LOCALE_TO_ISO } from "../maps/language-code.map.js";
import { ensureUtcSuffix } from "../utils/timestamps.js";
import { buildImageUrls } from "../utils/images.js";

function getLocaleCode(translationsId) {
  return typeof translationsId === "object" ? translationsId?.code : translationsId;
}

function buildTranslationsMap(rows, pickFields) {
  const map = {};
  for (const row of rows ?? []) {
    const locale = getLocaleCode(row.translations_id);
    // Unmapped locales (e.g. de-CH) are intentionally excluded, not passed through.
    const iso = LOCALE_TO_ISO[locale];
    if (!iso) continue;
    map[iso] = pickFields(row);
  }
  return map;
}

function pickFromMap(translationsMap, lang) {
  if (!translationsMap || Object.keys(translationsMap).length === 0) return null;
  if (lang && translationsMap[lang]) return translationsMap[lang];
  const firstKey = Object.keys(translationsMap)[0];
  return translationsMap[firstKey] ?? null;
}

function stripFields(obj, fields) {
  for (const f of fields) delete obj[f];
}

// TODO(vehicles-pricing): vehicles_prices/vehicles_price_calculation/vehicles_surcharges
// exist in the schema but have no FK back to vehicles yet (confirmed via directus-dev
// relations read — vehicles_prices has zero relations, and vehicles_surcharges' o2m alias
// lives on rental_companies, not vehicles). Pricing is exposed as an explicit
// `available: false` stub below rather than fabricated or silently omitted, until that
// schema wiring is finished (a separate, out-of-scope task).
const PRICING_UNAVAILABLE = {
  available: false,
  reason:
    "Vehicle pricing schema not yet wired to the vehicles collection (backing collections " +
    "vehicles_prices/vehicles_price_calculation/vehicles_surcharges exist but lack a foreign " +
    "key back to vehicles). TODO: populate once that schema work lands.",
};

// camper_specs (O2O to vehicles, only rental_type=Camper) — now has a working FK, unlike
// the pricing collections above. Returns null for cars / vehicles without a spec row yet.
function shapeCamperSpecs(specs) {
  if (!specs) return null;
  return {
    id: specs.id,
    berths_adults: specs.berths_adults ?? null,
    berths_children: specs.berths_children ?? null,
    seats_cab: specs.seats_cab ?? null,
    seats_living: specs.seats_living ?? null,
    length_m: specs.length_m ?? null,
    width_m: specs.width_m ?? null,
    height_m: specs.height_m ?? null,
    interior_height_m: specs.interior_height_m ?? null,
    transmission: specs.transmission ?? null,
    fuel_type: specs.fuel_type ?? null,
    engine_power_kw: specs.engine_power_kw ?? null,
    fuel_tank_l: specs.fuel_tank_l ?? null,
    beds: specs.beds ?? [],
    fridge_l: specs.fridge_l ?? null,
    freshwater_tank_l: specs.freshwater_tank_l ?? null,
    wastewater_tank_l: specs.wastewater_tank_l ?? null,
    highlights: specs.highlights ?? [],
    rating_botg: specs.rating_botg ?? null,
    equipment: (specs.equipment_features ?? [])
      .filter((e) => e.feature)
      .map((e) => ({
        id: e.feature.id,
        name: e.feature.name ?? null,
        category: e.feature.category ?? null,
        icon: e.feature.icon ?? null,
        availability: e.availability ?? null,
      })),
  };
}

export function shapeVehicleListItem(vehicle, lang) {
  const descMap = buildTranslationsMap(vehicle.descriptions_translations, (t) => ({
    teaser: t.teaser ?? null,
  }));
  const filteredTranslations = lang ? (descMap[lang] ? { [lang]: descMap[lang] } : {}) : descMap;

  const shaped = {
    type: "vehicle",
    id: vehicle.id,
    object_id: vehicle.object_id ?? null,
    status: vehicle.status_primarix ?? null,
    name: vehicle.name_vehicle ?? null,
    rental_type: vehicle.rental_type ?? null,
    date_created: ensureUtcSuffix(vehicle.date_created),
    date_updated: ensureUtcSuffix(vehicle.date_updated),
    translations: filteredTranslations,
    description: pickFromMap(descMap, lang)?.teaser ?? null,
    rental_company: vehicle.rental_company ? { id: vehicle.rental_company.id, name: vehicle.rental_company.name_company } : null,
    category: vehicle.category ? { id: vehicle.category.id, name: vehicle.category.name } : null,
  };

  stripFields(shaped, VEHICLES_STRIP_FIELDS);
  return shaped;
}

export function shapeVehicleDetail(vehicle, lang) {
  const descMap = buildTranslationsMap(vehicle.descriptions_translations, (t) => ({
    teaser: t.teaser ?? null,
  }));

  const badgeMap = buildTranslationsMap(vehicle.image_badge_translations, (t) => ({
    image_badge_teaser: t.image_badge_teaser ?? null,
    image_badge_details: t.image_badge_details ?? null,
  }));

  const translations = lang ? (descMap[lang] ? { [lang]: descMap[lang] } : {}) : descMap;

  return {
    type: "vehicle",
    id: vehicle.id,
    object_id: vehicle.object_id ?? null,
    status: vehicle.status_primarix ?? null,
    date_created: ensureUtcSuffix(vehicle.date_created),
    date_updated: ensureUtcSuffix(vehicle.date_updated),
    user_created: vehicle.user_created
      ? { id: vehicle.user_created.id ?? null, first_name: vehicle.user_created.first_name ?? null, last_name: vehicle.user_created.last_name ?? null }
      : null,
    user_updated: vehicle.user_updated
      ? { id: vehicle.user_updated.id ?? null, first_name: vehicle.user_updated.first_name ?? null, last_name: vehicle.user_updated.last_name ?? null }
      : null,
    rental_type: vehicle.rental_type ?? null,
    name: vehicle.name_vehicle ?? null,
    rental_company: vehicle.rental_company ? { id: vehicle.rental_company.id, name: vehicle.rental_company.name_company } : null,
    category: vehicle.category ? { id: vehicle.category.id, name: vehicle.category.name } : null,
    supplier_product_code: vehicle.supplier_product_code ?? null,
    depot_availability: vehicle.depot_availability ?? null,
    drive_type: vehicle.drive_type ?? null,
    persons_max: vehicle.persons_max ?? null,
    suitcase_big: vehicle.suitcase_big ?? null,
    suitcase_small: vehicle.suitcase_small ?? null,
    depots: (vehicle.depots_selected ?? []).map((d) => d.rental_depots_id).filter(Boolean).map((d) => ({ id: d.id, name: d.name_depot ?? null })),
    partner_filter_ids: (vehicle.partner_selected ?? [])
      .map((p) => {
        const n = parseInt(p.partner_id?.primarix_id, 10);
        return isNaN(n) ? null : n;
      })
      .filter((n) => n !== null),
    translations,
    description: pickFromMap(descMap, lang)?.teaser ?? null,
    pricing: PRICING_UNAVAILABLE,
    camper_specs: shapeCamperSpecs(vehicle.camper_specs),
    image_badge: {
      status: vehicle.image_badge_status ?? null,
      start_date: vehicle.image_badge_start_date ?? null,
      end_date: vehicle.image_badge_end_date ?? null,
      translations: lang ? (badgeMap[lang] ? { [lang]: badgeMap[lang] } : {}) : badgeMap,
    },
    pictures: buildImageUrls(vehicle.media, lang),
  };
}
