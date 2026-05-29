import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@directus/extensions-sdk'

export interface FolderNode {
  id: string
  name: string
  parent: string | null
  children: FolderNode[]
}

interface RawFolder {
  id: string
  name: string
  parent: string | null
}

function buildTree(flat: RawFolder[], parentId: string | null = null): FolderNode[] {
  return flat
    .filter((f) => f.parent === parentId)
    .map((f) => ({
      id: f.id,
      name: f.name,
      parent: f.parent,
      children: buildTree(flat, f.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const useFoldersStore = defineStore('media-library-folders', () => {
  const api = useApi()

  const rawFolders = ref<RawFolder[]>([])
  const selectedFolderId = ref<string | null>(null)
  const isLoading = ref(false)

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
      .map((f) => ({ id: f.id, name: f.name, parent: f.parent, children: getSubfolders(f.id) }))
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

  async function fetchFolders(): Promise<void> {
    isLoading.value = true
    try {
      const response = await api.get('/folders', {
        params: { fields: ['id', 'name', 'parent'], limit: -1 },
      })
      rawFolders.value = response.data?.data ?? []
    } catch (err) {
      console.warn('[media-library] Failed to fetch folders:', err)
    } finally {
      isLoading.value = false
    }
  }

  function selectFolder(id: string | null): void {
    selectedFolderId.value = id
  }

  return {
    folderTree,
    folderMap,
    selectedFolderId,
    isLoading,
    getFolderName,
    getSubfolders,
    getBreadcrumbs,
    fetchFolders,
    selectFolder,
  }
})
