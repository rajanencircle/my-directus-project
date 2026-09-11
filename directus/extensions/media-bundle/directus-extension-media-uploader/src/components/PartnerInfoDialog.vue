<script setup lang="ts">
import { computed, inject } from 'vue';
import type { ComputedRef } from 'vue';
import { useT } from '../composables/useT';

type UploaderLabels = Record<string, string>;
const labels = inject<ComputedRef<UploaderLabels>>('uploaderLabels');
const lbl = (key: string, fallback: string) => labels?.value?.[key] ?? fallback;
const { t } = useT();

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    imageName?: string | null;
    uploadedBy?: string | null;
    uploadedDate?: string | null;
    partnerName?: string | null;
  }>(),
  {
    imageName: null,
    uploadedBy: null,
    uploadedDate: null,
    partnerName: null,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

const rows = computed(() => [
  {
    label: lbl('partnerInfoImageName', 'Image name'),
    value: props.imageName?.trim() || '—',
  },
  {
    label: lbl('partnerInfoUploadedBy', 'Uploaded by'),
    value: props.uploadedBy?.trim() || '—',
  },
  {
    label: lbl('partnerInfoUploadedDate', 'Uploaded date'),
    value: props.uploadedDate?.trim() || '—',
  },
  {
    label: lbl('partnerInfoPartnerName', 'Partner name'),
    value: props.partnerName?.trim() || '—',
  },
]);
</script>

<template>
  <v-dialog v-model="open" @update:model-value="(v: boolean) => !v && (open = false)">
    <v-card class="partner-info-card">
      <v-card-title class="partner-info-title">
        <v-icon name="info" class="partner-info-icon" />
        {{ lbl('partnerInfoTitle', 'Media info') }}
      </v-card-title>

      <v-card-text class="partner-info-body">
        <dl class="info-list">
          <div v-for="row in rows" :key="row.label" class="info-row">
            <dt>{{ row.label }}</dt>
            <dd :title="row.value">{{ row.value }}</dd>
          </div>
        </dl>
      </v-card-text>

      <v-card-actions class="partner-info-actions">
        <v-button secondary @click="open = false">{{ t('done') }}</v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.partner-info-card {
  width: 480px;
  max-width: 92vw;
  font-family: var(--theme--fonts--sans--font-family);
}

.partner-info-title {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 18px 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--theme--foreground);
}

.partner-info-icon {
  color: var(--theme--primary);
}

.partner-info-body {
  padding: 12px 18px 6px;
  color: var(--theme--foreground);
  font-size: 14px;
}

.info-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.info-row dt {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--theme--foreground-subdued);
}

.info-row dd {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  word-break: break-word;
  color: var(--theme--foreground);
  font-weight: 500;
}

.partner-info-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 18px 18px;
}
</style>
