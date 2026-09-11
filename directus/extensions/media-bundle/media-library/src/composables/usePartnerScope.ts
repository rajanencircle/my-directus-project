import { ref, computed } from 'vue'
import { useApi, useStores } from '@directus/extensions-sdk'

type ApiClient = {
  get: (url: string, config?: { params?: Record<string, unknown> }) => Promise<{ data?: { data?: unknown } }>
}

const partnerScopeId = ref<string | null>(null)
const currentUserId = ref<string | null>(null)
const ready = ref(false)
let _fetched = false
let _fetching: Promise<void> | null = null

export function partnerAlbumOrFilter(partnerId: string) {
  return {
    _or: [
      { user_created: { partner_selected: { _eq: partnerId } } },
      {
        albums_directus_files: {
          directus_files_id: { uploaded_by: { partner_selected: { _eq: partnerId } } },
        },
      },
    ],
  }
}

function folderIdFromRow(folder: unknown): string | null {
  if (folder == null || folder === '') return null
  if (typeof folder === 'object' && folder !== null && 'id' in folder) {
    const idVal = (folder as { id?: unknown }).id
    return idVal != null && idVal !== '' ? String(idVal) : null
  }
  const id = String(folder)
  return id === 'null' || id === 'undefined' ? null : id
}

export function partnerIdFromCreatedBy(createdBy: unknown): string | null {
  if (createdBy == null || createdBy === '') return null
  if (typeof createdBy === 'object' && createdBy !== null) {
    const ps = (createdBy as { partner_selected?: unknown }).partner_selected
    if (ps == null || ps === '') return null
    if (typeof ps === 'object' && ps !== null && 'id' in ps) {
      const idVal = (ps as { id?: unknown }).id
      return idVal != null && idVal !== '' ? String(idVal) : null
    }
    return String(ps)
  }
  return null
}

/** partner.visually from folder.created_by / file.uploaded_by when nested. */
export function partnerVisuallyFromCreatedBy(createdBy: unknown): string | null {
  if (createdBy == null || createdBy === '' || typeof createdBy !== 'object') return null
  const ps = (createdBy as { partner_selected?: unknown }).partner_selected
  if (ps == null || typeof ps !== 'object') return null
  const visually = (ps as { visually?: unknown }).visually
  if (visually == null || visually === '') return null
  const color = String(visually).trim()
  return color || null
}

export type PartnerFolderRow = {
  id: string
  parent: string | null
  /** partner_selected of folder.created_by, when available */
  createdByPartnerId?: string | null
}

/**
 * Folders visible under partner scope:
 * - created by a same-partner user (via created_by), even if empty
 * - contain at least one same-partner file
 * - plus every ancestor (navigation parents)
 */
export async function collectPartnerFolderIds(
  api: ApiClient,
  partnerId: string,
  allFolders: PartnerFolderRow[],
): Promise<Set<string>> {
  const seed = new Set<string>()
  for (const f of allFolders) {
    if (f.createdByPartnerId && f.createdByPartnerId === partnerId) {
      seed.add(f.id)
    }
  }

  try {
    const res = await api.get('/files', {
      params: {
        filter: {
          _and: [
            { uploaded_by: { partner_selected: { _eq: partnerId } } },
            { folder: { _nnull: true } },
          ],
        },
        aggregate: { count: ['id'] },
        groupBy: ['folder'],
        limit: -1,
      },
    })
    const rows = Array.isArray(res.data?.data) ? res.data.data : []
    for (const row of rows) {
      const id = folderIdFromRow((row as Record<string, unknown>).folder)
      if (id) seed.add(id)
    }
  } catch (err) {
    console.warn('[media-library] collectPartnerFolderIds file aggregate failed', err)
    if (seed.size === 0) return new Set(allFolders.map((f) => f.id))
  }

  const byId = new Map(allFolders.map((f) => [f.id, f]))
  const allowed = new Set(seed)
  for (const id of seed) {
    let current = byId.get(id)
    const visited = new Set<string>()
    while (current?.parent && !visited.has(current.parent)) {
      visited.add(current.parent)
      allowed.add(current.parent)
      current = byId.get(current.parent)
    }
  }
  return allowed
}

export function resetPartnerScope(): void {
  partnerScopeId.value = null
  currentUserId.value = null
  ready.value = false
  _fetched = false
  _fetching = null
}

export function usePartnerScope() {
  const api = useApi()

  const isPartnerScoped = computed(() => partnerScopeId.value != null)

  /**
   * Load partner scope for the current session.
   * Skips the network call when the Directus user store still matches
   * the cached user (library ↔ detail navigation).
   * Re-fetches `/users/me` after logout/login when the user id changes.
   */
  async function init(): Promise<boolean> {
    if (_fetching) {
      await _fetching
      return false
    }

    let storeUserId: string | null = null
    try {
      const { useUserStore } = useStores()
      const id = useUserStore().currentUser?.id
      storeUserId = id != null ? String(id) : null
    } catch {
      // user store not available
    }

    if (_fetched && storeUserId && storeUserId === currentUserId.value) {
      return false
    }

    if (_fetched && !storeUserId && currentUserId.value) {
      resetPartnerScope()
    }

    let changed = false
    _fetching = (async () => {
      try {
        const res = await api.get('/users/me', {
          params: { fields: ['id', 'partner_selected'] },
        })
        const data = res.data?.data
        const nextUserId = data?.id ? String(data.id) : null
        const ps = data?.partner_selected
        const nextPartnerId = ps ? String(ps) : null
        changed =
          currentUserId.value !== nextUserId || partnerScopeId.value !== nextPartnerId
        currentUserId.value = nextUserId
        partnerScopeId.value = nextPartnerId
      } catch (err) {
        console.warn('[media-library] usePartnerScope: failed to fetch partner_selected', err)
        changed = currentUserId.value !== null || partnerScopeId.value !== null
        partnerScopeId.value = null
        currentUserId.value = null
      } finally {
        _fetched = true
        ready.value = true
        _fetching = null
      }
    })()
    await _fetching
    return changed
  }

  return {
    partnerScopeId,
    currentUserId,
    isPartnerScoped,
    ready,
    init,
    reset: resetPartnerScope,
  }
}
