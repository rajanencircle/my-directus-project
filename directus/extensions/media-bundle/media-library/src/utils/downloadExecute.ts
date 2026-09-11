import { zipSync } from 'fflate'
import type { DownloadFormatPreset } from './downloadPresets'
import {
	type DownloadChoice,
	choiceToAssetPreset,
	isOriginalOnlyMime,
	isRasterImageMime,
	isSvgMime,
	zipSuffixForChoice,
} from './downloadVariants'
import {
	type ApiClient,
	type DownloadFileMeta,
	type SaveTarget,
	blobToUint8Array,
	downloadFileBlobViaApi,
	fetchAssetBlob,
	resolveDownloadFilename,
	sanitizeFilenamePart,
	saveBlobAsFile,
	supportsMultiFormatDownload,
	uniqueZipPath,
	withFormatExtension,
} from './zipDownloadShared'

export type DownloadApiClient = ApiClient & {
	post: (url: string, data?: unknown, config?: Record<string, unknown>) => Promise<{ data: any }>
}

/**
 * Fetch one file according to DownloadChoice (authenticated blob).
 * Videos / SVG → always original (never converted).
 * Print → POST /media-download/print (raster only)
 * Web / Custom → /assets transform (raster only)
 */
export async function fetchFileForChoice(
	api: DownloadApiClient,
	file: DownloadFileMeta & {
		width?: number | null
		height?: number | null
		media_sizes_cm?: string | null
	},
	choice: DownloadChoice,
): Promise<{ blob: Blob; filename: string }> {
	const mime = file.type

	// Vector & video: never convert — same as Original regardless of modal choice.
	if (isOriginalOnlyMime(mime)) {
		const { blob, filename } = await fetchAssetBlob(api, file, { label: 'Original' })
		if (isSvgMime(mime)) {
			return {
				blob,
				filename: withFormatExtension(resolveDownloadFilename(file), 'svg'),
			}
		}
		return { blob, filename }
	}

	if (choice.useCase === 'original' || !isRasterImageMime(mime)) {
		return fetchAssetBlob(api, file, { label: 'Original' })
	}

	if (choice.useCase === 'print') {
		const widthCm = choice.printWidthCm
		const heightCm = choice.printHeightCm
		if (!widthCm || !heightCm || widthCm <= 0 || heightCm <= 0) {
			throw new Error('Invalid print size')
		}
		const res = await api.post(
			'/media-download/print',
			{ fileId: file.id, widthCm, heightCm },
			{ responseType: 'blob', validateStatus: () => true },
		)
		const status = res?.status ?? 200
		const raw = res?.data
		if (!(raw instanceof Blob)) {
			throw new Error('Invalid print response')
		}
		if (status >= 400 || (raw.type || '').includes('json')) {
			const text = await raw.text()
			try {
				const json = JSON.parse(text)
				throw new Error(
					json?.message || json?.error || json?.errors?.[0]?.message || 'Print failed',
				)
			} catch (err) {
				if (err instanceof SyntaxError) throw new Error(text.slice(0, 200) || 'Print failed')
				throw err
			}
		}
		return { blob: raw, filename: withFormatExtension(resolveDownloadFilename(file), 'jpg') }
	}

	const preset = choiceToAssetPreset(choice)
	return fetchAssetBlob(api, file, preset)
}

function presetForSingleDownload(choice: DownloadChoice): DownloadFormatPreset {
	if (choice.useCase === 'original') return { label: 'Original' }
	if (choice.useCase === 'custom') return choiceToAssetPreset(choice)
	if (choice.useCase === 'web') return choiceToAssetPreset(choice)
	return { label: 'Original' }
}

export function suggestedFilenameForChoice(
	file: DownloadFileMeta | null,
	choice: DownloadChoice,
	options?: { mode?: 'single' | 'zip'; zipBaseName?: string },
): string {
	const mode = options?.mode ?? 'single'
	if (mode === 'zip') {
		const base = sanitizeFilenamePart(options?.zipBaseName ?? 'download')
		return `${base}${zipSuffixForChoice(choice)}.zip`
	}
	if (!file) return 'download'
	if (choice.useCase === 'print') {
		return withFormatExtension(resolveDownloadFilename(file), 'jpg')
	}
	const preset = presetForSingleDownload(choice)
	let name = resolveDownloadFilename(file)
	if (preset.format && supportsMultiFormatDownload(file.type)) {
		name = withFormatExtension(name, preset.format)
	}
	return name
}

/**
 * Single-file download — legacy dev blob path for /assets; print via POST endpoint.
 */
export async function downloadSingleForChoice(
	api: DownloadApiClient,
	file: DownloadFileMeta,
	choice: DownloadChoice,
	saveTarget: SaveTarget,
): Promise<void> {
	if (choice.useCase === 'print') {
		const { blob, filename } = await fetchFileForChoice(api, file, choice)
		await saveBlobAsFile(blob, filename, saveTarget)
		return
	}
	const preset = presetForSingleDownload(choice)
	const { blob, filename } = await downloadFileBlobViaApi(
		api,
		file.id,
		preset,
		file.type,
		file.filename_download,
	)
	await saveBlobAsFile(blob, filename, saveTarget)
}

export async function downloadManyAsZipForChoice(
	api: DownloadApiClient,
	files: DownloadFileMeta[],
	zipBaseName: string,
	choice: DownloadChoice,
	saveTarget: SaveTarget,
	pathForFile?: (file: DownloadFileMeta, filename: string) => string,
): Promise<{ ok: true; count: number } | { ok: false; reason: 'empty' | 'error'; error?: unknown }> {
	try {
		if (!files.length) return { ok: false, reason: 'empty' }
		const zipEntries: Record<string, Uint8Array> = {}
		const usedNames = new Set<string>()

		for (const file of files) {
			const { blob, filename } = await fetchFileForChoice(api, file, choice)
			const path = uniqueZipPath(
				usedNames,
				pathForFile ? pathForFile(file, filename) : filename,
			)
			zipEntries[path] = await blobToUint8Array(blob)
		}
		const zipped = zipSync(zipEntries, { level: 6 })
		const zipBytes = new Uint8Array(zipped.byteLength)
		zipBytes.set(zipped)
		const zipFilename = suggestedFilenameForChoice(null, choice, {
			mode: 'zip',
			zipBaseName,
		})
		await saveBlobAsFile(new Blob([zipBytes], { type: 'application/zip' }), zipFilename, saveTarget)
		return { ok: true, count: files.length }
	} catch (error) {
		console.error('[media-library] ZIP download failed:', error)
		return { ok: false, reason: 'error', error }
	}
}

/** @deprecated Prefer DownloadChoice — kept for any leftover callers */
export function legacyPresetFromChoice(choice: DownloadChoice): DownloadFormatPreset {
	return choiceToAssetPreset(choice)
}
