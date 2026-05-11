import type {
  FieldTree,
  DisplayNode,
  LangMap,
  FieldEntry,
  PreviewConfig,
} from "../types";

// ── Label helpers ──────────────────────────────────────────────────────────────

export function resolveLabel(label: LangMap, lang: string): string {
  if (typeof label === "string") return label;
  // Try exact → language prefix → en-US → en → first value
  return (
    label[lang] ??
    label[lang.split("-")[0]] ??
    label["en-US"] ??
    label["en"] ??
    Object.values(label)[0] ??
    ""
  );
}

export function prettify(key: string): string {
  return key
    .replace(/_id$/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// ── Config helpers ─────────────────────────────────────────────────────────────

function fieldPath(e: FieldEntry): string {
  return typeof e === "string" ? e : e.field;
}

/** Extract all dot-notation field paths from a config (for the Directus API call) */
export function extractApiFields(config: PreviewConfig): string[] {
  const paths: string[] = [];
  config.fields?.forEach((f) => paths.push(fieldPath(f)));
  config.groups?.forEach((g) =>
    g.fields.forEach((f) => paths.push(fieldPath(f))),
  );
  return [...new Set(paths)];
}

/**
 * Build a map of fieldPath → LangMap for custom label overrides.
 * Also maps root keys, so "country.name" label applies to the "country" root display node.
 */
export function buildLabelMap(config: PreviewConfig): Map<string, LangMap> {
  const map = new Map<string, LangMap>();
  const process = (e: FieldEntry) => {
    if (typeof e !== "string" && e.label) {
      map.set(e.field, e.label);
      // Also map the root key so relation headers pick up the label
      const root = e.field.split(".")[0];
      if (!map.has(root)) map.set(root, e.label);
    }
  };
  config.fields?.forEach(process);
  config.groups?.forEach((g) => g.fields.forEach(process));
  return map;
}

// ── Field tree builder ─────────────────────────────────────────────────────────

export function parseFieldsToTree(fields: string[]): FieldTree {
  const tree: FieldTree = {};
  for (const f of fields) {
    let node = tree;
    const parts = f.split(".");
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (i === parts.length - 1) {
        if (!(p in node)) node[p] = null;
      } else {
        if (!node[p]) node[p] = {};
        node = node[p] as FieldTree;
      }
    }
  }
  return tree;
}

// ── Display node builder ───────────────────────────────────────────────────────

function isTranslationsLike(arr: unknown[], langField: string): boolean {
  return (
    arr.length > 0 &&
    typeof arr[0] === "object" &&
    arr[0] !== null &&
    langField in (arr[0] as object)
  );
}

function formatScalar(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    try {
      return new Date(v).toLocaleString();
    } catch {
      return v;
    }
  }
  return String(v);
}

export function buildDisplayNodes(
  data: Record<string, unknown>,
  tree: FieldTree,
  language: string,
  langField: string,
  labelMap?: Map<string, LangMap>,
  /** dot-path prefix for nested recursive calls — used to look up deep labels */
  keyPrefix?: string,
): DisplayNode[] {
  const nodes: DisplayNode[] = [];

  for (const [key, subTree] of Object.entries(tree)) {
    if (key === langField) continue;

    const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;
    const value = data[key];

    // Resolve label: full path → root key → auto-prettify
    const rawLabel: LangMap =
      labelMap?.get(fullKey) ?? labelMap?.get(key) ?? prettify(key);
    const label = resolveLabel(rawLabel, language);

    // ── Leaf scalar ───────────────────────────────────────────────────────────
    if (subTree === null) {
      nodes.push({ key, label, type: "scalar", value });
      continue;
    }

    // ── Null / missing relation ───────────────────────────────────────────────
    if (value === null || value === undefined) {
      nodes.push({ key, label, type: "scalar", value: null });
      continue;
    }

    // ── Array relation ────────────────────────────────────────────────────────
    if (Array.isArray(value)) {
      if (value.length === 0) {
        nodes.push({ key, label, type: "scalar", value: null });
        continue;
      }

      // Translations-like → resolve current language inline (don't render as a list)
      if (isTranslationsLike(value, langField)) {
        const match =
          (value as Record<string, unknown>[]).find(
            (t) => t[langField] === language,
          ) ??
          value[0] ??
          {};
        const children = buildDisplayNodes(
          match as Record<string, unknown>,
          subTree,
          language,
          langField,
          labelMap,
          fullKey,
        );
        // Push translated sub-fields directly (without a wrapper node)
        nodes.push(...children);
        continue;
      }

      // Regular o2m / m2m array
      const items = (value as Record<string, unknown>[]).map((item) =>
        buildDisplayNodes(
          item,
          subTree,
          language,
          langField,
          labelMap,
          fullKey,
        ),
      );

      // If every item resolves to a single scalar → compact tag list
      const allSingleScalar = items.every(
        (row) => row.length === 1 && row[0].type === "scalar",
      );
      if (allSingleScalar) {
        nodes.push({
          key,
          label,
          type: "flat-list",
          value: null,
          list: items.map((row) => formatScalar(row[0].value)),
        });
      } else {
        nodes.push({ key, label, type: "array", value: null, items });
      }
      continue;
    }

    // ── Object (m2o) relation ─────────────────────────────────────────────────
    if (typeof value === "object") {
      const children = buildDisplayNodes(
        value as Record<string, unknown>,
        subTree,
        language,
        langField,
        labelMap,
        fullKey,
      );
      if (children.length === 0) {
        nodes.push({ key, label, type: "scalar", value: null });
      } else if (children.length === 1 && children[0].type === "scalar") {
        // Single scalar child → inline (e.g. hotel_group.name → "Hotel Group: Marriott")
        nodes.push({ key, label, type: "scalar", value: children[0].value });
      } else {
        nodes.push({ key, label, type: "relation", value: null, children });
      }
    }
  }

  return nodes;
}
