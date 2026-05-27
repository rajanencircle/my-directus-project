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
        v-tooltip.bottom="'Delete'"
        class="action-delete"
        icon
        small
        rounded
        secondary
        @click="confirmDelete = true"
      >
        <v-icon name="delete" />
      </v-button>

      <!-- Batch edit (multi selection only) -->
      <v-button
        v-if="selectedIds.length > 1"
        v-tooltip.bottom="'Edit'"
        icon
        small
        rounded
        secondary
        @click="batchEditActive = true"
      >
        <v-icon name="edit" />
      </v-button>

      <AddFolder :parent="foldersStore.selectedFolderId" />

      <!-- Upload -->
      <v-button icon small rounded @click="showUploadModal = true">
        <v-icon name="add" />
      </v-button>
    </template>

    <!-- ── Sidebar navigation ──────────────────────────────────────── -->
    <template #navigation>
      <MediaSidebar />
    </template>

    <!-- ── Confirm delete dialog ─────────────────────────────────────── -->
    <v-dialog v-model="confirmDelete" @esc="confirmDelete = false">
      <v-card>
        <v-card-title>Delete {{ selectedIds.length }} file{{ selectedIds.length === 1 ? '' : 's' }}?</v-card-title>
        <v-card-text>This action cannot be undone.</v-card-text>
        <v-card-actions>
          <v-button secondary @click="confirmDelete = false">Cancel</v-button>
          <v-button kind="danger" :loading="isDeleting" @click="batchDeleteFiles">Delete</v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Batch edit drawer ──────────────────────────────────────────── -->
    <BatchEditDrawer
      v-model:active="batchEditActive"
      :primary-keys="selectedIds"
      @refresh="onBatchEditRefresh"
    />

    <!-- ── Upload modal ──────────────────────────────────────────────── -->
    <UploadModal
      v-model="showUploadModal"
      :initial-folder="foldersStore.selectedFolderId"
      :upload-area-folder="uploadConfig.uploadAreaFolder"
      :upload-extra-fields="uploadConfig.uploadExtraFields"
      :geo-enabled="uploadConfig.geoEnabled"
      :geo-levels="uploadConfig.geoLevels"
      :geo-cascades="uploadConfig.geoCascades"
      :geo-filter-mappings="uploadConfig.geoFilterMappings"
      :geo-language-code="uploadConfig.geoLanguageCode"
      :geo-label-field="uploadConfig.geoLabelField"
      @uploaded="onUploaded"
    />

    <!-- ── Center content ─────────────────────────────────────────── -->
    <DropZone
      class="content-area"
      :folder-id="foldersStore.selectedFolderId"
      @upload-complete="filesStore.fetchFiles()"
    >

      <!-- Loading -->
      <div v-if="filesStore.isLoading" class="state-center">
        <v-progress-circular indeterminate />
      </div>

      <!-- Empty -->
      <div v-else-if="filesStore.files.length === 0" class="state-center">
        <v-icon name="cloud_upload" class="empty-icon" />
        <p class="empty-text">No files here. Drop files to upload.</p>
      </div>

      <!-- LIST VIEW -->
      <template v-else-if="viewMode === 'list'">
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
              <img
                v-if="isImageType(item.type)"
                :src="getThumbnailUrl(item.id)"
                :alt="item.title ?? item.filename_disk"
                class="thumb-img"
                loading="lazy"
              />
              <v-icon v-else :name="getFileIcon(item.type)" class="file-type-icon" />
            </div>
          </template>

          <!-- All real fields: delegate to native render-display -->
          <template v-for="header in tableHeaders.filter(h => h.value !== 'thumbnail')" :key="header.value" #[`item.${header.value}`]="{ item }">
            <render-display
              :value="item[header.value]"
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
      </template>

      <!-- GRID VIEW -->
      <div v-else class="grid-wrapper">
        <div
          v-for="file in filesStore.files"
          :key="file.id"
          class="grid-cell"
          @click="openFile(file.id)"
        >
          <div class="grid-thumb">
            <img
              v-if="isImageType(file.type)"
              :src="getThumbnailUrl(file.id, 200)"
              :alt="file.title ?? file.filename_disk"
              class="grid-img"
              loading="lazy"
            />
            <div v-else class="grid-icon-bg">
              <v-icon :name="getFileIcon(file.type)" class="grid-file-icon" />
            </div>
          </div>
          <div class="grid-label">{{ file.title ?? file.filename_disk }}</div>
          <div class="grid-meta">{{ formatFilesize(file.filesize) }}</div>
        </div>
      </div>

      <!-- Grid view pagination -->
      <div v-if="viewMode !== 'list'" class="footer">
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
    </DropZone>

  </private-view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useApi, useStores } from '@directus/extensions-sdk'
import { useFoldersStore } from '../stores/folders.store'
import { useFilesStore, type DirectusFile } from '../stores/files.store'
import { useAssetUrl } from '../composables/useAssetUrl'
import MediaSidebar from '../components/layout/MediaSidebar.vue'
import SearchInput from '../components/SearchInput.vue'
import AddFolder from '../components/AddFolder.vue'
import BatchEditDrawer from '../components/BatchEditDrawer.vue'
import DropZone from '../components/upload/DropZone.vue'
import UploadModal from '../components/upload/UploadModal.vue'
import { UPLOAD_EXTRA_FIELDS } from '../upload-config'
import { useMediaLibrarySettings } from '../composables/useMediaLibrarySettings'

const router = useRouter()
const api = useApi()
const { useFieldsStore } = useStores()
const fieldsStore = useFieldsStore()
const foldersStore = useFoldersStore()
const filesStore = useFilesStore()
const { getThumbnailUrl } = useAssetUrl()

// ── View state ─────────────────────────────────────────────────────
const viewMode = ref<'list' | 'grid'>('list')
const selectedIds = ref<string[]>([])
const tableRowHeight = 48
const showUploadModal = ref(false)
const pageSizes = ['10', '25', '50', '100']

// ── Batch actions ──────────────────────────────────────────────────
const confirmDelete = ref(false)
const isDeleting = ref(false)
const batchEditActive = ref(false)

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
  foldersStore.selectedFolderId ? foldersStore.getFolderName(foldersStore.selectedFolderId) : 'Media Library'
)



// ── Lifecycle ──────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([foldersStore.fetchFolders(), loadColumnPrefs(), loadSettings()])
  filesStore.fetchFiles()
})

watch(() => foldersStore.selectedFolderId, () => filesStore.fetchFiles())

// ── Column preferences (Directus presets API) ──────────────────────
// layout_query:   { tabular: { fields: [...] } }
// layout_options: { tabular: { widths: {...}, align: {...} } }
// bookmark: 'media-library-columns' avoids colliding with native files preset.

const PRESET_BOOKMARK = 'media-library-columns'

// Cache the current user ID — resolved once via /users/me so we don't depend
// on the store being hydrated at mount time.
let _currentUserId: string | null = null
async function getCurrentUserId(): Promise<string | null> {
  if (_currentUserId) return _currentUserId
  try {
    const res = await api.get('/users/me', { params: { fields: ['id'] } })
    _currentUserId = res.data?.data?.id ?? null
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
  foldersStore.selectFolder(parentId)
  filesStore.setFolder(parentId)
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

// ── Upload config — loaded from media_library_settings collection ──
const { settings, loadSettings } = useMediaLibrarySettings()

const uploadConfig = computed(() => ({
  uploadAreaFolder: settings.value.upload_area_folder,
  uploadExtraFields: UPLOAD_EXTRA_FIELDS,
  geoEnabled: settings.value.geo_enabled,
  geoLevels: settings.value.geo_levels,
  geoCascades: settings.value.geo_cascades,
  geoFilterMappings: settings.value.geo_filter_mappings,
  geoLanguageCode: settings.value.geo_language_code,
  geoLabelField: settings.value.geo_label_field,
}))

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

function onBatchEditRefresh() {
  filesStore.fetchFiles()
  selectedIds.value = []
}

// ── Formatting (thumbnail cell + grid view only) ───────────────────
function isImageType(t: string) { return t?.startsWith('image/') ?? false }

function getFileIcon(mimeType: string): string {
  if (!mimeType) return 'insert_drive_file'
  if (mimeType.startsWith('video/')) return 'movie'
  if (mimeType.startsWith('audio/')) return 'audiotrack'
  if (mimeType.includes('pdf')) return 'picture_as_pdf'
  if (mimeType.includes('zip') || mimeType.includes('archive')) return 'folder_zip'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'description'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table_chart'
  return 'insert_drive_file'
}

function formatFilesize(bytes: number): string {
  if (!bytes) return '—'
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(1)} GB`
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

/* ── Content area ─────────────────────────────────────────────────── */
.content-area {
  padding: var(--content-padding);
  padding-top: var(--content-padding-top);
  padding-bottom: var(--content-padding-bottom);
  display: flex;
  flex-direction: column;
  min-height: 100%;
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

/* ── Column add button ────────────────────────────────────────────── */
.add-field {
  --v-icon-color-hover: var(--theme--foreground);
  &.active { --v-icon-color: var(--theme--foreground); }
}
.flip { transform: scaleY(-1); }

/* ── Grid view ────────────────────────────────────────────────────── */
.grid-wrapper { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; align-content: start; }
.grid-cell { cursor: pointer; border-radius: 8px; overflow: hidden; border: 1px solid var(--theme--border-color); background: var(--theme--background); transition: border-color var(--fast) var(--transition); }
.grid-cell:hover { border-color: var(--theme--primary); }
.grid-thumb { width: 100%; aspect-ratio: 1; overflow: hidden; background: var(--theme--background-subdued); }
.grid-img { width: 100%; height: 100%; object-fit: cover; }
.grid-icon-bg { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.grid-file-icon { --v-icon-size: 40px; --v-icon-color: var(--theme--foreground-subdued); }
.grid-label { padding: 8px 8px 2px; font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--theme--foreground); }
.grid-meta { padding: 0 8px 8px; font-size: 11px; color: var(--theme--foreground-subdued); }

/* ── Pagination footer ────────────────────────────────────────────── */
.footer {
  position: sticky;
  inset-inline-start: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  inline-size: 100%;
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
