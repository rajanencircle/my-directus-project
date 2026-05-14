<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';
import MediaGrid from './components/MediaGrid.vue';
import UploadModal from './components/UploadModal.vue';
import AddExistingModal from './components/AddExistingModal.vue';
import FileDetailsDrawer from './components/FileDetailsDrawer.vue';

// ─── Types ─────────────────────────────────────────────────────────────────

interface JunctionRow {
  id: number | string;
  [key: string]: any;
}

// ─── Props ──────────────────────────────────────────────────────────────────

const props = withDefaults(
  defineProps<{
    value?: any[];
    collection: string;
    field: string;
    primaryKey?: string | number;
    disabled?: boolean;
    // Interface options
    allowed_types?: string;
    max_file_size?: number | null;
    thumbnail_size?: number;
    readonly?: boolean;
    delete_files?: boolean;
    upload_area_folder?: string | null;
    upload_extra_fields?: any;
    file_reverse_links?: any;
    geo_enabled?: boolean;
    geo_levels?: any;
    geo_cascades?: any;
    geo_filter_mappings?: any;
    geo_language_code?: string;
    geo_label_field?: string;
  }>(),
  {
    value: () => [],
    disabled: false,
    allowed_types: '*/*',
    max_file_size: null,
    thumbnail_size: 250,
    readonly: false,
    delete_files: false,
    geo_enabled: true,
    geo_language_code: 'en-GB',
    geo_label_field: 'translations.name',
  }
);

const emit = defineEmits<{
  (e: 'input', value: any[]): void;
}>();

// ─── State ───────────────────────────────────────────────────────────────────

const api = useApi();
const { useRelationsStore } = useStores();
const relationsStore = useRelationsStore();

const loading = ref(false);
const loadError = ref<string | null>(null);
const initError = ref<string | null>(null);
const junctionReady = ref(false);

const showUploadModal = ref(false);
const showAddExistingModal = ref(false);
const deleteTarget = ref<JunctionRow | null>(null);
const showDeleteConfirm = ref(false);
const deleteLoading = ref(false);

const defaultFolder = ref<string | null>(null);

const selectedRow = ref<JunctionRow | null>(null);

// Draft rows for form state (staged until parent record Save).
// This is what drives the UI, and what we emit back to Directus.
const rowsDraft = ref<JunctionRow[]>([]);
const lastEmittedValueSig = ref<string>('');

// ─── Relation-derived Junction Info ──────────────────────────────────────────
// Directus stores the M2M relation as: junction.{fk} → parent_collection,
// with meta.one_field = the alias field name on the parent.

const m2mRelation = computed(() =>
  (relationsStore.relations as any[]).find(
    (r) => r.related_collection === props.collection && r.meta?.one_field === props.field
  )
);

const junctionTable = computed(() => m2mRelation.value?.collection ?? `${props.collection}_files`);
const collectionFkField = computed(() => m2mRelation.value?.field ?? `${props.collection}_id`);
const filesFkField = computed(() => m2mRelation.value?.meta?.junction_field ?? 'directus_files_id');

const filesFkRelation = computed(() => {
  const junction = junctionTable.value;
  const fkField = filesFkField.value;
  return (relationsStore.relations as any[]).find((r) => r.collection === junction && r.field === fkField);
});

const filesRelatedCollection = computed(() => filesFkRelation.value?.related_collection ?? null);

// ─── Computed ────────────────────────────────────────────────────────────────

const isNewRecord = computed(
  () => !props.primaryKey || props.primaryKey === '+' || props.primaryKey === ''
);

const effectiveReadonly = computed(() => props.readonly || props.disabled);

const linkedFileIds = computed(() =>
  rowsDraft.value.map((r) => String(r[filesFkField.value]?.id ?? '')).filter(Boolean)
);

// ─── Junction Init ────────────────────────────────────────────────────────────

function initJunction(): boolean {
  if (!m2mRelation.value) {
    initError.value = 'Could not find M2M relation for this field. Ensure the field is configured as a Many-to-Many.';
    return false;
  }

  // This interface is specifically a file manager: the M2M related side must be directus_files.
  // If attached to a different M2M (e.g. self-relations like cruises↔cruises), emitting staged rows
  // would write file IDs into the wrong FK column and cause INVALID_FOREIGN_KEY errors on save.
  if (!filesRelatedCollection.value) {
    initError.value =
      `This interface requires a Many-to-Many relation to directus_files, but the related collection could not be determined ` +
      `(junction: "${junctionTable.value}", junction field: "${filesFkField.value}"). ` +
      `Please configure the relation so the related collection is "directus_files".`;
    return false;
  }

  if (filesRelatedCollection.value !== 'directus_files') {
    initError.value =
      `This interface can only be used for Many-to-Many relations where the related collection is directus_files. ` +
      `This field is linked to "${filesRelatedCollection.value}" (junction: "${junctionTable.value}", junction field: "${filesFkField.value}"). ` +
      `Fix: create an M2M field from "${props.collection}" to "directus_files" (junction like "${props.collection}_directus_files") and use this interface there.`;
    return false;
  }
  return true;
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function loadFiles() {
  if (isNewRecord.value) return;
  loading.value = true;
  loadError.value = null;
  try {
    const res = await api.get(`/items/${junctionTable.value}`, {
      params: {
        filter: { [collectionFkField.value]: { _eq: props.primaryKey } },
        fields: ['id', collectionFkField.value, `${filesFkField.value}.*`],
        limit: -1,
      },
    });
    const fresh = res.data.data ?? [];
    rowsDraft.value = fresh;
  } catch (e: any) {
    loadError.value = e?.response?.data?.errors?.[0]?.message ?? 'Failed to load files.';
  } finally {
    loading.value = false;
  }
}

async function loadSettings() {
  try {
    const res = await api.get('/settings', {
      params: { fields: ['storage_default_folder'] },
    });
    defaultFolder.value = res.data.data?.storage_default_folder ?? null;
  } catch {
    // Non-fatal
  }
}

// ─── Draft staging helpers ───────────────────────────────────────────────────

async function fetchFilesByIds(fileIds: string[]) {
  const ids = (fileIds ?? []).map(String).filter(Boolean);
  if (!ids.length) return [];

  const res = await api.get('/files', {
    params: {
      filter: { id: { _in: ids } },
      fields: ['id', 'type', 'title', 'filename_download', 'expiry_date'],
      limit: -1,
    },
  });

  return (res.data?.data ?? []).map((f: any) => ({
    id: String(f.id),
    type: f.type ?? null,
    title: f.title ?? null,
    filename_download: f.filename_download ?? '',
    expiry_date: f.expiry_date ?? null,
  }));
}

async function stageAddFileIds(fileIds: string[]) {
  const incoming = (fileIds ?? []).map(String).filter(Boolean);
  if (!incoming.length) return;

  const existing = new Set(
    rowsDraft.value.map((r) => String(r?.[filesFkField.value]?.id ?? '')).filter(Boolean)
  );
  const toAdd = incoming.filter((id) => !existing.has(id));
  if (!toAdd.length) return;

  try {
    const files = await fetchFilesByIds(toAdd);
    const appended = files.map((f: any) => ({
      id: `tmp:${f.id}`,
      [filesFkField.value]: f,
    }));
    rowsDraft.value = [...rowsDraft.value, ...appended];
    emitCurrentValue();
  } catch (e) {
    console.error('[media-uploader] Failed to stage added files:', e);
  }
}

// ─── Upload ──────────────────────────────────────────────────────────────────

function openUploadModal() {
  showUploadModal.value = true;
}

function onUploaded() {
  showUploadModal.value = false;
  // Upload modal will emit staged file IDs; no DB refresh needed here.
}

function openAddExistingModal() {
  showAddExistingModal.value = true;
}

function onLinkedExisting() {
  showAddExistingModal.value = false;
  // Add-existing modal will emit staged file IDs; no DB refresh needed here.
}

// ─── Delete ──────────────────────────────────────────────────────────────────

function requestDelete(row: JunctionRow) {
  deleteTarget.value = row;
  showDeleteConfirm.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  const row = deleteTarget.value;
  const fileId = row[filesFkField.value]?.id;

  deleteLoading.value = true;
  try {
    // Stage removal locally; persistence happens when parent record is saved.
    rowsDraft.value = rowsDraft.value.filter((r) => r.id !== row.id);
    emitCurrentValue();

    // Optional: allow hard-delete of the underlying file only when explicitly enabled.
    // Note: This deletes the file immediately (cannot be undone by Discard).
    if (props.delete_files && fileId) await api.delete(`/files/${fileId}`).catch(() => {});
  } catch (e: any) {
    console.error('[media-uploader] Delete error:', e);
  } finally {
    deleteLoading.value = false;
    showDeleteConfirm.value = false;
    deleteTarget.value = null;
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false;
  deleteTarget.value = null;
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

async function openDetails(row: JunctionRow) {
  // If this is a staged (unsaved) row, it might not have a junction id yet.
  // In that case, just open with the local row data.
  if (!row?.id || String(row.id).startsWith('tmp:')) {
    selectedRow.value = row;
    return;
  }

  // Otherwise refresh the selected junction row with expanded file.
  try {
    const res = await api.get(`/items/${junctionTable.value}/${row.id}`, {
      params: { fields: ['*', `${filesFkField.value}.*`] },
    });
    selectedRow.value = res.data?.data ?? row;
  } catch {
    selectedRow.value = row;
  }
}

function closeDetails() {
  selectedRow.value = null;
}

// ─── Download All ─────────────────────────────────────────────────────────────

const downloadFormats = [
  { label: 'JPG', value: 'jpg' },
  { label: 'PNG', value: 'png' },
  { label: 'WebP', value: 'webp' },
  { label: 'TIFF', value: 'tiff' },
];

function downloadAll(format: string) {
  rowsDraft.value.forEach((row, i) => {
    const file = row[filesFkField.value];
    if (!file) return;
    const isImage = file.type?.startsWith('image/') ?? false;
    const url = isImage
      ? `/assets/${file.id}?format=${format}&download`
      : `/assets/${file.id}?download`;
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename_download;
      link.click();
    }, i * 150);
  });
}

// ─── Emit ────────────────────────────────────────────────────────────────────

function emitCurrentValue() {
  // Emit a value that Directus can persist on parent Save:
  // - keep existing junction items by id
  // - create new junction items using the junction file FK field
  const out = rowsDraft.value.map((r) => {
    const file = r?.[filesFkField.value];
    const fileId = file?.id ?? file;
    const base: Record<string, any> = {};

    if (r?.id && !String(r.id).startsWith('tmp:')) base.id = r.id;
    if (fileId) base[filesFkField.value] = fileId;
    if ('sort' in r) base.sort = r.sort;
    return base;
  });

  const sig = JSON.stringify(out);
  lastEmittedValueSig.value = sig;
  emit('input', out);
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadSettings();
  const ready = initJunction();
  junctionReady.value = ready;
  if (ready && !isNewRecord.value) {
    await loadFiles();
  }
});

watch(
  () => props.primaryKey,
  async (newKey, oldKey) => {
    if (newKey && newKey !== '+' && newKey !== oldKey) {
      const ready = initJunction();
      junctionReady.value = ready;
      if (ready) await loadFiles();
    }
  }
);

// If Directus resets the field value (e.g. Discard), reset the draft from DB.
// We intentionally use DB state as the truth on discard to ensure we revert.
watch(
  () => props.value,
  async () => {
    if (isNewRecord.value) return;
    // Ignore the immediate prop update that reflects our own emit.
    const nextSig = JSON.stringify(props.value ?? []);
    if (nextSig === lastEmittedValueSig.value) return;
    await loadFiles();
  },
  { deep: true }
);
</script>

<template>
  <div class="media-uploader">
    <!-- Init error -->
    <div v-if="initError" class="notice notice-error">
      <v-icon name="error" small />
      {{ initError }}
    </div>

    <!-- New-record hint -->
    <div v-else-if="isNewRecord" class="notice notice-info">
      <v-icon name="info" small />
      Save this record first to manage files.
    </div>

    <template v-else>
      <!-- Header -->
      <div class="header">
        <span class="header-title">Media ({{ rowsDraft.length }})</span>
        <div class="header-actions">
          <v-menu v-if="!effectiveReadonly && rowsDraft.length > 0" placement="bottom-end" show-arrow>
            <template #activator="{ toggle }">
              <v-button secondary icon :disabled="loading" title="Download all files" @click="toggle">
                <v-icon name="download" />
              </v-button>
            </template>
            <v-list>
              <v-list-item v-for="fmt in downloadFormats" :key="fmt.value" clickable @click="downloadAll(fmt.value)">
                <v-list-item-content>{{ fmt.label }}</v-list-item-content>
              </v-list-item>
            </v-list>
          </v-menu>
          <v-button
            v-if="!effectiveReadonly"
            :disabled="loading || !junctionReady"
            @click="openUploadModal"
          >
            <v-icon name="upload" small />
            Upload File
          </v-button>
          <v-button
            v-if="!effectiveReadonly"
            secondary
            :disabled="loading || !junctionReady"
            @click="openAddExistingModal"
          >
            <v-icon name="link" small />
            Add Existing
          </v-button>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="loading-wrap">
        <v-progress-circular indeterminate />
      </div>

      <!-- Load error -->
      <div v-else-if="loadError" class="notice notice-error">
        <v-icon name="error" small />
        {{ loadError }}
      </div>

      <!-- Grid -->
      <MediaGrid
        v-else
        :rows="rowsDraft"
        :thumbnail-size="thumbnail_size"
        :readonly="effectiveReadonly"
        :files-fk-field="filesFkField"
        @delete="requestDelete"
        @open="openDetails"
      />
    </template>

    <!-- Upload modal -->
    <UploadModal
      v-if="showUploadModal"
      :junction-table="junctionTable"
      :collection-fk-field="collectionFkField"
      :files-fk-field="filesFkField"
      :primary-key="primaryKey!"
      :allowed-types="allowed_types"
      :max-file-size="max_file_size"
      :default-folder="defaultFolder"
      :upload-area-folder="upload_area_folder ?? null"
      :upload-extra-fields="upload_extra_fields"
      :geo-enabled="geo_enabled"
      :geo-levels="geo_levels"
      :geo-cascades="geo_cascades"
      :geo-filter-mappings="geo_filter_mappings"
      :geo-language-code="geo_language_code"
      :geo-label-field="geo_label_field"
      @close="showUploadModal = false"
      @uploaded="(fileIds: string[]) => { showUploadModal = false; stageAddFileIds(fileIds); }"
    />

    <AddExistingModal
      v-if="showAddExistingModal"
      :junction-table="junctionTable"
      :collection-fk-field="collectionFkField"
      :files-fk-field="filesFkField"
      :primary-key="primaryKey!"
      :allowed-types="allowed_types ?? '*/*'"
      :thumbnail-size="thumbnail_size ?? 180"
      :default-folder="defaultFolder"
      :already-linked-file-ids="linkedFileIds"
      :file-reverse-links="file_reverse_links"
      @close="showAddExistingModal = false"
      @linked="(fileIds: string[]) => { showAddExistingModal = false; stageAddFileIds(fileIds); }"
    />

    <FileDetailsDrawer
      v-if="selectedRow?.[filesFkField]?.id"
      :file-id="String(selectedRow[filesFkField].id)"
      :initial-file="selectedRow?.[filesFkField] ?? null"
      :file-reverse-links="file_reverse_links"
      @close="closeDetails"
    />

    <!-- Delete confirmation dialog -->
    <v-dialog
      v-model="showDeleteConfirm"
      @update:model-value="(v: boolean) => !v && cancelDelete()"
    >
      <v-card class="confirm-card">
        <v-card-title class="confirm-title">
          <v-icon name="warning" class="confirm-icon" />
          Remove File
        </v-card-title>
        <v-card-text class="confirm-body">
          <p>Are you sure you want to remove this file?</p>
          <p v-if="delete_files" class="confirm-warn">
            This will <strong>permanently delete</strong> the file from the media library.
          </p>
        </v-card-text>
        <v-card-actions class="confirm-actions">
          <v-button secondary :disabled="deleteLoading" @click="cancelDelete">Cancel</v-button>
          <v-button
            :loading="deleteLoading"
            class="danger-btn"
            @click="confirmDelete"
          >
            {{ delete_files ? 'Delete File' : 'Remove' }}
          </v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.media-uploader {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-normal);
  font-family: var(--theme--fonts--sans--font-family);
  min-height: 80px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--theme--foreground-subdued);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 24px;
}

.notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--theme--border-radius);
  font-size: 13px;
  font-family: var(--theme--fonts--sans--font-family);
}

.notice-error {
  background: color-mix(in srgb, var(--theme--danger, #dc3545) 10%, transparent);
  color: var(--theme--danger, #dc3545);
  border: 1px solid color-mix(in srgb, var(--theme--danger, #dc3545) 30%, transparent);
}

.notice-info {
  background: var(--theme--background-subdued);
  color: var(--theme--foreground-subdued);
  border: 1px solid var(--theme--border-color);
}

.confirm-card {
  width: 400px;
  max-width: 95vw;
  font-family: var(--theme--fonts--sans--font-family);
}

.confirm-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  padding: 20px 20px 0;
  color: var(--theme--foreground);
}

.confirm-icon {
  color: var(--theme--warning, #fd7e14);
}

.confirm-body {
  padding: 12px 20px;
  font-size: 14px;
  color: var(--theme--foreground);
}

.confirm-body p {
  margin: 0 0 8px;
}

.confirm-body p:last-child {
  margin-bottom: 0;
}

.confirm-warn {
  font-size: 13px;
  color: var(--theme--danger, #dc3545);
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 20px;
}

.danger-btn {
  --v-button-background-color: var(--theme--danger, #dc3545);
  --v-button-background-color-hover: color-mix(in srgb, var(--theme--danger, #dc3545) 85%, black);
}
.v-menu-popper[data-v-9c1fb067] {
z-index: 300 !important;
}
</style>
