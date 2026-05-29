export type FileMediaKind = 'image' | 'video' | 'audio' | 'document' | 'other';

const GENERIC_MIMES = new Set([
  '',
  'application/octet-stream',
  'binary/octet-stream',
  'application/unknown',
  'application/x-unknown',
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  bmp: 'image/bmp',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  ogv: 'video/ogg',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  rtf: 'application/rtf',
  csv: 'text/csv',
  zip: 'application/zip',
};

function fileExtension(filename: string | null | undefined): string {
  const name = (filename ?? '').trim();
  if (!name) return '';
  const base = name.split(/[?#]/)[0] ?? name;
  const dot = base.lastIndexOf('.');
  if (dot < 0 || dot === base.length - 1) return '';
  return base.slice(dot + 1).toLowerCase();
}

export function inferMimeFromFilename(filename: string | null | undefined): string | null {
  const ext = fileExtension(filename);
  if (!ext) return null;
  return EXTENSION_TO_MIME[ext] ?? null;
}

function isGenericMime(mimeType: string | null | undefined): boolean {
  const mime = (mimeType ?? '').trim().toLowerCase();
  return GENERIC_MIMES.has(mime);
}

export function resolveMimeType(
  mimeType: string | null | undefined,
  filename?: string | null
): string | null {
  const mime = (mimeType ?? '').trim();
  if (mime && !isGenericMime(mime)) return mime;
  const inferred = inferMimeFromFilename(filename);
  if (inferred) return inferred;
  return mime || null;
}

export function resolveFileMediaKind(
  mimeType: string | null | undefined,
  filename?: string | null
): FileMediaKind {
  return getFileMediaKind(resolveMimeType(mimeType, filename));
}

export function getFileMediaKind(mimeType: string | null | undefined): FileMediaKind {
  const mime = (mimeType ?? '').trim().toLowerCase();
  if (!mime) return 'other';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (
    mime === 'application/pdf' ||
    mime.includes('word') ||
    mime.includes('document') ||
    mime.includes('sheet') ||
    mime.includes('excel') ||
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    mime.includes('text/') ||
    mime.includes('rtf')
  ) {
    return 'document';
  }
  return 'other';
}

export function isImageMime(
  mimeType: string | null | undefined,
  filename?: string | null
): boolean {
  return resolveFileMediaKind(mimeType, filename) === 'image';
}

/** Multi-format asset transforms apply to images only. */
export function supportsMultiFormatDownload(
  mimeType: string | null | undefined,
  filename?: string | null
): boolean {
  return isImageMime(mimeType, filename);
}

export function mimeToIcon(
  mimeType: string | null | undefined,
  filename?: string | null
): string {
  const resolved = resolveMimeType(mimeType, filename);
  const kind = getFileMediaKind(resolved);
  const mime = (resolved ?? '').toLowerCase();
  if (kind === 'video') return 'videocam';
  if (kind === 'audio') return 'audiotrack';
  if (mime === 'application/pdf') return 'picture_as_pdf';
  if (kind === 'document') {
    if (mime.includes('sheet') || mime.includes('excel')) return 'table_chart';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'slideshow';
    return 'description';
  }
  if (mime.includes('zip') || mime.includes('compressed')) return 'folder_zip';
  return 'insert_drive_file';
}

export function mediaKindLabel(kind: FileMediaKind): string {
  switch (kind) {
    case 'image':
      return 'Image';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    case 'document':
      return 'Document';
    default:
      return 'File';
  }
}

export function mimeToKindLabel(
  mimeType: string | null | undefined,
  filename?: string | null
): string {
  return mediaKindLabel(resolveFileMediaKind(mimeType, filename));
}
