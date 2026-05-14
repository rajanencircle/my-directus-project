<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';

type AnyRecord = Record<string, any>;

export interface StoredRef {
  id: string;
  collection: string;
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
    // Optional upstream filters: [{ fk: 'country_id', id: '...' }, ...]
    filter?: Array<{ fk: string; id: string }>;
  }>(),
  {
    modelValue: null,
    disabled: false,
    icon: 'search',
    labelField: 'translations.name',
    languageCode: 'en-GB',
    searchLimit: 20,
    filter: () => [],
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: StoredRef | null): void;
}>();

const api = useApi();

const searchText = ref('');
const active = ref(false);
const loading = ref(false);
const items = ref<DropdownItem[]>([]);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

function buildFieldsParam(labelField: string): string[] {
  const base = ['id'];
  const parts = labelField.split('.');
  if (parts[0] === 'translations') {
    base.push('translations.name', 'translations.translations_id');
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
      translations.find((t) => t.translations_id === props.languageCode) ??
      translations[0];
    return String(match?.[parts[1]] ?? `[${item.id}]`);
  }

  let val: any = item;
  for (const part of parts) val = val?.[part];
  return String(val ?? `[${item.id}]`);
}

async function fetchById(id: string) {
  const fields = buildFieldsParam(props.labelField ?? 'translations.name');
  const res = await api.get(`/items/${props.targetCollection}/${id}`, { params: { fields } });
  return res.data?.data ?? null;
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

  for (const f of props.filter ?? []) clauses.push({ [f.fk]: { _eq: f.id } });

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

async function initFromValue() {
  const id = props.modelValue?.id;
  if (!id) {
    searchText.value = '';
    return;
  }
  try {
    const record = await fetchById(String(id));
    searchText.value = record ? extractLabel(record) : String(id);
  } catch {
    searchText.value = String(id);
  }
}

function onInput(val: string) {
  searchText.value = val;
  emit('update:modelValue', null);
  active.value = true;

  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => search(val), 250);
}

async function onFocus() {
  active.value = true;
  await search(searchText.value);
}

function onBlur() {
  setTimeout(() => {
    active.value = false;
    // restore label if there is a selected value
    if (props.modelValue?.id) initFromValue();
  }, 180);
}

function onSelect(item: DropdownItem) {
  emit('update:modelValue', { id: item.id, collection: props.targetCollection });
  searchText.value = item.label;
  active.value = false;
  items.value = [];
}

function clear() {
  emit('update:modelValue', null);
  searchText.value = '';
  items.value = [];
}

function handleOutsideClick(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest('.geo-individual-select')) active.value = false;
}

onMounted(() => {
  initFromValue();
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
  if (searchTimer) clearTimeout(searchTimer);
});

watch(
  () => props.modelValue,
  () => initFromValue(),
  { deep: true }
);

const canClear = computed(() => Boolean(props.modelValue?.id) && !props.disabled);
</script>

<template>
  <div class="geo-individual-select">
    <div class="label">{{ label }}</div>
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
        </template>
      </v-input>

      <div v-if="active" class="dropdown">
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
