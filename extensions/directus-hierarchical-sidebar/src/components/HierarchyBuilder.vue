<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @esc="handleClose"
    persistent
  >
    <v-card class="hierarchy-builder">
      <v-card-title>
        <span v-if="mode === 'create'">Create Hierarchy</span>
        <span v-else-if="mode === 'edit'">Edit Hierarchy</span>
        <span v-else>Manage Hierarchies</span>
      </v-card-title>

      <v-card-text>
        <!-- List Mode -->
        <div v-if="mode === 'list'" class="list-mode">
          <div class="mode-header">
            <v-button @click="mode = 'create'">
              <v-icon name="add" left />
              Create New Hierarchy
            </v-button>

            <v-button
              icon
              @click="showAutoDetect = true"
              v-tooltip="'Auto-Detect Hierarchies'"
            >
              <v-icon name="auto_fix_high" />
            </v-button>
          </div>

          <div v-if="hierarchies.length === 0" class="empty-list">
            <v-icon name="account_tree" large />
            <p>No hierarchies created yet</p>
            <v-button @click="mode = 'create'">
              Create Your First Hierarchy
            </v-button>
          </div>

          <div v-else class="hierarchy-list">
            <div
              v-for="hierarchy in hierarchies"
              :key="hierarchy.id"
              class="hierarchy-item"
              :class="{ active: hierarchy.id === activeHierarchyId }"
            >
              <div class="hierarchy-info" @click="setActive(hierarchy.id)">
                <v-icon :name="hierarchy.icon || 'account_tree'" />
                <div class="info-content">
                  <h3>{{ hierarchy.name }}</h3>
                  <p>
                    {{ hierarchy.parentCollection }} →
                    {{ hierarchy.childCollections.length }} collections
                  </p>
                </div>
                <v-icon
                  v-if="hierarchy.id === activeHierarchyId"
                  name="check_circle"
                  class="active-indicator"
                />
              </div>

              <div class="hierarchy-actions">
                <v-button
                  icon
                  x-small
                  @click="editHierarchy(hierarchy)"
                  v-tooltip="'Edit'"
                >
                  <v-icon name="edit" small />
                </v-button>

                <v-button
                  icon
                  x-small
                  @click="duplicateHierarchy(hierarchy)"
                  v-tooltip="'Duplicate'"
                >
                  <v-icon name="content_copy" small />
                </v-button>

                <v-button
                  icon
                  x-small
                  @click="exportHierarchy(hierarchy)"
                  v-tooltip="'Export'"
                >
                  <v-icon name="download" small />
                </v-button>

                <v-button
                  icon
                  x-small
                  danger
                  @click="confirmDelete(hierarchy)"
                  v-tooltip="'Delete'"
                >
                  <v-icon name="delete" small />
                </v-button>
              </div>
            </div>
          </div>

          <div class="import-section">
            <v-button secondary @click="showImport = true">
              <v-icon name="upload" left />
              Import Hierarchy
            </v-button>
          </div>
        </div>

        <!-- Create/Edit Mode -->
        <div
          v-else-if="mode === 'create' || mode === 'edit'"
          class="editor-mode"
        >
          <v-notice v-if="detectionLoading" type="info">
            <v-progress-circular indeterminate small />
            Analyzing your collections and relationships...
          </v-notice>

          <v-notice v-else-if="suggestions.length > 0" type="success">
            <v-icon name="lightbulb" left />
            Found {{ suggestions.length }} potential hierarchies!
            <a @click="showSuggestions = true">View suggestions</a>
          </v-notice>

          <div class="form-grid">
            <v-input
              v-model="editForm.name"
              label="Hierarchy Name"
              placeholder="e.g., Geographic Organization"
              required
            />

            <v-input
              v-model="editForm.description"
              label="Description (Optional)"
              placeholder="Organize content by location"
            />
          </div>

          <div class="section-divider">
            <h3>Select Parent Collection</h3>
            <p>Choose the collection that will act as folders</p>
          </div>

          <div class="collection-selector">
            <div
              v-for="collection in availableCollections"
              :key="collection.collection"
              class="collection-card"
              :class="{
                selected: editForm.parentCollection === collection.collection,
              }"
              @click="selectParent(collection.collection)"
            >
              <v-icon :name="collection.icon" />
              <div class="card-info">
                <h4>{{ collection.name }}</h4>
                <p>{{ collection.itemCount }} items</p>
              </div>
              <v-icon
                v-if="editForm.parentCollection === collection.collection"
                name="check_circle"
                class="selected-icon"
              />
            </div>
          </div>

          <div v-if="editForm.parentCollection" class="section-divider">
            <h3>Select Child Collections</h3>
            <p>Choose which collections to include in this hierarchy</p>
          </div>

          <div v-if="editForm.parentCollection" class="child-selector">
            <v-notice v-if="possibleChildren.length === 0" type="warning">
              No related collections found for {{ editForm.parentCollection }}.
              Make sure you have Many-to-One relationships set up.
            </v-notice>

            <div
              v-for="child in possibleChildren"
              :key="child.childCollection"
              class="child-card"
              :class="{ selected: isChildSelected(child.childCollection) }"
              @click="toggleChild(child.childCollection)"
            >
              <v-checkbox
                :model-value="isChildSelected(child.childCollection)"
                @click.stop="toggleChild(child.childCollection)"
              />
              <v-icon :name="child.icon || 'article'" />
              <div class="card-info">
                <h4>{{ child.childCollectionName }}</h4>
                <p>via {{ child.relationField }}</p>
              </div>
            </div>
          </div>

          <div
            v-if="editForm.childCollections.length > 0"
            class="preview-section"
          >
            <h3>Preview</h3>
            <div class="preview-tree">
              <div class="preview-parent">
                <v-icon name="folder" />
                {{ editForm.parentCollection }} (Parent)
              </div>
              <div class="preview-children">
                <div
                  v-for="child in editForm.childCollections"
                  :key="child"
                  class="preview-child"
                >
                  <v-icon name="article" />
                  {{ child }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-button secondary @click="handleCancel">
          {{ mode === "list" ? "Close" : "Cancel" }}
        </v-button>

        <v-button
          v-if="mode === 'create' || mode === 'edit'"
          :disabled="!canSave"
          :loading="saving"
          @click="handleSave"
        >
          <v-icon name="save" left />
          {{ mode === "create" ? "Create Hierarchy" : "Save Changes" }}
        </v-button>
      </v-card-actions>
    </v-card>

    <!-- Auto-Detect Dialog -->
    <auto-detect-dialog
      v-model="showAutoDetect"
      :suggestions="suggestions"
      @select="applySuggestion"
    />

    <!-- Import Dialog -->
    <import-dialog v-model="showImport" @import="handleImport" />

    <!-- Delete Confirmation -->
    <v-dialog v-model="showDeleteConfirm" @esc="showDeleteConfirm = false">
      <v-card>
        <v-card-title>Delete Hierarchy?</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ hierarchyToDelete?.name }}"? This
          action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-button secondary @click="showDeleteConfirm = false"
            >Cancel</v-button
          >
          <v-button danger @click="handleDelete">Delete</v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useApi } from "@directus/extensions-sdk";
import AutoDetectDialog from "./AutoDetectDialog.vue";
import ImportDialog from "./ImportDialog.vue";
import type {
  HierarchyDefinition,
  CollectionMetadata,
  DetectedRelationship,
} from "../types";
import { HierarchyManager } from "../services/HierarchyManager";
import { RelationshipService } from "../services/RelationshipService";

interface Props {
  modelValue: boolean;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
  (e: "saved"): void;
  (e: "closed"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const api = useApi();
const hierarchyManager = new HierarchyManager(api);
const relationshipService = new RelationshipService(api);

const mode = ref<"list" | "create" | "edit">("list");
const hierarchies = ref<HierarchyDefinition[]>([]);
const activeHierarchyId = ref<string | null>(null);
const availableCollections = ref<CollectionMetadata[]>([]);
const possibleChildren = ref<DetectedRelationship[]>([]);
const suggestions = ref<any[]>([]);
const detectionLoading = ref(false);
const saving = ref(false);

const showAutoDetect = ref(false);
const showImport = ref(false);
const showDeleteConfirm = ref(false);
const showSuggestions = ref(false);
const hierarchyToDelete = ref<HierarchyDefinition | null>(null);

const editForm = ref({
  id: "",
  name: "",
  description: "",
  parentCollection: "",
  childCollections: [] as string[],
  icon: "account_tree",
  enabled: true,
});

const canSave = computed(() => {
  return (
    editForm.value.name.trim() !== "" &&
    editForm.value.parentCollection !== "" &&
    editForm.value.childCollections.length > 0
  );
});

const isChildSelected = (collection: string) => {
  return editForm.value.childCollections.includes(collection);
};

const loadHierarchies = async () => {
  const saved = await hierarchyManager.loadHierarchies();
  hierarchies.value = saved.hierarchies;
  activeHierarchyId.value = saved.activeHierarchy || null;
};

const loadCollections = async () => {
  detectionLoading.value = true;

  try {
    availableCollections.value =
      await relationshipService.getAllCollectionMetadata(false);
    suggestions.value = await relationshipService.suggestHierarchies();
  } catch (err) {
    console.error("Error loading collections:", err);
  } finally {
    detectionLoading.value = false;
  }
};

const selectParent = async (collection: string) => {
  editForm.value.parentCollection = collection;
  editForm.value.childCollections = [];

  // Load possible children
  possibleChildren.value =
    await relationshipService.getChildCollections(collection);
};

const toggleChild = (collection: string) => {
  const index = editForm.value.childCollections.indexOf(collection);
  if (index > -1) {
    editForm.value.childCollections.splice(index, 1);
  } else {
    editForm.value.childCollections.push(collection);
  }
};

const handleSave = async () => {
  saving.value = true;

  try {
    if (mode.value === "create") {
      await hierarchyManager.createHierarchy(
        editForm.value.name,
        editForm.value.parentCollection,
        editForm.value.childCollections,
        {
          description: editForm.value.description,
          icon: editForm.value.icon,
        },
      );
    } else if (mode.value === "edit") {
      await hierarchyManager.updateHierarchy(editForm.value.id, {
        name: editForm.value.name,
        description: editForm.value.description,
        parentCollection: editForm.value.parentCollection,
        childCollections: editForm.value.childCollections,
        icon: editForm.value.icon,
      });
    }

    await loadHierarchies();
    emit("saved");
    mode.value = "list";
    resetForm();
  } catch (err) {
    console.error("Error saving hierarchy:", err);
  } finally {
    saving.value = false;
  }
};

const handleCancel = () => {
  if (mode.value === "list") {
    handleClose();
  } else {
    mode.value = "list";
    resetForm();
  }
};

const handleClose = () => {
  emit("update:modelValue", false);
  emit("closed");
  mode.value = "list";
  resetForm();
};

const resetForm = () => {
  editForm.value = {
    id: "",
    name: "",
    description: "",
    parentCollection: "",
    childCollections: [],
    icon: "account_tree",
    enabled: true,
  };
  possibleChildren.value = [];
};

const editHierarchy = (hierarchy: HierarchyDefinition) => {
  editForm.value = {
    id: hierarchy.id,
    name: hierarchy.name,
    description: hierarchy.description || "",
    parentCollection: hierarchy.parentCollection,
    childCollections: [...hierarchy.childCollections],
    icon: hierarchy.icon || "account_tree",
    enabled: hierarchy.enabled,
  };

  mode.value = "edit";
  selectParent(hierarchy.parentCollection);
};

const setActive = async (id: string) => {
  await hierarchyManager.setActiveHierarchy(id);
  activeHierarchyId.value = id;
  emit("saved");
};

const duplicateHierarchy = async (hierarchy: HierarchyDefinition) => {
  await hierarchyManager.duplicateHierarchy(hierarchy.id);
  await loadHierarchies();
};

const exportHierarchy = (hierarchy: HierarchyDefinition) => {
  const json = hierarchyManager.exportHierarchy(hierarchy);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${hierarchy.name.replace(/\s+/g, "_")}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const confirmDelete = (hierarchy: HierarchyDefinition) => {
  hierarchyToDelete.value = hierarchy;
  showDeleteConfirm.value = true;
};

const handleDelete = async () => {
  if (hierarchyToDelete.value) {
    await hierarchyManager.deleteHierarchy(hierarchyToDelete.value.id);
    await loadHierarchies();
    showDeleteConfirm.value = false;
    hierarchyToDelete.value = null;
  }
};

const applySuggestion = (suggestion: any) => {
  editForm.value.parentCollection = suggestion.parent;
  editForm.value.childCollections = [...suggestion.children];
  editForm.value.name = `${suggestion.parent} Hierarchy`;
  mode.value = "create";
  showAutoDetect.value = false;
  selectParent(suggestion.parent);
};

const handleImport = async (json: string) => {
  await hierarchyManager.importHierarchy(json);
  await loadHierarchies();
  showImport.value = false;
};

watch(
  () => props.modelValue,
  async (value) => {
    if (value) {
      await loadHierarchies();
      await loadCollections();
    }
  },
);

onMounted(async () => {
  if (props.modelValue) {
    await loadHierarchies();
    await loadCollections();
  }
});
</script>

<style scoped>
.hierarchy-builder {
  min-width: 800px;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.list-mode,
.editor-mode {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.mode-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  gap: 16px;
  text-align: center;
  color: var(--foreground-subdued);
}

.hierarchy-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hierarchy-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--background-normal);
  border-radius: var(--border-radius);
  border: 2px solid transparent;
  transition: all 0.2s;
}

.hierarchy-item.active {
  border-color: var(--primary);
  background: var(--primary-alt);
}

.hierarchy-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  cursor: pointer;
}

.info-content h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
}

.info-content p {
  margin: 0;
  font-size: 13px;
  color: var(--foreground-subdued);
}

.active-indicator {
  color: var(--primary);
}

.hierarchy-actions {
  display: flex;
  gap: 4px;
}

.import-section {
  padding-top: 16px;
  border-top: var(--border-width) solid var(--border-subdued);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.section-divider {
  padding-top: 16px;
  border-top: var(--border-width) solid var(--border-subdued);
}

.section-divider h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
}

.section-divider p {
  margin: 0;
  color: var(--foreground-subdued);
  font-size: 14px;
}

.collection-selector,
.child-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
}

.collection-card,
.child-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--background-normal);
  border-radius: var(--border-radius);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.collection-card:hover,
.child-card:hover {
  border-color: var(--primary-alt);
  background: var(--primary-alt);
}

.collection-card.selected,
.child-card.selected {
  border-color: var(--primary);
  background: var(--primary-alt);
}

.card-info {
  flex: 1;
}

.card-info h4 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
}

.card-info p {
  margin: 0;
  font-size: 12px;
  color: var(--foreground-subdued);
}

.selected-icon {
  color: var(--primary);
}

.preview-section {
  padding: 16px;
  background: var(--background-normal);
  border-radius: var(--border-radius);
}

.preview-section h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
}

.preview-tree {
  padding-left: 16px;
}

.preview-parent {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  font-weight: 600;
  color: var(--primary);
}

.preview-children {
  margin-left: 24px;
  padding-left: 16px;
  border-left: 2px solid var(--border-subdued);
}

.preview-child {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  color: var(--foreground-subdued);
}
</style>
