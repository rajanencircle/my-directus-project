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
      field: "sortField",
      name: "Sort Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "Field on the surcharges collection used to sort rows. e.g. 'sort' for manual sort integer, 'name' for alphabetical.",
        options: { placeholder: "e.g. sort" },
      },
      schema: { default_value: "sort" },
    },
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
      field: "surchargeNameField",
      name: "Surcharge Name Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field on the surcharges collection used as the display name in each row.",
        options: { placeholder: "e.g. name" },
      },
      schema: { default_value: "name" },
    },
    {
      field: "translationsSurchargeField",
      name: "Translations → Surcharge FK Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field on the translations collection that links back to the surcharge record.",
        options: { placeholder: "e.g. surcharges_id" },
      },
      schema: { default_value: "surcharges_id" },
    },
    {
      field: "translationsLanguageField",
      name: "Translations → Language FK Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field on the translations collection that stores the language/market ID.",
        options: { placeholder: "e.g. translations_id" },
      },
      schema: { default_value: "translations_id" },
    },
    {
      field: "fromCurrencyField",
      name: "Rate → From Currency Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field on the rate record that references the source (buy) currency.",
        options: { placeholder: "e.g. from_currency" },
      },
      schema: { default_value: "from_currency" },
    },
    {
      field: "toCurrencyField",
      name: "Rate → To Currency Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field on the rate record that references the target (sell) currency.",
        options: { placeholder: "e.g. to_currency" },
      },
      schema: { default_value: "to_currency" },
    },
    {
      field: "currencySymbolField",
      name: "Currency → Symbol Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field on each currency record that holds the display symbol (e.g. €, $, £).",
        options: { placeholder: "e.g. symbol" },
      },
      schema: { default_value: "symbol" },
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
      name: "Button Label",
      meta: {
        width: "full",
        interface: "system-input-translated-string",
        options: { placeholder: "e.g. Save & Calculate Sell Prices" },
      },
    },
    // ─── Labels ──────────────────────────────────────────────────────────────
    {
      field: "divider_labels",
      name: "Labels",
      type: "alias",
      meta: {
        width: "full",
        interface: "presentation-divider",
        options: { title: "Labels", color: "var(--theme--primary)" },
      },
    },
    {
      field: "headerSurchargeLabel",
      name: "Surcharge Column Header",
      type: "string",
      meta: {
        width: "half",
        interface: "system-input-translated-string",
        options: { placeholder: "e.g. Surcharge" },
      },
      schema: { default_value: "" },
    },
    {
      field: "headerPricingLabel",
      name: "Pricing Column Header",
      type: "string",
      meta: {
        width: "half",
        interface: "system-input-translated-string",
        options: { placeholder: "e.g. Pricing" },
      },
      schema: { default_value: "" },
    },
    {
      field: "buyLabel",
      name: "Buy Price Label",
      type: "string",
      meta: {
        width: "half",
        interface: "system-input-translated-string",
        options: { placeholder: "e.g. Buy" },
      },
      schema: { default_value: "" },
    },
    {
      field: "sellLabel",
      name: "Sell Price Label",
      type: "string",
      meta: {
        width: "half",
        interface: "system-input-translated-string",
        options: { placeholder: "e.g. Sell" },
      },
      schema: { default_value: "" },
    },
    {
      field: "emptyStateTitle",
      name: "Empty State Title",
      type: "string",
      meta: {
        width: "half",
        interface: "system-input-translated-string",
        options: { placeholder: "e.g. No surcharges linked" },
      },
      schema: { default_value: "" },
    },
    {
      field: "emptyStateHint",
      name: "Empty State Hint",
      type: "string",
      meta: {
        width: "half",
        interface: "system-input-translated-string",
        options: {
          placeholder:
            "e.g. Add surcharges to the hotel to manage pricing here.",
        },
      },
      schema: { default_value: "" },
    },
    {
      field: "loadingText",
      name: "Loading Text",
      type: "string",
      meta: {
        width: "half",
        interface: "system-input-translated-string",
        options: { placeholder: "e.g. Loading surcharge prices..." },
      },
      schema: { default_value: "" },
    },
  ],
};
