<template>
  <div class="translations-pane">
    <!-- Language badge header -->
    <div class="pane-header">
      <v-chip
        small
        :style="{
          '--v-chip-color': loading ? 'var(--theme--foreground-subdued)' : 'var(--theme--primary)',
          '--v-chip-background-color': loading
            ? 'var(--theme--background-subdued)'
            : 'var(--theme--primary-background)',
        }"
      >
        {{ language ?? '—' }}
      </v-chip>
      <v-progress-circular v-if="loading" indeterminate x-small />
    </div>

    <!-- Field list -->
    <div v-if="language" class="field-list">
      <div v-for="fieldItem in visibleFields" :key="fieldItem.field" class="field-item">
        <div class="field-label type-label">
          {{ fieldItem.name ?? fieldItem.field }}
          <span v-if="fieldItem.meta?.required" class="required">*</span>
        </div>

        <!-- Use the registered interface component if available -->
        <v-interface
          v-if="fieldItem.meta?.interface"
          :name="fieldItem.meta.interface"
          :value="edits[fieldItem.field] ?? null"
          :collection="collection"
          :field="fieldItem.field"
          :primary-key="primaryKey ?? '+'"
          :options="fieldItem.meta?.options ?? {}"
          :disabled="disabled || loading"
          @input="$emit('update', fieldItem.field, $event)"
        />

        <!-- Fallback: multiline text -->
        <v-textarea
          v-else-if="isMultiline(fieldItem)"
          :model-value="edits[fieldItem.field] ?? ''"
          :placeholder="fieldItem.field"
          :disabled="disabled || loading"
          @update:model-value="$emit('update', fieldItem.field, $event)"
        />

        <!-- Fallback: single line input -->
        <v-input
          v-else
          :model-value="edits[fieldItem.field] ?? ''"
          :placeholder="fieldItem.field"
          :disabled="disabled || loading"
          @update:model-value="$emit('update', fieldItem.field, $event)"
        />
      </div>

      <v-notice v-if="visibleFields.length === 0" type="info">
        No translatable fields found.
      </v-notice>
    </div>

    <v-notice v-else type="info">
      Select a language to edit content.
    </v-notice>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

const SKIP_FIELDS = new Set([
  'id',
  'sort',
  'user_created',
  'user_updated',
  'date_created',
  'date_updated',
]);

export default defineComponent({
  name: 'TranslationsPane',

  props: {
    collection: { type: String, default: null },
    primaryKey: { type: [String, Number], default: null },
    language: { type: String, default: null },
    languageField: { type: String, default: 'code' },
    edits: { type: Object as () => Record<string, any>, default: () => ({}) },
    fields: { type: Array as () => any[], default: () => [] },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },

  emits: ['update'],

  setup(props) {
    const visibleFields = computed(() =>
      (props.fields ?? []).filter((f: any) => {
        if (!f?.field) return false;
        if (f.field === props.languageField) return false;
        if (SKIP_FIELDS.has(f.field)) return false;
        if (f.meta?.hidden) return false;
        if (f.meta?.system) return false;
        return true;
      })
    );

    function isMultiline(field: any): boolean {
      return (
        field.type === 'text' ||
        field.meta?.interface === 'input-multiline' ||
        field.meta?.interface === 'input-rich-text-plain'
      );
    }

    return { visibleFields, isMultiline };
  },
});
</script>

<style scoped>
.translations-pane {
  padding: 4px 0 12px;
}

.pane-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  color: var(--theme--foreground-subdued);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 4px;
}

.required {
  color: var(--theme--danger);
}
</style>
