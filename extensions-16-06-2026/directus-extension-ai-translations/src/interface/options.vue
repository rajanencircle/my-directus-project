<template>
  <div class="options-grid">

    <!-- ── Language Collection ─────────────────────────────────── -->
    <div class="field full">
      <div class="label type-label">Language Collection <span class="required">*</span></div>
      <v-select
        v-model="_languagesCollection"
        :items="collectionItems"
        :loading="loadingCollections"
        :placeholder="loadingCollections ? 'Loading collections…' : 'Select a collection…'"
        show-deselect
      />
      <div class="hint">The collection that stores your available languages (e.g. <code>translations</code>).</div>
    </div>

    <!-- ── Language Indicator Field ───────────────────────────── -->
    <div class="field full">
      <div class="label type-label">Language Indicator Field <span class="required">*</span></div>
      <v-select
        v-model="_languageIndicatorField"
        :items="fieldItems"
        :loading="loadingFields"
        :disabled="!_languagesCollection"
        :placeholder="!_languagesCollection ? 'Select a collection first' : loadingFields ? 'Loading fields…' : 'Select the language code field…'"
        show-deselect
      />
      <div class="hint">The field in the language collection that stores the language code (e.g. <code>code</code>).</div>
    </div>

    <!-- ── Language Direction Field ───────────────────────────── -->
    <div class="field full">
      <div class="label type-label">Language Direction Field</div>
      <v-select
        v-model="_languageDirectionField"
        :items="fieldItems"
        :loading="loadingFields"
        :disabled="!_languagesCollection"
        :placeholder="!_languagesCollection ? 'Select a collection first' : loadingFields ? 'Loading fields…' : 'Optional — select the direction field…'"
        show-deselect
      />
      <div class="hint">Optional. A field storing <code>ltr</code> / <code>rtl</code> per language.</div>
    </div>

    <v-divider class="full" />

    <!-- ── Use Current User Language ──────────────────────────── -->
    <div class="field half">
      <div class="label type-label">Use Current User Language</div>
      <v-checkbox v-model="_userLanguage" label="Enable" />
    </div>

    <!-- ── Default Language ───────────────────────────────────── -->
    <div class="field half">
      <div class="label type-label">Default Language</div>
      <v-select
        v-model="_defaultLanguage"
        :items="languageItems"
        :loading="loadingLanguages"
        :disabled="_userLanguage || !_languagesCollection || !_languageIndicatorField"
        :placeholder="!_languagesCollection ? 'Configure collection first' : 'Select default language…'"
        show-deselect
      />
    </div>

    <!-- ── Default Split View ─────────────────────────────────── -->
    <div class="field half">
      <div class="label type-label">Default Split View</div>
      <v-checkbox v-model="_defaultSplitView" label="Start open" />
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';

export default defineComponent({
  name: 'AiTranslationsOptions',

  props: {
    value: {
      type: Object as () => Record<string, any> | null,
      default: null,
    },
  },

  emits: ['input'],

  setup(props, { emit }) {
    const api = useApi();
    const { useCollectionsStore } = useStores();
    const collectionsStore = useCollectionsStore();

    // ── Helpers ─────────────────────────────────────────────────────────────

    function get<T>(key: string, fallback: T): T {
      return (props.value?.[key] as T) ?? fallback;
    }

    function set(key: string, val: any) {
      emit('input', { ...(props.value ?? {}), [key]: val });
    }

    // ── Synced computed props ────────────────────────────────────────────────

    const _languagesCollection = computed<string | null>({
      get: () => get('languagesCollection', null),
      set: (v) => {
        // Reset dependent fields when collection changes
        emit('input', {
          ...(props.value ?? {}),
          languagesCollection: v,
          languageIndicatorField: null,
          languageDirectionField: null,
          defaultLanguage: null,
        });
      },
    });

    const _languageIndicatorField = computed<string | null>({
      get: () => get('languageIndicatorField', null),
      set: (v) => set('languageIndicatorField', v),
    });

    const _languageDirectionField = computed<string | null>({
      get: () => get('languageDirectionField', null),
      set: (v) => set('languageDirectionField', v),
    });

    const _userLanguage = computed<boolean>({
      get: () => get('userLanguage', false),
      set: (v) => set('userLanguage', v),
    });

    const _defaultLanguage = computed<string | null>({
      get: () => get('defaultLanguage', null),
      set: (v) => set('defaultLanguage', v),
    });

    const _defaultSplitView = computed<boolean>({
      get: () => get('defaultSplitView', false),
      set: (v) => set('defaultSplitView', v),
    });

    // ── Collections dropdown ─────────────────────────────────────────────────

    const loadingCollections = ref(false);
    const allCollections = ref<{ collection: string; name: string }[]>([]);

    const collectionItems = computed(() =>
      allCollections.value.map((c) => ({
        value: c.collection,
        text: c.name,
      }))
    );

    async function fetchCollections() {
      loadingCollections.value = true;
      try {
        // Use the collections store if it already has data (avoids extra request)
        const fromStore: any[] = collectionsStore.collections ?? [];
        if (fromStore.length > 0) {
          allCollections.value = fromStore
            .filter((c: any) => !c.collection.startsWith('directus_'))
            .map((c: any) => ({
              collection: c.collection,
              name: c.meta?.note ?? c.name ?? c.collection,
            }));
        } else {
          const { data } = await api.get('/collections', { params: { limit: -1 } });
          allCollections.value = (data?.data ?? [])
            .filter((c: any) => !c.collection.startsWith('directus_'))
            .map((c: any) => ({
              collection: c.collection,
              name: c.meta?.note ?? c.collection,
            }));
        }
      } catch (err) {
        console.error('[ai-translations options] fetchCollections error:', err);
      } finally {
        loadingCollections.value = false;
      }
    }

    fetchCollections();

    // ── Fields dropdown ──────────────────────────────────────────────────────

    const loadingFields = ref(false);
    const collectionFields = ref<{ field: string; name: string }[]>([]);

    const fieldItems = computed(() =>
      collectionFields.value.map((f) => ({ value: f.field, text: f.name }))
    );

    async function fetchFields(collection: string | null) {
      collectionFields.value = [];
      if (!collection) return;
      loadingFields.value = true;
      try {
        const { data } = await api.get(`/fields/${collection}`);
        collectionFields.value = (data?.data ?? []).map((f: any) => ({
          field: f.field,
          name: f.meta?.note ?? f.name ?? f.field,
        }));
      } catch (err) {
        console.error('[ai-translations options] fetchFields error:', err);
      } finally {
        loadingFields.value = false;
      }
    }

    watch(_languagesCollection, (col) => fetchFields(col), { immediate: true });

    // ── Language values dropdown (for default language picker) ───────────────

    const loadingLanguages = ref(false);
    const languageItems = ref<{ value: string; text: string }[]>([]);

    async function fetchLanguageValues(collection: string | null, indicatorField: string | null) {
      languageItems.value = [];
      if (!collection || !indicatorField) return;
      loadingLanguages.value = true;
      try {
        const { data } = await api.get(`/items/${collection}`, {
          params: { limit: -1, fields: `${indicatorField},name,label` },
        });
        languageItems.value = (data?.data ?? []).map((item: any) => ({
          value: item[indicatorField],
          text: item.name ?? item.label ?? item[indicatorField],
        }));
      } catch (err) {
        console.error('[ai-translations options] fetchLanguageValues error:', err);
      } finally {
        loadingLanguages.value = false;
      }
    }

    watch(
      [_languagesCollection, _languageIndicatorField],
      ([col, field]) => fetchLanguageValues(col, field),
      { immediate: true }
    );

    return {
      _languagesCollection,
      _languageIndicatorField,
      _languageDirectionField,
      _userLanguage,
      _defaultLanguage,
      _defaultSplitView,
      collectionItems,
      fieldItems,
      languageItems,
      loadingCollections,
      loadingFields,
      loadingLanguages,
    };
  },
});
</script>

<style scoped>
.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 24px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field.full {
  grid-column: 1 / -1;
}

.field.half {
  grid-column: span 1;
}

.full {
  grid-column: 1 / -1;
}

.label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--theme--foreground-subdued);
}

.required {
  color: var(--theme--danger);
}

.hint {
  font-size: 12px;
  color: var(--theme--foreground-subdued);
  line-height: 1.4;
}

.hint code {
  background: var(--theme--background-accent);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: var(--theme--fonts--monospace--font-family);
}
</style>
