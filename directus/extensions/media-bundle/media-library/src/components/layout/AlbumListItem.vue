<template>
	<v-list-item
		clickable
		class="album-list-item"
		:active="album.id === selectedId"
		@click="emit('select', album.id)"
		@contextmenu.prevent.stop="openMenu"
	>
		<v-list-item-icon>
			<v-icon name="photo_album" outline />
		</v-list-item-icon>
		<v-list-item-content>
			<v-text-overflow :text="album.name" />
		</v-list-item-content>
		<span v-if="isThisAlbumDownloading" class="album-dl-badge" title="Downloading…">
			<v-progress-circular indeterminate x-small />
		</span>
	</v-list-item>

	<!-- Context menu -->
	<teleport to="body">
		<div
			v-if="menuOpen"
			ref="menuEl"
			class="album-ctx-menu"
			:style="{ top: `${menuY}px`, left: `${menuX}px` }"
			role="menu"
			@mousedown.stop
		>
			<button type="button" class="album-ctx-item" role="menuitem" @click.stop="onAction('rename')">
				<v-icon name="edit" small outline />
				<span>Rename Album</span>
			</button>

			<button
				type="button"
				class="album-ctx-item"
				:class="{ 'is-busy': isThisAlbumDownloading }"
				role="menuitem"
				:disabled="isThisAlbumDownloading"
				@click.stop="onDownload"
			>
				<v-icon
					:name="isThisAlbumDownloading ? 'progress_activity' : 'download'"
					small
					outline
					:class="{ 'is-spinning': isThisAlbumDownloading }"
				/>
				<span>Download Album</span>
			</button>

			<button type="button" class="album-ctx-item danger" role="menuitem" @click.stop="onAction('delete')">
				<v-icon name="delete" small outline />
				<span>Delete Album</span>
			</button>
		</div>
	</teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import type { DirectusAlbum } from '../../stores/albums.store'

const props = withDefaults(
	defineProps<{
		album: DirectusAlbum
		selectedId: string | null
		downloadingAlbumIds?: string[]
	}>(),
	{
		downloadingAlbumIds: () => [],
	},
)

const emit = defineEmits<{
	select: [id: string]
	rename: [album: DirectusAlbum]
	download: [album: DirectusAlbum]
	delete: [album: DirectusAlbum]
}>()

const menuOpen = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const menuEl = ref<HTMLElement | null>(null)

const isThisAlbumDownloading = computed(() =>
	props.downloadingAlbumIds.includes(props.album.id),
)

function clampMenuPosition(x: number, y: number) {
	const pad = 8
	const menuW = 200
	const menuH = 160
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

async function onAction(action: 'rename' | 'delete') {
	closeMenu()
	await nextTick()
	emit(action, props.album)
}

function onDownload() {
	if (isThisAlbumDownloading.value) return
	closeMenu()
	emit('download', props.album)
}
</script>

<style scoped>
.album-list-item {
	position: relative;
}

.album-dl-badge {
	display: inline-flex;
	align-items: center;
	margin-left: auto;
	margin-right: 4px;
	color: var(--theme--primary);
}

.album-ctx-menu {
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

.album-ctx-item {
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

.album-ctx-item:hover:not(:disabled) {
	background: var(--theme--background-accent);
}

.album-ctx-item:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.album-ctx-item.danger {
	color: var(--theme--danger);
}

.album-ctx-item.is-busy {
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
