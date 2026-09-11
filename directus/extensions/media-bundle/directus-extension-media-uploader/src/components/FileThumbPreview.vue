<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  mimeToIcon,
  mimeToKindLabel,
  resolveFileMediaKind,
  type FileMediaKind,
} from '../utils/fileType';
import { getOriginalAssetUrl, getThumbnailAssetUrl } from '../utils/assetUrl';

const props = withDefaults(
  defineProps<{
    fileId: string;
    mimeType?: string | null;
    filename?: string | null;
    alt?: string;
    showKindBadge?: boolean;
    modifiedOn?: string | null;
  }>(),
  {
    mimeType: null,
    filename: null,
    alt: '',
    showKindBadge: true,
    modifiedOn: null,
  }
);

const imageFailed = ref(false);
const videoFailed = ref(false);
const videoFrameReady = ref(false);

const mediaKind = computed<FileMediaKind>(() =>
  resolveFileMediaKind(props.mimeType, props.filename)
);
const showImage = computed(() => mediaKind.value === 'image' && !imageFailed.value);
const showVideo = computed(() => mediaKind.value === 'video' && !videoFailed.value);
const iconName = computed(() => mimeToIcon(props.mimeType, props.filename));
const kindLabel = computed(() => mimeToKindLabel(props.mimeType, props.filename));

const thumbnailUrl = computed(() =>
  getThumbnailAssetUrl(props.fileId, props.modifiedOn)
);

const videoUrl = computed(() =>
  getOriginalAssetUrl(props.fileId, props.modifiedOn)
);

function onImageError() {
  imageFailed.value = true;
}

function onVideoError() {
  videoFailed.value = true;
  videoFrameReady.value = false;
}

/** Pause on first decoded frame — browser metadata only, no playback controls. */
function onVideoFrameReady(event: Event) {
  const video = event.target as HTMLVideoElement | null;
  if (!video) return;

  video.pause();
  try {
    if (video.currentTime === 0) {
      video.currentTime = 0.001;
    }
  } catch {
    // Some browsers reject seek before enough data is buffered.
  }
  videoFrameReady.value = true;
}

watch(
  () => [props.fileId, props.mimeType, props.filename] as const,
  () => {
    imageFailed.value = false;
    videoFailed.value = false;
    videoFrameReady.value = false;
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
    <div v-else-if="showVideo" class="thumb-video-wrap">
      <video
        class="thumb-video"
        :class="{ 'is-ready': videoFrameReady }"
        :src="videoUrl"
        preload="metadata"
        muted
        playsinline
        disablepictureinpicture
        disableremoteplayback
        tabindex="-1"
        aria-hidden="true"
        @loadeddata="onVideoFrameReady"
        @error="onVideoError"
      />
      <div class="thumb-video-overlay" aria-hidden="true">
        <v-icon name="play_circle" class="thumb-play-icon" />
        <span v-if="showKindBadge" class="video-type-badge">Video</span>
      </div>
    </div>
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
  transition: transform 0.25s ease;
}

.thumb-video-wrap {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #101010;
}

.thumb-video {
  pointer-events: none;
  opacity: 0;
  background: #101010;
}

.thumb-video.is-ready {
  opacity: 1;
}

.thumb-video-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.28);
  pointer-events: none;
}

.thumb-play-icon {
  --v-icon-size: 36px;
  --v-icon-color: rgba(255, 255, 255, 0.95);
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.45));
}

.video-type-badge {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.92);
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(0, 0, 0, 0.35);
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
