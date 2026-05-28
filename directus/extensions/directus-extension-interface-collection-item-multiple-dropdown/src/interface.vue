<script setup lang="ts">
import { computed, ref, toRefs, unref, watch } from 'vue';
import { useApi, useStores, getFieldsFromTemplate } from '@directus/extensions-sdk';
import Draggable from 'vuedraggable';
import { useI18n } from 'vue-i18n';

type PrimaryKey = string | number;

type ValueItem = {
	key: PrimaryKey;
	collection: string;
};

function getEndpoint(collection: string): string {
	if (collection.startsWith('directus_')) {
		return `/${collection.slice('directus_'.length)}`;
	}
	return `/items/${collection}`;
}

const props = withDefaults(
	defineProps<{
		value?: ValueItem[] | null;
		selectedCollection: string;
		template?: string | null;
		disabled?: boolean;
		nonEditable?: boolean;
		filter?: Record<string, any> | null;
	}>(),
	{
		value: () => [],
		template: null,
		filter: null,
	},
);

const emit = defineEmits(['input']);
const { t } = useI18n();

const api = useApi();
const { useCollectionsStore, useFieldsStore } = useStores();
const collectionsStore = useCollectionsStore();
const fieldStore = useFieldsStore();

const { selectedCollection, template } = toRefs(props);

const loading = ref(false);
const selectDrawerOpen = ref(false);
const displayItems = ref<Record<string, any>[]>([]);

// Drawer state
const drawerItems = ref<Record<string, any>[]>([]);
const drawerLoading = ref(false);
const drawerSearch = ref('');
const drawerSelection = ref<PrimaryKey[]>([]);

const values = computed({
	get: () => props.value ?? [],
	set: (newValues) => {
		if (Array.isArray(newValues) && newValues.length > 0) {
			emit('input', newValues);
		} else {
			emit('input', null);
		}
	},
});

const selectedKeys = computed(() => values.value.map((item) => item.key));

const primaryKey = computed(
	() => fieldStore.getPrimaryKeyFieldForCollection(unref(selectedCollection))?.field ?? '',
);

const displayTemplate = computed(() => {
	if (unref(template)) return unref(template);
	const collectionTemplate = collectionsStore.getCollection(unref(selectedCollection))?.meta?.display_template;
	return collectionTemplate || `{{ ${primaryKey.value || ''} }}`;
});

const requiredFields = computed(() => {
	if (!displayTemplate.value || !unref(selectedCollection)) return [];
	return getFieldsFromTemplate(displayTemplate.value);
});

watch(
	values,
	(newValues, oldValues) => {
		if (!oldValues || selectionHasChanged(newValues, oldValues)) {
			getDisplayItems();
		}
	},
	{ immediate: true },
);

function selectionHasChanged(newValues: ValueItem[], oldValues: ValueItem[]) {
	if (newValues.length !== oldValues.length) return true;
	const newKeys = new Set(newValues.map((v) => `${v.collection}_${v.key}`));
	const oldKeys = new Set(oldValues.map((v) => `${v.collection}_${v.key}`));
	return ![...newKeys].every((key) => oldKeys.has(key));
}

async function getDisplayItems() {
	if (!values.value || values.value.length === 0) {
		displayItems.value = [];
		return;
	}

	if (!unref(selectedCollection) || !primaryKey.value) return;

	const fields = new Set(requiredFields.value);
	fields.add(primaryKey.value);

	try {
		loading.value = true;

		const response = await api.get(getEndpoint(unref(selectedCollection)), {
			params: {
				fields: Array.from(fields),
				filter: { [primaryKey.value]: { _in: selectedKeys.value } },
			},
		});

		const fetchedItems = response.data.data ?? [];

		displayItems.value = selectedKeys.value
			.map((key) => fetchedItems.find((item: any) => item[primaryKey.value] === key))
			.filter(Boolean);
	} catch (error) {
		console.error(error);
	} finally {
		loading.value = false;
	}
}

async function openDrawer() {
	drawerSearch.value = '';
	drawerSelection.value = [...selectedKeys.value];
	selectDrawerOpen.value = true;
	await loadDrawerItems();
}

async function loadDrawerItems() {
	if (!unref(selectedCollection) || !primaryKey.value) return;

	const fields = new Set(requiredFields.value);
	fields.add(primaryKey.value);

	try {
		drawerLoading.value = true;

		const params: Record<string, any> = {
			fields: Array.from(fields),
			limit: -1,
		};

		if (props.filter) {
			params.filter = props.filter;
		}

		if (drawerSearch.value) {
			params.search = drawerSearch.value;
		}

		const response = await api.get(getEndpoint(unref(selectedCollection)), { params });
		drawerItems.value = response.data.data ?? [];
	} catch (error) {
		console.error(error);
	} finally {
		drawerLoading.value = false;
	}
}

watch(drawerSearch, () => {
	loadDrawerItems();
});

function toggleDrawerItem(key: PrimaryKey) {
	const idx = drawerSelection.value.indexOf(key);
	if (idx === -1) {
		drawerSelection.value = [...drawerSelection.value, key];
	} else {
		drawerSelection.value = drawerSelection.value.filter((k) => k !== key);
	}
}

function confirmSelection() {
	selectDrawerOpen.value = false;

	if (!drawerSelection.value || drawerSelection.value.length === 0) {
		values.value = [];
		return;
	}

	values.value = drawerSelection.value.map((key) => ({
		key,
		collection: unref(selectedCollection),
	}));
}

function removeItem(item: Record<string, any>) {
	const keyToRemove = item[primaryKey.value];
	values.value = values.value.filter((v) => v.key !== keyToRemove);
}

function onSort(sortedItems: Record<string, any>[]) {
	displayItems.value = sortedItems;

	values.value = sortedItems.map((item) => ({
		key: item[primaryKey.value],
		collection: unref(selectedCollection),
	}));
}

function renderItem(item: Record<string, any>): string {
	if (!displayTemplate.value) return String(item[primaryKey.value] ?? '');
	return displayTemplate.value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, field: string) => {
		const val = field
			.trim()
			.split('.')
			.reduce((obj: any, key: string) => obj?.[key], item);
		return val != null ? String(val) : '';
	});
}

function hideDragImage(dataTransfer: DataTransfer) {
	const img = new Image();
	img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
	dataTransfer.setDragImage(img, 0, 0);
}
</script>

<template>
	<div class="collection-item-multiple-dropdown">
		<v-notice v-if="!loading && displayItems.length === 0">
			{{ t('no_items') }}
		</v-notice>

		<template v-else-if="loading">
			<v-skeleton-loader
				v-for="num in Math.max(displayItems.length, 1)"
				:key="num"
				:type="displayItems.length > 4 ? 'block-list-item-dense' : 'block-list-item'"
			/>
		</template>

		<Draggable
			v-else
			:model-value="displayItems"
			tag="v-list"
			:item-key="primaryKey"
			handle=".drag-handle"
			:disabled="disabled"
			:set-data="hideDragImage"
			v-bind="{ 'force-fallback': true }"
			@update:model-value="onSort($event)"
		>
			<template #item="{ element }">
				<v-list-item block :disabled="disabled" :non-editable="nonEditable" :dense="displayItems.length > 4">
					<v-icon
						v-if="!nonEditable"
						name="drag_handle"
						class="drag-handle"
						left
						:disabled="disabled"
						@click.stop="() => {}"
					/>

					<span class="preview">{{ renderItem(element) }}</span>

					<div class="spacer" />

					<div v-if="!nonEditable" class="item-actions">
						<v-icon
							name="close"
							class="remove-icon"
							:disabled="disabled"
							clickable
							@click.stop="removeItem(element)"
						/>
					</div>
				</v-list-item>
			</template>
		</Draggable>

		<div v-if="!nonEditable" class="actions">
			<v-button :disabled="disabled" @click="openDrawer">
				{{ t('select_item') }}
			</v-button>
		</div>

		<v-drawer
			v-model="selectDrawerOpen"
			:title="t('select_item')"
			@cancel="selectDrawerOpen = false"
		>
			<template #actions>
				<v-button @click="confirmSelection">
					{{ t('save') }}
				</v-button>
			</template>

			<div class="drawer-content">
				<v-input
					v-model="drawerSearch"
					:placeholder="t('search')"
					prepend-icon="search"
					class="drawer-search"
				/>

				<v-skeleton-loader v-if="drawerLoading" type="block-list-item" />

				<v-list v-else>
					<v-list-item
						v-for="item in drawerItems"
						:key="item[primaryKey]"
						block
						clickable
						:active="drawerSelection.includes(item[primaryKey])"
						@click="toggleDrawerItem(item[primaryKey])"
					>
						<v-checkbox
							:model-value="drawerSelection.includes(item[primaryKey])"
							@update:model-value="toggleDrawerItem(item[primaryKey])"
							@click.stop
						/>
						<span class="drawer-item-label">{{ renderItem(item) }}</span>
					</v-list-item>
				</v-list>
			</div>
		</v-drawer>
	</div>
</template>

<style scoped>
.collection-item-multiple-dropdown {
	--v-list-padding: 0;
}

.v-list {
	margin-bottom: 8px;
}

.v-list-item .drag-handle {
	cursor: grab;
	color: var(--theme--foreground-subdued);
	margin-right: 8px;
}

.v-list-item .drag-handle:active {
	cursor: grabbing;
}

.preview {
	display: block;
	flex-grow: 1;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.spacer {
	flex-grow: 1;
}

.item-actions {
	display: flex;
	align-items: center;
	gap: 4px;
}

.remove-icon {
	color: var(--theme--danger);
}

.actions {
	margin-top: 8px;
}

.drawer-content {
	padding: var(--content-padding);
	padding-top: 0;
}

.drawer-search {
	margin-bottom: 16px;
}

.drawer-item-label {
	margin-left: 8px;
}
</style>
