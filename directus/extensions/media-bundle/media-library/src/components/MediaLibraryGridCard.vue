<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DirectusFile } from '../stores/files.store'
import FileThumbPreview from '../../../directus-extension-media-uploader/src/components/FileThumbPreview.vue'
import ExpiryInfoDialog from '../../../directus-extension-media-uploader/src/components/ExpiryInfoDialog.vue'
import PartnerInfoDialog from '../../../directus-extension-media-uploader/src/components/PartnerInfoDialog.vue'
import { isExpired } from '../../../directus-extension-media-uploader/src/utils/expiry'
import {
  fileGeneratedName,
  fileCreateIso,
  filePrimaryTitle,
  formatRelativeTime,
} from '../utils/fileCardMeta'
import {
  partnerAccentStyle,
  partnerLabelFromUser,
  partnerVisuallyFromUser,
  userDisplayName,
} from '../utils/partnerAccent'

const props = defineProps<{
  file: DirectusFile
  selected?: boolean
}>()

defineEmits<{
  (e: 'click'): void
  (e: 'toggle-select'): void
}>()

const expiryDialogOpen = ref(false)
const partnerInfoOpen = ref(false)

const primaryLabel = computed(() => fileGeneratedName(props.file))
const altLabel = computed(() => filePrimaryTitle(props.file))

const descriptionText = computed(() => props.file.description?.trim() || '')

const copyrightText = computed(() => {
  const c = props.file.copyright?.trim()
  if (!c) return ''
  return c.replace(/^©+\s*/, '').trim()
})

const hasCopyright = computed(() => copyrightText.value.length > 0)

const relativeCreated = computed(() => formatRelativeTime(fileCreateIso(props.file)))

const expired = computed(() => isExpired(props.file.expiry_date ?? null))

const uploadedBy = computed(
  () => (props.file as Record<string, unknown>).uploaded_by,
)

const accentStyle = computed(() =>
  partnerAccentStyle(partnerVisuallyFromUser(uploadedBy.value)),
)

const partnerInfoImageName = computed(
  () =>
    fileGeneratedName(props.file) ||
    filePrimaryTitle(props.file) ||
    props.file.filename_download?.trim() ||
    '',
)

const partnerInfoUploadedBy = computed(
  () => userDisplayName(uploadedBy.value) || '',
)

const partnerInfoPartnerName = computed(
  () => partnerLabelFromUser(uploadedBy.value) || '',
)

const partnerInfoUploadedDate = computed(() => {
  const iso = props.file.uploaded_on ?? fileCreateIso(props.file)
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
})

function openExpiryInfo(event: Event) {
  event.stopPropagation()
  expiryDialogOpen.value = true
}

function openPartnerInfo(event: Event) {
  event.stopPropagation()
  partnerInfoOpen.value = true
}
</script>

<template>
  <div
    class="library-grid-card"
    :class="{ selected }"
    role="button"
    tabindex="0"
    @click="$emit('click')"
    @keydown.enter.prevent="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <div class="media-shell" :class="{ 'has-partner-accent': !!accentStyle }" :style="accentStyle">
      <div class="thumb-wrap">
        <FileThumbPreview
          class="thumb-preview"
          :file-id="file.id"
          :mime-type="file.type"
          :filename="file.filename_disk"
          :alt="altLabel"
          :modified-on="file.modified_on"
          :show-kind-badge="false"
        />

        <div class="thumb-shade" aria-hidden="true" />

        <button
          v-if="accentStyle"
          type="button"
          class="partner-info-btn"
          title="Media info"
          @click="openPartnerInfo"
        >
          <v-icon name="info" filled small />
        </button>

        <div class="top-actions">
          <div v-if="file.draft_status === 'draft'" class="draft-pill">Draft</div>
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
            Don't use
          </div>
        </div>

        <div class="grid-checkbox" @click.stop @keydown.stop>
          <v-checkbox
            :model-value="selected"
            :value="file.id"
            icon-on="check_circle"
            icon-off="radio_button_unchecked"
            @update:model-value="$emit('toggle-select')"
          />
        </div>
      </div>

      <div class="card-footer">
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
    :expiry-date="file.expiry_date ?? null"
    :title="altLabel"
    :filename="file.filename_download ?? file.filename_disk ?? null"
  />

  <PartnerInfoDialog
    v-model="partnerInfoOpen"
    :image-name="partnerInfoImageName"
    :uploaded-by="partnerInfoUploadedBy"
    :uploaded-date="partnerInfoUploadedDate"
    :partner-name="partnerInfoPartnerName"
  />
</template>

<style scoped>
.library-grid-card {
  cursor: pointer;
  outline: none;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
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
  transition: border-color 0.15s ease;
}

.library-grid-card.selected .media-shell {
  border-color: var(--theme--primary);
  box-shadow: 0 0 0 1px var(--theme--primary);
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
  aspect-ratio: 1 / 1;
  background: var(--theme--background-subdued);
  flex-shrink: 0;
  --lib-overlay-inset: 8px;
  --lib-overlay-size: 28px;
  --lib-overlay-gap: 8px;
}

.thumb-preview {
  width: 100%;
  height: 100%;
  transform-origin: center center;
  transition: transform 0.55s ease;
  will-change: transform;
}

.library-grid-card:hover .thumb-preview {
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
}

.library-grid-card:hover .thumb-shade {
  opacity: 1;
}

.partner-info-btn {
  position: absolute;
  top: var(--lib-overlay-inset);
  left: var(--lib-overlay-inset);
  z-index: 4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
  width: var(--lib-overlay-size);
  height: var(--lib-overlay-size);
  min-width: var(--lib-overlay-size);
  min-height: var(--lib-overlay-size);
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
  transition:
    left 0.22s ease,
    background 0.12s ease,
    border-color 0.12s ease;
}

.partner-info-btn :deep(.v-icon),
.partner-info-btn :deep(i) {
  font-variation-settings: 'FILL' 1;
  font-weight: 600;
}

.library-grid-card:hover .partner-info-btn,
.library-grid-card.selected .partner-info-btn,
.library-grid-card:focus-within .partner-info-btn {
  left: calc(
    var(--lib-overlay-inset) + var(--lib-overlay-size) + var(--lib-overlay-gap)
  );
}

.partner-info-btn:hover,
.partner-info-btn:focus-visible {
  background: color-mix(in srgb, var(--partner-accent) 12%, #fff);
}

.top-actions {
  position: absolute;
  top: var(--lib-overlay-inset);
  right: var(--lib-overlay-inset);
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
  z-index: 2;
}

.draft-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: color-mix(in srgb, #a2b5cd 60%, rgba(0, 0, 0, 0.4));
  backdrop-filter: blur(6px);
  pointer-events: none;
  user-select: none;
}

.expired-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: var(--lib-overlay-size);
  min-height: var(--lib-overlay-size);
  border-radius: 999px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 800;
  color: var(--theme--danger, #dc3545);
  border: 1px solid color-mix(in srgb, var(--theme--danger, #dc3545) 25%, #fff);
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14);
  cursor: pointer;
  user-select: none;
}

.grid-checkbox {
  position: absolute;
  top: var(--lib-overlay-inset);
  left: var(--lib-overlay-inset);
  z-index: 3;
  box-sizing: border-box;
  width: var(--lib-overlay-size);
  height: var(--lib-overlay-size);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--theme--primary) 35%, #fff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.18s ease,
    border-color 0.12s ease;
}

.library-grid-card:hover .grid-checkbox,
.library-grid-card.selected .grid-checkbox {
  opacity: 1;
  pointer-events: auto;
}

.grid-checkbox :deep(.v-checkbox) {
  --v-checkbox-unchecked-color: var(--theme--primary);
  --v-icon-color: var(--theme--primary);
  --v-icon-size: 20px;
}

.grid-checkbox :deep(.v-checkbox .checkbox) {
  filter: none;
}

.grid-checkbox :deep(.v-checkbox.checked) {
  --v-icon-color: var(--theme--primary);
}

.grid-checkbox :deep(.v-checkbox.checked .checkbox) {
  background: transparent;
  border-radius: 0;
  filter: none;
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

.library-grid-card:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--theme--primary) 35%, transparent);
  outline-offset: 3px;
  border-radius: 10px;
}
</style>
