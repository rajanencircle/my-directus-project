import { buildTranslationsMap, pickFromMap } from "./i18n.js";

// Unified across every resource: falls back to a raw `name` field when no
// translation row matches the active language. Previously only the rental_car
// transformer had this fallback; hotel/tour/cruise/excursion returned null in
// that case instead — a divergence from copy-pasted code, not an intentional
// difference, so it's standardized here as the one implementation.
export function getGeoName(geo, lang) {
  if (!geo) return null;
  const map = buildTranslationsMap(geo.translations, (t) => t.name ?? null);
  return pickFromMap(map, lang) ?? geo.name ?? null;
}

export function geoRef(geo, lang) {
  return geo
    ? { id: geo.id, name: getGeoName(geo, lang) ?? null, code: geo.ISO ?? null }
    : null;
}

// Shared by cruise/tour/excursion for their countries[]/destinations[] classification
// arrays. `emptyValue` preserves each collection's existing behavior for a missing/falsy
// `rows` input (cruise returns [], tour/excursion return null) — not unified, since that's
// a real response-shape difference, not an accidental one.
export function shapeGeoRefs(rows, idKey, lang, { codeKey = "ISO", emptyValue = null } = {}) {
  if (!rows) return emptyValue;
  return rows
    .map((r) => r[idKey])
    .filter(Boolean)
    .map((g) => ({ id: g.id, name: getGeoName(g, lang), code: g[codeKey] ?? null }));
}
