<script setup lang="ts">
import { computed, ref } from 'vue';
import ExpiryInfoDialog from './ExpiryInfoDialog.vue';
import ShareModal from './ShareModal.vue';
import { isExpired } from '../utils/expiry';
import {
  buildAssetDownloadUrl,
  parseDownloadFormatPresets,
  triggerDownload,
} from '../utils/downloadPresets';
import { supportsMultiFormatDownload } from '../utils/fileType';
import FileThumbPreview from './FileThumbPreview.vue';

interface DirectusFile {
  id: string;
  filename_download: string;
  title: string | null;
  type: string | null;
  width: number | null;
  height: number | null;
  expiry_date?: string | null;
}

interface JunctionRow {
  id: number | string;
  [key: string]: any;
}

const props = withDefaults(
  defineProps<{
    row: JunctionRow;
    thumbnailSize: number;
    readonly: boolean;
    filesFkField: string;
    downloadFormatPresets?: unknown;
  }>(),
  { downloadFormatPresets: undefined }
);

const emit = defineEmits<{
  (e: 'delete', row: JunctionRow): void;
  (e: 'open', row: JunctionRow): void;
}>();

const file = computed(() => props.row[props.filesFkField] as DirectusFile);
const canMultiFormatDownload = computed(() =>
  supportsMultiFormatDownload(file.value?.type, file.value?.filename_download)
);
const expired = computed(() => isExpired(file.value?.expiry_date ?? null));

const displayName = computed(
  () => file.value?.title || file.value?.filename_download || 'Unnamed file'
);

const downloadFormats = computed(() => parseDownloadFormatPresets(props.downloadFormatPresets));

const expiryDialogOpen = ref(false);
const actionsMenuOpen = ref(false);
const shareModalOpen = ref(false);

function closeActionsMenu() {
  actionsMenuOpen.value = false;
}

function onEdit() {
  closeActionsMenu();
  openEditInNewTab();
}

function onPreview() {
  closeActionsMenu();
  openInNewTab();
}

function onDownloadAs(presetIndex: number) {
  closeActionsMenu();
  downloadAs(presetIndex);
}

function onDownloadDirect() {
  closeActionsMenu();
  downloadDirect();
}

function onShare() {
  closeActionsMenu();
  shareModalOpen.value = true;
}

function onRemove() {
  closeActionsMenu();
  emit('delete', props.row);
}

function openExpiryInfo() {
  expiryDialogOpen.value = true;
}

function openInNewTab() {
  const id = file.value?.id;
  if (!id) return;
  window.open(`/assets/${id}`, '_blank', 'noopener,noreferrer');
}

function openEditInNewTab() {
  const id = file.value?.id;
  if (!id) return;
  window.open(`/admin/files/${id}`, '_blank', 'noopener,noreferrer');
}

function downloadAs(presetIndex: number) {
  const id = file.value?.id;
  if (!id) return;
  const preset = downloadFormats.value[presetIndex];
  if (!preset) return;
  triggerDownload(
    buildAssetDownloadUrl(id, preset, file.value?.type, file.value?.filename_download),
    file.value?.filename_download ?? ''
  );
}

function downloadDirect() {
  const id = file.value?.id;
  if (!id) return;
  triggerDownload(`/assets/${id}?download`, file.value?.filename_download ?? '');
}
</script>

<template>
  <button
    class="thumbnail-card"
    type="button"
    :style="{ width: thumbnailSize + 'px' }"
    :title="displayName"
    @click="emit('open', row)"
  >
    <div
      class="thumb-wrap"
      :style="{ width: thumbnailSize + 'px', height: thumbnailSize + 'px' }"
    >
      <FileThumbPreview
        v-if="file?.id"
        :file-id="file.id"
        :mime-type="file.type"
        :filename="file.filename_download"
        :alt="displayName"
        :size="thumbnailSize"
      />

      <!-- Kebab menu (Directus-like actions) -->
      <div class="top-actions">
        <div
          v-if="expired"
          class="expired-pill"
          title="Why is this expired?"
          role="button"
          tabindex="0"
          @click.stop="openExpiryInfo"
          @keydown.enter.stop="openExpiryInfo"
          @keydown.space.prevent.stop="openExpiryInfo"
        >
          Don’t use
        </div>
        <v-menu
          v-model="actionsMenuOpen"
          placement="bottom-end"
          show-arrow
          close-on-content-click
        >
          <template #activator="{ toggle, active }">
            <button
              class="kebab-btn"
              :class="{ active }"
              type="button"
              title="Actions"
              @click.stop="toggle"
            >
              <v-icon name="more_vert" small />
            </button>
          </template>

          <v-list>
            <v-list-item clickable @click="onEdit">
              <v-list-item-icon><v-icon name="edit" /></v-list-item-icon>
              <v-list-item-content>Edit</v-list-item-content>
            </v-list-item>

            <v-list-item clickable @click="onPreview">
              <v-list-item-icon><v-icon name="open_in_new" /></v-list-item-icon>
              <v-list-item-content>Preview</v-list-item-content>
            </v-list-item>

            <v-divider />

            <template v-if="canMultiFormatDownload">
              <v-list-item
                v-for="(fmt, idx) in downloadFormats"
                :key="`${fmt.label}-${idx}`"
                clickable
                @click="onDownloadAs(idx)"
              >
                <v-list-item-icon><v-icon name="download" /></v-list-item-icon>
                <v-list-item-content
                  >Download {{ fmt.label }}</v-list-item-content
                >
              </v-list-item>
            </template>
            <v-list-item v-else clickable @click="onDownloadDirect">
              <v-list-item-icon><v-icon name="download" /></v-list-item-icon>
              <v-list-item-content>Download</v-list-item-content>
            </v-list-item>

            <v-divider />
            <v-list-item clickable @click="onShare">
              <v-list-item-icon><v-icon name="share" /></v-list-item-icon>
              <v-list-item-content>Share</v-list-item-content>
            </v-list-item>

            <v-divider v-if="!readonly" />
            <v-list-item
              v-if="!readonly"
              clickable
              class="danger-item"
              @click.stop="onRemove"
            >
              <v-list-item-icon><v-icon name="delete" /></v-list-item-icon>
              <v-list-item-content>Remove</v-list-item-content>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <p class="filename" :title="displayName">{{ displayName }}</p>
  </button>

  <ExpiryInfoDialog
    v-model="expiryDialogOpen"
    :expiry-date="file?.expiry_date ?? null"
    :title="file?.title ?? null"
    :filename="file?.filename_download ?? null"
  />

  <ShareModal
    v-if="shareModalOpen"
    :file-id="file?.id"
    @close="shareModalOpen = false"
  />
</template>

<style scoped>
.thumbnail-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: var(--theme--fonts--sans--font-family);
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.thumb-wrap {
  position: relative;
  border-radius: var(--theme--border-radius);
  overflow: hidden;
  background: var(--theme--background-normal);
  border: 1px solid var(--theme--border-color);
  flex-shrink: 0;
  transition:
    box-shadow 0.15s,
    border-color 0.15s,
    transform 0.08s;
}

.thumbnail-card:hover .thumb-wrap {
  border-color: color-mix(
    in srgb,
    var(--theme--primary) 35%,
    var(--theme--border-color)
  );
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.top-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 6px;
  align-items: center;
  z-index: 2;
}

.expired-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: color-mix(
    in srgb,
    var(--theme--warning, #fd7e14) 30%,
    rgba(0, 0, 0, 0.45)
  );
  backdrop-filter: blur(6px);
  cursor: pointer;
  user-select: none;
}

.kebab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--theme--border-radius);
  border: 1px solid
    color-mix(in srgb, var(--theme--border-color) 70%, transparent);
  color: var(--theme--foreground);
  background: color-mix(
    in srgb,
    var(--theme--background-normal) 85%,
    transparent
  );
  cursor: pointer;
  transition:
    background 0.12s,
    opacity 0.15s,
    border-color 0.12s,
    box-shadow 0.12s;
  opacity: 0.75;
  outline: none;
}

.thumb-wrap:hover .kebab-btn,
.thumbnail-card:focus-visible .kebab-btn {
  opacity: 1;
}

.kebab-btn.active {
  opacity: 1;
  background: var(--theme--background-subdued);
  border-color: color-mix(
    in srgb,
    var(--theme--primary) 35%,
    var(--theme--border-color)
  );
  box-shadow: 0 0 0 2px
    color-mix(in srgb, var(--theme--primary) 18%, transparent);
}

.kebab-btn:hover {
  background: var(--theme--background-subdued);
}

.thumbnail-card:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--theme--primary) 35%, transparent);
  outline-offset: 3px;
}

.danger-item {
  color: var(--theme--danger, #dc3545);
}

.filename {
  font-size: 12px;
  color: var(--theme--foreground-subdued);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin: 0;
  text-align: center;
  font-family: var(--theme--fonts--sans--font-family);
}
</style>
