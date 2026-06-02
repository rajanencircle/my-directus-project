<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  mimeToIcon,
  mimeToKindLabel,
  resolveFileMediaKind,
  type FileMediaKind,
} from '../utils/fileType';

const props = withDefaults(
  defineProps<{
    fileId: string;
    mimeType?: string | null;
    filename?: string | null;
    alt?: string;
    size?: number;
    showKindBadge?: boolean;
  }>(),
  {
    mimeType: null,
    filename: null,
    alt: '',
    size: 250,
    showKindBadge: true,
  }
);

const imageFailed = ref(false);
const videoFailed = ref(false);

const mediaKind = computed<FileMediaKind>(() =>
  resolveFileMediaKind(props.mimeType, props.filename)
);
const showImage = computed(() => mediaKind.value === 'image' && !imageFailed.value);
const showVideo = computed(() => mediaKind.value === 'video' && !videoFailed.value);
const iconName = computed(() => mimeToIcon(props.mimeType, props.filename));
const kindLabel = computed(() => mimeToKindLabel(props.mimeType, props.filename));

const thumbnailUrl = computed(() => {
  const s = props.size;
  return `/assets/${props.fileId}?width=${s}&height=${s}&fit=cover`;
});

const videoUrl = computed(() => `/assets/${props.fileId}`);

function onImageError() {
  imageFailed.value = true;
}

function onVideoError() {
  videoFailed.value = true;
}

watch(
  () => [props.fileId, props.mimeType, props.filename] as const,
  () => {
    imageFailed.value = false;
    videoFailed.value = false;
  }
);
</script>

<template>
  <div class="file-thumb-preview" :class="`kind-${mediaKind}`">
    <img
      v-if="showImage"
      class="thumb-img"
      :src="thumbnailUrl"
      :alt="alt"
      loading="lazy"
      @error="onImageError"
    />
    <video
      v-else-if="showVideo"
      class="thumb-video"
      :src="videoUrl"
      controls
      preload="metadata"
      playsinline
      @error="onVideoError"
    />
    <div v-else class="thumb-fallback">
      <v-icon :name="iconName" class="thumb-icon" />
      <span v-if="showKindBadge" class="kind-badge">{{ kindLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.file-thumb-preview {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme--background-subdued);
}

.thumb-img,
.thumb-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb-video {
  background: #000;
}

.thumb-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
}

.thumb-icon {
  font-size: 44px;
  color: var(--theme--foreground-subdued);
  opacity: 0.85;
}

.kind-badge {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--theme--foreground-subdued);
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--theme--border-color);
  background: var(--theme--background-normal);
}

.kind-video .thumb-icon {
  color: color-mix(in srgb, var(--theme--primary) 70%, var(--theme--foreground-subdued));
}

.kind-document .thumb-icon {
  color: color-mix(in srgb, var(--theme--warning, #fd7e14) 50%, var(--theme--foreground-subdued));
}
</style>
