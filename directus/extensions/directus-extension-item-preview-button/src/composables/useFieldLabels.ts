import { ref, onMounted, watch, type Ref } from "vue";
import { useApi } from "@directus/extensions-sdk";
import { useRelationMap } from "./useRelationMap";
import type { LangMap, PreviewConfig } from "../types";

type FieldMeta = {
  field: string;
  meta?: {
    label?: string;
    translations?: { language: string; translation: string }[];
    options?: {
      choices?: Array<{ text: string; value: unknown }>;
      // Nested column definitions for repeater/"list"-interface JSON fields
      // (e.g. hotels_specials_translations.specials -> its own "status" dropdown).
      fields?: Array<{
        field: string;
        meta?: { options?: { choices?: Array<{ text: string; value: unknown }> } };
      }>;
    };
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
  const { getRelationMap } = useRelationMap();
  const fieldLabels = ref(new Map<string, LangMap>());
  const fieldChoices = ref(new Map<string, FieldChoice[]>());
  const groupLabels = ref(new Map<string, LangMap>());
  const loading = ref(false);

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

        // Nested choices for repeater/"list" fields — stored as "<field>.<subField>"
        // so buildFieldNodes can resolve e.g. specials[].status per item.
        for (const nested of f.meta?.options?.fields ?? []) {
          const nestedChoices = nested.meta?.options?.choices;
          if (nestedChoices?.length) {
            choices.set(`${f.field}.${nested.field}`, nestedChoices);
          }
        }
      }
    } catch { /* non-critical */ }
    labelsCache.set(col, labels);
    choicesCache.set(col, choices);
    return { labels, choices };
  }

  async function buildLabels() {
    if (!collection) return;
    loading.value = true;

    // ── Step 1: reuse the shared, module-cached relation map (see useRelationMap) —
    // avoids a second full GET /relations?limit=-1 round trip on every preview open.
    const relMap = await getRelationMap();

    // ── Step 2: resolve a dot-notation path to its leaf collection + field ────
    function resolveLeaf(
      path: string,
      startCollection: string,
    ): { leafCollection: string; leafField: string } | null {
      const parts = path.split(".");
      const leafField = parts[parts.length - 1];
      let current = startCollection;
      for (let i = 0; i < parts.length - 1; i++) {
        const next = relMap.get(`${current}.${parts[i]}`);
        if (!next) return null;
        current = next;
      }
      return { leafCollection: current, leafField };
    }

    // Walk every segment of `path` (including the last) as a relation hop from
    // the root collection, returning the collection an array/o2m field's items
    // live in — used to resolve repeater sub-field labels/choices.
    function resolveArrayItemCollection(path: string): string | null {
      let current = collection;
      for (const part of path.split(".")) {
        const next = relMap.get(`${current}.${part}`);
        if (!next) return null;
        current = next;
      }
      return current;
    }

    const newFieldLabels = new Map<string, LangMap>();
    const newFieldChoices = new Map<string, FieldChoice[]>();
    const newGroupLabels = new Map<string, LangMap>();
    const cfg = config.value;

    // ── Step 3: collect every distinct collection whose /fields/ we'll need, then
    // fetch them all concurrently. Previously each was awaited one at a time inside
    // the resolution loop below — for a config with 15+ groups spanning dozens of
    // relation targets, that serialized dozens of round trips end-to-end (the
    // multi-second "raw data, then resolved" flash). Pre-warming the shared cache
    // in parallel here means the loop below never actually waits on the network.
    const neededCollections = new Set<string>([collection]);
    for (const g of cfg?.groups ?? []) {
      for (const fc of g.fields ?? []) {
        const resolved = resolveLeaf(fc.value, collection);
        if (resolved) neededCollections.add(resolved.leafCollection);
        if (fc.type === "repeater" && fc.fields?.length) {
          const itemCollection = resolveArrayItemCollection(fc.value);
          if (itemCollection) {
            neededCollections.add(itemCollection);
            for (const subFc of fc.fields) {
              const subResolved = resolveLeaf(subFc.value, itemCollection);
              if (subResolved) neededCollections.add(subResolved.leafCollection);
            }
          }
        }
      }
    }
    await Promise.all(
      [...neededCollections].map((col) => fetchFieldsForCollection(col)),
    );

    // ── Step 3b: root collection labels (needed for "parent" lookups & groups) —
    // already warmed above, this just reads the now-populated cache.
    const { labels: rootLabels } = await fetchFieldsForCollection(collection);

    // ── Step 4: resolve label + choices for every field path (cache hits only,
    // no network calls happen from here on) ──────────────────────────────────
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
          const resolved = resolveLeaf(fc.value, collection);
          if (!resolved) continue;
          const { labels, choices } = await fetchFieldsForCollection(resolved.leafCollection);
          const label = labels.get(resolved.leafField);
          if (label) newFieldLabels.set(fc.value, label);
          const choice = choices.get(resolved.leafField);
          if (choice) newFieldChoices.set(fc.value, choice);

          // Nested repeater sub-field choices (e.g. "specials.status") — re-key
          // from "<leafField>.<subField>" to "<fc.value>.<subField>" so lookups
          // during rendering can use the config path + item key directly.
          const nestedPrefix = `${resolved.leafField}.`;
          for (const [key, val] of choices.entries()) {
            if (key.startsWith(nestedPrefix)) {
              const subField = key.slice(nestedPrefix.length);
              newFieldChoices.set(`${fc.value}.${subField}`, val);
            }
          }
        }

        // ── Explicit repeater sub-fields — each is resolved relative to the
        // array's own item collection, not the root, since paths like
        // "translations.room_category_additions" or "room_category_catering.designation"
        // only make sense once inside a room_categories-style child record.
        if (fc.type === "repeater" && fc.fields?.length) {
          const itemCollection = resolveArrayItemCollection(fc.value);
          if (itemCollection) {
            const { labels: itemRootLabels } =
              await fetchFieldsForCollection(itemCollection);

            for (const subFc of fc.fields) {
              const subDefaultLabelType =
                subFc.type === "direct" ||
                subFc.type === "dropdown" ||
                subFc.type === "repeater"
                  ? "leaf"
                  : "parent";
              const subLabelType = subFc.labelType ?? subDefaultLabelType;
              const compoundKey = `${fc.value}.${subFc.value}`;

              if (subLabelType === "parent") {
                const parentField = subFc.value.split(".")[0];
                const label = itemRootLabels.get(parentField);
                if (label) newFieldLabels.set(compoundKey, label);
              } else {
                const subResolved = resolveLeaf(subFc.value, itemCollection);
                if (!subResolved) continue;
                const { labels, choices } = await fetchFieldsForCollection(
                  subResolved.leafCollection,
                );
                const label = labels.get(subResolved.leafField);
                if (label) newFieldLabels.set(compoundKey, label);
                const choice = choices.get(subResolved.leafField);
                if (choice) newFieldChoices.set(compoundKey, choice);
              }
            }
          }
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
    loading.value = false;
  }

  onMounted(buildLabels);
  watch(config, buildLabels, { deep: true });

  return { fieldLabels, fieldChoices, groupLabels, loading };
}
