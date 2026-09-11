<script setup lang="ts">
import { ref, computed, inject, onMounted, nextTick, watch, useAttrs } from 'vue';
import type { ComputedRef } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';
import FolderDropdown from './FolderDropdown.vue';
import GeoIndividualSelect from './GeoIndividualSelect.vue';
import { useGeographyFieldMaps } from '../composables/useGeographyFieldMaps';
import { mimeToIcon, resolveFileMediaKind } from '../utils/fileType';
import { getMissingRequiredGeoLevels, parseGeoLevels, type GeoLevelConfig } from '../utils/geoLevels';
import {
  parseUploadFileFields,
  isNonWritableUploadField,
  getMissingRequiredUploadFields,
  splitUploadFieldPayload,
  isM2mField,
  extractM2mRelatedIds,
  type UploadFileFieldDef,
} from '../utils/uploadFileFields';
import { persistUploadFieldRelations } from '../utils/persistUploadRelations';
import { resolveFieldTranslatedName } from '../utils/field-label';
import { useT } from '../composables/useT';
import {
  loadUploadValidationSettings,
  buildAcceptFromValidation,
  type UploadValidationSettings,
  DEFAULT_UPLOAD_VALIDATION,
} from '../utils/uploadValidationSettings';
import { validateUploadFile } from '../utils/validateUploadFile';

type UploaderLabels = Record<string, string>
const labels = inject<ComputedRef<UploaderLabels>>('uploaderLabels')
const lbl = (key: string, fallback: string) => labels?.value?.[key] ?? fallback
const { t } = useT()

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
  /** Optional — only needed when the parent links uploads into an M2M junction. */
  junctionTable?: string;
  collectionFkField?: string;
  filesFkField?: string;
  primaryKey?: string | number;
  allowedTypes?: string;
  maxFileSize?: number | null;
  defaultFolder?: string | null;
  uploadAreaFolder?: string | null;
  geoEnabled?: boolean;
  geoLevels?: any;
  geoCascades?: any;
  geoFilterMappings?: any;
  geoLanguageCode?: string;
  geoLabelField?: string;
  uploadStatusField?: string | null;
  uploadStatusValue?: string | null;
  /** Configured directus_files field keys to show on upload */
  uploadFileFields?: any;
  /**
   * Optional preloaded validation rules (e.g. from media_library_settings already fetched).
   * When set, the modal skips its own settings API call on open.
   */
  initialValidationSettings?: UploadValidationSettings | null;
}>();

const attrs = useAttrs();

/** Prefer explicit prop; also accept snake_case from attrs if parent binds oddly. */
const uploadFileFieldsRaw = computed(
  () =>
    props.uploadFileFields ??
    (attrs as Record<string, unknown>).upload_file_fields ??
    (attrs as Record<string, unknown>).uploadFileFields ??
    null,
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'uploaded', fileIds: string[]): void;
}>();

const api = useApi();
const { useFieldsStore, useUserStore, useRelationsStore } = useStores();
const fieldsStore = useFieldsStore();
const userStore = useUserStore();
const relationsStore = useRelationsStore();

const selectedFolder = ref<string | null>(props.defaultFolder);
const fileItems = ref<FileItem[]>([]);
const isDragging = ref(false);
const isUploading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const geoValue = ref<Record<string, StoredFieldValue | null>>({});
const showRequiredErrors = ref(false);

const fileFieldValues = ref<Record<string, unknown>>({});

/** Merge partial v-form emits — each single-field form would otherwise wipe siblings. */
function onFileFieldValuesUpdate(next: Record<string, unknown> | null | undefined) {
  if (!next || typeof next !== 'object') return;
  fileFieldValues.value = { ...fileFieldValues.value, ...next };
}

const geoLevels = computed(() => parseGeoLevels(props.geoLevels));
const geoLevelsInput = computed(() => props.geoLevels);
const geoCascadesInput = computed(() => props.geoCascades);
const geoFilterMappingsInput = computed(() => props.geoFilterMappings);

const { levelByField, cascadeFromByField, filterByByField } = useGeographyFieldMaps({
  levels: geoLevelsInput,
  cascades: geoCascadesInput,
  filterMappings: geoFilterMappingsInput,
});

const missingGeoLevels = computed(() =>
  props.geoEnabled ? getMissingRequiredGeoLevels(geoLevels.value, geoValue.value) : []
);
const geoIsValid = computed(() => missingGeoLevels.value.length === 0);

const appLocale = computed(() => {
  const lang = userStore.currentUser?.language;
  if (typeof lang === 'string' && lang.trim()) return lang.trim();
  return document.documentElement.lang || 'en-US';
});

const geoFieldKeys = computed(() => {
  if (!props.geoEnabled) return new Set<string>();
  return new Set(geoLevels.value.map((l) => l.field));
});

type FileDetailItem =
  | { type: 'geo'; level: GeoLevelConfig }
  | { type: 'form'; field: any };

function resolveUploadField(def: UploadFileFieldDef): any | null {
  let field: any = null;
  try {
    field = fieldsStore.getField('directus_files', def.field);
  } catch {
    field = null;
  }
  if (!field) {
    try {
      const all = fieldsStore.getFieldsForCollection('directus_files') ?? [];
      field = all.find((f: any) => f.field === def.field) ?? null;
    } catch {
      field = null;
    }
  }
  if (!field || isNonWritableUploadField(field)) return null;

  const translated = resolveFieldTranslatedName(field, appLocale.value, def.label || def.field);
  return {
    ...field,
    name: translated,
    meta: {
      ...(field.meta ?? {}),
      group: null,
      hidden: false,
      readonly: false,
    },
  };
}

const resolvedUploadFields = computed(() => {
  const defs = parseUploadFileFields(uploadFileFieldsRaw.value);
  if (!defs.length) return [];

  const skipGeo = geoFieldKeys.value;
  return defs
    .map((def) => (skipGeo.has(def.field) ? null : resolveUploadField(def)))
    .filter(Boolean) as any[];
});

const orderedFileDetailItems = computed((): FileDetailItem[] => {
  const defs = parseUploadFileFields(uploadFileFieldsRaw.value);
  const items: FileDetailItem[] = [];
  const seenGeo = new Set<string>();

  // Geography fields first — config order among geo keys, then any remaining geo levels.
  if (props.geoEnabled) {
    for (const def of defs) {
      const geoLevel = levelByField.value.get(def.field);
      if (!geoLevel || seenGeo.has(def.field)) continue;
      items.push({ type: 'geo', level: geoLevel });
      seenGeo.add(def.field);
    }
    for (const level of geoLevels.value) {
      if (!seenGeo.has(level.field)) {
        items.push({ type: 'geo', level });
      }
    }
  }

  // Native / configured directus_files fields after geography, in config order.
  for (const def of defs) {
    if (props.geoEnabled && levelByField.value.has(def.field)) continue;
    const field = resolveUploadField(def);
    if (field) items.push({ type: 'form', field });
  }

  return items;
});

const hasFileDetailsSection = computed(() => orderedFileDetailItems.value.length > 0);

function setGeoField(field: string, val: StoredFieldValue | null) {
  geoValue.value = { ...geoValue.value, [field]: val };
}

function fileDetailItemKey(item: FileDetailItem, index: number): string {
  if (item.type === 'geo') return `geo-${item.level.field}`;
  return `field-${item.field.field}-${index}`;
}

const missingUploadFields = computed(() =>
  getMissingRequiredUploadFields(resolvedUploadFields.value, fileFieldValues.value),
);
const fileFieldsValid = computed(() => missingUploadFields.value.length === 0);

const allRequiredValid = computed(
  () => (!props.geoEnabled || geoIsValid.value) && fileFieldsValid.value,
);

const missingRequiredLabels = computed(() => {
  const missingFileKeys = new Set(missingUploadFields.value.map((f) => f.field));
  const missingGeoKeys = new Set(missingGeoLevels.value.map((l) => l.field));
  const labels: string[] = [];

  for (const item of orderedFileDetailItems.value) {
    if (item.type === 'geo' && missingGeoKeys.has(item.level.field)) {
      labels.push(item.level.label);
    } else if (item.type === 'form' && missingFileKeys.has(item.field.field)) {
      labels.push(item.field.name || item.field.field);
    }
  }

  return labels;
});

function isMissingFormField(field: any): boolean {
  return missingUploadFields.value.some((f) => f.field === field.field);
}

const selectedCount = computed(() => fileItems.value.length);
const pendingCount = computed(() => fileItems.value.filter((f) => f.status === 'idle').length);
const errorCount = computed(() => fileItems.value.filter((f) => f.status === 'error').length);

const validationSettings = ref<UploadValidationSettings>({
  ...DEFAULT_UPLOAD_VALIDATION,
  allowedImageFormats: [...DEFAULT_UPLOAD_VALIDATION.allowedImageFormats],
  allowedVideoFormats: [...DEFAULT_UPLOAD_VALIDATION.allowedVideoFormats],
});
const validationReady = ref(false);

const acceptAttr = computed(() => {
  if (validationSettings.value.enabled) {
    return buildAcceptFromValidation(validationSettings.value);
  }
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
// File validation (media_library_settings)
// ------------------------------------------------------------------

function previewKindFor(file: File): 'image' | 'video' | null {
  const kind = resolveFileMediaKind(file.type, file.name);
  if (kind === 'image' || kind === 'video') return kind;
  return null;
}

/** Freeze video on first frame — no controls in the compact upload grid. */
function onVideoPreviewReady(event: Event) {
  const video = event.target as HTMLVideoElement | null;
  if (!video) return;
  video.pause();
  try {
    if (video.currentTime === 0) video.currentTime = 0.001;
  } catch {
    /* ignore seek errors before buffer ready */
  }
  video.classList.add('is-ready');
}

async function addFiles(rawFiles: FileList | File[]) {
  // Settings load once on modal open — never re-fetch per file selection
  if (!validationReady.value) {
    validationSettings.value = await loadUploadValidationSettings(api);
    validationReady.value = true;
  }

  const arr = Array.from(rawFiles);
  const validated = await Promise.all(
    arr.map(async (file) => {
      const error = await validateUploadFile(file, validationSettings.value, {
        maxFileSizeBytes: props.maxFileSize ?? null,
        allowedTypes: props.allowedTypes ?? null,
      });
      const previewKind = previewKindFor(file);
      const previewUrl = previewKind ? URL.createObjectURL(file) : null;
      return {
        file,
        previewUrl,
        previewKind,
        status: (error ? 'error' : 'idle') as FileItem['status'],
        progress: 0,
        errorMessage: error,
        uploadedId: null as string | null,
      };
    }),
  );
  fileItems.value.push(...validated);
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

    // Snapshot form values now — async XHR callback must not race later UI edits.
    const valuesSnapshot = { ...fileFieldValues.value };
    const fieldsSnapshot = [...resolvedUploadFields.value];
    const { formDataFields, patchFields } = splitUploadFieldPayload(
      fieldsSnapshot,
      valuesSnapshot,
    );

    // Safety net: ensure M2M values (keywords) are included as clean related PKs only.
    for (const field of fieldsSnapshot) {
      if (!isM2mField(field)) continue;
      const key = field.field as string;
      const raw = valuesSnapshot[key] ?? patchFields[key];
      if (raw == null) continue;
      const ids = extractM2mRelatedIds(raw);
      if (ids.length === 0) {
        delete patchFields[key];
        continue;
      }
      patchFields[key] = ids;
    }

    for (const [field, value] of Object.entries(formDataFields)) {
      formData.append(field, value);
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
          const fileId = String(uploadedFile.id);

          if (Object.keys(patchFields).length > 0) {
            try {
              // M2M (keywords) → create junction rows; scalars → PATCH /files.
              // Nested keyword_ids on /files often 403 for non-admin roles.
              await persistUploadFieldRelations(
                api,
                fileId,
                fieldsSnapshot,
                patchFields,
                (relationsStore.relations as any[]) ?? [],
              );
            } catch (err: any) {
              item.status = 'error';
              item.errorMessage =
                err?.response?.data?.errors?.[0]?.message ??
                err?.message ??
                'Uploaded but failed to save file fields.';
              item.uploadedId = fileId;
              resolve(null);
              return;
            }
          }

          item.progress = 100;
          item.status = 'done';
          item.uploadedId = fileId;
          resolve(fileId);
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

  if (!allRequiredValid.value) {
    showRequiredErrors.value = true;
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

watch(allRequiredValid, (valid) => {
  if (valid) showRequiredErrors.value = false;
});

watch(
  [geoValue, fileFieldValues],
  () => {
    if (showRequiredErrors.value && allRequiredValid.value) {
      showRequiredErrors.value = false;
    }
  },
  { deep: true },
);

onMounted(async () => {
  selectedFolder.value = props.defaultFolder;
  nextTick(() => lowerDialogZIndex());
  try {
    if (props.initialValidationSettings) {
      validationSettings.value = {
        ...props.initialValidationSettings,
        allowedImageFormats: [...props.initialValidationSettings.allowedImageFormats],
        allowedVideoFormats: [...props.initialValidationSettings.allowedVideoFormats],
      };
    } else {
      // Single fetch when the modal opens (hotels / product media path)
      validationSettings.value = await loadUploadValidationSettings(api, { force: true });
    }
  } catch {
    // Defaults already set
  } finally {
    validationReady.value = true;
  }
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
        {{ lbl('uploadModalTitle', 'Upload Files') }}
        <span class="title-count">{{ selectedCount }} {{ t('selected') }}</span>
        <div class="spacer" />
        <button class="close-btn" type="button" @click="handleClose" :disabled="isUploading">
          <v-icon name="close" small />
        </button>
      </v-card-title>

      <v-card-text class="card-body">
        <div class="section">
          <div class="label type-label">{{ lbl('uploadToFolder', 'Upload to folder') }}</div>
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
          <p>{{ lbl('uploadDropPrimary', 'Drag & drop files here') }}</p>
          <p class="type-note">{{ lbl('uploadDropSecondary', 'or click to browse') }}</p>
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
            <span class="label type-label">{{ lbl('uploadSelectedLabel', 'Selected') }}</span>
            <span class="type-note">{{ pendingCount }} {{ lbl('uploadReadyCount', 'ready to upload') }}</span>
            <span v-if="errorCount > 0" class="validation-error-count">
              <v-icon name="error" x-small />
              {{ errorCount }} validation {{ errorCount === 1 ? 'error' : 'errors' }}
            </span>
            <div class="spacer" />
            <v-button x-small secondary :disabled="isUploading" @click="clearAll">{{ lbl('uploadClearAll', 'Clear all') }}</v-button>
          </div>

          <div class="upload-preview-grid">
            <div
              v-for="(item, index) in fileItems"
              :key="index"
              class="upload-preview-tile"
              :class="item.status"
            >
              <div class="upload-preview-thumb">
                <img
                  v-if="item.previewUrl && item.previewKind === 'image'"
                  :src="item.previewUrl"
                  alt=""
                  class="upload-preview-media"
                />
                <template v-else-if="item.previewUrl && item.previewKind === 'video'">
                  <video
                    :src="item.previewUrl"
                    class="upload-preview-media upload-preview-video"
                    preload="metadata"
                    muted
                    playsinline
                    disablepictureinpicture
                    disableremoteplayback
                    tabindex="-1"
                    aria-hidden="true"
                    @loadeddata="onVideoPreviewReady"
                  />
                  <div class="upload-preview-play" aria-hidden="true">
                    <v-icon name="play_circle" />
                  </div>
                </template>
                <div v-else class="upload-preview-fallback">
                  <v-icon :name="mimeToIcon(item.file.type, item.file.name)" />
                </div>

                <div v-if="item.status === 'error'" class="upload-preview-error-badge" aria-hidden="true">
                  <v-icon name="error" small />
                </div>

                <button
                  v-if="item.status === 'idle' || item.status === 'error'"
                  class="upload-preview-remove"
                  type="button"
                  title="Remove"
                  :disabled="isUploading"
                  @click.stop="removeFileItem(index)"
                >
                  <v-icon name="close" x-small />
                </button>

                <div v-if="item.status === 'uploading' || item.status === 'done'" class="upload-preview-progress">
                  <div
                    class="upload-preview-progress-bar"
                    :style="{ width: item.progress + '%' }"
                    :class="{ done: item.status === 'done' }"
                  />
                </div>
              </div>

              <div class="upload-preview-meta" :class="{ 'is-error': item.status === 'error' }">
                <p class="upload-preview-name" :title="item.file.name">{{ item.file.name }}</p>
                <p
                  v-if="item.status === 'error' && item.errorMessage"
                  class="upload-preview-error"
                  :title="item.errorMessage"
                >
                  {{ item.errorMessage }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- All directus_files + geography fields in upload_file_fields order under one label -->
        <div v-if="hasFileDetailsSection" class="file-fields-section section">
          <div class="label type-label">{{ lbl('uploadFileFieldsTitle', 'File details') }}</div>
          <div class="file-details-grid">
            <!-- Keep geo + native fields in one 2-col sequence (e.g. Destination | Keywords). -->
            <template v-for="(item, index) in orderedFileDetailItems" :key="fileDetailItemKey(item, index)">
              <div class="file-detail-cell">
                <GeoIndividualSelect
                  v-if="item.type === 'geo'"
                  :model-value="geoValue[item.level.field] ?? null"
                  :disabled="isUploading"
                  :invalid="showRequiredErrors && item.level.required === true && !geoValue[item.level.field]?.id"
                  :required="item.level.required === true"
                  :target-collection="item.level.collection"
                  :label="item.level.label"
                  :icon="item.level.icon"
                  :label-field="item.level.labelField ?? props.geoLabelField"
                  :language-code="props.geoLanguageCode"
                  :values="geoValue"
                  :cascade-from="cascadeFromByField[item.level.field] ?? []"
                  :filter-by="filterByByField[item.level.field] ?? []"
                  @update:model-value="(v) => setGeoField(item.level.field, v)"
                />
                <div
                  v-else
                  class="file-detail-field"
                  :class="{ 'is-required-missing': showRequiredErrors && isMissingFormField(item.field) }"
                >
                  <!-- Merge updates so sibling single-field forms don't wipe each other. -->
                  <v-form
                    :model-value="fileFieldValues"
                    :fields="[item.field]"
                    primary-key="+"
                    :disabled="isUploading"
                    @update:model-value="onFileFieldValuesUpdate"
                  />
                </div>
              </div>
            </template>
          </div>
        </div>

      </v-card-text>

      <div
        v-if="showRequiredErrors && missingRequiredLabels.length"
        class="required-error-bar"
      >
        <v-icon name="error_outline" small />
        {{ lbl('uploadRequiredFieldsError', 'Please fill in required fields') }}:
        {{ missingRequiredLabels.join(', ') }}
      </div>

      <div class="card-actions">
        <v-button secondary :disabled="isUploading" @click="handleClose">{{ t('cancel') }}</v-button>
        <v-button :disabled="!canUpload" :loading="isUploading" @click="startUpload">
          {{ t('upload') }} {{ pendingCount || '' }}
        </v-button>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.upload-card {
	display: flex;
	flex-direction: column;
	width: 760px;
	max-width: 95vw;
	max-height: min(90vh, 800px);
	max-height: min(90dvh, 800px);
	overflow: hidden;
}

.card-title {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 20px 20px 16px;
	border-bottom: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
}

.title-count {
  margin-left: 6px;
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
  padding: 4px;
  border-radius: var(--theme--border-radius);
  display: flex;
  align-items: center;
}

.card-body {
	flex: 1 1 auto;
	min-height: 0;
	padding: 16px 20px 20px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	overflow-x: hidden;
	overflow-y: auto;
	overscroll-behavior: contain;
	-webkit-overflow-scrolling: touch;
	min-width: 0;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.section :deep(.trigger) {
  min-height: 40px;
}

.file-fields-section {
  margin-top: 4px;
}

.file-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  min-width: 0;
  align-items: start;
}

.file-detail-cell {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file-details-grid :deep(.field) {
  min-width: 0;
  margin: 0;
}

.file-details-grid :deep(.field-label.type-label) {
  color: var(--theme--foreground-accent);
  font-size: 0.875rem;
  font-weight: var(--theme--form--field--label--font-weight, 600);
  font-family: var(--theme--form--field--label--font-family);
  line-height: 1.2143;
  margin-block-end: 0.4375rem;
}

.file-details-grid :deep(.interface) {
  margin: 0;
}

.file-detail-field {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.file-detail-field :deep(.v-form) {
  display: flex;
  flex-direction: column;
  margin: 0;
  min-width: 0;
  gap: 0;
}

.file-detail-field :deep(.v-form > .field) {
  display: flex;
  flex-direction: column;
  margin: 0;
  min-width: 0;
}

.file-detail-field.is-required-missing :deep(.v-input) {
  --v-input-border-color: var(--theme--danger);
  --v-input-border-color-hover: var(--theme--danger);
  --v-input-border-color-focus: var(--theme--danger);
}

.file-detail-field.is-required-missing :deep(.interface-date-time input),
.file-detail-field.is-required-missing :deep(.interface-input input),
.file-detail-field.is-required-missing :deep(.v-select) {
  --v-input-border-color: var(--theme--danger);
}

@media (max-width: 720px) {
  .file-details-grid {
    grid-template-columns: 1fr;
  }
}

.required-error-bar,
.geo-error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 10px 20px;
  background: color-mix(in srgb, var(--theme--danger) 8%, transparent);
  border-top: 1px solid color-mix(in srgb, var(--theme--danger) 25%, transparent);
  --v-icon-color: var(--theme--danger);
}

.dropzone {
  border: 2px dashed var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  background: var(--theme--background-subdued);
  flex-shrink: 0;
}

.dropzone:hover,
.dropzone.dragging {
  border-color: var(--theme--primary);
  background: color-mix(in srgb, var(--theme--primary) 6%, transparent);
}

.dropzone p {
  margin: 0;
}

.drop-icon {
  font-size: 36px;
  opacity: 0.6;
}

.hidden-input {
  display: none;
}

.selected-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.selected-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.validation-error-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--theme--danger, #e35169);
  line-height: 1.2;
}

/* Responsive preview grid — fills modal width; only .card-body scrolls. */
.upload-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  align-items: start;
  width: 100%;
  max-height: none;
  overflow: visible;
}

.upload-preview-tile {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  overflow: hidden;
  background: var(--theme--background-subdued);
}

.upload-preview-tile.error {
  border-color: var(--theme--danger, #e35169);
  border-width: 2px;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--theme--danger, #e35169) 25%, transparent);
  background: color-mix(in srgb, var(--theme--danger, #e35169) 6%, var(--theme--background-subdued));
}

.upload-preview-thumb {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  aspect-ratio: 1 / 1;
  height: auto;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme--background-normal);
  border-bottom: 1px solid var(--theme--border-color);
  overflow: hidden;
}

.upload-preview-tile.error .upload-preview-thumb {
  border-bottom-color: color-mix(in srgb, var(--theme--danger, #e35169) 35%, var(--theme--border-color));
}

.upload-preview-media {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

.upload-preview-video {
  pointer-events: none;
  opacity: 0;
  background: #101010;
}

.upload-preview-video.is-ready {
  opacity: 1;
}

.upload-preview-play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: rgba(255, 255, 255, 0.92);
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.25));
  font-size: 36px;
}

.upload-preview-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
}

.upload-preview-error-badge {
  position: absolute;
  left: 8px;
  top: 8px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--theme--danger, #e35169);
  color: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.upload-preview-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
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
}

.upload-preview-remove:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.65);
}

.upload-preview-remove:disabled {
  opacity: 0.5;
  cursor: default;
}

.upload-preview-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 5px;
  background: rgba(0, 0, 0, 0.18);
}

.upload-preview-progress-bar {
  height: 100%;
  background: var(--theme--primary);
  transition: width 0.2s;
}

.upload-preview-progress-bar.done {
  background: var(--theme--success, #28a745);
}

.upload-preview-meta {
  flex: 0 0 auto;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  background: var(--theme--background-subdued);
}

.upload-preview-meta.is-error {
  background: color-mix(in srgb, var(--theme--danger, #e35169) 10%, transparent);
}

.upload-preview-name {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: normal;
  word-break: break-word;
  color: var(--theme--foreground);
}

.upload-preview-error {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--theme--danger, #e35169);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  word-break: break-word;
  white-space: normal;
}

.card-actions {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	align-items: center;
	justify-content: flex-end;
	gap: 8px;
	width: 100%;
	align-self: stretch;
	flex-shrink: 0;
	min-height: 64px;
	padding: 16px 20px;
	box-sizing: border-box;
	border-top: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
	background: var(--theme--background);
	position: relative;
	z-index: 2;
}

.card-actions :deep(.v-button) {
	width: auto;
	flex: 0 0 auto;
}

@media (max-width: 520px) {
	.card-actions {
		padding: 12px 16px 16px;
	}

	.upload-preview-grid {
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
	}
}
</style>

<style>
.upload-modal-dialog .upload-card {
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.upload-modal-dialog .upload-card .card-body,
.upload-modal-dialog .upload-card .v-card-text.card-body {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
}

.upload-modal-dialog .upload-card .upload-preview-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important;
  gap: 12px !important;
  max-height: none !important;
  overflow: visible !important;
}

.upload-modal-dialog .upload-card .upload-preview-tile {
  width: 100% !important;
  max-width: none !important;
  flex: unset !important;
}

.upload-modal-dialog .upload-card .upload-preview-thumb {
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  aspect-ratio: 1 / 1 !important;
  flex: 0 0 auto !important;
}

.upload-modal-dialog .upload-card .upload-preview-media {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain !important;
  object-position: center !important;
}

.upload-modal-dialog .upload-card .card-actions {
  width: 100% !important;
  display: flex !important;
  flex-direction: row !important;
  justify-content: flex-end !important;
  align-items: center !important;
  gap: 8px !important;
  flex-shrink: 0 !important;
  position: relative !important;
  z-index: 2 !important;
}
</style>
