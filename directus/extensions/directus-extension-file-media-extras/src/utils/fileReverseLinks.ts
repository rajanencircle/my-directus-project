import { type TranslatableString, resolveTranslatable } from './translations';

export type { TranslatableString };
export { resolveTranslatable };

export type AnyRecord = Record<string, any>;

/** A single column definition: the visible header (translatable) + the dot-path to read from a row. */
export type ColumnDef = {
  header: TranslatableString;
  path: string;
};

export type ReverseLinkRule = {
  junction_collection: string;
  file_field: string;
  /** Comma-separated or array of field paths to fetch, e.g. "*, hotels_id.*" */
  fields?: string | string[];
  /** Section heading — plain string or locale map. */
  section_title?: TranslatableString;
  limit?: number;
  /** Preferred: column definitions with header + path. */
  columns?: ColumnDef[];
  /** Legacy: parallel arrays (still supported for back-compat). */
  table_headers?: Array<TranslatableString>;
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

    // Parse columns — new format: [{header, path}, ...]
    let columns: ColumnDef[] | undefined;
    const rawColumns = (r as any).columns;
    if (Array.isArray(rawColumns)) {
      const parsed = rawColumns
        .filter((c: any) => c && typeof c === 'object' && c.path)
        .map((c: any) => ({
          header: parseTrans(c.header) ?? String(c.path),
          path: String(c.path).trim(),
        }))
        .filter((c) => c.path);
      if (parsed.length) columns = parsed;
    } else if (typeof rawColumns === 'string' && rawColumns.trim()) {
      // Handle JSON string stored by the code editor field
      try {
        const parsed = JSON.parse(rawColumns);
        if (Array.isArray(parsed)) {
          const cols = parsed
            .filter((c: any) => c && typeof c === 'object' && c.path)
            .map((c: any) => ({
              header: parseTrans(c.header) ?? String(c.path),
              path: String(c.path).trim(),
            }))
            .filter((c) => c.path);
          if (cols.length) columns = cols;
        }
      } catch {}
    }

    out.push({
      junction_collection: jc,
      file_field: ff,
      fields: (r as any).fields,
      section_title: parseTrans((r as any).section_title),
      limit: typeof (r as any).limit === 'number' ? (r as any).limit : undefined,
      columns,
      // legacy parallel-array format
      table_headers: Array.isArray((r as any).table_headers)
        ? (r as any).table_headers.map((x: any) => parseTrans(x) ?? String(x)).filter(Boolean)
        : undefined,
      table_paths: Array.isArray((r as any).table_paths)
        ? (r as any).table_paths.map((x: any) => String(x)).filter(Boolean)
        : undefined,
    });
  }
  return out;
}

function parseTrans(v: any): TranslatableString | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v || undefined;
  if (typeof v === 'object' && !Array.isArray(v)) return v as Record<string, string>;
  return undefined;
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
  columns?: ColumnDef[];
  tableHeaders?: Array<TranslatableString>;
  tablePaths?: string[];
  rows?: AnyRecord[];
};

/** Return the display headers resolved to the given locale. */
export function resolvedTableHeaders(sec: ReverseSectionLike, locale: string): string[] {
  if (sec.columns?.length) {
    return sec.columns.map((c) =>
      resolveTranslatable(c.header, locale, c.path),
    );
  }
  if (
    Array.isArray(sec.tableHeaders) &&
    Array.isArray(sec.tablePaths) &&
    sec.tableHeaders.length === sec.tablePaths.length
  ) {
    return sec.tableHeaders.map((h, i) =>
      resolveTranslatable(h, locale, sec.tablePaths![i] ?? ''),
    );
  }
  return ['id', 'name'];
}

/** Return the cell values for a row (order matches resolvedTableHeaders). */
export function resolvedTableCells(sec: ReverseSectionLike, jrow: AnyRecord): (string | null)[] {
  const paths: string[] = sec.columns?.length
    ? sec.columns.map((c) => c.path)
    : Array.isArray(sec.tablePaths) && sec.tablePaths.length
      ? sec.tablePaths
      : [];

  if (paths.length) {
    return paths.map((p) => {
      const v = getByPath(jrow, p);
      if (v === undefined || v === '' || v === null) return null;
      return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
        ? String(v)
        : JSON.stringify(v);
    });
  }

  return [jrow?.id != null ? String(jrow.id) : null, null];
}
