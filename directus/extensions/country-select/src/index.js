import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'country-drawer-select',
	name: 'Country Drawer Select (Custom)',
	icon: 'flag',
	description: 'Custom drawer selector that stores related item id',
	component: InterfaceComponent,
	types: ['integer', 'uuid'],
	options: [
		{
			field: 'itemsCollection',
			name: 'Items Collection (to load in drawer)',
			type: 'string',
			meta: {
				interface: 'input',
				width: 'half',
				options: { placeholder: 'country_translations' },
				note: 'Collection to fetch options from (e.g. country_translations). Do not use "collection" — it is reserved for the current form collection.',
			},
			schema: { default_value: 'country_translations' },
		},
		{
			field: 'labelField',
			name: 'Label Field',
			type: 'string',
			meta: {
				interface: 'input',
				width: 'half',
				options: { placeholder: 'name' },
			},
			schema: { default_value: 'name' },
		},
		{
			field: 'pageSize',
			name: 'Page Size',
			type: 'integer',
			meta: {
				interface: 'input',
				width: 'half',
			},
			schema: { default_value: 25 },
		},
		{
			field: 'translationsCollection',
			name: 'Translations collection (has code)',
			type: 'string',
			meta: {
				interface: 'input',
				width: 'half',
				options: { placeholder: 'translations' },
				note: 'Collection that holds language codes (e.g. translations with code = de_DE, de_AT).',
			},
			schema: { default_value: 'translations' },
		},
		{
			field: 'translationCodeField',
			name: 'Translation code field (in above)',
			type: 'string',
			meta: {
				interface: 'input',
				width: 'half',
				options: { placeholder: 'code' },
				note: 'Field in the translations collection that holds the locale (e.g. code = de_DE, de_AT).',
			},
			schema: { default_value: 'code' },
		},
		{
			field: 'translationIdField',
			name: 'Translation ID field (on items)',
			type: 'string',
			meta: {
				interface: 'input',
				width: 'half',
				options: { placeholder: 'translations_id' },
				note: 'FK on country_translations (or items collection) that points to the translations collection.',
			},
			schema: { default_value: 'translations_id' },
		},
		{
			field: 'parentTranslationIdField',
			name: 'Parent translation ID field (context)',
			type: 'string',
			meta: {
				interface: 'input',
				width: 'half',
				options: { placeholder: 'translations_id' },
				note: 'When inside a translation block (e.g. hotel_translations), the parent row has a field with the current translation id. Same name as above if your schema uses it.',
			},
			schema: { default_value: 'translations_id' },
		},
		{
			field: 'languageCodeOverride',
			name: 'Language code (override)',
			type: 'string',
			meta: {
				interface: 'input',
				width: 'half',
				options: { placeholder: 'e.g. de_DE' },
				note: 'If your field key includes the language (e.g. country_de_DE), the filter uses it automatically. Otherwise set this per field (e.g. de_DE for one, de_AT for another).',
			},
			schema: { default_value: null },
		},
		{
			field: 'translationIdOverride',
			name: 'Translation ID (override)',
			type: 'integer',
			meta: {
				interface: 'input',
				width: 'half',
				options: { placeholder: 'e.g. 1' },
				note: 'Set the translation id directly (from your translations table). Use this when you have two fields: one with id 1 (e.g. de_DE), one with id 2 (e.g. de_AT). No API lookup needed.',
			},
			schema: { default_value: null },
		},
		{
			field: 'visibleLanguages',
			name: 'Visible languages',
			type: 'string',
			meta: {
				interface: 'input',
				width: 'full',
				options: {
					placeholder: 'de_DE or de_AT (comma separated)',
				},
				note: 'Only show this field for these language codes.',
			},
			schema: { default_value: '' },
		}

	],
});
