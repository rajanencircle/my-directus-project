<template>
  <v-drawer
    v-model="internalActive"
    :title="t('editing_item_count', { count: primaryKeys.length })"
    persistent
    @cancel="cancel"
    @apply="save"
  >
    <template #actions>
      <v-button
        v-tooltip.bottom="t('save')"
        icon
        rounded
        :loading="saving"
        @click="save"
      >
        <v-icon name="check" />
      </v-button>
    </template>

    <div class="batch-content">
      <v-form
        v-model="edits"
        collection="directus_files"
        batch-mode
        primary-key="+"
        :validation-errors="validationErrors"
      />
    </div>
  </v-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApi, useStores } from '@directus/extensions-sdk'
import { useT } from '../composables/useT'
import { validatePayload } from '@directus/utils'
import { applyConditions } from '../utils/apply-conditions'

const props = defineProps<{
  primaryKeys: string[]
  active: boolean
}>()

const emit = defineEmits<{
  (e: 'update:active', value: boolean): void
  (e: 'refresh'): void
}>()

const api = useApi()
const { useFieldsStore } = useStores()
const fieldsStore = useFieldsStore()
const { t } = useT()

const edits = ref<Record<string, any>>({})
const saving = ref(false)
const validationErrors = ref<any[]>([])

const internalActive = computed({
  get: () => props.active,
  set: (val) => emit('update:active', val),
})

function validateBatchEdits(): any[] {
  const allFields: any[] = fieldsStore.getFieldsForCollection('directus_files') ?? []
  const touched = Object.keys(edits.value)
  if (!touched.length) return []

  const errors: any[] = []

  for (const field of allFields) {
    if (!touched.includes(field.field)) continue

    const effective = applyConditions(edits.value, field)
    // Skip fields hidden by conditions — v-form won't show them in batch mode either
    if (effective.meta?.hidden) continue

    const val = edits.value[field.field]
    const validation = effective.meta?.validation as { _and?: any[] } | null
    if (!validation?._and?.length) continue
    if (val === null || val === undefined) continue

    const rule = { _and: validation._and }
    const errs = validatePayload(rule, { [field.field]: val })
    for (const e of errs) {
      for (const detail of e.details ?? []) {
        errors.push({
          code: 'FAILED_VALIDATION',
          field: field.field,
          type: detail.type ?? 'custom',
          hidden: effective.meta?.hidden ?? false,
          group: effective.meta?.group ?? null,
        })
      }
    }
  }

  return errors
}

function clearHiddenFromEdits(): Record<string, any> {
  const allFields: any[] = fieldsStore.getFieldsForCollection('directus_files') ?? []
  const cleaned = { ...edits.value }

  for (const field of allFields) {
    if (!(field.field in cleaned)) continue
    const effective = applyConditions(cleaned, field)
    if (effective.meta?.hidden && effective.meta?.clear_hidden_value_on_save) {
      cleaned[field.field] = field.schema?.default_value ?? null
    }
  }

  return cleaned
}

async function save() {
  if (saving.value) return

  validationErrors.value = []

  const clientErrors = validateBatchEdits()
  if (clientErrors.length > 0) {
    validationErrors.value = clientErrors
    return
  }

  const payload = clearHiddenFromEdits()

  saving.value = true
  try {
    await api.patch('/files', {
      keys: props.primaryKeys,
      data: payload,
    })
    emit('refresh')
    cancel()
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? []
    validationErrors.value = errors
      .filter((e: any) => ['FAILED_VALIDATION', 'RECORD_NOT_UNIQUE'].includes(e?.extensions?.code))
      .map((e: any) => e.extensions)

    if (validationErrors.value.length === 0 && errors.length === 0) {
      console.error('[media-library] Batch save failed:', err)
    }
  } finally {
    saving.value = false
  }
}

function cancel() {
  edits.value = {}
  validationErrors.value = []
  internalActive.value = false
}
</script>

<style scoped>
.batch-content {
  padding: var(--content-padding);
  padding-bottom: var(--content-padding-bottom);
}
</style>
