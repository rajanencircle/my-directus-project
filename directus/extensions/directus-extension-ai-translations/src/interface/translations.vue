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
        <v-menu attached placement="bottom-start" class="language-select">
          <template #activator="{ toggle, active }">
            <button
              class="lang-box source-lang"
              type="button"
              :class="{
                'has-content': hasContent(sourceLanguage),
                'is-draft': isDraft(sourceLanguage),
              }"
              @click="toggle"
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
                  />
                </transition>

                <span class="display-value">{{
                  languageSelectItems.find((i) => i.value === sourceLanguage)
                    ?.text || sourceLanguage
                }}</span>
              </div>

              <div class="lang-actions controls" @click.stop @mousedown.stop>
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
                  class="dropdown-icon expand"
                  :class="{ active }"
                  clickable
                  @click.stop="toggle"
                />
              </div>
            </button>
          </template>

          <v-list v-if="languageSelectItems" class="language-select-dropdown">
            <v-list-item
              v-for="item in languageSelectItems"
              :key="item.value"
              clickable
              @click="sourceLanguage = item.value"
            >
              <div class="start">
                <div class="dot" :class="{ show: isDraft(item.value) }"></div>
                {{ item.text }}
              </div>
              <div class="end">
                <div
                  class="custom-progress-linear"
                  v-tooltip="
                    `${Math.round(getTranslationProgress(item.value))}%`
                  "
                >
                  <div class="custom-progress-background"></div>
                  <div
                    class="custom-progress-fill"
                    :style="{
                      width:
                        Math.round(getTranslationProgress(item.value)) + '%',
                    }"
                  ></div>
                </div>
              </div>
            </v-list-item>
          </v-list>
        </v-menu>

        <!-- Language Icon Gap -->
        <div class="lang-gap" v-show="splitViewOn">
          <v-icon name="language" class="lang-gap-icon" />
        </div>

        <!-- Target Lang Selector -->
        <v-menu
          v-show="splitViewOn"
          attached
          placement="bottom-start"
          class="language-select"
        >
          <template #activator="{ toggle, active }">
            <button
              class="lang-box target-lang"
              type="button"
              :class="{
                'has-content': hasContent(targetLanguage),
                'is-draft': isDraft(targetLanguage),
              }"
              @click="toggle"
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
                  />
                </transition>

                <span class="display-value">{{
                  languageSelectItems.find((i) => i.value === targetLanguage)
                    ?.text || targetLanguage
                }}</span>
              </div>

              <div class="lang-actions controls" @click.stop @mousedown.stop>
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
                  class="dropdown-icon expand"
                  :class="{ active }"
                  clickable
                  @click.stop="toggle"
                />
              </div>
            </button>
          </template>

          <v-list v-if="languageSelectItems" class="language-select-dropdown">
            <v-list-item
              v-for="item in languageSelectItems"
              :key="item.value"
              clickable
              @click="targetLanguage = item.value"
            >
              <div class="start">
                <div class="dot" :class="{ show: isDraft(item.value) }"></div>
                {{ item.text }}
              </div>
              <div class="end">
                <div
                  class="custom-progress-linear"
                  v-tooltip="
                    `${Math.round(getTranslationProgress(item.value))}%`
                  "
                >
                  <div class="custom-progress-background"></div>
                  <div
                    class="custom-progress-fill"
                    :style="{
                      width:
                        Math.round(getTranslationProgress(item.value)) + '%',
                    }"
                  ></div>
                </div>
              </div>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <!-- ─── Field rows (nested groups + leaf fields) ───────────────── -->
    <div
      v-if="sourceLanguage && (targetLanguage || !splitViewOn)"
      class="fields-container"
    >
      <FieldTreeRows
        :nodes="fieldTree"
        :split-view-on="splitViewOn"
        :source-language="sourceLanguage"
        :target-language="targetLanguage"
        :disabled="disabled"
        :ai-translating="aiTranslating"
        :selection="selection"
        :pending-translations="pendingTranslations"
        :open-groups="openGroups"
        :unlabeled="unlabeled"
        :get-row="getRow"
        :get-primary-key="getPrimaryKey"
        :set-field-value="setFieldValue"
        :toggle-open="toggleGroupOpen"
        :is-open="isGroupOpen"
        @update:selection="selection = $event"
      />
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
// @ts-ignore - Directus provides vue-i18n at runtime
import { useI18n } from "vue-i18n";
import { useStores, useApi } from "@directus/extensions-sdk";
import FieldTreeRows from "./FieldTreeRows.vue";
import {
  buildFieldTree,
  collectLeafFields,
  type AnyField,
} from "./fieldTree";

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
/** Track which leaf fields are selected for AI translation. */
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
  selection.value = [];
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

/** Leaf fields only — exclude group containers from progress / AI batches. */
const leafTranslatableFields = computed(() =>
  collectLeafFields(translatableFields.value as AnyField[]),
);

const fieldTree = computed(() =>
  buildFieldTree(translatableFields.value as AnyField[]),
);

/** Explicit open/closed overrides; missing keys fall back to group options.start. */
const openGroups = ref<Record<string, boolean>>({});

function isGroupOpen(fieldName: string, startOpen: boolean): boolean {
  if (fieldName in openGroups.value) return openGroups.value[fieldName]!;
  return startOpen;
}

function toggleGroupOpen(fieldName: string, startOpen: boolean) {
  openGroups.value = {
    ...openGroups.value,
    [fieldName]: !isGroupOpen(fieldName, startOpen),
  };
}

function unlabeled(f: any) {
  // Force width:full so v-form fills its container; half/full pairing is
  // handled at the leaf-row wrapper level via field-pair grid.
  // Clear meta.group so nested Detail Group fields render as root fields —
  // v-form skips anything that still belongs to a parent group.
  const { group: _group, ...rest } = f;
  return {
    ...rest,
    name: null,
    group: null,
    meta: { ...f.meta, note: null, width: "full", group: null },
  };
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

function getTranslationProgress(langCode: string | null): number {
  if (!langCode) return 0;
  const row = getRow(langCode);
  if (!row) return 0;

  const total = leafTranslatableFields.value.length;
  if (total === 0) return 0;

  let filled = 0;
  for (const field of leafTranslatableFields.value) {
    const val = row[field.field];
    let isFilled = false;

    if (val != null) {
      if (typeof val === "string") {
        isFilled = val.trim().length > 0;
      } else if (Array.isArray(val)) {
        isFilled = val.length > 0;
      } else if (typeof val === "object") {
        isFilled = Object.keys(val).length > 0;
      } else {
        isFilled = true;
      }
    }
    if (isFilled) filled++;
  }

  return (filled / total) * 100;
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

// Identifiers sent with every AI API call so the endpoint can load the right
// interface options server-side from directus_fields — the actual config
// values (collection name, keys, etc.) never travel over the wire.
const aiSourceRef = computed(() => ({
  sourceCollection: props.collection,
  sourceField: props.field,
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
    ...aiSourceRef.value,
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
      const f = leafTranslatableFields.value.find(
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
        ...aiSourceRef.value,
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
              ...aiSourceRef.value,
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
  position: relative;
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
  border: none;
}

.lang-box-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.lang-box .expand {
  transition: transform var(--medium) var(--transition-out);
}
.lang-box .expand.active {
  transform: scaleY(-1);
  transition-timing-function: var(--transition-in);
}

.lang-box .display-value {
  flex-grow: 1;
}

.lang-box .controls {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
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
  --v-icon-color-hover: var(--theme--secondary-accent, #ec407a);
}
</style>

<style scoped>
.language-select-dropdown.v-list {
  padding: 0;
}

.language-select-dropdown .v-list-item {
  display: flex;
  gap: 0.5625rem;
  align-items: center;
  justify-content: space-between;
  white-space: nowrap;
  cursor: pointer;
  padding-block: 0.25rem;
}

.language-select-dropdown .v-list-item .start {
  display: flex;
  flex: 1;
  align-items: center;
}

.language-select-dropdown .v-list-item .end {
  display: flex;
  flex-grow: 1;
  gap: 0.5625rem;
  align-items: center;
  justify-content: flex-end;
  color: var(--theme--form--field--input--foreground-subdued);
}

.language-select-dropdown .v-list-item:hover {
  background-color: var(--theme--background-normal);
}

.language-select-dropdown .v-list-item .dot {
  inline-size: 0.4375rem;
  block-size: 100%;
}

.language-select-dropdown .v-list-item .dot.show::before {
  display: block;
  inline-size: 0.25rem;
  block-size: 0.25rem;
  background-color: var(--theme--form--field--input--foreground-subdued);
  border-radius: 2px;
  content: "";
}

.language-select-dropdown .v-list-item .custom-progress-linear {
  position: relative;
  max-inline-size: none;
  width: 80px;
  height: 4px;
  border-radius: 999px;
  overflow: hidden;
  background-color: var(--theme--background-normal, #f0f4f8);
}

.language-select-dropdown .v-list-item .custom-progress-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #e4eaf1;
  opacity: 1;
}

.language-select-dropdown .v-list-item .custom-progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 999px;
  background-color: #2ecda7;
  transition: width 0.3s ease;
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
.fields-container :deep(.ai-checkbox) {
  --v-checkbox-color: var(--ai-translate-purple) !important;
  --v-checkbox-color-checked: var(--ai-translate-purple) !important;
  color: var(--ai-translate-purple) !important;
}
.fields-container :deep(.ai-checkbox .v-icon) {
  --v-icon-color: var(--ai-translate-purple) !important;
  color: var(--ai-translate-purple) !important;
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

/* ── Field rows (pierce FieldTreeRows child) ───────────────── */
.fields-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.fields-container :deep(.field-row-inputs) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px minmax(0, 1fr);
  grid-template-rows: auto auto auto;
  align-items: start;
  gap: 8px;
  min-width: 0;
  container-type: inline-size;
  container-name: field-row;
}

.fields-container :deep(.field-row-inputs:not(.is-split)) {
  grid-template-columns: minmax(0, 1fr);
}

.fields-container :deep(.field-input-col) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  border-radius: var(--theme--border-radius, 6px);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.fields-container :deep(.field-input-col.field-pair) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: subgrid;
  grid-row: 1 / span 3;
  gap: 16px;
  align-items: start;
  min-width: 0;
}

.fields-container :deep(.field-input-col.field-pair > .field-sub-col) {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: 1 / span 3;
  gap: 4px;
}

.fields-container :deep(.field-sub-col) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  position: relative;
}

.fields-container :deep(.field-sub-col.pending) {
  background: color-mix(in srgb, var(--ai-translate-purple) 10%, white);
  padding: 8px;
  margin: -8px;
}

.fields-container :deep(.field-ai-col) {
  display: flex;
  align-items: start;
  justify-content: center;
  padding-top: 35px;
  color: var(--theme--primary, var(--primary));
}

.fields-container :deep(.field-ai-col.field-pair) {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: 1 / span 3;
  padding-top: 0;
}

.fields-container :deep(.ai-checkbox-stack) {
  grid-row: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.fields-container :deep(.field-ai-col.group-header-spacer) {
  padding-top: 0;
}

.fields-container :deep(.field-input-col.field-pair .native-field-label) {
  align-items: start;
}

@container field-row (max-width: 360px) {
  .fields-container :deep(.field-row-inputs:not(.is-split) .field-input-col.field-pair) {
    display: block;
  }

  .fields-container :deep(.field-row-inputs:not(.is-split) .field-input-col.field-pair > .field-sub-col) {
    display: flex;
    flex-direction: column;
    grid-row: auto;
  }
}

@container field-row (max-width: 752px) {
  .fields-container :deep(.field-row-inputs.is-split) {
    grid-template-rows: repeat(6, auto);
  }

  .fields-container :deep(.field-row-inputs.is-split .field-input-col.field-pair) {
    grid-template-columns: minmax(0, 1fr);
    grid-row: 1 / span 6;
  }

  .fields-container :deep(.field-row-inputs.is-split .field-input-col.field-pair > .field-sub-col) {
    grid-row: span 3;
  }

  .fields-container :deep(.field-row-inputs.is-split .field-ai-col.field-pair) {
    grid-row: 1 / span 6;
  }

  .fields-container :deep(.field-row-inputs.is-split .ai-checkbox-stack) {
    display: contents;
  }

  .fields-container :deep(.field-row-inputs.is-split .ai-checkbox-stack .ai-checkbox:nth-child(1)) {
    grid-row: 2;
  }

  .fields-container :deep(.field-row-inputs.is-split .ai-checkbox-stack .ai-checkbox:nth-child(2)) {
    grid-row: 5;
  }
}

/* ── Input labels only (never .group-divider title) ───────────
   Match native Directus: .field .field-label.type-label */
.fields-container :deep(.native-field-label) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.fields-container :deep(.native-field-label .label-text),
.fields-container :deep(.native-field-label .label-text.type-label) {
  font-family: var(
    --theme--form--field--label--font-family,
    var(--theme--fonts--sans--font-family, inherit)
  );
  font-size: 11px !important;
  font-weight: var(--theme--form--field--label--font-weight, 600);
  line-height: 1.2143;
  letter-spacing: 0.03em !important;
  text-transform: uppercase !important;
  color: var(
    --theme--form--field--label--foreground,
    var(--theme--foreground-subdued, var(--foreground-subdued))
  );
}

/* ── Detail / raw / accordion group chrome ─────────────────── */
/* Native Detail Group title: same v-divider.large as Directus.
   Do not style .native-field-label / .label-text / .type-label here. */
.fields-container :deep(.group-toggle) {
  display: block;
  inline-size: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: start;
}

.fields-container :deep(.group-divider .type-text),
.fields-container :deep(.group-divider .title) {
  /* Detail title only — never touches .native-field-label */
  color: var(--v-divider-label-color, #008cc0);
}

.fields-container :deep(.group-divider .expand-icon) {
  float: inline-end;
  color: var(--v-divider-label-color, #008cc0);
  transform: rotate(90deg) !important;
  transition: transform var(--fast, 125ms) var(--transition, ease-in-out);
}

.fields-container :deep(.group-divider.active .expand-icon) {
  transform: rotate(0deg) !important;
}

.fields-container :deep(.group-divider .lang-badge) {
  margin-inline-start: 8px;
  vertical-align: middle;
}

.fields-container :deep(.group-body) {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding-left: calc(var(--group-depth, 0) * 4px);
  padding-top: 16px;
  padding-bottom: 8px;
}

.fields-container :deep(.group-header-row) {
  margin-top: 4px;
}

/* ── Field note ────────────────────────────────────────────── */
.fields-container :deep(.field-note) {
  margin: -2px 0 6px;
  font-size: 12px;
  color: var(--theme--foreground-subdued, var(--foreground-subdued));
  line-height: 1.5;
}

/* ── Lang badges ───────────────────────────────────────────── */
.fields-container :deep(.lang-badge) {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.fields-container :deep(.lang-badge.source) {
  background: var(--theme--primary-subdued, var(--primary-25));
  color: var(--theme--primary, var(--primary));
}

.fields-container :deep(.lang-badge.target) {
  background: var(--theme--secondary-subdued, var(--secondary-25, #fce4ec));
  color: var(--theme--secondary, var(--secondary, #e91e63));
}

/* ── Pending translated text ────────────────────────────────── */
.fields-container :deep(.pending-translation-text) {
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

/* ── v-form's built-in field label ────────────────────────────
   We render our own native-field-label instead of the label text, so
   suppress the text/dot/avatars — but keep the dropdown arrow, since
   that's also the click target for Directus's raw-value context menu
   (Edit/Copy/Paste/Undo/Clear), which we still want to work here.
   The arrow only fades in on :hover of its own (otherwise tiny,
   empty) row, which used to sit invisibly below our own label — so
   hovering our visible label never revealed it. Overlay the native
   label over our own label's full area instead, so hovering/clicking
   our label is what reveals and triggers it. */
.fields-container :deep(.inline-form .field),
.fields-container :deep(.inline-form .v-menu),
.fields-container :deep(.inline-form .v-menu-activator) {
  position: static !important;
}

.fields-container :deep(.inline-form .field-label) {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  block-size: 1.4em;
  margin: 0 !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center;
  justify-content: flex-end;
  background: transparent;
}

.fields-container :deep(.inline-form .field-label-content),
.fields-container :deep(.inline-form .edit-dot),
.fields-container :deep(.inline-form .spacer),
.fields-container :deep(.inline-form .collab-field) {
  display: none !important;
}

/* ── Suppress v-form internal field padding ───────────────────── */
.fields-container :deep(.inline-form .field) {
  padding: 0 !important;
  margin-top: 0 !important;
}

.fields-container :deep(.inline-form .v-form-column) {
  padding: 0 !important;
}

/* ── Prevent v-form's own grid from refusing to shrink ─────────
   Directus's v-form lays fields out on a grid whose columns default
   to a fixed minmax(200px+, 1fr) track. That min width doesn't yield
   to our flex/grid parents' min-width:0, so at narrow panel widths
   the two half-width fields in a pair overlapped instead of shrinking. */
.fields-container :deep(.inline-form),
.fields-container :deep(.inline-form .v-form),
.fields-container :deep(.inline-form .v-form-column),
.fields-container :deep(.inline-form .field) {
  min-width: 0 !important;
}

.fields-container :deep(.inline-form .v-form) {
  grid-template-columns: minmax(0, 1fr) !important;
}

/* The wrapper overrides above don't help if the actual control inside
   (button, input, the select trigger, etc.) carries its own hardcoded
   min-width from Directus core CSS — the column then physically can
   never shrink far enough for the field-row container query below to
   ever match. Force every descendant to be free to shrink. */
.fields-container :deep(.inline-form *) {
  min-width: 0 !important;
}

.fields-container :deep(.inline-form .field > *),
.fields-container :deep(.inline-form .v-input),
.fields-container :deep(.inline-form .v-select),
.fields-container :deep(.inline-form button) {
  width: 100% !important;
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
