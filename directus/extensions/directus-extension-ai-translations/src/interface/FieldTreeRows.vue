<template>
  <template v-for="(node, ni) in nodes" :key="nodeKey(node, ni)">
    <!-- ─── Group (detail / raw / accordion) ───────────────────────── -->
    <template v-if="node.kind === 'group'">
      <div
        class="field-row-inputs group-header-row"
        :class="{ 'is-split': splitViewOn }"
        :style="{ '--group-depth': depth }"
      >
        <div class="field-input-col">
          <button
            type="button"
            class="group-toggle"
            @click="toggleOpen(node.field.field, node.startOpen)"
          >
            <v-divider
              class="group-divider"
              :class="{ active: isOpen(node.field.field, node.startOpen) }"
              large
              :inline-title="false"
              :style="{
                '--v-divider-label-color': groupHeaderColor(node.field),
              }"
            >
              <span class="title">{{
                node.field.name || node.field.field
              }}</span>
              <span class="lang-badge source">{{ sourceLanguage }}</span>
              <v-icon name="expand_more" class="expand-icon" />
            </v-divider>
          </button>
        </div>

        <!-- Spacer only — no group master checkbox -->
        <div class="field-ai-col group-header-spacer" v-show="splitViewOn" />

        <div class="field-input-col" v-show="splitViewOn">
          <button
            type="button"
            class="group-toggle"
            @click="toggleOpen(node.field.field, node.startOpen)"
          >
            <v-divider
              class="group-divider"
              :class="{ active: isOpen(node.field.field, node.startOpen) }"
              large
              :inline-title="false"
              :style="{
                '--v-divider-label-color': groupHeaderColor(node.field),
              }"
            >
              <span class="title">{{
                node.field.name || node.field.field
              }}</span>
              <span class="lang-badge target">{{ targetLanguage }}</span>
              <v-icon name="expand_more" class="expand-icon" />
            </v-divider>
          </button>
        </div>
      </div>

      <div
        v-show="isOpen(node.field.field, node.startOpen)"
        class="group-body"
        :style="{ '--group-depth': depth }"
      >
        <FieldTreeRows
          :nodes="node.children"
          :depth="depth + 1"
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
          :toggle-open="toggleOpen"
          :is-open="isOpen"
          @update:selection="$emit('update:selection', $event)"
        />
      </div>
    </template>

    <!-- ─── Leaf field row (1 or 2 half-width fields) ──────────────── -->
    <div
      v-else
      class="field-row-inputs"
      :class="{ 'is-split': splitViewOn }"
      :style="{ '--group-depth': depth }"
    >
      <div
        class="field-input-col"
        :class="{ 'field-pair': node.fields.length === 2 }"
      >
        <template v-for="f in node.fields" :key="f.field">
          <div class="field-sub-col">
            <div class="native-field-label">
              <span class="label-text type-label">{{ f.name || f.field }}</span>
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
                (val: Record<string, any>) =>
                  setFieldValue(sourceLanguage, f.field, val[f.field] ?? null)
              "
            />
            <p v-if="f.meta?.note" class="field-note" v-html="f.meta.note" />
          </div>
        </template>
      </div>

      <div
        class="field-ai-col"
        v-show="splitViewOn"
        :class="{ 'field-pair': node.fields.length === 2 }"
      >
        <div class="ai-checkbox-stack">
          <template v-for="f in node.fields" :key="f.field">
            <v-checkbox
              :model-value="selection.includes(f.field)"
              :disabled="disabled || aiTranslating"
              class="ai-checkbox"
              @update:model-value="(on: boolean) => toggleLeaf(f.field, on)"
            />
          </template>
        </div>
      </div>

      <div
        class="field-input-col"
        v-show="splitViewOn"
        :class="{ 'field-pair': node.fields.length === 2 }"
      >
        <template v-for="f in node.fields" :key="f.field">
          <div
            class="field-sub-col"
            :class="{ pending: f.field in pendingTranslations }"
          >
            <div class="native-field-label">
              <span class="label-text type-label">{{ f.name || f.field }}</span>
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
                (val: Record<string, any>) =>
                  setFieldValue(targetLanguage!, f.field, val[f.field] ?? null)
              "
            />
            <p v-if="f.meta?.note" class="field-note" v-html="f.meta.note" />
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
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FieldTreeNode, AnyField } from './fieldTree'
// Self-import enables recursive group nesting
import FieldTreeRows from './FieldTreeRows.vue'

defineOptions({ name: 'FieldTreeRows' })

const props = defineProps<{
  nodes: FieldTreeNode[]
  depth?: number
  splitViewOn: boolean
  sourceLanguage: string
  targetLanguage: string | null
  disabled: boolean
  aiTranslating: boolean
  selection: string[]
  pendingTranslations: Record<string, any>
  openGroups: Record<string, boolean>
  unlabeled: (f: AnyField) => AnyField
  getRow: (lang: string) => Record<string, any> | undefined
  getPrimaryKey: (lang: string) => string | number
  setFieldValue: (lang: string, field: string, val: any) => void
  toggleOpen: (fieldName: string, startOpen: boolean) => void
  isOpen: (fieldName: string, startOpen: boolean) => boolean
}>()

const emit = defineEmits<{
  (e: 'update:selection', value: string[]): void
}>()

const depth = computed(() => props.depth ?? 0)

function nodeKey(node: FieldTreeNode, ni: number): string {
  if (node.kind === 'group') return `g:${node.field.field}`
  return `l:${node.fields.map((f) => f.field).join('+')}:${ni}`
}

function toggleLeaf(fieldName: string, on: boolean) {
  const next = new Set(props.selection)
  if (on) next.add(fieldName)
  else next.delete(fieldName)
  emit('update:selection', Array.from(next))
}

/**
 * Same teal as native Detail Group titles (e.g. Attributes / Details multilingual).
 * Do NOT use --theme--foreground-accent: it is defined as dark text in this project,
 * so CSS var(..., #00A7C1) never reaches the teal fallback.
 */
function groupHeaderColor(f: AnyField): string {
  const fromMeta = f.meta?.options?.headerColor
  if (typeof fromMeta === 'string' && fromMeta) return fromMeta
  const fromField = (f as { options?: { headerColor?: unknown } }).options?.headerColor
  if (typeof fromField === 'string' && fromField) return fromField
  return '#008CC0'
}
</script>
