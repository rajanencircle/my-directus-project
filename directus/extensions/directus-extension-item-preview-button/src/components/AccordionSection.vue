<template>
  <section
    class="accordion"
    :class="{ 'has-header': showHeader, open: isOpen }"
  >
    <button v-if="showHeader" class="acc-header" @click="toggle">
      <span class="acc-title">{{ title }}</span>
      <svg
        class="acc-chevron"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
    <div class="acc-body" :style="bodyStyle">
      <div ref="bodyRef" class="acc-content">
        <DataNode v-for="node in nodes" :key="node.key" :node="node" />
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  watch,
  nextTick,
  onMounted,
  computed,
  PropType,
} from "vue";
import DataNode from "./DataNode.vue";
import type { DisplayNode } from "../types";

export default defineComponent({
  name: "AccordionSection",
  components: { DataNode },
  props: {
    title: { type: String, default: "" },
    nodes: { type: Array as PropType<DisplayNode[]>, default: () => [] },
    defaultOpen: { type: Boolean, default: true },
    showHeader: { type: Boolean, default: true },
  },
  setup(props) {
    console.log("AccordionSection props", props);
    const isOpen = ref(props.defaultOpen);
    const bodyRef = ref<HTMLElement | null>(null);
    const measuredHeight = ref("auto");
    async function measure() {
      await nextTick();
      if (bodyRef.value)
        measuredHeight.value = bodyRef.value.scrollHeight + "px";
    }

    function toggle() {
      if (isOpen.value) {
        if (bodyRef.value)
          measuredHeight.value = bodyRef.value.scrollHeight + "px";
        nextTick(() => {
          measuredHeight.value = "0px";
          isOpen.value = false;
        });
      } else {
        isOpen.value = true;
        measure();
      }
    }

    const bodyStyle = computed(() =>
      props.showHeader
        ? {
            height: isOpen.value ? measuredHeight.value : "0px",
            overflow: "hidden",
            transition: "height 0.22s ease",
          }
        : {},
    );

    watch(
      () => props.nodes,
      () => {
        if (isOpen.value) measure();
      },
      { deep: true },
    );
    onMounted(() => {
      if (isOpen.value && props.showHeader) measure();
    });

    return { isOpen, toggle, bodyRef, bodyStyle };
  },
});
</script>

<style scoped>
.accordion {
  background: var(--theme--background, #fff);
  border-radius: 10px;
  overflow: auto;
}
.accordion.has-header {
  border: 1px solid var(--theme--border-color, #e0e0e0);
}

.acc-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--theme--background-normal, #fafafa);
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
  user-select: none;
}
.acc-header:hover {
  background: var(--theme--background-subdued, #f5f5f5);
}

.acc-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--theme--foreground, #1a1a1a);
}
.acc-chevron {
  color: var(--theme--foreground-subdued, #888);
  transition: transform 0.2s ease;
}
.open .acc-chevron {
  transform: rotate(180deg);
}

.acc-content {
  padding: 8px 16px 12px;
}
</style>
