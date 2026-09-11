import InterfaceComponent from "./interface.vue";

// Shown only while the matching toggle is on, so configuring this button for
// one calculator doesn't clutter the form with the other calculator's fields.
const hideUnlessSurcharge = [
  { name: "Surcharge calculator off", rule: { calculatorEnabled: { _neq: true } }, hidden: true },
];
const hideUnlessRoomPrice = [
  {
    name: "Room price calculator off",
    rule: { roomPriceCalculatorEnabled: { _neq: true } },
    hidden: true,
  },
];
// Used by both calculators (to resolve the parent record id) — only hide it
// when neither is enabled.
const hideUnlessEitherCalculator = [
  {
    name: "Both calculators off",
    rule: {
      _and: [
        { calculatorEnabled: { _neq: true } },
        { roomPriceCalculatorEnabled: { _neq: true } },
      ],
    },
    hidden: true,
  },
];

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
    // ─── Shared (used by either calculator to resolve the parent record) ────
    {
      field: "settingsParentField",
      name: "Settings → Parent FK Field",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "Field on this record that links back to the parent (e.g. hotel). Used to resolve which record either calculator runs against.",
        conditions: hideUnlessEitherCalculator,
      },
      schema: { default_value: "" },
    },
    // ─── Surcharge Calculator ─────────────────────────────────────────────
    {
      field: "calculator_divider",
      name: "Surcharge Calculator",
      type: "alias",
      meta: {
        width: "full",
        interface: "presentation-divider",
        options: {
          title: "Surcharge Calculator (optional)",
          color: "var(--theme--primary)",
        },
      },
    },
    {
      field: "calculatorEnabled",
      name: "Trigger Surcharge Calculator",
      type: "boolean",
      meta: {
        width: "full",
        interface: "boolean",
        note: "After Save & Stay, recalculate surcharge sell prices for this record's parent (e.g. hotel/excursion).",
      },
      schema: { default_value: false },
    },
    {
      field: "settingsLanguageField",
      name: "Settings → Language FK Field",
      type: "string",
      meta: { width: "half", interface: "input", conditions: hideUnlessSurcharge },
      schema: { default_value: "translations_id" },
    },
    {
      field: "percentageTypeField",
      name: "Percentage Type Field",
      type: "string",
      meta: { width: "half", interface: "input", conditions: hideUnlessSurcharge },
      schema: { default_value: "surcharge_percentage_type" },
    },
    {
      field: "marginField",
      name: "Margin Percentage Field",
      type: "string",
      meta: { width: "half", interface: "input", conditions: hideUnlessSurcharge },
      schema: { default_value: "surcharge_margin_percentage" },
    },
    {
      field: "provisionField",
      name: "Provision Percentage Field",
      type: "string",
      meta: { width: "half", interface: "input", conditions: hideUnlessSurcharge },
      schema: { default_value: "surcharge_provision_percentage" },
    },
    {
      field: "priceTableField",
      name: "Price Table Field Name",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field name of the surcharge-prices-table interface on this collection — its saved roundHalfLogic/calculateSellPriceLogic are read from there.",
        conditions: hideUnlessSurcharge,
      },
      schema: { default_value: "" },
    },
    {
      field: "exchangeRateField",
      name: "Exchange Rate Field",
      type: "string",
      meta: { width: "half", interface: "input", conditions: hideUnlessSurcharge },
      schema: { default_value: "surcharge_exchange_rate" },
    },
    {
      field: "ratesCollection",
      name: "Rates Collection",
      type: "string",
      meta: { width: "half", interface: "system-collection", conditions: hideUnlessSurcharge },
      schema: { default_value: "rates" },
    },
    {
      field: "surchargesCollection",
      name: "Surcharges Collection",
      type: "string",
      meta: { width: "half", interface: "system-collection", conditions: hideUnlessSurcharge },
      schema: { default_value: "surcharges" },
    },
    {
      field: "surchargesParentField",
      name: "Surcharges → Parent FK Field",
      type: "string",
      meta: { width: "half", interface: "input", conditions: hideUnlessSurcharge },
      schema: { default_value: "" },
    },
    {
      field: "buyPriceField",
      name: "Buy Price Field",
      type: "string",
      meta: { width: "half", interface: "input", conditions: hideUnlessSurcharge },
      schema: { default_value: "buy_price" },
    },
    {
      field: "translationsCollection",
      name: "Translations Collection",
      type: "string",
      meta: { width: "half", interface: "system-collection", conditions: hideUnlessSurcharge },
      schema: { default_value: "surcharges_translations" },
    },
    {
      field: "translationsSurchargeField",
      name: "Translations → Surcharge FK Field",
      type: "string",
      meta: { width: "half", interface: "input", conditions: hideUnlessSurcharge },
      schema: { default_value: "surcharges_id" },
    },
    {
      field: "translationsLanguageField",
      name: "Translations → Language FK Field",
      type: "string",
      meta: { width: "half", interface: "input", conditions: hideUnlessSurcharge },
      schema: { default_value: "translations_id" },
    },
    {
      field: "sellPriceField",
      name: "Sell Price Field",
      type: "string",
      meta: { width: "half", interface: "input", conditions: hideUnlessSurcharge },
      schema: { default_value: "sell_price" },
    },

    // ─── Room Price Calculator ────────────────────────────────────────────
    {
      field: "room_price_calculator_divider",
      name: "Room Price Calculator",
      type: "alias",
      meta: {
        width: "full",
        interface: "presentation-divider",
        options: {
          title: "Room Price Calculator (optional)",
          color: "var(--theme--primary)",
        },
      },
    },
    {
      field: "roomPriceCalculatorEnabled",
      name: "Trigger Room Price Calculator",
      type: "boolean",
      meta: {
        width: "full",
        interface: "boolean",
        note: "After Save & Stay, recalculate room/cabin/unit sell prices for this record's parent. All field names and the formula are read from the price table field below — nothing to configure here beyond which field that is.",
      },
      schema: { default_value: false },
    },
    {
      field: "roomPriceTableField",
      name: "Price Table Field Name",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        note: "The field name of the room-prices-table interface on this collection — its saved options (collections, field names, formula) are read from there directly.",
        conditions: hideUnlessRoomPrice,
      },
      schema: { default_value: "" },
    },
  ],
};
