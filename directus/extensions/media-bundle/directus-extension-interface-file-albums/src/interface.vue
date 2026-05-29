<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
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
    searchPlaceholder?: TranslatableString;
    unsavedPlaceholder?: TranslatableString;
    createOptionLabel?: TranslatableString;
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
const router = useRouter();

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
  t(props.emptyMessage, "Not in any albums yet."),
);
const labelPlaceholder = computed(() =>
  t(props.searchPlaceholder, "Search or create album…"),
);
const labelUnknown = computed(() =>
  t(props.unknownAlbumLabel, "(Unknown album)"),
);
const labelUnsaved = computed(() =>
  t(props.unsavedPlaceholder, "Save the file first…"),
);
const labelCreate = computed(() =>
  t(props.createOptionLabel, "Create"),
);

const fileId = computed(() =>
  props.primaryKey == null ? "" : String(props.primaryKey),
);

// ── Data ──────────────────────────────────────────────────────────────────────
const loading = ref(false);
const error = ref<string | null>(null);
const links = ref<Junction[]>([]);

const albumsLoading = ref(false);
const albums = ref<Album[]>([]);

const linking = ref(false);
const creating = ref(false);

// ── Combobox state ────────────────────────────────────────────────────────────
const searchQuery = ref("");
const showDropdown = ref(false);
const activeIndex = ref(-1);
const comboboxRef = ref<HTMLElement | null>(null);
// Prevents the searchQuery watcher from reopening the dropdown after a programmatic close
let _skipNextDropdownOpen = false;

// ── Derived ───────────────────────────────────────────────────────────────────
const currentAlbums = computed(() => {
  const af = props.junctionAlbumField!;
  const nf = props.albumNameField!;
  return links.value
    .map((j) => {
      const a = j[af];
      if (!a) return null;
      return typeof a === "object"
        ? ({ id: a.id, [nf]: a[nf] } as Album)
        : null;
    })
    .filter(Boolean) as Album[];
});

const currentAlbumIds = computed(
  () => new Set(currentAlbums.value.map((a) => String(a.id))),
);

const filteredAlbums = computed(() => {
  const q = (searchQuery.value ?? "").trim().toLowerCase();
  return albums.value
    .filter((a) => !currentAlbumIds.value.has(String(a.id)))
    .filter(
      (a) => !q || String(a[props.albumNameField!]).toLowerCase().includes(q),
    );
});

const canCreate = computed(() => {
  const q = (searchQuery.value ?? "").trim();
  if (!q) return false;
  const nf = props.albumNameField!;
  return !albums.value.some(
    (a) => String(a[nf]).toLowerCase() === q.toLowerCase(),
  );
});

const dropdownVisible = computed(
  () => showDropdown.value && (filteredAlbums.value.length > 0 || canCreate.value),
);

// ── API calls ─────────────────────────────────────────────────────────────────
async function loadLinks() {
  if (!fileId.value) return;
  loading.value = true;
  error.value = null;
  const { junctionCollection: jc, junctionFileField: ff, junctionAlbumField: af, albumNameField: nf } = props;
  try {
    const res = await api.get(`/items/${jc}`, {
      params: {
        filter: { [ff!]: { _eq: fileId.value } },
        fields: ["id", `${af}.id`, `${af}.${nf}`, ff],
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
  const { albumCollection: ac, albumNameField: nf } = props;
  try {
    const res = await api.get(`/items/${ac}`, {
      params: { limit: -1, sort: [nf], fields: ["id", nf] },
    });
    albums.value = (res.data?.data ?? []) as Album[];
  } catch {
    albums.value = [];
  } finally {
    albumsLoading.value = false;
  }
}

async function linkAlbum(albumId: string) {
  if (!fileId.value || !albumId) return;
  linking.value = true;
  const { junctionCollection: jc, junctionAlbumField: af, junctionFileField: ff } = props;
  try {
    await api.post(`/items/${jc}`, {
      [af!]: albumId,
      [ff!]: fileId.value,
    });
    await loadLinks();
  } catch (e: any) {
    error.value =
      e?.response?.data?.errors?.[0]?.message ?? "Failed to add to album.";
  } finally {
    linking.value = false;
  }
}

function navigateToAlbum(albumId: string | number) {
  router.push(`/content/${props.albumCollection}/${albumId}`);
}

async function removeLink(junctionId: string | number) {
  if (!junctionId) return;
  linking.value = true;
  try {
    await api.delete(`/items/${props.junctionCollection}/${junctionId}`);
    await loadLinks();
  } catch (e: any) {
    error.value =
      e?.response?.data?.errors?.[0]?.message ?? "Failed to remove from album.";
  } finally {
    linking.value = false;
  }
}

// ── Combobox actions ──────────────────────────────────────────────────────────
async function selectAlbum(album: Album) {
  closeDropdown();
  await linkAlbum(String(album.id));
}

async function createAndLink() {
  const name = searchQuery.value.trim();
  if (!name) return;
  creating.value = true;
  closeDropdown();
  const { albumCollection: ac, albumNameField: nf } = props;
  try {
    const res = await api.post(`/items/${ac}`, { [nf!]: name });
    const created = res.data?.data as Album | undefined;
    await loadAlbums();
    if (created?.id != null) await linkAlbum(String(created.id));
  } catch (e: any) {
    error.value =
      e?.response?.data?.errors?.[0]?.message ?? "Failed to create album.";
  } finally {
    creating.value = false;
  }
}

function openDropdown() {
  showDropdown.value = true;
  activeIndex.value = -1;
}

function closeDropdown() {
  _skipNextDropdownOpen = true;
  showDropdown.value = false;
  activeIndex.value = -1;
  searchQuery.value = "";
  nextTick(() => { _skipNextDropdownOpen = false; });
}

function handleEnter() {
  if (!dropdownVisible.value) return;
  const total = filteredAlbums.value.length;
  if (activeIndex.value >= 0 && activeIndex.value < total) {
    selectAlbum(filteredAlbums.value[activeIndex.value]!);
  } else if (activeIndex.value === total && canCreate.value) {
    createAndLink();
  } else if (canCreate.value) {
    createAndLink();
  } else if (total === 1) {
    selectAlbum(filteredAlbums.value[0]!);
  }
}

function moveSelection(dir: 1 | -1) {
  if (!dropdownVisible.value) {
    openDropdown();
    return;
  }
  const max = filteredAlbums.value.length + (canCreate.value ? 1 : 0) - 1;
  activeIndex.value = Math.max(-1, Math.min(max, activeIndex.value + dir));
}

function handleClickOutside(e: MouseEvent) {
  if (comboboxRef.value && !comboboxRef.value.contains(e.target as Node)) {
    showDropdown.value = false;
    activeIndex.value = -1;
  }
}

watch(searchQuery, (v) => {
  // v-input emits null when cleared; normalise to empty string
  if (v === null || v === undefined) {
    searchQuery.value = "";
    return;
  }
  if (_skipNextDropdownOpen) return;
  activeIndex.value = -1;
  showDropdown.value = true;
});

watch(
  () => fileId.value,
  async () => { await loadLinks(); },
);

onMounted(async () => {
  await Promise.all([loadAlbums(), loadLinks()]);
  document.addEventListener("mousedown", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", handleClickOutside);
});
</script>

<template>
  <div class="panel">
    <!-- Title -->
    <div class="section-title">{{ labelTitle }}</div>

    <!-- Error -->
    <div v-if="error" class="notice notice-error">
      <v-icon name="error" small />
      <span>{{ error }}</span>
      <button class="notice-dismiss" @click="error = null">
        <v-icon name="close" x-small />
      </button>
    </div>

    <!-- Combobox -->
    <div ref="comboboxRef" class="combobox">
      <v-input
        v-model="searchQuery"
        :placeholder="fileId ? labelPlaceholder : labelUnsaved"
        :disabled="albumsLoading || linking || creating || props.disabled || !fileId"
        @focus="openDropdown"
        @keydown.escape="closeDropdown"
        @keydown.enter.prevent="handleEnter"
        @keydown.down.prevent="moveSelection(1)"
        @keydown.up.prevent="moveSelection(-1)"
      >
        <template #prepend>
          <v-icon name="photo_album" />
        </template>
        <template #append>
          <v-progress-circular
            v-if="albumsLoading || linking || creating"
            indeterminate
            x-small
          />
          <v-icon
            v-else
            name="keyboard_arrow_down"
            class="caret"
            :class="{ open: dropdownVisible }"
          />
        </template>
      </v-input>

      <transition name="dropdown-fade">
        <div v-if="dropdownVisible" class="dropdown" role="listbox">
          <button
            v-for="(album, i) in filteredAlbums"
            :key="String(album.id)"
            class="dropdown-item"
            :class="{ active: activeIndex === i }"
            role="option"
            @mousedown.prevent="selectAlbum(album)"
            @mouseenter="activeIndex = i"
          >
            <v-icon name="photo_album" x-small />
            <span>{{ album[props.albumNameField!] }}</span>
          </button>

          <button
            v-if="canCreate"
            class="dropdown-item dropdown-create"
            :class="{ active: activeIndex === filteredAlbums.length }"
            role="option"
            @mousedown.prevent="createAndLink"
            @mouseenter="activeIndex = filteredAlbums.length"
          >
            <v-icon name="add" x-small />
            <span>{{ labelCreate }} <strong>"{{ (searchQuery ?? '').trim() }}"</strong></span>
          </button>
        </div>
      </transition>
    </div>

    <!-- Current albums as chips -->
    <div v-if="loading" class="loading">
      <v-progress-circular indeterminate x-small />
    </div>
    <template v-else>
      <div v-if="currentAlbums.length > 0" class="chips">
        <v-chip
          v-for="j in links"
          :key="String(j.id)"
          small
          label
          class="album-chip"
        >
          {{
            j[props.junctionAlbumField!] &&
            typeof j[props.junctionAlbumField!] === "object"
              ? j[props.junctionAlbumField!][props.albumNameField!]
              : j[props.junctionAlbumField!] == null
                ? labelUnknown
                : String(j[props.junctionAlbumField!])
          }}
          <button
            class="chip-action"
            title="Open album"
            @click.stop="navigateToAlbum(j[props.junctionAlbumField!]?.id ?? j[props.junctionAlbumField!])"
          >
            <v-icon name="open_in_new" x-small />
          </button>
          <button
            class="chip-action chip-remove"
            :disabled="linking || creating || props.disabled"
            @click.stop="removeLink(j.id)"
          >
            <v-icon name="close" x-small />
          </button>
        </v-chip>
      </div>
      <div v-else class="empty">{{ labelEmpty }}</div>
    </template>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-family: var(--theme--fonts--sans--font-family);
  font-size: var(--theme--form--field--input--font-size, 14px);
}

/* ── Section title ── */
.section-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--theme--foreground-subdued);
}

/* ── Error notice ── */
.notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--theme--border-radius);
  font-size: 13px;
}

.notice-error {
  background: color-mix(in srgb, var(--theme--danger) 10%, transparent);
  color: var(--theme--danger);
  border: 1px solid color-mix(in srgb, var(--theme--danger) 25%, transparent);
}

.notice-dismiss {
  margin-left: auto;
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: inherit;
  opacity: 0.6;
  transition: opacity var(--fast) var(--transition);
}
.notice-dismiss:hover { opacity: 1; }

/* ── Loading ── */
.loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--theme--foreground-subdued);
  font-size: 13px;
}

/* ── Empty ── */
.empty {
  color: var(--theme--foreground-subdued);
  font-size: 13px;
}

/* ── Chips ── */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.album-chip {
  --v-chip-color: var(--white);
  --v-chip-background-color: color-mix(in srgb, var(--theme--primary) 100%, transparent);
  --v-chip-border-color: color-mix(in srgb, var(--theme--primary) 100, transparent);
  gap: 8px;
  cursor: default;
}

.chip-action {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 1px;
  color: inherit;
  opacity: 0.6;
  transition: opacity var(--fast) var(--transition);
  border-radius: 2px;
}
.chip-action:hover { opacity: 1; }
.chip-remove:disabled { cursor: not-allowed; opacity: 0.25; }

/* ── Combobox ── */
.combobox { position: relative; }

.caret {
  transition: transform var(--fast) var(--transition);
  color: var(--theme--foreground-subdued);
}
.caret.open { transform: rotate(180deg); }

/* ── Dropdown ── */
.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 500;
  background: var(--theme--background-normal);
  border: 1px solid var(--theme--form--field--input--border-color, var(--theme--border-color));
  border-radius: var(--theme--border-radius);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  max-height: 240px;
  overflow-y: auto;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  background: none;
  border: none;
  text-align: left;
  font-family: var(--theme--fonts--sans--font-family);
  font-size: 13px;
  color: var(--theme--foreground);
  cursor: pointer;
  transition: background var(--fast) var(--transition);
}
.dropdown-item:hover,
.dropdown-item.active {
  background: var(--theme--background-subdued);
}

.dropdown-create {
  color: var(--theme--primary);
  border-top: 1px solid var(--theme--border-color);
}
.dropdown-create strong { font-weight: 700; }

/* ── Dropdown transition ── */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition:
    opacity var(--fast) var(--transition),
    transform var(--fast) var(--transition);
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
