<template>
  <div
    class="cascading-hierarchy-select"
    :class="displayMode === 'grid' ? 'mode-grid' : 'mode-stack'"
  >
    <div v-for="level in parsedLevels" :key="level.field" class="cascade-field">
      <div class="field-label">
        <div class="v-text-overflow">
          {{ level.label }}
        </div>
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
          <template v-if="selectedState[level.field] || !disabled" #append>
            <v-icon
              v-if="selectedState[level.field]"
              name="close"
              small
              clickable
              @click.stop="onClear(level)"
            />
            <v-icon
              v-else-if="!disabled"
              name="add"
              small
              clickable
              @click.stop="openDrawer(level)"
            />
          </template>
        </v-input>

        <!-- Create drawer -->
        <drawer-item
          v-if="drawerLevel?.field === level.field"
          :active="drawerLevel?.field === level.field"
          :collection="level.collection"
          primary-key="+"
          @update:active="closeDrawer"
          @input="(val) => onDrawerInput(level, val)"
        />

        <!-- Dropdown -->
        <div v-if="activeField === level.field" class="dropdown">
          <!--
            Sticky filter-context chip.
            Shows which parent values are currently restricting this dropdown,
            e.g. "Country: France  ·  State: Provence"
          -->
          <div
            v-if="activeFilterHints[level.field]"
            class="dropdown-filter-hint"
          >
            <v-icon name="filter_alt" x-small />
            {{ activeFilterHints[level.field] }}
          </div>

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
    label: "State",
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
    labelField: "translations.name",
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
  region: [{ fk: "country_id", to: "country_id" }],
  country: [{ fk: "destination_id", to: "destination" }],
  destination: [{ fk: "destinations_cluster_id", to: "destination_cluster" }],
});

/**
 * DEFAULT_FILTER_MAPPINGS — upstream / parent-scoping filters
 *
 * These are the INVERSE of cascades.
 *   Cascades:       "when I select a place, read place.country_id → auto-fill country"
 *   filterMappings: "when I SEARCH for places, if country is selected,
 *                    add ?filter[country_id][_eq]=<id> to the API call"
 *
 * All active entries for a field are ANDed together.
 */
export const DEFAULT_FILTER_MAPPINGS = JSON.stringify(
  {
    place: [
      { fk: "country_id", from: "country" },
      { fk: "state_id", from: "state" },
      { fk: "region_id", from: "region" },
    ],
    state: [{ fk: "country_id", from: "country" }],
    region: [{ fk: "country_id", from: "country" }],
    destination: [{ fk: "countries_geo_id", from: "country" }], // Filter destination by country (look for destination on country)
    destination_cluster: [
      { fk: "destinations_cluster_id", from: "destination" },
    ],
  },
  null,
  2,
);
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

const api = useApi();

// ─── Type definitions ─────────────────────────────────────────────────────────

interface LevelConfig {
  field: string;
  collection: string;
  label: string;
  icon?: string;
  labelField?: string;
  /**
   * Dot-notation path to extract the display label from a newly created entry's
   * form edits (e.g. "name", "translations.name", "places_translations.name").
   * Arrays in the path are resolved by language code first, then first element.
   */
  displayField?: string;
}

interface CascadeMapping {
  fk: string;
  to: string;
}

/**
 * FilterMapping — one upstream constraint entry.
 *
 * Example on the `place` config: { fk: 'country_id', from: 'country' }
 * → "when searching places, if the `country` level has a selection,
 *    add filter[country_id][_eq]=<selected id> to the API call."
 */
interface FilterMapping {
  /** FK column on this collection that points to the parent */
  fk: string;
  /** Level field name (from parsedLevels) whose selected id to use as the filter value */
  from: string;
}

interface DropdownItem {
  id: string;
  label: string;
}

/**
 * Stored format per field in the JSON blob.
 * Saving both `id` and `collection` lets any API consumer resolve the record
 * without needing the extension's levels config.
 *
 * Example:
 * {
 *   "place":              { "id": "8cc17e4c-...", "collection": "places" },
 *   "state":              { "id": "7d21669c-...", "collection": "states" },
 *   ...
 * }
 *
 * API usage:
 *   GET /items/demo?fields=*,sadasd.place.*
 *   → sadasd.place = { id: "...", collection: "places" }
 */
interface StoredFieldValue {
  id: string;
  collection: string;
}

// ─── Helpers: stored-value ↔ raw UUID ────────────────────────────────────────

/**
 * Extract just the UUID from a stored value.
 * Accepts both the new { id, collection } shape AND legacy bare strings.
 */
function extractId(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object" && "id" in (val as object)) {
    return (val as StoredFieldValue).id ?? null;
  }
  return null;
}

function makeStoredValue(
  id: string | null,
  collection: string,
): StoredFieldValue | null {
  if (!id) return null;
  return { id, collection };
}

// ─── Props ────────────────────────────────────────────────────────────────────

const props = withDefaults(
  defineProps<{
    value?: Record<string, unknown> | null;
    values?: Record<string, unknown> | null;
    collection?: string;
    disabled?: boolean;
    levels?: string | LevelConfig[];
    cascades?: string | Record<string, CascadeMapping[]>;
    /**
     * filterMappings — controls parent-scoped filtering of dropdowns.
     *
     * When a parent-level field is selected, dropdowns of its child levels
     * are automatically restricted to only items belonging to that parent.
     *
     * Shape: { [childField]: Array<{ fk: string; from: string }> }
     *   fk   — FK column in the child collection pointing to the parent
     *   from — level field name (in `levels`) whose selected value to use
     *
     * Multiple entries per child field are ANDed together.
     * Set to {} to disable upstream filtering entirely.
     */
    filterMappings?: string | Record<string, FilterMapping[]>;
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
    filterMappings: DEFAULT_FILTER_MAPPINGS,
    languageCode: "en-GB",
    labelField: "translations.name",
    displayMode: "grid",
    searchLimit: 20,
  },
);

const emit = defineEmits(["input"]);

function getCurrentValues(): Record<string, unknown> {
  if (props.values != null) return props.values as Record<string, unknown>;
  if (props.value != null) return props.value as Record<string, unknown>;
  return {};
}

function applyUpdates(updates: Record<string, StoredFieldValue | null>) {
  emit("input", { ...getCurrentValues(), ...updates });
}

// ─── Parsed config ────────────────────────────────────────────────────────────

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

const parsedFilterMappings = computed<Record<string, FilterMapping[]>>(() => {
  try {
    const v = props.filterMappings;
    const parsed = typeof v === "string" ? JSON.parse(v) : v;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      return parsed as Record<string, FilterMapping[]>;
  } catch {
    /* fall through */
  }
  return JSON.parse(DEFAULT_FILTER_MAPPINGS) as Record<string, FilterMapping[]>;
});

// ─── UI state ─────────────────────────────────────────────────────────────────

const searchState = reactive<Record<string, string>>({});
const selectedState = reactive<Record<string, DropdownItem | null>>({});
const dropdownState = reactive<Record<string, DropdownItem[]>>({});
const loadingState = reactive<Record<string, boolean>>({});
const activeField = ref<string | null>(null);
const searchTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const drawerLevel = ref<LevelConfig | null>(null);

// ─── Upstream filter helpers ──────────────────────────────────────────────────

/**
 * Build the list of active FK constraints for a given field.
 *
 * Walks parsedFilterMappings[fieldName], checks which `from` levels currently
 * have a selection, and returns one entry per active constraint.
 *
 * Example — place with country "France" selected:
 *   → [{ fk: 'country_id', id: '<france-uuid>', fromField: 'country' }]
 */
function getUpstreamFilters(
  fieldName: string,
): Array<{ fk: string; id: string; fromField: string }> {
  const mappings = parsedFilterMappings.value[fieldName] ?? [];
  const active: Array<{ fk: string; id: string; fromField: string }> = [];
  for (const m of mappings) {
    const sel = selectedState[m.from];
    if (sel?.id) active.push({ fk: m.fk, id: sel.id, fromField: m.from });
  }
  return active;
}

/**
 * Reactive human-readable hint per field, shown at the top of the dropdown
 * when one or more parent-scope filters are active.
 *
 * Example: "Country: France  ·  State: Île-de-France"
 */
const activeFilterHints = computed<Record<string, string>>(() => {
  const result: Record<string, string> = {};
  for (const level of parsedLevels.value) {
    const filters = getUpstreamFilters(level.field);
    if (!filters.length) continue;
    result[level.field] = filters
      .map((f) => {
        const parentLabel =
          parsedLevels.value.find((l) => l.field === f.fromField)?.label ??
          f.fromField;
        const sel = selectedState[f.fromField];
        return sel ? `${parentLabel}: ${sel.label}` : "";
      })
      .filter(Boolean)
      .join("  ·  ");
  }
  return result;
});

/** Map a collection name back to its level field name (e.g. "places" -> "place") */
function collectionToField(collection: string): string | undefined {
  return parsedLevels.value.find((l) => l.collection === collection)?.field;
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

// ─── Label extraction ─────────────────────────────────────────────────────────

function extractLabel(
  item: Record<string, unknown>,
  levelField?: string,
): string {
  const level = parsedLevels.value.find((l) => l.field === levelField);
  const path = level?.labelField ?? props.labelField ?? "translations.name";
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

function buildFieldsParam(labelField: string): string[] {
  const base = ["id"];
  const parts = labelField.split(".");
  if (parts[0] === "translations") {
    base.push("translations.name", "translations.translations_id");
  } else {
    base.push(labelField);
  }
  return base;
}

/**
 * Fetch dropdown options, optionally scoped by upstream FK filters.
 *
 * Filter strategy (all clauses are ANDed together):
 *   text + 0 FK  → single filter object (original behaviour)
 *   0 text + NK  → { _and: [fk1, fk2, ...] }
 *   text + N FK  → { _and: [textFilter, fk1, fk2, ...] }
 */
async function fetchSearchResults(
  collection: string,
  searchTerm: string,
  upstreamFilters: Array<{ fk: string; id: string }> = [],
): Promise<DropdownItem[]> {
  const fields = buildFieldsParam(props.labelField);
  const params: Record<string, unknown> = {
    fields,
    limit: props.searchLimit ?? 20,
    sort: [props.labelField],
  };

  const clauses: Record<string, unknown>[] = [];

  // Text search clause
  if (searchTerm.trim()) {
    const labelParts = props.labelField.split(".");
    if (labelParts[0] === "translations") {
      clauses.push({
        translations: { name: { _icontains: searchTerm.trim() } },
      });
    } else {
      clauses.push({ [props.labelField]: { _icontains: searchTerm.trim() } });
    }
  }

  // Parent-scope FK clauses
  for (const f of upstreamFilters) {
    clauses.push({ [f.fk]: { _eq: f.id } });
  }

  if (clauses.length === 1) {
    params.filter = clauses[0];
  } else if (clauses.length > 1) {
    params.filter = { _and: clauses };
  }

  try {
    const res = await api.get(`/items/${collection}`, { params });
    return (res.data?.data ?? []).map((item: Record<string, unknown>) => ({
      id: String(item.id),
      label: extractLabel(item, collectionToField(collection)),
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
): Promise<Record<string, StoredFieldValue | null>> {
  if (visited.has(fromField)) return {};
  visited.add(fromField);

  const mappings = parsedCascades.value[fromField] ?? [];
  const updates: Record<string, StoredFieldValue | null> = {};

  for (const mapping of mappings) {
    let rawValue = record[mapping.fk];
    // Normalize into array for multi-value handling (M2M)
    const validIds: string[] = [];
    if (Array.isArray(rawValue)) {
      for (const item of rawValue) {
        if (typeof item === "object" && item !== null && "id" in item) {
          validIds.push(String((item as any).id));
        } else if (item != null) {
          validIds.push(String(item));
        }
      }
    } else if (rawValue != null) {
      validIds.push(String(rawValue));
    }

    if (validIds.length === 0) {
      updates[mapping.to] = null;
      continue;
    }

    const targetLevel = parsedLevels.value.find((l) => l.field === mapping.to);
    if (!targetLevel) continue;

    // PRESERVATION LOGIC: If the target field already has a value,
    // and that value is in the valid list, KEEP IT.
    const currentValueId = extractId(selectedState[mapping.to]?.id);
    if (currentValueId && validIds.includes(currentValueId)) {
      // Already valid, no update needed to the form value.
      continue;
    }

    // Otherwise, pick the first one.
    const fkValue = validIds[0];
    updates[mapping.to] = makeStoredValue(fkValue, targetLevel.collection);

    if (parsedCascades.value[mapping.to]?.length) {
      const targetFKFields = (parsedCascades.value[mapping.to] ?? []).map(
        (m) => m.fk,
      );
      const targetRecord = await fetchById(
        targetLevel.collection,
        fkValue,
        targetFKFields,
      );
      if (targetRecord) {
        const deeper = await resolveCascade(mapping.to, targetRecord, visited);
        Object.assign(updates, deeper);
      }
    }
  }

  return updates;
}

// ─── Init from existing form values ──────────────────────────────────────────

async function initFromValues() {
  const vals = getCurrentValues();
  for (const level of parsedLevels.value) {
    const currentId = extractId(vals[level.field]);
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
    const upstream = getUpstreamFilters(fieldName);
    dropdownState[fieldName] = await fetchSearchResults(
      level.collection,
      term,
      upstream,
    );
    loadingState[fieldName] = false;
  }, 300);
}

async function onFocus(fieldName: string) {
  activeField.value = fieldName;
  const level = parsedLevels.value.find((l) => l.field === fieldName);
  if (!level) return;

  const upstream = getUpstreamFilters(fieldName);

  /*
   * Re-fetch strategy:
   *   Upstream filters active → ALWAYS re-fetch (parent selection may have changed
   *                             since the dropdown was last opened → stale cache).
   *   No upstream filters     → only fetch when cache is empty (original behaviour,
   *                             avoids redundant API calls for unfiltered fields).
   */
  if (upstream.length > 0 || !dropdownState[fieldName]?.length) {
    loadingState[fieldName] = true;
    dropdownState[fieldName] = await fetchSearchResults(
      level.collection,
      searchState[fieldName] ?? "",
      upstream,
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

  const updates: Record<string, StoredFieldValue | null> = {};

  // 1. Set this field — store { id, collection } so API consumers know
  //    which table to query without the extension config.
  updates[level.field] = makeStoredValue(item.id, level.collection);

  // 2. Smart Clearing: Clear More Specific levels (upper index)
  //    ONLY IF they are no longer valid for this new selection.
  for (let i = 0; i < levelIndex; i++) {
    const upperLevel = parsedLevels.value[i];
    const upperField = upperLevel.field;
    const currentId = selectedState[upperField]?.id;

    if (!currentId) continue;

    // We check if this child (upperLevel) record still resolves eventually to the new selection (level).
    // This allows keeping the entire chain if it's still consistent.
    const upperFKFields = (parsedCascades.value[upperField] ?? []).map(
      (m) => m.fk,
    );

    const upperRecord = await fetchById(
      upperLevel.collection,
      currentId,
      upperFKFields,
    );

    let stillValid = false;
    if (upperRecord) {
      // We check recursively through cascades to see if 'level.field' is found with 'item.id'
      const chainUpdates = await resolveCascade(upperField, upperRecord);
      if (chainUpdates[level.field]?.id === String(item.id)) {
        stillValid = true;
      }
    }

    if (!stillValid) {
      updates[upperField] = null;
      selectedState[upperField] = null;
      searchState[upperField] = "";
    }
    dropdownState[upperField] = []; // Always bust cache
  }

  // 3. Cascade downward: fetch FK fields and populate downstream levels
  if (parsedCascades.value[level.field]?.length) {
    const fkFields = parsedCascades.value[level.field].map((m) => m.fk);

    const record = await fetchById(level.collection, item.id, fkFields);

    if (record) {
      const cascadeUpdates = await resolveCascade(level.field, record);

      for (const [targetField, storedValue] of Object.entries(cascadeUpdates)) {
        updates[targetField] = storedValue;
        dropdownState[targetField] = []; // bust cache for cascaded fields too

        const targetId = storedValue ? storedValue.id : null;
        if (targetId) {
          const targetLevel = parsedLevels.value.find(
            (l) => l.field === targetField,
          );
          if (targetLevel) {
            const labelFields = (parsedCascades.value[targetField] ?? []).map(
              (m) => {
                return m.fk;
              },
            );

            const targetRecord = await fetchById(
              targetLevel.collection,
              targetId,
              labelFields,
            );
            if (targetRecord) {
              const label = extractLabel(targetRecord, targetField);
              selectedState[targetField] = { id: targetId, label };
              searchState[targetField] = label;
            }
          }
        } else {
          selectedState[targetField] = null;
          searchState[targetField] = "";
        }
      }

      for (let i = levelIndex + 1; i < parsedLevels.value.length; i++) {
        const downField = parsedLevels.value[i].field;
        if (!(downField in cascadeUpdates)) {
          updates[downField] = null;
          selectedState[downField] = null;
          searchState[downField] = "";
          dropdownState[downField] = [];
        }
      }
    }
  } else {
    for (let i = levelIndex + 1; i < parsedLevels.value.length; i++) {
      const downField = parsedLevels.value[i].field;
      updates[downField] = null;
      selectedState[downField] = null;
      searchState[downField] = "";
      dropdownState[downField] = [];
    }
  }

  applyUpdates(updates);
}

async function onClear(level: LevelConfig) {
  const levelIndex = parsedLevels.value.findIndex(
    (l) => l.field === level.field,
  );
  const updates: Record<string, StoredFieldValue | null> = {};

  for (let i = 0; i <= levelIndex; i++) {
    const f = parsedLevels.value[i].field;
    updates[f] = null;
    selectedState[f] = null;
    searchState[f] = "";
    dropdownState[f] = [];
  }

  // Bust downstream caches too: clearing a parent removes its filter context,
  // so child dropdowns need to re-fetch unfiltered on next open.
  for (let i = levelIndex + 1; i < parsedLevels.value.length; i++) {
    const f = parsedLevels.value[i].field;
    updates[f] = null;
    selectedState[f] = null;
    searchState[f] = "";
    dropdownState[f] = [];
  }

  applyUpdates(updates);
}

// ─── Drawer (create new entry) ────────────────────────────────────────────────

function openDrawer(level: LevelConfig) {
  drawerLevel.value = level;
}

function closeDrawer() {
  drawerLevel.value = null;
}

async function onDrawerInput(level: LevelConfig, val: Record<string, unknown>) {
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
      const response = await api.post(`/items/${level.collection}`, val);
      itemData = response.data?.data ?? {};
      id = String(itemData.id);
    }

    if (!id) return;

    // For new entries, `val` (form edits) has the full nested structure the user
    // just filled in — use displayField path to extract the label from it.
    // Fall back to extractLabel (which queries the API labelField) for existing items.
    const label = level.displayField
      ? (extractFromPath(val, level.displayField) ??
        extractFromPath(itemData, level.displayField) ??
        id)
      : extractLabel(itemData, level.field);

    await onSelect(level, { id, label });
  } catch (e) {
    console.error(
      `[cascading-geo-select] Error creating item in ${level.collection}:`,
      e,
    );
  }
  drawerLevel.value = null;
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

// Watch for external value changes (item load, undo/redo, navigating records).
// extractId() handles both legacy bare UUIDs and the new { id, collection } shape.
watch(
  () => getCurrentValues(),
  async (newVals) => {
    if (!newVals || !Object.keys(newVals).length) return;
    for (const level of parsedLevels.value) {
      const extId = extractId(newVals[level.field]);
      const currentId = selectedState[level.field]?.id ?? null;
      if (extId !== currentId) {
        if (extId) {
          const fkFields = (parsedCascades.value[level.field] ?? []).map(
            (m) => m.fk,
          );

          const item = await fetchById(level.collection, extId, fkFields);
          if (item) {
            const label = extractLabel(item, level.field);
            selectedState[level.field] = { id: extId, label };
            searchState[level.field] = label;
          }
        } else {
          selectedState[level.field] = null;
          searchState[level.field] = "";
        }
        // Bust cache: filter context may have changed for children of this field
        dropdownState[level.field] = [];
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

/* Sticky filter-context chip at the top of the dropdown */
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
