<template>
  <span class="field-value">
    <template v-if="value === null || value === undefined">
      <span class="null-value">—</span>
    </template>
    <template v-else-if="typeof value === 'boolean'">
      <span class="bool-value" :class="value ? 'bool-true' : 'bool-false'">
        {{ value ? "Yes" : "No" }}
      </span>
    </template>
    <template v-else-if="Array.isArray(value)">
      <div class="array-value">
        <div v-for="(item, i) in value" :key="i" class="array-item">
          <template v-if="typeof item === 'object' && item !== null">
            <span
              v-for="(v, k) in item as Record<string, unknown>"
              :key="k"
              class="obj-pair"
            >
              <span class="obj-key">{{ k }}</span
              >: {{ formatScalar(v) }}
            </span>
          </template>
          <template v-else>{{ formatScalar(item) }}</template>
        </div>
      </div>
    </template>
    <template v-else-if="typeof value === 'object'">
      <div class="obj-value">
        <span
          v-for="(v, k) in value as Record<string, unknown>"
          :key="k"
          class="obj-pair"
        >
          <span class="obj-key">{{ k }}</span
          >: {{ formatScalar(v) }}
        </span>
      </div>
    </template>
    <template v-else>
      <span class="scalar-value">{{ formatScalar(value) }}</span>
    </template>
  </span>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

export default defineComponent({
  name: "FieldValue",
  props: {
    value: { type: null as unknown as PropType<unknown>, default: null },
  },
  methods: {
    formatScalar(v: unknown): string {
      if (v === null || v === undefined) return "—";
      if (typeof v === "string") {
        // ISO date detection
        if (/^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/.test(v)) {
          try {
            return new Date(v).toLocaleString();
          } catch {
            return v;
          }
        }
        return v;
      }
      return String(v);
    },
  },
});
</script>

<style scoped>
.null-value {
  color: var(--theme--foreground-subdued, #999);
  font-style: italic;
}

.bool-true {
  color: var(--theme--success, #2ecda7);
  font-weight: 600;
}

.bool-false {
  color: var(--theme--danger, #e35169);
  font-weight: 600;
}

.array-value {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.array-item {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 8px;
  background: var(--theme--background-subdued, #f5f5f5);
  border-radius: 4px;
  font-size: 13px;
}

.obj-value {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.obj-pair {
  display: inline-flex;
  gap: 3px;
  font-size: 13px;
}

.obj-key {
  color: var(--theme--foreground-subdued, #888);
  font-weight: 500;
}

.scalar-value {
  word-break: break-word;
  text-wrap: auto;
}
</style>
