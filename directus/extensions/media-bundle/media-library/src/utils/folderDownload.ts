import type { DownloadChoice } from './downloadVariants'
import type { DownloadModalFile } from './downloadVariants'
import { collectDescendantFolderIds, type FolderRef } from './deleteFolder'
import { filesPartnerOrFilter } from '../composables/usePartnerScope'
import {
	type DownloadApiClient,
	downloadManyAsZipForChoice,
} from './downloadExecute'
import {
	type DownloadFileMeta,
	sanitizeFilenamePart,
	type SaveTarget,
} from './zipDownloadShared'

export { resolveDownloadFilename } from './zipDownloadShared'

function toDownloadModalFile(file: FileRow): DownloadModalFile {
	return {
		id: file.id,
		filename: file.filename_download ?? null,
		type: file.type ?? null,
		width: file.width ?? null,
		height: file.height ?? null,
		media_sizes_cm: file.media_sizes_cm ?? null,
	}
}

function folderFilesFilter(folderIds: string[], partnerScopeIds?: string[] | null) {
	const base = { folder: { _in: folderIds } }
	if (!partnerScopeIds || partnerScopeIds.length === 0) return base
	return {
		_and: [base, filesPartnerOrFilter(partnerScopeIds)],
	}
}

/** Load file metadata for folder ZIP modal (determines Web / Print / Custom options). */
export async function fetchFolderDownloadFiles(
	api: DownloadApiClient,
	folderId: string,
	allFolders: FolderRef[],
	partnerScopeIds?: string[] | null,
): Promise<DownloadModalFile[]> {
	const folderIds = collectDescendantFolderIds(allFolders, [folderId])
	const filesRes = await api.get('/files', {
		params: {
			filter: folderFilesFilter(folderIds, partnerScopeIds),
			fields: [
				'id',
				'filename_download',
				'type',
				'width',
				'height',
				'media_sizes_cm',
			],
			limit: -1,
		},
	})
	const files: FileRow[] = filesRes.data?.data ?? []
	return files.map(toDownloadModalFile)
}

type FileRow = DownloadFileMeta & {
	folder?: string | null
	width?: number | null
	height?: number | null
	media_sizes_cm?: string | null
}

export type FolderDownloadResult =
	| { ok: true; count: number }
	| { ok: false; reason: 'empty' | 'error'; error?: unknown }

/**
 * Download folder (+ nested) as ZIP.
 * Images → selected choice transform; videos/other stay original.
 * When partnerScopeIds is set, only files visible to one of those partners are included.
 */
export async function downloadFolderAsZip(
	api: DownloadApiClient,
	folderId: string,
	folderName: string,
	allFolders: FolderRef[],
	choice: DownloadChoice,
	saveTarget: SaveTarget,
	partnerScopeIds?: string[] | null,
): Promise<FolderDownloadResult> {
	try {
		const folderIds = collectDescendantFolderIds(allFolders, [folderId])
		const filesRes = await api.get('/files', {
			params: {
				filter: folderFilesFilter(folderIds, partnerScopeIds),
				fields: [
					'id',
					'filename_download',
					'filename_disk',
					'title',
					'type',
					'folder',
					'width',
					'height',
					'media_sizes_cm',
				],
				limit: -1,
			},
		})
		const files: FileRow[] = filesRes.data?.data ?? []
		if (!files.length) return { ok: false, reason: 'empty' }

		const folderNameById = new Map(allFolders.map((f) => [f.id, f.name]))
		const parentById = new Map(allFolders.map((f) => [f.id, f.parent]))

		function relativePath(fileFolderId: string | null | undefined, filename: string): string {
			if (!fileFolderId || fileFolderId === folderId) return filename
			const segments: string[] = []
			let cur: string | null | undefined = fileFolderId
			const guard = new Set<string>()
			while (cur && cur !== folderId && !guard.has(cur)) {
				guard.add(cur)
				segments.unshift(sanitizeFilenamePart(folderNameById.get(cur) ?? cur))
				cur = parentById.get(cur) ?? null
			}
			return [...segments, filename].join('/')
		}

		return downloadManyAsZipForChoice(
			api,
			files,
			folderName,
			choice,
			saveTarget,
			(file, filename) => relativePath((file as FileRow).folder, filename),
		)
	} catch (error) {
		console.error('[media-library] Folder ZIP download failed:', error)
		return { ok: false, reason: 'error', error }
	}
}
