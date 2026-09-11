<script setup lang="ts">
import type { Ref } from 'vue'
import { computed, inject } from 'vue'
import { partnerAccentStyleForList } from '../../utils/partnerAccent'

export interface FolderTreeNode {
  id: string
  name: string
  parent: string | null
  children: FolderTreeNode[]
  createdByPartnerVisuallyList?: string[]
}

const props = defineProps<{
  node: FolderTreeNode
  depth: number
  activeId: string | number | null
  isLast?: boolean
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'toggle', id: string): void
}>()

const expandedInjected = inject<Ref<Set<string>>>('folderDropdownExpanded')
const statsLabelFn = inject<(folderId: string | null) => string | null>('folderDropdownStatsLabel')

const accentStyle = computed(() => partnerAccentStyleForList(props.node.createdByPartnerVisuallyList))

function statsLabel(id: string): string | null {
  return statsLabelFn?.(id) ?? null
}

function isRowExpanded(id: string): boolean {
  return expandedInjected?.value?.has(id) ?? false
}

function selected(id: string): boolean {
  return props.activeId != null && String(props.activeId) === String(id)
}
</script>

<template>
  <div
    class="folder-tree-node"
    :class="{ 'has-partner-accent': !!accentStyle }"
    :style="{
      ...accentStyle,
      '--folder-depth': String(Math.max(0, depth)),
    }"
  >
    <div
      class="folder-tree-row"
      :class="{ 'is-active': selected(node.id) }"
      role="button"
      tabindex="0"
      @click="$emit('select', node.id)"
      @keydown.enter.prevent="$emit('select', node.id)"
      @keydown.space.prevent="$emit('select', node.id)"
    >
      <span v-if="accentStyle" class="folder-accent-bar" aria-hidden="true" />
      <v-icon name="folder" small class="folder-tree-icon" />
      <span class="folder-tree-label">
        <span class="folder-tree-name">{{ node.name }}</span>
        <span v-if="statsLabel(node.id)" class="folder-tree-meta">{{ statsLabel(node.id) }}</span>
      </span>
      <button
        v-if="node.children.length"
        type="button"
        class="folder-tree-chevron"
        :class="{ 'is-open': isRowExpanded(node.id) }"
        :title="isRowExpanded(node.id) ? 'Collapse' : 'Expand'"
        @click.stop="$emit('toggle', node.id)"
      >
        <v-icon name="expand_more" small />
      </button>
      <span v-else class="folder-tree-chevron-spacer" aria-hidden="true" />
    </div>

    <div
      v-if="node.children.length && isRowExpanded(node.id)"
      class="folder-tree-children"
    >
      <FolderTreeItem
        v-for="(child, index) in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :active-id="activeId"
        :is-last="index === node.children.length - 1"
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
  min-width: 0;
}

.folder-tree-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  margin: 0;
  padding: 6px 10px 6px calc(12px + (var(--folder-depth, 0) * 18px));
  box-sizing: border-box;
  cursor: pointer;
  outline: none;
  color: var(--theme--foreground);
  transition: background 0.12s ease;
}

.folder-tree-row:hover {
  background: color-mix(in srgb, var(--theme--foreground) 5%, transparent);
}

.folder-tree-row.is-active {
  background: var(--theme--background-subdued);
}

.folder-accent-bar {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: calc(var(--folder-depth, 0) * 18px);
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--partner-accent);
  pointer-events: none;
}

.has-partner-accent .folder-tree-icon {
  color: var(--partner-accent);
}

.folder-tree-icon {
  flex-shrink: 0;
  color: var(--theme--foreground-subdued);
}

.folder-tree-label {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}

.folder-tree-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--theme--foreground);
}

.folder-tree-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--theme--foreground-subdued);
}

.folder-tree-chevron {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--theme--foreground-subdued);
  cursor: pointer;
}

.folder-tree-chevron:hover {
  color: var(--theme--foreground);
  background: color-mix(in srgb, var(--theme--foreground) 8%, transparent);
}

.folder-tree-chevron.is-open {
  color: var(--theme--primary);
}

.folder-tree-chevron :deep(.v-icon) {
  transition: transform 0.12s ease;
}

.folder-tree-chevron.is-open :deep(.v-icon) {
  transform: rotate(180deg);
}

.folder-tree-chevron-spacer {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
}

.folder-tree-children {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>
