<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import FolderDropdown from './FolderDropdown.vue';
import ExpiryInfoDialog from './ExpiryInfoDialog.vue';
import { isExpired } from '../utils/expiry';
import { extractJunctionFileId, parseFileReverseLinks, type AnyRecord } from '../utils/fileReverseLinks';
import LinkedCollectionsDialog from './LinkedCollectionsDialog.vue';
import FileThumbPreview from './FileThumbPreview.vue';

type ID = string | number;

interface DirectusFile {
  id: string;
  title: string | null;
  filename_download: string;
  type: string | null;
  expiry_date?: string | null;
}

const props = withDefaults(
  defineProps<{
    junctionTable: string;
    collectionFkField: string;
    filesFkField: string;
    primaryKey: ID;
    allowedTypes: string;
    thumbnailSize: number;
    defaultFolder: string | null;
    alreadyLinkedFileIds: string[];
    fileReverseLinks?: unknown;
    downloadFormatPresets?: unknown;
  }>(),
  {
    thumbnailSize: 180,
    defaultFolder: null,
    alreadyLinkedFileIds: () => [],
    fileReverseLinks: undefined,
    downloadFormatPresets: undefined,
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'linked', fileIds: string[]): void;
}>();

const api = useApi();

const loading = ref(false);
const linking = ref(false);
const loadError = ref<string | null>(null);

const search = ref('');
const selectedFolder = ref<string | null>(props.defaultFolder);

const perPage = ref<number>(25);
const page = ref<number>(1);
const total = ref<number | null>(null);
const files = ref<DirectusFile[]>([]);

const selectedIds = ref<Set<string>>(new Set());

const expiryDialogOpen = ref(false);
const expiryDialogFile = ref<DirectusFile | null>(null);

const linkedDialogOpen = ref(false);
const linkedDialogFile = ref<DirectusFile | null>(null);

type Album = { id: number | string; name: string };
const albumDialogOpen = ref(false);
const albumsLoading = ref(false);
const albumsError = ref<string | null>(null);
const albums = ref<Album[]>([]);
const selectedAlbumId = ref<string>('');
const creatingAlbum = ref(false);
const newAlbumName = ref('');
const albumLinking = ref(false);

function openExpiryInfo(file: DirectusFile) {
  expiryDialogFile.value = file;
  expiryDialogOpen.value = true;
}

function openLinkedCollections(file: DirectusFile) {
  linkedDialogFile.value = file;
  linkedDialogOpen.value = true;
}

async function loadAlbums() {
  albumsLoading.value = true;
  albumsError.value = null;
  try {
    const res = await api.get('/items/albums_directus', { params: { limit: -1, sort: ['name'], fields: ['id', 'name'] } });
    albums.value = (res.data?.data ?? []) as Album[];
    if (!selectedAlbumId.value && albums.value.length) selectedAlbumId.value = String(albums.value[0].id);
  } catch (e: any) {
    albumsError.value = e?.response?.data?.errors?.[0]?.message ?? 'Failed to load albums.';
    albums.value = [];
  } finally {
    albumsLoading.value = false;
  }
}

async function openAlbumDialog() {
  albumDialogOpen.value = true;
  if (!albums.value.length) await loadAlbums();
}

async function createAlbum() {
  const name = newAlbumName.value.trim();
  if (!name) return;
  creatingAlbum.value = true;
  albumsError.value = null;
  try {
    const res = await api.post('/items/albums_directus', { name });
    const created = res.data?.data as Album | undefined;
    await loadAlbums();
    if (created?.id != null) selectedAlbumId.value = String(created.id);
    newAlbumName.value = '';
  } catch (e: any) {
    albumsError.value = e?.response?.data?.errors?.[0]?.message ?? 'Failed to create album.';
  } finally {
    creatingAlbum.value = false;
  }
}

async function addSelectedToAlbum() {
  const albumId = selectedAlbumId.value;
  const ids = Array.from(selectedIds.value);
  if (!albumId || !ids.length) return;
  albumLinking.value = true;
  albumsError.value = null;
  try {
    for (const fileId of ids) {
      try {
        await api.post('/items/albums_directus', {
          albums_id: albumId,
          directus_files_id: String(fileId),
        });
      } catch {
        // Ignore duplicates or per-item errors.
      }
    }
    albumDialogOpen.value = false;
  } catch (e: any) {
    albumsError.value = e?.response?.data?.errors?.[0]?.message ?? 'Failed to add files to album.';
  } finally {
    albumLinking.value = false;
  }
}

const acceptTypes = computed(() => {
  const types = props.allowedTypes;
  if (!types || types === '*/*') return [];
  return types
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
});

function matchesAllowedTypes(file: DirectusFile): boolean {
  if (!acceptTypes.value.length) return true;
  const mime = file.type ?? '';
  return acceptTypes.value.some((pattern) => {
    if (pattern === '*/*') return true;
    if (pattern.endsWith('/*')) {
      const group = pattern.split('/')[0];
      return mime.startsWith(`${group}/`);
    }
    return mime === pattern;
  });
}

const visibleFiles = computed(() => files.value.filter(matchesAllowedTypes));

const selectedCount = computed(() => selectedIds.value.size);

const linkedAnywhereMap = ref<Record<string, boolean>>({});
const linkedLoading = ref(false);

const reverseLinkRules = computed(() => parseFileReverseLinks(props.fileReverseLinks));

function isLinkedAnywhere(fileId: string): boolean {
  return linkedAnywhereMap.value[String(fileId)] === true;
}

function displayName(file: DirectusFile): string {
  return file.title || file.filename_download || 'Unnamed file';
}

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
}

function resetResults() {
  files.value = [];
  page.value = 1;
  total.value = null;
  loadError.value = null;
}

const offset = computed(() => (page.value - 1) * perPage.value);
const pageCount = computed(() => {
  if (total.value == null) return 1;
  return Math.max(1, Math.ceil(total.value / perPage.value));
});

const perPageItems = [
  { text: '25', value: 25 },
  { text: '50', value: 50 },
  { text: '100', value: 100 },
];

const pageButtons = computed(() => {
  // Show up to 5 pages around the current page
  const len = pageCount.value;
  const cur = page.value;
  const windowSize = 5;
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, cur - half);
  let end = Math.min(len, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
});

function goToPage(p: number) {
  const next = Math.max(1, Math.min(pageCount.value, p));
  page.value = next;
}

async function fetchPage() {
  if (loading.value) return;
  loading.value = true;
  loadError.value = null;
  try {
    const filterClauses: Record<string, unknown>[] = [];

    const q = search.value.trim();
    if (q) {
      filterClauses.push({
        _or: [
          { title: { _icontains: q } },
          { filename_download: { _icontains: q } },
        ],
      });
    }

    if (selectedFolder.value) {
      filterClauses.push({ folder: { _eq: selectedFolder.value } });
    }

    let filter: any = undefined;
    if (filterClauses.length === 1) filter = filterClauses[0];
    else if (filterClauses.length > 1) filter = { _and: filterClauses };

    const params: Record<string, unknown> = {
      fields: ['id', 'title', 'filename_download', 'type', 'expiry_date'],
      sort: ['-uploaded_on'],
      limit: perPage.value,
      offset: offset.value,
      meta: 'filter_count',
    };

    if (filter) params.filter = filter;

    const res = await api.get('/files', { params });
    const batch: DirectusFile[] = res.data?.data ?? [];

    files.value = batch;
    // Reset + refetch linked status lazily for the current page results.
    linkedAnywhereMap.value = {};
    void loadLinkedStatusForFiles(batch.map((f) => String(f.id)));

    const metaCount = res.data?.meta?.filter_count;
    if (typeof metaCount === 'number') {
      total.value = metaCount;
    } else {
      // Fallback: aggregate count
      try {
        const countRes = await api.get('/files', {
          params: {
            aggregate: { count: '*' },
            filter,
          },
        });
        const cnt = countRes.data?.data?.[0]?.count;
        total.value = typeof cnt === 'number' ? cnt : Number(cnt ?? 0);
      } catch {
        total.value = null;
      }
    }
  } catch (e: any) {
    loadError.value = e?.response?.data?.errors?.[0]?.message ?? 'Failed to load files.';
    files.value = [];
    total.value = null;
  } finally {
    loading.value = false;
  }
}

async function loadLinkedStatusForFiles(fileIds: string[]) {
  const ids = Array.from(new Set(fileIds.map(String))).filter(Boolean);
  const rules = reverseLinkRules.value;
  if (!ids.length || !rules.length) return;
  if (linkedLoading.value) return;

  linkedLoading.value = true;
  try {
    const perRule = await Promise.all(
      rules.map(async (rule) => {
        try {
          const coll = encodeURIComponent(rule.junction_collection.trim());
          const fileField = rule.file_field.trim();
          if (!coll || !fileField) return { rule, rows: [] as AnyRecord[] };
          const res = await api.get(`/items/${coll}`, {
            params: {
              filter: { [fileField]: { _in: ids } },
              fields: ['id', fileField],
              limit: -1,
            },
          });
          return { rule, rows: (res.data?.data ?? []) as AnyRecord[] };
        } catch {
          return { rule, rows: [] as AnyRecord[] };
        }
      })
    );

    const next: Record<string, boolean> = {};
    for (const { rule, rows } of perRule) {
      const fileField = rule.file_field?.trim?.() ?? '';
      if (!fileField) continue;
      for (const row of rows) {
        const id = extractJunctionFileId((row as any)[fileField]);
        if (id) next[id] = true;
      }
    }
    linkedAnywhereMap.value = next;
  } finally {
    linkedLoading.value = false;
  }
}

async function linkSelected() {
  if (linking.value) return;
  const ids = Array.from(selectedIds.value);
  if (!ids.length) return;

  linking.value = true;
  try {
    // Stage only. Persist will happen when the parent record is saved.
    const already = new Set(props.alreadyLinkedFileIds.map(String));
    const toStage = ids.map(String).filter((id) => !already.has(id));
    emit('linked', toStage);
  } catch (e) {
    // Keep modal open so user can retry
    console.error('[media-uploader] Add existing link error:', e);
  } finally {
    linking.value = false;
  }
}

function handleClose() {
  emit('close');
}

watch(
  () => [search.value, selectedFolder.value],
  () => {
    resetResults();
    fetchPage();
  }
);

watch(
  () => perPage.value,
  () => {
    page.value = 1;
    fetchPage();
  }
);

watch(
  () => page.value,
  () => {
    fetchPage();
  }
);

onMounted(() => {
  selectedFolder.value = props.defaultFolder;
  fetchPage();
});
</script>

<template>
  <v-dialog :model-value="true" @update:model-value="(v: boolean) => !v && handleClose()" persistent>
    <v-card class="add-existing-card">
      <v-card-title class="card-title">
        <v-icon name="collections" class="title-icon" />
        Add Existing
        <span class="title-count" v-if="selectedCount > 0">{{ selectedCount }} selected</span>
        <div class="spacer" />
        <button class="close-btn" type="button" @click="handleClose" :disabled="linking">
          <v-icon name="close" small />
        </button>
      </v-card-title>

      <v-card-text class="card-body">
        <div class="toolbar">
          <v-input class="search" :model-value="search" placeholder="Search media…"
            @update:model-value="(v: unknown) => (search = String(v ?? ''))">
            <template #prepend>
              <v-icon name="search" small />
            </template>
            <template #append>
              <v-icon v-if="search" name="close" small clickable @click.stop="search = ''" />
            </template>
          </v-input>

          <div class="folder">
            <FolderDropdown v-model="selectedFolder" />
          </div>
        </div>

        <div v-if="loadError" class="notice notice-error">
          <v-icon name="error" small />
          {{ loadError }}
        </div>

        <div class="grid-wrap">
          <div class="grid">
            <button v-for="file in visibleFiles" :key="file.id" type="button" class="tile" :class="{
              selected: selectedIds.has(file.id),
              linked: alreadyLinkedFileIds.includes(file.id) || isLinkedAnywhere(file.id),
            }" :title="displayName(file)" @click="toggleSelect(file.id)">
              <div class="thumb">
                <FileThumbPreview
                  :file-id="file.id"
                  :mime-type="file.type"
                  :filename="file.filename_download"
                  :alt="displayName(file)"
                  :size="thumbnailSize"
                />
                <div class="badges-row">
                  <div class="badges-left">
                    <span
                      v-if="alreadyLinkedFileIds.includes(file.id) && !isLinkedAnywhere(file.id)"
                      class="badge badge-linked"
                    >
                      Linked
                    </span>
                    <span
                      v-else-if="isLinkedAnywhere(file.id)"
                      class="badge badge-linked badge-linked-clickable"
                      role="button"
                      tabindex="0"
                      :title="linkedLoading ? 'Checking…' : 'View linked collections'"
                      @click.stop="openLinkedCollections(file)"
                      @keydown.enter.stop="openLinkedCollections(file)"
                      @keydown.space.prevent.stop="openLinkedCollections(file)"
                    >
                      Linked
                    </span>
                    <span
                      v-if="isExpired(file.expiry_date)"
                      class="badge badge-expired"
                      role="button"
                      tabindex="0"
                      title="Why is this expired?"
                      @click.stop="openExpiryInfo(file)"
                      @keydown.enter.stop="openExpiryInfo(file)"
                      @keydown.space.prevent.stop="openExpiryInfo(file)"
                    >
                      Don’t use
                    </span>
                  </div>

                  <div v-if="selectedIds.has(file.id)" class="badges-right">
                    <span class="badge badge-selected">
                      <v-icon name="check" x-small />
                    </span>
                  </div>
                </div>
              </div>
              <div class="meta">
                <p class="name">{{ displayName(file) }}</p>
              </div>
            </button>
          </div>

          <div v-if="loading" class="loading">
            <v-progress-circular indeterminate />
          </div>
          <div v-else-if="!visibleFiles.length" class="empty">
            No files found.
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="card-actions">
        <div class="pagination">
          <button class="page-btn" type="button" :disabled="page <= 1" @click="goToPage(page - 1)">
            ‹
          </button>
          <button v-for="p in pageButtons" :key="p" class="page-btn" type="button" :class="{ active: p === page }"
            @click="goToPage(p)">
            {{ p }}
          </button>
          <button class="page-btn" type="button" :disabled="page >= pageCount" @click="goToPage(page + 1)">
            ›
          </button>
        </div>

        <div class="per-page">
          <div class="per-page-label">Per page</div>
          <v-select v-model="perPage" :items="perPageItems" :disabled="loading" />
        </div>

        <div class="spacer" />

        <v-button
          secondary
          :disabled="selectedCount === 0"
          @click="openAlbumDialog"
        >
          Add to album
        </v-button>
        <v-button secondary :disabled="linking" @click="handleClose">Cancel</v-button>
        <v-button :disabled="selectedCount === 0" :loading="linking" @click="linkSelected">
          Add {{ selectedCount || '' }}
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog :model-value="albumDialogOpen" @update:model-value="(v: boolean) => (albumDialogOpen = v)" persistent>
    <v-card class="album-card">
      <v-card-title class="album-title">
        <v-icon name="collections" />
        Add to album
        <div class="spacer" />
        <button class="close-btn" type="button" @click="albumDialogOpen = false" :disabled="albumLinking || creatingAlbum">
          <v-icon name="close" small />
        </button>
      </v-card-title>
      <v-card-text class="album-body">
        <div v-if="albumsError" class="notice notice-error">
          <v-icon name="error" small />
          {{ albumsError }}
        </div>

        <div v-if="albumsLoading" class="loading">
          <v-progress-circular indeterminate />
        </div>

        <template v-else>
          <div class="album-row">
            <div class="album-label">Album</div>
            <v-select
              v-model="selectedAlbumId"
              :items="albums.map((a) => ({ text: a.name, value: String(a.id) }))"
              :disabled="albumLinking || creatingAlbum"
            />
          </div>

          <div class="album-row">
            <div class="album-label">Create new</div>
            <div class="album-create">
              <v-input
                :model-value="newAlbumName"
                placeholder="New album name…"
                @update:model-value="(v: unknown) => (newAlbumName = String(v ?? ''))"
              />
              <v-button :loading="creatingAlbum" :disabled="!newAlbumName.trim() || albumLinking" @click="createAlbum">
                Create
              </v-button>
            </div>
          </div>
        </template>
      </v-card-text>
      <v-card-actions class="album-actions">
        <div class="muted">{{ selectedCount }} selected</div>
        <div class="spacer" />
        <v-button secondary :disabled="albumLinking || creatingAlbum" @click="albumDialogOpen = false">Cancel</v-button>
        <v-button :loading="albumLinking" :disabled="!selectedAlbumId || selectedCount === 0" @click="addSelectedToAlbum">
          Add to album
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <ExpiryInfoDialog v-model="expiryDialogOpen" :expiry-date="expiryDialogFile?.expiry_date ?? null"
    :title="expiryDialogFile?.title ?? null" :filename="expiryDialogFile?.filename_download ?? null" />

  <LinkedCollectionsDialog
    v-if="linkedDialogOpen && linkedDialogFile"
    :file-id="linkedDialogFile.id"
    :file-name="displayName(linkedDialogFile)"
    :file-type="linkedDialogFile.type ?? null"
    :filename-download="linkedDialogFile.filename_download ?? null"
    :file-reverse-links="props.fileReverseLinks"
    :download-format-presets="props.downloadFormatPresets"
    @close="linkedDialogOpen = false"
  />
</template>

<style scoped>
.add-existing-card {
  width: 860px;
  max-width: 96vw;
  font-family: var(--theme--fonts--sans--font-family);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--theme--foreground);
  padding: 20px 20px 0;
}

.title-icon {
  color: var(--theme--primary);
}

.title-count {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--theme--foreground-subdued);
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--theme--border-color);
  background: var(--theme--background-subdued);
}

.spacer {
  flex: 1;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--theme--foreground-subdued);
  padding: 4px;
  border-radius: var(--theme--border-radius);
  display: flex;
  align-items: center;
}

.close-btn:hover:not(:disabled) {
  color: var(--theme--foreground);
}

.card-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px;
  align-items: end;
}

.grid-wrap {
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-normal);
  max-height: 520px;
  overflow: auto;
  padding: 12px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.tile {
  appearance: none;
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-subdued);
  padding: 0;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s, transform 0.08s;
}

.tile:hover {
  border-color: var(--theme--primary);
  transform: translateY(-1px);
}

.tile.selected {
  border-color: var(--theme--primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme--primary) 20%, transparent);
}

.tile.linked {
  opacity: 0.85;
}

.thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--theme--background-normal);
  border-bottom: 1px solid var(--theme--border-color);
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme--foreground-subdued);
}

.badges-row {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.badges-left {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.badges-right {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  max-width: 100%;
}

.badge-selected {
  width: 22px;
  height: 22px;
  padding: 0;
  background: color-mix(in srgb, var(--theme--primary) 75%, black);
  border-color: rgba(255, 255, 255, 0.25);
}

.badge-linked {
  background: rgba(0, 0, 0, 0.45);
}

.badge-linked-clickable {
  cursor: pointer;
  user-select: none;
}

.badge-linked-clickable:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--theme--primary) 65%, transparent);
  outline-offset: 2px;
}

.badge-expired {
  gap: 8px;
  background: color-mix(in srgb, var(--theme--warning, #fd7e14) 30%, rgba(0, 0, 0, 0.45));
  border-color: rgba(255, 255, 255, 0.25);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

.meta {
  padding: 8px 10px;
}

.name {
  margin: 0;
  font-size: 12px;
  color: var(--theme--foreground);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.loading,
.empty,
.end {
  display: flex;
  justify-content: center;
  padding: 14px 10px 6px;
  color: var(--theme--foreground-subdued);
  font-size: 13px;
}

.notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--theme--border-radius);
  font-size: 13px;
  font-family: var(--theme--fonts--sans--font-family);
}

.notice-error {
  background: color-mix(in srgb, var(--theme--danger, #dc3545) 10%, transparent);
  color: var(--theme--danger, #dc3545);
  border: 1px solid color-mix(in srgb, var(--theme--danger, #dc3545) 30%, transparent);
}

.album-card {
  width: min(720px, 96vw);
  max-width: 96vw;
  font-family: var(--theme--fonts--sans--font-family);
}

.album-title {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px 0;
  font-weight: 800;
}

.album-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.album-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  align-items: center;
}

.album-label {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--theme--foreground-subdued);
}

.album-create {
  display: flex;
  gap: 10px;
  align-items: center;
}

.album-actions {
  display: flex;
  gap: 10px;
  padding: 0 20px 20px;
  align-items: center;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding: 0 20px 20px;
  align-items: center;
  flex-wrap: wrap;
}

.pagination {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}


.page-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--theme--border-color);
  background: var(--theme--background-normal);
  color: var(--theme--foreground);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.page-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--theme--primary) 45%, var(--theme--border-color));
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.page-btn.active {
  border-color: var(--theme--primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme--primary) 18%, transparent);
}

.per-page {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.per-page-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--theme--foreground-subdued);
  width: var(--webkit-fill-available, stretch) !important;
  margin-left: 8px;
}

.per-page :deep(.v-select) {
  width: 140px;
}

@media (max-width: 720px) {
  .toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
