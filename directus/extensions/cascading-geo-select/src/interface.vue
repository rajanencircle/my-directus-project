<template>
  <div class="cascading-single-select">
    <div class="field-input">
      <v-input
        :model-value="searchText"
        :placeholder="placeholder"
        :disabled="disabled"
        @update:model-value="onSearchInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.escape="closeDropdown"
      >
        <template v-if="icon" #prepend>
          <v-icon :name="icon" small />
        </template>
        <template v-if="selectedItem || !disabled" #append>
          <v-icon
            v-if="selectedItem"
            name="close"
            clickable
            @click.stop="onClear"
          />
          <v-icon
            v-else-if="!disabled"
            name="add"
            clickable
            @click.stop="openDrawer"
          />
        </template>
      </v-input>

      <drawer-item
        v-if="drawerOpen"
        :active="drawerOpen"
        :collection="target_collection"
        primary-key="+"
        @update:active="closeDrawer"
        @input="onDrawerInput"
      />

      <div v-if="dropdownOpen" class="dropdown">
        <div v-if="filterHint" class="dropdown-filter-hint">
          <v-icon name="filter_alt" x-small />
          {{ filterHint }}
        </div>
        <div v-if="loading && searchText" class="dropdown-item loading">
          <v-progress-circular x-small indeterminate />
          Loading...
        </div>
        <template v-else-if="dropdownItems.length > 0">
          <div
            v-for="item in dropdownItems"
            :key="item.id"
            class="dropdown-item"
            @mousedown.prevent="onSelect(item)"
          >
            <v-icon v-if="icon" :name="icon" x-small />
            {{ item.label }}
          </div>
        </template>
        <div v-else-if="searchText && !loading" class="dropdown-item empty">
          No results found
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, inject } from "vue";
import type { Ref } from "vue";
import { useApi } from "@directus/extensions-sdk";

const api = useApi();

// Directus v11 provides form values via inject; fall back to the values prop
const injectedValues = inject<Ref<Record<string, unknown>> | null>(
  "values",
  null,
);
const currentValues = computed<Record<string, unknown> | null>(
  () =>
    (injectedValues?.value as Record<string, unknown> | null) ??
    props.values ??
    null,
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface CascadeFromConfig {
  /** Field key (name) of the parent field on the same form */
  fieldKey: string;
  /** Collection of the parent field — needed to fetch its FK value */
  parentCollection: string;
  /** FK column on the parent record that references this field's collection */
  fk: string;
}

interface FilterByConfig {
  /** Field key (name) of the parent field on the same form */
  fieldKey: string;
  /** FK column on THIS collection that references the parent */
  fk: string;
}

interface DropdownItem {
  id: string;
  label: string;
}

interface StoredValue {
  id: string;
  collection: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

const props = withDefaults(
  defineProps<{
    value?: string | StoredValue | null;
    values?: Record<string, unknown> | null;
    disabled?: boolean;
    /** Target collection this field selects from */
    collection?: string;
    target_collection: string;
    icon?: string;
    labelField?: string;
    languageCode?: string;
    searchLimit?: number;
    /** Emit {id, collection} instead of bare UUID */
    storeWithCollection?: boolean;
    /**
     * Auto-fill this field when a parent field changes.
     * [{fieldKey, parentCollection, fk}]
     * fk = FK column on the parent record pointing to this collection.
     */
    cascadeFrom?: string | CascadeFromConfig[];
    /**
     * Filter this dropdown when a parent field has a value.
     * [{fieldKey, fk}]
     * fk = FK column on THIS collection referencing the parent.
     */
    filterBy?: string | FilterByConfig[];
  }>(),
  {
    value: null,
    values: null,
    disabled: false,
    collection: "",
    icon: "search",
    labelField: "translations.name",
    languageCode: "en-GB",
    searchLimit: 20,
    storeWithCollection: false,
    cascadeFrom: "[]",
    filterBy: "[]",
  },
);

const emit = defineEmits(["input"]);

// ─── Parsed configs ───────────────────────────────────────────────────────────

const parsedCascadeFrom = computed<CascadeFromConfig[]>(() => {
  try {
    const v = props.cascadeFrom;
    const parsed = typeof v === "string" ? JSON.parse(v) : v;
    if (Array.isArray(parsed)) return parsed as CascadeFromConfig[];
  } catch {
    /* fall through */
  }
  return [];
});

const parsedFilterBy = computed<FilterByConfig[]>(() => {
  try {
    const v = props.filterBy;
    const parsed = typeof v === "string" ? JSON.parse(v) : v;
    if (Array.isArray(parsed)) return parsed as FilterByConfig[];
  } catch {
    /* fall through */
  }
  return [];
});

// ─── State ────────────────────────────────────────────────────────────────────

const searchText = ref("");
const selectedItem = ref<DropdownItem | null>(null);
const dropdownItems = ref<DropdownItem[]>([]);
const loading = ref(false);
const dropdownOpen = ref(false);
const drawerOpen = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const placeholder = computed(() =>
  props.target_collection
    ? `Search ${props.target_collection}...`
    : "Search...",
);

// ─── Value helpers ────────────────────────────────────────────────────────────

function extractId(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (typeof val === "object" && "id" in (val as object)) {
    const id = (val as StoredValue).id;
    return id ? String(id) : null;
  }
  return null;
}

function extractCollection(val: unknown): string | null {
  if (!val || typeof val !== "object") return null;
  return (val as StoredValue).collection ?? null;
}

function emitValue(id: string | null) {
  if (!id) {
    emit("input", null);
    return;
  }
  if (props.storeWithCollection) {
    emit("input", { id, collection: props.target_collection });
  } else {
    emit("input", id);
  }
}

function clearSelf() {
  if (selectedItem.value !== null || searchText.value !== "") {
    selectedItem.value = null;
    searchText.value = "";
    dropdownItems.value = [];
    emit("input", null);
  }
}

// ─── Label extraction ─────────────────────────────────────────────────────────

function extractLabel(item: Record<string, unknown>): string {
  const path = props.labelField ?? "translations.name";
  const parts = path.split(".");
  if (parts.length === 1) return (item[parts[0]] as string) ?? `[${item.id}]`;
  if (parts[0] === "translations" && parts[1]) {
    const translations =
      (item.translations as Array<Record<string, string>>) ?? [];
    const match =
      translations.find((t) => t.translations_id === props.languageCode) ??
      translations[0];
    return match?.[parts[1]] ?? `[${item.id}]`;
  }
  let val: unknown = item;
  for (const part of parts) {
    if (val == null) return `[${item.id}]`;
    val = (val as Record<string, unknown>)[part];
  }
  return (val as string) ?? `[${item.id}]`;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

function buildLabelFields(): string[] {
  const base = ["id"];
  const parts = (props.labelField ?? "translations.name").split(".");
  if (parts[0] === "translations") {
    base.push("translations.name", "translations.translations_id");
  } else {
    base.push(props.labelField ?? "name");
  }
  return base;
}

async function fetchSearchResults(
  searchTerm: string,
  upstreamFilters: Array<{ fk: string; id: string }> = [],
): Promise<DropdownItem[]> {
  if (!props.target_collection) return [];
  const params: Record<string, unknown> = {
    fields: buildLabelFields(),
    limit: props.searchLimit ?? 20,
  };

  const clauses: Record<string, unknown>[] = [];
  if (searchTerm.trim()) {
    const labelParts = (props.labelField ?? "").split(".");
    if (labelParts[0] === "translations") {
      clauses.push({
        translations: { name: { _icontains: searchTerm.trim() } },
      });
    } else {
      clauses.push({
        [props.labelField ?? "name"]: { _icontains: searchTerm.trim() },
      });
    }
  }
  for (const f of upstreamFilters) {
    clauses.push({ [f.fk]: { _eq: f.id } });
  }
  if (clauses.length === 1) params.filter = clauses[0];
  else if (clauses.length > 1) params.filter = { _and: clauses };
  try {
    const res = await api.get(`/items/${props.target_collection}`, { params });
    return (res.data?.data ?? []).map((item: Record<string, unknown>) => ({
      id: String(item.id),
      label: extractLabel(item),
    }));
  } catch (e) {
    console.error(
      `[cascading-geo-select] Search error in ${props.target_collection}:`,
      e,
    );
    return [];
  }
}

async function fetchById(
  collection: string,
  id: string,
  extraFields: string[] = [],
): Promise<Record<string, unknown> | null> {
  const fields = [...new Set([...buildLabelFields(), ...extraFields])];
  try {
    const res = await api.get(`/items/${collection}/${id}`, {
      params: { fields },
    });
    return res.data?.data ?? null;
  } catch (e) {
    console.error(`[cascading-geo-select] Fetch error ${collection}/${id}:`, e);
    return null;
  }
}

async function fetchParentRecord(
  collection: string,
  id: string,
  fields: string[],
): Promise<Record<string, unknown> | null> {
  try {
    const res = await api.get(`/items/${collection}/${id}`, {
      params: { fields: ["id", ...fields] },
    });
    return res.data?.data ?? null;
  } catch (e) {
    console.error(
      `[cascading-geo-select] Parent fetch error ${collection}/${id}:`,
      e,
    );
    return null;
  }
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

function getActiveFilters(): Array<{
  fk: string;
  id: string;
  fieldKey: string;
}> {
  const active: Array<{ fk: string; id: string; fieldKey: string }> = [];
  for (const f of parsedFilterBy.value) {
    const parentId = extractId(currentValues.value?.[f.fieldKey]);
    if (parentId) active.push({ fk: f.fk, id: parentId, fieldKey: f.fieldKey });
  }
  return active;
}

const filterHint = computed<string>(() => {
  const filters = getActiveFilters();
  return filters.map((f) => `Filtered by ${f.fieldKey}`).join("  ·  ");
});
// ─── Init from existing value ─────────────────────────────────────────────────

async function initFromValue() {
  const id = extractId(props.value);
  if (id && props.target_collection) {
    const item = await fetchById(props.target_collection, id);
    if (item) {
      const label = extractLabel(item);
      selectedItem.value = { id, label };
      searchText.value = label;
    }
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function onSearchInput(term: string) {
  searchText.value = term;
  selectedItem.value = null;
  dropdownOpen.value = true;

  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    loading.value = true;
    dropdownItems.value = await fetchSearchResults(term, getActiveFilters());
    loading.value = false;
  }, 300);
}

async function onFocus() {
  dropdownOpen.value = true;
  const upstream = getActiveFilters();
  if (upstream.length > 0 || !dropdownItems.value.length) {
    loading.value = true;
    dropdownItems.value = await fetchSearchResults(
      searchText.value ?? "",
      upstream,
    );
    loading.value = false;
  }
}

function onBlur() {
  setTimeout(() => {
    if (dropdownOpen.value) {
      dropdownOpen.value = false;
      searchText.value = selectedItem.value?.label ?? "";
    }
  }, 200);
}

function closeDropdown() {
  dropdownOpen.value = false;
  searchText.value = selectedItem.value?.label ?? "";
}

function onSelect(item: DropdownItem) {
  dropdownOpen.value = false;
  selectedItem.value = item;
  searchText.value = item.label;
  dropdownItems.value = [];
  emitValue(item.id);
}

function onClear() {
  clearSelf();
}

function openDrawer() {
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
}

// ─── Path traversal (for displayField on new entries) ────────────────────────

/**
 * Walk a dot-notation path through an object that may contain arrays
 * (e.g. translations relations). Arrays are resolved by matching
 * `languages_code` to the configured languageCode, falling back to [0].
 *
 * Example: extractFromPath({ translations: [{ name: "Paris", languages_code: "en-GB" }] }, "translations.name")
 *   → "Paris"
 */
function extractFromPath(
  obj: Record<string, unknown>,
  path: string,
): string | null {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null) return null;

    // Directus relation delta format: { create: [...], update: [...], delete: [...] }
    // Flatten to the create array so we can treat it like a normal array.
    if (
      !Array.isArray(current) &&
      typeof current === "object" &&
      Array.isArray((current as Record<string, unknown>).create)
    ) {
      current = (current as Record<string, unknown>).create;
    }

    if (Array.isArray(current)) {
      const arr = current as Record<string, unknown>[];
      // Match by languages_code OR translations_id (Directus uses both depending on setup)
      const match =
        arr.find(
          (item) =>
            item.languages_code === props.languageCode ||
            item.translations_id === props.languageCode,
        ) ?? arr[0];
      current = match?.[part];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }
  return current != null ? String(current) : null;
}

async function onDrawerInput(val: Record<string, unknown>) {
  if (!val) return;
  try {
    let id: string;
    let itemData: Record<string, unknown>;

    if (val.id) {
      // Existing item (shouldn't happen with primary-key="+" but handle gracefully)
      id = String(val.id);
      itemData = val;
    } else {
      // DrawerItem returns edits only — save to DB ourselves
      const response = await api.post(`/items/${props.target_collection}`, val);
      itemData = response.data?.data ?? {};
      id = String(itemData.id);
    }

    if (!id) return;

    // Match copy version's robust label extraction: try drawer form data first, then saved record
    const label =
      extractFromPath(val, props.labelField) ?? extractLabel(itemData) ?? id;

    onSelect({ id, label });
  } catch (e) {
    console.error(
      `[cascading-geo-select] Error creating item in ${props.target_collection}:`,
      e,
    );
  }
  drawerOpen.value = false;
}

// ─── Cascade watching ─────────────────────────────────────────────────────────

/**
 * Watch the parent fields listed in cascadeFrom.
 * When a parent changes → fetch its FK value → auto-fill this field.
 * When a parent clears → clear this field.
 */
watch(
  () => {
    const snapshot: Record<string, unknown> = {};
    for (const c of parsedCascadeFrom.value) {
      snapshot[c.fieldKey] = currentValues.value?.[c.fieldKey] ?? null;
    }
    return snapshot;
  },
  async (newParents, oldParents) => {
    for (const c of parsedCascadeFrom.value) {
      const newId = extractId(newParents[c.fieldKey]);
      const oldId = extractId(oldParents?.[c.fieldKey]);
      if (newId === oldId) continue;

      if (!newId) {
        clearSelf();
        return;
      }

      // Determine parent collection from config or stored value
      const parentCollection =
        c.parentCollection || extractCollection(newParents[c.fieldKey]);
      if (!parentCollection) continue;

      // Fetch FK value from parent record
      const parentRecord = await fetchParentRecord(parentCollection, newId, [
        c.fk,
      ]);
      const rawTarget = parentRecord?.[c.fk];
      const targetId = rawTarget ? String(rawTarget) : null;

      if (!targetId) {
        clearSelf();
        return;
      }
      if (selectedItem.value?.id === targetId) return;

      // Fetch target item to get its display label
      const targetRecord = await fetchById(props.target_collection, targetId);
      if (targetRecord) {
        const label = extractLabel(targetRecord);
        selectedItem.value = { id: targetId, label };
        searchText.value = label;
        dropdownItems.value = [];
        emitValue(targetId);
      }
      return; // Process first changed parent only
    }
  },
  { deep: true, immediate: false },
);

// Watch external value changes (record navigation, undo/redo)
watch(
  () => extractId(props.value),
  async (newId, oldId) => {
    if (newId === oldId) return;
    if (!newId) {
      selectedItem.value = null;
      searchText.value = "";
      return;
    }
    if (selectedItem.value?.id === newId) return;
    const item = await fetchById(props.target_collection, newId);
    if (item) {
      const label = extractLabel(item);
      selectedItem.value = { id: newId, label };
      searchText.value = label;
    }
  },
);

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  await initFromValue();
  document.addEventListener("click", handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleOutsideClick);
  if (searchTimer) clearTimeout(searchTimer);
});

function handleOutsideClick(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest(".cascading-single-select")) {
    dropdownOpen.value = false;
  }
}
</script>

<style scoped>
.cascading-single-select {
  width: 100%;
}

.field-input {
  position: relative;
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--theme--background, #fff);
  border: 1px solid var(--theme--border-color, #d3dae4);
  border-radius: var(--theme--border-radius, 6px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 200;
  max-height: 220px;
  overflow-y: auto;
}

.dropdown-filter-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--theme--primary, #6644ff);
  background: var(--theme--primary-background, #f0ecff);
  border-bottom: 1px solid var(--theme--border-color, #d3dae4);
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--theme--foreground, #1e2e3e);
  gap: 8px;
  transition: background 0.1s;
}

.dropdown-item:hover {
  background: var(--theme--background-normal, #f0f4f9);
}

.dropdown-item.loading,
.dropdown-item.empty {
  cursor: default;
  color: var(--theme--foreground-subdued, #a2b5cd);
  font-style: italic;
}
</style>
