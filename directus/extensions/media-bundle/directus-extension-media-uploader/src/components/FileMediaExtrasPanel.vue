<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import type { ComputedRef } from 'vue';
import { useApi } from '@directus/extensions-sdk';

type UploaderLabels = Record<string, string>
const labels = inject<ComputedRef<UploaderLabels>>('uploaderLabels')
const lbl = (key: string, fallback: string) => labels?.value?.[key] ?? fallback
import {
  type AnyRecord,
  normalizeFieldsParam,
  parseFileReverseLinks,
  reverseTableCells,
  reverseTableHeaders,
} from '../utils/fileReverseLinks';
import {
  parseDownloadFormatPresets,
  downloadFileViaApi,
} from '../utils/downloadPresets';
import { supportsMultiFormatDownload } from '../utils/fileType';

type ReverseSectionState = {
  title: string;
  collection: string;
  loading: boolean;
  error: string | null;
  rows: AnyRecord[];
  relatedItemField?: string;
  nameField?: string;
  fileField: string;
  tableHeaders?: string[];
  tablePaths?: string[];
};

const props = withDefaults(
  defineProps<{
    fileId: string;
    fileType?: string | null;
    filenameDownload?: string | null;
    fileReverseLinks?: unknown;
    downloadFormatPresets?: unknown;
    readonly?: boolean;
    showDownloads?: boolean;
    showUsage?: boolean;
  }>(),
  {
    fileType: null,
    filenameDownload: null,
    fileReverseLinks: undefined,
    downloadFormatPresets: undefined,
    readonly: false,
    showDownloads: true,
    showUsage: true,
  }
);

const api = useApi();
const reverseSections = ref<ReverseSectionState[]>([]);

const canMultiFormatDownload = computed(() =>
  supportsMultiFormatDownload(props.fileType, props.filenameDownload)
);
const downloadPresets = computed(() => parseDownloadFormatPresets(props.downloadFormatPresets));
const hasReverseRules = computed(() => parseFileReverseLinks(props.fileReverseLinks).length > 0);

async function loadReverseLinks(fileId: string) {
  const rules = parseFileReverseLinks(props.fileReverseLinks);
  if (!rules.length) {
    reverseSections.value = [];
    return;
  }

  reverseSections.value = rules.map((r) => ({
    title: r.section_title?.trim() || r.junction_collection,
    collection: r.junction_collection,
    loading: true,
    error: null,
    rows: [],
    relatedItemField: r.related_item_field,
    nameField: r.name_field,
    fileField: r.file_field,
    tableHeaders: r.table_headers,
    tablePaths: r.table_paths,
  }));

  const updates = await Promise.all(
    rules.map(async (rule) => {
      try {
        const limit = Math.min(Math.max(1, rule.limit ?? 50), 500);
        const fields = normalizeFieldsParam(rule.fields);
        const coll = encodeURIComponent(rule.junction_collection.trim());
        const res = await api.get(`/items/${coll}`, {
          params: {
            filter: { [rule.file_field.trim()]: { _eq: String(fileId) } },
            limit,
            ...(fields ? { fields } : {}),
          },
        });
        const rows = (res.data?.data ?? []) as AnyRecord[];
        return { error: null as string | null, rows };
      } catch (e: any) {
        const msg = e?.response?.data?.errors?.[0]?.message ?? 'Failed to load.';
        return { error: msg, rows: [] as AnyRecord[] };
      }
    })
  );

  reverseSections.value = rules.map((rule, idx) => ({
    title: rule.section_title?.trim() || rule.junction_collection,
    collection: rule.junction_collection,
    loading: false,
    error: updates[idx]?.error ?? null,
    rows: updates[idx]?.rows ?? [],
    relatedItemField: rule.related_item_field,
    nameField: rule.name_field,
    fileField: rule.file_field,
    tableHeaders: rule.table_headers,
    tablePaths: rule.table_paths,
  }));
}

async function downloadPreset(idx: number) {
  if (props.readonly) return;
  const preset = downloadPresets.value[idx];
  if (!preset) return;
  await downloadFileViaApi(api, props.fileId, preset, props.fileType, props.filenameDownload);
}

async function downloadOriginal() {
  if (props.readonly) return;
  await downloadFileViaApi(api, props.fileId, {}, props.fileType, props.filenameDownload);
}

watch(
  () => [props.fileId, props.fileReverseLinks] as const,
  async () => {
    if (props.showUsage) await loadReverseLinks(props.fileId);
  },
  { deep: true }
);

onMounted(async () => {
  if (props.showUsage) await loadReverseLinks(props.fileId);
});
</script>

<template>
  <div class="file-media-extras">
    <div v-if="showDownloads" class="section">
      <div class="section-title">{{ lbl('extrasDownloads', 'Downloads') }}</div>
      <div class="download-actions">
        <template v-if="canMultiFormatDownload">
          <v-button
            v-for="(preset, idx) in downloadPresets"
            :key="`${preset.label}-${idx}`"
            secondary
            small
            :disabled="readonly"
            @click="downloadPreset(idx)"
          >
            <v-icon name="download" small />
            {{ preset.label }}
          </v-button>
        </template>
        <v-button v-else secondary small :disabled="readonly" @click="downloadOriginal">
          <v-icon name="download" small />
          {{ lbl('extrasDownloadOriginal', 'Download original') }}
        </v-button>
      </div>
    </div>

    <template v-if="showUsage && hasReverseRules">
      <div
        v-for="(sec, rIdx) in reverseSections"
        :key="`${sec.collection}-${rIdx}`"
        class="section"
      >
        <div class="section-title">{{ sec.title }}</div>
        <div class="reverse-meta subdued">{{ sec.collection }}</div>

        <div v-if="sec.loading" class="reverse-loading">
          <v-progress-circular indeterminate x-small />
          <span class="muted">{{ lbl('geoLoading', 'Loading…') }}</span>
        </div>

        <div v-else-if="sec.error" class="notice notice-error">
          <v-icon name="error" small />
          {{ sec.error }}
        </div>

        <p v-else-if="!sec.rows.length" class="reverse-empty">{{ lbl('extrasNoAssignments', 'No assignments found.') }}</p>

        <div v-else class="reverse-table-wrap">
          <div
            class="table reverse-table"
            :style="{ '--reverse-cols': String(reverseTableHeaders(sec).length) }"
          >
            <div class="tr th">
              <div
                v-for="(h, hIdx) in reverseTableHeaders(sec)"
                :key="`${sec.collection}-h-${hIdx}`"
                class="td"
              >
                {{ h }}
              </div>
            </div>
            <div
              v-for="(jrow, tIdx) in sec.rows"
              :key="`${sec.collection}-${String(jrow.id ?? 'row')}-${tIdx}`"
              class="tr"
            >
              <div
                v-for="(cell, cIdx) in reverseTableCells(sec, jrow)"
                :key="`${sec.collection}-c-${tIdx}-${cIdx}`"
                class="td"
              >
                {{ cell ?? 'null' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.file-media-extras {
  display: flex;
  flex-direction: column;
  gap: 14px;
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

.download-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--theme--border-radius);
  font-size: 13px;
}

.notice-error {
  background: color-mix(in srgb, var(--theme--danger, #dc3545) 10%, transparent);
  color: var(--theme--danger, #dc3545);
  border: 1px solid color-mix(in srgb, var(--theme--danger, #dc3545) 30%, transparent);
}

.table {
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  overflow: hidden;
}

.tr {
  display: grid;
  grid-template-columns: repeat(var(--reverse-cols, 2), minmax(120px, 1fr));
}

.tr.th {
  background: var(--theme--background-subdued);
  font-weight: 800;
  font-size: 12px;
}

.td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--theme--border-color);
  border-right: 1px solid var(--theme--border-color);
}

.td:last-child {
  border-right: none;
}

.tr:last-child .td {
  border-bottom: none;
}

.reverse-table-wrap {
  max-height: 260px;
  overflow: auto;
}

.reverse-table .tr.th {
  position: sticky;
  top: 0;
  z-index: 1;
}

.subdued {
  color: var(--theme--foreground-subdued);
}

.reverse-meta {
  font-size: 11px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
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
</style>
