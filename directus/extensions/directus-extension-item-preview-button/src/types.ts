/** A label that can be a plain string or a map of language codes to strings */
export type LangMap = string | Record<string, string>;

/** A single field entry in the config — either a bare path string or an object with a label */
export type FieldEntry = string | { field: string; label?: LangMap };

export interface GroupConfig {
  id?: string;
  /** Displayed accordion header — can be multilingual */
  label: LangMap;
  /** Whether the accordion starts open (default: true) */
  open?: boolean;
  fields: FieldEntry[];
}

/**
 * The single JSON object configured in the interface options.
 *
 * Minimal example (no groups):
 * {
 *   "title": "name",
 *   "fields": ["name", "street", "place.name", "place.translations.name"]
 * }
 *
 * With groups and multilingual labels:
 * {
 *   "title": "name",
 *   "defaultLang": "de-DE",
 *   "groups": [
 *     {
 *       "label": { "de-DE": "Allgemein", "en-US": "General" },
 *       "fields": ["name", "street"]
 *     },
 *     {
 *       "label": { "de-DE": "Standort", "en-US": "Location" },
 *       "fields": [
 *         "place.name",
 *         "place.translations.languages_code",
 *         "place.translations.name",
 *         { "field": "country.name", "label": { "de-DE": "Land", "en-US": "Country" } }
 *       ]
 *     }
 *   ]
 * }
 */
export interface PreviewConfig {
  /** Root field key to show as the page title (default: "name") */
  title?: string;
  /** Default language code (default: "de-DE") */
  defaultLang?: string;
  /** Field name inside translation records that holds the language code (default: "languages_code") */
  langField?: string;
  /** Button label shown on the item form (default: "Preview") */
  buttonLabel?: string;
  /** Flat list of fields when no groups are needed */
  fields?: FieldEntry[];
  /** Accordion groups — each group has a label and its own field list */
  groups?: GroupConfig[];

  translation_collection: string;
  icon: string;
}

export interface Language {
  code: string;
  name: string;
}

export type FieldTree = { [key: string]: FieldTree | null };

export interface DisplayNode {
  key: string;
  label: string;
  type: "scalar" | "relation" | "array" | "flat-list";
  value: unknown;
  children?: DisplayNode[];
  items?: DisplayNode[][];
  list?: string[];
}
