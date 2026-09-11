import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi, useStores } from '@directus/extensions-sdk'
import { usePartnerScope } from '../composables/usePartnerScope'

export interface DirectusFile {
  id: string
  title: string | null
  filename_disk: string
  filename_download: string
  generated_filename?: string | null
  description?: string | null
  filesize: number
  type: string
  width: number | null
  height: number | null
  uploaded_on: string
  created_on?: string | null
  uploaded_by: string | {
    id: string
    first_name: string
    last_name: string
    avatar: string | null
    partner_selected?: string | { id?: string; visually?: string | null } | null
  } | null
  modified_on?: string | null
  modified_by?: string | { id: string; first_name: string; last_name: string; avatar?: string | null } | null
  folder: string | null
  // Media Data fields
  copyright?: string | null
  expiry_date?: string | null
  photographer?: string | null
  company_name?: string | null
  original_filename?: string | null
  alt_text?: string | null
  contact_email?: string | null
  resolution_dpi?: number | null
  media_sizes_cm?: string | null
  file_size_mb?: number | null
  file_format?: string | null
  dimensions_px?: string | null
  color_space?: string | null
  keyword_ids?: string[] | null
  place?: number | { id: number; translations: Array<{ name: string; translations_id: { code: string } }> } | null
  state?: number | { id: number; translations: Array<{ name: string; translations_id: { code: string } }> } | null
  region?: number | { id: number; translations: Array<{ name: string; translations_id: { code: string } }> } | null
  country?: number | { id: number; translations: Array<{ name: string; translations_id: { code: string } }> } | null
  destination?: number | { id: number; translations: Array<{ name: string; translations_id: { code: string } }> } | null
  iptc_creation_date?: string | null
  iptc_creation_time?: string | null
  is_map?: boolean | null
  tour32_export?: boolean | null
  draft_status?: string | null
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

/** Nested user fields so list display has names (avoids per-row GET /users/:id → 403 “Unknown User”). */
const FILE_FIELDS = [
  '*',
  'uploaded_by.id',
  'uploaded_by.first_name',
  'uploaded_by.last_name',
  'uploaded_by.avatar',
  'uploaded_by.partner_selected.id',
  'uploaded_by.partner_selected.visually',
  'uploaded_by.partner_selected.label',
  'modified_by.id',
  'modified_by.first_name',
  'modified_by.last_name',
  'modified_by.avatar',
]

function uniqueFields(fields: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const f of fields) {
    const key = f.trim()
    if (!key || key === 'thumbnail' || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

export const useFilesStore = defineStore('media-library-files', () => {
  const api = useApi()
  const { useUserStore } = useStores()
  const userStore = useUserStore()
  const { partnerScopeId, isPartnerScoped } = usePartnerScope()

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
  /** Album currently scoped in the file list (null when not in album mode). */
  const currentAlbumId = ref<string | null>(null)
  /** Extra nested paths from table columns, e.g. uploaded_by.partner_selected.label */
  const extraQueryFields = ref<string[]>([])

  const queryFields = computed(() => uniqueFields([...FILE_FIELDS, ...extraQueryFields.value]))

  const totalPages = computed(() => Math.ceil(totalCount.value / limit.value))
  const hasMore = computed(() => files.value.length < totalCount.value)
  const isLoadingMore = ref(false)

  async function fetchFiles(params?: FetchParams): Promise<void> {
    isLoading.value = true
    try {
      // Empty album has no file UUIDs — skip the /files request.
      // Using a fake "__no_match__" id breaks Postgres UUID casting and left
      // the previous album's rows on screen when the request failed.
      if (albumFileIds.value !== null && albumFileIds.value.length === 0) {
        files.value = []
        totalCount.value = 0
        currentPage.value = 1
        return
      }

      const page = params?.page ?? currentPage.value
      const lim = params?.limit ?? limit.value
      const sortConfig = params?.sort ?? sort.value
      const searchTerm = params?.search ?? search.value

      const filterParam = buildFilter(params)
      const sortParam = `${sortConfig.direction === 'desc' ? '-' : ''}${String(sortConfig.field)}`

      const queryParams: Record<string, unknown> = {
        fields: queryFields.value,
        limit: lim,
        page,
        sort: sortParam,
        // filter_count = items matching current folder/search/filter (for pagination).
        // total_count is collection-wide and wrongly shows ~76 pages inside a small folder.
        meta: 'filter_count',
      }

      if (searchTerm) {
        queryParams.search = searchTerm
      }

      if (Object.keys(filterParam).length > 0) {
        queryParams.filter = filterParam
      }

      const response = await api.get('/files', { params: queryParams })
      files.value = response.data?.data ?? []
      totalCount.value =
        response.data?.meta?.filter_count ?? response.data?.meta?.total_count ?? 0
      currentPage.value = page

      repairMissingDimensions(files.value)
    } catch (err) {
      console.warn('[media-library] Failed to fetch files:', err)
      // Clear stale rows from the previous folder/album on failure
      files.value = []
      totalCount.value = 0
    } finally {
      isLoading.value = false
    }
  }

  /** Append the next page (grid infinite scroll). */
  async function fetchMoreFiles(): Promise<void> {
    if (isLoading.value || isLoadingMore.value || !hasMore.value) return
    if (albumFileIds.value !== null && albumFileIds.value.length === 0) return

    const nextPage = currentPage.value + 1
    isLoadingMore.value = true
    try {
      const lim = limit.value
      const sortParam = `${sort.value.direction === 'desc' ? '-' : ''}${String(sort.value.field)}`
      const filterParam = buildFilter()

      const queryParams: Record<string, unknown> = {
        fields: queryFields.value,
        limit: lim,
        page: nextPage,
        sort: sortParam,
        meta: 'filter_count',
      }

      if (search.value) queryParams.search = search.value
      if (Object.keys(filterParam).length > 0) queryParams.filter = filterParam

      const response = await api.get('/files', { params: queryParams })
      const batch: DirectusFile[] = response.data?.data ?? []
      files.value = [...files.value, ...batch]
      totalCount.value =
        response.data?.meta?.filter_count ?? response.data?.meta?.total_count ?? totalCount.value
      currentPage.value = nextPage
      repairMissingDimensions(batch)
    } catch (err) {
      console.warn('[media-library] Failed to fetch more files:', err)
    } finally {
      isLoadingMore.value = false
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
      // Empty list is handled in fetchFiles (no API call). Guard here anyway.
      if (albumFileIds.value.length === 0) {
        return { id: { _null: true } }
      }
      builtIn['id'] = { _in: albumFileIds.value }
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
    } else if (isPartnerScoped.value) {
      builtIn['uploaded_by'] = { partner_selected: { _eq: partnerScopeId.value } }
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
    currentAlbumId.value = albumId
    currentFolder.value = undefined
    activeFilter.value = 'all'
    currentPage.value = 1
    // Drop previous view immediately so empty/new albums never flash old rows
    files.value = []
    totalCount.value = 0

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

    await fetchFiles()
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

  /**
   * @param folderId - folder UUID, or `null` for unfiled (folder is null),
   *   or `undefined` to clear folder filter (All Files / My Files / Recent).
   */
  function setFolder(folderId: string | null | undefined): void {
    albumFileIds.value = null
    currentAlbumId.value = null
    currentFolder.value = folderId
    activeFilter.value = 'all'
    currentPage.value = 1
    fetchFiles()
  }

  function setFilter(filter: FileFilter): void {
    albumFileIds.value = null
    currentAlbumId.value = null
    // Clear folder scope so pagination/count match All / My / Recent (not last folder)
    currentFolder.value = undefined
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

  /** Nested table columns (e.g. uploaded_by.partner_selected.label) must be requested explicitly. */
  function setListFields(columnKeys: string[]): boolean {
    const nested = uniqueFields(columnKeys.filter((k) => k.includes('.')))
    if (nested.join('\0') === extraQueryFields.value.join('\0')) return false
    extraQueryFields.value = nested
    return true
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
    currentAlbumId,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchFiles,
    fetchMoreFiles,
    setListFields,
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
