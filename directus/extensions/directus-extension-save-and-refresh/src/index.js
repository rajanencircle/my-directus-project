import { defineInterface } from "@directus/extensions-sdk";
import InterfaceComponent from "./interface.vue";

export default defineInterface({
  id: "save-and-refresh",
  name: "Save + Refresh",
  icon: "save",
  description:
    "Save the current item and optionally refresh the current form or page when done",
  component: InterfaceComponent,
  hideLabel: true,
  options: [
    {
      field: "buttonLabel",
      name: "Button Label",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
      },
      schema: {
        default_value: "Save & Refresh",
      },
    },
    {
      field: "buttonIcon",
      name: "Button Icon",
      type: "string",
      meta: {
        interface: "select-icon",
        width: "half",
      },
      schema: {
        default_value: "save",
      },
    },
    {
      field: "refreshType",
      name: "Refresh Mode",
      type: "string",
      meta: {
        interface: "select-dropdown",
        options: {
          choices: [
            { text: "Reload Form", value: "form" },
            { text: "Reload Page", value: "full" },
            { text: "Go Back", value: "back" },
            { text: "No Reload", value: "none" },
          ],
        },
        width: "half",
      },
      schema: {
        default_value: "full",
      },
    },
    {
      field: "refreshDelay",
      name: "Refresh Delay (ms)",
      type: "integer",
      meta: {
        interface: "input",
        width: "half",
        note: "Delay in milliseconds before applying the selected refresh behavior.",
      },
      schema: {
        default_value: 1000,
      },
    },
    {
      field: "confirmDivider",
      name: "Confirmation",
      type: "alias",
      meta: {
        interface: "presentation-divider",
        options: {
          title: "Confirmation",
          icon: "help",
        },
        width: "full",
      },
    },
    {
      field: "confirmEnabled",
      name: "Show Confirmation Dialog",
      type: "boolean",
      meta: {
        interface: "boolean",
        width: "half",
      },
      schema: {
        default_value: true,
      },
    },
    {
      field: "confirmTitle",
      name: "Title",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
      },
      schema: {
        default_value: "Save Item",
      },
    },
    {
      field: "confirmMessage",
      name: "Message",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
      },
      schema: {
        default_value: "Do you want to save this item?",
      },
    },
    {
      field: "confirmCancelLabel",
      name: "Cancel Button Label",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
      },
      schema: {
        default_value: "Cancel",
      },
    },
    {
      field: "confirmContinueLabel",
      name: "Continue Button Label",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
      },
      schema: {
        default_value: "Save",
      },
    },
    {
      field: "resultDivider",
      name: "Result Dialog",
      type: "alias",
      meta: {
        interface: "presentation-divider",
        options: {
          title: "Result Dialog",
          icon: "check",
        },
        width: "full",
      },
    },
    {
      field: "resultDialogEnabled",
      name: "Show Dialog",
      type: "boolean",
      meta: {
        interface: "boolean",
        width: "half",
      },
      schema: {
        default_value: false,
      },
    },
    {
      field: "resultCloseLabel",
      name: "Close Button Label",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
      },
      schema: {
        default_value: "Close",
      },
    },
    {
      field: "resultTitle",
      name: "Title",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
      },
      schema: {
        default_value: "Saved",
      },
    },
    {
      field: "resultMessage",
      name: "Message",
      type: "string",
      meta: {
        interface: "input",
        width: "half",
      },
      schema: {
        default_value: "The item was saved successfully.",
      },
    },
  ],
  types: ["alias"],
  localTypes: ["presentation"],
  group: "presentation",
});
