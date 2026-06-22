<template>
  <div class="translations">
    <!-- ─── Native-like Language Selectors ────────────────────────── -->
    <!-- ─── Header Actions (Selectors + AI Toolbar) ────────────────── -->
    <div class="header-container">
      <div class="header-title-row">
        <h2 class="header-title"></h2>

        <!-- AI Actions Toolbar -->
        <div class="ai-actions-row" v-if="splitViewOn">
          <template v-if="hasPending">
            <button type="button" class="mr-2 ai-toolbar-btn" @click="applyAll">
              <v-icon name="check" small class="ai-toolbar-btn__icon" />
              <span>Apply All</span>
            </button>
            <button type="button" class="ai-toolbar-btn" @click="cancelAll">
              <v-icon name="close" small class="ai-toolbar-btn__icon" />
              <span>Cancel</span>
            </button>
          </template>
          <button
            v-else
            type="button"
            :disabled="disabled || aiTranslating || selection.length === 0"
            :class="{
              'ai-translate-btn--active':
                !aiTranslating && selection.length > 0 && !disabled,
            }"
            class="ai-translate-btn"
            @click="runAiTranslateAll"
          >
            <v-icon name="language" small class="ai-translate-btn__icon" />
            <span>{{ aiTranslating ? "translating" : "AI Translate" }}</span>
          </button>
        </div>
      </div>

      <div class="lang-selectors" :class="{ 'is-split': splitViewOn }">
        <!-- Source Lang Selector -->
        <div
          class="lang-box source-lang"
          :class="{
            'has-content': hasContent(sourceLanguage),
            'is-draft': isDraft(sourceLanguage),
          }"
          @click="openSelect('source')"
        >
          <div class="lang-box-main">
            <transition name="icon-morph" mode="out-in">
              <v-icon
                :key="`src-icon-${getLangIcon(sourceLanguage)}`"
                :name="getLangIcon(sourceLanguage)"
                small
                class="lang-icon"
                :class="{
                  'lang-icon--active':
                    hasContent(sourceLanguage) || isDraft(sourceLanguage),
                  'lang-icon--empty':
                    !hasContent(sourceLanguage) && !isDraft(sourceLanguage),
                  'lang-icon--spin':
                    hasContent(sourceLanguage) || isDraft(sourceLanguage),
                }"
                @click.stop="openSelect('source')"
              />
            </transition>

            <v-select
              ref="sourceSelect"
              v-model="sourceLanguage"
              :items="languageSelectItems"
              item-text="text"
              item-value="value"
              inline
              class="lang-select"
              @click.stop
            />
          </div>

          <div class="lang-actions">
            <transition name="icon-morph" mode="out-in">
              <v-icon
                :key="`src-action-${sourceActionIcon(sourceLanguage)}`"
                v-if="hasContent(sourceLanguage) || isDraft(sourceLanguage)"
                :name="sourceActionIcon(sourceLanguage)"
                class="lang-action mr-2"
                :class="{ 'is-visible': hasContent(sourceLanguage) }"
                clickable
                @click.stop="sourceActionClick(sourceLanguage)"
              />
            </transition>

            <v-icon
              v-if="!splitViewOn"
              name="flip"
              class="split-toggle mr-2"
              clickable
              @click.stop="splitViewOn = true"
            />

            <v-icon
              name="expand_more"
              class="dropdown-icon"
              clickable
              @click.stop="openSelect('source')"
            />
          </div>
        </div>

        <!-- Language Icon Gap -->
        <div class="lang-gap" v-show="splitViewOn">
          <v-icon name="language" class="lang-gap-icon" />
        </div>

        <!-- Target Lang Selector -->
        <div
          class="lang-box target-lang"
          v-show="splitViewOn"
          :class="{
            'has-content': hasContent(targetLanguage),
            'is-draft': isDraft(targetLanguage),
          }"
          @click="openSelect('target')"
        >
          <div class="lang-box-main">
            <transition name="icon-morph" mode="out-in">
              <v-icon
                :key="`tgt-icon-${getLangIcon(targetLanguage)}`"
                :name="getLangIcon(targetLanguage)"
                small
                class="lang-icon"
                :class="{
                  'lang-icon--active':
                    hasContent(targetLanguage) || isDraft(targetLanguage),
                  'lang-icon--empty':
                    !hasContent(targetLanguage) && !isDraft(targetLanguage),
                  'lang-icon--spin':
                    hasContent(targetLanguage) || isDraft(targetLanguage),
                }"
                @click.stop="openSelect('target')"
              />
            </transition>

            <v-select
              ref="targetSelect"
              v-model="targetLanguage"
              :items="languageSelectItems"
              item-text="text"
              item-value="value"
              inline
              class="lang-select"
              @click.stop
            />
          </div>

          <div class="lang-actions">
            <transition name="icon-morph" mode="out-in">
              <v-icon
                :key="`tgt-action-${targetActionIcon(targetLanguage)}`"
                v-if="hasContent(targetLanguage) || isDraft(targetLanguage)"
                :name="targetActionIcon(targetLanguage)"
                class="lang-action mr-2"
                :class="{ 'is-visible': hasContent(targetLanguage) }"
                clickable
                @click.stop="targetActionClick(targetLanguage)"
              />
            </transition>

            <v-icon
              name="flip"
              class="split-toggle mr-2"
              clickable
              @click.stop="splitViewOn = false"
            />

            <v-icon
              name="expand_more"
              class="dropdown-icon"
              clickable
              @click.stop="openSelect('target')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Field rows ─────────────────────────────────────────────── -->
    <div
      v-if="sourceLanguage && (targetLanguage || !splitViewOn)"
      class="fields-container"
    >
      <div
        v-for="(group, gi) in fieldGroups"
        :key="gi"
        class="field-row-inputs"
        :class="{ 'is-split': splitViewOn }"
      >
        <!-- Source input(s) -->
        <div
          class="field-input-col"
          :class="{ 'field-pair': group.length === 2 }"
        >
          <template v-for="f in group" :key="f.field">
            <div class="field-sub-col">
              <div class="native-field-label">
                <span class="label-text">{{ f.name || f.field }}</span>
                <span class="lang-badge source">{{ sourceLanguage }}</span>
              </div>
              <v-form
                :key="`src-${sourceLanguage}-${f.field}`"
                :fields="[unlabeled(f)]"
                :model-value="{
                  [f.field]: getRow(sourceLanguage)?.[f.field] ?? null,
                }"
                :primary-key="getPrimaryKey(sourceLanguage)"
                :disabled="disabled"
                class="inline-form"
                @update:model-value="
                  (val) =>
                    setFieldValue(sourceLanguage, f.field, val[f.field] ?? null)
                "
              />
              <p v-if="f.meta?.note" class="field-note" v-html="f.meta.note" />
            </div>
          </template>
        </div>

        <!-- Selection Checkbox(es) -->
        <div
          class="field-ai-col"
          v-show="splitViewOn"
          :class="{ 'field-pair': group.length === 2 }"
        >
          <template v-for="f in group" :key="f.field">
            <v-checkbox
              v-model="selection"
              :value="f.field"
              :disabled="disabled || aiTranslating"
              class="ai-checkbox"
            />
          </template>
        </div>

        <!-- Target input(s) -->
        <div
          class="field-input-col"
          v-show="splitViewOn"
          :class="{ 'field-pair': group.length === 2 }"
        >
          <template v-for="f in group" :key="f.field">
            <div
              class="field-sub-col"
              :class="{ pending: f.field in pendingTranslations }"
            >
              <div class="native-field-label">
                <span class="label-text">{{ f.name || f.field }}</span>
                <span class="lang-badge target">{{ targetLanguage }}</span>
              </div>
              <v-form
                :key="`tgt-${targetLanguage}-${f.field}`"
                :fields="[unlabeled(f)]"
                :model-value="{
                  [f.field]: getRow(targetLanguage!)?.[f.field] ?? null,
                }"
                :primary-key="getPrimaryKey(targetLanguage!)"
                :disabled="disabled || f.field in pendingTranslations"
                class="inline-form"
                @update:model-value="
                  (val) =>
                    setFieldValue(
                      targetLanguage!,
                      f.field,
                      val[f.field] ?? null,
                    )
                "
              />
              <p v-if="f.meta?.note" class="field-note" v-html="f.meta.note" />
              <!-- Blue translated text below the field when pending -->
              <div
                v-if="f.field in pendingTranslations"
                class="pending-translation-text"
              >
                <template v-if="Array.isArray(pendingTranslations[f.field])">
                  <div
                    v-for="(item, idx) in pendingTranslations[f.field]"
                    :key="idx"
                    class="pending-repeater-item"
                  >
                    <span v-for="(val, key) in item" :key="key">
                      <strong>{{ key }}:</strong> {{ val }}&nbsp;&nbsp;
                    </span>
                  </div>
                </template>
                <template v-else>
                  {{ pendingTranslations[f.field] }}
                </template>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- ─── Empty state ────────────────────────────────────────────── -->
    <div v-else class="empty-state">
      <v-icon name="translate" />
      <p>{{ t("select_a_language") }}</p>
    </div>

    <!-- ─── Error snackbar ─────────────────────────────────────────── -->
    <transition name="fade">
      <div v-if="aiError" class="ai-error">
        <v-icon name="error_outline" small />
        {{ aiError }}
        <v-icon name="close" small clickable @click="aiError = null" />
      </div>
    </transition>

    <!-- ─── Delete Confirmation Dialog ─────────────────────────────── -->
    <v-dialog
      :model-value="langToDelete !== null"
      @update:model-value="!$event && cancelDelete()"
      @esc="cancelDelete"
    >
      <v-card>
        <v-card-text class="confirm-delete-text">
          Are you sure you want to delete this item? This action can not be
          undone.
        </v-card-text>
        <v-card-actions>
          <v-button secondary @click="cancelDelete">Cancel</v-button>
          <v-button danger @click="confirmDelete">Delete</v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useStores, useApi } from "@directus/extensions-sdk";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    value?: Record<string, any>[] | null;
    collection?: string;
    field?: string;
    primaryKey?: string | number;
    disabled?: boolean;
    languagesCollection?: string;
    languageIndicatorField?: string;
    languageField?: string;
    defaultLanguage?: string;
    translationsCollection?: string;
    userLanguage?: boolean;
    useCurrentUserLanguage?: boolean;
    defaultSplitView?: boolean;
    defaultOpenSplitView?: boolean;
    // AI API config
    configCollection?: string;
    configEntityType?: string;
    configUrlKey?: string;
    configTokenKey?: string;
    configModelKey?: string;
  }>(),
  {
    value: null,
    disabled: false,
    languagesCollection: "translations",
    languageIndicatorField: "code",
    languageField: undefined,
    defaultLanguage: undefined,
    translationsCollection: undefined,
    userLanguage: false,
    useCurrentUserLanguage: false,
    defaultSplitView: undefined,
    defaultOpenSplitView: false,
    configCollection: "global_configurations",
    configEntityType: "ai-api",
    configUrlKey: "url",
    configTokenKey: "token",
    configModelKey: "model",
  },
);

const emit = defineEmits<{
  (e: "input", value: Record<string, any>[]): void;
}>();

// ─────────────────────────────────────────────────────────────────────────────
// Stores & API
// ─────────────────────────────────────────────────────────────────────────────
const { useFieldsStore, useRelationsStore, useUserStore } = useStores();
const fieldsStore = useFieldsStore();
const relationsStore = useRelationsStore();
const userStore = useUserStore();
const api = useApi();
const { t } = useI18n();

const sourceSelect = ref<any>(null);
const targetSelect = ref<any>(null);

const activeLanguagesCollection = computed(
  () => props.languagesCollection || "translations",
);
const activeLanguageField = computed(
  () => props.languageIndicatorField || props.languageField || "code",
);
const startLanguage = computed(() => {
  if (props.useCurrentUserLanguage || props.userLanguage) {
    return (
      (userStore.currentUser as any)?.language ?? props.defaultLanguage ?? null
    );
  }

  return props.defaultLanguage ?? null;
});
const startSplitView = computed(
  () => props.defaultOpenSplitView ?? props.defaultSplitView ?? false,
);

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
const sourceLanguage = ref<string | null>(startLanguage.value);
const targetLanguage = ref<string | null>(null);
const aiTranslating = ref(false);
const aiTranslatingField = ref<string | null>(null);
const aiError = ref<string | null>(null);
const langToDelete = ref<string | null>(null);

const splitViewOn = ref(startSplitView.value);

/** Pending AI translations: fieldName → translated value (not yet accepted). */
const pendingTranslations = ref<Record<string, any>>({});
/** Track which fields are selected for translation via checkboxes. */
const selection = ref<string[]>([]);

const hasPending = computed(
  () => Object.keys(pendingTranslations.value).length > 0,
);

// Clear pending/selection when target language changes
watch(targetLanguage, () => {
  pendingTranslations.value = {};
  selection.value = [];
});

// ─────────────────────────────────────────────────────────────────────────────
// Pending helpers
// ─────────────────────────────────────────────────────────────────────────────
function applyAll() {
  if (!targetLanguage.value) return;
  for (const [fieldName, val] of Object.entries(pendingTranslations.value)) {
    setFieldValue(targetLanguage.value, fieldName, val);
  }
  pendingTranslations.value = {};
  selection.value = [];
}

function cancelAll() {
  pendingTranslations.value = {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolved translations collection (junction table)
// ─────────────────────────────────────────────────────────────────────────────
const resolvedTranslationsCollection = computed<string | null>(() => {
  if (props.translationsCollection) return props.translationsCollection;
  if (!props.collection || !props.field) return null;

  const relations = relationsStore.getRelationsForField(
    props.collection,
    props.field,
  );
  const relation =
    relations.find((r: any) => r.meta?.one_field === props.field) ??
    relations.find(
      (r: any) =>
        r.meta?.one_collection === props.collection &&
        r.meta?.one_field === props.field,
    ) ??
    relations[0];
  return relation?.collection ?? null;
});

const fetchedCollectionFields = ref<any[]>([]);

watch(
  resolvedTranslationsCollection,
  async (collection) => {
    fetchedCollectionFields.value = [];
    if (!collection) return;

    const storeFields = fieldsStore.getFieldsForCollection(collection) ?? [];
    if (storeFields.length > 0) {
      fetchedCollectionFields.value = storeFields;
      return;
    }

    try {
      const { data } = await api.get(`/fields/${collection}`);
      fetchedCollectionFields.value = data?.data ?? [];
    } catch (err) {
      console.error(
        "[ai-translations] Failed to load translation fields:",
        err,
      );
    }
  },
  { immediate: true },
);

const allFields = computed(() => {
  const col = resolvedTranslationsCollection.value;
  if (!col) return [];
  const storeFields = fieldsStore.getFieldsForCollection(col) ?? [];
  return storeFields.length > 0 ? storeFields : fetchedCollectionFields.value;
});

/**
 * The field in the junction table that is a foreign key to the languages collection.
 * Detected from the field schema (foreign_key_table) so it works for both
 * string-keyed (languages_code) and integer/UUID-keyed (languages_id) setups.
 */
const langFkField = computed<string>(() => {
  const fkField = allFields.value.find(
    (f: any) =>
      f.schema?.foreign_key_table === activeLanguagesCollection.value &&
      !f.schema?.is_primary_key,
  );
  if (fkField) {
    return fkField.field;
  }

  // Fallback: scan existing items for common naming patterns
  if (localItems.value.length > 0) {
    const sample = localItems.value[0];
    for (const candidate of [
      "translations_id",
      "translations_code",
      "languages_code",
      "languages_id",
      "language_code",
      "language_id",
    ]) {
      if (candidate in sample) {
        return candidate;
      }
    }
  }
  return "languages_code";
});

const langPkField = computed<string>(() => {
  const fields =
    fieldsStore.getFieldsForCollection(activeLanguagesCollection.value) ?? [];
  const pk = fields.find((f: any) => f.schema?.is_primary_key);
  return pk?.field || "id";
});

/**
 * Map from language code (e.g. 'en-US') to the actual FK value stored in the junction row.
 * If the FK points to the code column → value is the code string.
 * If the FK points to the id column → value is the language's primary key.
 */
const langCodeToFkValue = computed<Record<string, any>>(() => {
  const codeField = activeLanguageField.value;
  const fkFieldMeta = allFields.value.find(
    (f: any) => f.field === langFkField.value,
  );
  const fkToCodeField = fkFieldMeta?.schema?.foreign_key_column === codeField;

  const map: Record<string, any> = {};
  for (const lang of availableLanguages.value) {
    const code = lang[codeField];
    if (code == null) continue;
    map[code] = fkToCodeField
      ? code
      : (lang[langPkField.value] ?? lang.id ?? code);
  }
  return map;
});

const translatableFields = computed(() => {
  const skip = new Set([
    langFkField.value,
    "translations_id",
    "translations_code",
    "languages_code",
    "languages_id",
    "id",
    "sort",
    "date_created",
    "date_updated",
    "user_created",
    "user_updated",
  ]);
  return allFields.value.filter((f: any) => {
    if (skip.has(f.field)) return false;
    if (f.schema?.is_primary_key) return false;
    if (f.meta?.hidden) return false;
    return true;
  });
});

// Group consecutive half-width fields into pairs so they render side by side.
// Full-width fields (or an odd trailing half) each get their own group.
const fieldGroups = computed<any[][]>(() => {
  const groups: any[][] = [];
  const fields = translatableFields.value;
  let i = 0;
  while (i < fields.length) {
    const isHalf = fields[i].meta?.width === 'half';
    const nextIsHalf =
      i + 1 < fields.length && fields[i + 1].meta?.width === 'half';
    if (isHalf && nextIsHalf) {
      groups.push([fields[i], fields[i + 1]]);
      i += 2;
    } else {
      groups.push([fields[i]]);
      i++;
    }
  }
  return groups;
});

function unlabeled(f: any) {
  // Force width:full so v-form fills its container; the half/full layout is
  // already handled at the wrapper level via fieldGroups + .field-pair grid.
  return { ...f, name: null, meta: { ...f.meta, note: null, width: 'full' } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Languages
// ─────────────────────────────────────────────────────────────────────────────
const availableLanguages = ref<Record<string, any>[]>([]);

async function loadLanguages() {
  if (!activeLanguagesCollection.value) return;
  try {
    const { data } = await api.get(
      `/items/${activeLanguagesCollection.value}`,
      {
        params: { limit: -1 },
      },
    );
    availableLanguages.value = data.data || [];
  } catch (err) {
    console.error("[ai-translations] Failed to load languages:", err);
  }
}

watch(
  [activeLanguagesCollection, activeLanguageField],
  () => {
    void loadLanguages();
  },
  { immediate: true },
);

const languageSelectItems = computed(() =>
  availableLanguages.value.map((l) => ({
    text: l[activeLanguageField.value] || l.name || l.label || "Unknown",
    value: l[activeLanguageField.value],
  })),
);

// ─────────────────────────────────────────────────────────────────────────────
// Value handling
// ─────────────────────────────────────────────────────────────────────────────
const localItems = ref<Record<string, any>[]>([]);

// Tracks the JSON of the last value we emitted so the watcher can skip syncing
// back when it receives the echo of our own emit from the parent.
let _lastEmittedJSON = "";

function emitInput(value: Record<string, any>[]) {
  const serialized = JSON.stringify(value);
  _lastEmittedJSON = serialized;
  emit("input", JSON.parse(serialized));
  // Safety reset: if the parent never echoes back (edge case), clear after next tick
  nextTick(() => {
    if (_lastEmittedJSON === serialized) _lastEmittedJSON = "";
  });
}

watch(
  () => props.value,
  async (newVal) => {
    if (!Array.isArray(newVal)) {
      localItems.value = [];
      _lastEmittedJSON = "";
      return;
    }

    // Skip sync when this is just the parent echoing back our own emit.
    // Without this guard, a timing window where props.value hasn't updated
    // yet causes the watcher to overwrite localItems with the stale old value,
    // making it impossible to clear a field (e.g. the last repeater item).
    const incomingJSON = JSON.stringify(newVal);
    if (incomingJSON === _lastEmittedJSON) {
      _lastEmittedJSON = "";
      return;
    }

    // Directus might pass an array of primitive IDs if relations are not fully expanded in edit mode
    const isIds = newVal.length > 0 && typeof newVal[0] !== "object";
    if (isIds) {
      const col = resolvedTranslationsCollection.value;
      if (col) {
        try {
          const pkField =
            allFields.value.find((f: any) => f.schema?.is_primary_key)?.field ||
            "id";
          const { data } = await api.get(`/items/${col}`, {
            params: {
              filter: { [pkField]: { _in: newVal } },
              limit: -1,
            },
          });
          localItems.value = data.data || [];
          return;
        } catch (err) {
          console.error("[ai-transl] Failed to fetch items by ID", err);
        }
      }
    }

    localItems.value = JSON.parse(incomingJSON);
  },
  { deep: true, immediate: true },
);

function getRow(langCode: string): Record<string, any> | undefined {
  const fkField = langFkField.value;
  const fkValue = langCodeToFkValue.value[langCode];
  const codeField = activeLanguageField.value;

  const row = localItems.value.find((item) => {
    const val = item[fkField];
    if (typeof val === "object" && val !== null) {
      return val[codeField] === langCode;
    }
    return val == fkValue || val == langCode;
  });

  return row;
}

function getFieldValue(langCode: string, fieldName: string): any {
  return getRow(langCode)?.[fieldName] ?? null;
}

function getPrimaryKey(langCode: string): string | number {
  const row = getRow(langCode);
  if (!row) return "+";
  const pkField = allFields.value.find((f: any) => f.schema?.is_primary_key);
  return pkField ? (row[pkField.field] ?? "+") : (row.id ?? "+");
}

function setRowValues(langCode: string, updates: Record<string, any>) {
  const existingRow = getRow(langCode);
  if (existingRow) {
    const idx = localItems.value.indexOf(existingRow);
    localItems.value[idx] = { ...existingRow, ...updates };
  } else {
    const fkField = langFkField.value;
    const fkValue = langCodeToFkValue.value[langCode] ?? langCode;
    localItems.value.push({ [fkField]: fkValue, ...updates });
  }
  emitInput(localItems.value);
}

function setFieldValue(langCode: string, fieldName: string, value: any) {
  setRowValues(langCode, { [fieldName]: value });
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Interactivity (Draft/Data states)
// ─────────────────────────────────────────────────────────────────────────────
const drafts = ref<Set<string>>(new Set());

function hasContent(langCode: string | null): boolean {
  if (!langCode) return false;

  const row = getRow(langCode);
  if (!row) return false;

  const skip = new Set([
    langFkField.value,
    "languages_code",
    "languages_id",
    "id",
    "sort",
    "date_created",
    "date_updated",
    "user_created",
    "user_updated",
  ]);

  return Object.entries(row).some(([key, val]) => {
    if (skip.has(key)) return false;
    if (val == null) return false;

    if (typeof val === "string") return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "object") return Object.keys(val).length > 0;

    return true;
  });
}

function hasData(langCode: string | null): boolean {
  return hasContent(langCode);
}

function isDraft(langCode: string | null): boolean {
  if (!langCode) return false;
  return drafts.value.has(langCode);
}

function getLangIcon(langCode: string | null): string {
  if (!langCode) return "check_box_outline_blank";
  if (hasContent(langCode) || isDraft(langCode)) return "translate";
  return "check_box_outline_blank";
}

function sourceActionIcon(langCode: string | null): string {
  if (!langCode) return "close";
  return hasContent(langCode) ? "delete" : "close";
}

function targetActionIcon(langCode: string | null): string {
  if (!langCode) return "close";
  return hasContent(langCode) ? "delete" : "close";
}

function onMainIconClick(langCode: string | null) {
  if (!langCode) return;

  // Native-like: empty state toggles draft/active feel,
  // content state stays on translate icon.
  if (!hasContent(langCode) && !isDraft(langCode)) {
    drafts.value.add(langCode);
    drafts.value = new Set(drafts.value);
  } else if (!hasContent(langCode) && isDraft(langCode)) {
    drafts.value.delete(langCode);
    drafts.value = new Set(drafts.value);
  }
}

function removeDraft(langCode: string | null) {
  if (langCode) {
    drafts.value.delete(langCode);
    drafts.value = new Set(drafts.value);
  }
}

function sourceActionClick(langCode: string | null) {
  if (!langCode) return;

  if (hasContent(langCode)) {
    requestDelete(langCode);
  } else {
    removeDraft(langCode);
  }
}

function targetActionClick(langCode: string | null) {
  if (!langCode) return;

  if (hasContent(langCode)) {
    requestDelete(langCode);
  } else {
    removeDraft(langCode);
  }
}

function openSelect(refName: "source" | "target") {
  const select = refName === "source" ? sourceSelect.value : targetSelect.value;
  if (select && select.$el) {
    const btn =
      select.$el.querySelector("button.inline-display") ??
      select.$el.querySelector("button") ??
      select.$el;
    btn.click();
  }
}

function requestDelete(langCode: string | null) {
  if (!langCode) return;
  langToDelete.value = langCode;
}

function confirmDelete() {
  if (langToDelete.value) {
    deleteData(langToDelete.value);
    langToDelete.value = null;
  }
}

function cancelDelete() {
  langToDelete.value = null;
}

function deleteData(langCode: string | null) {
  if (!langCode) return;
  const existingRow = getRow(langCode);
  if (existingRow) {
    localItems.value = localItems.value.filter((item) => item !== existingRow);
    emitInput(localItems.value);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Translation
// ─────────────────────────────────────────────────────────────────────────────

// Payload sent with every AI API call so the endpoint can look up the right
// config rows without hardcoded values.
const aiConfig = computed(() => ({
  configCollection: props.configCollection,
  configEntityType: props.configEntityType,
  configUrlKey: props.configUrlKey,
  configTokenKey: props.configTokenKey,
  configModelKey: props.configModelKey,
}));

async function translateSingleField(
  fieldName: string,
  src: string,
  tgt: string,
): Promise<string | null> {
  const sourceText = getFieldValue(src, fieldName);
  if (!sourceText || typeof sourceText !== "string" || !sourceText.trim())
    return null;

  const { data } = await api.post("/ai-translations/translate", {
    text: sourceText,
    sourceLanguage: src,
    targetLanguage: tgt,
    ...aiConfig.value,
  });
  return data?.translated ?? null;
}

async function runAiTranslateAll() {
  if (
    !sourceLanguage.value ||
    !targetLanguage.value ||
    selection.value.length === 0
  )
    return;
  if (aiTranslating.value) return;

  aiError.value = null;
  aiTranslating.value = true;

  try {
    const textTypes = new Set(["string", "text", "json"]);
    const textInterfaces = new Set([
      "input",
      "input-multiline",
      "input-rich-text-html",
      "input-rich-text-md",
      "textarea",
    ]);
    const repeaterInterfaces = new Set(["list", "repeat"]);

    const batch: Record<string, string> = {};
    const repeaterFields: {
      fieldName: string;
      items: Record<string, any>[];
    }[] = [];

    for (const fieldName of selection.value) {
      const f = translatableFields.value.find(
        (tf: any) => tf.field === fieldName,
      );
      if (!f) continue;

      const val = getFieldValue(sourceLanguage.value!, f.field);

      // Handle repeater/list fields
      if (
        repeaterInterfaces.has(f.meta?.interface) &&
        Array.isArray(val) &&
        val.length > 0
      ) {
        repeaterFields.push({ fieldName: f.field, items: val });
        continue;
      }

      const typeMatch = textTypes.has(f.type);
      const interfaceMatch = textInterfaces.has(f.meta?.interface ?? "");
      if (!typeMatch && !interfaceMatch) continue;

      if (val && typeof val === "string" && val.trim()) {
        batch[f.field] = val;
      }
    }

    if (!Object.keys(batch).length && repeaterFields.length === 0) {
      aiError.value = "No translatable text found in selected fields.";
      return;
    }

    const next: Record<string, any> = { ...pendingTranslations.value };

    // Translate regular text fields in batch
    if (Object.keys(batch).length > 0) {
      const { data } = await api.post("/ai-translations/translate-batch", {
        fields: batch,
        sourceLanguage: sourceLanguage.value,
        targetLanguage: targetLanguage.value,
        ...aiConfig.value,
      });

      const translated: Record<string, string> = data.translated ?? {};
      for (const [fieldName, value] of Object.entries(translated)) {
        if (value && typeof value === "string") next[fieldName] = value;
      }
    }

    // Translate repeater fields item by item
    for (const { fieldName, items } of repeaterFields) {
      const translatedItems = [];
      for (const item of items) {
        const translatedItem: Record<string, any> = {};
        for (const [key, val] of Object.entries(item)) {
          if (
            typeof val === "string" &&
            val.trim().length > 0 &&
            key !== "key"
          ) {
            const { data } = await api.post("/ai-translations/translate", {
              text: val,
              sourceLanguage: sourceLanguage.value,
              targetLanguage: targetLanguage.value,
              ...aiConfig.value,
            });
            translatedItem[key] = data?.translated ?? val;
          } else {
            translatedItem[key] = val;
          }
        }
        translatedItems.push(translatedItem);
      }
      next[fieldName] = translatedItems;
    }

    pendingTranslations.value = next;
  } catch (err: any) {
    aiError.value = `Translation failed: ${err?.response?.data?.error ?? err?.message ?? "Unknown error"}`;
  } finally {
    aiTranslating.value = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-select languages once loaded
// ─────────────────────────────────────────────────────────────────────────────
watch(
  availableLanguages,
  (langs) => {
    if (!langs?.length) return;
    const key = activeLanguageField.value;
    if (!sourceLanguage.value) sourceLanguage.value = langs[0][key];
    if (!targetLanguage.value && langs.length > 1) {
      targetLanguage.value =
        langs.find((l) => l[key] !== sourceLanguage.value)?.[key] ?? null;
    }
  },
  { immediate: true },
);
</script>

<style scoped>
/* ── Wrapper ───────────────────────────────────────────────── */
.translations {
  position: relative;
  --ai-translate-purple: #7c3aed;
}

/* ── Lang Selectors ────────────────────────────────────────── */
.header-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.header-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--theme--foreground);
  margin: 0;
}

.lang-selectors {
  display: grid;
  gap: 8px;
}
.lang-selectors.is-split {
  grid-template-columns: 1fr 32px 1fr;
}
.lang-selectors:not(.is-split) {
  grid-template-columns: 1fr;
}
.lang-gap {
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lang-gap-icon {
  --v-icon-color: var(--ai-translate-purple);
  opacity: 0.7;
}

.lang-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  inline-size: 100%;
  block-size: var(--theme--form--field--input--height, 44px);
  padding: var(--theme--form--field--input--padding, 12px 16px);
  border-radius: var(--theme--border-radius);
  font-weight: 600;
  min-width: 0;
  text-align: start;
  cursor: pointer;
  overflow: hidden;
}

.lang-box-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.lang-select {
  flex: 1;
  min-width: 0;
  margin-right: 4px;
  --v-select-color: inherit;
  --v-select-font-weight: 600;
}

.lang-select :deep(.v-icon) {
  display: none !important;
}

.lang-box :deep(.v-select) {
  --v-select-color: inherit;
}

.lang-icon,
.split-toggle,
.lang-action {
  color: inherit;
  opacity: 0.7;
  flex-shrink: 0;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
  will-change: transform, opacity;
}

.lang-box.source-lang {
  background-color: var(--theme--primary-background, var(--theme--primary-10));
  color: var(--theme--primary);
  --v-icon-color: var(--theme--primary);
  --v-icon-color-hover: var(--theme--primary-accent);
}

.lang-box.target-lang {
  background-color: var(
    --theme--secondary-background,
    var(--theme--secondary-10, #fce4ec)
  );
  color: var(--theme--secondary);
  --v-icon-color: var(--theme--secondary);
  --v-icon-color-hover: var(--theme--secondary-accent, #c2185b);
}

/* ── AI Actions ────────────────────────────────────────────── */
.ai-actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
.mr-2 {
  margin-right: 8px;
}

/* Purple icon used in all AI action buttons */
.ai-purple-icon {
  --v-icon-color: var(--ai-translate-purple) !important;
}

/* AI Translate button: gray by default, all-purple when fields are selected */
.ai-translate-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--theme--foreground-subdued);
  border-radius: var(--theme--border-radius);
  background: transparent;
  color: var(--theme--foreground-subdued);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  cursor: not-allowed;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
  --v-icon-color: var(--theme--foreground-subdued) !important;
}
.ai-translate-btn:not(:disabled) {
  cursor: pointer;
}
.ai-translate-btn:hover:not(:disabled) {
  background: color-mix(
    in srgb,
    var(--theme--foreground-subdued) 8%,
    transparent
  );
}
.ai-translate-btn--active {
  border-color: var(--ai-translate-purple);
  color: var(--ai-translate-purple);
  --v-icon-color: var(--ai-translate-purple) !important;
}
.ai-translate-btn--active:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ai-translate-purple) 8%, transparent);
}
.ai-translate-btn__icon {
  flex-shrink: 0;
}

.ai-toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--ai-translate-purple);
  border-radius: var(--theme--border-radius);
  background: transparent;
  color: var(--ai-translate-purple);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
  --v-icon-color: var(--ai-translate-purple) !important;
}
.ai-toolbar-btn:hover {
  background: color-mix(in srgb, var(--ai-translate-purple) 8%, transparent);
}
.ai-toolbar-btn__icon {
  flex-shrink: 0;
}

/* Checkbox: always purple regardless of checked/unchecked state */
.ai-checkbox {
  --v-checkbox-color: var(--ai-translate-purple) !important;
  --v-checkbox-color-checked: var(--ai-translate-purple) !important;
}
.ai-checkbox :deep(.v-icon) {
  --v-icon-color: var(--ai-translate-purple) !important;
}
.lang-action {
  opacity: 0.7;
}

.lang-action.is-visible {
  opacity: 1;
}

.has-content .lang-icon,
.has-content .split-toggle,
.has-content .dropdown-icon {
  opacity: 1;
}

.lang-box:hover .lang-action,
.lang-box:hover .split-toggle,
.lang-box:hover .lang-icon,
.lang-box:hover .dropdown-icon {
  opacity: 1;
}

.lang-box:hover .lang-action:hover,
.lang-box:hover .split-toggle:hover,
.lang-box:hover .lang-icon:hover {
  opacity: 1;
  transform: scale(1.05);
}

/* ── Field rows ────────────────────────────────────────────── */
.fields-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.field-row-inputs {
  display: grid;
  grid-template-columns: 1fr 32px 1fr;
  align-items: start;
  gap: 8px;
}

.field-row-inputs:not(.is-split) {
  grid-template-columns: 1fr;
}

.field-input-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  border-radius: var(--theme--border-radius, 6px);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
}

/* Two half-width fields side by side */
.field-input-col.field-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

/* Individual field slot inside a pair */
.field-sub-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

/* Pending state on sub-col */
.field-sub-col.pending {
  background: color-mix(in srgb, var(--ai-translate-purple) 10%, white);
  padding: 8px;
  margin: -8px;
}

/* ── AI icon column ────────────────────────────────────────── */
.field-ai-col {
  display: flex;
  align-items: start;
  justify-content: center;
  padding-top: 35px;
  color: var(--theme--primary, var(--primary));
}

/* Stacked checkboxes for paired half-width fields */
.field-ai-col.field-pair {
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding-top: 0;
}

.field-ai-col.field-pair .ai-checkbox {
  padding-top: 35px;
}

/* ── Native Labels ─────────────────────────────────────────── */
.native-field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.native-field-label .label-text {
  font-size: inherit;
  font-weight: var(--theme--form--field--label--font-weight, 600);
  color: var(--theme--form--field--label--color, var(--foreground-subdued));
}

/* ── Field note ────────────────────────────────────────────── */
.field-note {
  margin: -2px 0 6px;
  font-size: 12px;
  color: var(--theme--foreground-subdued, var(--foreground-subdued));
  line-height: 1.5;
}

/* ── Lang badges ───────────────────────────────────────────── */
.lang-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.lang-badge.source {
  background: var(--theme--primary-subdued, var(--primary-25));
  color: var(--theme--primary, var(--primary));
}

.lang-badge.target {
  background: var(--theme--secondary-subdued, var(--secondary-25, #fce4ec));
  color: var(--theme--secondary, var(--secondary, #e91e63));
}

/* ── Pending translated text ────────────────────────────────── */
.pending-translation-text {
  margin-top: 4px;
  font-size: 13px;
  color: var(--ai-translate-purple);
  font-style: italic;
  word-break: break-word;
  background: color-mix(in srgb, var(--ai-translate-purple) 8%, white);
  padding: 6px 10px;
  border-radius: 6px;
  border-left: 3px solid
    color-mix(in srgb, var(--ai-translate-purple) 70%, white);
}

/* ── Per-field accept / cancel icons (legacy style preserved for reference if needed) ── */
.pending-action {
  flex-shrink: 0;
}

.pending-action.apply {
  color: var(--theme--success, var(--success, #4caf50));
}

.pending-action.cancel {
  color: var(--theme--danger, var(--danger, #f44336));
}

/* ── Suppress v-form's built-in field label ────────────────── */
.inline-form :deep(.type-label),
.inline-form :deep(.field-label) {
  display: none;
}

/* ── Suppress v-form internal field padding ───────────────────── */
.inline-form :deep(.field) {
  padding: 0 !important;
  margin-top: 0 !important;
}

.inline-form :deep(.v-form-column) {
  padding: 0 !important;
}

/* ── Spinning AI icon ──────────────────────────────────────── */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ── Empty state ───────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  color: var(--theme--foreground-subdued, var(--foreground-subdued));
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* ── Error banner ──────────────────────────────────────────── */
.ai-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 14px;
  padding: 8px 12px;
  border-radius: var(--theme--border-radius, var(--border-radius));
  background: var(--theme--danger-background, var(--danger-25));
  color: var(--theme--danger, var(--danger));
  font-size: 13px;
}

/* ── Delete Modal ─────────────────────────────────────────── */
.confirm-delete-text {
  padding: 24px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  line-height: 1.6 !important;
  color: var(--theme--foreground, var(--foreground));
}
.icon-morph-enter-active,
.icon-morph-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
  transform-origin: center center;
}

.icon-morph-enter-from {
  opacity: 0;
  transform: scale(0.72) rotate(-8deg);
}

.icon-morph-enter-to {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}

.icon-morph-leave-from {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}

.icon-morph-leave-to {
  opacity: 0;
  transform: scale(0.72) rotate(8deg);
}

/* ── Transitions ───────────────────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.lang-icon--spin {
  animation: icon-rotate-in 0.35s ease;
}

@keyframes icon-rotate-in {
  0% {
    transform: rotate(-90deg) scale(0.7);
    opacity: 0;
  }
  60% {
    transform: rotate(10deg) scale(1.05);
    opacity: 1;
  }
  100% {
    transform: rotate(0deg) scale(1);
  }
}
</style>
