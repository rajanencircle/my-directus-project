import { ref, readonly } from 'vue'
import { useApi } from '@directus/extensions-sdk'
import { DEFAULT_GEO_LEVELS } from '../utils/geoLevels'

export interface MediaLibrarySettings {
  upload_area_folder: string | null
  geo_enabled: boolean
  geo_required: boolean
  geo_language_code: string
  geo_label_field: string
  geo_levels: any[]
  geo_cascades: Record<string, any>
  geo_filter_mappings: Record<string, any>
}

const DEFAULTS: MediaLibrarySettings = {
  upload_area_folder: null,
  geo_enabled: true,
  geo_required: true,
  geo_language_code: 'en-GB',
  geo_label_field: 'translations.name',
  geo_levels: DEFAULT_GEO_LEVELS,
  geo_cascades: {},
  geo_filter_mappings: {},
}

export function useMediaSettings() {
  const api = useApi()
  const settings = ref<MediaLibrarySettings>({ ...DEFAULTS })
  const isLoading = ref(false)

  async function fetchSettings() {
    isLoading.value = true
    try {
      const res = await api.get('/items/media_library_settings')
      const data = res.data?.data
      if (data) {
        settings.value = {
          upload_area_folder: data.upload_area_folder ?? DEFAULTS.upload_area_folder,
          geo_enabled: data.geo_enabled ?? DEFAULTS.geo_enabled,
          geo_required: data.geo_required ?? DEFAULTS.geo_required,
          geo_language_code: data.geo_language_code ?? DEFAULTS.geo_language_code,
          geo_label_field: data.geo_label_field ?? DEFAULTS.geo_label_field,
          geo_levels: data.geo_levels?.length ? data.geo_levels : DEFAULTS.geo_levels,
          geo_cascades: data.geo_cascades ?? DEFAULTS.geo_cascades,
          geo_filter_mappings: data.geo_filter_mappings ?? DEFAULTS.geo_filter_mappings,
        }
      }
    } catch {
      // API unavailable or no permission — fall back to hardcoded defaults silently
    } finally {
      isLoading.value = false
    }
  }

  return { settings: readonly(settings), isLoading, fetchSettings }
}
