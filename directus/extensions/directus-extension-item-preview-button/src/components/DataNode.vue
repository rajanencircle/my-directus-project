<template>
  <!-- Scalar key-value row -->
  <div v-if="node.type === 'scalar'" class="kv-row">
    <dt class="kv-label">{{ node.label }}</dt>
    <dd class="kv-value"><FieldValue :value="node.value" /></dd>
  </div>

  <!-- Flat tag list (array that resolved to a list of scalars) -->
  <div v-else-if="node.type === 'flat-list'" class="kv-row">
    <dt class="kv-label">{{ node.label }}</dt>
    <dd class="kv-value">
      <span v-if="!node.list?.length" class="null-value">—</span>
      <div v-else>
        <span v-for="(item, i) in node.list" :key="i" class="tag"
          >• {{ item }}<br
        /></span>
      </div>
    </dd>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import FieldValue from "./FieldValue.vue";
import type { DisplayNode } from "../types";

export default defineComponent({
  name: "DataNode",
  components: { FieldValue },
  props: {
    node: { type: Object as PropType<DisplayNode>, required: true },
  },
});
</script>

<style scoped>
.kv-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 8px 16px;
  padding: 9px 0;
  border-bottom: 1px solid var(--theme--border-color-subdued, #f0f0f0);
  align-items: baseline;
}
.kv-row:last-child {
  border-bottom: none;
}

.kv-label {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.055em;
  color: var(--theme--foreground-subdued, #888);
  margin: 0;
  line-height: 1.5;
}
.kv-value {
  font-size: 14px;
  color: var(--theme--foreground, #1a1a1a);
  margin: 0;
  line-height: 1.5;
  word-break: break-word;
  text-wrap: auto;
}
.null-value {
  color: var(--theme--foreground-subdued, #bbb);
  font-style: italic;
}

.tag {
  padding: 2px 10px;
  background: var(--theme--background-subdued, #f0f0f0);
  border-radius: 20px;
  font-size: 12px;
  color: var(--theme--foreground, #1a1a1a);
}

@media (max-width: 580px) {
  .kv-row {
    grid-template-columns: 1fr;
    gap: 2px;
  }
  .kv-label {
    font-size: 10.5px;
  }
}
</style>
