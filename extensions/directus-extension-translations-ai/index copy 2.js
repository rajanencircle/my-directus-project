import InterfaceTranslations from "./interface.vue";
// import PreviewSVG from "./preview.svg";

export default {
  id: "translations-ai",
  name: "Translations (AI Enhanced)",
  description:
    "Native translations interface with AI-powered field-level translation via Directus Flows",
  icon: "translate",
  // preview: PreviewSVG,
  component: InterfaceTranslations,
  types: ["alias"],
  localTypes: ["translations"],
  group: "relational",
  relational: true,
  options: ({ relations }) => {
    const junctionCollection = relations.o2m?.collection;

    return [
      // ── Core translation config (mirrors native Directus interface) ──────────
      {
        field: "languageField",
        name: "$t:language_field",
        type: "string",
        meta: {
          interface: "system-field",
          options: {
            collectionName: junctionCollection,
            typeAllowList: ["string"],
          },
          width: "half",
        },
      },
      {
        field: "defaultLanguage",
        name: "$t:default_language",
        type: "string",
        schema: {
          default_value: "en-US",
        },
        meta: {
          interface: "input",
          width: "half",
          note: "Language code for the default active tab (e.g. en-US)",
        },
      },
      {
        field: "userCreatedField",
        name: "$t:user_created",
        type: "string",
        meta: {
          interface: "system-field",
          options: {
            collectionName: junctionCollection,
            typeAllowList: ["uuid"],
          },
          width: "half",
        },
      },
      {
        field: "userUpdatedField",
        name: "$t:user_updated",
        type: "string",
        meta: {
          interface: "system-field",
          options: {
            collectionName: junctionCollection,
            typeAllowList: ["uuid"],
          },
          width: "half",
        },
      },

      // ── AI Translation settings ──────────────────────────────────────────────
      {
        field: "ai_divider",
        name: "AI Translation",
        type: "alias",
        meta: {
          interface: "presentation-divider",
          options: {
            title: "AI Translation",
            color: "#6366f1",
          },
          width: "full",
          special: ["alias", "no-data"],
        },
      },
      {
        field: "translationFlow",
        name: "Translation Flow",
        type: "string",
        meta: {
          // Uses the built-in Directus flow-selector interface.
          // This renders a searchable dropdown listing all available flows.
          interface: "system-flows",
          width: "full",
          note: 'Select the Directus Flow to trigger for AI translation. The flow must accept a Webhook / Manual trigger. It receives { sourceLanguage, targetLanguage, field, text, collection, primaryKey } and must return { translation: "..." }.',
        },
      },
    ];
  },
};
