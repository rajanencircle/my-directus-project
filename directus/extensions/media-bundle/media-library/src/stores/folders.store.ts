import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@directus/extensions-sdk'
import {
  collectPartnerFolderIds,
  partnerIdsFromCreatedBy,
  partnerVisuallyListFromCreatedBy,
  usePartnerScope,
} from '../composables/usePartnerScope'

export interface FolderNode {
  id: string
  name: string
  parent: string | null
  children: FolderNode[]
  createdByPartnerIds?: string[]
  createdByPartnerVisuallyList?: string[]
}

interface RawFolder {
  id: string
  name: string
  parent: string | null
  createdByPartnerIds?: string[]
  createdByPartnerVisuallyList?: string[]
}

function buildTree(flat: RawFolder[], parentId: string | null = null): FolderNode[] {
  return flat
    .filter((f) => f.parent === parentId)
    .map((f) => ({
      id: f.id,
      name: f.name,
      parent: f.parent,
      createdByPartnerIds: f.createdByPartnerIds,
      createdByPartnerVisuallyList: f.createdByPartnerVisuallyList,
      children: buildTree(flat, f.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function normalizeParent(parent: unknown): string | null {
  if (parent == null || parent === '') return null
  if (typeof parent === 'object' && parent !== null && 'id' in parent) {
    const idVal = (parent as { id?: unknown }).id
    return idVal != null && idVal !== '' ? String(idVal) : null
  }
  return String(parent)
}

function mapFolderRows(rows: unknown[]): RawFolder[] {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const f = row as Record<string, unknown>
    return {
      id: String(f.id),
      name: String(f.name ?? ''),
      parent: normalizeParent(f.parent),
      createdByPartnerIds: partnerIdsFromCreatedBy(f.created_by),
      createdByPartnerVisuallyList: partnerVisuallyListFromCreatedBy(f.created_by),
    }
  })
}

export const useFoldersStore = defineStore('media-library-folders', () => {
  const api = useApi()
  const { viewerScope, currentUserId, isPartnerScoped, init: initPartnerScope } = usePartnerScope()

  const rawFolders = ref<RawFolder[]>([])
  const selectedFolderId = ref<string | null>(null)
  const isLoading = ref(false)
  const loadedForUserId = ref<string | null>(null)

  const folderTree = computed<FolderNode[]>(() => buildTree(rawFolders.value, null))

  const folderMap = computed<Map<string, RawFolder>>(() => {
    const map = new Map<string, RawFolder>()
    rawFolders.value.forEach((f) => map.set(f.id, f))
    return map
  })

  // Direct children of a given parent (null = root)
  function getSubfolders(parentId: string | null): FolderNode[] {
    return (rawFolders.value as RawFolder[])
      .filter((f) => f.parent === parentId)
      .map((f) => ({
        id: f.id,
        name: f.name,
        parent: f.parent,
        createdByPartnerIds: f.createdByPartnerIds,
        createdByPartnerVisuallyList: f.createdByPartnerVisuallyList,
        children: getSubfolders(f.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  // Ancestor chain from root down to `id` (for breadcrumbs)
  function getBreadcrumbs(id: string | null): { id: string; name: string }[] {
    if (!id) return []
    const chain: { id: string; name: string }[] = []
    let current: RawFolder | undefined = folderMap.value.get(id)
    while (current) {
      chain.unshift({ id: current.id, name: current.name })
      current = current.parent ? folderMap.value.get(current.parent) : undefined
    }
    return chain
  }

  function getFolderName(id: string | null): string {
    if (id === null) return 'File Library'
    return folderMap.value.get(id)?.name ?? 'Unknown Folder'
  }

  async function applyPartnerPrune(all: RawFolder[]): Promise<void> {
    if (isPartnerScoped.value) {
      const allowed = await collectPartnerFolderIds(
        api,
        viewerScope.value,
        all.map((f) => ({ id: f.id, parent: f.parent, createdByPartnerIds: f.createdByPartnerIds })),
      )
      rawFolders.value = all.filter((f) => allowed.has(f.id))
    } else {
      rawFolders.value = all
    }
  }

  async function fetchFolders(opts?: { force?: boolean }): Promise<void> {
    await initPartnerScope()
    const uid = currentUserId.value ?? '__none__'
    if (!opts?.force && loadedForUserId.value === uid) return

    isLoading.value = true
    try {
      if (loadedForUserId.value && loadedForUserId.value !== uid) {
        rawFolders.value = []
      }
      try {
        const response = await api.get('/folders', {
          params: {
            fields: [
              'id',
              'name',
              'parent',
              'created_by.partner_selected.partner_id.id',
              'created_by.partner_selected.partner_id.visually',
            ],
            limit: -1,
          },
        })
        await applyPartnerPrune(mapFolderRows(response.data?.data ?? []))
      } catch (err) {
        // Fallback if created_by is not on directus_folders yet
        console.warn('[media-library] folders fetch with created_by failed, retrying without:', err)
        const response = await api.get('/folders', {
          params: { fields: ['id', 'name', 'parent'], limit: -1 },
        })
        await applyPartnerPrune(mapFolderRows(response.data?.data ?? []))
      }
      loadedForUserId.value = uid
    } catch (err) {
      console.warn('[media-library] Failed to fetch folders:', err)
    } finally {
      isLoading.value = false
    }
  }

  function selectFolder(id: string | null): void {
    selectedFolderId.value = id
  }

  async function renameFolder(id: string, name: string): Promise<void> {
    await api.patch(`/folders/${id}`, { name: name.trim() })
    await fetchFolders({ force: true })
  }

  async function moveFolder(id: string, parent: string | null): Promise<void> {
    await api.patch(`/folders/${id}`, { parent })
    await fetchFolders({ force: true })
  }

  /** Flat list for delete/download helpers (id + parent). */
  const flatFolders = computed(() =>
    rawFolders.value.map((f) => ({ id: f.id, parent: f.parent, name: f.name })),
  )

  return {
    folderTree,
    folderMap,
    flatFolders,
    selectedFolderId,
    isLoading,
    getFolderName,
    getSubfolders,
    getBreadcrumbs,
    fetchFolders,
    selectFolder,
    renameFolder,
    moveFolder,
  }
})
