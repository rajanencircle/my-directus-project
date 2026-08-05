import { LOCALE_TO_ISO } from "../maps/language-code.map.js";
import { ensureUtcSuffix } from "../utils/timestamps.js";
import { buildImageUrls } from "../utils/images.js";
import { assembleResponse } from "../shared/response/assembleResponse.js";
import { getGroupOrder } from "../shared/response/groupOrder.js";
import { buildDenylist } from "../shared/response/denylist.js";

// See shared/response/groupOrder.js — vehicle uses CANONICAL_GROUP_ORDER.
const VEHICLE_GROUP_ORDER = getGroupOrder("vehicle");

// See shared/response/denylist.js — RESOURCE_DENYLIST['vehicle'] adds legacy media +
// partner_visibility (vehicles don't expose partner_visibility in their response shape).
const VEHICLE_DENYLIST = buildDenylist("vehicle");

// Every top-level raw key the shaping logic below reads (directly or via a nested/
// renamed composite) — excluded from the "remaining" pass so a renamed/nested field
// doesn't also leak through under its original raw name.
const CONSUMED_SOURCE_KEYS = [
  "id", "object_id", "status_primarix", "date_created", "date_updated",
  "user_created", "user_updated", "rental_type", "name_vehicle", "rental_company",
  "category", "supplier_product_code", "depot_availability", "drive_type",
  "persons_max", "suitcase_big", "suitcase_small", "depots_selected",
  "partner_selected", "descriptions_translations", "image_badge_status",
  "image_badge_start_date", "image_badge_end_date", "image_badge_translations",
  "camper_specs", "media",
];

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
  return null;
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

  return {
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

  // Every value below is computed exactly as before — only the final assembly step
  // (ordering, defaulting, denylist) is now delegated to the shared, domain-ignorant
  // assembler instead of a hand-written object literal. `rawItem`/`consumedSourceKeys`/
  // `denylist` below enable the "remaining fields" pass: any top-level scalar Directus
  // column not explicitly consumed above (and not denylisted) appears automatically —
  // this is what lets a brand-new Directus column show up without a code change.
  const fieldDefs = [
    { key: "type", group: "identifiers", value: "vehicle" },
    { key: "id", group: "identifiers", value: vehicle.id },
    { key: "object_id", group: "identifiers", value: vehicle.object_id ?? null },

    { key: "status", group: "status", value: vehicle.status_primarix ?? null },
    { key: "date_created", group: "status", value: ensureUtcSuffix(vehicle.date_created) },
    { key: "date_updated", group: "status", value: ensureUtcSuffix(vehicle.date_updated) },
    {
      key: "user_created",
      group: "status",
      value: vehicle.user_created
        ? { id: vehicle.user_created.id ?? null, first_name: vehicle.user_created.first_name ?? null, last_name: vehicle.user_created.last_name ?? null }
        : null,
    },
    {
      key: "user_updated",
      group: "status",
      value: vehicle.user_updated
        ? { id: vehicle.user_updated.id ?? null, first_name: vehicle.user_updated.first_name ?? null, last_name: vehicle.user_updated.last_name ?? null }
        : null,
    },

    { key: "rental_type", group: "basic", value: vehicle.rental_type ?? null },
    { key: "name", group: "basic", value: vehicle.name_vehicle ?? null },
    {
      key: "rental_company",
      group: "basic",
      value: vehicle.rental_company ? { id: vehicle.rental_company.id, name: vehicle.rental_company.name_company } : null,
    },
    { key: "category", group: "basic", value: vehicle.category ? { id: vehicle.category.id, name: vehicle.category.name } : null },
    { key: "supplier_product_code", group: "basic", value: vehicle.supplier_product_code ?? null },
    { key: "depot_availability", group: "basic", value: vehicle.depot_availability ?? null },
    { key: "drive_type", group: "basic", value: vehicle.drive_type ?? null },
    { key: "persons_max", group: "basic", value: vehicle.persons_max ?? null },
    { key: "suitcase_big", group: "basic", value: vehicle.suitcase_big ?? null },
    { key: "suitcase_small", group: "basic", value: vehicle.suitcase_small ?? null },

    {
      key: "depots",
      group: "filters",
      value: (vehicle.depots_selected ?? []).map((d) => d.rental_depots_id).filter(Boolean).map((d) => ({ id: d.id, name: d.name_depot ?? null })),
    },
    {
      key: "partner_filter_ids",
      group: "filters",
      value: (vehicle.partner_selected ?? [])
        .map((p) => {
          const n = parseInt(p.partner_id?.primarix_id, 10);
          return isNaN(n) ? null : n;
        })
        .filter((n) => n !== null),
    },

    { key: "translations", group: "translations", value: translations },
    { key: "description", group: "translations", value: pickFromMap(descMap, lang)?.teaser ?? null },

    { key: "pricing", group: "relations", value: PRICING_UNAVAILABLE },
    { key: "camper_specs", group: "relations", value: shapeCamperSpecs(vehicle.camper_specs) },

    {
      key: "image_badge",
      group: "media",
      value: {
        status: vehicle.image_badge_status ?? null,
        start_date: vehicle.image_badge_start_date ?? null,
        end_date: vehicle.image_badge_end_date ?? null,
        translations: lang ? (badgeMap[lang] ? { [lang]: badgeMap[lang] } : {}) : badgeMap,
      },
    },
    { key: "pictures", group: "media", value: buildImageUrls(vehicle.media, lang) },
  ];

  return assembleResponse({
    fieldDefs,
    groupOrder: VEHICLE_GROUP_ORDER,
    rawItem: vehicle,
    consumedSourceKeys: CONSUMED_SOURCE_KEYS,
    denylist: VEHICLE_DENYLIST,
  });
}
