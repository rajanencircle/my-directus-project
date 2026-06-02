// Directus returns timestamps without a trailing Z (e.g. "2024-01-15T10:30:00").
// This function ensures the value is returned as a valid ISO 8601 UTC string.
export function ensureUtcSuffix(ts) {
  if (ts == null) return null;
  const s = String(ts);
  return s.endsWith('Z') || s.includes('+') ? s : `${s}Z`;
}
