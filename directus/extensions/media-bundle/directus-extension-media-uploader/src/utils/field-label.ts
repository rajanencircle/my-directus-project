/**
 * Resolve a Directus field display name from Field Name Translations
 * (meta.translations), matching the current app language.
 */
export function resolveFieldTranslatedName(
	field: { name?: string; meta?: { translations?: Array<{ language?: string; translation?: string }> | null } | null } | null | undefined,
	locale: string,
	fallback = '',
): string {
	const translations = field?.meta?.translations ?? []
	if (translations.length) {
		const lang = (locale.split('-')[0] ?? '').toLowerCase()
		const match =
			translations.find((t) => t.language === locale) ??
			translations.find((t) => (t.language ?? '').toLowerCase().startsWith(lang)) ??
			translations[0]
		const translated = match?.translation?.trim()
		if (translated) return translated
	}

	const name = typeof field?.name === 'string' ? field.name.trim() : ''
	return name || fallback
}
