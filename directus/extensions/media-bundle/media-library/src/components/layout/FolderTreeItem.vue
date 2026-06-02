<template>
  <!-- Folder with children: collapsible group -->
  <v-list-group
    v-if="node.children.length > 0"
    :value="node.id"
    scope="media-library-nav"
    arrow-placement="after"
    clickable
    disable-groupable-parent
    :active="node.id === selectedId"
    @click="emit('select', node.id)"
  >
    <template #activator>
      <v-list-item-icon>
        <v-icon name="folder" outline />
      </v-list-item-icon>
      <v-list-item-content>
        <v-text-overflow :text="node.name" />
      </v-list-item-content>
    </template>

    <FolderTreeItem
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :depth="depth + 1"
      :selected-id="selectedId"
      @select="(id) => emit('select', id)"
    />
  </v-list-group>

  <!-- Leaf folder: simple item -->
  <v-list-item
    v-else
    clickable
    :active="node.id === selectedId"
    @click="emit('select', node.id)"
  >
    <v-list-item-icon>
      <v-icon name="folder" outline />
    </v-list-item-icon>
    <v-list-item-content>
      <v-text-overflow :text="node.name" />
    </v-list-item-content>
  </v-list-item>
</template>

<script setup lang="ts">
import type { FolderNode } from '../../stores/folders.store'

defineProps<{
  node: FolderNode
  depth: number
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
}>()
</script>
