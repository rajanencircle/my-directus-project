<template>
  <v-list nav>
    <!-- Quick filter items -->
    <v-list-item
      v-for="item in navItems"
      :key="item.id"
      clickable
      :active="filesStore.activeFilter === item.id && foldersStore.selectedFolderId === null && albumsStore.selectedAlbumId === null"
      @click="selectFilter(item.id)"
    >
      <v-list-item-icon>
        <v-icon :name="item.icon" outline />
      </v-list-item-icon>
      <v-list-item-content>
        <v-text-overflow :text="item.label" />
      </v-list-item-content>
    </v-list-item>

    <v-divider />

    <!-- Loading state -->
    <v-list-item v-if="foldersStore.isLoading">
      <v-progress-circular x-small indeterminate />
    </v-list-item>

    <!-- Folder tree -->
    <v-item-group
      v-else
      v-model="openFolders"
      scope="media-library-nav"
      multiple
    >
      <v-list-item v-if="foldersStore.folderTree.length === 0" disabled>
        <v-list-item-content>
          <v-text-overflow :text="t('no_items')" />
        </v-list-item-content>
      </v-list-item>

      <FolderTreeItem
        v-for="node in foldersStore.folderTree"
        :key="node.id"
        :node="node"
        :depth="0"
        :selected-id="albumsStore.selectedAlbumId === null ? foldersStore.selectedFolderId : null"
        :downloading-folder-ids="downloadingFolderIds"
        @select="onFolderSelect"
        @rename="onFolderRename"
        @move="onFolderMove"
        @download="openFolderDownload"
        @delete="onFolderDelete"
      />
    </v-item-group>

    <!-- Albums section -->
    <v-divider />

    <v-list-item class="albums-section-header">
      <v-list-item-content>
        <v-text-overflow :text="albumsSectionLabel" />
      </v-list-item-content>
      <v-list-item-icon class="add-album-btn" @click.stop="createDialogOpen = true">
       Add <v-icon v-tooltip="'Create Album'" name="add" small />
      </v-list-item-icon>
    </v-list-item>

    <v-list-item v-if="albumsStore.isLoading">
      <v-progress-circular x-small indeterminate />
    </v-list-item>

    <template v-else>
      <v-list-item v-if="albumsStore.albums.length === 0" disabled>
        <v-list-item-content>
          <v-text-overflow :text="t('no_items')" />
        </v-list-item-content>
      </v-list-item>

      <AlbumListItem
        v-for="album in albumsStore.albums"
        :key="album.id"
        :album="album"
        :selected-id="albumsStore.selectedAlbumId"
        :downloading-album-ids="downloadingAlbumIds"
        @select="onAlbumSelect"
        @rename="onAlbumRename"
        @download="openAlbumDownload"
        @delete="onAlbumDelete"
      />
    </template>
  </v-list>

  <!-- Create album dialog -->
  <v-dialog v-model="createDialogOpen" @esc="createDialogOpen = false">
    <v-card>
      <v-card-title>Create Album</v-card-title>
      <v-card-text>
        <v-input v-model="newAlbumName" placeholder="Album name" autofocus @keydown.enter="confirmCreateAlbum" />
      </v-card-text>
      <v-card-actions>
        <v-button secondary @click="createDialogOpen = false">{{ t('cancel') }}</v-button>
        <v-button :disabled="!newAlbumName.trim()" :loading="isCreating" @click="confirmCreateAlbum">
          <v-icon name="add" left />
          Create
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Delete album confirmation dialog -->
  <v-dialog v-model="deleteDialogOpen" @esc="deleteDialogOpen = false">
    <v-card>
      <v-card-title>{{ t('delete_item', { count: 1 }) }}</v-card-title>
      <v-card-text>
        <v-notice type="danger">
          <strong>{{ albumToDeleteName }}</strong> {{ t('action_cannot_be_undone') }}
        </v-notice>
      </v-card-text>
      <v-card-actions>
        <v-button secondary @click="deleteDialogOpen = false">{{ t('cancel') }}</v-button>
        <v-button kind="danger" :loading="isDeleting" @click="confirmDeleteAlbum">
          <v-icon name="delete" left />
          {{ t('delete') }}
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Album download notices -->
  <v-dialog v-model="downloadNoticeOpen" @esc="downloadNoticeOpen = false">
    <v-card>
      <v-card-title>{{ t('download') }}</v-card-title>
      <v-card-text>
        <v-notice :type="downloadNoticeType">{{ downloadNoticeMessage }}</v-notice>
      </v-card-text>
      <v-card-actions>
        <v-button @click="downloadNoticeOpen = false">{{ t('done') }}</v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Rename folder -->
  <v-dialog v-model="renameDialogOpen" @esc="renameDialogOpen = false">
    <v-card class="folder-action-dialog">
      <v-card-title>Rename Folder</v-card-title>
      <v-card-text>
        <FolderActionSummary
          v-if="folderActionTarget"
          label="Renaming folder"
          :folder-name="folderActionTarget.name"
          :folder-path="folderActionPath"
          :folder-stats="folderActionStats"
          bordered
        />
        <div class="folder-action-field">
          <p class="folder-action-section-label">New name</p>
          <v-input
            v-model="renameFolderName"
            autofocus
            :placeholder="t('folder_name')"
            @keydown.enter="confirmRenameFolder"
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-button secondary :disabled="folderActionLoading" @click="renameDialogOpen = false">
          {{ t('cancel') }}
        </v-button>
        <v-button
          :disabled="!renameFolderName.trim()"
          :loading="folderActionLoading"
          @click="confirmRenameFolder"
        >
          {{ t('save') }}
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Rename album -->
  <v-dialog v-model="renameAlbumDialogOpen" @esc="renameAlbumDialogOpen = false">
    <v-card>
      <v-card-title>Rename Album</v-card-title>
      <v-card-text>
        <v-input
          v-model="renameAlbumName"
          autofocus
          placeholder="Album name"
          @keydown.enter="confirmRenameAlbum"
        />
      </v-card-text>
      <v-card-actions>
        <v-button secondary :disabled="albumActionLoading" @click="renameAlbumDialogOpen = false">
          {{ t('cancel') }}
        </v-button>
        <v-button
          :disabled="!renameAlbumName.trim()"
          :loading="albumActionLoading"
          @click="confirmRenameAlbum"
        >
          {{ t('save') }}
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Move folder -->
  <v-dialog v-model="moveDialogOpen" @esc="moveDialogOpen = false">
    <v-card class="folder-action-dialog">
      <v-card-title>Move to Folder</v-card-title>
      <v-card-text>
        <FolderActionSummary
          v-if="folderActionTarget"
          label="Moving folder"
          :folder-name="folderActionTarget.name"
          :folder-path="folderActionPath"
          :folder-stats="folderActionStats"
          bordered
        />

        <div class="folder-action-field">
          <p class="folder-action-section-label">Destination</p>
          <FolderDropdown
            v-model="moveTargetFolderId"
            :exclude-id="folderActionTarget?.id ?? null"
            :exclude-ids="moveExcludeIds"
            show-stats
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-button secondary :disabled="folderActionLoading" @click="moveDialogOpen = false">
          {{ t('cancel') }}
        </v-button>
        <v-button :loading="folderActionLoading" @click="confirmMoveFolder">
          {{ t('move') }}
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Delete folder (native options) -->
  <DeleteFolderDialog
    ref="deleteFolderDialogRef"
    v-model="deleteFolderDialogOpen"
    :folder-name="folderActionTarget?.name"
    :folder-path="folderActionPath"
    :folder-stats="folderActionStats"
    :parent-folder-name="folderActionParentName"
    @confirm="confirmDeleteFolder"
  />

  <DownloadModal
    v-model="downloadModalOpen"
    mode="zip"
    :files="downloadModalFiles"
    :zip-base-name="downloadZipBaseName"
    :labels="downloadModalLabels"
    :on-zip-download="handleZipDownload"
  />

</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useApi } from '@directus/extensions-sdk'
import { useFoldersStore } from '../../stores/folders.store'
import { useFilesStore } from '../../stores/files.store'
import { useAlbumsStore } from '../../stores/albums.store'
import { useMediaSettings } from '../../composables/useMediaSettings'
import { usePartnerScope } from '../../composables/usePartnerScope'
import { resolveTranslatable } from '../../utils/translations'
import { useT } from '../../composables/useT'
import type { DownloadChoice, DownloadModalFile } from '../../utils/downloadVariants'
import { buildDownloadModalLabels } from '../../utils/downloadModalLabels'
import { downloadAlbumAsZip, fetchAlbumDownloadFiles } from '../../utils/albumDownload'
import { downloadFolderAsZip, fetchFolderDownloadFiles } from '../../utils/folderDownload'
import type { SaveTarget } from '../../utils/zipDownloadShared'
import {
  collectDescendantFolderIds,
  moveAndDeleteFolder,
  recursiveDeleteFolder,
} from '../../utils/deleteFolder'
import {
  fetchDirectFolderFileCounts,
  formatFolderStats,
  getFolderStats,
} from '../../utils/folderStats'
import type { FolderNode } from '../../stores/folders.store'
import type { DirectusAlbum } from '../../stores/albums.store'
import FolderTreeItem from './FolderTreeItem.vue'
import AlbumListItem from './AlbumListItem.vue'
import FolderActionSummary from './FolderActionSummary.vue'
import FolderDropdown from '../upload/FolderDropdown.vue'
import DeleteFolderDialog, { type FolderDeleteMode } from './DeleteFolderDialog.vue'
import DownloadModal from '../download/DownloadModal.vue'

const router = useRouter()
const route = useRoute()
const api = useApi()
const { t } = useT()
const foldersStore = useFoldersStore()
const filesStore = useFilesStore()
const albumsStore = useAlbumsStore()
const { settings, fetchSettings } = useMediaSettings()

const openFolders = ref<string[]>([])

const albumsSectionLabel = computed(() => resolveTranslatable(settings.value.albums_section_label, t, 'Albums'))

const downloadModalOpen = ref(false)
const downloadModalFiles = ref<DownloadModalFile[]>([])
const downloadTarget = ref<
	| { kind: 'folder'; node: FolderNode }
	| { kind: 'album'; album: DirectusAlbum }
	| null
>(null)

const downloadZipBaseName = computed(() => {
	const target = downloadTarget.value
	if (!target) return 'download'
	return target.kind === 'folder' ? target.node.name : target.album.name
})

const downloadModalLabels = computed(() =>
	buildDownloadModalLabels(t, settings.value as Record<string, string>),
)

const createDialogOpen = ref(false)
const newAlbumName = ref('')
const isCreating = ref(false)

const deleteDialogOpen = ref(false)
const albumToDeleteId = ref<string | null>(null)
const albumToDeleteName = ref('')
const isDeleting = ref(false)

const albumActionTarget = ref<DirectusAlbum | null>(null)
const albumActionLoading = ref(false)
const renameAlbumDialogOpen = ref(false)
const renameAlbumName = ref('')

const downloadingAlbumIds = ref<string[]>([])
const downloadNoticeOpen = ref(false)
const downloadNoticeType = ref<'info' | 'danger'>('info')
const downloadNoticeMessage = ref('')

// ── Folder context-menu actions ──────────────────────────────────────────────
const folderActionTarget = ref<FolderNode | null>(null)
const folderActionLoading = ref(false)

const renameDialogOpen = ref(false)
const renameFolderName = ref('')

const moveDialogOpen = ref(false)
const moveTargetFolderId = ref<string | null>(null)
const folderActionStats = ref('')
const moveExcludeIds = computed(() => {
  if (!folderActionTarget.value) return [] as string[]
  return collectDescendantFolderIds(
    foldersStore.flatFolders.map((f) => ({ id: f.id, parent: f.parent })),
    [folderActionTarget.value.id],
  )
})

const folderActionPath = computed(() => {
  if (!folderActionTarget.value) return ''
  const crumbs = foldersStore.getBreadcrumbs(folderActionTarget.value.parent)
  if (!crumbs.length) return 'File Library'
  return ['File Library', ...crumbs.map((c) => c.name)].join(' / ')
})

const folderActionParentName = computed(() => {
  if (!folderActionTarget.value) return 'File Library'
  return foldersStore.getFolderName(folderActionTarget.value.parent)
})

async function loadFolderActionStats(node: FolderNode) {
  folderActionStats.value = ''
  try {
    const counts = await fetchDirectFolderFileCounts(api)
    const stats = getFolderStats(
      node.id,
      foldersStore.flatFolders.map((f) => ({ id: f.id, parent: f.parent })),
      counts,
    )
    folderActionStats.value = formatFolderStats(stats)
  } catch {
    folderActionStats.value = ''
  }
}

const deleteFolderDialogOpen = ref(false)
/** Per-folder download in progress — allows parallel downloads on other folders */
const downloadingFolderIds = ref<string[]>([])

function addDownloadingFolder(id: string) {
  if (!downloadingFolderIds.value.includes(id)) {
    downloadingFolderIds.value = [...downloadingFolderIds.value, id]
  }
}

function removeDownloadingFolder(id: string) {
  downloadingFolderIds.value = downloadingFolderIds.value.filter((folderId) => folderId !== id)
}

function addDownloadingAlbum(id: string) {
  if (!downloadingAlbumIds.value.includes(id)) {
    downloadingAlbumIds.value = [...downloadingAlbumIds.value, id]
  }
}

function removeDownloadingAlbum(id: string) {
  downloadingAlbumIds.value = downloadingAlbumIds.value.filter((albumId) => albumId !== id)
}

const deleteFolderDialogRef = ref<{ setSaving: (v: boolean) => void } | null>(null)

// If deleted album was selected, reset files to "all"
watch(deleteDialogOpen, (open) => {
  if (!open) {
    albumToDeleteId.value = null
    albumToDeleteName.value = ''
  }
})

const { isPartnerScoped, partnerScopeIds, init: initPartnerScope } = usePartnerScope()

const downloadPartnerScopeId = computed(() =>
	isPartnerScoped.value ? partnerScopeIds.value : null,
)

const navItems = computed(() => {
  const items: Array<{ id: 'all' | 'mine' | 'recent'; label: string; icon: string }> = [
    { id: 'all', label: resolveTranslatable(settings.value.nav_all_files_label, t, 'All Files'), icon: 'folder_open' },
  ]
  if (!isPartnerScoped.value) {
    items.push({ id: 'mine', label: resolveTranslatable(settings.value.nav_my_files_label, t, 'My Files'), icon: 'folder_shared' })
  }
  items.push({ id: 'recent', label: resolveTranslatable(settings.value.nav_recent_label, t, 'Recent'), icon: 'history' })
  return items
})

onMounted(async () => {
  await initPartnerScope()
  await Promise.all([foldersStore.fetchFolders(), albumsStore.fetchAlbums(), fetchSettings()])
})

function navigateToLibrary() {
  if (route.path !== '/media-library') {
    router.push('/media-library')
  }
}

function selectFilter(filter: 'all' | 'mine' | 'recent') {
  albumsStore.selectAlbum(null)
  foldersStore.selectFolder(null)
  filesStore.setFilter(filter)
  navigateToLibrary()
}

function onFolderSelect(id: string) {
  albumsStore.selectAlbum(null)
  foldersStore.selectFolder(id)
  filesStore.setFolder(id)
  const target = `/media-library/folders/${id}`
  if (route.path !== target) {
    router.push(target)
  }
}

async function onAlbumSelect(id: string) {
  foldersStore.selectFolder(null)
  albumsStore.selectAlbum(id)
  await filesStore.setAlbum(id)
  const target = `/media-library/albums/${id}`
  if (route.path !== target) {
    router.push(target)
  }
}

async function confirmCreateAlbum() {
  if (!newAlbumName.value.trim()) return
  isCreating.value = true
  try {
    await albumsStore.createAlbum(newAlbumName.value.trim())
    createDialogOpen.value = false
    newAlbumName.value = ''
  } catch (err) {
    console.warn('[media-library] Failed to create album:', err)
  } finally {
    isCreating.value = false
  }
}

function onAlbumRename(album: DirectusAlbum) {
  albumActionTarget.value = album
  renameAlbumName.value = album.name
  renameAlbumDialogOpen.value = true
}

function onAlbumDelete(album: DirectusAlbum) {
  albumToDeleteId.value = album.id
  albumToDeleteName.value = album.name
  deleteDialogOpen.value = true
}

async function confirmRenameAlbum() {
  if (!albumActionTarget.value || !renameAlbumName.value.trim() || albumActionLoading.value) return
  albumActionLoading.value = true
  try {
    await albumsStore.renameAlbum(albumActionTarget.value.id, renameAlbumName.value.trim())
    renameAlbumDialogOpen.value = false
  } catch (err) {
    console.error('[media-library] Rename album failed:', err)
    showDownloadNotice('danger', 'Failed to rename album.')
  } finally {
    albumActionLoading.value = false
  }
}

async function confirmDeleteAlbum() {
  if (!albumToDeleteId.value) return
  isDeleting.value = true
  try {
    const wasSelected = albumsStore.selectedAlbumId === albumToDeleteId.value
    await albumsStore.deleteAlbum(albumToDeleteId.value)
    deleteDialogOpen.value = false
    if (wasSelected) {
      filesStore.setFilter('all')
      navigateToLibrary()
    }
  } finally {
    isDeleting.value = false
  }
}

function showDownloadNotice(type: 'info' | 'danger', message: string) {
  downloadNoticeType.value = type
  downloadNoticeMessage.value = message
  downloadNoticeOpen.value = true
}

function openAlbumDownload(album: DirectusAlbum) {
  if (downloadingAlbumIds.value.includes(album.id)) return
  downloadTarget.value = { kind: 'album', album }
  void prepareZipDownload(async () =>
    fetchAlbumDownloadFiles(api, album.id, downloadPartnerScopeId.value),
  )
}

function openFolderDownload(node: FolderNode) {
  if (downloadingFolderIds.value.includes(node.id)) return
  downloadTarget.value = { kind: 'folder', node }
  void prepareZipDownload(async () =>
    fetchFolderDownloadFiles(
      api,
      node.id,
      foldersStore.flatFolders.map((f) => ({ id: f.id, parent: f.parent })),
      downloadPartnerScopeId.value,
    ),
  )
}

async function prepareZipDownload(loadFiles: () => Promise<DownloadModalFile[]>) {
  downloadModalFiles.value = []
  try {
    const files = await loadFiles()
    if (!files.length) {
      downloadTarget.value = null
      showDownloadNotice('info', 'There are no files to download.')
      return
    }
    downloadModalFiles.value = files
    downloadModalOpen.value = true
  } catch (err) {
    console.error('[media-library] Failed to load download files:', err)
    downloadTarget.value = null
    showDownloadNotice('danger', 'Could not load files for download.')
  }
}

async function handleZipDownload(choice: DownloadChoice, saveTarget: SaveTarget) {
  const target = downloadTarget.value
  if (!target) return
  const folderId = target.kind === 'folder' ? target.node.id : null
  const albumId = target.kind === 'album' ? target.album.id : null
  if (folderId) addDownloadingFolder(folderId)
  if (albumId) addDownloadingAlbum(albumId)
  try {
    if (target.kind === 'album') {
      const result = await downloadAlbumAsZip(
        api,
        target.album.id,
        target.album.name,
        choice,
        saveTarget,
        downloadPartnerScopeId.value,
      )
      if (!result.ok && result.reason === 'empty') {
        showDownloadNotice('info', 'This album has no files to download.')
        return
      } else if (!result.ok) {
        showDownloadNotice('danger', 'Album download failed. Please try again.')
        throw new Error('Album download failed')
      }
    } else {
      const result = await downloadFolderAsZip(
        api,
        target.node.id,
        target.node.name,
        foldersStore.flatFolders.map((f) => ({ id: f.id, parent: f.parent, name: f.name })),
        choice,
        saveTarget,
        downloadPartnerScopeId.value,
      )
      if (!result.ok && result.reason === 'empty') {
        showDownloadNotice('info', 'This folder has no files to download.')
        return
      } else if (!result.ok) {
        showDownloadNotice('danger', 'Folder download failed. Please try again.')
        throw new Error('Folder download failed')
      }
    }
  } finally {
    if (folderId) removeDownloadingFolder(folderId)
    if (albumId) removeDownloadingAlbum(albumId)
    downloadTarget.value = null
  }
}

function onFolderRename(node: FolderNode) {
  folderActionTarget.value = node
  renameFolderName.value = node.name
  renameDialogOpen.value = true
  loadFolderActionStats(node)
}

function onFolderMove(node: FolderNode) {
  folderActionTarget.value = node
  moveTargetFolderId.value = node.parent
  moveDialogOpen.value = true
  loadFolderActionStats(node)
}

function onFolderDelete(node: FolderNode) {
  folderActionTarget.value = node
  deleteFolderDialogOpen.value = true
  loadFolderActionStats(node)
}

async function confirmRenameFolder() {
  if (!folderActionTarget.value || !renameFolderName.value.trim() || folderActionLoading.value) return
  folderActionLoading.value = true
  try {
    await foldersStore.renameFolder(folderActionTarget.value.id, renameFolderName.value.trim())
    renameDialogOpen.value = false
  } catch (err) {
    console.error('[media-library] Rename folder failed:', err)
    showDownloadNotice('danger', 'Failed to rename folder.')
  } finally {
    folderActionLoading.value = false
  }
}

async function confirmMoveFolder() {
  if (!folderActionTarget.value || folderActionLoading.value) return
  const target = moveTargetFolderId.value
  if (target && moveExcludeIds.value.includes(target)) {
    showDownloadNotice('danger', 'Cannot move a folder into itself or a child folder.')
    return
  }
  folderActionLoading.value = true
  try {
    await foldersStore.moveFolder(folderActionTarget.value.id, target)
    moveDialogOpen.value = false
    if (target) openFolders.value = Array.from(new Set([...openFolders.value, target]))
  } catch (err) {
    console.error('[media-library] Move folder failed:', err)
    showDownloadNotice('danger', 'Failed to move folder.')
  } finally {
    folderActionLoading.value = false
  }
}

async function confirmDeleteFolder(mode: FolderDeleteMode) {
  const node = folderActionTarget.value
  if (!node) return
  deleteFolderDialogRef.value?.setSaving(true)
  try {
    const folderRef = { id: node.id, parent: node.parent }
    const flat = foldersStore.flatFolders.map((f) => ({ id: f.id, parent: f.parent }))
    if (mode === 'move') {
      await moveAndDeleteFolder(api, folderRef)
    } else {
      await recursiveDeleteFolder(api, folderRef, flat)
    }

    const wasSelected =
      foldersStore.selectedFolderId === node.id ||
      collectDescendantFolderIds(flat, [node.id]).includes(foldersStore.selectedFolderId ?? '')

    await foldersStore.fetchFolders({ force: true })
    deleteFolderDialogOpen.value = false

    if (wasSelected) {
      foldersStore.selectFolder(null)
      filesStore.setFilter('all')
      navigateToLibrary()
    } else if (filesStore.activeFilter === 'all') {
      await filesStore.fetchFiles()
    }
  } catch (err) {
    console.error('[media-library] Delete folder failed:', err)
    showDownloadNotice('danger', 'Failed to delete folder.')
  } finally {
    deleteFolderDialogRef.value?.setSaving(false)
  }
}
</script>

<style scoped>
.albums-section-header {
  opacity: 0.6;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  pointer-events: none;
}

.albums-section-header .add-album-btn {
  display: flex;
  align-items: center;
  pointer-events: all;
  opacity: 1;
  color: var(--theme--primary);
  cursor: pointer;
  -webkit-text-stroke: 0.5px currentColor;
  color: var(--theme-background);
  gap: 5px;
}

.folder-action-dialog :deep(.v-card-text) {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.folder-action-section-label {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--theme--foreground-subdued);
}

.folder-action-field {
  display: flex;
  flex-direction: column;
}
</style>
