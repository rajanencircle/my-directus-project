<template>
  <private-view title="Dynamic Hierarchy">
    <template #headline>
      <v-breadcrumb :items="breadcrumbs" />
    </template>

    <template #title-outer:prepend>
      <v-button class="header-icon" rounded disabled icon secondary>
        <v-icon name="account_tree" />
      </v-button>
    </template>

    <template #actions>
      <v-button
        v-if="activeHierarchy"
        icon
        rounded
        @click="showBuilder = true"
        v-tooltip="'Manage Hierarchies'"
      >
        <v-icon name="settings" />
      </v-button>

      <v-button v-else rounded @click="showBuilder = true">
        <v-icon name="add" left />
        Create Hierarchy
      </v-button>
    </template>

    <template #navigation>
      <dynamic-sidebar
        v-if="activeHierarchy"
        :hierarchy="activeHierarchy"
        @select="handleSelection"
        @refresh="loadActiveHierarchy"
      />
      <div v-else class="no-hierarchy">
        <v-icon name="account_tree" large />
        <p>No hierarchy configured</p>
        <v-button @click="showBuilder = true">
          Create Your First Hierarchy
        </v-button>
      </div>
    </template>

    <div class="content-area">
      <!-- Welcome state -->
      <div v-if="!activeHierarchy" class="welcome-state">
        <div class="welcome-card">
          <v-icon name="account_tree" x-large />
          <h1>Welcome to Dynamic Hierarchy</h1>
          <p>
            Automatically organize your collections based on relationships.
            Create custom hierarchical views without any configuration!
          </p>

          <div class="features">
            <div class="feature">
              <v-icon name="auto_fix_high" />
              <h3>Auto-Detection</h3>
              <p>Automatically discovers collection relationships</p>
            </div>
            <div class="feature">
              <v-icon name="build" />
              <h3>Flexible Builder</h3>
              <p>Create custom hierarchies with drag-and-drop</p>
            </div>
            <div class="feature">
              <v-icon name="save" />
              <h3>Multiple Views</h3>
              <p>Save and switch between different hierarchies</p>
            </div>
          </div>

          <v-button large @click="showBuilder = true">
            <v-icon name="add" left />
            Get Started
          </v-button>
        </div>
      </div>

      <!-- Selected item view -->
      <div v-else-if="selectedItem" class="selected-view">
        <div class="selection-header">
          <div class="title-section">
            <v-icon :name="selectedItem.icon || 'folder'" large />
            <div>
              <h1>{{ selectedItem.name }}</h1>
              <p class="subtitle">
                {{ selectedItem.collection }}
                <template v-if="selectedItem.parentName">
                  • {{ selectedItem.parentName }}
                </template>
              </p>
            </div>
          </div>

          <div class="action-buttons">
            <v-button :to="getCollectionLink()" icon rounded>
              <v-icon name="arrow_forward" />
              Open Collection
            </v-button>

            <v-button
              v-if="selectedItem.parentId"
              :to="getFilteredLink()"
              icon
              rounded
              secondary
            >
              <v-icon name="filter_alt" />
              View Filtered
            </v-button>
          </div>
        </div>

        <div class="stats">
          <div class="stat-card">
            <v-icon name="numbers" />
            <div>
              <h3>{{ selectedItem.itemCount }}</h3>
              <p>Total Items</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Default info -->
      <div v-else class="info-view">
        <v-info icon="info" title="Select an Item" type="info">
          Choose a collection from the sidebar to view details and navigate to
          items.
        </v-info>
      </div>
    </div>

    <!-- Hierarchy Builder Dialog -->
    <hierarchy-builder
      v-model="showBuilder"
      @saved="handleHierarchySaved"
      @closed="showBuilder = false"
    />
  </private-view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useApi } from "@directus/extensions-sdk";
import DynamicSidebar from "./components/DynamicSidebar.vue";
import HierarchyBuilder from "./components/HierarchyBuilder.vue";
import type { HierarchyDefinition } from "./types";
import { HierarchyManager } from "./services/HierarchyManager";

const api = useApi();
const hierarchyManager = new HierarchyManager(api);

const showBuilder = ref(false);
const activeHierarchy = ref<HierarchyDefinition | null>(null);
const selectedItem = ref<{
  name: string;
  collection: string;
  icon?: string;
  itemCount: number;
  parentId?: string;
  parentName?: string;
} | null>(null);

const breadcrumbs = computed(() => {
  const items = [{ name: "Dynamic Hierarchy", to: "" }];

  if (activeHierarchy.value) {
    items.push({
      name: activeHierarchy.value.name,
      to: "",
    });
  }

  if (selectedItem.value) {
    items.push({
      name: selectedItem.value.name,
      to: "",
    });
  }

  return items;
});

const loadActiveHierarchy = async () => {
  const hierarchy = await hierarchyManager.getActiveHierarchy();
  activeHierarchy.value = hierarchy;
};

const handleSelection = (item: any) => {
  selectedItem.value = item;
};

const handleHierarchySaved = async () => {
  await loadActiveHierarchy();
  showBuilder.value = false;
};

const getCollectionLink = () => {
  if (!selectedItem.value) return "";
  return `/content/${selectedItem.value.collection}`;
};

const getFilteredLink = () => {
  if (!selectedItem.value || !selectedItem.value.parentId) return "";

  // Find the relation field
  const filter = JSON.stringify({
    [getRelationField()]: {
      _eq: selectedItem.value.parentId,
    },
  });

  return `/content/${selectedItem.value.collection}?filter=${encodeURIComponent(filter)}`;
};

const getRelationField = (): string => {
  // This would be determined from the hierarchy configuration
  // For now, we'll use a common pattern
  if (!activeHierarchy.value) return "parent_id";

  const parentCol = activeHierarchy.value.parentCollection;
  return `${parentCol.slice(0, -1)}_id`; // e.g., continents -> continent_id
};

onMounted(async () => {
  await loadActiveHierarchy();
});
</script>

<style scoped>
.content-area {
  padding: var(--content-padding);
  padding-top: var(--content-padding-top);
  padding-bottom: var(--content-padding-bottom);
  max-width: 1400px;
  margin: 0 auto;
}

.no-hierarchy {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: var(--foreground-subdued);
  gap: 16px;
}

.welcome-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.welcome-card {
  max-width: 800px;
  text-align: center;
  padding: 48px;
  background: var(--background-page);
  border-radius: var(--border-radius-large);
}

.welcome-card h1 {
  margin: 16px 0 8px;
  font-size: 32px;
  font-weight: 700;
}

.welcome-card > p {
  color: var(--foreground-subdued);
  font-size: 16px;
  margin-bottom: 32px;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.feature {
  padding: 24px;
  background: var(--background-normal);
  border-radius: var(--border-radius);
}

.feature h3 {
  margin: 12px 0 8px;
  font-size: 18px;
  font-weight: 600;
}

.feature p {
  color: var(--foreground-subdued);
  font-size: 14px;
  margin: 0;
}

.selected-view {
  background: var(--background-page);
  border-radius: var(--border-radius-large);
  padding: 32px;
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  gap: 24px;
}

.title-section {
  display: flex;
  gap: 16px;
  align-items: center;
}

.title-section h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
}

.subtitle {
  color: var(--foreground-subdued);
  margin: 4px 0 0;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: var(--background-normal);
  border-radius: var(--border-radius);
}

.stat-card h3 {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
}

.stat-card p {
  margin: 0;
  color: var(--foreground-subdued);
  font-size: 14px;
}

.info-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
}
</style>
