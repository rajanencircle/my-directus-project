<script setup lang="ts">
import ThumbnailCard from "./ThumbnailCard.vue";

interface JunctionRow {
  id: number | string;
  [key: string]: any;
}

const props = defineProps<{
  rows: JunctionRow[];
  thumbnailSize: number;
  readonly: boolean;
  filesFkField: string;
  downloadFormatPresets?: unknown;
  emptyLabel?: string;
}>();

const emit = defineEmits<{
  (e: "delete", row: JunctionRow): void;
  (e: "open", row: JunctionRow): void;
}>();
</script>

<template>
  <div class="media-grid-wrap">
    <div
      v-if="rows.length > 0"
      class="media-grid"
      :style="{
        gridTemplateColumns: `repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`,
        gap: 'var(--theme--form--field--input--padding)',
      }"
    >
      <ThumbnailCard
        v-for="row in rows"
        :key="row.id"
        :row="row"
        :thumbnail-size="thumbnailSize"
        :readonly="readonly"
        :files-fk-field="filesFkField"
        :download-format-presets="downloadFormatPresets"
        @delete="emit('delete', row)"
        @open="emit('open', row)"
      />
    </div>

    <div v-else class="empty-state">
      <v-icon name="image" class="empty-icon" />
      <p class="empty-text">{{ emptyLabel ?? 'No files uploaded yet.' }}</p>
    </div>
  </div>
</template>

<style scoped>
.media-grid-wrap {
  width: 100%;
}

.media-grid {
  display: grid;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px 12px;
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-subdued);
  gap: 10px;
  color: var(--theme--foreground-subdued);
  font-family: var(--theme--fonts--sans--font-family);
}

.empty-icon {
  font-size: 40px;
  opacity: 0.4;
}

.empty-text {
  font-size: 14px;
  margin: 0;
  opacity: 0.7;
}
</style>
