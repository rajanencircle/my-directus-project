import type { DownloadFormatPreset } from './downloadPresets'

/** Client download use cases (shared modal). */
export type DownloadUseCase = 'original' | 'web' | 'print' | 'custom'

export type WebFormat = 'auto' | 'avif' | 'webp' | 'jpg' | 'png' | 'svg'
export type WebResolution = 'hd' | 'uhd'

/** Directus /assets fit modes */
export type CustomFit = 'contain' | 'cover' | 'inside' | 'outside'

/** Directus format — empty/auto means omit (keep source format). */
export type CustomFormat = 'auto' | 'avif' | 'webp' | 'jpg' | 'png'

export const WEB_LONG_EDGE_PX: Record<WebResolution, number> = {
	hd: 1920,
	uhd: 3840,
}

/** Client web-delivery quality targets (Formats & Compression spec). */
export const WEB_QUALITY: Record<Exclude<WebFormat, 'svg' | 'png'>, number> = {
	avif: 55, // primary — quality ~50–60
	webp: 78, // fallback — quality ~75–80
	jpg: 83, // universal fallback — quality ~80–85 (mozjpeg)
}

export const PRINT_DPI = 300
/** Print JPG — quality ~90–95, CMYK, 300 dpi */
export const PRINT_JPEG_QUALITY = 92

export const CUSTOM_FIT_OPTIONS: { value: CustomFit; label: string }[] = [
	{ value: 'contain', label: 'Contain (preserve aspect ratio)' },
	{ value: 'cover', label: 'Cover (forces exact size)' },
	{ value: 'inside', label: 'Fit inside' },
	{ value: 'outside', label: 'Fit outside' },
]

/** Delivery order for raster web formats: Auto → AVIF → WebP → JPG/PNG (no SVG). */
export const RASTER_WEB_FORMATS: WebFormat[] = ['avif', 'webp', 'jpg', 'png']

export const WEB_FORMATS_FOR_RASTER: WebFormat[] = ['auto', ...RASTER_WEB_FORMATS]

export const CUSTOM_FORMAT_OPTIONS: { value: CustomFormat; label: string }[] = [
	{ value: 'auto', label: 'Auto' },
	{ value: 'avif', label: 'AVIF' },
	{ value: 'webp', label: 'WebP' },
	{ value: 'jpg', label: 'JPEG' },
	{ value: 'png', label: 'PNG' },
]

export type DownloadChoice = {
	useCase: DownloadUseCase
	webFormat?: WebFormat
	webResolution?: WebResolution
	printWidthCm?: number
	printHeightCm?: number
	/** Custom transform (Directus /assets params) */
	customFit?: CustomFit
	customWidth?: number
	customHeight?: number
	customQuality?: number
	customFormat?: CustomFormat
	customWithoutEnlargement?: boolean
}

export type DownloadModalFile = {
	id: string
	filename?: string | null
	type?: string | null
	width?: number | null
	height?: number | null
	media_sizes_cm?: string | null
}

export function isVideoMime(mime?: string | null): boolean {
	return (mime ?? '').toLowerCase().startsWith('video/')
}

export function isSvgMime(mime?: string | null): boolean {
	return (mime ?? '').toLowerCase().includes('svg')
}

/** Videos and SVG vectors are always delivered as original — never converted. */
export function isOriginalOnlyMime(mime?: string | null): boolean {
	return isVideoMime(mime) || isSvgMime(mime)
}

export function isRasterImageMime(mime?: string | null): boolean {
	const m = (mime ?? '').toLowerCase()
	return m.startsWith('image/') && !m.includes('svg')
}

export function supportsWebFormats(mime?: string | null): boolean {
	return (mime ?? '').toLowerCase().startsWith('image/')
}

export function supportsPrintDownload(mime?: string | null): boolean {
	return isRasterImageMime(mime)
}

export function supportsCustomDownload(mime?: string | null): boolean {
	return isRasterImageMime(mime)
}

/** Web transforms apply to raster images only; SVG stays vector.original. */
export function supportsWebTransformDownload(mime?: string | null): boolean {
	return isRasterImageMime(mime)
}

/**
 * Raster delivery formats (AVIF → WebP → JPG/PNG).
 * SVG sources only expose SVG — never convert vector to raster.
 */
export function webFormatsForMime(mime?: string | null): WebFormat[] {
	if (isSvgMime(mime)) return ['svg']
	return [...WEB_FORMATS_FOR_RASTER]
}

/** Formats available in Custom for a given mime (no vector conversion). */
export function customFormatsForMime(mime?: string | null): CustomFormat[] {
	if (mime != null && isOriginalOnlyMime(mime)) return ['auto']
	return CUSTOM_FORMAT_OPTIONS.map((o) => o.value)
}

export function defaultQualityForCustomFormat(format: CustomFormat): number {
	if (format === 'avif') return WEB_QUALITY.avif
	if (format === 'webp') return WEB_QUALITY.webp
	if (format === 'jpg') return WEB_QUALITY.jpg
	return WEB_QUALITY.jpg
}

/**
 * Build Directus /assets transform params for Web Use.
 * Long edge via width=height=longEdge + fit=inside (keeps aspect).
 * SVG format → original bytes (caller should skip transforms).
 */
export function buildWebAssetParams(opts: {
	format: WebFormat
	longEdgePx: number
	quality?: number
}): DownloadFormatPreset {
	const { format, longEdgePx } = opts
	if (format === 'svg') {
		return { label: 'SVG' }
	}

	if (format === 'auto') {
		return {
			label: 'Auto',
			width: longEdgePx,
			height: longEdgePx,
			fit: 'inside',
		}
	}

	const preset: DownloadFormatPreset = {
		label: format.toUpperCase(),
		format,
		width: longEdgePx,
		height: longEdgePx,
		fit: 'inside',
	}

	if (format === 'png') {
		// lossless — omit quality
	} else {
		const q =
			opts.quality ??
			WEB_QUALITY[format as Exclude<WebFormat, 'svg' | 'png'>] ??
			82
		preset.quality = q
	}

	return preset
}

export function buildCustomAssetParams(opts: {
	fit: CustomFit
	width?: number
	height?: number
	quality?: number
	format?: CustomFormat
	withoutEnlargement?: boolean
}): DownloadFormatPreset {
	const preset: DownloadFormatPreset = {
		label: 'Custom',
		fit: opts.fit,
	}
	if (opts.width != null && opts.width > 0) preset.width = Math.round(opts.width)
	if (opts.height != null && opts.height > 0) preset.height = Math.round(opts.height)
	if (opts.format && opts.format !== 'auto') preset.format = opts.format
	const fmt = opts.format ?? 'auto'
	if (opts.quality != null && fmt !== 'png' && fmt !== 'auto') {
		preset.quality = Math.min(100, Math.max(1, Math.round(opts.quality)))
	} else if (fmt !== 'auto' && fmt !== 'png') {
		preset.quality = defaultQualityForCustomFormat(fmt)
	}
	if (opts.withoutEnlargement) preset.withoutEnlargement = true
	return preset
}

export function cmToPrintPx(cm: number): number {
	if (!Number.isFinite(cm) || cm <= 0) return 0
	return Math.max(1, Math.round((cm / 2.54) * PRINT_DPI))
}

/** Parse strings like "10x15", "10 × 15 cm", "10.5, 15". */
export function parseMediaSizesCm(
	raw?: string | null,
): { widthCm: number; heightCm: number } | null {
	if (raw == null) return null
	const s = String(raw).trim()
	if (!s) return null

	const match = s.match(
		/(\d+(?:[.,]\d+)?)\s*(?:cm)?\s*[x×*,;/]\s*(\d+(?:[.,]\d+)?)/i,
	)
	if (!match) return null
	const widthCm = Number(String(match[1]).replace(',', '.'))
	const heightCm = Number(String(match[2]).replace(',', '.'))
	if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm)) return null
	if (widthCm <= 0 || heightCm <= 0) return null
	return { widthCm, heightCm }
}

export function choiceToAssetPreset(choice: DownloadChoice): DownloadFormatPreset {
	if (choice.useCase === 'original' || choice.useCase === 'print') {
		return { label: 'Original' }
	}
	if (choice.useCase === 'custom') {
		return buildCustomAssetParams({
			fit: choice.customFit ?? 'cover',
			width: choice.customWidth,
			height: choice.customHeight,
			quality: choice.customQuality,
			format: choice.customFormat ?? 'auto',
			withoutEnlargement: choice.customWithoutEnlargement !== false,
		})
	}
	const format = choice.webFormat ?? 'jpg'
	const res = choice.webResolution ?? 'hd'
	return buildWebAssetParams({
		format,
		longEdgePx: WEB_LONG_EDGE_PX[res],
	})
}

/**
 * Format-only preset — legacy folder ZIP submenu parity (format label only).
 * Prefer choiceToAssetPreset for full modal transforms (HD/UHD, quality, fit).
 */
export function choiceToLegacyFormatPreset(choice: DownloadChoice): DownloadFormatPreset {
	if (choice.useCase === 'original') return { label: 'Original' }
	if (choice.useCase === 'web') {
		const format = choice.webFormat ?? 'jpg'
		if (format === 'svg') return { label: 'SVG' }
		if (format === 'auto') {
			const res = choice.webResolution ?? 'hd'
			return { label: 'Auto', width: WEB_LONG_EDGE_PX[res], height: WEB_LONG_EDGE_PX[res], fit: 'inside' }
		}
		return { label: format.toUpperCase(), format }
	}
	return choiceToAssetPreset(choice)
}

export function zipSuffixForChoice(choice: DownloadChoice): string {
	if (choice.useCase === 'original') return ''
	// Legacy dev extension: folder ZIP named `{folder}-png.zip` etc.
	if (choice.useCase === 'web') {
		const fmt = choice.webFormat ?? 'jpg'
		if (fmt === 'svg') return '-svg'
		const res = choice.webResolution ?? 'hd'
		if (fmt === 'auto') return `-auto-${res}`
		return `-${fmt}-${res}`
	}
	if (choice.useCase === 'print') {
		const w = choice.printWidthCm
		const h = choice.printHeightCm
		if (w && h) return `-print-${w}x${h}cm`
		return '-print'
	}
	if (choice.useCase === 'custom') {
		const fmt = choice.customFormat && choice.customFormat !== 'auto' ? choice.customFormat : 'auto'
		const w = choice.customWidth ?? 0
		const h = choice.customHeight ?? 0
		return `-custom-${fmt}-${w}x${h}`
	}
	return ''
}

/** Default English labels — override via `$t:…` keys in Directus translations. */
export type DownloadModalLabels = {
	title: string
	useCase: string
	original: string
	webUse: string
	printUse: string
	custom: string
	format: string
	formatAuto: string
	resolution: string
	hd: string
	uhd: string
	widthCm: string
	heightCm: string
	printHint: string
	fit: string
	widthPx: string
	heightPx: string
	quality: string
	withoutEnlargement: string
	errorCustomSize: string
	download: string
	downloadZip: string
	cancel: string
	videoOriginalOnly: string
	svgOriginalOnly: string
	originalOnlyMixed: string
	errorGeneric: string
	errorPrintSize: string
}

export const DEFAULT_DOWNLOAD_MODAL_LABELS: DownloadModalLabels = {
	title: 'Download',
	useCase: 'Use case',
	original: 'Original',
	webUse: 'Web Use',
	printUse: 'Print Use',
	custom: 'Custom',
	format: 'Format',
	formatAuto: 'Auto',
	resolution: 'Resolution',
	hd: 'HD (1920)',
	uhd: 'UHD (3840)',
	widthCm: 'Width (cm)',
	heightCm: 'Height (cm)',
	printHint: 'JPG · CMYK · 300 dpi',
	fit: 'Fit',
	widthPx: 'Width',
	heightPx: 'Height',
	quality: 'Quality',
	withoutEnlargement: "Don't upscale images",
	errorCustomSize: 'Enter a valid width and/or height in pixels.',
	download: 'Download',
	downloadZip: 'Download ZIP',
	cancel: 'Cancel',
	videoOriginalOnly: 'Videos download as original only.',
	svgOriginalOnly: 'SVG graphics download as original only.',
	originalOnlyMixed: 'Videos and SVG graphics download as original only.',
	errorGeneric: 'Download failed. Please try again.',
	errorPrintSize: 'Enter valid width and height in cm.',
}
