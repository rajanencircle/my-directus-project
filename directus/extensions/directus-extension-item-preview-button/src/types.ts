export type LangMap = string | Record<string, string>;

export type FieldType = "direct" | "translated" | "relation" | "array";

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
}

/** Accordion group — parent node that contains its own fields */
export interface GroupConfig {
  id: string;
  /** Header label — plain string or multilingual object */
  label: LangMap;
  /** Whether the accordion starts open (default: true) */
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
