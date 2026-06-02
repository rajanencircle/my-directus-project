<script setup lang="ts">
import { computed, ref, watch } from "vue";
import GeoIndividualSelect, { type StoredRef } from "./GeoIndividualSelect.vue";
import { useMediaSettings } from "../../composables/useMediaSettings";
import { resolveTranslatable } from "../../utils/translations";
import { useT } from "../../composables/useT";

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
  required?: boolean;
  labelField?: string;
}

interface CascadeMapping {
  fk: string;
  to: string;
}

const DEFAULT_LEVELS: LevelConfig[] = [
  {
    field: "place",
    collection: "places",
    label: "Place (City)",
    icon: "location_city",
  },
  { field: "state", collection: "states", label: "State", icon: "map" },
  { field: "region", collection: "regions", label: "Region", icon: "terrain" },
  { field: "country", collection: "countries", label: "Country", icon: "flag" },
  {
    field: "destination",
    collection: "destinations",
    label: "Destination",
    icon: "explore",
  },
  {
    field: "destination_cluster",
    collection: "destinations_cluster",
    label: "Destination Cluster",
    icon: "public",
  },
];

const DEFAULT_FILTER_MAPPINGS: Record<string, FilterMapping[]> = {
  place: [
    { fk: "country_id", from: "country" },
    { fk: "state_id", from: "state" },
    { fk: "region_id", from: "region" },
  ],
  state: [{ fk: "country_id", from: "country" }],
  region: [{ fk: "country_id", from: "country" }],
  destination: [{ fk: "countries_id", from: "country" }],
  destination_cluster: [{ fk: "destinations_cluster_id", from: "destination" }],
};

const DEFAULT_CASCADES: Record<string, CascadeMapping[]> = {
  place: [
    { fk: "state_id", to: "state" },
    { fk: "region_id", to: "region" },
    { fk: "country_id", to: "country" },
  ],
  state: [{ fk: "country_id", to: "country" }],
  region: [{ fk: "country_id", to: "country" }],
  country: [{ fk: "destination_id", to: "destination" }],
  destination: [{ fk: "destinations_cluster_id", to: "destination_cluster" }],
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
    required?: boolean;
    showErrors?: boolean;
  }>(),
  {
    modelValue: null,
    disabled: false,
    languageCode: "en-GB",
    labelField: "translations.name",
    levels: null,
    cascades: null,
    filterMappings: null,
    required: false,
    showErrors: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: GeoValue): void;
}>();

const { settings } = useMediaSettings()
const { t } = useT()
const geoSectionTitle = computed(() =>
  resolveTranslatable(settings.value.geo_section_title, t, 'Geography')
)

function parseLevels(
  input: LevelConfig[] | string | null | undefined,
): LevelConfig[] {
  let arr: any[] | null = null;
  if (!input) return DEFAULT_LEVELS;
  if (Array.isArray(input)) {
    arr = input;
  } else {
    try {
      const parsed = JSON.parse(input);
      arr = Array.isArray(parsed) ? parsed : null;
    } catch {
      return DEFAULT_LEVELS;
    }
  }
  if (!arr) return DEFAULT_LEVELS;
  // Support both `field` and `key` as the field identifier (DB config may use either)
  return arr.map((lvl) => ({ ...lvl, field: lvl.field ?? lvl.key }));
}

function parseRecord<T>(
  input: Record<string, T> | string | null | undefined,
  fallback: Record<string, T>,
): Record<string, T> {
  if (!input) return fallback;
  if (typeof input === "object") return input;
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, T>)
      : fallback;
  } catch {
    return fallback;
  }
}

const levels = computed(() => parseLevels(props.levels));
const cascades = computed(() => parseRecord(props.cascades, DEFAULT_CASCADES));
const filterMappings = computed(() =>
  parseRecord(props.filterMappings, DEFAULT_FILTER_MAPPINGS),
);

const levelByField = computed(() => {
  const map = new Map<string, LevelConfig>();
  for (const level of levels.value) map.set(level.field, level);
  return map;
});

// Convert source-perspective cascades → per-field cascadeFrom arrays for GeoIndividualSelect
// Supports two formats:
//   Complex: { sourceField: [{ fk: "field_id", to: "targetField" }] }
//   Simple:  { childField: "parentField" }  — fk is derived from filterMappings
const cascadeFromByField = computed(() => {
  const result: Record<
    string,
    { fieldKey: string; parentCollection: string; fk: string }[]
  > = {};
  for (const level of levels.value) result[level.field] = [];
  for (const [field, mappings] of Object.entries(cascades.value)) {
    if (Array.isArray(mappings)) {
      // Complex format
      const sourceLevel = levelByField.value.get(field);
      if (!sourceLevel) continue;
      for (const mapping of mappings) {
        (result[mapping.to] ??= []).push({
          fieldKey: field,
          parentCollection: sourceLevel.collection,
          fk: mapping.fk,
        });
      }
    } else if (typeof mappings === 'string') {
      // Simple format: childField → parentKey
      const parentKey = mappings;
      const parentLevel = levelByField.value.get(parentKey);
      if (!parentLevel) continue;
      const fmEntry = (filterMappings.value as Record<string, any>)[field];
      const fk: string = Array.isArray(fmEntry) ? (fmEntry[0]?.fk ?? '') : (typeof fmEntry === 'string' ? fmEntry : '');
      if (!fk) continue;
      (result[field] ??= []).push({
        fieldKey: parentKey,
        parentCollection: parentLevel.collection,
        fk,
      });
    }
  }
  return result;
});

// Reshape filterMappings → per-field filterBy arrays
// Supports two formats:
//   Complex: { field: [{ fk: "fk_field", from: "parentField" }] }
//   Simple:  { field: "fk_field" }  — parentField derived by stripping _id suffix
const filterByByField = computed(() => {
  const result: Record<string, { fieldKey: string; fk: string }[]> = {};
  for (const [field, mappings] of Object.entries(filterMappings.value)) {
    if (Array.isArray(mappings)) {
      result[field] = mappings.map((m) => ({ fieldKey: m.from, fk: m.fk }));
    } else if (typeof mappings === 'string') {
      const fk = mappings as string;
      const fieldKey = fk.replace(/_id$/, '');
      result[field] = [{ fieldKey, fk }];
    }
  }
  return result;
});

// Local buffer so concurrent cascade clears don't read stale props.modelValue.
// Each setField call updates localValue immediately (before Vue re-renders),
// so the next concurrent call always sees the latest written state.
const localValue = ref<GeoValue>({ ...(props.modelValue ?? {}) });
watch(
  () => props.modelValue,
  (v) => { localValue.value = { ...(v ?? {}) }; },
);

function setField(field: string, val: StoredRef | null) {
  localValue.value = { ...localValue.value, [field]: val };
  emit("update:modelValue", { ...localValue.value });
}
</script>

<template>
  <div class="geographies-editor">
    <div class="section-title">{{ geoSectionTitle }}</div>

    <div class="grid">
      <GeoIndividualSelect
        v-for="level in levels"
        :key="level.field"
        :model-value="(modelValue ?? {})[level.field] ?? null"
        :disabled="disabled"
        :target-collection="level.collection"
        :label="level.label"
        :icon="level.icon"
        :label-field="level.labelField ?? labelField"
        :language-code="languageCode"
        :values="modelValue ?? {}"
        :cascade-from="cascadeFromByField[level.field] ?? []"
        :filter-by="filterByByField[level.field] ?? []"
        :required="required && level.required === true"
        :show-error="required && showErrors && level.required === true && !(modelValue ?? {})[level.field]?.id"
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
