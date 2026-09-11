import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

/**
 * One unified usage table:
 *  - usage_columns → multilingual headers + type (static | path | link)
 *  - usage_sources → product junctions + static product label + per-column paths
 */
export default defineInterface({
  id: 'file-media-extras',
  name: 'File Usage',
  icon: 'link',
  description:
    'Shows one usage table of all products linked to this file (configurable columns + sources).',
  component: InterfaceComponent,
  hideLabel: true,
  types: ['alias'],
  localTypes: ['presentation'],
  group: 'presentation',
  options: [
    {
      field: 'usage_table_title',
      name: 'Table title',
      type: 'json',
      meta: {
        interface: 'system-input-translated-string',
        width: 'full',
        options: { placeholder: 'Products using this file' },
        note: 'Optional heading above the table. Follows the user language like native Directus labels.',
      },
    },
    {
      field: 'usage_columns',
      name: 'Table columns',
      type: 'json',
      meta: {
        interface: 'list',
        width: 'full',
        note:
          'Define columns once for the whole table. Header is multilingual. Type: static = product label from each source; path = data path; link = Open admin link.',
        options: {
          template: '{{ key }} — {{ type }}',
          addLabel: 'Add column',
          fields: [
            {
              field: 'key',
              name: 'Column key',
              type: 'string',
              meta: {
                interface: 'input',
                width: 'half',
                required: true,
                options: { placeholder: 'products' },
                note: 'Stable id used in product source field paths (e.g. products, id, name, link).',
              },
            },
            {
              field: 'type',
              name: 'Value type',
              type: 'string',
              meta: {
                interface: 'select-dropdown',
                width: 'half',
                required: true,
                options: {
                  choices: [
                    { text: 'Static (product label)', value: 'static' },
                    { text: 'Data path', value: 'path' },
                    { text: 'Link (admin Open)', value: 'link' },
                  ],
                },
              },
              schema: { default_value: 'path' },
            },
            {
              field: 'header',
              name: 'Column header',
              type: 'json',
              meta: {
                interface: 'system-input-translated-string',
                width: 'full',
                required: true,
                options: { placeholder: 'Products' },
                note: 'Shown in the table header; changes with the user system language.',
              },
            },
          ],
        },
      },
      schema: { default_value: [] },
    },
    {
      field: 'usage_sources',
      name: 'Product sources',
      type: 'json',
      meta: {
        interface: 'list',
        width: 'full',
        note:
          'Add one source per product collection. Rows from all sources are merged into the single table. Set Product label (static) + data paths for path/link columns.',
        options: {
          template: '{{ product_label || junction_collection }}',
          addLabel: 'Add product source',
          fields: [
            {
              field: 'product_label',
              name: 'Product label (static)',
              type: 'json',
              meta: {
                interface: 'system-input-translated-string',
                width: 'full',
                options: { placeholder: 'Hotels' },
                note:
                  'Used for columns with type “Static”. e.g. Hotels / Tours — not read from the product record.',
              },
            },
            {
              field: 'junction_collection',
              name: 'Junction collection',
              type: 'string',
              meta: {
                interface: 'input',
                width: 'half',
                required: true,
                options: { placeholder: 'hotels_directus_files' },
              },
            },
            {
              field: 'file_field',
              name: 'File field',
              type: 'string',
              meta: {
                interface: 'input',
                width: 'half',
                required: true,
                options: { placeholder: 'directus_files_id' },
              },
            },
            {
              field: 'fields',
              name: 'Fields to fetch',
              type: 'string',
              meta: {
                interface: 'input',
                width: 'full',
                options: { placeholder: '*,hotels_id.*' },
                note: 'Comma-separated fields for the junction query. All matching rows are fetched (no limit).',
              },
            },
            {
              field: 'link_collection',
              name: 'Link collection (optional)',
              type: 'string',
              meta: {
                interface: 'input',
                width: 'full',
                options: { placeholder: 'hotels' },
                note:
                  'Admin collection for Link columns. If empty, derived from path (hotels_id.id → hotels).',
              },
            },
            {
              field: 'field_paths',
              name: 'Column data paths',
              type: 'json',
              meta: {
                interface: 'list',
                width: 'full',
                note:
                  'Map each path/link column key to a junction row path. Skip static columns.',
                options: {
                  template: '{{ column_key }} → {{ path }}',
                  addLabel: 'Add field path',
                  fields: [
                    {
                      field: 'column_key',
                      name: 'Column key',
                      type: 'string',
                      meta: {
                        interface: 'input',
                        width: 'half',
                        required: true,
                        options: { placeholder: 'id' },
                        note: 'Must match a column key (e.g. id, name, link).',
                      },
                    },
                    {
                      field: 'path',
                      name: 'Data path',
                      type: 'string',
                      meta: {
                        interface: 'input',
                        width: 'half',
                        required: true,
                        options: { placeholder: 'hotels_id.id' },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
      schema: { default_value: [] },
    },
  ],
});
