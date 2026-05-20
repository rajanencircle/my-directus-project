<template>
  <form @submit.prevent="handleClick">
    <v-button
      type="submit"
      class="save-and-stay-trigger-flow-class"
      :class="classType"
      :loading="isLoading"
      :secondary="classType !== 'primary'"
      :icon="!label"
      :disabled="alwaysEnabled ? isSaving : !isDirty || isSaving"
    >
      <v-icon v-if="icon" left :name="icon" />
      <span v-if="label">{{ label }}</span>
    </v-button>
  </form>
</template>

<script setup>
import { useApi } from "@directus/extensions-sdk";
import {
  ref,
  computed,
  watch,
  inject,
  toRaw,
  unref,
  onMounted,
  nextTick,
} from "vue";

const props = defineProps({
  label: { type: String, default: null },
  icon: { type: String, default: "save" },
  classType: { type: String, default: "primary" },
  flowId: { type: String, default: null },
  flowCollection: { type: String, default: null },
  flowKey: { type: String, default: null },
  flowPayload: { type: Object, default: null },
  alwaysEnabled: { type: Boolean, default: false },
  primaryKey: { type: [String, Number], default: null },
  collection: { type: String, default: null },
});

const api = useApi();

const isLoading = ref(false);
const isSaving = ref(false);

// Inject Directus form context
const values = inject("values", {});
const initialValues = inject("initialValues");

// ── Deep unwrap reactive values ─────────────────────────────
function deepToRaw(raw, visited = new WeakMap()) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || raw instanceof Date) return raw;
  if (visited.has(raw)) return visited.get(raw);

  const val = toRaw(unref(raw));
  if (typeof val !== "object" || val === null) return val;

  if (Array.isArray(val)) {
    const arr = [];
    visited.set(raw, arr);
    val.forEach((item) => arr.push(deepToRaw(item, visited)));
    return arr;
  }

  const result = {};
  visited.set(raw, result);
  for (const key of Object.keys(val)) {
    result[key] = deepToRaw(val[key], visited);
  }
  return result;
}

// ── Deep comparison ─────────────────────────────────────────
function isDeeplyDifferent(a, b) {
  if (a == null && b == null) return false;
  if (a == null || b == null) return true;
  if (typeof a !== typeof b) return true;
  if (typeof a !== "object" || a instanceof Date) return a !== b;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return true;
    return a.some((item, i) => isDeeplyDifferent(item, b[i]));
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return true;

  return keysA.some((key) => isDeeplyDifferent(a[key], b[key]));
}

// ── Dirty tracking ──────────────────────────────────────────
const baselineJson = ref(null);
const currentSnapshot = ref({});

const syncCurrentSnapshot = () => {
  currentSnapshot.value = deepToRaw(values) ?? {};
};

// debounce snapshot updates
let debounceTimer = null;
watch(
  values,
  () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(syncCurrentSnapshot, 120);
  },
  { deep: true },
);

const isDirty = computed(() => {
  if (baselineJson.value === null) return false;
  const baseline = JSON.parse(baselineJson.value);
  return isDeeplyDifferent(currentSnapshot.value, baseline);
});

// Sync baseline when Directus updates initialValues
watch(
  () => initialValues?.value,
  (newInitial) => {
    if (newInitial && !isSaving.value) {
      syncCurrentSnapshot();
      baselineJson.value = JSON.stringify(deepToRaw(newInitial));
    }
  },
  { deep: true },
);

// ── Capture baseline on mount ───────────────────────────────
onMounted(async () => {
  await nextTick();

  const captureBaseline = () => {
    syncCurrentSnapshot();
    baselineJson.value = JSON.stringify(currentSnapshot.value);
  };

  if (initialValues?.value) {
    baselineJson.value = JSON.stringify(deepToRaw(initialValues.value));
  }

  const stop = watch(
    values,
    () => {
      const count = Object.keys(deepToRaw(values) ?? {}).length;
      if (count >= 3) {
        captureBaseline();
        stop();
      }
    },
    { deep: true, immediate: true },
  );

  setTimeout(() => {
    if (baselineJson.value === null) captureBaseline();
  }, 1800);
});

// ── Trigger native Ctrl+S ───────────────────────────────────
async function triggerNativeSave() {
  document.body.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Control",
      code: "ControlLeft",
    }),
  );
  document.body.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      key: "s",
      code: "KeyS",
      ctrlKey: true,
    }),
  );
  document.body.dispatchEvent(
    new KeyboardEvent("keyup", {
      bubbles: true,
      key: "Control",
      code: "ControlLeft",
    }),
  );
  document.body.dispatchEvent(
    new KeyboardEvent("keyup", { bubbles: true, key: "s", code: "KeyS" }),
  );
}

// ── Dynamic payload template resolution ─────────────────────
// Supports {{primaryKey}}, {{collection}}, {{fields.FIELD_NAME}} in string values
function resolvePayload(obj, ctx) {
  const resolveValue = (val) => {
    if (typeof val === "string") {
      return val.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const k = key.trim();
        if (k === "primaryKey") return ctx.primaryKey ?? match;
        if (k === "collection") return ctx.collection ?? match;
        if (k.startsWith("fields.")) return ctx.fields?.[k.slice(7)] ?? match;
        return match;
      });
    }
    if (Array.isArray(val)) return val.map(resolveValue);
    if (val !== null && typeof val === "object")
      return Object.fromEntries(
        Object.entries(val).map(([k, v]) => [k, resolveValue(v)]),
      );
    return val;
  };
  return resolveValue(obj);
}

// ── Click handler ───────────────────────────────────────────
async function handleClick() {
  if (isLoading.value || isSaving.value) return;
  if (!props.alwaysEnabled && !isDirty.value) return;

  const needsSave = isDirty.value;

  if (needsSave) {
    isLoading.value = true;
    isSaving.value = true;

    try {
      // Snapshot initialValues before triggering save so we can detect the change
      const preInitialSnap = JSON.stringify(deepToRaw(initialValues?.value));

      await triggerNativeSave();

      // Wait for initialValues to change — Directus sets this after the save
      // API call returns with fresh server data. That is the reliable "save done" signal.
      await new Promise((resolve) => {
        let done = false;

        const finish = (newInitial) => {
          if (done) return;
          done = true;
          unwatch();
          clearTimeout(fallback);
          syncCurrentSnapshot();
          baselineJson.value = JSON.stringify(
            newInitial !== undefined
              ? deepToRaw(newInitial)
              : currentSnapshot.value,
          );
          resolve();
        };

        const unwatch = watch(
          () => initialValues?.value,
          (newInitial) => {
            if (JSON.stringify(deepToRaw(newInitial)) !== preInitialSnap) {
              finish(newInitial);
            }
          },
          { deep: true },
        );

        // Safety fallback — if initialValues never changes (same data saved)
        const fallback = setTimeout(() => finish(undefined), 6000);
      });
    } catch (err) {
      console.error("[save-and-stay-trigger-flow] Save error:", err);
    }

    isSaving.value = false;
    isLoading.value = false;
  }

  // Fire flow after save (or immediately when alwaysEnabled and nothing to save)
  if (props.flowId) {
    const urlParts = window.location.pathname.split("/");
    const autoItemId = props.primaryKey || urlParts[urlParts.length - 1];
    const autoCollection = props.collection || urlParts[urlParts.length - 2];

    const fields = deepToRaw(values) ?? {};
    const templateContext = {
      primaryKey: autoItemId,
      collection: autoCollection,
      fields,
    };

    const resolveStr = (str) =>
      str
        ? str.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const k = key.trim();
            if (k === "primaryKey") return templateContext.primaryKey ?? match;
            if (k === "collection") return templateContext.collection ?? match;
            if (k.startsWith("fields."))
              return templateContext.fields?.[k.slice(7)] ?? match;
            return match;
          })
        : str;

    const finalCollection = resolveStr(props.flowCollection) || autoCollection;
    const finalKey = resolveStr(props.flowKey) || autoItemId;

    const resolvedPayload =
      props.flowPayload && typeof props.flowPayload === "object"
        ? resolvePayload(props.flowPayload, templateContext)
        : {};

    const payload = {
      collection: finalCollection,
      keys: [finalKey],
      ...resolvedPayload,
    };

    api
      .post(`/flows/trigger/${props.flowId}`, payload)
      .catch((err) =>
        console.error("[save-and-stay-trigger-flow] Flow error:", err),
      );
  }
}
</script>

<style></style>
