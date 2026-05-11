import { ref, onMounted } from "vue";
import { useApi } from "@directus/extensions-sdk";
import type { LangMap } from "../types";

/**
 * Fetches Directus field metadata for a collection and builds a label map.
 * Labels come from `meta.translations` (set in the Directus data model UI).
 * Used as the middle fallback tier: explicit config label > field meta > key.
 */
export function useFieldLabels(collection: string) {
  const api = useApi();
  const fieldLabels = ref(new Map<string, LangMap>());

  onMounted(async () => {
    if (!collection) return;
    try {
      const res = await api.get(`/fields/${collection}`);
      const fields: Array<{
        field: string;
        meta?: {
          label?: string;
          translations?: { language: string; translation: string }[];
        };
      }> = res.data?.data ?? [];

      const map = new Map<string, LangMap>();
      for (const f of fields) {
        const translations = f.meta?.translations;
        if (translations?.length) {
          const langMap: Record<string, string> = {};
          for (const t of translations) {
            langMap[t.language] = t.translation;
          }
          map.set(f.field, langMap);
        } else if (f.meta?.label) {
          map.set(f.field, f.meta.label);
        }
      }
      fieldLabels.value = map;
    } catch {
      // non-critical — fall back to key-based labels
    }
  });

  return { fieldLabels };
}
