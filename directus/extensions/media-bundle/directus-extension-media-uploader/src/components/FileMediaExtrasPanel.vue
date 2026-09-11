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
import DownloadModal from '../../../media-library/src/components/download/DownloadModal.vue';
import { useMediaSettings } from '../../../media-library/src/composables/useMediaSettings';
import { buildDownloadModalLabels } from '../../../media-library/src/utils/downloadModalLabels';
import { useT } from '../composables/useT';
import {
  type DownloadModalFile,
} from '../../../media-library/src/utils/downloadVariants';

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
    readonly?: boolean;
    showDownloads?: boolean;
    showUsage?: boolean;
    mediaSizesCm?: string | null;
    width?: number | null;
    height?: number | null;
  }>(),
  {
    fileType: null,
    filenameDownload: null,
    fileReverseLinks: undefined,
    readonly: false,
    showDownloads: true,
    showUsage: true,
    mediaSizesCm: null,
    width: null,
    height: null,
  },
);

const api = useApi();
const { t } = useT();
const { settings, fetchSettings } = useMediaSettings();

const downloadModalLabels = computed(() =>
  buildDownloadModalLabels(t, settings.value as Record<string, string>),
);

const reverseSections = ref<ReverseSectionState[]>([]);
const hasReverseRules = computed(() => reverseSections.value.length > 0);

const downloadModalOpen = ref(false);

const downloadModalFiles = computed<DownloadModalFile[]>(() => [
  {
    id: props.fileId,
    filename: props.filenameDownload,
    type: props.fileType,
    width: props.width,
    height: props.height,
    media_sizes_cm: props.mediaSizesCm,
  },
]);

async function loadReverseLinks(fileId: string) {
  const rules = parseFileReverseLinks(props.fileReverseLinks);
  if (!rules.length) {
    reverseSections.value = [];
    return;
  }

  reverseSections.value = rules.map((rule) => ({
    title: rule.section_title?.trim() || rule.junction_collection,
    collection: rule.junction_collection,
    loading: true,
    error: null,
    rows: [],
    relatedItemField: rule.related_item_field,
    nameField: rule.name_field,
    fileField: rule.file_field,
    tableHeaders: rule.table_headers,
    tablePaths: rule.table_paths,
  }));

  const updates = await Promise.all(
    rules.map(async (rule) => {
      try {
        const limit = Math.min(Math.max(rule.limit ?? 25, 1), 100);
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

watch(
  () => [props.fileId, props.fileReverseLinks] as const,
  async () => {
    if (props.showUsage) await loadReverseLinks(props.fileId);
  },
  { deep: true }
);

onMounted(async () => {
  await fetchSettings();
  if (props.showUsage) await loadReverseLinks(props.fileId);
});
</script>

<template>
  <div class="file-media-extras">
    <div v-if="showDownloads" class="section">
      <div class="section-title">{{ lbl('extrasDownloads', 'Downloads') }}</div>
      <div class="download-actions">
        <v-button secondary small :disabled="readonly" @click="downloadModalOpen = true">
          <v-icon name="download" small />
          {{ lbl('extrasDownload', downloadModalLabels.download) }}
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

    <DownloadModal
      v-model="downloadModalOpen"
      mode="single"
      :files="downloadModalFiles"
      :labels="downloadModalLabels"
    />
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
  font-weight: 600;
  font-size: 13px;
}

.download-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reverse-meta {
  font-size: 12px;
}

.subdued {
  color: var(--theme--foreground-subdued);
}

.reverse-loading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.muted {
  color: var(--theme--foreground-subdued);
  font-size: 12px;
}

.notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
}

.notice-error {
  background: var(--theme--danger-background);
  color: var(--theme--danger);
}

.reverse-empty {
  margin: 0;
  font-size: 13px;
  color: var(--theme--foreground-subdued);
}

.reverse-table-wrap {
  overflow-x: auto;
}

.reverse-table {
  display: grid;
  gap: 0;
  min-width: 100%;
  font-size: 12px;
}

.reverse-table .tr {
  display: grid;
  grid-template-columns: repeat(var(--reverse-cols, 3), minmax(80px, 1fr));
  border-bottom: 1px solid var(--theme--border-color-subdued);
}

.reverse-table .th {
  font-weight: 600;
  background: var(--theme--background-subdued);
}

.reverse-table .td {
  padding: 6px 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
