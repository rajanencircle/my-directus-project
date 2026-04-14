<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @esc="$emit('update:modelValue', false)"
  >
    <v-card>
      <v-card-title>
        <v-icon name="auto_fix_high" left />
        Auto-Detected Hierarchies
      </v-card-title>

      <v-card-text>
        <v-notice type="info">
          Based on your collection relationships, we found these potential
          hierarchies. Click on one to use it as a starting point.
        </v-notice>

        <div v-if="suggestions.length === 0" class="empty-state">
          <v-icon name="search_off" large />
          <p>No hierarchies detected</p>
          <p class="hint">
            Make sure you have Many-to-One relationships set up between your
            collections.
          </p>
        </div>

        <div v-else class="suggestions-list">
          <div
            v-for="(suggestion, index) in sortedSuggestions"
            :key="index"
            class="suggestion-card"
            @click="selectSuggestion(suggestion)"
          >
            <div class="suggestion-header">
              <v-icon name="account_tree" />
              <h3>{{ formatCollectionName(suggestion.parent) }}</h3>
              <v-badge :value="suggestion.strength" small>
                {{ suggestion.children.length }}
              </v-badge>
            </div>

            <div class="suggestion-children">
              <div
                v-for="child in suggestion.children"
                :key="child"
                class="child-tag"
              >
                <v-icon name="article" small />
                {{ formatCollectionName(child) }}
              </div>
            </div>

            <div class="suggestion-strength">
              <v-progress-linear
                :value="(suggestion.strength / maxStrength) * 100"
                rounded
              />
              <span class="strength-label">
                Strength: {{ suggestion.strength }}/{{ maxStrength }}
              </span>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-button secondary @click="$emit('update:modelValue', false)">
          Close
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Suggestion {
  parent: string;
  children: string[];
  strength: number;
}

interface Props {
  modelValue: boolean;
  suggestions: Suggestion[];
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
  (e: "select", suggestion: Suggestion): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const sortedSuggestions = computed(() => {
  return [...props.suggestions].sort((a, b) => b.strength - a.strength);
});

const maxStrength = computed(() => {
  return Math.max(...props.suggestions.map((s) => s.strength), 1);
});

const formatCollectionName = (collection: string): string => {
  return collection
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const selectSuggestion = (suggestion: Suggestion) => {
  emit("select", suggestion);
};
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  gap: 12px;
  text-align: center;
  color: var(--foreground-subdued);
}

.hint {
  font-size: 14px;
  max-width: 400px;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.suggestion-card {
  padding: 20px;
  background: var(--background-normal);
  border-radius: var(--border-radius);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-card:hover {
  border-color: var(--primary);
  background: var(--primary-alt);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.suggestion-header h3 {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.suggestion-children {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.child-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--background-page);
  border-radius: 16px;
  font-size: 13px;
}

.suggestion-strength {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.strength-label {
  font-size: 12px;
  color: var(--foreground-subdued);
  text-align: right;
}
</style>
