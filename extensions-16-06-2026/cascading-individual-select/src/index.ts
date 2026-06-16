import InterfaceComponent from "./interface.vue";

const EXAMPLE_CASCADE_FROM = JSON.stringify(
  [
    {
      fieldKey: "place",
      parentCollection: "places",
      fk: "country_id",
    },
  ],
  null,
  2,
);

const EXAMPLE_FILTER_BY = JSON.stringify(
  [
    {
      fieldKey: "country",
      fk: "country_id",
    },
  ],
  null,
  2,
);

export default {
  id: "cascading-individual-select",
  name: "Cascade Individual Select",
  icon: "account_tree",
  description:
    "Single-field autocomplete with cascade auto-fill and parent-scoped filtering. Add one instance per M2O field; wire fields together via cascadeFrom and filterBy.",
  component: InterfaceComponent,
  types: ["string", "uuid", "json", "integer"],
  relational: true,
  localTypes: ["m2o"],
  useValues: true,
  options: [
    {
      field: "target_collection",
      name: "Target Collection",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
        note: "Collection this field selects from (e.g. places, countries_geo)",
        required: true,
      },
    },
    {
      field: "icon",
      name: "Icon",
      type: "string",
      schema: { default_value: "search" },
      meta: {
        interface: "select-icon",
        width: "half",
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
        note: 'Dot-path to display label. E.g. "translations.name" or "name"',
      },
    },
    {
      field: "languageCode",
      name: "Language Code",
      type: "string",
      schema: { default_value: "en-GB" },
      meta: {
        interface: "input",
        width: "half",
        note: "Language code for translated labels (e.g. en-GB, de-DE)",
      },
    },
    {
      field: "searchLimit",
      name: "Search Results Limit",
      type: "integer",
      schema: { default_value: 20 },
      meta: { interface: "input", width: "half" },
    },
    {
      field: "storeWithCollection",
      name: "Store with Collection",
      type: "boolean",
      schema: { default_value: false },
      meta: {
        interface: "boolean",
        width: "half",
        note: "Emit {id, collection} instead of bare UUID (useful for API consumers needing collection context)",
      },
    },
    {
      field: "cascadeFrom",
      name: "Cascade From (auto-fill from parent field)",
      type: "json",
      meta: {
        interface: "input-code",
        options: { language: "json", template: EXAMPLE_CASCADE_FROM },
        note: "Auto-fill this field when a parent field changes. [{fieldKey, parentCollection, fk}] — fk is the FK column on the parent record pointing to this field's collection.",
        width: "full",
      },
      schema: { default_value: "[]" },
    },
    {
      field: "filterBy",
      name: "Filter By (scope dropdown to parent value)",
      type: "json",
      meta: {
        interface: "input-code",
        options: { language: "json", template: EXAMPLE_FILTER_BY },
        note: "When a parent field has a value, restrict this dropdown by FK. [{fieldKey, fk}] — fk is the FK column on THIS collection referencing the parent.",
        width: "full",
      },
      schema: { default_value: "[]" },
    },
  ],
};
