// Upload modal configuration — keep in sync with
// directus-extension-media-uploader/src/index.ts defaults.
// The Media Library reuses that extension's UploadModal component;
// these constants feed its props when opened from this module.

// The Directus folder UUID that files land in when users pick "Upload Area" mode.
// Set to null to disable Upload Area mode.
export const UPLOAD_AREA_FOLDER: string | null =
  "9a0f3182-e8b3-4270-b309-83ae16002b54";

export const GEO_ENABLED = true;

/** Same shape / collections as media-uploader DEFAULT_GEO_LEVELS. */
export const GEO_LEVELS = [
  {
    field: "place",
    collection: "places",
    label: "Place (City)",
    icon: "location_city",
    required: true,
  },
  {
    field: "state",
    collection: "states",
    label: "State",
    icon: "map",
    required: true,
  },
  {
    field: "region",
    collection: "regions_geo",
    label: "Region",
    icon: "terrain",
    required: true,
  },
  {
    field: "country",
    collection: "countries_geo",
    label: "Country",
    icon: "flag",
    required: true,
  },
  {
    field: "destination",
    collection: "destinations",
    label: "Destination",
    icon: "explore",
    required: true,
  },
  {
    field: "destination_cluster",
    collection: "destinations_cluster",
    label: "Destination Cluster",
    icon: "public",
  },
];

export const GEO_CASCADES = {
  place: [
    { fk: "state_id", to: "state" },
    { fk: "region_id", to: "region" },
    { fk: "country_id", to: "country" },
  ],
  state: [{ fk: "country_id", to: "country" }],
  region: [{ fk: "country_id", to: "country" }],
  country: [{ fk: "destination_id", to: "destination" }],
  destination: [{ fk: "destinations_cluster_id", to: "destination_cluster" }],
};

export const GEO_FILTER_MAPPINGS = {
  place: [
    { fk: "country_id", from: "country" },
    { fk: "state_id", from: "state" },
    { fk: "region_id", from: "region" },
  ],
  state: [{ fk: "country_id", from: "country" }],
  region: [{ fk: "country_id", from: "country" }],
  destination: [{ fk: "countries_geo_id", from: "country" }],
  destination_cluster: [{ fk: "destinations_cluster_id", from: "destination" }],
};

export const GEO_LANGUAGE_CODE = "en-GB";
export const GEO_LABEL_FIELD = "translations.name";

/**
 * Fallback when no media-uploader field options are found.
 * Prefer reading `upload_file_fields` from a media-uploader interface
 * (e.g. Hotels → Media) so Media Library matches that configuration.
 */
export const UPLOAD_FILE_FIELDS = [{ field: "keyword_ids" }];

export const UPLOAD_STATUS_FIELD = "directus_status";
export const UPLOAD_STATUS_VALUE = "draft";
