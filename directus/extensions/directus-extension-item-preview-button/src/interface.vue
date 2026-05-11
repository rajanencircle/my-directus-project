<template>
  <div class="ip-wrapper">
    <button
      class="ip-btn"
      :class="{ 'ip-btn--disabled': isNew }"
      :disabled="isNew"
      :title="
        isNew
          ? 'Save the item first to enable preview'
          : `Preview: ${collection} #${primaryKey}`
      "
      @click="showOverlay = true"
    >
      <v-icon v-if="icon" :name="icon" small />
      <svg
        v-else
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        aria-hidden="true"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      {{ buttonLabel || "Preview" }}
    </button>
    <span v-if="isNew" class="ip-hint">Save the item first</span>

    <Teleport to="body">
      <PreviewOverlay
        v-if="showOverlay"
        :collection="collection || ''"
        :item-id="String(primaryKey)"
        :config="parsedConfig"
        @close="showOverlay = false"
      />
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType } from "vue";
import PreviewOverlay from "./components/PreviewOverlay.vue";
import type { PreviewConfig, GroupConfig } from "./types";

function safeParseGroups(raw: unknown): GroupConfig[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw as GroupConfig[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as GroupConfig[]) : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export default defineComponent({
  name: "ItemPreviewButton",
  components: { PreviewOverlay },
  props: {
    value: { default: null },
    collection: { type: String, default: "" },
    primaryKey: { type: [String, Number], default: null },
    disabled: { type: Boolean, default: false },
    translation_collection: { type: String, default: "" },
    buttonLabel: { type: String, default: "" },
    icon: { type: String, default: "preview" },
    title: { type: String, default: "" },
    defaultLang: { type: String, default: "" },
    langField: { type: String, default: "" },
    groups: {
      type: [Array, String] as PropType<GroupConfig[] | string | null>,
      default: null,
    },
  },
  emits: ["input"],
  setup(props) {
    const showOverlay = ref(false);

    const isNew = computed(
      () =>
        !props.primaryKey ||
        props.primaryKey === "+" ||
        String(props.primaryKey) === "null" ||
        String(props.primaryKey) === "undefined",
    );

    const parsedConfig = computed<PreviewConfig>(() => ({
      title: props.title || "name",
      defaultLang: props.defaultLang || "de-DE",
      langField: props.langField || "languages_code",
      buttonLabel: props.buttonLabel || "Preview",
      translation_collection: props.translation_collection || "translations",
      icon: props.icon || "preview",
      groups: safeParseGroups(props.groups),
    }));

    return { showOverlay, isNew, parsedConfig };
  },
});
</script>

<style scoped>
.ip-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ip-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 20px;
  background: var(--theme--primary, #6644ff);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--theme--fonts--sans--font-family, system-ui, sans-serif);
  cursor: pointer;
  transition:
    opacity 0.15s,
    box-shadow 0.15s;
  box-shadow: 0 2px 8px rgba(102, 68, 255, 0.22);
  user-select: none;
}
.ip-btn:not(.ip-btn--disabled):hover {
  opacity: 0.88;
  box-shadow: 0 4px 14px rgba(102, 68, 255, 0.33);
}
.ip-btn--disabled,
.ip-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  box-shadow: none;
}

.ip-hint {
  font-size: 12px;
  color: var(--theme--foreground-subdued, #aaa);
}
</style>
