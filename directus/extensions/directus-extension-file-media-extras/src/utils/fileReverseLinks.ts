export type AnyRecord = Record<string, any>;

export type ReverseLinkRule = {
  junction_collection: string;
  file_field: string;
  fields?: string | string[];
  section_title?: string;
  limit?: number;
  table_headers?: string[];
  table_paths?: string[];
};

export function parseFileReverseLinks(input: unknown): ReverseLinkRule[] {
  if (input === null || input === undefined || input === '') return [];
  const raw =
    typeof input === 'string'
      ? (() => { try { return JSON.parse(input); } catch { return null; } })()
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

export type ReverseSectionLike = {
  fileField: string;
  tableHeaders?: string[];
  tablePaths?: string[];
  rows?: AnyRecord[];
};

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
      if (v === undefined || v === '' || v === null) return null;
      return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
        ? String(v)
        : JSON.stringify(v);
    });
  }
  return [jrow?.id != null ? String(jrow.id) : null, null];
}
