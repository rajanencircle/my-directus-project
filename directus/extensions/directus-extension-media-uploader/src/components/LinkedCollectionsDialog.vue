<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import {
  type AnyRecord,
  normalizeFieldsParam,
  parseFileReverseLinks,
  reverseTableCells,
  reverseTableHeaders,
} from '../utils/fileReverseLinks';

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
    fileName?: string | null;
    fileReverseLinks?: unknown;
  }>(),
  { fileName: null, fileReverseLinks: undefined }
);

const emit = defineEmits<{ (e: 'close'): void }>();

const api = useApi();

const reverseSections = ref<ReverseSectionState[]>([]);

const visibleReverseSections = computed(() =>
  reverseSections.value.filter((sec) => sec.loading || !!sec.error || (sec.rows?.length ?? 0) > 0)
);

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

watch(
  () => props.fileId,
  async () => {
    await loadReverseLinks(props.fileId);
  }
);

watch(
  () => props.fileReverseLinks,
  async () => {
    await loadReverseLinks(props.fileId);
  },
  { deep: true }
);

onMounted(async () => {
  await loadReverseLinks(props.fileId);
});
</script>

<template>
  <v-dialog
    :model-value="true"
    persistent
    class="linked-collections-dialog"
    :z-index="20010"
    @update:model-value="(v: boolean) => !v && emit('close')"
  >
    <v-card class="details-card">
      <v-card-title class="card-title">
        <v-icon name="link" class="title-icon" />
        <span class="title-text" :title="props.fileName ?? props.fileId">
          Linked collections
          <span class="title-subdued">— {{ props.fileName ?? props.fileId }}</span>
        </span>
        <div class="spacer" />
        <button class="close-btn" type="button" @click="emit('close')">
          <v-icon name="close" small />
        </button>
      </v-card-title>

      <v-card-text class="card-body">
        <div v-if="!visibleReverseSections.length" class="empty">
          No linked collections found.
        </div>

        <div v-for="(sec, rIdx) in visibleReverseSections" :key="`${sec.collection}-${rIdx}`" class="section">
          <div class="section-title">{{ sec.title }}</div>
          <div class="reverse-meta subdued">{{ sec.collection }}</div>

          <div v-if="sec.loading" class="reverse-loading">
            <v-progress-circular indeterminate x-small />
            <span class="muted">Loading…</span>
          </div>

          <div v-else-if="sec.error" class="notice notice-error">
            <v-icon name="error" small />
            {{ sec.error }}
          </div>

          <div v-else class="reverse-table-wrap">
            <div class="table reverse-table" :style="{ '--reverse-cols': String(reverseTableHeaders(sec).length) }">
              <div class="tr th">
                <div v-for="(h, hIdx) in reverseTableHeaders(sec)" :key="`${sec.collection}-h-${hIdx}`" class="td">
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
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.linked-collections-dialog :deep(.v-dialog-content) {
  align-items: center;
  justify-content: center;
  padding: 0;
}

.linked-collections-dialog :deep(.v-overlay__content) {
  margin: 0;
  max-height: 70vh;
  width: min(900px, 96vw);
}

.details-card {
  width: 100%;
  max-height: 70vh;
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
  font-weight: 800;
  font-size: 13px;
  color: var(--theme--foreground);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 640px;
}

.title-subdued {
  font-weight: 700;
  color: var(--theme--foreground-subdued);
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
  max-height: 360px;
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

@media (max-width: 720px) {
  .tr {
    grid-template-columns: 1fr;
  }
}
</style>

