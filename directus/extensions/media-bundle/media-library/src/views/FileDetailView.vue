<template>
  <private-view
    :title="isLoading ? lbl('file_loading', 'Loading…') : displayTitle"
    show-back
    back-to="/media-library"
  >

    <!-- ── Actions ────────────────────────────────────────────────── -->
    <template #actions>

      <!-- Delete -->
      <v-dialog v-model="confirmDelete" @esc="confirmDelete = false">
        <template #activator="{ on }">
          <v-button
            v-tooltip.bottom="t('delete')"
            class="action-delete"
            icon
            small
            rounded
            secondary
            :disabled="!file"
            @click="on"
          >
            <v-icon small name="delete" />
          </v-button>
        </template>
        <v-card>
          <v-card-title>{{ t('delete_item', { count: 1 }) }}</v-card-title>
          <v-card-text>{{ t('action_cannot_be_undone') }}</v-card-text>
          <v-card-actions>
            <v-button secondary @click="confirmDelete = false">{{ t('cancel') }}</v-button>
            <v-button kind="danger" :loading="isDeleting" @click="deleteFile">{{ t('delete') }}</v-button>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Download -->
      <v-button
        v-if="file"
        v-tooltip.bottom="downloadModalLabels.download"
        icon
        small
        rounded
        secondary
        @click="downloadModalOpen = true"
      >
        <v-icon small name="download" />
      </v-button>

      <!-- Move to folder -->
      <v-dialog v-if="file" v-model="moveToDialogActive" @esc="moveToDialogActive = false">
        <template #activator="{ on }">
          <v-button v-tooltip.bottom="t('move_to_folder')" icon small rounded secondary @click="on">
            <v-icon small name="folder_move" />
          </v-button>
        </template>
        <v-card>
          <v-card-title>{{ t('move_to_folder') }}</v-card-title>
          <v-card-text>
            <FolderDropdown v-model="selectedFolder" />
          </v-card-text>
          <v-card-actions>
            <v-button secondary @click="moveToDialogActive = false">{{ t('cancel') }}</v-button>
            <v-button :loading="isMoving" @click="moveToFolder">{{ t('move') }}</v-button>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Share -->
      <v-button
        v-if="file"
        v-tooltip.bottom="lbl('share', 'Share')"
        icon
        small
        rounded
        secondary
        @click="shareDialogActive = true"
      >
        <v-icon small name="share" />
      </v-button>

      <!-- Copy URL -->
      <v-button
        v-if="file"
        v-tooltip.bottom="t('copy_url')"
        icon
        small
        rounded
        secondary
        @click="copyAssetUrl"
      >
        <v-icon small name="content_copy" />
      </v-button>

      <!-- Save -->
      <v-button
        v-tooltip.bottom="hasEdits ? t('save') : t('no_changes')"
        icon
        small
        rounded
        :loading="isSaving"
        :disabled="!hasEdits"
        @click="save"
      >
        <v-icon small name="check" />
      </v-button>

    </template>

    <!-- ── Left navigation sidebar ────────────────────────────────── -->
    <template #navigation>
      <MediaSidebar />
    </template>

    <!-- ── Right info sidebar ──────────────────────────────────────── -->
    <template #sidebar>
      <div class="sidebar-scroll-wrap">
      <SidebarDetail icon="info" :title="lbl('sidebar_file_info', 'File Info')" :start-open="true">
        <div class="sidebar-info">
          <template v-if="file">
            <div class="sidebar-row">
              <span class="sidebar-label">{{ lbl('sidebar_copy_id', 'Copy ID') }}</span>
              <button class="copy-id-btn" v-tooltip.left="fileIdCopied ? t('copied') : t('copy')" @click="copyFileId">
                <v-icon :name="fileIdCopied ? 'check' : 'content_copy'" x-small />
              </button>
            </div>
            <div v-for="row in sidebarInfoRows" :key="row.label" class="sidebar-row">
              <span class="sidebar-label">{{ row.label }}</span>
              <a v-if="row.href" class="sidebar-link" :href="row.href" target="_blank" rel="noopener">{{ row.value }}</a>
              <a v-else-if="row.to" class="sidebar-link" href="#" @click.prevent="router.push(row.to)">{{ row.value }}</a>
              <span v-else class="sidebar-value">{{ row.value }}</span>
            </div>
          </template>
          <v-skeleton-loader v-else type="list-item" />
        </div>
      </SidebarDetail>

      <RevisionsSidebar v-if="file" :file-id="props.id" />
      <CommentsSidebar v-if="file" :file-id="props.id" />
      </div>

    </template>

    <!-- ── Center content ─────────────────────────────────────────── -->
    <div class="file-item">

      <div v-if="isLoading" class="state-center">
        <v-progress-circular indeterminate />
      </div>

      <div v-else-if="!file" class="state-center">
        <v-icon name="error_outline" class="error-icon" />
        <p class="state-text">{{ lbl('file_not_found', 'File not found or could not be loaded.') }}</p>
        <v-button secondary @click="goBack">{{ lbl('file_go_back', 'Go back') }}</v-button>
      </div>

      <template v-else>

        <!-- File preview -->
        <div class="preview-wrapper">
          <img
            v-if="isImageType(file.type)"
            :src="previewUrl"
            :alt="displayTitle"
            class="preview-image"
          />
          <video
            v-else-if="isVideoType(file.type)"
            :src="videoUrl"
            class="preview-video"
            controls
            preload="metadata"
          />
          <div v-else class="preview-placeholder">
            <v-icon :name="getFileIcon(file.type)" class="preview-file-icon" />
            <p class="state-text">{{ file.type }}</p>
          </div>
        </div>

        <!-- Editable form — :key remounts when M2M (keywords) hydrate finishes -->
        <v-form
          :key="formRenderKey"
          v-model="edits"
          :fields="editableFields"
          :initial-values="file"
          :primary-key="props.id"
          :loading="isLoading"
          :validation-errors="validationErrors"
          class="file-form"
        />

      </template>

    </div>

    <!-- Share dialog -->
    <ShareModal
      v-if="shareDialogActive && file"
      :file-id="file.id"
      @close="shareDialogActive = false"
    />

    <!-- Unsaved changes dialog -->
    <v-dialog v-model="confirmLeave" @esc="confirmLeave = false">
      <v-card>
        <v-card-title>{{ t('unsaved_changes') }}</v-card-title>
        <v-card-text>{{ t('unsaved_changes_copy') }}</v-card-text>
        <v-card-actions>
          <v-button secondary @click="discardAndLeave">{{ t('discard_changes') }}</v-button>
          <v-button @click="confirmLeave = false">{{ t('keep_editing') }}</v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <DownloadModal
      v-model="downloadModalOpen"
      mode="single"
      :files="downloadModalFiles"
      :labels="downloadModalLabels"
    />

  </private-view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useApi, useStores } from '@directus/extensions-sdk'
import { useAssetUrl } from '../composables/useAssetUrl'
import { useT } from '../composables/useT'
import { useMediaSettings } from '../composables/useMediaSettings'
import { useNotificationBadgeSync } from '../composables/useNotificationBadgeSync'
import { resolveTranslatable } from '../utils/translations'
import MediaSidebar from '../components/layout/MediaSidebar.vue'
import SidebarDetail from '../components/layout/SidebarDetail.vue'
import RevisionsSidebar from '../components/layout/RevisionsSidebar.vue'
import CommentsSidebar from '../components/layout/CommentsSidebar.vue'
import FolderDropdown from '../components/upload/FolderDropdown.vue'
import type { DirectusFile } from '../stores/files.store'
import { filePrimaryTitle } from '../utils/fileCardMeta'
import { validateItem, clearHiddenEdits } from '../utils/validate-item'
import { type DownloadModalFile } from '../utils/downloadVariants'
import { buildDownloadModalLabels } from '../utils/downloadModalLabels'
import DownloadModal from '../components/download/DownloadModal.vue'
import ShareModal from '../../../directus-extension-media-uploader/src/components/ShareModal.vue'
import { hydrateFileM2mFields } from '../utils/hydrateFileM2m'

const props = defineProps<{ id: string }>()

const router = useRouter()
const api = useApi()
const { t } = useT()
const { settings, fetchSettings } = useMediaSettings()
const { getPreviewUrl, getAssetUrl } = useAssetUrl()
const lbl = (key: keyof typeof settings.value, fallback: string) =>
  resolveTranslatable(settings.value[key] as string, t, fallback)
const { useFieldsStore, useRelationsStore } = useStores()
const fieldsStore = useFieldsStore()
const relationsStore = useRelationsStore()

// ── State ──────────────────────────────────────────────────────────
const file = ref<DirectusFile | null>(null)
const edits = ref<Record<string, any>>({})
const validationErrors = ref<any[]>([])
const isLoading = ref(true)
/** Bump after load so list-m2m picks up hydrated keyword_ids */
const formRenderKey = ref(0)
const isSaving = ref(false)
const isDeleting = ref(false)
const isMoving = ref(false)
const confirmDelete = ref(false)
const moveToDialogActive = ref(false)
const selectedFolder = ref<string | null>(null)
const confirmLeave = ref(false)
const pendingLeave = ref<string | null>(null)

// ── Copy ID state ──────────────────────────────────────────────────
const fileIdCopied = ref(false)

// ── Share state ────────────────────────────────────────────────────
const shareDialogActive = ref(false)


// ── Computed ───────────────────────────────────────────────────────
const hasEdits = computed(() => Object.keys(edits.value).length > 0)

const displayTitle = computed(() => {
  if (!file.value) return lbl('file_fallback_title', 'File Detail')
  return filePrimaryTitle(file.value)
})

const FIELDS_DENY_LIST = [
  'storage_divider', 'filename_disk', 'filename_download', 'metadata', 'type', 'filesize', 'focal_point_divider', 'focal_point_x', 'focal_point_y', 'location', 'charset', 'created_on', 'modified_on', 'uploaded_by', 'modified_by', 'width', 'height', 'duration',
  'folder', 'storage',
]

const editableFields = computed(() => {
  try {
    return fieldsStore.getFieldsForCollection('directus_files')
      .filter((f: any) => !FIELDS_DENY_LIST.includes(f.field))
  } catch {
    return []
  }
})


const previewUrl = computed(() => file.value ? getPreviewUrl(file.value.id, file.value.modified_on) : '')
const videoUrl = computed(() => file.value ? getAssetUrl(file.value.id, { cacheBuster: file.value.modified_on }) : '')

function getFieldLabel(fieldName: string, fallback: string): string {
  const field = fieldsStore.getField('directus_files', fieldName)
  const translations: Array<{ language: string; translation: string }> = field?.meta?.translations ?? []
  if (!translations.length) return fallback
  const locale = document.documentElement.lang || 'en-US'
  const lang = locale.split('-')[0] ?? ''
  const match = translations.find(t => t.language === locale)
    ?? translations.find(t => t.language.startsWith(lang))
    ?? translations[0]
  return match?.translation ?? fallback
}


const sidebarInfoRows = computed(() => {
  if (!file.value) return []
  const f = file.value as any
  const rows: { label: string; value: string; href?: string; to?: string }[] = []

  const add = (label: string, value: any, format?: (v: any) => string | null, opts?: { href?: string; to?: string }) => {
    const display = (value !== null && value !== undefined && value !== '')
      ? (format ? format(value) : String(value))
      : null
    rows.push({ label, value: display ?? '—', ...opts })
  }

  // Standard file info
  add('Created', f.created_on ?? f.uploaded_on, formatDate)

  if (f.uploaded_by) {
    const ub = f.uploaded_by
    const name = typeof ub === 'object' ? [ub.first_name, ub.last_name].filter(Boolean).join(' ') : null
    if (name) rows.push({ label: 'Owner', value: name, to: `/users/${ub.id}` })
  }

  add(getFieldLabel('uploaded_on', 'Uploaded'), f.uploaded_on, formatDate)
  add(getFieldLabel('modified_on', 'Modified'), f.modified_on, formatDate)

  {
    const mb = f.modified_by
    const name = mb && typeof mb === 'object' ? [mb.first_name, mb.last_name].filter(Boolean).join(' ') : null
    rows.push({ label: 'Edited by', value: name ?? '—', ...(mb?.id ? { to: `/users/${mb.id}` } : {}) })
  }

  rows.push({ label: 'File', value: 'Open in New Window', href: getAssetUrl(f.id) })

  if (f.folder) {
    const folderName = typeof f.folder === 'object' ? (f.folder as any).name : null
    const folderId = typeof f.folder === 'object' ? (f.folder as any).id : f.folder
    const linkText = folderName ? `Open "${folderName}" folder` : 'Open folder'
    rows.push({ label: 'Folder', value: linkText, to: `/media-library/folders/${folderId}` })
  }

  add(getFieldLabel('storage', 'Storage'), f.storage)

  // Media technical fields
  add(getFieldLabel('file_size_mb', 'File Size (MB)'), f.file_size_mb)
  add(getFieldLabel('file_format', 'File Format'), f.file_format)
  add(getFieldLabel('dimensions_px', 'Dimensions (px)'), f.dimensions_px)
  add(getFieldLabel('resolution_dpi', 'Resolution DPI'), f.resolution_dpi)
  add(getFieldLabel('media_sizes_cm', 'Media Sizes (cm)'), f.media_sizes_cm)
  add(getFieldLabel('color_space', 'Color Space'), f.color_space)

  return rows
})

const downloadModalOpen = ref(false)

const downloadModalFiles = computed<DownloadModalFile[]>(() => {
  if (!file.value) return []
  return [
    {
      id: file.value.id,
      filename: file.value.filename_download,
      type: file.value.type,
      width: file.value.width,
      height: file.value.height,
      media_sizes_cm: file.value.media_sizes_cm,
    },
  ]
})

const downloadModalLabels = computed(() =>
  buildDownloadModalLabels(t, settings.value as Record<string, string>),
)

const { start: startNotificationBadgeSync } = useNotificationBadgeSync()

// ── Lifecycle ──────────────────────────────────────────────────────
onMounted(async () => {
  startNotificationBadgeSync()
  fetchSettings()
  await loadFile()
})

const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
  if (hasEdits.value) {
    e.preventDefault()
    ;(e as any).returnValue = ''
  }
}

const saveShortcutHandler = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    if (hasEdits.value) save()
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', beforeUnloadHandler)
  window.addEventListener('keydown', saveShortcutHandler)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnloadHandler)
  window.removeEventListener('keydown', saveShortcutHandler)
})

onBeforeRouteLeave((to) => {
  if (hasEdits.value) {
    pendingLeave.value = to.fullPath
    confirmLeave.value = true
    return false
  }
})

watch(() => props.id, async () => {
  edits.value = {}
  await loadFile()
})

// ── Data loading ───────────────────────────────────────────────────
async function loadFile() {
  isLoading.value = true
  try {
    const geoTranslationFields = (rel: string) => [
      `${rel}.id`,
      `${rel}.translations.name`,
      `${rel}.translations.translations_id.code`,
    ]

    // Alias M2M/O2M fields (e.g. keyword_ids) are NOT included in `*` — request them
    // explicitly. Also always request keywords (fieldsStore may not be ready yet).
    const relationalAliasFields: string[] = [
      'keyword_ids',
      'keyword_ids.id',
      'keyword_ids.keywords_id',
      'keyword_ids.keywords_id.id',
      'keyword_ids.keywords_id.keyword',
    ]
    try {
      for (const f of fieldsStore.getFieldsForCollection('directus_files') ?? []) {
        const specials = f?.meta?.special
        const list = Array.isArray(specials) ? specials : specials ? [specials] : []
        if (!list.includes('m2m') && !list.includes('o2m') && !list.includes('files')) continue
        const key = f.field as string
        if (!key || key === 'translations') continue
        relationalAliasFields.push(key, `${key}.*`, `${key}.*.*`)
      }
    } catch {
      // keep keyword_ids defaults above
    }

    const res = await api.get(`/files/${props.id}`, {
      params: {
        fields: [
          '*',
          'uploaded_by.id', 'uploaded_by.first_name', 'uploaded_by.last_name',
          'modified_by.id', 'modified_by.first_name', 'modified_by.last_name',
          'folder.id', 'folder.name',
          ...geoTranslationFields('place'),
          ...geoTranslationFields('state'),
          ...geoTranslationFields('region'),
          ...geoTranslationFields('country'),
          ...geoTranslationFields('destination'),
          ...relationalAliasFields,
        ],
      },
    })

    let data = res.data?.data ?? null
    // /files often omits custom M2M — hydrate keyword_ids from junction rows
    data = await hydrateFileM2mFields(
      api,
      data,
      fieldsStore.getFieldsForCollection('directus_files') ?? [],
      (relationsStore.relations as any[]) ?? [],
    )

    file.value = data
    selectedFolder.value = (file.value as any)?.folder ?? null
    edits.value = {}
    formRenderKey.value += 1
  } catch (err) {
    console.warn('[media-library] Failed to fetch file:', err)
    file.value = null
  } finally {
    isLoading.value = false
  }
}

// ── Actions ────────────────────────────────────────────────────────
async function save() {
  if (!hasEdits.value || isSaving.value) return

  validationErrors.value = []

  // Build merged item for condition evaluation
  const allFields = fieldsStore.getFieldsForCollection('directus_files')
  const merged = { ...(file.value ?? {}), ...edits.value }

  // Client-side validation: respects conditions, hidden flags, and custom validation rules
  const clientErrors = validateItem(merged, allFields, false, true)
  if (clientErrors.length > 0) {
    validationErrors.value = clientErrors
    return
  }

  // Clear values for fields hidden by conditions (clear_hidden_value_on_save)
  const payload = clearHiddenEdits(edits.value, allFields, file.value ?? {})

  isSaving.value = true
  try {
    await api.patch(`/files/${props.id}`, payload)
    edits.value = {}
    await loadFile()
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? []
    validationErrors.value = errors
      .filter((e: any) => ['FAILED_VALIDATION', 'RECORD_NOT_UNIQUE'].includes(e?.extensions?.code))
      .map((e: any) => e.extensions)
    if (validationErrors.value.length === 0) {
      console.error('[media-library] Save failed:', err)
    }
  } finally {
    isSaving.value = false
  }
}

async function deleteFile() {
  if (isDeleting.value) return
  isDeleting.value = true
  try {
    await api.delete(`/files/${props.id}`)
    edits.value = {}
    router.push('/media-library')
  } catch (err) {
    console.error('[media-library] Delete failed:', err)
  } finally {
    isDeleting.value = false
    confirmDelete.value = false
  }
}

async function moveToFolder() {
  if (isMoving.value) return
  isMoving.value = true
  try {
    const res = await api.patch(`/files/${props.id}`, { folder: selectedFolder.value })
    file.value = res.data?.data ?? file.value
    moveToDialogActive.value = false
  } catch (err) {
    console.error('[media-library] Move failed:', err)
  } finally {
    isMoving.value = false
  }
}

function goBack() {
  router.push('/media-library')
}

function discardAndLeave() {
  edits.value = {}
  confirmLeave.value = false
  const dest = pendingLeave.value ?? '/media-library'
  pendingLeave.value = null
  router.push(dest)
}

async function copyAssetUrl() {
  if (!file.value) return
  await navigator.clipboard.writeText(getAssetUrl(file.value.id))
}

async function copyFileId() {
  if (!file.value) return
  try {
    await navigator.clipboard.writeText(file.value.id)
    fileIdCopied.value = true
    setTimeout(() => { fileIdCopied.value = false }, 2000)
  } catch { /* no-op */ }
}

// ── Helpers ────────────────────────────────────────────────────────
function isImageType(mimeType: string): boolean {
  return mimeType?.startsWith('image/') ?? false
}

function isVideoType(mimeType: string): boolean {
  return mimeType?.startsWith('video/') ?? false
}

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


function formatDate(isoString: string): string {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString()
}
</script>

<style scoped>
.header-icon {
  --v-button-background-color: transparent;
}

.action-delete {
  --v-button-background-color-hover: var(--theme--danger) !important;
  --v-button-color-hover: var(--white) !important;
}

/* ── Content ──────────────────────────────────────────────────────── */
.file-item {
  padding: var(--content-padding);
  padding-top: var(--content-padding-top);
  padding-bottom: var(--content-padding-bottom);
}

.state-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 0;
}

.error-icon {
  --v-icon-size: 48px;
  --v-icon-color: var(--theme--foreground-subdued);
}

.state-text {
  font-size: 14px;
  color: var(--theme--foreground-subdued);
  margin: 0;
}

/* ── Preview ──────────────────────────────────────────────────────── */
.preview-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme--background-subdued);
  border-radius: var(--theme--border-radius);
  overflow: hidden;
  margin-bottom: var(--theme--form--row-gap);
  min-height: 300px;
  max-height: 500px;
}

.preview-image {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
}

.preview-video {
  max-width: 100%;
  max-height: 500px;
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
}

.preview-file-icon {
  --v-icon-size: 80px;
  --v-icon-color: var(--theme--foreground-subdued);
}

/* ── Sidebar ──────────────────────────────────────────────────────── */
.sidebar-scroll-wrap {
  overflow-y: auto;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-info {
  padding: 0;
}

.sidebar-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--theme--border-color-subdued);
}

.sidebar-row:last-child {
  border-bottom: none;
}

.sidebar-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--theme--foreground);
  flex-shrink: 0;
}

.sidebar-value {
  font-size: 0.8125rem;
  color: var(--theme--foreground-subdued);
  text-align: right;
  word-break: break-word;
}

.sidebar-link {
  font-size: 0.8125rem;
  color: var(--theme--primary);
  text-decoration: none;
  text-align: right;
  word-break: break-word;
}

.sidebar-link:hover {
  text-decoration: underline;
}

.copy-id-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--theme--primary);
  display: flex;
  align-items: center;
  line-height: 1;
}

</style>
