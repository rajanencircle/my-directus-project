<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import FormFieldLabel from './FormFieldLabel.vue';

type UploaderLabels = Record<string, string>
const uploaderLabels = inject<ComputedRef<UploaderLabels>>('uploaderLabels')
const lbl = (key: string, fallback: string) => uploaderLabels?.value?.[key] ?? fallback

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
const rootRef = ref<HTMLElement | null>(null);
const inputWrapRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});
const openUpward = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const DROPDOWN_MAX_HEIGHT = 220;
const DROPDOWN_GAP = 4;
const DROPDOWN_Z_INDEX = 500;
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

function updateDropdownPosition() {
  const el = inputWrapRef.value;
  if (!el || !active.value) return;

  const rect = el.getBoundingClientRect();
  const viewportH = window.innerHeight;
  const spaceBelow = viewportH - rect.bottom - DROPDOWN_GAP;
  const spaceAbove = rect.top - DROPDOWN_GAP;
  const preferredHeight = Math.min(DROPDOWN_MAX_HEIGHT, Math.max(spaceBelow, spaceAbove, 120));

  openUpward.value = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
  const maxHeight = Math.min(
    DROPDOWN_MAX_HEIGHT,
    Math.max(120, openUpward.value ? spaceAbove : spaceBelow),
  );

  const base = {
    position: 'fixed',
    left: `${Math.max(8, rect.left)}px`,
    width: `${Math.min(rect.width, window.innerWidth - 16)}px`,
    maxHeight: `${maxHeight}px`,
    zIndex: String(DROPDOWN_Z_INDEX),
  };

  dropdownStyle.value = openUpward.value
    ? { ...base, bottom: `${viewportH - rect.top + DROPDOWN_GAP}px` }
    : { ...base, top: `${rect.bottom + DROPDOWN_GAP}px` };
}

function bindDropdownPositionListeners() {
  window.addEventListener('scroll', updateDropdownPosition, true);
  window.addEventListener('resize', updateDropdownPosition);
}

function unbindDropdownPositionListeners() {
  window.removeEventListener('scroll', updateDropdownPosition, true);
  window.removeEventListener('resize', updateDropdownPosition);
}

async function showDropdown() {
  active.value = true;
  await nextTick();
  updateDropdownPosition();
  bindDropdownPositionListeners();
}

function hideDropdown() {
  active.value = false;
  unbindDropdownPositionListeners();
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function onInput(val: string) {
  searchText.value = val;
  selectedItem.value = null;
  if (!active.value) void showDropdown();

  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    await search(val);
    await nextTick();
    updateDropdownPosition();
  }, 250);
}

async function onFocus() {
  if (selectedItem.value) searchText.value = '';
  await search(searchText.value);
  await showDropdown();
}

function onBlur() {
  window.setTimeout(() => {
    hideDropdown();
    if (props.modelValue?.id) initFromValue();
  }, 180);
}

function onSelect(item: DropdownItem) {
  setSuppressFilterClear();
  emit('update:modelValue', { id: item.id, collection: props.targetCollection });
  selectedItem.value = item;
  searchText.value = item.label;
  hideDropdown();
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
  const target = e.target as Node | null;
  if (!target) return;
  if (rootRef.value?.contains(target)) return;
  if (dropdownRef.value?.contains(target)) return;
  hideDropdown();
}

watch([active, () => items.value.length, loading], () => {
  if (active.value) nextTick(updateDropdownPosition);
});

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
  unbindDropdownPositionListeners();
  if (searchTimer) clearTimeout(searchTimer);
});

const canClear = computed(() => Boolean(props.modelValue?.id) && !props.disabled);
</script>

<template>
  <div ref="rootRef" class="field geo-field" :class="{ 'is-invalid': invalid }">
    <FormFieldLabel :label="label" :required="required" />
    <div class="interface">
      <div ref="inputWrapRef" class="input-wrap">
        <v-input
        :model-value="searchText"
        :placeholder="lbl('geoSearchPlaceholder', `Search ${label}…`).replace('{label}', label)"
        :disabled="disabled"
        @update:model-value="(v: unknown) => onInput(String(v ?? ''))"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.escape="hideDropdown"
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

      <Teleport to="body">
        <div
          v-if="active"
          ref="dropdownRef"
          class="geo-dropdown-portal"
          :class="{ 'is-upward': openUpward }"
          :style="dropdownStyle"
          @mousedown.prevent
        >
          <div v-if="filterHint" class="dropdown-filter-hint">
            <v-icon name="filter_alt" x-small />
            {{ filterHint }}
          </div>
          <div v-if="loading" class="dropdown-item loading">
            <v-progress-circular x-small indeterminate />
            {{ lbl('geoLoading', 'Loading…') }}
          </div>
          <template v-else-if="items.length">
            <div v-for="it in items" :key="it.id" class="dropdown-item" @mousedown.prevent="onSelect(it)">
              <v-icon v-if="icon" :name="icon" x-small />
              {{ it.label }}
            </div>
          </template>
          <div v-else class="dropdown-item empty">{{ lbl('geoNoResults', 'No results found') }}</div>
        </div>
      </Teleport>
    </div>
    </div>
  </div>
</template>

<style scoped>
.field.geo-field {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  margin: 0;
}

.field.geo-field .interface {
  margin: 0;
}

.field.geo-field.is-invalid :deep(.v-input) {
  --v-input-border-color: var(--theme--danger);
  --v-input-border-color-hover: var(--theme--danger);
  --v-input-border-color-focus: var(--theme--danger);
}

.input-wrap {
  position: relative;
}

.geo-dropdown-portal {
  background: var(--theme--background);
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  box-shadow: var(--theme--elevation-medium, 0 4px 16px rgba(0, 0, 0, 0.12));
  overflow-y: auto;
  overflow-x: hidden;
}

.dropdown-filter-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  background: var(--theme--primary-background);
  border-bottom: 1px solid var(--theme--border-color);
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
  gap: 8px;
  transition: background 0.1s;
}

.dropdown-item:hover {
  background: var(--theme--background-normal);
}

.dropdown-item.loading,
.dropdown-item.empty {
  cursor: default;
  font-style: italic;
}
</style>
