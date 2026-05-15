<template>
  <!-- ── Backdrop — click outside to close ─────────────────────────────────── -->
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <!-- ── Topbar ──────────────────────────────────────────────────────────── -->
      <div class="topbar">
        <div class="topbar-left">
          <span class="collection-chip">{{ collection }}</span>
          <h1 class="item-title">{{ itemTitle || "#" + itemId }}</h1>
        </div>

        <div v-if="languages.length > 1" class="lang-area">
          <LanguageSelector
            v-model="currentLang"
            :languages="languages"
            :label-field="config?.langButtonLabel || 'code'"
          />
        </div>

        <button class="close-btn" title="Close preview" @click="$emit('close')">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- ── Loading ──────────────────────────────────────────────────────────── -->
      <div v-if="loading" class="state-box">
        <span class="spinner" />
        <span>Loading data…</span>
      </div>

      <!-- ── Error ────────────────────────────────────────────────────────────── -->
      <div v-else-if="error" class="state-box state-error">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- ── No config ─────────────────────────────────────────────────────────── -->
      <div v-else-if="!hasConfig" class="state-box state-warn">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <strong>No fields configured</strong>
          <p>
            Open the field settings for this interface and add a
            <code>fields</code> array to the configuration JSON.
          </p>
        </div>
      </div>

      <!-- ── Content ───────────────────────────────────────────────────────────── -->
      <div v-else class="preview-body">
        <AccordionSection
          v-for="section in sections"
          :key="section.id"
          :title="section.label"
          :nodes="section.nodes"
          :default-open="section.defaultOpen"
          :show-header="!!section.label"
          :accordion="section.accordion"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  computed,
  watch,
  onMounted,
  toRef,
  PropType,
} from "vue";
import { useI18n } from "vue-i18n";
import { useApi } from "@directus/extensions-sdk";
import LanguageSelector from "./LanguageSelector.vue";
import AccordionSection from "./AccordionSection.vue";
import { useLanguages } from "../composables/useLanguages";
import { useFieldLabels } from "../composables/useFieldLabels";
import {
  extractApiFields,
  buildFieldNodes,
  resolveLabel,
  prettify,
} from "../composables/useDisplayTree";
import type { PreviewConfig, LangMap } from "../types";

export default defineComponent({
  name: "PreviewOverlay",
  components: { LanguageSelector, AccordionSection },
  props: {
    collection: { type: String, required: true },
    itemId: { type: String, required: true },
    config: { type: Object as PropType<PreviewConfig | null>, default: null },
  },
  emits: ["close"],
  setup(props) {
    const api = useApi();
    const { locale: systemLocale } = useI18n();

    const { languages } = useLanguages(
      props.config?.translation_collection ?? "languages",
    );
    const { fieldLabels, groupLabels } = useFieldLabels(
      props.collection,
      toRef(props, "config"),
    );

    const rawItem = ref<Record<string, unknown>>({});
    const loading = ref(false);
    const error = ref<string | null>(null);

    const currentLang = ref(props.config?.defaultLang ?? "de-DE");

    watch(
      () => props.config?.defaultLang,
      (v) => {
        if (v) currentLang.value = v;
      },
      { immediate: true },
    );

    const hasConfig = computed(
      () =>
        (props.config?.groups?.reduce(
          (sum, g) => sum + (g.fields?.length ?? 0),
          0,
        ) ?? 0) > 0,
    );

    async function fetchData() {
      if (!hasConfig.value) return;
      loading.value = true;
      error.value = null;
      try {
        const apiFields = extractApiFields(props.config!);
        const res = await api.get(
          `/items/${props.collection}/${props.itemId}`,
          { params: { fields: apiFields } },
        );
        rawItem.value = res.data?.data ?? {};
      } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : "Failed to load item.";
      } finally {
        loading.value = false;
      }
    }

    onMounted(fetchData);
    watch(
      [() => props.collection, () => props.itemId, () => props.config],
      fetchData,
    );

    const sections = computed(() => {
      const cfg = props.config;
      if (!cfg?.groups?.length || !Object.keys(rawItem.value).length) return [];
      const langField = cfg.langField ?? "languages_code";

      return cfg.groups
        .map((g) => {
          const rawGroupLabel =
            g.label ?? groupLabels.value.get(g.id) ?? prettify(g.id);
          return {
            id: g.id,
            label: resolveLabel(rawGroupLabel, systemLocale.value),
            defaultOpen: g.defaultOpen !== false,
            accordion: g.accordion === true,
            nodes: buildFieldNodes(
              rawItem.value,
              g.fields ?? [],
              currentLang.value,
              systemLocale.value,
              langField,
              languages.value,
              fieldLabels.value,
            ),
          };
        })
        .filter((s) => s.nodes.length > 0);
    });

    console.log("sections", sections);

    const itemTitle = computed(() => {
      const tf = props.config?.title ?? "name";
      return (rawItem.value[tf] as string) ?? "";
    });

    return {
      currentLang,
      languages,
      loading,
      error,
      hasConfig,
      itemTitle,
      sections,
    };
  },
});
</script>

<style scoped>
/* ── Backdrop ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.45);
  padding: 40px;
  box-sizing: border-box;
  display: flex;
  font-family: var(--theme--fonts--sans--font-family, system-ui, sans-serif);
}

/* ── Modal container ── */
.modal {
  flex: 1;
  min-width: 0;
  background: var(--theme--background-normal, #f4f4f8);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
}

/* ── Topbar ── */
.topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 24px;
  background: var(--theme--background, #fff);
  border-bottom: 1px solid var(--theme--border-color, #e0e0e0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  flex-wrap: wrap;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.collection-chip {
  padding: 3px 9px;
  background: var(--theme--primary-background, #ece8ff);
  color: var(--theme--primary, #6644ff);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  border-radius: 5px;
  flex-shrink: 0;
}

.item-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--theme--foreground, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lang-area {
  flex-shrink: 0;
}

.close-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: transparent;
  border: 1px solid var(--theme--border-color, #e0e0e0);
  border-radius: 6px;
  cursor: pointer;
  color: var(--theme--foreground-subdued, #888);
  transition: all 0.15s;
  margin-left: auto;
}
.close-btn:hover {
  border-color: var(--theme--danger, #e35169);
  color: var(--theme--danger, #e35169);
}

/* ── States ── */
.state-box {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  max-width: 600px;
  margin: 60px auto;
  padding: 24px;
  background: var(--theme--background, #fff);
  border: 1px solid var(--theme--border-color, #e0e0e0);
  border-radius: 10px;
  font-size: 14px;
  color: var(--theme--foreground-subdued, #666);
}
.state-error {
  border-color: #fecdd3;
  color: var(--theme--danger, #e35169);
}
.state-warn {
  border-color: #fde68a;
  color: #92400e;
}
.state-box p {
  margin: 5px 0 0;
  font-size: 13px;
  color: var(--theme--foreground-subdued, #777);
}
.state-box code {
  background: var(--theme--background-subdued, #f5f5f5);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
}
.state-box strong {
  display: block;
  margin-bottom: 4px;
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid var(--theme--border-color, #e0e0e0);
  border-top-color: var(--theme--primary, #6644ff);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Content area ── */
.preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-sizing: border-box;
}

@media (max-width: 600px) {
  .modal-backdrop {
    padding: 16px;
  }
  .topbar {
    padding: 8px 14px;
  }
  .preview-body {
    padding: 12px 12px 24px;
  }
}
</style>
