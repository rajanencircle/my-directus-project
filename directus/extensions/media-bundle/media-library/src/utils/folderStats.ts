import type { ApiClient } from './zipDownloadShared'

export type FolderRef = { id: string; parent: string | null }

export type FolderStats = {
  /** Files in this folder and all nested subfolders */
  files: number
  /** Immediate child folders */
  subfolders: number
}

function normalizeFolderId(folder: unknown): string | null {
  if (folder == null || folder === '') return null
  if (typeof folder === 'object' && folder !== null && 'id' in folder) {
    const id = (folder as { id?: unknown }).id
    return id != null && id !== '' ? String(id) : null
  }
  return String(folder)
}

/** Direct file counts per folder id (`null` = File Library root). */
export async function fetchDirectFolderFileCounts(
  api: ApiClient,
): Promise<Map<string | null, number>> {
  const counts = new Map<string | null, number>()

  try {
    const res = await api.get('/files', {
      params: {
        aggregate: { count: 'id' },
        groupBy: ['folder'],
        limit: -1,
      },
    })

    const rows = Array.isArray(res.data?.data) ? res.data.data : []
    for (const row of rows) {
      const folderId = normalizeFolderId(row.folder)
      const raw = row.count?.id ?? row.count
      const count = Number(raw)
      if (Number.isFinite(count)) counts.set(folderId, count)
    }
  } catch {
    // Fallback: count root only so UI still works without aggregates permission.
    try {
      const rootRes = await api.get('/files', {
        params: {
          aggregate: { count: 'id' },
          filter: { folder: { _null: true } },
          limit: 1,
        },
      })
      const raw = rootRes.data?.data?.[0]?.count?.id ?? rootRes.data?.data?.[0]?.count
      const count = Number(raw)
      if (Number.isFinite(count)) counts.set(null, count)
    } catch {
      /* ignore */
    }
  }

  return counts
}

export function collectDescendantFolderIds(
  folders: FolderRef[],
  rootIds: string[],
): Set<string> {
  const byParent = new Map<string | null, string[]>()
  for (const f of folders) {
    const parent = f.parent ?? null
    const list = byParent.get(parent) ?? []
    list.push(f.id)
    byParent.set(parent, list)
  }

  const result = new Set<string>()
  const queue = [...rootIds]
  while (queue.length) {
    const id = queue.shift()!
    if (result.has(id)) continue
    result.add(id)
    for (const childId of byParent.get(id) ?? []) queue.push(childId)
  }
  return result
}

export function getFolderStats(
  folderId: string | null,
  folders: FolderRef[],
  directFileCounts: Map<string | null, number>,
): FolderStats {
  const subfolders = folders.filter((f) => (f.parent ?? null) === folderId).length

  if (folderId === null) {
    return {
      files: directFileCounts.get(null) ?? 0,
      subfolders,
    }
  }

  const scope = collectDescendantFolderIds(folders, [folderId])
  let files = 0
  for (const id of scope) {
    files += directFileCounts.get(id) ?? 0
  }

  return { files, subfolders }
}

export function formatFolderStats(stats: FolderStats): string {
  const fileLabel = stats.files === 1 ? '1 file' : `${stats.files} files`
  const folderLabel = stats.subfolders === 1 ? '1 folder' : `${stats.subfolders} folders`
  return `${fileLabel} · ${folderLabel}`
}
