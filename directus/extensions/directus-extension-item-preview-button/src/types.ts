export type LangMap = string | Record<string, string>;

export type FieldType = "direct" | "translated" | "relation" | "array" | "dropdown" | "repeater" | "price-table";

/** A single field inside a group */
export interface FieldConfig {
  /** Unique key — used as display label fallback */
  key: string;
  /** Dot-notation path to the value (e.g. "place.translations.name") */
  value: string;
  /** How the value should be resolved */
  type: FieldType;
  /** Optional multilingual label override */
  label?: LangMap;
  /**
   * Where to auto-detect the label from when no explicit `label` is set.
   *  "parent" — first path segment on the root collection (e.g. hotels.country → "Country")
   *  "leaf"   — leaf field resolved to its actual collection (e.g. countries_translations.name → "Name")
   * Default: "parent" for translated/relation/array types, "leaf" for direct.
   */
  labelType?: "leaf" | "parent";
  /** Sub-fields for repeater type — if omitted, all object properties are displayed automatically */
  fields?: FieldConfig[];
  /**
   * Suppress this field's own label row — useful when it's the sole field in a
   * group and its label would just repeat the group's own accordion title.
   */
  hideLabel?: boolean;
  /**
   * Only meaningful on a repeater's sub-field: render this field's value as
   * the card's own header instead of a normal label/value row — e.g. a
   * price date's "name" shown as the card title rather than another row.
   */
  cardTitle?: boolean;

  // ── "price-table" type only ────────────────────────────────────────────
  /** Path to the array of category records used for row-grouping (default: "room_categories") */
  groupsSource?: string;
  /** Path to the array of date records used for table rows (default: "price_dates") */
  rowsSource?: string;
  /** Path to the array of occupancy records used for table columns (default: "room_occupancies") */
  columnsSource?: string;
  /** Field on each price record linking to a group/category id (default: "room_category_id") */
  groupField?: string;
  /** Field on each price record linking to a row/date id (default: "price_date_id") */
  rowField?: string;
  /** Field on each price record linking to a column/occupancy id (default: "room_occupancy_id") */
  columnField?: string;
  /** Field on each price record holding the buy price (default: "buy_price") */
  buyPriceField?: string;
  /** Field on each price record holding the sell price (default: "sell_price") */
  sellPriceField?: string;
}

/** Accordion group — parent node that contains its own fields */
export interface GroupConfig {
  id: string;
  /** Header label — plain string or multilingual object. Auto-detected from field meta if omitted. */
  label?: LangMap;
  /**
   * Controls accordion header auto-detection when no explicit `label` is set.
   *  "parent" (default) — look up g.id as a field on the root collection
   *  "leaf"             — skip API lookup; use g.label or prettify(g.id)
   */
  labelType?: "leaf" | "parent";
  /** false (default) = plain always-open card; true = collapsible accordion with chevron */
  accordion?: boolean;
  /** Whether the accordion starts open (default: true) — only applies when accordion: true */
  defaultOpen?: boolean;
  /** Fields belonging to this group */
  fields: FieldConfig[];
}

export interface PreviewConfig {
  /** Root field key shown as the overlay title (default: "name") */
  title?: string;
  /** Default language code (default: "de-DE") */
  defaultLang?: string;
  /** Field in translation records that holds the language identifier (default: "languages_code") */
  langField?: string;
  /** Button label shown on the item form */
  buttonLabel?: string;
  /** All display config — groups with their nested fields */
  groups?: GroupConfig[];
  translation_collection: string;
  icon: string;
  /** Field key on language records used as the language button label (default: "code") */
  langButtonLabel?: string;
}

export interface Language {
  id: string | number;
  code: string;
  name: string;
  [key: string]: unknown;
}

export interface PriceTableCell {
  buy: unknown;
  sell: unknown;
}

export interface PriceTableColumn {
  id: string;
  label: string;
}

export interface PriceTableRow {
  key: string;
  label: string;
  dateRange: string;
  cells: Record<string, PriceTableCell>;
}

export interface PriceTableGroup {
  key: string;
  label: string;
  rows: PriceTableRow[];
}

export interface DisplayNode {
  key: string;
  label: string;
  type: "scalar" | "flat-list" | "repeater" | "price-table";
  value: unknown;
  list?: string[];
  /** Repeater items — outer array is each item, inner array is that item's display nodes */
  items?: DisplayNode[][];
  /** "price-table" data — grouped rows/columns mirroring the admin room-prices table */
  priceTable?: {
    columns: PriceTableColumn[];
    groups: PriceTableGroup[];
  };
  /** When true, DataNode renders this node's body without its own label row */
  hideLabel?: boolean;
  /** When true, DataNode renders this node as its parent card's header line */
  cardTitle?: boolean;
}
