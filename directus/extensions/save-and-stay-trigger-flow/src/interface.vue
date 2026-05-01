<template>
  <form @submit.prevent="handleClick">
    <v-button
      type="submit"
      :class="['save-and-stay-trigger-flow-class', 'action', classType]"
      :loading="isLoading"
      :secondary="classType !== 'primary'"
      :icon="!label"
      :disabled="isLoading || !isDirty"
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
  primaryKey: { type: [String, Number], default: null },
  collection: { type: String, default: null },
});

const api = useApi();
const isLoading = ref(false);

// ── Inject Vue form context (same reactive tree as the Directus form) ─────────
const values = inject("values", {});
const initialValues = inject("initialValues");

// ── Safely unwrap Vue reactive proxies to plain objects ───────────────────────
function deepToRaw(raw, visited = new WeakMap()) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || raw instanceof Date) return raw;
  if (visited.has(raw)) return visited.get(raw);

  const val = toRaw(unref(raw));
  if (val === null || val === undefined) return null;
  if (typeof val !== "object") return val;

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

// ── Deep comparison (avoids JSON.stringify edge cases) ────────────────────────
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

// ── Reactive dirty tracking ───────────────────────────────────────────────────
const baselineJson = ref(null);
const currentSnapshot = ref({});

const syncCurrentSnapshot = () => {
  currentSnapshot.value = deepToRaw(values) ?? {};
};

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

// When Directus updates initialValues after a native save, re-sync our baseline
// so isDirty resets to false (which also signals waitForSaveComplete to resolve)
watch(
  () => initialValues?.value,
  (newInitial) => {
    if (newInitial) {
      baselineJson.value = JSON.stringify(deepToRaw(newInitial));
    }
  },
  { deep: true },
);

onMounted(async () => {
  await nextTick();

  const captureBaseline = () => {
    syncCurrentSnapshot();
    baselineJson.value = JSON.stringify(currentSnapshot.value);
  };

  // Prefer initialValues if already available (existing items)
  if (initialValues?.value) {
    baselineJson.value = JSON.stringify(deepToRaw(initialValues.value));
  }

  // Wait until form values are loaded, then lock in the baseline
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

  // Fallback: capture baseline after a delay if the watcher didn't fire
  setTimeout(() => {
    if (baselineJson.value === null) captureBaseline();
  }, 1800);
});

// ── Native Ctrl+S save ────────────────────────────────────────────────────────
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

// ── Wait for native save to complete ─────────────────────────────────────────
// Directus updates initialValues after save → our watcher sets baselineJson
// → isDirty recomputes to false → we know save is done
async function waitForSaveComplete() {
  if (!isDirty.value) return;
  return new Promise((resolve) => {
    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    const unwatch = watch(isDirty, (dirty) => {
      if (!dirty) {
        unwatch();
        done(); // Removed 200ms delay
      }
    });

    // // Fallback: resolve after 10s regardless
    // setTimeout(() => {
    //   unwatch();
    //   done();
    // }, 10000);
  });
}

// ── Click handler ─────────────────────────────────────────────────────────────
async function handleClick() {
  if (!isDirty.value || isLoading.value) return;
  isLoading.value = true;

  try {
    console.log(1);
    // 1. Trigger native Ctrl+S save and wait for it to complete
    await triggerNativeSave();
    console.log(2);

    // Force a snapshot sync to ensure isDirty is checking current state
    syncCurrentSnapshot();
    console.log(3);

    // await waitForSaveComplete();
  } catch (err) {
    console.error("[save-and-stay-trigger-flow] Save error:", err);
  } finally {
    console.log(4);

    // Stop loader as soon as save is done — flow runs in background
    isLoading.value = false;
    isDirty.value = false;
  }

  // 2. Fire flow in background if configured (does not block the loader)
  if (props.flowId) {
    const urlParts = window.location.pathname.split("/");
    const itemId = props.primaryKey || urlParts[urlParts.length - 1];
    const collection = props.collection || urlParts[urlParts.length - 2];

    api
      .post(`/flows/trigger/${props.flowId}`, {
        collection,
        keys: [itemId],
      })
      .catch((err) =>
        console.error("[save-and-stay-trigger-flow] Flow error:", err),
      );
  }
}
</script>
<style>
.save-and-stay-trigger-flow-class > .button:disabled {
  background-color: var(
    --v-button-background-color,
    var(--theme--primary)
  ) !important;
  color: #6b7280 !important;
  border: none !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}

.save-and-stay-trigger-flow-class > .button:not(:disabled) {
  background-color: #07a4de !important;
  color: #ffffff !important;
  border: none !important;
  opacity: 1 !important;
  cursor: pointer !important;
}
</style>
