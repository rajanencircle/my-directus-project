<template>
  <div class="dynamic-sidebar">
    <div class="sidebar-header">
      <div class="header-content">
        <v-icon :name="hierarchy.icon || 'account_tree'" />
        <h2>{{ hierarchy.name }}</h2>
      </div>

      <v-button icon x-small @click="$emit('refresh')" v-tooltip="'Refresh'">
        <v-icon name="refresh" />
      </v-button>
    </div>

    <div v-if="loading" class="loading-state">
      <v-progress-circular indeterminate />
      <p>Loading hierarchy...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <v-icon name="error" />
      <p>{{ error }}</p>
      <v-button small secondary @click="loadData">Retry</v-button>
    </div>

    <div v-else class="tree-container">
      <div class="search-bar">
        <v-input
          v-model="searchQuery"
          placeholder="Search..."
          :disabled="loading"
        >
          <template #prepend>
            <v-icon name="search" />
          </template>
          <template #append v-if="searchQuery">
            <v-icon name="close" clickable @click="searchQuery = ''" />
          </template>
        </v-input>
      </div>

      <div class="expand-controls">
        <v-button x-small text @click="expandAll">
          <v-icon name="unfold_more" small left />
          Expand All
        </v-button>
        <v-button x-small text @click="collapseAll">
          <v-icon name="unfold_less" small left />
          Collapse All
        </v-button>
      </div>

      <div class="tree-content">
        <tree-node
          v-for="node in filteredNodes"
          :key="node.id"
          :node="node"
          :expanded="expandedNodes.has(node.id)"
          :selected="selectedNodeId === node.id"
          @toggle="toggleNode"
          @select="selectNode"
        />

        <div v-if="filteredNodes.length === 0" class="empty-state">
          <v-icon name="search_off" />
          <p>No results found</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useApi } from "@directus/extensions-sdk";
import TreeNode from "./TreeNode.vue";
import type { HierarchyDefinition, HierarchyNode } from "../types";
import { HierarchyManager } from "../services/HierarchyManager";

interface Props {
  hierarchy: HierarchyDefinition;
}

interface Emits {
  (e: "select", item: any): void;
  (e: "refresh"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const api = useApi();
const hierarchyManager = new HierarchyManager(api);

const loading = ref(true);
const error = ref<string | null>(null);
const nodes = ref<HierarchyNode[]>([]);
const expandedNodes = ref<Set<string>>(new Set());
const selectedNodeId = ref<string | null>(null);
const searchQuery = ref("");

const filteredNodes = computed(() => {
  if (!searchQuery.value.trim()) {
    return nodes.value;
  }

  const query = searchQuery.value.toLowerCase();
  return nodes.value.filter((node) => matchesSearch(node, query));
});

const matchesSearch = (node: HierarchyNode, query: string): boolean => {
  // Check node name
  if (node.name.toLowerCase().includes(query)) {
    return true;
  }

  // Check children
  return node.children.some((child) =>
    child.name.toLowerCase().includes(query),
  );
};

const loadData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const data = await hierarchyManager.loadHierarchyData(props.hierarchy);
    nodes.value = data;

    // Auto-expand first node
    if (data.length > 0 && expandedNodes.value.size === 0) {
      expandedNodes.value.add(data[0].id);
    }
  } catch (err: any) {
    error.value = err.message || "Failed to load hierarchy data";
    console.error("Error loading hierarchy:", err);
  } finally {
    loading.value = false;
  }
};

const toggleNode = (nodeId: string) => {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId);
  } else {
    expandedNodes.value.add(nodeId);
  }
};

const selectNode = (node: HierarchyNode, child?: HierarchyNode) => {
  if (child) {
    // Child collection selected
    selectedNodeId.value = child.id;
    emit("select", {
      name: child.name,
      collection: child.collection,
      icon: child.icon,
      itemCount: child.itemCount,
      parentId: node.id,
      parentName: node.name,
    });
  } else {
    // Parent node selected
    selectedNodeId.value = node.id;
    emit("select", {
      name: node.name,
      collection: node.collection,
      icon: "folder",
      itemCount: node.itemCount,
    });
  }
};

const expandAll = () => {
  nodes.value.forEach((node) => {
    expandedNodes.value.add(node.id);
  });
};

const collapseAll = () => {
  expandedNodes.value.clear();
};

watch(
  () => props.hierarchy,
  async (newHierarchy) => {
    if (newHierarchy) {
      await loadData();
    }
  },
  { immediate: false },
);

onMounted(async () => {
  await loadData();
});
</script>

<style scoped>
.dynamic-sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--background-subdued);
  border-right: var(--border-width) solid var(--border-subdued);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: var(--border-width) solid var(--border-subdued);
  background: var(--background-page);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-content h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 16px;
  color: var(--foreground-subdued);
  text-align: center;
}

.tree-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-bar {
  padding: 12px;
  border-bottom: var(--border-width) solid var(--border-subdued);
}

.expand-controls {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: var(--border-width) solid var(--border-subdued);
  background: var(--background-normal);
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 12px;
  color: var(--foreground-subdued);
  text-align: center;
}
</style>
