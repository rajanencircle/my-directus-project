import InterfaceTranslations from "./interface.vue";
// import PreviewSVG from "./preview.svg";

export default {
  id: "translations-ai",
  name: "Translations (AI Enhanced)",
  description:
    "Native translations interface with AI-powered translation capabilities",
  icon: "translate",
  // preview: PreviewSVG,
  component: InterfaceTranslations,
  types: ["alias"],
  localTypes: ["translations"],
  group: "relational",
  relational: true,
  options: ({ relations }) => {
    const junctionCollection = relations.o2m?.collection;
    const languageCollection = relations.m2o?.related_collection;

    return [
      {
        field: "languageField",
        name: "Language Field",
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
        name: "Default Language",
        type: "string",
        schema: {
          default_value: "en-US",
        },
        meta: {
          interface: "input",
          width: "half",
        },
      },
      {
        field: "translationWebhookUrl",
        name: "Translation Webhook URL",
        type: "string",
        meta: {
          interface: "input",
          options: {
            placeholder: "https://your-directus.io/flows/trigger/...",
          },
          width: "full",
          note: "Webhook URL for the Directus Translation Trigger Flow",
        },
      },
      {
        field: "userCreatedField",
        name: "User Created Field",
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
        name: "User Updated Field",
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
    ];
  },
};
