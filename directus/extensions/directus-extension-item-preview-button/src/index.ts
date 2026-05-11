import { defineInterface } from "@directus/extensions-sdk";
import InterfaceComponent from "./interface.vue";

const CONFIG_TEMPLATE = JSON.stringify(
  [
    {
      label: { "de-DE": "Allgemein", "en-US": "General" },
      open: true,
      fields: [
        "id",
        "name",
        "status",
        { field: "street", label: { "de-DE": "Straße", "en-US": "Street" } },
        "zip_code",
      ],
    },
    {
      label: { "de-DE": "Standort", "en-US": "Location" },
      open: true,
      fields: [
        "place.translations.name",
        "country.ISO",
        "country.translations.name",
      ],
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
    "Adds a preview button to the item form. All display settings — fields, groups, labels, and language — are configured in the single JSON below.",
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
        note: "The collection name of the translations (e.g., `translations` or your custom translation collection).",
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
      meta: {
        width: "half",
        interface: "select-icon",
      },
      schema: { default_value: "visibility" },
    },
    {
      field: "title",
      name: "Title",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
        note: "Field key used as the preview page heading (default: \`\`name\`\`)",
      },
    },

    {
      field: "defaultLang",
      name: "Default Language",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
        note: "Language code shown by default (default: \`\`de-DE\`\`)",
      },
    },
    {
      field: "langField",
      name: "Language Field",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
        note: "Field in translation records that holds the language code (default: \`\`code\`\`)",
      },
    },
    {
      field: "groups",
      name: "Preview Configuration (JSON)",
      type: "json",
      meta: {
        interface: "code",
        width: "full",
        options: {
          language: "json",
          template: CONFIG_TEMPLATE,
          placeholder: CONFIG_TEMPLATE,
        },
        note: `
Configure fields, accordion groups, language defaults, and label translations in one JSON object.

**Root keys:**

- \`groups\` — array of accordion sections (optional — use \`fields\` instead for a flat list)
- \`fields\` — flat field list when no accordion grouping is needed

**Each field can be:**
- A string path: \`"place.name"\`
- An object with a label: \`{ "field": "street", "label": { "de-DE": "Straße", "en-US": "Street" } }\`

**Group label** can also be multilingual: \`{ "de-DE": "Standort", "en-US": "Location" }\`

Dot-notation supports relations and nested translations automatically.
        `.trim(),
      },
    },
  ],
});
