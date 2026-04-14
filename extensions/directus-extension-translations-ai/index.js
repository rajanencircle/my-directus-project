import InterfaceComponent from "./interface.vue";

export default {
  id: "translations-ai",
  name: "Translations (AI)",
  icon: "translate",
  description:
    "Native Directus Translations interface with AI-powered translation via a webhook Flow",
  component: InterfaceComponent,

  // Must match the native translations interface so Directus knows
  // this handles a translations alias field.
  types: ["alias"],
  localTypes: ["translations"],
  group: "relational",
  relational: true,

  /**
   * Options shown in Settings → Data Model when an editor configures
   * a translations field with this interface.
   *
   * `relations` is provided by Directus and contains:
   *   relations.o2m  — the one-to-many (junction collection) side
   *   relations.m2o  — the many-to-one (languages collection) side
   */
  options: ({ relations }) => {
    console.log("index", relations);
    const junctionCollection =
      relations?.o2m?.collection ?? "hotel_translate_translations";

    return [
      // ── Native translations interface options ──────────────────────────
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
          note: "Field in the junction collection that stores the language code.",
          width: "half",
        },
      },
      {
        field: "defaultLanguage",
        name: "Default Language",
        type: "string",
        schema: { default_value: "en-US" },
        meta: {
          interface: "input",
          note: "Language code shown by default (e.g. en-US).",
          width: "half",
        },
      },
      {
        field: "userLanguage",
        name: "Use User Language",
        type: "boolean",
        schema: { default_value: false },
        meta: {
          interface: "boolean",
          note: "Default to the logged-in user's language setting.",
          width: "half",
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
          note: "Hidden from translation form.",
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
          note: "Hidden from translation form.",
          width: "half",
        },
      },

      // ── AI Translation ─────────────────────────────────────────────────
      {
        field: "ai_divider",
        type: "alias",
        meta: {
          interface: "presentation-divider",
          options: {
            title: "AI Translation",
            inlineTitle: true,
            color: "#6366f1",
          },
          special: ["alias", "no-data"],
          width: "full",
        },
      },
      {
        field: "translationFlowId",
        name: "Translation Flow (ID)",
        type: "string",
        meta: {
          interface: "input",
          note: `Paste the ID of an active Directus Flow with a Webhook / Manual trigger.
The flow receives: { sourceLanguage, targetLanguage, fieldKey, text, collection, primaryKey }
and must return an object like: { translation: "…translated text…" }

Find flow IDs at: Settings → Flows → click a flow → copy the ID from the URL.`,
          width: "full",
        },
      },
    ];
  },
};
