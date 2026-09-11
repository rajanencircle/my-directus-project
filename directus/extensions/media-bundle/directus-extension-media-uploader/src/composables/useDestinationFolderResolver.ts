/**
 * Resolves the destination-cluster folder for a given `destinations` geography id,
 * for the "Destination Upload" path (see docs/plans/LOCAL — non-destination upload folders).
 *
 * Join path: directus_files.destination -> destinations.destinations_cluster_id
 *            -> directus_folders.destinations_cluster (new field)
 *
 * A folder with `destinations_cluster` set is a destination-cluster folder; one with it
 * null is non-destination (e.g. Portraits) and is never returned here.
 */

type ApiClient = {
  get: (url: string, config?: { params?: Record<string, unknown> }) => Promise<{ data?: { data?: unknown } }>
}

export type DestinationFolderResolution =
  | { status: 'resolved'; folderId: string }
  | { status: 'no-cluster' } // destination has no destinations_cluster_id set
  | { status: 'no-folder-for-cluster'; clusterId: number } // cluster has no matching folder yet
  | { status: 'error' }

function firstId(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    return id != null && id !== '' ? String(id) : null
  }
  const s = String(value)
  return s === 'null' || s === 'undefined' || s === '' ? null : s
}

export async function resolveDestinationClusterId(
  api: ApiClient,
  destinationId: string | number,
): Promise<number | null> {
  const res = await api.get(`/items/destinations/${destinationId}`, {
    params: { fields: ['destinations_cluster_id'] },
  })
  const data = res.data?.data as { destinations_cluster_id?: unknown } | undefined
  const raw = data?.destinations_cluster_id
  if (raw == null) return null
  const id = typeof raw === 'object' ? (raw as { id?: unknown }).id : raw
  const n = Number(id)
  return Number.isFinite(n) ? n : null
}

/**
 * Find the destination-cluster folder matching `clusterId`.
 * When `partnerFolderIds` is given (partner-scoped folder id set), the match is
 * restricted to folders visible in that scope — so BoTG and Karawane users resolve
 * to their own brand's cluster folder rather than each other's.
 */
export async function findFolderForCluster(
  api: ApiClient,
  clusterId: number,
  partnerFolderIds?: Set<string> | null,
): Promise<string | null> {
  const res = await api.get('/folders', {
    params: {
      filter: { destinations_cluster: { _eq: clusterId } },
      fields: ['id'],
      limit: -1,
    },
  })
  const rows = Array.isArray(res.data?.data) ? res.data.data : []
  const ids = rows.map((r) => firstId((r as Record<string, unknown>).id)).filter((id): id is string => id != null)
  if (ids.length === 0) return null
  if (!partnerFolderIds) return ids[0]
  const scoped = ids.find((id) => partnerFolderIds.has(id))
  return scoped ?? ids[0]
}

export async function resolveDestinationFolder(
  api: ApiClient,
  destinationId: string | number,
  partnerFolderIds?: Set<string> | null,
): Promise<DestinationFolderResolution> {
  try {
    const clusterId = await resolveDestinationClusterId(api, destinationId)
    if (clusterId == null) return { status: 'no-cluster' }
    const folderId = await findFolderForCluster(api, clusterId, partnerFolderIds)
    if (!folderId) return { status: 'no-folder-for-cluster', clusterId }
    return { status: 'resolved', folderId }
  } catch (err) {
    console.warn('[media-uploader] resolveDestinationFolder failed', err)
    return { status: 'error' }
  }
}
