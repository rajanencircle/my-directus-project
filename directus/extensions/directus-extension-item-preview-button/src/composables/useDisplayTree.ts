import type {
  FieldConfig,
  PreviewConfig,
  DisplayNode,
  LangMap,
  Language,
} from "../types";

// ── Label helpers ──────────────────────────────────────────────────────────────

export function resolveLabel(
  label: LangMap | undefined | null,
  lang: string,
): string {
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

/**
 * Resolve a Directus "translation string" reference (`$t:some_key`), as found in
 * e.g. `meta.options.choices[].text`, using the admin app's own i18n instance
 * (which already has `directus_translations` loaded into its messages).
 * Falls back to the raw key if no translation is registered.
 */
function resolveTranslatable(
  text: string,
  translate?: (key: string) => string,
): string {
  if (!text.startsWith("$t:")) return text;
  const key = text.slice(3);
  if (!translate) return key;
  const translated = translate(key);
  return translated === key ? key : translated;
}

/** Resolve a raw value against a set of dropdown choices, applying $t: translation. */
function resolveChoiceValue(
  raw: unknown,
  choices: Array<{ text: string; value: unknown }> | undefined,
  translate?: (key: string) => string,
): string | undefined {
  if (!choices?.length) return undefined;
  const match = choices.find(
    (c) => c.value === raw || String(c.value) === String(raw),
  );
  return match ? resolveTranslatable(String(match.text), translate) : undefined;
}

function formatDateRange(start?: unknown, end?: unknown): string {
  if (!start || typeof start !== "string") return "";
  const fmt = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };
  return end && typeof end === "string" ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}

function formatScalar(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/.test(v)) {
    try {
      return new Date(v).toLocaleString();
    } catch {
      return v;
    }
  }
  // Nested arrays/objects would otherwise stringify to "[object Object]" —
  // summarize them as readable key/value pairs instead.
  if (Array.isArray(v)) {
    return v.length ? v.map(formatScalar).join(", ") : "—";
  }
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>);
    return entries.length
      ? entries.map(([k, val]) => `${k}: ${formatScalar(val)}`).join(", ")
      : "—";
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

function addTranslationHelper(paths: string[], path: string): void {
  const parts = path.split(".");
  if (parts.length > 1) {
    const parentPath = parts.slice(0, -1).join(".");
    // Every translations junction in this project's schema uses "translations_id"
    // as its language FK — confirmed against room_categories_translations,
    // hotel_descriptions_translations, and the place/country/state/region
    // relations. Requesting the other common-candidate names (languages_code,
    // language_code, lang, locale, language) 403s on collections that don't
    // have them, since Directus validates every path in a single request
    // atomically — one bad field fails the whole call.
    paths.push(`${parentPath}.translations_id`);
  }
}

/**
 * Extract all dot-notation paths needed for the Directus /items API call.
 * For translated fields the language FK is added so filtering works.
 * The title path is treated the same way, since it may itself live behind a
 * translations relation (e.g. tours/excursions have no direct `name` field).
 */
export function extractApiFields(config: PreviewConfig): string[] {
  const titlePath = config.title ?? "name";
  const paths: string[] = [titlePath];
  addTranslationHelper(paths, titlePath);

  config.groups?.forEach((g) => {
    g.fields?.forEach((fc) => {
      if (fc.type === "repeater" && fc.fields?.length) {
        // Explicit sub-fields need their own deep paths requested — the parent
        // array path alone only returns default columns for each item.
        fc.fields.forEach((subFc) => {
          const subPath = `${fc.value}.${subFc.value}`;
          paths.push(subPath);
          // A nested "repeater" sub-field (e.g. a raw JSON array like
          // days_repeater) isn't a translations relation — walking into it
          // with a dot-path would 403 as an unknown field. Only "translated"
          // needs the language FK helper.
          if (subFc.type === "translated") {
            addTranslationHelper(paths, subPath);
          }
        });
        return;
      }
      if (fc.type === "price-table") {
        const groupField = fc.groupField || "room_category_id";
        const rowField = fc.rowField || "price_date_id";
        const columnField = fc.columnField || "room_occupancy_id";
        const buyField = fc.buyPriceField || "buy_price";
        const sellField = fc.sellPriceField || "sell_price";
        const groupsSource = fc.groupsSource || "room_categories";
        const rowsSource = fc.rowsSource || "price_dates";
        const columnsSource = fc.columnsSource || "room_occupancies";

        [groupField, rowField, columnField, buyField, sellField].forEach(
          (sub) => paths.push(`${fc.value}.${sub}`),
        );
        paths.push(`${groupsSource}.id`, `${groupsSource}.room_category`);
        paths.push(
          `${rowsSource}.id`,
          `${rowsSource}.name`,
          `${rowsSource}.start_date`,
          `${rowsSource}.end_date`,
        );
        paths.push(`${columnsSource}.id`, `${columnsSource}.occupancies_id.value`);
        const occLabelPath = `${columnsSource}.occupancies_id.translations.occupancy`;
        paths.push(occLabelPath);
        addTranslationHelper(paths, occLabelPath);
        return;
      }
      paths.push(fc.value);
      if (fc.type === "translated" || fc.type === "repeater") {
        addTranslationHelper(paths, fc.value);
      }
    });
  });

  return [...new Set(paths)];
}

/** Resolve the modal title from raw item data, supporting dot-paths and translation arrays. */
export function resolveTitle(
  data: Record<string, unknown>,
  titlePath: string,
  currentLang: string,
  langField: string,
  languages: Language[],
): string {
  const value = resolveFieldValue(data, titlePath, currentLang, langField, languages);
  return typeof value === "string" ? value : "";
}

export function buildFieldNodes(
  data: Record<string, unknown>,
  fields: FieldConfig[],
  currentLang: string,
  systemLang: string,
  langField: string,
  languages: Language[],
  fieldMetaLabels?: Map<string, LangMap>,
  fieldChoices?: Map<string, Array<{ text: string; value: unknown }>>,
  noAccessPaths?: Set<string>,
  translate?: (key: string) => string,
): DisplayNode[] {
  return fields.map((fc) => {
    // Label priority: explicit config label > Directus field meta > prettified leaf key
    const metaLabel = fieldMetaLabels?.get(fc.value);
    const leafKey = fc.key.split(".").pop() ?? fc.key;
    const rawLabel: LangMap = fc.label ?? metaLabel ?? prettify(leafKey);
    const label = resolveLabel(rawLabel, systemLang);

    // ── Field dropped from the request because the API rejected it (permission/unknown-field) ──
    if (noAccessPaths?.has(fc.value)) {
      return { key: fc.key, label, type: "scalar" as const, value: "⚠ No access" };
    }

    // ── Dropdown: resolve stored key → display text ───────────────────────────
    if (fc.type === "dropdown") {
      const raw = resolveFieldValue(
        data,
        fc.value,
        currentLang,
        langField,
        languages,
      );
      const choices = fieldChoices?.get(fc.value);
      const resolved = resolveChoiceValue(raw, choices, translate);
      return {
        key: fc.key,
        label,
        type: "scalar" as const,
        value: resolved ?? formatScalar(raw),
      };
    }

    // ── Repeater: array of objects → nested DisplayNode[][] ──────────────────
    if (fc.type === "repeater") {
      const raw = resolveFieldValue(
        data,
        fc.value,
        currentLang,
        langField,
        languages,
      );
      const arr = Array.isArray(raw)
        ? (raw as Record<string, unknown>[]).filter(
            (item) => item !== null && typeof item === "object",
          )
        : [];

      const items: DisplayNode[][] = arr.map((item) => {
        if (fc.fields?.length) {
          // Use explicit sub-field definitions
          return fc.fields.map((subFc) => {
            const subMetaLabel = fieldMetaLabels?.get(
              `${fc.value}.${subFc.value}`,
            );
            const subLeafKey = subFc.key.split(".").pop() ?? subFc.key;
            const subRawLabel: LangMap =
              subFc.label ?? subMetaLabel ?? prettify(subLeafKey);
            const subLabel = resolveLabel(subRawLabel, systemLang);

            // A repeater nested inside another repeater's fields (e.g. a raw
            // JSON array field like "days_repeater") gets its own nested card
            // list — one row per property — the same way the top-level
            // repeater branch renders, instead of being flattened into a
            // single dense inline value.
            if (subFc.type === "repeater") {
              const subRaw = resolveFieldValue(
                item,
                subFc.value,
                currentLang,
                langField,
                languages,
              );
              const subArr = Array.isArray(subRaw)
                ? (subRaw as Record<string, unknown>[]).filter(
                    (i) => i !== null && typeof i === "object",
                  )
                : [];
              const subItems: DisplayNode[][] = subArr.map((innerItem) => {
                // Explicit sub-sub-field list (e.g. only "days_label") wins
                // over auto-detecting every property on the JSON row.
                if (subFc.fields?.length) {
                  return subFc.fields.map((leafFc) => {
                    const leafMetaLabel = fieldMetaLabels?.get(
                      `${fc.value}.${subFc.value}.${leafFc.value}`,
                    );
                    const leafLeafKey = leafFc.key.split(".").pop() ?? leafFc.key;
                    const leafRawLabel: LangMap =
                      leafFc.label ?? leafMetaLabel ?? prettify(leafLeafKey);
                    const leafLabel = resolveLabel(leafRawLabel, systemLang);
                    const leafVal = (innerItem as Record<string, unknown>)[
                      leafFc.value
                    ];
                    if (Array.isArray(leafVal)) {
                      return {
                        key: leafFc.key,
                        label: leafLabel,
                        type: "flat-list" as const,
                        value: null,
                        list: (leafVal as unknown[]).map(formatScalar),
                      };
                    }
                    return {
                      key: leafFc.key,
                      label: leafLabel,
                      type: "scalar" as const,
                      value: leafVal,
                    };
                  });
                }
                return Object.entries(innerItem)
                  .filter(([, v]) => v !== null && v !== undefined)
                  .map(([k, v]) => {
                    if (Array.isArray(v)) {
                      return {
                        key: k,
                        label: prettify(k),
                        type: "flat-list" as const,
                        value: null,
                        list: (v as unknown[]).map(formatScalar),
                      };
                    }
                    return {
                      key: k,
                      label: prettify(k),
                      type: "scalar" as const,
                      value: v,
                    };
                  });
              });
              return {
                key: subFc.key,
                label: subLabel,
                type: "repeater" as const,
                value: null,
                items: subItems,
                hideLabel: subFc.hideLabel,
              };
            }

            // Resolve through nested dot-paths (translations arrays, m2o relations)
            // the same way top-level fields do — plain property access can't
            // reach e.g. "translations.room_category_additions" or "room_category_catering.designation".
            const subVal = resolveFieldValue(
              item,
              subFc.value,
              currentLang,
              langField,
              languages,
            );
            // Arrays of primitives render as a tag list; arrays of objects (e.g.
            // a raw JSON repeater field) are left as-is for FieldValue's own
            // object-array rendering, which is far more readable than String(obj).
            if (
              Array.isArray(subVal) &&
              subVal.every((v) => v === null || typeof v !== "object")
            ) {
              return {
                key: subFc.key,
                label: subLabel,
                type: "flat-list" as const,
                value: null,
                list: (subVal as unknown[]).map(formatScalar),
                cardTitle: subFc.cardTitle,
              };
            }
            const subChoices = fieldChoices?.get(`${fc.value}.${subFc.value}`);
            const subResolved =
              subVal === null || typeof subVal !== "object"
                ? resolveChoiceValue(subVal, subChoices, translate)
                : undefined;
            return {
              key: subFc.key,
              label: subLabel,
              type: "scalar" as const,
              value: subResolved ?? subVal,
              cardTitle: subFc.cardTitle,
            };
          });
        }
        // Auto-detect: show every property except null/undefined
        return Object.entries(item)
          .filter(([, v]) => v !== null && v !== undefined)
          .map(([k, v]) => {
            if (Array.isArray(v)) {
              return {
                key: k,
                label: prettify(k),
                type: "flat-list" as const,
                value: null,
                list: (v as unknown[]).map(formatScalar),
              };
            }
            const choices = fieldChoices?.get(`${fc.value}.${k}`);
            const resolved = resolveChoiceValue(v, choices, translate);
            return {
              key: k,
              label: prettify(k),
              type: "scalar" as const,
              value: resolved ?? v,
            };
          });
      });

      return {
        key: fc.key,
        label,
        type: "repeater" as const,
        value: null,
        items,
        hideLabel: fc.hideLabel,
      };
    }

    // ── Price table: grouped category × date × occupancy buy/sell table ─────
    if (fc.type === "price-table") {
      const groupField = fc.groupField || "room_category_id";
      const rowField = fc.rowField || "price_date_id";
      const columnField = fc.columnField || "room_occupancy_id";
      const buyField = fc.buyPriceField || "buy_price";
      const sellField = fc.sellPriceField || "sell_price";
      const groupsSource = fc.groupsSource || "room_categories";
      const rowsSource = fc.rowsSource || "price_dates";
      const columnsSource = fc.columnsSource || "room_occupancies";

      const asArray = (v: unknown): Record<string, unknown>[] =>
        Array.isArray(v)
          ? (v as unknown[]).filter(
              (i) => i !== null && typeof i === "object",
            ) as Record<string, unknown>[]
          : [];

      const priceRecords = asArray(
        resolveFieldValue(data, fc.value, currentLang, langField, languages),
      );
      const categories = asArray(
        resolveFieldValue(data, groupsSource, currentLang, langField, languages),
      );
      const dates = asArray(
        resolveFieldValue(data, rowsSource, currentLang, langField, languages),
      ).sort((a, b) =>
        String(a.start_date ?? "").localeCompare(String(b.start_date ?? "")),
      );
      const occupancyRows = asArray(
        resolveFieldValue(data, columnsSource, currentLang, langField, languages),
      );

      const columns = occupancyRows
        .map((occRow) => {
          const occValue = resolveFieldValue(
            occRow,
            "occupancies_id.value",
            currentLang,
            langField,
            languages,
          );
          const occLabel = resolveFieldValue(
            occRow,
            "occupancies_id.translations.occupancy",
            currentLang,
            langField,
            languages,
          );
          return {
            id: String(occRow.id ?? ""),
            label:
              typeof occLabel === "string" && occLabel
                ? occLabel
                : String(occValue ?? ""),
            sortValue: Number(occValue ?? 0),
          };
        })
        .sort((a, b) => a.sortValue - b.sortValue);

      const priceMap = new Map<string, Record<string, unknown>>();
      priceRecords.forEach((rec) => {
        priceMap.set(
          `${rec[groupField]}|${rec[rowField]}|${rec[columnField]}`,
          rec,
        );
      });

      const usedCategoryIds = new Set(
        priceRecords.map((r) => String(r[groupField] ?? "")),
      );

      const groups = categories
        .filter((cat) => usedCategoryIds.has(String(cat.id ?? "")))
        .map((cat) => {
          const catId = String(cat.id ?? "");
          const groupLabel =
            typeof cat.room_category === "string" && cat.room_category
              ? cat.room_category
              : String(cat.room_category ?? catId);
          const rows = dates.map((date) => {
            const dateId = String(date.id ?? "");
            const cells: Record<string, { buy: unknown; sell: unknown }> = {};
            columns.forEach((col) => {
              const rec = priceMap.get(`${catId}|${dateId}|${col.id}`);
              cells[col.id] = {
                buy: rec?.[buyField] ?? null,
                sell: rec?.[sellField] ?? null,
              };
            });
            return {
              key: dateId,
              label: typeof date.name === "string" ? date.name : "",
              dateRange: formatDateRange(date.start_date, date.end_date),
              cells,
            };
          });
          return { key: catId, label: groupLabel, rows };
        });

      return {
        key: fc.key,
        label,
        type: "price-table" as const,
        value: null,
        priceTable: {
          columns: columns.map(({ id, label: colLabel }) => ({ id, label: colLabel })),
          groups,
        },
        hideLabel: fc.hideLabel,
      };
    }

    // ── Standard path ─────────────────────────────────────────────────────────
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
