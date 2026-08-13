import { getGeoName } from "./geo.js";

// Format a legacy free-text/JSON weekday frequency into a readable label. The m2m
// (trips_frequencies) path is handled by shapeFrequency; this handles old data.
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

// Format a frequency value. The m2m resolves to { trips_frequencies_id: { id, name } };
// fall back to the legacy free-text/JSON shape for old data via `formatFrequencyName`.
// Emits an array of refs so every selected frequency is surfaced.
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

// travel_routes may arrive as a JSON string or an already-parsed array, depending
// on the source data — normalize to an array either way.
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

export function shapeRoutePlace(place, lang) {
  return place
    ? { id: place.id ?? null, name: getGeoName(place, lang) ?? null, code: null }
    : null;
}
