<template>
  <private-view :title="pageTitle" icon="folder">

    <!-- Back button when inside a subfolder -->
    <template v-if="foldersStore.selectedFolderId" #title-outer:prepend>
      <v-button class="header-icon" rounded icon secondary @click="navigateUp">
        <v-icon name="arrow_back" />
      </v-button>
    </template>

    <!-- ── Action bar ─────────────────────────────────────────────── -->
    <template #actions>
      <span class="item-count">{{ filesStore.totalCount }} Items</span>

      <SearchInput
        v-model="searchQuery"
        v-model:filter="activeFilter"
        @update:model-value="onSearchInput"
        @update:filter="onFilterUpdate"
      />

      <!-- Delete (single or multi selection) -->
      <v-button
        v-if="selectedIds.length > 0"
        v-tooltip.bottom="t('delete')"
        class="action-delete"
        icon
        small
        rounded
        secondary
        @click="confirmDelete = true"
      >
        <v-icon name="delete" />
      </v-button>

      <!-- Add selected files to an album -->
      <v-button
        v-if="selectedIds.length > 0"
        v-tooltip.bottom="'Add to Album'"
        icon
        small
        rounded
        secondary
        @click="addToAlbumOpen = true"
      >
        <v-icon name="playlist_add" />
      </v-button>

      <AddFolder :parent="foldersStore.selectedFolderId" />

      <!-- View toggle — same size as create-folder -->
      <v-button
        v-tooltip.bottom="viewMode === 'list' ? 'Switch to grid' : 'Switch to list'"
        icon
        small
        rounded
        secondary
        @click="viewMode = viewMode === 'list' ? 'grid' : 'list'"
      >
        <v-icon small :name="viewMode === 'list' ? 'grid_view' : 'view_list'" />
      </v-button>

      <!-- Upload — same size as create-folder -->
      <v-button v-tooltip.bottom="t('create_item')" icon small rounded @click="showUploadModal = true">
        <v-icon small name="add" />
      </v-button>
    </template>

    <!-- ── Sidebar navigation ──────────────────────────────────────── -->
    <template #navigation>
      <MediaSidebar />
    </template>

    <!-- ── Confirm delete dialog ─────────────────────────────────────── -->
    <v-dialog v-model="confirmDelete" @esc="confirmDelete = false">
      <v-card>
        <v-card-title>{{ t('delete_item', { count: selectedIds.length }) }}</v-card-title>
        <v-card-text>{{ t('action_cannot_be_undone') }}</v-card-text>
        <v-card-actions>
          <v-button secondary @click="confirmDelete = false">{{ t('cancel') }}</v-button>
          <v-button kind="danger" :loading="isDeleting" @click="batchDeleteFiles">{{ t('delete') }}</v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Add to album modal ─────────────────────────────────────────── -->
    <AddToAlbumModal
      v-model="addToAlbumOpen"
      :file-ids="selectedIds"
      @added="onAddedToAlbum"
    />

    <!-- ── Upload modal ──────────────────────────────────────────────── -->
    <UploadModal
      v-model="showUploadModal"
      :initial-folder="foldersStore.selectedFolderId"
      @uploaded="onUploaded"
    />

    <!-- ── Center content ─────────────────────────────────────────── -->
    <div
      class="content-area"
      :class="{ 'is-grid': viewMode === 'grid', 'is-list': viewMode === 'list' }"
    >

      <!-- Loading -->
      <div v-if="filesStore.isLoading" class="state-center">
        <v-progress-circular indeterminate />
      </div>

      <!-- Empty -->
      <div v-else-if="filesStore.files.length === 0" class="state-center">
        <v-icon name="cloud_upload" class="empty-icon" />
        <p class="empty-text">{{ noFilesLabel }}</p>
      </div>

      <!-- LIST VIEW — match native tabular: page scrollport owns horizontal scrollbar -->
      <div v-else-if="viewMode === 'list'" class="layout-tabular-container">
        <div class="layout-tabular">
          <v-table
            v-model="selectedIds"
            :headers="tableHeaders"
            :items="filesStore.files"
            :sort="tableSort"
            :row-height="tableRowHeight"
            item-key="id"
            show-select="multiple"
            show-resize
            allow-header-reorder
            must-sort
            selection-use-keys
            fixed-header
            @click:row="handleRowClick"
            @update:sort="onSort"
            @update:headers="onHeadersUpdate"
          >
            <!-- Thumbnail: virtual column, rendered manually -->
            <template #[`item.thumbnail`]="{ item }">
              <div class="thumb-cell">
                <FileThumbPreview
                  :file-id="item.id"
                  :mime-type="item.type"
                  :filename="item.filename_disk"
                  :alt="filePrimaryTitle(item)"
                  :modified-on="item.modified_on"
                  :show-kind-badge="false"
                />
              </div>
            </template>

            <!-- All real fields: delegate to native render-display -->
            <template v-for="header in tableHeaders.filter(h => h.value !== 'thumbnail')" :key="header.value" #[`item.${header.value}`]="{ item }">
              <render-display
                :value="getByPath(item, header.value)"
                :display="header.field?.display"
                :options="header.field?.displayOptions"
                :interface="header.field?.interface"
                :interface-options="header.field?.interfaceOptions"
                :type="header.field?.type"
                :collection="header.field?.collection"
                :field="header.field?.field"
              />
            </template>

            <!-- Header right-click context menu -->
            <template #header-context-menu="{ header }">
              <v-list>
                <v-list-item
                  :disabled="!header.sortable"
                  :active="tableSort?.by === header.value && tableSort?.desc === false"
                  clickable
                  @click="onSort({ by: header.value, desc: false })"
                >
                  <v-list-item-icon><v-icon name="sort" class="flip" /></v-list-item-icon>
                  <v-list-item-content>Sort Ascending</v-list-item-content>
                </v-list-item>
                <v-list-item
                  :disabled="!header.sortable"
                  :active="tableSort?.by === header.value && tableSort?.desc === true"
                  clickable
                  @click="onSort({ by: header.value, desc: true })"
                >
                  <v-list-item-icon><v-icon name="sort" /></v-list-item-icon>
                  <v-list-item-content>Sort Descending</v-list-item-content>
                </v-list-item>

                <v-divider />

                <v-list-item :active="header.align === 'left'" clickable @click="onAlignChange(header.value, 'left')">
                  <v-list-item-icon><v-icon name="format_align_left" /></v-list-item-icon>
                  <v-list-item-content>Align Left</v-list-item-content>
                </v-list-item>
                <v-list-item :active="header.align === 'center'" clickable @click="onAlignChange(header.value, 'center')">
                  <v-list-item-icon><v-icon name="format_align_center" /></v-list-item-icon>
                  <v-list-item-content>Align Center</v-list-item-content>
                </v-list-item>
                <v-list-item :active="header.align === 'right'" clickable @click="onAlignChange(header.value, 'right')">
                  <v-list-item-icon><v-icon name="format_align_right" /></v-list-item-icon>
                  <v-list-item-content>Align Right</v-list-item-content>
                </v-list-item>

                <v-divider />

                <v-list-item clickable @click="removeColumn(header.value)">
                  <v-list-item-icon><v-icon name="remove" /></v-list-item-icon>
                  <v-list-item-content>Hide Field</v-list-item-content>
                </v-list-item>
              </v-list>
            </template>

            <!-- Add column — native v-field-list (globally registered) -->
            <template #header-append>
              <v-menu placement="bottom-end" show-arrow :close-on-content-click="false">
                <template #activator="{ toggle, active }">
                  <v-icon
                    v-tooltip="'Add Column'"
                    name="add"
                    class="add-field"
                    :class="{ active }"
                    clickable
                    @click.stop="toggle"
                  />
                </template>
                <v-field-list
                  collection="directus_files"
                  :disabled-fields="activeColumnKeys"
                  :allow-select-all="false"
                  @add="addField($event[0])"
                />
              </v-menu>
            </template>

            <!-- Pagination inside v-table footer slot (matches native Directus tabular layout) -->
            <template #footer>
              <div class="footer">
                <div class="pagination">
                  <v-pagination
                    v-if="filesStore.totalPages > 1"
                    :length="filesStore.totalPages"
                    :model-value="filesStore.currentPage"
                    :total-visible="7"
                    show-first-last
                    @update:model-value="filesStore.goToPage($event)"
                  />
                </div>
                <div v-if="filesStore.totalCount > 10" class="per-page">
                  <span>Per page</span>
                  <v-select
                    :model-value="`${filesStore.limit}`"
                    :items="pageSizes"
                    inline
                    @update:model-value="onLimitChange"
                  />
                </div>
              </div>
            </template>
          </v-table>
        </div>
      </div>

      <!-- GRID VIEW — wrapping cards + infinite scroll (100 / batch) -->
      <div v-else class="grid-shell">
        <div class="grid-wrapper">
          <MediaLibraryGridCard
            v-for="file in filesStore.files"
            :key="file.id"
            :file="file"
            :selected="selectedIds.includes(file.id)"
            @click="handleGridClick(file)"
            @toggle-select="toggleGridSelection(file.id)"
          />
        </div>

        <div ref="gridSentinel" class="grid-sentinel" aria-hidden="true" />

        <div v-if="filesStore.isLoadingMore" class="grid-loading-more">
          <v-progress-circular indeterminate x-small />
          <span>Loading more…</span>
        </div>
      </div>
    </div>

  </private-view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useApi, useStores } from '@directus/extensions-sdk'
import { useFoldersStore } from '../stores/folders.store'
import { useFilesStore, type DirectusFile } from '../stores/files.store'
import { filePrimaryTitle, getByPath } from '../utils/fileCardMeta'
import { useAlbumsStore } from '../stores/albums.store'
import MediaSidebar from '../components/layout/MediaSidebar.vue'
import SearchInput from '../components/SearchInput.vue'
import AddFolder from '../components/AddFolder.vue'
import AddToAlbumModal from '../components/AddToAlbumModal.vue'
import UploadModal from '../components/upload/UploadModal.vue'
import FileThumbPreview from '../../../directus-extension-media-uploader/src/components/FileThumbPreview.vue'
import MediaLibraryGridCard from '../components/MediaLibraryGridCard.vue'
import { useMediaSettings } from '../composables/useMediaSettings'
import { usePartnerScope } from '../composables/usePartnerScope'
import { useNotificationBadgeSync } from '../composables/useNotificationBadgeSync'
import { resolveTranslatable } from '../utils/translations'
import { useT } from '../composables/useT'

const props = defineProps<{
  folderId?: string
  albumId?: string
}>()

const router = useRouter()
const route = useRoute()
const api = useApi()
const { t } = useT()
const { useFieldsStore, useUserStore } = useStores()
const fieldsStore = useFieldsStore()
const userStore = useUserStore()
const foldersStore = useFoldersStore()
const filesStore = useFilesStore()
const albumsStore = useAlbumsStore()

// ── View state ─────────────────────────────────────────────────────
const GRID_BATCH = 100
const viewMode = ref<'list' | 'grid'>(
  (localStorage.getItem('media-library-view-mode') as 'list' | 'grid') ?? 'list'
)
/** Limit used while in list (tabular) mode — restored when leaving grid. */
const listLimit = ref(25)
watch(viewMode, (v, prev) => {
  localStorage.setItem('media-library-view-mode', v)
  if (v === prev) return
  if (v === 'grid') {
    listLimit.value = filesStore.limit
    filesStore.limit = GRID_BATCH
    filesStore.goToPage(1)
    nextTick(() => setupGridObserver())
  } else {
    filesStore.limit = listLimit.value || 25
    filesStore.goToPage(1)
    teardownGridObserver()
  }
})

const selectedIds = ref<string[]>([])
const tableRowHeight = 48
const showUploadModal = ref(false)
const pageSizes = ['10', '25', '50', '100']

// ── Grid infinite scroll ───────────────────────────────────────────
const gridSentinel = ref<HTMLElement | null>(null)
let gridObserver: IntersectionObserver | null = null

function setupGridObserver() {
  teardownGridObserver()
  if (viewMode.value !== 'grid' || !gridSentinel.value) return

  const root =
    (gridSentinel.value.closest('.content-area') as HTMLElement | null) ?? null

  gridObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      if (viewMode.value !== 'grid') return
      filesStore.fetchMoreFiles()
    },
    { root, rootMargin: '240px 0px', threshold: 0 },
  )
  gridObserver.observe(gridSentinel.value)
}

function teardownGridObserver() {
  gridObserver?.disconnect()
  gridObserver = null
}

watch(gridSentinel, (el) => {
  if (el && viewMode.value === 'grid') setupGridObserver()
})

onBeforeUnmount(() => teardownGridObserver())

// ── Batch actions ──────────────────────────────────────────────────
const confirmDelete = ref(false)
const isDeleting = ref(false)
const addToAlbumOpen = ref(false)

// ── Search + Filter ────────────────────────────────────────────────
const searchQuery = ref('')
const activeFilter = ref<Record<string, any> | null>(null)
let searchDebounce: ReturnType<typeof setTimeout> | null = null

function onFilterUpdate(value: Record<string, any> | null) {
  activeFilter.value = value
  filesStore.setCustomFilter(value ?? {})
}

// ── Column management ──────────────────────────────────────────────
const DEFAULT_COLUMN_KEYS = ['thumbnail', 'title', 'uploaded_on', 'filesize', 'uploaded_by']
const FIXED_COLUMN_KEYS = ['thumbnail']
const NON_SORTABLE_TYPES = ['json', 'alias', 'presentation', 'translations']
// Default widths for virtual/special columns not in fieldsStore
const VIRTUAL_COLUMN_DEFAULTS: Record<string, any> = {
  thumbnail: { text: '', value: 'thumbnail', sortable: false, width: 64 },
}

const presetId = ref<number | null>(null)

function buildHeaderFromField(fieldKey: string, width?: number, align?: string): any | null {
  if (VIRTUAL_COLUMN_DEFAULTS[fieldKey]) {
    const base = { ...VIRTUAL_COLUMN_DEFAULTS[fieldKey] }
    if (width != null) base.width = width
    if (align) base.align = align
    return base
  }
  const field = fieldsStore.getField('directus_files', fieldKey)
  if (!field) return null
  return {
    text: field.name,
    value: fieldKey,
    sortable: !NON_SORTABLE_TYPES.includes(field.type),
    width: width ?? 144,
    align: align ?? 'left',
    field: {
      display: field.meta?.display ?? null,
      displayOptions: field.meta?.display_options ?? null,
      interface: field.meta?.interface ?? null,
      interfaceOptions: field.meta?.options ?? null,
      type: field.type,
      collection: field.collection,
      field: field.field,
    },
  }
}

// tableHeaders is a ref so @update:headers works (resize, reorder persist)
const tableHeaders = ref(
  DEFAULT_COLUMN_KEYS.map((k) => buildHeaderFromField(k)).filter(Boolean)
)

// Derived list of active column keys — drives v-field-list disabled-fields
const activeColumnKeys = computed(() => tableHeaders.value.map((h: any) => h.value as string))

const tableSort = computed(() => ({
  by: String(filesStore.sort.field),
  desc: filesStore.sort.direction === 'desc',
}))

// ── Page data ──────────────────────────────────────────────────────
const pageTitle = computed(() =>
  foldersStore.selectedFolderId
    ? foldersStore.getFolderName(foldersStore.selectedFolderId)
    : resolveTranslatable(uploadConfig.value.page_title, t, 'Media Library')
)



const { start: startNotificationBadgeSync } = useNotificationBadgeSync()

/**
 * Route is source of truth for folder/album scope (reload-safe),
 * matching native `/admin/files/folders/:id` behavior.
 */
async function syncFromRoute() {
  const folderId =
    (props.folderId || (route.params.folderId as string | undefined) || '').trim() || null
  const albumId =
    (props.albumId || (route.params.albumId as string | undefined) || '').trim() || null

  // Legacy `?folder=` links from older detail sidebar
  const queryFolder =
    typeof route.query.folder === 'string' && route.query.folder.trim()
      ? route.query.folder.trim()
      : null

  if (albumId) {
    foldersStore.selectFolder(null)
    albumsStore.selectAlbum(albumId)
    if (filesStore.currentAlbumId !== albumId || filesStore.albumFileIds === null) {
      await filesStore.setAlbum(albumId)
    } else if (filesStore.files.length === 0 && !filesStore.isLoading) {
      await filesStore.fetchFiles()
    }
    return
  }

  const targetFolder = folderId || queryFolder
  if (targetFolder) {
    albumsStore.selectAlbum(null)
    foldersStore.selectFolder(targetFolder)
    // Avoid double-fetch if already scoped to this folder
    if (filesStore.currentFolder !== targetFolder || filesStore.albumFileIds !== null) {
      filesStore.setFolder(targetFolder)
    } else if (filesStore.files.length === 0 && !filesStore.isLoading) {
      await filesStore.fetchFiles()
    }
    // Normalize legacy query URL → /folders/:id
    if (queryFolder && !folderId) {
      router.replace(`/media-library/folders/${queryFolder}`)
    }
    return
  }

  // Root /media-library — All Files
  albumsStore.selectAlbum(null)
  foldersStore.selectFolder(null)
  if (filesStore.currentFolder !== undefined || filesStore.albumFileIds !== null) {
    filesStore.setFilter(filesStore.activeFilter === 'all' ? 'all' : filesStore.activeFilter)
  } else if (filesStore.files.length === 0 && !filesStore.isLoading) {
    await filesStore.fetchFiles()
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────
let columnsReady = false
watch(
  activeColumnKeys,
  (keys) => {
    const changed = filesStore.setListFields(keys)
    if (columnsReady && changed) filesStore.fetchFiles()
  },
)

const { init: initPartnerScope } = usePartnerScope()

async function refreshScopedLibraryData() {
  await Promise.all([
    foldersStore.fetchFolders({ force: true }),
    albumsStore.fetchAlbums({ force: true }),
  ])
  await syncFromRoute()
}

onMounted(async () => {
  startNotificationBadgeSync()
  await initPartnerScope()
  await Promise.all([foldersStore.fetchFolders(), loadColumnPrefs(), fetchSettings()])
  filesStore.setListFields(activeColumnKeys.value)
  // Grid mode: force 100-batch before first fetch from route sync
  if (viewMode.value === 'grid') {
    listLimit.value = filesStore.limit || 25
    filesStore.limit = GRID_BATCH
  }
  await syncFromRoute()
  columnsReady = true
  if (viewMode.value === 'grid') nextTick(() => setupGridObserver())
})

// After logout → login, Directus SPA keeps Pinia/module state. Refresh when user changes.
watch(
  () => userStore.currentUser?.id ?? null,
  async (userId, prevUserId) => {
    if (!userId || userId === prevUserId) return
    _currentUserId = null
    await initPartnerScope()
    await refreshScopedLibraryData()
  },
)

watch(
  () => [route.path, route.params.folderId, route.params.albumId, route.query.folder] as const,
  () => {
    syncFromRoute()
  },
)

// ── Column preferences (Directus presets API) ──────────────────────
// layout_query:   { tabular: { fields: [...] } }
// layout_options: { tabular: { widths: {...}, align: {...} } }
// bookmark: 'media-library-columns' avoids colliding with native files preset.

const PRESET_BOOKMARK = 'media-library-columns'

// Resolve current user ID (prefer user store; clear on re-login via watch above).
let _currentUserId: string | null = null
async function getCurrentUserId(): Promise<string | null> {
  const fromStore = userStore.currentUser?.id
  if (fromStore) {
    _currentUserId = String(fromStore)
    return _currentUserId
  }
  if (_currentUserId) return _currentUserId
  try {
    const res = await api.get('/users/me', { params: { fields: ['id'] } })
    _currentUserId = res.data?.data?.id ? String(res.data.data.id) : null
  } catch (err) {
    console.error('[media-library] Could not resolve current user:', err)
  }
  return _currentUserId
}

function buildHeaders(
  fields: string[],
  widths: Record<string, number> = {},
  aligns: Record<string, string> = {},
) {
  return fields
    .map((k) => buildHeaderFromField(k, widths[k], aligns[k]))
    .filter(Boolean)
}

async function loadColumnPrefs() {
  const userId = await getCurrentUserId()
  if (!userId) {
    console.warn('[media-library] loadColumnPrefs: no user id, skipping')
    return
  }
  try {
    const res = await api.get('/presets', {
      params: {
        'filter[collection][_eq]': 'directus_files',
        'filter[bookmark][_eq]': PRESET_BOOKMARK,
        'filter[user][_eq]': userId,
        fields: 'id,layout_query,layout_options',
        limit: 1,
      },
    })
    const preset = res.data?.data?.[0]
    if (!preset) return
    presetId.value = preset.id
    const fields: string[] = preset.layout_query?.tabular?.fields ?? []
    const savedLimit: number = preset.layout_query?.tabular?.limit ?? 25
    const widths: Record<string, number> = preset.layout_options?.tabular?.widths ?? {}
    const aligns: Record<string, string> = preset.layout_options?.tabular?.align ?? {}
    if (fields.length) {
      tableHeaders.value = buildHeaders(fields, widths, aligns)
    }
    filesStore.limit = savedLimit
  } catch (err) {
    console.error('[media-library] loadColumnPrefs failed:', err)
  }
}

let saveDebounce: ReturnType<typeof setTimeout> | null = null
function saveColumnPrefs() {
  if (saveDebounce) clearTimeout(saveDebounce)
  saveDebounce = setTimeout(async () => {
    const userId = await getCurrentUserId()
    if (!userId) return
    try {
      const fields = tableHeaders.value.map((h) => h.value)
      const widths: Record<string, number> = {}
      const aligns: Record<string, string> = {}
      for (const h of tableHeaders.value) {
        const defaultW = VIRTUAL_COLUMN_DEFAULTS[h.value]?.width ?? 144
        if (h.width != null && h.width !== defaultW) widths[h.value] = h.width
        if (h.align && h.align !== 'left') aligns[h.value] = h.align
      }
      const body = {
        collection: 'directus_files',
        bookmark: PRESET_BOOKMARK,
        user: userId,
        layout: 'tabular',
        layout_query: { tabular: { fields, limit: filesStore.limit } },
        layout_options: { tabular: { widths, align: aligns } },
      }
      if (presetId.value) {
        await api.patch(`/presets/${presetId.value}`, body)
      } else {
        const res = await api.post('/presets', body)
        presetId.value = res.data?.data?.id ?? null
      }
    } catch (err) {
      console.error('[media-library] saveColumnPrefs failed:', err)
    }
  }, 450)
}

// Called by v-table @update:headers (user resize or reorder).
// v-table trims headers to non-default keys — re-merge with fieldsStore metadata to restore
// text/sortable/field which are needed for render-display.
function onHeadersUpdate(trimmedHeaders: any[]) {
  tableHeaders.value = trimmedHeaders
    .map((h) => {
      const full = buildHeaderFromField(h.value)
      if (!full) return null
      // Overlay trimmed values (width, align) over the rebuilt full header.
      // Preserve .field metadata from the rebuilt version (not affected by trimming).
      return { ...full, width: h.width ?? full.width, align: h.align ?? full.align }
    })
    .filter(Boolean) as any[]
  saveColumnPrefs()
}

// Called by v-field-list @add — adds any directus_files field (including nested relations)
function addField(fieldKey: string) {
  if (!fieldKey || activeColumnKeys.value.includes(fieldKey)) return
  const header = buildHeaderFromField(fieldKey)
  if (header) tableHeaders.value = [...tableHeaders.value, header]
  saveColumnPrefs()
}

function removeColumn(value: string) {
  if (FIXED_COLUMN_KEYS.includes(value)) return
  const nonFixed = activeColumnKeys.value.filter((k) => !FIXED_COLUMN_KEYS.includes(k))
  if (nonFixed.length <= 1) return
  tableHeaders.value = tableHeaders.value.filter((h: any) => h.value !== value)
  saveColumnPrefs()
}

function onAlignChange(field: string, align: 'left' | 'center' | 'right') {
  const header = tableHeaders.value.find((h: any) => h.value === field)
  if (header) (header as any).align = align
  saveColumnPrefs()
}

// ── Folder actions ─────────────────────────────────────────────────
function navigateUp() {
  const parentId = foldersStore.folderMap.get(foldersStore.selectedFolderId ?? '')?.parent ?? null
  if (parentId) {
    router.push(`/media-library/folders/${parentId}`)
  } else {
    // Top-level folder → All Files root URL
    router.push('/media-library')
  }
}

// ── Search ─────────────────────────────────────────────────────────
function onSearchInput(value: string | null) {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => filesStore.setSearch(value ?? ''), 300)
}

// ── Table ──────────────────────────────────────────────────────────
function onSort(sort: { by: string; desc: boolean } | null) {
  if (!sort) return
  filesStore.setSort(sort.by as keyof DirectusFile, sort.desc ? 'desc' : 'asc')
}

function onLimitChange(value: string) {
  filesStore.limit = parseInt(value, 10)
  filesStore.goToPage(1)
  saveColumnPrefs()
}

function openFile(id: string) {
  router.push(`/media-library/${id}`)
}

function toggleGridSelection(id: string) {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((k) => k !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

function handleGridClick(file: DirectusFile) {
  if (selectedIds.value.length > 0) {
    toggleGridSelection(file.id)
  } else {
    openFile(file.id)
  }
}

function handleRowClick({ item }: { item: DirectusFile; event: PointerEvent }) {
  // If any items are already selected, clicking a row toggles selection instead of navigating
  if (selectedIds.value.length > 0) {
    const id = item.id
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter((k) => k !== id)
    } else {
      selectedIds.value = [...selectedIds.value, id]
    }
  } else {
    openFile(item.id)
  }
}

// ── Upload config — fetched from media_library_settings singleton ──
const { settings: uploadConfig, fetchSettings } = useMediaSettings()

const noFilesLabel = computed(() => resolveTranslatable(uploadConfig.value.no_files_label, t, 'No files here.'))

// ── Batch delete ───────────────────────────────────────────────────
async function batchDeleteFiles() {
  if (isDeleting.value) return
  isDeleting.value = true
  try {
    await api.delete('/files', { data: selectedIds.value })
    selectedIds.value = []
    confirmDelete.value = false
    await filesStore.fetchFiles()
  } catch (err) {
    console.error('[media-library] Batch delete failed:', err)
  } finally {
    isDeleting.value = false
  }
}

// ── Upload ─────────────────────────────────────────────────────────
async function onUploaded(_fileIds: string[]) {
  await filesStore.fetchFiles()
}

function onAddedToAlbum(albumId: string) {
  selectedIds.value = []
  // If currently viewing that album, refresh membership list
  if (filesStore.currentAlbumId === albumId) {
    filesStore.setAlbum(albumId)
  }
}

</script>

<style scoped>
/* ── Header ───────────────────────────────────────────────────────── */
.header-icon {
  --v-button-background-color: transparent;
}

.item-count {
  font-size: 13px;
  font-weight: 500;
  color: var(--theme--foreground-subdued);
  white-space: nowrap;
  padding-inline: 4px;
  display: flex;
  align-items: center;
}

.action-delete {
  --v-button-background-color-hover: var(--theme--danger) !important;
  --v-button-color-hover: var(--white) !important;
}

.active {
  --v-button-background-color: var(--theme--primary-background);
  --v-button-color: var(--theme--primary);
}

/* ── Search wrapper ───────────────────────────────────────────────── */
.search-wrapper {
  position: relative;
  z-index: 60;
}

/* Collapsed pill */
.search-pill {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 20px;
  border: 1px solid var(--theme--border-color);
  background: var(--theme--background-subdued);
  cursor: pointer;
  position: relative;
  transition: border-color var(--fast) var(--transition);
}

.search-pill:hover {
  border-color: var(--theme--primary);
}

.filter-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  border-radius: 10px;
  background: var(--theme--primary);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

/* Expanded search */
.search-expanded {
  position: relative;
}

.search-bar {
  width: 260px;
}

/* ── Content area (full-height scrollport — h-scroll at viewport bottom) ── */
.content-area {
  height: 100%;
  min-height: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

/* Grid must not inherit the wide tabular scrollport */
.content-area.is-grid {
  overflow-x: hidden;
  overflow-y: auto;
}

/* Match native Directus tabular layout so wide tables scroll on this port,
   not inside a content-sized v-table (which parks the bar under the last row). */
.layout-tabular-container {
  container-type: inline-size;
  flex: 1 0 auto;
  min-block-size: 100%;
  align-self: flex-start;
  inline-size: max-content;
  min-inline-size: 100%;
}

.layout-tabular {
  padding-block-start: var(--content-padding-top-table, var(--content-padding-top, 0));
  inline-size: max-content;
  min-inline-size: 100%;
  min-block-size: 100%;
}

.content-area :deep(.layout-tabular > .v-table) {
  display: contents;
}

.content-area :deep(.layout-tabular .v-table > table) {
  min-inline-size: calc(100% - var(--content-padding)) !important;
  margin-inline-start: var(--content-padding);
}

.content-area :deep(.layout-tabular .v-table > table tr) {
  margin-inline-end: var(--content-padding);
}


/* ── Folders section ──────────────────────────────────────────────── */
.folders-section { margin-bottom: 24px; }

.section-label {
  padding-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--theme--foreground-subdued);
}

.folder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}

.folder-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--theme--border-color);
  background: var(--theme--background);
  cursor: pointer;
  text-align: left;
  transition: background var(--fast) var(--transition);
}

.folder-card:hover { background: var(--theme--background-subdued); }
.folder-card-icon { --v-icon-color: var(--theme--warning); flex-shrink: 0; }
.folder-card-name { flex: 1; font-size: 13px; font-weight: 500; color: var(--theme--foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.folder-card-arrow { --v-icon-color: var(--theme--foreground-subdued); flex-shrink: 0; }

/* ── States ───────────────────────────────────────────────────────── */
.state-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 64px 0; }
.empty-icon { --v-icon-size: 52px; --v-icon-color: var(--theme--foreground-subdued); }
.empty-text { font-size: 14px; color: var(--theme--foreground-subdued); margin: 0; }

/* ── List view cells ──────────────────────────────────────────────── */
.thumb-cell { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; }
.thumb-img { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; }
.file-type-icon { --v-icon-color: var(--theme--foreground-subdued); }

.thumb-fallback {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: var(--theme--primary-background);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}
.thumb-fallback-icon { --v-icon-size: 18px; --v-icon-color: var(--theme--primary); }
.thumb-fallback-ext {
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--theme--primary);
  line-height: 1;
}

/* ── Column add button ────────────────────────────────────────────── */
.add-field {
  --v-icon-color-hover: var(--theme--foreground);
  &.active { --v-icon-color: var(--theme--foreground); }
}
.flip { transform: scaleY(-1); }

/* ── Grid view ────────────────────────────────────────────────────── */
.grid-shell {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  container-type: inline-size;
  container-name: media-library-grid;
}

.grid-wrapper {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: stretch;
  align-content: start;
  padding: 22px;
}

/* 1 → 2 → 3 → 4 → 5 → 6 cards per row by content width */
@container media-library-grid (min-width: 420px) {
  .grid-wrapper {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container media-library-grid (min-width: 680px) {
  .grid-wrapper {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@container media-library-grid (min-width: 920px) {
  .grid-wrapper {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@container media-library-grid (min-width: 1180px) {
  .grid-wrapper {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@container media-library-grid (min-width: 1440px) {
  .grid-wrapper {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
}

/* Fallback when container queries aren't available */
@supports not (container-type: inline-size) {
  .grid-wrapper {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

.grid-sentinel {
  width: 100%;
  height: 1px;
  flex-shrink: 0;
}

.grid-loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: var(--theme--foreground-subdued);
  font-size: 13px;
}

/* ── Pagination footer ────────────────────────────────────────────── */
.footer {
  position: sticky;
  inset-inline-start: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  /* Viewport-width within the container query, not full table width */
  inline-size: 100cqi;
  padding: 1.8125rem var(--content-padding);
}

.pagination:not(.v-skeleton-loader) {
  display: inline-block;
}

.per-page {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 13.5rem;
  color: var(--theme--foreground-subdued);

  span {
    width: auto;
    margin-inline-end: 0.25rem;
  }

  .v-select {
    color: var(--theme--foreground);
  }
}
</style>
