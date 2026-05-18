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
		];
	},
});
