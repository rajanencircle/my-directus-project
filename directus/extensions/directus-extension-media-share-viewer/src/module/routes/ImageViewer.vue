<template>
  <div class="viewer-wrapper">
    <div class="viewer-card">
      <div v-if="mediaLoading" class="viewer-loading">
        <span class="spinner"></span>
        <p>Loading…</p>
      </div>

      <div v-if="mediaError && !mediaLoading" class="viewer-error">
        <p>Failed to load file. The file may be unavailable.</p>
      </div>

      <!-- Image -->
      <img
        v-if="shareId && isImage"
        :src="`/media-share-validate/${shareId}/file`"
        class="viewer-image"
        :class="{ hidden: mediaLoading || mediaError }"
        @load="onMediaLoad"
        @error="onMediaError"
        alt="Shared file"
      />

      <!-- Video -->
      <video
        v-else-if="shareId && isVideo"
        class="viewer-video"
        :class="{ hidden: mediaLoading || mediaError }"
        controls
        preload="metadata"
        @loadedmetadata="onMediaLoad"
        @error="onMediaError"
      >
        <source :src="`/media-share-validate/${shareId}/file`" :type="fileType ?? undefined" />
        Your browser does not support the video tag.
      </video>

      <!-- Document / other -->
      <div v-else-if="shareId && isDocument" class="viewer-document">
        <div class="doc-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <p class="doc-filename">{{ fileName }}</p>
        <p class="doc-type">{{ fileType }}</p>
      </div>

      <div v-if="showActions" class="viewer-actions">
        <!-- Image: dropdown with format choices -->
        <div v-if="isImage" class="download-group" v-click-outside="closeMenu">
          <button class="action-button download" @click="toggleMenu">
            Download <span class="arrow">▾</span>
          </button>
          <div v-if="menuOpen" class="download-menu">
            <button
              v-for="fmt in imageFormats"
              :key="fmt.value"
              class="menu-item"
              @click="handleDownload(fmt.value)"
            >
              {{ fmt.label }}
            </button>
          </div>
        </div>

        <!-- Video / Document: plain download -->
        <button v-else class="action-button download" @click="handleDownload()">Download</button>

        <button class="action-button edit" @click="handleEdit">Edit in Directus</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const shareId = route.params.shareId as string;
const fileId = ref<string | null>(null);
const fileType = ref<string | null>(null);
const fileName = ref<string | null>(null);
const mediaLoading = ref(true);
const mediaError = ref(false);
const menuOpen = ref(false);

const imageFormats = [
  { label: 'PNG', value: 'png' },
  { label: 'JPG', value: 'jpg' },
  { label: 'WebP', value: 'webp' },
  { label: 'TIFF', value: 'tiff' },
];

const isImage = computed(() => fileType.value?.startsWith('image/') ?? false);
const isVideo = computed(() => fileType.value?.startsWith('video/') ?? false);
const isDocument = computed(() => !isImage.value && !isVideo.value && fileId.value !== null);

const showActions = computed(() => {
  if (isDocument.value) return !mediaError.value;
  return !mediaLoading.value && !mediaError.value;
});

const clickOutsideHandlers = new WeakMap<HTMLElement, (e: MouseEvent) => void>();

const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    const handler = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value();
    };
    clickOutsideHandlers.set(el, handler);
    document.addEventListener('click', handler);
  },
  unmounted(el: HTMLElement) {
    const handler = clickOutsideHandlers.get(el);
    if (handler) document.removeEventListener('click', handler);
  },
};

onMounted(() => {
  const raw = sessionStorage.getItem(`share_${shareId}`);
  if (!raw) {
    router.replace(`/media-share-viewer/${shareId}`);
    return;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    router.replace(`/media-share-viewer/${shareId}`);
    return;
  }

  if (!parsed?.fileId) {
    router.replace(`/media-share-viewer/${shareId}`);
    return;
  }

  fileId.value = parsed.fileId;
  fileType.value = parsed.fileType ?? null;
  fileName.value = parsed.fileName ?? null;

  // Documents don't have a media load event — resolve immediately
  if (!parsed.fileType?.startsWith('image/') && !parsed.fileType?.startsWith('video/')) {
    mediaLoading.value = false;
  }
});

function onMediaLoad() {
  mediaLoading.value = false;
}

function onMediaError() {
  mediaLoading.value = false;
  mediaError.value = true;
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
}

function handleDownload(format?: string) {
  menuOpen.value = false;
  const params = new URLSearchParams({ download: 'true' });
  if (format) params.set('format', format);
  const a = document.createElement('a');
  a.href = `/media-share-validate/${shareId}/file?${params}`;
  a.setAttribute('download', '');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function handleEdit() {
  window.open(`/admin/files/${fileId.value}`, '_blank');
}
</script>

<style scoped>
.viewer-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1a1a1a;
  font-family: sans-serif;
}

.viewer-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 24px;
  max-width: 90vw;
}

.viewer-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #ccc;
  font-size: 14px;
}

.viewer-error {
  color: #f88;
  font-size: 14px;
  text-align: center;
}

.viewer-image {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 6px;
  object-fit: contain;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
}

.viewer-image.hidden {
  display: none;
}

.viewer-video {
  max-width: 100%;
  max-height: 75vh;
  width: 860px;
  border-radius: 6px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  background: #000;
}

.viewer-video.hidden {
  display: none;
}

.viewer-document {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 48px;
  background: #2a2a2a;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  min-width: 260px;
}

.doc-icon {
  width: 72px;
  height: 72px;
  color: #aaa;
}

.doc-icon svg {
  width: 100%;
  height: 100%;
}

.doc-filename {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #eee;
  text-align: center;
  word-break: break-all;
}

.doc-type {
  margin: 0;
  font-size: 12px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.viewer-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.download-group {
  position: relative;
}

.download-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  min-width: 120px;
  z-index: 10;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 9px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s;
}

.menu-item:hover {
  background-color: #f0ecff;
  color: #6644dd;
}

.action-button {
  padding: 10px 22px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-button.download {
  background-color: #6644dd;
  color: #fff;
}

.action-button.download:hover {
  background-color: #5533cc;
}

.action-button.edit {
  background-color: #333;
  color: #fff;
}

.action-button.edit:hover {
  background-color: #444;
}

.arrow {
  font-size: 12px;
  opacity: 0.8;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
