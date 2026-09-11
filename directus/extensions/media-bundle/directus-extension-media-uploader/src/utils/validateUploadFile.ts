import type { UploadValidationSettings } from './uploadValidationSettings'

export function getFileExtension(filename: string): string {
	const base = filename.split(/[/\\]/).pop() ?? filename
	const i = base.lastIndexOf('.')
	if (i <= 0 || i === base.length - 1) return ''
	return base.slice(i + 1).toLowerCase()
}

function isImageExt(ext: string, settings: UploadValidationSettings): boolean {
	return settings.allowedImageFormats.includes(ext)
}

function isVideoExt(ext: string, settings: UploadValidationSettings): boolean {
	return settings.allowedVideoFormats.includes(ext)
}

async function readImageDimensions(
	file: File,
): Promise<{ width: number; height: number } | null> {
	try {
		if (typeof createImageBitmap === 'function') {
			const bitmap = await createImageBitmap(file)
			const dims = { width: bitmap.width, height: bitmap.height }
			bitmap.close?.()
			return dims
		}
	} catch {
		// fall through to Image()
	}

	return new Promise((resolve) => {
		const url = URL.createObjectURL(file)
		const img = new Image()
		img.onload = () => {
			const dims = { width: img.naturalWidth, height: img.naturalHeight }
			URL.revokeObjectURL(url)
			resolve(dims)
		}
		img.onerror = () => {
			URL.revokeObjectURL(url)
			resolve(null)
		}
		img.src = url
	})
}

/**
 * Validate a File against media_library_settings rules.
 * Returns an error message string, or null if OK.
 */
export async function validateUploadFile(
	file: File,
	settings: UploadValidationSettings,
	fallback?: {
		/** Legacy interface max size in bytes (used only when settings disabled). */
		maxFileSizeBytes?: number | null
		/** Legacy MIME allow list (used only when settings disabled). */
		allowedTypes?: string | null
	},
): Promise<string | null> {
	if (!settings.enabled) {
		return validateLegacy(file, fallback)
	}

	const ext = getFileExtension(file.name)
	if (!ext) {
		return 'File must have an extension'
	}

	// Whitelist only — anything not in allowed image/video lists is rejected
	const asImage = isImageExt(ext, settings)
	const asVideo = isVideoExt(ext, settings)

	if (!asImage && !asVideo) {
		return `Format ".${ext}" is not permitted`
	}

	const sizeBytes = file.size
	if (asImage) {
		const maxBytes = settings.maxImageSizeMb * 1024 * 1024
		if (sizeBytes > maxBytes) {
			return `Image exceeds max size of ${settings.maxImageSizeMb} MB`
		}
	}
	if (asVideo) {
		const maxBytes = settings.maxVideoSizeMb * 1024 * 1024
		if (sizeBytes > maxBytes) {
			return `Video exceeds max size of ${settings.maxVideoSizeMb} MB`
		}
	}

	// Resolution check for raster images only (skip SVG)
	if (asImage && ext !== 'svg' && settings.minImageEdgePx > 0) {
		const dims = await readImageDimensions(file)
		if (!dims || !dims.width || !dims.height) {
			return 'Could not read image dimensions'
		}
		const shortest = Math.min(dims.width, dims.height)
		if (shortest < settings.minImageEdgePx) {
			return `Image too small (${dims.width}×${dims.height}). Minimum edge is ${settings.minImageEdgePx} px`
		}
	}

	return null
}

function validateLegacy(
	file: File,
	fallback?: {
		maxFileSizeBytes?: number | null
		allowedTypes?: string | null
	},
): string | null {
	const max = fallback?.maxFileSizeBytes
	if (max && file.size > max) {
		const maxMB = (max / 1024 / 1024).toFixed(1)
		return `File exceeds max size of ${maxMB} MB`
	}
	const allowed = fallback?.allowedTypes
	if (!allowed || allowed === '*/*') return null
	const patterns = allowed.split(',').map((s) => s.trim())
	const matches = patterns.some((pattern) => {
		if (pattern.endsWith('/*')) {
			const group = pattern.split('/')[0]
			return file.type.startsWith(`${group}/`)
		}
		return file.type === pattern || pattern === '*/*'
	})
	if (!matches) return `File type "${file.type || 'unknown'}" is not allowed`
	return null
}
