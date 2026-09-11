<script setup lang="ts">
import { ref } from 'vue';
import ThumbnailCard from './ThumbnailCard.vue';

interface JunctionRow {
	id: number | string;
	[key: string]: any;
}

interface JunctionFlagDef {
	field: string;
	label: string;
}

const props = withDefaults(
	defineProps<{
		rows: JunctionRow[];
		thumbnailSize: number;
		readonly: boolean;
		sortable?: boolean;
		junctionFlags?: JunctionFlagDef[];
		filesFkField: string;
		emptyLabel?: string;
	}>(),
	{
		sortable: false,
		junctionFlags: () => [],
	},
);

const emit = defineEmits<{
	(e: 'delete', row: JunctionRow): void;
	(e: 'open', row: JunctionRow): void;
	(e: 'reorder', rows: JunctionRow[]): void;
	(e: 'flag-change', payload: { row: JunctionRow; field: string; value: boolean }): void;
}>();

const dragIndex = ref<number | null>(null);
const overIndex = ref<number | null>(null);

function onDragStart(index: number, event: DragEvent) {
	if (!props.sortable) return;
	dragIndex.value = index;
	overIndex.value = index;
	if (event.dataTransfer) {
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/plain', String(index));
	}
}

function onDragOver(index: number, event: DragEvent) {
	if (!props.sortable || dragIndex.value === null) return;
	event.preventDefault();
	if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
	overIndex.value = index;
}

function onDrop(index: number, event: DragEvent) {
	if (!props.sortable) return;
	event.preventDefault();
	const from = dragIndex.value;
	if (from === null || from === index) {
		onDragEnd();
		return;
	}

	const next = [...props.rows];
	const [moved] = next.splice(from, 1);
	if (!moved) {
		onDragEnd();
		return;
	}
	next.splice(index, 0, moved);
	emit('reorder', next);
	onDragEnd();
}

function onDragEnd() {
	dragIndex.value = null;
	overIndex.value = null;
}
</script>

<template>
	<div class="media-grid-wrap">
		<div
			v-if="rows.length > 0"
			class="media-grid"
			:style="{
				gridTemplateColumns: `repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`,
				gap: '12px',
			}"
		>
			<div
				v-for="(row, index) in rows"
				:key="row.id"
				class="grid-item"
				:class="{
					sortable: sortable,
					dragging: dragIndex === index,
					'drag-over': sortable && overIndex === index && dragIndex !== null && dragIndex !== index,
				}"
				@dragover="onDragOver(index, $event)"
				@drop="onDrop(index, $event)"
			>
				<div
					v-if="sortable"
					class="drag-handle"
					draggable="true"
					title="Drag to reorder"
					aria-label="Drag to reorder"
					role="button"
					tabindex="0"
					@dragstart="onDragStart(index, $event)"
					@dragend="onDragEnd"
					@click.stop.prevent
				>
					<v-icon name="drag_indicator" small />
				</div>
				<ThumbnailCard
					:row="row"
					:thumbnail-size="thumbnailSize"
					:readonly="readonly"
					:junction-flags="junctionFlags"
					:files-fk-field="filesFkField"
					@delete="emit('delete', row)"
					@open="emit('open', row)"
					@flag-change="emit('flag-change', $event)"
				/>
			</div>
		</div>

		<div v-else class="empty-state">
			<v-icon name="image" class="empty-icon" />
			<p class="empty-text">{{ emptyLabel ?? 'No files uploaded yet.' }}</p>
		</div>
	</div>
</template>

<style scoped>
.media-grid-wrap {
	width: 100%;
}

.media-grid {
	display: grid;
}

.grid-item {
	position: relative;
	min-width: 0;
	height: 100%;
	display: flex;
	flex-direction: column;
}

.grid-item > :deep(.thumbnail-card) {
	flex: 1;
	min-height: 0;
}

.grid-item.dragging {
	opacity: 0.45;
}

.grid-item.drag-over {
	outline: 2px dashed var(--theme--primary);
	outline-offset: 4px;
	border-radius: var(--theme--border-radius);
}

.drag-handle {
	position: absolute;
	top: 8px;
	left: 8px;
	z-index: 6;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 8px;
	border: 1px solid color-mix(in srgb, var(--theme--border-color) 70%, transparent);
	background: rgba(255, 255, 255, 0.94);
	backdrop-filter: blur(4px);
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14);
	color: var(--theme--foreground-subdued);
	cursor: grab;
	opacity: 0.95;
	user-select: none;
	pointer-events: auto;
}

.drag-handle:active {
	cursor: grabbing;
}

.grid-item:hover .drag-handle,
.grid-item.dragging .drag-handle {
	opacity: 1;
	color: var(--theme--foreground);
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 14px 12px;
	border: 1px solid var(--theme--border-color);
	border-radius: var(--theme--border-radius);
	background: var(--theme--background-subdued);
	gap: 10px;
	color: var(--theme--foreground-subdued);
	font-family: var(--theme--fonts--sans--font-family);
}

.empty-icon {
	font-size: 40px;
	opacity: 0.4;
}

.empty-text {
	font-size: 14px;
	margin: 0;
	opacity: 0.7;
}
</style>
