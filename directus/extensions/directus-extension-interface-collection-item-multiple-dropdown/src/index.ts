import { defineInterface } from '@directus/extensions';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'interface-collection-item-multiple-dropdown',
	name: 'Collection Item Multiple Dropdown',
	description: 'Select multiple items from a collection with drag-and-drop support',
	icon: 'arrow_right_alt',
	component: InterfaceComponent,
	types: ['json'],
	options: [
		{
			field: 'selectedCollection',
			type: 'string',
			name: '$t:collection',
			meta: {
				required: true,
				interface: 'system-collection',
				options: {
					includeSystem: true,
					includeSingleton: false,
				},
				width: 'half',
			},
		},
		{
			field: 'template',
			name: '$t:display_template',
			type: 'string',
			meta: {
				interface: 'system-display-template',
				width: 'full',
				options: {
					collectionField: 'selectedCollection',
					placeholder: '{{ field }}',
				},
			},
		},
		{
			field: 'filter',
			type: 'json',
			name: '$t:filter',
			meta: {
				interface: 'system-filter',
				options: {
					collectionField: 'selectedCollection',
					relationalFieldSelectable: false,
				},
			},
		},
	],
});
