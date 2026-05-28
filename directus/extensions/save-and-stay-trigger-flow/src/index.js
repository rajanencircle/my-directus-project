import InterfaceComponent from "./interface.vue";

export default {
  id: "save-and-stay-trigger-flow",
  name: "Save & Stay + Trigger Flow",
  icon: "smart_button",
  description:
    "Button that saves the item (Save & Stay) and optionally triggers a Directus Flow.",
  component: InterfaceComponent,
  types: ["alias"],
  localTypes: ["presentation"],
  group: "presentation",
  hideLabel: true,
  hideLoader: true,
  options: () => [
    {
      field: "label",
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
      schema: { default_value: "save" },
    },
    {
      field: "classType",
      name: "$t:type",
      type: "string",
      meta: {
        width: "half",
        interface: "select-dropdown",
        options: {
          choices: [
            { text: "$t:primary", value: "primary" },
            { text: "$t:normal", value: "normal" },
            { text: "$t:info", value: "info" },
            { text: "$t:success", value: "success" },
            { text: "$t:warning", value: "warning" },
            { text: "$t:danger", value: "danger" },
          ],
        },
      },
      schema: { default_value: "primary" },
    },
    {
      field: "flowId",
      name: "Flow ID (optional)",
      type: "string",
      meta: {
        width: "full",
        interface: "input",
        note: "UUID of a Directus Flow with a Webhook or Manual trigger. The flow receives { collection, keys [id] in the body. Leave empty to only Save & Stay.",
        options: { placeholder: "e.g. a1b2c3d4-..." },
      },
    },
  ],
};
