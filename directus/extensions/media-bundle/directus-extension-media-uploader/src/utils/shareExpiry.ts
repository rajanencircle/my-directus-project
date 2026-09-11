/** Normalize datetime from Directus datetime interface for API storage. */
export function normalizeShareExpiryValue(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return trimmed;
    return parsed.toISOString();
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString();
  }
  return String(value);
}

export function buildShareExpiryFormField(
  collection: string,
  field: string,
  label: string,
  stored?: Record<string, any> | null,
) {
  return {
    collection,
    field,
    type: 'timestamp',
    name: stored?.name ?? label,
    meta: {
      ...(stored?.meta ?? {}),
      interface: 'datetime',
      display: 'datetime',
      width: 'full',
      options: {
        ...(stored?.meta?.options ?? {}),
      },
    },
  };
}
