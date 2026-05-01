<template>
  <div class="save-and-stay-interface">
    <v-button
      :loading="isSaving"
      :disabled="isSaving || (!isNew && !isDirty)"
      @click="handleSave"
    >
      <v-icon v-if="buttonIcon" :name="buttonIcon" small left />
      {{ buttonLabel || 'Save & Stay' }}
    </v-button>

    <v-notice v-if="errorMessage" type="danger" class="error-notice">
      {{ errorMessage }}
    </v-notice>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, toRaw, unref, computed, watch, nextTick, onMounted } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { useRouter } from 'vue-router';

const props = defineProps({
  collection: { type: String, default: null },
  primaryKey: { type: [String, Number], default: null },
  buttonLabel: { type: String, default: 'Save & Stay' },
  buttonIcon: { type: String, default: null },
  refreshAfterSave: { type: Boolean, default: false },
  flowId: { type: String, default: null },        // ← Now comes from options
});

const api = useApi();
const router = useRouter();

const isSaving = ref(false);
const errorMessage = ref<string | null>(null);

const effectiveCollection = computed(() => 
  props.collection || (router.currentRoute.value.params['collection'] as string)
);
const effectivePrimaryKey = computed(() => 
  props.primaryKey ?? (router.currentRoute.value.params['primaryKey'] as string | number)
);

const isNew = computed(() => {
  const pk = effectivePrimaryKey.value;
  return !pk || String(pk) === '+';
});

const SYSTEM_FIELDS = new Set(['date_created', 'user_created', 'date_updated', 'user_updated', 'id']);

const values = inject<any>('values', {});
const initialValues = inject<any>('initialValues');
const refresh = inject<any>('refresh');

function deepToRaw(raw: any, visited = new WeakMap()): any {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object' || raw instanceof Date) return raw;

  if (visited.has(raw)) return visited.get(raw);

  const val = toRaw(unref(raw));
  if (val === null || val === undefined) return null;
  if (typeof val !== 'object') return val;

  if (Array.isArray(val)) {
    const arr: any[] = [];
    visited.set(raw, arr);
    val.forEach(item => arr.push(deepToRaw(item, visited)));
    return arr;
  }

  const result: Record<string, any> = {};
  visited.set(raw, result);

  for (const key of Object.keys(val)) {
    result[key] = deepToRaw(val[key], visited);
  }
  return result;
}

const baselineJson = ref<string | null>(null);
const currentSnapshot = ref<Record<string, any>>({});

const syncCurrentSnapshot = () => {
  currentSnapshot.value = deepToRaw(values) ?? {};
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(values, () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(syncCurrentSnapshot, 120);
}, { deep: true });

function isDeeplyDifferent(a: any, b: any): boolean {
  if (a == null && b == null) return false;
  if (a == null || b == null) return true;
  if (typeof a !== typeof b) return true;
  if (typeof a !== 'object' || a instanceof Date) return a !== b;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return true;
    return a.some((item, i) => isDeeplyDifferent(item, b[i]));
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return true;

  return keysA.some(key => isDeeplyDifferent(a[key], b[key]));
}

const isDirty = computed(() => {
  if (baselineJson.value === null) return false;
  const baseline = JSON.parse(baselineJson.value);
  return isDeeplyDifferent(currentSnapshot.value, baseline);
});

onMounted(async () => {
  await nextTick();

  const captureBaseline = () => {
    syncCurrentSnapshot();
    baselineJson.value = JSON.stringify(currentSnapshot.value);
    
  };

  if (isNew.value) {
    setTimeout(captureBaseline, 300);
    return;
  }

  

  if (initialValues?.value) {
    baselineJson.value = JSON.stringify(deepToRaw(initialValues.value));
    
  }

  const stop = watch(values, () => {
    const count = Object.keys(deepToRaw(values) ?? {}).length;
    if (count >= 40) {
      
      captureBaseline();
      stop();
    }
  }, { deep: true, immediate: true });

  setTimeout(() => {
    if (baselineJson.value === null) {
      
      captureBaseline();
    }
  }, 1800);
});

const handleSave = async () => {
  if (isSaving.value || (!isNew.value && !isDirty.value)) return;

  errorMessage.value = null;
  isSaving.value = true;

  try {
    const current = currentSnapshot.value;
    const baseline = baselineJson.value ? JSON.parse(baselineJson.value) : {};

    const edits: Record<string, any> = {};
    const allKeys = new Set([...Object.keys(current), ...Object.keys(baseline)]);

    for (const key of allKeys) {
      if (SYSTEM_FIELDS.has(key)) continue;
      if (isDeeplyDifferent(current[key], baseline[key])) {
        edits[key] = current[key];
      }
    }

    if (Object.keys(edits).length === 0 && !isNew.value) {
      isSaving.value = false;
      return;
    }

    const collection = effectiveCollection.value;
    const pk = effectivePrimaryKey.value;

    let savedItem: any = null;

    if (isNew.value) {
      const response = await api.post(`/items/${collection}`, edits);
      const newPk = response.data?.data?.id;
      savedItem = response.data?.data;

      if (newPk) {
        if (initialValues) initialValues.value = { ...current };
        baselineJson.value = JSON.stringify(current);
        await nextTick();
        setTimeout(() => router.push(`/content/${collection}/${newPk}`), 100);
      }
    } else {
      if (Object.keys(edits).length > 0) {
        const response = await api.patch(`/items/${collection}/${pk}`, edits);
        savedItem = response.data?.data;
      }

      if (initialValues) initialValues.value = { ...current };
      baselineJson.value = JSON.stringify(current);

      if (props.refreshAfterSave) {
        window.location.reload();
      } else if (refresh) {
        refresh();
      }
    }

    // Trigger Flow if configured (works for both new and existing)
    if (props.flowId && savedItem) {
      
      
      api.post(`/flows/trigger/${props.flowId}`, {
        collection,
        key: isNew.value ? savedItem.id : pk,
        item: savedItem || current,
        edits,
        isNew: isNew.value,
      }).catch(err => {
        
        // Don't fail the save if flow fails
      });
    }

  } catch (e: any) {
    const msg = e?.response?.data?.errors?.[0]?.message || e?.message || 'Save failed.';
    errorMessage.value = msg;
    console.error(e);
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.save-and-stay-interface {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.error-notice {
  margin-top: 4px;
}
</style>