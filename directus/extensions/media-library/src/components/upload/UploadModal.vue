<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useApi, useStores } from "@directus/extensions-sdk";
import FolderDropdown from "./FolderDropdown.vue";
import GeographiesEditor from "./GeographiesEditor.vue";

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

type CheckboxOptionInput = string | { label?: string; value?: string };

type UploadExtraField =
  | {
      type: "checkbox-group";
      field: string;
      label?: string;
      options: CheckboxOptionInput[];
      storeAs?: "string-array";
    }
  | Record<string, any>;

type NormalizedCheckboxOption = { key: string; label: string; value: string };

const props = defineProps<{
  modelValue: boolean;
  initialFolder?: string | null;
  uploadAreaFolder?: string | null;
  uploadExtraFields?: any;
  geoEnabled?: boolean;
  geoLevels?: any;
  geoCascades?: any;
  geoFilterMappings?: any;
  geoLanguageCode?: string;
  geoLabelField?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "uploaded", fileIds: string[]): void;
}>();

const api = useApi();
const { useFieldsStore } = useStores();
const fieldsStore = useFieldsStore();

const selectedFolder = ref<string | null>(props.initialFolder ?? null);
const fileItems = ref<FileItem[]>([]);
const isDragging = ref(false);
const isUploading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const geoValue = ref<Record<string, StoredFieldValue | null>>({});
const checkboxValues = ref<Record<string, string[]>>({});
const booleanValues = ref<Record<string, boolean>>({});

// Reset state when modal opens
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      selectedFolder.value = props.initialFolder ?? null;
      fileItems.value = [];
      isDragging.value = false;
      geoValue.value = {};
      checkboxValues.value = {};
      booleanValues.value = {};
    }
  },
);

// ── Extra fields helpers ────────────────────────────────────────────

function normalizeCheckboxOption(
  opt: CheckboxOptionInput,
  index: number,
): NormalizedCheckboxOption | null {
  if (typeof opt === "string") {
    const s = opt.trim();
    if (!s) return null;
    return { key: `${index}:${s}`, label: s, value: s };
  }
  if (opt && typeof opt === "object") {
    const value = String(opt.value ?? opt.label ?? "").trim();
    const label = String(opt.label ?? opt.value ?? "").trim();
    if (!value && !label) return null;
    return {
      key: `${index}:${value || label}`,
      label: label || value,
      value: value || label,
    };
  }
  return null;
}

function normalizedCheckboxOptions(
  field: UploadExtraField,
): NormalizedCheckboxOption[] {
  if ((field as any)?.type !== "checkbox-group") return [];
  const raw = (field as any).options;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o: CheckboxOptionInput, i: number) => normalizeCheckboxOption(o, i))
    .filter((x): x is NormalizedCheckboxOption => x != null);
}

function parseUploadExtraFields(input: any): UploadExtraField[] {
  if (!input) return [];
  const raw =
    typeof input === "string"
      ? (() => {
          try {
            return JSON.parse(input);
          } catch {
            return null;
          }
        })()
      : input;
  return Array.isArray(raw) ? (raw as UploadExtraField[]) : [];
}

const uploadExtraFields = computed<UploadExtraField[]>(() =>
  parseUploadExtraFields(props.uploadExtraFields),
);

function checkboxSelected(field: string, option: string): boolean {
  return (checkboxValues.value[field] ?? []).includes(option);
}

function toggleCheckbox(field: string, option: string) {
  const current = checkboxValues.value[field] ?? [];
  const next = current.includes(option)
    ? current.filter((x) => x !== option)
    : [...current, option];
  checkboxValues.value = { ...checkboxValues.value, [field]: next };
}

function dynamicChoicesForField(
  fieldName: string,
): NormalizedCheckboxOption[] | null {
  try {
    const field = fieldsStore.getField("directus_files", fieldName);
    const choices = (field as any)?.meta?.options?.choices;
    if (!Array.isArray(choices) || choices.length === 0) return null;
    return choices.map((c: any, i: number) => ({
      key: `${i}:${String(c.value ?? "")}`,
      label: String(c.text ?? c.label ?? c.value ?? ""),
      value: String(c.value ?? c.text ?? ""),
    }));
  } catch {
    return null;
  }
}

function resolvedCheckboxOptions(
  field: UploadExtraField,
): NormalizedCheckboxOption[] {
  const fieldName = String((field as any)?.field ?? "").trim();
  if (fieldName) {
    const dynamic = dynamicChoicesForField(fieldName);
    if (dynamic && dynamic.length > 0) return dynamic;
  }
  return normalizedCheckboxOptions(field);
}

// Returns the translated field label from fieldsStore, falling back to a config
// label or a humanised version of the field key.
function labelForField(fieldName: string, fallback?: string): string {
  try {
    const name = (fieldsStore.getField("directus_files", fieldName) as any)?.name;
    if (name) return name;
  } catch { /* ignore */ }
  if (fallback) return fallback;
  return fieldName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

    // Extra checkbox-group and boolean fields
    for (const field of uploadExtraFields.value) {
      const f = String((field as any)?.field ?? "").trim();
      if (!f) continue;
      if ((field as any)?.type === "checkbox-group") {
        const val = checkboxValues.value[f] ?? [];
        if (val.length > 0) {
          try { formData.append(f, JSON.stringify(val)); } catch { /* ignore */ }
        }
      } else if ((field as any)?.type === "boolean") {
        formData.append(f, booleanValues.value[f] ? "true" : "false");
      }
    }

    // Geography FK fields stored on directus_files
    if (props.geoEnabled) {
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
            :exclude-id="uploadAreaFolder ?? null"
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

        <!-- Extra fields (checkbox groups + booleans) -->
        <div v-if="uploadExtraFields.length > 0" class="extra-fields">
          <template
            v-for="field in uploadExtraFields"
            :key="String((field as any)?.field ?? (field as any)?.label ?? JSON.stringify(field))"
          >
            <!-- Checkbox group (multi-select flags) -->
            <div v-if="(field as any)?.type === 'checkbox-group'" class="extra-section">
              <div class="extra-title">
                {{ labelForField(String((field as any)?.field ?? ''), (field as any)?.label) }}
              </div>
              <div class="flags-grid">
                <label
                  v-for="opt in resolvedCheckboxOptions(field)"
                  :key="opt.key"
                  class="flag-item"
                  :class="{ disabled: isUploading }"
                >
                  <input
                    type="checkbox"
                    class="flag-check"
                    :disabled="isUploading"
                    :checked="checkboxSelected(String((field as any)?.field ?? ''), opt.value)"
                    @change="toggleCheckbox(String((field as any)?.field ?? ''), opt.value)"
                  />
                  <span class="flag-label">{{ opt.label }}</span>
                </label>
              </div>
            </div>

            <!-- Boolean (single toggle) -->
            <label
              v-else-if="(field as any)?.type === 'boolean'"
              class="flag-item boolean-field"
              :class="{ disabled: isUploading }"
            >
              <input
                type="checkbox"
                class="flag-check"
                :disabled="isUploading"
                :checked="booleanValues[(field as any)?.field] ?? false"
                @change="booleanValues[(field as any)?.field] = ($event.target as HTMLInputElement).checked"
              />
              <span class="flag-label">
                {{ labelForField(String((field as any)?.field ?? ''), (field as any)?.label) }}
              </span>
            </label>
          </template>
        </div>

        <!-- Geography editor -->
        <GeographiesEditor
          v-if="geoEnabled"
          v-model="geoValue"
          :disabled="isUploading"
          :levels="geoLevels"
          :cascades="geoCascades"
          :filter-mappings="geoFilterMappings"
          :language-code="geoLanguageCode"
          :label-field="geoLabelField"
        />
        <p v-if="geoEnabled" class="geo-help">
          Optional. Selected geography IDs will be saved directly on the
          uploaded file fields
          <strong>place, state, region, country, destination </strong>.
        </p>
      </v-card-text>

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
  width: 560px;
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

/* Extra fields */
.extra-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.extra-section {
  padding: 12px;
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-normal);
}

.extra-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--theme--foreground-subdued);
  margin-bottom: 10px;
}

.flags-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 14px;
}

@media (max-width: 520px) {
  .flags-grid {
    grid-template-columns: 1fr;
  }
}

.flag-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-subdued);
  cursor: pointer;
  user-select: none;
}

.flag-item:hover:not(.disabled) {
  border-color: color-mix(
    in srgb,
    var(--theme--primary) 45%,
    var(--theme--border-color)
  );
}

.flag-item.disabled {
  opacity: 0.6;
  cursor: default;
}

.flag-check {
  width: 16px;
  height: 16px;
}

.flag-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--theme--foreground);
}

/* Boolean field sits flush — no wrapper section needed */
.boolean-field {
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-normal);
  padding: 10px 12px;
}

/* Geo help text */
.geo-help {
  margin: -4px 0 0;
  font-size: 12px;
  color: var(--theme--foreground-subdued);
}

/* Actions */
.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 20px;
}
</style>
