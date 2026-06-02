<template>
  <v-dialog v-model="dialogActive" @esc="cancel" @apply="addFolder">
    <template #activator="{ on }">
      <v-button v-tooltip.bottom="t('create_folder')" rounded icon small secondary @click="on">
        <v-icon small name="create_new_folder" outline />
      </v-button>
    </template>

    <v-card>
      <v-card-title>{{ t('create_folder') }}</v-card-title>
      <v-card-text>
        <v-input
          v-model="newFolderName"
          autofocus
          :placeholder="t('folder_name')"
          @keydown.enter="addFolder"
        />
      </v-card-text>
      <v-card-actions>
        <v-button secondary @click="cancel">{{ t('cancel') }}</v-button>
        <v-button :disabled="!newFolderName.trim()" :loading="saving" @click="addFolder">{{ t('save') }}</v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@directus/extensions-sdk'
import { useT } from '../composables/useT'
import { useFoldersStore } from '../stores/folders.store'

const props = defineProps<{
  parent?: string | null
}>()

const api = useApi()
const { t } = useT()
const foldersStore = useFoldersStore()

const dialogActive = ref(false)
const saving = ref(false)
const newFolderName = ref('')

async function addFolder() {
  if (!newFolderName.value.trim() || saving.value) return
  saving.value = true
  try {
    await api.post('/folders', {
      name: newFolderName.value.trim(),
      parent: props.parent ?? null,
    })
    await foldersStore.fetchFolders()
    cancel()
  } catch (err) {
    console.error('[media-library] Create folder failed:', err)
  } finally {
    saving.value = false
  }
}

function cancel() {
  dialogActive.value = false
  newFolderName.value = ''
}
</script>
