// Upload modal configuration — mirrors the defaults from directus-extension-media-uploader.
// Edit these constants to change what appears in the upload modal across the whole module.

// The Directus folder UUID that files land in when users pick "Upload Area" mode.
// Set to null to disable Upload Area mode.
export const UPLOAD_AREA_FOLDER: string | null =
  "9a0f3182-e8b3-4270-b309-83ae16002b54";

export const UPLOAD_EXTRA_FIELDS = [
  {
    type: "checkbox-group",
    field: "flags",
    label: "Flags",
    options: [
      { label: "Is Map?", value: "map" },
      { label: "Tour32 Export?", value: "Tour32" },
    ],
    storeAs: "string-array",
  },
];

export const GEO_ENABLED = true;

export const GEO_LEVELS = [
  {
    field: "place",
    collection: "places",
    label: "Place (City)",
    icon: "location_city",
  },
  { field: "state", collection: "states", label: "State", icon: "map" },
  {
    field: "region",
    collection: "regions_geo",
    label: "Region",
    icon: "terrain",
  },
  {
    field: "country",
    collection: "countries_geo",
    label: "Country",
    icon: "flag",
  },
  {
    field: "destination",
    collection: "destinations",
    label: "Destination",
    icon: "explore",
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
