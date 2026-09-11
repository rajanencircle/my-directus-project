<script setup lang="ts">
import { ref, computed, inject, onMounted, onBeforeUnmount, watch, provide } from 'vue';
import type { ComputedRef } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { collectPartnerFolderIds, partnerIdsFromCreatedBy, partnerVisuallyListFromCreatedBy, usePartnerScope } from '../../../media-library/src/composables/usePartnerScope';
import FolderTreeItem from './FolderTreeItem.vue';

type UploaderLabels = Record<string, string>
const labels = inject<ComputedRef<UploaderLabels>>('uploaderLabels')
const lbl = (key: string, fallback: string) => labels?.value?.[key] ?? fallback

interface DirectusFolder {
  id: string;
  name: string;
  parent: string | null;
  createdByPartnerIds?: string[];
  createdByPartnerVisuallyList?: string[];
  /** M2O -> destinations_cluster. Set = destination-cluster folder; null = non-destination (e.g. Portraits). */
  destinationsCluster?: number | null;
}

type FolderNode = DirectusFolder & { children: FolderNode[] };

const props = defineProps<{
  modelValue: string | null;
  excludeId?: string | null;
  /** "Other Upload" mode (Ticket 2) — only show folders NOT tied to a destinations_cluster. */
  nonDestinationOnly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
}>();

const api = useApi();
const { partnerScopeIds, isPartnerScoped, init: initPartnerScope } = usePartnerScope();

const folders = ref<DirectusFolder[]>([]);
const loading = ref(false);
const noAccess = ref(false);
const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

/** Directus sometimes returns FK as `{ id }` instead of scalar */
function normalizeParentId(parent: unknown): string | null {
  if (parent == null || parent === '') return null;
  if (typeof parent === 'object' && parent !== null && 'id' in parent) {
    const idVal = (parent as { id?: unknown }).id;
    return idVal != null && idVal !== '' ? String(idVal) : null;
  }
  return String(parent);
}

function normalizeDestinationsCluster(value: unknown): number | null {
  if (value == null || value === '') return null;
  const raw = typeof value === 'object' ? (value as { id?: unknown }).id : value;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizeFolderRaw(item: Record<string, unknown>): DirectusFolder {
  return {
    id: String(item.id ?? ''),
    name: String(item.name ?? ''),
    parent: normalizeParentId(item.parent),
    createdByPartnerIds: partnerIdsFromCreatedBy(item.created_by),
    createdByPartnerVisuallyList: partnerVisuallyListFromCreatedBy(item.created_by),
    destinationsCluster: normalizeDestinationsCluster(item.destinations_cluster),
  };
}

const visibleFolders = computed(() => {
  let list = folders.value;
  if (props.excludeId) list = list.filter((f) => f.id !== props.excludeId);
  if (props.nonDestinationOnly) list = list.filter((f) => f.destinationsCluster == null);
  return list;
});

const folderMap = computed(() => new Map(visibleFolders.value.map((f) => [String(f.id), f])));

function getSegments(id: string, visited = new Set<string>()): string[] {
  if (visited.has(id)) return [];
  visited.add(id);
  const folder = folderMap.value.get(id);
  if (!folder) return [];
  if (!folder.parent) return [folder.name];
  return [...getSegments(String(folder.parent), visited), folder.name];
}

const selectedSegments = computed(() => {
  if (!props.modelValue) return null;
  return getSegments(String(props.modelValue));
});

const folderTree = computed<FolderNode[]>(() => {
  const map = new Map<string, FolderNode>();
  for (const f of visibleFolders.value) {
    map.set(String(f.id), {
      ...f,
      id: String(f.id),
      parent: f.parent ? String(f.parent) : null,
      children: [],
    });
  }

  const roots: FolderNode[] = [];
  for (const node of map.values()) {
    if (node.parent && map.has(node.parent)) {
      map.get(node.parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function sortTree(nodes: FolderNode[]) {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) sortTree(n.children);
  }
  sortTree(roots);

  return roots;
});

const expanded = ref<Set<string>>(new Set());
provide('folderDropdownExpanded', expanded);

function toggleExpand(id: string) {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}

function expandAncestors(folderId: string) {
  const next = new Set(expanded.value);
  let cur = folderMap.value.get(folderId);
  const visited = new Set<string>();
  while (cur?.parent && !visited.has(String(cur.parent))) {
    visited.add(String(cur.parent));
    next.add(String(cur.parent));
    cur = folderMap.value.get(String(cur.parent));
  }
  expanded.value = next;
}

function select(id: string | null) {
  emit('update:modelValue', id);
  isOpen.value = false;
}

function handleOutsideClick(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
}

async function fetchFolders(opts?: { silent?: boolean }) {
  const silent = opts?.silent === true;
  if (!silent) loading.value = true;
  try {
    await initPartnerScope();
    let rows: Record<string, unknown>[] = [];
    try {
      const res = await api.get('/folders', {
        params: {
          limit: -1,
          fields: [
            'id',
            'name',
            'parent',
            'destinations_cluster',
            'created_by.partner_selected.partner_id.id',
            'created_by.partner_selected.partner_id.visually',
          ],
        },
      });
      rows = Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      const res = await api.get('/folders', {
        params: {
          limit: -1,
          fields: 'id,name,parent,destinations_cluster',
        },
      });
      rows = Array.isArray(res.data?.data) ? res.data.data : [];
    }
    const all = rows.map((r: Record<string, unknown>) => normalizeFolderRaw(r));
    if (isPartnerScoped.value && (partnerScopeIds.value?.length ?? 0) > 0) {
      const allowed = await collectPartnerFolderIds(api, partnerScopeIds.value ?? [], all);
      folders.value = all.filter((f) => allowed.has(f.id));
    } else {
      folders.value = all;
    }
  } catch (e: any) {
    if (e?.response?.status === 403) {
      noAccess.value = true;
    }
    if (!silent) {
      folders.value = [];
    }
  } finally {
    if (!silent) loading.value = false;
  }
}

onMounted(async () => {
  document.addEventListener('click', handleOutsideClick, true);
  await fetchFolders();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick, true);
});

watch(
  () => isOpen.value,
  (open) => {
    if (!open) return;
    if (props.modelValue) expandAncestors(String(props.modelValue));
    fetchFolders({ silent: folders.value.length > 0 });
  },
);
</script>

<template>
  <div ref="dropdownRef" class="folder-dropdown">
    <button
      class="trigger"
      type="button"
      :disabled="loading || noAccess"
      @click.stop="isOpen = !isOpen"
    >
      <v-icon name="folder" small class="trigger-icon" />
      <span v-if="noAccess" class="placeholder subdued">{{ lbl('folderNoAccess', 'No folders available.') }}</span>
      <span v-else-if="loading" class="placeholder subdued">{{ lbl('folderLoading', 'Loading folders…') }}</span>
      <span v-else-if="selectedSegments" class="path">
        <span class="seg-root">{{ selectedSegments[0] }}</span>
        <span v-if="selectedSegments.length > 1" class="seg-sub">
          &nbsp;/&nbsp;{{ selectedSegments.slice(1).join('\u00a0/\u00a0') }}
        </span>
      </span>
      <span v-else class="placeholder trigger-library">
        <span class="trigger-library-title">{{ lbl('folderRoot', 'File Library') }}</span>
      </span>
      <v-icon name="expand_more" small class="chevron" :class="{ open: isOpen }" />
    </button>

    <div v-if="isOpen && !noAccess && !loading" class="dropdown-list">
      <div
        class="folder-tree-row folder-tree-root dropdown-item"
        :class="{ 'is-active': modelValue === null }"
        role="button"
        tabindex="0"
        @click="select(null)"
        @keydown.enter.prevent="select(null)"
        @keydown.space.prevent="select(null)"
      >
        <div class="folder-tree-row-inner folder-tree-row-inner--root">
          <v-icon name="folder_special" small class="folder-tree-icon folder-tree-icon--root" />
          <span class="folder-tree-label folder-tree-label--root">
            <span class="folder-tree-label-title">{{ lbl('folderRoot', 'File Library') }}</span>
          </span>
          <span class="folder-tree-chevron-spacer" />
        </div>
      </div>

      <div class="folder-tree">
        <FolderTreeItem
          v-for="(node, index) in folderTree"
          :key="node.id"
          :node="node"
          :depth="0"
          :active-id="modelValue"
          :is-last="index === folderTree.length - 1"
          @select="select"
          @toggle="toggleExpand"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.folder-dropdown {
  position: relative;
  width: 100%;
  min-width: 0;
}

.trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  min-height: 40px;
  padding: 8px 10px;
  box-sizing: border-box;
  background: var(--theme--form--field--input--background, var(--theme--background-normal));
  border: var(--theme--border-width, 1px) solid var(--theme--form--field--input--border-color, var(--theme--border-color));
  border-radius: var(--theme--border-radius, 6px);
  color: var(--theme--form--field--input--foreground, var(--theme--foreground));
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: border-color var(--fast, 0.15s) var(--transition, ease);
}

.trigger:hover:not(:disabled) {
  border-color: var(--theme--form--field--input--border-color-hover, var(--theme--primary));
}

.trigger:focus-visible:not(:disabled) {
  border-color: var(--theme--form--field--input--border-color-focus, var(--theme--primary));
  outline: none;
}

.trigger:disabled {
  opacity: 0.6;
  cursor: default;
}

.trigger-icon {
  flex-shrink: 0;
  color: var(--theme--foreground-subdued);
}

.path {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.placeholder {
  flex: 1;
  color: var(--theme--foreground-subdued);
}

.trigger-library {
  display: flex;
  align-items: center;
  min-width: 0;
}

.trigger-library-title {
  color: var(--theme--foreground);
}

.chevron {
  flex-shrink: 0;
  color: var(--theme--foreground-subdued);
  transition: transform 0.15s;
}

.chevron.open {
  transform: rotate(180deg);
}

.dropdown-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 300px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 4px 0 6px;
  background: var(--theme--background-normal);
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  box-shadow: var(--theme--elevation-medium);
  z-index: 100;
  min-width: 0;
}

.dropdown-item {
  cursor: pointer;
  color: var(--theme--foreground);
  transition: background var(--fast) var(--transition);
}

.folder-tree {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.folder-tree-row {
  width: 100%;
  min-width: 0;
  outline: none;
}

.folder-tree-root {
  padding: 2px 6px;
  margin: 0 2px;
  border-radius: var(--theme--border-radius);
  transition: background var(--fast) var(--transition);
}

.folder-tree-root:hover {
  background: color-mix(in srgb, var(--theme--primary) 7%, transparent);
}

.folder-tree-root.is-active {
  background: var(--theme--background-subdued);
}

.folder-tree-root.is-active:hover {
  background: color-mix(in srgb, var(--theme--foreground-subdued) 12%, var(--theme--background-subdued));
}

.folder-tree-row-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  min-height: 36px;
  padding: 6px 4px;
  box-sizing: border-box;
}

.folder-tree-row-inner--root {
  padding-inline: 4px;
}

.folder-tree-icon {
  flex-shrink: 0;
  color: var(--theme--foreground-subdued);
}

.folder-tree-icon--root {
  color: var(--theme--foreground);
}

.folder-tree-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--theme--foreground);
}

.folder-tree-label--root {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
}

.folder-tree-label-title {
  color: var(--theme--foreground);
}

.folder-tree-label-sub {
  color: var(--theme--foreground-subdued);
}

.folder-tree-chevron-spacer {
  flex-shrink: 0;
  margin-inline-start: auto;
  width: 24px;
  height: 24px;
}

.folder-tree-root + .folder-tree {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--theme--border-color);
}

.seg-root {
  flex-shrink: 0;
}

.seg-sub {
  color: var(--theme--foreground-subdued);
  overflow: hidden;
  text-overflow: ellipsis;
}

.subdued {
  color: var(--theme--foreground-subdued);
}
</style>
