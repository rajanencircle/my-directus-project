import { ref, onMounted, watch, type Ref } from "vue";
import { useApi } from "@directus/extensions-sdk";
import type { LangMap, PreviewConfig } from "../types";

type FieldMeta = {
  field: string;
  meta?: {
    label?: string;
    translations?: { language: string; translation: string }[];
  };
};

/**
 * Resolves Directus field-name translations for every path declared in the config.
 *
 * fieldLabels — Map<fc.value, LangMap>  e.g. "country.translations.name" → {de-DE: "Name", en-US: "Name"}
 * groupLabels — Map<group.id, LangMap>  auto-detected by looking up the group id as a field on
 *               the root collection (useful when group id matches a relation field like "country")
 *
 * Strategy:
 *  1. Fetch ALL relations once (GET /relations) and build a bidirectional lookup
 *     map: `${collection}.${field}` → targetCollection.
 *  2. Walk each fc.value path segment-by-segment through that map to find the
 *     leaf field's actual collection.
 *  3. Fetch /fields/{leafCollection} and pull meta.translations.
 *  4. Collection field responses are cached per-composable-instance.
 */
export function useFieldLabels(
  collection: string,
  config: Ref<PreviewConfig | null>,
) {
  const api = useApi();
  const fieldLabels = ref(new Map<string, LangMap>());
  const groupLabels = ref(new Map<string, LangMap>());

  const fieldsCache = new Map<string, Map<string, LangMap>>();

  async function fetchFieldsForCollection(col: string): Promise<Map<string, LangMap>> {
    if (fieldsCache.has(col)) return fieldsCache.get(col)!;
    const map = new Map<string, LangMap>();
    try {
      const res = await api.get(`/fields/${col}`);
      for (const f of (res.data?.data ?? []) as FieldMeta[]) {
        const translations = f.meta?.translations;
        if (translations?.length) {
          const langMap: Record<string, string> = {};
          for (const t of translations) langMap[t.language] = t.translation;
          map.set(f.field, langMap);
        } else if (f.meta?.label) {
          map.set(f.field, f.meta.label);
        }
      }
    } catch { /* non-critical */ }
    fieldsCache.set(col, map);
    return map;
  }

  async function buildLabels() {
    if (!collection) return;

    // ── Step 1: fetch ALL relations once and build bidirectional lookup ───────
    // relMap key: `${owningCollection}.${fieldName}` → targetCollection
    const relMap = new Map<string, string>();
    try {
      const res = await api.get("/relations", { params: { limit: -1 } });
      for (const r of res.data?.data ?? []) {
        if (!r.related_collection) continue;
        // M2O: the field lives on `r.collection` and points to `r.related_collection`
        relMap.set(`${r.collection}.${r.field}`, r.related_collection);
        // O2M virtual: `meta.one_field` on `r.related_collection` points to `r.collection`
        if (r.meta?.one_field) {
          relMap.set(`${r.related_collection}.${r.meta.one_field}`, r.collection);
        }
      }
    } catch { /* non-critical — labels fall back to prettify */ }

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

    // ── Step 3: resolve labels for every fc.value in the config ──────────────
    // Label source is chosen per-field:
    //   "parent" → first path segment on root collection (default for translated/relation/array)
    //   "leaf"   → leaf field in its resolved collection   (default for direct)
    const newFieldLabels = new Map<string, LangMap>();
    const newGroupLabels = new Map<string, LangMap>();
    const cfg = config.value;

    // Pre-fetch root collection labels once (shared by "parent" lookups and groups)
    const rootLabels = await fetchFieldsForCollection(collection);

    for (const g of cfg?.groups ?? []) {
      for (const fc of g.fields ?? []) {
        const effectiveLabelType =
          fc.labelType ?? (fc.type === "direct" ? "leaf" : "parent");

        if (effectiveLabelType === "parent") {
          // Label comes from the first path segment on the root collection
          const parentField = fc.value.split(".")[0];
          const label = rootLabels.get(parentField);
          if (label) newFieldLabels.set(fc.value, label);
        } else {
          // "leaf" — walk full path to the leaf collection
          const resolved = resolveLeaf(fc.value);
          if (!resolved) continue;
          const colLabels = await fetchFieldsForCollection(resolved.leafCollection);
          const label = colLabels.get(resolved.leafField);
          if (label) newFieldLabels.set(fc.value, label);
        }
      }
    }

    // ── Step 4: group-header labels — respect group labelType ────────────────
    for (const g of cfg?.groups ?? []) {
      if ((g.labelType ?? "parent") === "parent") {
        const label = rootLabels.get(g.id);
        if (label) newGroupLabels.set(g.id, label);
        // "leaf": intentionally nothing stored — PreviewOverlay falls back to g.label or prettify
      }
    }

    fieldLabels.value = newFieldLabels;
    groupLabels.value = newGroupLabels;
  }

  onMounted(buildLabels);
  watch(config, buildLabels, { deep: true });

  return { fieldLabels, groupLabels };
}
