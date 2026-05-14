<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import GeoIndividualSelect, { type StoredRef } from './GeoIndividualSelect.vue';

type GeoValue = Record<string, StoredRef | null>;

interface FilterMapping {
  fk: string;
  from: string;
}

interface LevelConfig {
  field: string;
  collection: string;
  label: string;
  icon?: string;
}

interface CascadeMapping {
  fk: string;
  to: string;
}

// Same level order as our existing GeoCascader defaults.
const DEFAULT_LEVELS: LevelConfig[] = [
  { field: 'place', collection: 'places', label: 'Place (City)', icon: 'location_city' },
  { field: 'state', collection: 'states', label: 'State', icon: 'map' },
  { field: 'region', collection: 'regions_geo', label: 'Region', icon: 'terrain' },
  { field: 'country', collection: 'countries_geo', label: 'Country', icon: 'flag' },
  { field: 'destination', collection: 'destinations', label: 'Destination', icon: 'explore' },
  { field: 'destination_cluster', collection: 'destinations_cluster', label: 'Destination Cluster', icon: 'public' },
];

// Default filter mappings (ported from GeoCascader) so dropdowns narrow based on upstream selections.
const DEFAULT_FILTER_MAPPINGS: Record<string, FilterMapping[]> = {
  place: [
    { fk: 'country_id', from: 'country' },
    { fk: 'state_id', from: 'state' },
    { fk: 'region_id', from: 'region' },
  ],
  state: [{ fk: 'country_id', from: 'country' }],
  region: [{ fk: 'country_id', from: 'country' }],
  destination: [{ fk: 'countries_geo_id', from: 'country' }],
  destination_cluster: [{ fk: 'destinations_cluster_id', from: 'destination' }],
};

const DEFAULT_CASCADES: Record<string, CascadeMapping[]> = {
  place: [
    { fk: 'state_id', to: 'state' },
    { fk: 'region_id', to: 'region' },
    { fk: 'country_id', to: 'country' },
  ],
  state: [{ fk: 'country_id', to: 'country' }],
  region: [{ fk: 'country_id', to: 'country' }],
  country: [{ fk: 'destination_id', to: 'destination' }],
  destination: [{ fk: 'destinations_cluster_id', to: 'destination_cluster' }],
};

const props = withDefaults(
  defineProps<{
    modelValue: GeoValue | null;
    disabled?: boolean;
    languageCode?: string;
    labelField?: string;
    levels?: LevelConfig[] | string | null;
    cascades?: Record<string, CascadeMapping[]> | string | null;
    filterMappings?: Record<string, FilterMapping[]> | string | null;
  }>(),
  {
    modelValue: null,
    disabled: false,
    languageCode: 'en-GB',
    labelField: 'translations.name',
    levels: null,
    cascades: null,
    filterMappings: null,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: GeoValue): void;
}>();

const api = useApi();
const applyingCascade = ref(false);

function parseLevels(input: LevelConfig[] | string | null | undefined): LevelConfig[] {
  if (!input) return DEFAULT_LEVELS;
  if (Array.isArray(input)) return input;
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : DEFAULT_LEVELS;
  } catch {
    return DEFAULT_LEVELS;
  }
}

function parseRecord<T>(input: Record<string, T> | string | null | undefined, fallback: Record<string, T>): Record<string, T> {
  if (!input) return fallback;
  if (typeof input === 'object') return input;
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, T>) : fallback;
  } catch {
    return fallback;
  }
}

const levels = computed(() => parseLevels(props.levels));
const cascades = computed(() => parseRecord(props.cascades, DEFAULT_CASCADES));
const filterMappings = computed(() => parseRecord(props.filterMappings, DEFAULT_FILTER_MAPPINGS));
const levelByField = computed(() => {
  const map = new Map<string, LevelConfig>();
  for (const level of levels.value) map.set(level.field, level);
  return map;
});

function current(): GeoValue {
  return (props.modelValue ?? {}) as GeoValue;
}

function setField(field: string, val: StoredRef | null) {
  emit('update:modelValue', { ...current(), [field]: val });
}

function extractId(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const id = (value as { id?: unknown }).id;
  return id == null ? null : String(id);
}

function refsEqual(a: StoredRef | null | undefined, b: StoredRef | null | undefined): boolean {
  return (a?.id ?? null) === (b?.id ?? null) && (a?.collection ?? null) === (b?.collection ?? null);
}

function cloneGeoValue(value: GeoValue): GeoValue {
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, v ? { ...v } : null]));
}

function descendantFields(field: string, seen = new Set<string>()): Set<string> {
  const children = cascades.value[field] ?? [];
  for (const child of children) {
    if (seen.has(child.to)) continue;
    seen.add(child.to);
    descendantFields(child.to, seen);
  }
  return seen;
}

function clearDescendants(base: GeoValue, field: string) {
  for (const key of descendantFields(field)) {
    base[key] = null;
  }
}

function normalizeTargetId(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
  if (typeof raw === 'object' && 'id' in (raw as Record<string, unknown>)) {
    const id = (raw as { id?: unknown }).id;
    return id == null ? null : String(id);
  }
  return null;
}

async function fetchRecord(collection: string, id: string, fields: string[]) {
  const uniqFields = ['id', ...Array.from(new Set(fields))];
  const res = await api.get(`/items/${collection}/${encodeURIComponent(id)}`, {
    params: { fields: uniqFields },
  });
  return (res.data?.data ?? null) as Record<string, unknown> | null;
}

async function applyCascadeFrom(field: string, value: StoredRef | null, draft: GeoValue, visited = new Set<string>()) {
  if (!value?.id) return;
  if (visited.has(field)) return;
  visited.add(field);

  const mappings = cascades.value[field] ?? [];
  if (!mappings.length) return;

  const sourceLevel = levelByField.value.get(field);
  const sourceCollection = value.collection || sourceLevel?.collection;
  if (!sourceCollection) return;

  const record = await fetchRecord(
    sourceCollection,
    String(value.id),
    mappings.map((mapping) => mapping.fk)
  );
  if (!record) return;

  for (const mapping of mappings) {
    const targetLevel = levelByField.value.get(mapping.to);
    if (!targetLevel) continue;

    const targetId = normalizeTargetId(record[mapping.fk]);
    if (!targetId) {
      draft[mapping.to] = null;
      clearDescendants(draft, mapping.to);
      continue;
    }

    const nextValue = { id: targetId, collection: targetLevel.collection };
    draft[mapping.to] = nextValue;
    await applyCascadeFrom(mapping.to, nextValue, draft, visited);
  }
}

function findChangedField(next: GeoValue, prev: GeoValue): string | null {
  for (const level of levels.value) {
    if (!refsEqual(next[level.field], prev[level.field])) return level.field;
  }
  return null;
}

function upstreamFilters(field: string): Array<{ fk: string; id: string }> {
  const mappings = filterMappings.value[field] ?? [];
  const active: Array<{ fk: string; id: string }> = [];
  const v = current();
  for (const m of mappings) {
    const sel = v[m.from];
    if (sel?.id) active.push({ fk: m.fk, id: String(sel.id) });
  }
  return active;
}

watch(
  () => props.modelValue,
  async (nextValue, prevValue) => {
    if (applyingCascade.value) {
      applyingCascade.value = false;
      return;
    }

    const next = current();
    const prev = (prevValue ?? {}) as GeoValue;
    const changedField = findChangedField(next, prev);
    if (!changedField) return;

    const changedSelection = next[changedField] ?? null;
    const draft = cloneGeoValue(next);
    clearDescendants(draft, changedField);

    if (changedSelection?.id) {
      try {
        await applyCascadeFrom(changedField, changedSelection, draft);
      } catch (error) {
        console.error('[media-uploader] geography cascade error:', error);
      }
    }

    const changed = levels.value.some((level) => !refsEqual(draft[level.field], next[level.field]));
    if (!changed) return;

    applyingCascade.value = true;
    emit('update:modelValue', draft);
  },
  { deep: true }
);
</script>

<template>
  <div class="geographies-editor">
    <div class="section-title">Geography</div>

    <div class="grid">
      <GeoIndividualSelect
        v-for="level in levels"
        :key="level.field"
        :model-value="(modelValue ?? {})[level.field] ?? null"
        :disabled="disabled"
        :target-collection="level.collection"
        :label="level.label"
        :icon="level.icon"
        :label-field="labelField"
        :language-code="languageCode"
        :filter="upstreamFilters(level.field)"
        @update:model-value="(v) => setField(level.field, v)"
      />
    </div>
  </div>
</template>

<style scoped>
.geographies-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-normal);
}

.section-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--theme--foreground-subdued);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
