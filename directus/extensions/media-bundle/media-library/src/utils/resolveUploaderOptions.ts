import type { AxiosInstance } from 'axios'

export type UploadFileFieldDef = { field: string; label?: string }

export type ResolvedUploaderOptions = {
  upload_file_fields?: UploadFileFieldDef[] | null
  upload_status_field?: string | null
  upload_status_value?: string | null
  upload_area_folder?: string | null
  geo_enabled?: boolean
  geo_levels?: any[] | null
  geo_cascades?: Record<string, any> | null
  geo_filter_mappings?: Record<string, any> | null
  geo_language_code?: string | null
  geo_label_field?: string | null
}

function parseUploadFileFields(raw: unknown): UploadFileFieldDef[] | null {
  let parsed: unknown = raw
  for (let i = 0; i < 2; i++) {
    if (typeof parsed !== 'string') break
    const trimmed = parsed.trim()
    if (!trimmed) return []
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      return null
    }
  }
  if (!Array.isArray(parsed)) return null
  const defs = parsed
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const field = String((item as { field?: unknown }).field ?? '').trim()
      if (!field) return null
      const rawLabel = (item as { label?: unknown }).label
      const label =
        rawLabel == null || rawLabel === ''
          ? undefined
          : String(rawLabel).trim() || undefined
      return { field, label }
    })
    .filter(Boolean) as UploadFileFieldDef[]
  return defs
}

function parseJsonOption<T>(raw: unknown): T | null {
  if (raw == null) return null
  if (typeof raw === 'object') return raw as T
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as T
  } catch {
    return null
  }
}

/**
 * Read media-uploader interface options from Directus field meta so the
 * Media Library upload modal shows the same File details fields as Hotels/etc.
 */
export async function resolveUploaderOptionsFromFields(
  api: AxiosInstance,
): Promise<ResolvedUploaderOptions | null> {
  try {
    const res = await api.get('/fields')
    const fields: any[] = Array.isArray(res.data?.data) ? res.data.data : []
    const mediaFields = fields.filter(
      (f) => f?.meta?.interface === 'media-uploader' && f?.meta?.options,
    )
    if (!mediaFields.length) return null

    // Prefer hotels (common), then any field that explicitly sets upload_file_fields.
    const preferred =
      mediaFields.find((f) => f.collection === 'hotels') ??
      mediaFields.find((f) => f.meta.options?.upload_file_fields != null) ??
      mediaFields[0]

    const options = preferred?.meta?.options ?? {}
    const uploadFileFields = parseUploadFileFields(options.upload_file_fields)

    return {
      upload_file_fields: uploadFileFields,
      upload_status_field:
        options.upload_status_field != null
          ? String(options.upload_status_field)
          : undefined,
      upload_status_value:
        options.upload_status_value != null
          ? String(options.upload_status_value)
          : undefined,
      upload_area_folder:
        options.upload_area_folder != null
          ? String(options.upload_area_folder)
          : undefined,
      geo_enabled:
        typeof options.geo_enabled === 'boolean' ? options.geo_enabled : undefined,
      geo_levels: parseJsonOption<any[]>(options.geo_levels) ?? undefined,
      geo_cascades: parseJsonOption<Record<string, any>>(options.geo_cascades) ?? undefined,
      geo_filter_mappings:
        parseJsonOption<Record<string, any>>(options.geo_filter_mappings) ?? undefined,
      geo_language_code:
        options.geo_language_code != null
          ? String(options.geo_language_code)
          : undefined,
      geo_label_field:
        options.geo_label_field != null
          ? String(options.geo_label_field)
          : undefined,
    }
  } catch {
    return null
  }
}
