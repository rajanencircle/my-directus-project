<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useApi, useStores } from "@directus/extensions-sdk";
import {
  type AnyRecord,
  type ColumnDef,
  type ReverseSectionLike,
  type TranslatableString,
  normalizeFieldsParam,
  parseFileReverseLinks,
  resolveTranslatable,
  resolvedTableCells,
  resolvedTableHeaders,
} from "./utils/fileReverseLinks";

type ReverseSectionState = ReverseSectionLike & {
  title: string;
  collection: string;
  loading: boolean;
  error: string | null;
  rows: AnyRecord[];
  fileField: string;
  columns?: ColumnDef[];
  tableHeaders?: Array<TranslatableString>;
  tablePaths?: string[];
};

const props = withDefaults(
  defineProps<{
    value?: any;
    collection: string;
    field: string;
    primaryKey?: string | number;
    disabled?: boolean;
    file_reverse_links?: unknown;
  }>(),
  {
    value: null,
    disabled: false,
    file_reverse_links: undefined,
  },
);

const api = useApi();

// ── Current UI locale ────────────────────────────────────────────────────
const { useUserStore } = useStores();
const userStore = useUserStore();
const currentLocale = computed<string>(
  () =>
    (userStore.currentUser as any)?.language ??
    navigator.language.replace("_", "-") ??
    "en-US",
);

// ── File ID ──────────────────────────────────────────────────────────────
const fileId = computed(() =>
  props.primaryKey == null ||
  props.primaryKey === "+" ||
  props.primaryKey === ""
    ? ""
    : String(props.primaryKey),
);

// ── Reverse-link usage sections ──────────────────────────────────────────
const reverseSections = ref<ReverseSectionState[]>([]);
const hasReverseRules = computed(
  () => parseFileReverseLinks(props.file_reverse_links).length > 0,
);

async function loadReverseLinks(id: string) {
  const rules = parseFileReverseLinks(props.file_reverse_links);
  if (!rules.length) {
    reverseSections.value = [];
    return;
  }

  const locale = currentLocale.value;

  reverseSections.value = rules.map((r) => ({
    title: resolveTranslatable(r.section_title, locale, r.junction_collection),
    collection: r.junction_collection,
    loading: true,
    error: null,
    rows: [],
    fileField: r.file_field,
    columns: r.columns,
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
            filter: { [rule.file_field.trim()]: { _eq: id } },
            limit,
            ...(fields ? { fields } : {}),
          },
        });
        return {
          error: null as string | null,
          rows: (res.data?.data ?? []) as AnyRecord[],
        };
      } catch (e: any) {
        return {
          error: e?.response?.data?.errors?.[0]?.message ?? "Failed to load.",
          rows: [] as AnyRecord[],
        };
      }
    }),
  );

  reverseSections.value = rules.map((rule, idx) => {
    return {
      title: resolveTranslatable(rule.section_title, locale, rule.junction_collection),
      collection: rule.junction_collection,
      loading: false,
      error: updates[idx]?.error ?? null,
      rows: updates[idx]?.rows ?? [],
      fileField: rule.file_field,
      columns: rule.columns,
      tableHeaders: rule.table_headers,
      tablePaths: rule.table_paths,
    };
  });
}

watch(fileId, async (id) => {
  if (!id) return;
  await loadReverseLinks(id);
});

watch(
  () => JSON.stringify(props.file_reverse_links),
  async () => {
    if (fileId.value) await loadReverseLinks(fileId.value);
  },
);

onMounted(async () => {
  if (fileId.value) await loadReverseLinks(fileId.value);
});
</script>

<template>
  <div v-if="!fileId" class="empty-state">
    Save this record first to see usage.
  </div>

  <div v-else class="file-media-extras">
    <!-- Usage / assignment tables -->
    <template v-if="hasReverseRules">
      <div
        v-for="(sec, rIdx) in reverseSections"
        :key="`${sec.collection}-${rIdx}`"
        class="section"
      >
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

        <p v-else-if="!sec.rows.length" class="reverse-empty">
          No assignments found.
        </p>

        <div v-else class="reverse-table-wrap">
          <div
            class="table reverse-table"
            :style="{
              '--reverse-cols': String(
                resolvedTableHeaders(sec, currentLocale).length,
              ),
            }"
          >
            <div class="tr th">
              <div
                v-for="(h, hIdx) in resolvedTableHeaders(sec, currentLocale)"
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
                v-for="(cell, cIdx) in resolvedTableCells(sec, jrow)"
                :key="`${sec.collection}-c-${tIdx}-${cIdx}`"
                class="td"
              >
                {{ cell ?? "—" }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.empty-state {
  color: var(--theme--foreground-subdued);
  font-size: 13px;
  padding: 10px 0;
  font-family: var(--theme--fonts--sans--font-family);
}

.file-media-extras {
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: var(--theme--fonts--sans--font-family);
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


.notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--theme--border-radius);
  font-size: 13px;
}

.notice-error {
  background: color-mix(
    in srgb,
    var(--theme--danger, #dc3545) 10%,
    transparent
  );
  color: var(--theme--danger, #dc3545);
  border: 1px solid
    color-mix(in srgb, var(--theme--danger, #dc3545) 30%, transparent);
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
  font-size: 13px;
  color: var(--theme--foreground);
  word-break: break-word;
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
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
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
