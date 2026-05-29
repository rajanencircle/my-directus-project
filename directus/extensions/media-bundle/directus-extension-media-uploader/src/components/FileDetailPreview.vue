<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  mimeToIcon,
  mimeToKindLabel,
  resolveFileMediaKind,
} from '../utils/fileType';

const props = withDefaults(
  defineProps<{
    fileId: string;
    mimeType?: string | null;
    filename?: string | null;
  }>(),
  { mimeType: null, filename: null }
);

const imageFailed = ref(false);

const mediaKind = computed(() => resolveFileMediaKind(props.mimeType, props.filename));
const isImage = computed(() => mediaKind.value === 'image' && !imageFailed.value);
const isVideo = computed(() => mediaKind.value === 'video');
const iconName = computed(() => mimeToIcon(props.mimeType, props.filename));
const kindLabel = computed(() => mimeToKindLabel(props.mimeType, props.filename));

const imageUrl = computed(() => `/assets/${props.fileId}?width=1200&fit=contain`);
const assetUrl = computed(() => `/assets/${props.fileId}`);

watch(
  () => [props.fileId, props.mimeType, props.filename] as const,
  () => {
    imageFailed.value = false;
  }
);
</script>

<template>
  <div class="file-detail-preview" :class="`kind-${mediaKind}`">
    <img
      v-if="isImage"
      :src="imageUrl"
      alt=""
      class="preview-img"
      @error="imageFailed = true"
    />
    <video
      v-else-if="isVideo"
      :src="assetUrl"
      class="preview-video"
      controls
      preload="metadata"
      playsinline
    />
    <div v-else class="preview-fallback">
      <v-icon :name="iconName" class="preview-icon" />
      <span class="kind-badge">{{ kindLabel }}</span>
      <p v-if="filename" class="preview-name">{{ filename }}</p>
    </div>
  </div>
</template>

<style scoped>
.file-detail-preview {
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-subdued);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
}

.preview-img {
  width: 100%;
  max-height: 360px;
  object-fit: contain;
  display: block;
  background: var(--theme--background-normal);
}

.preview-video {
  width: 100%;
  max-height: 360px;
  display: block;
  background: #000;
}

.preview-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px;
  color: var(--theme--foreground-subdued);
}

.preview-icon {
  font-size: 56px;
  opacity: 0.75;
}

.kind-badge {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--theme--border-color);
  background: var(--theme--background-normal);
  color: var(--theme--foreground-subdued);
}

.preview-name {
  margin: 0;
  font-size: 12px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
</style>
