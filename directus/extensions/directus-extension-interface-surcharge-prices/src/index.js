import InterfaceComponent from "./interface.vue";

export default {
  id: "directus-extension-interface-surcharge-prices",
  name: "Surcharge Prices Table",
  icon: "payments",
  description:
    "A custom table for managing hotel surcharge buy and sell prices across different languages.",
  component: InterfaceComponent,
  types: ["alias"],
  localTypes: ["presentation"],
  group: "other",
  options: [
    {
      field: "calculateFlowId",
      name: "Calculate Flow ID",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The ID of the flow to trigger for sell price calculations.",
      },
    },
    {
      field: "surchargesCollection",
      name: "Surcharges Collection",
      type: "string",
      meta: {
        width: "half",
        interface: "system-collection",
        note: "The collection where surcharges are stored.",
      },
      schema: {
        default_value: "surcharges",
      },
    },
    {
      field: "translationsCollection",
      name: "Translations Collection",
      type: "string",
      meta: {
        width: "half",
        interface: "system-collection",
        note: "The collection where surcharge translations are stored.",
      },
      schema: {
        default_value: "surcharges_translations",
      },
    },
    {
      field: "ratesCollection",
      name: "Rates Collection",
      type: "string",
      meta: {
        width: "half",
        interface: "system-collection",
        note: "The collection where currency rates are stored.",
      },
      schema: {
        default_value: "rates",
      },
    },
    {
      field: "hotelField",
      name: "Hotel Foreign Key",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field in the surcharges collection that links to the hotel.",
      },
      schema: {
        default_value: "hotel_id",
      },
    },
    {
      field: "buyPriceField",
      name: "Buy Price Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field for the buy price.",
      },
      schema: {
        default_value: "buy_price",
      },
    },
    {
      field: "sellPriceField",
      name: "Sell Price Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field for the sell price in the translations collection.",
      },
      schema: {
        default_value: "sell_price",
      },
    },
    {
      field: "exchangeRateField",
      name: "Exchange Rate Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field in the parent collection that stores the exchange rate key.",
      },
      schema: {
        default_value: "surcharge_exchange_rate",
      },
    },
    {
      field: "junctionHotelField",
      name: "Junction Hotel Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field name in this junction collection's values that holds the hotel FK (e.g. hotels_id).",
      },
      schema: {
        default_value: "hotels_id",
      },
    },
    {
      field: "junctionLanguageField",
      name: "Junction Language Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field name in this junction collection's values that holds the language/translation FK (e.g. translations_id).",
      },
      schema: {
        default_value: "translations_id",
      },
    },
    {
      field: "divider",
      name: "Calculate Button Placement",
      type: "alias",
      meta: {
        width: "full",
        interface: "presentation-divider",
        options: {
          title: "Calculate Button Placement",
          color: "var(--theme--primary)",
        },
      },
    },
    {
      field: "placement",
      name: "Placement",
      type: "string",
      meta: {
        interface: "select-dropdown",
        options: {
          choices: [
            { text: "Bottom", value: "bottom" },
            { text: "Top", value: "top" },
          ],
        },
        width: "half",
      },
      schema: {
        default_value: "bottom",
      },
    },
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
  ],
};
