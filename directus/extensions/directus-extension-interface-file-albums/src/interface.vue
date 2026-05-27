<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useApi, useStores } from "@directus/extensions-sdk";

type Album = { id: number | string; [key: string]: any };
type Junction = { id: number | string; [key: string]: any };
type TranslatableString = string | Record<string, string> | null | undefined;

const props = withDefaults(
  defineProps<{
    value?: any;
    collection: string;
    field: string;
    primaryKey?: string | number;
    disabled?: boolean;
    // Collection / field wiring
    albumCollection?: string;
    junctionCollection?: string;
    junctionAlbumField?: string;
    junctionFileField?: string;
    albumNameField?: string;
    // Translatable labels
    title?: TranslatableString;
    emptyMessage?: TranslatableString;
    removeButtonLabel?: TranslatableString;
    addButtonLabel?: TranslatableString;
    newAlbumPlaceholder?: TranslatableString;
    createButtonLabel?: TranslatableString;
    unknownAlbumLabel?: TranslatableString;
  }>(),
  {
    value: null,
    disabled: false,
    albumCollection: "albums",
    junctionCollection: "albums_directus_files",
    junctionAlbumField: "albums_id",
    junctionFileField: "directus_files_id",
    albumNameField: "name",
  },
);

const api = useApi();

// Resolve current UI locale from the Directus user store
const { useUserStore } = useStores();
const userStore = useUserStore();
const currentLocale = computed<string>(
  () => (userStore.currentUser as any)?.language ?? "en-US",
);

function t(value: TranslatableString, fallback: string): string {
  if (!value) return fallback;
  if (typeof value === "string") return value || fallback;
  const loc = currentLocale.value;
  return value[loc] ?? value["en-US"] ?? Object.values(value)[0] ?? fallback;
}

const labelTitle = computed(() => t(props.title, "Albums"));
const labelEmpty = computed(() =>
  t(props.emptyMessage, "This file is not in any albums."),
);
const labelRemove = computed(() => t(props.removeButtonLabel, "Remove"));
const labelAdd = computed(() => t(props.addButtonLabel, "Add"));
const labelPlaceholder = computed(() =>
  t(props.newAlbumPlaceholder, "New album name…"),
);
const labelCreate = computed(() => t(props.createButtonLabel, "Create + Add"));
const labelUnknown = computed(() =>
  t(props.unknownAlbumLabel, "(Unknown album)"),
);

const fileId = computed(() =>
  props.primaryKey == null ? "" : String(props.primaryKey),
);

const loading = ref(false);
const error = ref<string | null>(null);
const links = ref<Junction[]>([]);

const albumsLoading = ref(false);
const albums = ref<Album[]>([]);
const selectedAlbumId = ref<string>("");
const newAlbumName = ref("");

const linking = ref(false);
const creating = ref(false);

async function loadLinks() {
  if (!fileId.value) return;
  loading.value = true;
  error.value = null;
  const jc = props.junctionCollection;
  const fileField = props.junctionFileField;
  const albumField = props.junctionAlbumField;
  const nameField = props.albumNameField;
  try {
    const res = await api.get(`/items/${jc}`, {
      params: {
        filter: { [fileField]: { _eq: fileId.value } },
        fields: [
          "id",
          `${albumField}.id`,
          `${albumField}.${nameField}`,
          fileField,
        ],
        limit: -1,
      },
    });
    links.value = (res.data?.data ?? []) as Junction[];
  } catch (e: any) {
    error.value =
      e?.response?.data?.errors?.[0]?.message ?? "Failed to load albums.";
    links.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadAlbums() {
  albumsLoading.value = true;
  const ac = props.albumCollection;
  const nameField = props.albumNameField;
  try {
    const res = await api.get(`/items/${ac}`, {
      params: { limit: -1, sort: [nameField], fields: ["id", nameField] },
    });
    albums.value = (res.data?.data ?? []) as Album[];
    if (!selectedAlbumId.value && albums.value.length)
      selectedAlbumId.value = String(albums.value[0].id);
  } catch {
    albums.value = [];
  } finally {
    albumsLoading.value = false;
  }
}

async function addToAlbum() {
  if (!fileId.value || !selectedAlbumId.value) return;
  linking.value = true;
  const jc = props.junctionCollection;
  const albumField = props.junctionAlbumField;
  const fileField = props.junctionFileField;
  try {
    await api.post(`/items/${jc}`, {
      [albumField]: selectedAlbumId.value,
      [fileField]: fileId.value,
    });
    await loadLinks();
  } catch (e: any) {
    error.value =
      e?.response?.data?.errors?.[0]?.message ?? "Failed to add to album.";
  } finally {
    linking.value = false;
  }
}

async function removeLink(junctionId: string | number) {
  if (!junctionId) return;
  linking.value = true;
  const jc = props.junctionCollection;
  try {
    await api.delete(`/items/${jc}/${junctionId}`);
    await loadLinks();
  } catch (e: any) {
    error.value =
      e?.response?.data?.errors?.[0]?.message ?? "Failed to remove from album.";
  } finally {
    linking.value = false;
  }
}

async function createAlbumAndAdd() {
  const name = newAlbumName.value.trim();
  if (!name) return;
  creating.value = true;
  const ac = props.albumCollection;
  const nameField = props.albumNameField;
  try {
    const res = await api.post(`/items/${ac}`, { [nameField]: name });
    const created = res.data?.data as Album | undefined;
    await loadAlbums();
    if (created?.id != null) selectedAlbumId.value = String(created.id);
    newAlbumName.value = "";
    await addToAlbum();
  } catch (e: any) {
    error.value =
      e?.response?.data?.errors?.[0]?.message ?? "Failed to create album.";
  } finally {
    creating.value = false;
  }
}

watch(
  () => fileId.value,
  async () => {
    await loadLinks();
  },
);

onMounted(async () => {
  await Promise.all([loadAlbums(), loadLinks()]);
});
</script>

<template>
  <div class="panel">
    <div class="header">
      <div class="title">{{ labelTitle }}</div>
      <div class="subdued">
        {{ fileId ? `File: ${fileId}` : "No file selected" }}
      </div>
    </div>

    <div v-if="error" class="notice notice-error">
      <v-icon name="error" small />
      {{ error }}
    </div>

    <div v-if="loading" class="loading">
      <v-progress-circular indeterminate />
    </div>

    <div v-else class="current">
      <div v-if="links.length === 0" class="empty">{{ labelEmpty }}</div>
      <div v-else class="list">
        <div v-for="j in links" :key="String(j.id)" class="row">
          <div class="name">
            {{
              j[props.junctionAlbumField!] &&
              typeof j[props.junctionAlbumField!] === "object"
                ? j[props.junctionAlbumField!][props.albumNameField!]
                : j[props.junctionAlbumField!] == null
                  ? labelUnknown
                  : String(j[props.junctionAlbumField!])
            }}
          </div>
          <v-button
            small
            secondary
            :disabled="linking || props.disabled"
            @click="removeLink(j.id)"
          >
            {{ labelRemove }}
          </v-button>
        </div>
      </div>
    </div>

    <div class="actions">
      <div class="action-row">
        <v-select
          v-model="selectedAlbumId"
          :items="
            albums.map((a) => ({
              text: a[props.albumNameField!],
              value: String(a.id),
            }))
          "
          :disabled="albumsLoading || linking || props.disabled"
        />
        <v-button
          small
          :loading="linking"
          :disabled="!fileId || !selectedAlbumId || props.disabled"
          @click="addToAlbum"
        >
          {{ labelAdd }}
        </v-button>
      </div>

      <div class="action-row">
        <v-input
          :model-value="newAlbumName"
          :placeholder="labelPlaceholder"
          :disabled="creating || linking || props.disabled"
          @update:model-value="(v: unknown) => (newAlbumName = String(v ?? ''))"
        />
        <v-button
          small
          secondary
          :loading="creating"
          :disabled="!newAlbumName.trim() || !fileId || props.disabled"
          @click="createAlbumAndAdd"
        >
          {{ labelCreate }}
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
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
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
  background: color-mix(
    in srgb,
    var(--theme--danger, #dc3545) 10%,
    transparent
  );
  color: var(--theme--danger, #dc3545);
  border: 1px solid
    color-mix(in srgb, var(--theme--danger, #dc3545) 30%, transparent);
}
</style>
