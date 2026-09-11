import { defineComponent, h, Teleport, onMounted, onUnmounted, watch, type App } from 'vue';
import './shareDirectusTheme.css';

const VIcon = defineComponent({
	name: 'VIcon',
	props: {
		name: { type: String, default: '' },
		small: Boolean,
		left: Boolean,
		clickable: Boolean,
	},
	emits: ['click'],
	setup(props, { emit }) {
		return () =>
			h(
				'span',
				{
					class: [
						'v-icon',
						'material-symbols-outlined',
						props.small && 'small',
						props.left && 'left',
						props.clickable && 'clickable',
					],
					onClick: (e: Event) => emit('click', e),
				},
				props.name,
			);
	},
});

const VDialog = defineComponent({
	name: 'VDialog',
	props: {
		modelValue: Boolean,
		persistent: Boolean,
	},
	emits: ['update:modelValue', 'esc'],
	setup(props, { emit, slots }) {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') emit('esc');
		};

		const setBodyLocked = (locked: boolean) => {
			document.body.classList.toggle('share-dl-modal-open', locked);
		};

		onMounted(() => {
			window.addEventListener('keydown', onKey);
			if (props.modelValue) setBodyLocked(true);
		});

		onUnmounted(() => {
			window.removeEventListener('keydown', onKey);
			setBodyLocked(false);
		});

		watch(
			() => props.modelValue,
			(open) => setBodyLocked(open),
		);

		return () => {
			if (!props.modelValue) return null;
			return h(
				Teleport,
				{ to: 'body' },
				h(
					'div',
					{
						class: 'share-dl-overlay',
						onClick: (e: MouseEvent) => {
							if (e.target === e.currentTarget && !props.persistent) {
								emit('update:modelValue', false);
							}
						},
					},
					h('div', { class: 'share-dl-theme share-dl-dialog-shell' }, slots.default?.()),
				),
			);
		};
	},
});

const VCard = defineComponent({
	name: 'VCard',
	setup(_, { slots }) {
		return () => h('div', { class: 'v-card' }, slots.default?.());
	},
});

const VCardTitle = defineComponent({
	name: 'VCardTitle',
	setup(_, { slots }) {
		return () => h('div', { class: 'v-card-title' }, slots.default?.());
	},
});

const VCardText = defineComponent({
	name: 'VCardText',
	setup(_, { slots }) {
		return () => h('div', { class: 'v-card-text' }, slots.default?.());
	},
});

const VCardActions = defineComponent({
	name: 'VCardActions',
	setup(_, { slots }) {
		return () => h('div', { class: 'v-card-actions' }, slots.default?.());
	},
});

const VButton = defineComponent({
	name: 'VButton',
	props: { secondary: Boolean, loading: Boolean, disabled: Boolean },
	emits: ['click'],
	setup(props, { emit, slots }) {
		return () =>
			h(
				'button',
				{
					type: 'button',
					class: ['v-button', props.secondary && 'secondary', props.loading && 'loading'],
					disabled: props.disabled || props.loading,
					onClick: (e: Event) => emit('click', e),
				},
				[
					props.loading ? h('span', { class: 'v-button-loading', 'aria-hidden': 'true' }) : null,
					...(slots.default?.() ?? []),
				],
			);
	},
});

const VInput = defineComponent({
	name: 'VInput',
	props: {
		modelValue: [String, Number],
		type: { type: String, default: 'text' },
		placeholder: String,
		disabled: Boolean,
		readonly: Boolean,
	},
	emits: ['update:modelValue'],
	setup(props, { emit }) {
		return () =>
			h('input', {
				class: 'v-input',
				type: props.type,
				value: props.modelValue,
				placeholder: props.placeholder,
				disabled: props.disabled,
				readonly: props.readonly,
				onInput: (e: Event) =>
					emit('update:modelValue', (e.target as HTMLInputElement).value),
			});
	},
});

const VSelect = defineComponent({
	name: 'VSelect',
	props: {
		modelValue: [String, Number],
		items: { type: Array, default: () => [] },
		itemText: { type: String, default: 'text' },
		itemValue: { type: String, default: 'value' },
		disabled: Boolean,
	},
	emits: ['update:modelValue'],
	setup(props, { emit }) {
		return () =>
			h(
				'select',
				{
					class: 'v-select',
					value: props.modelValue,
					disabled: props.disabled,
					onChange: (e: Event) =>
						emit('update:modelValue', (e.target as HTMLSelectElement).value),
				},
				(props.items as Record<string, string>[]).map((item, i) =>
					h('option', { key: i, value: item[props.itemValue] }, item[props.itemText]),
				),
			);
	},
});

const VNotice = defineComponent({
	name: 'VNotice',
	props: { type: { type: String, default: 'info' } },
	setup(props, { slots }) {
		return () => h('div', { class: ['v-notice', props.type] }, slots.default?.());
	},
});

const SHIM_COMPONENTS = [
	['VIcon', VIcon],
	['VDialog', VDialog],
	['VCard', VCard],
	['VCardTitle', VCardTitle],
	['VCardText', VCardText],
	['VCardActions', VCardActions],
	['VButton', VButton],
	['VInput', VInput],
	['VSelect', VSelect],
	['VNotice', VNotice],
] as const;

export function registerDirectusShims(app: App) {
	for (const [name, component] of SHIM_COMPONENTS) {
		app.component(name, component);
	}

	const kebabAliases: Record<string, string> = {
		VIcon: 'v-icon',
		VDialog: 'v-dialog',
		VCard: 'v-card',
		VCardTitle: 'v-card-title',
		VCardText: 'v-card-text',
		VCardActions: 'v-card-actions',
		VButton: 'v-button',
		VInput: 'v-input',
		VSelect: 'v-select',
		VNotice: 'v-notice',
	};

	for (const [name, component] of SHIM_COMPONENTS) {
		const kebab = kebabAliases[name];
		if (kebab) app.component(kebab, component);
	}
}
