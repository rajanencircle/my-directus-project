import { ref, onMounted, watch, type Ref } from "vue";
import { useApi } from "@directus/extensions-sdk";
import type { LangMap, PreviewConfig } from "../types";

type FieldMeta = {
  field: string;
  meta?: {
    label?: string;
    translations?: { language: string; translation: string }[];
    options?: { choices?: Array<{ text: string; value: unknown }> };
  };
};

export type FieldChoice = { text: string; value: unknown };

/**
 * Resolves Directus field metadata for every path declared in the config:
 *   fieldLabels  — Map<fc.value, LangMap>   for label display
 *   fieldChoices — Map<fc.value, FieldChoice[]>  for dropdown value → text resolution
 *   groupLabels  — Map<group.id, LangMap>   auto-detected from root-collection field meta
 *
 * Strategy:
 *  1. Fetch ALL relations once (GET /relations) → build bidirectional `col.field → targetCol` map.
 *  2. Walk each fc.value path through that map to find the leaf collection + field.
 *  3. Fetch /fields/{leafCollection}, pull meta.translations (labels) and meta.options.choices.
 *  4. All /fields responses are cached per composable instance.
 */
export function useFieldLabels(
  collection: string,
  config: Ref<PreviewConfig | null>,
) {
  const api = useApi();
  const fieldLabels = ref(new Map<string, LangMap>());
  const fieldChoices = ref(new Map<string, FieldChoice[]>());
  const groupLabels = ref(new Map<string, LangMap>());

  // Per-instance caches
  const labelsCache = new Map<string, Map<string, LangMap>>();
  const choicesCache = new Map<string, Map<string, FieldChoice[]>>();

  async function fetchFieldsForCollection(col: string): Promise<{
    labels: Map<string, LangMap>;
    choices: Map<string, FieldChoice[]>;
  }> {
    if (labelsCache.has(col)) {
      return { labels: labelsCache.get(col)!, choices: choicesCache.get(col)! };
    }
    const labels = new Map<string, LangMap>();
    const choices = new Map<string, FieldChoice[]>();
    try {
      const res = await api.get(`/fields/${col}`);
      for (const f of (res.data?.data ?? []) as FieldMeta[]) {
        // Labels
        const translations = f.meta?.translations;
        if (translations?.length) {
          const langMap: Record<string, string> = {};
          for (const t of translations) langMap[t.language] = t.translation;
          labels.set(f.field, langMap);
        } else if (f.meta?.label) {
          labels.set(f.field, f.meta.label);
        }
        // Choices (for dropdown fields)
        const fc_choices = f.meta?.options?.choices;
        if (fc_choices?.length) choices.set(f.field, fc_choices);
      }
    } catch { /* non-critical */ }
    labelsCache.set(col, labels);
    choicesCache.set(col, choices);
    return { labels, choices };
  }

  async function buildLabels() {
    if (!collection) return;

    // ── Step 1: fetch ALL relations once → bidirectional lookup map ───────────
    const relMap = new Map<string, string>();
    try {
      const res = await api.get("/relations", { params: { limit: -1 } });
      for (const r of res.data?.data ?? []) {
        if (!r.related_collection) continue;
        relMap.set(`${r.collection}.${r.field}`, r.related_collection);
        if (r.meta?.one_field) {
          relMap.set(`${r.related_collection}.${r.meta.one_field}`, r.collection);
        }
      }
    } catch { /* non-critical */ }

    // ── Step 2: resolve a dot-notation path to its leaf collection + field ────
    function resolveLeaf(path: string): { leafCollection: string; leafField: string } | null {
      const parts = path.split(".");
      const leafField = parts[parts.length - 1];
      let current = collection;
      for (let i = 0; i < parts.length - 1; i++) {
        const next = relMap.get(`${current}.${parts[i]}`);
        if (!next) return null;
        current = next;
      }
      return { leafCollection: current, leafField };
    }

    const newFieldLabels = new Map<string, LangMap>();
    const newFieldChoices = new Map<string, FieldChoice[]>();
    const newGroupLabels = new Map<string, LangMap>();
    const cfg = config.value;

    // ── Step 3: pre-fetch root collection fields (needed for "parent" lookups & groups)
    const { labels: rootLabels } = await fetchFieldsForCollection(collection);

    // ── Step 4: resolve label + choices for every field path ─────────────────
    for (const g of cfg?.groups ?? []) {
      for (const fc of g.fields ?? []) {
        // "direct", "dropdown", "repeater" → prefer leaf; relational types → prefer parent
        const defaultLabelType =
          fc.type === "direct" || fc.type === "dropdown" || fc.type === "repeater"
            ? "leaf"
            : "parent";
        const effectiveLabelType = fc.labelType ?? defaultLabelType;

        if (effectiveLabelType === "parent") {
          const parentField = fc.value.split(".")[0];
          const label = rootLabels.get(parentField);
          if (label) newFieldLabels.set(fc.value, label);
          // choices on the parent field (unusual but safe to try)
        } else {
          const resolved = resolveLeaf(fc.value);
          if (!resolved) continue;
          const { labels, choices } = await fetchFieldsForCollection(resolved.leafCollection);
          const label = labels.get(resolved.leafField);
          if (label) newFieldLabels.set(fc.value, label);
          const choice = choices.get(resolved.leafField);
          if (choice) newFieldChoices.set(fc.value, choice);
        }
      }
    }

    // ── Step 5: group-header labels (auto-detect from root collection by g.id) ─
    for (const g of cfg?.groups ?? []) {
      if ((g.labelType ?? "parent") === "parent") {
        const label = rootLabels.get(g.id);
        if (label) newGroupLabels.set(g.id, label);
      }
    }

    fieldLabels.value = newFieldLabels;
    fieldChoices.value = newFieldChoices;
    groupLabels.value = newGroupLabels;
  }

  onMounted(buildLabels);
  watch(config, buildLabels, { deep: true });

  return { fieldLabels, fieldChoices, groupLabels };
}
