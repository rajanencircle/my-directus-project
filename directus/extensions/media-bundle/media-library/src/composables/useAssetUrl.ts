import { useApi } from '@directus/extensions-sdk'

export interface AssetOptions {
  width?: number
  height?: number
  fit?: 'cover' | 'contain' | 'inside' | 'outside'
  quality?: number
  format?: 'jpg' | 'png' | 'webp' | 'avif'
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

    const query = params.toString()
    return `${baseUrl}/assets/${fileId}${query ? '?' + query : ''}`
  }

  function getThumbnailUrl(fileId: string, size = 48): string {
    return getAssetUrl(fileId, { width: size, height: size, fit: 'cover' })
  }

  function getPreviewUrl(fileId: string): string {
    return getAssetUrl(fileId, { width: 800, fit: 'contain' })
  }

  return { getAssetUrl, getThumbnailUrl, getPreviewUrl }
}
