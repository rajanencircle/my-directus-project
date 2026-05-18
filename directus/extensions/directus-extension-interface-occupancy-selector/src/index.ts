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
        note: 'Template for how each item label is rendered. Use {{field_name}} placeholders. e.g. {{name}} – {{value}} persons',
        options: { placeholder: '{{name}}' },
      },
      schema: { default_value: '{{name}}' },
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

    // ─── Search ───────────────────────────────────────────────────────────────
    {
      field: 'searchPlaceholder',
      name: 'Search Placeholder',
      type: 'string',
      meta: {
        width: 'full',
        interface: 'input',
        note: 'Plain text (e.g. Search…) or a translation key prefixed with $t: (e.g. $t:search).',
        options: { placeholder: 'Search…' },
      },
      schema: { default_value: 'Search…' },
    },

    // ─── Empty State Messages ─────────────────────────────────────────────────
    {
      field: 'noSelectionMessage',
      name: 'No Selection Message',
      type: 'string',
      meta: {
        width: 'full',
        interface: 'input',
        note: 'Shown in the right pane when nothing is selected. Plain text or $t: key.',
        options: { placeholder: 'No items selected yet' },
      },
      schema: { default_value: 'No items selected yet' },
    },

    // ─── Pane Labels ──────────────────────────────────────────────────────────
    {
      field: 'leftPaneLabel',
      name: 'Left Pane Label',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'input',
        note: 'Plain text (e.g. Available) or a translation key prefixed with $t: (e.g. $t:available).',
        options: { placeholder: 'Available' },
      },
      schema: { default_value: 'Available' },
    },
    {
      field: 'rightPaneLabel',
      name: 'Right Pane Label',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'input',
        note: 'Plain text (e.g. Selected) or a translation key prefixed with $t: (e.g. $t:selected).',
        options: { placeholder: 'Selected' },
      },
      schema: { default_value: 'Selected' },
    },
  ],
});
