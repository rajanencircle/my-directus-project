import { ref, onMounted } from "vue";
import { useApi } from "@directus/extensions-sdk";
import type { Language } from "../types";

export function useLanguages(translation_collection: string) {
  const api = useApi();
  const languages = ref<Language[]>([]);
  const loading = ref(false);

  async function fetchLanguages() {
    loading.value = true;
    try {
      const res = await api.get(`/items/${translation_collection}`, {
        params: { fields: ["id", "code", "name"], limit: -1 },
      });
      languages.value = (res.data?.data ?? []).map(
        (l: Record<string, any>) => ({
          ...l,                       // preserve all raw fields for custom labelField lookups
          id: l.id,
          code: l.code ?? l.id,
          name: l.name ?? l.code ?? l.id,
        }),
      );
    } catch {
      languages.value = [
        { code: "de-DE", name: "Deutsch" },
        { code: "en-US", name: "English" },
        { code: "ar-SA", name: "Arabic" },
      ];
    } finally {
      loading.value = false;
    }
  }

  onMounted(fetchLanguages);
  return { languages, loading };
}
