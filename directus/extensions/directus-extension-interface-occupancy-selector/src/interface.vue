<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useApi, useStores } from '@directus/extensions-sdk';

type ItemId = string | number;

interface RelatedItem {
  id: ItemId;
  from_price?: boolean | string | number;
  [key: string]: any;
}

interface JunctionRow {
  id: ItemId;
  [key: string]: any;
}

interface GroupEntry {
  key: string;
  labelItem: RelatedItem;
  trueItem?: RelatedItem;
  falseItem?: RelatedItem;
}

interface SelectedGroupState {
  entry: GroupEntry;
  selectedItem: RelatedItem;
  fromPriceTrue: boolean;
}

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    value: any;
    primaryKey: ItemId;
    field: string;
    collection: string;
    displayTemplate?: string;
    groupFields?: string;
    leftPaneLabel?: string;
    rightPaneLabel?: string;
    searchPlaceholder?: string;
    noSelectionMessage?: string;
  }>(),
  {
    displayTemplate: '{{name}}',
    groupFields: '',
    leftPaneLabel: 'Available',
    rightPaneLabel: 'Selected',
    searchPlaceholder: 'Search…',
    noSelectionMessage: 'No items selected yet',
  }
);

function resolveLabel(value: string): string {
  if (value.startsWith('$t:')) {
    const key = value.slice(3).trim();
    const resolved = t(key);
    return resolved !== key ? resolved : key;
  }
  return value;
}

const resolvedLeftLabel = computed(() => resolveLabel(props.leftPaneLabel ?? 'Available'));
const resolvedRightLabel = computed(() => resolveLabel(props.rightPaneLabel ?? 'Selected'));
const resolvedSearchPlaceholder = computed(() => resolveLabel(props.searchPlaceholder ?? 'Search…'));
const resolvedNoSelectionMessage = computed(() => resolveLabel(props.noSelectionMessage ?? 'No items selected yet'));

const emit = defineEmits(['input']);
const api = useApi();

const allItems = ref<RelatedItem[]>([]);
const savedJunctionRows = ref<JunctionRow[]>([]);
const loading = ref(false);
const errorMsg = ref<string | null>(null);
const searchQuery = ref('');
const selectedGroupMap = ref<Map<string, SelectedGroupState>>(new Map());

const junctionCollection = ref<string>('');
const parentKeyField = ref<string>('');
const resolvedRelatedKey = ref<string>('');
const resolvedRelatedCollection = ref<string>('');

const parsedGroupFields = computed<string[]>(() =>
  props.groupFields
    ? props.groupFields.split(',').map((f) => f.trim()).filter(Boolean)
    : []
);

function renderLabel(item: RelatedItem): string {
  if (!props.displayTemplate) return String(item.id);
  return props.displayTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = item[key];
    if (val === null || val === undefined) return '';
    return String(val);
  });
}

function renderParts(item: RelatedItem): Array<{ text: string } | { bool: boolean }> {
  const result: Array<{ text: string } | { bool: boolean }> = [];
  const template = props.displayTemplate || String(item.id);
  let cursor = 0;
  const regex = /\{\{(\w+)\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    if (match.index > cursor) {
      result.push({ text: template.slice(cursor, match.index) });
    }
    const val = item[match[1]];
    if (val === null || val === undefined) {
      // skip
    } else if (typeof val === 'boolean') {
      result.push({ bool: val });
    } else {
      result.push({ text: String(val) });
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < template.length) result.push({ text: template.slice(cursor) });
  return result;
}

function getGroupKey(item: RelatedItem): string | null {
  if (!parsedGroupFields.value.length) return null;
  return parsedGroupFields.value.map((f) => `${f}=${item[f]}`).join('&');
}

function normalizeGroupKey(item: RelatedItem): string {
  const key = getGroupKey(item);
  return key ?? `item-${String(item.id)}`;
}

function getFromPriceFlag(item: RelatedItem): boolean {
  const value = item.from_price ?? item.fromPrice;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  if (typeof value === 'number') return value === 1;
  return false;
}

const groupedEntryMap = computed<Map<string, GroupEntry>>(() => {
  const map = new Map<string, GroupEntry>();
  for (const item of allItems.value) {
    const key = normalizeGroupKey(item);
    const existing = map.get(key);
    const isFromPriceTrue = getFromPriceFlag(item);
    if (!existing) {
      map.set(key, {
        key,
        labelItem: item,
        trueItem: isFromPriceTrue ? item : undefined,
        falseItem: isFromPriceTrue ? undefined : item,
      });
    } else {
      if (isFromPriceTrue) {
        existing.trueItem = item;
      } else {
        existing.falseItem = item;
      }
    }
  }
  return map;
});

const groupedEntries = computed(() => Array.from(groupedEntryMap.value.values()));

const availableEntries = computed(() => {
  const query = searchQuery.value?.toLowerCase() ?? '';
  return groupedEntries.value.filter((entry) => {
    if (selectedGroupMap.value.has(entry.key)) return false;
    if (!query) return true;
    return renderLabel(entry.labelItem).toLowerCase().includes(query);
  });
});

const selectedGroupStates = computed(() => Array.from(selectedGroupMap.value.values()));
const selectedCount = computed(() => selectedGroupStates.value.length);

function resolveJunctionInfo() {
  const { useRelationsStore } = useStores();
  const relationsStore = useRelationsStore();

  const relations: any[] = relationsStore.getRelationsForField(props.collection, props.field);
  const junctionRel = relations.find((r) => r.meta?.one_field === props.field);

  if (!junctionRel) {
    console.error('[occupancy-selector] Could not resolve junction relation for', props.collection, props.field);
    return;
  }

  junctionCollection.value = junctionRel.collection;
  parentKeyField.value = junctionRel.field;
  resolvedRelatedKey.value = junctionRel.meta.junction_field;

  const relatedRelations: any[] = relationsStore.getRelationsForField(
    junctionRel.collection,
    junctionRel.meta.junction_field
  );
  const relatedRel = relatedRelations.find((r) => r.field === junctionRel.meta.junction_field);

  if (relatedRel?.related_collection) {
    resolvedRelatedCollection.value = relatedRel.related_collection;
  } else {
    console.error('[occupancy-selector] Could not resolve related collection from junction', junctionRel.collection);
  }
}

async function fetchAllItems() {
  if (!resolvedRelatedCollection.value) {
    errorMsg.value = 'Could not resolve related collection from schema.';
    return;
  }
  loading.value = true;
  errorMsg.value = null;
  try {
    const res = await api.get(`/items/${resolvedRelatedCollection.value}`, {
      params: { limit: -1 },
    });
    allItems.value = res.data.data ?? [];
  } catch (e: any) {
    errorMsg.value = `Failed to load "${resolvedRelatedCollection.value}": ${e?.message ?? e}`;
  } finally {
    loading.value = false;
  }
}

async function fetchSavedSelection() {
  if (!props.primaryKey || props.primaryKey === '+') return;
  if (!resolvedRelatedKey.value || !junctionCollection.value || !parentKeyField.value) {
    console.warn('[occupancy-selector] fetchSavedSelection skipped — junction not resolved yet:', {
      resolvedRelatedKey: resolvedRelatedKey.value,
      junctionCollection: junctionCollection.value,
      parentKeyField: parentKeyField.value,
    });
    return;
  }

  try {
    const res = await api.get(`/items/${junctionCollection.value}`, {
      params: {
        filter: { [parentKeyField.value]: { _eq: props.primaryKey } },
        fields: ['id', resolvedRelatedKey.value],
        limit: -1,
      },
    });
    const rows: JunctionRow[] = res.data.data ?? [];
    savedJunctionRows.value = rows;

    const ids = rows.map((row) => row[resolvedRelatedKey.value]);
    initSelectedFromIds(ids);
  } catch (e: any) {
    console.error('[occupancy-selector] fetchSavedSelection failed:', e?.message ?? e);
  }
}

function createStateFromId(id: ItemId): SelectedGroupState | null {
  const item = allItems.value.find((i) => i.id === id);
  if (!item) return null;
  const key = normalizeGroupKey(item);
  const entry = groupedEntryMap.value.get(key);
  if (!entry) return null;
  const fromPriceTrue = getFromPriceFlag(item);
  return { entry, selectedItem: item, fromPriceTrue };
}

function initSelectedFromIds(ids: ItemId[]) {
  const next = new Map<string, SelectedGroupState>();
  for (const id of ids) {
    const state = createStateFromId(id);
    if (state) {
      next.set(state.entry.key, state);
    }
  }
  selectedGroupMap.value = next;
}

function emitDiffFromMap(map = selectedGroupMap.value) {
  const rk = resolvedRelatedKey.value;
  const newIds = new Set<ItemId>();
  for (const state of map.values()) {
    newIds.add(state.selectedItem.id);
  }

  const originalIds = new Set(
    savedJunctionRows.value.map((row) => {
      const related = row[rk];
      return typeof related === 'object' && related !== null ? related.id : related;
    })
  );

  const create = [...newIds]
    .filter((id) => !originalIds.has(id))
    .map((id) => ({ [rk]: id }));

  const del = savedJunctionRows.value
    .filter((row) => {
      const related = row[rk];
      const id = typeof related === 'object' && related !== null ? related.id : related;
      return !newIds.has(id);
    })
    .map((row) => row.id);

  emit('input', { create, update: [], delete: del });
}

function selectEntry(entry: GroupEntry) {
  if (selectedGroupMap.value.has(entry.key)) return;
  const targetItem = entry.falseItem ?? entry.trueItem;
  if (!targetItem) return;
  const next = new Map(selectedGroupMap.value);
  next.set(entry.key, {
    entry,
    selectedItem: targetItem,
    fromPriceTrue: getFromPriceFlag(targetItem),
  });
  selectedGroupMap.value = next;
  emitDiffFromMap(next);
}

function deselectEntry(key: string) {
  if (!selectedGroupMap.value.has(key)) return;
  const next = new Map(selectedGroupMap.value);
  next.delete(key);
  selectedGroupMap.value = next;
  emitDiffFromMap(next);
}

function toggleFromPrice(key: string) {
  const current = selectedGroupMap.value.get(key);
  if (!current) return;
  const entry = current.entry;
  if (!entry.trueItem || !entry.falseItem) return;
  const nextFromTrue = !current.fromPriceTrue;
  const nextItem = nextFromTrue ? entry.trueItem : entry.falseItem;
  if (!nextItem) return;
  const next = new Map(selectedGroupMap.value);
  next.set(key, {
    entry,
    selectedItem: nextItem,
    fromPriceTrue: getFromPriceFlag(nextItem),
  });
  selectedGroupMap.value = next;
  emitDiffFromMap(next);
}

function applyStagedValue(staged: any) {
  if (!staged || typeof staged !== 'object') return;
  const rk = resolvedRelatedKey.value;
  const next = new Map(selectedGroupMap.value);

  if (Array.isArray(staged.delete)) {
    for (const junctionId of staged.delete) {
      const row = savedJunctionRows.value.find((r) => r.id === junctionId);
      if (row) {
        const related = row[rk];
        const id = typeof related === 'object' && related !== null ? related.id : related;
        const state = createStateFromId(id);
        if (state) next.delete(state.entry.key);
      }
    }
  }

  if (Array.isArray(staged.create)) {
    for (const item of staged.create) {
      const id = item[rk];
      if (id !== undefined) {
        const state = createStateFromId(id);
        if (state) next.set(state.entry.key, state);
      }
    }
  }

  selectedGroupMap.value = next;
}

onMounted(async () => {
  resolveJunctionInfo();
  await fetchAllItems();
  await fetchSavedSelection();
  if (props.value) applyStagedValue(props.value);
});

watch(
  () => props.primaryKey,
  async (key) => {
    if (key && key !== '+') {
      savedJunctionRows.value = [];
      selectedGroupMap.value = new Map();
      await fetchSavedSelection();
    }
  }
);
</script>

<template>
  <div class="occupancy-selector">
    <v-notice v-if="errorMsg" type="danger">{{ errorMsg }}</v-notice>

    <div v-else-if="!loading || allItems.length" class="panes">
      <div class="pane pane-left">
        <div class="pane-header">
          <span class="pane-title">{{ resolvedLeftLabel }}</span>
        </div>

        <div class="pane-search">
          <v-input v-model="searchQuery" :placeholder="resolvedSearchPlaceholder" />
        </div>

        <div v-if="loading" class="loading-state">
          <v-progress-circular indeterminate />
        </div>

        <div v-else class="pane-list">
          <div
            v-for="entry in availableEntries"
            :key="entry.key"
            class="list-item"
            title="Click to select"
            @click="selectEntry(entry)"
          >
            <span class="item-label">
              <template v-for="(part, i) in renderParts(entry.labelItem)" :key="i">
                <span v-if="'bool' in part" class="label-text">
                </span>
                <span v-else class="label-text">{{ part.text }}</span>
              </template>
            </span>
            <v-icon name="add_circle_outline" small class="item-icon" />
          </div>

          <div v-if="availableEntries.length === 0" class="empty-state">
            {{ searchQuery ? 'No results match your search' : 'All items are selected' }}
          </div>
        </div>
      </div>

      <div class="pane pane-right">
        <div class="pane-header">
          <span class="pane-title">{{ resolvedRightLabel }}</span>
          <span class="pane-count pane-count-selected">{{ selectedCount }}</span>
        </div>

        <div class="pane-list">
          <div
            v-for="state in selectedGroupStates"
            :key="state.entry.key"
            class="list-item list-item-selected"
          >
            <span class="item-label">
              <template v-for="(part, i) in renderParts(state.selectedItem)" :key="i">
                <span v-if="'bool' in part" class="label-text">
                </span>
                <span v-else class="label-text">{{ part.text }}</span>
              </template>
            </span>
            <div class="item-actions">
              <v-icon
                :name="state.fromPriceTrue ? 'check_box' : 'check_box_outline_blank'"
                small
                class="item-icon toggle-icon"
                :class="{ 'toggle-disabled': !state.entry.trueItem || !state.entry.falseItem }"
                :title="state.fromPriceTrue ? 'Use from_price true' : 'Use from_price false'"
                @click.stop="toggleFromPrice(state.entry.key)"
              />
              <v-icon
                name="remove_circle_outline"
                small
                class="item-icon icon-remove"
                title="Remove"
                @click.stop="deselectEntry(state.entry.key)"
              />
            </div>
          </div>

          <div v-if="selectedGroupStates.length === 0" class="empty-state">
            {{ resolvedNoSelectionMessage }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.occupancy-selector {
  border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--form--field--input--background);
  overflow: hidden;
}

.panes {
  display: flex;
  min-height: 320px;
}

.pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pane-left {
  border-right: var(--theme--border-width) solid var(--theme--border-color-subdued);
}

.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--theme--background-subdued);
  border-bottom: var(--theme--border-width) solid var(--theme--border-color-subdued);
  gap: 8px;
}

.pane-title {
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--theme--foreground-subdued);
}

.pane-count {
  background: var(--theme--foreground-subdued);
  color: var(--theme--background);
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 700;
  min-width: 20px;
  text-align: center;
}

.pane-count-selected {
  background: var(--theme--primary);
}

.pane-search {
  padding: 8px;
  border-bottom: var(--theme--border-width) solid var(--theme--border-color-subdued);
}

.pane-list {
  flex: 1;
  overflow-y: auto;
  max-height: 300px;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  cursor: pointer;
  transition: background 0.12s ease;
  border-bottom: var(--theme--border-width) solid var(--theme--border-color-subdued);
  gap: 8px;
}

.list-item:last-child {
  border-bottom: none;
}

.list-item:hover {
  background: var(--theme--background-accent);
}

.list-item-selected {
  background: var(--theme--background-accent);
}

.list-item-selected:hover {
  background: var(--theme--background-normal);
}

.item-label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
  color: var(--theme--foreground);
  overflow: hidden;
  min-width: 0;
}

.label-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bool-true {
  color: var(--theme--primary);
}

.bool-false {
  color: var(--theme--foreground-subdued);
}

.item-icon {
  flex-shrink: 0;
  color: var(--theme--primary);
  opacity: 0.7;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toggle-icon {
  cursor: pointer;
}

.toggle-disabled {
  opacity: 0.4;
  cursor: default;
}

.icon-remove {
  color: var(--theme--danger);
}

.empty-state {
  padding: 28px 16px;
  text-align: center;
  color: var(--theme--foreground-subdued);
  font-size: 13px;
  font-style: italic;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}
</style>
