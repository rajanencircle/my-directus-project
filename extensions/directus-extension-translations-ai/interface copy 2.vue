<template>
  <div class="translations-ai">
    <!-- ═══════════════════════════════════════════════════════════════════════
         NATIVE HEADER: language tabs + add-language button + AI toolbar
         ═══════════════════════════════════════════════════════════════════════ -->
    <div class="header-row">
      <!-- Language Tabs (native behaviour) -->
      <div class="tabs-wrapper">
        <v-tabs v-model="currentLang" class="lang-tabs">
          <v-tab
            v-for="lang in activeLangs"
            :key="lang.code"
            :value="lang.code"
            class="lang-tab"
          >
            <span class="tab-flag">{{ lang.flag }}</span>
            <span class="tab-label">{{ lang.name }}</span>
            <span v-if="isDirty(lang.code)" class="dirty-dot" />
          </v-tab>
        </v-tabs>

        <!-- Add language button (native) -->
        <v-menu v-if="missingLangs.length" placement="bottom-start" show-arrow>
          <template #activator="{ toggle }">
            <v-button
              class="add-lang-btn"
              x-small
              secondary
              @click="toggle"
              v-tooltip="'Add language'"
            >
              <v-icon name="add" x-small />
            </v-button>
          </template>
          <v-list>
            <v-list-item
              v-for="lang in missingLangs"
              :key="lang.code"
              clickable
              @click="addLanguage(lang.code)"
            >
              <v-list-item-content>
                <v-text-overflow
                  >{{ lang.flag }} {{ lang.name }}</v-text-overflow
                >
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>

      <!-- ── AI Toolbar (only rendered if a flow is configured) ─────────────── -->
      <div v-if="translationFlow" class="ai-toolbar">
        <!-- From language select -->
        <div class="toolbar-group">
          <span class="toolbar-label">From</span>
          <v-select
            v-model="aiFromLang"
            :items="aiFromOptions"
            placeholder="Source"
            class="toolbar-select"
            :disabled="activeLangs.length < 2"
          />
        </div>

        <v-icon name="arrow_forward" class="toolbar-arrow" x-small />

        <!-- To language: always the current tab -->
        <div class="toolbar-group">
          <span class="toolbar-label">To</span>
          <div class="toolbar-to-lang">
            <span class="tab-flag">{{ currentLangMeta?.flag }}</span>
            <span class="to-lang-name">{{ currentLangMeta?.name ?? "—" }}</span>
          </div>
        </div>

        <!-- Flow selector inline -->
        <div class="toolbar-group flow-group">
          <span class="toolbar-label">Flow</span>
          <v-select
            v-model="selectedFlowId"
            :items="flowOptions"
            :loading="loadingFlows"
            placeholder="Select flow…"
            class="toolbar-select flow-select"
          />
        </div>

        <!-- Translate button -->
        <v-button
          class="ai-btn"
          :disabled="!canTranslate"
          :loading="isTranslating"
          @click="openModal"
          v-tooltip="translateTooltip"
        >
          <v-icon name="auto_awesome" small />
          <span>Translate</span>
          <span v-if="selectedFields.length" class="ai-badge">{{
            selectedFields.length
          }}</span>
        </v-button>
      </div>

      <!-- No-flow notice -->
      <div v-else class="no-flow-notice">
        <v-icon name="info_outline" x-small />
        <span
          >Configure a Translation Flow in field settings to enable AI
          translation</span
        >
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════
         NATIVE CONTENT AREA: fields for the active language
         ═══════════════════════════════════════════════════════════════════════ -->
    <div class="content-area">
      <!-- Empty state when no language selected yet -->
      <div v-if="!currentLang" class="empty-lang">
        <v-icon name="translate" large />
        <p>Select a language tab to begin editing</p>
      </div>

      <!-- Field list -->
      <template v-else>
        <!-- Select-all bar (only shown when flow is configured) -->
        <div
          v-if="translationFlow && translationFields.length"
          class="select-bar"
        >
          <v-checkbox
            :model-value="allSelected"
            :indeterminate="someSelected && !allSelected"
            @update:model-value="toggleAll"
            label="Select all for translation"
          />
          <span v-if="selectedFields.length" class="sel-count">
            {{ selectedFields.length }} field{{
              selectedFields.length > 1 ? "s" : ""
            }}
            selected
          </span>
        </div>

        <!-- Individual field rows -->
        <div
          v-for="fieldMeta in translationFields"
          :key="fieldMeta.field"
          class="field-row"
          :class="{ 'row--selected': isSelected(fieldMeta.field) }"
        >
          <!-- Checkbox column (only when flow configured) -->
          <div v-if="translationFlow" class="field-check">
            <v-checkbox
              :model-value="isSelected(fieldMeta.field)"
              @update:model-value="toggleField(fieldMeta.field)"
            />
          </div>

          <!-- Native field rendering -->
          <div class="field-body">
            <div class="field-meta-row">
              <span class="field-label-text">
                {{ fieldMeta.name || fieldMeta.field }}
              </span>
              <span v-if="fieldMeta.meta?.required" class="required-dot"
                >*</span
              >
              <span v-if="isSelected(fieldMeta.field)" class="sel-pill"
                >Selected</span
              >
            </div>

            <!-- Render the appropriate Directus input component for each field type -->
            <component
              :is="getInterfaceComponent(fieldMeta)"
              v-bind="getInterfaceProps(fieldMeta)"
              :value="getVal(currentLang, fieldMeta.field)"
              :model-value="getVal(currentLang, fieldMeta.field)"
              @input="setVal(currentLang, fieldMeta.field, $event)"
              @update:model-value="setVal(currentLang, fieldMeta.field, $event)"
            />
          </div>
        </div>

        <!-- Empty fields notice -->
        <div v-if="!translationFields.length" class="empty-fields">
          <v-icon name="list" />
          <p>No translatable fields found for this collection.</p>
        </div>
      </template>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════
         AI TRANSLATION MODAL
         ═══════════════════════════════════════════════════════════════════════ -->
    <v-dialog
      v-model="showModal"
      :style="{ '--v-dialog-width': '960px' }"
      persistent
    >
      <v-card class="modal-card">
        <!-- Header -->
        <v-card-title class="modal-header">
          <div class="modal-header-left">
            <div class="modal-sparkle">
              <v-icon name="auto_awesome" />
            </div>
            <div class="modal-titles">
              <h2 class="modal-h2">AI Translation Preview</h2>
              <p class="modal-sub">
                <span class="lang-chip source-chip">
                  {{ getLanguageFlag(aiFromLang) }}
                  {{ getLanguageName(aiFromLang) }}
                </span>
                <v-icon name="arrow_forward" x-small />
                <span class="lang-chip target-chip">
                  {{ getLanguageFlag(currentLang) }}
                  {{ getLanguageName(currentLang) }}
                </span>
                &nbsp;·&nbsp;
                <strong>{{ selectedFields.length }}</strong> field{{
                  selectedFields.length > 1 ? "s" : ""
                }}
                &nbsp;·&nbsp; Flow: <em>{{ selectedFlowName }}</em>
              </p>
            </div>
          </div>
          <v-button icon rounded secondary @click="closeModal">
            <v-icon name="close" />
          </v-button>
        </v-card-title>

        <!-- Body -->
        <v-card-text class="modal-body">
          <!-- ── Loading state ─────────────────────────────────────────────── -->
          <div v-if="isTranslating" class="modal-loading">
            <div class="spinner-wrap">
              <div class="spinner-ring" />
              <v-icon name="auto_awesome" x-large class="spinner-icon" />
            </div>
            <p class="loading-h">Calling translation flow…</p>
            <p class="loading-sub">
              Translating {{ selectedFields.length }} field{{
                selectedFields.length > 1 ? "s" : ""
              }}
              via <strong>{{ selectedFlowName }}</strong>
            </p>
          </div>

          <!-- ── Results table ─────────────────────────────────────────────── -->
          <div v-else class="table-wrap">
            <table class="preview-table">
              <colgroup>
                <col class="col-w-field" />
                <col class="col-w-source" />
                <col class="col-w-current" />
                <col class="col-w-new" />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <div class="th-inner">
                      <v-icon name="label_outline" x-small />Field
                    </div>
                  </th>
                  <th>
                    <div class="th-inner">
                      <span class="th-flag">{{
                        getLanguageFlag(aiFromLang)
                      }}</span>
                      {{ getLanguageName(aiFromLang) }}
                      <span class="th-chip src-chip">Source</span>
                    </div>
                  </th>
                  <th>
                    <div class="th-inner">
                      <span class="th-flag">{{
                        getLanguageFlag(currentLang)
                      }}</span>
                      {{ getLanguageName(currentLang) }}
                      <span class="th-chip cur-chip">Current</span>
                    </div>
                  </th>
                  <th>
                    <div class="th-inner">
                      <v-icon name="auto_awesome" x-small />
                      AI Translation
                      <span class="th-chip new-chip">New</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in previewRows"
                  :key="row.field"
                  :class="['preview-row', i % 2 === 1 ? 'row-stripe' : '']"
                >
                  <!-- Field name -->
                  <td class="td-field">
                    <div class="field-chip">
                      <v-icon name="text_fields" x-small />
                      {{ row.fieldLabel }}
                    </div>
                  </td>

                  <!-- Source value -->
                  <td class="td-source">
                    <div class="cell-text src-text" v-if="row.sourceValue">
                      {{ row.sourceValue }}
                    </div>
                    <span v-else class="cell-empty">— empty —</span>
                  </td>

                  <!-- Current value -->
                  <td class="td-current">
                    <div class="cell-text cur-text" v-if="row.currentValue">
                      {{ row.currentValue }}
                    </div>
                    <span v-else class="cell-empty">— empty —</span>
                  </td>

                  <!-- New (editable) AI value -->
                  <td class="td-new">
                    <div v-if="row.loading" class="cell-dots">
                      <span /><span /><span />
                    </div>
                    <div v-else-if="row.error" class="cell-err">
                      <v-icon name="error_outline" x-small />{{ row.error }}
                    </div>
                    <template v-else>
                      <v-textarea
                        v-if="row.newValue && row.newValue.length > 80"
                        v-model="row.newValue"
                        class="new-input"
                        :nullable="false"
                        :rows="3"
                        auto-grow
                      />
                      <v-input
                        v-else
                        v-model="row.newValue"
                        class="new-input"
                        :nullable="false"
                      />
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </v-card-text>

        <!-- Footer -->
        <v-card-actions class="modal-footer">
          <div class="footer-left">
            <v-icon name="edit_note" x-small />
            <span>AI translations are editable before inserting</span>
          </div>
          <div class="footer-right">
            <v-button secondary @click="closeModal">Cancel</v-button>
            <v-button
              class="insert-btn"
              :disabled="
                isTranslating ||
                !previewRows.some((r) => !r.error && !r.loading)
              "
              @click="insertTranslations"
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
import { ref, computed, watch, onMounted } from "vue";
import { useApi, useStores } from "@directus/extensions-sdk";

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps({
  // Native Directus translation interface props
  value: { type: Array, default: () => [] },
  primaryKey: { type: [String, Number], default: null },
  collection: { type: String, required: true },
  field: { type: String, required: true },
  fields: { type: Array, default: () => [] },
  relations: { type: Object, default: () => ({}) },
  // Native options
  languageField: { type: String, default: "languages_code" },
  defaultLanguage: { type: String, default: "en-US" },
  userCreatedField: { type: String, default: null },
  userUpdatedField: { type: String, default: null },
  // AI extension option (flow ID chosen in field settings)
  translationFlow: { type: String, default: null },
});

const emit = defineEmits(["input"]);

// ─── SDK ─────────────────────────────────────────────────────────────────────
const api = useApi();
const { useNotificationsStore, useFieldsStore } = useStores();
const notifications = useNotificationsStore();
const fieldsStore = useFieldsStore();

// ─── Reactive state ──────────────────────────────────────────────────────────
const localValue = ref(props.value ? [...props.value] : []);
const currentLang = ref(props.defaultLanguage ?? "");

// AI toolbar state
const aiFromLang = ref("");
const selectedFlowId = ref(props.translationFlow ?? null);
const selectedFields = ref([]);

// Flows fetched from API
const availableFlows = ref([]);
const loadingFlows = ref(false);

// Modal
const showModal = ref(false);
const isTranslating = ref(false);
const previewRows = ref([]);

// All languages known to the system (fetched from the languages collection)
const allLanguages = ref([]);

// ─── Derived: junction collection ────────────────────────────────────────────
const junctionCollection = computed(
  () => props.relations?.o2m?.collection ?? null,
);
const languageCollection = computed(
  () => props.relations?.m2o?.related_collection ?? null,
);

// ─── Derived: languages ───────────────────────────────────────────────────────
/**
 * Language codes that already have a translation record in localValue
 */
const activeLangCodes = computed(() =>
  (localValue.value ?? [])
    .map((item) => item[props.languageField])
    .filter(Boolean),
);

/**
 * Full metadata for active languages (merged with allLanguages list)
 */
const activeLangs = computed(() =>
  activeLangCodes.value.map((code) => ({
    code,
    name: getLanguageName(code),
    flag: getLanguageFlag(code),
  })),
);

/**
 * Languages available to add (exist in system but not yet in localValue)
 */
const missingLangs = computed(() =>
  allLanguages.value.filter((l) => !activeLangCodes.value.includes(l.code)),
);

const currentLangMeta = computed(
  () => activeLangs.value.find((l) => l.code === currentLang.value) ?? null,
);

// ─── Derived: fields ─────────────────────────────────────────────────────────
const SYSTEM_FIELDS = new Set([
  "id",
  props.languageField,
  props.userCreatedField,
  props.userUpdatedField,
]);

/**
 * Fields from the junction collection that should be shown as translation inputs.
 * Mirrors native filtering: skip system/hidden fields.
 */
const translationFields = computed(() =>
  (props.fields ?? []).filter((f) => {
    if (!f?.field) return false;
    if (SYSTEM_FIELDS.has(f.field)) return false;
    if (f.meta?.hidden) return false;
    if (f.meta?.special?.includes("no-data")) return false;
    return true;
  }),
);

// ─── Derived: AI toolbar ─────────────────────────────────────────────────────
const aiFromOptions = computed(() =>
  activeLangs.value
    .filter((l) => l.code !== currentLang.value)
    .map((l) => ({ text: `${l.flag} ${l.name}`, value: l.code })),
);

const flowOptions = computed(() =>
  availableFlows.value.map((f) => ({
    text: f.name,
    value: f.id,
  })),
);

const selectedFlowName = computed(
  () =>
    availableFlows.value.find((f) => f.id === selectedFlowId.value)?.name ??
    selectedFlowId.value ??
    "—",
);

const allSelected = computed(
  () =>
    translationFields.value.length > 0 &&
    translationFields.value.every((f) =>
      selectedFields.value.includes(f.field),
    ),
);
const someSelected = computed(() => selectedFields.value.length > 0);

const canTranslate = computed(
  () =>
    !!currentLang.value &&
    !!aiFromLang.value &&
    !!selectedFlowId.value &&
    selectedFields.value.length > 0 &&
    aiFromLang.value !== currentLang.value,
);

const translateTooltip = computed(() => {
  if (!selectedFlowId.value) return "Select a translation flow";
  if (!aiFromLang.value) return "Select a source language";
  if (!selectedFields.value.length) return "Check at least one field below";
  if (aiFromLang.value === currentLang.value)
    return "Source and target language must differ";
  return `Translate ${selectedFields.value.length} field(s) from ${getLanguageName(aiFromLang.value)}`;
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  // Ensure we start on the default language if it exists in localValue
  if (!currentLang.value && activeLangCodes.value.length) {
    currentLang.value = activeLangCodes.value[0];
  }

  // Pre-select first other language as "from"
  const others = aiFromOptions.value;
  if (others.length) aiFromLang.value = others[0].value;

  await Promise.all([fetchFlows(), fetchLanguages()]);

  // If a flow was pre-configured in field settings, use it
  if (props.translationFlow) {
    selectedFlowId.value = props.translationFlow;
  }
});

// Keep local copy in sync when parent updates (e.g. after save & refresh)
watch(
  () => props.value,
  (val) => {
    localValue.value = val ? [...val] : [];
  },
  { deep: true },
);

// Auto-pick a source language when tab changes
watch(currentLang, () => {
  selectedFields.value = [];
  const others = aiFromOptions.value;
  if (
    others.length &&
    (!aiFromLang.value || aiFromLang.value === currentLang.value)
  ) {
    aiFromLang.value = others[0].value;
  }
});

// ─── Data helpers ─────────────────────────────────────────────────────────────
function getTranslationRecord(langCode) {
  return (localValue.value ?? []).find(
    (item) => item[props.languageField] === langCode,
  );
}

function getVal(langCode, fieldName) {
  return getTranslationRecord(langCode)?.[fieldName] ?? null;
}

function setVal(langCode, fieldName, value) {
  const items = [...(localValue.value ?? [])];
  const idx = items.findIndex((item) => item[props.languageField] === langCode);
  if (idx !== -1) {
    items[idx] = { ...items[idx], [fieldName]: value };
  } else {
    items.push({ [props.languageField]: langCode, [fieldName]: value });
  }
  localValue.value = items;
  emit("input", items);
}

function isDirty(langCode) {
  const original = (props.value ?? []).find(
    (item) => item[props.languageField] === langCode,
  );
  const current = getTranslationRecord(langCode);
  return JSON.stringify(original) !== JSON.stringify(current);
}

// ─── Language management (native) ─────────────────────────────────────────────
function addLanguage(langCode) {
  if (activeLangCodes.value.includes(langCode)) return;
  const items = [...(localValue.value ?? [])];
  items.push({ [props.languageField]: langCode });
  localValue.value = items;
  emit("input", items);
  currentLang.value = langCode;
}

// ─── Field selection ──────────────────────────────────────────────────────────
function isSelected(fieldName) {
  return selectedFields.value.includes(fieldName);
}

function toggleField(fieldName) {
  const idx = selectedFields.value.indexOf(fieldName);
  if (idx === -1) selectedFields.value.push(fieldName);
  else selectedFields.value.splice(idx, 1);
}

function toggleAll(val) {
  selectedFields.value = val ? translationFields.value.map((f) => f.field) : [];
}

// ─── Interface component resolution ──────────────────────────────────────────
/**
 * Return the Directus component name for a given field definition.
 * Falls back to rendering a plain v-input for unknown types.
 */
function getInterfaceComponent(fieldMeta) {
  const iface = fieldMeta.meta?.interface;
  if (!iface) {
    // Guess from type
    const type = fieldMeta.type;
    if (type === "boolean") return "v-checkbox";
    if (["integer", "bigInteger", "float", "decimal"].includes(type))
      return "v-input";
    return "v-input";
  }
  // Map Directus interface identifiers to registered global components
  const map = {
    input: "v-input",
    "input-rich-text-html": "v-input",
    "input-rich-text-md": "v-textarea",
    textarea: "v-textarea",
    "input-multiline": "v-textarea",
    "select-dropdown": "v-select",
    boolean: "v-checkbox",
    datetime: "v-input",
    file: "v-input",
  };
  return map[iface] ?? "v-input";
}

function getInterfaceProps(fieldMeta) {
  const base = {
    nullable: !fieldMeta.meta?.required,
  };
  const iface = fieldMeta.meta?.interface;
  if (iface === "select-dropdown") {
    return { ...base, items: fieldMeta.meta?.options?.choices ?? [] };
  }
  if (["textarea", "input-multiline", "input-rich-text-md"].includes(iface)) {
    return { ...base, rows: 3 };
  }
  return base;
}

// ─── Fetch flows ──────────────────────────────────────────────────────────────
async function fetchFlows() {
  loadingFlows.value = true;
  try {
    const res = await api.get("/flows", {
      params: {
        filter: { trigger: { _in: ["webhook", "manual", "schedule"] } },
        fields: ["id", "name", "trigger", "status"],
        limit: -1,
        sort: ["name"],
      },
    });
    availableFlows.value = (res.data?.data ?? []).filter(
      (f) => f.status === "active",
    );
  } catch (e) {
    // Silently fail — flows panel just won't populate
    availableFlows.value = [];
  } finally {
    loadingFlows.value = false;
  }
}

// ─── Fetch languages ──────────────────────────────────────────────────────────
async function fetchLanguages() {
  if (!languageCollection.value) return;
  try {
    const res = await api.get(`/items/${languageCollection.value}`, {
      params: { limit: -1, fields: ["*"] },
    });
    const items = res.data?.data ?? [];
    allLanguages.value = items.map((item) => {
      // Try common field names for the language code
      const code = item.code ?? item.lang ?? item.language ?? item.id ?? "";
      return {
        code,
        name: item.name ?? item.label ?? getLanguageName(code),
        flag: getLanguageFlag(code),
      };
    });
  } catch {
    allLanguages.value = [];
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal() {
  previewRows.value = selectedFields.value.map((fieldName) => {
    const fieldMeta = translationFields.value.find(
      (f) => f.field === fieldName,
    );
    return {
      field: fieldName,
      fieldLabel: fieldMeta?.name || fieldName,
      sourceValue: getVal(aiFromLang.value, fieldName) ?? "",
      currentValue: getVal(currentLang.value, fieldName) ?? "",
      newValue: "",
      loading: true,
      error: null,
    };
  });
  showModal.value = true;
  runTranslations();
}

function closeModal() {
  showModal.value = false;
  previewRows.value = [];
  isTranslating.value = false;
}

async function runTranslations() {
  isTranslating.value = true;

  // Find the selected flow's webhook endpoint
  const flow = availableFlows.value.find((f) => f.id === selectedFlowId.value);
  if (!flow) {
    notifications.add({
      title: "Flow not found",
      type: "error",
      closeable: true,
    });
    isTranslating.value = false;
    return;
  }

  // Build the webhook URL for this flow
  // Directus webhook-trigger flows are available at /flows/trigger/<flow-id>
  const webhookUrl = `/flows/trigger/${flow.id}`;

  isTranslating.value = false; // flip before per-row async work so table renders

  // Translate fields one by one (parallel)
  await Promise.all(
    previewRows.value.map(async (row, idx) => {
      if (!row.sourceValue) {
        previewRows.value[idx] = {
          ...row,
          loading: false,
          newValue: "",
          error: null,
        };
        return;
      }
      try {
        const res = await api.post(webhookUrl, {
          sourceLanguage: aiFromLang.value,
          targetLanguage: currentLang.value,
          field: row.field,
          text: row.sourceValue,
          collection: props.collection,
          primaryKey: props.primaryKey,
        });

        // Accept various response shapes
        const data = res.data;
        const translated =
          data?.translation ??
          data?.text ??
          data?.result ??
          (typeof data === "string" ? data : "");

        previewRows.value[idx] = {
          ...row,
          loading: false,
          newValue: String(translated),
          error: null,
        };
      } catch (err) {
        const msg =
          err?.response?.data?.errors?.[0]?.message ??
          err?.message ??
          "Translation failed";
        previewRows.value[idx] = {
          ...row,
          loading: false,
          newValue: "",
          error: msg,
        };
      }
    }),
  );
}

function insertTranslations() {
  let count = 0;
  for (const row of previewRows.value) {
    if (!row.error && !row.loading && row.newValue) {
      setVal(currentLang.value, row.field, row.newValue);
      count++;
    }
  }
  notifications.add({
    title: `${count} field${count !== 1 ? "s" : ""} updated`,
    text: "AI translations inserted. Remember to save the item.",
    type: "success",
    closeable: true,
  });
  closeModal();
}

// ─── Language helpers ─────────────────────────────────────────────────────────
const LANG_META = {
  en: { name: "English", flag: "🇬🇧" },
  "en-US": { name: "English (US)", flag: "🇺🇸" },
  "en-GB": { name: "English (UK)", flag: "🇬🇧" },
  fr: { name: "French", flag: "🇫🇷" },
  "fr-FR": { name: "French", flag: "🇫🇷" },
  de: { name: "German", flag: "🇩🇪" },
  "de-DE": { name: "German", flag: "🇩🇪" },
  es: { name: "Spanish", flag: "🇪🇸" },
  "es-ES": { name: "Spanish", flag: "🇪🇸" },
  it: { name: "Italian", flag: "🇮🇹" },
  "it-IT": { name: "Italian", flag: "🇮🇹" },
  pt: { name: "Portuguese", flag: "🇵🇹" },
  "pt-BR": { name: "Portuguese (BR)", flag: "🇧🇷" },
  nl: { name: "Dutch", flag: "🇳🇱" },
  "nl-NL": { name: "Dutch", flag: "🇳🇱" },
  ru: { name: "Russian", flag: "🇷🇺" },
  "ru-RU": { name: "Russian", flag: "🇷🇺" },
  ja: { name: "Japanese", flag: "🇯🇵" },
  "ja-JP": { name: "Japanese", flag: "🇯🇵" },
  zh: { name: "Chinese", flag: "🇨🇳" },
  "zh-CN": { name: "Chinese (Simplified)", flag: "🇨🇳" },
  "zh-TW": { name: "Chinese (Traditional)", flag: "🇹🇼" },
  ar: { name: "Arabic", flag: "🇸🇦" },
  "ar-SA": { name: "Arabic", flag: "🇸🇦" },
  ko: { name: "Korean", flag: "🇰🇷" },
  "ko-KR": { name: "Korean", flag: "🇰🇷" },
  pl: { name: "Polish", flag: "🇵🇱" },
  "pl-PL": { name: "Polish", flag: "🇵🇱" },
  tr: { name: "Turkish", flag: "🇹🇷" },
  "tr-TR": { name: "Turkish", flag: "🇹🇷" },
  hi: { name: "Hindi", flag: "🇮🇳" },
  "hi-IN": { name: "Hindi", flag: "🇮🇳" },
  sv: { name: "Swedish", flag: "🇸🇪" },
  "sv-SE": { name: "Swedish", flag: "🇸🇪" },
  da: { name: "Danish", flag: "🇩🇰" },
  "da-DK": { name: "Danish", flag: "🇩🇰" },
  fi: { name: "Finnish", flag: "🇫🇮" },
  "fi-FI": { name: "Finnish", flag: "🇫🇮" },
  nb: { name: "Norwegian", flag: "🇳🇴" },
  "nb-NO": { name: "Norwegian", flag: "🇳🇴" },
};

function getLanguageName(code) {
  if (!code) return "";
  // First check if we fetched it from the languages collection
  const fetched = allLanguages.value.find((l) => l.code === code);
  if (fetched?.name) return fetched.name;
  return LANG_META[code]?.name ?? code;
}

function getLanguageFlag(code) {
  if (!code) return "🌐";
  const fetched = allLanguages.value.find((l) => l.code === code);
  if (fetched?.flag) return fetched.flag;
  return LANG_META[code]?.flag ?? "🌐";
}
</script>

<style scoped>
/* ──────────────────────────────────────────────────────────────────────────────
   Variables
────────────────────────────────────────────────────────────────────────────── */
.translations-ai {
  --ai: #6366f1;
  --ai-hover: #4f46e5;
  --ai-glow: rgba(99, 102, 241, 0.18);
  --ai-subtle: rgba(99, 102, 241, 0.06);
  --ai-border: rgba(99, 102, 241, 0.28);
  --radius: 8px;
}

/* ──────────────────────────────────────────────────────────────────────────────
   Header row: tabs + AI toolbar side-by-side
────────────────────────────────────────────────────────────────────────────── */
.header-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  border-bottom: 2px solid var(--theme--border-color-subdued);
  margin-bottom: 16px;
}

/* Tabs */
.tabs-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
}

.lang-tabs {
  flex: 1;
}

.lang-tab {
  display: flex;
  align-items: center;
  gap: 5px;
}

.tab-flag {
  font-size: 15px;
}
.tab-label {
  font-size: 13px;
  font-weight: 500;
}

.dirty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warning);
  margin-left: 2px;
  flex-shrink: 0;
}

.add-lang-btn {
  flex-shrink: 0;
}

/* ──────────────────────────────────────────────────────────────────────────────
   AI Toolbar
────────────────────────────────────────────────────────────────────────────── */
.ai-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  background: var(--ai-subtle);
  border: 1px solid var(--ai-border);
  border-radius: 10px;
  padding: 6px 12px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ai);
  white-space: nowrap;
}

.toolbar-select {
  min-width: 140px;
  max-width: 180px;
}

.flow-group .toolbar-select {
  min-width: 180px;
  max-width: 240px;
}

.toolbar-arrow {
  color: var(--theme--foreground-subdued);
  flex-shrink: 0;
}

.toolbar-to-lang {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 500;
  color: var(--theme--foreground);
  background: var(--theme--background);
  border: 1px solid var(--theme--border-color);
  border-radius: 6px;
  padding: 4px 10px;
  white-space: nowrap;
}

.to-lang-name {
  font-size: 13px;
}

/* AI action button */
.ai-btn {
  --v-button-background-color: var(--ai);
  --v-button-background-color-hover: var(--ai-hover);
  --v-button-color: #fff;
  --v-button-color-hover: #fff;
  border-radius: 20px !important;
  padding: 0 16px;
  font-weight: 600;
  box-shadow: 0 2px 10px var(--ai-glow);
  gap: 6px;
  transition:
    box-shadow 0.2s,
    transform 0.15s;
}

.ai-btn:not(:disabled):hover {
  box-shadow: 0 4px 18px rgba(99, 102, 241, 0.38);
  transform: translateY(-1px);
}

.ai-badge {
  background: rgba(255, 255, 255, 0.28);
  border-radius: 10px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 700;
}

/* No-flow notice */
.no-flow-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--theme--foreground-subdued);
  font-style: italic;
}

/* ──────────────────────────────────────────────────────────────────────────────
   Content area
────────────────────────────────────────────────────────────────────────────── */
.content-area {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Empty states */
.empty-lang,
.empty-fields {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 56px 20px;
  color: var(--theme--foreground-subdued);
  text-align: center;
}

/* Select-all bar */
.select-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--theme--background-subdued);
  border-radius: 6px;
  margin-bottom: 6px;
}

.sel-count {
  font-size: 12px;
  color: var(--ai);
  font-weight: 600;
}

/* ──────────────────────────────────────────────────────────────────────────────
   Field rows
────────────────────────────────────────────────────────────────────────────── */
.field-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 7px;
  border: 1px solid transparent;
  transition:
    background 0.12s,
    border-color 0.12s;
}

.field-row:hover {
  background: var(--theme--background-subdued);
}

.field-row.row--selected {
  background: var(--ai-subtle);
  border-color: var(--ai-border);
}

.field-check {
  padding-top: 2px;
  flex-shrink: 0;
}

.field-body {
  flex: 1;
  min-width: 0;
}

.field-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}

.field-label-text {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--theme--foreground-subdued);
}

.required-dot {
  color: var(--danger);
  font-weight: 700;
}

.sel-pill {
  font-size: 10px;
  background: var(--ai);
  color: #fff;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 700;
}

/* ──────────────────────────────────────────────────────────────────────────────
   Modal
────────────────────────────────────────────────────────────────────────────── */
.modal-card {
  border-radius: 14px !important;
  display: flex;
  flex-direction: column;
  max-height: 88vh;
  overflow: hidden;
}

/* Header */
.modal-header {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px !important;
  background: linear-gradient(135deg, #f5f3ff 0%, #fff 60%);
  border-bottom: 1px solid var(--theme--border-color-subdued);
  flex-shrink: 0;
}

.modal-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.modal-sparkle {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: linear-gradient(135deg, var(--ai) 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 14px var(--ai-glow);
  flex-shrink: 0;
}

.modal-h2 {
  font-size: 17px;
  font-weight: 700;
  color: var(--theme--foreground);
  margin: 0 0 3px;
}

.modal-sub {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--theme--foreground-subdued);
  margin: 0;
  flex-wrap: wrap;
}

.lang-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 12px;
  font-weight: 600;
}

.source-chip {
  background: #dbeafe;
  color: #1d4ed8;
}
.target-chip {
  background: #d1fae5;
  color: #065f46;
}

/* Body */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 !important;
}

/* Loading */
.modal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56px 24px;
  gap: 12px;
}

.spinner-wrap {
  position: relative;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ai);
}

.spinner-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid var(--ai);
  opacity: 0;
  animation: spinRing 1.6s ease-in-out infinite;
}

@keyframes spinRing {
  0% {
    transform: scale(0.7);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.1;
  }
  100% {
    transform: scale(0.7);
    opacity: 0.5;
  }
}

.spinner-icon {
  color: var(--ai);
}

.loading-h {
  font-size: 15px;
  font-weight: 600;
  color: var(--theme--foreground);
  margin: 0;
}

.loading-sub {
  font-size: 13px;
  color: var(--theme--foreground-subdued);
  margin: 0;
  text-align: center;
}

/* Table */
.table-wrap {
  overflow-x: auto;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;
}

.col-w-field {
  width: 130px;
}
.col-w-source {
  width: 22%;
}
.col-w-current {
  width: 22%;
}
.col-w-new {
  width: auto;
}

.preview-table thead th {
  padding: 11px 14px;
  text-align: left;
  background: var(--theme--background-subdued);
  border-bottom: 2px solid var(--theme--border-color);
  font-size: 11px;
  font-weight: 700;
  color: var(--theme--foreground-subdued);
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}

.th-inner {
  display: flex;
  align-items: center;
  gap: 5px;
}

.th-flag {
  font-size: 15px;
}

.th-chip {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 6px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.src-chip {
  background: #dbeafe;
  color: #1d4ed8;
}
.cur-chip {
  background: #d1fae5;
  color: #065f46;
}
.new-chip {
  background: #ede9fe;
  color: #5b21b6;
}

.preview-row td {
  padding: 11px 14px;
  vertical-align: top;
  border-bottom: 1px solid var(--theme--border-color-subdued);
}

.preview-row:last-child td {
  border-bottom: none;
}
.row-stripe {
  background: rgba(0, 0, 0, 0.018);
}
.preview-row:hover {
  background: var(--theme--background-subdued);
}

/* Cells */
.field-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  background: var(--theme--background);
  border: 1px solid var(--theme--border-color);
  border-radius: 5px;
  padding: 3px 7px;
  white-space: nowrap;
}

.cell-text {
  line-height: 1.55;
  word-break: break-word;
}

.src-text {
  color: #1d4ed8;
}
.cur-text {
  color: #065f46;
}

.cell-empty {
  color: var(--theme--foreground-subdued);
  font-style: italic;
  font-size: 12px;
}

/* Dot loader */
.cell-dots {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 6px 0;
}

.cell-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ai);
  animation: dotJump 1.2s ease-in-out infinite;
}

.cell-dots span:nth-child(2) {
  animation-delay: 0.18s;
}
.cell-dots span:nth-child(3) {
  animation-delay: 0.36s;
}

@keyframes dotJump {
  0%,
  80%,
  100% {
    transform: scale(0.65);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.cell-err {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  color: var(--danger);
  font-size: 12px;
  line-height: 1.4;
}

.new-input {
  --input-padding: 7px 9px;
}

/* Footer */
.modal-footer {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  padding: 14px 22px !important;
  border-top: 1px solid var(--theme--border-color-subdued);
  background: var(--theme--background-subdued);
  flex-shrink: 0;
  gap: 12px;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--theme--foreground-subdued);
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.insert-btn {
  --v-button-background-color: var(--ai);
  --v-button-background-color-hover: var(--ai-hover);
  --v-button-color: #fff;
  --v-button-color-hover: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px var(--ai-glow);
}

.insert-btn:not(:disabled):hover {
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.36);
}
</style>
