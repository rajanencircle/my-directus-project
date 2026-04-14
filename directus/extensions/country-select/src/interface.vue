<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onErrorCaptured,
  onMounted,
  ref,
  watch,
} from "vue";
import { useApi } from "@directus/extensions-sdk";

type Row = Record<string, any>;

const props = withDefaults(
  defineProps<{
    value?: string | number | null;
    disabled?: boolean;
    field?: string;
    itemsCollection?: string;
    labelField?: string;
    pageSize?: number;
    translationsCollection?: string;
    translationCodeField?: string;
    translationIdField?: string;
    parentTranslationIdField?: string;
    languageCodeOverride?: string;
    translationIdOverride?: number | null;
  }>(),
  {
    value: null,
    itemsCollection: "country_translations",
    labelField: "name",
    pageSize: 25,
    translationsCollection: "translations",
    translationCodeField: "code",
    translationIdField: "translations_id",
    parentTranslationIdField: "translations_id",
    languageCodeOverride: "",
    translationIdOverride: null,
  },
);

const emit = defineEmits<{
  (e: "input", value: string | number | null): void;
}>();

const api = useApi();

const itemsCollection = computed(
  () => props.itemsCollection || "country_translations",
);
const labelField = computed(() => props.labelField || "name");
const pageSize = computed(() => props.pageSize || 25);
const translationsCollection = computed(
  () => props.translationsCollection || "translations",
);
const translationCodeField = computed(() =>
  (props.translationCodeField || "code").trim(),
);
const translationIdField = computed(() =>
  (props.translationIdField || "translations_id").trim(),
);
const parentTranslationIdField = computed(() =>
  (props.parentTranslationIdField || "translations_id").trim(),
);
const languageCodeOverride = computed(() =>
  (props.languageCodeOverride || "").trim(),
);
const translationIdOverride = computed(() => {
  const v = props.translationIdOverride;
  return v != null &&
    (typeof v === "number" || (typeof v === "string" && v !== ""))
    ? Number(v)
    : null;
});

// When field is inside a translation block, Directus may use a key like "country_de_DE" or "country_de_AT"
const languageFromField = computed(() => {
  const f = props.field || "";
  const match = f.match(/_([a-z]{2}_[A-Z]{2})$/i);
  return match ? match[1] : "";
});

// Language to filter the list by (e.g. de_DE → only show country_translations with code = de_DE)
const filterLanguage = computed(() => {
  if (languageCodeOverride.value) return languageCodeOverride.value;
  if (languageFromField.value) return languageFromField.value;
  return "";
});

const visibleLanguages = computed(
  () =>
    (props as any).visibleLanguages
      ?.split(",")
      .map((s: string) => s.trim())
      .filter(Boolean) ?? [],
);

const shouldRender = computed(() => {
  if (!visibleLanguages.value.length) return true;
  return visibleLanguages.value.includes(filterLanguage.value);
});

// When inside a translation repeater, parent may provide the current row's translations_id
const injectedValues =
  inject<Record<string, unknown> | { value?: Record<string, unknown> } | null>(
    "values",
    null,
  ) ??
  inject<Record<string, unknown> | { value?: Record<string, unknown> } | null>(
    "internalValues",
    null,
  ) ??
  inject<Record<string, unknown> | { value?: Record<string, unknown> } | null>(
    "item",
    null,
  ) ??
  inject<Record<string, unknown> | { value?: Record<string, unknown> } | null>(
    "groupItem",
    null,
  );
function getValueFromInjected(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const v =
    "value" in raw && (raw as { value?: unknown }).value != null
      ? (raw as { value: Record<string, unknown> }).value
      : raw;
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}
const parentTranslationId = computed(() => {
  const v = getValueFromInjected(injectedValues);
  if (v) {
    const key = parentTranslationIdField.value;
    const id = v[key];
    if (id != null && (typeof id === "number" || typeof id === "string"))
      return typeof id === "string" ? Number(id) || id : id;
  }
  return null;
});

// For drawer notice: are we applying a translation filter?
const activeFilterTranslationId = ref<number | string | null>(null);

// When we have parent translation id but no code (e.g. inside translation block), fetch code from API
const fetchedTranslationCode = ref<string>("");

async function fetchTranslationCodeFromId() {
  if (filterLanguage.value) {
    fetchedTranslationCode.value = "";
    return;
  }
  const parentId = parentTranslationId.value;
  if (parentId == null) {
    fetchedTranslationCode.value = "";
    return;
  }
  try {
    const res = await api.get(
      `/items/${translationsCollection.value}/${parentId}`,
      { params: { fields: translationCodeField.value } },
    );
    const code = res?.data?.data?.[translationCodeField.value];
    fetchedTranslationCode.value = code != null ? String(code) : "";
  } catch {
    fetchedTranslationCode.value = "";
  }
}

// Auto-fetched translation code: from field name / override, or fetched from parent translation id
const effectiveTranslationCode = computed(() => {
  const fromContext = filterLanguage.value;
  if (fromContext) return fromContext;
  return fetchedTranslationCode.value || "";
});

// Get value(s) from element(s) with class "display-value" and log (run when inputs load)
function logDisplayValue() {
  const elements = document.querySelectorAll(".display-value");
  nextTick(() => {
    const root = document.querySelector(".country-drawer-select");
    if (!root) return;
    const values: string[] = [];
    elements.forEach((el) => {
      const value =
        (el as HTMLInputElement).value ??
        (el as HTMLElement).textContent?.trim() ??
        "";
      values.push(value);
    });
    console.log("[country-select] display-value(s) end:", values);
  });
}

const drawerOpen = ref(false);
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const rows = ref<Row[]>([]);
const safeRows = computed(() => (Array.isArray(rows.value) ? rows.value : []));
const total = ref(0);
const page = ref(1);
const search = ref("");

const selectedId = ref<string | number | null>(props.value ?? null);
const selectedLabel = ref<string>("");

// keep v-model sync
watch(
  () => props.value,
  async (v) => {
    selectedId.value = v ?? null;
    await loadSelectedLabel();
  },
);

// store id to field
watch(selectedId, (v) => emit("input", v ?? null));

function openDrawer() {
  if (props.disabled) return;
  errorMessage.value = null;
  activeFilterTranslationId.value = null;
  drawerOpen.value = true;
  page.value = 1;
  fetchRows();
}

function closeDrawer() {
  drawerOpen.value = false;
}

function clearSelection() {
  selectedId.value = null;
  selectedLabel.value = "";
}

async function loadSelectedLabel() {
  if (!selectedId.value) {
    selectedLabel.value = "";
    return;
  }
  try {
    errorMessage.value = null;
    const res = await api.get(
      `/items/${itemsCollection.value}/${selectedId.value}`,
      {
        params: { fields: `id,${labelField.value}` },
      },
    );
    const item = res?.data?.data;
    selectedLabel.value = item?.[labelField.value] ?? String(selectedId.value);
  } catch (e: any) {
    const msg =
      e?.response?.data?.errors?.[0]?.message ?? e?.message ?? String(e);
    errorMessage.value = `Load label: ${msg}`;
    console.error("[Country Drawer Select] loadSelectedLabel:", e);
    selectedLabel.value = String(selectedId.value);
  }
}

async function fetchRows() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const filter: Record<string, unknown> = search.value
      ? { [labelField.value]: { _icontains: search.value } }
      : {};

    // Filter by translation: 1) override id, 2) parent row's translations_id (inject), 3) resolve language code → id
    const transIdField = translationIdField.value;
    let translationId: number | string | null =
      translationIdOverride.value ?? parentTranslationId.value;

    if (translationId == null) {
      const lang = filterLanguage.value;
      if (lang) {
        const transRes = await api.get(
          `/items/${translationsCollection.value}`,
          {
            params: {
              fields: "id",
              filter: JSON.stringify({
                [translationCodeField.value]: { _eq: lang },
              }),
              limit: 1,
            },
          },
        );
        const transItems = transRes?.data?.data ?? [];
        translationId = transItems[0]?.id ?? null;
      }
    }

    if (translationId != null && transIdField) {
      filter[transIdField] = { _eq: translationId };
    }

    activeFilterTranslationId.value = translationId ?? null;

    const res = await api.get(`/items/${itemsCollection.value}`, {
      params: {
        fields: `id,${labelField.value}`,
        limit: pageSize.value,
        offset: (page.value - 1) * pageSize.value,
        sort: labelField.value,
        filter: JSON.stringify(filter),
        meta: "*",
      },
    });

    rows.value = res?.data?.data ?? [];
    total.value =
      res?.data?.meta?.filter_count ?? res?.data?.meta?.total_count ?? 0;
  } catch (e: any) {
    const msg =
      e?.response?.data?.errors?.[0]?.message ?? e?.message ?? String(e);
    errorMessage.value = `Fetch list: ${msg}`;
    console.error("[Country Drawer Select] fetchRows:", e);
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function chooseRow(row: Row) {
  try {
    errorMessage.value = null;
    selectedId.value = row.id;
    selectedLabel.value = row[labelField.value] ?? String(row.id);
    closeDrawer();
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    errorMessage.value = `Select: ${msg}`;
    console.error("[Country Drawer Select] chooseRow:", e);
  }
}

watch([page, search], () => {
  if (drawerOpen.value) fetchRows();
});

// Auto-fetch translation code when inside a translation block (parent has translations_id, no code in field name)
watch(
  [() => filterLanguage.value, () => parentTranslationId.value],
  () => fetchTranslationCodeFromId(),
  { immediate: true },
);

// Catch errors from child components or from parent when value is emitted
onErrorCaptured((err: any) => {
  const msg =
    err?.response?.data?.errors?.[0]?.message ?? err?.message ?? String(err);
  errorMessage.value = msg;
  console.error("[Country Drawer Select] caught:", err);
  return false; // show in UI; still propagate so dev tools see it
});

onMounted(async () => {
  await loadSelectedLabel();
  logDisplayValue();
});

logDisplayValue();
</script>

<template>
  <div v-if="shouldRender" class="country-drawer-select">
    <v-notice v-if="errorMessage" type="danger" class="error-notice">
      {{ errorMessage }}
    </v-notice>
    <div class="input-row">
      <div class="selected">
        <span v-if="selectedId">
          {{ selectedLabel || selectedId }}
        </span>
        <span v-else class="placeholder">Select a country…</span>
      </div>

      <div class="actions">
        <v-input
          :model-value="effectiveTranslationCode"
          placeholder="translation code"
          readonly
        />
        <v-button small secondary :disabled="disabled" @click="openDrawer">
          Select
        </v-button>

        <v-button
          v-if="selectedId"
          small
          tertiary
          :disabled="disabled"
          @click="clearSelection"
        >
          Clear
        </v-button>
      </div>
    </div>

    <v-drawer v-model="drawerOpen" title="Select Country" @cancel="closeDrawer">
      <div class="drawer-body">
        <v-notice
          v-if="activeFilterTranslationId != null"
          type="info"
          class="filter-notice"
        >
          Filtering by this language (translation). Only countries for this
          block are shown.
        </v-notice>
        <v-notice
          v-else-if="!loading && drawerOpen"
          type="warning"
          class="filter-notice"
        >
          Showing all. To filter by language: set "Language code (override)"
          (e.g. de_DE) or "Translation ID (override)" (e.g. 1) for this field,
          or use a field name like country_de_DE.
        </v-notice>
        <v-input v-model="search" placeholder="Search…" />

        <div style="height: 12px"></div>

        <v-progress-linear v-if="loading" indeterminate />

        <table v-else class="options-table">
          <thead>
            <tr>
              <th style="width: 120px">ID</th>
              <th>{{ labelField }}</th>
              <th style="width: 120px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in safeRows" :key="row.id">
              <td>{{ row.id }}</td>
              <td>{{ row[labelField] }}</td>
              <td>
                <v-button small @click="chooseRow(row)">Select</v-button>
              </td>
            </tr>
            <tr v-if="safeRows.length === 0">
              <td colspan="3">No results</td>
            </tr>
          </tbody>
        </table>

        <div style="height: 12px"></div>

        <div class="pagination">
          <v-button small :disabled="page <= 1" @click="page--">Prev</v-button>
          <span>Page {{ page }}</span>
          <v-button small :disabled="page * pageSize >= total" @click="page++">
            Next
          </v-button>
        </div>
      </div>
    </v-drawer>
  </div>
</template>

<style scoped>
.input-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}
.selected {
  flex: 1;
  border: 1px solid red;
  padding: 10px 12px;
  border-radius: 6px;
  min-height: 38px;
  display: flex;
  align-items: center;
}
.placeholder {
  color: rgb(110, 209, 24);
}
.error-notice,
.filter-notice {
  margin-bottom: 12px;
}
.actions {
  display: flex;
  gap: 8px;
}
.drawer-body {
  padding: 16px;
}
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.options-table {
  width: 100%;
  border-collapse: collapse;
}
.options-table th,
.options-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid grey;
}
.options-table th {
  font-weight: 600;
  color: rgb(94, 67, 184);
}
</style>
