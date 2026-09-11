import { computed, type ComputedRef } from 'vue';
import {
  DEFAULT_GEO_LEVELS,
  parseGeoLevels,
  type GeoLevelConfig,
} from '../utils/geoLevels.ts';

interface FilterMapping {
  fk: string;
  from: string;
}

interface CascadeMapping {
  fk: string;
  to: string;
}

const DEFAULT_FILTER_MAPPINGS: Record<string, FilterMapping[]> = {
  place: [
    { fk: 'country_id', from: 'country' },
    { fk: 'state_id', from: 'state' },
    { fk: 'region_id', from: 'region' },
  ],
  state: [{ fk: 'country_id', from: 'country' }],
  region: [{ fk: 'country_id', from: 'country' }],
  destination: [{ fk: 'countries_geo_id', from: 'country' }],
  destination_cluster: [{ fk: 'destinations_cluster_id', from: 'destination' }],
};

const DEFAULT_CASCADES: Record<string, CascadeMapping[]> = {
  place: [
    { fk: 'state_id', to: 'state' },
    { fk: 'region_id', to: 'region' },
    { fk: 'country_id', to: 'country' },
  ],
  state: [{ fk: 'country_id', to: 'country' }],
  region: [{ fk: 'country_id', to: 'country' }],
  country: [{ fk: 'destination_id', to: 'destination' }],
  destination: [{ fk: 'destinations_cluster_id', to: 'destination_cluster' }],
};

function parseRecord<T>(
  input: Record<string, T> | string | null | undefined,
  fallback: Record<string, T>,
): Record<string, T> {
  if (!input) return fallback;
  if (typeof input === 'object') return input;
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, T>)
      : fallback;
  } catch {
    return fallback;
  }
}

export function useGeographyFieldMaps(options: {
  levels: ComputedRef<GeoLevelConfig[] | string | null | undefined>;
  cascades: ComputedRef<Record<string, CascadeMapping[]> | string | null | undefined>;
  filterMappings: ComputedRef<Record<string, FilterMapping[]> | string | null | undefined>;
}) {
  const levels = computed(() => parseGeoLevels(options.levels.value ?? DEFAULT_GEO_LEVELS));
  const cascades = computed(() => parseRecord(options.cascades.value, DEFAULT_CASCADES));
  const filterMappings = computed(() =>
    parseRecord(options.filterMappings.value, DEFAULT_FILTER_MAPPINGS),
  );

  const levelByField = computed(() => {
    const map = new Map<string, GeoLevelConfig>();
    for (const level of levels.value) map.set(level.field, level);
    return map;
  });

  const cascadeFromByField = computed(() => {
    const result: Record<
      string,
      { fieldKey: string; parentCollection: string; fk: string }[]
    > = {};
    for (const level of levels.value) result[level.field] = [];
    for (const [field, mappings] of Object.entries(cascades.value)) {
      if (Array.isArray(mappings)) {
        const sourceLevel = levelByField.value.get(field);
        if (!sourceLevel) continue;
        for (const mapping of mappings) {
          (result[mapping.to] ??= []).push({
            fieldKey: field,
            parentCollection: sourceLevel.collection,
            fk: mapping.fk,
          });
        }
      } else if (typeof mappings === 'string') {
        const parentKey = mappings;
        const parentLevel = levelByField.value.get(parentKey);
        if (!parentLevel) continue;
        const fmEntry = (filterMappings.value as Record<string, any>)[field];
        const fk: string = Array.isArray(fmEntry)
          ? (fmEntry[0]?.fk ?? '')
          : typeof fmEntry === 'string'
            ? fmEntry
            : '';
        if (!fk) continue;
        (result[field] ??= []).push({
          fieldKey: parentKey,
          parentCollection: parentLevel.collection,
          fk,
        });
      }
    }
    return result;
  });

  const filterByByField = computed(() => {
    const result: Record<string, { fieldKey: string; fk: string }[]> = {};
    for (const [field, mappings] of Object.entries(filterMappings.value)) {
      if (Array.isArray(mappings)) {
        result[field] = mappings.map((m) => ({ fieldKey: m.from, fk: m.fk }));
      } else if (typeof mappings === 'string') {
        const fk = mappings as string;
        const fieldKey = fk.replace(/_id$/, '');
        result[field] = [{ fieldKey, fk }];
      }
    }
    return result;
  });

  return {
    levels,
    levelByField,
    cascadeFromByField,
    filterByByField,
  };
}
