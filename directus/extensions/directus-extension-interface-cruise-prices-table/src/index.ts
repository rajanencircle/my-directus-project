import { defineInterface } from "@directus/extensions-sdk";
import InterfaceComponent from "./interface.vue";

export default defineInterface({
  id: "cruise-prices-table",
  name: "Cruise Prices Table",
  icon: "table_chart",
  description: "Display and edit cruise prices in a grouped table format. Fully configurable for cruises or any similar product.",
  component: InterfaceComponent,
  options: () => {
    const hideWhenDirect = [{ name: "Direct mode", rule: { mode: { _eq: "direct" } }, hidden: true }];

    const divider = (field: string, title: string, conditions?: any[]) => ({
      field,
      name: title,
      type: "alias",
      meta: {
        width: "full",
        interface: "presentation-divider",
        options: { title, color: "var(--theme--primary)" },
        ...(conditions ? { conditions } : {}),
      },
    });

    return [
      // ─── General ─────────────────────────────────────────────────────────────
      divider("divider_general", "General"),
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
        field: "buttonPosition",
        name: "Button Position",
        type: "string",
        meta: {
          width: "half",
          interface: "select-dropdown",
          options: {
            choices: [
              { text: "Top", value: "top" },
              { text: "Bottom", value: "bottom" },
            ],
          },
        },
        schema: { default_value: "bottom" },
      },
      // ─── Mode ────────────────────────────────────────────────────────────────
      {
        field: "mode",
        name: "Mode",
        type: "string",
        meta: {
          width: "half",
          interface: "select-dropdown",
          note: "Junction: prices are per language/market (cruises) — uses a junction collection and translations table. Direct: prices live on one flat collection with no language concept.",
          options: {
            choices: [
              { text: "Junction Table (With Translations)", value: "junction" },
              { text: "Direct Table (Without Translations)", value: "direct" },
            ],
          },
        },
        schema: { default_value: "junction" },
      },

      // ─── Table Layout ────────────────────────────────────────────────────────
      divider("divider_layout", "Table Layout"),
      {
        field: "fromPriceSymbol",
        name: "From Price Icon",
        type: "string",
        meta: {
          width: "half",
          interface: "select-icon",
          note: "Icon shown next to any item (occupancy, cabin category, price date) marked as a 'from price'. Pick any Material icon. Leave empty to disable the indicator entirely.",
        },
        schema: { default_value: "" },
      },
      {
        field: "groupFromPriceField",
        name: "Category From-Price Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the group-by collection that marks a cabin category as a 'from price'. Leave empty to disable the from-price indicator on category headers.",
          options: { placeholder: "e.g. price_start" },
        },
        schema: { default_value: "" },
      },
      {
        field: "occupancyFromPriceField",
        name: "Occupancy From-Price Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the occupancy record that marks it as a 'from price' column (e.g. from_price). Leave empty to disable the from-price indicator on column headers.",
          options: { placeholder: "e.g. from_price" },
        },
        schema: { default_value: "from_price" },
      },
      {
        field: "rowFromPriceField",
        name: "Date (Row) From-Price Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the row collection that marks a price date as a 'from price' row. Leave empty to disable the from-price indicator on row labels.",
          options: { placeholder: "e.g. from_price" },
        },
        schema: { default_value: "" },
      },
      {
        field: "groupByField",
        name: "Group By Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field name on the price record used to group rows into sections. e.g. cabin_category_id for cruises.",
          options: { placeholder: "e.g. cabin_category_id" },
        },
        schema: { default_value: "cabin_category_id" },
      },
      {
        field: "rowField",
        name: "Row Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field name on the price record used for each row inside a group. e.g. price_date_id for cruises.",
          options: { placeholder: "e.g. price_date_id" },
        },
        schema: { default_value: "price_date_id" },
      },
      {
        field: "columnField",
        name: "Column Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field name on the price record used for each column. Stores the occupancy junction PK. e.g. cruise_occupancy_id.",
          options: { placeholder: "e.g. cruise_occupancy_id" },
        },
        schema: { default_value: "cruise_occupancy_id" },
      },
      {
        field: "editableFields",
        name: "Editable Fields",
        type: "json",
        meta: {
          width: "half",
          interface: "input",
          note: 'JSON array of field names the user can edit in the table. e.g. ["buy_price"] or ["buy_price","sell_price"].',
          options: { placeholder: '["buy_price"]' },
        },
        schema: { default_value: ["buy_price"] },
      },
      {
        field: "enableInlineCreate",
        name: "Enable Adding New Items",
        type: "boolean",
        meta: {
          width: "half",
          interface: "boolean",
          note: "When enabled, users can add new price rows directly inside the table.",
        },
        schema: { default_value: false },
      },

      // ─── Labels ──────────────────────────────────────────────────────────────
      divider("divider_labels", "Labels"),
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
          note: "Heading shown when there are no prices to display. Supports $t: translation keys.",
          options: { placeholder: "e.g. No cruise prices configured yet" },
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
          note: "Subtext shown below the empty state heading. Supports $t: translation keys.",
          options: {
            placeholder:
              "e.g. Add price periods, cabin categories, and occupancies to see them here.",
          },
        },
        schema: { default_value: "" },
      },

      // ─── Flow ────────────────────────────────────────────────────────────────
      divider("divider_flow", "Sell Price Calculation Flow"),
      {
        field: "calculateSellPricesFlowId",
        name: "Calculate Sell Prices Flow ID",
        type: "string",
        meta: {
          width: "full",
          interface: "input",
          note: "The UUID of the Directus manual flow that calculates sell prices. Find it under Settings → Flows.",
          options: { placeholder: "e.g. d3960afd-9f72-417f-8cce-f8269f67c61c" },
        },
      },

      // ─── Related Collection (Prices) ─────────────────────────────────────────
      divider("divider_related", "Related Collection (Prices)"),
      {
        field: "relatedCollection",
        name: "Related Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The collection that holds the price records. For cruises this is 'cruise_prices'.",
          options: { placeholder: "e.g. cruise_prices" },
        },
        schema: { default_value: "cruise_prices" },
      },
      {
        field: "foreignKeyField",
        name: "Foreign Key Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Related Collection that links each price back to its parent cruise. e.g. cruise_id.",
          options: { placeholder: "e.g. cruise_id" },
        },
        schema: { default_value: "cruise_id" },
      },
      {
        field: "buyPriceField",
        name: "Buy Price Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field name in the Related Collection that stores the buy/purchase price.",
          options: { placeholder: "e.g. buy_price" },
        },
        schema: { default_value: "buy_price" },
      },
      {
        field: "sellPriceField",
        name: "Sell Price Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field that holds the sell price value. In junction mode: field on the Translations Collection. In direct mode: field on the price record.",
          options: { placeholder: "e.g. sell_price" },
        },
        schema: { default_value: "sell_price" },
      },

      // ─── Parent Record ───────────────────────────────────────────────────────
      divider("divider_parent", "Parent Record"),
      {
        field: "parentCollection",
        name: "Parent Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The main product collection this interface belongs to. e.g. 'cruises'.",
          options: { placeholder: "e.g. cruises" },
        },
        schema: { default_value: "cruises" },
      },
      {
        field: "parentKeyField",
        name: "Parent Key Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Only needed when placed on a junction/translation collection instead of the parent directly. Enter the field on the junction that holds the parent ID. e.g. 'cruises_id' when placed on 'cruises_translations_1'. Leave empty if placed directly on the parent collection.",
          options: { placeholder: "e.g. cruises_id — leave empty if on parent collection directly" },
        },
        schema: { default_value: "" },
      },
      {
        field: "groupByCollection",
        name: "Group By Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The collection used to fetch group (section) labels. Matches the Group By Field — if grouping by cabin_category_id, enter 'cruises_cabins_categories'.",
          options: { placeholder: "e.g. cruises_cabins_categories" },
        },
        schema: { default_value: "cruises_cabins_categories" },
      },
      {
        field: "groupByLabelField",
        name: "Group By Label Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field on the Group By Collection used as the display label for each section header. e.g. 'cabin_categories' for cruises, 'name' for hotels.",
          options: { placeholder: "e.g. cabin_categories" },
        },
        schema: { default_value: "name" },
      },
      {
        field: "groupByParentKeyField",
        name: "Group By → Parent FK Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field on the Group By Collection that links back to the parent record. Used to filter groups by cruise. e.g. 'cruises_cabins_categories' (the FK field on that collection).",
          options: { placeholder: "e.g. cruises_cabins_categories" },
        },
        schema: { default_value: "cruises_cabins_categories" },
      },
      {
        field: "enableChildCategories",
        name: "Enable Shared/Child Categories",
        type: "boolean",
        meta: {
          width: "half",
          interface: "boolean",
          note: "Enable fetching child/shared categories via sharedId (used for hotels with parent-child room categories). Disable for cruises where cabin categories are flat.",
        },
        schema: { default_value: false },
      },
      {
        field: "rowCollection",
        name: "Row Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The collection used to fetch row labels. Matches the Row Field — if rows are price_date_id, enter 'cruises_price_dates'.",
          options: { placeholder: "e.g. cruises_price_dates" },
        },
        schema: { default_value: "cruises_price_dates" },
      },
      {
        field: "rowStartDateField",
        name: "Row Start Date Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the Row Collection used as the start date for sorting and display. e.g. 'date_departure' for cruises, 'start_date' for hotels.",
          options: { placeholder: "e.g. date_departure" },
        },
        schema: { default_value: "date_departure" },
      },
      {
        field: "rowEndDateField",
        name: "Row End Date Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the Row Collection used as the end date for display. e.g. 'date_arrival' for cruises, 'end_date' for hotels.",
          options: { placeholder: "e.g. date_arrival" },
        },
        schema: { default_value: "date_arrival" },
      },
      {
        field: "occupanciesField",
        name: "Occupancies Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field on the Parent Collection that holds the list of occupancy options (M2M). These become the columns in the price table.",
          options: { placeholder: "e.g. cruise_occupancies" },
        },
        schema: { default_value: "cruise_occupancies" },
      },
      {
        field: "occupancySourceMode",
        name: "Occupancy Source Mode",
        type: "string",
        meta: {
          width: "half",
          interface: "select-dropdown",
          note: "Where column occupancies are loaded from. Use Junction Collection when the price record stores the M2M junction row ID.",
          options: {
            choices: [
              { text: "Auto (Junction first, parent field fallback)", value: "auto" },
              { text: "Parent Field Array", value: "parent_field" },
              { text: "Junction Collection", value: "junction" },
            ],
          },
        },
        schema: { default_value: "junction" },
      },
      {
        field: "occupancyJunctionCollection",
        name: "Occupancy Junction Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "M2M junction collection that stores the selected occupancies for the parent cruise. e.g. 'cruises_cruises_occupancies'.",
          options: { placeholder: "e.g. cruises_cruises_occupancies" },
        },
        schema: { default_value: "cruises_cruises_occupancies" },
      },
      {
        field: "occupancyJunctionPrimaryKeyField",
        name: "Occupancy Junction Primary Key Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Primary key field on the occupancy junction collection. This value is stored in the price table column field.",
          options: { placeholder: "e.g. id" },
        },
        schema: { default_value: "id" },
      },
      {
        field: "occupancyJunctionParentField",
        name: "Occupancy Junction Parent Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the occupancy junction collection that points back to the parent cruise. e.g. 'cruises_id'.",
          options: { placeholder: "e.g. cruises_id" },
        },
        schema: { default_value: "cruises_id" },
      },
      {
        field: "occupancyJunctionRelatedField",
        name: "Occupancy Junction Related Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the occupancy junction collection that points to the occupancy collection. e.g. 'cruises_occupancies_id'.",
          options: { placeholder: "e.g. cruises_occupancies_id" },
        },
        schema: { default_value: "cruises_occupancies_id" },
      },
      {
        field: "occupancyCollection",
        name: "Original Occupancy Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Collection that stores occupancy labels and values. e.g. 'cruises_occupancies'.",
          options: { placeholder: "e.g. cruises_occupancies" },
        },
        schema: { default_value: "cruises_occupancies" },
      },
      {
        field: "categoryOrderField",
        name: "Category Order Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field on the Parent Collection that defines the display order of categories in the table. e.g. 'cabin_categories'.",
          options: { placeholder: "e.g. cabin_categories" },
        },
        schema: { default_value: "cabin_categories" },
      },
      {
        field: "sellStatusField",
        name: "Sell Price Status Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field on the Parent Collection that tracks the status of the sell price calculation job (idle, processing, done, failed).",
          options: { placeholder: "e.g. sell_prices_status" },
        },
        schema: { default_value: "sell_prices_status" },
      },
      {
        field: "sellUpdatedAtField",
        name: "Sell Price Updated At Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field on the Parent Collection that stores the timestamp of the last successful sell price calculation.",
          options: { placeholder: "e.g. sell_prices_updated_at" },
        },
        schema: { default_value: "sell_prices_updated_at" },
      },

      // ─── Junction / Translation Collection ───────────────────────────────────
      divider("divider_junction", "Junction / Translation Collection", hideWhenDirect),
      {
        field: "junctionCollection",
        name: "Junction Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The junction/translation collection that links the parent cruise to a language or market. e.g. 'cruises_translations_1'.",
          options: { placeholder: "e.g. cruises_translations_1" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "cruises_translations_1" },
      },
      {
        field: "junctionParentKeyField",
        name: "Junction → Parent Key Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Junction Collection that links back to the parent cruise. e.g. 'cruises_id'.",
          options: { placeholder: "e.g. cruises_id" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "cruises_id" },
      },
      {
        field: "junctionLanguageField",
        name: "Junction → Language Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Junction Collection that stores the language or market ID. Typically 'translations_id'.",
          options: { placeholder: "e.g. translations_id" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "translations_id" },
      },
      {
        field: "junctionExchangeRateField",
        name: "Junction → Exchange Rate Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Junction Collection that stores the exchange rate reference for this market.",
          options: { placeholder: "e.g. exchange_rate" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "exchange_rate" },
      },

      // ─── Translations Collection (Sell Prices) ───────────────────────────────
      divider("divider_translations", "Translations Collection (Sell Prices)", hideWhenDirect),
      {
        field: "translationsCollection",
        name: "Translations Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The collection that stores per-language sell prices for each price record. e.g. 'cruise_prices_translations'.",
          options: { placeholder: "e.g. cruise_prices_translations" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "cruise_prices_translations" },
      },
      {
        field: "translationsFKField",
        name: "Translations → Price FK Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Translations Collection that links each sell price record back to its parent price record. e.g. 'cruise_prices_id'.",
          options: { placeholder: "e.g. cruise_prices_id" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "cruise_prices_id" },
      },
      {
        field: "translationsLanguageField",
        name: "Translations → Language Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Translations Collection that stores the language or market ID. Typically 'translations_id'.",
          options: { placeholder: "e.g. translations_id" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "translations_id" },
      },

      // ─── Currency ─────────────────────────────────────────────────────────────
      divider("divider_currency", "Currency"),
      {
        field: "defaultBuyCurrencySymbol",
        name: "Buy Currency Symbol",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Symbol shown in the buy price column header. In junction mode this is a fallback; in direct mode it is always used.",
          options: { placeholder: "e.g. €" },
        },
        schema: { default_value: "€" },
      },
      {
        field: "defaultSellCurrencySymbol",
        name: "Sell Currency Symbol",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Symbol shown in the sell price column header. In junction mode this is a fallback; in direct mode it is always used.",
          options: { placeholder: "e.g. $" },
        },
        schema: { default_value: "$" },
      },
      {
        field: "ratesCollection",
        name: "Rates Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The collection that stores exchange rate records.",
          options: { placeholder: "e.g. rates" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "rates" },
      },
      {
        field: "currenciesCollection",
        name: "Currencies Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The collection that stores currency records with their symbols.",
          options: { placeholder: "e.g. currencies" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "currencies" },
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
          conditions: hideWhenDirect,
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
          conditions: hideWhenDirect,
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
          conditions: hideWhenDirect,
        },
        schema: { default_value: "symbol" },
      },
    ];
  },
  types: ["alias"],
  localTypes: ["presentation"],
  group: "other",
  relational: false,
});
