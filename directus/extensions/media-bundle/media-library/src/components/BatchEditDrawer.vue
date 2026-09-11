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
        :fields="editableFields"
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
import { applyConditions } from '../utils/apply-conditions'
import { validateItem } from '../utils/validate-item'

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

const FIELDS_DENY_LIST = [
  'storage_divider', 'filename_disk', 'filename_download','metadata','type','filesize', 'focal_point_divider', 'focal_point_x', 'focal_point_y',
]

const editableFields = computed(() => {
  try {
    return fieldsStore.getFieldsForCollection('directus_files')
      .filter((f: any) => !FIELDS_DENY_LIST.includes(f.field))
  } catch {
    return []
  }
})

function validateBatchEdits(): any[] {
  const allFields: any[] = fieldsStore.getFieldsForCollection('directus_files') ?? []
  const touched = Object.keys(edits.value)
  if (!touched.length) return []

  // Only validate fields the user touched in batch mode (untouched stay unchanged)
  const touchedFields = allFields.filter((f) => touched.includes(f.field))

  // Reuse Data Model required + custom validation (same empty-value rules as file detail)
  return validateItem(edits.value, touchedFields, false, true).filter((error) => !error.hidden)
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

/* Suppress the batch-mode checkbox on the synthetic $system_divider — it has no
   no-data special in older Directus builds, causing an unlabeled checkbox to appear. */
:deep([data-field="$system_divider"] .field-label) {
  display: none;
}

</style>
