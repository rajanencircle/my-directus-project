<template>
  <!-- A repeater sub-field flagged cardTitle renders as the card's own header line -->
  <div v-if="node.cardTitle" class="repeater-card-title">
    <FieldValue :value="node.value" />
  </div>

  <!-- Scalar key-value row -->
  <div v-else-if="node.type === 'scalar'" class="kv-row">
    <dt class="kv-label">{{ node.label }}</dt>
    <dd class="kv-value"><FieldValue :value="node.value" /></dd>
  </div>

  <!-- Flat tag list -->
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

  <!-- Price table — category groups, each a table of dates × occupancies with buy/sell cells -->
  <div
    v-else-if="node.type === 'price-table'"
    class="repeater-section"
    :class="node.hideLabel ? 'repeater-section-plain' : 'kv-row'"
  >
    <dt v-if="!node.hideLabel" class="kv-label">{{ node.label }}</dt>
    <dd class="repeater-body">
      <span v-if="!node.priceTable?.groups?.length" class="null-value">—</span>
      <div v-else class="price-table-list">
        <div
          v-for="group in node.priceTable.groups"
          :key="group.key"
          class="price-table-group"
        >
          <div class="price-table-group-title">{{ group.label }}</div>
          <div class="price-table-wrapper">
            <table class="price-table">
              <thead>
                <tr>
                  <th class="price-table-row-header">Date</th>
                  <th
                    v-for="col in node.priceTable.columns"
                    :key="col.id"
                    class="price-table-col-header"
                  >
                    {{ col.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in group.rows" :key="row.key">
                  <td class="price-table-row-label">
                    <strong v-if="row.label">{{ row.label }}</strong>
                    <div class="price-table-date-range">{{ row.dateRange }}</div>
                  </td>
                  <td
                    v-for="col in node.priceTable.columns"
                    :key="col.id"
                    class="price-table-cell"
                  >
                    <div class="price-table-buy">
                      <span class="price-table-cell-label">Buy</span>
                      <FieldValue :value="row.cells[col.id]?.buy" />
                    </div>
                    <div class="price-table-sell">
                      <span class="price-table-cell-label">Sell</span>
                      <FieldValue :value="row.cells[col.id]?.sell" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </dd>
  </div>

  <!-- Repeater — list of object items, each with its own sub-nodes -->
  <div
    v-else-if="node.type === 'repeater'"
    class="repeater-section"
    :class="node.hideLabel ? 'repeater-section-plain' : 'kv-row'"
  >
    <dt v-if="!node.hideLabel" class="kv-label">{{ node.label }}</dt>
    <dd class="repeater-body">
      <span v-if="!node.items?.length" class="null-value">—</span>
      <div v-else class="repeater-list">
        <div
          v-for="(itemNodes, idx) in node.items"
          :key="idx"
          class="repeater-card"
        >
          <DataNode
            v-for="subNode in itemNodes.filter((n) => n.cardTitle)"
            :key="subNode.key"
            :node="subNode"
          />
          <div class="repeater-card-fields">
            <DataNode
              v-for="subNode in itemNodes.filter((n) => !n.cardTitle)"
              :key="subNode.key"
              :node="subNode"
            />
          </div>
        </div>
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
/* ── Shared key-value row ── */
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
  /* Grid items default to min-width: auto, which lets a long word/label
     refuse to shrink and overflow into the value column — this overrides it. */
  min-width: 0;
  overflow-wrap: anywhere;
  /* Directus's own base styles set bare <dt> elements to white-space: nowrap
     (for its native form-field labels), which wins over the rules above and
     silently disables wrapping — this is the actual cause of the overlap. */
  white-space: normal !important;
}
.kv-value {
  font-size: 14px;
  color: var(--theme--foreground, #1a1a1a);
  margin: 0;
  line-height: 1.5;
  word-break: break-word;
  overflow-wrap: anywhere;
  /* Same min-width: auto fix as .kv-label — without it, an unbroken long
     value (UUID, URL, email) overflows its track and overlaps the label. */
  min-width: 0;
}
.null-value {
  color: var(--theme--foreground-subdued, #bbb);
  font-style: italic;
}

/* ── Tag list ── */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.tag {
  padding: 2px 10px;
  background: var(--theme--background-subdued, #f0f0f0);
  border-radius: 20px;
  font-size: 12px;
  color: var(--theme--foreground, #1a1a1a);
}

/* ── Repeater section ── */
.repeater-section-plain {
  padding: 9px 0;
}
/* When a repeater's own label is hidden (e.g. "Room Categories", where the
   group accordion title already says it), wrap the whole list in one outer
   box so the section reads as a single distinct block — each entry still
   gets its own inner card (below), so items stay visually separated by a
   box rather than just a divider line. */
.repeater-section-plain > .repeater-body > .repeater-list {
  border: 1px solid var(--theme--border-color-subdued, #ececec);
  border-radius: 10px;
  padding: 10px;
  background: var(--theme--background-subdued, #f8f8f8);
}
.repeater-body {
  margin: 0;
  /* Directus's base styles set bare <dd> elements to display: inline-block,
     which shrinks this to fit its content instead of the available width —
     only noticeable once a repeater's own content is short (e.g. dates)
     rather than long text that happens to fill the space anyway. */
  display: block;
  width: 100%;
  box-sizing: border-box;
}
.repeater-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
/* Each repeater entry (e.g. one room category) is its own bordered card so
   items are clearly distinguished from one another. Explicit width/box-sizing
   so the card always spans its parent's full width rather than shrinking to
   its content — flex's default stretch can still yield a narrower box once
   nested a couple of levels deep. */
.repeater-card {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--theme--border-color, #e0e0e0);
  border-radius: 8px;
  overflow: hidden;
  background: var(--theme--background-normal, #fff);
}

.repeater-card-title {
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 700;
  color: var(--theme--foreground, #1a1a1a);
  background: var(--theme--background-subdued, #f5f5f5);
  border-bottom: 1px solid var(--theme--border-color, #e0e0e0);
}

.repeater-card-fields {
  padding: 4px 12px;
  width: 100%;
  box-sizing: border-box;
}

/* Fields nested inside a repeater card render as a real two-column table —
   field name on the left, value on the right — same as top-level rows. */
.repeater-card-fields > .kv-row:last-child {
  border-bottom: none;
}

/* A repeater nested inside another repeater's card (e.g. days_repeater inside
   a room_categories entry) renders flat with no box of its own — only the
   outer top-level repeater (the room category list) gets boxed treatment. */
.repeater-card-fields .repeater-section-plain {
  padding: 0;
}
.repeater-card-fields .repeater-section-plain > .repeater-body > .repeater-list,
.repeater-card-fields .repeater-list {
  border: none;
  border-radius: 0;
  padding: 0;
  background: transparent;
  gap: 0;
}
.repeater-card-fields .repeater-card {
  border: none;
  border-radius: 0;
  overflow: visible;
  background: transparent;
}
.repeater-card-fields .repeater-card-fields {
  padding: 0;
}

/* ── Price table ── */
.price-table-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.price-table-group {
  border: 1px solid var(--theme--border-color, #e0e0e0);
  border-radius: 8px;
  overflow: hidden;
  background: var(--theme--background-normal, #fff);
}
.price-table-group-title {
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 700;
  color: var(--theme--primary, #1a1a1a);
  background: var(--theme--background-subdued, #f5f5f5);
  border-bottom: 1px solid var(--theme--border-color, #e0e0e0);
}
.price-table-wrapper {
  overflow-x: auto;
}
.price-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.price-table th,
.price-table td {
  border: 1px solid var(--theme--border-color-subdued, #ececec);
  padding: 6px 10px;
  vertical-align: middle;
}
.price-table-row-header,
.price-table-col-header {
  background: var(--theme--background-subdued, #f5f5f5);
  color: var(--theme--foreground-subdued, #888);
  font-weight: 600;
  font-size: 11.5px;
  letter-spacing: 0.03em;
  text-align: left;
  white-space: nowrap;
}
.price-table-col-header {
  text-align: center;
}
.price-table-row-label {
  white-space: nowrap;
}
.price-table-date-range {
  color: var(--theme--foreground-subdued, #999);
  font-size: 11px;
}
.price-table-cell {
  text-align: center;
  min-width: 90px;
}
.price-table-cell-label {
  color: var(--theme--foreground-subdued, #999);
  margin-right: 4px;
}
.price-table-buy,
.price-table-sell {
  white-space: nowrap;
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
