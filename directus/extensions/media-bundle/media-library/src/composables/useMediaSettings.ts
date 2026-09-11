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
  UPLOAD_FILE_FIELDS,
  UPLOAD_STATUS_FIELD,
  UPLOAD_STATUS_VALUE,
} from '../upload-config'
import { resolveUploaderOptionsFromFields } from '../utils/resolveUploaderOptions'

export interface MediaLibrarySettings {
  upload_area_folder: string | null
  geo_enabled: boolean
  geo_required: boolean
  geo_language_code: string
  geo_label_field: string
  geo_levels: any[]
  geo_cascades: Record<string, any>
  geo_filter_mappings: Record<string, any>
  /** directus_files fields shown under File details (from media-uploader config) */
  upload_file_fields: { field: string; label?: string }[]
  upload_status_field: string | null
  upload_status_value: string | null
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
  // Upload validation (media_library_settings) — whitelist only
  upload_validation_enabled: boolean
  allowed_image_formats: string[]
  allowed_video_formats: string[]
  min_image_edge_px: number
  max_image_size_mb: number
  max_video_size_mb: number
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
  // Shared download modal labels (optional settings / $t: keys)
  download_modal_title: string
  download_use_case: string
  download_web_use: string
  download_print_use: string
  download_custom: string
  download_fit: string
  download_width_px: string
  download_height_px: string
  download_quality: string
  download_without_enlargement: string
  download_error_custom_size: string
  download_format: string
  download_resolution: string
  download_hd: string
  download_uhd: string
  download_width_cm: string
  download_height_cm: string
  download_print_hint: string
  download_action: string
  download_zip: string
  download_video_only: string
  download_svg_only: string
  download_vector_video_only: string
  download_error: string
  download_error_print_size: string
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
  upload_file_fields: UPLOAD_FILE_FIELDS,
  upload_status_field: UPLOAD_STATUS_FIELD,
  upload_status_value: UPLOAD_STATUS_VALUE,
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
  upload_validation_enabled: true,
  allowed_image_formats: [
    'jpg',
    'jpeg',
    'png',
    'tif',
    'tiff',
    'svg',
    'webp',
    'avif',
    'gif',
  ],
  allowed_video_formats: ['mp4', 'webm', 'mov'],
  min_image_edge_px: 591,
  max_image_size_mb: 50,
  max_video_size_mb: 2048,
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
  download_modal_title: 'Download',
  download_use_case: 'Use case',
  download_web_use: 'Web Use',
  download_print_use: 'Print Use',
  download_custom: 'Custom',
  download_fit: 'Fit',
  download_width_px: 'Width',
  download_height_px: 'Height',
  download_quality: 'Quality',
  download_without_enlargement: "Don't upscale images",
  download_error_custom_size: 'Enter a valid width and/or height in pixels.',
  download_format: 'Format',
  download_resolution: 'Resolution',
  download_hd: 'HD (1920)',
  download_uhd: 'UHD (3840)',
  download_width_cm: 'Width (cm)',
  download_height_cm: 'Height (cm)',
  download_print_hint: 'JPG · CMYK · 300 dpi',
  download_action: 'Download',
  download_zip: 'Download ZIP',
  download_video_only: 'Videos download as original only.',
  download_svg_only: 'SVG graphics download as original only.',
  download_vector_video_only: 'Videos and SVG graphics download as original only.',
  download_error: 'Download failed. Please try again.',
  download_error_print_size: 'Enter valid width and height in cm.',
}

function parseCsvFormats(raw: unknown, fallback: string[]): string[] {
  let list: string[] = []
  if (Array.isArray(raw)) list = raw.map((v) => String(v ?? ''))
  else if (typeof raw === 'string') list = raw.split(',')
  else return [...fallback]
  const cleaned = list
    .map((s) => s.trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean)
  return cleaned.length ? cleaned : [...fallback]
}

function toPositiveInt(raw: unknown, fallback: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

// Module-level singleton — shared across all components, one API call total
const _settings = ref<MediaLibrarySettings>({ ...DEFAULTS })
const _isLoading = ref(false)
let _fetchPromise: Promise<void> | null = null

export function useMediaSettings() {
  const api = useApi()

  async function fetchSettings(opts?: { force?: boolean }) {
    if (!opts?.force && _fetchPromise) return _fetchPromise
    if (opts?.force) _fetchPromise = null
    _isLoading.value = true

    _fetchPromise = (async () => {
      let data: Record<string, any> | null = null
      try {
        const res = await api.get('/items/media_library_settings')
        data = res.data?.data ?? null
      } catch {
        // Module settings optional — keep going with interface options / defaults
      }

      // Prefer media-uploader field options so File details match Hotels (etc.)
      const uploaderOpts = await resolveUploaderOptionsFromFields(api)

      const p = (key: keyof MediaLibrarySettings) =>
        (data?.[key] as any) || (DEFAULTS[key] as any)

      const settingsUploadFields =
        Array.isArray(data?.upload_file_fields) && data.upload_file_fields.length
          ? data.upload_file_fields
          : null

      // Explicit empty array from interface means "geo only" — respect that.
      const interfaceUploadFields =
        uploaderOpts && 'upload_file_fields' in uploaderOpts
          ? uploaderOpts.upload_file_fields
          : null

      const uploadFileFields =
        settingsUploadFields ??
        (interfaceUploadFields !== null && interfaceUploadFields !== undefined
          ? interfaceUploadFields
          : DEFAULTS.upload_file_fields)

      _settings.value = {
        upload_area_folder:
          data?.upload_area_folder ??
          uploaderOpts?.upload_area_folder ??
          DEFAULTS.upload_area_folder,
        geo_enabled:
          data?.geo_enabled ??
          uploaderOpts?.geo_enabled ??
          DEFAULTS.geo_enabled,
        geo_required: data?.geo_required ?? DEFAULTS.geo_required,
        geo_language_code:
          data?.geo_language_code ||
          uploaderOpts?.geo_language_code ||
          DEFAULTS.geo_language_code,
        geo_label_field:
          data?.geo_label_field ||
          uploaderOpts?.geo_label_field ||
          DEFAULTS.geo_label_field,
        geo_levels:
          data?.geo_levels?.length
            ? data.geo_levels
            : uploaderOpts?.geo_levels?.length
              ? uploaderOpts.geo_levels
              : DEFAULTS.geo_levels,
        geo_cascades:
          data?.geo_cascades ??
          uploaderOpts?.geo_cascades ??
          DEFAULTS.geo_cascades,
        geo_filter_mappings:
          data?.geo_filter_mappings ??
          uploaderOpts?.geo_filter_mappings ??
          DEFAULTS.geo_filter_mappings,
        upload_file_fields: uploadFileFields,
        upload_status_field:
          data?.upload_status_field ??
          uploaderOpts?.upload_status_field ??
          DEFAULTS.upload_status_field,
        upload_status_value:
          data?.upload_status_value ??
          uploaderOpts?.upload_status_value ??
          DEFAULTS.upload_status_value,
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
        upload_validation_enabled:
          data?.upload_validation_enabled === undefined ||
          data?.upload_validation_enabled === null
            ? DEFAULTS.upload_validation_enabled
            : Boolean(data.upload_validation_enabled),
        allowed_image_formats: parseCsvFormats(
          data?.allowed_image_formats,
          DEFAULTS.allowed_image_formats,
        ),
        allowed_video_formats: parseCsvFormats(
          data?.allowed_video_formats,
          DEFAULTS.allowed_video_formats,
        ),
        min_image_edge_px: toPositiveInt(
          data?.min_image_edge_px,
          DEFAULTS.min_image_edge_px,
        ),
        max_image_size_mb: toPositiveInt(
          data?.max_image_size_mb,
          DEFAULTS.max_image_size_mb,
        ),
        max_video_size_mb: toPositiveInt(
          data?.max_video_size_mb,
          DEFAULTS.max_video_size_mb,
        ),
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
        download_modal_title: p('download_modal_title'),
        download_use_case: p('download_use_case'),
        download_web_use: p('download_web_use'),
        download_print_use: p('download_print_use'),
        download_custom: p('download_custom'),
        download_fit: p('download_fit'),
        download_width_px: p('download_width_px'),
        download_height_px: p('download_height_px'),
        download_quality: p('download_quality'),
        download_without_enlargement: p('download_without_enlargement'),
        download_error_custom_size: p('download_error_custom_size'),
        download_format: p('download_format'),
        download_resolution: p('download_resolution'),
        download_hd: p('download_hd'),
        download_uhd: p('download_uhd'),
        download_width_cm: p('download_width_cm'),
        download_height_cm: p('download_height_cm'),
        download_print_hint: p('download_print_hint'),
        download_action: p('download_action'),
        download_zip: p('download_zip'),
        download_video_only: p('download_video_only'),
        download_svg_only: p('download_svg_only'),
        download_vector_video_only: p('download_vector_video_only'),
        download_error: p('download_error'),
        download_error_print_size: p('download_error_print_size'),
      }
    })()
      .catch(() => {
        // Keep defaults silently
      })
      .finally(() => {
        _isLoading.value = false
      })

    return _fetchPromise
  }

  return { settings: readonly(_settings), isLoading: readonly(_isLoading), fetchSettings }
}
