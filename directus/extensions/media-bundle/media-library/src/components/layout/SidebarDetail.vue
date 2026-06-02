<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  icon: string
  title: string
  startOpen?: boolean
}>()

const isOpen = ref(props.startOpen ?? false)
const sidebarCollapsed = ref(false)

function readCollapsed() {
  try {
    sidebarCollapsed.value = JSON.parse(localStorage.getItem('sidebar-collapsed') ?? 'false') === true
  } catch {
    sidebarCollapsed.value = false
  }
}

function expandSidebar() {
  const oldValue = localStorage.getItem('sidebar-collapsed')
  localStorage.setItem('sidebar-collapsed', 'false')
  sidebarCollapsed.value = false
  // @vueuse/core useLocalStorage only reacts to storage events that include storageArea
  try {
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'sidebar-collapsed',
      newValue: 'false',
      oldValue,
      storageArea: window.localStorage,
    }))
  } catch {}
}

function onStorage(e: StorageEvent) {
  if (e.key === 'sidebar-collapsed' && e.storageArea === window.localStorage) readCollapsed()
}

onMounted(() => {
  readCollapsed()
  window.addEventListener('storage', onStorage)
})

onUnmounted(() => {
  window.removeEventListener('storage', onStorage)
})

function toggle() {
  if (sidebarCollapsed.value) {
    expandSidebar()
    isOpen.value = true
  } else {
    isOpen.value = !isOpen.value
  }
}
</script>

<template>
  <div class="sidebar-detail">
    <button
      v-tooltip.left="sidebarCollapsed ? title : undefined"
      class="detail-trigger"
      :class="{ collapsed: sidebarCollapsed, open: isOpen && !sidebarCollapsed }"
      @click="toggle"
    >
      <v-icon class="trigger-icon" :name="icon" small />
      <span class="trigger-title">{{ title }}</span>
      <v-icon class="trigger-chevron" name="chevron_left" small />
    </button>
    <div v-if="isOpen && !sidebarCollapsed" class="detail-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.sidebar-detail {
  display: contents;
}

.detail-trigger {
  display: flex;
  align-items: center;
  block-size: 3.375rem;
  inline-size: 100%;
  padding-inline: 1rem 0.5rem;
  gap: 0.6875rem;
  background-color: var(--theme--sidebar--section--toggle--background);
  border: none;
  border-block-end: var(--theme--sidebar--section--toggle--border-width, 1px) solid
    var(--theme--sidebar--section--toggle--border-color, var(--theme--border-color-subdued));
  color: var(--theme--sidebar--section--toggle--foreground, var(--theme--foreground));
  cursor: pointer;
  text-align: start;
}

.detail-trigger:hover {
  background-color: var(--theme--sidebar--section--toggle--background-hover, var(--theme--background-subdued));
}

.trigger-icon {
  flex-shrink: 0;
}

.trigger-title {
  flex-grow: 1;
  font-size: 0.875rem;
  font-weight: 600;
  transition: opacity var(--fast) var(--transition);
  white-space: nowrap;
  overflow: hidden;
}

.detail-trigger.collapsed .trigger-title {
  opacity: 0;
}

.trigger-chevron {
  color: var(--theme--foreground-subdued);
  transform: rotate(0deg);
  transition: transform var(--fast) var(--transition), opacity var(--fast) var(--transition);
  flex-shrink: 0;
}

.detail-trigger.collapsed .trigger-chevron {
  opacity: 0;
}

.detail-trigger.open .trigger-chevron {
  transform: rotate(-90deg);
}

.detail-content {
  border-block-end: var(--theme--sidebar--section--toggle--border-width, 1px) solid
    var(--theme--sidebar--section--toggle--border-color, var(--theme--border-color-subdued));
  overflow-y: auto;
}
</style>
