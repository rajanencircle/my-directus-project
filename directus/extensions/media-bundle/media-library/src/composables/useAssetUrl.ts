import { useApi } from '@directus/extensions-sdk'

/** Directus storage preset for image previews (Settings → Files & Storage). */
export const THUMBNAIL_PRESET_KEY = 'thumbnail'

export interface AssetOptions {
  /** Storage preset key — use for previews when transformations are preset-only. */
  key?: string
  /** Cache-buster appended as `v=<value>` (file modified_on). */
  cacheBuster?: string | number | null
}

export function useAssetUrl() {
  const api = useApi()

  const baseUrl = (api.defaults.baseURL ?? '').replace(/\/$/, '')

  function getAssetUrl(fileId: string, options: AssetOptions = {}): string {
    const params = new URLSearchParams()
    if (options.key) params.set('key', options.key)
    if (options.cacheBuster != null && options.cacheBuster !== '') {
      params.set('v', String(options.cacheBuster))
    }

    const query = params.toString()
    return `${baseUrl}/assets/${fileId}${query ? '?' + query : ''}`
  }

  function getThumbnailUrl(fileId: string, _size = 48, cacheBuster?: string | number | null): string {
    return getAssetUrl(fileId, { key: THUMBNAIL_PRESET_KEY, cacheBuster })
  }

  function getPreviewUrl(fileId: string, cacheBuster?: string | number | null): string {
    return getThumbnailUrl(fileId, 48, cacheBuster)
  }

  return { getAssetUrl, getThumbnailUrl, getPreviewUrl }
}
