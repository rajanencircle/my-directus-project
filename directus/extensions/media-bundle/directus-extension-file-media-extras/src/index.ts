import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

const COLUMNS_TEMPLATE = JSON.stringify(
  [
    { header: 'ID', path: 'id' },
    { header: 'Name', path: 'related_id.name' },
  ],
  null,
  2,
);

export default defineInterface({
  id: 'file-media-extras',
  name: 'File Usage',
  icon: 'link',
  description:
    'Shows usage/assignment tables on the native directus_files detail page.',
  component: InterfaceComponent,
  hideLabel: true,
  types: ['alias'],
  localTypes: ['presentation'],
  group: 'presentation',
  options: [
    // ── Reverse junction lookups ──────────────────────────────────────────
    {
      field: 'file_reverse_links',
      name: 'Usage — reverse junction lookups',
      type: 'json',
      meta: {
        interface: 'list',
        note: 'Each entry shows a table of records in a junction collection that reference this file.',
        width: 'full',
        options: {
          template: '{{ section_title || junction_collection }}',
          addLabel: 'Add usage section',
          fields: [
            {
              field: 'junction_collection',
              name: 'Junction collection',
              type: 'string',
              meta: {
                interface: 'input',
                width: 'half',
                required: true,
                options: { placeholder: 'hotels_directus_files' },
                note: 'The collection that links files to your content.',
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
                note: 'The field in that collection that holds the file ID.',
              },
            },
            {
              field: 'section_title',
              name: 'Section title',
              type: 'string',
              meta: {
                interface: 'input',
                width: 'full',
                options: { placeholder: 'Hotels using this file' },
                note: 'Plain text or JSON translation object: {"en-US":"Hotels using this file","fr-FR":"Hôtels utilisant ce fichier"}',
              },
            },
            {
              field: 'fields',
              name: 'Fields to fetch',
              type: 'string',
              meta: {
                interface: 'input',
                width: 'half',
                options: { placeholder: '*,hotels_id.*' },
                note: 'Comma-separated field paths. Include nested relations you want to display.',
              },
            },
            {
              field: 'limit',
              name: 'Row limit',
              type: 'integer',
              meta: {
                interface: 'input',
                width: 'half',
                options: { min: 1, max: 500, placeholder: '50' },
              },
            },
            {
              field: 'columns',
              name: 'Table columns',
              type: 'json',
              meta: {
                interface: 'input-code',
                width: 'full',
                options: {
                  language: 'json',
                  template: COLUMNS_TEMPLATE,
                },
                note:
                  'JSON array of { "header": "Label", "path": "field.path" }. ' +
                  'header supports translation objects: { "header": {"en-US":"Hotel","fr-FR":"Hôtel"}, "path": "hotels_id.name" }',
              },
            },
          ],
        },
      },
      schema: { default_value: [] },
    },
  ],
});
