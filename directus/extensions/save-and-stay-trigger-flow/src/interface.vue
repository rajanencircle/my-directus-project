<template>
  <div class="save-and-stay-trigger-flow-wrapper">
    <v-notice v-if="errorMessage" type="warning" class="save-and-stay-error">
      {{ errorMessage }}
    </v-notice>
    <form @submit.prevent="handleClick">
      <v-button
        type="submit"
        class="save-and-stay-trigger-flow-class"
        :class="classType"
        :loading="isLoading"
        :secondary="classType !== 'primary'"
        :icon="!label"
        :disabled="!canSave || isSaving"
      >
        <v-icon v-if="icon" left :name="icon" />
        <span v-if="label">{{ label }}</span>
      </v-button>
    </form>
  </div>
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
  onUnmounted,
  nextTick,
} from "vue";

const props = defineProps({
  label: { type: String, default: null },
  icon: { type: String, default: "save" },
  classType: { type: String, default: "primary" },
  primaryKey: { type: [String, Number], default: null },
  collection: { type: String, default: null },
  calculatorEnabled: { type: Boolean, default: false },
  settingsParentField: { type: String, default: "" },
  settingsLanguageField: { type: String, default: "translations_id" },
  percentageTypeField: { type: String, default: "surcharge_percentage_type" },
  marginField: { type: String, default: "surcharge_margin_percentage" },
  provisionField: { type: String, default: "surcharge_provision_percentage" },
  priceTableField: { type: String, default: "" },
  exchangeRateField: { type: String, default: "surcharge_exchange_rate" },
  ratesCollection: { type: String, default: "rates" },
  surchargesCollection: { type: String, default: "surcharges" },
  surchargesParentField: { type: String, default: "" },
  buyPriceField: { type: String, default: "buy_price" },
  translationsCollection: { type: String, default: "surcharges_translations" },
  translationsSurchargeField: { type: String, default: "surcharges_id" },
  translationsLanguageField: { type: String, default: "translations_id" },
  sellPriceField: { type: String, default: "sell_price" },
  roomPriceCalculatorEnabled: { type: Boolean, default: false },
  roomPriceTableField: { type: String, default: "" },
});

const api = useApi();

const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");

// Inject Directus form context
const values = inject("values", {});
const initialValues = inject("initialValues");

/*
 * Buy-price edits in a price-table/surcharge-prices grid on this same form
 * are written straight to those interfaces' own component state and
 * persisted via their own direct API calls — never through Directus's
 * `emit("input", ...)` field path, since the priced collection is separate
 * from the record this form edits. That means `values` below never changes
 * for a grid-only edit, so without this, `isDirty` alone would leave this
 * button disabled (and, if clicked via some other dirty field, would save
 * + calculate against whatever was last persisted — silently ignoring the
 * user's unsaved grid edits). Those interfaces broadcast their own dirty
 * state via these events so this button can factor them into `canSave`,
 * and respond to a `flush-request` by persisting themselves before this
 * button proceeds — see `handleClick`.
 */
const priceTableDirty = ref(false);
const surchargeTableDirty = ref(false);

const handlePriceTableDirty = (event) => {
  priceTableDirty.value = !!event.detail?.dirty;
};
const handleSurchargeTableDirty = (event) => {
  surchargeTableDirty.value = !!event.detail?.dirty;
};

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

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return true;
    }
    return a.some((item, i) => isDeeplyDifferent(item, b[i]));
  }

  // Compare the union of keys, not just a's — a strict key-COUNT check here
  // means a single extra/missing key on either side (e.g. a field present
  // in `values` but not yet in `initialValues`, or vice versa) makes this
  // permanently report "different" even when every shared field matches,
  // which would keep isDirty stuck true forever regardless of any save.
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (isDeeplyDifferent(a[key], b[key])) return true;
  }
  return false;
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

// Gates the button on this record's own (native) field edits only — a
// price/surcharge grid edit alone must not enable this button, since those
// grids already have their own dedicated Save & Calculate button for that.
// `priceTableDirty`/`surchargeTableDirty` are still tracked and still feed
// the flush handshake in `handleClick` below: if the admin changes a native
// field (enabling this button) while a grid also happens to be dirty, that
// grid's edits still get flushed before this button's own save + calculate
// runs, so they're never silently dropped or saved against stale data.
const canSave = computed(() => isDirty.value);

// Reset loading states when save completes and form is no longer dirty
watch(isDirty, (dirty) => {
  if (!dirty && isSaving.value) {
    isSaving.value = false;
    isLoading.value = false;
  }
});

// Sync baseline whenever Directus updates initialValues — this ref is
// Directus's own authoritative "last confirmed saved state", updated
// exactly when a save (ours, the native button's, or anyone else's)
// actually completes. This must NOT be gated by `!isSaving.value`: the
// isDirty watcher below is what turns isSaving off, and it can only do
// that once this watcher resets the baseline — gating on isSaving made
// the two watchers deadlock during our own save flow, which is why the
// button used to get stuck showing its loading spinner indefinitely.
watch(
  () => initialValues?.value,
  (newInitial) => {
    if (newInitial) {
      // Baseline must come from the SAME source as the snapshot (`values`),
      // not from `initialValues`'s own raw shape — those two can represent
      // an unchanged field differently (e.g. a relational field hydrated
      // differently), which falsely reads as "dirty" right after a real
      // save. `values` and `initialValues` are shared across every field on
      // this record's form (including sibling interfaces like the price
      // table), so re-deriving the snapshot from `initialValues` directly
      // is also unsafe: an unrelated background refetch elsewhere on the
      // same form can re-fire this watcher and clobber a genuinely
      // in-progress, unsaved edit sitting in `values` with the stale
      // pre-edit state. Re-reading `values` itself here avoids both bugs —
      // after a real save Directus resets `values` to match `initialValues`
      // anyway, and on an unrelated refetch `values` still reflects
      // whatever the user is actively editing.
      syncCurrentSnapshot();
      baselineJson.value = JSON.stringify(currentSnapshot.value);
    }
  },
  { deep: true },
);

const urlParts = window.location.pathname.split("/");
const effectiveCollection = computed(
  () => props.collection || urlParts[urlParts.length - 2],
);
const effectivePrimaryKey = computed(
  () => props.primaryKey || urlParts[urlParts.length - 1],
);

window.addEventListener("price-table:dirty-changed", handlePriceTableDirty);
window.addEventListener(
  "surcharge-table:dirty-changed",
  handleSurchargeTableDirty,
);
onUnmounted(() => {
  window.removeEventListener(
    "price-table:dirty-changed",
    handlePriceTableDirty,
  );
  window.removeEventListener(
    "surcharge-table:dirty-changed",
    handleSurchargeTableDirty,
  );
});

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

  // `immediate: true` runs this callback synchronously, inline within the
  // `watch()` call itself — if `values` already has >= 3 keys on that first
  // run, calling `stop()` here would reference `stop` before the assignment
  // below has completed, throwing "Cannot access 'stop' before
  // initialization". Deferring via `shouldStop` avoids that ordering trap.
  let stop = null;
  let shouldStop = false;

  stop = watch(
    values,
    () => {
      const count = Object.keys(deepToRaw(values) ?? {}).length;
      if (count >= 3) {
        captureBaseline();
        if (stop) {
          stop();
        } else {
          shouldStop = true;
        }
      }
    },
    { deep: true, immediate: true },
  );

  if (shouldStop) stop();

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

/*
 * Asks every sibling price/surcharge grid on this form to persist its own
 * unsaved edits (see `handleFlushRequest` in those interfaces), and waits
 * for each one that reported itself dirty to confirm it's done, before
 * this button's own native save + calculator run against fresh data.
 * `expectedSources` is read at click time — only grids that were actually
 * dirty are waited on, so a grid that never mounted (or has nothing to
 * flush) can't hang this indefinitely.
 *
 * Resolves with each source's full event `detail` (e.g.
 * `{ "price-table": { source: "price-table", freshRows: [...] }, ... }`),
 * not just an ack — `freshRows` is what lets the calculators below use the
 * buy prices each grid just confirmed persisting instead of re-fetching
 * (and potentially racing) that same write. A source that never responds
 * (timeout) simply has no entry, same as before.
 */
function requestGridFlush(expectedSources) {
  if (!expectedSources.length) return Promise.resolve({});
  return new Promise((resolve) => {
    const remaining = new Set(expectedSources);
    const collected = {};
    let timer = null;
    const onComplete = (event) => {
      const source = event.detail?.source;
      if (source) collected[source] = event.detail;
      remaining.delete(source);
      if (remaining.size === 0) cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("save-and-stay:flush-complete", onComplete);
      if (timer) clearTimeout(timer);
      resolve(collected);
    };
    window.addEventListener("save-and-stay:flush-complete", onComplete);
    // A grid that fails to respond (e.g. torn down mid-flush) must not hang
    // the button forever — proceed anyway after a generous timeout.
    timer = setTimeout(cleanup, 8000);
    window.dispatchEvent(new CustomEvent("save-and-stay:flush-request"));
  });
}

// ── Click handler ───────────────────────────────────────────
async function handleClick() {
  if (!canSave.value || isLoading.value || isSaving.value) return;

  errorMessage.value = "";
  isLoading.value = true;
  isSaving.value = true;

  // Populated by requestGridFlush() below with each dirty grid's freshly
  // persisted rows — read after the try block, once we know whether to run
  // the calculators at all.
  let flushResults = {};

  try {
    const dirtyGrids = [];
    if (priceTableDirty.value) dirtyGrids.push("price-table");
    if (surchargeTableDirty.value) dirtyGrids.push("surcharge-table");
    flushResults = await requestGridFlush(dirtyGrids);

    await triggerNativeSave();

    // `triggerNativeSave()` only dispatches a synthetic Ctrl+S — it has no
    // real promise tied to the save request — so we have to infer
    // completion from `values` settling. The `initialValues` watcher above
    // is the authoritative signal in principle, but in practice it can
    // arrive well after (or well before) `values` finishes settling, so
    // waiting on it alone left the button stuck enabled indefinitely on the
    // first click. So: use stabilization as the primary signal (as before),
    // but the race that caused the original bug was Directus's real save
    // response mutating `values` again *shortly after* we judged it
    // "stable" and locked in the baseline — so keep watching for a grace
    // window afterward and silently re-sync if that happens, instead of
    // leaving the stale baseline in place until the user clicks again.
    const finishedViaFallback = await new Promise((resolve) => {
      let settled = false;
      let lastJson = JSON.stringify(deepToRaw(values));
      let stableTicks = 0;
      let minChecks = 5; // Minimum checks before considering stable
      let pollTimer = null;
      let fallbackTimer = null;

      const syncBaseline = () => {
        syncCurrentSnapshot();
        baselineJson.value = JSON.stringify(currentSnapshot.value);
      };

      // After the initial "stable" verdict, keep re-syncing on any further
      // change for a bit — catches a late-arriving server response (e.g.
      // computed/updated_at fields) without needing a second click.
      const watchGraceWindow = (durationMs) => {
        const deadline = Date.now() + durationMs;
        let graceLastJson = JSON.stringify(deepToRaw(values));
        let graceDebounce = null;
        const stop = watch(
          values,
          () => {
            if (graceDebounce) clearTimeout(graceDebounce);
            graceDebounce = setTimeout(() => {
              const nowJson = JSON.stringify(deepToRaw(values));
              if (nowJson !== graceLastJson) {
                graceLastJson = nowJson;
                syncBaseline();
              }
            }, 150);
          },
          { deep: true },
        );
        setTimeout(() => {
          stop();
          if (graceDebounce) clearTimeout(graceDebounce);
        }, Math.max(0, deadline - Date.now()));
      };

      const finish = (viaFallback = false) => {
        if (settled) return;
        settled = true;
        if (pollTimer) clearTimeout(pollTimer);
        if (fallbackTimer) clearTimeout(fallbackTimer);
        syncBaseline();
        watchGraceWindow(1500);
        resolve(viaFallback);
      };

      const checkSaveComplete = () => {
        if (settled) return;
        const currentJson = JSON.stringify(deepToRaw(values));

        if (currentJson === lastJson) {
          stableTicks++;
          if (stableTicks >= minChecks) {
            finish();
            return;
          }
        } else {
          stableTicks = 0;
          lastJson = currentJson;
          minChecks = 3; // Fewer checks needed after change detected
        }

        pollTimer = setTimeout(checkSaveComplete, 100);
      };

      pollTimer = setTimeout(checkSaveComplete, 200);
      fallbackTimer = setTimeout(() => finish(true), 5000); // Safety fallback
    });

    if (finishedViaFallback) {
      // `values` never settled within the 5s window — the save may still be
      // in flight server-side. Proceeding straight into the calculators
      // risks them reading pre-save data, so give it one more short grace
      // period and tell the user recalculation might be running on stale
      // data if it turns out not to have been enough.
      console.warn(
        "[save-and-stay-trigger-flow] Save did not settle within 5s — waiting a bit longer before calculating.",
      );
      errorMessage.value =
        "Save is taking longer than expected — price recalculation may use the most recently saved data.";
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (err) {
    console.error("[save-and-stay-trigger-flow] Save error:", err);
    errorMessage.value = "Save failed — see the browser console for details.";
  }

  isSaving.value = false;
  isLoading.value = false;

  // Both calculators resolve the parent record the same way — do it once and
  // share the result, instead of each firing its own identical lookup.
  if (props.calculatorEnabled || props.roomPriceCalculatorEnabled) {
    const collection = effectiveCollection.value;
    const primaryKey = effectivePrimaryKey.value;
    const parentId = await resolveParentId(collection, primaryKey);

    if (parentId == null) {
      console.error(
        "[save-and-stay-trigger-flow] Skipping calculator call(s): parentId could not be resolved",
      );
      errorMessage.value =
        "Saved, but price recalculation was skipped — the parent record could not be resolved.";
      return;
    }

    if (props.calculatorEnabled) {
      triggerSurchargeCalculator(
        collection,
        parentId,
        flushResults?.["surcharge-table"]?.freshRows,
      );
    }
    if (props.roomPriceCalculatorEnabled) {
      triggerRoomPriceCalculator(
        collection,
        parentId,
        flushResults?.["price-table"]?.freshRows,
      );
    }
  }
}

// `collection`/`primaryKey` are usually scoped correctly by Directus to this
// field's own record, even when nested in a repeater/drawer — but right
// after a save they can transiently read back as "+" (unsaved placeholder)
// before settling. Fetching by them is the most accurate source when valid;
// if that lookup fails, fall back to a UUID/id in the browser URL — nested
// rows (translations repeaters, etc.) always render on the *parent's* own
// edit page, so the URL reliably names the parent even though this row has
// no route of its own.
//
// Deliberately NOT falling back to this row's own `values.id`: for a nested
// junction row (e.g. a hotels_translations_1 row), that id is the row's own
// primary key, not the parent's — using it silently sent the calculator a
// hotels_translations_1 row id where it expected a hotel id, producing a
// Postgres "invalid input syntax for type uuid" error deep in the settings
// query instead of a clear "could not resolve" message.
async function resolveParentId(collection, primaryKey) {
  let parentId = null;

  if (primaryKey && primaryKey !== "+") {
    try {
      const { data } = await api.get(`/items/${collection}/${primaryKey}`, {
        params: { fields: [props.settingsParentField] },
      });
      parentId =
        data?.data?.[props.settingsParentField]?.id ??
        data?.data?.[props.settingsParentField] ??
        null;
    } catch (err) {
      console.error(
        "[save-and-stay-trigger-flow] Could not resolve parentId from record:",
        err,
      );
    }
  }

  if (parentId == null) {
    // Parent id shape varies by collection: hotels use UUIDs, but
    // excursions/tours/etc. use plain integer ids — match either.
    const idMatch = window.location.pathname.match(
      /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+)(?:\/|$)/i,
    );
    if (idMatch) parentId = idMatch[1];
  }

  return parentId;
}

// ── Client-side calculators ────────────────────────────────
// The retired server endpoints (`/price-calculator/calculate`,
// `/surcharge-calculator/calculate`) were removed in the refactor that moved
// calculation into the interfaces themselves. The Save & Stay button now runs
// the same logic in the browser, mirroring the price-table and surcharge
// interfaces' own calculate implementations, then dispatches the same
// completion events the interfaces listen for.

// Room/trip prices are always saved to 2 decimal places — identical to the
// price-table interface's own `roundToPricePrecision` (`PRICE_PRECISION`
// in that extension's `priceTableCore.ts`), since this writes sell prices
// to the exact same translations collection that interface does.
function roundToPricePrecision(value) {
  if (value === null || value === undefined || value === "") return value;
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return Math.round(num * 100) / 100;
}

// Compiles the saved formula (roundHalf + calculateSellPrice) into callable
// functions — identical to the interfaces' `compileCalculator`.
function compileCalculatorClient(roundHalfCode, calcCode) {
  try {
    // eslint-disable-next-line no-new-func
    const factory = new Function(
      `${roundHalfCode}\n${calcCode}\nreturn { roundHalf, calculateSellPrice };`,
    );
    const { roundHalf, calculateSellPrice } = factory();
    if (
      typeof roundHalf !== "function" ||
      typeof calculateSellPrice !== "function"
    ) {
      return {
        error:
          "Formula must define exactly named functions roundHalf(val) and calculateSellPrice(buyPrice, settingsRow, priceRow, rateValue, occupancyValue).",
      };
    }
    return { calculateSellPrice };
  } catch (err) {
    return { error: `Failed to compile formula: ${err.message}` };
  }
}

// Surcharge calculation — mirrors the surcharge interface's `calculateAndSave`.
async function calculateSurchargesClient(body) {
  const compiled = compileCalculatorClient(
    body.roundHalfLogic,
    body.calculateSellPriceLogic,
  );
  if (compiled.error) throw new Error(compiled.error);
  const { calculateSellPrice } = compiled;

  const rawSettingsRows = await api
    .get(`/items/${body.settingsCollection}`, {
      params: {
        filter: { [body.settingsParentField]: { _eq: body.parentId } },
        fields: ["*"],
        limit: -1,
      },
    })
    .then((r) => r.data.data || []);

  const settingsRows = rawSettingsRows;

  const usedRateKeys = Array.from(
    new Set(
      settingsRows
        .map((s) => s[body.exchangeRateField]?.key)
        .filter((k) => !!k),
    ),
  );

  const [surcharges, rates, existingTranslations] = await Promise.all([
    api
      .get(`/items/${body.surchargesCollection}`, {
        params: {
          filter: { [body.surchargesParentField]: { _eq: body.parentId } },
          limit: -1,
        },
      })
      .then((r) => r.data.data || []),
    usedRateKeys.length
      ? api
          .get(`/items/${body.ratesCollection}`, {
            params: {
              filter: { id: { _in: usedRateKeys } },
              fields: ["id", "rate"],
              limit: -1,
            },
          })
          .then((r) => r.data.data || [])
      : Promise.resolve([]),
    api
      .get(`/items/${body.translationsCollection}`, {
        params: {
          filter: {
            [body.translationsSurchargeField]: {
              [body.surchargesParentField]: { _eq: body.parentId },
            },
          },
          limit: -1,
        },
      })
      .then((r) => r.data.data || []),
  ]);

  const rateById = new Map(rates.map((r) => [r.id, r]));
  const translationByKey = new Map(
    existingTranslations.map((t) => [
      `${t[body.translationsSurchargeField]}|${t[body.translationsLanguageField]}`,
      t,
    ]),
  );

  const translationUpdates = [];
  const translationCreates = [];
  let formulaErrorCount = 0;

  // The grid that just saved these surcharges already knows their correct
  // buy price — prefer that over what this function's own `surcharges` GET
  // above returned, since that GET can race the write that just persisted
  // it (and lose, reading a stale/empty value that would otherwise get
  // treated as a genuine 0 below). Rows not present here (not part of this
  // save) fall through to the fetched value exactly as before.
  const freshBuyById = new Map(
    (body.freshRows || [])
      .filter((r) => r && r.id != null && r[body.buyPriceField] !== undefined)
      .map((r) => [r.id, r[body.buyPriceField]]),
  );

  settingsRows.forEach((settingsRow) => {
    const langId = settingsRow[body.settingsLanguageField];
    if (!langId) return;

    const exchangeRateInfo = settingsRow[body.exchangeRateField];
    const rateRecord =
      exchangeRateInfo && exchangeRateInfo.key
        ? rateById.get(exchangeRateInfo.key)
        : undefined;
    if (!rateRecord) return;
    const rateValue = parseFloat(rateRecord.rate);

    surcharges.forEach((surcharge) => {
      let sellPrice = null;
      const buyRaw = freshBuyById.has(surcharge.id)
        ? freshBuyById.get(surcharge.id)
        : surcharge[body.buyPriceField];
      const buyIsZero =
        buyRaw === null || buyRaw === undefined || buyRaw === "" || Number(buyRaw) === 0;
      if (buyIsZero) {
        // Zero buy price never goes through the formula — sell is 0.
        sellPrice = 0;
      } else {
        try {
          const result = calculateSellPrice(
            buyRaw,
            settingsRow,
            surcharge,
            rateValue,
          );
          if (result === null || Number.isFinite(result)) {
            sellPrice = result;
          }
        } catch (calcErr) {
          console.error(
            "[save-and-stay-trigger-flow] Surcharge formula threw for",
            surcharge.id,
            calcErr,
          );
          formulaErrorCount += 1;
        }
      }

      const key = `${surcharge.id}|${langId}`;
      const existing = translationByKey.get(key);
      if (existing) {
        const current = existing[body.sellPriceField];
        const currentNum =
          current === null || current === undefined || current === ""
            ? null
            : Number(current);
        const unchanged =
          sellPrice === null || sellPrice === undefined
            ? currentNum === null
            : currentNum !== null && currentNum === sellPrice;
        if (!unchanged) {
          translationUpdates.push({
            id: existing.id,
            [body.sellPriceField]: sellPrice,
          });
        }
      } else {
        translationCreates.push({
          [body.translationsSurchargeField]: surcharge.id,
          [body.translationsLanguageField]: langId,
          [body.sellPriceField]: sellPrice,
        });
      }
    });
  });

  await Promise.all([
    translationUpdates.length
      ? api.patch(`/items/${body.translationsCollection}`, translationUpdates, {
          params: { fields: ["id"] },
        })
      : Promise.resolve(),
    translationCreates.length
      ? api.post(`/items/${body.translationsCollection}`, translationCreates, {
          params: { fields: ["id"] },
        })
      : Promise.resolve(),
  ]);

  if (formulaErrorCount > 0) {
    errorMessage.value = `Saved, but the surcharge formula threw an error for ${formulaErrorCount} row(s) — see the browser console for details.`;
  }
}

// Room price calculation — mirrors the price-table interface's
// `calculateSellPrices` (rates + occupancy-aware pricing loop).
async function calculateRoomPricesClient(body) {
  const compiled = compileCalculatorClient(
    body.roundHalfLogic,
    body.calculateSellPriceLogic,
  );
  if (compiled.error) throw new Error(compiled.error);
  const { calculateSellPrice } = compiled;

  const rawSettingsRows = await api
    .get(`/items/${body.settingsCollection}`, {
      params: {
        filter: { [body.settingsParentField]: { _eq: body.parentId } },
        fields: ["*"],
        limit: -1,
      },
    })
    .then((r) => r.data.data || []);

  const settingsRows = rawSettingsRows;

  const usedRateKeys = Array.from(
    new Set(
      settingsRows
        .map((s) => s[body.exchangeRateField]?.key)
        .filter((k) => !!k),
    ),
  );

  const [rates, priceRows, occupancyJunctionRows, existingTranslations] =
    await Promise.all([
      usedRateKeys.length
        ? api
            .get(`/items/${body.ratesCollection}`, {
              params: {
                filter: { id: { _in: usedRateKeys } },
                fields: ["id", "rate"],
                limit: -1,
              },
            })
            .then((r) => r.data.data || [])
        : Promise.resolve([]),
      api
        .get(`/items/${body.pricesCollection}`, {
          params: {
            filter: { [body.pricesParentField]: { _eq: body.parentId } },
            limit: -1,
          },
        })
        .then((r) => r.data.data || []),
      api
        .get(`/items/${body.occupancyJunctionCollection}`, {
          params: {
            filter: {
              [body.occupancyJunctionParentField]: { _eq: body.parentId },
            },
            fields: [
              "id",
              // `occupancyJunctionRelatedField` is optional — some junction
              // rows (e.g. `vehicles_rental_periods`) carry their value
              // directly with no separate related item to hop through,
              // unlike hotels/tours/cruises/excursions. Mirrors the
              // price-table interface's own `nestedOrOwn`.
              body.occupancyJunctionRelatedField
                ? `${body.occupancyJunctionRelatedField}.${body.occupancyValueField}`
                : body.occupancyValueField,
            ],
            limit: -1,
          },
        })
        .then((r) => r.data.data || []),
      api
        .get(`/items/${body.translationsCollection}`, {
          params: {
            filter: {
              [body.translationsPriceField]: {
                [body.pricesParentField]: { _eq: body.parentId },
              },
            },
            limit: -1,
          },
        })
        .then((r) => r.data.data || []),
    ]);

  const occupancyValueMap = new Map();
  const getNestedValue = (obj, path) => {
    if (obj == null || typeof obj !== "object") return undefined;
    return String(path)
      .split(".")
      .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  };
  // Normalizes a value into a stable Map key exactly like the price-table
  // interface's own `lookupKey` — `null`/`undefined` collapse to `""`
  // rather than the strings `"null"`/`"undefined"` a bare `String()` would
  // produce, keeping this map's keys built (below) and read (in the
  // pricing loop) the same way.
  const lookupKey = (value) =>
    value === null || value === undefined ? "" : String(value);
  occupancyJunctionRows.forEach((occ) => {
    const related = body.occupancyJunctionRelatedField
      ? occ[body.occupancyJunctionRelatedField]
      : occ;
    const value =
      related && typeof related === "object"
        ? related[body.occupancyValueField]
        : undefined;
    /*
     * Key the map by the *normalized* occupancy id — the same value the
     * grid columns are keyed by (`occupancyIdField` applied to the junction
     * row) — NOT the raw junction-row primary key. These differ when the
     * price record's column field references the original occupancy record
     * instead of the junction row (tours: `occupancyIdField =
     * "tours_occupancies_id.id"`), and keying by the wrong one would make
     * every lookup miss and silently default the occupancy value to 1.
     * Mirrors the price-table interface's own `calculateSellPrices`.
     */
    const occId = getNestedValue(occ, body.occupancyIdField);
    if (occId !== undefined && occId !== null) {
      occupancyValueMap.set(lookupKey(occId), value ?? 1);
    }
  });

  const rateById = new Map(rates.map((r) => [r.id, r]));
  const translationByKey = new Map(
    existingTranslations.map((t) => [
      `${t[body.translationsPriceField]}|${t[body.translationsLanguageField]}`,
      t,
    ]),
  );

  const translationUpdates = [];
  const translationCreates = [];
  let formulaErrorCount = 0;

  // The grid that just saved these room prices already knows their correct
  // buy price — prefer that over what this function's own `priceRows` GET
  // above returned, since that GET can race the write that just persisted
  // it (and lose, reading a stale/empty value that would otherwise get
  // treated as a genuine 0 below). Rows not present here (not part of this
  // save) fall through to the fetched value exactly as before.
  const freshBuyById = new Map(
    (body.freshRows || [])
      .filter((r) => r && r.id != null && r[body.buyPriceField] !== undefined)
      .map((r) => [r.id, r[body.buyPriceField]]),
  );

  settingsRows.forEach((settingsRow) => {
    const langId = settingsRow[body.settingsLanguageField];
    if (!langId) return;
    if (
      settingsRow[body.buyPriceTypeField] == null ||
      settingsRow[body.sellPriceTypeField] == null ||
      settingsRow[body.percentageTypeField] == null ||
      settingsRow[body.marginField] == null ||
      settingsRow[body.exchangeRateField] == null
    ) {
      return;
    }

    const exchangeRateInfo = settingsRow[body.exchangeRateField];
    const rateRecord =
      exchangeRateInfo && exchangeRateInfo.key
        ? rateById.get(exchangeRateInfo.key)
        : undefined;
    if (!rateRecord) return;
    const rateValue = parseFloat(rateRecord.rate);

    priceRows.forEach((priceRow) => {
      const occupancyValue =
        occupancyValueMap.get(lookupKey(priceRow[body.occupancyField])) ?? 1;

      let sellPrice = null;
      const buyRaw = freshBuyById.has(priceRow.id)
        ? freshBuyById.get(priceRow.id)
        : priceRow[body.buyPriceField];
      const buyIsZero =
        buyRaw === null || buyRaw === undefined || buyRaw === "" || Number(buyRaw) === 0;
      if (buyIsZero) {
        // Zero buy price never goes through the formula — sell is 0.
        sellPrice = 0;
      } else {
        try {
          const result = calculateSellPrice(
            buyRaw,
            settingsRow,
            priceRow,
            rateValue,
            occupancyValue,
          );
          if (result === null || Number.isFinite(result)) {
            sellPrice = result;
          }
        } catch (calcErr) {
          console.error(
            "[save-and-stay-trigger-flow] Room price formula threw for",
            priceRow.id,
            calcErr,
          );
          formulaErrorCount += 1;
        }
      }
      // Prices are always saved to 2 decimal places — matches the
      // price-table interface's own `roundToPricePrecision`, since this
      // writes sell prices to the exact same translations collection.
      sellPrice = roundToPricePrecision(sellPrice);

      const key = `${priceRow.id}|${langId}`;
      const existing = translationByKey.get(key);
      if (existing) {
        const current = existing[body.sellPriceField];
        const currentNum =
          current === null || current === undefined || current === ""
            ? null
            : Number(current);
        const unchanged =
          sellPrice === null || sellPrice === undefined
            ? currentNum === null
            : currentNum !== null && currentNum === sellPrice;
        if (!unchanged) {
          translationUpdates.push({
            id: existing.id,
            [body.sellPriceField]: sellPrice,
          });
        }
      } else {
        translationCreates.push({
          [body.translationsPriceField]: priceRow.id,
          [body.translationsLanguageField]: langId,
          [body.sellPriceField]: sellPrice,
        });
      }
    });
  });

  await Promise.all([
    translationUpdates.length
      ? api.patch(`/items/${body.translationsCollection}`, translationUpdates, {
          params: { fields: ["id"] },
        })
      : Promise.resolve(),
    translationCreates.length
      ? api.post(`/items/${body.translationsCollection}`, translationCreates, {
          params: { fields: ["id"] },
        })
      : Promise.resolve(),
    api.patch(
      `/items/${body.parentCollection}/${body.parentId}`,
      {
        [body.sellStatusField]: "done",
        [body.sellUpdatedAtField]: new Date().toISOString(),
      },
      { params: { fields: ["id"] } },
    ),
  ]);

  if (formulaErrorCount > 0) {
    errorMessage.value = `Saved, but the room price formula threw an error for ${formulaErrorCount} row(s) — see the browser console for details.`;
  }
}

// Fire surcharge calculator in background (non-blocking). The formula is
// configured once, on the price table field's own options (`priceTableField`,
// default "rate_table") — read it from there instead of keeping a separate
// copy on this button's own config, so there's exactly one place to
// check/update per collection.
async function triggerSurchargeCalculator(collection, parentId, freshRows) {
  let roundHalfLogic = null;
  let calculateSellPriceLogic = null;
  try {
    const { data } = await api.get(
      `/fields/${collection}/${props.priceTableField}`,
    );
    const options = data?.data?.meta?.options ?? {};
    roundHalfLogic = options.roundHalfLogic ?? null;
    calculateSellPriceLogic = options.calculateSellPriceLogic ?? null;
  } catch (err) {
    console.error(
      "[save-and-stay-trigger-flow] Could not load formula from price table field:",
      err,
    );
  }

  if (!roundHalfLogic || !calculateSellPriceLogic) {
    console.error(
      `[save-and-stay-trigger-flow] Skipping surcharge calculator call: no formula configured on ${collection}.${props.priceTableField}`,
    );
    errorMessage.value =
      "Saved, but surcharge price recalculation was skipped — no formula is configured.";
    return;
  }

  const body = {
    parentId,
    settingsCollection: collection,
    settingsParentField: props.settingsParentField,
    settingsLanguageField: props.settingsLanguageField,
    percentageTypeField: props.percentageTypeField,
    marginField: props.marginField,
    provisionField: props.provisionField,
    exchangeRateField: props.exchangeRateField,
    ratesCollection: props.ratesCollection,
    surchargesCollection: props.surchargesCollection,
    surchargesParentField: props.surchargesParentField,
    buyPriceField: props.buyPriceField,
    translationsCollection: props.translationsCollection,
    translationsSurchargeField: props.translationsSurchargeField,
    translationsLanguageField: props.translationsLanguageField,
    sellPriceField: props.sellPriceField,
    roundHalfLogic,
    calculateSellPriceLogic,
    freshRows,
  };

  try {
    await calculateSurchargesClient(body);
    window.dispatchEvent(
      new CustomEvent("surcharge-calculator:calculated", {
        detail: { parentId },
      }),
    );
  } catch (err) {
    console.error("[save-and-stay-trigger-flow] Surcharge calculator error:", err);
    errorMessage.value = `Saved, but surcharge price recalculation failed: ${err?.message || "see the browser console for details."}`;
  }
}

// Fire room price calculator in background (non-blocking). Every field name
// the endpoint needs is read from the room-prices-table interface's own
// saved options (`roomPriceTableField`, default "room_prices") — the single
// source of truth already used by that interface's own calculate button —
// instead of duplicating 20+ field-name options on this button too.
// Maps the calculate endpoint's body key to the option key it's read from
// on the room-prices-table field's own saved config. `parentKeyField` is
// checked ahead of `junctionParentKeyField` (see resolveSettingsParentField
// below) since that's the one actually populated for junction placements.
const ROOM_PRICE_OPTION_MAP = {
  settingsLanguageField: "junctionLanguageField",
  buyPriceTypeField: "buyPriceTypeField",
  sellPriceTypeField: "sellPriceTypeField",
  percentageTypeField: "percentageTypeField",
  marginField: "marginField",
  provisionField: "provisionField",
  exchangeRateField: "junctionExchangeRateField",
  ratesCollection: "ratesCollection",
  pricesCollection: "relatedCollection",
  pricesParentField: "foreignKeyField",
  buyPriceField: "buyPriceField",
  occupancyField: "columnField",
  occupancyJunctionCollection: "occupancyJunctionCollection",
  occupancyJunctionParentField: "occupancyJunctionParentField",
  occupancyJunctionRelatedField: "occupancyJunctionRelatedField",
  occupancyIdField: "occupancyIdField",
  occupancyValueField: "occupancyValueField",
  translationsCollection: "translationsCollection",
  translationsPriceField: "translationsFKField",
  translationsLanguageField: "translationsLanguageField",
  sellPriceField: "sellPriceField",
  parentCollection: "parentCollection",
  sellStatusField: "sellStatusField",
  sellUpdatedAtField: "sellUpdatedAtField",
};

async function triggerRoomPriceCalculator(collection, parentId, freshRows) {
  if (!props.roomPriceTableField) {
    console.error(
      "[save-and-stay-trigger-flow] Skipping room price calculator call: 'Price Table Field Name' is not configured on this button.",
    );
    errorMessage.value =
      "Saved, but room price recalculation was skipped — 'Price Table Field Name' isn't configured on this button.";
    return;
  }

  let options = {};
  try {
    const { data } = await api.get(
      `/fields/${collection}/${props.roomPriceTableField}`,
    );
    options = data?.data?.meta?.options ?? {};
  } catch (err) {
    console.error(
      "[save-and-stay-trigger-flow] Could not load config from room price table field:",
      err,
    );
    errorMessage.value =
      "Saved, but room price recalculation was skipped — couldn't load the price table field's configuration.";
    return;
  }

  // Every field name below comes from the room-prices-table field's own
  // saved config — nothing is assumed about which collection this is
  // (hotels, cruises, ...). If something is missing, that field genuinely
  // hasn't been configured on ${collection}.${props.roomPriceTableField} and
  // this fails loudly instead of silently guessing a wrong field name.
  const body = { parentId, settingsCollection: options.junctionCollection, freshRows };
  const missing = [];

  if (!body.settingsCollection) missing.push("Junction Collection");

  body.settingsParentField =
    options.parentKeyField || options.junctionParentKeyField;
  if (!body.settingsParentField) missing.push("Parent Key Field");

  // `occupancyJunctionRelatedField` is optional — some junction rows (e.g.
  // `vehicles_rental_periods`) carry their value directly with no separate
  // related item to hop through, unlike hotels/tours/cruises/excursions.
  // Mirrors the price-table interface's own required-fields list.
  const OPTIONAL_OPTION_KEYS = new Set(["occupancyJunctionRelatedField"]);
  for (const [bodyKey, optionKey] of Object.entries(ROOM_PRICE_OPTION_MAP)) {
    const value = options[optionKey];
    if (value == null || value === "") {
      if (!OPTIONAL_OPTION_KEYS.has(optionKey)) missing.push(optionKey);
    } else {
      body[bodyKey] = value;
    }
  }

  body.roundHalfLogic = options.roundHalfLogic;
  body.calculateSellPriceLogic = options.calculateSellPriceLogic;
  if (!body.roundHalfLogic) missing.push("roundHalfLogic");
  if (!body.calculateSellPriceLogic) missing.push("calculateSellPriceLogic");

  if (missing.length) {
    console.error(
      `[save-and-stay-trigger-flow] Skipping room price calculator call: not configured on ${collection}.${props.roomPriceTableField}: ${missing.join(", ")}`,
    );
    errorMessage.value =
      "Saved, but room price recalculation was skipped — the price table field isn't fully configured.";
    return;
  }

  try {
    await calculateRoomPricesClient(body);
    window.dispatchEvent(
      new CustomEvent("price-calculator:calculated", {
        detail: { parentId },
      }),
    );
  } catch (err) {
    console.error(
      "[save-and-stay-trigger-flow] Room price calculator error:",
      err,
    );
    errorMessage.value = `Saved, but room price recalculation failed: ${err?.message || "see the browser console for details."}`;
  }
}
</script>

<style>
/*.save-and-stay-trigger-flow-class > .button:disabled {
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

.save-and-stay-trigger-flow-class > .button:not(:disabled):hover {
  background-color: var(--theme--primary) !important;
  color: #ffffff !important;
  border: none !important;
  opacity: 1 !important;
  cursor: pointer !important;
}*/

.save-and-stay-error {
  margin-bottom: 0.5rem;
}
</style>
