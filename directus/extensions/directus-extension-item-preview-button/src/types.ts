export type LangMap = string | Record<string, string>;

export type FieldType = "direct" | "translated" | "relation" | "array";

/** A single field in the fields config array */
export interface FieldConfig {
  /** Display key — also used as fallback label */
  key: string;
  /** Dot-notation path to the value (e.g. "place.translations.name") */
  value: string;
  /** ID of the group this field belongs to (matches GroupConfig.id) */
  groupBy?: string;
  /** How the value should be resolved */
  type: FieldType;
  /** Optional multilingual label override */
  label?: LangMap;
}

/** One accordion group in the preview overlay */
export interface GroupConfig {
  id: string;
  label: LangMap;
  /** Whether the accordion starts open (default: true) */
  defaultOpen?: boolean;
}

export interface PreviewConfig {
  /** Root field key shown as the page title (default: "name") */
  title?: string;
  /** Default language code (default: "de-DE") */
  defaultLang?: string;
  /** Field in translation records that holds the language code (default: "languages_code") */
  langField?: string;
  /** Button label shown on the item form */
  buttonLabel?: string;
  /** Explicit list of fields to display */
  fields?: FieldConfig[];
  /** Accordion groups — organise fields by groupBy id */
  groups?: GroupConfig[];
  translation_collection: string;
  icon: string;
}

export interface Language {
  id: string | number;
  code: string;
  name: string;
}

export interface DisplayNode {
  key: string;
  label: string;
  type: "scalar" | "flat-list";
  value: unknown;
  list?: string[];
}
