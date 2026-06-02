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
        @select="onFolderSelect"
      />
    </v-item-group>

    <!-- Albums section -->
    <template v-if="albumsStore.albums.length > 0 || albumsStore.isLoading">
      <v-divider />

      <v-list-item disabled class="albums-section-header">
        <v-list-item-content>
          <v-text-overflow :text="albumsSectionLabel" />
        </v-list-item-content>
      </v-list-item>

      <v-list-item v-if="albumsStore.isLoading">
        <v-progress-circular x-small indeterminate />
      </v-list-item>

      <v-list-item
        v-for="album in albumsStore.albums"
        v-else
        :key="album.id"
        clickable
        class="album-item"
        :active="albumsStore.selectedAlbumId === album.id"
        @click="onAlbumSelect(album.id)"
      >
        <v-list-item-icon>
          <v-icon name="photo_album" outline />
        </v-list-item-icon>
        <v-list-item-content>
          <v-text-overflow :text="album.name" />
        </v-list-item-content>
        <v-list-item-icon class="album-delete-btn" @click.stop="promptDeleteAlbum(album.id, album.name)">
          <v-icon v-tooltip="t('delete')" name="delete_outline" small />
        </v-list-item-icon>
      </v-list-item>
    </template>
  </v-list>

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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFoldersStore } from '../../stores/folders.store'
import { useFilesStore } from '../../stores/files.store'
import { useAlbumsStore } from '../../stores/albums.store'
import { useMediaSettings } from '../../composables/useMediaSettings'
import { resolveTranslatable } from '../../utils/translations'
import { useT } from '../../composables/useT'
import FolderTreeItem from './FolderTreeItem.vue'

const router = useRouter()
const route = useRoute()
const { t } = useT()
const foldersStore = useFoldersStore()
const filesStore = useFilesStore()
const albumsStore = useAlbumsStore()
const { settings, fetchSettings } = useMediaSettings()

const openFolders = ref<string[]>([])

const albumsSectionLabel = computed(() => resolveTranslatable(settings.value.albums_section_label, t, 'Albums'))

const deleteDialogOpen = ref(false)
const albumToDeleteId = ref<string | null>(null)
const albumToDeleteName = ref('')
const isDeleting = ref(false)

// If deleted album was selected, reset files to "all"
watch(deleteDialogOpen, (open) => {
  if (!open) {
    albumToDeleteId.value = null
    albumToDeleteName.value = ''
  }
})

const navItems = computed(() => [
  { id: 'all' as const, label: resolveTranslatable(settings.value.nav_all_files_label, t, 'All Files'), icon: 'folder_open' },
  { id: 'mine' as const, label: resolveTranslatable(settings.value.nav_my_files_label, t, 'My Files'), icon: 'folder_shared' },
  { id: 'recent' as const, label: resolveTranslatable(settings.value.nav_recent_label, t, 'Recent'), icon: 'history' },
])

onMounted(() => {
  if (foldersStore.folderTree.length === 0) {
    foldersStore.fetchFolders()
  }
  if (albumsStore.albums.length === 0) {
    albumsStore.fetchAlbums()
  }
  fetchSettings()
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
  navigateToLibrary()
}

async function onAlbumSelect(id: string) {
  foldersStore.selectFolder(null)
  albumsStore.selectAlbum(id)
  await filesStore.setAlbum(id)
  navigateToLibrary()
}

function promptDeleteAlbum(id: string, name: string) {
  albumToDeleteId.value = id
  albumToDeleteName.value = name
  deleteDialogOpen.value = true
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
</script>

<style scoped>
.albums-section-header {
  opacity: 0.6;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  pointer-events: none;
}

.album-item .album-delete-btn {
  opacity: 0;
  transition: opacity 0.15s;
  color: var(--theme--danger);
  cursor: pointer;
}

.album-item:hover .album-delete-btn {
  opacity: 1;
}
</style>
