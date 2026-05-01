import { defineInterface } from "@directus/extensions-sdk";
import InterfaceComponent from "./interface.vue";

export default defineInterface({
  id: "save-and-stay",
  name: "Save & Stay",
  icon: "save",
  description: "A button that saves the current item and optionally triggers a flow",
  component: InterfaceComponent,
  options: [
    {
      field: "buttonLabel",
      name: "Button Label",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        options: {
          placeholder: "Save & Stay",
        },
      },
      schema: {
        default_value: "Save & Stay",
      },
    },
    {
      field: "buttonIcon",
      name: "Button Icon",
      type: "string",
      meta: {
        width: "half",
        interface: "select-icon",
      },
    },
    {
      field: "refreshAfterSave",
      name: "Refresh Page After Save",
      type: "boolean",
      meta: {
        width: "half",
        interface: "boolean",
        note: "When enabled, the page reloads after saving.",
      },
      schema: {
        default_value: false,
      },
    },
    {
      field: "flowId",
      name: "Trigger Flow",
      type: "string",
      meta: {
        width: "half",
        interface: "input-autocomplete-api",
        options: {
          url: "/flows",
          resultsPath: "data",
          textPath: "name",
          valuePath: "id",
          placeholder: "Search for a flow...",
        },
        note: "Select a manual or webhook flow to trigger after save.",
      },
    },
  ],
  types: ["alias"],
  localTypes: ["presentation"],
  group: "other",
  relational: false,
});