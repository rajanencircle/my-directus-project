import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi, useStores } from '@directus/extensions-sdk'

export interface DirectusFile {
  id: string
  title: string | null
  filename_disk: string
  filename_download: string
  filesize: number
  type: string
  width: number | null
  height: number | null
  uploaded_on: string
  uploaded_by: string | { id: string; first_name: string; last_name: string; avatar: string | null } | null
  folder: string | null
}

export interface SortConfig {
  field: keyof DirectusFile
  direction: 'asc' | 'desc'
}

export interface FetchParams {
  folder?: string | null
  search?: string
  sort?: SortConfig
  page?: number
  limit?: number
}

export type FileFilter = 'all' | 'mine' | 'recent'

const FILE_FIELDS = ['*', 'uploaded_by.id', 'uploaded_by.first_name', 'uploaded_by.last_name', 'uploaded_by.avatar']

export const useFilesStore = defineStore('media-library-files', () => {
  const api = useApi()
  const { useUserStore } = useStores()
  const userStore = useUserStore()

  const files = ref<DirectusFile[]>([])
  const totalCount = ref(0)
  const currentPage = ref(1)
  const isLoading = ref(false)

  const limit = ref(25)
  const search = ref('')
  const sort = ref<SortConfig>({ field: 'uploaded_on', direction: 'desc' })
  const currentFolder = ref<string | null | undefined>(undefined) // undefined = no folder filter
  const activeFilter = ref<FileFilter>('all')
  const customFilter = ref<Record<string, unknown>>({})
  const albumFileIds = ref<string[] | null>(null) // null = no album filter active

  const totalPages = computed(() => Math.ceil(totalCount.value / limit.value))

  async function fetchFiles(params?: FetchParams): Promise<void> {
    isLoading.value = true
    try {
      const page = params?.page ?? currentPage.value
      const lim = params?.limit ?? limit.value
      const sortConfig = params?.sort ?? sort.value
      const searchTerm = params?.search ?? search.value

      const filterParam = buildFilter(params)
      const sortParam = `${sortConfig.direction === 'desc' ? '-' : ''}${String(sortConfig.field)}`

      const queryParams: Record<string, unknown> = {
        fields: FILE_FIELDS,
        limit: lim,
        page,
        sort: sortParam,
        meta: 'total_count',
      }

      if (searchTerm) {
        queryParams.search = searchTerm
      }

      if (Object.keys(filterParam).length > 0) {
        queryParams.filter = filterParam
      }

      const response = await api.get('/files', { params: queryParams })
      files.value = response.data?.data ?? []
      totalCount.value = response.data?.meta?.total_count ?? 0
      currentPage.value = page

      repairMissingDimensions(files.value)
    } catch (err) {
      console.warn('[media-library] Failed to fetch files:', err)
    } finally {
      isLoading.value = false
    }
  }

  const TRANSFORM_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/avif']

  function repairMissingDimensions(fileList: DirectusFile[]): void {
    const broken = fileList.filter(
      (f) => TRANSFORM_TYPES.includes(f.type) && (!f.width || !f.height)
    )
    if (!broken.length) return

    for (const file of broken) {
      const img = new Image()
      img.onload = async () => {
        const w = img.naturalWidth
        const h = img.naturalHeight
        if (!w || !h) return
        try {
          await api.patch(`/files/${file.id}`, { width: w, height: h })
          file.width = w
          file.height = h
        } catch {
          // silent — non-critical
        }
      }
      img.src = `/assets/${file.id}`
    }
  }

  function buildFilter(params?: FetchParams): Record<string, unknown> {
    const builtIn: Record<string, unknown> = {}

    // Album mode: filter by file IDs belonging to the album; skip folder/filter logic
    if (albumFileIds.value !== null) {
      const ids = albumFileIds.value.length ? albumFileIds.value : ['__no_match__']
      builtIn['id'] = { _in: ids }
      const custom = customFilter.value
      const hasCustom = Object.keys(custom).length > 0
      if (hasCustom) return { _and: [builtIn, custom] }
      return builtIn
    }

    const folderTarget = params?.folder !== undefined ? params.folder : currentFolder.value

    if (activeFilter.value === 'mine') {
      const currentUserId = userStore.currentUser?.id
      if (currentUserId) {
        builtIn['uploaded_by'] = { _eq: currentUserId }
      }
    }

    if (activeFilter.value === 'all' && folderTarget !== undefined) {
      if (folderTarget === null) {
        builtIn['folder'] = { _null: true }
      } else {
        builtIn['folder'] = { _eq: folderTarget }
      }
    }

    const custom = customFilter.value
    const hasBuiltIn = Object.keys(builtIn).length > 0
    const hasCustom = Object.keys(custom).length > 0

    if (hasBuiltIn && hasCustom) return { _and: [builtIn, custom] }
    if (hasCustom) return { ...custom }
    return builtIn
  }

  async function setAlbum(albumId: string | null): Promise<void> {
    albumFileIds.value = null
    currentFolder.value = undefined
    activeFilter.value = 'all'
    currentPage.value = 1

    if (albumId !== null) {
      try {
        const res = await api.get('/items/albums_directus_files', {
          params: {
            filter: { albums_directus_id: { _eq: albumId } },
            fields: ['directus_files_id'],
            limit: -1,
          },
        })
        const rows: Array<{ directus_files_id: string }> = res.data?.data ?? []
        albumFileIds.value = rows.map((r) => r.directus_files_id)
      } catch (err) {
        console.warn('[media-library] Failed to fetch album files:', err)
        albumFileIds.value = []
      }
    }

    fetchFiles()
  }

  function setCustomFilter(filter: Record<string, unknown>): void {
    customFilter.value = filter
    currentPage.value = 1
    fetchFiles()
  }

  function setSort(field: keyof DirectusFile, direction: 'asc' | 'desc'): void {
    sort.value = { field, direction }
    currentPage.value = 1
    fetchFiles()
  }

  function setSearch(value: string): void {
    search.value = value
    currentPage.value = 1
    fetchFiles()
  }

  function setFolder(folderId: string | null): void {
    albumFileIds.value = null
    currentFolder.value = folderId
    activeFilter.value = 'all'
    currentPage.value = 1
    fetchFiles()
  }

  function setFilter(filter: FileFilter): void {
    albumFileIds.value = null
    activeFilter.value = filter
    currentPage.value = 1
    if (filter === 'recent') {
      sort.value = { field: 'uploaded_on', direction: 'desc' }
    }
    fetchFiles()
  }

  function goToPage(page: number): void {
    if (page < 1 || page > totalPages.value) return
    fetchFiles({ page })
  }

  function formatUploadedBy(file: DirectusFile): string {
    if (!file.uploaded_by) return '—'
    if (typeof file.uploaded_by === 'string') return file.uploaded_by
    const { first_name, last_name } = file.uploaded_by
    return [first_name, last_name].filter(Boolean).join(' ') || '—'
  }

  return {
    files,
    totalCount,
    currentPage,
    totalPages,
    limit,
    search,
    sort,
    currentFolder,
    activeFilter,
    customFilter,
    albumFileIds,
    isLoading,
    fetchFiles,
    setSort,
    setSearch,
    setFolder,
    setFilter,
    setCustomFilter,
    setAlbum,
    goToPage,
    formatUploadedBy,
  }
})
