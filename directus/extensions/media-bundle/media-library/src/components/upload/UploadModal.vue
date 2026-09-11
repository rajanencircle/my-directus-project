<script setup lang="ts">
/**
 * Thin adapter — reuses the media-uploader UploadModal (File details + geography)
 * so Hotels Media tab and Media Library share one implementation.
 */
import { computed, provide, watch, onMounted, nextTick, ref } from 'vue'
import SharedUploadModal from '../../../../directus-extension-media-uploader/src/components/UploadModal.vue'
import { useMediaSettings } from '../../composables/useMediaSettings'
import { resolveTranslatable } from '../../utils/translations'
import { useT } from '../../composables/useT'

const props = defineProps<{
  modelValue: boolean
  initialFolder?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'uploaded', fileIds: string[]): void
}>()

const { settings, fetchSettings } = useMediaSettings()
const { t } = useT()
const settingsReady = ref(false)

onMounted(async () => {
  await fetchSettings()
  settingsReady.value = true
})

const r = (key: string | null | undefined, fallback: string) =>
  key ? resolveTranslatable(key, t, fallback) : fallback

provide(
  'uploaderLabels',
  computed(() => ({
    uploadModalTitle: r(settings.value.upload_modal_title, 'Upload Files'),
    uploadToFolder: r(settings.value.upload_to_folder, 'Upload to folder'),
    uploadDropPrimary: r(settings.value.upload_drop_primary, 'Drag & drop files here'),
    uploadDropSecondary: r(settings.value.upload_drop_secondary, 'or click to browse'),
    uploadSelectedLabel: r(settings.value.upload_selected_label, 'Selected'),
    uploadReadyCount: r(settings.value.upload_ready_count, 'ready to upload'),
    uploadClearAll: r(settings.value.upload_clear_all, 'Clear all'),
    uploadGeoRequiredError: r(
      settings.value.upload_geo_required_error,
      'Please fill in required geography fields',
    ),
    uploadRequiredFieldsError: 'Please fill in required fields',
    uploadFileFieldsTitle: 'File details',
    folderRoot: r(settings.value.folder_root, 'File Library'),
    folderLoading: r(settings.value.folder_loading, 'Loading folders…'),
    folderNoAccess: r(settings.value.folder_no_access, 'No folders available.'),
    geoSectionTitle: r(settings.value.geo_section_title, 'Geography'),
    geoNoResults: r(settings.value.geo_no_results, 'No results found'),
    geoLoading: r(settings.value.geo_loading, 'Loading…'),
  })),
)

/** When module setting geo_required is on, force required on every configured level. */
const geoLevelsForModal = computed(() => {
  const levels = Array.isArray(settings.value.geo_levels) ? settings.value.geo_levels : []
  if (!settings.value.geo_required) return levels
  return levels.map((lvl: any) => ({
    ...lvl,
    required: lvl.required !== false,
  }))
})

/** Reuse settings already loaded by useMediaSettings — no second validation API call. */
const initialValidationSettings = computed(() => ({
  enabled: settings.value.upload_validation_enabled !== false,
  allowedImageFormats: [...(settings.value.allowed_image_formats ?? [])],
  allowedVideoFormats: [...(settings.value.allowed_video_formats ?? [])],
  minImageEdgePx: settings.value.min_image_edge_px,
  maxImageSizeMb: settings.value.max_image_size_mb,
  maxVideoSizeMb: settings.value.max_video_size_mb,
}))

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    // One settings refresh when the upload modal opens (not per file)
    await fetchSettings({ force: true })
    nextTick(() => lowerDialogZIndex())
  },
)

function lowerDialogZIndex() {
  const outlet = document.getElementById('dialog-outlet')
  if (!outlet) return
  for (const overlay of outlet.querySelectorAll<HTMLElement>(':scope > *')) {
    if (overlay.querySelector('.upload-card')) {
      overlay.style.zIndex = '20'
      const container = overlay.querySelector<HTMLElement>('.container')
      if (container) container.style.zIndex = '20'
      break
    }
  }
}

function onClose() {
  emit('update:modelValue', false)
}

function onUploaded(fileIds: string[]) {
  emit('uploaded', fileIds)
  emit('update:modelValue', false)
}
</script>

<template>
  <SharedUploadModal
    v-if="modelValue && settingsReady"
    :default-folder="initialFolder ?? null"
    :upload-area-folder="settings.upload_area_folder"
    :allowed-types="'*/*'"
    :max-file-size="null"
    :geo-enabled="settings.geo_enabled"
    :geo-levels="geoLevelsForModal"
    :geo-cascades="settings.geo_cascades"
    :geo-filter-mappings="settings.geo_filter_mappings"
    :geo-language-code="settings.geo_language_code"
    :geo-label-field="settings.geo_label_field"
    :upload-status-field="settings.upload_status_field"
    :upload-status-value="settings.upload_status_value"
    :upload-file-fields="settings.upload_file_fields"
    :initial-validation-settings="initialValidationSettings"
    @close="onClose"
    @uploaded="onUploaded"
  />
</template>
