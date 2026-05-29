<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useApi } from "@directus/extensions-sdk";
import FolderDropdown from "./FolderDropdown.vue";
import GeographiesEditor from "./GeographiesEditor.vue";
import { useMediaSettings } from "../../composables/useMediaSettings";

interface FileItem {
  file: File;
  previewUrl: string | null;
  status: "idle" | "uploading" | "done" | "error";
  progress: number;
  errorMessage: string | null;
  uploadedId?: string | null;
}

interface StoredFieldValue {
  id: string;
  collection: string;
}

const props = defineProps<{
  modelValue: boolean;
  initialFolder?: string | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "uploaded", fileIds: string[]): void;
}>();

const api = useApi();
const { settings, fetchSettings } = useMediaSettings();

onMounted(() => fetchSettings());

// UploadModal stays mounted in the DOM (v-model, no v-if), so onMounted
// fires at page load before the overlay exists. Watch modelValue instead.
watch(
  () => props.modelValue,
  (val) => { if (val) nextTick(() => lowerDialogZIndex()); },
);

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

const selectedFolder = ref<string | null>(props.initialFolder ?? null);
const fileItems = ref<FileItem[]>([]);
const isDragging = ref(false);
const isUploading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const geoValue = ref<Record<string, StoredFieldValue | null>>({});
const geoShowErrors = ref(false);

const missingGeoLevels = computed(() => {
  if (!settings.value.geo_enabled || !settings.value.geo_required) return [];
  const levels: any[] = Array.isArray(settings.value.geo_levels) ? settings.value.geo_levels : [];
  return levels.filter((lvl) => lvl.required === true && !(geoValue.value[lvl.field ?? lvl.key]?.id));
});

const geoIsValid = computed(() => missingGeoLevels.value.length === 0);

// Reset state when modal opens
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      selectedFolder.value = props.initialFolder ?? null;
      fileItems.value = [];
      isDragging.value = false;
      geoValue.value = {};
      geoShowErrors.value = false;
    }
  },
);

// ── File management ─────────────────────────────────────────────────

const selectedCount = computed(() => fileItems.value.length);
const pendingCount = computed(
  () => fileItems.value.filter((f) => f.status === "idle").length,
);
const anySucceeded = computed(() =>
  fileItems.value.some((f) => f.status === "done"),
);
const hasErrors = computed(() =>
  fileItems.value.some((f) => f.status === "error"),
);
const canUpload = computed(
  () => fileItems.value.some((f) => f.status === "idle") && !isUploading.value,
);

function addFiles(rawFiles: FileList | File[]) {
  for (const file of Array.from(rawFiles)) {
    const previewUrl = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : null;
    fileItems.value.push({
      file,
      previewUrl,
      status: "idle",
      progress: 0,
      errorMessage: null,
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

// ── Drag & drop ─────────────────────────────────────────────────────

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
  input.value = "";
}

// ── XHR upload ──────────────────────────────────────────────────────

function getApiBaseUrl(): string {
  return ((api.defaults as any)?.baseURL ?? "").replace(/\/$/, "");
}

function getAuthHeader(): string | null {
  const headers = (api.defaults as any)?.headers;
  return headers?.common?.Authorization ?? headers?.Authorization ?? null;
}

function uploadFileXhr(item: FileItem): Promise<string | null> {
  return new Promise((resolve) => {
    const formData = new FormData();
    // Metadata MUST come before the file binary — Directus streaming parser ignores fields after the file
    formData.append("title", item.file.name.replace(/\.[^.]+$/, "").trim());
    formData.append("status", "draft");
    if (selectedFolder.value) formData.append("folder", selectedFolder.value);

    // Geography FK fields stored on directus_files
    if (settings.value.geo_enabled) {
      for (const [field, selected] of Object.entries(geoValue.value ?? {})) {
        if (selected?.id) formData.append(field, String(selected.id));
      }
    }

    formData.append("file", item.file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        item.progress = Math.round((event.loaded / event.total) * 90);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)?.data;
          item.progress = 100;
          item.status = "done";
          item.uploadedId = String(data.id);
          resolve(String(data.id));
          return;
        } catch {
          item.status = "error";
          item.errorMessage = "Uploaded but failed to process response.";
        }
      } else {
        item.status = "error";
        try {
          item.errorMessage =
            JSON.parse(xhr.responseText)?.errors?.[0]?.message ??
            `Upload failed (${xhr.status})`;
        } catch {
          item.errorMessage = `Upload failed (${xhr.status})`;
        }
      }
      resolve(null);
    };

    xhr.onerror = () => {
      item.status = "error";
      item.errorMessage = "Network error during upload.";
      resolve(null);
    };
    xhr.ontimeout = () => {
      item.status = "error";
      item.errorMessage = "Upload timed out.";
      resolve(null);
    };

    xhr.open("POST", `${getApiBaseUrl()}/files`);
    const auth = getAuthHeader();
    if (auth) xhr.setRequestHeader("Authorization", auth);
    xhr.withCredentials = true;
    item.status = "uploading";
    item.progress = 0;
    xhr.send(formData);
  });
}

async function startUpload() {
  if (isUploading.value) return;
  if (settings.value.geo_enabled && settings.value.geo_required && !geoIsValid.value) {
    geoShowErrors.value = true;
    return;
  }
  isUploading.value = true;
  const pending = fileItems.value.filter((f) => f.status === "idle");
  const uploadedIds = (await Promise.all(pending.map(uploadFileXhr))).filter(
    (id): id is string => Boolean(id),
  );
  isUploading.value = false;

  if (!hasErrors.value) {
    emit("uploaded", uploadedIds);
    emit("update:modelValue", false);
  }
}

function handleClose() {
  if (anySucceeded.value) {
    const ids = fileItems.value
      .filter((f) => f.status === "done" && f.uploadedId)
      .map((f) => String(f.uploadedId));
    emit("uploaded", ids);
  }
  emit("update:modelValue", false);
}

// ── Icon helper ─────────────────────────────────────────────────────

function mimeToIcon(mimeType: string | null): string {
  if (!mimeType) return "insert_drive_file";
  if (mimeType.startsWith("video/")) return "videocam";
  if (mimeType.startsWith("audio/")) return "audiotrack";
  if (mimeType === "application/pdf") return "picture_as_pdf";
  if (mimeType.includes("zip") || mimeType.includes("compressed"))
    return "folder_zip";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "description";
  if (mimeType.includes("sheet") || mimeType.includes("excel"))
    return "table_chart";
  return "insert_drive_file";
}
</script>

<template>
  <v-dialog
    class="upload-modal-dialog"
    :model-value="modelValue"
    @update:model-value="(v: boolean) => !v && handleClose()"
    persistent
  >
    <v-card class="upload-card">
      <!-- Title bar -->
      <v-card-title class="card-title">
        <v-icon name="upload" class="title-icon" />
        Upload Files
        <span class="title-count">{{ selectedCount }} selected</span>
        <div class="spacer" />
        <button
          class="close-btn"
          type="button"
          :disabled="isUploading"
          @click="handleClose"
        >
          <v-icon name="close" small />
        </button>
      </v-card-title>

      <v-card-text class="card-body">
        <!-- Folder picker -->
        <div class="section">
          <label class="section-label">Upload to folder</label>
          <FolderDropdown
            v-model="selectedFolder"
            :exclude-id="settings.upload_area_folder ?? null"
          />
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
            class="hidden-input"
            @change="onFileInputChange"
          />
        </div>

        <!-- Selected file preview grid -->
        <div v-if="fileItems.length > 0" class="selected-wrap">
          <div class="selected-header">
            <span class="selected-label">Selected</span>
            <span class="selected-sub">{{ pendingCount }} ready to upload</span>
            <div class="spacer" />
            <v-button
              x-small
              secondary
              :disabled="isUploading"
              @click="clearAll"
              >Clear all</v-button
            >
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
                  v-if="item.previewUrl"
                  :src="item.previewUrl"
                  alt=""
                  class="tile-img"
                />
                <div v-else class="tile-fallback">
                  <v-icon
                    :name="mimeToIcon(item.file.type)"
                    class="tile-icon"
                  />
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

                <div
                  v-if="item.status === 'uploading' || item.status === 'done'"
                  class="tile-progress"
                >
                  <div
                    class="tile-progress-bar"
                    :style="{ width: item.progress + '%' }"
                    :class="{ done: item.status === 'done' }"
                  />
                </div>
              </div>

              <div class="tile-meta">
                <p class="tile-name" :title="item.file.name">
                  {{ item.file.name }}
                </p>
                <p v-if="item.status === 'error'" class="tile-error">
                  {{ item.errorMessage }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Geography editor -->
        <GeographiesEditor
          v-if="settings.geo_enabled"
          v-model="geoValue"
          :disabled="isUploading"
          :levels="(settings.geo_levels as any[])"
          :cascades="settings.geo_cascades"
          :filter-mappings="settings.geo_filter_mappings"
          :language-code="settings.geo_language_code"
          :label-field="settings.geo_label_field"
          :required="settings.geo_required"
          :show-errors="geoShowErrors"
        />
        <p v-if="settings.geo_enabled && !settings.geo_required" class="geo-help">
          Optional. Selected geography IDs will be saved on the uploaded file.
        </p>
      </v-card-text>

      <div
        v-if="settings.geo_enabled && settings.geo_required && geoShowErrors && !geoIsValid"
        class="geo-error-bar"
      >
        <v-icon name="error_outline" small />
        Please fill in required geography fields: {{ missingGeoLevels.map((l) => l.label).join(', ') }}
      </div>

      <v-card-actions class="card-actions">
        <v-button secondary :disabled="isUploading" @click="handleClose"
          >Cancel</v-button
        >
        <v-button
          :disabled="!canUpload"
          :loading="isUploading"
          @click="startUpload"
        >
          Upload {{ pendingCount > 0 ? pendingCount : "" }}
          {{ pendingCount === 1 ? "File" : "Files" }}
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
  --v-icon-color: var(--theme--primary);
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
  max-height: 70vh;
  overflow-y: auto;
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

.dropzone {
  border: 2px dashed var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
  background: var(--theme--background-subdued);
}

.dropzone:hover,
.dropzone.dragging {
  border-color: var(--theme--primary);
  background: color-mix(in srgb, var(--theme--primary) 6%, transparent);
}

.drop-icon {
  --v-icon-size: 36px;
  --v-icon-color: var(--theme--foreground-subdued);
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

/* Selected grid */
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

.tile-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
  --v-icon-size: 36px;
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

/* Geo help text */
.geo-help {
  margin: -4px 0 0;
  font-size: 12px;
  color: var(--theme--foreground-subdued);
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

/* Actions */
.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 20px;
}
</style>

