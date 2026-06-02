export type TranslatableString = string | Record<string, string>

/**
 * Resolve a value that may be a plain string, a "$t:key" reference, or a JSON locale map.
 */
export function resolveTranslatable(
  value: TranslatableString | undefined | null,
  t: (key: string) => string,
  fallback = '',
): string {
  if (value == null || value === '') return fallback

  if (typeof value === 'string' && value.startsWith('$t:')) {
    const key = value.slice(3).trim()
    const resolved = t(key)
    return resolved !== key ? resolved : fallback || key
  }

  const map = coerceToMap(value)
  if (map) {
    const locale = document.documentElement.lang || 'en-US'
    if (map[locale]) return map[locale]!
    const lang = locale.split('-')[0] ?? ''
    if (lang) {
      const entry = Object.entries(map).find(([k]) => k.startsWith(lang))
      if (entry) return entry[1]!
    }
    return Object.values(map)[0] ?? fallback
  }

  return typeof value === 'string' ? value || fallback : fallback
}

function coerceToMap(value: TranslatableString): Record<string, string> | null {
  if (typeof value === 'object') return value
  const trimmed = (value as string).trim()
  if (!trimmed.startsWith('{')) return null
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
  } catch {}
  return null
}
