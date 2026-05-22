<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';
import { type AnyRecord } from '../utils/fileReverseLinks';
import FileMediaExtrasPanel from './FileMediaExtrasPanel.vue';
import FileDetailPreview from './FileDetailPreview.vue';
import { mimeToIcon } from '../utils/fileType';

type ID = string;

const SYSTEM_FIELDS = new Set(['id', 'date_created', 'date_updated', 'user_created', 'user_updated']);

const HIDDEN_KEYS = new Set([
  // Keys user does not want to see
  'storage',
  'filename_disk',
  'metadata',
  'uploaded_by',
  'modified_by',
  'modified_on',
  'charset',
  'duration',
  'embed',
  'focal_point_x',
  'focal_point_y',
  'tus_id',
  'tus_data',
]);

const BASIC_KEYS = [
  'title',
  'description',
  'tags',
  'type',
  'filesize',
  'width',
  'height',
  'folder',
  'created_on',
  'uploaded_on',
  'filename_download',
  'source',
];

const RIGHTS_IPTC_KEYS = [
  'copyright',
  'flags',
  'expiry_date',
  'fotographer',
  'keywords',
  'alt',
  'name',
  'company',
  'email',
  'iptc_category',
  'iptc_credit',
  'iptc_caption',
  'original_file_name',
  'iptc_created_date',
  'iptc_created_time',
];

const GEO_KEYS = ['Geographies', 'place', 'country'];

const LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  tags: 'Tags',
  type: 'Mime Type',
  filesize: 'Filesize',
  width: 'Width',
  height: 'Height',
  folder: 'Folder',
  created_on: 'Created On',
  uploaded_on: 'Uploaded On',
  filename_download: 'Filename',
  source: 'Source',
  copyright: 'Copyright',
  flags: 'Flags',
  expiry_date: 'Expiry Date',
  fotographer: 'Fotographer',
  keywords: 'Keywords',
  alt: 'Alt',
  name: 'Name',
  company: 'Company',
  email: 'Email',
  iptc_category: 'IPTC Category',
  iptc_credit: 'IPTC Credit',
  iptc_caption: 'IPTC Caption',
  original_file_name: 'Original File Name',
  iptc_created_date: 'IPTC Created Date',
  iptc_created_time: 'IPTC Created Time',
  Geographies: 'Geographies',
  place: 'Place',
  country: 'Country',
};

const props = withDefaults(
  defineProps<{
    fileId: ID;
    initialFile?: AnyRecord | null;
    /** JSON array configured on the interface: junction lookups by file id */
    fileReverseLinks?: unknown;
    downloadFormatPresets?: unknown;
    readonly?: boolean;
  }>(),
  { initialFile: null, readonly: false }
);

const emit = defineEmits<{ (e: 'close'): void }>();

const api = useApi();
useStores();

const loading = ref(false);
const error = ref<string | null>(null);
const fileItem = ref<AnyRecord | null>(null);

const title = computed(() => fileItem.value?.title || fileItem.value?.filename_download || 'File');

const titleIcon = computed(() =>
  mimeToIcon(fileItem.value?.type ?? null, fileItem.value?.filename_download ?? null)
);

function labelFor(key: string): string {
  return LABELS[key] ?? key;
}

function getValue(key: string): any {
  return (fileItem.value as any)?.[key];
}

function displayValue(key: string): string {
  const val = getValue(key);
  if (val == null) return '—';
  if (typeof val === 'string') return val.length ? val : '—';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val) && val.length === 0) return '—';
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

const tags = computed<string[]>(() => {
  const v = (fileItem.value as any)?.tags;
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
});

type TranslationRow = {
  id?: string | number;
  iptc_caption?: string | null;
  languages_id?: { label?: string; code?: string } | null;
};

const translations = computed<TranslationRow[]>(() => {
  const v = (fileItem.value as any)?.translations;
  return Array.isArray(v) ? (v as TranslationRow[]) : [];
});

async function loadFile() {
  loading.value = true;
  error.value = null;
  try {
    // Show as much as we can (including translations) but fall back safely.
    let data: AnyRecord | null = null;
    try {
      const res = await api.get(`/files/${props.fileId}`, {
        params: { fields: ['*', 'translations.*', 'translations.languages_id.*'] },
      });
      data = res.data?.data ?? null;
    } catch {
      const res = await api.get(`/files/${props.fileId}`);
      data = res.data?.data ?? null;
    }
    fileItem.value = data;
  } catch (e: any) {
    error.value = e?.response?.data?.errors?.[0]?.message ?? 'Failed to load file details.';
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.fileId,
  async () => {
    await loadFile();
  }
);

onMounted(async () => {
  if (props.initialFile) fileItem.value = props.initialFile;
  await loadFile();
});
</script>

<template>
  <v-dialog
    :model-value="true"
    persistent
    class="file-details-dialog"
    :z-index="20000"
    @update:model-value="(v: boolean) => !v && emit('close')"
  >
    <v-card class="details-card">
      <v-card-title class="card-title">
        <v-icon :name="titleIcon" class="title-icon" />
        <span class="title-text" :title="title">{{ title }}</span>
        <div class="spacer" />
        <button class="close-btn" type="button" @click="emit('close')">
          <v-icon name="close" small />
        </button>
      </v-card-title>

      <v-card-text class="card-body">
        <div v-if="error" class="notice notice-error">
          <v-icon name="error" small />
          {{ error }}
        </div>

        <div v-if="loading" class="loading">
          <v-progress-circular indeterminate />
        </div>

        <template v-else>
          <FileDetailPreview
            :file-id="String(fileId)"
            :mime-type="fileItem?.type ?? null"
            :filename="fileItem?.filename_download ?? null"
          />

          <div class="section">
            <div class="section-title">Basic</div>
            <div class="details-grid">
              <template v-for="key in BASIC_KEYS" :key="key">
                <div v-if="!HIDDEN_KEYS.has(key) && !SYSTEM_FIELDS.has(key)" class="detail-row">
                  <div class="detail-key">{{ labelFor(key) }}</div>
                  <div class="detail-val">
                    <template v-if="key === 'tags'">
                      <div v-if="tags.length" class="chips">
                        <span v-for="t in tags" :key="t" class="chip">{{ t }}</span>
                      </div>
                      <span v-else>—</span>
                    </template>
                    <template v-else>
                      <pre class="pre">{{ displayValue(key) }}</pre>
                    </template>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Rights / IPTC</div>
            <div class="details-grid">
              <template v-for="key in RIGHTS_IPTC_KEYS" :key="key">
                <div v-if="!HIDDEN_KEYS.has(key) && !SYSTEM_FIELDS.has(key)" class="detail-row">
                  <div class="detail-key">{{ labelFor(key) }}</div>
                  <div class="detail-val"><pre class="pre">{{ displayValue(key) }}</pre></div>
                </div>
              </template>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Geography</div>
            <div class="details-grid">
              <template v-for="key in GEO_KEYS" :key="key">
                <div v-if="!HIDDEN_KEYS.has(key) && !SYSTEM_FIELDS.has(key)" class="detail-row">
                  <div class="detail-key">{{ labelFor(key) }}</div>
                  <div class="detail-val"><pre class="pre">{{ displayValue(key) }}</pre></div>
                </div>
              </template>
            </div>
          </div>

          <FileMediaExtrasPanel
            :file-id="String(fileId)"
            :file-type="fileItem?.type ?? null"
            :filename-download="fileItem?.filename_download ?? null"
            :file-reverse-links="fileReverseLinks"
            :download-format-presets="downloadFormatPresets"
            :readonly="readonly"
          />

          <div v-if="translations.length" class="section">
            <div class="section-title">IPTC Caption</div>
            <div class="table">
              <div class="tr th">
                <div class="td">Language</div>
                <div class="td">Caption</div>
              </div>
              <div v-for="row in translations" :key="row.id ?? JSON.stringify(row)" class="tr">
                <div class="td">
                  {{
                    row?.languages_id?.label
                      ? `${row.languages_id.label} (${String(row.languages_id.code ?? '').toLowerCase() || '—'})`
                      : '—'
                  }}
                </div>
                <div class="td">{{ row?.iptc_caption ?? '—' }}</div>
              </div>
            </div>
          </div>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.file-details-dialog :deep(.v-dialog-content) {
  align-items: center;
  justify-content: center;
  padding: 0;
}

.file-details-dialog :deep(.v-overlay__content) {
  margin: 0;
  max-height: 80vh;
  width: min(900px, 96vw);
}

.details-card {
  width: 100%;
  max-height: 80vh;
  background: var(--theme--background-normal);
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  display: flex;
  flex-direction: column;
  font-family: var(--theme--fonts--sans--font-family);
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--theme--border-color);
  background: var(--theme--background-normal);
}

.title-icon {
  color: var(--theme--primary);
}

.title-text {
  font-weight: 700;
  font-size: 14px;
  color: var(--theme--foreground);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 520px;
}

.spacer {
  flex: 1;
}

.close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid var(--theme--border-color);
  background: transparent;
  color: var(--theme--foreground);
  cursor: pointer;
}

.close-btn:hover {
  background: var(--theme--background-subdued);
}

.card-body {
  padding: 14px 16px;
  overflow: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.preview {
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-subdued);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: var(--theme--background-normal);
}

.preview-nonimage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px;
  color: var(--theme--foreground-subdued);
}

.preview-icon {
  font-size: 44px;
  opacity: 0.7;
}

.preview-name {
  margin: 0;
  font-size: 12px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading {
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

.empty {
  color: var(--theme--foreground-subdued);
  font-size: 13px;
  padding: 10px 4px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--theme--foreground-subdued);
}

.details-grid {
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-normal);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 10px;
  align-items: start;
}

.detail-key {
  font-size: 12px;
  font-weight: 700;
  color: var(--theme--foreground-subdued);
  padding-top: 2px;
}

.detail-val {
  font-size: 13px;
  color: var(--theme--foreground);
  word-break: break-word;
}

.pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: var(--theme--foreground);
  border: 1px solid var(--theme--border-color);
  background: var(--theme--background-subdued);
}

.table {
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  overflow: hidden;
}

.tr {
  display: grid;
  grid-template-columns: 1fr 2fr;
}

.tr.th {
  background: var(--theme--background-subdued);
  font-weight: 800;
  font-size: 12px;
}

.td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--theme--border-color);
}

.tr:last-child .td {
  border-bottom: none;
}

.reverse-table-wrap {
  max-height: 260px;
  overflow-y: auto;
  overflow-x: auto;
}

.reverse-table .tr {
  grid-template-columns: repeat(var(--reverse-cols, 2), minmax(120px, 1fr));
}

.reverse-table .tr.th {
  position: sticky;
  top: 0;
  z-index: 1;
}

.reverse-table .td {
  border-right: 1px solid var(--theme--border-color);
}

.reverse-table .td:last-child {
  border-right: none;
}

.subdued {
  color: var(--theme--foreground-subdued);
}

.reverse-meta {
  font-size: 11px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  margin: -4px 0 0;
}

.reverse-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  color: var(--theme--foreground-subdued);
  font-size: 13px;
}

.muted {
  color: var(--theme--foreground-subdued);
}

.reverse-empty {
  margin: 0;
  font-size: 13px;
  color: var(--theme--foreground-subdued);
  padding: 8px 2px;
}

.reverse-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reverse-row {
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-subdued);
  overflow: hidden;
}

.reverse-row-id {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--theme--foreground-subdued);
  padding: 8px 10px;
  border-bottom: 1px solid var(--theme--border-color);
  background: var(--theme--background-normal);
}

.reverse-row-json {
  margin: 0;
  padding: 10px 12px;
  font-size: 12px;
  max-height: 240px;
  overflow: auto;
}

@media (max-width: 720px) {
  .detail-row,
  .tr {
    grid-template-columns: 1fr;
  }
}
</style>

