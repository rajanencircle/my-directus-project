<template>
  <private-view
    :title="isLoading ? lbl('file_loading', 'Loading…') : (file?.title ?? file?.filename_disk ?? lbl('file_fallback_title', 'File Detail'))"
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
            rounded
            secondary
            :disabled="!file"
            @click="on"
          >
            <v-icon name="delete" />
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

      <!-- Move to folder -->
      <v-dialog v-if="file" v-model="moveToDialogActive" @esc="moveToDialogActive = false">
        <template #activator="{ on }">
          <v-button v-tooltip.bottom="t('move_to_folder')" icon rounded secondary @click="on">
            <v-icon name="folder_move" />
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
        rounded
        secondary
        @click="shareDialogActive = true"
      >
        <v-icon name="share" />
      </v-button>

      <!-- Copy URL -->
      <v-button
        v-if="file"
        v-tooltip.bottom="t('copy_url')"
        icon
        rounded
        secondary
        @click="copyAssetUrl"
      >
        <v-icon name="content_copy" />
      </v-button>

      <!-- Save -->
      <v-button
        v-tooltip.bottom="hasEdits ? t('save') : t('no_changes')"
        icon
        rounded
        :loading="isSaving"
        :disabled="!hasEdits"
        @click="save"
      >
        <v-icon name="check" />
      </v-button>

    </template>

    <!-- ── Left navigation sidebar ────────────────────────────────── -->
    <template #navigation>
      <MediaSidebar />
    </template>

    <!-- ── Right info sidebar ──────────────────────────────────────── -->
    <template #sidebar>
      <SidebarDetail icon="info" :title="lbl('sidebar_file_info', 'File Info')" :start-open="true">
        <div class="sidebar-info">
          <template v-if="file">
            <div v-for="row in sidebarInfoRows" :key="row.label" class="sidebar-row">
              <span class="sidebar-label">{{ row.label }}</span>
              <span class="sidebar-value">{{ row.value }}</span>
            </div>
          </template>
          <v-skeleton-loader v-else type="list-item" />
        </div>
      </SidebarDetail>

      <SidebarDetail v-if="file" icon="download" :title="lbl('sidebar_downloads', 'Downloads')" :start-open="true">
        <div class="sidebar-downloads">
          <template v-if="canMultiFormatDownload">
            <v-button
              v-for="preset in downloadPresets"
              :key="String(preset.label)"
              small
              secondary
              class="download-preset-btn"
              @click="downloadPreset(preset)"
            >
              {{ preset.label }}
            </v-button>
          </template>
          <v-button v-else small secondary class="download-preset-btn" @click="downloadPreset({ label: lbl('download_original', 'Download Original') })">
            {{ lbl('download_original', 'Download Original') }}
          </v-button>
        </div>
      </SidebarDetail>

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
            :alt="file.title ?? file.filename_disk"
            class="preview-image"
          />
          <div v-else class="preview-placeholder">
            <v-icon :name="getFileIcon(file.type)" class="preview-file-icon" />
            <p class="state-text">{{ file.type }}</p>
          </div>
        </div>

        <!-- Editable form -->
        <v-form
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
    <v-dialog v-model="shareDialogActive" @esc="shareDialogActive = false" :persistent="shareCreating">
      <v-card>
        <v-card-title>
          <v-icon name="share" left />
          {{ lbl('shareTitle', 'Share File') }}
        </v-card-title>

        <template v-if="!shareUrl">
          <v-card-text>
            <v-notice type="info" class="share-hint">
              {{ lbl('shareHint', 'A link will be generated. Optionally protect it with a password or set an expiry date.') }}
            </v-notice>

            <div class="share-fields">
              <div class="share-field">
                <div class="label type-label">
                  {{ lbl('sharePasswordLabel', 'Password') }}
                  <span class="share-optional">— {{ t('optional') }}</span>
                </div>
                <v-input
                  v-model="sharePassword"
                  type="password"
                  :placeholder="lbl('sharePasswordPlaceholder', 'Leave blank for no password')"
                  :disabled="shareCreating"
                  autocomplete="off"
                />
              </div>

              <div class="share-field">
                <div class="label type-label">
                  {{ lbl('shareExpiryLabel', 'Expiry Date') }}
                  <span class="share-optional">— {{ t('optional') }}</span>
                </div>
                <v-input
                  v-model="shareExpiryDate"
                  type="datetime-local"
                  :disabled="shareCreating"
                />
              </div>

              <div class="share-field">
                <div class="label type-label">
                  {{ lbl('shareEmailLabel', 'Share via Email') }}
                  <span class="share-optional">— {{ t('optional') }}</span>
                </div>
                <v-input
                  v-model="shareEmailsRaw"
                  :placeholder="lbl('shareEmailPlaceholder', 'email@example.com, another@example.com')"
                  :disabled="shareCreating"
                />
                <p class="share-note">{{ lbl('shareEmailHint', 'Separate multiple addresses with commas') }}</p>
              </div>
            </div>

            <v-notice v-if="shareError" type="danger" class="share-error">{{ shareError }}</v-notice>
          </v-card-text>

          <v-card-actions>
            <v-button secondary :disabled="shareCreating" @click="closeShareDialog">{{ t('cancel') }}</v-button>
            <v-button :loading="shareCreating" @click="createShareLink">
              <v-icon name="link" left />
              {{ lbl('shareCreateBtn', 'Create Link') }}
            </v-button>
          </v-card-actions>
        </template>

        <template v-else>
          <v-card-text>
            <v-notice type="success" class="share-hint">
              {{ lbl('shareSuccess', 'Share link created successfully!') }}
            </v-notice>

            <div class="share-fields">
              <div class="share-field">
                <div class="label type-label">{{ lbl('shareUrlLabel', 'Share URL') }}</div>
                <v-input :model-value="shareUrl" readonly>
                  <template #append>
                    <v-icon
                      :name="shareCopied ? 'check' : 'content_copy'"
                      clickable
                      :title="lbl('shareCopyUrl', 'Copy URL')"
                      @click="copyShareUrl"
                    />
                  </template>
                </v-input>
              </div>
            </div>
          </v-card-text>

          <v-card-actions>
            <v-button @click="closeShareDialog">{{ t('done') }}</v-button>
          </v-card-actions>
        </template>
      </v-card>
    </v-dialog>

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

  </private-view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useApi, useStores } from '@directus/extensions-sdk'
import { useAssetUrl } from '../composables/useAssetUrl'
import { useT } from '../composables/useT'
import { useMediaSettings } from '../composables/useMediaSettings'
import { resolveTranslatable } from '../utils/translations'
import MediaSidebar from '../components/layout/MediaSidebar.vue'
import SidebarDetail from '../components/layout/SidebarDetail.vue'
import FolderDropdown from '../components/upload/FolderDropdown.vue'
import type { DirectusFile } from '../stores/files.store'
import { validateItem, clearHiddenEdits } from '../utils/validate-item'
import { DEFAULT_DOWNLOAD_FORMAT_PRESETS, type DownloadFormatPreset } from '../utils/downloadPresets'

const props = defineProps<{ id: string }>()

const router = useRouter()
const api = useApi()
const { t } = useT()
const { settings, fetchSettings } = useMediaSettings()
const { getPreviewUrl, getAssetUrl } = useAssetUrl()
const lbl = (key: keyof typeof settings.value, fallback: string) =>
  resolveTranslatable(settings.value[key] as string, t, fallback)
const { useFieldsStore } = useStores()
const fieldsStore = useFieldsStore()

// ── State ──────────────────────────────────────────────────────────
const file = ref<DirectusFile | null>(null)
const edits = ref<Record<string, any>>({})
const validationErrors = ref<any[]>([])
const isLoading = ref(true)
const isSaving = ref(false)
const isDeleting = ref(false)
const isMoving = ref(false)
const confirmDelete = ref(false)
const moveToDialogActive = ref(false)
const selectedFolder = ref<string | null>(null)
const confirmLeave = ref(false)
const pendingLeave = ref<string | null>(null)

// ── Share state ────────────────────────────────────────────────────
const shareDialogActive = ref(false)
const sharePassword = ref('')
const shareExpiryDate = ref('')
const shareEmailsRaw = ref('')
const shareCreating = ref(false)
const shareError = ref('')
const shareUrl = ref('')
const shareCopied = ref(false)


// ── Computed ───────────────────────────────────────────────────────
const hasEdits = computed(() => Object.keys(edits.value).length > 0)

const FIELDS_DENY_LIST = [
  'type', 'width', 'height', 'filesize', 'created_on', 'uploaded_by',
  'uploaded_on', 'modified_by', 'modified_on', 'duration', 'folder',
  'charset', 'embed', 'storage', 'filename_disk', 'filename_download',
]

const editableFields = computed(() => {
  try {
    return fieldsStore.getFieldsForCollection('directus_files')
      .filter((f: any) => !FIELDS_DENY_LIST.includes(f.field))
  } catch {
    return []
  }
})

const previewUrl = computed(() => file.value ? getPreviewUrl(file.value.id) : '')

const sidebarInfoRows = computed(() => {
  if (!file.value) return []
  const f = file.value
  const rows: { label: string; value: string }[] = [
    { label: lbl('sidebar_type', 'Type'), value: f.type ?? '—' },
    { label: lbl('sidebar_size', 'Size'), value: formatFilesize(f.filesize) },
  ]
  if (f.width && f.height) rows.push({ label: lbl('sidebar_dimensions', 'Dimensions'), value: `${f.width} × ${f.height}` })
  rows.push(
    { label: lbl('sidebar_uploaded', 'Uploaded'), value: formatDate(f.uploaded_on) },
    { label: lbl('sidebar_modified', 'Modified'), value: formatDate((f as any).modified_on) },
    { label: lbl('sidebar_id', 'ID'), value: f.id },
  )
  return rows
})

const canMultiFormatDownload = computed(() => isImageType(file.value?.type ?? ''))
const downloadPresets = computed<DownloadFormatPreset[]>(() => DEFAULT_DOWNLOAD_FORMAT_PRESETS)

async function downloadPreset(preset: DownloadFormatPreset) {
  if (!file.value) return
  const fileId = file.value.id
  const origFilename = file.value.filename_download ?? 'download'
  const isImage = isImageType(file.value.type)
  const params: Record<string, string> = {}
  const format: string | undefined = isImage ? ((preset as any).format as string | undefined) : undefined

  if (isImage) {
    if (format) params['format'] = format
    if ((preset as any).width) params['width'] = String((preset as any).width)
    if ((preset as any).height) params['height'] = String((preset as any).height)
    if ((preset as any).fit) params['fit'] = (preset as any).fit
    if ((preset as any).quality) params['quality'] = String((preset as any).quality)
  }
  params['download'] = ''

  // Rename extension to match chosen format so the saved file has the right type
  let filename = origFilename
  if (format) {
    const dot = origFilename.lastIndexOf('.')
    filename = (dot >= 0 ? origFilename.slice(0, dot) : origFilename) + '.' + format
  }

  try {
    const res = await api.get(`/assets/${fileId}`, { params, responseType: 'blob' })
    const blobUrl = URL.createObjectURL(res.data as Blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  } catch (err) {
    console.error('[media-library] Download failed:', err)
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────
onMounted(async () => {
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
    const res = await api.get(`/files/${props.id}`, { params: { fields: ['*', 'uploaded_by.id', 'uploaded_by.first_name', 'uploaded_by.last_name'] } })
    file.value = res.data?.data ?? null
    selectedFolder.value = file.value?.folder ?? null
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
  const allFields = editableFields.value
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
    const res = await api.patch(`/files/${props.id}`, payload)
    file.value = res.data?.data ?? file.value
    edits.value = {}
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

// ── Share actions ──────────────────────────────────────────────────
function closeShareDialog() {
  shareDialogActive.value = false
  sharePassword.value = ''
  shareExpiryDate.value = ''
  shareEmailsRaw.value = ''
  shareError.value = ''
  shareUrl.value = ''
  shareCopied.value = false
}

function parseShareEmails(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map(e => e.trim())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
}

async function createShareLink() {
  if (!file.value) return
  shareCreating.value = true
  shareError.value = ''

  try {
    const payload: Record<string, any> = {
      status: 'published',
      file: file.value.id,
    }
    if (sharePassword.value) payload.password = sharePassword.value
    if (shareExpiryDate.value) payload.expired_date = shareExpiryDate.value

    const { data } = await api.post('/items/media_share_link', payload)
    const shareId = data.data.id
    const url = `${window.location.origin}/media-share-validate/view/${shareId}/`

    try {
      await api.patch(`/items/media_share_link/${shareId}`, { link: url })
    } catch (patchErr: any) {
      console.error('[FileDetailView] PATCH share link failed', patchErr?.response?.data ?? patchErr)
    }

    shareUrl.value = url

    const emails = parseShareEmails(shareEmailsRaw.value)
    if (emails.length > 0) {
      try {
        await api.post('/media-share-validate/notify', { shareUrl: url, emails })
      } catch (mailErr: any) {
        console.error('[FileDetailView] notify failed', mailErr?.response?.data ?? mailErr)
      }
    }
  } catch (err: any) {
    console.error('[FileDetailView] create share link failed', err?.response?.data ?? err)
    shareError.value = err?.response?.data?.errors?.[0]?.message ?? 'Failed to create share link.'
  } finally {
    shareCreating.value = false
  }
}

async function copyShareUrl() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    shareCopied.value = true
    setTimeout(() => { shareCopied.value = false }, 2000)
  } catch {
    /* no-op */
  }
}

// ── Helpers ────────────────────────────────────────────────────────
function isImageType(mimeType: string): boolean {
  return mimeType?.startsWith('image/') ?? false
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

function formatFilesize(bytes: number): string {
  if (!bytes) return '—'
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(1)} GB`
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
.sidebar-info {
  padding: 8px 16px 16px;
}

.sidebar-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0;
  border-bottom: 1px solid var(--theme--border-color);
}

.sidebar-row:last-child {
  border-bottom: none;
}

.sidebar-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--theme--foreground-subdued);
}

.sidebar-value {
  font-size: 13px;
  color: var(--theme--foreground);
  word-break: break-all;
}

/* ── Downloads section content ────────────────────────────────────── */
.sidebar-downloads {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px;
}

.download-preset-btn {
  width: 100%;
}

/* ── Share dialog ─────────────────────────────────────────────────── */
.share-hint {
  margin-bottom: var(--theme--form--row-gap);
}

.share-error {
  margin-top: var(--theme--form--row-gap);
}

.share-fields {
  display: flex;
  flex-direction: column;
  gap: var(--theme--form--row-gap);
}

.share-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.share-optional {
  font-weight: 400;
  color: var(--theme--foreground-subdued);
}

.share-note {
  font-size: 12px;
  color: var(--theme--foreground-subdued);
  margin: 0;
}

</style>
