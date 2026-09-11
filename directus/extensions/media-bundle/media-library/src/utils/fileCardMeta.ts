export function formatFilesize(bytes: unknown): string {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return ''
  const kb = n / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.round((Date.now() - then) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  const days = Math.round(hours / 24)
  if (days < 30) return days === 1 ? '1 day ago' : `${days} days ago`
  const months = Math.round(days / 30)
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`
  const years = Math.round(months / 12)
  return years === 1 ? '1 year ago' : `${years} years ago`
}

export function isPlaceholderCopyright(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return true
  if (normalized === '@none' || normalized === 'none' || normalized === 'n/a' || normalized === 'na') {
    return true
  }
  return /^[@·•\-–—_/|]+$/.test(value.trim())
}

export function extractCopyrightText(raw: string | null | undefined): string {
  const c = raw?.trim()
  if (!c) return ''
  return c.replace(/^©+\s*/, '').trim()
}

export function filePrimaryTitle(file: {
  generated_filename?: string | null
  title?: string | null
  filename_disk?: string | null
  filename_download?: string | null
}): string {
  return (
    file.generated_filename?.trim() ||
    file.title?.trim() ||
    file.filename_download?.trim() ||
    file.filename_disk?.trim() ||
    'Unnamed file'
  )
}

/** Grid / assignment card name line — generated filename only (no title/filename fallbacks). */
export function fileGeneratedName(file: {
  generated_filename?: string | null
}): string {
  return file.generated_filename?.trim() || ''
}

/** Prefer create date for card footers; fall back to upload time when create is missing. */
export function fileCreateIso(file: {
  created_on?: string | null
  uploaded_on?: string | null
}): string | null {
  return file.created_on ?? file.uploaded_on ?? null
}

/** Walk `uploaded_by.partner_selected.label` (and O2M arrays) like native Directus `get()`. */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj
  if (obj == null) return undefined
  if (!path.includes('.')) {
    if (typeof obj !== 'object') return undefined
    return (obj as Record<string, unknown>)[path]
  }
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null) return undefined
    if (Array.isArray(acc)) {
      const mapped = acc.map((el) =>
        el != null && typeof el === 'object' ? (el as Record<string, unknown>)[key] : undefined,
      )
      return mapped.length <= 1 ? mapped[0] : mapped
    }
    if (typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[key]
  }, obj)
}

export function fileUploadIso(file: {
  uploaded_on?: string | null
  created_on?: string | null
  modified_on?: string | null
}): string | null {
  return file.uploaded_on ?? file.created_on ?? file.modified_on ?? null
}
