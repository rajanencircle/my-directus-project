<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    expiryDate: string | null;
    title?: string | null;
    filename?: string | null;
  }>(),
  {
    title: null,
    filename: null,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

const displayName = computed(() => props.title || props.filename || 'This media');

const formattedDate = computed(() => {
  if (!props.expiryDate) return null;
  const d = new Date(props.expiryDate);
  if (Number.isNaN(d.getTime())) return props.expiryDate;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
});
</script>

<template>
  <v-dialog v-model="open" @update:model-value="(v: boolean) => !v && (open = false)">
    <v-card class="expiry-card">
      <v-card-title class="expiry-title">
        <v-icon name="warning" class="expiry-icon" />
        Don’t use expired media
      </v-card-title>

      <v-card-text class="expiry-body">
        <p class="line">
          <strong>{{ displayName }}</strong> has an expiry date
          <strong v-if="formattedDate">({{ formattedDate }})</strong>.
        </p>
        <p class="line muted">
          Please avoid using this image in content if the expiry date has passed.
        </p>
      </v-card-text>

      <v-card-actions class="expiry-actions">
        <v-button secondary @click="open = false">Close</v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.expiry-card {
  width: 520px;
  max-width: 92vw;
  font-family: var(--theme--fonts--sans--font-family);
}

.expiry-title {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 18px 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--theme--foreground);
}

.expiry-icon {
  color: var(--theme--warning, #fd7e14);
}

.expiry-body {
  padding: 10px 18px 6px;
  color: var(--theme--foreground);
  font-size: 14px;
}

.line {
  margin: 0 0 10px;
}

.muted {
  color: var(--theme--foreground-subdued);
}

.expiry-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 18px 18px;
}
</style>

