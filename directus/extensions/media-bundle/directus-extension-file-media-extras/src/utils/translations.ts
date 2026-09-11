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
  // Directus translated-string arrays: [{ language: 'en-US', translation: '…' }, …]
  if (Array.isArray(value)) {
    const map: Record<string, string> = {};
    for (const item of value as any[]) {
      if (!item || typeof item !== 'object') continue;
      const lang = String(item.language ?? item.lang ?? '').trim();
      const text = item.translation ?? item.value ?? item.text;
      if (lang && typeof text === 'string' && text.trim()) map[lang] = text.trim();
    }
    return Object.keys(map).length ? map : null;
  }
  if (typeof value === 'object' && value !== null) {
    // Only keep string values (ignore nested junk that can produce "Productsen"-style glitches)
    const map: Record<string, string> = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'string' && v.trim()) map[k] = v.trim();
    }
    return Object.keys(map).length ? map : null;
  }
  const trimmed = (value as string).trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return coerceToMap(parsed as TranslatableString);
  } catch {
    return null;
  }
}
