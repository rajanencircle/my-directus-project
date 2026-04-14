import InterfaceComponent from "./interface.vue";

const DEFAULT_LEVELS = JSON.stringify(
  [
    {
      field: "place",
      collection: "places",
      label: "Place (City)",
      icon: "location_city",
      labelField: "translations.name",
    },
    {
      field: "state",
      collection: "states",
      label: "State / Province",
      icon: "map",
      labelField: "translations.name",
    },
    {
      field: "region",
      collection: "regions_geo",
      label: "Region",
      icon: "terrain",
      labelField: "translations.name",
    },
    {
      field: "country",
      // countries collection has a direct 'name' column (no translations junction table)
      collection: "countries",
      label: "Country",
      icon: "flag",
      labelField: "name",
    },
    {
      field: "destination",
      collection: "destinations",
      label: "Destination",
      icon: "explore",
      labelField: "translations.name",
    },
    {
      field: "destination_cluster",
      collection: "destinations_cluster",
      label: "Destination Cluster",
      icon: "public",
      labelField: "translations.name",
    },
  ],
  null,
  2,
);

const DEFAULT_CASCADES = JSON.stringify(
  {
    place: [
      { fk: "state_id", to: "state" },
      { fk: "region_id", to: "region" },
      { fk: "country_id", to: "country" },
    ],
    state: [{ fk: "country_id", to: "country" }],
    // region → country is M2M: no auto-cascade, only used as a dropdown filter.
    region: [],
    // country → destination is M2M: no auto-cascade, only used as a dropdown filter.
    country: [],
    destination: [{ fk: "destinations_cluster_id", to: "destination_cluster" }],
  },
  null,
  2,
);

/**
 * DEFAULT_FILTER_MAPPINGS — upstream / parent-scoping filters
 *
 * Defines which FK constraint to apply when a parent-level field is selected,
 * so that child-level dropdowns only show items that belong to the selected parent.
 *
 * Shape: { [childField]: Array<{ fk: string; from: string }> }
 *   fk   — FK column on the child collection pointing to the parent
 *   from — level field name (must match a `field` value in `levels`) whose
 *           current selection provides the filter value
 *
 * Multiple entries per child field are ANDed together.
 * Set to {} to disable upstream filtering entirely.
 *
 * Example — place with country "France" selected:
 *   The search for places adds ?filter[country_id][_eq]=<france-id>
 *   → only cities in France are offered.
 *
 * If both country AND state are selected, the place dropdown is filtered
 * by BOTH simultaneously.
 */
const DEFAULT_FILTER_MAPPINGS = JSON.stringify(
  {
    place: [
      { fk: "country_id", from: "country" },
      { fk: "state_id", from: "state" },
      { fk: "region_id", from: "region" },
    ],
    state: [{ fk: "country_id", from: "country" }],
    // region uses direct M2O field named "country", not "country_id"
    region: [{ fk: "country", from: "country" }],
    destination: [
      { fk: "destinations_cluster_id", from: "destination_cluster" },
    ],
  },
  null,
  2,
);

export default {
  id: "cascading-geo-select",
  name: "Cascading Hierarchy Select",
  icon: "account_tree",
  description:
    "Dynamic cascading autocomplete dropdowns for any hierarchical M2O relation chain. Reusable for geographies, categories, or any nested lookup.",
  component: InterfaceComponent,
  // 'alias' + localTypes:'group' → GROUP mode (spreads values into child M2O fields)
  // 'json'                       → JSON mode (stores full selection as JSON blob)
  types: ["json"],
  relational: true,
  options: [
    {
      field: "levels",
      name: "Levels Configuration",
      type: "json",
      meta: {
        interface: "input-code",
        options: { language: "json", template: DEFAULT_LEVELS },
        note: "JSON array: hierarchy levels from most specific (top/index 0) to least specific (bottom). Each: {field, collection, label, icon}",
        width: "full",
      },
      schema: { default_value: DEFAULT_LEVELS },
    },
    {
      field: "cascades",
      name: "Cascade Mappings",
      type: "json",
      meta: {
        interface: "input-code",
        options: { language: "json", template: DEFAULT_CASCADES },
        note: 'JSON object: when field X is selected, follow these FK fields to auto-populate other levels. Key = fieldName, value = array of {fk: "fk_field_in_that_collection", to: "target_field_name"}',
        width: "full",
      },
      schema: { default_value: DEFAULT_CASCADES },
    },
    {
      field: "filterMappings",
      name: "Upstream Filter Mappings",
      type: "json",
      meta: {
        interface: "input-code",
        options: { language: "json", template: DEFAULT_FILTER_MAPPINGS },
        note: [
          "JSON object: restricts child-level dropdowns to only items belonging to the selected parent.",
          "Key = child field name. Value = array of { fk, from }.",
          "  fk   — FK column on the child collection pointing to the parent.",
          "  from — level field name whose selected id is used as the filter value.",
          "Multiple entries per field are ANDed together.",
          "Set to {} to disable upstream filtering entirely.",
        ].join("\n"),
        width: "full",
      },
      schema: { default_value: DEFAULT_FILTER_MAPPINGS },
    },
    {
      field: "languageCode",
      name: "Language Code",
      type: "string",
      schema: { default_value: "en-GB" },
      meta: {
        interface: "input",
        width: "half",
        note: "Language code for translated label fields (e.g. en-GB, de-DE)",
      },
    },
    {
      field: "labelField",
      name: "Label Field Path",
      type: "string",
      schema: { default_value: "translations.name" },
      meta: {
        interface: "input",
        width: "half",
        note: 'Dot-path to the display label. For translated: "translations.name". For simple: "name"',
      },
    },
    {
      field: "displayMode",
      name: "Display Mode",
      type: "string",
      schema: { default_value: "grid" },
      meta: {
        interface: "select-dropdown",
        options: {
          choices: [
            { text: "Grid (2 columns)", value: "grid" },
            { text: "Stack (full width)", value: "stack" },
          ],
        },
        width: "half",
      },
    },
    {
      field: "searchLimit",
      name: "Search Results Limit",
      type: "integer",
      schema: { default_value: 20 },
      meta: { interface: "input", width: "half" },
    },
  ],
};
