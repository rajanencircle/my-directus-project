import InterfaceComponent from "./interface.vue";

const DEFAULT_LEVELS = JSON.stringify(
  [
    {
      field: "place",
      collection: "places",
      label: {
        "en-GB": "Place (City)",
        "de-DE": "Ort (Stadt)",
        "de-CH": "Ort (Stadt)",
        "nl-NL": "Plaats (Stad)",
      },
      icon: "location_city",
    },
    {
      field: "country",
      collection: "countries_geo",
      label: {
        "en-GB": "Country",
        "de-DE": "Land",
        "de-CH": "Land",
        "nl-NL": "Land",
      },
      icon: "flag",
    },
    {
      field: "destination",
      collection: "destinations",
      label: {
        "en-GB": "Destination",
        "de-DE": "Reiseziel",
        "de-CH": "Reiseziel",
        "nl-NL": "Bestemming",
      },
      icon: "explore",
      hidden: true,
    },
    {
      field: "destination_cluster",
      collection: "destinations_cluster",
      label: {
        "en-GB": "Destination Cluster",
        "de-DE": "Reiseziel-Gruppe",
        "de-CH": "Reiseziel-Gruppe",
        "nl-NL": "Bestemmingscluster",
      },
      icon: "public",
      hidden: true,
    },
  ],
  null,
  2,
);

const DEFAULT_CASCADES = JSON.stringify(
  {
    place: [{ fk: "country_id", to: "country" }],
    country: [{ fk: "destination_id", to: "destination" }],
    destination: [{ fk: "destinations_cluster_id", to: "destination_cluster" }],
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
  // localTypes: ["m2o", "o2m", "m2m", "m2a"],
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
