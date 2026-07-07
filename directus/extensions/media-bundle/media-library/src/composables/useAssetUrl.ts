import { useApi } from '@directus/extensions-sdk'

export interface AssetOptions {
  width?: number
  height?: number
  fit?: 'cover' | 'contain' | 'inside' | 'outside'
  quality?: number
  format?: 'jpg' | 'png' | 'webp' | 'avif'
  // Cache-buster appended as `v=<value>` (same param the native Directus app
  // uses). Pass the file's modified_on so the URL changes whenever the file's
  // content changes — assets are served with a 30-day browser cache, so
  // without this, a replaced file's old thumbnail keeps being shown.
  cacheBuster?: string | number | null
}

export function useAssetUrl() {
  const api = useApi()

  // Derive base URL from the axios instance base URL (strips trailing slash)
  const baseUrl = (api.defaults.baseURL ?? '').replace(/\/$/, '')

  function getAssetUrl(fileId: string, options: AssetOptions = {}): string {
    const params = new URLSearchParams()
    if (options.width) params.set('width', String(options.width))
    if (options.height) params.set('height', String(options.height))
    if (options.fit) params.set('fit', options.fit)
    if (options.quality) params.set('quality', String(options.quality))
    if (options.format) params.set('format', options.format)
    if (options.cacheBuster) params.set('v', String(options.cacheBuster))

    const query = params.toString()
    return `${baseUrl}/assets/${fileId}${query ? '?' + query : ''}`
  }

  function getThumbnailUrl(fileId: string, size = 48, cacheBuster?: string | number | null): string {
    return getAssetUrl(fileId, { width: size, height: size, fit: 'cover', cacheBuster })
  }

  function getPreviewUrl(fileId: string, cacheBuster?: string | number | null): string {
    return getAssetUrl(fileId, { width: 800, fit: 'contain', cacheBuster })
  }

  return { getAssetUrl, getThumbnailUrl, getPreviewUrl }
}
