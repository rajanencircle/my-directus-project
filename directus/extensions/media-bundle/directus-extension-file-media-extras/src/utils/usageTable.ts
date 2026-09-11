import { type TranslatableString, resolveTranslatable } from './translations';

export type { TranslatableString };
export { resolveTranslatable };

export type AnyRecord = Record<string, any>;

export type ColumnType = 'static' | 'path' | 'link';

export type UsageColumn = {
  key: string;
  header: TranslatableString;
  type: ColumnType;
};

export type SourceFieldPath = {
  column_key: string;
  path: string;
};

export type UsageSource = {
  product_label: TranslatableString;
  junction_collection: string;
  file_field: string;
  fields?: string | string[];
  /** Optional admin collection override for link columns */
  link_collection?: string;
  field_paths: SourceFieldPath[];
};

export type UsageTableConfig = {
  title?: TranslatableString;
  columns: UsageColumn[];
  sources: UsageSource[];
};

export type UnifiedRow = {
  key: string;
  sourceIndex: number;
  cells: Array<{
    text: string | null;
    href: string | null;
    isLink: boolean;
  }>;
};

function parseTrans(v: any): TranslatableString | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return undefined;
    if (t.startsWith('{')) {
      try {
        const parsed = JSON.parse(t);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, string>;
        }
      } catch {
        /* plain string */
      }
    }
    return t;
  }
  if (typeof v === 'object' && !Array.isArray(v)) return v as Record<string, string>;
  return undefined;
}

function parseJsonMaybe(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  const t = input.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return input;
  }
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

function displayNameFromValue(v: any): string | null {
  if (v === undefined || v === '' || v === null) return null;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return String(v);
  }
  if (Array.isArray(v)) {
    for (const item of v) {
      const name = displayNameFromValue(item);
      if (name) return name;
    }
    return null;
  }
  if (typeof v === 'object') {
    const keys = [
      'name',
      'name_tour',
      'name_excursion',
      'name_vehicle',
      'name_company',
      'headline',
      'title',
    ];
    for (const key of keys) {
      const n = (v as AnyRecord)[key];
      if (typeof n === 'string' && n.trim()) return n.trim();
    }
  }
  return null;
}

function formatCellValue(v: any): string | null {
  const named = displayNameFromValue(v);
  if (named != null) return named;
  if (v === undefined || v === '' || v === null) return null;
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
    ? String(v)
    : JSON.stringify(v);
}

function parseColumnType(v: any): ColumnType {
  const t = String(v ?? 'path').toLowerCase();
  if (t === 'static' || t === 'link' || t === 'path') return t;
  return 'path';
}

function parseColumns(raw: unknown): UsageColumn[] {
  const arr = parseJsonMaybe(raw);
  if (!Array.isArray(arr)) return [];
  const out: UsageColumn[] = [];
  for (const c of arr) {
    if (!c || typeof c !== 'object') continue;
    const key = String((c as any).key ?? '').trim();
    if (!key) continue;
    out.push({
      key,
      header: parseTrans((c as any).header) ?? key,
      type: parseColumnType((c as any).type),
    });
  }
  return out;
}

function parseSources(raw: unknown): UsageSource[] {
  const arr = parseJsonMaybe(raw);
  if (!Array.isArray(arr)) return [];
  const out: UsageSource[] = [];
  for (const s of arr) {
    if (!s || typeof s !== 'object') continue;
    const junction = String((s as any).junction_collection ?? '').trim();
    const fileField = String((s as any).file_field ?? '').trim();
    if (!junction || !fileField) continue;

    const pathsRaw = (s as any).field_paths;
    const field_paths: SourceFieldPath[] = [];
    if (Array.isArray(pathsRaw)) {
      for (const p of pathsRaw) {
        if (!p || typeof p !== 'object') continue;
        const column_key = String((p as any).column_key ?? '').trim();
        const path = String((p as any).path ?? '').trim();
        if (!column_key || !path) continue;
        field_paths.push({ column_key, path });
      }
    }

    out.push({
      product_label: parseTrans((s as any).product_label) ?? junction,
      junction_collection: junction,
      file_field: fileField,
      fields: (s as any).fields,
      link_collection:
        typeof (s as any).link_collection === 'string' && (s as any).link_collection.trim()
          ? String((s as any).link_collection).trim()
          : undefined,
      field_paths,
    });
  }
  return out;
}

/** Parse the new unified usage-table options. */
export function parseUsageTableConfig(input: {
  usage_table_title?: unknown;
  usage_columns?: unknown;
  usage_sources?: unknown;
}): UsageTableConfig {
  return {
    title: parseTrans(input.usage_table_title),
    columns: parseColumns(input.usage_columns),
    sources: parseSources(input.usage_sources),
  };
}

export function resolveColumnHeaders(columns: UsageColumn[], locale: string): string[] {
  return columns.map((c) => {
    const raw = resolveTranslatable(c.header, locale, c.key);
    // Guard against accidental object/string glitches (e.g. "Productsen")
    if (typeof raw !== 'string' || !raw.trim()) return c.key;
    return raw.trim();
  });
}

function pathForColumn(source: UsageSource, columnKey: string): string | undefined {
  return source.field_paths.find((p) => p.column_key === columnKey)?.path;
}

/**
 * Convert a dotted path into a Directus nested `_icontains` filter.
 * e.g. hotels_id.name + "alice" → { hotels_id: { name: { _icontains: "alice" } } }
 */
export function pathToIContainsFilter(path: string, query: string): AnyRecord {
  const parts = path.split('.').map((p) => p.trim()).filter(Boolean);
  let filter: AnyRecord = { _icontains: query };
  for (let i = parts.length - 1; i >= 0; i--) {
    filter = { [parts[i]!]: filter };
  }
  return filter;
}

/** Extra leaf fields to try when the name path points at a translations relation. */
const TRANSLATION_NAME_LEAVES = [
  'name',
  'name_tour',
  'name_excursion',
  'name_vehicle',
  'name_company',
  'headline',
  'title',
];

/**
 * Build `_or` search clauses for a product source from configured id/name paths only.
 */
export function buildSourceSearchFilter(
  source: UsageSource,
  query: string,
): AnyRecord | null {
  const q = query.trim();
  if (!q) return null;

  const or: AnyRecord[] = [];
  const idPath = pathForColumn(source, 'id');
  const namePath = pathForColumn(source, 'name');

  if (idPath) or.push(pathToIContainsFilter(idPath, q));
  if (namePath) {
    or.push(pathToIContainsFilter(namePath, q));
    // If name maps to a translations collection, also search common name leaves
    if (/(^|\.)descriptions_translations$/.test(namePath)) {
      for (const leaf of TRANSLATION_NAME_LEAVES) {
        or.push(pathToIContainsFilter(`${namePath}.${leaf}`, q));
      }
    }
  }

  if (!or.length) return null;
  return { _or: or };
}

/**
 * Full Directus filter: file match + optional name/id search.
 */
export function buildSourceItemFilter(
  source: UsageSource,
  fileId: string,
  searchQuery: string,
): AnyRecord {
  const and: AnyRecord[] = [
    { [source.file_field.trim()]: { _eq: fileId } },
  ];
  const search = buildSourceSearchFilter(source, searchQuery);
  if (search) and.push(search);
  return and.length === 1 ? and[0]! : { _and: and };
}

function adminHrefFromPath(
  row: AnyRecord,
  path: string,
  linkCollection?: string,
): string | null {
  const m = path.match(/^([a-zA-Z0-9_]+)\.id$/);
  let id: any = null;
  let collection = linkCollection?.trim() || '';

  if (m) {
    const rel = row[m[1]];
    id = rel && typeof rel === 'object' ? rel.id : rel;
    if (!collection) collection = m[1].replace(/_id$/, '');
  } else {
    id = getByPath(row, path);
    if (id && typeof id === 'object' && id.id != null) id = id.id;
  }

  if (id == null || id === '' || !collection) return null;
  return `/admin/content/${collection}/${id}`;
}

/** Build one unified table row from a junction row + source + column defs. */
export function buildUnifiedRow(
  columns: UsageColumn[],
  source: UsageSource,
  sourceIndex: number,
  row: AnyRecord,
  rowIndex: number,
  locale: string,
): UnifiedRow {
  const cells = columns.map((col) => {
    if (col.type === 'static') {
      return {
        text: resolveTranslatable(source.product_label, locale, ''),
        href: null,
        isLink: false,
      };
    }

    const path = pathForColumn(source, col.key);
    if (!path) {
      return { text: null, href: null, isLink: col.type === 'link' };
    }

    if (col.type === 'link') {
      const href = adminHrefFromPath(row, path, source.link_collection);
      const text = formatCellValue(getByPath(row, path));
      return {
        text: text ?? (href ? 'Open' : null),
        href,
        isLink: true,
      };
    }

    return {
      text: formatCellValue(getByPath(row, path)),
      href: null,
      isLink: false,
    };
  });

  return {
    key: `${source.junction_collection}-${sourceIndex}-${String(row.id ?? rowIndex)}`,
    sourceIndex,
    cells,
  };
}
