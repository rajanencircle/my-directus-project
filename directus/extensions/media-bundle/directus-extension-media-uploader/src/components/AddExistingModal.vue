<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from "vue";
import type { ComputedRef } from "vue";
import { useApi } from "@directus/extensions-sdk";
import { useT } from "../composables/useT";
import { partnerAlbumOrFilter, filesPartnerOrFilter, usePartnerScope } from "../../../media-library/src/composables/usePartnerScope";
import {
  partnerAccentStyleForList,
  partnerLabelListFromRelation,
  partnerVisuallyListFromRelation,
  userDisplayName,
} from "../../../media-library/src/utils/partnerAccent";

type UploaderLabels = Record<string, string>
const labels = inject<ComputedRef<UploaderLabels>>('uploaderLabels')
const lbl = (key: string, fallback: string) => labels?.value?.[key] ?? fallback
const { t } = useT()
import FolderDropdown from "./FolderDropdown.vue";
import ExpiryInfoDialog from "./ExpiryInfoDialog.vue";
import PartnerInfoDialog from "./PartnerInfoDialog.vue";
import { isExpired } from "../utils/expiry.js";
import {
  extractJunctionFileId,
  parseFileReverseLinks,
  type AnyRecord,
} from "../utils/fileReverseLinks.js";
import LinkedCollectionsDialog from "./LinkedCollectionsDialog.vue";
import FileThumbPreview from "./FileThumbPreview.vue";
type ID = string | number;

interface DirectusFile {
  id: string;
  title: string | null;
  filename_download: string;
  type: string | null;
  expiry_date?: string | null;
  draft_status?: string | null;
  created_on?: string | null;
  uploaded_on?: string | null;
  modified_on?: string | null;
  generated_filename?: string | null;
  description?: string | null;
  copyright?: string | null;
  uploaded_by?: unknown;
  /** M2M — this file's own partner scope. Empty/absent = visible to all partners. */
  partner_selected?: unknown;
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
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "linked", fileIds: string[]): void;
}>();

const api = useApi();
const { viewerScope, isPartnerScoped, init: initPartnerScope } = usePartnerScope();

const loading = ref(false);
const linking = ref(false);
const loadError = ref<string | null>(null);

const search = ref("");
const selectedFolder = ref<string | null>(props.defaultFolder);

const perPage = ref<number>(25);
const page = ref<number>(1);
const total = ref<number | null>(null);
const files = ref<DirectusFile[]>([]);

const selectedIds = ref<Set<string>>(new Set());

const expiryDialogOpen = ref(false);
const expiryDialogFile = ref<DirectusFile | null>(null);
const partnerInfoOpen = ref(false);
const partnerInfoFile = ref<DirectusFile | null>(null);

const linkedDialogOpen = ref(false);
const linkedDialogFile = ref<DirectusFile | null>(null);

type Album = { id: number | string; name: string };
const albumDialogOpen = ref(false);
const albumsLoading = ref(false);
const albumsError = ref<string | null>(null);
const albums = ref<Album[]>([]);
const selectedAlbumId = ref<string>("");
const creatingAlbum = ref(false);
const newAlbumName = ref("");
const albumLinking = ref(false);

function openExpiryInfo(file: DirectusFile) {
  expiryDialogFile.value = file;
  expiryDialogOpen.value = true;
}

function openPartnerInfo(file: DirectusFile) {
  partnerInfoFile.value = file;
  partnerInfoOpen.value = true;
}

function partnerInfoImageName(file: DirectusFile | null): string {
  if (!file) return "";
  return (
    file.generated_filename?.trim() ||
    file.title?.trim() ||
    file.filename_download?.trim() ||
    ""
  );
}

function partnerInfoUploadedBy(file: DirectusFile | null): string {
  return userDisplayName(file?.uploaded_by) || "";
}

function partnerInfoPartnerName(file: DirectusFile | null): string {
  const labels = partnerLabelListFromRelation(file?.partner_selected);
  return labels.length > 0 ? labels.join(", ") : "All partners";
}

function partnerInfoUploadedDate(file: DirectusFile | null): string {
  const iso = file?.uploaded_on ?? file?.created_on ?? null;
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function openLinkedCollections(file: DirectusFile) {
  linkedDialogFile.value = file;
  linkedDialogOpen.value = true;
}

async function loadAlbums() {
  albumsLoading.value = true;
  albumsError.value = null;
  try {
    await initPartnerScope();
    const params: Record<string, unknown> = { limit: -1, sort: ["name"], fields: ["id", "name"] };
    if (isPartnerScoped.value) {
      params.filter = partnerAlbumOrFilter(viewerScope.value);
    }
    const res = await api.get("/items/albums_directus", { params });
    albums.value = (res.data?.data ?? []) as Album[];
    if (!selectedAlbumId.value && albums.value.length)
      selectedAlbumId.value = String(albums.value[0].id);
  } catch (e: any) {
    albumsError.value =
      e?.response?.data?.errors?.[0]?.message ?? "Failed to load albums.";
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
    const res = await api.post("/items/albums_directus", { name });
    const created = res.data?.data as Album | undefined;
    await loadAlbums();
    if (created?.id != null) selectedAlbumId.value = String(created.id);
    newAlbumName.value = "";
  } catch (e: any) {
    albumsError.value =
      e?.response?.data?.errors?.[0]?.message ?? "Failed to create album.";
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
        await api.post("/items/albums_directus", {
          albums_id: albumId,
          directus_files_id: String(fileId),
        });
      } catch {
        // Ignore duplicates or per-item errors.
      }
    }
    albumDialogOpen.value = false;
  } catch (e: any) {
    albumsError.value =
      e?.response?.data?.errors?.[0]?.message ??
      "Failed to add files to album.";
  } finally {
    albumLinking.value = false;
  }
}

const acceptTypes = computed(() => {
  const types = props.allowedTypes;
  if (!types || types === "*/*") return [];
  return types
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
});

function matchesAllowedTypes(file: DirectusFile): boolean {
  if (!acceptTypes.value.length) return true;
  const mime = file.type ?? "";
  return acceptTypes.value.some((pattern) => {
    if (pattern === "*/*") return true;
    if (pattern.endsWith("/*")) {
      const group = pattern.split("/")[0];
      return mime.startsWith(`${group}/`);
    }
    return mime === pattern;
  });
}

const visibleFiles = computed(() => files.value.filter(matchesAllowedTypes));

const selectedCount = computed(() => selectedIds.value.size);

const linkedAnywhereMap = ref<Record<string, boolean>>({});
const linkedLoading = ref(false);

const reverseLinkRules = computed(() =>
  parseFileReverseLinks(props.fileReverseLinks),
);

function isLinkedAnywhere(fileId: string): boolean {
  return linkedAnywhereMap.value[String(fileId)] === true;
}

function displayName(file: DirectusFile): string {
  return file.generated_filename?.trim() || "";
}

function filePartnerAccent(file: DirectusFile) {
  return partnerAccentStyleForList(partnerVisuallyListFromRelation(file.partner_selected));
}

function fileDescription(file: DirectusFile): string {
  return file.description?.trim() || "";
}

function fileCopyright(file: DirectusFile): string {
  const c = file.copyright?.trim() || "";
  if (!c) return "";
  return c.replace(/^©+\s*/, "").trim();
}

function hasFileCopyright(file: DirectusFile): boolean {
  return fileCopyright(file).length > 0;
}

function fileCreateIso(file: DirectusFile): string | null {
  return file.created_on ?? file.uploaded_on ?? null;
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? "1 day ago" : `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.round(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
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
  { text: "25", value: 25 },
  { text: "50", value: 50 },
  { text: "100", value: 100 },
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
    await initPartnerScope();
    const filterClauses: Record<string, unknown>[] = [];

    if (isPartnerScoped.value) {
      filterClauses.push(filesPartnerOrFilter(viewerScope.value));
    }

    const q = search.value.trim();
    if (q) {
      filterClauses.push({
        _or: [
          { title: { _icontains: q } },
          { filename_download: { _icontains: q } },
          { generated_filename: { _icontains: q } },
          { description: { _icontains: q } },
          { copyright: { _icontains: q } },
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
      fields: [
        "id",
        "title",
        "filename_download",
        "generated_filename",
        "description",
        "copyright",
        "type",
        "expiry_date",
        "draft_status",
        "created_on",
        "uploaded_on",
        "modified_on",
        "uploaded_by.id",
        "uploaded_by.first_name",
        "uploaded_by.last_name",
        "uploaded_by.email",
        "uploaded_by.partner_selected.partner_id.id",
        "uploaded_by.partner_selected.partner_id.visually",
        "uploaded_by.partner_selected.partner_id.label",
        "partner_selected.partner_id.id",
        "partner_selected.partner_id.visually",
        "partner_selected.partner_id.label",
      ],
      sort: ["-uploaded_on"],
      limit: perPage.value,
      offset: offset.value,
      meta: "filter_count",
    };

    if (filter) params.filter = filter;

    const res = await api.get("/files", { params });
    const batch: DirectusFile[] = (res.data?.data ?? []).map((f: any) => ({
      ...f,
      id: String(f.id),
    }));

    files.value = batch;
    // Reset + refetch linked status lazily for the current page results.
    linkedAnywhereMap.value = {};
    void loadLinkedStatusForFiles(batch.map((f) => String(f.id)));

    const metaCount = res.data?.meta?.filter_count;
    if (typeof metaCount === "number") {
      total.value = metaCount;
    } else {
      // Fallback: aggregate count
      try {
        const countRes = await api.get("/files", {
          params: {
            aggregate: { count: "*" },
            filter,
          },
        });
        const cnt = countRes.data?.data?.[0]?.count;
        total.value = typeof cnt === "number" ? cnt : Number(cnt ?? 0);
      } catch {
        total.value = null;
      }
    }
  } catch (e: any) {
    loadError.value =
      e?.response?.data?.errors?.[0]?.message ?? "Failed to load files.";
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
              fields: ["id", fileField],
              limit: -1,
            },
          });
          return { rule, rows: (res.data?.data ?? []) as AnyRecord[] };
        } catch {
          return { rule, rows: [] as AnyRecord[] };
        }
      }),
    );

    const next: Record<string, boolean> = {};
    for (const { rule, rows } of perRule) {
      const fileField = rule.file_field?.trim?.() ?? "";
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
    emit("linked", toStage);
  } catch (e) {
    // Keep modal open so user can retry
    console.error("[media-uploader] Add existing link error:", e);
  } finally {
    linking.value = false;
  }
}

function handleClose() {
  emit("close");
}

watch(
  () => [search.value, selectedFolder.value],
  () => {
    resetResults();
    fetchPage();
  },
);

watch(
  () => perPage.value,
  () => {
    page.value = 1;
    fetchPage();
  },
);

watch(
  () => page.value,
  () => {
    fetchPage();
  },
);

onMounted(() => {
  selectedFolder.value = props.defaultFolder;
  fetchPage();
});
</script>

<template>
  <v-dialog
    :model-value="true"
    @update:model-value="(v: boolean) => !v && handleClose()"
    persistent
  >
    <v-card class="add-existing-card">
      <v-card-title class="card-title">
        <v-icon name="collections" class="title-icon" />
        {{ lbl('addExistingTitle', 'Add Existing') }}
        <span class="title-count" v-if="selectedCount > 0"
          >{{ selectedCount }} {{ t('selected') }}</span
        >
        <div class="spacer" />
        <button
          class="close-btn"
          type="button"
          @click="handleClose"
          :disabled="linking"
        >
          <v-icon name="close" small />
        </button>
      </v-card-title>

      <v-card-text class="card-body">
        <div class="toolbar">
          <v-input
            class="search"
            :model-value="search"
            :placeholder="lbl('addSearchPlaceholder', 'Search media…')"
            @update:model-value="(v: unknown) => (search = String(v ?? ''))"
          >
            <template #prepend>
              <v-icon name="search" small />
            </template>
            <template #append>
              <v-icon
                v-if="search"
                name="close"
                small
                clickable
                @click.stop="search = ''"
              />
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
            <button
              v-for="file in visibleFiles"
              :key="file.id"
              type="button"
              class="tile"
              :class="{
                selected: selectedIds.has(file.id),
                linked:
                  alreadyLinkedFileIds.includes(file.id) ||
                  isLinkedAnywhere(file.id),
              }"
              :title="displayName(file)"
              @click="toggleSelect(file.id)"
            >
              <div
                class="media-shell"
                :class="{ 'has-partner-accent': !!filePartnerAccent(file) }"
                :style="filePartnerAccent(file)"
              >
                <div class="thumb">
                  <FileThumbPreview
                    class="thumb-preview"
                    :file-id="file.id"
                    :mime-type="file.type"
                    :filename="file.filename_download"
                    :alt="displayName(file)"
                    :modified-on="file.modified_on"
                    :show-kind-badge="false"
                  />
                  <div class="badges-row">
                    <div class="badges-left">
                      <button
                        v-if="filePartnerAccent(file)"
                        type="button"
                        class="partner-info-btn"
                        title="Media info"
                        @click.stop="openPartnerInfo(file)"
                      >
                        <v-icon name="info" filled small />
                      </button>
                      <span
                        v-if="
                          alreadyLinkedFileIds.includes(file.id) &&
                          !isLinkedAnywhere(file.id)
                        "
                        class="badge badge-linked"
                      >
                        {{ lbl('badgeLinked', 'Linked') }}
                      </span>
                      <span
                        v-else-if="isLinkedAnywhere(file.id)"
                        class="badge badge-linked badge-linked-clickable"
                        role="button"
                        tabindex="0"
                        :title="linkedLoading ? t('loading') : t('view_linked_collections')"
                        @click.stop="openLinkedCollections(file)"
                        @keydown.enter.stop="openLinkedCollections(file)"
                        @keydown.space.prevent.stop="openLinkedCollections(file)"
                      >
                        {{ lbl('badgeLinked', 'Linked') }}
                      </span>
                      <span
                        v-if="file.draft_status === 'draft'"
                        class="badge badge-draft"
                      >
                        {{ lbl('badgeDraft', 'Draft') }}
                      </span>
                    </div>

                    <div class="badges-right">
                      <span
                        v-if="isExpired(file.expiry_date)"
                        class="badge badge-expired"
                        role="button"
                        tabindex="0"
                        :title="lbl('whyExpired', 'Why is this expired?')"
                        @click.stop="openExpiryInfo(file)"
                        @keydown.enter.stop="openExpiryInfo(file)"
                        @keydown.space.prevent.stop="openExpiryInfo(file)"
                      >
                        {{ lbl('badgeExpired', "Don't use") }}
                      </span>
                      <span
                        v-if="selectedIds.has(file.id)"
                        class="badge badge-selected"
                      >
                        <v-icon name="check" x-small />
                      </span>
                    </div>
                  </div>
                </div>

                <div class="card-footer">
                  <div class="card-meta">
                    <p
                      class="meta-primary"
                      :class="{ 'is-empty': !displayName(file) }"
                      :title="displayName(file) || undefined"
                    >
                      <span class="meta-primary-text">{{
                        displayName(file) || '\u00a0'
                      }}</span>
                    </p>
                    <p
                      v-if="fileDescription(file)"
                      class="meta-line"
                      :title="fileDescription(file)"
                    >
                      {{ fileDescription(file) }}
                    </p>
                    <div
                      v-if="
                        hasFileCopyright(file) ||
                        formatRelativeTime(fileCreateIso(file))
                      "
                      class="meta-footer"
                      :class="{
                        'meta-footer--time-only': !hasFileCopyright(file),
                      }"
                    >
                      <span
                        v-if="hasFileCopyright(file)"
                        class="meta-copyright"
                        :title="`© ${fileCopyright(file)}`"
                      >
                        © {{ fileCopyright(file) }}
                      </span>
                      <span
                        v-else-if="formatRelativeTime(fileCreateIso(file))"
                        class="meta-copyright-spacer"
                      />
                      <span
                        v-if="formatRelativeTime(fileCreateIso(file))"
                        class="meta-time"
                      >
                        <v-icon name="schedule" x-small />
                        {{ formatRelativeTime(fileCreateIso(file)) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div v-if="loading" class="loading">
            <v-progress-circular indeterminate />
          </div>
          <div v-else-if="!visibleFiles.length" class="empty">
            {{ lbl('addNoFiles', 'No files found.') }}
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="card-actions">
        <div class="pagination">
          <button
            class="page-btn"
            type="button"
            :disabled="page <= 1"
            @click="goToPage(page - 1)"
          >
            ‹
          </button>
          <button
            v-for="p in pageButtons"
            :key="p"
            class="page-btn"
            type="button"
            :class="{ active: p === page }"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
          <button
            class="page-btn"
            type="button"
            :disabled="page >= pageCount"
            @click="goToPage(page + 1)"
          >
            ›
          </button>
        </div>

        <div class="per-page">
          <div class="per-page-label">{{ lbl('addPerPage', 'Per page') }}</div>
          <v-select
            v-model="perPage"
            :items="perPageItems"
            :disabled="loading"
          />
        </div>

        <div class="spacer" />

        <v-button
          secondary
          :disabled="selectedCount === 0"
          @click="openAlbumDialog"
        >
          {{ lbl('addToAlbum', 'Add to album') }}
        </v-button>
        <v-button secondary :disabled="linking" @click="handleClose">{{ t('cancel') }}</v-button>
        <v-button
          :disabled="selectedCount === 0"
          :loading="linking"
          @click="linkSelected"
        >
          {{ t('add') }} {{ selectedCount || "" }}
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    :model-value="albumDialogOpen"
    @update:model-value="(v: boolean) => (albumDialogOpen = v)"
    persistent
  >
    <v-card class="album-card">
      <v-card-title class="album-title">
        <v-icon name="collections" />
        {{ lbl('addToAlbum', 'Add to album') }}
        <div class="spacer" />
        <button
          class="close-btn"
          type="button"
          @click="albumDialogOpen = false"
          :disabled="albumLinking || creatingAlbum"
        >
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
            <div class="album-label">{{ lbl('albumLabel', 'Album') }}</div>
            <v-select
              v-model="selectedAlbumId"
              :items="
                albums.map((a) => ({ text: a.name, value: String(a.id) }))
              "
              :disabled="albumLinking || creatingAlbum"
            />
          </div>

          <div class="album-row">
            <div class="album-label">{{ lbl('albumCreateNew', 'Create new') }}</div>
            <div class="album-create">
              <v-input
                :model-value="newAlbumName"
                :placeholder="lbl('albumNamePlaceholder', 'New album name…')"
                @update:model-value="
                  (v: unknown) => (newAlbumName = String(v ?? ''))
                "
              />
              <v-button
                :loading="creatingAlbum"
                :disabled="!newAlbumName.trim() || albumLinking"
                @click="createAlbum"
              >
                {{ lbl('albumCreateBtn', 'Create') }}
              </v-button>
            </div>
          </div>
        </template>
      </v-card-text>
      <v-card-actions class="album-actions">
        <div class="muted">{{ selectedCount }} {{ t('selected') }}</div>
        <div class="spacer" />
        <v-button
          secondary
          :disabled="albumLinking || creatingAlbum"
          @click="albumDialogOpen = false"
          >{{ t('cancel') }}</v-button
        >
        <v-button
          :loading="albumLinking"
          :disabled="!selectedAlbumId || selectedCount === 0"
          @click="addSelectedToAlbum"
        >
          {{ lbl('addToAlbum', 'Add to album') }}
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <ExpiryInfoDialog
    v-model="expiryDialogOpen"
    :expiry-date="expiryDialogFile?.expiry_date ?? null"
    :title="expiryDialogFile?.title ?? null"
    :filename="expiryDialogFile?.filename_download ?? null"
  />

  <PartnerInfoDialog
    v-model="partnerInfoOpen"
    :image-name="partnerInfoImageName(partnerInfoFile)"
    :uploaded-by="partnerInfoUploadedBy(partnerInfoFile)"
    :uploaded-date="partnerInfoUploadedDate(partnerInfoFile)"
    :partner-name="partnerInfoPartnerName(partnerInfoFile)"
  />

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
  width: 920px;
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
  align-items: center;
}

.toolbar .search,
.toolbar .folder {
  min-width: 0;
}

.toolbar .search :deep(.input),
.toolbar .folder :deep(.trigger) {
  min-height: 40px;
}

.grid-wrap {
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-normal);
  min-height: 320px;
  max-height: 560px;
  overflow: auto;
  padding: 16px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 18px;
  align-items: stretch;
}

.tile {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: var(--theme--fonts--sans--font-family);
  outline: none;
}

.media-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  flex: 1;
  min-height: 100%;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
  background: var(--theme--background);
}

.media-shell.has-partner-accent .meta-footer {
  border-top-color: var(--partner-accent);
}

.media-shell.has-partner-accent .meta-footer--time-only {
  padding-top: 6px;
  border-top: 1px solid var(--partner-accent);
}

.partner-info-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  padding: 0;
  border-radius: 8px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--partner-accent) 35%, #fff);
  color: var(--partner-accent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14);
  cursor: pointer;
  outline: none;
  --v-icon-size: 20px;
  --v-icon-color: var(--partner-accent);
}

.partner-info-btn :deep(.v-icon),
.partner-info-btn :deep(i) {
  font-variation-settings: 'FILL' 1;
  font-weight: 600;
}

.partner-info-btn:hover,
.partner-info-btn:focus-visible {
  background: color-mix(in srgb, var(--partner-accent) 12%, #fff);
}

.tile.selected .media-shell {
  border-color: var(--theme--primary);
}

.tile.linked .media-shell {
  opacity: 0.92;
}

.tile:focus-visible .media-shell {
  outline: 2px solid color-mix(in srgb, var(--theme--primary) 35%, transparent);
  outline-offset: 2px;
}

.thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--theme--background-subdued);
  flex-shrink: 0;
}

.thumb-preview {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: center center;
  transition: transform 0.55s ease;
  will-change: transform;
}

.tile:hover .thumb-preview {
  transform: scale(1.045);
}

.badges-row {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  z-index: 2;
}

.badges-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.badges-right {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: 28px;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  max-width: 100%;
  white-space: nowrap;
}

.badge-selected {
  width: 28px;
  height: 28px;
  min-height: 28px;
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
  min-height: 28px;
  color: var(--theme--danger, #dc3545);
  background: #fff;
  border-color: color-mix(in srgb, var(--theme--danger, #dc3545) 25%, #fff);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

.badge-draft {
  background: color-mix(in srgb, #A2B5CD 60%, rgba(0, 0, 0, 0.4));
  border-color: rgba(255, 255, 255, 0.25);
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
}

.card-footer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 12px 14px 13px;
  background: var(--theme--background);
  border: none;
  border-top: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
  width: 100%;
}

.meta-primary {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  min-width: 0;
  min-height: calc(13px * 1.35);
  font-size: 13px;
  font-weight: 600;
  color: var(--theme--foreground);
  line-height: 1.35;
}

.meta-primary.is-empty {
  visibility: hidden;
  pointer-events: none;
  user-select: none;
}

.meta-primary-text {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.meta-secondary {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 11px;
  font-weight: 500;
  color: var(--theme--foreground-subdued);
  line-height: 1.3;
}

.meta-line {
  margin: 0;
  font-size: 11px;
  font-weight: 400;
  color: var(--theme--foreground-subdued);
  line-height: 1.35;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.meta-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
}

.meta-footer--time-only {
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 0;
  border-top: none;
}

.meta-copyright {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 10px;
  color: var(--theme--foreground-subdued);
}

.meta-copyright-spacer {
  flex: 1;
  min-width: 0;
}

.meta-time {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  margin-left: auto;
  font-size: 10px;
  color: var(--theme--foreground-subdued);
  white-space: nowrap;
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
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 14px 10px;
  color: var(--theme--foreground-subdued);
  font-size: 13px;
  box-sizing: border-box;
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
  background: color-mix(
    in srgb,
    var(--theme--danger, #dc3545) 10%,
    transparent
  );
  color: var(--theme--danger, #dc3545);
  border: 1px solid
    color-mix(in srgb, var(--theme--danger, #dc3545) 30%, transparent);
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
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
  min-height: 64px;
  padding: 16px 20px;
  box-sizing: border-box;
  border-top: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
  background: var(--theme--background);
}

.card-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
  min-height: 64px;
  padding: 16px 20px;
  box-sizing: border-box;
  border-top: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
  background: var(--theme--background);
}

.card-actions :deep(.v-button) {
  width: auto;
  flex: 0 0 auto;
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
  border-color: color-mix(
    in srgb,
    var(--theme--primary) 45%,
    var(--theme--border-color)
  );
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.page-btn.active {
  border-color: var(--theme--primary);
  box-shadow: 0 0 0 2px
    color-mix(in srgb, var(--theme--primary) 18%, transparent);
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
