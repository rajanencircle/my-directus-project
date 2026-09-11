/** Directus storage preset for list/grid thumbnails (Settings → Files & Storage). */
export const THUMBNAIL_PRESET_KEY = 'thumbnail';

export function buildAssetUrl(
  fileId: string,
  options?: { key?: string; cacheBuster?: string | number | null },
): string {
  const params = new URLSearchParams();
  if (options?.key) params.set('key', options.key);
  if (options?.cacheBuster != null && options.cacheBuster !== '') {
    params.set('v', String(options.cacheBuster));
  }
  const query = params.toString();
  return `/assets/${fileId}${query ? `?${query}` : ''}`;
}

/** Image preview URL — always uses the `thumbnail` preset (no ad-hoc width/height/fit). */
export function getThumbnailAssetUrl(
  fileId: string,
  cacheBuster?: string | number | null,
): string {
  return buildAssetUrl(fileId, { key: THUMBNAIL_PRESET_KEY, cacheBuster });
}

/** Full original file (videos, open in new tab). No transform params. */
export function getOriginalAssetUrl(
  fileId: string,
  cacheBuster?: string | number | null,
): string {
  return buildAssetUrl(fileId, { cacheBuster });
}
