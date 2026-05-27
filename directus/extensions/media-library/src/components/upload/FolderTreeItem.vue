<script setup lang="ts">
import type { Ref } from 'vue'
import { inject } from 'vue'

export interface FolderTreeNode {
  id: string
  name: string
  parent: string | null
  children: FolderTreeNode[]
}

const props = defineProps<{
  node: FolderTreeNode
  depth: number
  activeId: string | number | null
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'toggle', id: string): void
}>()

const expandedInjected = inject<Ref<Set<string>>>('folderDropdownExpanded')

function isRowExpanded(id: string): boolean {
  return expandedInjected?.value?.has(id) ?? false
}

function selected(id: string): boolean {
  return props.activeId != null && String(props.activeId) === String(id)
}
</script>

<template>
  <div class="folder-tree-node">
    <div class="folder-tree-row-wrap" :class="{ 'is-active': selected(node.id) }">
      <div
        class="folder-tree-row dropdown-item"
        role="button"
        tabindex="0"
        @click="$emit('select', node.id)"
        @keydown.enter.prevent="$emit('select', node.id)"
        @keydown.space.prevent="$emit('select', node.id)"
      >
        <div class="folder-tree-row-inner" :style="{ '--depth': String(Math.max(0, depth)) }">
          <v-icon name="folder" small class="folder-tree-icon" />
          <span class="folder-tree-label" :class="{ 'folder-tree-label--nested': depth > 0 }">
            {{ node.name }}
          </span>
          <button
            v-if="node.children.length"
            type="button"
            class="folder-tree-chevron-btn"
            :class="{ 'is-open': isRowExpanded(node.id) }"
            :title="isRowExpanded(node.id) ? 'Collapse' : 'Expand'"
            @click.stop="$emit('toggle', node.id)"
          >
            <v-icon name="chevron_right" small />
          </button>
          <span v-else class="folder-tree-chevron-spacer" aria-hidden="true" />
        </div>
      </div>
    </div>
    <div
      v-if="node.children.length && isRowExpanded(node.id)"
      class="folder-tree-children"
      :style="{ '--tree-depth': String(depth) }"
    >
      <FolderTreeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :active-id="activeId"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.folder-tree-node {
  display: flex;
  flex-direction: column;
}

.folder-tree-row-wrap {
  padding: 2px 8px;
  border-radius: 8px;
  transition: background 0.12s ease;
}

.folder-tree-row-wrap:hover {
  background: color-mix(in srgb, var(--theme--primary) 7%, transparent);
}

.folder-tree-row-wrap.is-active {
  background: var(--theme--background-subdued);
}

.folder-tree-row-wrap.is-active:hover {
  background: color-mix(in srgb, var(--theme--foreground-subdued) 12%, var(--theme--background-subdued));
}

.folder-tree-row {
  width: 100%;
  outline: none;
}

.folder-tree-row-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 8px 4px 8px calc(6px + (var(--depth, 0) * 14px));
  box-sizing: border-box;
}

.folder-tree-icon {
  flex-shrink: 0;
  color: var(--theme--foreground-subdued);
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
  text-align: left;
}

.folder-tree-label--nested {
  font-weight: 500;
  font-size: 13px;
  color: var(--theme--foreground-subdued);
}

.dropdown-item {
  font-size: 14px;
  cursor: pointer;
  color: var(--theme--foreground);
}

.folder-tree-chevron-btn {
  flex-shrink: 0;
  margin-left: auto;
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-normal);
  color: var(--theme--foreground-subdued);
  cursor: pointer;
  transition: transform 0.12s, color 0.12s, border-color 0.12s;
}

.folder-tree-chevron-btn:hover {
  color: var(--theme--foreground);
  border-color: color-mix(in srgb, var(--theme--foreground-subdued) 40%, var(--theme--border-color));
}

.folder-tree-chevron-btn.is-open :deep(.v-icon) {
  transform: rotate(90deg);
  transition: transform 0.12s;
}

.folder-tree-chevron-spacer {
  flex-shrink: 0;
  margin-left: auto;
  width: 28px;
  height: 28px;
}

.folder-tree-children {
  display: flex;
  flex-direction: column;
  margin-inline-start: 12px;
  padding-inline-start: calc(12px + (var(--tree-depth, 0) * 3px));
  border-inline-start: 1px solid var(--theme--border-color);
}
</style>
