<script setup lang="ts">
import { computed, inject, ref, watch } from "vue";
import type { ComputedRef } from "vue";
import GeoIndividualSelect, { type StoredRef } from "./GeoIndividualSelect.vue";
import { useGeographyFieldMaps } from "../composables/useGeographyFieldMaps.ts";
import type { GeoLevelConfig } from "../utils/geoLevels.ts";

type UploaderLabels = Record<string, string>
const labels = inject<ComputedRef<UploaderLabels>>('uploaderLabels')
const lbl = (key: string, fallback: string) => labels?.value?.[key] ?? fallback

type GeoValue = Record<string, StoredRef | null>;

interface CascadeMapping {
  fk: string;
  to: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: GeoValue | null;
    disabled?: boolean;
    languageCode?: string;
    labelField?: string;
    levels?: GeoLevelConfig[] | string | null;
    cascades?: Record<string, CascadeMapping[]> | string | null;
    filterMappings?: Record<string, unknown> | string | null;
    required?: boolean;
    showErrors?: boolean;
    hideHeader?: boolean;
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
    hideHeader: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: GeoValue): void;
}>();

const levelsInput = computed(() => props.levels);
const cascadesInput = computed(() => props.cascades);
const filterMappingsInput = computed(() => props.filterMappings as any);

const { levels, cascadeFromByField, filterByByField } = useGeographyFieldMaps({
  levels: levelsInput,
  cascades: cascadesInput,
  filterMappings: filterMappingsInput,
});

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
  <div class="geographies-editor" :class="{ section: !hideHeader }">
    <div v-if="!hideHeader" class="label type-label">{{ lbl('geoSectionTitle', 'Geography') }}</div>

    <div class="grid">
      <GeoIndividualSelect
        v-for="level in levels"
        :key="level.field"
        :model-value="(modelValue ?? {})[level.field] ?? null"
        :disabled="disabled"
        :invalid="required && showErrors && level.required === true && !(modelValue ?? {})[level.field]?.id"
        :required="level.required === true"
        :target-collection="level.collection"
        :label="level.label"
        :icon="level.icon"
        :label-field="level.labelField ?? labelField"
        :language-code="languageCode"
        :values="modelValue ?? {}"
        :cascade-from="cascadeFromByField[level.field] ?? []"
        :filter-by="filterByByField[level.field] ?? []"
        @update:model-value="(v) => setField(level.field, v)"
      />
    </div>
  </div>
</template>

<style scoped>
.geographies-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
