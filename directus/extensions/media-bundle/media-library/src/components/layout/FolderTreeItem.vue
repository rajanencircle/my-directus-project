<template>
	<!-- Folder with children: collapsible group -->
	<v-list-group
		v-if="node.children.length > 0"
		:value="node.id"
		scope="media-library-nav"
		arrow-placement="after"
		clickable
		disable-groupable-parent
		:active="node.id === selectedId"
		class="folder-tree-item"
		:class="{ 'has-partner-accent': !!accentStyle, 'is-nested': depth > 0 }"
		:style="accentStyle"
		@click="emit('select', node.id)"
		@contextmenu.prevent.stop="openMenu"
	>
		<template #activator>
			<span v-if="accentStyle" class="folder-accent-bar" aria-hidden="true" />
			<v-list-item-icon>
				<v-icon name="folder" outline class="folder-accent-icon" />
			</v-list-item-icon>
			<v-list-item-content>
				<v-text-overflow :text="node.name" />
			</v-list-item-content>
			<span v-if="isThisFolderDownloading" class="folder-dl-badge" title="Downloading…">
				<v-progress-circular indeterminate x-small />
			</span>
		</template>

		<FolderTreeItem
			v-for="child in node.children"
			:key="child.id"
			:node="child"
			:depth="depth + 1"
			:selected-id="selectedId"
			:downloading-folder-ids="downloadingFolderIds"
			@select="(id) => emit('select', id)"
			@rename="(n) => emit('rename', n)"
			@move="(n) => emit('move', n)"
			@download="(n) => emit('download', n)"
			@delete="(n) => emit('delete', n)"
		/>
	</v-list-group>

	<!-- Leaf folder: simple item -->
	<v-list-item
		v-else
		clickable
		class="folder-tree-item"
		:class="{ 'has-partner-accent': !!accentStyle, 'is-nested': depth > 0 }"
		:style="accentStyle"
		:active="node.id === selectedId"
		@click="emit('select', node.id)"
		@contextmenu.prevent.stop="openMenu"
	>
		<span v-if="accentStyle" class="folder-accent-bar" aria-hidden="true" />
		<v-list-item-icon>
			<v-icon name="folder" outline class="folder-accent-icon" />
		</v-list-item-icon>
		<v-list-item-content>
			<v-text-overflow :text="node.name" />
		</v-list-item-content>
		<span v-if="isThisFolderDownloading" class="folder-dl-badge" title="Downloading…">
			<v-progress-circular indeterminate x-small />
		</span>
	</v-list-item>

	<!-- Context menu -->
	<teleport to="body">
		<div
			v-if="menuOpen"
			ref="menuEl"
			class="folder-ctx-menu"
			:style="{ top: `${menuY}px`, left: `${menuX}px` }"
			role="menu"
			@mousedown.stop
		>
			<button type="button" class="folder-ctx-item" role="menuitem" @click.stop="onAction('rename')">
				<v-icon name="edit" small outline />
				<span>Rename Folder</span>
			</button>
			<button type="button" class="folder-ctx-item" role="menuitem" @click.stop="onAction('move')">
				<v-icon name="drive_file_move" small outline />
				<span>Move to Folder</span>
			</button>

			<button
				type="button"
				class="folder-ctx-item"
				:class="{ 'is-busy': isThisFolderDownloading }"
				role="menuitem"
				:disabled="isThisFolderDownloading"
				@click.stop="onDownload"
			>
				<v-icon
					:name="isThisFolderDownloading ? 'progress_activity' : 'download'"
					small
					outline
					:class="{ 'is-spinning': isThisFolderDownloading }"
				/>
				<span>Download Folder</span>
			</button>

			<button type="button" class="folder-ctx-item danger" role="menuitem" @click.stop="onAction('delete')">
				<v-icon name="delete" small outline />
				<span>Delete Folder</span>
			</button>
		</div>
	</teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import type { FolderNode } from '../../stores/folders.store'
import { partnerAccentStyle } from '../../utils/partnerAccent'

const props = withDefaults(
	defineProps<{
		node: FolderNode
		depth: number
		selectedId: string | null
		downloadingFolderIds?: string[]
	}>(),
	{
		downloadingFolderIds: () => [],
	},
)

const emit = defineEmits<{
	select: [id: string]
	rename: [node: FolderNode]
	move: [node: FolderNode]
	download: [node: FolderNode]
	delete: [node: FolderNode]
}>()

const menuOpen = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const menuEl = ref<HTMLElement | null>(null)

const isThisFolderDownloading = computed(() =>
	props.downloadingFolderIds.includes(props.node.id),
)

const accentStyle = computed(() => partnerAccentStyle(props.node.createdByPartnerVisually))

function clampMenuPosition(x: number, y: number) {
	const pad = 8
	const menuW = 220
	const menuH = 200
	const maxX = window.innerWidth - menuW - pad
	const maxY = window.innerHeight - menuH - pad
	menuX.value = Math.max(pad, Math.min(x, maxX))
	menuY.value = Math.max(pad, Math.min(y, maxY))
}

function openMenu(event: MouseEvent) {
	clampMenuPosition(event.clientX, event.clientY)
	menuOpen.value = true
}

function closeMenu() {
	menuOpen.value = false
}

function onDocPointerDown(event: Event) {
	const target = event.target as Node | null
	if (menuEl.value && target && menuEl.value.contains(target)) return
	closeMenu()
}

function onDocKey(event: KeyboardEvent) {
	if (event.key === 'Escape') closeMenu()
}

watch(menuOpen, (open) => {
	if (open) {
		nextTick(() => {
			document.addEventListener('mousedown', onDocPointerDown, true)
			document.addEventListener('keydown', onDocKey, true)
		})
	} else {
		document.removeEventListener('mousedown', onDocPointerDown, true)
		document.removeEventListener('keydown', onDocKey, true)
	}
})

onBeforeUnmount(() => {
	document.removeEventListener('mousedown', onDocPointerDown, true)
	document.removeEventListener('keydown', onDocKey, true)
})

async function onAction(action: 'rename' | 'move' | 'delete') {
	closeMenu()
	await nextTick()
	emit(action, props.node)
}

function onDownload() {
	if (isThisFolderDownloading.value) return
	closeMenu()
	emit('download', props.node)
}
</script>

<style scoped>
.folder-tree-item {
	position: relative;
}

.folder-accent-bar {
	position: absolute;
	top: 6px;
	bottom: 6px;
	left: 0;
	width: 3px;
	border-radius: 0 2px 2px 0;
	background: var(--partner-accent);
	pointer-events: none;
	z-index: 1;
}

.folder-tree-item.has-partner-accent .folder-accent-icon {
	color: var(--partner-accent);
}

.folder-dl-badge {
	display: inline-flex;
	align-items: center;
	margin-left: auto;
	margin-right: 4px;
	color: var(--theme--primary);
}

.folder-ctx-menu {
	position: fixed;
	z-index: 600;
	min-width: 200px;
	padding: 6px;
	background: var(--theme--background);
	border: 1px solid var(--theme--border-color);
	border-radius: 8px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.folder-ctx-item {
	appearance: none;
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 8px 10px;
	border: none;
	border-radius: 6px;
	background: transparent;
	color: var(--theme--foreground);
	font: inherit;
	font-size: 13px;
	text-align: left;
	cursor: pointer;
}

.folder-ctx-item:hover:not(:disabled) {
	background: var(--theme--background-accent);
}

.folder-ctx-item:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.folder-ctx-item.danger {
	color: var(--theme--danger);
}

.folder-ctx-item.is-busy {
	color: var(--theme--primary);
}

.is-spinning {
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
