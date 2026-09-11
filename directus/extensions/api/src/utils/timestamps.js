/**
 * @description Ensures a timestamp string has a valid UTC 'Z' suffix.
 *
 * Directus sometimes returns timestamps without a trailing 'Z' or timezone offset
 * (e.g. "2024-01-15T10:30:00"). This function appends 'Z' whenever it is missing, so
 * every timestamp is a valid ISO 8601 UTC string and stays consistent for external consumers.
 * 
 * @param {String} ts - The timestamp string.
 * @returns {String|null} The UTC-suffixed timestamp, or null if input is null.
 */
export function ensureUtcSuffix(ts) {
  if (ts == null) return null;
  const s = String(ts);
  return s.endsWith('Z') || s.includes('+') ? s : `${s}Z`;
}
