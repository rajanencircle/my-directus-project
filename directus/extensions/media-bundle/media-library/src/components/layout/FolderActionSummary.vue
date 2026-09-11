<template>
  <div class="folder-action-summary" :class="{ 'has-border': bordered }">
    <p v-if="label" class="folder-action-label">{{ label }}</p>
    <div class="folder-action-card">
      <v-icon name="folder" class="folder-action-icon" />
      <div class="folder-action-copy">
        <p class="folder-action-name">{{ folderName }}</p>
        <p v-if="folderPath" class="folder-action-path">{{ folderPath }}</p>
        <p v-if="folderStats" class="folder-action-stats">{{ folderStats }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label?: string
  folderName: string
  folderPath?: string
  folderStats?: string
  bordered?: boolean
}>()
</script>

<style scoped>
.folder-action-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.folder-action-summary.has-border {
  padding-bottom: 4px;
  border-bottom: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
}

.folder-action-label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--theme--foreground-subdued);
}

.folder-action-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--theme--border-radius, 6px);
  background: var(--theme--background-subdued);
}

.folder-action-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--theme--primary);
}

.folder-action-copy {
  min-width: 0;
}

.folder-action-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--theme--foreground);
  word-break: break-word;
}

.folder-action-path,
.folder-action-stats {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--theme--foreground-subdued);
}

.folder-action-stats {
  margin-top: 6px;
  font-weight: 500;
}
</style>
