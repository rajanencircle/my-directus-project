<template>
  <v-badge
    bottom
    right
    class="search-badge"
    :class="{ active, 'filter-active': filterActive }"
    :value="activeFilterCount"
    :disabled="!activeFilterCount || filterActive"
  >
    <div
      v-click-outside="{ handler: onClickOutside, disabled: !active && !filterActive }"
      class="search-wrapper"
      @focusout="onFocusOut"
    >
      <!-- The pill -->
      <div
        class="search-input show-filter"
        :class="{ active, 'has-content': !!modelValue, 'filter-active': filterActive, 'filter-border': filterActive }"
        role="search"
        @click="activate"
      >
        <v-icon small name="search" class="icon-search" :clickable="!active" @click="inputEl?.focus()" />

        <input
          ref="inputEl"
          :value="modelValue ?? ''"
          :placeholder="searchPlaceholder"
          type="search"
          spellcheck="false"
          autocomplete="off"
          :tabindex="!active && !modelValue ? -1 : undefined"
          @input="emitValue"
          @keydown.esc="disableAll"
          @focusin="activate"
        />

        <div class="spacer" />

        <v-icon
          v-if="modelValue"
          v-tooltip.bottom="searchClear"
          small
          clickable
          class="icon-clear"
          name="close"
          @click.stop="clear"
        />

        <v-icon
          v-tooltip.bottom="searchFilter"
          small
          clickable
          class="icon-filter"
          :class="{ 'filter-on': filterActive }"
          name="filter_list"
          @click.stop="toggleFilter"
        />
      </div>

      <!-- Filter dropdown — absolutely positioned below the pill, native style -->
      <transition
        name="filter-expand"
        @before-enter="filterBorder = true"
        @after-leave="filterBorder = false"
      >
        <div v-show="filterActive" ref="filterEl" class="filter-dropdown" :class="{ active }">
          <interface-system-filter
            class="filter-input"
            inline
            :value="filter ?? null"
            collection-name="directus_files"
            @input="onFilterInput"
          />
        </div>
      </transition>
    </div>
  </v-badge>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { isObject } from 'lodash'
import { useMediaSettings } from '../composables/useMediaSettings'
import { resolveTranslatable } from '../utils/translations'
import { useT } from '../composables/useT'

const props = defineProps<{
  modelValue: string | null
  filter?: Record<string, any> | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
  (e: 'update:filter', value: Record<string, any> | null): void
}>()

const { settings } = useMediaSettings()
const { t } = useT()
const searchPlaceholder = computed(() => resolveTranslatable(settings.value.search_placeholder, t, 'Search…'))
const searchClear = computed(() => resolveTranslatable(settings.value.search_clear, t, 'Clear'))
const searchFilter = computed(() => resolveTranslatable(settings.value.search_filter, t, 'Filter'))

const active = ref(false)
const filterActive = ref(false)
const filterBorder = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)
const filterEl = ref<HTMLElement | null>(null)

// Count active filter conditions (matches native logic)
const activeFilterCount = computed(() => {
  if (!props.filter) return 0
  const ops: string[] = []
  parseLevel(props.filter)
  return ops.length

  function parseLevel(level: Record<string, any>) {
    for (const [key, value] of Object.entries(level)) {
      if (key === '_and' || key === '_or') {
        ;(value as any[]).forEach(parseLevel)
      } else if (key.startsWith('_')) {
        ops.push(key)
      } else if (isObject(value)) {
        parseLevel(value as Record<string, any>)
      }
    }
  }
})

function activate() {
  active.value = true
  inputEl.value?.focus()
}

function disableSearch() {
  active.value = false
  inputEl.value?.blur()
}

function disableAll() {
  active.value = false
  filterActive.value = false
  inputEl.value?.blur()
}

function toggleFilter() {
  filterActive.value = !filterActive.value
  active.value = true
  if (!filterActive.value) inputEl.value?.focus()
}

function clear() {
  emit('update:modelValue', null)
  if (active.value) inputEl.value?.focus()
}

function emitValue() {
  emit('update:modelValue', inputEl.value?.value ?? null)
}

function onFilterInput(value: Record<string, any> | null) {
  emit('update:filter', value)
}

function onFocusOut(event: FocusEvent) {
  const wrapperEl = (event.currentTarget as HTMLElement)
  const related = event.relatedTarget as HTMLElement | null
  // Stay open when focus moves into a menu (v-select dropdowns, etc.)
  if (related?.closest('.v-menu-content')) return
  // Stay open when focus stays inside our wrapper
  if (related && wrapperEl?.contains(related)) return
  // Stay open while filter panel is open
  if (filterActive.value) return
  if (!props.modelValue) disableSearch()
}

function onClickOutside(event: any) {
  const path: HTMLElement[] = event.path || event.composedPath?.() || []
  // Don't close when clicking inside a v-menu/v-select dropdown
  if (path.some((el) => el?.classList?.contains('v-menu-content'))) return false
  disableAll()
  return true
}
</script>

<style scoped>
.search-badge {
  --v-badge-background-color: var(--theme--primary);
  --v-badge-offset-y: 0.4375rem;
  --v-badge-offset-x: 0.4375rem;
}

/* Wrapper is relative so the dropdown can be positioned absolutely */
.search-wrapper {
  position: relative;
}

.search-input {
  --button-size: 2rem;
  --input-size: calc(var(--button-size) - 2px * 2);
  --radius: calc(var(--button-size) / 2);

  box-sizing: content-box;
  display: flex;
  align-items: center;
  inline-size: calc(1rem * 2 + 0.375rem + 0.25rem + 0.4375rem);
  min-block-size: var(--input-size);
  overflow: hidden;
  border: var(--theme--border-width, 2px) solid var(--theme--form--field--input--border-color);
  border-radius: var(--radius);
  transition:
    inline-size var(--slow, 0.15s) var(--transition, ease),
    border-end-start-radius var(--fast, 0.1s) var(--transition, ease),
    border-end-end-radius var(--fast, 0.1s) var(--transition, ease);
  cursor: pointer;

  &:hover:not(.active):not(.filter-active) {
    border-color: var(--theme--form--field--input--border-color-hover);
  }

  &.active,
  &.has-content,
  &.filter-active {
    inline-size: 11.25rem;
    border-color: var(--theme--form--field--input--border-color-focus);
    cursor: default;

    input { opacity: 1; }
  }

  /* When filter panel is open, square off the bottom corners */
  &.filter-border {
    border-end-start-radius: 0;
    border-end-end-radius: 0;
  }

  input {
    width: 0;
    height: 100%;
    margin: 0;
    padding: 0;
    color: var(--theme--foreground);
    text-overflow: ellipsis;
    background-color: transparent;
    border: none;
    flex-grow: 1;
    opacity: 0;
    font-size: 14px;
    font-family: var(--theme--fonts--sans--font-family);
    transition: opacity var(--fast, 0.1s);

    &::placeholder { color: var(--theme--foreground-subdued); }
    &::-webkit-search-cancel-button { display: none; }
  }

  .spacer { flex-shrink: 0; width: 0.4375rem; }

  .icon-search {
    flex-shrink: 0;
    margin-inline: 0.375rem 0.25rem;
    --v-icon-color-hover: var(--theme--primary);
  }

  .icon-filter {
    flex-shrink: 0;
    margin-inline-end: 0.4375rem;
    --v-icon-color-hover: var(--theme--primary);

    &.filter-on { --v-icon-color: var(--theme--primary); }
  }

  .icon-clear {
    flex-shrink: 0;
    --v-icon-color: var(--theme--foreground-subdued);
    --v-icon-color-hover: var(--theme--danger);
    margin-inline-end: 0;
  }
}

/* Filter dropdown — native positioning */
.filter-dropdown {
  position: absolute;
  inset-block-start: 100%;
  inset-inline-end: 0;
  inline-size: auto;
  min-inline-size: 100%;
  z-index: 100;
  background-color: var(--theme--background-subdued);
  border: var(--theme--border-width, 2px) solid var(--theme--form--field--input--border-color);
  border-start-end-radius: 0;
  border-end-end-radius: var(--radius, 1rem);
  border-end-start-radius: var(--radius, 1rem);

  &.active {
    border-color: var(--theme--form--field--input--border-color-focus);
  }

  .filter-input {
    margin: 0.5625rem 0.4375rem;
  }
}

/* Transition matching native TransitionExpand behaviour */
.filter-expand-enter-active,
.filter-expand-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.filter-expand-enter-from,
.filter-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
