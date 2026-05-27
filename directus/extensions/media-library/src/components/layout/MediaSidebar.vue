<template>
  <v-list nav>
    <!-- Quick filter items -->
    <v-list-item
      v-for="item in navItems"
      :key="item.id"
      clickable
      :active="filesStore.activeFilter === item.id && foldersStore.selectedFolderId === null"
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
          <v-text-overflow text="No folders yet" />
        </v-list-item-content>
      </v-list-item>

      <FolderTreeItem
        v-for="node in foldersStore.folderTree"
        :key="node.id"
        :node="node"
        :depth="0"
        :selected-id="foldersStore.selectedFolderId"
        @select="onFolderSelect"
      />
    </v-item-group>
  </v-list>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFoldersStore } from '../../stores/folders.store'
import { useFilesStore } from '../../stores/files.store'
import FolderTreeItem from './FolderTreeItem.vue'

const router = useRouter()
const route = useRoute()
const foldersStore = useFoldersStore()
const filesStore = useFilesStore()
const openFolders = ref<string[]>([])

const navItems = [
  { id: 'all' as const, label: 'All Files', icon: 'folder_open' },
  { id: 'mine' as const, label: 'My Files', icon: 'folder_shared' },
  { id: 'recent' as const, label: 'Recent', icon: 'history' },
]

onMounted(() => {
  if (foldersStore.folderTree.length === 0) {
    foldersStore.fetchFolders()
  }
})

function navigateToLibrary() {
  if (route.path !== '/media-library') {
    router.push('/media-library')
  }
}

function selectFilter(filter: 'all' | 'mine' | 'recent') {
  foldersStore.selectFolder(null)
  filesStore.setFilter(filter)
  navigateToLibrary()
}

function onFolderSelect(id: string) {
  foldersStore.selectFolder(id)
  filesStore.setFolder(id)
  navigateToLibrary()
}
</script>
