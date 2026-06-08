<template>
  <div class="tours-prices-table">
    <div v-if="loading" class="loading">
      <v-progress-circular indeterminate />
      <p class="loading-text">Loading tour prices...</p>
    </div>
    <div v-else>
      <!-- Context Selector (shown when placed directly on tours) -->
      <div
        v-if="collection === parentCollection && availableTranslations.length > 0"
        class="context-header"
      >
        <div class="selector-field">
          <span class="selector-label">Market:</span>
          <v-select
            v-model="selectedTranslationId"
            :items="availableTranslations"
            placeholder="Select market..."
            inline
          />
        </div>
      </div>

      <!-- Save Bar Top -->
      <div class="save-bar button-top" v-if="buttonPosition === 'top'">
        <v-button
          @click="calculateSellPrices"
          :loading="calculatingSellPrices"
          :disabled="disabled || saving || loading || !parent_id"
        >
          {{ label || "Save & Calculate Sell Prices" }}
        </v-button>
      </div>

      <!-- Groups (Accordion style) -->
      <div
        v-for="(group, groupKey) in orderedGroupedData"
        :key="groupKey"
        class="price-group"
      >
        <div class="table-wrapper">
          <table class="prices-table">
            <colgroup>
              <col class="col-label" />
              <col class="col-price-type" />
              <col v-for="col in columns" :key="'cg-' + col.id" class="col-price" />
            </colgroup>
            <thead>
              <tr>
                <th
                  class="group-header-cell sticky-col"
                  colspan="2"
                  @click="toggleGroup(groupKey)"
                >
                  <div class="group-header-inner">
                    <v-icon
                      name="expand_more"
                      class="accordion-icon"
                      :class="{ 'is-expanded': expandedGroups[groupKey] }"
                    />
                    <span class="group-title">
                      {{ getGroupLabel(groupKey) }}
                      <span
                        v-if="fromPriceSymbol && getGroupFromPrice(groupKey)"
                        class="from-price-wrapper"
                        >(<v-icon :name="fromPriceSymbol" small class="from-price-icon" />)</span
                      >
                    </span>
                  </div>
                </th>
                <th v-for="col in columns" :key="col.id" class="column-header">
                  {{ col.price_category || col.name }}
                  <span
                    v-if="fromPriceSymbol && col.from_price"
                    class="from-price-wrapper"
                    >(<v-icon :name="fromPriceSymbol" small class="from-price-icon" />)</span
                  >
                </th>
              </tr>
            </thead>
            <TransitionGroup tag="tbody" name="row-cascade">
              <tr
                v-for="(row, rowIndex) in expandedGroups[groupKey] ? group.rows : []"
                :key="`${groupKey}|${row.id}`"
                class="data-row"
                :style="{ '--row-index': Math.min(Number(rowIndex), 8) }"
              >
                <td class="row-label sticky-col">
                  <div class="row-label-content">
                    <small class="date-range">
                      {{ formatDateRange(row[rowStartDateField], row[rowEndDateField]) }}
                      <span
                        v-if="fromPriceSymbol && rowFromPriceField && row[rowFromPriceField]"
                        class="from-price-wrapper"
                        >(<v-icon :name="fromPriceSymbol" small class="from-price-icon" />)</span
                      >
                    </small>
                  </div>
                </td>
                <td class="label-col">
                  <div class="price-labels">
                    <label class="input-label buy-label">
                      <v-icon name="shopping_cart" x-small />
                      {{ buyLabel || "Buy" }} ({{ buyCurrencySymbol }})
                    </label>
                    <label class="input-label sell-label">
                      <v-icon name="sell" x-small />
                      {{ sellLabel || "Sell" }} ({{ sellCurrencySymbol }})
                    </label>
                  </div>
                </td>
                <td
                  v-for="col in columns"
                  :key="`${groupKey}|${row.id}|${col.id}`"
                  class="price-cell"
                  :class="{ 'has-changes': isCellModified(groupKey, row.id, col.id) }"
                >
                  <div class="price-inputs">
                    <input
                      :value="getCell(groupKey, row.id, col.id)[buyPriceField]"
                      type="number"
                      step="0.01"
                      class="cell-input"
                      placeholder="0.00"
                      :disabled="disabled"
                      @input="handleBuyPriceInput(groupKey, row.id, col.id, $event)"
                      @focus="($event.target as HTMLInputElement).select()"
                    />
                    <span class="price-display">
                      {{ formatPrice(getCell(groupKey, row.id, col.id)[sellPriceField]) }}
                    </span>
                  </div>
                </td>
              </tr>
            </TransitionGroup>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="items.length === 0" class="empty-state-card">
        <v-icon name="inbox" large class="empty-icon" />
        <p class="empty-title">{{ emptyStateTitle || "No tour prices configured yet" }}</p>
        <p class="empty-hint">{{ emptyStateHint || "Add price periods, categories, and price categories to see them here." }}</p>
      </div>

      <!-- Save Bar Bottom -->
      <div class="save-bar button-bottom" v-if="buttonPosition === 'bottom'">
        <v-button
          @click="calculateSellPrices"
          :loading="calculatingSellPrices"
          :disabled="disabled || saving || loading || !parent_id"
        >
          {{ label || "Save & Calculate Sell Prices" }}
        </v-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
} from "vue";
import { useApi } from "@directus/extensions-sdk";

export default defineComponent({
  props: {
    value: { type: Array, default: () => [] },
    label: { type: String, default: null },
    buttonPosition: { type: String, default: "bottom" },
    primaryKey: { type: [String, Number], default: null },
    collection: { type: String, required: true },
    field: { type: String, required: true },
    groupByField: { type: String, default: "tours_category_id" },
    rowField: { type: String, default: "price_date_id" },
    columnField: { type: String, default: "tours_room_occupancy_id" },
    rowStartDateField: { type: String, default: "price_period_start" },
    rowEndDateField: { type: String, default: "price_period_end" },
    groupCategoryField: { type: String, default: "category" },
    occupancyNameField: { type: String, default: "price_category" },
    editableFields: { type: Array, default: () => ["buy_price", "sell_price"] },
    disabled: { type: Boolean, default: false },
    values: { type: Object, default: () => ({}) },
    calculateSellPricesFlowId: { type: String, default: "" },
    // Related collection (prices)
    relatedCollection: { type: String, default: "tours_prices" },
    foreignKeyField: { type: String, default: "tour_id" },
    buyPriceField: { type: String, default: "buy_price" },
    // Parent record
    parentCollection: { type: String, default: "tours" },
    parentKeyField: { type: String, default: "" },
    occupanciesField: { type: String, default: "tours_room_occupancy" },
    occupancySourceMode: { type: String, default: "auto" },
    occupancyJunctionCollection: { type: String, default: "tours_tours_room_occupancies" },
    occupancyJunctionPrimaryKeyField: { type: String, default: "id" },
    occupancyJunctionParentField: { type: String, default: "tours_id" },
    occupancyJunctionRelatedField: { type: String, default: "tours_room_occupancies_id" },
    occupancyCollection: { type: String, default: "tours_room_occupancies" },
    categoryOrderField: { type: String, default: "tours_categories" },
    groupByCollection: { type: String, default: "tours_categories" },
    rowCollection: { type: String, default: "daytrips_price_dates" },
    sellStatusField: { type: String, default: "sell_prices_status" },
    sellUpdatedAtField: { type: String, default: "sell_prices_updated_at" },
    // Junction collection
    junctionCollection: { type: String, default: "tours_translations_1" },
    junctionParentKeyField: { type: String, default: "tours_id" },
    junctionLanguageField: { type: String, default: "translations_id" },
    junctionExchangeRateField: { type: String, default: "exchange_rate" },
    // Translations collection (sell prices)
    translationsCollection: { type: String, default: "tours_prices_translations" },
    translationsFKField: { type: String, default: "tours_prices_id" },
    translationsLanguageField: { type: String, default: "translations_id" },
    sellPriceField: { type: String, default: "sell_price" },
    // Currency
    ratesCollection: { type: String, default: "rates" },
    currenciesCollection: { type: String, default: "currencies" },
    fromCurrencyField: { type: String, default: "from_currency" },
    toCurrencyField: { type: String, default: "to_currency" },
    currencySymbolField: { type: String, default: "symbol" },
    defaultBuyCurrencySymbol: { type: String, default: "€" },
    defaultSellCurrencySymbol: { type: String, default: "$" },
    fromPriceSymbol: { type: String, default: "" },
    groupFromPriceField: { type: String, default: "is_from_price" },
    occupancyFromPriceField: { type: String, default: "price_category_start" },
    rowFromPriceField: { type: String, default: "is_from_price" },
    occupancySortField: { type: String, default: "sort" },
    rowSortField: { type: String, default: "price_period_start" },
    groupSortField: { type: String, default: "sort" },
    emptyStateTitle: { type: String, default: "" },
    emptyStateHint: { type: String, default: "" },
    buyLabel: { type: String, default: "" },
    sellLabel: { type: String, default: "" },
  },

  emits: ["input"],

  setup(props) {
    const api = useApi();

    const loading = ref(false);
    const saving = ref(false);
    const calculatingSellPrices = ref(false);
    const items = ref<any[]>([]);
    const originalItems = ref<any[]>([]);
    const hasChanges = ref(false);

    const parent_id = ref<string | null>(null);
    const translations_id = ref<string | null>(null);
    const lookupData = ref<{
      categories: Map<string, any>;
      dates: Map<string, any>;
      occupancies: Map<string, any>;
    }>({
      categories: new Map(),
      dates: new Map(),
      occupancies: new Map(),
    });

    const parentRecord = ref<any>(null);
    const buyCurrencySymbol = ref<string>("");
    const sellCurrencySymbol = ref<string>("");
    const categoryOrder = ref<string[]>([]);
    const sellPricesStatus = ref<string | null>(null);
    const sellPricesUpdatedAt = ref<string | null>(null);
    const availableTranslations = ref<any[]>([]);
    const selectedTranslationId = ref<string | number | null>(null);
    const expandedGroups = ref<Record<string, boolean>>({});

    const lookupKey = (value: any) =>
      value === null || value === undefined ? "" : String(value);

    const addOccupancyLookup = (key: any, occupancy: any) => {
      const normalizedKey = lookupKey(key);
      if (!normalizedKey) return;
      lookupData.value.occupancies.set(normalizedKey, occupancy);
    };

    const normalizeOccupancyFromJunction = (junctionRow: any) => {
      const primaryKeyField = props.occupancyJunctionPrimaryKeyField || "id";
      const relatedField = props.occupancyJunctionRelatedField || "tours_room_occupancies_id";
      const junctionId = junctionRow?.[primaryKeyField];
      const related = junctionRow?.[relatedField];
      const relatedRecord = related && typeof related === "object" ? related : {};

      return {
        ...relatedRecord,
        id: relatedRecord.id ?? null,
        junction_id: junctionId,
        original_id: relatedRecord.id ?? related ?? null,
        name: relatedRecord.price_category ?? relatedRecord.name ?? String(junctionId ?? ""),
        price_category: relatedRecord.price_category ?? relatedRecord.name ?? String(junctionId ?? ""),
        from_price: props.occupancyFromPriceField
          ? (relatedRecord[props.occupancyFromPriceField] ?? junctionRow?.[props.occupancyFromPriceField] ?? false)
          : false,
      };
    };

    // ── Cell map ─────────────────────────────────────────────────────────────

    const cellMap = computed(() => {
      const map = new Map<string, any>();
      items.value.forEach((item) => {
        const key = `${item[props.groupByField]}|${item[props.rowField]}|${item[props.columnField]}`;
        map.set(key, item);
      });
      return map;
    });

    const getCell = (groupKey: string, rowId: string, colId: string) => {
      const key = `${groupKey}|${rowId}|${colId}`;
      return cellMap.value.get(key) || {};
    };

    const isCellModified = (groupKey: string, rowId: string, colId: string) => {
      const current = getCell(groupKey, rowId, colId);
      if (current._isNew) return current[props.buyPriceField] != null;
      if (!current.id) return false;
      const original = originalItems.value.find((o) => o.id === current.id);
      return (
        original &&
        (original[props.sellPriceField] !== current[props.sellPriceField] ||
          original[props.buyPriceField] !== current[props.buyPriceField])
      );
    };

    // ── Resolve translation/parent context ───────────────────────────────────

    const fetchTranslationInfo = async () => {
      buyCurrencySymbol.value = props.defaultBuyCurrencySymbol;
      sellCurrencySymbol.value = props.defaultSellCurrencySymbol;

      // 1. Placed directly on tours
      if (props.collection === props.parentCollection) {
        if (!props.primaryKey || props.primaryKey === "+") {
          const pathParts = window.location.pathname.split("/");
          const parentIdx = pathParts.indexOf(props.parentCollection);
          if (parentIdx !== -1 && pathParts[parentIdx + 1] && pathParts[parentIdx + 1] !== "+") {
            parent_id.value = pathParts[parentIdx + 1];
          } else {
            return;
          }
        } else {
          parent_id.value = props.primaryKey as string;
        }

        try {
          const { data } = await api.get(`/items/${props.junctionCollection}`, {
            params: {
              filter: { [props.junctionParentKeyField]: { _eq: parent_id.value } },
              fields: [
                "id",
                `${props.junctionLanguageField}.id`,
                `${props.junctionLanguageField}.name`,
                props.junctionExchangeRateField,
              ],
            },
          });

          availableTranslations.value = data.data.map((t: any) => ({
            text: t[props.junctionLanguageField]?.name || t[props.junctionLanguageField]?.id || "Unknown",
            value: t.id,
            exchange_rate: t[props.junctionExchangeRateField],
            lang_id: t[props.junctionLanguageField]?.id,
          }));

          if (availableTranslations.value.length > 0) {
            if (!selectedTranslationId.value) {
              selectedTranslationId.value = availableTranslations.value[0].value;
            }
            const current = availableTranslations.value.find((t) => t.value === selectedTranslationId.value);
            if (current) {
              translations_id.value = current.lang_id;
              if (current.exchange_rate?.key) {
                await fetchCurrencySymbols(current.exchange_rate.key);
              }
            }
          }
        } catch (err) {
          console.error("[ToursPricesTable] Error fetching junction records:", err);
        }
        return;
      }

      // 2. Placed on tours_translations_1
      if (props.collection === props.junctionCollection) {
        if (props.values?.[props.junctionParentKeyField]) {
          const hId =
            typeof props.values[props.junctionParentKeyField] === "object"
              ? props.values[props.junctionParentKeyField].id
              : props.values[props.junctionParentKeyField];
          const tId =
            typeof props.values[props.junctionLanguageField] === "object"
              ? props.values[props.junctionLanguageField].id
              : props.values[props.junctionLanguageField];

          if (hId) {
            parent_id.value = hId;
            translations_id.value = tId || null;

            if (props.values[props.junctionExchangeRateField]) {
              const rateKey =
                typeof props.values[props.junctionExchangeRateField] === "object"
                  ? props.values[props.junctionExchangeRateField].key
                  : props.values[props.junctionExchangeRateField];
              if (rateKey) await fetchCurrencySymbols(rateKey);
            }

            if (!translations_id.value && props.primaryKey && props.primaryKey !== "+") {
              // fall through to API fetch below
            } else {
              return;
            }
          }
        }

        // Fallback: read parent ID from URL
        if (!parent_id.value) {
          const pathParts = window.location.pathname.split("/");
          const parentIdx = pathParts.indexOf(props.parentCollection);
          if (parentIdx !== -1 && pathParts[parentIdx + 1]) {
            parent_id.value = pathParts[parentIdx + 1];
          }
        }

        if (!props.primaryKey || props.primaryKey === "+") return;

        try {
          const parentField = props.parentKeyField || props.junctionParentKeyField || "tours_id";
          const { data } = await api.get(`/items/${props.junctionCollection}/${props.primaryKey}`, {
            params: {
              fields: [parentField, props.junctionLanguageField, props.junctionExchangeRateField],
            },
          });

          parent_id.value =
            typeof data.data[parentField] === "object"
              ? data.data[parentField].id
              : data.data[parentField];
          translations_id.value =
            typeof data.data[props.junctionLanguageField] === "object"
              ? data.data[props.junctionLanguageField].id
              : data.data[props.junctionLanguageField];

          if (data.data[props.junctionExchangeRateField]) {
            const rateKey =
              typeof data.data[props.junctionExchangeRateField] === "object"
                ? data.data[props.junctionExchangeRateField].key
                : data.data[props.junctionExchangeRateField];
            if (rateKey) await fetchCurrencySymbols(rateKey);
          }
        } catch (err) {
          console.error("[ToursPricesTable] Error fetching junction record:", err);
        }
      }
    };

    const fetchCurrencySymbols = async (rateKey: string) => {
      try {
        const exchangeRateRes = await api.get(`/items/${props.ratesCollection}/${rateKey}`);
        const [fromRes, toRes] = await Promise.all([
          api.get(`/items/${props.currenciesCollection}/${exchangeRateRes.data.data[props.fromCurrencyField]}`),
          api.get(`/items/${props.currenciesCollection}/${exchangeRateRes.data.data[props.toCurrencyField]}`),
        ]);
        buyCurrencySymbol.value = fromRes?.data?.data?.[props.currencySymbolField] || props.defaultBuyCurrencySymbol;
        sellCurrencySymbol.value = toRes?.data?.data?.[props.currencySymbolField] || props.defaultSellCurrencySymbol;
      } catch (err) {
        console.error("[ToursPricesTable] Error fetching currency symbols:", err);
      }
    };

    // ── Fetch occupancies from junction ──────────────────────────────────────

    const fetchOccupanciesFromJunction = async () => {
      if (!parent_id.value || !props.occupancyJunctionCollection) return false;

      const primaryKeyField = props.occupancyJunctionPrimaryKeyField || "id";
      const parentField = props.occupancyJunctionParentField || props.foreignKeyField;
      const relatedField = props.occupancyJunctionRelatedField || "tours_room_occupancies_id";

      const { data } = await api.get(`/items/${props.occupancyJunctionCollection}`, {
        params: {
          fields: [
            primaryKeyField,
            parentField,
            relatedField,
            `${relatedField}.id`,
            `${relatedField}.price_category`,
            ...(props.occupancyFromPriceField ? [`${relatedField}.${props.occupancyFromPriceField}`] : []),
            ...(props.occupancySortField ? [`${relatedField}.${props.occupancySortField}`] : []),
          ],
          filter: { [parentField]: { _eq: parent_id.value } },
          limit: -1,
        },
      });

      const rows = data?.data || [];
      const originalIds = rows
        .map((row: any) => row?.[relatedField])
        .filter((value: any) => value && typeof value !== "object");
      const originalLookup = new Map<string, any>();

      if (originalIds.length > 0 && props.occupancyCollection) {
        const originalRes = await api.get(`/items/${props.occupancyCollection}`, {
          params: {
            fields: [
              "id",
              "price_category",
              ...(props.occupancyFromPriceField ? [props.occupancyFromPriceField] : []),
              ...(props.occupancySortField ? [props.occupancySortField] : []),
            ],
            filter: { id: { _in: [...new Set(originalIds)] } },
            limit: -1,
          },
        });
        (originalRes.data?.data || []).forEach((occupancy: any) => {
          originalLookup.set(lookupKey(occupancy.id), occupancy);
        });
      }

      rows.forEach((row: any) => {
        const related = row?.[relatedField];
        const hydratedRow =
          related && typeof related !== "object" && originalLookup.has(lookupKey(related))
            ? { ...row, [relatedField]: originalLookup.get(lookupKey(related)) }
            : row;
        const occupancy = normalizeOccupancyFromJunction(hydratedRow);
        addOccupancyLookup(occupancy.id || row[primaryKeyField], occupancy);
      });

      return rows.length > 0;
    };

    // ── Fetch parent record ──────────────────────────────────────────────────

    const fetchParentRecord = async () => {
      if (!parent_id.value) return;
      try {
        const { data } = await api.get(`/items/${props.parentCollection}/${parent_id.value}`, {
          params: {
            fields: [
              "*",
              props.categoryOrderField,
              props.sellStatusField,
              props.sellUpdatedAtField,
              `${props.occupanciesField}.*`,
            ],
          },
        });
        parentRecord.value = data.data;
        sellPricesStatus.value = parentRecord.value[props.sellStatusField] ?? null;
        sellPricesUpdatedAt.value = parentRecord.value[props.sellUpdatedAtField] ?? null;
        if (Array.isArray(parentRecord.value[props.categoryOrderField])) {
          categoryOrder.value = parentRecord.value[props.categoryOrderField].map(
            (cat: any) => (typeof cat === "string" ? cat : cat.id || cat),
          );
        }
        // Reset and populate occupancies exclusively via junction fetch (UUID keys)
        // Do NOT pre-populate from the M2M alias — it uses junction integer IDs which
        // differ from the UUID stored in tours_prices.tours_room_occupancy_id
        lookupData.value.occupancies = new Map();
        if (props.occupancySourceMode === "junction" || props.occupancySourceMode === "auto") {
          try {
            await fetchOccupanciesFromJunction();
          } catch (junctionErr) {
            console.warn("[ToursPricesTable] fetchOccupanciesFromJunction failed:", junctionErr);
          }
        }
      } catch (err) {
        console.error("[ToursPricesTable] Error fetching parent record:", err);
      }
    };

    // ── Fetch lookup data (categories + rows) ────────────────────────────────

    const fetchLookupData = async () => {
      if (!parent_id.value) return;
      try {
        const [catRes, dateRes] = await Promise.all([
          api.get(`/items/${props.groupByCollection}`, {
            params: {
              filter: { [props.foreignKeyField]: { _eq: parent_id.value } },
              fields: [
                "id",
                `${props.groupCategoryField}.name`,
                ...(props.groupFromPriceField ? [props.groupFromPriceField] : []),
                ...(props.groupSortField &&
                !["id", `${props.groupCategoryField}.name`, props.groupFromPriceField].includes(props.groupSortField)
                  ? [props.groupSortField]
                  : []),
              ],
              limit: -1,
            },
          }),
          api.get(`/items/${props.rowCollection}`, {
            params: {
              filter: { [props.foreignKeyField]: { _eq: parent_id.value } },
              limit: -1,
            },
          }),
        ]);

        (catRes.data.data || []).forEach((cat: any) =>
          lookupData.value.categories.set(lookupKey(cat.id), cat),
        );
        (dateRes.data.data || []).forEach((date: any) =>
          lookupData.value.dates.set(lookupKey(date.id), date),
        );
      } catch (err) {
        console.error("[ToursPricesTable] Error fetching lookup data:", err);
      }
    };

    // ── Fetch per-language sell prices ───────────────────────────────────────

    const fetchPriceTranslations = async (priceIds: string[]) => {
      if (!translations_id.value || priceIds.length === 0) return;
      try {
        const { data } = await api.get(`/items/${props.translationsCollection}`, {
          params: {
            filter: {
              _and: [
                { [props.translationsFKField]: { _in: priceIds } },
                { [props.translationsLanguageField]: { _eq: translations_id.value } },
              ],
            },
            limit: -1,
          },
        });
        const translationMap = new Map<string, any>();
        data.data.forEach((t: any) => {
          const rpId =
            typeof t[props.translationsFKField] === "object"
              ? t[props.translationsFKField].id
              : t[props.translationsFKField];
          if (rpId) translationMap.set(rpId, t);
        });

        items.value = items.value.map((item) => {
          const translation = translationMap.get(item.id);
          return {
            ...item,
            [props.sellPriceField]: translation?.[props.sellPriceField] ?? item[props.sellPriceField],
            _translation_id: translation?.id ?? null,
          };
        });
        originalItems.value = JSON.parse(JSON.stringify(items.value));
      } catch (err) {
        console.error("[ToursPricesTable] Error fetching price translations:", err);
      }
    };

    // ── Fetch price items ────────────────────────────────────────────────────

    const fetchItems = async () => {
      if (!parent_id.value) return;
      loading.value = true;
      try {
        const filterValue = props.parentKeyField
          ? (props.values?.[props.parentKeyField] ?? parent_id.value)
          : parent_id.value;

        const { data } = await api.get(`/items/${props.relatedCollection}`, {
          params: {
            filter: { [props.foreignKeyField]: { _eq: filterValue } },
            limit: -1,
          },
        });

        items.value = data.data || [];
        await fetchPriceTranslations(items.value.map((i) => i.id));
        originalItems.value = JSON.parse(JSON.stringify(items.value));
        hasChanges.value = false;
      } catch (err) {
        console.error("[ToursPricesTable] Error fetching items:", err);
        items.value = [];
      } finally {
        loading.value = false;
      }
    };

    // ── Persist changes ──────────────────────────────────────────────────────

    const persistChanges = async () => {
      try {
        const updates: Promise<any>[] = [];

        // Create new placeholder items (no DB record yet)
        const newItems = items.value.filter((item: any) => item._isNew);
        newItems.forEach((item: any) => {
          updates.push(
            api.post(`/items/${props.relatedCollection}`, {
              [props.foreignKeyField]: parent_id.value,
              [props.groupByField]: item[props.groupByField],
              [props.rowField]: item[props.rowField],
              [props.columnField]: item[props.columnField],
              [props.buyPriceField]: item[props.buyPriceField] ?? 0,
            }),
          );
        });

        // Update changed existing items
        const changedItems = items.value.filter((item: any) => {
          if (item._isNew) return false;
          const orig = originalItems.value.find((o) => o.id === item.id);
          return (
            orig &&
            (orig[props.sellPriceField] !== item[props.sellPriceField] ||
              orig[props.buyPriceField] !== item[props.buyPriceField])
          );
        });

        changedItems.forEach((item) => {
          const orig = originalItems.value.find((o) => o.id === item.id);

          if (orig && orig[props.buyPriceField] !== item[props.buyPriceField]) {
            updates.push(
              api.patch(`/items/${props.relatedCollection}/${item.id}`, {
                [props.buyPriceField]: item[props.buyPriceField],
              }),
            );
          }

          if (orig && orig[props.sellPriceField] !== item[props.sellPriceField]) {
            if (item._translation_id) {
              updates.push(
                api.patch(`/items/${props.translationsCollection}/${item._translation_id}`, {
                  [props.sellPriceField]: item[props.sellPriceField],
                }),
              );
            } else {
              updates.push(
                api.post(`/items/${props.translationsCollection}`, {
                  [props.translationsFKField]: item.id,
                  [props.translationsLanguageField]: translations_id.value,
                  [props.sellPriceField]: item[props.sellPriceField],
                }),
              );
            }
          }
        });

        await Promise.all(updates);
        await fetchItems();
        hasChanges.value = false;
      } catch (err) {
        console.error("[ToursPricesTable] Save error:", err);
        alert("Failed to save changes.");
      }
    };

    // ── Sell price flow ──────────────────────────────────────────────────────

    const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

    const fetchSellPriceJobStatus = async () => {
      if (!parent_id.value) return null;
      const { data } = await api.get(`/items/${props.parentCollection}/${parent_id.value}`, {
        params: { fields: [props.sellStatusField, props.sellUpdatedAtField] },
      });
      sellPricesStatus.value = data.data?.[props.sellStatusField] ?? null;
      sellPricesUpdatedAt.value = data.data?.[props.sellUpdatedAtField] ?? null;
      return { status: sellPricesStatus.value, updatedAt: sellPricesUpdatedAt.value };
    };

    const calculateSellPrices = async () => {
      if (!parent_id.value) {
        alert("Save the record first before calculating sell prices.");
        return;
      }
      if (!props.calculateSellPricesFlowId) {
        alert("No flow ID configured. Set the 'Calculate Sell Prices Flow ID' in the interface options.");
        return;
      }

      calculatingSellPrices.value = true;
      try {
        saving.value = true;
        try { await persistChanges(); } finally { saving.value = false; }
        const requestStartedAt = Date.now();
        await api.post(`/flows/trigger/${props.calculateSellPricesFlowId}`, {
          collection: props.parentCollection,
          keys: [parent_id.value],
        });
        const timeoutMs = 60_000;
        while (Date.now() - requestStartedAt < timeoutMs) {
          await wait(1_000);
          const jobStatus = await fetchSellPriceJobStatus();
          const updatedAtMs = jobStatus?.updatedAt ? new Date(jobStatus.updatedAt).getTime() : null;
          if (jobStatus?.status === "done" && updatedAtMs !== null && updatedAtMs >= requestStartedAt) {
            await fetchItems();
            await fetchParentRecord();
            return;
          }
          if (jobStatus?.status === "failed") throw new Error("Sell price calculation failed.");
        }
        throw new Error("Sell price calculation timed out.");
      } catch (err) {
        alert("Failed to calculate sell prices.");
      } finally {
        calculatingSellPrices.value = false;
      }
    };

    const discardChanges = () => {
      items.value = JSON.parse(JSON.stringify(originalItems.value));
      hasChanges.value = false;
    };

    // ── Input handlers ───────────────────────────────────────────────────────

    const handleBuyPriceInput = (groupKey: string, rowId: string, colId: string, event: Event) => {
      const input = event.target as HTMLInputElement;
      const value = input.value === "" ? null : Number(input.value);
      const cell = getCell(groupKey, rowId, colId);
      if (cell?.id !== undefined || cell?._isNew) {
        cell[props.buyPriceField] = value;
        hasChanges.value = true;
      } else {
        // No price record yet — create a local placeholder so the user can edit immediately
        const newItem: Record<string, any> = {
          _isNew: true,
          [props.foreignKeyField]: parent_id.value,
          [props.groupByField]: groupKey,
          [props.rowField]: rowId,
          [props.columnField]: colId,
          [props.buyPriceField]: value,
        };
        items.value.push(newItem);
        hasChanges.value = true;
      }
    };

    // ── Computed table data ──────────────────────────────────────────────────

    const columns = computed(() => {
      const sf = props.occupancySortField || "sort";
      return Array.from(lookupData.value.occupancies.entries())
        .map(([id, occ]) => (occ ? { ...occ, id } : null))
        .filter(Boolean)
        .sort((a, b) => {
          const aVal = a[sf] ?? 0;
          const bVal = b[sf] ?? 0;
          const aNum = Number(aVal);
          const bNum = Number(bVal);
          if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
          const cmp = String(aVal).localeCompare(String(bVal));
          if (cmp !== 0) return cmp;
          return a.from_price ? -1 : 1;
        });
    });

    const rows = computed(() => {
      const ids = new Set<string>();
      items.value.forEach((item) => {
        if (item[props.rowField]) ids.add(item[props.rowField]);
      });
      const sf = props.rowSortField || "price_period_start";
      return Array.from(ids)
        .map((id) => lookupData.value.dates.get(lookupKey(id)))
        .filter(Boolean)
        .sort((a, b) => {
          const aVal = a[sf];
          const bVal = b[sf];
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          const aDate = new Date(aVal).getTime();
          const bDate = new Date(bVal).getTime();
          if (!isNaN(aDate) && !isNaN(bDate)) return aDate - bDate;
          return String(aVal).localeCompare(String(bVal));
        });
    });

    const groupedData = computed(() => {
      if (!props.groupByField) return { all: { items: items.value, rows: rows.value } };
      const groups: Record<string, any> = {};
      items.value.forEach((item) => {
        const key = item[props.groupByField];
        if (!key) return;
        if (!lookupData.value.categories.has(lookupKey(key))) return;
        if (!groups[key]) groups[key] = { items: [], rows: rows.value };
        groups[key].items.push(item);
      });
      return groups;
    });

    const orderedGroupedData = computed(() => {
      const groups = groupedData.value;
      if (props.groupSortField) {
        const sf = props.groupSortField;
        const ordered: Record<string, any> = {};
        Object.keys(groups)
          .sort((a, b) => {
            const aVal = lookupData.value.categories.get(a)?.[sf] ?? 0;
            const bVal = lookupData.value.categories.get(b)?.[sf] ?? 0;
            const aNum = Number(aVal);
            const bNum = Number(bVal);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            return String(aVal).localeCompare(String(bVal));
          })
          .forEach((key) => { ordered[key] = groups[key]; });
        return ordered;
      }
      if (!props.groupByField || categoryOrder.value.length === 0) return groups;
      const ordered: Record<string, any> = {};
      categoryOrder.value.forEach((id) => { if (groups[id]) ordered[id] = groups[id]; });
      Object.keys(groups).forEach((key) => { if (!ordered[key]) ordered[key] = groups[key]; });
      return ordered;
    });

    // ── Label helpers ────────────────────────────────────────────────────────

    const getGroupLabel = (key: string) => {
      if (key === "ungrouped") return "Ungrouped";
      const cat = lookupData.value.categories.get(key);
      return (
        cat?.[props.groupCategoryField]?.name ||
        cat?.name ||
        lookupData.value.dates.get(key)?.name ||
        key
      );
    };

    const getGroupFromPrice = (key: string): boolean => {
      if (!props.groupFromPriceField) return false;
      return !!lookupData.value.categories.get(key)?.[props.groupFromPriceField];
    };

    // ── Format helpers ───────────────────────────────────────────────────────

    const formatPrice = (value: any) => {
      if (value == null || isNaN(value)) return "—";
      return Number(value).toFixed(2);
    };

    const formatDateRange = (start?: string, end?: string) => {
      if (!start) return "";
      const format = (d: string) =>
        new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return end ? `${format(start)} – ${format(end)}` : format(start);
    };

    const toggleGroup = (groupKey: string) => {
      expandedGroups.value[groupKey] = !expandedGroups.value[groupKey];
    };

    // ── WebSocket auto-refresh ───────────────────────────────────────────────

    let ws: WebSocket | null = null;
    let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const getAccessToken = async (): Promise<string | null> => {
      try {
        const resp = await api.get("/ws-token");
        return resp.data?.token ?? null;
      } catch { return null; }
    };

    const connectWebSocket = async () => {
      if (!parent_id.value) return;
      const token = await getAccessToken();
      if (!token) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}/websocket?access_token=${token}`);
      ws.onopen = () => {
        // Subscribe to parent tour changes (sell_prices_status, etc.)
        ws!.send(JSON.stringify({
          type: "subscribe",
          collection: props.parentCollection,
          query: { filter: { id: { _eq: parent_id.value } }, fields: ["id"] },
        }));
        // Subscribe to tours_prices changes so external creates/deletes refresh the grid
        ws!.send(JSON.stringify({
          type: "subscribe",
          collection: props.relatedCollection,
          query: { filter: { [props.foreignKeyField]: { _eq: parent_id.value } }, fields: ["id"] },
        }));
      };
      ws.onmessage = async (event) => {
        let msg: any;
        try { msg = JSON.parse(event.data); } catch { return; }
        if (msg.type === "subscription" && msg.event === "update") {
          await fetchParentRecord();
          await fetchItems();
        }
        if (msg.type === "subscription" && (msg.event === "create" || msg.event === "delete")) {
          await fetchParentRecord();
          await fetchItems();
        }
      };
      ws.onclose = (event) => {
        ws = null;
        if (event.code !== 1000) wsReconnectTimer = setTimeout(connectWebSocket, 5000);
      };
      ws.onerror = () => { console.warn("[ToursPricesTable] WS: connection error"); };
    };

    const disconnectWebSocket = () => {
      if (wsReconnectTimer) { clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }
      if (ws) { ws.close(1000, "unmounted"); ws = null; }
    };

    // ── Lifecycle ────────────────────────────────────────────────────────────

    onMounted(async () => {
      await fetchTranslationInfo();
      await Promise.all([fetchLookupData(), fetchParentRecord()]);
      await fetchItems();
      connectWebSocket();
    });

    onUnmounted(() => { disconnectWebSocket(); });

    watch(orderedGroupedData, (newVal) => {
      Object.keys(newVal).forEach((key) => {
        if (expandedGroups.value[key] === undefined) expandedGroups.value[key] = true;
      });
    }, { immediate: true });

    watch(selectedTranslationId, async () => {
      const current = availableTranslations.value.find((t) => t.value === selectedTranslationId.value);
      if (current) {
        translations_id.value = current.lang_id;
        if (current.exchange_rate?.key) await fetchCurrencySymbols(current.exchange_rate.key);
        await fetchItems();
      }
    });

    watch(() => props.primaryKey, async () => {
      disconnectWebSocket();
      parent_id.value = null;
      translations_id.value = null;
      await fetchTranslationInfo();
      await fetchParentRecord();
      await fetchItems();
      connectWebSocket();
    });

    watch(items, () => {
      hasChanges.value = JSON.stringify(items.value) !== JSON.stringify(originalItems.value);
    }, { deep: true });

    return {
      loading,
      saving,
      calculatingSellPrices,
      hasChanges,
      items,
      availableTranslations,
      selectedTranslationId,
      buyCurrencySymbol,
      sellCurrencySymbol,
      orderedGroupedData,
      columns,
      expandedGroups,
      getGroupLabel,
      getGroupFromPrice,
      formatPrice,
      formatDateRange,
      getCell,
      isCellModified,
      handleBuyPriceInput,
      calculateSellPrices,
      discardChanges,
      toggleGroup,
      parent_id,
      translations_id,
      buyPriceField: props.buyPriceField,
      sellPriceField: props.sellPriceField,
      rowStartDateField: props.rowStartDateField,
      rowEndDateField: props.rowEndDateField,
      occupancyNameField: props.occupancyNameField,
    };
  },
});
</script>

<style scoped>
.tours-prices-table {
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
.context-header { margin-bottom: 0.75rem; }
.selector-field { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; }
.selector-label { font-weight: 600; color: var(--theme--foreground-subdued); white-space: nowrap; }
.save-bar { display: flex; align-items: center; justify-content: flex-start; padding: 0.5rem 0; margin-bottom: 1rem; }
.price-group {
  margin-bottom: 1rem;
  border-radius: var(--theme--border-radius);
  overflow: hidden;
  border: var(--theme--border-width) solid var(--theme--border-color);
}
.table-wrapper { overflow-x: auto; }
.prices-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; table-layout: fixed; }
col.col-label { width: 220px; }
col.col-price-type { width: 110px; }
col.col-price { width: 120px; }
.prices-table th,
.prices-table td {
  border: var(--theme--border-width) solid var(--theme--border-color);
  padding: 0.5rem 0.75rem;
  vertical-align: middle;
}
.group-header-cell {
  background: var(--theme--background-subdued);
  cursor: pointer;
  user-select: none;
  width: 320px;
  min-width: 200px;
  text-align: left;
  transition: background var(--fast) var(--transition);
}
.group-header-cell:hover {
  background: color-mix(in srgb, var(--theme--background-subdued), var(--theme--foreground-subdued) 15%);
}
.group-header-inner { display: flex; align-items: center; gap: 0.375rem; }
.accordion-icon { color: var(--theme--primary); flex-shrink: 0; transition: transform 0.2s ease; }
.accordion-icon.is-expanded { transform: rotate(180deg); }
.group-title { font-size: 0.875rem; font-weight: 600; color: var(--theme--primary); white-space: nowrap; }
.column-header {
  background: var(--theme--background-subdued);
  color: var(--theme--primary);
  font-weight: 600;
  font-size: 14px;
  text-align: center;
  min-width: 100px;
  white-space: nowrap;
}
.sticky-col { position: sticky; left: 0; z-index: 10; }
.row-label { background: var(--theme--background-normal); text-align: left; font-weight: 500; width: 220px; min-width: 160px; }
.row-label-content { display: flex; flex-direction: column; gap: 0.2rem; }
.date-range { color: var(--theme--foreground-subdued); font-weight: 400; font-size: 0.75rem; }
.label-col { background: var(--theme--banner--title--foreground); text-align: left; width: 110px; min-width: 100px; }
.price-labels { display: flex; flex-direction: column; gap: 0.375rem; }
.input-label { font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.25rem; white-space: nowrap; }
.buy-label { color: var(--theme--foreground); }
.sell-label { color: var(--theme--foreground-subdued); }
.price-cell { background: var(--theme--background-normal); padding: 0.5rem !important; min-width: 100px; }
.price-cell.has-changes { background: var(--theme--warning-background); border-color: var(--theme--warning); }
.price-inputs { display: flex; flex-direction: column; gap: 0.3rem; }
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
.cell-input:hover:not(:disabled) { border-color: var(--theme--primary); }
.cell-input:focus { outline: none; border-color: var(--theme--primary); box-shadow: 0 0 0 2px var(--theme--primary-background); }
.cell-input:disabled { background: var(--theme--background-subdued); color: var(--theme--foreground-subdued); opacity: 0.7; }
.price-display { text-align: center; font-size: 0.75rem; font-weight: 500; color: var(--theme--foreground-subdued); }
.empty-state-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 3rem 2rem; text-align: center; color: var(--theme--foreground-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-subdued);
}
.empty-icon { color: var(--theme--foreground-subdued); opacity: 0.5; }
.empty-title { margin: 0.75rem 0 0.375rem; font-size: 1rem; font-weight: 600; color: var(--theme--foreground); }
.empty-hint { margin: 0; font-size: 0.875rem; }
.button-bottom { margin-top: 1rem; margin-bottom: 0; }
.button-top { margin-top: 0; margin-bottom: 1rem; }
.row-cascade-enter-active {
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1);
  transition-delay: calc(var(--row-index) * 30ms);
}
.row-cascade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.row-cascade-enter-from { opacity: 0; transform: translateY(-10px); }
.row-cascade-leave-to { opacity: 0; transform: translateY(-5px); }
.from-price-wrapper { display: inline-flex; align-items: center; gap: 0.1em; white-space: nowrap; }
.from-price-icon { color: var(--theme--primary); vertical-align: middle; flex-shrink: 0; }
@media (max-width: 768px) { .sticky-col { position: static; } }
</style>
