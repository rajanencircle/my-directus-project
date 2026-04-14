<template>
  <div class="cascading-select">
    <div
      v-for="(level, index) in safeLevels"
      :key="index"
      class="level-container"
    >
      <div class="level-header">
        <label class="type-label">{{ getLevelLabel(level) }}</label>
      </div>

      <div class="select-wrapper">
        <div class="input-container ">
          <input
            v-model="searchQueries[index]"
            type="text"
            :placeholder="getLevelPlaceholder(level, index)"
            :disabled="isLevelDisabled(index)"
            class="search-input"
            @focus="handleFocus(index)"
            @blur="handleBlur(index)"
            @input="handleSearch(index)"
          />

          <!-- Add button positioned before dropdown arrow -->
          <div class="input-actions">
            <v-icon
              v-if="allowCreate && !isLevelDisabled(index)"
              name="add"
              clickable
              class="add-icon"
              @click.stop="openCreateDialog(index)"
              v-tooltip="'Create New ' + getLevelLabel(level)"
            />
            <v-icon
              v-if="selectedValues[index] !== null"
              name="close"
              clickable
              class="clear-icon"
              @click.stop="clearSelection(index)"
              v-tooltip="'Clear selection'"
            />
            <v-icon
              name="expand_more"
              :class="['dropdown-arrow', { disabled: isLevelDisabled(index) }]"
              @click="handleDropdownClick(index)"
            />
          </div>
        </div>

        <!-- Dropdown menu -->
        <div
          v-if="dropdownOpen[index]"
          class="dropdown-menu"
          ref="dropdownRefs"
        >
          <div v-if="loading[index]" class="dropdown-loading">
            <v-progress-circular indeterminate small />
            <span>Loading...</span>
          </div>

          <div
            v-else-if="getFilteredAndSearchedItems(index).length === 0"
            class="dropdown-empty"
          >
            <span v-if="searchQueries[index]"
              >No results found for "{{ searchQueries[index] }}"</span
            >
            <span v-else>No items available</span>
          </div>

          <div
            v-for="item in getFilteredAndSearchedItems(index)"
            :key="getItemKey(item, index)"
            class="dropdown-item"
            :class="{
              selected: selectedValues[index] === getItemValue(item, index),
            }"
            @click="selectItem(index, item)"
          >
            <v-icon
              v-if="selectedValues[index] === getItemValue(item, index)"
              name="check"
              small
              class="check-icon"
            />
            <span class="item-text">{{ getItemText(item, index) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create New Item Dialog -->
    <v-dialog v-model="createDialogActive" @esc="closeCreateDialog">
      <v-card>
        <v-card-title
          >Create New
          {{
            currentCreateLevel ? getLevelLabel(currentCreateLevel.config) : ""
          }}</v-card-title
        >
        <v-card-text>
          <v-input
            v-model="newItemName"
            :placeholder="
              'Enter ' +
              (currentCreateLevel
                ? currentCreateLevel.config.textField
                : 'name')
            "
            autofocus
            @keyup.enter="createNewItem"
          />
        </v-card-text>
        <v-card-actions>
          <v-button secondary @click="closeCreateDialog">Cancel</v-button>
          <v-button :loading="creating" @click="createNewItem">Create</v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { useApi } from "@directus/extensions-sdk";

export default {
  props: {
    value: {
      type: Object,
      default: () => ({}),
    },
    levels: {
      type: Array,
      required: true,
    },
    placeholder: {
      type: String,
      default: "Search or select...",
    },
    allowCreate: {
      type: Boolean,
      default: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    globalFilter: {
      type: Object,
      default: null,
    },
  },
  emits: ["input"],
  setup(props, { emit }) {
    const api = useApi();

    // State
    const selectedValues = ref([]);
    const itemsCache = ref({});
    const loading = ref([]);
    const searchQueries = ref([]);
    const dropdownOpen = ref([]);
    const dropdownRefs = ref([]);
    const createDialogActive = ref(false);
    const newItemName = ref("");
    const currentCreateLevel = ref(null);
    const creating = ref(false);

    // Computed property to safely access levels
    const safeLevels = computed(() => {
      return Array.isArray(props.levels) ? props.levels : [];
    });

    // Initialize selectedValues array based on levels
    const initializeValues = () => {
      if (!Array.isArray(props.levels) || props.levels.length === 0) {
        selectedValues.value = [];
        loading.value = [];
        searchQueries.value = [];
        dropdownOpen.value = [];
        return;
      }

      selectedValues.value = props.levels.map((level, index) => {
        if (!level || !level.collection) return null;
        const key = level.collection;
        return props.value?.[key] || null;
      });
      loading.value = props.levels.map(() => false);
      searchQueries.value = props.levels.map(() => "");
      dropdownOpen.value = props.levels.map(() => false);
    };

    // Helper functions to safely access item properties
    const getItemKey = (item, index) => {
      if (!item || !props.levels[index]) return `item-${index}`;
      const valueField = props.levels[index].valueField;
      return item[valueField] || `item-${index}`;
    };

    const getItemValue = (item, index) => {
      if (!item || !props.levels[index]) return null;
      const valueField = props.levels[index].valueField;
      return item[valueField];
    };

    const getItemText = (item, index) => {
      if (!item || !props.levels[index]) return "";
      const textField = props.levels[index].textField;
      return item[textField] || "";
    };

    // Get label for level (supports custom label field)
    const getLevelLabel = (level) => {
      if (!level) return "";

      // Prefer an explicit custom label if provided in the config
      if (level.label && typeof level.label === "string") {
        return level.label;
      }

      if (!level.collection) return "";

      // Fallback: generate label from collection name
      return (
        level.collection.charAt(0).toUpperCase() +
        level.collection.slice(1).replace(/_/g, " ")
      );
    };

    // Get placeholder for level
    const getLevelPlaceholder = (level, index) => {
      if (isLevelDisabled(index)) {
        return `Select ${getLevelLabel(props.levels[index - 1])} first`;
      }

      // Show selected item name if available
      if (selectedValues.value[index] !== null) {
        const items = getFilteredItems(index);
        const selectedItem = items.find(
          (item) => item[level.valueField] === selectedValues.value[index],
        );
        if (selectedItem) {
          return selectedItem[level.textField];
        }
      }

      return props.placeholder || `Search ${getLevelLabel(level)}...`;
    };

    // Check if level is disabled
    const isLevelDisabled = (index) => {
      if (props.disabled) return true;
      if (index === 0) return false;
      return selectedValues.value[index - 1] === null;
    };

    // ────────────────────────────────────────────────────────────────
    //  Fetch items – only this function was changed
    // ────────────────────────────────────────────────────────────────
    const fetchItems = async (levelIndex, searchQuery = "") => {
      const level = props.levels[levelIndex];
      if (!level || !level.collection) return [];

      const cacheKey = getCacheKey(levelIndex);

      if (!searchQuery && itemsCache.value[cacheKey]) {
        return itemsCache.value[cacheKey];
      }

      loading.value[levelIndex] = true;

      try {
        // Build fields array – this is the main change
        const fields = [
          level.valueField,
          level.textField,
        ];

        // Add user_created fields only for media_country level
        if (level.collection === "media_country") {
          fields.push(
            "user_created.id",
            "user_created.first_name",
            "user_created.last_name",
            "user_created.email"
            // "user_created.role.name"   ← add this line if you need role name too
          );
        }

        const params = {
          fields: fields,
          limit: -1,
          sort: [level.textField],
        };

        // Build filters object
        const filters = {};

        // 1. Add parent field filter if this level depends on parent
        if (level.parentField && levelIndex > 0) {
          const parentValue = selectedValues.value[levelIndex - 1];
          if (parentValue) {
            filters[level.parentField] = {
              _eq: parentValue,
            };
          }
        }

        // 2. Add search filter
        if (searchQuery) {
          filters[level.textField] = {
            _contains: searchQuery,
          };
        }

        // 3. Merge with level-specific filter (your $CURRENT_ROLE filter stays here)
        if (level.filter && typeof level.filter === 'object') {
          Object.assign(filters, level.filter);
        }

        // 4. Merge with global filter from props
        if (props.globalFilter && typeof props.globalFilter === 'object') {
          Object.assign(filters, props.globalFilter);
        }

        if (Object.keys(filters).length > 0) {
          params.filter = filters;
        }

        // Clean request – NO more hardcoded fields in URL
        const response = await api.get(`/items/${level.collection}`, {
          params,
        });

        const items = response.data.data;

        // Cache the results only if not searching
        if (!searchQuery) {
          itemsCache.value[cacheKey] = items;
        }

        loading.value[levelIndex] = false;

        return items;
      } catch (error) {
        console.error(`Error fetching ${level.collection}:`, error);
        loading.value[levelIndex] = false;
        return [];
      }
    };

    // Generate cache key based on parent selection and filters
    const getCacheKey = (levelIndex) => {
      const level = props.levels[levelIndex];
      if (!level || !level.collection) return `unknown-${levelIndex}`;

      let key = level.collection;

      if (level.parentField && levelIndex > 0) {
        const parentValue = selectedValues.value[levelIndex - 1];
        key += `_parent_${parentValue}`;
      }

      // Add level filter to cache key if it exists
      if (level.filter) {
        key += `_filter_${JSON.stringify(level.filter)}`;
      }

      // Add global filter to cache key if it exists
      if (props.globalFilter) {
        key += `_global_${JSON.stringify(props.globalFilter)}`;
      }

      return key;
    };

    // Get filtered items for a level
    const getFilteredItems = (index) => {
      const cacheKey = getCacheKey(index);
      return itemsCache.value[cacheKey] || [];
    };

    // Get filtered and searched items
    const getFilteredAndSearchedItems = (index) => {
      const items = getFilteredItems(index);
      const query = searchQueries.value[index]?.toLowerCase().trim();

      if (!query) return items;

      const level = props.levels[index];
      return items.filter((item) =>
        item[level.textField]?.toLowerCase().includes(query),
      );
    };

    // Handle search input
    const handleSearch = async (index) => {
      const query = searchQueries.value[index];

      // Open dropdown when searching
      if (!dropdownOpen.value[index]) {
        dropdownOpen.value[index] = true;
      }

      // Debounce API calls for search (optional - can fetch from cached items)
      // For now, we filter from cached items
    };

    // Handle focus
    const handleFocus = async (index) => {
      if (isLevelDisabled(index)) return;

      // Load items if not already loaded
      if (getFilteredItems(index).length === 0 && !loading.value[index]) {
        await fetchItems(index);
      }

      dropdownOpen.value[index] = true;
    };

    // Handle blur
    const handleBlur = (index) => {
      // Delay to allow click on dropdown item
      setTimeout(() => {
        dropdownOpen.value[index] = false;
      }, 200);
    };

    // Handle dropdown click
    const handleDropdownClick = async (index) => {
      if (isLevelDisabled(index)) return;

      // Load items if not already loaded
      if (getFilteredItems(index).length === 0 && !loading.value[index]) {
        await fetchItems(index);
      }

      dropdownOpen.value[index] = !dropdownOpen.value[index];
    };

    // Select an item
    const selectItem = async (index, item) => {
      const level = props.levels[index];
      const value = item[level.valueField];

      await handleSelect(index, value);

      // Update search query to show selected item
      searchQueries.value[index] = item[level.textField];

      // Close dropdown
      dropdownOpen.value[index] = false;
    };

    // Clear selection
    const clearSelection = async (index) => {
      searchQueries.value[index] = "";
      await handleSelect(index, null);
    };

    // Handle selection change
    const handleSelect = async (index, value) => {
      // Update the selected value
      selectedValues.value[index] = value;

      // Clear all child selections and their caches
      for (let i = index + 1; i < props.levels.length; i++) {
        selectedValues.value[i] = null;
        searchQueries.value[i] = "";
        dropdownOpen.value[i] = false;

        if (!props.levels[i] || !props.levels[i].collection) continue;

        // Clear cache for child levels since parent changed
        const childCacheKeys = Object.keys(itemsCache.value).filter((key) =>
          key.startsWith(props.levels[i].collection),
        );
        childCacheKeys.forEach((key) => delete itemsCache.value[key]);
      }

      // Emit the updated value
      emitValue();

      // Fetch items for the next level if a value was selected
      if (value !== null && index < props.levels.length - 1) {
        await fetchItems(index + 1);
      }
    };

    // Emit value as object with collection names as keys
    const emitValue = () => {
      const result = {};
      props.levels.forEach((level, index) => {
        if (!level || !level.collection) return;
        result[level.collection] = selectedValues.value[index];
      });
      emit("input", result);
    };

    // Open create dialog
    const openCreateDialog = (index) => {
      currentCreateLevel.value = {
        index,
        config: props.levels[index],
      };
      newItemName.value = "";
      createDialogActive.value = true;
    };

    // Close create dialog
    const closeCreateDialog = () => {
      createDialogActive.value = false;
      currentCreateLevel.value = null;
      newItemName.value = "";
    };

    // Create new item
    const createNewItem = async () => {
      if (!newItemName.value.trim() || !currentCreateLevel.value) return;

      creating.value = true;
      const level = currentCreateLevel.value.config;
      const index = currentCreateLevel.value.index;

      try {
        const payload = {
          [level.textField]: newItemName.value.trim(),
        };

        // Add parent reference if applicable
        if (level.parentField && index > 0) {
          const parentValue = selectedValues.value[index - 1];
          if (parentValue) {
            payload[level.parentField] = parentValue;
          }
        }

        const response = await api.post(`/items/${level.collection}`, payload);
        const newItem = response.data.data;

        // Clear cache for this level
        const cacheKey = getCacheKey(index);
        delete itemsCache.value[cacheKey];

        // Fetch updated items
        await fetchItems(index);

        // Select the newly created item
        searchQueries.value[index] = newItem[level.textField];
        await handleSelect(index, newItem[level.valueField]);

        closeCreateDialog();
      } catch (error) {
        console.error(`Error creating ${level.collection}:`, error);
        alert(`Failed to create item: ${error.message}`);
      } finally {
        creating.value = false;
      }
    };

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      const cascadeElement = event.target.closest(".cascading-select");
      if (!cascadeElement) {
        dropdownOpen.value = dropdownOpen.value.map(() => false);
      }
    };

    // Watch for external value changes
    watch(
      () => props.value,
      (newValue) => {
        if (
          !newValue ||
          !Array.isArray(props.levels) ||
          props.levels.length === 0
        ) {
          return;
        }

        props.levels.forEach((level, index) => {
          if (!level || !level.collection) return;

          const key = level.collection;
          if (newValue[key] !== selectedValues.value[index]) {
            selectedValues.value[index] = newValue[key] || null;

            // Update search query to show selected item name
            if (newValue[key]) {
              const items = getFilteredItems(index);
              const selectedItem = items.find(
                (item) => item[level.valueField] === newValue[key],
              );
              if (selectedItem) {
                searchQueries.value[index] = selectedItem[level.textField];
              }
            } else {
              searchQueries.value[index] = "";
            }
          }
        });
      },
      { deep: true },
    );

    // Watch for changes in parent selections to fetch child items
    watch(
      () => selectedValues.value.slice(),
      async (newValues, oldValues) => {
        if (!Array.isArray(props.levels) || props.levels.length === 0) {
          return;
        }

        // Fetch items for levels that now have a parent selected
        for (let i = 1; i < props.levels.length; i++) {
          if (
            newValues[i - 1] !== null &&
            newValues[i - 1] !== oldValues?.[i - 1]
          ) {
            await fetchItems(i);
          }
        }
      },
      { deep: true },
    );

    // Initialize on mount
    onMounted(async () => {
      initializeValues();

      // Only proceed if levels is properly defined
      if (!Array.isArray(props.levels) || props.levels.length === 0) {
        return;
      }

      // Fetch items for the first level
      await fetchItems(0);

      // Fetch items for other levels if they have parent values selected
      for (let i = 1; i < props.levels.length; i++) {
        if (selectedValues.value[i - 1] !== null) {
          await fetchItems(i);
        }
      }

      // Update search queries for selected values
      props.levels.forEach((level, index) => {
        if (!level || !level.collection) return;

        if (selectedValues.value[index] !== null) {
          const items = getFilteredItems(index);
          const selectedItem = items.find(
            (item) => item[level.valueField] === selectedValues.value[index],
          );
          if (selectedItem) {
            searchQueries.value[index] = selectedItem[level.textField];
          }
        }
      });

      // Add click outside listener
      document.addEventListener("click", handleClickOutside);
    });

    // Cleanup on unmount
    onBeforeUnmount(() => {
      document.removeEventListener("click", handleClickOutside);
    });

    return {
      props,
      safeLevels,
      selectedValues,
      loading,
      searchQueries,
      dropdownOpen,
      dropdownRefs,
      createDialogActive,
      newItemName,
      currentCreateLevel,
      creating,
      getItemKey,
      getItemValue,
      getItemText,
      getLevelLabel,
      getLevelPlaceholder,
      isLevelDisabled,
      getFilteredItems,
      getFilteredAndSearchedItems,
      handleSearch,
      handleFocus,
      handleBlur,
      handleDropdownClick,
      selectItem,
      clearSelection,
      handleSelect,
      openCreateDialog,
      closeCreateDialog,
      createNewItem,
    };
  },
};
</script>

<style scoped>
.cascading-select {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.level-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.level-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Hide header for the first level only */
.level-container:first-of-type .level-header {
  display: none;
}

.type-label {
  color: #1F2937;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  letter-spacing: 0.005em;
}

.select-wrapper {
  position: relative;
}

.input-container {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  width: 100%;
  background-color: white;
}

.search-input {
  width: 100%;
  height: 44px;
  padding: 12px 90px 12px 12px;
  font-family: var(--family-sans-serif);
  font-size: 14px;
  line-height: 20px;
  color: #111111;
  background-color: #ffffff;
  border: 1px solid #e5e7eb; /* light gray */
  border-radius: 4px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  outline: none;
}

.search-input:hover:not(:disabled) {
  border-color: #d1d5db; /* slightly darker gray */
}

.search-input:focus {
  border-color: #111111; /* strong black border on focus */
  background-color: #ffffff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04);
}

.search-input:disabled {
  color: #9ca3af; /* gray text */
  background-color: #f3f4f6; /* light gray bg */
  cursor: not-allowed;
}

.search-input::placeholder {
  color: #9ca3af;
}

.input-actions {
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: auto;
}

.add-icon,
.clear-icon,
.dropdown-arrow {
  color: #9ca3af;
  transition: all 0.2s ease;
  cursor: pointer;
  border-radius: 999px;
}

.add-icon:hover,
.clear-icon:hover {
  color: #111111;
  background-color: #f3f4f6;
}

.dropdown-arrow {
  transition: transform 0.3s ease, color 0.2s ease;
}

.dropdown-arrow.disabled {
  color: #d1d5db;
  opacity: 0.5;
  cursor: not-allowed;
}

.dropdown-arrow:not(.disabled):hover {
  color: #111111;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% - 1px);
  left: 0;
  right: 0;
  max-height: 300px;
  overflow-y: auto;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
  z-index: 2;
  padding: 6px 0;
}

.dropdown-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: #9ca3af;
}

.dropdown-empty {
  padding: 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  color: #111111;
  font-size: 14px;
}

.dropdown-item:hover {
  background-color: #f3f4f6; /* light gray hover */
}

.dropdown-item.selected {
  background-color: #f3f4f6; /* same as hover for active item */
  color: #111111;
  font-weight: 600;
}

.check-icon {
  color: #111111;
  flex-shrink: 0;
}

.item-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Scrollbar styling */
.dropdown-menu::-webkit-scrollbar {
  width: 8px;
}

.dropdown-menu::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 4px;
}

.dropdown-menu::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 999px;
}

.dropdown-menu::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

</style>

