import { defineInterface } from "@directus/extensions-sdk";
import InterfaceComponent from "./interface.vue";

const FIELDS_TEMPLATE = JSON.stringify(
  [
    { key: "id", value: "id", type: "direct" },
    { key: "name", value: "name", type: "direct", groupBy: "general" },
    { key: "status", value: "status", type: "direct", groupBy: "general" },
    {
      key: "street",
      value: "street",
      type: "direct",
      groupBy: "general",
      label: { "de-DE": "Straße", "en-US": "Street" },
    },
    { key: "zip_code", value: "zip_code", type: "direct", groupBy: "general" },
    {
      key: "place_name",
      value: "place.translations.name",
      type: "translated",
      groupBy: "location",
      label: { "de-DE": "Ort", "en-US": "Place" },
    },
    {
      key: "country_iso",
      value: "country.ISO",
      type: "relation",
      groupBy: "location",
      label: { "de-DE": "ISO", "en-US": "ISO" },
    },
    {
      key: "country_name",
      value: "country.translations.name",
      type: "translated",
      groupBy: "location",
      label: { "de-DE": "Land", "en-US": "Country" },
    },
  ],
  null,
  2,
);

const GROUPS_TEMPLATE = JSON.stringify(
  [
    {
      id: "general",
      label: { "de-DE": "Allgemein", "en-US": "General" },
      defaultOpen: true,
    },
    {
      id: "location",
      label: { "de-DE": "Standort", "en-US": "Location" },
      defaultOpen: true,
    },
  ],
  null,
  2,
);

export default defineInterface({
  id: "item-preview-button",
  name: "Item Preview Button",
  icon: "preview",
  description:
    "Adds a preview button to the item form. Fields, groups, labels, and language are all configured in the JSON options below.",
  component: InterfaceComponent,
  types: ["alias"],
  localTypes: ["presentation"],
  group: "presentation",
  options: [
    {
      field: "translation_collection",
      name: "Translation Collection",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
        note: "Collection that holds language records (e.g. `languages`).",
      },
    },
    {
      field: "buttonLabel",
      type: "string",
      name: "$t:label",
      meta: {
        width: "full",
        interface: "system-input-translated-string",
        options: { placeholder: "$t:label" },
      },
    },
    {
      field: "icon",
      name: "$t:icon",
      type: "string",
      meta: { width: "half", interface: "select-icon" },
      schema: { default_value: "preview" },
    },
    {
      field: "title",
      name: "Title Field",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
        note: "Field key used as the overlay heading (default: `name`)",
      },
    },
    {
      field: "defaultLang",
      name: "Default Language",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
        note: "Language code shown by default (default: `de-DE`)",
      },
    },
    {
      field: "langField",
      name: "Language Field",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
        note: "Field in translation records that holds the language code (default: `languages_code`)",
      },
    },
    {
      field: "fields",
      name: "Fields (JSON)",
      type: "json",
      meta: {
        interface: "code",
        width: "full",
        options: {
          language: "json",
          template: FIELDS_TEMPLATE,
          placeholder: FIELDS_TEMPLATE,
        },
        note: `
Array of field objects. Each entry:

| key | Description |
|-----|-------------|
| \`key\` | Unique identifier — used as the display label if no \`label\` is set |
| \`value\` | Dot-notation path to the value (e.g. \`"place.translations.name"\`) |
| \`type\` | \`"direct"\` · \`"translated"\` · \`"relation"\` · \`"array"\` |
| \`groupBy\` | ID of the accordion group this field belongs to |
| \`label\` | Optional label — plain string or multilingual object \`{ "de-DE": "...", "en-US": "..." }\` |

For **translated** fields the translation array is filtered to the selected language automatically.
        `.trim(),
      },
    },
    {
      field: "groups",
      name: "Groups (JSON)",
      type: "json",
      meta: {
        interface: "code",
        width: "full",
        options: {
          language: "json",
          template: GROUPS_TEMPLATE,
          placeholder: GROUPS_TEMPLATE,
        },
        note: `
Array of accordion group objects. Each entry:

| key | Description |
|-----|-------------|
| \`id\` | Matches the \`groupBy\` value used in the fields above |
| \`label\` | Header text — plain string or multilingual object |
| \`defaultOpen\` | \`true\` (default) to start expanded, \`false\` to start collapsed |
        `.trim(),
      },
    },
  ],
});
