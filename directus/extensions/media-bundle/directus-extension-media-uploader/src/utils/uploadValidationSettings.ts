/**
 * Load + cache upload validation rules from media_library_settings.
 * Used by UploadModal and Media Library DropZone.
 *
 * Whitelist-only: anything not in allowed image/video formats is rejected.
 */

export type UploadValidationSettings = {
	enabled: boolean
	allowedImageFormats: string[]
	allowedVideoFormats: string[]
	minImageEdgePx: number
	maxImageSizeMb: number
	maxVideoSizeMb: number
}

export const DEFAULT_UPLOAD_VALIDATION: UploadValidationSettings = {
	enabled: true,
	allowedImageFormats: [
		'jpg',
		'jpeg',
		'png',
		'tif',
		'tiff',
		'svg',
		'webp',
		'avif',
		'gif',
	],
	allowedVideoFormats: ['mp4', 'webm', 'mov'],
	minImageEdgePx: 591,
	maxImageSizeMb: 50,
	maxVideoSizeMb: 2048,
}

type ApiClient = {
	get: (url: string, config?: { params?: Record<string, unknown> }) => Promise<{ data: any }>
}

function normalizeFormats(raw: unknown, fallback: string[]): string[] {
	let list: string[] = []
	if (Array.isArray(raw)) {
		list = raw.map((v) => String(v ?? ''))
	} else if (typeof raw === 'string') {
		list = raw.split(',')
	} else {
		return [...fallback]
	}
	const cleaned = list
		.map((s) => s.trim().toLowerCase().replace(/^\./, ''))
		.filter(Boolean)
	return cleaned.length ? cleaned : [...fallback]
}

function toInt(raw: unknown, fallback: number): number {
	const n = typeof raw === 'number' ? raw : Number(raw)
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function cloneDefaults(): UploadValidationSettings {
	return {
		...DEFAULT_UPLOAD_VALIDATION,
		allowedImageFormats: [...DEFAULT_UPLOAD_VALIDATION.allowedImageFormats],
		allowedVideoFormats: [...DEFAULT_UPLOAD_VALIDATION.allowedVideoFormats],
	}
}

export function parseUploadValidationSettings(
	data: Record<string, any> | null | undefined,
): UploadValidationSettings {
	if (!data) return cloneDefaults()

	const enabled =
		data.upload_validation_enabled === undefined || data.upload_validation_enabled === null
			? true
			: Boolean(data.upload_validation_enabled)

	return {
		enabled,
		allowedImageFormats: normalizeFormats(
			data.allowed_image_formats,
			DEFAULT_UPLOAD_VALIDATION.allowedImageFormats,
		),
		allowedVideoFormats: normalizeFormats(
			data.allowed_video_formats,
			DEFAULT_UPLOAD_VALIDATION.allowedVideoFormats,
		),
		minImageEdgePx: toInt(data.min_image_edge_px, DEFAULT_UPLOAD_VALIDATION.minImageEdgePx),
		maxImageSizeMb: toInt(data.max_image_size_mb, DEFAULT_UPLOAD_VALIDATION.maxImageSizeMb),
		maxVideoSizeMb: toInt(data.max_video_size_mb, DEFAULT_UPLOAD_VALIDATION.maxVideoSizeMb),
	}
}

const VALIDATION_FIELDS = [
	'upload_validation_enabled',
	'allowed_image_formats',
	'allowed_video_formats',
	'min_image_edge_px',
	'max_image_size_mb',
	'max_video_size_mb',
] as const

let _cache: UploadValidationSettings | null = null
let _fetchPromise: Promise<UploadValidationSettings> | null = null

/** Clear cache (e.g. after settings save in same session — optional). */
export function clearUploadValidationSettingsCache() {
	_cache = null
	_fetchPromise = null
}

export async function loadUploadValidationSettings(
	api: ApiClient,
	opts?: { force?: boolean },
): Promise<UploadValidationSettings> {
	if (!opts?.force && _cache) return _cache
	if (!opts?.force && _fetchPromise) return _fetchPromise

	_fetchPromise = (async () => {
		try {
			const res = await api.get('/items/media_library_settings', {
				params: {
					// Array form is reliable with axios / Directus field selection
					fields: [...VALIDATION_FIELDS],
				},
			})
			const raw = res.data?.data
			// Singleton returns an object; non-singleton list would be an array
			const data = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null)
			_cache = parseUploadValidationSettings(data)
		} catch {
			// Fallback: fetch full item if field selection fails
			try {
				const res = await api.get('/items/media_library_settings')
				const raw = res.data?.data
				const data = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null)
				_cache = parseUploadValidationSettings(data)
			} catch {
				_cache = parseUploadValidationSettings(null)
			}
		}
		return _cache!
	})()

	try {
		return await _fetchPromise
	} finally {
		_fetchPromise = null
	}
}

/** Build OS file-picker accept string from allowed extensions. */
export function buildAcceptFromValidation(settings: UploadValidationSettings): string | undefined {
	if (!settings.enabled) return undefined
	const exts = [
		...settings.allowedImageFormats,
		...settings.allowedVideoFormats,
	]
	if (!exts.length) return undefined
	return exts.map((e) => `.${e}`).join(',')
}
