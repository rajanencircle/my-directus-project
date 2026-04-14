<template>
  <div class="translations-ai">
    <!-- Language Tabs -->
    <div class="tabs-container">
      <v-tabs v-model="currentTab" class="language-tabs">
        <v-tab
          v-for="language in languageItems"
          :key="language.value"
          :value="language.value"
          class="language-tab"
        >
          <span class="language-flag" v-if="language.flag">{{
            language.flag
          }}</span>
          <span class="language-label">{{ language.text }}</span>
          <v-icon
            v-if="hasChanges(language.value)"
            name="fiber_manual_record"
            small
            class="unsaved-dot"
          />
        </v-tab>
      </v-tabs>

      <!-- AI Translate Button -->
      <div class="tab-actions">
        <v-button
          class="ai-translate-btn"
          :disabled="!currentTab || selectedFields.length === 0"
          :loading="isTranslating"
          @click="openTranslationModal"
          v-tooltip="
            selectedFields.length === 0
              ? 'Select fields to translate'
              : 'AI Translate selected fields'
          "
        >
          <v-icon name="auto_awesome" small />
          <span>AI Translate</span>
          <span v-if="selectedFields.length > 0" class="badge">{{
            selectedFields.length
          }}</span>
        </v-button>
      </div>
    </div>

    <!-- Translation Fields -->
    <div class="translation-content">
      <div v-if="!currentTab" class="empty-state">
        <v-icon name="translate" x-large />
        <p>Select a language to start editing translations</p>
      </div>

      <template v-else>
        <div
          v-for="field in translationFields"
          :key="field.field"
          class="field-row"
          :class="{ 'field-selected': isFieldSelected(field.field) }"
        >
          <!-- Checkbox -->
          <div class="field-checkbox">
            <v-checkbox
              :model-value="isFieldSelected(field.field)"
              @update:model-value="toggleFieldSelection(field.field)"
              :title="`Select ${field.name || field.field} for translation`"
            />
          </div>

          <!-- Field Interface -->
          <div class="field-content">
            <div class="field-label">
              <span class="field-name">{{ field.name || field.field }}</span>
              <span v-if="isFieldSelected(field.field)" class="selected-badge"
                >Selected</span
              >
            </div>
            <interface-component
              :field="field"
              :value="getFieldValue(currentTab, field.field)"
              :collection="junctionCollection"
              :primary-key="getPrimaryKey(currentTab)"
              @input="setFieldValue(currentTab, field.field, $event)"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- AI Translation Modal -->
    <v-dialog
      v-model="showTranslationModal"
      class="translation-modal"
      :style="{ '--v-dialog-width': '900px' }"
    >
      <v-card class="modal-card">
        <!-- Modal Header -->
        <v-card-title class="modal-header">
          <div class="modal-title-section">
            <div class="modal-icon">
              <v-icon name="auto_awesome" />
            </div>
            <div>
              <h2 class="modal-title">AI Translation Preview</h2>
              <p class="modal-subtitle">
                Translating {{ selectedFields.length }} field{{
                  selectedFields.length > 1 ? "s" : ""
                }}
                from <strong>{{ getLanguageLabel(sourceLanguage) }}</strong> to
                <strong>{{ getLanguageLabel(currentTab) }}</strong>
              </p>
            </div>
          </div>
          <v-button icon rounded secondary @click="closeModal">
            <v-icon name="close" />
          </v-button>
        </v-card-title>

        <!-- Modal Body -->
        <v-card-text class="modal-body">
          <!-- Source Language Selector -->
          <div class="source-selector">
            <label class="source-label">Translate from:</label>
            <v-select
              v-model="sourceLanguage"
              :items="availableSourceLanguages"
              placeholder="Select source language"
              class="source-select"
            />
          </div>

          <!-- Fetch Button (if not yet fetched) -->
          <div
            v-if="!translationsLoaded && !isTranslating"
            class="fetch-section"
          >
            <v-button
              @click="fetchTranslations"
              :disabled="!sourceLanguage"
              large
            >
              <v-icon name="translate" />
              Fetch AI Translations
            </v-button>
          </div>

          <!-- Loading State -->
          <div v-if="isTranslating" class="loading-state">
            <div class="loading-animation">
              <div class="pulse-ring"></div>
              <v-icon name="auto_awesome" x-large />
            </div>
            <p class="loading-text">Generating translations...</p>
            <p class="loading-subtext">
              Calling translation workflow for
              {{ selectedFields.length }} fields
            </p>
          </div>

          <!-- Translation Table -->
          <template v-if="translationsLoaded && !isTranslating">
            <div class="translation-table-wrapper">
              <table class="translation-table">
                <thead>
                  <tr>
                    <th class="col-field">
                      <div class="th-content">
                        <v-icon name="label" x-small />
                        Field
                      </div>
                    </th>
                    <th class="col-source">
                      <div class="th-content">
                        <span class="lang-flag">{{
                          getLanguageFlag(sourceLanguage)
                        }}</span>
                        {{ getLanguageLabel(sourceLanguage) }}
                        <span class="col-badge source-badge">Source</span>
                      </div>
                    </th>
                    <th class="col-current">
                      <div class="th-content">
                        <span class="lang-flag">{{
                          getLanguageFlag(currentTab)
                        }}</span>
                        {{ getLanguageLabel(currentTab) }}
                        <span class="col-badge current-badge">Current</span>
                      </div>
                    </th>
                    <th class="col-new">
                      <div class="th-content">
                        <v-icon name="auto_awesome" x-small />
                        AI Translation
                        <span class="col-badge new-badge">New</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, index) in translationPreview"
                    :key="item.field"
                    class="table-row"
                    :class="{ 'row-even': index % 2 === 0 }"
                  >
                    <td class="col-field">
                      <div class="field-pill">
                        <v-icon name="text_fields" x-small />
                        {{ item.fieldLabel }}
                      </div>
                    </td>
                    <td class="col-source">
                      <div class="cell-content source-content">
                        <span v-if="item.sourceValue" class="cell-text">{{
                          item.sourceValue
                        }}</span>
                        <span v-else class="empty-cell">— empty —</span>
                      </div>
                    </td>
                    <td class="col-current">
                      <div class="cell-content current-content">
                        <span v-if="item.currentValue" class="cell-text">{{
                          item.currentValue
                        }}</span>
                        <span v-else class="empty-cell">— empty —</span>
                      </div>
                    </td>
                    <td class="col-new">
                      <div class="cell-content new-content">
                        <div v-if="item.loading" class="cell-loading">
                          <div class="dot-pulse">
                            <span></span><span></span><span></span>
                          </div>
                        </div>
                        <div v-else-if="item.error" class="cell-error">
                          <v-icon name="error_outline" x-small />
                          {{ item.error }}
                        </div>
                        <div v-else class="new-translation-cell">
                          <v-textarea
                            v-if="isLongText(item.newValue)"
                            v-model="item.newValue"
                            class="translation-input"
                            :rows="3"
                            auto-grow
                          />
                          <v-input
                            v-else
                            v-model="item.newValue"
                            class="translation-input"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </v-card-text>

        <!-- Modal Footer -->
        <v-card-actions class="modal-footer">
          <div class="footer-info" v-if="translationsLoaded">
            <v-icon name="info_outline" x-small />
            <span>You can edit the AI translations before inserting</span>
          </div>
          <div class="footer-actions">
            <v-button secondary @click="closeModal" class="cancel-btn">
              Cancel
            </v-button>
            <v-button
              @click="insertTranslations"
              :disabled="!translationsLoaded || isTranslating"
              class="insert-btn"
            >
              <v-icon name="check" small />
              Insert Translation
            </v-button>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from "vue";
import { useApi, useStores } from "@directus/extensions-sdk";

const props = defineProps({
  value: {
    type: Array,
    default: () => [],
  },
  primaryKey: {
    type: [String, Number],
    default: null,
  },
  collection: {
    type: String,
    required: true,
  },
  field: {
    type: String,
    required: true,
  },
  relations: {
    type: Object,
    default: () => ({}),
  },
  fields: {
    type: Array,
    default: () => [],
  },
  // Extension options
  languageField: {
    type: String,
    default: "languages_code",
  },
  defaultLanguage: {
    type: String,
    default: "en-US",
  },
  translationWebhookUrl: {
    type: String,
    default: "",
  },
  userCreatedField: String,
  userUpdatedField: String,
});

const emit = defineEmits(["input"]);

const api = useApi();
const { useNotificationsStore } = useStores();
const notifications = useNotificationsStore();

// ─── State ───────────────────────────────────────────────────────────────────
const currentTab = ref(props.defaultLanguage);
const selectedFields = ref([]);
const showTranslationModal = ref(false);
const sourceLanguage = ref("");
const isTranslating = ref(false);
const translationsLoaded = ref(false);
const translationPreview = ref([]);
const localValue = ref(props.value ? [...props.value] : []);

// ─── Computed ─────────────────────────────────────────────────────────────────
const junctionCollection = computed(() => props.relations?.o2m?.collection);

const languageItems = computed(() => {
  // Build language list from existing translations + available languages
  const langs = [];
  if (localValue.value) {
    for (const item of localValue.value) {
      const langCode = item[props.languageField];
      if (langCode && !langs.find((l) => l.value === langCode)) {
        langs.push({
          value: langCode,
          text: getLanguageLabel(langCode),
          flag: getLanguageFlag(langCode),
        });
      }
    }
  }
  return langs;
});

const translationFields = computed(() => {
  return props.fields.filter(
    (f) =>
      f.field !== props.languageField &&
      f.field !== props.userCreatedField &&
      f.field !== props.userUpdatedField &&
      !f.meta?.hidden &&
      f.field !== "id",
  );
});

const availableSourceLanguages = computed(() =>
  languageItems.value.filter((l) => l.value !== currentTab.value),
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLanguageLabel(code) {
  const map = {
    "en-US": "English (US)",
    "en-GB": "English (UK)",
    "fr-FR": "French",
    "de-DE": "German",
    "es-ES": "Spanish",
    "it-IT": "Italian",
    "pt-BR": "Portuguese (BR)",
    "ja-JP": "Japanese",
    "zh-CN": "Chinese (Simplified)",
    "ar-SA": "Arabic",
    "nl-NL": "Dutch",
    "ru-RU": "Russian",
    "ko-KR": "Korean",
    "pl-PL": "Polish",
    "tr-TR": "Turkish",
  };
  return map[code] || code;
}

function getLanguageFlag(code) {
  const map = {
    "en-US": "🇺🇸",
    "en-GB": "🇬🇧",
    "fr-FR": "🇫🇷",
    "de-DE": "🇩🇪",
    "es-ES": "🇪🇸",
    "it-IT": "🇮🇹",
    "pt-BR": "🇧🇷",
    "ja-JP": "🇯🇵",
    "zh-CN": "🇨🇳",
    "ar-SA": "🇸🇦",
    "nl-NL": "🇳🇱",
    "ru-RU": "🇷🇺",
    "ko-KR": "🇰🇷",
    "pl-PL": "🇵🇱",
    "tr-TR": "🇹🇷",
  };
  return map[code] || "🌐";
}

function getTranslationItem(langCode) {
  return localValue.value?.find(
    (item) => item[props.languageField] === langCode,
  );
}

function getFieldValue(langCode, fieldName) {
  const item = getTranslationItem(langCode);
  return item?.[fieldName] ?? null;
}

function getPrimaryKey(langCode) {
  const item = getTranslationItem(langCode);
  return item?.id ?? "+";
}

function hasChanges(langCode) {
  // Compare with original props.value
  return false; // Simplified - implement diff logic as needed
}

function isFieldSelected(fieldName) {
  return selectedFields.value.includes(fieldName);
}

function toggleFieldSelection(fieldName) {
  const idx = selectedFields.value.indexOf(fieldName);
  if (idx === -1) {
    selectedFields.value.push(fieldName);
  } else {
    selectedFields.value.splice(idx, 1);
  }
}

function setFieldValue(langCode, fieldName, value) {
  const items = [...(localValue.value || [])];
  const idx = items.findIndex((item) => item[props.languageField] === langCode);
  if (idx !== -1) {
    items[idx] = { ...items[idx], [fieldName]: value };
  } else {
    items.push({ [props.languageField]: langCode, [fieldName]: value });
  }
  localValue.value = items;
  emit("input", items);
}

function isLongText(value) {
  return value && value.length > 80;
}

// ─── Translation Modal ────────────────────────────────────────────────────────
function openTranslationModal() {
  if (selectedFields.value.length === 0) return;
  translationsLoaded.value = false;
  translationPreview.value = [];
  sourceLanguage.value = availableSourceLanguages.value[0]?.value || "";
  showTranslationModal.value = true;
}

function closeModal() {
  showTranslationModal.value = false;
  translationsLoaded.value = false;
  translationPreview.value = [];
  isTranslating.value = false;
}

async function fetchTranslations() {
  if (!sourceLanguage.value || !currentTab.value) return;

  isTranslating.value = true;
  translationsLoaded.value = false;

  // Build preview rows with loading state
  translationPreview.value = selectedFields.value.map((fieldName) => {
    const fieldDef = translationFields.value.find((f) => f.field === fieldName);
    return {
      field: fieldName,
      fieldLabel: fieldDef?.name || fieldName,
      sourceValue: getFieldValue(sourceLanguage.value, fieldName) || "",
      currentValue: getFieldValue(currentTab.value, fieldName) || "",
      newValue: "",
      loading: true,
      error: null,
    };
  });

  translationsLoaded.value = true;

  // Call webhook for each field (or batch)
  const webhookUrl = props.translationWebhookUrl;

  for (let i = 0; i < translationPreview.value.length; i++) {
    const row = translationPreview.value[i];
    try {
      let translatedText = "";

      if (webhookUrl && row.sourceValue) {
        // Call the Directus Translation Trigger Flow webhook
        const response = await api.post(webhookUrl, {
          sourceLanguage: sourceLanguage.value,
          targetLanguage: currentTab.value,
          field: row.field,
          text: row.sourceValue,
          collection: props.collection,
          primaryKey: props.primaryKey,
        });
        translatedText =
          response.data?.translation ||
          response.data?.text ||
          response.data ||
          "";
      } else if (!webhookUrl) {
        // Mock translation for development/preview
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
        translatedText = `[${currentTab.value}] ${row.sourceValue}`;
      }

      translationPreview.value[i] = {
        ...row,
        newValue: translatedText,
        loading: false,
      };
    } catch (err) {
      translationPreview.value[i] = {
        ...row,
        loading: false,
        error: err?.message || "Translation failed",
      };
    }
  }

  isTranslating.value = false;
}

function insertTranslations() {
  for (const item of translationPreview.value) {
    if (!item.error && item.newValue) {
      setFieldValue(currentTab.value, item.field, item.newValue);
    }
  }

  notifications.add({
    title: "Translations inserted",
    text: `${translationPreview.value.filter((i) => !i.error).length} fields updated`,
    type: "success",
    closeable: true,
  });

  closeModal();
}

// Watch for external value changes
watch(
  () => props.value,
  (newVal) => {
    localValue.value = newVal ? [...newVal] : [];
  },
  { deep: true },
);
</script>

<style scoped>
/* ─── Layout ─────────────────────────────────────────────────────────────────── */
.translations-ai {
  --radius: 8px;
  --ai-color: #6366f1;
  --ai-glow: rgba(99, 102, 241, 0.15);
  --selected-bg: rgba(99, 102, 241, 0.04);
  --selected-border: rgba(99, 102, 241, 0.3);
  font-family: var(--theme--fonts--sans--font-family);
}

/* ─── Tabs ────────────────────────────────────────────────────────────────────── */
.tabs-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--theme--border-color-subdued);
  margin-bottom: 16px;
}

.language-tabs {
  flex: 1;
  overflow-x: auto;
}

.language-tab {
  display: flex;
  align-items: center;
  gap: 6px;
}

.language-flag {
  font-size: 16px;
}

.unsaved-dot {
  color: var(--warning);
  font-size: 8px !important;
}

/* ─── AI Button ──────────────────────────────────────────────────────────────── */
.tab-actions {
  flex-shrink: 0;
}

.ai-translate-btn {
  --v-button-background-color: var(--ai-color);
  --v-button-background-color-hover: #4f46e5;
  --v-button-color: #fff;
  gap: 6px;
  padding: 0 16px;
  border-radius: 20px;
  font-weight: 600;
  box-shadow: 0 2px 12px var(--ai-glow);
  transition: all 0.2s ease;
}

.ai-translate-btn:not(:disabled):hover {
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.35);
  transform: translateY(-1px);
}

.badge {
  background: rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 700;
  margin-left: 2px;
}

/* ─── Field Rows ──────────────────────────────────────────────────────────────── */
.translation-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius);
  border: 1px solid transparent;
  transition: all 0.15s ease;
  background: var(--theme--background);
}

.field-row:hover {
  background: var(--theme--background-subdued);
}

.field-row.field-selected {
  background: var(--selected-bg);
  border-color: var(--selected-border);
}

.field-checkbox {
  padding-top: 4px;
  flex-shrink: 0;
}

.field-content {
  flex: 1;
  min-width: 0;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.field-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--theme--foreground-subdued);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.selected-badge {
  font-size: 10px;
  background: var(--ai-color);
  color: white;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 600;
}

/* ─── Empty State ─────────────────────────────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--theme--foreground-subdued);
}

/* ─── Modal ───────────────────────────────────────────────────────────────────── */
.modal-card {
  border-radius: 16px !important;
  overflow: hidden;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px !important;
  background: linear-gradient(135deg, #f8f7ff 0%, #fff 100%);
  border-bottom: 1px solid var(--theme--border-color-subdued);
  flex-shrink: 0;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.modal-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--ai-color), #8b5cf6);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px var(--ai-glow);
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--theme--foreground);
  margin: 0 0 2px;
}

.modal-subtitle {
  font-size: 13px;
  color: var(--theme--foreground-subdued);
  margin: 0;
}

.modal-body {
  padding: 20px 24px !important;
  flex: 1;
  overflow-y: auto;
}

/* ─── Source Selector ──────────────────────────────────────────────────────────── */
.source-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.source-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--theme--foreground-subdued);
  white-space: nowrap;
}

.source-select {
  max-width: 250px;
}

/* ─── Fetch Section ─────────────────────────────────────────────────────────────── */
.fetch-section {
  text-align: center;
  padding: 32px;
}

/* ─── Loading ─────────────────────────────────────────────────────────────────── */
.loading-state {
  text-align: center;
  padding: 48px 20px;
}

.loading-animation {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin-bottom: 20px;
  color: var(--ai-color);
}

.pulse-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid var(--ai-color);
  opacity: 0.4;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(0.8);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.1;
  }
}

.loading-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--theme--foreground);
  margin-bottom: 6px;
}

.loading-subtext {
  font-size: 13px;
  color: var(--theme--foreground-subdued);
}

/* ─── Translation Table ─────────────────────────────────────────────────────────── */
.translation-table-wrapper {
  border-radius: var(--radius);
  border: 1px solid var(--theme--border-color);
  overflow: hidden;
}

.translation-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.translation-table thead th {
  padding: 12px 14px;
  text-align: left;
  background: var(--theme--background-subdued);
  border-bottom: 2px solid var(--theme--border-color);
  font-weight: 700;
  font-size: 12px;
  color: var(--theme--foreground-subdued);
  white-space: nowrap;
}

.th-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.col-field {
  width: 140px;
}
.col-source {
  width: 25%;
}
.col-current {
  width: 25%;
}
.col-new {
  width: calc(50% - 140px);
}

.lang-flag {
  font-size: 16px;
}

.col-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.source-badge {
  background: #dbeafe;
  color: #1d4ed8;
}
.current-badge {
  background: #d1fae5;
  color: #065f46;
}
.new-badge {
  background: #ede9fe;
  color: #5b21b6;
}

.table-row {
  transition: background 0.1s ease;
}
.table-row:hover {
  background: var(--theme--background-subdued);
}
.row-even {
  background: rgba(0, 0, 0, 0.015);
}
.table-row td {
  padding: 12px 14px;
  vertical-align: top;
  border-bottom: 1px solid var(--theme--border-color-subdued);
}
.table-row:last-child td {
  border-bottom: none;
}

.field-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  color: var(--theme--foreground);
  font-size: 12px;
  background: var(--theme--background);
  border: 1px solid var(--theme--border-color);
  border-radius: 6px;
  padding: 4px 8px;
}

.cell-content {
  line-height: 1.5;
}

.cell-text {
  color: var(--theme--foreground);
  display: block;
}

.empty-cell {
  color: var(--theme--foreground-subdued);
  font-style: italic;
  font-size: 12px;
}

.source-content .cell-text {
  color: #1d4ed8;
}
.current-content .cell-text {
  color: #065f46;
}

.cell-loading {
  padding: 8px 0;
}

.dot-pulse {
  display: flex;
  gap: 4px;
  align-items: center;
}

.dot-pulse span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ai-color);
  animation: dotBounce 1.2s ease-in-out infinite;
}
.dot-pulse span:nth-child(2) {
  animation-delay: 0.2s;
}
.dot-pulse span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dotBounce {
  0%,
  80%,
  100% {
    transform: scale(0.7);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.cell-error {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--danger);
  font-size: 12px;
}

.new-translation-cell .translation-input {
  --input-padding: 8px;
}

/* ─── Modal Footer ──────────────────────────────────────────────────────────────── */
.modal-footer {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px !important;
  border-top: 1px solid var(--theme--border-color-subdued);
  background: var(--theme--background-subdued);
  flex-shrink: 0;
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--theme--foreground-subdued);
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.cancel-btn {
  min-width: 90px;
}

.insert-btn {
  --v-button-background-color: var(--ai-color);
  --v-button-background-color-hover: #4f46e5;
  --v-button-color: #fff;
  min-width: 160px;
  font-weight: 600;
  box-shadow: 0 2px 8px var(--ai-glow);
}

.insert-btn:not(:disabled):hover {
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
}
</style>
