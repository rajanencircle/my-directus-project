import { defineInterface } from "@directus/extensions-sdk";
import InterfaceComponent from "./interface.vue";

export default defineInterface({
  id: "tours-prices-table",
  name: "Tours Prices Table",
  icon: "table_chart",
  description:
    "Display and edit prices in a grouped table format for tours. Groups by category, rows by price period, columns by price category (occupancy).",
  component: InterfaceComponent,
  options: () => {
    const hideWhenDirect = [
      { name: "Direct mode", rule: { mode: { _eq: "direct" } }, hidden: true },
    ];

    const divider = (field: string, title: string, conditions?: any[]) => ({
      field,
      name: title,
      type: "alias" as const,
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
          note: "Junction: prices are per language/market — uses a junction collection and translations table. Direct: prices live on one flat collection with no language concept.",
          options: {
            choices: [
              {
                text: "Junction Table (With Translations)",
                value: "junction",
              },
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
          note: "Icon shown next to any item marked as a 'from price'.",
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
          note: "Field on the group-by collection that marks a category as a 'from price' (e.g. is_from_price).",
          options: { placeholder: "e.g. is_from_price" },
        },
        schema: { default_value: "is_from_price" },
      },
      {
        field: "occupancyFromPriceField",
        name: "Occupancy From-Price Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the occupancy record that marks it as a 'from price' column (e.g. price_category_start).",
          options: { placeholder: "e.g. price_category_start" },
        },
        schema: { default_value: "price_category_start" },
      },
      {
        field: "rowFromPriceField",
        name: "Date (Row) From-Price Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the row collection that marks a price period as a 'from price' row (e.g. is_from_price).",
          options: { placeholder: "e.g. is_from_price" },
        },
        schema: { default_value: "is_from_price" },
      },
      {
        field: "groupSortField",
        name: "Category (Group) Sort Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the group-by collection used to sort categories. e.g. 'sort'.",
          options: { placeholder: "e.g. sort" },
        },
        schema: { default_value: "sort" },
      },
      {
        field: "occupancySortField",
        name: "Occupancy (Column) Sort Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the occupancy record used to sort columns left-to-right.",
          options: { placeholder: "e.g. sort" },
        },
        schema: { default_value: "sort" },
      },
      {
        field: "rowSortField",
        name: "Date (Row) Sort Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the row collection used to sort rows top-to-bottom.",
          options: { placeholder: "e.g. price_period_start" },
        },
        schema: { default_value: "price_period_start" },
      },
      {
        field: "groupByField",
        name: "Group By Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field name on the price record used to group rows into sections.",
          options: { placeholder: "e.g. tours_category_id" },
        },
        schema: { default_value: "tours_category_id" },
      },
      {
        field: "rowField",
        name: "Row Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field name on the price record used for each row inside a group.",
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
          note: "Field name on the price record used for each column.",
          options: { placeholder: "e.g. tours_room_occupancy_id" },
        },
        schema: { default_value: "tours_room_occupancy_id" },
      },
      {
        field: "rowStartDateField",
        name: "Row Start Date Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the row collection that holds the start date for display.",
          options: { placeholder: "e.g. price_period_start" },
        },
        schema: { default_value: "price_period_start" },
      },
      {
        field: "rowEndDateField",
        name: "Row End Date Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the row collection that holds the end date for display.",
          options: { placeholder: "e.g. price_period_end" },
        },
        schema: { default_value: "price_period_end" },
      },
      {
        field: "groupCategoryField",
        name: "Group Category Name Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "M2O field on the group-by collection that holds the category name reference (e.g. category → daytrips_categories.name).",
          options: { placeholder: "e.g. category" },
        },
        schema: { default_value: "category" },
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
          options: { placeholder: "e.g. No prices configured yet" },
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
          options: { placeholder: "e.g. Add price periods, categories, and price categories to see them here." },
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
          note: "The collection that holds the price records to display in the table.",
          options: { placeholder: "e.g. tours_prices" },
        },
        schema: { default_value: "tours_prices" },
      },
      {
        field: "foreignKeyField",
        name: "Foreign Key Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Related Collection that links each price back to its parent tour.",
          options: { placeholder: "e.g. tour_id" },
        },
        schema: { default_value: "tour_id" },
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
          note: "The field that holds the sell price value.",
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
          note: "The main product collection this interface belongs to.",
          options: { placeholder: "e.g. tours" },
        },
        schema: { default_value: "tours" },
      },
      {
        field: "parentKeyField",
        name: "Parent Key Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Only needed when placed on a junction collection instead of the parent directly. Enter the field name on the junction that holds the parent record ID (e.g. tours_id on tours_translations_1). Leave empty if placed directly on the parent collection.",
          options: { placeholder: "e.g. tours_id — leave empty if on parent collection directly" },
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
          note: "The collection used to fetch group labels for the table.",
          options: { placeholder: "e.g. tours_categories" },
        },
        schema: { default_value: "tours_categories" },
      },
      {
        field: "rowCollection",
        name: "Row Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The collection used to fetch row labels for the table.",
          options: { placeholder: "e.g. daytrips_price_dates" },
        },
        schema: { default_value: "daytrips_price_dates" },
      },
      {
        field: "occupanciesField",
        name: "Occupancies Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field on the Parent Collection that holds the list of price category options. These become the columns.",
          options: { placeholder: "e.g. tours_room_occupancy" },
        },
        schema: { default_value: "tours_room_occupancy" },
      },
      {
        field: "occupancySourceMode",
        name: "Occupancy Source Mode",
        type: "string",
        meta: {
          width: "half",
          interface: "select-dropdown",
          options: {
            choices: [
              { text: "Auto (Junction first, parent field fallback)", value: "auto" },
              { text: "Parent Field Array", value: "parent_field" },
              { text: "Junction Collection", value: "junction" },
            ],
          },
        },
        schema: { default_value: "auto" },
      },
      {
        field: "occupancyJunctionCollection",
        name: "Occupancy Junction Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "M2M junction collection that stores the selected occupancies for the parent.",
          options: { placeholder: "e.g. tours_tours_room_occupancies" },
        },
        schema: { default_value: "tours_tours_room_occupancies" },
      },
      {
        field: "occupancyJunctionPrimaryKeyField",
        name: "Occupancy Junction Primary Key Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Primary key field on the occupancy junction collection.",
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
          note: "Field on the occupancy junction collection that points back to the parent record.",
          options: { placeholder: "e.g. tours_id" },
        },
        schema: { default_value: "tours_id" },
      },
      {
        field: "occupancyJunctionRelatedField",
        name: "Occupancy Junction Related Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the occupancy junction collection that points to the original occupancy collection.",
          options: { placeholder: "e.g. tours_room_occupancies_id" },
        },
        schema: { default_value: "tours_room_occupancies_id" },
      },
      {
        field: "occupancyCollection",
        name: "Original Occupancy Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Original collection that stores occupancy labels and values.",
          options: { placeholder: "e.g. tours_room_occupancies" },
        },
        schema: { default_value: "tours_room_occupancies" },
      },
      {
        field: "occupancyNameField",
        name: "Occupancy Name Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the occupancy record that holds the display name.",
          options: { placeholder: "e.g. price_category" },
        },
        schema: { default_value: "price_category" },
      },
      {
        field: "categoryOrderField",
        name: "Category Order Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field on the Parent Collection that defines the display order of categories.",
          options: { placeholder: "e.g. tours_categories" },
        },
        schema: { default_value: "tours_categories" },
      },
      {
        field: "sellStatusField",
        name: "Sell Price Status Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field on the Parent Collection that tracks the status of the sell price calculation job.",
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
          note: "The junction collection that links the parent tour to a language/market.",
          options: { placeholder: "e.g. tours_translations_1" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "tours_translations_1" },
      },
      {
        field: "junctionParentKeyField",
        name: "Junction → Parent Key Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Junction Collection that links back to the parent tour.",
          options: { placeholder: "e.g. tours_id" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "tours_id" },
      },
      {
        field: "junctionLanguageField",
        name: "Junction → Language Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Junction Collection that stores the language/market ID.",
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
          note: "The field inside the Junction Collection that stores the exchange rate reference.",
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
          note: "The collection that stores per-language sell prices for each price record.",
          options: { placeholder: "e.g. tours_prices_translations" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "tours_prices_translations" },
      },
      {
        field: "translationsFKField",
        name: "Translations → Price FK Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Translations Collection that links each sell price record back to its parent price record.",
          options: { placeholder: "e.g. tours_prices_id" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "tours_prices_id" },
      },
      {
        field: "translationsLanguageField",
        name: "Translations → Language Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Translations Collection that stores the language/market ID.",
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
          options: { placeholder: "e.g. symbol" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "symbol" },
      },
    ] as any;
  },
  types: ["alias"],
  localTypes: ["presentation"],
  group: "other",
  relational: false,
});
