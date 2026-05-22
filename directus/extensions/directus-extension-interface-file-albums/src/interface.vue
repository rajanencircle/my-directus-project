<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';

type Album = { id: number | string; name: string };
type Junction = {
  id: number | string;
  albums_id: Album | number | string | null;
  directus_files_id: string | { id: string } | null;
};

const props = withDefaults(
  defineProps<{
    value?: any;
    collection: string;
    field: string;
    primaryKey?: string | number;
    disabled?: boolean;
  }>(),
  { value: null, disabled: false }
);

const api = useApi();

const fileId = computed(() => (props.primaryKey == null ? '' : String(props.primaryKey)));

const loading = ref(false);
const error = ref<string | null>(null);
const links = ref<Junction[]>([]);

const albumsLoading = ref(false);
const albums = ref<Album[]>([]);
const selectedAlbumId = ref<string>('');
const newAlbumName = ref('');

const linking = ref(false);
const creating = ref(false);

const currentAlbums = computed(() => {
  return links.value
    .map((j) => j.albums_id)
    .filter(Boolean)
    .map((a: any) => (typeof a === 'object' ? ({ id: a.id, name: a.name } as Album) : null))
    .filter(Boolean) as Album[];
});

async function loadLinks() {
  if (!fileId.value) return;
  loading.value = true;
  error.value = null;
  try {
    const res = await api.get('/items/albums_directus_files', {
      params: {
        filter: { directus_files_id: { _eq: fileId.value } },
        fields: ['id', 'albums_id.id', 'albums_id.name', 'directus_files_id'],
        limit: -1,
      },
    });
    links.value = (res.data?.data ?? []) as Junction[];
  } catch (e: any) {
    error.value = e?.response?.data?.errors?.[0]?.message ?? 'Failed to load albums.';
    links.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadAlbums() {
  albumsLoading.value = true;
  try {
    const res = await api.get('/items/albums', { params: { limit: -1, sort: ['name'], fields: ['id', 'name'] } });
    albums.value = (res.data?.data ?? []) as Album[];
    if (!selectedAlbumId.value && albums.value.length) selectedAlbumId.value = String(albums.value[0].id);
  } catch {
    albums.value = [];
  } finally {
    albumsLoading.value = false;
  }
}

async function addToAlbum() {
  if (!fileId.value || !selectedAlbumId.value) return;
  linking.value = true;
  try {
    await api.post('/items/albums_directus_files', {
      albums_id: selectedAlbumId.value,
      directus_files_id: fileId.value,
    });
    await loadLinks();
  } catch (e: any) {
    error.value = e?.response?.data?.errors?.[0]?.message ?? 'Failed to add to album.';
  } finally {
    linking.value = false;
  }
}

async function removeLink(junctionId: string | number) {
  if (!junctionId) return;
  linking.value = true;
  try {
    await api.delete(`/items/albums_directus_files/${junctionId}`);
    await loadLinks();
  } catch (e: any) {
    error.value = e?.response?.data?.errors?.[0]?.message ?? 'Failed to remove from album.';
  } finally {
    linking.value = false;
  }
}

async function createAlbumAndAdd() {
  const name = newAlbumName.value.trim();
  if (!name) return;
  creating.value = true;
  try {
    const res = await api.post('/items/albums', { name });
    const created = res.data?.data as Album | undefined;
    await loadAlbums();
    if (created?.id != null) selectedAlbumId.value = String(created.id);
    newAlbumName.value = '';
    await addToAlbum();
  } catch (e: any) {
    error.value = e?.response?.data?.errors?.[0]?.message ?? 'Failed to create album.';
  } finally {
    creating.value = false;
  }
}

watch(
  () => fileId.value,
  async () => {
    await loadLinks();
  }
);

onMounted(async () => {
  await Promise.all([loadAlbums(), loadLinks()]);
});
</script>

<template>
  <div class="panel">
    <div class="header">
      <div class="title">Albums</div>
      <div class="subdued">{{ fileId ? `File: ${fileId}` : 'No file selected' }}</div>
    </div>

    <div v-if="error" class="notice notice-error">
      <v-icon name="error" small />
      {{ error }}
    </div>

    <div v-if="loading" class="loading">
      <v-progress-circular indeterminate />
    </div>

    <div v-else class="current">
      <div v-if="links.length === 0" class="empty">This file is not in any albums.</div>
      <div v-else class="list">
        <div v-for="j in links" :key="String(j.id)" class="row">
          <div class="name">
            {{
              j.albums_id && typeof j.albums_id === 'object'
                ? j.albums_id.name
                : j.albums_id == null
                  ? '(Unknown album)'
                  : String(j.albums_id)
            }}
          </div>
          <v-button small secondary :disabled="linking || props.disabled" @click="removeLink(j.id)">Remove</v-button>
        </div>
      </div>
    </div>

    <div class="actions">
      <div class="action-row">
        <v-select
          v-model="selectedAlbumId"
          :items="albums.map((a) => ({ text: a.name, value: String(a.id) }))"
          :disabled="albumsLoading || linking || props.disabled"
        />
        <v-button small :loading="linking" :disabled="!fileId || !selectedAlbumId || props.disabled" @click="addToAlbum">
          Add
        </v-button>
      </div>

      <div class="action-row">
        <v-input
          :model-value="newAlbumName"
          placeholder="New album name…"
          :disabled="creating || linking || props.disabled"
          @update:model-value="(v: unknown) => (newAlbumName = String(v ?? ''))"
        />
        <v-button small secondary :loading="creating" :disabled="!newAlbumName.trim() || !fileId || props.disabled" @click="createAlbumAndAdd">
          Create + Add
        </v-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-normal);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: var(--theme--fonts--sans--font-family);
}

.header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  font-weight: 800;
  font-size: 13px;
}

.subdued {
  color: var(--theme--foreground-subdued);
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 10px 0;
}

.empty {
  color: var(--theme--foreground-subdued);
  font-size: 12px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-subdued);
}

.name {
  font-size: 12px;
  font-weight: 800;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
}

.notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--theme--border-radius);
  font-size: 13px;
}

.notice-error {
  background: color-mix(in srgb, var(--theme--danger, #dc3545) 10%, transparent);
  color: var(--theme--danger, #dc3545);
  border: 1px solid color-mix(in srgb, var(--theme--danger, #dc3545) 30%, transparent);
}
</style>

