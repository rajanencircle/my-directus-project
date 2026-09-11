<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useApi, useStores } from "@directus/extensions-sdk";
import {
  type UnifiedRow,
  type UsageSource,
  buildSourceItemFilter,
  buildUnifiedRow,
  normalizeFieldsParam,
  parseUsageTableConfig,
  resolveColumnHeaders,
  resolveTranslatable,
} from "./utils/usageTable";

const SEARCH_DEBOUNCE_MS = 350;

const props = withDefaults(
  defineProps<{
    value?: any;
    collection: string;
    field: string;
    primaryKey?: string | number;
    disabled?: boolean;
    usage_table_title?: unknown;
    usage_columns?: unknown;
    usage_sources?: unknown;
  }>(),
  {
    value: null,
    disabled: false,
    usage_table_title: undefined,
    usage_columns: undefined,
    usage_sources: undefined,
  },
);

const api = useApi();

const { useUserStore } = useStores();
const userStore = useUserStore();
const currentLocale = computed<string>(
  () =>
    (userStore.currentUser as any)?.language ??
    navigator.language.replace("_", "-") ??
    "en-US",
);

const fileId = computed(() =>
  props.primaryKey == null ||
  props.primaryKey === "+" ||
  props.primaryKey === ""
    ? ""
    : String(props.primaryKey),
);

const config = computed(() =>
  parseUsageTableConfig({
    usage_table_title: props.usage_table_title,
    usage_columns: props.usage_columns,
    usage_sources: props.usage_sources,
  }),
);

const hasConfig = computed(
  () => config.value.columns.length > 0 && config.value.sources.length > 0,
);

const tableTitle = computed(() =>
  resolveTranslatable(config.value.title, currentLocale.value, ""),
);

const headers = computed(() =>
  resolveColumnHeaders(config.value.columns, currentLocale.value),
);

/** Grid tracks: link columns stay compact with a fixed min width */
const gridTemplateColumns = computed(() =>
  config.value.columns
    .map((c) => (c.type === "link" ? "minmax(72px, 88px)" : "minmax(120px, 1fr)"))
    .join(" "),
);

const loading = ref(false);
const error = ref<string | null>(null);
const rows = ref<UnifiedRow[]>([]);

/** Search by name/id — API-backed (debounced) */
const searchInput = ref("");
const debouncedSearch = ref("");
let searchTimer: ReturnType<typeof setTimeout> | null = null;

watch(searchInput, (q) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    debouncedSearch.value = q.trim();
  }, SEARCH_DEBOUNCE_MS);
});

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer);
});

/** Product filter — local (static labels) */
const productFilter = ref("");

const productFilterOptions = computed(() => {
  const locale = currentLocale.value;
  const labels = config.value.sources.map((s) =>
    resolveTranslatable(s.product_label, locale, s.junction_collection),
  );
  const unique = [...new Set(labels.filter(Boolean))];
  return [
    { text: "All products", value: "" },
    ...unique.map((label) => ({ text: label, value: label })),
  ];
});

const filterWidthPx = computed(() => {
  const labels = productFilterOptions.value.map((o) => String(o.text ?? ""));
  const longest = labels.reduce((a, b) => (b.length > a.length ? b : a), "All products");
  // ch-based fit + chevron/padding; clamp so it never eats the search field
  return Math.min(Math.max(Math.ceil(longest.length * 7.2) + 52, 132), 220);
});

const resultCountLabel = computed(() => {
  const n = displayedRows.value.length;
  if (loading.value) return "";
  return n === 1 ? "1 result" : `${n} results`;
});

const productsColIndex = computed(() => {
  const cols = config.value.columns;
  const byType = cols.findIndex((c) => c.type === "static");
  if (byType >= 0) return byType;
  return cols.findIndex((c) => c.key === "products");
});

/** Column index currently sorted; null = original order */
const sortCol = ref<number | null>(null);
const sortDir = ref<"asc" | "desc">("asc");

function toggleSort(index: number) {
  if (sortCol.value === index) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortCol.value = index;
    sortDir.value = "asc";
  }
}

function sortIcon(index: number): string {
  if (sortCol.value !== index) return "unfold_more";
  return sortDir.value === "asc" ? "arrow_upward" : "arrow_downward";
}

const displayedRows = computed(() => {
  let list = rows.value;

  // Local product filter (static label)
  const pIdx = productsColIndex.value;
  if (productFilter.value && pIdx >= 0) {
    const want = productFilter.value;
    list = list.filter((r) => (r.cells[pIdx]?.text ?? "") === want);
  }

  if (sortCol.value == null) return list;
  const col = sortCol.value;
  const dir = sortDir.value === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const av = a.cells[col]?.text ?? "";
    const bv = b.cells[col]?.text ?? "";
    const an = Number(av);
    const bn = Number(bv);
    if (
      av !== "" &&
      bv !== "" &&
      !Number.isNaN(an) &&
      !Number.isNaN(bn)
    ) {
      return (an - bn) * dir;
    }
    return (
      String(av).localeCompare(String(bv), undefined, {
        sensitivity: "base",
        numeric: true,
      }) * dir
    );
  });
});

async function fetchSourceRows(
  source: UsageSource,
  id: string,
  search: string,
) {
  const fields = normalizeFieldsParam(source.fields);
  const coll = encodeURIComponent(source.junction_collection.trim());
  const res = await api.get(`/items/${coll}`, {
    params: {
      filter: buildSourceItemFilter(source, id, search),
      limit: -1,
      ...(fields ? { fields } : {}),
    },
  });
  return (res.data?.data ?? []) as Record<string, any>[];
}

async function loadTable(id: string) {
  const cfg = config.value;
  if (!cfg.columns.length || !cfg.sources.length) {
    rows.value = [];
    error.value = null;
    return;
  }

  loading.value = true;
  error.value = null;

  const locale = currentLocale.value;
  const search = debouncedSearch.value;
  const results = await Promise.all(
    cfg.sources.map(async (source, sourceIndex) => {
      try {
        const junctionRows = await fetchSourceRows(source, id, search);
        return {
          sourceIndex,
          source,
          error: null as string | null,
          junctionRows,
        };
      } catch (e: any) {
        return {
          sourceIndex,
          source,
          error:
            e?.response?.data?.errors?.[0]?.message ??
            `Failed to load ${source.junction_collection}.`,
          junctionRows: [] as Record<string, any>[],
        };
      }
    }),
  );

  const errors = results.map((r) => r.error).filter(Boolean) as string[];
  error.value = errors.length ? errors.join(" · ") : null;

  const unified: UnifiedRow[] = [];
  for (const result of results) {
    result.junctionRows.forEach((jrow, rowIndex) => {
      unified.push(
        buildUnifiedRow(
          cfg.columns,
          result.source,
          result.sourceIndex,
          jrow,
          rowIndex,
          locale,
        ),
      );
    });
  }
  rows.value = unified;
  loading.value = false;
}

watch(fileId, async (id) => {
  if (!id) return;
  await loadTable(id);
});

watch(debouncedSearch, async () => {
  if (fileId.value) await loadTable(fileId.value);
});

watch(
  () =>
    JSON.stringify({
      t: props.usage_table_title,
      c: props.usage_columns,
      s: props.usage_sources,
    }),
  async () => {
    if (fileId.value) await loadTable(fileId.value);
  },
);

watch(currentLocale, async () => {
  if (fileId.value) await loadTable(fileId.value);
});

onMounted(async () => {
  if (fileId.value) await loadTable(fileId.value);
});
</script>

<template>
  <div v-if="!fileId" class="empty-state">
    Save this record first to see usage.
  </div>

  <div v-else class="file-media-extras">
    <template v-if="!hasConfig">
      <p class="reverse-empty">
        Configure table columns and product sources in the field Interface
        options.
      </p>
    </template>

    <template v-else>
      <div v-if="tableTitle" class="section-title">{{ tableTitle }}</div>

      <div class="usage-panel">
        <div class="usage-toolbar">
          <div class="toolbar-search">
            <v-input
              v-model="searchInput"
              placeholder="Search by name or id…"
            >
              <template #prepend>
                <v-icon name="search" />
              </template>
              <template v-if="searchInput" #append>
                <v-icon name="close" clickable @click="searchInput = ''" />
              </template>
            </v-input>
          </div>

          <div
            class="toolbar-filter"
            :style="{ width: `${filterWidthPx}px` }"
          >
            <v-select
              v-model="productFilter"
              :items="productFilterOptions"
              placeholder="All products"
            />
          </div>

          <span v-if="resultCountLabel" class="toolbar-count">{{ resultCountLabel }}</span>
        </div>

        <div class="usage-body">
          <div v-if="loading" class="reverse-loading">
            <v-progress-circular indeterminate x-small />
            <span class="muted">Loading…</span>
          </div>

          <div v-else-if="error && !rows.length" class="notice notice-error">
            <v-icon name="error" small />
            {{ error }}
          </div>

          <template v-else>
            <div v-if="error" class="notice notice-error">
              <v-icon name="error" small />
              {{ error }}
            </div>

            <p v-if="!displayedRows.length" class="reverse-empty">
              No assignments found.
            </p>

            <div v-else class="reverse-table-wrap">
              <div
                class="table reverse-table"
                :style="{ '--reverse-cols-template': gridTemplateColumns }"
              >
                <div class="tr th">
                  <button
                    v-for="(h, hIdx) in headers"
                    :key="`h-${hIdx}`"
                    type="button"
                    class="td th-btn"
                    :class="{
                      sorted: sortCol === hIdx,
                      'is-link-col': config.columns[hIdx]?.type === 'link',
                    }"
                    @click="toggleSort(hIdx)"
                  >
                    <span class="th-label">{{ h }}</span>
                    <v-icon :name="sortIcon(hIdx)" x-small class="th-sort-icon" />
                  </button>
                </div>
                <div
                  v-for="row in displayedRows"
                  :key="row.key"
                  class="tr"
                >
                  <div
                    v-for="(cell, cIdx) in row.cells"
                    :key="`${row.key}-c-${cIdx}`"
                    class="td"
                    :class="{ 'is-link-col': cell.isLink }"
                  >
                    <a
                      v-if="cell.isLink && cell.href"
                      class="cell-link"
                      :href="cell.href"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open"
                    >
                      <v-icon name="open_in_new" small />
                    </a>
                    <template v-else>{{ cell.text ?? "—" }}</template>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.empty-state {
  color: var(--theme--foreground-subdued);
  font-size: var(--theme--form--field--input--font-size, 0.875rem);
  font-family: var(--theme--form--field--input--font-family, var(--theme--fonts--sans--font-family));
  font-weight: var(--theme--form--field--input--font-weight, 400);
  padding: 0.5rem 0;
  margin: 0;
}

.file-media-extras {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--theme--form--field--input--foreground, var(--theme--foreground));
  font-family: var(--theme--form--field--input--font-family, var(--theme--fonts--sans--font-family));
  font-size: var(--theme--form--field--input--font-size, 0.875rem);
  font-weight: var(--theme--form--field--input--font-weight, 400);
}

.section-title {
  margin: 0;
  color: var(--theme--form--field--label--foreground, var(--theme--foreground-accent));
  font-family: var(--theme--form--field--label--font-family, var(--theme--fonts--sans--font-family));
  font-weight: var(--theme--form--field--label--font-weight, 600);
  font-size: 0.875rem;
}

.usage-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius, 6px);
}

.usage-toolbar {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid var(--theme--border-color);
}

.toolbar-search {
  flex: 1 1 auto;
  min-width: 0;
}

.toolbar-search :deep(.v-input),
.toolbar-search :deep(.input) {
  width: 100%;
  background: #fff !important;
}

.toolbar-filter {
  flex: 0 0 auto;
}

.toolbar-filter :deep(.v-select),
.toolbar-filter :deep(.v-input),
.toolbar-filter :deep(.input) {
  width: 100% !important;
  background: #fff !important;
}

.toolbar-filter :deep(.v-text-overflow),
.toolbar-filter :deep(.display),
.toolbar-filter :deep(.preview) {
  white-space: nowrap !important;
}

.toolbar-count {
  flex: 0 0 auto;
  margin-left: 2px;
  color: var(--theme--foreground-subdued);
  font-size: 0.75rem;
  white-space: nowrap;
}

.usage-body {
  background: #fff;
  min-height: 48px;
}

.usage-body .reverse-empty,
.usage-body .reverse-loading,
.usage-body .notice {
  margin: 12px;
}

.cell-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  color: var(--theme--primary);
  text-decoration: none;
  line-height: 1;
}

.cell-link:hover {
  background: color-mix(in srgb, var(--theme--primary) 12%, transparent);
}

.td.is-link-col,
.th-btn.is-link-col {
  min-width: 64px;
  width: 100%;
  justify-content: center;
  text-align: center;
}

.th-btn.is-link-col {
  gap: 2px;
  padding-left: 8px;
  padding-right: 8px;
}

.notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--theme--border-radius);
  font-size: var(--theme--form--field--input--font-size, 0.875rem);
  font-family: inherit;
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
  border: none;
  border-radius: 0;
  overflow: visible;
  background: #fff;
}

.tr {
  display: grid;
  grid-template-columns: var(
    --reverse-cols-template,
    repeat(4, minmax(120px, 1fr))
  );
}

.tr:hover .td {
  background: color-mix(in srgb, var(--theme--background-subdued) 55%, #fff);
}

.tr.th:hover .td,
.tr.th:hover .th-btn {
  background: var(--theme--background-subdued);
}

.tr.th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--theme--background-subdued);
  color: var(--theme--form--field--label--foreground, var(--theme--foreground-accent));
  font-family: var(--theme--form--field--label--font-family, var(--theme--fonts--sans--font-family));
  font-weight: var(--theme--form--field--label--font-weight, 600);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  box-shadow: 0 1px 0 var(--theme--border-color);
}

.th-btn {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  width: 100%;
  margin: 0;
  border: none;
  border-bottom: none;
  border-right: none;
  background: inherit;
  color: inherit;
  font: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  text-align: left;
  cursor: pointer;
  padding: 10px 12px;
}

.th-btn:hover {
  color: var(--theme--primary);
}

.th-btn.sorted .th-sort-icon {
  opacity: 1;
  color: var(--theme--primary);
}

.th-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-sort-icon {
  flex-shrink: 0;
  opacity: 0.4;
}

.td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
  border-right: none;
  font-size: var(--theme--form--field--input--font-size, 0.875rem);
  font-family: inherit;
  font-weight: inherit;
  color: var(--theme--form--field--input--foreground, var(--theme--foreground));
  word-break: break-word;
  background: #fff;
}

.tr:last-child .td {
  border-bottom: none;
}

.reverse-table-wrap {
  max-height: 340px;
  overflow: auto;
  background: #fff;
}

.reverse-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  color: var(--theme--foreground-subdued);
  font-size: var(--theme--form--field--input--font-size, 0.875rem);
  font-family: inherit;
}

.muted {
  color: var(--theme--foreground-subdued);
}

.reverse-empty {
  margin: 0;
  font-size: var(--theme--form--field--input--font-size, 0.875rem);
  font-family: inherit;
  font-weight: inherit;
  color: var(--theme--foreground-subdued);
  padding: 0;
}
</style>
