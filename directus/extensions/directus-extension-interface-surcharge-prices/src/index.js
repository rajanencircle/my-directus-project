import InterfaceComponent from "./interface.vue";

/**
 * Extension definition for the Surcharge Prices Table interface.
 *
 * Registers the interface under the id `directus-extension-interface-surcharge-prices`
 * and declares the admin-configurable options: which collections and fields
 * hold the surcharges, their translations, the exchange rates and currency
 * symbols, and the two required formula functions (`roundHalf`,
 * `calculateSellPrice`) that compute sell prices in the browser. Points the
 * interface at the Vue component in `interface.vue`, which renders the table
 * and runs the pricing logic.
 */
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
      field: "label",
      type: "string",
      name: "Button Label",
      meta: {
        width: "full",
        interface: "system-input-translated-string",
        options: { placeholder: "e.g. Save & Calculate Sell Prices" },
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
    },
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
    },
    {
      field: "percentageTypeField",
      name: "Percentage Type Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "Field on the settings collection (this interface's own collection) storing 'net'/'gross'.",
      },
    },
    {
      field: "marginField",
      name: "Margin Percentage Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "Field on the settings collection storing the margin percentage.",
      },
    },
    {
      field: "provisionField",
      name: "Provision Percentage Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "Field on the settings collection storing the provision percentage.",
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
    },
    {
      field: "parentField",
      name: "Parent Foreign Key",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field in the surcharges collection that links to the parent record (e.g. hotel, excursion, tour).",
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
    },
    {
      field: "junctionParentField",
      name: "Junction Parent Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field name in this junction collection's values that holds the parent FK (e.g. hotels_id).",
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
    },
    {
      field: "divider_formula",
      name: "Calculation Formula",
      type: "alias",
      meta: {
        width: "full",
        interface: "presentation-divider",
        options: {
          title: "Calculation Formula (required)",
          color: "var(--theme--primary)",
        },
      },
    },
    {
      field: "roundHalfLogic",
      name: "Round Half Logic",
      type: "text",
      meta: {
        width: "full",
        interface: "input-code",
        options: { language: "javascript", lineNumber: true },
        required: true,
        note: "Required. Define a function named exactly roundHalf(val). Applies to every hotel/record using this field configuration. There is no built-in fallback — this must be provided.",
      },
    },
    {
      field: "calculateSellPriceLogic",
      name: "Calculate Sell Price Logic",
      type: "text",
      meta: {
        width: "full",
        interface: "input-code",
        options: { language: "javascript", lineNumber: true },
        required: true,
        note: "Required. Define a function named exactly calculateSellPrice(buyPrice, settingsRow, surchargeRow, rateValue). Applies to every hotel/record using this field configuration. There is no built-in fallback — this must be provided.",
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
    },
  ],
};
