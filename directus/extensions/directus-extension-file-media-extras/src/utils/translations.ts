/**
 * A translatable string is either:
 *  - a plain string: "Hotels using this file"
 *  - a locale→string map: { "en-US": "Hotels using this file", "fr-FR": "Hôtels utilisant ce fichier" }
 *  - a JSON-encoded map stored as a string: '{"en-US":"Hotels","fr-FR":"Hôtels"}'
 */
export type TranslatableString = string | Record<string, string>;

/**
 * Resolve a TranslatableString to the best match for the given locale.
 * Falls back: exact locale → language prefix → first available → fallback.
 */
export function resolveTranslatable(
  value: TranslatableString | undefined | null,
  locale: string,
  fallback = '',
): string {
  if (value == null || value === '') return fallback;

  const map = coerceToMap(value);
  if (!map) return typeof value === 'string' ? value || fallback : fallback;

  if (map[locale]) return map[locale]!;

  const lang = locale.split('-')[0] ?? '';
  if (lang) {
    const entry = Object.entries(map).find(([k]) => k.startsWith(lang));
    if (entry) return entry[1]!;
  }

  return Object.values(map)[0] ?? fallback;
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
