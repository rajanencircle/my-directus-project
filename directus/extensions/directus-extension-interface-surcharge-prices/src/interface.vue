<template>
  <div class="surcharge-prices-table shadow-sm">
    <div v-if="loading" class="loading-state">
      <v-progress-circular indeterminate />
      <p class="loading-text">Fetching Surcharge Data...</p>
    </div>

    <div v-else>
      <!-- Unsaved Changes Banner: only shown when buy price changes -->
      <div v-if="placement === 'top'" class="changes-banner">
        <v-button
          @click="calculateAndSave"
          :loading="calculating"
          :disabled="disabled || !hotelId || !hasBuyChanges"
          kind="primary"
          class="calculate-btn"
        >
          {{ label || "Save and calculate" }}
        </v-button>
      </div>

      <table class="modern-table">
        <thead>
          <tr>
            <th class="name-col">Surcharge</th>
            <th class="type-col">Context</th>
            <th class="pricing-col">Pricing</th>
          </tr>
        </thead>

        <tbody v-if="items.length > 0">
          <tr v-for="item in items" :key="item.id">
            <td class="name-col">
              <span class="item-name">{{ item.name }}</span>
            </td>

            <td class="type-col">
              <div class="type-stack">
                <div class="type-item">
                  <span class="type-chip">
                    <v-icon name="shopping_cart" class="x-small" />
                  </span>
                  <span>Buy ({{ buyCurrencySymbol }})</span>
                </div>

                <div class="type-item">
                  <span class="type-chip">
                    <v-icon name="sell" class="x-small" />
                  </span>
                  <span>Sell ({{ sellCurrencySymbol }})</span>
                </div>
              </div>
            </td>

            <td class="pricing-col">
              <div class="pricing-stack">
                <div class="input-wrapper">
                  <input
                    v-model.number="item.buy_price"
                    type="number"
                    step="0.01"
                    class="modern-input"
                    :disabled="disabled"
                    @input="markModified"
                    placeholder="0.00"
                  />
                </div>

                <div class="input-wrapper sell-wrapper">
                  <input
                    :value="formatValue(item.sell_price)"
                    type="text"
                    class="modern-input sell-input"
                    disabled
                    placeholder="-"
                  />
                </div>
              </div>
            </td>
          </tr>
        </tbody>

        <tbody v-else>
          <tr>
            <td colspan="3" class="empty-cell">
              <div class="empty-view-inline">
                <v-icon name="layers_clear" class="empty-icon-small" />
                <div class="empty-text-stack">
                  <span class="empty-text-small">No Surcharges Linked</span>
                  <span class="empty-sub-small"
                    >Add surcharges to the hotel to manage pricing.</span
                  >
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="placement === 'bottom'" class="changes-banner bottom-save-btn">
        <v-button
          @click="calculateAndSave"
          :loading="calculating"
          :disabled="disabled || !hotelId || !hasBuyChanges"
          kind="primary"
          class="calculate-btn"
        >
          {{ label || "Save and calculate" }}
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
    // Field names inside the junction record (props.values) that hold the hotel and language FK
    junctionHotelField: { type: String, default: "hotels_id" },
    junctionLanguageField: { type: String, default: "translations_id" },
    // Standard Directus props that might be injected
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

    const COLLECTIONS = {
      SURCHARGES: props.surchargesCollection,
      SURCHARGES_TRANS: props.translationsCollection,
      RATES: props.ratesCollection,
    };

    const FIELDS = {
      HOTEL_FK: props.hotelField,
      BUY_PRICE: props.buyPriceField,
      SELL_PRICE: props.sellPriceField,
      EXCHANGE_RATE: props.exchangeRateField,
    };

    const resolveContext = async () => {
      const hf = props.junctionHotelField;
      const lf = props.junctionLanguageField;

      // Path 1: read directly from props.values (available before save)
      const hotelFromValues =
        props.values?.[hf]?.id ?? props.values?.[hf] ?? null;
      const langFromValues =
        props.values?.[lf]?.id ?? props.values?.[lf] ?? null;

      hotelId.value = hotelFromValues;
      languageId.value = langFromValues;

      // Path 2: API fetch when the junction record already exists
      if (props.primaryKey && props.primaryKey !== "+") {
        try {
          const { data } = await api.get(
            `/items/${props.collection}/${props.primaryKey}`,
            {
              params: { fields: [hf, lf, FIELDS.EXCHANGE_RATE] },
            },
          );

          if (data?.data) {
            hotelId.value = data.data[hf]?.id ?? data.data[hf] ?? hotelId.value;
            languageId.value =
              data.data[lf]?.id ?? data.data[lf] ?? languageId.value;

            const rateKey = data.data[FIELDS.EXCHANGE_RATE]?.key;

            if (rateKey) {
              await fetchCurrencySymbols(rateKey);
            }
          }
        } catch (err) {
          console.error("[SurchargePrices] resolveContext error:", err);
        }
      } else {
        console.warn(
          `[SurchargePrices] resolveContext — primaryKey is null/"+", skipping API fetch. Final hotelId: ${hotelId.value}`,
        );
      }
    };

    const fetchCurrencySymbols = async (rateKey: string) => {
      try {
        const { data } = await api.get(
          `/items/${COLLECTIONS.RATES}/${rateKey}`,
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
      if (!hotelId.value) {
        console.warn(
          "[SurchargePrices] loadData ABORTED — hotelId is null/undefined. props.values:",
          JSON.stringify(props.values),
          "| primaryKey:",
          props.primaryKey,
        );
        return;
      }

      loading.value = true;

      try {
        const { data: sRes } = await api.get(
          `/items/${COLLECTIONS.SURCHARGES}`,
          {
            params: {
              filter: { [FIELDS.HOTEL_FK]: { _eq: hotelId.value } },
              fields: ["id", "name", FIELDS.BUY_PRICE],
              limit: -1,
            },
          },
        );

        const sIds = sRes.data.map((s: any) => s.id);

        const translations: Record<string, any> = {};

        if (sIds.length > 0 && languageId.value) {
          const { data: tRes } = await api.get(
            `/items/${COLLECTIONS.SURCHARGES_TRANS}`,
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
        } else if (sIds.length === 0) {
          console.warn(
            "[SurchargePrices] no surcharges found for hotel",
            hotelId.value,
            "— table will show empty state",
          );
        } else {
          console.warn(
            "[SurchargePrices] skipping translations fetch — languageId is null/undefined",
          );
        }

        items.value = sRes.data.map((s: any) => ({
          ...s,
          sell_price: translations[s.id]?.[FIELDS.SELL_PRICE] ?? null,
          _trans_id: translations[s.id]?.id || null,
          _dirty: false,
          _buyDirty: false,
        }));

        originalItems.value = JSON.parse(JSON.stringify(items.value));
        hasBuyChanges.value = false;
      } catch (err: any) {
        console.error(
          "[SurchargePrices] loadData ERROR:",
          err?.response?.status,
          err?.response?.data ?? err?.message ?? err,
        );
      } finally {
        loading.value = false;
      }
    };

    const markModified = () => {
      items.value.forEach((item, idx) => {
        const orig = originalItems.value[idx];
        if (!orig) return;

        item._buyDirty = item[FIELDS.BUY_PRICE] !== orig[FIELDS.BUY_PRICE];
        item._dirty =
          item[FIELDS.BUY_PRICE] !== orig[FIELDS.BUY_PRICE] ||
          item[FIELDS.SELL_PRICE] !== orig[FIELDS.SELL_PRICE];
      });

      hasBuyChanges.value = items.value.some((i) => i._buyDirty);
    };

    const resetChanges = () => {
      items.value = JSON.parse(JSON.stringify(originalItems.value));
      hasBuyChanges.value = false;
    };

    const saveChanges = async () => {
      const tasks: any[] = [];

      for (const item of items.value) {
        if (!item._dirty) continue;

        tasks.push(
          api.patch(`/items/${COLLECTIONS.SURCHARGES}/${item.id}`, {
            [FIELDS.BUY_PRICE]: item[FIELDS.BUY_PRICE],
          }),
        );

        if (item._trans_id) {
          tasks.push(
            api.patch(
              `/items/${COLLECTIONS.SURCHARGES_TRANS}/${item._trans_id}`,
              {
                [FIELDS.SELL_PRICE]: item[FIELDS.SELL_PRICE],
              },
            ),
          );
        } else if (languageId.value) {
          tasks.push(
            api.post(`/items/${COLLECTIONS.SURCHARGES_TRANS}`, {
              surcharges_id: item.id,
              translations_id: languageId.value,
              [FIELDS.SELL_PRICE]: item[FIELDS.SELL_PRICE],
            }),
          );
        }
      }

      await Promise.all(tasks);
    };

    const calculateAndSave = async () => {
      calculating.value = true;

      try {
        if (items.value.some((item) => item._dirty)) {
          await saveChanges();
        }

        if (props.calculateFlowId) {
          await api.post(`/flows/trigger/${props.calculateFlowId}`, {
            collection: props.collection,
            keys: [hotelId.value],
          });

          await new Promise((resolve) => setTimeout(resolve, 2500));
          await loadData();
        } else {
          await loadData();
        }
      } catch {
        // intentionally silent
      } finally {
        calculating.value = false;
      }
    };

    const formatValue = (v: any) => {
      if (v === null || v === undefined || v === "") return "-";
      return Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    onMounted(async () => {
      await resolveContext();

      await loadData();
    });

    watch(
      () =>
        [props.values, props.primaryKey] as [object, string | number | null],
      async ([_newValues, newPK], [_oldValues, oldPK]) => {
        const oldHotel = hotelId.value;
        const oldLang = languageId.value;

        await resolveContext();

        // Always reload when primaryKey just became a real value (delayed mount race)
        const pkJustArrived =
          newPK && newPK !== "+" && (!oldPK || oldPK === "+");
        const contextChanged =
          hotelId.value !== oldHotel || languageId.value !== oldLang;

        if (pkJustArrived || contextChanged) {
          await loadData();
        }
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
      markModified,
      resetChanges,
      calculateAndSave,
      formatValue,
    };
  },
});
</script>

<style scoped>
.surcharge-prices-table {
  --primary: var(--theme--primary);
  --bg-soft: var(--theme--background-normal);
  --text-muted: var(--theme--foreground-subdued);

  width: 100%;
  font-family: "Inter", sans-serif;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  color: var(--text-muted);
}

.changes-banner {
  /* display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  background: var(--theme--warning-background);
  border: 1px solid var(--theme--warning);
  border-radius: 12px; */
  margin-bottom: 20px;
}

.bottom-save-btn {
  margin-top: 15px;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.banner-icon {
  color: var(--theme--warning);
  flex-shrink: 0;
}

.banner-text {
  display: flex;
  flex-direction: column;
}

.banner-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--theme--foreground);
}

.banner-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.modern-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: var(--theme--background);
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: 6px;
  overflow: hidden;
}

.modern-table th {
  padding: 12px 16px;
  font-size: 11px;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  text-align: left;
  background: var(--theme--background-normal);
  border-bottom: var(--theme--border-width) solid var(--theme--border-color);
  border-right: var(--theme--border-width) solid var(--theme--border-color);
}

.modern-table th:last-child {
  border-right: none;
}

.modern-table td {
  padding: 8px 10px;
  vertical-align: middle;
  border-bottom: var(--theme--border-width) solid var(--theme--border-color);
  border-right: var(--theme--border-width) solid var(--theme--border-color);
}

.modern-table td:last-child {
  border-right: none;
}

.modern-table tr:last-child td {
  border-bottom: none;
}

.name-col {
  width: 34%;
  font-size: 1rem;
  letter-spacing: 0.4px;
  position: sticky;
  top: 0;
  z-index: 10;
  font-weight: 600;
  background: var(--theme--background-normal);
}

.type-col {
  width: 28%;
  font-size: 1rem;
  letter-spacing: 0.4px;
  position: sticky;
  top: 0;
  z-index: 10;
  font-weight: 600;
  background: var(--theme--background-subdued) !important;
}

.pricing-col {
  font-size: 1rem;
  letter-spacing: 0.4px;
  position: sticky;
  top: 0;
  z-index: 10;
  font-weight: 600;
  width: 38%;
  background: #ffffff !important;
}

.modern-table th.name-col,
.modern-table th.type-col,
.modern-table th.pricing-col {
  position: sticky;
  top: 0;
  z-index: 10;
  color: rgb(23, 41, 64);
  font-size: 14px;
  font-weight: 600;
  border: var(--theme--border-width) solid var(--theme--border-color);
}
.modern-table th.pricing-col {
  background: color-mix(
    in srgb,
    var(--theme--background-normal),
    var(--theme--foreground-subdued) 20%
  ) !important;
}
.x-small {
  --v-icon-size: 12px !important;
  font-size: 12px !important;
  transform: scale(0.85);
}

.item-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--theme--foreground);
}

.type-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
}

.type-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.pricing-stack {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-start;
}

.input-wrapper {
  position: relative;
  width: 100%;
}

.sell-wrapper {
  background-color: transparent !important;
  border: none;
}

.currency-symbol {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-weight: 700;
  font-size: 12px;
  color: var(--text-muted);
}

.modern-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--form--field--input--background);
  color: var(--theme--foreground);
  /* font-family: var(--theme--fonts--monospace--font-family); */
  font-size: 0.9375rem;
  text-align: center;
  transition: all var(--fast) var(--transition);
}

.modern-input:focus {
  border: var(--theme--border-width) solid var(--theme--border-color);
  background: var(--theme--background);
  box-shadow: 0 0 0 3px var(--theme--primary-background);
}

.sell-input {
  color: var(--primary);
  border: none;
}

.empty-cell {
  padding: 40px 20px !important;
  background: var(--theme--background-subdued);
}

.empty-view-inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--theme--foreground-subdued);
}

.empty-icon-small {
  --v-icon-size: 32px;
  opacity: 0.5;
}

.empty-text-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.empty-text-small {
  font-weight: 600;
  font-size: 14px;
}

.empty-sub-small {
  font-size: 12px;
  opacity: 0.8;
}
</style>
