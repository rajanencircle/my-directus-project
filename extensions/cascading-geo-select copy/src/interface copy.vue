<template>
  <div
    class="cascading-hierarchy-select"
    :class="displayMode === 'grid' ? 'mode-grid' : 'mode-stack'"
  >
    <div v-for="level in parsedLevels" :key="level.field" class="cascade-field">
      <div class="field-label">
        <v-icon v-if="level.icon" :name="level.icon" x-small />
        {{ level.label }}
      </div>
      <div class="field-input">
        <v-input
          :model-value="searchState[level.field] ?? ''"
          :placeholder="`Search ${level.label}...`"
          :disabled="disabled"
          @update:model-value="onSearchInput(level.field, $event)"
          @focus="onFocus(level.field)"
          @blur="onBlur(level.field)"
          @keydown.escape="closeDropdown(level.field)"
        >
          <template v-if="level.icon" #prepend>
            <v-icon :name="level.icon" small />
          </template>
          <template v-if="selectedState[level.field]" #append>
            <v-icon name="close" small clickable @click.stop="onClear(level)" />
          </template>
        </v-input>

        <!-- Dropdown -->
        <div v-if="activeField === level.field" class="dropdown">
          <div v-if="loadingState[level.field]" class="dropdown-item loading">
            <v-progress-circular x-small indeterminate />
            Loading...
          </div>
          <template
            v-else-if="
              dropdownState[level.field] &&
              dropdownState[level.field].length > 0
            "
          >
            <div
              v-for="item in dropdownState[level.field]"
              :key="item.id"
              class="dropdown-item"
              @mousedown.prevent="onSelect(level, item)"
            >
              <v-icon v-if="level.icon" :name="level.icon" x-small />
              {{ item.label }}
            </div>
          </template>
          <div v-else class="dropdown-item empty">No results found</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export const DEFAULT_LEVELS = JSON.stringify([
  {
    field: "place",
    collection: "places",
    label: "Place (City)",
    icon: "location_city",
  },
  {
    field: "state",
    collection: "states",
    label: "State / Province",
    icon: "map",
  },
  {
    field: "region",
    collection: "regions_geo",
    label: "Region",
    icon: "terrain",
  },
  {
    field: "country",
    collection: "countries_geo",
    label: "Country",
    icon: "flag",
  },
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
]);

export const DEFAULT_CASCADES = JSON.stringify({
  place: [
    { fk: "state_id", to: "state" },
    { fk: "region_id", to: "region" },
    { fk: "country_id", to: "country" },
  ],
  state: [{ fk: "country_id", to: "country" }],
  // 'region' uses the direct M2O 'country' field (not the M2M 'country_id')
  region: [{ fk: "country", to: "country" }],
  country: [{ fk: "destination_id", to: "destination" }],
  destination: [{ fk: "destinations_cluster_id", to: "destination_cluster" }],
});
</script>

<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
} from "vue";
import { useApi } from "@directus/extensions-sdk";

const api = useApi(); // used for fetching items

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

interface DropdownItem {
  id: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    // JSON field mode: single stored object  (field type = json)
    value?: Record<string, unknown> | null;
    // GROUP alias mode: child field values spread into the form (field type = alias/group)
    values?: Record<string, unknown> | null;
    // Standard interface props
    collection?: string;
    disabled?: boolean;
    levels?: string | LevelConfig[];
    cascades?: string | Record<string, CascadeMapping[]>;
    languageCode?: string;
    labelField?: string;
    displayMode?: string;
    searchLimit?: number;
  }>(),
  {
    value: null,
    values: null,
    collection: "",
    disabled: false,
    levels: DEFAULT_LEVELS,
    cascades: DEFAULT_CASCADES,
    languageCode: "en-GB",
    labelField: "translations.name",
    displayMode: "grid",
    searchLimit: 20,
  },
);

const emit = defineEmits(["input"]);

// Returns current values regardless of mode:
//   GROUP mode  → props.values (child M2O field values from Directus form)
//   JSON mode   → props.value  (stored JSON blob)
function getCurrentValues(): Record<string, unknown> {
  if (props.values != null) return props.values as Record<string, unknown>;
  if (props.value != null) return props.value as Record<string, unknown>;
  return {};
}

// Emit the merged values. Directus handles them differently per mode:
//   GROUP mode → Directus spreads the object into individual child M2O fields
//   JSON mode  → Directus stores the object as JSON in the field
function applyUpdates(updates: Record<string, string | null>) {
  emit("input", { ...getCurrentValues(), ...updates });
}

// Parsed config
const parsedLevels = computed<LevelConfig[]>(() => {
  try {
    const v = props.levels;
    const parsed = typeof v === "string" ? JSON.parse(v) : v;
    if (Array.isArray(parsed) && parsed.length > 0)
      return parsed as LevelConfig[];
  } catch {
    /* fall through */
  }
  return JSON.parse(DEFAULT_LEVELS) as LevelConfig[];
});

const parsedCascades = computed<Record<string, CascadeMapping[]>>(() => {
  try {
    const v = props.cascades;
    const parsed = typeof v === "string" ? JSON.parse(v) : v;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      return parsed as Record<string, CascadeMapping[]>;
  } catch {
    /* fall through */
  }
  return JSON.parse(DEFAULT_CASCADES) as Record<string, CascadeMapping[]>;
});

// UI state
const searchState = reactive<Record<string, string>>({});
const selectedState = reactive<Record<string, DropdownItem | null>>({});
const dropdownState = reactive<Record<string, DropdownItem[]>>({});
const loadingState = reactive<Record<string, boolean>>({});
const activeField = ref<string | null>(null);
const searchTimers: Record<string, ReturnType<typeof setTimeout>> = {};

// ─── Label extraction ─────────────────────────────────────────────────────────
function extractLabel(item: Record<string, unknown>): string {
  const path = props.labelField || "translations.name";
  const parts = path.split(".");

  if (parts.length === 1) {
    return (item[parts[0]] as string) ?? `[${item.id}]`;
  }

  // Handle translations.name pattern
  if (parts[0] === "translations" && parts[1]) {
    const translations =
      (item.translations as Array<Record<string, string>>) ?? [];
    const match =
      translations.find((t) => t.languages_code === props.languageCode) ??
      translations[0];
    return match?.[parts[1]] ?? `[${item.id}]`;
  }

  // Generic nested path
  let val: unknown = item;
  for (const part of parts) {
    if (val == null) return `[${item.id}]`;
    val = (val as Record<string, unknown>)[part];
  }
  return (val as string) ?? `[${item.id}]`;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
function buildFieldsParam(labelField: string): string[] {
  const base = ["id"];
  const parts = labelField.split(".");
  if (parts[0] === "translations") {
    base.push("translations.name", "translations.languages_code");
  } else {
    base.push(labelField);
  }
  return base;
}

async function fetchSearchResults(
  collection: string,
  searchTerm: string,
): Promise<DropdownItem[]> {
  const fields = buildFieldsParam(props.labelField);
  const params: Record<string, unknown> = {
    fields,
    limit: props.searchLimit ?? 20,
    sort: [props.labelField],
  };

  if (searchTerm.trim()) {
    const labelParts = props.labelField.split(".");
    if (labelParts[0] === "translations") {
      params.filter = {
        translations: { name: { _icontains: searchTerm.trim() } },
      };
    } else {
      params.filter = { [props.labelField]: { _icontains: searchTerm.trim() } };
    }
  }

  try {
    const res = await api.get(`/items/${collection}`, { params });
    return (res.data?.data ?? []).map((item: Record<string, unknown>) => ({
      id: String(item.id),
      label: extractLabel(item),
    }));
  } catch (e) {
    console.error(`[cascading-geo-select] Search error in ${collection}:`, e);
    return [];
  }
}

async function fetchById(
  collection: string,
  id: string,
  extraFields: string[] = [],
): Promise<Record<string, unknown> | null> {
  const fields = [...buildFieldsParam(props.labelField), ...extraFields];
  try {
    const res = await api.get(`/items/${collection}/${id}`, {
      params: { fields: [...new Set(fields)] },
    });
    return res.data?.data ?? null;
  } catch (e) {
    console.error(`[cascading-geo-select] Fetch error ${collection}/${id}:`, e);
    return null;
  }
}

// ─── Cascade resolution ───────────────────────────────────────────────────────
async function resolveCascade(
  fromField: string,
  record: Record<string, unknown>,
  visited = new Set<string>(),
): Promise<Record<string, string | null>> {
  if (visited.has(fromField)) return {};
  visited.add(fromField);

  const mappings = parsedCascades.value[fromField] ?? [];
  const updates: Record<string, string | null> = {};

  for (const mapping of mappings) {
    const fkValue = record[mapping.fk] as string | null;
    updates[mapping.to] = fkValue || null;

    if (fkValue && parsedCascades.value[mapping.to]?.length) {
      const targetLevel = parsedLevels.value.find(
        (l) => l.field === mapping.to,
      );
      if (targetLevel) {
        const targetFKFields = (parsedCascades.value[mapping.to] ?? []).map(
          (m) => m.fk,
        );
        const targetRecord = await fetchById(
          targetLevel.collection,
          fkValue,
          targetFKFields,
        );
        if (targetRecord) {
          const deeper = await resolveCascade(
            mapping.to,
            targetRecord,
            visited,
          );
          Object.assign(updates, deeper);
        }
      }
    }
  }

  return updates;
}

// ─── Init from existing form values ──────────────────────────────────────────
async function initFromValues() {
  const vals = getCurrentValues();
  for (const level of parsedLevels.value) {
    const currentId = vals[level.field] as string | null;
    if (currentId && currentId !== selectedState[level.field]?.id) {
      const item = await fetchById(level.collection, currentId);
      if (item) {
        const label = extractLabel(item);
        selectedState[level.field] = { id: currentId, label };
        searchState[level.field] = label;
      }
    } else if (!currentId) {
      selectedState[level.field] = null;
      searchState[level.field] = "";
    }
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────
function onSearchInput(fieldName: string, term: string) {
  searchState[fieldName] = term;
  selectedState[fieldName] = null;
  activeField.value = fieldName;

  clearTimeout(searchTimers[fieldName]);
  searchTimers[fieldName] = setTimeout(async () => {
    const level = parsedLevels.value.find((l) => l.field === fieldName);
    if (!level) return;
    loadingState[fieldName] = true;
    dropdownState[fieldName] = await fetchSearchResults(level.collection, term);
    loadingState[fieldName] = false;
  }, 300);
}

async function onFocus(fieldName: string) {
  activeField.value = fieldName;
  const level = parsedLevels.value.find((l) => l.field === fieldName);
  if (!level) return;
  if (!dropdownState[fieldName]?.length) {
    loadingState[fieldName] = true;
    dropdownState[fieldName] = await fetchSearchResults(
      level.collection,
      searchState[fieldName] ?? "",
    );
    loadingState[fieldName] = false;
  }
}

function onBlur(fieldName: string) {
  setTimeout(() => {
    if (activeField.value === fieldName) {
      activeField.value = null;
      if (selectedState[fieldName]) {
        searchState[fieldName] = selectedState[fieldName]!.label;
      } else {
        searchState[fieldName] = "";
      }
    }
  }, 200);
}

function closeDropdown(fieldName: string) {
  activeField.value = null;
  if (selectedState[fieldName]) {
    searchState[fieldName] = selectedState[fieldName]!.label;
  }
}

async function onSelect(level: LevelConfig, item: DropdownItem) {
  activeField.value = null;

  const levelIndex = parsedLevels.value.findIndex(
    (l) => l.field === level.field,
  );

  selectedState[level.field] = item;
  searchState[level.field] = item.label;
  dropdownState[level.field] = [];

  const updates: Record<string, string | null> = {};

  // 1. Set this field's value
  updates[level.field] = item.id;

  // 2. Clear all levels ABOVE this one (index 0 to levelIndex-1 = more specific)
  for (let i = 0; i < levelIndex; i++) {
    const upperField = parsedLevels.value[i].field;
    updates[upperField] = null;
    selectedState[upperField] = null;
    searchState[upperField] = "";
    dropdownState[upperField] = [];
  }

  // 3. Cascade downward: fetch this record's FK fields and populate downstream levels
  if (parsedCascades.value[level.field]?.length) {
    const fkFields = parsedCascades.value[level.field].map((m) => m.fk);
    const record = await fetchById(level.collection, item.id, fkFields);

    if (record) {
      const cascadeUpdates = await resolveCascade(level.field, record);

      for (const [targetField, targetId] of Object.entries(cascadeUpdates)) {
        updates[targetField] = targetId;

        if (targetId) {
          const targetLevel = parsedLevels.value.find(
            (l) => l.field === targetField,
          );
          if (targetLevel) {
            const targetRecord = await fetchById(
              targetLevel.collection,
              targetId,
            );
            if (targetRecord) {
              const label = extractLabel(targetRecord);
              selectedState[targetField] = { id: targetId, label };
              searchState[targetField] = label;
            }
          }
        } else {
          selectedState[targetField] = null;
          searchState[targetField] = "";
        }
      }

      // Clear any levels that weren't in cascade updates (downstream but no FK value)
      for (let i = levelIndex + 1; i < parsedLevels.value.length; i++) {
        const downField = parsedLevels.value[i].field;
        if (!(downField in cascadeUpdates)) {
          updates[downField] = null;
          selectedState[downField] = null;
          searchState[downField] = "";
        }
      }
    }
  } else {
    // No cascades for this level — clear all downstream
    for (let i = levelIndex + 1; i < parsedLevels.value.length; i++) {
      const downField = parsedLevels.value[i].field;
      updates[downField] = null;
      selectedState[downField] = null;
      searchState[downField] = "";
    }
  }

  applyUpdates(updates);
}

async function onClear(level: LevelConfig) {
  const levelIndex = parsedLevels.value.findIndex(
    (l) => l.field === level.field,
  );
  const updates: Record<string, string | null> = {};

  // Clear this field and everything above it (more specific) AND below (less specific)
  for (let i = 0; i <= levelIndex; i++) {
    const f = parsedLevels.value[i].field;
    updates[f] = null;
    selectedState[f] = null;
    searchState[f] = "";
    dropdownState[f] = [];
  }

  for (let i = levelIndex + 1; i < parsedLevels.value.length; i++) {
    const f = parsedLevels.value[i].field;
    updates[f] = null;
    selectedState[f] = null;
    searchState[f] = "";
  }

  applyUpdates(updates);
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  await initFromValues();
  document.addEventListener("click", handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleOutsideClick);
  Object.values(searchTimers).forEach((t) => clearTimeout(t));
});

function handleOutsideClick(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest(".cascading-hierarchy-select")) {
    activeField.value = null;
  }
}

// Watch for external value changes — covers both GROUP mode (props.values)
// and JSON mode (props.value), e.g. item load, undo/redo, navigating records
watch(
  () => getCurrentValues(),
  async (newVals) => {
    if (!newVals || !Object.keys(newVals).length) return;
    for (const level of parsedLevels.value) {
      const extId = newVals[level.field] as string | null;
      const currentId = selectedState[level.field]?.id ?? null;
      if (extId !== currentId) {
        if (extId) {
          const item = await fetchById(level.collection, extId);
          if (item) {
            const label = extractLabel(item);
            selectedState[level.field] = { id: extId, label };
            searchState[level.field] = label;
          }
        } else {
          selectedState[level.field] = null;
          searchState[level.field] = "";
        }
      }
    }
  },
  { deep: true },
);
</script>

<style scoped>
.cascading-hierarchy-select {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.mode-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cascade-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--theme--foreground-subdued, #a2b5cd);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
