<template>
  <div class="tai-root">
    <!-- ─────────────────────────────────────────────────────────────────
         TOP BAR  –  language tabs  +  AI button
    ───────────────────────────────────────────────────────────────────── -->
    <div class="tai-topbar">
      <!-- Left: language tabs -->
      <div class="tai-tabs-wrap">
        <button
          v-for="lang in allLangs"
          :key="lang.code"
          class="tai-tab"
          :class="{
            'tai-tab--active': activeLang === lang.code,
            'tai-tab--has-data': hasData(lang.code),
            'tai-tab--dirty': isDirty(lang.code),
          }"
          @click="setActiveLang(lang.code)"
        >
          <span class="tai-tab-flag">{{ lang.flag }}</span>
          <span class="tai-tab-name">{{ lang.name }}</span>
          <span
            v-if="isDirty(lang.code)"
            class="tai-dirty-dot"
            title="Unsaved changes"
          />
        </button>

        <!-- Add language button -->
        <div class="tai-add-wrap" v-if="unusedLangs.length > 0">
          <button
            class="tai-tab tai-tab--add"
            @click.stop="showLangPicker = !showLangPicker"
            title="Add language"
          >
            <span class="tai-tab-flag">+</span>
          </button>
          <div v-if="showLangPicker" class="tai-lang-dropdown">
            <button
              v-for="lang in unusedLangs"
              :key="lang.code"
              class="tai-lang-opt"
              @click="addLang(lang.code)"
            >
              {{ lang.flag }} {{ lang.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Right: AI button (only shown when a flow is configured) -->
      <div v-if="translationFlowId" class="tai-ai-actions">
        <span v-if="checkedFields.length > 0" class="tai-sel-count">
          {{ checkedFields.length }} field{{
            checkedFields.length !== 1 ? "s" : ""
          }}
          selected
        </span>
        <button
          class="tai-ai-btn"
          :class="{ 'tai-ai-btn--off': !canTranslate }"
          :disabled="!canTranslate"
          :title="translateTooltip"
          @click="openModal"
        >
          <span class="tai-ai-sparkle">✦</span>
          AI Translate
          <span v-if="checkedFields.length > 0" class="tai-ai-badge">{{
            checkedFields.length
          }}</span>
        </button>
      </div>
    </div>

    <!-- ─────────────────────────────────────────────────────────────────
         SPLIT VIEW  –  active-lang (edit)  |  reference-lang (read-only)
    ───────────────────────────────────────────────────────────────────── -->
    <div v-if="activeLang" class="tai-split">
      <!-- Split header row -->
      <div class="tai-split-header">
        <div class="tai-split-header-left">
          <span class="tai-lang-badge tai-lang-badge--active">
            {{ getFlag(activeLang) }} {{ getName(activeLang) }}
          </span>
          <span class="tai-editing-hint">Editing</span>
        </div>
        <div class="tai-split-header-right" v-if="otherLangs.length > 0">
          <span class="tai-ref-label">Reference:</span>
          <select class="tai-ref-select" v-model="refLang">
            <option value="">None</option>
            <option v-for="l in otherLangs" :key="l.code" :value="l.code">
              {{ l.flag }} {{ l.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Field rows -->
      <div class="tai-fields">
        <div v-if="translationFields.length === 0" class="tai-empty">
          <span>No translatable fields found.</span>
        </div>

        <div
          v-for="fld in translationFields"
          :key="fld.field"
          class="tai-field-row"
          :class="{ 'tai-field-row--checked': isChecked(fld.field) }"
        >
          <!-- Editable column -->
          <div class="tai-col tai-col--edit">
            <div class="tai-field-label">
              {{ fld.name || fld.field }}
              <span v-if="fld.meta?.required" class="tai-required">*</span>
            </div>
            <div class="tai-field-input">
              <render-field
                :field="fld"
                :model-value="getVal(activeLang, fld.field)"
                @update:model-value="setVal(activeLang, fld.field, $event)"
              />
            </div>
          </div>

          <!-- Reference column (read-only) -->
          <div v-if="refLang" class="tai-col tai-col--ref">
            <div class="tai-field-label tai-field-label--ref">
              <span>{{ getFlag(refLang) }}</span> {{ getName(refLang) }}
            </div>
            <div class="tai-ref-val">
              <span v-if="getVal(refLang, fld.field)" class="tai-ref-text">
                {{ getVal(refLang, fld.field) }}
              </span>
              <span v-else class="tai-ref-empty">—</span>
            </div>
          </div>

          <!-- Checkbox column (only when flow configured) -->
          <div v-if="translationFlowId" class="tai-col tai-col--check">
            <label
              class="tai-checkbox-label"
              :title="`Select '${fld.name || fld.field}' for AI translation`"
            >
              <input
                type="checkbox"
                class="tai-checkbox"
                :checked="isChecked(fld.field)"
                @change="toggleCheck(fld.field)"
              />
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- No active language -->
    <div v-else class="tai-empty tai-empty--top">
      <v-icon name="translate" large />
      <p>Select a language tab above to start editing.</p>
      <p v-if="allLangs.length === 0 && !loadingLangs" class="tai-empty-sub">
        No languages found — make sure your languages collection has at least
        one entry.
      </p>
    </div>

    <!-- ─────────────────────────────────────────────────────────────────
         AI TRANSLATION MODAL
    ───────────────────────────────────────────────────────────────────── -->
    <teleport to="body">
      <transition name="tai-fade">
        <div v-if="showModal" class="tai-backdrop" @click.self="closeModal">
          <div class="tai-modal">
            <!-- Modal header -->
            <div class="tai-modal-header">
              <div class="tai-modal-header-icon">✦</div>
              <div class="tai-modal-header-text">
                <h2 class="tai-modal-title">AI Translation Preview</h2>
                <p class="tai-modal-sub">
                  <span class="tai-pill tai-pill--src">
                    {{ getFlag(modalSrcLang) }} {{ getName(modalSrcLang) }}
                  </span>
                  <span class="tai-arrow">→</span>
                  <span class="tai-pill tai-pill--tgt">
                    {{ getFlag(activeLang) }} {{ getName(activeLang) }}
                  </span>
                  &nbsp;·&nbsp;
                  <strong>{{ checkedFields.length }}</strong> field{{
                    checkedFields.length !== 1 ? "s" : ""
                  }}
                </p>
              </div>
              <button
                class="tai-modal-close"
                @click="closeModal"
                :disabled="isTranslating"
              >
                ✕
              </button>
            </div>

            <!-- Source language selector + run button -->
            <div class="tai-modal-toolbar">
              <label class="tai-modal-src-label">Translate from:</label>
              <select
                class="tai-modal-src-select"
                v-model="modalSrcLang"
                :disabled="isTranslating"
              >
                <option v-for="l in otherLangs" :key="l.code" :value="l.code">
                  {{ l.flag }} {{ l.name }}
                </option>
              </select>
              <button
                class="tai-run-btn"
                :disabled="!modalSrcLang || isTranslating"
                @click="runTranslation"
              >
                <span class="tai-run-icon">▶</span>
                Run Translation
              </button>
            </div>

            <!-- Loading state -->
            <div v-if="isTranslating" class="tai-modal-loading">
              <div class="tai-loader-ring">
                <div class="tai-loader-pulse" />
                <span class="tai-loader-icon">✦</span>
              </div>
              <p class="tai-loading-title">Calling translation flow…</p>
              <p class="tai-loading-sub">
                Processing {{ checkedFields.length }} field{{
                  checkedFields.length !== 1 ? "s" : ""
                }}
              </p>
            </div>

            <!-- Results table -->
            <div v-else-if="previewRows.length > 0" class="tai-table-wrap">
              <table class="tai-table">
                <thead>
                  <tr>
                    <th class="tai-th tai-th--field">Field</th>
                    <th class="tai-th tai-th--src">
                      <span class="tai-th-flag">{{
                        getFlag(modalSrcLang)
                      }}</span>
                      {{ getName(modalSrcLang) }}
                      <span class="tai-th-badge tai-th-badge--src">Source</span>
                    </th>
                    <th class="tai-th tai-th--cur">
                      <span class="tai-th-flag">{{ getFlag(activeLang) }}</span>
                      {{ getName(activeLang) }}
                      <span class="tai-th-badge tai-th-badge--cur"
                        >Current</span
                      >
                    </th>
                    <th class="tai-th tai-th--new">
                      <span class="tai-th-sparkle">✦</span>
                      AI Translation
                      <span class="tai-th-badge tai-th-badge--new">New</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, i) in previewRows"
                    :key="row.field"
                    :class="['tai-tr', i % 2 === 1 ? 'tai-tr--alt' : '']"
                  >
                    <!-- Field name -->
                    <td class="tai-td tai-td--field">
                      <div class="tai-field-chip">{{ row.label }}</div>
                    </td>

                    <!-- Source value -->
                    <td class="tai-td tai-td--src">
                      <p
                        v-if="row.sourceVal"
                        class="tai-cell-text tai-cell-text--src"
                      >
                        {{ row.sourceVal }}
                      </p>
                      <span v-else class="tai-cell-empty">— empty —</span>
                    </td>

                    <!-- Current value -->
                    <td class="tai-td tai-td--cur">
                      <p
                        v-if="row.currentVal"
                        class="tai-cell-text tai-cell-text--cur"
                      >
                        {{ row.currentVal }}
                      </p>
                      <span v-else class="tai-cell-empty">— empty —</span>
                    </td>

                    <!-- New AI value (editable) -->
                    <td class="tai-td tai-td--new">
                      <div v-if="row.loading" class="tai-dots">
                        <span /><span /><span />
                      </div>
                      <div v-else-if="row.error" class="tai-cell-err">
                        ⚠ {{ row.error }}
                      </div>
                      <template v-else>
                        <textarea
                          v-if="(row.newVal || '').length > 80"
                          v-model="row.newVal"
                          class="tai-new-input tai-new-textarea"
                          rows="3"
                        />
                        <input
                          v-else
                          v-model="row.newVal"
                          type="text"
                          class="tai-new-input"
                        />
                      </template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Initial / empty state -->
            <div v-else class="tai-modal-init">
              <span class="tai-modal-init-icon">✦</span>
              <p>
                Select a source language and click
                <strong>Run Translation</strong> to generate AI translations.
              </p>
            </div>

            <!-- Modal footer -->
            <div class="tai-modal-footer">
              <p
                v-if="
                  previewRows.some((r) => !r.loading && !r.error && r.newVal)
                "
                class="tai-footer-hint"
              >
                ✎ You can edit the AI translations above before inserting.
              </p>
              <div class="tai-footer-actions">
                <button
                  class="tai-footer-btn tai-footer-btn--cancel"
                  @click="closeModal"
                >
                  Cancel
                </button>
                <button
                  class="tai-footer-btn tai-footer-btn--insert"
                  :disabled="
                    isTranslating ||
                    !previewRows.some((r) => !r.loading && !r.error && r.newVal)
                  "
                  @click="insertTranslations"
                >
                  ✓ Insert Translations
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script>
// Options API — Directus passes interface props reliably this way.
import { useApi, useStores } from "@directus/extensions-sdk";

export default {
  name: "TranslationsAIInterface",

  props: {
    // ── Standard Directus translations interface props ────────────────
    value: { type: Array, default: () => [] },
    primaryKey: { type: [String, Number], default: null },
    collection: { type: String, required: true },
    field: { type: String, required: true },
    fields: { type: Array, default: () => [] }, // junction fields
    relations: { type: Object, default: () => ({}) },
    // ── Native options ────────────────────────────────────────────────
    languageField: { type: String, default: "languages_code" },
    defaultLanguage: { type: String, default: "en-US" },
    userLanguage: { type: Boolean, default: false },
    userCreatedField: { type: String, default: null },
    userUpdatedField: { type: String, default: null },
    // ── AI option ─────────────────────────────────────────────────────
    translationFlowId: { type: String, default: null },
  },

  emits: ["input"],

  setup() {
    const api = useApi();
    const stores = useStores();
    return { api, stores };
  },

  data() {
    return {
      localValue: this.value ? [...this.value] : [],
      originalValue: JSON.parse(JSON.stringify(this.value || [])),
      activeLang: "",
      refLang: "",
      allLangs: [], // [{code, name, flag}] from languages collection
      loadingLangs: false,
      showLangPicker: false,
      // AI state
      checkedFields: [],
      showModal: false,
      modalSrcLang: "",
      isTranslating: false,
      previewRows: [], // [{field, label, sourceVal, currentVal, newVal, loading, error}]
    };
  },

  computed: {
    // ── Relations ───────────────────────────────────────────────────────
    junctionCollection() {
      // 1. Try props
      if (this.relations?.o2m?.collection) return this.relations.o2m.collection;
      if (this.fields?.length) return this.fields[0].collection;

      // 2. Fallback to stores
      const relationsStore = this.stores.useRelationsStore();
      const rel = relationsStore.getRelationsForField(
        this.collection,
        this.field,
      );
      const o2m = rel.find(
        (r) => r.collection === this.collection && r.field === this.field,
      );
      if (o2m?.meta?.one_collection) return o2m.meta.one_collection; // This is usually null for O2M

      // Look for the junction relation
      const allRels = relationsStore.getRelationsForCollection(this.collection);
      const junctionRel = allRels.find((r) => r.meta?.one_field === this.field);
      return junctionRel?.collection || null;
    },

    languageCollection() {
      // 1. Try props
      if (this.relations?.m2o?.related_collection)
        return this.relations.m2o.related_collection;

      // 2. Fallback to stores
      const junction = this.junctionCollection;
      if (!junction) return "translations"; // Default fallback

      const relationsStore = this.stores.useRelationsStore();
      const rels = relationsStore.getRelationsForCollection(junction);
      const langRel = rels.find((r) => r.field === this.languageField);

      return langRel?.related_collection || "translations";
    },

    /**
     * Fields of the junction collection.
     * Uses props if available, otherwise falls back to the fields store.
     */
    junctionFields() {
      if (this.fields?.length > 0) return this.fields;

      const junction = this.junctionCollection;
      if (!junction) return [];

      const fieldsStore = this.stores.useFieldsStore();
      return fieldsStore.getFieldsForCollection(junction) || [];
    },

    // ── Language lists ──────────────────────────────────────────────────
    existingCodes() {
      return (this.localValue || [])
        .map((item) => item[this.languageField])
        .filter(Boolean);
    },
    unusedLangs() {
      return this.allLangs.filter((l) => !this.existingCodes.includes(l.code));
    },
    otherLangs() {
      return this.allLangs.filter((l) => l.code !== this.activeLang);
    },

    // ── Fields ──────────────────────────────────────────────────────────
    translationFields() {
      const hidden = new Set(
        [
          "id",
          this.languageField,
          this.userCreatedField,
          this.userUpdatedField,
          "user_created",
          "user_updated",
          "date_created",
          "date_updated",
        ].filter(Boolean),
      );
      return (this.junctionFields || []).filter((f) => {
        if (!f?.field) return false;
        if (hidden.has(f.field)) return false;
        if (f.meta?.hidden === true) return false;
        if (f.meta?.special?.includes("no-data")) return false;
        return true;
      });
    },

    // ── AI state ────────────────────────────────────────────────────────
    canTranslate() {
      return (
        !!this.translationFlowId &&
        !!this.activeLang &&
        this.checkedFields.length > 0 &&
        this.otherLangs.length > 0
      );
    },
    translateTooltip() {
      if (!this.translationFlowId) return "No translation flow configured";
      if (!this.activeLang) return "Select a language tab first";
      if (this.checkedFields.length === 0)
        return "Check at least one field below";
      if (this.otherLangs.length === 0) return "Need at least 2 languages";
      return `Translate ${this.checkedFields.length} field(s) with AI`;
    },
  },

  watch: {
    value: {
      handler(val) {
        this.localValue = val ? [...val] : [];
      },
      deep: true,
    },
  },

  async mounted() {
    await this.fetchLanguages();
    const translationFields = this.translationFields;
    // Pick default active language
    if (this.existingCodes.includes(this.defaultLanguage)) {
      this.activeLang = this.defaultLanguage;
    } else if (this.existingCodes.length > 0) {
      this.activeLang = this.existingCodes[0];
    } else if (this.allLangs.length > 0) {
      this.addLang(this.allLangs[0].code);
    }

    // Auto-set reference language
    if (this.otherLangs.length > 0) {
      this.refLang = this.otherLangs[0].code;
    }
  },

  methods: {
    // ── Language fetching ───────────────────────────────────────────────
    async fetchLanguages() {
      const collection = this.languageCollection;
      const junctionCollection = this.junctionCollection;
      if (!collection) {
        // Graceful fallback: build from existing data
        this.allLangs = this.existingCodes.map((code) => ({
          code,
          name: this.getName(code),
          flag: this.getFlag(code),
        }));
        return;
      }
      this.loadingLangs = true;
      try {
        const res = await this.api.get(`/items/${collection}`, {
          params: { limit: -1, fields: ["*"] },
        });
        const items = res.data?.data || [];
        this.allLangs = items.map((item) => {
          const code =
            item.code ?? item.lang ?? item.language_code ?? item.id ?? "";
          return {
            code,
            name: item.name ?? item.label ?? this.getName(code),
            flag: item.flag ?? this.getFlag(code),
          };
        });
      } catch {
        // Fallback to existing codes
        this.allLangs = this.existingCodes.map((code) => ({
          code,
          name: this.getName(code),
          flag: this.getFlag(code),
        }));
      } finally {
        this.loadingLangs = false;
      }
    },

    // ── Language tab actions ────────────────────────────────────────────
    setActiveLang(code) {
      this.activeLang = code;
      this.checkedFields = [];
    },

    addLang(code) {
      if (this.existingCodes.includes(code)) return;
      const next = [...this.localValue, { [this.languageField]: code }];
      this.localValue = next;
      this.$emit("input", next);
      this.activeLang = code;
      this.showLangPicker = false;
    },

    hasData(code) {
      return this.existingCodes.includes(code);
    },

    isDirty(code) {
      const orig = (this.originalValue || []).find(
        (i) => i[this.languageField] === code,
      );
      const curr = this.getRecord(code);
      return JSON.stringify(orig) !== JSON.stringify(curr);
    },

    // ── Value helpers ───────────────────────────────────────────────────
    getRecord(langCode) {
      return (this.localValue || []).find(
        (i) => i[this.languageField] === langCode,
      );
    },

    getVal(langCode, fieldName) {
      return this.getRecord(langCode)?.[fieldName] ?? null;
    },

    setVal(langCode, fieldName, value) {
      const items = [...this.localValue];
      const idx = items.findIndex((i) => i[this.languageField] === langCode);
      if (idx !== -1) {
        items[idx] = { ...items[idx], [fieldName]: value };
      } else {
        items.push({ [this.languageField]: langCode, [fieldName]: value });
      }
      this.localValue = items;
      this.$emit("input", items);
    },

    // ── Checkboxes ──────────────────────────────────────────────────────
    isChecked(fieldName) {
      return this.checkedFields.includes(fieldName);
    },

    toggleCheck(fieldName) {
      const idx = this.checkedFields.indexOf(fieldName);
      if (idx === -1) this.checkedFields.push(fieldName);
      else this.checkedFields.splice(idx, 1);
    },

    // ── Modal lifecycle ─────────────────────────────────────────────────
    openModal() {
      if (!this.canTranslate) return;
      // Default source = refLang or first other language
      this.modalSrcLang = this.refLang || this.otherLangs[0]?.code || "";
      this.previewRows = [];
      this.showModal = true;
    },

    closeModal() {
      if (this.isTranslating) return;
      this.showModal = false;
      this.previewRows = [];
    },

    // ── Translation ─────────────────────────────────────────────────────
    async runTranslation() {
      if (!this.modalSrcLang || this.isTranslating) return;

      this.isTranslating = true;

      // Build initial rows (all in loading state)
      this.previewRows = this.checkedFields.map((fieldKey) => {
        const fieldDef = this.translationFields.find(
          (f) => f.field === fieldKey,
        );
        return {
          field: fieldKey,
          label: fieldDef?.name || fieldKey,
          sourceVal: this.getVal(this.modalSrcLang, fieldKey) ?? "",
          currentVal: this.getVal(this.activeLang, fieldKey) ?? "",
          newVal: "",
          loading: true,
          error: null,
        };
      });

      // Flip loading so the table renders while rows translate in background
      this.isTranslating = false;

      const flowUrl = `/flows/trigger/${this.translationFlowId}`;

      await Promise.all(
        this.previewRows.map(async (row, idx) => {
          // Skip rows with no source text
          if (!row.sourceVal) {
            this.previewRows[idx] = {
              ...row,
              loading: false,
              newVal: "",
              error: null,
            };
            return;
          }

          try {
            const res = await this.api.post(flowUrl, {
              sourceLanguage: this.modalSrcLang,
              targetLanguage: this.activeLang,
              fieldKey: row.field,
              text: row.sourceVal,
              collection: this.collection,
              primaryKey: this.primaryKey,
            });

            const data = res.data;
            const translated =
              data?.translation ??
              data?.text ??
              data?.result ??
              (typeof data === "string" ? data : "");

            this.previewRows[idx] = {
              ...row,
              loading: false,
              newVal: String(translated),
              error: null,
            };
          } catch (err) {
            const msg =
              err?.response?.data?.errors?.[0]?.message ??
              err?.message ??
              "Translation failed";
            this.previewRows[idx] = {
              ...row,
              loading: false,
              newVal: "",
              error: msg,
            };
          }
        }),
      );
    },

    insertTranslations() {
      let count = 0;
      for (const row of this.previewRows) {
        if (!row.loading && !row.error && row.newVal) {
          this.setVal(this.activeLang, row.field, row.newVal);
          count++;
        }
      }
      const { useNotificationsStore } = this.stores;
      useNotificationsStore().add({
        title: `${count} field${count !== 1 ? "s" : ""} updated`,
        text: "AI translations inserted. Don't forget to save.",
        type: "success",
        closeable: true,
        duration: 4000,
      });
      this.showModal = false;
      this.previewRows = [];
    },

    // ── Display helpers ─────────────────────────────────────────────────
    getName(code) {
      if (!code) return "";
      // Check fetched languages first
      const fetched = this.allLangs.find((l) => l.code === code);
      if (fetched?.name) return fetched.name;
      const MAP = {
        en: "English",
        "en-US": "English (US)",
        "en-GB": "English (UK)",
        fr: "French",
        "fr-FR": "French",
        de: "German",
        "de-DE": "German",
        es: "Spanish",
        "es-ES": "Spanish",
        it: "Italian",
        "it-IT": "Italian",
        pt: "Portuguese",
        "pt-BR": "Portuguese (BR)",
        "pt-PT": "Portuguese (PT)",
        nl: "Dutch",
        "nl-NL": "Dutch",
        ru: "Russian",
        "ru-RU": "Russian",
        ja: "Japanese",
        "ja-JP": "Japanese",
        zh: "Chinese",
        "zh-CN": "Chinese (Simplified)",
        "zh-TW": "Chinese (Traditional)",
        ar: "Arabic",
        "ar-SA": "Arabic",
        ko: "Korean",
        "ko-KR": "Korean",
        pl: "Polish",
        "pl-PL": "Polish",
        tr: "Turkish",
        "tr-TR": "Turkish",
        hi: "Hindi",
        "hi-IN": "Hindi",
        sv: "Swedish",
        "sv-SE": "Swedish",
        da: "Danish",
        "da-DK": "Danish",
        nb: "Norwegian",
        "nb-NO": "Norwegian",
        fi: "Finnish",
        "fi-FI": "Finnish",
      };
      return MAP[code] ?? code;
    },

    getFlag(code) {
      if (!code) return "🌐";
      const fetched = this.allLangs.find((l) => l.code === code);
      if (fetched?.flag && fetched.flag !== "🌐") return fetched.flag;
      const MAP = {
        en: "🇬🇧",
        "en-US": "🇺🇸",
        "en-GB": "🇬🇧",
        fr: "🇫🇷",
        "fr-FR": "🇫🇷",
        de: "🇩🇪",
        "de-DE": "🇩🇪",
        es: "🇪🇸",
        "es-ES": "🇪🇸",
        it: "🇮🇹",
        "it-IT": "🇮🇹",
        pt: "🇵🇹",
        "pt-BR": "🇧🇷",
        "pt-PT": "🇵🇹",
        nl: "🇳🇱",
        "nl-NL": "🇳🇱",
        ru: "🇷🇺",
        "ru-RU": "🇷🇺",
        ja: "🇯🇵",
        "ja-JP": "🇯🇵",
        zh: "🇨🇳",
        "zh-CN": "🇨🇳",
        "zh-TW": "🇹🇼",
        ar: "🇸🇦",
        "ar-SA": "🇸🇦",
        ko: "🇰🇷",
        "ko-KR": "🇰🇷",
        pl: "🇵🇱",
        "pl-PL": "🇵🇱",
        tr: "🇹🇷",
        "tr-TR": "🇹🇷",
        hi: "🇮🇳",
        "hi-IN": "🇮🇳",
        sv: "🇸🇪",
        "sv-SE": "🇸🇪",
        da: "🇩🇰",
        "da-DK": "🇩🇰",
        nb: "🇳🇴",
        "nb-NO": "🇳🇴",
        fi: "🇫🇮",
        "fi-FI": "🇫🇮",
      };
      return MAP[code] ?? "🌐";
    },
  },
};
</script>

<style scoped>
/* ─────────────────────────────────────────────────────────────────────────────
   Design tokens
───────────────────────────────────────────────────────────────────────────── */
.tai-root {
  --ai: #6366f1;
  --ai-dark: #4f46e5;
  --ai-light: rgba(99, 102, 241, 0.1);
  --ai-border: rgba(99, 102, 241, 0.3);
  --radius: 8px;
  --radius-sm: 5px;
  font-family: var(--theme--fonts--sans--font-family, system-ui, sans-serif);
  color: var(--theme--foreground, #1e293b);
}

/* ─────────────────────────────────────────────────────────────────────────────
   Top bar
───────────────────────────────────────────────────────────────────────────── */
.tai-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 14px;
  margin-bottom: 16px;
  border-bottom: 2px solid var(--theme--border-color-subdued, #e2e8f0);
}

/* Language tabs */
.tai-tabs-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
}

.tai-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 13px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--theme--border-color, #cbd5e1);
  background: var(--theme--background, #fff);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--theme--foreground-subdued, #64748b);
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s;
  position: relative;
  white-space: nowrap;
}
.tai-tab:hover {
  border-color: var(--ai);
  color: var(--ai);
}
.tai-tab--active {
  background: var(--ai);
  border-color: var(--ai);
  color: #fff;
  font-weight: 600;
}
.tai-tab--has-data:not(.tai-tab--active) {
  border-color: var(--ai);
  color: var(--ai);
}
.tai-tab--add {
  font-size: 16px;
  padding: 4px 10px;
  border-style: dashed;
}
.tai-dirty-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f59e0b;
  margin-left: 2px;
  display: inline-block;
}

/* Add-language dropdown */
.tai-add-wrap {
  position: relative;
}
.tai-lang-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 200;
  background: var(--theme--background, #fff);
  border: 1.5px solid var(--theme--border-color, #cbd5e1);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  min-width: 160px;
  overflow: hidden;
}
.tai-lang-opt {
  display: block;
  width: 100%;
  padding: 9px 14px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--theme--foreground, #1e293b);
  transition: background 0.1s;
}
.tai-lang-opt:hover {
  background: var(--ai-light);
  color: var(--ai);
}

/* AI button */
.tai-ai-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tai-sel-count {
  font-size: 12px;
  color: var(--ai);
  font-weight: 600;
}
.tai-ai-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 16px;
  border-radius: var(--radius-sm);
  border: none;
  background: linear-gradient(135deg, var(--ai), var(--ai-dark));
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    opacity 0.15s,
    transform 0.1s,
    box-shadow 0.15s;
  box-shadow: 0 2px 10px rgba(99, 102, 241, 0.35);
}
.tai-ai-btn:hover:not(.tai-ai-btn--off) {
  box-shadow: 0 4px 18px rgba(99, 102, 241, 0.5);
  transform: translateY(-1px);
}
.tai-ai-btn--off {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}
.tai-ai-sparkle {
  font-size: 15px;
}
.tai-ai-badge {
  background: rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 700;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Split view
───────────────────────────────────────────────────────────────────────────── */
.tai-split {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tai-split-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 14px;
  background: var(--theme--background-subdued, #f8fafc);
  border: 1.5px solid var(--theme--border-color, #e2e8f0);
  border-bottom: none;
  border-radius: var(--radius) var(--radius) 0 0;
}
.tai-split-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tai-lang-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.tai-lang-badge--active {
  background: var(--ai-light);
  color: var(--ai);
  border: 1.5px solid var(--ai-border);
}
.tai-editing-hint {
  font-size: 11px;
  color: var(--theme--foreground-subdued, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.tai-split-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tai-ref-label {
  font-size: 12px;
  color: var(--theme--foreground-subdued, #64748b);
  font-weight: 500;
}
.tai-ref-select {
  font-size: 13px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--theme--border-color, #cbd5e1);
  background: var(--theme--background, #fff);
  color: var(--theme--foreground, #1e293b);
  cursor: pointer;
}

/* Field rows */
.tai-fields {
  border: 1.5px solid var(--theme--border-color, #e2e8f0);
  border-radius: 0 0 var(--radius) var(--radius);
  overflow: hidden;
}
.tai-field-row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--theme--border-color-subdued, #f1f5f9);
  transition: background 0.1s;
}
.tai-field-row:last-child {
  border-bottom: none;
}
.tai-field-row--checked {
  background: var(--ai-light);
}
.tai-field-row:hover:not(.tai-field-row--checked) {
  background: var(--theme--background-subdued, #f8fafc);
}

.tai-col {
  padding: 14px 16px;
}
.tai-col--edit {
  flex: 1;
  min-width: 0;
  border-right: 1px solid var(--theme--border-color-subdued, #f1f5f9);
}
.tai-col--ref {
  flex: 0 0 34%;
  border-right: 1px solid var(--theme--border-color-subdued, #f1f5f9);
  background: var(--theme--background-subdued, #f8fafc);
}
.tai-col--check {
  flex: 0 0 52px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tai-field-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--theme--foreground-subdued, #64748b);
  margin-bottom: 8px;
}
.tai-required {
  color: var(--theme--danger, #ef4444);
  margin-left: 2px;
}
.tai-field-label--ref {
  color: #94a3b8;
}
.tai-field-input {
  /* Let render-field take full width */
}
.tai-ref-val {
  min-height: 36px;
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}
.tai-ref-text {
  font-size: 14px;
  color: var(--theme--foreground-subdued, #475569);
  line-height: 1.5;
  white-space: pre-wrap;
}
.tai-ref-empty {
  color: #cbd5e1;
  font-style: italic;
}

/* Checkbox */
.tai-checkbox-label {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1.5px solid var(--ai-border);
  transition:
    background 0.12s,
    border-color 0.12s;
}
.tai-checkbox-label:hover {
  background: var(--ai-light);
}
.tai-checkbox {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 2px solid var(--ai);
  background: transparent;
  cursor: pointer;
  position: relative;
  transition: background 0.12s;
}
.tai-checkbox:checked {
  background: var(--ai);
}
.tai-checkbox:checked::after {
  content: "";
  position: absolute;
  left: 2px;
  top: -1px;
  width: 5px;
  height: 9px;
  border: 2px solid #fff;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}

/* Empty state */
.tai-empty {
  padding: 32px 20px;
  text-align: center;
  color: var(--theme--foreground-subdued, #94a3b8);
  font-size: 14px;
}
.tai-empty--top {
  padding-top: 48px;
}
.tai-empty-sub {
  margin-top: 8px;
  font-size: 12px;
  color: #cbd5e1;
}

/* ─────────────────────────────────────────────────────────────────────────────
   AI Translation Modal
───────────────────────────────────────────────────────────────────────────── */
.tai-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(3px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.tai-modal {
  background: var(--theme--background, #fff);
  border-radius: 14px;
  width: min(980px, 100%);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--theme--border-color, #e2e8f0);
}

/* Modal header */
.tai-modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--theme--border-color-subdued, #f1f5f9);
  background: linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%);
  flex-shrink: 0;
}
.tai-modal-header-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--ai), var(--ai-dark));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
}
.tai-modal-header-text {
  flex: 1;
}
.tai-modal-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--theme--foreground, #0f172a);
  margin: 0 0 4px;
}
.tai-modal-sub {
  font-size: 13px;
  color: var(--theme--foreground-subdued, #64748b);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.tai-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.tai-pill--src {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}
.tai-pill--tgt {
  background: var(--ai-light);
  color: var(--ai-dark);
  border: 1px solid var(--ai-border);
}
.tai-arrow {
  font-size: 14px;
  color: #94a3b8;
}
.tai-modal-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #94a3b8;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.1s;
}
.tai-modal-close:hover {
  background: #f1f5f9;
  color: #374151;
}
.tai-modal-close:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Toolbar */
.tai-modal-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 22px;
  border-bottom: 1px solid var(--theme--border-color-subdued, #f1f5f9);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.tai-modal-src-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--theme--foreground-subdued, #64748b);
  white-space: nowrap;
}
.tai-modal-src-select {
  font-size: 13px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--theme--border-color, #cbd5e1);
  background: var(--theme--background, #fff);
  color: var(--theme--foreground, #1e293b);
  cursor: pointer;
}
.tai-run-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 16px;
  border-radius: var(--radius-sm);
  border: none;
  background: linear-gradient(135deg, var(--ai), var(--ai-dark));
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    opacity 0.15s,
    box-shadow 0.15s;
  box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3);
}
.tai-run-btn:hover:not(:disabled) {
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.45);
}
.tai-run-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}
.tai-run-icon {
  font-size: 10px;
}

/* Loading */
.tai-modal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
  flex: 1;
}
.tai-loader-ring {
  position: relative;
  width: 60px;
  height: 60px;
}
.tai-loader-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: var(--ai);
  animation: tai-spin 0.9s linear infinite;
}
.tai-loader-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--ai);
}
@keyframes tai-spin {
  to {
    transform: rotate(360deg);
  }
}
.tai-loading-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--theme--foreground, #0f172a);
  margin: 0;
}
.tai-loading-sub {
  font-size: 13px;
  color: var(--theme--foreground-subdued, #94a3b8);
  margin: 0;
}

/* Results table */
.tai-table-wrap {
  overflow: auto;
  flex: 1;
}
.tai-table {
  width: 100%;
  border-collapse: collapse;
}
.tai-th {
  padding: 11px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 2px solid var(--theme--border-color, #e2e8f0);
  background: var(--theme--background-subdued, #f8fafc);
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}
.tai-th--field {
  width: 130px;
  color: #64748b;
}
.tai-th--src {
  color: #059669;
}
.tai-th--cur {
  color: var(--ai);
}
.tai-th--new {
  color: #7c3aed;
}
.tai-th-flag {
  margin-right: 4px;
}
.tai-th-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: 6px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.tai-th-badge--src {
  background: #d1fae5;
  color: #065f46;
}
.tai-th-badge--cur {
  background: var(--ai-light);
  color: var(--ai-dark);
}
.tai-th-badge--new {
  background: #ede9fe;
  color: #5b21b6;
}
.tai-th-sparkle {
  margin-right: 4px;
}

.tai-tr:last-child td {
  border-bottom: none;
}
.tai-tr--alt td {
  background: #fafafe;
}
.tai-td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--theme--border-color-subdued, #f1f5f9);
  vertical-align: top;
  font-size: 14px;
}
.tai-td--src {
  background: #f0fdf4;
}
.tai-td--src .tai-cell-text {
  color: #065f46;
}
.tai-td--cur {
  background: #f5f3ff;
}
.tai-td--cur .tai-cell-text {
  color: var(--ai-dark);
}
.tai-td--new {
  min-width: 220px;
}
.tai-field-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 20px;
  background: var(--theme--background-subdued, #f1f5f9);
  color: var(--theme--foreground-subdued, #475569);
  font-size: 12px;
  font-weight: 600;
}
.tai-cell-text {
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
}
.tai-cell-empty {
  color: #cbd5e1;
  font-style: italic;
  font-size: 12px;
}
.tai-cell-err {
  color: #ef4444;
  font-size: 12px;
  display: flex;
  align-items: flex-start;
  gap: 5px;
}

/* AI result input */
.tai-new-input {
  width: 100%;
  padding: 7px 10px;
  border: 1.5px solid var(--theme--border-color, #e2e8f0);
  border-radius: var(--radius-sm);
  font-size: 13px;
  background: var(--theme--background, #fff);
  color: var(--theme--foreground, #1e293b);
  font-family: inherit;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.tai-new-input:focus {
  outline: none;
  border-color: var(--ai);
  box-shadow: 0 0 0 3px var(--ai-light);
}
.tai-new-textarea {
  resize: vertical;
  min-height: 72px;
}

/* Dot loader */
.tai-dots {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 8px 0;
}
.tai-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ai);
  animation: tai-bounce 1.2s infinite;
}
.tai-dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.tai-dots span:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes tai-bounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Init state */
.tai-modal-init {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 14px;
  text-align: center;
  color: var(--theme--foreground-subdued, #94a3b8);
  font-size: 14px;
  flex: 1;
}
.tai-modal-init-icon {
  font-size: 36px;
  color: var(--ai);
  display: block;
}

/* Modal footer */
.tai-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 22px;
  border-top: 1px solid var(--theme--border-color-subdued, #f1f5f9);
  background: var(--theme--background-subdued, #f8fafc);
  flex-shrink: 0;
}
.tai-footer-hint {
  font-size: 12px;
  color: var(--theme--foreground-subdued, #94a3b8);
  margin: 0;
}
.tai-footer-actions {
  display: flex;
  gap: 10px;
}
.tai-footer-btn {
  padding: 8px 18px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition:
    opacity 0.15s,
    box-shadow 0.15s;
}
.tai-footer-btn--cancel {
  background: var(--theme--background, #fff);
  border: 1.5px solid var(--theme--border-color, #cbd5e1);
  color: var(--theme--foreground-subdued, #64748b);
}
.tai-footer-btn--cancel:hover {
  background: #f1f5f9;
}
.tai-footer-btn--insert {
  background: linear-gradient(135deg, var(--ai), var(--ai-dark));
  color: #fff;
  box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3);
}
.tai-footer-btn--insert:hover:not(:disabled) {
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.45);
}
.tai-footer-btn--insert:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Modal transition
───────────────────────────────────────────────────────────────────────────── */
.tai-fade-enter-active,
.tai-fade-leave-active {
  transition: opacity 0.2s ease;
}
.tai-fade-enter-active .tai-modal,
.tai-fade-leave-active .tai-modal {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.tai-fade-enter-from,
.tai-fade-leave-to {
  opacity: 0;
}
.tai-fade-enter-from .tai-modal,
.tai-fade-leave-to .tai-modal {
  transform: scale(0.96) translateY(10px);
  opacity: 0;
}
</style>
