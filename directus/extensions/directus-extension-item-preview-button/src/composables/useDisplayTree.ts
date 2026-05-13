import type {
  FieldConfig,
  PreviewConfig,
  DisplayNode,
  LangMap,
  Language,
} from "../types";

// ── Label helpers ──────────────────────────────────────────────────────────────

export function resolveLabel(label: LangMap | undefined | null, lang: string): string {
  if (!label) return "";
  if (typeof label === "string") return label;
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

// ── Internal helpers ───────────────────────────────────────────────────────────

/**
 * Common field names used across Directus schemas to identify the language in
 * a translations junction row. Tried in order when auto-detecting.
 */
const LANG_FIELD_CANDIDATES = [
  "languages_code",
  "translations_id",
  "language_code",
  "lang",
  "locale",
  "language",
];

/**
 * Detect which field in a translations array row identifies the language.
 * Uses the configured langField first, then falls back to known candidates.
 */
function detectLangField(
  row: Record<string, unknown>,
  configuredLangField: string,
): string | null {
  if (configuredLangField in row) return configuredLangField;
  for (const candidate of LANG_FIELD_CANDIDATES) {
    if (candidate in row) return candidate;
  }
  return null;
}

/** True if the array looks like a Directus translations junction */
function isTranslationsArray(
  arr: unknown[],
  configuredLangField: string,
): boolean {
  if (arr.length === 0 || typeof arr[0] !== "object" || arr[0] === null)
    return false;
  return (
    detectLangField(arr[0] as Record<string, unknown>, configuredLangField) !==
    null
  );
}

/**
 * Find the translation record matching the current language.
 *
 * Handles three common Directus patterns:
 *   1. Direct string:  row.languages_code === "de-DE"
 *   2. Nested object:  row.translations_id.code === "de-DE"
 *   3. UUID FK:        row.translations_id === "3a45f078-..." where languages[].id === uuid
 */
function findTranslationMatch(
  arr: Record<string, unknown>[],
  langField: string,
  currentLang: string,
  languages: Language[],
): Record<string, unknown> | null {
  for (const row of arr) {
    const v = row[langField];

    // Pattern 1 — direct string code
    if (v === currentLang) return row;

    // Pattern 2 — nested object (e.g. when the FK was expanded via deep fields)
    if (typeof v === "object" && v !== null) {
      const obj = v as Record<string, unknown>;
      if (
        obj.code === currentLang ||
        obj.languages_code === currentLang ||
        obj.id === currentLang
      )
        return row;
    }
  }

  // Pattern 3 — UUID FK: resolve code → UUID via the fetched languages list
  const langRecord = languages.find((l) => l.code === currentLang);
  if (langRecord?.id) {
    const uuidMatch = arr.find((row) => row[langField] === langRecord.id);
    if (uuidMatch) return uuidMatch;
  }

  // Last resort — return first entry rather than null so something is shown
  return arr[0] ?? null;
}

function formatScalar(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/.test(v)) {
    try {
      return new Date(v).toLocaleString();
    } catch {
      return v;
    }
  }
  return String(v);
}

/**
 * Walk a dot-notation path through item data.
 * Translation arrays are resolved to the current language inline using
 * smart detection + UUID lookup.
 */
function resolveFieldValue(
  data: Record<string, unknown>,
  valuePath: string,
  currentLang: string,
  configuredLangField: string,
  languages: Language[],
): unknown {
  const parts = valuePath.split(".");
  let current: unknown = data;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (current === null || current === undefined) return null;

    if (Array.isArray(current)) {
      const arr = current as Record<string, unknown>[];

      if (isTranslationsArray(arr, configuredLangField)) {
        // Find the effective langField (may differ from the configured one)
        const effectiveLangField =
          detectLangField(arr[0], configuredLangField) ?? configuredLangField;

        const match = findTranslationMatch(
          arr,
          effectiveLangField,
          currentLang,
          languages,
        );
        current = match ? match[part] : null;
      } else {
        // Regular array mid-path — map over all items
        const remainingPath = parts.slice(i).join(".");
        return arr.map((item) =>
          resolveFieldValue(
            item as Record<string, unknown>,
            remainingPath,
            currentLang,
            configuredLangField,
            languages,
          ),
        );
      }
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }

  return current;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Extract all dot-notation paths needed for the Directus /items API call.
 * For translated fields the configured langField is added so filtering works.
 */
export function extractApiFields(config: PreviewConfig): string[] {
  const paths: string[] = [config.title ?? "name"];

  config.groups?.forEach((g) => {
    g.fields?.forEach((fc) => {
      paths.push(fc.value);
      if (fc.type === "translated") {
        const parts = fc.value.split(".");
        if (parts.length > 1) {
          const parentPath = parts.slice(0, -1).join(".");
          // Fetch both common FK field names so auto-detection always works
          paths.push(`${parentPath}.translations_id`);
          // paths.push(`${parentPath}.languages_code`);
        }
      }
    });
  });

  return [...new Set(paths)];
}

export function buildFieldNodes(
  data: Record<string, unknown>,
  fields: FieldConfig[],
  currentLang: string,
  systemLang: string,
  langField: string,
  languages: Language[],
  fieldMetaLabels?: Map<string, LangMap>,
): DisplayNode[] {
  return fields.map((fc) => {
    // Label priority: explicit config label > Directus field meta > prettified leaf key
    const metaLabel = fieldMetaLabels?.get(fc.value);
    const leafKey = fc.key.split(".").pop() ?? fc.key;
    const rawLabel: LangMap = fc.label ?? metaLabel ?? prettify(leafKey);
    const label = resolveLabel(rawLabel, systemLang);
    const value = resolveFieldValue(
      data,
      fc.value,
      currentLang,
      langField,
      languages,
    );

    if (Array.isArray(value)) {
      return {
        key: fc.key,
        label,
        type: "flat-list" as const,
        value: null,
        list: (value as unknown[]).map(formatScalar),
      };
    }

    return { key: fc.key, label, type: "scalar" as const, value };
  });
}
