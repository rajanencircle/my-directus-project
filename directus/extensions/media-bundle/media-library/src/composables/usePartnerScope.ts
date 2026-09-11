import { ref, computed } from 'vue'
import { useApi, useStores } from '@directus/extensions-sdk'

type ApiClient = {
  get: (url: string, config?: { params?: Record<string, unknown> }) => Promise<{ data?: { data?: unknown } }>
}

/**
 * `partner_selected` on directus_users/directus_files is M2M as of the multi-partner
 * media change. State below is a *list* of partner ids the current user belongs to,
 * not a single id. An empty file `partner_selected` means "visible to everyone" —
 * every M2M-aware filter below encodes that rule directly.
 */
const partnerScopeIds = ref<string[] | null>(null)
const currentUserId = ref<string | null>(null)
const ready = ref(false)
let _fetched = false
let _fetching: Promise<void> | null = null

function extractPartnerIds(partnerSelected: unknown): string[] {
  if (!Array.isArray(partnerSelected)) return []
  return partnerSelected
    .map((row) => {
      if (row == null) return null
      if (typeof row === 'object') {
        const id = (row as { partner_id?: unknown; id?: unknown }).partner_id ?? (row as { id?: unknown }).id
        return id != null && id !== '' ? String(id) : null
      }
      return String(row)
    })
    .filter((id): id is string => id != null)
}

/**
 * Media (files/albums) visible to a user belonging to `partnerIds`:
 * uploaded by a user sharing any of those partners, OR the file/album's own
 * `partner_selected` is empty (visible to all) OR overlaps `partnerIds`.
 */
export function partnerAlbumOrFilter(partnerIds: string[]) {
  if (partnerIds.length === 0) return {}
  const fileVisible = {
    _or: [
      { partner_selected: { _none: {} } },
      { partner_selected: { partner_id: { _in: partnerIds } } },
    ],
  }
  return {
    _or: [
      { user_created: { partner_selected: { _in: partnerIds } } },
      {
        albums_directus_files: {
          directus_files_id: fileVisible,
        },
      },
    ],
  }
}

/** Same rule as above, directly against a directus_files filter (uploader OR own partner_selected). */
export function filesPartnerOrFilter(partnerIds: string[]) {
  if (partnerIds.length === 0) return {}
  return {
    _or: [
      { uploaded_by: { partner_selected: { _in: partnerIds } } },
      { partner_selected: { _none: {} } },
      { partner_selected: { partner_id: { _in: partnerIds } } },
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

/** All partner ids of a nested created_by/uploaded_by user (now M2M — returns a list). */
export function partnerIdsFromCreatedBy(createdBy: unknown): string[] {
  if (createdBy == null || typeof createdBy !== 'object') return []
  const ps = (createdBy as { partner_selected?: unknown }).partner_selected
  return extractPartnerIds(ps)
}

/** @deprecated kept for call sites not yet migrated — returns the first partner id only. */
export function partnerIdFromCreatedBy(createdBy: unknown): string | null {
  return partnerIdsFromCreatedBy(createdBy)[0] ?? null
}

/** partner.visually accents from folder.created_by / file.uploaded_by — one per partner. */
export function partnerVisuallyListFromCreatedBy(createdBy: unknown): string[] {
  if (createdBy == null || typeof createdBy !== 'object') return []
  const ps = (createdBy as { partner_selected?: unknown }).partner_selected
  if (!Array.isArray(ps)) return []
  return ps
    .map((row) => {
      const partner = row && typeof row === 'object' ? (row as { partner_id?: unknown }).partner_id : null
      if (partner == null || typeof partner !== 'object') return null
      const visually = (partner as { visually?: unknown }).visually
      return visually != null && String(visually).trim() ? String(visually).trim() : null
    })
    .filter((c): c is string => c != null)
}

/** @deprecated kept for call sites not yet migrated — returns the first accent color only. */
export function partnerVisuallyFromCreatedBy(createdBy: unknown): string | null {
  return partnerVisuallyListFromCreatedBy(createdBy)[0] ?? null
}

export type PartnerFolderRow = {
  id: string
  parent: string | null
  /** partner ids of folder.created_by, when available (M2M — may be several) */
  createdByPartnerIds?: string[]
}

/**
 * Folders visible under partner scope (partnerIds = every partner the current user belongs to):
 * - created by a user sharing any of those partners, even if empty
 * - contain at least one file visible to those partners (uploader shares a partner, OR the
 *   file's own `partner_selected` is empty/overlaps)
 * - plus every ancestor (navigation parents)
 */
export async function collectPartnerFolderIds(
  api: ApiClient,
  partnerIds: string[],
  allFolders: PartnerFolderRow[],
): Promise<Set<string>> {
  if (partnerIds.length === 0) return new Set(allFolders.map((f) => f.id))

  const seed = new Set<string>()
  for (const f of allFolders) {
    if (f.createdByPartnerIds?.some((id) => partnerIds.includes(id))) {
      seed.add(f.id)
    }
  }

  try {
    const res = await api.get('/files', {
      params: {
        filter: {
          _and: [filesPartnerOrFilter(partnerIds), { folder: { _nnull: true } }],
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
  partnerScopeIds.value = null
  currentUserId.value = null
  ready.value = false
  _fetched = false
  _fetching = null
}

function sameIds(a: string[] | null, b: string[]): boolean {
  if (a == null) return b.length === 0
  if (a.length !== b.length) return false
  const setA = new Set(a)
  return b.every((id) => setA.has(id))
}

export function usePartnerScope() {
  const api = useApi()

  const isPartnerScoped = computed(() => (partnerScopeIds.value?.length ?? 0) > 0)
  /** Convenience for call sites that only care about a single accent/primary partner. */
  const primaryPartnerId = computed(() => partnerScopeIds.value?.[0] ?? null)

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
          params: { fields: ['id', 'partner_selected.partner_id'] },
        })
        const data = res.data?.data as { id?: unknown; partner_selected?: unknown } | undefined
        const nextUserId = data?.id ? String(data.id) : null
        const nextPartnerIds = extractPartnerIds(data?.partner_selected)
        changed = currentUserId.value !== nextUserId || !sameIds(partnerScopeIds.value, nextPartnerIds)
        currentUserId.value = nextUserId
        partnerScopeIds.value = nextPartnerIds
      } catch (err) {
        console.warn('[media-library] usePartnerScope: failed to fetch partner_selected', err)
        changed = currentUserId.value !== null || partnerScopeIds.value != null
        partnerScopeIds.value = null
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
    partnerScopeIds,
    primaryPartnerId,
    currentUserId,
    isPartnerScoped,
    ready,
    init,
    reset: resetPartnerScope,
  }
}
