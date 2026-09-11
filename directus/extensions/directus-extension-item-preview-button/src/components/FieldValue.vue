<template>
  <span class="field-value">
    <template v-if="value === null || value === undefined || value === ''">
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
    <template v-else-if="isHtmlString(value)">
      <div class="html-value" v-html="sanitizeHtml(value as string)"></div>
    </template>
    <template v-else>
      <span class="scalar-value">{{ formatScalar(value) }}</span>
    </template>
  </span>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

// Legacy imported content (e.g. cruise "Introduction"/teaser text) is stored
// as raw HTML even though the field's own Directus interface is plain text —
// rendering it as an escaped string would show literal "<p>" tags to editors.
const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

export default defineComponent({
  name: "FieldValue",
  props: {
    value: { type: null as unknown as PropType<unknown>, default: null },
  },
  methods: {
    isHtmlString(v: unknown): boolean {
      return typeof v === "string" && HTML_TAG_PATTERN.test(v);
    },
    // Minimal allowlist-free strip of script/style/event-handler/js-uri vectors.
    // Content originates from Directus editors (internal, not public-submitted),
    // so this is defense-in-depth rather than a full sanitizer.
    sanitizeHtml(html: string): string {
      return html
        .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
        .replace(/<(script|style|iframe|object|embed)[^>]*>/gi, "")
        .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
        .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
    },
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
      if (typeof v === "boolean") return v ? "Yes" : "No";
      // Nested arrays/objects (e.g. a raw JSON sub-field inside a repeater row)
      // would otherwise stringify to "[object Object]" — summarize them as
      // readable key/value pairs instead.
      if (Array.isArray(v)) {
        return v.length ? v.map((item) => this.formatScalar(item)).join(", ") : "—";
      }
      if (typeof v === "object") {
        const entries = Object.entries(v as Record<string, unknown>);
        return entries.length
          ? entries.map(([k, val]) => `${k}: ${this.formatScalar(val)}`).join(", ")
          : "—";
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
  white-space: pre-wrap;
}

.html-value {
  word-break: break-word;
}
.html-value :deep(p) {
  margin: 0 0 0.75em;
}
.html-value :deep(p:last-child) {
  margin-bottom: 0;
}
.html-value :deep(ul),
.html-value :deep(ol) {
  margin: 0 0 0.75em;
  padding-left: 1.25em;
}
.html-value :deep(a) {
  color: var(--theme--primary, #6644ff);
}
</style>
