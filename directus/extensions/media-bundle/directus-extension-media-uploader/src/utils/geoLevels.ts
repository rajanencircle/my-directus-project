export type GeoLevelConfig = {
  field: string;
  collection: string;
  label: string;
  icon?: string;
  required?: boolean;
  labelField?: string;
};

export const DEFAULT_GEO_LEVELS: GeoLevelConfig[] = [
  { field: 'place', collection: 'places', label: 'Place (City)', icon: 'location_city' },
  { field: 'state', collection: 'states', label: 'State', icon: 'map' },
  { field: 'region', collection: 'regions_geo', label: 'Region', icon: 'terrain' },
  { field: 'country', collection: 'countries_geo', label: 'Country', icon: 'flag' },
  { field: 'destination', collection: 'destinations', label: 'Destination', icon: 'explore' },
  {
    field: 'destination_cluster',
    collection: 'destinations_cluster',
    label: 'Destination Cluster',
    icon: 'public',
  },
];

export function parseGeoLevels(input: GeoLevelConfig[] | string | null | undefined): GeoLevelConfig[] {
  if (!input) return DEFAULT_GEO_LEVELS;
  if (Array.isArray(input)) return input.length ? input : DEFAULT_GEO_LEVELS;
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_GEO_LEVELS;
  } catch {
    return DEFAULT_GEO_LEVELS;
  }
}

export function getMissingGeoLevels(
  levels: GeoLevelConfig[],
  values: Record<string, { id?: string } | null | undefined> | null | undefined
): GeoLevelConfig[] {
  return levels.filter((level) => {
    const selected = values?.[level.field];
    return !selected?.id;
  });
}

// Only returns levels where required === true that are missing a value.
export function getMissingRequiredGeoLevels(
  levels: GeoLevelConfig[],
  values: Record<string, { id?: string } | null | undefined> | null | undefined
): GeoLevelConfig[] {
  return levels.filter((level) => {
    if (!level.required) return false;
    return !values?.[level.field]?.id;
  });
}
