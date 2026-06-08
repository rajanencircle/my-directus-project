import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
  id: 'occupancy-selector',
  name: 'Occupancy Selector',
  icon: 'people',
  description: 'Two-pane M2M selector with exclusive group filtering. When an item is selected, other items sharing the same group field values are disabled.',
  component: InterfaceComponent,
  relational: true,
  types: ['alias'],
  localTypes: ['m2m'],
  group: 'relational',
  options: [
    // ─── Display ──────────────────────────────────────────────────────────────
    {
      field: 'displayTemplate',
      name: 'Display Template',
      type: 'string',
      meta: {
        width: 'full',
        interface: 'input',
        note: 'Template for item labels. Use {{field_name}} placeholders. Fields from matched translations are merged in, so e.g. {{occupancy}} works alongside {{name}} and {{value}}.',
        options: { placeholder: '{{name}}' },
      },
      schema: { default_value: '{{name}}' },
    },

    // ─── Translations ─────────────────────────────────────────────────────────
    {
      field: 'translationsField',
      name: 'Translations Relation Field',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'input',
        note: 'Relation field on the item that holds translations (e.g. translations). Leave empty to disable.',
        options: { placeholder: 'e.g. translations' },
      },
      schema: { default_value: '' },
    },
    {
      field: 'translationLocaleCodePath',
      name: 'Locale Code Path',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'input',
        note: 'Dot-path within each translation row to the locale code. Path is relative to a single translation object — e.g. translations_id.code (not translations.translations_id.code). Matched against the current user language.',
        options: { placeholder: 'e.g. translations_id.code' },
      },
      schema: { default_value: 'translations_id.code' },
    },

    // ─── Exclusion Logic ──────────────────────────────────────────────────────
    {
      field: 'groupFields',
      name: 'Group Fields (Exclusion)',
      type: 'string',
      meta: {
        width: 'full',
        interface: 'input',
        note: 'Comma-separated field names that define an exclusive group. When an item is selected, all other items sharing the same values for these fields are disabled in the left pane.',
        options: { placeholder: 'e.g. name,value' },
      },
      schema: { default_value: '' },
    },

    // ─── From-Price Field ─────────────────────────────────────────────────────
    {
      field: 'fromPriceField',
      name: 'From-Price Field Name',
      type: 'string',
      meta: {
        width: 'full',
        interface: 'input',
        note: 'Field on the related item that acts as the "from price" boolean toggle. Defaults to from_price. Set to price_category_start for Tours price categories.',
        options: { placeholder: 'from_price' },
      },
      schema: { default_value: 'from_price' },
    },

    // ─── Search ───────────────────────────────────────────────────────────────
    {
      field: 'searchPlaceholder',
      name: 'Search Placeholder',
      type: 'string',
      meta: {
        width: 'full',
        interface: 'system-input-translated-string',
        options: { placeholder: 'e.g. Search…' },
      },
      schema: { default_value: '' },
    },

    // ─── Empty State Messages ─────────────────────────────────────────────────
    {
      field: 'noSelectionMessage',
      name: 'No Selection Message',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'system-input-translated-string',
        note: 'Right pane when nothing is selected.',
        options: { placeholder: 'e.g. No items selected yet' },
      },
      schema: { default_value: '' },
    },
    {
      field: 'noResultsMessage',
      name: 'No Results Message',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'system-input-translated-string',
        note: 'Left pane when the search yields no matches.',
        options: { placeholder: 'e.g. No results match your search' },
      },
      schema: { default_value: '' },
    },
    {
      field: 'allSelectedMessage',
      name: 'All Selected Message',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'system-input-translated-string',
        note: 'Left pane when every item is already selected.',
        options: { placeholder: 'e.g. All items are selected' },
      },
      schema: { default_value: '' },
    },

    // ─── Pane Labels ──────────────────────────────────────────────────────────
    {
      field: 'leftPaneLabel',
      name: 'Left Pane Label',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'system-input-translated-string',
        options: { placeholder: 'e.g. Available' },
      },
      schema: { default_value: '' },
    },
    {
      field: 'rightPaneLabel',
      name: 'Right Pane Label',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'system-input-translated-string',
        options: { placeholder: 'e.g. Selected' },
      },
      schema: { default_value: '' },
    },

    // ─── Item Tooltips ─────────────────────────────────────────────────────────
    {
      field: 'clickToSelectLabel',
      name: 'Click to Select Tooltip',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'system-input-translated-string',
        options: { placeholder: 'e.g. Click to select' },
      },
      schema: { default_value: '' },
    },
    {
      field: 'removeLabel',
      name: 'Remove Tooltip',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'system-input-translated-string',
        options: { placeholder: 'e.g. Remove' },
      },
      schema: { default_value: '' },
    },

    // ─── From Price Toggle Tooltips ────────────────────────────────────────────
    {
      field: 'fromPriceTrueLabel',
      name: 'From Price ON Tooltip',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'system-input-translated-string',
        options: { placeholder: 'e.g. From price: On' },
      },
      schema: { default_value: '' },
    },
    {
      field: 'fromPriceFalseLabel',
      name: 'From Price OFF Tooltip',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'system-input-translated-string',
        options: { placeholder: 'e.g. From price: Off' },
      },
      schema: { default_value: '' },
    },
  ],
});
