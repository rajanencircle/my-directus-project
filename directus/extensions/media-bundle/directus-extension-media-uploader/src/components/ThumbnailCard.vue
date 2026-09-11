<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { useT } from '../composables/useT';
import ExpiryInfoDialog from './ExpiryInfoDialog.vue';
import PartnerInfoDialog from './PartnerInfoDialog.vue';
import ShareModal from './ShareModal.vue';
import DownloadModal from '../../../media-library/src/components/download/DownloadModal.vue';
import { useMediaSettings } from '../../../media-library/src/composables/useMediaSettings';
import { buildDownloadModalLabels } from '../../../media-library/src/utils/downloadModalLabels';
import { downloadSingleForChoice } from '../../../media-library/src/utils/downloadExecute';
import { isExpired } from '../utils/expiry';
import {
  type DownloadChoice,
  type DownloadModalFile,
} from '../../../media-library/src/utils/downloadVariants';
import type { SaveTarget } from '../../../media-library/src/utils/zipDownloadShared';
import FileThumbPreview from './FileThumbPreview.vue';
import {
  partnerAccentStyle,
  partnerLabelFromUser,
  partnerVisuallyFromUser,
  userDisplayName,
} from '../../../media-library/src/utils/partnerAccent';

interface DirectusFile {
  id: string;
  filename_download: string;
  title: string | null;
  type: string | null;
  width: number | null;
  height: number | null;
  expiry_date?: string | null;
  draft_status?: string | null;
  created_on?: string | null;
  uploaded_on?: string | null;
  modified_on?: string | null;
  generated_filename?: string | null;
  description?: string | null;
  copyright?: string | null;
  uploaded_by?: unknown;
}

interface JunctionRow {
  id: number | string;
  [key: string]: any;
}

interface JunctionFlagDef {
  field: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    row: JunctionRow;
    thumbnailSize: number;
    readonly: boolean;
    filesFkField: string;
    junctionFlags?: JunctionFlagDef[];
  }>(),
  { junctionFlags: () => [] }
);

const emit = defineEmits<{
  (e: 'delete', row: JunctionRow): void;
  (e: 'open', row: JunctionRow): void;
  (e: 'flag-change', payload: { row: JunctionRow; field: string; value: boolean }): void;
}>();

const file = computed(() => props.row[props.filesFkField] as DirectusFile);
const expired = computed(() => isExpired(file.value?.expiry_date ?? null));

const accentStyle = computed(() =>
  partnerAccentStyle(partnerVisuallyFromUser(file.value?.uploaded_by)),
);

const partnerInfoImageName = computed(
  () =>
    file.value?.generated_filename?.trim() ||
    file.value?.title?.trim() ||
    file.value?.filename_download?.trim() ||
    '',
);

const partnerInfoUploadedBy = computed(
  () => userDisplayName(file.value?.uploaded_by) || '',
);

const partnerInfoPartnerName = computed(
  () => partnerLabelFromUser(file.value?.uploaded_by) || '',
);

const partnerInfoUploadedDate = computed(() => {
  const iso = file.value?.uploaded_on ?? file.value?.created_on ?? null;
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
});

const displayName = computed(
  () => file.value?.generated_filename?.trim() || '',
);

/** Card name: generated filename only (no title/filename fallbacks). */
const primaryLabel = computed(() => displayName.value);

const descriptionText = computed(() => {
  const d = file.value?.description?.trim();
  return d || '';
});

const copyrightText = computed(() => {
  const c = file.value?.copyright?.trim();
  if (!c) return '';
  return c.replace(/^©+\s*/, '').trim();
});

const hasCopyright = computed(() => copyrightText.value.length > 0);

const relativeCreated = computed(() =>
  formatRelativeTime(file.value?.created_on ?? file.value?.uploaded_on ?? null),
);

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? '1 day ago' : `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
  const years = Math.round(months / 12);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

const { t } = useT();
const api = useApi();
const { settings, fetchSettings } = useMediaSettings();

const downloadModalLabels = computed(() =>
  buildDownloadModalLabels(t, settings.value as Record<string, string>),
);

onMounted(() => {
  fetchSettings();
});

const expiryDialogOpen = ref(false);
const partnerInfoOpen = ref(false);
const actionsMenuOpen = ref(false);
const shareModalOpen = ref(false);
const downloadModalOpen = ref(false);
const isDownloading = ref(false);

const downloadModalFiles = computed<DownloadModalFile[]>(() => {
  const f = file.value;
  if (!f?.id) return [];
  return [
    {
      id: String(f.id),
      filename: f.filename_download,
      type: f.type,
      width: f.width,
      height: f.height,
      media_sizes_cm: (f as any).media_sizes_cm ?? null,
    },
  ];
});

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

function onDownload() {
  if (isDownloading.value) return;
  closeActionsMenu();
  downloadModalOpen.value = true;
}

async function handleSingleDownload(choice: DownloadChoice, saveTarget: SaveTarget) {
  const f = file.value;
  if (!f?.id || isDownloading.value) return;
  isDownloading.value = true;
  try {
    await downloadSingleForChoice(
      api,
      {
        id: String(f.id),
        type: f.type,
        filename_download: f.filename_download,
        title: f.title,
        width: f.width,
        height: f.height,
        media_sizes_cm: (f as any).media_sizes_cm ?? null,
      },
      choice,
      saveTarget,
    );
  } finally {
    isDownloading.value = false;
  }
}

function onShare() {
  closeActionsMenu();
  shareModalOpen.value = true;
}

function onRemove() {
  closeActionsMenu();
  emit('delete', props.row);
}

function onFlagToggle(field: string, event: Event) {
  if (props.readonly) return;
  const checked = !!(event.target as HTMLInputElement)?.checked;
  emit('flag-change', { row: props.row, field, value: checked });
}

function openExpiryInfo() {
  expiryDialogOpen.value = true;
}

function openPartnerInfo() {
  partnerInfoOpen.value = true;
}

function openInNewTab() {
  const id = file.value?.id;
  if (!id) return;
  window.open(`/assets/${id}`, '_blank', 'noopener,noreferrer');
}

function openEditInNewTab() {
  const id = file.value?.id;
  if (!id) return;
  window.open(`/admin/media-library/${id}`, '_blank', 'noopener,noreferrer');
}
</script>

<template>
  <!-- div (not button) so parent grid item can use HTML5 drag-and-drop -->
  <div
    class="thumbnail-card"
    role="button"
    tabindex="0"
    :style="{ width: thumbnailSize + 'px' }"
    :title="displayName"
    @click="emit('open', row)"
    @keydown.enter.prevent="emit('open', row)"
    @keydown.space.prevent="emit('open', row)"
  >
    <div
      class="media-shell"
      :class="{ 'has-flags': junctionFlags.length > 0, 'has-partner-accent': !!accentStyle }"
      :style="accentStyle"
    >
      <div
        class="thumb-wrap"
        :style="{ width: thumbnailSize + 'px', height: thumbnailSize + 'px' }"
      >
        <FileThumbPreview
          v-if="file?.id"
          class="thumb-preview"
          :file-id="file.id"
          :mime-type="file.type"
          :filename="file.filename_download"
          :alt="displayName"
          :modified-on="file.modified_on"
          :show-kind-badge="false"
        />

        <div class="thumb-shade" aria-hidden="true" />

        <button
          v-if="accentStyle"
          type="button"
          class="partner-info-btn"
          title="Media info"
          @click.stop="openPartnerInfo"
        >
          <v-icon name="info" filled small />
        </button>

        <div
          v-if="junctionFlags.length"
          class="junction-flags"
          @click.stop
          @keydown.stop
        >
          <label
            v-for="flag in junctionFlags"
            :key="flag.field"
            class="junction-flag"
            :class="{ checked: !!row[flag.field], disabled: readonly }"
          >
            <input
              type="checkbox"
              class="junction-flag-input"
              :checked="!!row[flag.field]"
              :disabled="readonly"
              @change="onFlagToggle(flag.field, $event)"
              @click.stop
            />
            <span class="junction-flag-box" aria-hidden="true">
              <v-icon v-if="row[flag.field]" name="check" x-small />
            </span>
            <span class="junction-flag-label">{{ flag.label }}</span>
          </label>
        </div>

        <!-- Kebab menu (Directus-like actions) -->
        <div class="top-actions">
          <div v-if="isDownloading" class="download-pill" title="Downloading…">
            <v-icon name="progress_activity" class="is-spinning" small />
          </div>

          <div v-if="file?.draft_status === 'draft'" class="draft-pill">
            Draft
          </div>

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
            close-on-content-click
            class="card-actions-menu"
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

            <v-list class="card-actions-list">
              <v-list-item clickable @click="onEdit">
                <v-list-item-icon><v-icon name="edit" small /></v-list-item-icon>
                <v-list-item-content>{{ t('edit') }}</v-list-item-content>
              </v-list-item>

              <v-list-item clickable @click="onPreview">
                <v-list-item-icon><v-icon name="open_in_new" small /></v-list-item-icon>
                <v-list-item-content>{{ t('preview') }}</v-list-item-content>
              </v-list-item>

              <div class="card-actions-divider" role="separator" />

              <v-list-item clickable :disabled="isDownloading" @click="onDownload">
                <v-list-item-icon>
                  <v-icon :name="isDownloading ? 'progress_activity' : 'download'" small :class="{ 'is-spinning': isDownloading }" />
                </v-list-item-icon>
                <v-list-item-content>{{ isDownloading ? 'Downloading…' : t('download') }}</v-list-item-content>
              </v-list-item>

              <v-list-item clickable @click="onShare">
                <v-list-item-icon><v-icon name="share" small /></v-list-item-icon>
                <v-list-item-content>{{ t('share') }}</v-list-item-content>
              </v-list-item>

              <template v-if="!readonly">
                <div class="card-actions-divider" role="separator" />
                <v-list-item clickable class="danger-item" @click.stop="onRemove">
                  <v-list-item-icon><v-icon name="delete" small /></v-list-item-icon>
                  <v-list-item-content>{{ t('remove') }}</v-list-item-content>
                </v-list-item>
              </template>
            </v-list>
          </v-menu>
        </div>
      </div>

      <div
        class="card-footer"
        @click.stop
        @keydown.stop
      >
        <div class="card-meta">
          <p
            class="meta-primary"
            :class="{ 'is-empty': !primaryLabel }"
            :title="primaryLabel || undefined"
          >
            <span class="meta-primary-text">{{ primaryLabel || '\u00a0' }}</span>
          </p>
          <p
            v-if="descriptionText"
            class="meta-line"
            :title="descriptionText"
          >
            {{ descriptionText }}
          </p>
          <div
            v-if="hasCopyright || relativeCreated"
            class="meta-footer"
            :class="{ 'meta-footer--time-only': !hasCopyright }"
          >
            <span
              v-if="hasCopyright"
              class="meta-copyright"
              :title="`© ${copyrightText}`"
            >
              © {{ copyrightText }}
            </span>
            <span v-else-if="relativeCreated" class="meta-copyright-spacer" />
            <span v-if="relativeCreated" class="meta-time">
              <v-icon name="schedule" x-small />
              {{ relativeCreated }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <ExpiryInfoDialog
    v-model="expiryDialogOpen"
    :expiry-date="file?.expiry_date ?? null"
    :title="displayName || file?.filename_download || null"
    :filename="file?.filename_download ?? null"
  />

  <PartnerInfoDialog
    v-model="partnerInfoOpen"
    :image-name="partnerInfoImageName"
    :uploaded-by="partnerInfoUploadedBy"
    :uploaded-date="partnerInfoUploadedDate"
    :partner-name="partnerInfoPartnerName"
  />

  <ShareModal
    v-if="shareModalOpen"
    :file-id="file?.id"
    @close="shareModalOpen = false"
  />

  <DownloadModal
    v-model="downloadModalOpen"
    mode="single"
    :files="downloadModalFiles"
    :labels="downloadModalLabels"
    :on-single-download="handleSingleDownload"
  />
</template>

<style scoped>
.thumbnail-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
  font-family: var(--theme--fonts--sans--font-family);
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  outline: none;
}

.media-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  flex: 1;
  min-height: 100%;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
  background: var(--theme--background);
}

.media-shell.has-partner-accent .meta-footer {
  border-top-color: var(--partner-accent);
}

.media-shell.has-partner-accent .meta-footer--time-only {
  padding-top: 6px;
  border-top: 1px solid var(--partner-accent);
}

.thumb-wrap {
  position: relative;
  overflow: hidden;
  background: var(--theme--background-subdued);
  border: none;
  border-radius: 0;
  flex-shrink: 0;
  --overlay-inset: 8px;
  --overlay-pill-h: 28px;
  --overlay-gap: 6px;
  --overlay-radius: 999px;
  --overlay-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.thumb-preview {
  width: 100%;
  height: 100%;
  transform-origin: center center;
  transition: transform 0.55s ease;
  will-change: transform;
}

.thumbnail-card:hover .thumb-preview {
  transform: scale(1.045);
}

.thumb-shade {
  position: absolute;
  inset: auto 0 0 0;
  height: 36%;
  pointer-events: none;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.18), transparent);
  opacity: 0;
  transition: opacity 0.18s ease;
  z-index: 1;
}

.thumbnail-card:hover .thumb-shade {
  opacity: 1;
}

.partner-info-btn {
  position: absolute;
  top: var(--overlay-inset, 8px);
  left: calc(var(--overlay-inset, 8px) + 28px + 6px);
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  padding: 0;
  border-radius: 8px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--partner-accent) 35%, #fff);
  color: var(--partner-accent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14);
  cursor: pointer;
  outline: none;
  --v-icon-size: 20px;
  --v-icon-color: var(--partner-accent);
}

.partner-info-btn :deep(.v-icon),
.partner-info-btn :deep(i) {
  font-variation-settings: 'FILL' 1;
  font-weight: 600;
}

.partner-info-btn:hover,
.partner-info-btn:focus-visible {
  background: color-mix(in srgb, var(--partner-accent) 12%, #fff);
}

.top-actions {
  position: absolute;
  top: var(--overlay-inset);
  right: var(--overlay-inset);
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: var(--overlay-gap);
  align-items: center;
  justify-content: flex-end;
  max-width: calc(100% - (var(--overlay-inset) * 2) - 36px);
  z-index: 4;
  pointer-events: none;
}

.top-actions > * {
  pointer-events: auto;
}

.expired-pill,
.draft-pill,
.download-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
  box-sizing: border-box;
  height: var(--overlay-pill-h);
  min-height: var(--overlay-pill-h);
  padding: 0 10px;
  border-radius: var(--overlay-radius);
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  user-select: none;
  box-shadow: var(--overlay-shadow);
}

.expired-pill {
  color: var(--theme--danger, #dc3545);
  border: 1px solid color-mix(in srgb, var(--theme--danger, #dc3545) 25%, #fff);
  background: #fff;
  cursor: pointer;
  transition: transform 0.22s ease;
}

.draft-pill {
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: color-mix(in srgb, #a2b5cd 60%, rgba(0, 0, 0, 0.4));
  backdrop-filter: blur(6px);
  pointer-events: none;
}

.download-pill {
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: color-mix(in srgb, var(--theme--primary) 75%, rgba(0, 0, 0, 0.35));
  backdrop-filter: blur(6px);
  pointer-events: none;
  padding: 0 8px;
}

.kebab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 0;
  height: var(--overlay-pill-h);
  min-height: var(--overlay-pill-h);
  padding: 0;
  margin: 0;
  margin-inline-start: calc(-1 * var(--overlay-gap));
  border-radius: 8px;
  border: 1px solid transparent;
  color: var(--theme--foreground);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: none;
  cursor: pointer;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translateX(6px) scale(0.92);
  transition:
    width 0.22s ease,
    margin-inline-start 0.22s ease,
    opacity 0.2s ease,
    transform 0.22s ease,
    background 0.12s,
    border-color 0.12s,
    box-shadow 0.12s;
  outline: none;
  flex-shrink: 0;
}

.thumb-wrap:hover .kebab-btn,
.thumbnail-card:hover .kebab-btn,
.thumbnail-card:focus-visible .kebab-btn,
.kebab-btn.active {
  width: var(--overlay-pill-h);
  margin-inline-start: 0;
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0) scale(1);
  border-color: rgba(255, 255, 255, 0.65);
  box-shadow: var(--overlay-shadow);
}

.kebab-btn.active {
  opacity: 1;
  width: var(--overlay-pill-h);
  pointer-events: auto;
  transform: translateX(0) scale(1);
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

.junction-flags {
  position: absolute;
  right: var(--overlay-inset);
  bottom: var(--overlay-inset);
  z-index: 4;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--overlay-gap);
  max-width: calc(100% - (var(--overlay-inset) * 2) - 36px);
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  pointer-events: auto;
}

.junction-flag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  height: var(--overlay-pill-h);
  min-height: var(--overlay-pill-h);
  padding: 0 10px 0 6px;
  border-radius: var(--overlay-radius);
  border: 1px solid rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: var(--overlay-shadow);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition:
    border-color 0.12s,
    background-color 0.12s;
}

.junction-flag.checked {
  border-color: color-mix(in srgb, var(--theme--primary) 45%, white);
  background: color-mix(in srgb, var(--theme--primary) 10%, white);
}

.junction-flag.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.junction-flag-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.junction-flag-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 4px;
  border: 1.5px solid color-mix(in srgb, var(--theme--primary) 55%, #94a3b8);
  background: rgba(255, 255, 255, 0.85);
  color: #fff;
  transition:
    background 0.12s,
    border-color 0.12s,
    box-shadow 0.12s,
    transform 0.08s;
}

.junction-flag.checked .junction-flag-box {
  background: var(--theme--primary);
  border-color: var(--theme--primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme--primary) 22%, transparent);
}

.junction-flag:not(.disabled):hover .junction-flag-box {
  border-color: var(--theme--primary);
  transform: translateY(-0.5px);
}

.junction-flag-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--theme--foreground);
}

.junction-flag.checked .junction-flag-label {
  color: var(--theme--primary);
}

.is-spinning {
  animation: thumb-dl-spin 0.8s linear infinite;
}

@keyframes thumb-dl-spin {
  to {
    transform: rotate(360deg);
  }
}

.thumbnail-card:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--theme--primary) 35%, transparent);
  outline-offset: 3px;
}

.danger-item {
  color: var(--theme--danger, #dc3545);
}

.card-footer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 10px 12px 11px;
  background: var(--theme--background);
  border: none;
  border-top: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
  cursor: default;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
  width: 100%;
}

.meta-primary {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  min-width: 0;
  min-height: calc(13px * 1.3);
  font-size: 13px;
  font-weight: 600;
  color: var(--theme--foreground);
  line-height: 1.3;
}

.meta-primary.is-empty {
  visibility: hidden;
  pointer-events: none;
  user-select: none;
}

.meta-primary-text {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.meta-secondary {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 11px;
  font-weight: 500;
  color: var(--theme--foreground-subdued);
  line-height: 1.3;
}

.meta-line {
  margin: 0;
  font-size: 11px;
  font-weight: 400;
  color: var(--theme--foreground-subdued);
  line-height: 1.35;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.meta-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  margin-top: auto;
  padding-top: 6px;
  border-top: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
}

.meta-footer--time-only {
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 0;
  border-top: none;
}

.meta-copyright {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 10px;
  color: var(--theme--foreground-subdued);
}

.meta-copyright-spacer {
  flex: 1;
  min-width: 0;
}

.meta-time {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  margin-left: auto;
  font-size: 10px;
  color: var(--theme--foreground-subdued);
  white-space: nowrap;
}
</style>

<style>
/* Teleported v-menu — scoped styles do not reach the popper reliably */
.v-menu-content:has(.card-actions-list) {
  padding: 0;
}

.card-actions-list.v-list {
  padding: 2px 0;
  min-width: 168px;
}

.card-actions-list .v-list-item {
  min-height: 32px;
  --v-list-item-min-height: 32px;
}

.card-actions-list .v-list-item-content {
  padding-block: 0;
  font-size: 13px;
  line-height: 1.25;
}

.card-actions-list .v-list-item-icon {
  --v-icon-color: var(--theme--foreground-subdued);
  margin-inline-end: 8px;
}

.card-actions-divider {
  height: 1px;
  margin: 2px 10px;
  background: var(--theme--border-color-subdued, var(--theme--border-color));
}

.card-actions-list .danger-item,
.card-actions-list .danger-item .v-list-item-content {
  color: var(--theme--danger, #dc3545);
}
</style>
