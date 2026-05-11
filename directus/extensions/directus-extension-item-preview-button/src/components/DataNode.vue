<template>
  <!-- Scalar row -->
  <div v-if="node.type === 'scalar'" class="kv-row">
    <dt class="kv-label">{{ node.label }}</dt>
    <dd class="kv-value"><FieldValue :value="node.value" /></dd>
  </div>

  <!-- Flat tag list (single-value m2m, e.g. activity names, partner names) -->
  <div v-else-if="node.type === 'flat-list'" class="kv-row">
    <dt class="kv-label">{{ node.label }}</dt>
    <dd class="kv-value">
      <span v-if="!node.list?.length" class="null-value">—</span>
      <div v-else class="tag-list">
        <span v-for="(item, i) in node.list" :key="i" class="tag">{{ item }}</span>
      </div>
    </dd>
  </div>

  <!-- M2O nested relation -->
  <div v-else-if="node.type === 'relation'" class="relation-block">
    <div class="relation-header">{{ node.label }}</div>
    <div class="relation-body">
      <DataNode v-for="child in node.children" :key="child.key" :node="child" />
    </div>
  </div>

  <!-- O2M / M2M array -->
  <div v-else-if="node.type === 'array'" class="array-block">
    <button class="array-header" @click="isExpanded = !isExpanded">
      <span class="array-title">{{ node.label }}</span>
      <span class="count-badge">{{ node.items?.length ?? 0 }}</span>
      <svg
        class="array-chevron"
        :class="{ rotated: isExpanded }"
        width="14" height="14" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2.5"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
    <div v-if="isExpanded" class="array-items">
      <div v-for="(itemNodes, i) in node.items" :key="i" class="array-item">
        <span class="array-item-idx">#{{ i + 1 }}</span>
        <div class="array-item-body">
          <DataNode v-for="child in itemNodes" :key="child.key" :node="child" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, PropType } from 'vue';
import FieldValue from './FieldValue.vue';
import type { DisplayNode } from '../types';

export default defineComponent({
  name: 'DataNode',
  components: { FieldValue },
  props: {
    node: { type: Object as PropType<DisplayNode>, required: true },
  },
  setup() {
    const isExpanded = ref(false);
    return { isExpanded };
  },
});
</script>

<style scoped>
/* ── Key-value row ── */
.kv-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 8px 16px;
  padding: 9px 0;
  border-bottom: 1px solid var(--theme--border-color-subdued, #f0f0f0);
  align-items: baseline;
}
.kv-row:last-child { border-bottom: none; }

.kv-label {
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
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
}
.null-value { color: var(--theme--foreground-subdued, #bbb); font-style: italic; }

/* Tag list */
.tag-list { display: flex; flex-wrap: wrap; gap: 5px; }
.tag {
  padding: 2px 10px;
  background: var(--theme--background-subdued, #f0f0f0);
  border-radius: 20px;
  font-size: 12px;
  color: var(--theme--foreground, #1a1a1a);
}

/* ── Relation block ── */
.relation-block {
  margin: 6px 0;
  border: 1px solid var(--theme--border-color-subdued, #e8e8e8);
  border-radius: 8px;
  overflow: hidden;
}
.relation-header {
  padding: 7px 14px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--theme--primary, #6644ff);
  background: var(--theme--primary-background, #f7f5ff);
  border-bottom: 1px solid var(--theme--border-color-subdued, #e8e8e8);
}
.relation-body { padding: 4px 14px 6px; }

/* ── Array block ── */
.array-block {
  margin: 6px 0;
  border: 1px solid var(--theme--border-color, #e0e0e0);
  border-radius: 8px;
  overflow: hidden;
}
.array-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: var(--theme--background-normal, #fafafa);
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
  user-select: none;
}
.array-header:hover { background: var(--theme--background-subdued, #f5f5f5); }

.array-title {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--theme--foreground, #1a1a1a);
  flex: 1;
  text-align: left;
}
.count-badge {
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  background: var(--theme--primary, #6644ff);
  color: #fff;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.array-chevron { color: var(--theme--foreground-subdued, #888); transition: transform 0.18s ease; }
.array-chevron.rotated { transform: rotate(180deg); }

.array-items { border-top: 1px solid var(--theme--border-color-subdued, #f0f0f0); }
.array-item {
  display: flex;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--theme--border-color-subdued, #f5f5f5);
}
.array-item:last-child { border-bottom: none; }
.array-item-idx {
  font-size: 11px;
  font-weight: 700;
  color: var(--theme--foreground-subdued, #ccc);
  padding-top: 10px;
  min-width: 22px;
}
.array-item-body { flex: 1; }

@media (max-width: 580px) {
  .kv-row { grid-template-columns: 1fr; gap: 2px; }
  .kv-label { font-size: 10.5px; }
}
</style>
