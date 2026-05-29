<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, provide } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import FolderTreeItem from './FolderTreeItem.vue';

interface DirectusFolder {
  id: string;
  name: string;
  parent: string | null;
}

type FolderNode = DirectusFolder & { children: FolderNode[] };

const props = defineProps<{
  modelValue: string | null;
  excludeId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
}>();

const api = useApi();

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

function normalizeFolderRaw(item: Record<string, unknown>): DirectusFolder {
  return {
    id: String(item.id ?? ''),
    name: String(item.name ?? ''),
    parent: normalizeParentId(item.parent),
  };
}

const visibleFolders = computed(() =>
  props.excludeId ? folders.value.filter((f) => f.id !== props.excludeId) : folders.value
);

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
    const res = await api.get('/folders', {
      params: {
        limit: -1,
        fields: 'id,name,parent',
      },
    });
    const rows = Array.isArray(res.data?.data) ? res.data.data : [];
    folders.value = rows.map((r: Record<string, unknown>) => normalizeFolderRaw(r));
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
      <span v-if="noAccess" class="placeholder subdued">No folders available.</span>
      <span v-else-if="loading" class="placeholder subdued">Loading folders…</span>
      <span v-else-if="selectedSegments" class="path">
        <span class="seg-root">{{ selectedSegments[0] }}</span>
        <span v-if="selectedSegments.length > 1" class="seg-sub">
          &nbsp;/&nbsp;{{ selectedSegments.slice(1).join('\u00a0/\u00a0') }}
        </span>
      </span>
      <span v-else class="placeholder trigger-library">
        <span class="trigger-library-title">File Library</span>
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
            <span class="folder-tree-label-title">File Library</span>
          </span>
          <span class="folder-tree-chevron-spacer" />
        </div>
      </div>

      <div class="folder-tree">
        <FolderTreeItem
          v-for="node in folderTree"
          :key="node.id"
          :node="node"
          :depth="0"
          :active-id="modelValue"
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
  font-family: var(--theme--fonts--sans--font-family);
}

.trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: var(--theme--form--field--input--padding);
  background: var(--theme--background-normal);
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  color: var(--theme--foreground);
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s;
}

.trigger:hover:not(:disabled) {
  border-color: var(--theme--primary);
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
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  min-width: 0;
}

.trigger-library-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--theme--foreground);
}

.trigger-library-sub {
  font-size: 12px;
  font-weight: 500;
  color: var(--theme--foreground-subdued);
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
  overflow-y: auto;
  padding: 8px 0 10px;
  background: var(--theme--background-normal);
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 100;
}

.dropdown-item {
  font-size: 14px;
  cursor: pointer;
  color: var(--theme--foreground);
  transition: background 0.1s;
}

.folder-tree {
  display: flex;
  flex-direction: column;
}

.folder-tree-row {
  width: 100%;
  outline: none;
}

.folder-tree-root {
  padding: 2px 8px;
  margin: 0 4px;
  border-radius: 8px;
  transition: background 0.12s ease;
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
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 8px 4px;
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
  font-weight: 650;
  font-size: 14px;
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
  font-size: 13px;
  font-weight: 500;
  color: var(--theme--foreground-subdued);
}

.folder-tree-chevron-spacer {
  flex-shrink: 0;
  margin-left: auto;
  width: 28px;
  height: 28px;
}

.folder-tree-root + .folder-tree {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--theme--border-color);
}

.seg-root {
  font-weight: 600;
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
