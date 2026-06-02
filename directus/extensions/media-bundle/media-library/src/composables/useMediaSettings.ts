import { ref, readonly } from 'vue'
import { useApi } from '@directus/extensions-sdk'
import {
  UPLOAD_AREA_FOLDER,
  GEO_ENABLED,
  GEO_LEVELS,
  GEO_CASCADES,
  GEO_FILTER_MAPPINGS,
  GEO_LANGUAGE_CODE,
  GEO_LABEL_FIELD,
} from '../upload-config'

export interface MediaLibrarySettings {
  upload_area_folder: string | null
  geo_enabled: boolean
  geo_required: boolean
  geo_language_code: string
  geo_label_field: string
  geo_levels: any[]
  geo_cascades: Record<string, any>
  geo_filter_mappings: Record<string, any>
  // Module navigation labels
  page_title: string
  no_files_label: string
  albums_section_label: string
  nav_all_files_label: string
  nav_my_files_label: string
  nav_recent_label: string
  // Shared upload modal labels (ml_)
  upload_modal_title: string
  upload_to_folder: string
  upload_drop_primary: string
  upload_drop_secondary: string
  upload_selected_label: string
  upload_ready_count: string
  upload_clear_all: string
  upload_geo_optional: string
  upload_geo_required_error: string
  upload_err_response: string
  upload_err_network: string
  upload_err_timeout: string
  // Shared folder dropdown labels (ml_)
  folder_no_access: string
  folder_loading: string
  folder_root: string
  // Shared geo labels (ml_)
  geo_section_title: string
  geo_search_placeholder: string
  geo_loading: string
  geo_no_results: string
  // Media Library specific labels
  search_placeholder: string
  search_clear: string
  search_filter: string
  file_loading: string
  file_fallback_title: string
  file_not_found: string
  file_go_back: string
  sidebar_file_info: string
  sidebar_downloads: string
  sidebar_type: string
  sidebar_size: string
  sidebar_dimensions: string
  sidebar_uploaded: string
  sidebar_modified: string
  sidebar_id: string
  download_original: string
}

const DEFAULTS: MediaLibrarySettings = {
  upload_area_folder: UPLOAD_AREA_FOLDER,
  geo_enabled: GEO_ENABLED,
  geo_required: true,
  geo_language_code: GEO_LANGUAGE_CODE,
  geo_label_field: GEO_LABEL_FIELD,
  geo_levels: GEO_LEVELS,
  geo_cascades: GEO_CASCADES,
  geo_filter_mappings: GEO_FILTER_MAPPINGS,
  page_title: 'Media Library',
  no_files_label: 'No files here. Drop files to upload.',
  albums_section_label: 'Albums',
  nav_all_files_label: 'All Files',
  nav_my_files_label: 'My Files',
  nav_recent_label: 'Recent',
  upload_modal_title: 'Upload Files',
  upload_to_folder: 'Upload to folder',
  upload_drop_primary: 'Drag & drop files here',
  upload_drop_secondary: 'or click to browse',
  upload_selected_label: 'Selected',
  upload_ready_count: 'ready to upload',
  upload_clear_all: 'Clear all',
  upload_geo_optional: 'Optional. Selected geography IDs will be saved on the uploaded file.',
  upload_geo_required_error: 'Please fill in required geography fields',
  upload_err_response: 'Uploaded but failed to process response.',
  upload_err_network: 'Network error during upload.',
  upload_err_timeout: 'Upload timed out.',
  folder_no_access: 'No folders available.',
  folder_loading: 'Loading folders…',
  folder_root: 'File Library',
  geo_section_title: 'Geography',
  geo_search_placeholder: 'Search {label}…',
  geo_loading: 'Loading…',
  geo_no_results: 'No results found',
  search_placeholder: 'Search…',
  search_clear: 'Clear',
  search_filter: 'Filter',
  file_loading: 'Loading…',
  file_fallback_title: 'File Detail',
  file_not_found: 'File not found or could not be loaded.',
  file_go_back: 'Go back',
  sidebar_file_info: 'File Info',
  sidebar_downloads: 'Downloads',
  sidebar_type: 'Type',
  sidebar_size: 'Size',
  sidebar_dimensions: 'Dimensions',
  sidebar_uploaded: 'Uploaded',
  sidebar_modified: 'Modified',
  sidebar_id: 'ID',
  download_original: 'Download Original',
}

// Module-level singleton — shared across all components, one API call total
const _settings = ref<MediaLibrarySettings>({ ...DEFAULTS })
const _isLoading = ref(false)
let _fetchPromise: Promise<void> | null = null

export function useMediaSettings() {
  const api = useApi()

  async function fetchSettings() {
    if (_fetchPromise) return _fetchPromise
    _isLoading.value = true
    _fetchPromise = api
      .get('/items/media_library_settings')
      .then((res) => {
        const data = res.data?.data
        if (!data) return
        const p = (key: keyof MediaLibrarySettings) =>
          (data[key] as any) || (DEFAULTS[key] as any)
        _settings.value = {
          upload_area_folder: data.upload_area_folder ?? DEFAULTS.upload_area_folder,
          geo_enabled: data.geo_enabled ?? DEFAULTS.geo_enabled,
          geo_required: data.geo_required ?? DEFAULTS.geo_required,
          geo_language_code: p('geo_language_code'),
          geo_label_field: p('geo_label_field'),
          geo_levels: data.geo_levels?.length ? data.geo_levels : DEFAULTS.geo_levels,
          geo_cascades: data.geo_cascades ?? DEFAULTS.geo_cascades,
          geo_filter_mappings: data.geo_filter_mappings ?? DEFAULTS.geo_filter_mappings,
          page_title: p('page_title'),
          no_files_label: p('no_files_label'),
          albums_section_label: p('albums_section_label'),
          nav_all_files_label: p('nav_all_files_label'),
          nav_my_files_label: p('nav_my_files_label'),
          nav_recent_label: p('nav_recent_label'),
          upload_modal_title: p('upload_modal_title'),
          upload_to_folder: p('upload_to_folder'),
          upload_drop_primary: p('upload_drop_primary'),
          upload_drop_secondary: p('upload_drop_secondary'),
          upload_selected_label: p('upload_selected_label'),
          upload_ready_count: p('upload_ready_count'),
          upload_clear_all: p('upload_clear_all'),
          upload_geo_optional: p('upload_geo_optional'),
          upload_geo_required_error: p('upload_geo_required_error'),
          upload_err_response: p('upload_err_response'),
          upload_err_network: p('upload_err_network'),
          upload_err_timeout: p('upload_err_timeout'),
          folder_no_access: p('folder_no_access'),
          folder_loading: p('folder_loading'),
          folder_root: p('folder_root'),
          geo_section_title: p('geo_section_title'),
          geo_search_placeholder: p('geo_search_placeholder'),
          geo_loading: p('geo_loading'),
          geo_no_results: p('geo_no_results'),
          search_placeholder: p('search_placeholder'),
          search_clear: p('search_clear'),
          search_filter: p('search_filter'),
          file_loading: p('file_loading'),
          file_fallback_title: p('file_fallback_title'),
          file_not_found: p('file_not_found'),
          file_go_back: p('file_go_back'),
          sidebar_file_info: p('sidebar_file_info'),
          sidebar_downloads: p('sidebar_downloads'),
          sidebar_type: p('sidebar_type'),
          sidebar_size: p('sidebar_size'),
          sidebar_dimensions: p('sidebar_dimensions'),
          sidebar_uploaded: p('sidebar_uploaded'),
          sidebar_modified: p('sidebar_modified'),
          sidebar_id: p('sidebar_id'),
          download_original: p('download_original'),
        }
      })
      .catch(() => {
        // API unavailable — keep defaults silently
      })
      .finally(() => {
        _isLoading.value = false
      })
    return _fetchPromise
  }

  return { settings: readonly(_settings), isLoading: readonly(_isLoading), fetchSettings }
}
