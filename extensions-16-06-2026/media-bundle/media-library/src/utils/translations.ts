/**
 * A translatable string is either:
 *  - a $t: reference: "$t:media_library_page_title" → resolved via Directus's t() function
 *  - a plain string: "Media Library"
 *  - a locale→string map: { "en-US": "Media Library", "de-DE": "Mediathek" }
 *  - a JSON-encoded map stored as a string: '{"en-US":"Media Library"}'
 */
export type TranslatableString = string | Record<string, string>;

/**
 * Resolve a TranslatableString to a display string.
 *
 * Resolution order:
 *  1. "$t:some_key" → calls t('some_key') from Directus's i18n system (directus_translations)
 *  2. JSON locale map → picks best match for locale
 *  3. Plain string → returned as-is
 */
export function resolveTranslatable(
  value: TranslatableString | undefined | null,
  t: (key: string) => string,
  fallback = '',
): string {
  if (value == null || value === '') return fallback;

  if (typeof value === 'string' && value.startsWith('$t:')) {
    const key = value.slice(3).trim();
    const resolved = t(key);
    // t() returns the key itself when not found — treat that as a miss and fall through
    return resolved !== key ? resolved : fallback || key;
  }

  const map = coerceToMap(value);
  if (map) {
    // Derive locale from the browser/Directus app language
    const locale = document.documentElement.lang || 'en-US';
    if (map[locale]) return map[locale]!;
    const lang = locale.split('-')[0] ?? '';
    if (lang) {
      const entry = Object.entries(map).find(([k]) => k.startsWith(lang));
      if (entry) return entry[1]!;
    }
    return Object.values(map)[0] ?? fallback;
  }

  return typeof value === 'string' ? value || fallback : fallback;
}

function coerceToMap(value: TranslatableString): Record<string, string> | null {
  if (typeof value === 'object') return value;
  const trimmed = (value as string).trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {}
  return null;
}
