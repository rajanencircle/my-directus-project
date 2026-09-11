import { buildTranslationsMap, pickFromMap } from "./i18n.js";

/**
 * @description Extracts the translated name of a geographical entity.
 *
 * Builds a translation map from the geo's translations array and tries to pick the name for
 * the requested language. If no matching translation exists, it falls back to the raw `name`
 * field on the main record, ensuring a name is always returned when possible.
 *
 * Every resource transformer uses this to resolve names for locations, regions, countries,
 * and similar entities.
 * 
 * @param {Object} geo - The geographical entity.
 * @param {string} lang - The target language code.
 * @returns {string|null} The resolved geographical name.
 */
export function getGeoName(geo, lang) {
  if (!geo) return null;
  const map = buildTranslationsMap(geo.translations, (t) => t.name ?? null);
  return pickFromMap(map, lang) ?? geo.name ?? null;
}

/**
 * @description Shapes a standard geographic reference object.
 *
 * Formats a geo object into a strict `{ id, name, code }` shape. The name is resolved with
 * `getGeoName`, and the code maps to the `ISO` field when available.
 *
 * Transformers use this throughout to normalize single geo references (like `start_place`).
 * 
 * @param {Object} geo - The geographical entity.
 * @param {string} lang - The target language code.
 * @returns {Object|null} The formatted geo reference.
 */
export function geoRef(geo, lang) {
  return geo
    ? { id: geo.id, name: getGeoName(geo, lang) ?? null, code: geo.ISO ?? null }
    : null;
}

/**
 * @description Shapes an array of junction rows into geographic reference objects.
 *
 * Maps over a list of junction rows, extracting the nested geo entity via `idKey`. Missing
 * entities are filtered out and the remaining ones are mapped into the standard `{ id, name, code }`
 * shape. `emptyValue` controls what is returned when the input is falsy.
 *
 * The cruise, tour, and excursion transformers share this to map their `countries[]` or
 * `destinations[]` junction arrays.
 * 
 * @param {Array<Object>} rows - Array of junction rows.
 * @param {string} idKey - The key on the row pointing to the actual geo entity.
 * @param {string} lang - The target language code.
 * @param {Object} [options] - Configuration options.
 * @returns {Array<Object>|null} The array of formatted geo references, or the specified `emptyValue`.
 */
export function shapeGeoRefs(rows, idKey, lang, { codeKey = "ISO", emptyValue = null } = {}) {
  if (!rows) return emptyValue;
  return rows
    .map((r) => r[idKey])
    .filter(Boolean)
    .map((g) => ({ id: g.id, name: getGeoName(g, lang), code: g[codeKey] ?? null }));
}
