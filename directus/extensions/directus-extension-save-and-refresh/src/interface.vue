<template>
  <div class="save-refresh-interface">
    <div class="flow-executor">
      <v-button
        :loading="loading"
        :disabled="loading || (!isNew && !isDirty)"
        @click="openConfirm"
        class="action-button"
      >
        <span class="button-content">
          <v-icon v-if="buttonIcon" :name="buttonIcon" class="button-icon" />
          <span>{{ buttonLabel }}</span>
        </span>
      </v-button>

      <v-notice v-if="errorMessage" type="danger" @close="errorMessage = null" class="notice-spacing">
        {{ errorMessage }}
      </v-notice>
    </div>

    <div
      v-if="confirmOpen"
      class="confirm-backdrop"
      role="dialog"
      aria-modal="true"
      @click.self="closeConfirm"
    >
      <div class="confirm-panel">
        <div class="confirm-title">{{ confirmTitle }}</div>
        <div v-if="confirmMessage" class="confirm-message">{{ confirmMessage }}</div>
        <div class="confirm-actions">
          <v-button secondary :disabled="loading" @click="closeConfirm">
            {{ confirmCancelLabel }}
          </v-button>
          <v-button :loading="loading" :disabled="loading" @click="confirmAndSave">
            {{ confirmContinueLabel }}
          </v-button>
        </div>
      </div>
    </div>

    <div
      v-if="resultOpen"
      class="confirm-backdrop"
      role="dialog"
      aria-modal="true"
      @click.self="closeResult"
    >
      <div class="confirm-panel">
        <div class="confirm-title">{{ resultTitle }}</div>
        <div v-if="resultMessage" class="confirm-message">{{ resultMessage }}</div>
        <div class="confirm-actions">
          <v-button @click="closeResult">
            {{ resultCloseLabel }}
          </v-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, inject, computed, toRaw, unref, watch, nextTick, onMounted } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { useRouter } from 'vue-router';

export default {
  emits: ['refresh', 'setFieldValue'],
  props: {
    value: { type: String, default: null },
    buttonLabel: { type: String, default: 'Save & Refresh' },
    buttonIcon: { type: String, default: 'save' },
    refreshType: {
      type: String,
      default: 'full',
      validator: (v) => ['form', 'full', 'back', 'none'].includes(v),
    },
    refreshDelay: { type: Number, default: 1000 },
    confirmTitle: { type: String, default: 'Save Item' },
    confirmMessage: { type: String, default: 'Do you want to save this item?' },
    confirmEnabled: { type: Boolean, default: true },
    confirmCancelLabel: { type: String, default: 'Cancel' },
    confirmContinueLabel: { type: String, default: 'Save' },
    resultDialogEnabled: { type: Boolean, default: false },
    resultTitle: { type: String, default: 'Saved' },
    resultMessage: { type: String, default: 'The item was saved successfully.' },
    resultCloseLabel: { type: String, default: 'Close' },
    collection: { type: String, required: true },
    primaryKey: { type: [String, Number], default: '+' },
  },
  setup(props, { emit, attrs }) {
    const api = useApi();
    const router = useRouter();
    const notify = inject('notify', null);
    const refresh = inject('refresh', null);
    const values = inject('values', {});
    const initialValues = inject('initialValues', null);

    const loading = ref(false);
    const errorMessage = ref(null);
    const confirmOpen = ref(false);
    const resultOpen = ref(false);

    const SYSTEM_FIELDS = new Set(['date_created', 'user_created', 'date_updated', 'user_updated', 'id']);

    const effectiveCollection = computed(() =>
      props.collection || router.currentRoute.value.params['collection']
    );
    const effectivePrimaryKey = computed(() =>
      props.primaryKey ?? router.currentRoute.value.params['primaryKey']
    );

    const isNew = computed(() => {
      const pk = effectivePrimaryKey.value;
      return !pk || String(pk) === '+';
    });

    function deepToRaw(raw, visited = new WeakMap()) {
      if (raw === null || raw === undefined) return null;
      if (typeof raw !== 'object' || raw instanceof Date) return raw;
      if (visited.has(raw)) return visited.get(raw);
      const val = toRaw(unref(raw));
      if (val === null || val === undefined) return null;
      if (typeof val !== 'object') return val;
      if (Array.isArray(val)) {
        const arr = [];
        visited.set(raw, arr);
        val.forEach(item => arr.push(deepToRaw(item, visited)));
        return arr;
      }
      const result = {};
      visited.set(raw, result);
      for (const key of Object.keys(val)) result[key] = deepToRaw(val[key], visited);
      return result;
    }

    const baselineJson = ref(null);
    const currentSnapshot = ref({});

    const syncCurrentSnapshot = () => {
      currentSnapshot.value = deepToRaw(values) ?? {};
    };

    let debounceTimer = null;
    watch(values, () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(syncCurrentSnapshot, 120);
    }, { deep: true });

    function isDeeplyDifferent(a, b) {
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
        if (baselineJson.value === null) captureBaseline();
      }, 1800);
    });

    function showNotice(payload) {
      if (typeof notify === 'function') notify(payload);
    }

    const effectiveRefreshDelay = computed(() => {
      const parsed = Number(props.refreshDelay);
      if (!Number.isFinite(parsed) || parsed < 0) return 0;
      return Math.round(parsed);
    });

    async function refreshCurrentForm() {
      const collection = effectiveCollection.value;
      const pk = effectivePrimaryKey.value;
      console.log('[save-refresh] refreshCurrentForm called', { collection, pk });

      if (!collection || !pk || String(pk) === '+') {
        console.log('[save-refresh] refreshCurrentForm: missing collection or pk, aborting');
        return false;
      }

      const onSetFieldValue = typeof attrs.onSetFieldValue === 'function' ? attrs.onSetFieldValue : null;
      console.log('[save-refresh] onSetFieldValue:', onSetFieldValue ? 'available' : 'not available');
      console.log('[save-refresh] initialValues:', initialValues ? 'available' : 'not available');

      try {
        const response = await api.get(`/items/${collection}/${pk}`);
        const item = response?.data?.data;
        console.log('[save-refresh] fetched item:', JSON.parse(JSON.stringify(item ?? null)));

        if (!item || typeof item !== 'object') {
          console.log('[save-refresh] refreshCurrentForm: invalid item response');
          return false;
        }

        const fields = Object.entries(item).filter(([field]) => !SYSTEM_FIELDS.has(field));
        console.log('[save-refresh] fields to apply:', fields.map(([f]) => f));

        if (onSetFieldValue) {
          // Chained nextTick pattern required by Directus to update multiple fields
          for (const [field, fieldValue] of fields) {
            console.log(`[save-refresh] onSetFieldValue("${field}",`, fieldValue, ')');
            onSetFieldValue(field, fieldValue);
            await nextTick();
          }
        } else if (initialValues) {
          for (const [field, fieldValue] of fields) {
            console.log(`[save-refresh] initialValues.value["${field}"] =`, fieldValue);
            initialValues.value[field] = fieldValue;
          }
          await nextTick();
        } else {
          // Presentation interfaces don't receive onSetFieldValue or initialValues,
          // use emit('setFieldValue') with chained nextTick as per Directus community pattern
          for (const [field, fieldValue] of fields) {
            console.log(`[save-refresh] emit setFieldValue("${field}",`, fieldValue, ')');
            emit('setFieldValue', { field, value: fieldValue });
            await nextTick();
          }
        }

        syncCurrentSnapshot();
        baselineJson.value = JSON.stringify(currentSnapshot.value);
        return true;
      } catch (error) {
        console.warn('[save-refresh] Form reload failed.', error);
        return false;
      }
    }

    async function applyNavigation() {
      console.log('[save-refresh] applyNavigation called, refreshType =', props.refreshType);

      if (props.refreshType === 'none') return;

      if (props.refreshType === 'form') {
        // Try field-by-field update (only works when onSetFieldValue or initialValues is available)
        const refreshed = await refreshCurrentForm();
        console.log('[save-refresh] refreshCurrentForm result:', refreshed);
        if (refreshed) return;

        // Fall back to Directus-injected refresh
        console.log('[save-refresh] falling back to injected refresh(), available:', typeof refresh === 'function');
        if (typeof refresh === 'function') {
          try { refresh(); return; } catch (e) {
            console.warn('[save-refresh] injected refresh() threw:', e);
          }
        }

        // Last resort: page reload
        console.log('[save-refresh] falling back to window.location.reload()');
        window.location.reload();
        return;
      }

      if (props.refreshType === 'back') {
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
      }

      window.location.reload();
    }

    async function executeSave() {
      if (loading.value) return;

      loading.value = true;
      errorMessage.value = null;

      const collection = effectiveCollection.value;
      const pk = effectivePrimaryKey.value;
      const current = currentSnapshot.value;
      const baseline = baselineJson.value ? JSON.parse(baselineJson.value) : {};

      const edits = {};
      const allKeys = new Set([...Object.keys(current), ...Object.keys(baseline)]);
      for (const key of allKeys) {
        if (SYSTEM_FIELDS.has(key)) continue;
        if (isDeeplyDifferent(current[key], baseline[key])) {
          edits[key] = current[key];
        }
      }

      try {
        if (isNew.value) {
          const response = await api.post(`/items/${collection}`, edits);
          const newPk = response.data?.data?.id;
          if (newPk) {
            if (initialValues) initialValues.value = deepToRaw(values);
            baselineJson.value = JSON.stringify(current);
            syncCurrentSnapshot();
            await nextTick();
            router.push(`/content/${collection}/${newPk}`);
          }
        } else {
          if (Object.keys(edits).length > 0) {
            await api.patch(`/items/${collection}/${pk}`, edits);
          }
          if (initialValues) initialValues.value = deepToRaw(values);
          baselineJson.value = JSON.stringify(current);
        }

        loading.value = false;
        confirmOpen.value = false;

        setTimeout(async () => {
          if (isNew.value) return;

          if (props.resultDialogEnabled) {
            resultOpen.value = true;
            return;
          }

          if (props.refreshType === 'none') {
            showNotice({ title: 'Saved', text: 'Item saved successfully', type: 'success' });
            return;
          }
          console.log('[save-refresh] applyNavigation() called after save');
          await applyNavigation();
        }, effectiveRefreshDelay.value);

      } catch (err) {
        loading.value = false;
        confirmOpen.value = false;
        const msg = err?.response?.data?.errors?.[0]?.message || err?.message || 'Save failed';
        errorMessage.value = msg;
        showNotice({ title: 'Error', text: msg, type: 'error' });
      }
    }

    function openConfirm() {
      if (!props.confirmEnabled) {
        executeSave();
        return;
      }
      confirmOpen.value = true;
    }

    function closeConfirm() {
      if (loading.value) return;
      confirmOpen.value = false;
    }

    async function confirmAndSave() {
      await executeSave();
    }

    async function closeResult() {
      resultOpen.value = false;
      await applyNavigation();
    }

    return {
      loading,
      errorMessage,
      isNew,
      isDirty,
      confirmOpen,
      resultOpen,
      openConfirm,
      closeConfirm,
      confirmAndSave,
      closeResult,
    };
  },
};
</script>

<style scoped>
.save-refresh-interface {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flow-executor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-button {
  align-self: flex-start;
  display: inline-flex;
  width: fit-content !important;
  min-width: max-content !important;
  max-width: none !important;
  --v-button-width: auto;
  --v-button-min-width: max-content;
  white-space: nowrap;
  overflow: visible;
}

.action-button :deep(.v-button__content) {
  width: auto !important;
  max-width: none !important;
  overflow: visible;
  white-space: nowrap;
}

.button-content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.button-icon {
  flex: 0 0 auto;
}

.notice-spacing {
  margin-top: 8px;
}

.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 16px;
}

.confirm-panel {
  width: min(520px, 100%);
  background: var(--theme--background, #ffffff);
  color: var(--theme--foreground, #1b1b1b);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.confirm-title {
  font-size: 16px;
  font-weight: 600;
}

.confirm-message {
  opacity: 0.9;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
</style>
