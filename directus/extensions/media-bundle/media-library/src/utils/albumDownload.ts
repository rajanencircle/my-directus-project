import type { DownloadChoice } from './downloadVariants'
import type { DownloadModalFile } from './downloadVariants'
import {
	type DownloadApiClient,
	downloadManyAsZipForChoice,
} from './downloadExecute'
import type { DownloadFileMeta, SaveTarget } from './zipDownloadShared'

export type AlbumDownloadResult =
	| { ok: true; count: number }
	| { ok: false; reason: 'empty' | 'error'; error?: unknown }

async function fetchAlbumFileIds(api: DownloadApiClient, albumId: string): Promise<string[]> {
	const res = await api.get('/items/albums_directus_files', {
		params: {
			filter: { albums_directus_id: { _eq: albumId } },
			fields: ['directus_files_id'],
			limit: -1,
		},
	})
	const rows: Array<{ directus_files_id?: string | null }> = res.data?.data ?? []
	return rows
		.map((r) => r.directus_files_id)
		.filter((id): id is string => typeof id === 'string' && id.length > 0)
}

async function fetchFileMeta(
	api: DownloadApiClient,
	fileIds: string[],
	partnerScopeId?: string | null,
): Promise<DownloadFileMeta[]> {
	if (!fileIds.length) return []
	const base = { id: { _in: fileIds } }
	const filter = partnerScopeId
		? { _and: [base, { uploaded_by: { partner_selected: { _eq: partnerScopeId } } }] }
		: base
	const res = await api.get('/files', {
		params: {
			filter,
			fields: [
				'id',
				'type',
				'filename_download',
				'filename_disk',
				'title',
				'width',
				'height',
				'media_sizes_cm',
			],
			limit: -1,
		},
	})
	const files: DownloadFileMeta[] = res.data?.data ?? []
	const byId = new Map(files.map((f) => [f.id, f]))
	return fileIds.map((id) => byId.get(id)).filter((f): f is DownloadFileMeta => Boolean(f))
}

function toDownloadModalFile(file: DownloadFileMeta): DownloadModalFile {
	return {
		id: file.id,
		filename: file.filename_download ?? null,
		type: file.type ?? null,
		width: file.width ?? null,
		height: file.height ?? null,
		media_sizes_cm: file.media_sizes_cm ?? null,
	}
}

/** Load file metadata for album ZIP modal (determines Web / Print / Custom options). */
export async function fetchAlbumDownloadFiles(
	api: DownloadApiClient,
	albumId: string,
	partnerScopeId?: string | null,
): Promise<DownloadModalFile[]> {
	const fileIds = await fetchAlbumFileIds(api, albumId)
	if (!fileIds.length) return []
	const files = await fetchFileMeta(api, fileIds, partnerScopeId)
	return files.map(toDownloadModalFile)
}

/**
 * Download album as ZIP — images use chosen transform; videos stay original.
 * When partnerScopeId is set, only same-partner uploads are included.
 */
export async function downloadAlbumAsZip(
	api: DownloadApiClient,
	albumId: string,
	albumName: string,
	choice: DownloadChoice,
	saveTarget: SaveTarget,
	partnerScopeId?: string | null,
): Promise<AlbumDownloadResult> {
	try {
		const fileIds = await fetchAlbumFileIds(api, albumId)
		if (!fileIds.length) return { ok: false, reason: 'empty' }

		const files = await fetchFileMeta(api, fileIds, partnerScopeId)
		if (!files.length) return { ok: false, reason: 'empty' }

		return downloadManyAsZipForChoice(api, files, albumName, choice, saveTarget)
	} catch (error) {
		console.error('[media-library] Album ZIP download failed:', error)
		return { ok: false, reason: 'error', error }
	}
}
