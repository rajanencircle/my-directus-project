<script setup lang="ts">
import FileMediaExtrasPanel from './FileMediaExtrasPanel.vue';
import { parseFileReverseLinks } from '../utils/fileReverseLinks';

const props = withDefaults(
  defineProps<{
    fileId: string;
    fileName?: string | null;
    fileType?: string | null;
    filenameDownload?: string | null;
    fileReverseLinks?: unknown;
    downloadFormatPresets?: unknown;
  }>(),
  {
    fileName: null,
    fileType: null,
    filenameDownload: null,
    fileReverseLinks: undefined,
    downloadFormatPresets: undefined,
  }
);

const emit = defineEmits<{ (e: 'close'): void }>();

const hasUsageConfig = () => parseFileReverseLinks(props.fileReverseLinks).length > 0;
</script>

<template>
  <v-dialog
    :model-value="true"
    persistent
    class="linked-collections-dialog"
    :z-index="20010"
    @update:model-value="(v: boolean) => !v && emit('close')"
  >
    <v-card class="details-card">
      <v-card-title class="card-title">
        <v-icon name="link" class="title-icon" />
        <span class="title-text" :title="props.fileName ?? props.fileId">
          Linked collections
          <span class="title-subdued">— {{ props.fileName ?? props.fileId }}</span>
        </span>
        <div class="spacer" />
        <button class="close-btn" type="button" @click="emit('close')">
          <v-icon name="close" small />
        </button>
      </v-card-title>

      <v-card-text class="card-body">
        <FileMediaExtrasPanel
          :file-id="fileId"
          :file-type="fileType"
          :filename-download="filenameDownload"
          :file-reverse-links="fileReverseLinks"
          :download-format-presets="downloadFormatPresets"
        />

        <div v-if="!hasUsageConfig()" class="empty">
          No linked collections configured.
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.linked-collections-dialog :deep(.v-dialog-content) {
  align-items: center;
  justify-content: center;
  padding: 0;
}

.linked-collections-dialog :deep(.v-overlay__content) {
  margin: 0;
  max-height: 70vh;
  width: min(900px, 96vw);
}

.details-card {
  width: 100%;
  max-height: 70vh;
  background: var(--theme--background-normal);
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  display: flex;
  flex-direction: column;
  font-family: var(--theme--fonts--sans--font-family);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--theme--border-color);
}

.title-icon {
  color: var(--theme--primary);
}

.title-text {
  font-weight: 700;
  font-size: 14px;
  color: var(--theme--foreground);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.title-subdued {
  font-weight: 500;
  color: var(--theme--foreground-subdued);
}

.spacer {
  flex: 1;
}

.close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid var(--theme--border-color);
  background: transparent;
  color: var(--theme--foreground);
  cursor: pointer;
}

.close-btn:hover {
  background: var(--theme--background-subdued);
}

.card-body {
  padding: 14px 16px;
  overflow: auto;
  flex: 1;
}

.empty {
  color: var(--theme--foreground-subdued);
  font-size: 13px;
  padding: 10px 4px;
}
</style>
