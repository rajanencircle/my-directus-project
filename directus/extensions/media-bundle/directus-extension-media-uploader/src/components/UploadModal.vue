<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import FolderDropdown from './FolderDropdown.vue';
import GeographiesEditor from './GeographiesEditor.vue';
import { mimeToIcon, resolveFileMediaKind } from '../utils/fileType';
import { getMissingRequiredGeoLevels, parseGeoLevels } from '../utils/geoLevels';

interface FileItem {
  file: File;
  previewUrl: string | null;
  previewKind: 'image' | 'video' | null;
  status: 'idle' | 'uploading' | 'done' | 'error';
  progress: number;
  errorMessage: string | null;
  uploadedId?: string | null;
}

interface StoredFieldValue {
  id: string;
  collection: string;
}

const props = defineProps<{
  junctionTable: string;
  collectionFkField: string;
  filesFkField: string;
  primaryKey: string | number;
  allowedTypes: string;
  maxFileSize: number | null;
  defaultFolder: string | null;
  uploadAreaFolder?: string | null;
  geoEnabled?: boolean;
  geoLevels?: any;
  geoCascades?: any;
  geoFilterMappings?: any;
  geoLanguageCode?: string;
  geoLabelField?: string;
  uploadStatusField?: string | null;
  uploadStatusValue?: string | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'uploaded', fileIds: string[]): void;
}>();

const api = useApi();

const selectedFolder = ref<string | null>(props.defaultFolder);
const fileItems = ref<FileItem[]>([]);
const isDragging = ref(false);
const isUploading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const geoValue = ref<Record<string, StoredFieldValue | null>>({});
const geoShowErrors = ref(false);

const geoLevels = computed(() => parseGeoLevels(props.geoLevels));
const missingGeoLevels = computed(() =>
  props.geoEnabled ? getMissingRequiredGeoLevels(geoLevels.value, geoValue.value) : []
);
const geoIsValid = computed(() => missingGeoLevels.value.length === 0);

const selectedCount = computed(() => fileItems.value.length);
const pendingCount = computed(() => fileItems.value.filter((f) => f.status === 'idle').length);

const acceptAttr = computed(() => {
  const types = props.allowedTypes;
  if (!types || types === '*/*') return undefined;
  return types;
});

const canUpload = computed(() => {
  const hasPending =
    fileItems.value.length > 0 && fileItems.value.some((f) => f.status === 'idle');
  return hasPending && !isUploading.value;
});

const anySucceeded = computed(() => fileItems.value.some((f) => f.status === 'done'));
const hasErrors = computed(() => fileItems.value.some((f) => f.status === 'error'));

// ------------------------------------------------------------------
// File validation
// ------------------------------------------------------------------

function validateFile(file: File): string | null {
  if (props.maxFileSize && file.size > props.maxFileSize) {
    const maxMB = (props.maxFileSize / 1024 / 1024).toFixed(1);
    return `File exceeds max size of ${maxMB} MB`;
  }
  const allowed = props.allowedTypes;
  if (!allowed || allowed === '*/*') return null;
  const patterns = allowed.split(',').map((s) => s.trim());
  const matches = patterns.some((pattern) => {
    if (pattern.endsWith('/*')) {
      const group = pattern.split('/')[0];
      return file.type.startsWith(`${group}/`);
    }
    return file.type === pattern || pattern === '*/*';
  });
  if (!matches) return `File type "${file.type}" is not allowed`;
  return null;
}

function previewKindFor(file: File): 'image' | 'video' | null {
  const kind = resolveFileMediaKind(file.type, file.name);
  if (kind === 'image' || kind === 'video') return kind;
  return null;
}

function addFiles(rawFiles: FileList | File[]) {
  const arr = Array.from(rawFiles);
  for (const file of arr) {
    const error = validateFile(file);
    const previewKind = previewKindFor(file);
    const previewUrl = previewKind ? URL.createObjectURL(file) : null;
    fileItems.value.push({
      file,
      previewUrl,
      previewKind,
      status: error ? 'error' : 'idle',
      progress: 0,
      errorMessage: error,
      uploadedId: null,
    });
  }
}

function removeFileItem(index: number) {
  const item = fileItems.value[index];
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
  fileItems.value.splice(index, 1);
}

function clearAll() {
  for (const item of fileItems.value) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  }
  fileItems.value = [];
}

// ------------------------------------------------------------------
// Drag & Drop
// ------------------------------------------------------------------

function onDragOver(e: DragEvent) {
  e.preventDefault();
  isDragging.value = true;
}

function onDragLeave() {
  isDragging.value = false;
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;
  if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
}

function onFileInputChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files) addFiles(input.files);
  input.value = '';
}

// ------------------------------------------------------------------
// Upload via XHR
// ------------------------------------------------------------------

function getApiBaseUrl(): string {
  const base = (api.defaults as any)?.baseURL || '';
  return base.replace(/\/$/, '');
}

function getAuthHeader(): string | null {
  const headers = (api.defaults as any)?.headers;
  return (
    headers?.common?.Authorization ||
    headers?.Authorization ||
    null
  );
}

function uploadFileXhr(item: FileItem): Promise<string | null> {
  return new Promise((resolve) => {
    const formData = new FormData();
    // Metadata MUST come before the file binary — Directus's streaming
    // multipart parser ignores fields that appear after the file data.
    const title = item.file.name.replace(/\.[^.]+$/, '').trim();
    formData.append('title', title);
    if (selectedFolder.value) {
      formData.append('folder', selectedFolder.value);
    }

    if (props.uploadStatusField && props.uploadStatusValue) {
      formData.append(props.uploadStatusField, props.uploadStatusValue);
    }

    // Geography relations stored directly on directus_files
    if (props.geoEnabled) {
      for (const [field, selected] of Object.entries(geoValue.value ?? {})) {
        if (selected?.id) {
          formData.append(field, String(selected.id));
        }
      }
    }

    formData.append('file', item.file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        item.progress = Math.round((event.loaded / event.total) * 90);
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          const uploadedFile = response.data;

          item.progress = 100;
          item.status = 'done';
          item.uploadedId = String(uploadedFile.id);
          resolve(String(uploadedFile.id));
          return;
        } catch {
          item.status = 'error';
          item.errorMessage = 'Uploaded but failed to process response.';
        }
      } else {
        item.status = 'error';
        try {
          const errBody = JSON.parse(xhr.responseText);
          item.errorMessage = errBody?.errors?.[0]?.message ?? `Upload failed (${xhr.status})`;
        } catch {
          item.errorMessage = `Upload failed (${xhr.status})`;
        }
      }
      resolve(null);
    };

    xhr.onerror = () => {
      item.status = 'error';
      item.errorMessage = 'Network error during upload.';
      resolve(null);
    };

    xhr.ontimeout = () => {
      item.status = 'error';
      item.errorMessage = 'Upload timed out.';
      resolve(null);
    };

    const baseUrl = getApiBaseUrl();
    xhr.open('POST', `${baseUrl}/files`);

    const authHeader = getAuthHeader();
    if (authHeader) {
      xhr.setRequestHeader('Authorization', authHeader);
    }
    xhr.withCredentials = true;

    item.status = 'uploading';
    item.progress = 0;
    xhr.send(formData);
  });
}

async function startUpload() {
  if (isUploading.value) return;
  if (props.geoEnabled && !geoIsValid.value) {
    geoShowErrors.value = true;
    return;
  }
  isUploading.value = true;

  const pendingItems = fileItems.value.filter((f) => f.status === 'idle');
  const uploadedIds = (await Promise.all(pendingItems.map((item) => uploadFileXhr(item)))).filter(
    (id): id is string => Boolean(id)
  );

  isUploading.value = false;

  // Only auto-close if everything succeeded — stay open if any errors
  if (!hasErrors.value) {
    emit('uploaded', uploadedIds);
  }
}

// Close button / Cancel: if some files already uploaded successfully, notify
// parent to refresh even though the user is manually closing.
function handleClose() {
  if (anySucceeded.value) {
    const succeededIds = fileItems.value
      .filter((f) => f.status === 'done' && f.uploadedId)
      .map((f) => String(f.uploadedId));
    emit('uploaded', succeededIds);
  } else {
    emit('close');
  }
}

watch(geoIsValid, (valid) => {
  if (valid) geoShowErrors.value = false;
});

onMounted(() => {
  selectedFolder.value = props.defaultFolder;
  nextTick(() => lowerDialogZIndex());
});

function lowerDialogZIndex() {
  const outlet = document.getElementById('dialog-outlet');
  if (!outlet) return;
  for (const overlay of outlet.querySelectorAll<HTMLElement>(':scope > *')) {
    if (overlay.querySelector('.upload-card')) {
      overlay.style.zIndex = '20';
      const container = overlay.querySelector<HTMLElement>('.container');
      if (container) container.style.zIndex = '20';
      break;
    }
  }
}
</script>

<template>
  <v-dialog class="upload-modal-dialog" :model-value="true" @update:model-value="(v: boolean) => !v && handleClose()" persistent>
    <v-card class="upload-card">
      <v-card-title class="card-title">
        <v-icon name="upload" class="title-icon" />
        Upload Files
        <span class="title-count">{{ selectedCount }} selected</span>
        <div class="spacer" />
        <button class="close-btn" type="button" @click="handleClose" :disabled="isUploading">
          <v-icon name="close" small />
        </button>
      </v-card-title>

      <v-card-text class="card-body">
        <div class="section">
          <label class="section-label">Upload to folder</label>
          <FolderDropdown v-model="selectedFolder" :exclude-id="props.uploadAreaFolder ?? null" />
        </div>

        <!-- Drop zone -->
        <div
          class="dropzone"
          :class="{ dragging: isDragging }"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
          @click="fileInputRef?.click()"
        >
          <v-icon name="cloud_upload" class="drop-icon" />
          <p class="drop-primary">Drag &amp; drop files here</p>
          <p class="drop-secondary">or click to browse</p>
          <input
            ref="fileInputRef"
            type="file"
            multiple
            :accept="acceptAttr"
            class="hidden-input"
            @change="onFileInputChange"
          />
        </div>

        <!-- Selected preview grid -->
        <div v-if="fileItems.length > 0" class="selected-wrap">
          <div class="selected-header">
            <span class="selected-label">Selected</span>
            <span class="selected-sub">{{ pendingCount }} ready to upload</span>
            <div class="spacer" />
            <v-button x-small secondary :disabled="isUploading" @click="clearAll">Clear all</v-button>
          </div>

          <div class="selected-grid">
            <div
              v-for="(item, index) in fileItems"
              :key="index"
              class="tile"
              :class="item.status"
            >
              <div class="tile-thumb">
                <img
                  v-if="item.previewUrl && item.previewKind === 'image'"
                  :src="item.previewUrl"
                  alt=""
                  class="tile-img"
                />
                <video
                  v-else-if="item.previewUrl && item.previewKind === 'video'"
                  :src="item.previewUrl"
                  class="tile-video"
                  controls
                  preload="metadata"
                  playsinline
                />
                <div v-else class="tile-fallback">
                  <v-icon :name="mimeToIcon(item.file.type, item.file.name)" class="tile-icon" />
                </div>

                <button
                  v-if="item.status === 'idle' || item.status === 'error'"
                  class="tile-remove"
                  type="button"
                  title="Remove"
                  :disabled="isUploading"
                  @click.stop="removeFileItem(index)"
                >
                  <v-icon name="close" x-small />
                </button>

                <div v-if="item.status === 'uploading' || item.status === 'done'" class="tile-progress">
                  <div
                    class="tile-progress-bar"
                    :style="{ width: item.progress + '%' }"
                    :class="{ done: item.status === 'done' }"
                  />
                </div>
              </div>

              <div class="tile-meta">
                <p class="tile-name" :title="item.file.name">{{ item.file.name }}</p>
                <p v-if="item.status === 'error'" class="tile-error">{{ item.errorMessage }}</p>
              </div>
            </div>
          </div>
        </div>


        <GeographiesEditor
          v-if="props.geoEnabled"
          v-model="geoValue"
          required
          :show-errors="geoShowErrors"
          :disabled="isUploading"
          :levels="props.geoLevels"
          :cascades="props.geoCascades"
          :filter-mappings="props.geoFilterMappings"
          :language-code="props.geoLanguageCode"
          :label-field="props.geoLabelField"
        />

      </v-card-text>

      <div
        v-if="props.geoEnabled && geoShowErrors && !geoIsValid"
        class="geo-error-bar"
      >
        <v-icon name="error_outline" small />
        Please fill in required geography fields: {{ missingGeoLevels.map((l) => l.label).join(', ') }}
      </div>

      <v-card-actions class="card-actions">
        <v-button secondary :disabled="isUploading" @click="handleClose">Cancel</v-button>
        <v-button :disabled="!canUpload" :loading="isUploading" @click="startUpload">
          Upload {{ pendingCount || '' }} Files
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.upload-card {
  width: 760px;
  max-width: 95vw;
  font-family: var(--theme--fonts--sans--font-family);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--theme--foreground);
  padding: 20px 20px 0;
}

.title-icon {
  color: var(--theme--primary);
}

.title-count {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--theme--foreground-subdued);
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--theme--border-color);
  background: var(--theme--background-subdued);
}

.spacer {
  flex: 1;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--theme--foreground-subdued);
  padding: 4px;
  border-radius: var(--theme--border-radius);
  display: flex;
  align-items: center;
  transition: color 0.15s;
}

.close-btn:hover:not(:disabled) {
  color: var(--theme--foreground);
}

.card-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--theme--foreground-subdued);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.geo-error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 13px;
  color: var(--theme--danger);
  background: color-mix(in srgb, var(--theme--danger) 8%, transparent);
  border-top: 1px solid color-mix(in srgb, var(--theme--danger) 25%, transparent);
  --v-icon-color: var(--theme--danger);
}

.dropzone {
  border: 2px dashed var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  background: var(--theme--background-subdued);
}

.dropzone:hover,
.dropzone.dragging {
  border-color: var(--theme--primary);
  background: color-mix(in srgb, var(--theme--primary) 6%, transparent);
}

.drop-icon {
  font-size: 36px;
  color: var(--theme--foreground-subdued);
  opacity: 0.6;
}

.drop-primary {
  margin: 0;
  font-size: 14px;
  color: var(--theme--foreground);
  font-weight: 500;
}

.drop-secondary {
  margin: 0;
  font-size: 12px;
  color: var(--theme--foreground-subdued);
}

.hidden-input {
  display: none;
}

.selected-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.selected-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.selected-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--theme--foreground-subdued);
}

.selected-sub {
  font-size: 12px;
  color: var(--theme--foreground-subdued);
}

.selected-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  max-height: 320px;
  overflow: auto;
  padding-right: 2px;
}

.tile {
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  overflow: hidden;
  background: var(--theme--background-subdued);
}

.tile.error {
  border-color: var(--theme--danger, #dc3545);
}

.tile-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--theme--background-normal);
  border-bottom: 1px solid var(--theme--border-color);
}

.tile-img,
.tile-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tile-video {
  background: #000;
}

.tile-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme--foreground-subdued);
}

.tile-icon {
  font-size: 36px;
}

.tile-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s;
}

.tile-remove:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.65);
}

.tile-remove:disabled {
  opacity: 0.5;
  cursor: default;
}

.tile-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 5px;
  background: rgba(0, 0, 0, 0.18);
}

.tile-progress-bar {
  height: 100%;
  background: var(--theme--primary);
  transition: width 0.2s;
}

.tile-progress-bar.done {
  background: var(--theme--success, #28a745);
}

.tile-meta {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tile-name {
  margin: 0;
  font-size: 12px;
  color: var(--theme--foreground);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tile-error {
  margin: 0;
  font-size: 11px;
  color: var(--theme--danger, #dc3545);
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 20px;
}
</style>

