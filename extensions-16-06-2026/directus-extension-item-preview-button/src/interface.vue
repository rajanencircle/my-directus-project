<template>
  <!-- Zero-height placeholder — button lives in the sidebar, not the form -->
  <div class="ip-placeholder" />

  <Teleport to="body">
    <PreviewOverlay
      v-if="showOverlay"
      :collection="collection || ''"
      :item-id="String(primaryKey)"
      :config="parsedConfig"
      @close="showOverlay = false"
    />
  </Teleport>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  PropType,
} from "vue";
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

// Selector for the Directus sidebar accordion root (Revisions/Comments/Shares/Flows live here)
const SIDEBAR_NAV_SELECTORS = [
  "aside#sidebar .accordion-root",
  "aside.sidebar .accordion-root",
  "#sidebar .accordion-root",
  "aside#sidebar",
  "aside.sidebar",
];

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
    langButtonLabel: { type: String, default: "" },
    displayPlace: { type: String, default: "start" },
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
      buttonLabel: props.buttonLabel || "",
      translation_collection: props.translation_collection || "translations",
      icon: props.icon || "visibility",
      langButtonLabel: props.langButtonLabel || "code",
      groups: safeParseGroups(props.groups),
    }));

    // ── Sidebar button injection ───────────────────────────────────────────────
    let injectedBtn: HTMLButtonElement | null = null;
    let mutationObserver: MutationObserver | null = null;

    function findSidebarNav(): Element | null {
      for (const sel of SIDEBAR_NAV_SELECTORS) {
        const el = document.querySelector(sel);
        if (el) {
          console.log("[ip-preview] sidebar found via selector:", sel, el);
          return el;
        }
      }
      // Debug: log all aside/nav elements to help identify correct selector
      console.warn("[ip-preview] No sidebar selector matched. Found in DOM:");
      document.querySelectorAll("aside, nav").forEach((el) => {
        console.log(
          "  ",
          el.tagName,
          (el as HTMLElement).className || "(no class)",
          el.id || "",
        );
      });
      return null;
    }

    function buildButtonHTML(icon: string, label: string): string {
      return `<div
  data-v-c79b6f25=""
  data-v-3f7349a2=""
  data-v-d53b0f2e=""
  data-state="closed"
  data-orientation="vertical"
  class="accordion-item"
>
  <h3 data-v-c79b6f25="" data-orientation="vertical" data-state="closed">
    <button
      data-v-c79b6f25=""
      type="button"
      aria-controls="reka-collapsible-content-v-16"
      aria-expanded="false"
      data-state="closed"
      id="reka-accordion-trigger-v-15"
      data-reka-collection-item=""
      data-orientation="vertical"
      class="accordion-trigger"
      data-tooltip="dSsI0ZwBcqADcogthzwdt"
    >
      <div data-v-6fb2cbd6="" data-v-c79b6f25="" class="v-badge bordered">
        <!----><span
          data-v-0317f84d=""
          data-v-c79b6f25=""
          class="v-icon accordion-trigger-icon"
          ><i data-v-0317f84d="" class="" data-icon="${icon}"></i
        ></span>
      </div>
      <span data-v-c79b6f25="" class="accordion-trigger-title" style="    margin-left: 3px;">${label}</span
      >
      </span>
    </button>
  </h3>
  <div
    data-v-c79b6f25=""
    role="region"
    aria-labelledby="reka-accordion-trigger-v-15"
    data-state="closed"
    data-orientation="vertical"
    class="accordion-content"
    id="reka-collapsible-content-v-16"
    hidden=""
    style="
      --reka-accordion-content-width: var(--reka-collapsible-content-width);
      --reka-accordion-content-height: var(--reka-collapsible-content-height);
      --reka-collapsible-content-height: 0px;
      --reka-collapsible-content-width: 0px;
    "
  >
    <!--v-if-->
  </div>
</div>`;
    }

    function updateButtonState(btn: HTMLButtonElement) {
      btn.disabled = isNew.value;
      btn.title = isNew.value ? "Save the item first to enable preview" : "";
    }

    function injectSidebarButton() {
      if (injectedBtn) return;
      const nav = findSidebarNav();
      if (!nav) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "accordion-trigger ip-sidebar-btn";
      btn.innerHTML = buildButtonHTML(
        props.icon || "preview",
        props.buttonLabel || "Preview",
      );
      updateButtonState(btn);
      btn.addEventListener("click", () => {
        if (!isNew.value) showOverlay.value = true;
      });

      nav.appendChild(btn);
      injectedBtn = btn;
    }

    function removeSidebarButton() {
      injectedBtn?.remove();
      injectedBtn = null;
    }

    onMounted(() => {
      injectSidebarButton();
      if (!injectedBtn) {
        mutationObserver = new MutationObserver(() => {
          injectSidebarButton();
          if (injectedBtn) {
            mutationObserver?.disconnect();
            mutationObserver = null;
          }
        });
        mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    });

    onUnmounted(() => {
      mutationObserver?.disconnect();
      mutationObserver = null;
      removeSidebarButton();
    });

    watch(isNew, () => {
      if (injectedBtn) updateButtonState(injectedBtn);
    });

    return { showOverlay, isNew, parsedConfig };
  },
});
</script>

<style scoped>
.ip-placeholder {
  height: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>

<!-- Global styles (not scoped) -->
<style>
/* Hide the entire Directus field wrapper that contains our zero-height placeholder */
[data-field]:has(.ip-placeholder) {
  display: none !important;
}

/* Disabled state for our injected sidebar button */
.ip-sidebar-btn:disabled {
  opacity: 0.38 !important;
  cursor: not-allowed !important;
}
</style>
