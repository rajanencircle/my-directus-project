<template>
  <div class="tree-node">
    <div
      class="parent-node"
      :class="{ expanded, selected }"
      @click="$emit('toggle', node.id)"
    >
      <v-icon :name="expanded ? 'folder_open' : 'folder'" class="folder-icon" />
      <span class="node-name">{{ node.name }}</span>
      <span class="item-badge">{{ node.itemCount }}</span>
      <v-icon
        :name="expanded ? 'expand_more' : 'chevron_right'"
        class="toggle-icon"
      />
    </div>

    <transition name="slide-fade">
      <div v-if="expanded" class="children-container">
        <div
          v-for="child in node.children"
          :key="child.id"
          class="child-node"
          :class="{ selected: selectedChild === child.id }"
          @click.stop="handleChildClick(child)"
        >
          <v-icon :name="child.icon || 'article'" class="child-icon" />
          <span class="child-name">{{ child.name }}</span>
          <span class="child-badge">{{ child.itemCount }}</span>
        </div>

        <div v-if="node.children.length === 0" class="no-children">
          <v-icon name="inbox" small />
          <span>No related collections</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { HierarchyNode } from "../types.ts";

interface Props {
  node: HierarchyNode;
  expanded: boolean;
  selected: boolean;
}

interface Emits {
  (e: "toggle", nodeId: string): void;
  (e: "select", node: HierarchyNode, child?: HierarchyNode): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const selectedChild = ref<string | null>(null);

const handleChildClick = (child: HierarchyNode) => {
  selectedChild.value = child.id;
  emit("select", props.node, child);
};
</script>

<style scoped>
.tree-node {
  margin-bottom: 4px;
}

.parent-node {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.parent-node:hover {
  background-color: var(--background-normal);
}

.parent-node.expanded {
  background-color: var(--background-normal);
}

.parent-node.selected {
  background-color: var(--primary-alt);
}

.folder-icon {
  color: var(--primary);
  flex-shrink: 0;
  font-size: 20px;
}

.node-name {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
}

.item-badge {
  background-color: var(--background-page);
  color: var(--foreground-subdued);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.toggle-icon {
  color: var(--foreground-subdued);
  flex-shrink: 0;
  font-size: 20px;
}

.children-container {
  margin-left: 16px;
  padding-left: 16px;
  border-left: 2px solid var(--border-subdued);
  margin-top: 4px;
}

.child-node {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 2px;
}

.child-node:hover {
  background-color: var(--background-normal);
  transform: translateX(4px);
}

.child-node.selected {
  background-color: var(--primary);
  color: var(--primary-foreground);
}

.child-node.selected .child-icon {
  color: var(--primary-foreground);
}

.child-node.selected .child-badge {
  background-color: var(--primary-foreground);
  color: var(--primary);
}

.child-icon {
  color: var(--foreground-subdued);
  flex-shrink: 0;
  font-size: 18px;
}

.child-name {
  flex: 1;
  font-size: 14px;
}

.child-badge {
  background-color: var(--background-page);
  color: var(--foreground-subdued);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.no-children {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  color: var(--foreground-subdued);
  font-size: 13px;
  font-style: italic;
}

/* Animations */
.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
