import { defineInterface } from "@directus/extensions-sdk";
import InterfaceComponent from "./interface.vue";

export default defineInterface({
  id: "room-prices-table",
  name: "Room Prices Table",
  icon: "table_chart",
  description: "Display and edit room prices in a grouped table format",
  component: InterfaceComponent,
  options: ({ relations }) => {
    return [
      {
        field: "template",
        name: "Template",
        type: "string",
        meta: {
          width: "full",
          interface: "system-display-template",
          options: {
            collectionName: relations.o2m?.collection,
          },
        },
      },
      {
        field: "groupByField",
        name: "Group By Field",
        type: "string",
        meta: {
          width: "half",
          interface: "select-dropdown",
          options: {
            choices: [
              { text: "Room Category", value: "room_category_id" },
              { text: "Price Date", value: "price_date_id" },
              { text: "None", value: null },
            ],
          },
        },
        schema: {
          default_value: "room_category_id",
        },
      },
      {
        field: "rowField",
        name: "Row Field",
        type: "string",
        meta: {
          width: "half",
          interface: "select-dropdown",
          options: {
            choices: [
              { text: "Price Date", value: "price_date_id" },
              { text: "Room Category", value: "room_category_id" },
            ],
          },
        },
        schema: {
          default_value: "price_date_id",
        },
      },
      {
        field: "columnField",
        name: "Column Field",
        type: "string",
        meta: {
          width: "half",
          interface: "select-dropdown",
          options: {
            choices: [
              { text: "Occupancy", value: "occupancy_id" },
              { text: "Room Category", value: "room_category_id" },
            ],
          },
        },
        schema: {
          default_value: "occupancy_id",
        },
      },
      {
        field: "editableFields",
        name: "Editable Fields",
        type: "json",
        meta: {
          width: "full",
          interface: "select-multiple-dropdown",
          options: {
            choices: [
              { text: "Buy Price", value: "buy_price" },
              { text: "Sell Price", value: "sell_price" },
            ],
          },
        },
        schema: {
          default_value: ["buy_price", "sell_price"],
        },
      },
      {
        field: "enableInlineCreate",
        name: "Enable Adding New Items",
        type: "boolean",
        meta: {
          width: "half",
          interface: "boolean",
        },
        schema: {
          default_value: false,
        },
      },
    ];
  },
  types: ["alias"],
  localTypes: ["o2m"],
  group: "relational",
  relational: true,
});
