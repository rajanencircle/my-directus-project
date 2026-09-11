<template>
  <div class="surcharge-prices-table">
    <div v-if="loading" class="loading">
      <v-progress-circular indeterminate />
      <p class="loading-text">
        {{ loadingText }}
      </p>
    </div>

    <div v-else>
      <v-notice type="danger" v-if="errorMessage" class="error-notice">
        {{ errorMessage }}
      </v-notice>

      <!-- Save Bar Top -->
      <div class="save-bar button-top" v-if="placement === 'top'">
        <v-button
          @click="calculateAndSave"
          :loading="calculating"
          :disabled="disabled || !parentId || !hasBuyChanges"
        >
          {{ label }}
        </v-button>
      </div>

      <!-- Table -->
      <div v-if="items.length > 0" class="table-wrapper">
        <table class="prices-table">
          <colgroup>
            <col class="col-name" />
            <col class="col-label" />
            <col class="col-price" />
          </colgroup>
          <thead>
            <tr>
              <th class="header-cell header-name sticky-col" colspan="2">
                {{ headerSurchargeLabel }}
              </th>
              <th class="header-cell header-pricing">
                {{ headerPricingLabel }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" class="data-row">
              <td class="name-cell sticky-col">
                <span class="item-name">{{ item[surchargeNameField || ''] }}</span>
              </td>
              <td class="label-cell">
                <div class="price-labels">
                  <label class="input-label buy-label">
                    <v-icon name="shopping_cart" x-small />
                    {{ buyLabel }} ({{ buyCurrencySymbol }})
                  </label>
                  <label class="input-label sell-label">
                    <v-icon name="sell" x-small />
                    {{ sellLabel }} ({{ sellCurrencySymbol }})
                  </label>
                </div>
              </td>
              <td class="price-cell" :class="{ 'has-changes': item._buyDirty }">
                <div class="price-inputs">
                  <input
                    :value="getBuyDisplay(item)"
                    type="number"
                    step="0.01"
                    class="cell-input"
                    :disabled="disabled"
                    @input="(markBuyCellTyped(item), handleBuyPriceInput(item, $event))"
                    @focus="($event.target as HTMLInputElement).select()"
                  />
                  <span class="price-display">
                    {{ formatValue(item[sellPriceField || '']) }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state-card">
        <v-icon name="inbox" large class="empty-icon" />
        <p class="empty-title">
          {{ emptyStateTitle }}
        </p>
        <p class="empty-hint">
          {{ emptyStateHint }}
        </p>
      </div>

      <!-- Save Bar Bottom -->
      <div class="save-bar button-bottom" v-if="placement === 'bottom'">
        <v-button
          @click="calculateAndSave"
          :loading="calculating"
          :disabled="disabled || !parentId || !hasBuyChanges"
        >
          {{ label }}
        </v-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted, onUnmounted, watch } from "vue";
import { useApi } from "@directus/extensions-sdk";
import { useSurchargeData } from "./composables/useSurchargeData";
import type { DirectusItem } from "./types";

/**
 * Vue component for the Surcharge Prices Table interface.
 *
 * Displays every surcharge linked to the current parent record as a row with an
 * editable buy price and a read-only sell price. The "Save & Calculate" button
 * persists any buy-price edits and then runs an admin-authored formula for every
 * language configuration (each with its own margin and exchange rate) to
 * recompute the sell prices.
 *
 * The data/API work lives in the `useSurchargeData` composable; this component
 * owns the state, the input handling, and the lifecycle wiring. Registered as
 * the "Surcharge Prices Table" interface's component (see `index.js`).
 */
export default defineComponent({
  /*
   * No field-name, collection-name, or cosmetic prop below carries a
   * default value. An unconfigured prop is simply absent/empty, so a
   * misconfiguration surfaces as a visibly missing value instead of a
   * silent, wrong guess (e.g. assuming a "name" field or a "€" symbol) —
   * identical to the rationale at the top of the price-table interface's
   * `interface.vue`.
   */
  props: {
    value: { type: Array, default: () => [] },
    primaryKey: { type: [String, Number], default: null },
    collection: { type: String, required: true },
    field: { type: String, required: true },
    disabled: { type: Boolean },
    values: { type: Object, default: () => ({}) },
    sortField: { type: String },
    percentageTypeField: { type: String },
    marginField: { type: String },
    provisionField: { type: String },
    roundHalfLogic: { type: String },
    calculateSellPriceLogic: { type: String },
    surchargesCollection: { type: String },
    translationsCollection: { type: String },
    ratesCollection: { type: String },
    parentField: { type: String },
    buyPriceField: { type: String },
    sellPriceField: { type: String },
    exchangeRateField: { type: String },
    junctionParentField: { type: String },
    junctionLanguageField: { type: String },
    surchargeNameField: { type: String },
    translationsSurchargeField: { type: String },
    translationsLanguageField: { type: String },
    fromCurrencyField: { type: String },
    toCurrencyField: { type: String },
    currencySymbolField: { type: String },
    type: { type: String, default: null },
    relation: { type: Object, default: null },
    fieldData: { type: Object, default: null },
    placement: { type: String },
    label: { type: String },
    loadingText: { type: String },
    headerSurchargeLabel: { type: String },
    headerPricingLabel: { type: String },
    buyLabel: { type: String },
    sellLabel: { type: String },
    emptyStateTitle: { type: String },
    emptyStateHint: { type: String },
  },

  emits: ["input"],

  setup(props) {
    const api = useApi();

    const loading = ref(false);
    const calculating = ref(false);
    const errorMessage = ref("");
    const items = ref<DirectusItem[]>([]);
    const originalItems = ref<DirectusItem[]>([]);
    const hasBuyChanges = ref(false);
    const parentId = ref<string | null>(null);
    const languageId = ref<string | null>(null);
    const buyCurrencySymbol = ref("");
    const sellCurrencySymbol = ref("");
    /*
     * The parent id `loadData` last successfully loaded surcharges for —
     * used solely to tell "this record's surcharges changed since last
     * load" apart from "we just switched to a different record entirely".
     * Diffing against a previous load only makes sense in the former case;
     * in the latter, every one of the previous record's surcharges would
     * otherwise look "removed" and their translations would be wrongly
     * cascade-deleted.
     */
    const lastLoadedParentId = ref<string | null>(null);
    const {
      resolveContext,
      fetchCurrencySymbols,
      loadData,
      saveChanges,
      calculateAndSave: calculateAndSaveInternal,
    } = useSurchargeData({
      props,
      api,
      parentId,
      languageId,
      items,
      originalItems,
      hasBuyChanges,
      buyCurrencySymbol,
      sellCurrencySymbol,
      lastLoadedParentId,
      loading,
      calculating,
      errorMessage,
    });

    // An explicit 0 (not null/empty) is treated as unset in the UI — show
    // nothing rather than a literal 0.00, independently for buy and sell.
    const isZero = (value: unknown) =>
      value !== null && value !== undefined && value !== "" && Number(value) === 0;

    // Rows the user has actually typed a buy price into since the last
    // save, tracked explicitly (not inferred by comparing values) so
    // there's no ambiguity from type mismatches or reactivity timing — this
    // is the single source of truth for "is this 0 a live edit or a saved
    // value". Rows are mutated in place, so tracking by object reference is
    // stable; the set is cleared wholesale once a save actually completes
    // (see `calculateAndSave` below).
    const editedBuyItems = reactive(new Set<DirectusItem>());
    const markBuyCellTyped = (item: DirectusItem) => {
      editedBuyItems.add(item);
    };

    // A 0 is only ever blanked once it's the value actually saved in the
    // database — a 0 the user just typed and hasn't saved yet is shown
    // plainly, exactly as typed, until Save and Stay commits it, at which
    // point it blanks out like any other saved 0.
    const getBuyDisplay = (item: DirectusItem) => {
      const buy = item[props.buyPriceField as string];
      if (!isZero(buy)) return buy;
      return editedBuyItems.has(item) ? buy : "";
    };

    // Wraps the composable's own calculate-and-save so a successful save
    // also clears every row's "user just typed this" flag — from that
    // point on, a 0 in any of those rows reflects what's actually in the
    // database again, so the normal blank-if-zero display takes back over.
    const calculateAndSave = async () => {
      await calculateAndSaveInternal();
      editedBuyItems.clear();
    };

    // Renders the (read-only) sell price, always to two decimals; blank when
    // the value is zero or missing.
    const formatValue = (v: unknown) => {
      if (isZero(v)) return "";
      if (v === null || v === undefined || v === "") return "";
      return Number(v).toFixed(2);
    };

    // Writes a buy-price keystroke straight into the row object (in place, so
    // the table re-renders reactively), updates the per-row dirty flags
    // against the last-saved `originalItems`, and refreshes the save-button
    // state. Empty input is stored as `null`.
    const handleBuyPriceInput = (item: DirectusItem, event: Event) => {
      const value = (event.target as HTMLInputElement).value;
      item[props.buyPriceField as string] = value === "" ? null : Number(value);
      const orig = originalItems.value.find((o: DirectusItem) => o.id === item.id);
      if (orig) {
        item._buyDirty =
          item[props.buyPriceField as string] !== orig[props.buyPriceField as string];
        item._dirty =
          item._buyDirty ||
          item[props.sellPriceField as string] !== orig[props.sellPriceField as string];
      }
      hasBuyChanges.value = items.value.some((i) => i._buyDirty);
    };

    // Completion signal from an external caller (e.g. a Save & Stay flow
    // that re-ran the surcharge calculator) for THIS parent — reload the
    // surcharges so the table reflects the freshly computed prices.
    const handleExternalCalculation = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.parentId && String(detail.parentId) === String(parentId.value)) {
        loadData();
      }
    };

    /*
     * Buy-price edits here are written straight into `items.value` and
     * persisted via this component's own direct API calls (`saveChanges`),
     * never through Directus's `emit("input", ...)` field path — same
     * reasoning as the price-table interface. Broadcasting `hasBuyChanges`
     * and responding to `flush-request` is what lets a standalone Save &
     * Stay button (whose own dirty-tracking only sees the record's
     * `values`) both enable itself for a surcharge-only edit and persist
     * this table before it saves + calculates.
     */
    watch(hasBuyChanges, (dirty) => {
      window.dispatchEvent(
        new CustomEvent("surcharge-table:dirty-changed", { detail: { dirty } }),
      );
    });

    const handleFlushRequest = async () => {
      // `freshRows` carries the buy price this call just confirmed
      // persisting for each dirty row — passed along so the Save & Stay
      // button's sell-price calculator can use it directly instead of
      // re-fetching (and possibly racing) this same write. Empty when
      // there was nothing to persist.
      let freshRows: unknown[] = [];
      try {
        if (hasBuyChanges.value) {
          freshRows = await saveChanges();
          // `saveChanges` only PATCHes — it doesn't reset the per-row dirty
          // flags or `hasBuyChanges` itself, so reload to resync local state
          // with what was just persisted (same as a normal record switch).
          await loadData();
        }
      } finally {
        window.dispatchEvent(
          new CustomEvent("save-and-stay:flush-complete", {
            detail: { source: "surcharge-table", freshRows },
          }),
        );
      }
    };

    // Initial load: resolve the context, load the surcharges, then listen for
    // external surcharge-calculation completions.
    onMounted(async () => {
      await resolveContext();
      await loadData();
      window.addEventListener(
        "surcharge-calculator:calculated",
        handleExternalCalculation,
      );
      window.addEventListener("save-and-stay:flush-request", handleFlushRequest);
    });

    onUnmounted(() => {
      // Remove the completion-signal listener so nothing outlives the
      // component instance.
      window.removeEventListener(
        "surcharge-calculator:calculated",
        handleExternalCalculation,
      );
      window.removeEventListener("save-and-stay:flush-request", handleFlushRequest);
      // The Save & Stay button may still be mounted after this table is
      // torn down — don't leave it believing this table still has edits.
      window.dispatchEvent(
        new CustomEvent("surcharge-table:dirty-changed", { detail: { dirty: false } }),
      );
    });

    // Reload when the context changes: either the primary key just arrived
    // (a new junction record was created) or the resolved parent/language
    // changed under us (e.g. the parent FK in `values` was set elsewhere).
    // `loadData`'s own `lastLoadedParentId` guard then decides whether the
    // orphan-translation cleanup should run (same record) or not (switch).
    watch(
      () =>
        [props.values, props.primaryKey] as [object, string | number | null],
      async (
        [, newPK]: [object, string | number | null],
        [, oldPK]: [object, string | number | null],
      ) => {
        const oldParentId = parentId.value;
        const oldLang = languageId.value;
        await resolveContext();
        const pkJustArrived =
          newPK && newPK !== "+" && (!oldPK || oldPK === "+");
        const contextChanged =
          parentId.value !== oldParentId || languageId.value !== oldLang;
        if (pkJustArrived || contextChanged) await loadData();
      },
      { deep: true },
    );

    return {
      loading,
      calculating,
      errorMessage,
      items,
      hasBuyChanges,
      parentId,
      buyCurrencySymbol,
      sellCurrencySymbol,
      buyPriceField: props.buyPriceField,
      sellPriceField: props.sellPriceField,
      surchargeNameField: props.surchargeNameField,
      handleBuyPriceInput,
      calculateAndSave,
      formatValue,
      getBuyDisplay,
      markBuyCellTyped,
    };
  },
});
</script>

<style scoped>
.surcharge-prices-table {
  width: 100%;
  color: var(--theme--foreground);
  font-size: 0.8125rem;
}
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--theme--foreground-subdued);
  gap: 1rem;
}
.error-notice {
  margin-bottom: 1rem;
}
.save-bar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
}
.button-bottom {
  margin-top: 1rem;
  margin-bottom: 0;
}
.button-top {
  margin-top: 0;
  margin-bottom: 1rem;
}
.table-wrapper {
  overflow-x: auto;
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  overflow: hidden;
}
.prices-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
  table-layout: fixed;
}
col.col-name {
  width: 260px;
}
col.col-label {
  width: 160px;
}
col.col-price {
  width: 200px;
}
.prices-table th,
.prices-table td {
  border: var(--theme--border-width) solid var(--theme--border-color);
  padding: 0.5rem 0.75rem;
  vertical-align: middle;
}
/* Header */
.header-cell {
  background: var(--theme--background-subdued);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme--primary);
  text-align: left;
  white-space: nowrap;
}
.header-type {
  color: var(--theme--foreground-subdued);
  font-size: 0.75rem;
}
.header-pricing {
  text-align: center;
}
/* Sticky first column */
.sticky-col {
  position: sticky;
  left: 0;
}
/* Name cell */
.name-cell {
  background: var(--theme--background-normal);
  text-align: left;
  font-weight: 500;
}
.item-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme--foreground);
}
/* Label cell */
.label-cell {
  background: var(--theme--banner--title--foreground);
  text-align: left;
}
.price-labels {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.input-label {
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
}
.buy-label {
  color: var(--theme--foreground);
}
.sell-label {
  color: var(--theme--foreground-subdued);
}
/* Price cell */
.price-cell {
  background: var(--theme--background-normal);
  padding: 0.5rem !important;
}
.price-cell.has-changes {
  background: var(--theme--warning-background);
  border-color: var(--theme--warning);
}
.price-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.cell-input {
  width: 100%;
  padding: 0.3rem 0.5rem;
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--banner--title--foreground);
  color: var(--theme--foreground);
  font-size: 0.8125rem;
  text-align: center;
  transition: border-color var(--fast) var(--transition);
}
.cell-input:hover:not(:disabled) {
  border-color: var(--theme--primary);
}
.cell-input:focus {
  outline: none;
  border-color: var(--theme--primary);
  box-shadow: 0 0 0 2px var(--theme--primary-background);
}
.cell-input:disabled {
  background: var(--theme--background-subdued);
  color: var(--theme--foreground-subdued);
  opacity: 0.7;
}
.price-display {
  display: block;
  min-height: 1.125rem;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--theme--foreground-subdued);
}
/* Empty state */
.empty-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  color: var(--theme--foreground-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-subdued);
}
.empty-icon {
  color: var(--theme--foreground-subdued);
  opacity: 0.5;
}
.empty-title {
  margin: 0.75rem 0 0.375rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--theme--foreground);
}
.empty-hint {
  margin: 0;
  font-size: 0.875rem;
}
</style>
