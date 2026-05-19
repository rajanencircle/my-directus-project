<template>
  <div class="surcharge-prices-table">
    <div v-if="loading" class="loading">
      <v-progress-circular indeterminate />
      <p class="loading-text">Loading surcharge prices...</p>
    </div>

    <div v-else>
      <!-- Save Bar Top -->
      <div class="save-bar" v-if="placement === 'top'">
        <v-button
          @click="calculateAndSave"
          :loading="calculating"
          :disabled="disabled || !hotelId || !hasBuyChanges"
        >
          {{ label || "Save & Calculate Sell Prices" }}
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
                Surcharge
              </th>
              <th class="header-cell header-pricing">Pricing</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" class="data-row">
              <td class="name-cell sticky-col">
                <span class="item-name">{{ item.name }}</span>
              </td>
              <td class="label-cell">
                <div class="price-labels">
                  <label class="input-label buy-label">
                    <v-icon name="shopping_cart" x-small />
                    Buy ({{ buyCurrencySymbol }})
                  </label>
                  <label class="input-label sell-label">
                    <v-icon name="sell" x-small />
                    Sell ({{ sellCurrencySymbol }})
                  </label>
                </div>
              </td>
              <td class="price-cell" :class="{ 'has-changes': item._buyDirty }">
                <div class="price-inputs">
                  <input
                    :value="item[buyPriceField]"
                    type="number"
                    step="0.01"
                    class="cell-input"
                    placeholder="0.00"
                    :disabled="disabled"
                    @input="handleBuyPriceInput(item, $event)"
                    @focus="($event.target as HTMLInputElement).select()"
                  />
                  <span class="price-display">
                    {{ formatValue(item[sellPriceField]) }}
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
        <p class="empty-title">No surcharges linked</p>
        <p class="empty-hint">
          Add surcharges to the hotel to manage pricing here.
        </p>
      </div>

      <!-- Save Bar Bottom -->
      <div class="save-bar button-bottom" v-if="placement === 'bottom'">
        <v-button
          @click="calculateAndSave"
          :loading="calculating"
          :disabled="disabled || !hotelId || !hasBuyChanges"
        >
          {{ label || "Save & Calculate Sell Prices" }}
        </v-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from "vue";
import { useApi } from "@directus/extensions-sdk";

export default defineComponent({
  props: {
    value: { type: Array, default: () => [] },
    primaryKey: { type: [String, Number], default: null },
    collection: { type: String, required: true },
    field: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    values: { type: Object, default: () => ({}) },
    calculateFlowId: { type: String, default: "" },
    surchargesCollection: { type: String, default: "surcharges" },
    translationsCollection: {
      type: String,
      default: "surcharges_translations",
    },
    ratesCollection: { type: String, default: "rates" },
    hotelField: { type: String, default: "hotel_id" },
    buyPriceField: { type: String, default: "buy_price" },
    sellPriceField: { type: String, default: "sell_price" },
    exchangeRateField: { type: String, default: "surcharge_exchange_rate" },
    junctionHotelField: { type: String, default: "hotels_id" },
    junctionLanguageField: { type: String, default: "translations_id" },
    type: { type: String, default: null },
    relation: { type: Object, default: null },
    fieldData: { type: Object, default: null },
    placement: { type: String, default: "bottom" },
    label: { type: String, default: "" },
  },

  emits: ["input"],

  setup(props) {
    const api = useApi();

    const loading = ref(false);
    const calculating = ref(false);
    const items = ref<any[]>([]);
    const originalItems = ref<any[]>([]);
    const hasBuyChanges = ref(false);
    const hotelId = ref<string | null>(null);
    const languageId = ref<string | null>(null);
    const buyCurrencySymbol = ref("€");
    const sellCurrencySymbol = ref("$");

    const resolveContext = async () => {
      const hf = props.junctionHotelField;
      const lf = props.junctionLanguageField;

      hotelId.value = props.values?.[hf]?.id ?? props.values?.[hf] ?? null;
      languageId.value = props.values?.[lf]?.id ?? props.values?.[lf] ?? null;

      if (props.primaryKey && props.primaryKey !== "+") {
        try {
          const { data } = await api.get(
            `/items/${props.collection}/${props.primaryKey}`,
            { params: { fields: [hf, lf, props.exchangeRateField] } },
          );
          if (data?.data) {
            hotelId.value = data.data[hf]?.id ?? data.data[hf] ?? hotelId.value;
            languageId.value =
              data.data[lf]?.id ?? data.data[lf] ?? languageId.value;
            const rateKey = data.data[props.exchangeRateField]?.key;
            if (rateKey) await fetchCurrencySymbols(rateKey);
          }
        } catch (err) {
          console.error("[SurchargePrices] resolveContext error:", err);
        }
      }
    };

    const fetchCurrencySymbols = async (rateKey: string) => {
      try {
        const { data } = await api.get(
          `/items/${props.ratesCollection}/${rateKey}`,
          {
            params: { fields: ["from_currency.symbol", "to_currency.symbol"] },
          },
        );
        buyCurrencySymbol.value = data.data.from_currency?.symbol || "€";
        sellCurrencySymbol.value = data.data.to_currency?.symbol || "$";
      } catch (err) {
        console.error("[SurchargePrices] fetchCurrencySymbols error:", err);
      }
    };

    const loadData = async () => {
      if (!hotelId.value) return;

      loading.value = true;
      try {
        const { data: sRes } = await api.get(
          `/items/${props.surchargesCollection}`,
          {
            params: {
              filter: { [props.hotelField]: { _eq: hotelId.value } },
              fields: ["id", "name", props.buyPriceField],
              limit: -1,
            },
          },
        );

        const sIds = sRes.data.map((s: any) => s.id);
        const translations: Record<string, any> = {};

        if (sIds.length > 0 && languageId.value) {
          const { data: tRes } = await api.get(
            `/items/${props.translationsCollection}`,
            {
              params: {
                filter: {
                  _and: [
                    { surcharges_id: { _in: sIds } },
                    { translations_id: { _eq: languageId.value } },
                  ],
                },
                limit: -1,
              },
            },
          );
          tRes.data.forEach((t: any) => {
            translations[t.surcharges_id] = t;
          });
        }

        items.value = sRes.data.map((s: any) => ({
          ...s,
          [props.sellPriceField]:
            translations[s.id]?.[props.sellPriceField] ?? null,
          _trans_id: translations[s.id]?.id || null,
          _dirty: false,
          _buyDirty: false,
        }));

        originalItems.value = JSON.parse(JSON.stringify(items.value));
        hasBuyChanges.value = false;
      } catch (err: any) {
        console.error("[SurchargePrices] loadData error:", err);
      } finally {
        loading.value = false;
      }
    };

    const handleBuyPriceInput = (item: any, event: Event) => {
      const value = (event.target as HTMLInputElement).value;
      item[props.buyPriceField] = value === "" ? null : Number(value);
      const orig = originalItems.value.find((o: any) => o.id === item.id);
      if (orig) {
        item._buyDirty =
          item[props.buyPriceField] !== orig[props.buyPriceField];
        item._dirty =
          item._buyDirty ||
          item[props.sellPriceField] !== orig[props.sellPriceField];
      }
      hasBuyChanges.value = items.value.some((i) => i._buyDirty);
    };

    const saveChanges = async () => {
      const tasks: Promise<any>[] = [];
      for (const item of items.value) {
        if (!item._dirty) continue;
        tasks.push(
          api.patch(`/items/${props.surchargesCollection}/${item.id}`, {
            [props.buyPriceField]: item[props.buyPriceField],
          }),
        );
        if (item._trans_id) {
          tasks.push(
            api.patch(
              `/items/${props.translationsCollection}/${item._trans_id}`,
              { [props.sellPriceField]: item[props.sellPriceField] },
            ),
          );
        } else if (languageId.value) {
          tasks.push(
            api.post(`/items/${props.translationsCollection}`, {
              surcharges_id: item.id,
              translations_id: languageId.value,
              [props.sellPriceField]: item[props.sellPriceField],
            }),
          );
        }
      }
      await Promise.all(tasks);
    };

    const calculateAndSave = async () => {
      calculating.value = true;
      try {
        if (items.value.some((i: any) => i._dirty)) await saveChanges();
        if (props.calculateFlowId) {
          await api.post(`/flows/trigger/${props.calculateFlowId}`, {
            collection: props.collection,
            keys: [hotelId.value],
          });
          await new Promise((resolve) => setTimeout(resolve, 2500));
        }
        await loadData();
      } catch {
        // intentionally silent
      } finally {
        calculating.value = false;
      }
    };

    const formatValue = (v: any) => {
      if (v === null || v === undefined || v === "") return "—";
      return Number(v).toFixed(2);
    };

    onMounted(async () => {
      await resolveContext();
      await loadData();
    });

    watch(
      () =>
        [props.values, props.primaryKey] as [object, string | number | null],
      async (
        [, newPK]: [object, string | number | null],
        [, oldPK]: [object, string | number | null],
      ) => {
        const oldHotel = hotelId.value;
        const oldLang = languageId.value;
        await resolveContext();
        const pkJustArrived =
          newPK && newPK !== "+" && (!oldPK || oldPK === "+");
        const contextChanged =
          hotelId.value !== oldHotel || languageId.value !== oldLang;
        if (pkJustArrived || contextChanged) await loadData();
      },
      { deep: true },
    );

    return {
      loading,
      calculating,
      items,
      hasBuyChanges,
      hotelId,
      buyCurrencySymbol,
      sellCurrencySymbol,
      buyPriceField: props.buyPriceField,
      sellPriceField: props.sellPriceField,
      handleBuyPriceInput,
      calculateAndSave,
      formatValue,
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
.save-bar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
}
.button-bottom {
  margin-top: 1rem;
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
  z-index: 10;
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
@media (max-width: 768px) {
  .sticky-col {
    position: static;
  }
}
</style>
