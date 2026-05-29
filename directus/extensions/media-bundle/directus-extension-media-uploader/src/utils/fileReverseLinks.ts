export type AnyRecord = Record<string, any>;

export type ReverseLinkRule = {
  junction_collection: string;
  file_field: string;
  fields?: string | string[];
  section_title?: string;
  limit?: number;
  related_item_field?: string;
  name_field?: string;
  table_headers?: string[];
  table_paths?: string[];
};

export type ReverseSectionLike = {
  relatedItemField?: string;
  nameField?: string;
  fileField: string;
  tableHeaders?: string[];
  tablePaths?: string[];
  rows?: AnyRecord[];
};

export function parseFileReverseLinks(input: unknown): ReverseLinkRule[] {
  if (input === null || input === undefined || input === '') return [];
  const raw =
    typeof input === 'string'
      ? (() => {
          try {
            return JSON.parse(input);
          } catch {
            return null;
          }
        })()
      : input;
  if (!Array.isArray(raw)) return [];

  const out: ReverseLinkRule[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const jc = String((r as any).junction_collection ?? '').trim();
    const ff = String((r as any).file_field ?? '').trim();
    if (!jc || !ff) continue;
    out.push({
      junction_collection: jc,
      file_field: ff,
      fields: (r as any).fields,
      section_title: typeof (r as any).section_title === 'string' ? (r as any).section_title : undefined,
      limit: typeof (r as any).limit === 'number' ? (r as any).limit : undefined,
      related_item_field:
        typeof (r as any).related_item_field === 'string' ? String((r as any).related_item_field).trim() : undefined,
      name_field: typeof (r as any).name_field === 'string' ? String((r as any).name_field).trim() : undefined,
      table_headers: Array.isArray((r as any).table_headers)
        ? (r as any).table_headers.map((x: any) => String(x)).filter(Boolean)
        : undefined,
      table_paths: Array.isArray((r as any).table_paths)
        ? (r as any).table_paths.map((x: any) => String(x)).filter(Boolean)
        : undefined,
    });
  }
  return out;
}

export function normalizeFieldsParam(fields: string | string[] | undefined): string | undefined {
  if (fields == null || fields === '') return undefined;
  if (Array.isArray(fields)) {
    const s = fields.map((x) => String(x).trim()).filter(Boolean);
    return s.length ? s.join(',') : undefined;
  }
  const s = String(fields).trim();
  return s || undefined;
}

export function rowPrettyJson(row: AnyRecord): string {
  try {
    return JSON.stringify(row, null, 2);
  } catch {
    return String(row);
  }
}

export function getByPath(obj: any, path: string | undefined): any {
  if (!path) return undefined;
  const parts = path.split('.').map((p) => p.trim()).filter(Boolean);
  let cur: any = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

export function extractJunctionFileId(value: any): string | null {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const id = (value as any).id;
    if (id != null && id !== '') return String(id);
  }
  return null;
}

export function detectRelatedObject(row: AnyRecord, opts: { relatedItemField?: string; fileField: string }): AnyRecord | null {
  const key = opts.relatedItemField?.trim();
  if (key) {
    const v = row?.[key];
    if (v && typeof v === 'object') return v as AnyRecord;
    return null;
  }

  // Auto-detect: pick the first object-valued field ending with _id that isn't the file FK.
  for (const [k, v] of Object.entries(row ?? {})) {
    if (k === opts.fileField) continue;
    if (!k.endsWith('_id')) continue;
    if (!v || typeof v !== 'object') continue;
    if (!('id' in (v as any))) continue;
    return v as AnyRecord;
  }
  return null;
}

export function reverseTableRows(sec: ReverseSectionLike): { id: string | null; name: string | null }[] {
  const nameField = sec.nameField?.trim() || 'name';
  const fileField = sec.fileField;
  return (sec.rows ?? []).map((jrow) => {
    const related = detectRelatedObject(jrow, { relatedItemField: sec.relatedItemField, fileField });
    const id = related?.id != null ? String(related.id) : null;
    const nameRaw = related ? getByPath(related, nameField) : undefined;
    const name = nameRaw != null && nameRaw !== '' ? String(nameRaw) : null;
    return { id, name };
  });
}

export function reverseTableHeaders(sec: ReverseSectionLike): string[] {
  if (Array.isArray(sec.tableHeaders) && Array.isArray(sec.tablePaths) && sec.tableHeaders.length === sec.tablePaths.length) {
    return sec.tableHeaders;
  }
  return ['id', 'name'];
}

export function reverseTableCells(sec: ReverseSectionLike, jrow: AnyRecord): (string | null)[] {
  if (Array.isArray(sec.tableHeaders) && Array.isArray(sec.tablePaths) && sec.tableHeaders.length === sec.tablePaths.length) {
    return sec.tablePaths.map((p) => {
      const v = getByPath(jrow, p);
      if (v === undefined || v === '') return null;
      if (v === null) return null;
      return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : rowPrettyJson(v as any);
    });
  }

  // Backwards compatible default (old behavior)
  const [row] = reverseTableRows({ ...sec, rows: [jrow] });
  return [row?.id ?? null, row?.name ?? null];
}

