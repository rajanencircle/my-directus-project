<script setup lang="ts">
import { ref, computed, onMounted, watch, provide } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';
import { useT } from './composables/useT';
import { resolveTranslatable } from './utils/translations';
import MediaGrid from './components/MediaGrid.vue';
import UploadModal from './components/UploadModal.vue';
import AddExistingModal from './components/AddExistingModal.vue';
import FileDetailsDrawer from './components/FileDetailsDrawer.vue';
import {
  buildAssetDownloadUrl,
  parseDownloadFormatPresets,
  triggerDownload,
} from './utils/downloadPresets';

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
    file_reverse_links?: any;
    download_format_presets?: any;
    geo_enabled?: boolean;
    geo_levels?: any;
    geo_cascades?: any;
    geo_filter_mappings?: any;
    geo_language_code?: string;
    geo_label_field?: string;
    upload_status_field?: string | null;
    upload_status_value?: string | null;
    // Translatable UI labels — translation key selected from directus_translations
    section_label?: string | null;
    empty_label?: string | null;
    upload_button_label?: string | null;
    add_existing_button_label?: string | null;
    new_record_notice?: string | null;
    // Shared upload modal labels
    upload_modal_title?: string | null;
    upload_to_folder?: string | null;
    upload_drop_primary?: string | null;
    upload_drop_secondary?: string | null;
    upload_selected_label?: string | null;
    upload_ready_count?: string | null;
    upload_clear_all?: string | null;
    upload_geo_required_error?: string | null;
    // Shared folder labels
    folder_root?: string | null;
    folder_loading?: string | null;
    folder_no_access?: string | null;
    // Shared geo labels
    geo_section_title?: string | null;
    geo_no_results?: string | null;
    geo_loading?: string | null;
    // Add existing modal
    add_existing_title?: string | null;
    add_search_placeholder?: string | null;
    add_no_files?: string | null;
    add_per_page?: string | null;
    badge_linked?: string | null;
    badge_draft?: string | null;
    badge_expired?: string | null;
    why_expired?: string | null;
    add_to_album?: string | null;
    album_label?: string | null;
    album_create_new?: string | null;
    album_name_placeholder?: string | null;
    album_create_btn?: string | null;
    // Share modal
    share_title?: string | null;
    share_hint?: string | null;
    share_password_label?: string | null;
    share_password_placeholder?: string | null;
    share_expiry_label?: string | null;
    share_email_label?: string | null;
    share_email_placeholder?: string | null;
    share_create_btn?: string | null;
    share_success?: string | null;
    share_url_label?: string | null;
    share_copy_url?: string | null;
    // Expiry dialog
    expiry_title?: string | null;
    expiry_body?: string | null;
    expiry_warning?: string | null;
    // File details drawer
    drawer_tab_basic?: string | null;
    drawer_tab_iptc?: string | null;
    drawer_tab_geo?: string | null;
    drawer_iptc_title?: string | null;
    drawer_iptc_language?: string | null;
    drawer_iptc_caption?: string | null;
    // File media extras
    extras_downloads?: string | null;
    extras_download_original?: string | null;
    extras_no_assignments?: string | null;
    // Linked collections
    linked_title?: string | null;
    linked_empty?: string | null;
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
const { t } = useT();

// ─── Translated labels ────────────────────────────────────────────────────────

const labelSection = computed(() =>
  props.section_label ? t(props.section_label) : 'Media'
)
const labelEmpty = computed(() =>
  props.empty_label ? t(props.empty_label) : 'No files uploaded yet.'
)
const labelUpload = computed(() =>
  props.upload_button_label ? t(props.upload_button_label) : 'Upload File'
)
const labelAddExisting = computed(() =>
  props.add_existing_button_label ? t(props.add_existing_button_label) : 'Add Existing'
)
const labelNewRecordNotice = computed(() =>
  props.new_record_notice
    ? t(props.new_record_notice)
    : 'Upload or link files now — they will be attached when you save this record.'
)

const r = (key: string | null | undefined, fallback: string) =>
  key ? resolveTranslatable(key, t, fallback) : fallback

// Provide resolved labels to all descendant components via inject
provide('uploaderLabels', computed(() => ({
  // Upload modal
  uploadModalTitle: r(props.upload_modal_title, 'Upload Files'),
  uploadToFolder: r(props.upload_to_folder, 'Upload to folder'),
  uploadDropPrimary: r(props.upload_drop_primary, 'Drag & drop files here'),
  uploadDropSecondary: r(props.upload_drop_secondary, 'or click to browse'),
  uploadSelectedLabel: r(props.upload_selected_label, 'Selected'),
  uploadReadyCount: r(props.upload_ready_count, 'ready to upload'),
  uploadClearAll: r(props.upload_clear_all, 'Clear all'),
  uploadGeoRequiredError: r(props.upload_geo_required_error, 'Please fill in required geography fields'),
  // Folder
  folderRoot: r(props.folder_root, 'File Library'),
  folderLoading: r(props.folder_loading, 'Loading folders…'),
  folderNoAccess: r(props.folder_no_access, 'No folders available.'),
  // Geo
  geoSectionTitle: r(props.geo_section_title, 'Geography'),
  geoNoResults: r(props.geo_no_results, 'No results found'),
  geoLoading: r(props.geo_loading, 'Loading…'),
  // Add existing
  addExistingTitle: r(props.add_existing_title, 'Add Existing'),
  addSearchPlaceholder: r(props.add_search_placeholder, 'Search media…'),
  addNoFiles: r(props.add_no_files, 'No files found.'),
  addPerPage: r(props.add_per_page, 'Per page'),
  badgeLinked: r(props.badge_linked, 'Linked'),
  badgeDraft: r(props.badge_draft, 'Draft'),
  badgeExpired: r(props.badge_expired, 'Don\'t use'),
  whyExpired: r(props.why_expired, 'Why is this expired?'),
  addToAlbum: r(props.add_to_album, 'Add to album'),
  albumLabel: r(props.album_label, 'Album'),
  albumCreateNew: r(props.album_create_new, 'Create new'),
  albumNamePlaceholder: r(props.album_name_placeholder, 'New album name…'),
  albumCreateBtn: r(props.album_create_btn, 'Create'),
  // Share
  shareTitle: r(props.share_title, 'Share File'),
  shareHint: r(props.share_hint, 'The link will be generated after you save. Optionally protect it with a password or set an expiry date.'),
  sharePasswordLabel: r(props.share_password_label, 'Password'),
  sharePasswordPlaceholder: r(props.share_password_placeholder, 'Leave blank for no password'),
  shareExpiryLabel: r(props.share_expiry_label, 'Expiry Date'),
  shareEmailLabel: r(props.share_email_label, 'Share via Email'),
  shareEmailPlaceholder: r(props.share_email_placeholder, 'Type email and press Enter'),
  shareCreateBtn: r(props.share_create_btn, 'Create Link'),
  shareSuccess: r(props.share_success, 'Share link created successfully!'),
  shareUrlLabel: r(props.share_url_label, 'Share URL'),
  shareCopyUrl: r(props.share_copy_url, 'Copy URL'),
  // Expiry
  expiryTitle: r(props.expiry_title, 'Don\'t use expired media'),
  expiryBody: r(props.expiry_body, 'has an expiry date'),
  expiryWarning: r(props.expiry_warning, 'Please avoid using this image in content if the expiry date has passed.'),
  // Drawer
  drawerTabBasic: r(props.drawer_tab_basic, 'Basic'),
  drawerTabIptc: r(props.drawer_tab_iptc, 'Rights / IPTC'),
  drawerTabGeo: r(props.drawer_tab_geo, 'Geography'),
  drawerIptcTitle: r(props.drawer_iptc_title, 'IPTC Caption'),
  drawerIptcLanguage: r(props.drawer_iptc_language, 'Language'),
  drawerIptcCaption: r(props.drawer_iptc_caption, 'Caption'),
  // Extras
  extrasDownloads: r(props.extras_downloads, 'Downloads'),
  extrasDownloadOriginal: r(props.extras_download_original, 'Download original'),
  extrasNoAssignments: r(props.extras_no_assignments, 'No assignments found.'),
  // Linked
  linkedTitle: r(props.linked_title, 'Linked collections'),
  linkedEmpty: r(props.linked_empty, 'No linked collections configured.'),
})))

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

async function hydrateDraftFromValue() {
  const raw = props.value ?? [];
  if (!Array.isArray(raw) || !raw.length) {
    rowsDraft.value = [];
    return;
  }

  const fk = filesFkField.value;
  const hasNestedFiles = raw.some((item) => {
    const file = item?.[fk];
    return file && typeof file === 'object' && file.id;
  });

  if (hasNestedFiles) {
    rowsDraft.value = raw.map((item) => {
      const file = item[fk];
      const fileId = typeof file === 'object' ? file.id : file;
      const rowId = item?.id && !String(item.id).startsWith('tmp:') ? item.id : `tmp:${fileId}`;
      return {
        ...item,
        id: rowId,
        [fk]: typeof file === 'object' ? file : { id: file },
      };
    });
    return;
  }

  const fileIds = raw
    .map((item) => {
      const file = item?.[fk];
      return typeof file === 'object' ? file?.id : file;
    })
    .map(String)
    .filter(Boolean);

  if (!fileIds.length) {
    rowsDraft.value = [];
    return;
  }

  try {
    const files = await fetchFilesByIds(fileIds);
    rowsDraft.value = files.map((f: any) => ({
      id: `tmp:${f.id}`,
      [fk]: f,
    }));
  } catch (e) {
    console.error('[media-uploader] Failed to hydrate draft from form value:', e);
  }
}

async function fetchFilesByIds(fileIds: string[]) {
  const ids = (fileIds ?? []).map(String).filter(Boolean);
  if (!ids.length) return [];

  const res = await api.get('/files', {
    params: {
      filter: { id: { _in: ids } },
      fields: ['id', 'type', 'title', 'filename_download', 'expiry_date', 'draft_status'],
      limit: -1,
    },
  });

  return (res.data?.data ?? []).map((f: any) => ({
    id: String(f.id),
    type: f.type ?? null,
    title: f.title ?? null,
    filename_download: f.filename_download ?? '',
    expiry_date: f.expiry_date ?? null,
    draft_status: f.draft_status ?? null,
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

const downloadFormats = computed(() => parseDownloadFormatPresets(props.download_format_presets));

function downloadAll(presetIndex: number) {
  const preset = downloadFormats.value[presetIndex];
  if (!preset) return;
  rowsDraft.value.forEach((row, i) => {
    const file = row[filesFkField.value];
    if (!file?.id) return;
    const url = buildAssetDownloadUrl(
      String(file.id),
      preset,
      file.type,
      file.filename_download
    );
    setTimeout(() => {
      triggerDownload(url, file.filename_download);
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
  if (!ready) return;
  if (isNewRecord.value) {
    await hydrateDraftFromValue();
  } else {
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
    const nextSig = JSON.stringify(props.value ?? []);
    if (nextSig === lastEmittedValueSig.value) return;
    if (isNewRecord.value) {
      await hydrateDraftFromValue();
    } else {
      await loadFiles();
    }
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

    <template v-else>
      <div v-if="isNewRecord" class="notice notice-info">
        <v-icon name="info" small />
        {{ labelNewRecordNotice }}
      </div>
      <!-- Header -->
      <div class="header">
        <span class="header-title">{{ labelSection }} ({{ rowsDraft.length }})</span>
        <div class="header-actions">
          <v-menu v-if="!effectiveReadonly && rowsDraft.length > 0" placement="bottom-end" show-arrow>
            <template #activator="{ toggle }">
              <v-button secondary icon :disabled="loading" :title="t('download')" @click="toggle">
                <v-icon name="download" />
              </v-button>
            </template>
            <v-list>
              <v-list-item
                v-for="(fmt, idx) in downloadFormats"
                :key="`${fmt.label}-${idx}`"
                clickable
                @click="downloadAll(idx)"
              >
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
            {{ labelUpload }}
          </v-button>
          <v-button
            v-if="!effectiveReadonly"
            secondary
            :disabled="loading || !junctionReady"
            @click="openAddExistingModal"
          >
            <v-icon name="link" small />
            {{ labelAddExisting }}
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
        :download-format-presets="download_format_presets"
        :empty-label="labelEmpty"
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
      :primary-key="primaryKey ?? ''"
      :allowed-types="allowed_types"
      :max-file-size="max_file_size"
      :default-folder="defaultFolder"
      :upload-area-folder="upload_area_folder ?? null"
      :geo-enabled="geo_enabled"
      :geo-levels="geo_levels"
      :geo-cascades="geo_cascades"
      :geo-filter-mappings="geo_filter_mappings"
      :geo-language-code="geo_language_code"
      :geo-label-field="geo_label_field"
      :upload-status-field="upload_status_field ?? 'directus_status'"
      :upload-status-value="upload_status_value ?? 'draft'"
      @close="showUploadModal = false"
      @uploaded="(fileIds: string[]) => { showUploadModal = false; stageAddFileIds(fileIds); }"
    />

    <AddExistingModal
      v-if="showAddExistingModal"
      :junction-table="junctionTable"
      :collection-fk-field="collectionFkField"
      :files-fk-field="filesFkField"
      :primary-key="primaryKey ?? ''"
      :allowed-types="allowed_types ?? '*/*'"
      :thumbnail-size="thumbnail_size ?? 180"
      :default-folder="defaultFolder"
      :already-linked-file-ids="linkedFileIds"
      :file-reverse-links="file_reverse_links"
      :download-format-presets="download_format_presets"
      @close="showAddExistingModal = false"
      @linked="(fileIds: string[]) => { showAddExistingModal = false; stageAddFileIds(fileIds); }"
    />

    <FileDetailsDrawer
      v-if="selectedRow?.[filesFkField]?.id"
      :file-id="String(selectedRow[filesFkField].id)"
      :initial-file="selectedRow?.[filesFkField] ?? null"
      :file-reverse-links="file_reverse_links"
      :download-format-presets="download_format_presets"
      :readonly="effectiveReadonly"
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
          {{ t('delete_item', { count: 1 }) }}
        </v-card-title>
        <v-card-text class="confirm-body">
          <p>{{ t('action_cannot_be_undone') }}</p>
          <p v-if="delete_files" class="confirm-warn">
            This will <strong>permanently delete</strong> the file from the media library.
          </p>
        </v-card-text>
        <v-card-actions class="confirm-actions">
          <v-button secondary :disabled="deleteLoading" @click="cancelDelete">{{ t('cancel') }}</v-button>
          <v-button
            :loading="deleteLoading"
            class="danger-btn"
            @click="confirmDelete"
          >
            {{ delete_files ? t('delete') : t('remove') }}
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
