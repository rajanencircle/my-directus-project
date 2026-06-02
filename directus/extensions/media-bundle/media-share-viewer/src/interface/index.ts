import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './MediaShareButton.vue';

export default defineInterface({
  id: 'media-share-button',
  name: 'Media Share Button',
  icon: 'share',
  description: 'Lists and manages password-protected, expiring share links for the current file.',
  component: InterfaceComponent,
  types: ['alias'],
  localTypes: ['presentation'],
  group: 'presentation',
  options: [
    {
      field: 'targetCollection',
      name: 'Share Collection',
      type: 'string',
      meta: {
        interface: 'input',
        note: 'Collection where share records are stored',
      },
      schema: { default_value: 'media_share_link' },
    },
    {
      field: 'fileField',
      name: 'File Field',
      type: 'string',
      meta: {
        interface: 'input',
        note: 'Field in the share collection that references the file',
      },
      schema: { default_value: 'file' },
    },
    {
      field: 'passwordField',
      name: 'Password Field',
      type: 'string',
      meta: {
        interface: 'input',
        note: 'Field that stores the share password',
      },
      schema: { default_value: 'password' },
    },
    {
      field: 'expiryField',
      name: 'Expiry Field',
      type: 'string',
      meta: {
        interface: 'input',
        note: 'Field that stores the expiry datetime',
      },
      schema: { default_value: 'expired_date' },
    },
    {
      field: 'linkField',
      name: 'Link Field',
      type: 'string',
      meta: {
        interface: 'input',
        note: 'Field that stores the generated share URL',
      },
      schema: { default_value: 'link' },
    },
    {
      field: 'shareBasePath',
      name: 'Share Base Path',
      type: 'string',
      meta: {
        interface: 'input',
        note: 'Base path of the public share viewer endpoint (e.g. /media-share-validate/view/)',
      },
      schema: { default_value: '/media-share-validate/view/' },
    },
    {
      field: 'defaultStatus',
      name: 'Default Status',
      type: 'string',
      meta: {
        interface: 'select-dropdown',
        options: {
          choices: [
            { text: 'Published', value: 'published' },
            { text: 'Draft', value: 'draft' },
          ],
        },
        note: 'Status applied to newly created share records',
      },
      schema: { default_value: 'published' },
    },
  ],
});
