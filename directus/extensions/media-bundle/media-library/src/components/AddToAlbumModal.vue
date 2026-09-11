<template>
	<v-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" @esc="close">
		<v-card class="add-to-album-card">
			<v-card-title>
				<v-icon name="photo_album" left />
				Add to Album
			</v-card-title>

			<v-card-text>
				<p class="hint">{{ fileIds.length }} file{{ fileIds.length === 1 ? '' : 's' }} selected</p>

				<div v-if="error" class="notice">
					<v-notice type="danger">{{ error }}</v-notice>
				</div>

				<div v-if="loading" class="state">
					<v-progress-circular indeterminate />
				</div>

				<template v-else>
					<div v-if="albums.length === 0" class="state muted">
						No albums yet. Create one below.
					</div>

					<v-list v-else class="album-list">
						<v-list-item
							v-for="album in albums"
							:key="album.id"
							clickable
							:active="selectedAlbumId === album.id"
							@click="selectedAlbumId = album.id"
						>
							<v-list-item-icon>
								<v-icon name="photo_album" outline />
							</v-list-item-icon>
							<v-list-item-content>
								<v-text-overflow :text="album.name" />
							</v-list-item-content>
							<v-list-item-icon v-if="selectedAlbumId === album.id">
								<v-icon name="check" class="check-icon" />
							</v-list-item-icon>
						</v-list-item>
					</v-list>

					<div class="create-row">
						<v-input
							v-model="newAlbumName"
							placeholder="New album name…"
							:disabled="saving || creating"
							@keydown.enter="createAlbum"
						/>
						<v-button
							secondary
							:loading="creating"
							:disabled="!newAlbumName.trim() || saving"
							@click="createAlbum"
						>
							Create
						</v-button>
					</div>
				</template>
			</v-card-text>

			<v-card-actions>
				<v-button secondary :disabled="saving || creating" @click="close">
					{{ t('cancel') }}
				</v-button>
				<v-button
					:loading="saving"
					:disabled="!selectedAlbumId || fileIds.length === 0 || creating"
					@click="confirmAdd"
				>
					<v-icon name="playlist_add" left />
					Add to Album
				</v-button>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useApi } from '@directus/extensions-sdk'
import { useAlbumsStore, type DirectusAlbum } from '../stores/albums.store'
import { useT } from '../composables/useT'

const props = defineProps<{
	modelValue: boolean
	fileIds: string[]
}>()

const emit = defineEmits<{
	'update:modelValue': [value: boolean]
	added: [albumId: string]
}>()

const api = useApi()
const { t } = useT()
const albumsStore = useAlbumsStore()

const loading = ref(false)
const saving = ref(false)
const creating = ref(false)
const error = ref<string | null>(null)
const albums = ref<DirectusAlbum[]>([])
const selectedAlbumId = ref<string | null>(null)
const newAlbumName = ref('')

function close() {
	if (saving.value || creating.value) return
	emit('update:modelValue', false)
}

async function loadAlbums() {
	loading.value = true
	error.value = null
	try {
		await albumsStore.fetchAlbums({ force: true })
		albums.value = [...albumsStore.albums]
		if (!selectedAlbumId.value && albums.value.length) {
			selectedAlbumId.value = albums.value[0]!.id
		}
	} catch (err: any) {
		error.value =
			err?.response?.data?.errors?.[0]?.message ?? 'Failed to load albums.'
		albums.value = []
	} finally {
		loading.value = false
	}
}

watch(
	() => props.modelValue,
	(open) => {
		if (!open) return
		selectedAlbumId.value = null
		newAlbumName.value = ''
		error.value = null
		loadAlbums()
	},
)

async function createAlbum() {
	const name = newAlbumName.value.trim()
	if (!name || creating.value) return
	creating.value = true
	error.value = null
	try {
		const created = await albumsStore.createAlbum(name)
		albums.value = [...albumsStore.albums]
		selectedAlbumId.value = created.id
		newAlbumName.value = ''
	} catch (err: any) {
		error.value =
			err?.response?.data?.errors?.[0]?.message ?? 'Failed to create album.'
	} finally {
		creating.value = false
	}
}

async function confirmAdd() {
	const albumId = selectedAlbumId.value
	if (!albumId || !props.fileIds.length || saving.value) return
	saving.value = true
	error.value = null
	try {
		// Skip files already in this album
		const existingRes = await api.get('/items/albums_directus_files', {
			params: {
				filter: {
					_and: [
						{ albums_directus_id: { _eq: albumId } },
						{ directus_files_id: { _in: props.fileIds } },
					],
				},
				fields: ['directus_files_id'],
				limit: -1,
			},
		})
		const already = new Set(
			((existingRes.data?.data ?? []) as Array<{ directus_files_id: string }>).map(
				(r) => String(r.directus_files_id),
			),
		)

		const toAdd = props.fileIds.filter((id) => !already.has(String(id)))
		for (const fileId of toAdd) {
			await api.post('/items/albums_directus_files', {
				albums_directus_id: albumId,
				directus_files_id: fileId,
			})
		}

		emit('added', albumId)
		emit('update:modelValue', false)
	} catch (err: any) {
		error.value =
			err?.response?.data?.errors?.[0]?.message ?? 'Failed to add files to album.'
	} finally {
		saving.value = false
	}
}
</script>

<style scoped>
.add-to-album-card {
	min-width: min(420px, 92vw);
}

.hint {
	margin: 0 0 12px;
	font-size: 13px;
	color: var(--theme--foreground-subdued);
}

.notice {
	margin-bottom: 12px;
}

.state {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 120px;
}

.state.muted {
	color: var(--theme--foreground-subdued);
	font-size: 13px;
}

.album-list {
	max-height: 280px;
	overflow-y: auto;
	margin-bottom: 12px;
	border: 1px solid var(--theme--border-color);
	border-radius: 6px;
}

.check-icon {
	--v-icon-color: var(--theme--primary);
}

.create-row {
	display: flex;
	gap: 8px;
	align-items: center;
}

.create-row :deep(.v-input) {
	flex: 1;
}
</style>
