import { zipSync } from 'fflate'
import type { DownloadFormatPreset } from './downloadPresets'

export type ApiClient = {
	get: (url: string, config?: Record<string, unknown>) => Promise<{ data: any }>
}

export type DownloadFileMeta = {
	id: string
	type?: string | null
	filename_download?: string | null
	filename_disk?: string | null
	title?: string | null
}

const MIME_TO_EXT: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/jpg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/avif': 'avif',
	'image/svg+xml': 'svg',
	'image/tiff': 'tiff',
	'image/bmp': 'bmp',
	'image/heic': 'heic',
	'image/heif': 'heif',
	'video/mp4': 'mp4',
	'video/quicktime': 'mov',
	'video/webm': 'webm',
	'video/ogg': 'ogv',
	'video/x-msvideo': 'avi',
	'video/x-matroska': 'mkv',
	'audio/mpeg': 'mp3',
	'audio/wav': 'wav',
	'audio/ogg': 'ogg',
	'audio/mp4': 'm4a',
	'audio/aac': 'aac',
	'audio/flac': 'flac',
	'application/pdf': 'pdf',
	'application/zip': 'zip',
	'text/plain': 'txt',
	'text/csv': 'csv',
}

export function sanitizeFilenamePart(name: string): string {
	return (
		name
			.trim()
			.replace(/[\\/:*?"<>|]+/g, '-')
			.replace(/\s+/g, ' ')
			.slice(0, 120) || 'file'
	)
}

function extensionOf(name: string | null | undefined): string {
	const n = (name ?? '').trim()
	if (!n) return ''
	const base = n.split(/[?#]/)[0] ?? n
	const dot = base.lastIndexOf('.')
	if (dot <= 0 || dot === base.length - 1) return ''
	return base.slice(dot + 1).toLowerCase()
}

function stripExtension(name: string): string {
	const n = name.trim()
	const dot = n.lastIndexOf('.')
	if (dot <= 0) return n
	return n.slice(0, dot)
}

const STORAGE_UUID_NAME =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isStorageUuidName(name: string | null | undefined): boolean {
	const trimmed = (name ?? '').trim()
	if (!trimmed) return false
	return STORAGE_UUID_NAME.test(stripExtension(trimmed))
}

function extFromMime(mime: string | null | undefined): string {
	const m = (mime ?? '').trim().toLowerCase()
	if (!m) return ''
	if (MIME_TO_EXT[m]) return MIME_TO_EXT[m]
	const bare = m.split(';')[0]?.trim() ?? ''
	if (MIME_TO_EXT[bare]) return MIME_TO_EXT[bare]
	const slash = bare.lastIndexOf('/')
	if (slash >= 0) {
		const sub = bare.slice(slash + 1).replace(/^x-/, '')
		if (sub && /^[a-z0-9]+$/i.test(sub) && sub !== 'octet-stream') return sub.toLowerCase()
	}
	return ''
}

/**
 * Shared by album + folder ZIP downloads.
 * Ensures unzipped files keep a real extension (jpg/mp4/…) when
 * filename_download has none — otherwise macOS shows "Document".
 */
export function resolveDownloadFilename(file: DownloadFileMeta): string {
	const candidates = [file.filename_download, file.filename_disk, file.title]
		.map((v) => (v ?? '').trim())
		.filter(Boolean)

	const withExt = candidates.find((n) => extensionOf(n))
	if (withExt) return sanitizeFilenamePart(withExt)

	const baseRaw = candidates[0] || file.id
	const base = sanitizeFilenamePart(stripExtension(baseRaw) || file.id)
	const ext =
		extFromMime(file.type) ||
		extensionOf(file.filename_disk) ||
		extensionOf(file.filename_download)

	return ext ? `${base}.${ext}` : base
}

/** Human-readable filename for UI — prefers title/download name, not storage UUID. */
export function resolveDisplayFilename(
	file: DownloadFileMeta & { generated_filename?: string | null },
): string {
	const readableCandidates = [file.generated_filename, file.title, file.filename_download]
		.map((v) => (v ?? '').trim())
		.filter(Boolean)
		.filter((name) => !isStorageUuidName(name))

	const withExt = readableCandidates.find((name) => extensionOf(name))
	if (withExt) return sanitizeFilenamePart(withExt)

	const baseRaw = readableCandidates[0]
	if (baseRaw) {
		const base = sanitizeFilenamePart(stripExtension(baseRaw))
		const ext =
			extFromMime(file.type) ||
			extensionOf(file.filename_download) ||
			extensionOf(file.filename_disk)
		return ext ? `${base}.${ext}` : base
	}

	return resolveDownloadFilename(file)
}

export function supportsMultiFormatDownload(mimeType?: string | null): boolean {
	return mimeType?.startsWith('image/') ?? false
}

export function withFormatExtension(filename: string, format?: string): string {
	if (!format) return filename
	const dot = filename.lastIndexOf('.')
	const base = dot >= 0 ? filename.slice(0, dot) : filename
	return `${base}.${format}`
}

export function uniqueZipPath(used: Set<string>, filename: string): string {
	if (!used.has(filename)) {
		used.add(filename)
		return filename
	}
	const dot = filename.lastIndexOf('.')
	const base = dot >= 0 ? filename.slice(0, dot) : filename
	const ext = dot >= 0 ? filename.slice(dot) : ''
	let i = 2
	let candidate = `${base}-${i}${ext}`
	while (used.has(candidate)) {
		i += 1
		candidate = `${base}-${i}${ext}`
	}
	used.add(candidate)
	return candidate
}

export async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
	const buffer = await blob.arrayBuffer()
	return new Uint8Array(buffer)
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
	const blobUrl = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = blobUrl
	link.download = filename
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
}

/** Hide open dialog overlays so post-await anchor clicks still trigger browser downloads. */
const DIALOG_HIDE_SELECTORS = [
	'.v-overlay.active',
	'.v-overlay--active',
	'.v-dialog.active',
	'.v-dialog--active',
	'[role="dialog"]',
]

export async function triggerBlobDownloadBypassingDialogs(
	blob: Blob,
	filename: string,
): Promise<void> {
	const prevStyles = new Map<
		HTMLElement,
		{ visibility: string; pointerEvents: string }
	>()

	for (const selector of DIALOG_HIDE_SELECTORS) {
		document.querySelectorAll(selector).forEach((el) => {
			const node = el as HTMLElement
			if (prevStyles.has(node)) return
			prevStyles.set(node, {
				visibility: node.style.visibility,
				pointerEvents: node.style.pointerEvents,
			})
			node.style.visibility = 'hidden'
			node.style.pointerEvents = 'none'
		})
	}

	// Let the browser process overlay removal before the programmatic click.
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
	})

	try {
		triggerBlobDownload(blob, filename)
	} finally {
		setTimeout(() => {
			prevStyles.forEach((styles, node) => {
				node.style.visibility = styles.visibility
				node.style.pointerEvents = styles.pointerEvents
			})
		}, 300)
	}
}

export type SaveTarget =
	| { kind: 'handle'; handle: FileSystemFileHandle }
	| { kind: 'anchor' }

/** Prefer browser download manager (native chip/toast). Used after blob is fetched. */
export function createBrowserDownloadTarget(): SaveTarget {
	return { kind: 'anchor' }
}

/**
 * Open the native OS save picker (no browser download chip). Fallback only.
 * Returns null when the user cancels.
 */
export async function requestFilePickerTarget(filename: string): Promise<SaveTarget | null> {
	if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
		try {
			const handle = await (window as Window & { showSaveFilePicker: (opts: { suggestedName: string }) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
				suggestedName: filename,
			})
			return { kind: 'handle', handle }
		} catch (err: unknown) {
			if (err instanceof DOMException && err.name === 'AbortError') return null
		}
	}
	return { kind: 'anchor' }
}

/** Detect JSON error bodies returned with blob responseType. */
export async function validateAssetBlob(blob: Blob): Promise<Blob> {
	if (!(blob instanceof Blob)) throw new Error('Invalid download response')
	const type = (blob.type || '').toLowerCase()
	if (!type.includes('json') && !type.includes('text/plain')) return blob

	const text = await blob.text()
	const trimmed = text.trim()
	if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return blob

	try {
		const json = JSON.parse(trimmed)
		throw new Error(
			json?.errors?.[0]?.message || json?.message || json?.error || 'Download failed',
		)
	} catch (err) {
		if (err instanceof SyntaxError) throw new Error(trimmed.slice(0, 200) || 'Download failed')
		throw err
	}
}

/**
 * Write a blob using a pre-opened save target.
 * Anchor path uses dialog-bypass so the browser download chip appears (Chrome top-right).
 */
export async function saveBlobAsFile(
	blob: Blob,
	filename: string,
	target: SaveTarget,
): Promise<void> {
	const validated = await validateAssetBlob(blob)
	if (target.kind === 'handle') {
		const writable = await target.handle.createWritable()
		await writable.write(validated)
		await writable.close()
		return
	}
	await triggerBlobDownloadBypassingDialogs(validated, filename)
}

function buildAssetParams(
	file: DownloadFileMeta,
	preset: DownloadFormatPreset,
): { params: Record<string, string>; filename: string } {
	const isImage = supportsMultiFormatDownload(file.type)
	// Empty string matches pre-modal / Directus Studio `?download`
	const params: Record<string, string> = { download: '' }

	if (isImage) {
		if (preset.format) params.format = preset.format
		if (preset.width != null) params.width = String(preset.width)
		if (preset.height != null) params.height = String(preset.height)
		if (preset.fit) params.fit = preset.fit
		if (preset.quality != null) params.quality = String(preset.quality)
		if (preset.withoutEnlargement) params.withoutEnlargement = 'true'
	}

	let filename = resolveDownloadFilename(file)
	if (isImage && preset.format) {
		filename = withFormatExtension(filename, preset.format)
	}
	return { params, filename }
}

/**
 * Proven single-file download — same as legacy dev extension downloadFileViaApi /
 * FileDetailView.downloadPreset (axios blob + ObjectURL + a.click).
 */
export async function downloadFileBlobViaApi(
	api: ApiClient,
	fileId: string,
	preset: DownloadFormatPreset,
	mimeType?: string | null,
	filename?: string | null,
): Promise<{ blob: Blob; filename: string }> {
	const isImage = supportsMultiFormatDownload(mimeType)
	const params: Record<string, string> = { download: '' }

	if (isImage) {
		if (preset.format) params.format = preset.format
		if (preset.width != null) params.width = String(preset.width)
		if (preset.height != null) params.height = String(preset.height)
		if (preset.fit) params.fit = preset.fit
		if (preset.quality != null) params.quality = String(preset.quality)
		if (preset.withoutEnlargement) params.withoutEnlargement = 'true'
	}

	let targetFilename = filename ?? 'download'
	if (isImage && preset.format) {
		const dot = targetFilename.lastIndexOf('.')
		targetFilename =
			(dot >= 0 ? targetFilename.slice(0, dot) : targetFilename) + '.' + preset.format
	}

	const res = await api.get(`/assets/${fileId}`, { params, responseType: 'blob' })
	return { blob: res.data as Blob, filename: targetFilename }
}

/**
 * Authenticated asset fetch via Directus `useApi()` Axios (Bearer on the request).
 */
export async function fetchAssetBlob(
	api: ApiClient,
	file: DownloadFileMeta,
	preset: DownloadFormatPreset,
): Promise<{ blob: Blob; filename: string }> {
	const { params, filename } = buildAssetParams(file, preset)

	const res = await api.get(`/assets/${file.id}`, {
		params,
		responseType: 'blob',
	})
	return { blob: res.data as Blob, filename }
}

export function finishZipDownload(
	entries: Record<string, Uint8Array>,
	zipBaseName: string,
	preset: DownloadFormatPreset,
): void {
	const zipped = zipSync(entries, { level: 6 })
	const zipBytes = new Uint8Array(zipped.byteLength)
	zipBytes.set(zipped)
	const formatPart = preset.format ? `-${preset.format}` : ''
	triggerBlobDownload(
		new Blob([zipBytes], { type: 'application/zip' }),
		`${sanitizeFilenamePart(zipBaseName)}${formatPart}.zip`,
	)
}
