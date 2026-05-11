<template>
  <div class="language-selector">
    <button
      v-for="lang in languages"
      :key="lang.code"
      class="lang-btn"
      :class="{ active: modelValue === lang.code }"
      @click="$emit('update:modelValue', lang.code)"
    >
      {{ lang.name }}
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import type { Language } from '../types';

export default defineComponent({
  name: 'LanguageSelector',
  props: {
    modelValue: { type: String, required: true },
    languages: { type: Array as PropType<Language[]>, default: () => [] },
  },
  emits: ['update:modelValue'],
});
</script>

<style scoped>
.language-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 0;
}

.lang-btn {
  padding: 4px 14px;
  border-radius: 20px;
  border: 2px solid var(--theme--border-color, #e0e0e0);
  background: transparent;
  color: var(--theme--foreground, #1a1a1a);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  font-family: inherit;
  white-space: nowrap;
}

.lang-btn:hover {
  border-color: var(--theme--primary, #6644ff);
  color: var(--theme--primary, #6644ff);
}

.lang-btn.active {
  background: var(--theme--primary, #6644ff);
  border-color: var(--theme--primary, #6644ff);
  color: #fff;
}
</style>
