<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  label: string;
  required?: boolean;
}>();

const displayLabel = computed(() => props.label.toLocaleUpperCase());
</script>

<template>
  <div class="field-label type-label">
    <div class="field-name">
      <div class="field-label-content">
        <v-text-overflow :text="displayLabel" />
        <v-icon v-if="required" class="required" sup name="star" filled />
      </div>
    </div>
  </div>
</template>

<style scoped>
.field-label {
  position: relative;
  display: flex;
  color: var(--theme--foreground-accent);
  font-size: 0.875rem;
  font-weight: var(--theme--form--field--label--font-weight, 600);
  font-family: var(--theme--form--field--label--font-family);
  font-style: normal;
  line-height: 1.2143;
}

.field-name {
  display: flex;
  width: 100%;
  min-width: 0;
  text-align: start;
}

.field-label-content {
  display: inline;
  min-width: 0;
}

@media (width >= 54rem) {
  .field-label-content {
    display: contents;
  }
}

.required {
  --v-icon-color: var(--theme--primary);
  margin-inline-start: 0.1875rem;
}
</style>
