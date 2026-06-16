<template>
  <div
    class="drop-zone-wrapper"
    @dragenter.prevent="onDragEnter"
    @dragleave.prevent="onDragLeave"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <slot />

    <!-- Overlay shown while dragging -->
    <transition name="fade">
      <div v-if="isDragging" class="drop-overlay">
        <div class="drop-overlay-inner">
          <v-icon name="upload_file" xlarge />
          <p>Drop files to upload</p>
        </div>
      </div>
    </transition>

    <!-- Upload progress list -->
    <transition name="slide-up">
      <div v-if="uploads.length > 0" class="upload-progress-panel">
        <div class="panel-header">
          <span>Uploading {{ uploads.length }} file{{ uploads.length !== 1 ? 's' : '' }}</span>
          <v-button x-small icon @click="clearCompleted">
            <v-icon name="close" x-small />
          </v-button>
        </div>
        <div
          v-for="upload in uploads"
          :key="upload.name"
          class="upload-item"
        >
          <span class="upload-name">{{ upload.name }}</span>
          <span class="upload-percent">{{ upload.progress }}%</span>
          <div class="progress-bar-track">
            <div
              class="progress-bar-fill"
              :class="{ done: upload.progress === 100, error: upload.error }"
              :style="{ width: `${upload.progress}%` }"
            />
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@directus/extensions-sdk'
import { useFilesStore } from '../../stores/files.store'

export interface UploadAdapter {
  upload(file: File, folder: string | null, onProgress: (pct: number) => void): Promise<void>
}

type ApiInstance = ReturnType<typeof useApi>

class DirectusUploadAdapter implements UploadAdapter {
  private api: ApiInstance

  constructor(api: ApiInstance) {
    this.api = api
  }

  async upload(file: File, folder: string | null, onProgress: (pct: number) => void): Promise<void> {
    const form = new FormData()
    form.append('file', file)
    if (folder) form.append('folder', folder)

    await this.api.post('/files', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (evt.total) {
          onProgress(Math.round((evt.loaded / evt.total) * 100))
        }
      },
    })
  }
}

const props = withDefaults(
  defineProps<{
    folderId?: string | null
    adapter?: UploadAdapter
  }>(),
  {
    folderId: null,
    adapter: undefined,
  }
)

const emit = defineEmits<{
  'upload-progress': [name: string, percent: number]
  'upload-complete': []
}>()

const filesStore = useFilesStore()

const _defaultAdapter: UploadAdapter = new DirectusUploadAdapter(useApi())

function getAdapter(): UploadAdapter {
  return props.adapter ?? _defaultAdapter
}

interface UploadItem {
  name: string
  progress: number
  error: boolean
}

const isDragging = ref(false)
const uploads = ref<UploadItem[]>([])
let dragCounter = 0

function onDragEnter() {
  dragCounter++
  isDragging.value = true
}

function onDragLeave() {
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    isDragging.value = false
  }
}

async function onDrop(evt: DragEvent) {
  isDragging.value = false
  dragCounter = 0

  const files = Array.from(evt.dataTransfer?.files ?? [])
  if (files.length === 0) return

  const adapter = getAdapter()

  const items: UploadItem[] = files.map((f) => ({
    name: f.name,
    progress: 0,
    error: false,
  }))
  uploads.value.push(...items)

  await Promise.all(
    files.map(async (file, idx) => {
      const item = items[idx]
      try {
        await adapter.upload(file, props.folderId ?? null, (pct) => {
          item.progress = pct
          emit('upload-progress', file.name, pct)
        })
        item.progress = 100
      } catch (err) {
        item.error = true
        console.warn('[media-library] Upload failed:', file.name, err)
      }
    })
  )

  emit('upload-complete')
  await filesStore.fetchFiles()
}

function clearCompleted() {
  uploads.value = uploads.value.filter((u) => u.progress < 100 && !u.error)
}
</script>

<style scoped>
.drop-zone-wrapper {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 !important;
}

.drop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(var(--primary), 0.12);
  border: 2px dashed var(--theme--primary);
  border-radius: 8px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.drop-overlay-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--theme--primary);
}

.drop-overlay-inner p {
  font-size: 16px;
  font-weight: 600;
}

.upload-progress-panel {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 300px;
  background: var(--theme--background);
  border: 1px solid var(--theme--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  z-index: 200;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  border-bottom: 1px solid var(--theme--border-color);
}

.upload-item {
  padding: 8px 12px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 8px;
  align-items: center;
}

.upload-name {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upload-percent {
  font-size: 11px;
  color: var(--theme--foreground-subdued);
  text-align: right;
}

.progress-bar-track {
  grid-column: 1 / -1;
  height: 3px;
  background: var(--theme--border-color);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--theme--primary);
  border-radius: 2px;
  transition: width 0.2s;
}

.progress-bar-fill.done {
  background: var(--theme--success);
}

.progress-bar-fill.error {
  background: var(--theme--danger);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.2s, opacity 0.2s;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(16px);
  opacity: 0;
}
</style>
