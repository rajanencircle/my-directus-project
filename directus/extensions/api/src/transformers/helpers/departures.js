import { getGeoName } from "./geo.js";

/**
 * @description Formats a legacy free-text or JSON weekday frequency into a readable label.
 *
 * Older data may store frequency as a JSON string or object (e.g. `{ monday: true, tuesday: true }`).
 * This parses the JSON when needed and maps the truthy boolean keys to a comma-separated
 * string of day names.
 *
 * `shapeFrequency` uses this internally to stay backwards compatible with older legacy records
 * that haven't migrated to the m2m relational structure.
 * 
 * @param {String|Object} freq - The raw frequency data.
 * @returns {String|null} A formatted string of days, or null.
 */
export function formatFrequencyName(freq) {
  if (!freq) return null;
  let parsed = freq;
  if (typeof freq === "string") {
    try {
      parsed = JSON.parse(freq);
    } catch (e) {
      return freq;
    }
  }
  if (typeof parsed !== "object" || parsed === null) return String(parsed);
  const days = [];
  if (parsed.monday) days.push("Monday");
  if (parsed.tuesday) days.push("Tuesday");
  if (parsed.wednesday) days.push("Wednesday");
  if (parsed.thursday) days.push("Thursday");
  if (parsed.friday) days.push("Friday");
  if (parsed.saturday) days.push("Saturday");
  if (parsed.sunday) days.push("Sunday");
  return days.length > 0 ? days.join(", ") : null;
}

/**
 * @description Shapes frequency data into a standardized array of references.
 *
 * When the input is an array (an m2m relation to `trips_frequencies`), each junction row is
 * mapped into a `{ id, name }` object. When the input is not an array (legacy data),
 * `formatFrequencyName` is used and a single-element array is returned.
 *
 * The tour and excursion transformers use this to reliably format departure frequencies,
 * whether the source is the new relational data or older legacy text.
 * 
 * @param {Array|String|Object} freq - The raw frequency data.
 * @returns {Array<Object>|null} An array of frequency references.
 */
export function shapeFrequency(freq) {
  if (!freq) return null;
  if (Array.isArray(freq)) {
    const refs = freq
      .map((row) => row?.trips_frequencies_id ?? row ?? null)
      .filter(Boolean)
      .map((first) =>
        first.name ? { id: first.id ?? null, name: first.name } : null,
      )
      .filter(Boolean);
    return refs.length > 0 ? refs : null;
  }
  const parsed = formatFrequencyName(freq);
  return parsed ? [{ id: null, name: parsed }] : null;
}

/**
 * @description Safely parses travel routes into an array.
 *
 * Attempts to parse the raw data when it's a JSON string, returns it directly when it's already
 * an array, and defaults to an empty array otherwise.
 *
 * The tour and excursion transformers use this to normalize route payloads that may arrive
 * either parsed or stringified depending on the query client.
 * 
 * @param {String|Array} rawRoutes - The raw travel routes data.
 * @returns {Array} The parsed array of routes.
 */
export function parseTravelRoutes(rawRoutes) {
  let parsedRoutes = [];
  if (typeof rawRoutes === "string") {
    try {
      parsedRoutes = JSON.parse(rawRoutes);
    } catch (e) {}
  } else if (Array.isArray(rawRoutes)) {
    parsedRoutes = rawRoutes;
  }
  return parsedRoutes;
}
/**
 * @description Shapes a single route place into a geographic reference object.
 *
 * Resolves the location name with `getGeoName` and formats it into `{ id, name, code }`.
 *
 * This is used alongside `parseTravelRoutes` to format the start/end points of a route.
 * 
 * @param {Object} place - The raw geographic entity.
 * @param {String} lang - The target language code.
 * @returns {Object|null} The formatted place reference.
 */
export function shapeRoutePlace(place, lang) {
  return place
    ? { id: place.id ?? null, name: getGeoName(place, lang) ?? null, code: null }
    : null;
}
