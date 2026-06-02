import { defineInterface } from "@directus/extensions-sdk";
import InterfaceComponent from "./interface.vue";

const CONFIG_TEMPLATE = JSON.stringify(
  [
    {
      id: "general",
      label: { "de-DE": "Allgemein", "en-US": "General" },
      defaultOpen: true,
      fields: [
        { key: "name", value: "name", type: "direct" },
        { key: "status", value: "status", type: "direct" },
        {
          key: "street",
          value: "street",
          type: "direct",
          label: { "de-DE": "Straße", "en-US": "Street" },
        },
        { key: "zip_code", value: "zip_code", type: "direct" },
      ],
    },
    {
      id: "location",
      label: { "de-DE": "Standort", "en-US": "Location" },
      defaultOpen: true,
      fields: [
        {
          key: "place_name",
          value: "place.translations.name",
          type: "translated",
          label: { "de-DE": "Ort", "en-US": "Place" },
        },
        {
          key: "country_iso",
          value: "country.ISO",
          type: "relation",
          label: { "de-DE": "ISO", "en-US": "ISO" },
        },
        {
          key: "country_name",
          value: "country.translations.name",
          type: "translated",
          label: { "de-DE": "Land", "en-US": "Country" },
        },
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
    "Adds a preview button to the item form. Configure fields and groups in the single JSON below.",
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
        note: "Collection that holds language records (e.g. `translations`).",
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
        note: "Field in translation records holding the language identifier (default: `languages_code`)",
      },
    },
    {
      field: "displayPlace",
      name: "Display Place",
      type: "string",
      schema: { default_value: "start" },
      meta: {
        interface: "select-dropdown",
        options: {
          choices: [
            { text: "Start", value: "start" },
            { text: "End", value: "end" },
          ],
        },
        width: "half",
      },
    },
    {
      field: "langButtonLabel",
      name: "Language Button Label Field",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
        note: "Field key from the translations collection to display on each language button (default: `code`). Use `name` to show display names like \"Deutsch\".",
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
Array of accordion groups. Each group is the parent and contains its own \`fields\` array.

**Group properties:**
| key | Description |
|-----|-------------|
| \`id\` | Unique group identifier |
| \`label\` | Header text — plain string or \`{ "de-DE": "...", "en-US": "..." }\`. Auto-detected from field meta if omitted. |
| \`labelType\` | \`"parent"\` (default) auto-detects header from root-collection field meta using \`id\`; \`"leaf"\` skips auto-detection and uses \`label\` or prettified \`id\` |
| \`accordion\` | \`false\` (default) renders as a plain always-open card; \`true\` makes the group collapsible with a chevron |
| \`defaultOpen\` | \`true\` (default) to start expanded, \`false\` to start collapsed — only applies when \`accordion: true\` |
| \`fields\` | Array of field objects belonging to this group |

**Field properties (inside \`fields\`):**
| key | Description |
|-----|-------------|
| \`key\` | Unique identifier — used as display label if no \`label\` is set |
| \`value\` | Dot-notation path to the value (e.g. \`"place.translations.name"\`) |
| \`type\` | \`"direct"\` · \`"translated"\` · \`"relation"\` · \`"array"\` |
| \`label\` | Optional label override — string or \`{ "de-DE": "...", "en-US": "..." }\` |
| \`labelType\` | \`"parent"\` (default for translated/relation/array) reads the label from the first path segment on the root collection (e.g. \`hotels.country\` → "Country"); \`"leaf"\` reads from the leaf field's own collection (e.g. \`countries_translations.name\` → "Name") |

For **translated** fields the translation array is filtered to the selected language automatically.
        `.trim(),
      },
    },
  ],
});
