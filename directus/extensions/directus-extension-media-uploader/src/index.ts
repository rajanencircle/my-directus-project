import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';
import { DEFAULT_DOWNLOAD_FORMAT_PRESETS_JSON } from './utils/downloadPresets';

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
    {
      junction_collection: 'hotels_directus_files',
      file_field: 'cruises_files_id',
      fields: ['*', 'cruises_id.*'],
      table_headers: ['id', 'cruise id', 'name'],
      table_paths: ['id', 'cruises_id.id', 'cruises_id.name'],
      section_title: 'Cruises using this file',
      limit: 50,
    },
  ],
  null,
  2
);

const DEFAULT_UPLOAD_EXTRA_FIELDS = JSON.stringify(
  [
    {
      type: 'checkbox-group',
      field: 'flags',
      label: 'Flags',
      options: [{ label: 'Map', value: 'map flag' }, 'Export', 'Tour32'],
      storeAs: 'string-array',
    },
  ],
  null,
  2
);

const DEFAULT_GEO_LEVELS = JSON.stringify(
  [
    { field: 'place', collection: 'places', label: 'Place (City)', icon: 'location_city' },
    { field: 'state', collection: 'states', label: 'State', icon: 'map' },
    { field: 'region', collection: 'regions_geo', label: 'Region', icon: 'terrain' },
    { field: 'country', collection: 'countries_geo', label: 'Country', icon: 'flag' },
    { field: 'destination', collection: 'destinations', label: 'Destination', icon: 'explore' },
    { field: 'destination_cluster', collection: 'destinations_cluster', label: 'Destination Cluster', icon: 'public' },
  ],
  null,
  2
);

const DEFAULT_GEO_CASCADES = JSON.stringify(
  {
    place: [
      { fk: 'state_id', to: 'state' },
      { fk: 'region_id', to: 'region' },
      { fk: 'country_id', to: 'country' },
    ],
    state: [{ fk: 'country_id', to: 'country' }],
    region: [{ fk: 'country_id', to: 'country' }],
    country: [{ fk: 'destination_id', to: 'destination' }],
    destination: [{ fk: 'destinations_cluster_id', to: 'destination_cluster' }],
  },
  null,
  2
);

const DEFAULT_GEO_FILTER_MAPPINGS = JSON.stringify(
  {
    place: [
      { fk: 'country_id', from: 'country' },
      { fk: 'state_id', from: 'state' },
      { fk: 'region_id', from: 'region' },
    ],
    state: [{ fk: 'country_id', from: 'country' }],
    region: [{ fk: 'country_id', from: 'country' }],
    destination: [{ fk: 'countries_geo_id', from: 'country' }],
    destination_cluster: [{ fk: 'destinations_cluster_id', from: 'destination' }],
  },
  null,
  2
);

export default defineInterface({
  id: 'media-uploader',
  name: 'Media Uploader',
  icon: 'image',
  description: 'M2M file manager — upload, preview, delete and download files attached to any collection item.',
  component: InterfaceComponent,
  relational: true,
  types: ['alias'],
  localTypes: ['m2m', 'files'],
  group: 'relational',
  options: [
    {
      field: 'allowed_types',
      name: 'Allowed Types',
      type: 'csv',
      meta: {
        width: 'full',
        interface: 'input',
        note: 'Accepted MIME types (comma-separated). Use */* for all. E.g. image/*,application/pdf',
        options: { placeholder: '*/*' },
      },
      schema: { default_value: '*/*' },
    },
    {
      field: 'max_file_size',
      name: 'Max File Size (bytes)',
      type: 'integer',
      meta: {
        width: 'half',
        interface: 'input',
        note: 'Maximum file size in bytes. Leave empty for no limit.',
        options: { placeholder: 'No limit' },
      },
      schema: { default_value: null },
    },
    {
      field: 'thumbnail_size',
      name: 'Thumbnail Size (px)',
      type: 'integer',
      meta: {
        width: 'half',
        interface: 'input',
        note: 'Width and height of each thumbnail in pixels.',
        options: { placeholder: '250' },
      },
      schema: { default_value: 250 },
    },
    {
      field: 'readonly',
      name: 'Read Only',
      type: 'boolean',
      meta: {
        width: 'half',
        interface: 'boolean',
        note: 'Disables upload, delete, and download.',
        options: { label: 'Read Only' },
      },
      schema: { default_value: false },
    },
    {
      field: 'delete_files',
      name: 'Permanently Delete Files',
      type: 'boolean',
      meta: {
        width: 'half',
        interface: 'boolean',
        note: 'If enabled, permanently deletes the file from directus_files. Otherwise only removes the junction row.',
        options: { label: 'Permanently Delete Files' },
      },
      schema: { default_value: false },
    },
    {
      field: 'upload_area_folder',
      name: 'Upload Area Folder ID',
      type: 'string',
      meta: {
        width: 'full',
        interface: 'input',
        note:
          'Folder ID used when the upload modal archive mode is "Upload Area". In that mode, files are uploaded directly into this configured interim folder instead of the normal folder picker selection.',
        options: { placeholder: 'Directus folder ID for interim uploads' },
      },
      schema: { default_value: null },
    },
    {
      field: 'upload_extra_fields',
      name: 'Upload Modal Extra Fields',
      type: 'json',
      meta: {
        interface: 'input-code',
        options: { language: 'json', template: DEFAULT_UPLOAD_EXTRA_FIELDS },
        note:
          'JSON array of extra inputs on the Upload Files modal. Use type "checkbox-group" with field (directus_files column name), label, and options. Each option may be a string or { "label": "Map", "value": "map flag" }; stored values are sent as JSON.stringify(string[]) before the file binary. Add the same field on directus_files (e.g. flags as JSON). Clear to [] to hide.',
        width: 'full',
      },
      schema: { default_value: DEFAULT_UPLOAD_EXTRA_FIELDS },
    },
    {
      field: 'file_reverse_links',
      name: 'File details — reverse junction lookups',
      type: 'json',
      meta: {
        interface: 'input-code',
        options: { language: 'json', template: DEFAULT_FILE_REVERSE_LINKS },
        note:
          'JSON array: for each entry, query /items/{junction_collection} where {file_field} equals the opened file id. Use fields as array or string (e.g. id,hotels_id.id,hotels_id.name). Optional: table_headers + table_paths arrays (same length) to render a custom table in File Details. Use [] to disable.',
        width: 'full',
      },
      schema: { default_value: '[]' },
    },
    {
      field: 'download_format_presets',
      name: 'Download format presets',
      type: 'json',
      meta: {
        interface: 'input-code',
        options: { language: 'json', template: DEFAULT_DOWNLOAD_FORMAT_PRESETS_JSON },
        note:
          'JSON array of download options: { "label", "format"?, "width"?, "height"?, "fit"?, "quality"? }. Used in thumbnail menus, download-all, and file details. Leave empty to use JPG, PNG, WebP, TIFF (same as before).',
        width: 'full',
      },
      schema: { default_value: DEFAULT_DOWNLOAD_FORMAT_PRESETS_JSON },
    },
    {
      field: 'geo_enabled',
      name: 'Enable Geography',
      type: 'boolean',
      meta: {
        width: 'half',
        interface: 'boolean',
        note:
          'Enable geography fields in the Upload modal. Selected IDs are written directly onto directus_files relation fields such as place, state, region, country, destination, and destination_cluster.',
        options: { label: 'Enable Geography fields in Upload modal' },
      },
      schema: { default_value: true },
    },
    {
      field: 'geo_levels',
      name: 'Geography Levels Configuration',
      type: 'json',
      meta: {
        interface: 'input-code',
        options: { language: 'json', template: DEFAULT_GEO_LEVELS },
        note:
          'JSON array of levels: {field, collection, label, icon?}. The `field` must match the directus_files relation field that should receive the selected ID.',
        width: 'full',
      },
      schema: { default_value: DEFAULT_GEO_LEVELS },
    },
    {
      field: 'geo_cascades',
      name: 'Geography Cascade Mappings',
      type: 'json',
      meta: {
        interface: 'input-code',
        options: { language: 'json', template: DEFAULT_GEO_CASCADES },
        note:
          'JSON object: cascade mapping. Key = source field name, value = array of {fk, to}, where `fk` is read from the selected source record and `to` is the target directus_files field key.',
        width: 'full',
      },
      schema: { default_value: DEFAULT_GEO_CASCADES },
    },
    {
      field: 'geo_filter_mappings',
      name: 'Geography Filter Mappings',
      type: 'json',
      meta: {
        interface: 'input-code',
        options: { language: 'json', template: DEFAULT_GEO_FILTER_MAPPINGS },
        note:
          'JSON object: upstream search filters. Key = field name, value = array of {fk, from}, where `fk` is the foreign key on the target collection and `from` is the selected upstream field.',
        width: 'full',
      },
      schema: { default_value: DEFAULT_GEO_FILTER_MAPPINGS },
    },
    {
      field: 'upload_status_field',
      name: 'Upload Status Field',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'input',
        note: 'Field name on directus_files to set on upload (e.g. directus_status). Leave empty to skip.',
        options: { placeholder: 'directus_status' },
      },
      schema: { default_value: 'directus_status' },
    },
    {
      field: 'upload_status_value',
      name: 'Upload Status Value',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'input',
        note: 'Value written to the upload status field on each uploaded file. Default: draft.',
        options: { placeholder: 'draft' },
      },
      schema: { default_value: 'draft' },
    },
    {
      field: 'geo_language_code',
      name: 'Geography Language Code',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'input',
        options: { placeholder: 'en-GB' },
      },
      schema: { default_value: 'en-GB' },
    },
    {
      field: 'geo_label_field',
      name: 'Geography Label Field Path',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'input',
        note: 'Dot-path for label, e.g. translations.name or name',
        options: { placeholder: 'translations.name' },
      },
      schema: { default_value: 'translations.name' },
    },
  ],
});
