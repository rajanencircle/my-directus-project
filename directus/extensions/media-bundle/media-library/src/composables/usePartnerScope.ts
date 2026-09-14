import { ref, computed } from 'vue'
import { useApi, useStores } from '@directus/extensions-sdk'

type ApiClient = {
  get: (url: string, config?: { params?: Record<string, unknown> }) => Promise<{ data?: { data?: unknown } }>
}

/**
 * Unified BOTG partner-scoping pattern (matches products / api_users):
 * an explicit `partner_visibility` (`all` | `selected`) field alongside the
 * `partner_selected` M2M — visibility is never inferred from list emptiness.
 * `all` = unrestricted (sees/is seen by everyone) regardless of `partner_selected`.
 * `selected` with an empty `partner_selected` is a real, intentional "matches
 * nothing" state (mirrors `extensions/api`'s NEVER_MATCH_FILTER).
 */
export type ViewerScope = { visibility: 'all' | 'selected'; partnerIds: string[] }

/** Matches nothing — same trick used server-side in extensions/api's NEVER_MATCH_FILTER. */
const NEVER_MATCH_FILTER = { id: { _null: true } }

const partnerScopeIds = ref<string[] | null>(null)
const partnerVisibility = ref<'all' | 'selected' | null>(null)
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
 * Albums visible to `viewer`:
 * - viewer `all` → unrestricted, sees everything.
 * - viewer `selected` with no partners → sees nothing.
 * - otherwise → created by a user who is themselves `all` or shares a partner
 *   (albums carry no `partner_visibility`/`partner_selected` of their own, so the
 *   creator's own scope is the only signal), OR contains a file visible per
 *   `filesPartnerOrFilter`'s rule (the file's own scope, authoritative).
 */
export function partnerAlbumOrFilter(viewer: ViewerScope) {
  if (viewer.visibility === 'all') return {}
  if (viewer.partnerIds.length === 0) return NEVER_MATCH_FILTER
  const ids = viewer.partnerIds
  const fileVisible = {
    _or: [
      { partner_visibility: { _eq: 'all' } },
      { partner_selected: { partner_id: { _in: ids } } },
    ],
  }
  return {
    _or: [
      { user_created: { partner_visibility: { _eq: 'all' } } },
      { user_created: { partner_selected: { partner_id: { _in: ids } } } },
      {
        albums_directus_files: {
          directus_files_id: fileVisible,
        },
      },
    ],
  }
}

/**
 * Directly against a directus_files filter. The file's own `partner_visibility`/
 * `partner_selected` is fully authoritative — every file always has an explicit
 * value now (schema default `all`), so there is no "uploader fallback" case left:
 * that used to matter before files carried their own scope, and kept a loophole
 * open (a file explicitly set to `selected` with nobody chosen yet was still
 * shown to everyone whenever its uploader happened to be unrestricted).
 */
export function filesPartnerOrFilter(viewer: ViewerScope) {
  if (viewer.visibility === 'all') return {}
  if (viewer.partnerIds.length === 0) return NEVER_MATCH_FILTER
  return {
    _or: [
      { partner_visibility: { _eq: 'all' } },
      { partner_selected: { partner_id: { _in: viewer.partnerIds } } },
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

/** All partner ids of a nested created_by/uploaded_by user (M2M — returns a list). */
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
 * Folders visible under `viewer`'s scope:
 * - viewer `all` → every folder.
 * - viewer `selected` with no partners → none.
 * - otherwise → created by a same-partner user (even if empty), or containing at
 *   least one file visible per `filesPartnerOrFilter`, plus every ancestor.
 */
export async function collectPartnerFolderIds(
  api: ApiClient,
  viewer: ViewerScope,
  allFolders: PartnerFolderRow[],
): Promise<Set<string>> {
  if (viewer.visibility === 'all') return new Set(allFolders.map((f) => f.id))
  if (viewer.partnerIds.length === 0) return new Set()

  const partnerIds = viewer.partnerIds
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
          _and: [filesPartnerOrFilter(viewer), { folder: { _nnull: true } }],
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
  partnerVisibility.value = null
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

  const isPartnerScoped = computed(() => partnerVisibility.value === 'selected')
  /** Convenience for call sites that only care about a single accent/primary partner. */
  const primaryPartnerId = computed(() => partnerScopeIds.value?.[0] ?? null)
  /** Bundles visibility + partner ids for the filter builders above. */
  const viewerScope = computed<ViewerScope>(() => ({
    visibility: partnerVisibility.value ?? 'all',
    partnerIds: partnerScopeIds.value ?? [],
  }))

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
          params: { fields: ['id', 'partner_visibility', 'partner_selected.partner_id'] },
        })
        const data = res.data?.data as
          | { id?: unknown; partner_visibility?: unknown; partner_selected?: unknown }
          | undefined
        const nextUserId = data?.id ? String(data.id) : null
        const nextVisibility: 'all' | 'selected' = data?.partner_visibility === 'selected' ? 'selected' : 'all'
        const nextPartnerIds = extractPartnerIds(data?.partner_selected)
        changed =
          currentUserId.value !== nextUserId ||
          partnerVisibility.value !== nextVisibility ||
          !sameIds(partnerScopeIds.value, nextPartnerIds)
        currentUserId.value = nextUserId
        partnerVisibility.value = nextVisibility
        partnerScopeIds.value = nextPartnerIds
      } catch (err) {
        console.warn('[media-library] usePartnerScope: failed to fetch partner_selected', err)
        changed = currentUserId.value !== null || partnerScopeIds.value != null || partnerVisibility.value != null
        partnerScopeIds.value = null
        partnerVisibility.value = null
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
    partnerVisibility,
    viewerScope,
    primaryPartnerId,
    currentUserId,
    isPartnerScoped,
    ready,
    init,
    reset: resetPartnerScope,
  }
}
