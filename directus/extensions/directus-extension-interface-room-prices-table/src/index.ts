import { defineInterface } from "@directus/extensions-sdk";
import InterfaceComponent from "./interface.vue";

export default defineInterface({
  id: "room-prices-table",
  name: "Room Prices Table",
  icon: "table_chart",
  description:
    "Display and edit prices in a grouped table format. Fully configurable for hotels, cruises, yachts, or any similar product.",
  component: InterfaceComponent,
  options: () => {
    const hideWhenDirect = [
      { name: "Direct mode", rule: { mode: { _eq: "direct" } }, hidden: true },
    ];
    // const hideWhenJunction = [
    //   { name: "Junction mode", rule: { mode: { _eq: "junction" } }, hidden: true },
    // ];

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
          note: "Junction: prices are per language/market (hotels, cruises) — uses a junction collection and translations table. Direct: prices live on one flat collection with no language concept (e.g. cars).",
          options: {
            choices: [
              {
                text: "Junction Table (With Translations) (hotels, cruises etc)",
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
          note: "Icon shown next to any item (occupancy, room category, price date) marked as a 'from price'. Pick any Material icon.",
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
          note: "Field on the group-by collection that marks a room category as a 'from price' (e.g. price_start). Leave empty to disable the from-price indicator on category headers.",
          options: { placeholder: "e.g. price_start" },
        },
        schema: { default_value: "price_start" },
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
          note: "Field on the row collection that marks a price date as a 'from price' row (e.g. from_price). Leave empty to disable the from-price indicator on row labels.",
          options: { placeholder: "e.g. from_price" },
        },
        schema: { default_value: "from_price" },
      },
      {
        field: "groupSortField",
        name: "Category (Group) Sort Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the group-by collection used to sort room categories in the table. e.g. 'sort' for a manual sort integer. Leave empty to use the parent record's category order array.",
          options: { placeholder: "e.g. sort" },
        },
        schema: { default_value: "" },
      },
      {
        field: "occupancySortField",
        name: "Occupancy (Column) Sort Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the occupancy record used to sort columns left-to-right. e.g. 'value' (number of guests) or 'sort' for a manual sort integer.",
          options: { placeholder: "e.g. value" },
        },
        schema: { default_value: "value" },
      },
      {
        field: "rowSortField",
        name: "Date (Row) Sort Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the row collection used to sort rows top-to-bottom. e.g. 'start_date' for chronological order or 'sort' for a manual sort integer.",
          options: { placeholder: "e.g. start_date" },
        },
        schema: { default_value: "start_date" },
      },
      {
        field: "emptyStateTitle",
        name: "Empty State Title",
        type: "string",
        meta: {
          width: "half",
          interface: "system-input-translated-string",
          note: "Heading shown when there are no prices to display. Supports $t: translation keys.",
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
          note: "Subtext shown below the empty state heading. Supports $t: translation keys.",
          options: { placeholder: "e.g. Add price dates, categories, and occupancies to see them here." },
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
          note: "Field name on the price record used to group rows into sections. e.g. room_category_id for hotels, cruise_room_category_id for cruises.",
          options: { placeholder: "e.g. room_category_id" },
        },
        schema: { default_value: "room_category_id" },
      },
      {
        field: "rowField",
        name: "Row Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field name on the price record used for each row inside a group. e.g. price_date_id for hotels, cruise_price_date_id for cruises.",
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
          note: "Field name on the price record used for each column. Typically room_occupancy_id for both hotels and cruises.",
          options: { placeholder: "e.g. room_occupancy_id" },
        },
        schema: { default_value: "room_occupancy_id" },
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
          note: "When enabled, users can add new price rows directly inside the table. Disable this if prices should only be created through imports or automated flows.",
        },
        schema: { default_value: false },
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
          note: "The UUID of the Directus manual flow that calculates sell prices. When the user clicks 'Save & Calculate Sell Prices', this flow is triggered with the parent record's ID. Find it under Settings → Flows.",
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
          note: "The collection that holds the price records to display in the table. For hotels this is 'room_prices'. For cruises or yachts, create a similar collection and enter its name here.",
          options: { placeholder: "e.g. room_prices" },
        },
        schema: { default_value: "room_prices" },
      },
      {
        field: "foreignKeyField",
        name: "Foreign Key Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Related Collection that stores the ID linking each price back to its parent record. For hotels it is 'hotel_id'. For cruises it would be 'cruise_id'. For yachts 'yacht_id'.",
          options: { placeholder: "e.g. hotel_id" },
        },
        schema: { default_value: "hotel_id" },
      },
      {
        field: "buyPriceField",
        name: "Buy Price Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field name in the Related Collection that stores the buy/purchase price. This is the raw cost price before any margin or exchange rate is applied.",
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
          note: "The field that holds the sell price value. In junction mode: field on the Translations Collection. In direct mode: field directly on the price record.",
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
          note: "The main product collection this interface belongs to. For hotels enter 'hotels', for cruises 'cruises', for yachts 'yachts'. Used to fetch occupancies, category order, and sell price status.",
          options: { placeholder: "e.g. hotels" },
        },
        schema: { default_value: "hotels" },
      },
      {
        field: "parentKeyField",
        name: "Parent Key Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Only needed when this interface is placed on a junction/translation collection instead of the parent directly. Enter the field name on the junction that holds the parent record ID. Example: placed on 'hotels_translations_1' → enter 'hotels_id'. Placed on 'cruises_translations_1' → enter 'cruises_id'. Leave empty if placed directly on the parent collection.",
          options: {
            placeholder:
              "e.g. hotels_id — leave empty if on parent collection directly",
          },
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
          note: "The collection used to fetch group labels for the table. Matches the Group By Field — if grouping by room_category_id, this should be 'room_categories'. For cruises grouping by cabin_category_id, enter 'cabin_categories'.",
          options: { placeholder: "e.g. room_categories" },
        },
        schema: { default_value: "room_categories" },
      },
      {
        field: "rowCollection",
        name: "Row Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The collection used to fetch row labels for the table. Matches the Row Field — if rows are price_date_id, this should be 'price_dates'. For cruises with departure_date_id rows, enter 'departure_dates'.",
          options: { placeholder: "e.g. price_dates" },
        },
        schema: { default_value: "price_dates" },
      },
      {
        field: "occupanciesField",
        name: "Occupancies Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field on the Parent Collection that holds the list of occupancy options (e.g. single, double, triple). These become the columns in the price table. For hotels this is 'room_occupancies'.",
          options: { placeholder: "e.g. room_occupancies" },
        },
        schema: { default_value: "room_occupancies" },
      },
      {
        field: "occupancySourceMode",
        name: "Occupancy Source Mode",
        type: "string",
        meta: {
          width: "half",
          interface: "select-dropdown",
          note: "Where column occupancies are loaded from. Use Junction Collection when the price record stores the M2M junction row ID, e.g. room_prices.room_occupancy_id = hotels_occupancies.id.",
          options: {
            choices: [
              {
                text: "Auto (Junction first, parent field fallback)",
                value: "auto",
              },
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
          note: "M2M junction collection that stores the selected occupancies for the parent. For hotels this is 'hotels_occupancies'.",
          options: { placeholder: "e.g. hotels_occupancies" },
        },
        schema: { default_value: "hotels_occupancies" },
      },
      {
        field: "occupancyJunctionPrimaryKeyField",
        name: "Occupancy Junction Primary Key Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Primary key field on the occupancy junction collection. This is the value stored in the price table column field. For hotels_occupancies this is 'id'.",
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
          note: "Field on the occupancy junction collection that points back to the parent record. For hotels_occupancies this is 'hotels_id'.",
          options: { placeholder: "e.g. hotels_id" },
        },
        schema: { default_value: "hotels_id" },
      },
      {
        field: "occupancyJunctionRelatedField",
        name: "Occupancy Junction Related Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Field on the occupancy junction collection that points to the original occupancy collection. For hotels_occupancies this is 'occupancies_id'.",
          options: { placeholder: "e.g. occupancies_id" },
        },
        schema: { default_value: "occupancies_id" },
      },
      {
        field: "occupancyCollection",
        name: "Original Occupancy Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "Original collection that stores occupancy labels and values. Used as a fallback if the junction relation is returned as an ID instead of an object. For hotels this is 'occupancies'.",
          options: { placeholder: "e.g. occupancies" },
        },
        schema: { default_value: "occupancies" },
      },
      {
        field: "categoryOrderField",
        name: "Category Order Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field on the Parent Collection that defines the display order of categories (groups) in the table. For hotels this is 'room_categories'. Leave empty to use default ordering.",
          options: { placeholder: "e.g. room_categories" },
        },
        schema: { default_value: "room_categories" },
      },
      {
        field: "sellStatusField",
        name: "Sell Price Status Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field on the Parent Collection that tracks the status of the sell price calculation job (e.g. idle, processing, done, failed). Used to poll and refresh the table after the flow completes.",
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
          note: "The field on the Parent Collection that stores the timestamp of the last successful sell price calculation. Used to detect when a new calculation has completed.",
          options: { placeholder: "e.g. sell_prices_updated_at" },
        },
        schema: { default_value: "sell_prices_updated_at" },
      },

      // ─── Junction / Translation Collection ───────────────────────────────────
      divider(
        "divider_junction",
        "Junction / Translation Collection",
        hideWhenDirect,
      ),
      {
        field: "junctionCollection",
        name: "Junction Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The junction/translation collection that links the parent to a language or market. For hotels this is 'hotels_translations_1'. For cruises it would be 'cruises_translations_1'. Used to fetch available languages for the selector when placed on the parent collection.",
          options: { placeholder: "e.g. hotels_translations_1" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "hotels_translations_1" },
      },
      {
        field: "junctionParentKeyField",
        name: "Junction → Parent Key Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Junction Collection that links back to the parent record. For 'hotels_translations_1' this is 'hotels_id'. For 'cruises_translations_1' it would be 'cruises_id'.",
          options: { placeholder: "e.g. hotels_id" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "hotels_id" },
      },
      {
        field: "junctionLanguageField",
        name: "Junction → Language Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Junction Collection that stores the language or market ID. Typically 'translations_id'. Used to filter sell prices per language.",
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
          note: "The field inside the Junction Collection that stores the exchange rate reference for this market. Used to determine the buy and sell currency symbols displayed in the table header.",
          options: { placeholder: "e.g. exchange_rate" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "exchange_rate" },
      },

      // ─── Translations Collection (Sell Prices) ───────────────────────────────
      divider(
        "divider_translations",
        "Translations Collection (Sell Prices)",
        hideWhenDirect,
      ),
      {
        field: "translationsCollection",
        name: "Translations Collection",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The collection that stores per-language sell prices for each price record. For hotels this is 'room_prices_translations'. For cruises it would be 'cruise_prices_translations'.",
          options: { placeholder: "e.g. room_prices_translations" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "room_prices_translations" },
      },
      {
        field: "translationsFKField",
        name: "Translations → Price FK Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Translations Collection that links each sell price record back to its parent price record in the Related Collection. For 'room_prices_translations' this is 'room_prices_id'.",
          options: { placeholder: "e.g. room_prices_id" },
          conditions: hideWhenDirect,
        },
        schema: { default_value: "room_prices_id" },
      },
      {
        field: "translationsLanguageField",
        name: "Translations → Language Field",
        type: "string",
        meta: {
          width: "half",
          interface: "input",
          note: "The field inside the Translations Collection that stores the language or market ID. Used to filter sell prices for the currently selected language. Typically 'translations_id'.",
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
          note: "The collection that stores exchange rate records. Used to resolve and display currency symbols in the table header.",
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
    ] as any;
  },
  types: ["alias"],
  localTypes: ["presentation"],
  group: "other",
  relational: false,
});
