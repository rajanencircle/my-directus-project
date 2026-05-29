import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
  id: 'file-albums',
  name: 'File Albums',
  icon: 'collections',
  description: 'Manage album membership for the current file.',
  component: InterfaceComponent,
  hideLabel: true,
  types: ['alias'],
  localTypes: ['presentation'],
  group: 'presentation',
  options: [
    // ── Collection / field wiring ──────────────────────────────────────────
    {
      field: 'albumCollection',
      name: 'Album Collection',
      type: 'string',
      meta: {
        interface: 'input',
        options: { placeholder: 'albums' },
        note: 'Collection that stores albums.',
        width: 'half',
      },
      schema: { default_value: 'albums' },
    },
    {
      field: 'junctionCollection',
      name: 'Junction Collection',
      type: 'string',
      meta: {
        interface: 'input',
        options: { placeholder: 'albums_directus_files' },
        note: 'Junction table linking albums to files.',
        width: 'half',
      },
      schema: { default_value: 'albums_directus_files' },
    },
    {
      field: 'junctionAlbumField',
      name: 'Junction → Album Field',
      type: 'string',
      meta: {
        interface: 'input',
        options: { placeholder: 'albums_id' },
        note: 'Field in the junction table that references the album.',
        width: 'half',
      },
      schema: { default_value: 'albums_id' },
    },
    {
      field: 'junctionFileField',
      name: 'Junction → File Field',
      type: 'string',
      meta: {
        interface: 'input',
        options: { placeholder: 'directus_files_id' },
        note: 'Field in the junction table that references the file.',
        width: 'half',
      },
      schema: { default_value: 'directus_files_id' },
    },
    {
      field: 'albumNameField',
      name: 'Album Name Field',
      type: 'string',
      meta: {
        interface: 'input',
        options: { placeholder: 'name' },
        note: 'Field in the album collection used as the display name.',
        width: 'half',
      },
      schema: { default_value: 'name' },
    },
    // ── Translatable labels ────────────────────────────────────────────────
    {
      field: 'title',
      name: 'Panel Title',
      type: 'json',
      meta: {
        interface: 'system-input-translated-string',
        options: { placeholder: 'Albums' },
        note: 'Title shown at the top of the panel.',
        width: 'half',
      },
    },
    {
      field: 'emptyMessage',
      name: 'Empty State Message',
      type: 'json',
      meta: {
        interface: 'system-input-translated-string',
        options: { placeholder: 'Not in any albums yet.' },
        width: 'half',
      },
    },
    {
      field: 'searchPlaceholder',
      name: 'Search Input Placeholder',
      type: 'json',
      meta: {
        interface: 'system-input-translated-string',
        options: { placeholder: 'Search or create album…' },
        width: 'half',
      },
    },
    {
      field: 'unsavedPlaceholder',
      name: 'Unsaved File Placeholder',
      type: 'json',
      meta: {
        interface: 'system-input-translated-string',
        options: { placeholder: 'Save the file first…' },
        note: 'Shown in the input when the file has not been saved yet.',
        width: 'half',
      },
    },
    {
      field: 'createOptionLabel',
      name: 'Create Option Label',
      type: 'json',
      meta: {
        interface: 'system-input-translated-string',
        options: { placeholder: 'Create' },
        note: 'Prefix shown before the album name in the "Create …" dropdown option.',
        width: 'half',
      },
    },
    {
      field: 'unknownAlbumLabel',
      name: 'Unknown Album Label',
      type: 'json',
      meta: {
        interface: 'system-input-translated-string',
        options: { placeholder: '(Unknown album)' },
        width: 'half',
      },
    },
  ],
});
