import { type TranslatableString, resolveTranslatable } from './translations';
import { supportsMultiFormatDownload } from './fileType';

export type DownloadFormatPreset = {
  /** Button label — plain string or locale map: {"en-US":"JPG","fr-FR":"JPG"} */
  label: TranslatableString;
  format?: string;
  width?: number;
  height?: number;
  fit?: string;
  quality?: number;
};

export const DEFAULT_DOWNLOAD_FORMAT_PRESETS: DownloadFormatPreset[] = [
  { label: 'JPG', format: 'jpg' },
  { label: 'PNG', format: 'png' },
  { label: 'WebP', format: 'webp' },
  { label: 'TIFF', format: 'tiff' },
];

export const DEFAULT_DOWNLOAD_FORMAT_PRESETS_JSON = JSON.stringify(
  DEFAULT_DOWNLOAD_FORMAT_PRESETS,
  null,
  2,
);

export function parseDownloadFormatPresets(input: unknown): DownloadFormatPreset[] {
  if (input === null || input === undefined || input === '') {
    return [...DEFAULT_DOWNLOAD_FORMAT_PRESETS];
  }
  const raw =
    typeof input === 'string'
      ? (() => { try { return JSON.parse(input); } catch { return null; } })()
      : input;
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_DOWNLOAD_FORMAT_PRESETS];

  const out: DownloadFormatPreset[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;

    // label may be a string or a translation object
    const rawLabel = (item as any).label;
    let label: TranslatableString | undefined;
    if (typeof rawLabel === 'string' && rawLabel.trim()) {
      label = rawLabel.trim();
    } else if (rawLabel && typeof rawLabel === 'object' && !Array.isArray(rawLabel)) {
      label = rawLabel as Record<string, string>;
    }
    if (!label) continue;

    const preset: DownloadFormatPreset = { label };
    const format = (item as any).format;
    if (format != null && String(format).trim()) preset.format = String(format).trim();
    const width = (item as any).width;
    if (typeof width === 'number' && width > 0) preset.width = width;
    const height = (item as any).height;
    if (typeof height === 'number' && height > 0) preset.height = height;
    const fit = (item as any).fit;
    if (fit != null && String(fit).trim()) preset.fit = String(fit).trim();
    const quality = (item as any).quality;
    if (typeof quality === 'number' && quality >= 1 && quality <= 100) preset.quality = quality;
    out.push(preset);
  }
  return out.length ? out : [...DEFAULT_DOWNLOAD_FORMAT_PRESETS];
}

/** Resolve the button label for a preset to the given locale. */
export function resolvePresetLabel(preset: DownloadFormatPreset, locale: string): string {
  return resolveTranslatable(preset.label, locale, '');
}

export function buildAssetDownloadUrl(
  fileId: string,
  preset: DownloadFormatPreset,
  mimeType?: string | null,
  filename?: string | null,
): string {
  const base = `/assets/${fileId}`;
  if (!supportsMultiFormatDownload(mimeType, filename)) return `${base}?download`;
  const params = new URLSearchParams();
  if (preset.format) params.set('format', preset.format);
  if (preset.width != null) params.set('width', String(preset.width));
  if (preset.height != null) params.set('height', String(preset.height));
  if (preset.fit) params.set('fit', preset.fit);
  if (preset.quality != null) params.set('quality', String(preset.quality));
  params.set('download', '');
  const qs = params.toString();
  return qs ? `${base}?${qs}` : `${base}?download`;
}

export function triggerDownload(url: string, filename?: string | null) {
  const link = document.createElement('a');
  link.href = url;
  if (filename) link.download = filename;
  link.click();
}
