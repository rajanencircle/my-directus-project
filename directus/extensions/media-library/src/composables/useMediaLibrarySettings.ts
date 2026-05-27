import { ref } from "vue";
import { useApi } from "@directus/extensions-sdk";
import {
  UPLOAD_AREA_FOLDER,
  GEO_ENABLED,
  GEO_LEVELS,
  GEO_CASCADES,
  GEO_FILTER_MAPPINGS,
  GEO_LANGUAGE_CODE,
  GEO_LABEL_FIELD,
} from "../upload-config";

const COLLECTION = "media_library_settings";

export interface GeoLevel {
  field: string;
  collection: string;
  label: string;
  icon: string;
}

export interface MediaLibrarySettings {
  upload_area_folder: string | null;
  geo_enabled: boolean;
  geo_language_code: string;
  geo_label_field: string;
  geo_levels: GeoLevel[];
  geo_cascades: Record<string, any>;
  geo_filter_mappings: Record<string, any>;
}

export const DEFAULT_SETTINGS: MediaLibrarySettings = {
  upload_area_folder: UPLOAD_AREA_FOLDER,
  geo_enabled: GEO_ENABLED,
  geo_language_code: GEO_LANGUAGE_CODE,
  geo_label_field: GEO_LABEL_FIELD,
  geo_levels: GEO_LEVELS as GeoLevel[],
  geo_cascades: GEO_CASCADES,
  geo_filter_mappings: GEO_FILTER_MAPPINGS,
};

// Module-level singletons — shared across all component instances
const settings = ref<MediaLibrarySettings>({ ...DEFAULT_SETTINGS });
const isLoaded = ref(false);
const isLoading = ref(false);

export function useMediaLibrarySettings() {
  const api = useApi();

  async function loadSettings(): Promise<void> {
    if (isLoaded.value || isLoading.value) return;
    isLoading.value = true;
    try {
      const res = await api.get(`/items/${COLLECTION}/1`);
      const data = res.data?.data;
      if (data) {
        settings.value = {
          upload_area_folder:
            data.upload_area_folder ?? DEFAULT_SETTINGS.upload_area_folder,
          geo_enabled: data.geo_enabled ?? DEFAULT_SETTINGS.geo_enabled,
          geo_language_code:
            data.geo_language_code ?? DEFAULT_SETTINGS.geo_language_code,
          geo_label_field:
            data.geo_label_field ?? DEFAULT_SETTINGS.geo_label_field,
          geo_levels: data.geo_levels ?? DEFAULT_SETTINGS.geo_levels,
          geo_cascades: data.geo_cascades ?? DEFAULT_SETTINGS.geo_cascades,
          geo_filter_mappings:
            data.geo_filter_mappings ?? DEFAULT_SETTINGS.geo_filter_mappings,
        };
      }
    } catch (err: any) {
      console.warn(
        "[media-library] Could not load settings, using defaults:",
        err?.message ?? err
      );
    } finally {
      isLoaded.value = true;
      isLoading.value = false;
    }
  }

  async function saveSettings(
    patch: Partial<MediaLibrarySettings>
  ): Promise<void> {
    await api.patch(`/items/${COLLECTION}/1`, patch);
    settings.value = { ...settings.value, ...patch };
  }

  function resetLoaded(): void {
    isLoaded.value = false;
  }

  return {
    settings,
    isLoaded,
    isLoading,
    loadSettings,
    saveSettings,
    resetLoaded,
    DEFAULT_SETTINGS,
  };
}
