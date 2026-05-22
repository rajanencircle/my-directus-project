import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';
import {
  DEFAULT_DOWNLOAD_FORMAT_PRESETS_JSON,
} from './utils/downloadPresets';

const DEFAULT_FILE_REVERSE_LINKS = JSON.stringify(
  [
    {
      junction_collection: 'hotels_directus_files',
      file_field: 'directus_files_id',
      fields: ['*', 'hotels_id.*'],
      table_headers: ['id', 'hotel id', 'name'],
      table_paths: ['id', 'hotels_id.id', 'hotels_id.name'],
      section_title: 'Hotels using this file',
      limit: 50,
    },
  ],
  null,
  2
);

export default defineInterface({
  id: 'file-media-extras',
  name: 'File Downloads & Usage',
  icon: 'download',
  description:
    'Shows configurable multi-format download buttons and usage/assignment tables on the native directus_files detail page.',
  component: InterfaceComponent,
  hideLabel: true,
  types: ['alias'],
  localTypes: ['presentation'],
  group: 'presentation',
  options: [
    {
      field: 'download_format_presets',
      name: 'Download format presets',
      type: 'json',
      meta: {
        interface: 'input-code',
        options: { language: 'json', template: DEFAULT_DOWNLOAD_FORMAT_PRESETS_JSON },
        note:
          'JSON array of download options: { "label", "format"?, "width"?, "height"?, "fit"?, "quality"? }. Leave empty to use JPG, PNG, WebP, TIFF defaults.',
        width: 'full',
      },
      schema: { default_value: DEFAULT_DOWNLOAD_FORMAT_PRESETS_JSON },
    },
    {
      field: 'file_reverse_links',
      name: 'Usage — reverse junction lookups',
      type: 'json',
      meta: {
        interface: 'input-code',
        options: { language: 'json', template: DEFAULT_FILE_REVERSE_LINKS },
        note:
          'JSON array: query /items/{junction_collection} where {file_field} equals this file id. Use table_headers + table_paths to control columns. Use [] to disable.',
        width: 'full',
      },
      schema: { default_value: '[]' },
    },
  ],
});
