import {
	DEFAULT_DOWNLOAD_MODAL_LABELS,
	type DownloadModalLabels,
} from './downloadVariants'
import { resolveTranslatable, type TranslatableString } from './translations'

/** Settings field name → label property on DownloadModalLabels */
const DOWNLOAD_LABEL_FIELDS: Array<{
	field: string
	labelKey: keyof DownloadModalLabels
}> = [
	{ field: 'download_modal_title', labelKey: 'title' },
	{ field: 'download_use_case', labelKey: 'useCase' },
	{ field: 'download_original', labelKey: 'original' },
	{ field: 'download_web_use', labelKey: 'webUse' },
	{ field: 'download_print_use', labelKey: 'printUse' },
	{ field: 'download_custom', labelKey: 'custom' },
	{ field: 'download_format', labelKey: 'format' },
	{ field: 'download_format_auto', labelKey: 'formatAuto' },
	{ field: 'download_resolution', labelKey: 'resolution' },
	{ field: 'download_hd', labelKey: 'hd' },
	{ field: 'download_uhd', labelKey: 'uhd' },
	{ field: 'download_width_cm', labelKey: 'widthCm' },
	{ field: 'download_height_cm', labelKey: 'heightCm' },
	{ field: 'download_print_hint', labelKey: 'printHint' },
	{ field: 'download_fit', labelKey: 'fit' },
	{ field: 'download_width_px', labelKey: 'widthPx' },
	{ field: 'download_height_px', labelKey: 'heightPx' },
	{ field: 'download_quality', labelKey: 'quality' },
	{ field: 'download_without_enlargement', labelKey: 'withoutEnlargement' },
	{ field: 'download_error_custom_size', labelKey: 'errorCustomSize' },
	{ field: 'download_action', labelKey: 'download' },
	{ field: 'download_zip', labelKey: 'downloadZip' },
	{ field: 'download_video_only', labelKey: 'videoOriginalOnly' },
	{ field: 'download_svg_only', labelKey: 'svgOriginalOnly' },
	{ field: 'download_vector_video_only', labelKey: 'originalOnlyMixed' },
	{ field: 'download_error', labelKey: 'errorGeneric' },
	{ field: 'download_error_print_size', labelKey: 'errorPrintSize' },
]

/**
 * Resolve one download-modal label.
 * Order: settings `$t:` / locale map → Directus Settings→Translations (`t(field)`) → settings plain text → English default.
 */
export function resolveDownloadModalLabel(
	translationKey: string,
	t: (key: string) => string,
	settingsValue: TranslatableString | null | undefined,
	fallback: string,
): string {
	if (settingsValue != null && settingsValue !== '') {
		if (
			typeof settingsValue === 'string' &&
			(settingsValue.startsWith('$t:') || settingsValue.trim().startsWith('{'))
		) {
			return resolveTranslatable(settingsValue, t, fallback)
		}
	}

	const translated = t(translationKey)
	if (translated && translated !== translationKey) return translated

	if (settingsValue != null && settingsValue !== '') {
		const fromSettings = resolveTranslatable(settingsValue, t, '')
		if (fromSettings && fromSettings !== fallback) return fromSettings
	}

	return fallback
}

/** Build translated DownloadModal labels (media_library_settings + Directus translations). */
export function buildDownloadModalLabels(
	t: (key: string) => string,
	settings?: Record<string, TranslatableString | null | undefined> | null,
): DownloadModalLabels {
	const out = { ...DEFAULT_DOWNLOAD_MODAL_LABELS }

	for (const { field, labelKey } of DOWNLOAD_LABEL_FIELDS) {
		out[labelKey] = resolveDownloadModalLabel(
			field,
			t,
			settings?.[field],
			DEFAULT_DOWNLOAD_MODAL_LABELS[labelKey],
		)
	}

	out.cancel = t('cancel') || DEFAULT_DOWNLOAD_MODAL_LABELS.cancel
	return out
}
