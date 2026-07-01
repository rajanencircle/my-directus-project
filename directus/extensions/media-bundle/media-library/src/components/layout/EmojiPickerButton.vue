<script setup lang="ts">
import { onUnmounted } from 'vue'
import { EmojiButton } from '@joeattardi/emoji-button'

const emit = defineEmits<{ 'emoji-selected': [emoji: string] }>()

const picker = new EmojiButton({
  theme: 'auto',
  zIndex: 10000,
  position: 'bottom',
  emojisPerRow: 8,
})

picker.on('emoji', (event: { emoji: string }) => {
  emit('emoji-selected', event.emoji)
})

onUnmounted(() => picker.destroyPicker())

function toggle(e: MouseEvent) {
  picker.togglePicker(e.currentTarget as HTMLElement)
}
</script>

<template>
  <v-button x-small secondary icon class="emoji-btn" @click="toggle">
    <v-icon name="insert_emoticon" />
  </v-button>
</template>
