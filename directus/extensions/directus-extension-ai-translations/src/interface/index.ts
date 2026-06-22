import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './translations.vue';
import { useStores } from '@directus/extensions-sdk';

export default defineInterface({
  id: 'ai-translations',
  name: 'AI Translations',
  icon: 'g_translate',
  description: 'Side-by-side translations interface with AI auto-translate',
  component: InterfaceComponent,
  types: ['alias'],
  localTypes: ['translations'],
  group: 'relational',
  relational: true,
  recommendedDisplays: ['translations'],
	options: ({ relations }) => {
			const { useCollectionsStore, useFieldsStore } = useStores();
			const collectionsStore = useCollectionsStore();
			const fieldsStore = useFieldsStore();

			const languagesCollection = relations.m2o?.related_collection;
			const collectionChoices = (collectionsStore.collections ?? [])
				.filter((collection: any) => !collection.collection?.startsWith('directus_'))
				.map((collection: any) => ({
					text: collection.meta?.note ?? collection.name ?? collection.collection,
					value: collection.collection,
				}));

			let choices: { text: string; value: string }[] = [];

			if (languagesCollection) {
				choices = (fieldsStore.getFieldsForCollection(languagesCollection) ?? []).map((field: any) => ({
					text: field.name,
					value: field.field,
				}));
			}

			return [
				{
					field: 'languagesCollection',
					type: 'string',
					name: 'Languages Collection',
					schema: {
						default_value: languagesCollection ?? null,
					},
					meta: {
						interface: 'select-dropdown',
						options: {
							choices: collectionChoices,
							placeholder: 'Select the languages collection',
						},
						width: 'full',
					},
				},
				{
					field: 'languageIndicatorField',
					type: 'string',
					name: 'Language Indicator Field',
					schema: {
						default_value: choices.some((choice) => choice.value === 'code') ? 'code' : null,
					},
					meta: {
						interface: 'select-dropdown',
						options: {
							placeholder: '$t:primary_key',
							choices,
					},
				},
			},
			{
				field: 'languageDirectionField',
				type: 'string',
				name: 'Language Direction Field',
				schema: {
					data_type: 'string',
					default_value: choices.some((choice) => choice.value === 'direction') ? 'direction' : null,
				},
				meta: {
					interface: 'select-dropdown',
					options: {
						choices,
					},
				},
			},
				{
					field: 'userLanguage',
					name: 'Use Current User Language',
					type: 'boolean',
					schema: {
						default_value: false,
					},
					meta: {
						interface: 'boolean',
					options: {
						label: '$t:interfaces.translations.enable',
					},
					width: 'half',
				},
			},
				{
					field: 'defaultLanguage',
					name: 'Default Language',
					type: 'string',
					meta: {
						interface: 'select-dropdown',
						width: 'half',
						options: {
							choices,
							placeholder: '$t:primary_key',
						},
					},
				},
			{
				field: 'defaultOpenSplitView',
				name: 'Default Split View State',
				type: 'boolean',
				schema: {
					default_value: false,
				},
				meta: {
					interface: 'toggle',
					options: {
						label: '$t:start_open',
					},
					width: 'half',
				},
			},
			// ── AI API Configuration ─────────────────────────────────────────
			{
				field: 'ai_config_divider',
				type: 'alias',
				name: 'AI API Configuration',
				meta: {
					interface: 'presentation-divider',
					special: ['no-data'],
					width: 'full',
					options: {
						title: 'AI API Configuration',
						color: '#7c3aed',
					},
				},
			},
			{
				field: 'configCollection',
				name: 'Config Collection',
				type: 'string',
				schema: { default_value: 'global_configurations' },
				meta: {
					interface: 'input',
					width: 'half',
					note: 'Collection that stores API config key/value rows',
					options: { placeholder: 'global_configurations' },
				},
			},
			{
				field: 'configEntityType',
				name: 'Entity Type',
				type: 'string',
				schema: { default_value: 'ai-api' },
				meta: {
					interface: 'input',
					width: 'half',
					note: 'entity_type value to filter config rows by',
					options: { placeholder: 'ai-api' },
				},
			},
			{
				field: 'configUrlKey',
				name: 'URL Key',
				type: 'string',
				schema: { default_value: 'url' },
				meta: {
					interface: 'input',
					width: 'half',
					note: 'Key name whose value is the API URL',
					options: { placeholder: 'url' },
				},
			},
			{
				field: 'configTokenKey',
				name: 'Token Key',
				type: 'string',
				schema: { default_value: 'token' },
				meta: {
					interface: 'input',
					width: 'half',
					note: 'Key name whose value is the API token / bearer key',
					options: { placeholder: 'token' },
				},
			},
			{
				field: 'configModelKey',
				name: 'Model Key',
				type: 'string',
				schema: { default_value: 'model' },
				meta: {
					interface: 'input',
					width: 'half',
					note: 'Key name whose value is the model identifier',
					options: { placeholder: 'model' },
				},
			},
		];
	},
});
