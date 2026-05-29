<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';

type AnyRecord = Record<string, any>;

export interface StoredRef {
  id: string;
  collection: string;
}

interface CascadeFromConfig {
  fieldKey: string;
  parentCollection: string;
  fk: string;
}

interface FilterByConfig {
  fieldKey: string;
  fk: string;
}

interface DropdownItem {
  id: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: StoredRef | null;
    disabled?: boolean;
    targetCollection: string;
    label: string;
    icon?: string;
    labelField?: string;
    languageCode?: string;
    searchLimit?: number;
    values?: Record<string, unknown> | null;
    cascadeFrom?: CascadeFromConfig[];
    filterBy?: FilterByConfig[];
    required?: boolean;
    invalid?: boolean;
  }>(),
  {
    modelValue: null,
    disabled: false,
    required: false,
    invalid: false,
    icon: 'search',
    labelField: 'translations.name',
    languageCode: 'en-GB',
    searchLimit: -1,
    values: null,
    cascadeFrom: () => [],
    filterBy: () => [],
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: StoredRef | null): void;
}>();

const api = useApi();

// Prefer explicitly-passed geo values over the Directus form context inject.
// Inside UploadModal we're inside Directus's component tree which injects the
// main-form values — those don't contain our geo fields. When props.values is
// provided (always from GeographiesEditor), use it; only fall back to inject
// when props.values is null (e.g. component used standalone inside a native form).
const injectedValues = inject<Ref<Record<string, unknown>> | null>('values', null);
const currentValues = computed<Record<string, unknown> | null>(
  () => props.values ?? (injectedValues?.value as Record<string, unknown> | null) ?? null
);

const searchText = ref('');
const active = ref(false);
const loading = ref(false);
const items = ref<DropdownItem[]>([]);
const selectedItem = ref<DropdownItem | null>(null);
const drawerOpen = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | null = null;
// Suppresses filterBy-triggered clearing for 1 s after user explicitly
// selects or clears this field.
let suppressFilterClear = false;
let suppressTimer: ReturnType<typeof setTimeout> | null = null;

function setSuppressFilterClear() {
  suppressFilterClear = true;
  if (suppressTimer) clearTimeout(suppressTimer);
  suppressTimer = setTimeout(() => { suppressFilterClear = false; }, 1000);
}

// ─── Value helpers ────────────────────────────────────────────────────────────

function extractId(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object' && 'id' in (val as object)) {
    const id = (val as StoredRef).id;
    return id ? String(id) : null;
  }
  return null;
}

// ─── Label / fields helpers ───────────────────────────────────────────────────

function buildFieldsParam(labelField: string): string[] {
  const base = ['id'];
  const parts = labelField.split('.');
  if (parts[0] === 'translations' && parts[1]) {
    // Fetch all translation fields — language code field name varies per collection
    base.push('translations.*');
  } else {
    base.push(labelField);
  }
  return base;
}

function extractLabel(item: AnyRecord): string {
  const path = props.labelField ?? 'translations.name';
  const parts = path.split('.');
  if (parts.length === 1) return String(item[parts[0]] ?? `[${item.id}]`);

  if (parts[0] === 'translations' && parts[1]) {
    const translations = (item.translations as Array<Record<string, string>>) ?? [];
    const match =
      translations.find(
        (t) =>
          t.code === props.languageCode ||
          t.languages_code === props.languageCode ||
          t.language_code === props.languageCode ||
          t.translations_id === props.languageCode,
      ) ?? translations[0];
    return String(match?.[parts[1]] ?? `[${item.id}]`);
  }

  let val: any = item;
  for (const part of parts) val = val?.[part];
  return String(val ?? `[${item.id}]`);
}

// ─── Path traversal for drawer input ─────────────────────────────────────────

function extractFromPath(obj: AnyRecord, path: string): string | null {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null) return null;
    if (
      !Array.isArray(current) &&
      typeof current === 'object' &&
      Array.isArray((current as AnyRecord).create)
    ) {
      current = (current as AnyRecord).create;
    }
    if (Array.isArray(current)) {
      const arr = current as AnyRecord[];
      const match =
        arr.find(
          (item) => item.code === props.languageCode || item.translations_id === props.languageCode
        ) ?? arr[0];
      current = match?.[part];
    } else {
      current = (current as AnyRecord)[part];
    }
  }
  return current != null ? String(current) : null;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchById(id: string): Promise<AnyRecord | null> {
  const fields = buildFieldsParam(props.labelField ?? 'translations.name');
  try {
    const res = await api.get(`/items/${props.targetCollection}/${id}`, { params: { fields } });
    return res.data?.data ?? null;
  } catch {
    return null;
  }
}

async function fetchParentRecord(
  collection: string,
  id: string,
  fields: string[]
): Promise<AnyRecord | null> {
  try {
    const res = await api.get(`/items/${collection}/${id}`, {
      params: { fields: ['id', ...fields] },
    });
    return res.data?.data ?? null;
  } catch {
    return null;
  }
}

async function search(term: string) {
  if (!props.targetCollection) return;
  loading.value = true;

  const labelField = props.labelField ?? 'translations.name';
  const fields = buildFieldsParam(labelField);

  const clauses: AnyRecord[] = [];
  const q = term.trim();
  if (q) {
    const labelParts = labelField.split('.');
    if (labelParts[0] === 'translations') clauses.push({ translations: { name: { _icontains: q } } });
    else clauses.push({ [labelField]: { _icontains: q } });
  }

  for (const f of getActiveFilters()) clauses.push({ [f.fk]: { _eq: f.id } });

  const params: AnyRecord = {
    fields,
    limit: props.searchLimit ?? 20,
    sort: [labelField],
  };
  if (clauses.length === 1) params.filter = clauses[0];
  else if (clauses.length > 1) params.filter = { _and: clauses };

  try {
    const res = await api.get(`/items/${props.targetCollection}`, { params });
    items.value = (res.data?.data ?? []).map((r: AnyRecord) => ({
      id: String(r.id),
      label: extractLabel(r),
    }));
  } catch (e) {
    console.error('[media-uploader] GeoIndividualSelect search error:', e);
    items.value = [];
  } finally {
    loading.value = false;
  }
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

function getActiveFilters(): Array<{ fk: string; id: string; fieldKey: string }> {
  const active: Array<{ fk: string; id: string; fieldKey: string }> = [];
  for (const f of props.filterBy ?? []) {
    const parentId = extractId(currentValues.value?.[f.fieldKey]);
    if (parentId) active.push({ fk: f.fk, id: parentId, fieldKey: f.fieldKey });
  }
  return active;
}

const filterHint = computed<string>(() =>
  getActiveFilters()
    .map((f) => `Filtered by ${f.fieldKey}`)
    .join('  ·  ')
);

// ─── Init ─────────────────────────────────────────────────────────────────────

async function initFromValue() {
  const id = props.modelValue?.id;
  if (!id) {
    searchText.value = '';
    return;
  }
  try {
    const record = await fetchById(String(id));
    const label = record ? extractLabel(record) : String(id);
    selectedItem.value = { id: String(id), label };
    searchText.value = label;
  } catch {
    searchText.value = String(id);
  }
}

function clearSelf() {
  if (selectedItem.value !== null || searchText.value !== '') {
    selectedItem.value = null;
    searchText.value = '';
    items.value = [];
    emit('update:modelValue', null);
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function onInput(val: string) {
  searchText.value = val;
  selectedItem.value = null;
  active.value = true;

  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => search(val), 250);
}

async function onFocus() {
  active.value = true;
  // Clear the label text so the dropdown shows all options, not just the selected label
  if (selectedItem.value) searchText.value = '';
  await search(searchText.value);
}

function onBlur() {
  setTimeout(() => {
    active.value = false;
    if (props.modelValue?.id) initFromValue();
  }, 180);
}

function onSelect(item: DropdownItem) {
  setSuppressFilterClear();
  emit('update:modelValue', { id: item.id, collection: props.targetCollection });
  selectedItem.value = item;
  searchText.value = item.label;
  active.value = false;
  items.value = [];
}

function clear() {
  setSuppressFilterClear();
  clearSelf();
}

function openDrawer() {
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
}

async function onDrawerInput(val: AnyRecord) {
  if (!val) return;
  try {
    let id: string;
    let itemData: AnyRecord;

    if (val.id) {
      id = String(val.id);
      itemData = val;
    } else {
      const response = await api.post(`/items/${props.targetCollection}`, val);
      itemData = response.data?.data ?? {};
      id = String(itemData.id);
    }

    if (!id) return;

    const label =
      extractFromPath(val, props.labelField ?? 'translations.name') ??
      extractLabel(itemData) ??
      id;

    onSelect({ id, label });
  } catch (e) {
    console.error(`[media-uploader] Error creating item in ${props.targetCollection}:`, e);
  }
  drawerOpen.value = false;
}

function handleOutsideClick(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest('.geo-individual-select')) active.value = false;
}

// ─── Cascade watcher ─────────────────────────────────────────────────────────

watch(
  () => {
    const snapshot: Record<string, unknown> = {};
    for (const c of props.cascadeFrom ?? []) {
      snapshot[c.fieldKey] = currentValues.value?.[c.fieldKey] ?? null;
    }
    return snapshot;
  },
  async (newParents, oldParents) => {
    for (const c of props.cascadeFrom ?? []) {
      const newId = extractId(newParents[c.fieldKey]);
      const oldId = extractId(oldParents?.[c.fieldKey]);
      if (newId === oldId) continue;

      // Skip auto-fill on initial load if this field already has a saved value
      if (oldId === null && extractId(props.modelValue) !== null) continue;

      if (!newId) {
        clearSelf();
        return;
      }

      const parentCollection = c.parentCollection || (newParents[c.fieldKey] as any)?.collection;
      if (!parentCollection) continue;

      const parentRecord = await fetchParentRecord(parentCollection, newId, [c.fk]);
      const rawTarget = parentRecord?.[c.fk];
      const targetId = rawTarget ? String(rawTarget) : null;

      if (!targetId) {
        clearSelf();
        return;
      }
      if (selectedItem.value?.id === targetId) return;

      // Already matches saved value — just sync display label without emitting
      if (extractId(props.modelValue) === targetId) {
        if (!selectedItem.value) {
          const record = await fetchById(targetId);
          if (record) {
            const label = extractLabel(record);
            selectedItem.value = { id: targetId, label };
            searchText.value = label;
          }
        }
        return;
      }

      const record = await fetchById(targetId);
      if (record) {
        const label = extractLabel(record);
        selectedItem.value = { id: targetId, label };
        searchText.value = label;
        items.value = [];
        emit('update:modelValue', { id: targetId, collection: props.targetCollection });
      }
      return;
    }
  },
  { deep: true, immediate: false }
);

// ─── FilterBy watcher ─────────────────────────────────────────────────────────

watch(
  () => {
    const snapshot: Record<string, unknown> = {};
    for (const f of props.filterBy ?? []) {
      snapshot[f.fieldKey] = currentValues.value?.[f.fieldKey] ?? null;
    }
    return snapshot;
  },
  (newFilters, oldFilters) => {
    if (!oldFilters) return;
    for (const f of props.filterBy ?? []) {
      const oldVal = extractId(oldFilters[f.fieldKey]);
      const newVal = extractId(newFilters[f.fieldKey]);
      if (newVal !== oldVal) {
        // null → value is initial form load, skip to avoid dirty state
        if (oldVal === null) return;
        // Suppress if we just selected/cleared this field
        if (suppressFilterClear) return;
        if (selectedItem.value) clearSelf();
        return;
      }
    }
  },
  { deep: true }
);

// ─── External value watcher ───────────────────────────────────────────────────

watch(
  () => props.modelValue,
  () => initFromValue(),
  { deep: true }
);

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => {
  initFromValue();
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
  if (searchTimer) clearTimeout(searchTimer);
});

const canClear = computed(() => Boolean(props.modelValue?.id) && !props.disabled);
</script>

<template>
  <div class="geo-individual-select" :class="{ invalid: invalid }">
    <div class="label">
      {{ label }}
      <span v-if="required" class="required-mark" aria-hidden="true">*</span>
    </div>
    <div class="input-wrap">
      <v-input
        :model-value="searchText"
        :placeholder="`Search ${label}…`"
        :disabled="disabled"
        @update:model-value="(v: unknown) => onInput(String(v ?? ''))"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.escape="active = false"
      >
        <template v-if="icon" #prepend>
          <v-icon :name="icon" small />
        </template>
        <template #append>
          <v-icon v-if="canClear" name="close" small clickable @click.stop="clear" />
          <v-icon v-else-if="!disabled" name="add" small clickable @click.stop="openDrawer" />
        </template>
      </v-input>

      <drawer-item
        v-if="drawerOpen"
        :active="drawerOpen"
        :collection="targetCollection"
        primary-key="+"
        @update:active="closeDrawer"
        @input="onDrawerInput"
      />

      <div v-if="active" class="dropdown">
        <div v-if="filterHint" class="dropdown-filter-hint">
          <v-icon name="filter_alt" x-small />
          {{ filterHint }}
        </div>
        <div v-if="loading" class="dropdown-item loading">
          <v-progress-circular x-small indeterminate />
          Loading…
        </div>
        <template v-else-if="items.length">
          <div v-for="it in items" :key="it.id" class="dropdown-item" @mousedown.prevent="onSelect(it)">
            <v-icon v-if="icon" :name="icon" x-small />
            {{ it.label }}
          </div>
        </template>
        <div v-else class="dropdown-item empty">No results found</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.geo-individual-select {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--theme--foreground-subdued);
}

.required-mark {
  color: var(--theme--danger, #dc3545);
  margin-left: 2px;
}

.geo-individual-select.invalid :deep(.v-input) {
  --v-input-border-color: var(--theme--danger, #dc3545);
  --v-input-border-color-hover: var(--theme--danger, #dc3545);
  --v-input-border-color-focus: var(--theme--danger, #dc3545);
}

.input-wrap {
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
  z-index: 220;
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
