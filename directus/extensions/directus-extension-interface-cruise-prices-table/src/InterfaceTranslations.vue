<template>
  <div class="cruise-prices-table">
    <div v-if="loading" class="loading">
      <v-progress-circular indeterminate />
      <p class="loading-text">Loading cruise prices...</p>
    </div>
    <div v-else>
      <!-- Context Selector for Cruise view -->
      <div
        v-if="
          collection === parentCollection && availableTranslations.length > 0
        "
        class="context-header"
      >
        <div class="selector-field">
          <span class="selector-label">Language:</span>
          <v-select
            v-model="selectedTranslationId"
            :items="availableTranslations"
            placeholder="Select language..."
            inline
          />
        </div>
      </div>

      <!-- Save Bar -->
      <div v-if="hasChanges" class="save-bar">
        <v-notice type="warning">You have unsaved changes</v-notice>
        <div class="save-actions">
          <v-button
            @click="calculateSellPrices"
            :loading="calculatingSellPrices"
            :disabled="disabled || saving || loading || !parent_id"
          >
            <v-icon name="functions" small left />
            Save & Calculate Sell Prices
          </v-button>
          <v-button @click="discardChanges" secondary :disabled="saving">
            <v-icon name="close" small left /> Discard
          </v-button>
        </div>
      </div>

      <!-- Groups (Accordion style) -->
      <div
        v-for="(group, groupKey) in orderedGroupedData"
        :key="groupKey"
        class="price-group"
      >
        <div class="group-header" @click="toggleGroup(groupKey)">
          <v-icon
            :name="expandedGroups[groupKey] ? 'expand_more' : 'chevron_right'"
            class="accordion-icon"
          />
          <h3 class="group-title">{{ getGroupLabel(groupKey) }}</h3>
        </div>

        <div v-if="expandedGroups[groupKey]" class="group-content">
          <div class="table-wrapper">
            <table class="prices-table">
              <thead>
                <tr>
                  <th class="row-header row-label sticky-col">
                    {{ getRowFieldLabel() }}
                  </th>
                  <th class="label-col">Price Type</th>
                  <th
                    v-for="col in columns"
                    :key="col.id"
                    class="column-header"
                  >
                    <div class="column-header-content">
                      <span class="col-name"
                        >{{ col.name
                        }}{{ col.from_price ? " (From)" : "" }}</span
                      >
                      <span class="col-value">[{{ col.value }}]</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in group.rows"
                  :key="`${groupKey}|${row.id}`"
                  class="data-row"
                >
                  <td class="row-label sticky-col">
                    <div class="row-label-content">
                      <strong>{{
                        row?.name ||
                        formatDateNumericRange(
                          row[rowStartDateField],
                          row[rowEndDateField],
                        )
                      }}</strong>
                      <small class="date-range">
                        {{
                          formatDateRange(
                            row[rowStartDateField],
                            row[rowEndDateField],
                          )
                        }}
                      </small>
                    </div>
                  </td>

                  <td class="label-col">
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

                  <td
                    v-for="col in columns"
                    :key="`${groupKey}|${row.id}|${col.id}`"
                    class="price-cell"
                    :class="{
                      'has-changes': isCellModified(groupKey, row.id, col.id),
                    }"
                  >
                    <div class="price-inputs">
                      <div class="input-group buy-group">
                        <input
                          :value="
                            getCell(groupKey, row.id, col.id)[buyPriceField]
                          "
                          type="number"
                          step="0.01"
                          class="cell-input buy-price-input"
                          placeholder="0.00"
                          :disabled="disabled"
                          @input="
                            handleBuyPriceInput(
                              groupKey,
                              row.id,
                              col.id,
                              $event,
                            )
                          "
                          @focus="($event.target as HTMLInputElement).select()"
                        />
                      </div>
                      <span class="price-display">
                        {{
                          formatPrice(
                            getCell(groupKey, row.id, col.id)[sellPriceField],
                          )
                        }}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="items.length === 0" class="empty-state">
        <v-icon name="inbox" large />
        <p class="empty-title">No cruise prices configured yet</p>
        <p class="empty-hint">
          Add price periods, cabin categories, and select occupancies to see
          them here.
        </p>
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
import { useApi, useStores } from "@directus/extensions-sdk";
import { nextTick } from "vue";

export default defineComponent({
  props: {
    value: { type: Array, default: () => [] },
    primaryKey: { type: [String, Number], default: null },
    collection: { type: String, required: true },
    field: { type: String, required: true },
    groupByField: { type: String, default: "cabin_category_id" },
    rowField: { type: String, default: "price_date_id" },
    columnField: { type: String, default: "cruise_occupancy_id" },
    editableFields: { type: Array, default: () => ["buy_price"] },
    disabled: { type: Boolean, default: false },
    values: { type: Object, default: () => ({}) },
    calculateSellPricesFlowId: { type: String, default: "" },
    // Related collection (prices)
    relatedCollection: { type: String, default: "cruise_prices" },
    foreignKeyField: { type: String, default: "cruise_id" },
    buyPriceField: { type: String, default: "buy_price" },
    // Parent record
    parentCollection: { type: String, default: "cruises" },
    parentKeyField: { type: String, default: "" },
    occupanciesField: { type: String, default: "cruise_occupancies" },
    occupancySourceMode: { type: String, default: "junction" },
    occupancyJunctionCollection: {
      type: String,
      default: "cruises_cruises_occupancies",
    },
    occupancyJunctionPrimaryKeyField: { type: String, default: "id" },
    occupancyJunctionParentField: { type: String, default: "cruises_id" },
    occupancyJunctionRelatedField: {
      type: String,
      default: "cruises_occupancies_id",
    },
    occupancyCollection: { type: String, default: "cruises_occupancies" },
    categoryOrderField: { type: String, default: "cabin_categories" },
    groupByCollection: { type: String, default: "cruises_cabins_categories" },
    groupByParentKeyField: {
      type: String,
      default: "cruises_cabins_categories",
    },
    enableChildCategories: { type: Boolean, default: false },
    rowCollection: { type: String, default: "cruises_price_dates" },
    rowStartDateField: { type: String, default: "departure_date" },
    rowEndDateField: { type: String, default: "arrival_date" },
    sellStatusField: { type: String, default: "sell_prices_status" },
    sellUpdatedAtField: { type: String, default: "sell_prices_updated_at" },
    // Junction collection
    junctionCollection: { type: String, default: "cruises_translations_1" },
    junctionParentKeyField: { type: String, default: "cruises_id" },
    junctionLanguageField: { type: String, default: "translations_id" },
    junctionExchangeRateField: { type: String, default: "exchange_rate" },
    // Translations collection (sell prices)
    translationsCollection: {
      type: String,
      default: "cruise_prices_translations",
    },
    translationsFKField: { type: String, default: "cruise_prices_id" },
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
  },

  emits: ["input"],

  setup(props, { emit }) {
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

    const lookupKey = (value: any) =>
      value === null || value === undefined ? "" : String(value);

    const addOccupancyLookup = (key: any, occupancy: any) => {
      const normalizedKey = lookupKey(key);
      if (!normalizedKey) return;
      lookupData.value.occupancies.set(normalizedKey, occupancy);
    };

    const normalizeOccupancyFromJunction = (junctionRow: any) => {
      const primaryKeyField = props.occupancyJunctionPrimaryKeyField || "id";
      const relatedField =
        props.occupancyJunctionRelatedField || "cruises_occupancies_id";
      const junctionId = junctionRow?.[primaryKeyField];
      const related = junctionRow?.[relatedField];
      const relatedRecord =
        related && typeof related === "object" ? related : {};

      return {
        ...relatedRecord,
        id: junctionId,
        junction_id: junctionId,
        original_id: relatedRecord.id ?? related ?? null,
        name:
          relatedRecord.name ?? junctionRow?.name ?? String(junctionId ?? ""),
        value: relatedRecord.value ?? junctionRow?.value ?? null,
        from_price:
          relatedRecord.from_price ??
          relatedRecord.fromPrice ??
          junctionRow?.from_price ??
          junctionRow?.fromPrice ??
          false,
      };
    };

    const parentRecord = ref<any>(null);
    const buyCurrencySymbol = ref<string>("");
    const sellCurrencySymbol = ref<string>("");
    const categoryOrder = ref<string[]>([]);
    const sellPricesStatus = ref<string | null>(null);
    const sellPricesUpdatedAt = ref<string | null>(null);

    const availableTranslations = ref<any[]>([]);
    const selectedTranslationId = ref<string | number | null>(null);

    const expandedGroups = ref<Record<string, boolean>>({});

    const cellMap = computed(() => {
      const map = new Map<string, any>();
      items.value.forEach((item) => {
        const g = String(item[props.groupByField] || "");
        const r = String(item[props.rowField] || "");
        const c = String(item[props.columnField] || "");
        const key = `${g}|${r}|${c}`;
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
      if (!current?.id) return false;

      const original = originalItems.value.find((o) => o.id === current.id);
      if (!original) return false;

      // Check buy_price (what user is editing)
      if (original[props.buyPriceField] !== current[props.buyPriceField]) {
        return true;
      }

      // Also check sell_price in case it changes elsewhere
      if (original[props.sellPriceField] !== current[props.sellPriceField]) {
        return true;
      }

      return false;
    };

    const fetchTranslationInfo = async () => {
      buyCurrencySymbol.value = props.defaultBuyCurrencySymbol;
      sellCurrencySymbol.value = props.defaultSellCurrencySymbol;

      // 1. Parent collection context (placed directly on cruises)
      if (props.collection === props.parentCollection) {
        if (!props.primaryKey || props.primaryKey === "+") {
          const pathParts = window.location.pathname.split("/");
          const parentIdx = pathParts.indexOf(props.parentCollection);
          if (
            parentIdx !== -1 &&
            pathParts[parentIdx + 1] &&
            pathParts[parentIdx + 1] !== "+"
          ) {
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
              filter: {
                [props.junctionParentKeyField]: { _eq: parent_id.value },
              },
              fields: [
                "id",
                `${props.junctionLanguageField}.id`,
                `${props.junctionLanguageField}.name`,
                props.junctionExchangeRateField,
              ],
            },
          });

          availableTranslations.value = data.data.map((t: any) => ({
            text:
              t[props.junctionLanguageField]?.name ||
              t[props.junctionLanguageField]?.id ||
              "Unknown",
            value: t.id,
            exchange_rate: t[props.junctionExchangeRateField],
            lang_id: t[props.junctionLanguageField]?.id,
          }));

          if (availableTranslations.value.length > 0) {
            if (!selectedTranslationId.value) {
              selectedTranslationId.value =
                availableTranslations.value[0].value;
            }
            const current = availableTranslations.value.find(
              (t) => t.value === selectedTranslationId.value,
            );
            if (current) {
              translations_id.value = current.lang_id;
              if (current.exchange_rate?.key) {
                await fetchCurrencySymbols(current.exchange_rate.key);
              }
            }
          }
        } catch (err) {
          console.error(
            "[CruisePricesTable] Error fetching junction records:",
            err,
          );
        }
        return;
      }

      // 2. Junction collection context (placed on cruises_translations_1)
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
                typeof props.values[props.junctionExchangeRateField] ===
                "object"
                  ? props.values[props.junctionExchangeRateField].key
                  : props.values[props.junctionExchangeRateField];
              if (rateKey) await fetchCurrencySymbols(rateKey);
            }

            if (
              !translations_id.value &&
              props.primaryKey &&
              props.primaryKey !== "+"
            ) {
              // Continue to API fetch below
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

        if (!props.primaryKey || props.primaryKey === "+") {
          return;
        }

        try {
          const parentField =
            props.parentKeyField ||
            props.junctionParentKeyField ||
            "cruises_id";
          const { data } = await api.get(
            `/items/${props.junctionCollection}/${props.primaryKey}`,
            {
              params: {
                fields: [
                  parentField,
                  props.junctionLanguageField,
                  props.junctionExchangeRateField,
                ],
              },
            },
          );

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
          console.error(
            "[CruisePricesTable] Error fetching junction record:",
            err,
          );
        }
      }
    };

    const fetchCurrencySymbols = async (rateKey: string) => {
      try {
        const exchangeRateRes = await api.get(
          `/items/${props.ratesCollection}/${rateKey}`,
        );
        const [fromRes, toRes] = await Promise.all([
          api.get(
            `/items/${props.currenciesCollection}/${exchangeRateRes.data.data[props.fromCurrencyField]}`,
          ),
          api.get(
            `/items/${props.currenciesCollection}/${exchangeRateRes.data.data[props.toCurrencyField]}`,
          ),
        ]);
        buyCurrencySymbol.value =
          fromRes?.data?.data?.[props.currencySymbolField] ||
          props.defaultBuyCurrencySymbol;
        sellCurrencySymbol.value =
          toRes?.data?.data?.[props.currencySymbolField] ||
          props.defaultSellCurrencySymbol;
      } catch (err) {
        console.error(
          "[CruisePricesTable] Error fetching currency symbols:",
          err,
        );
      }
    };

    const fetchOccupanciesFromJunction = async () => {
      if (!parent_id.value || !props.occupancyJunctionCollection) return false;

      const primaryKeyField = props.occupancyJunctionPrimaryKeyField || "id";
      const parentField =
        props.occupancyJunctionParentField || props.foreignKeyField;
      const relatedField =
        props.occupancyJunctionRelatedField || "cruises_occupancies_id";

      const { data } = await api.get(
        `/items/${props.occupancyJunctionCollection}`,
        {
          params: {
            fields: [
              primaryKeyField,
              parentField,
              relatedField,
              `${relatedField}.id`,
              `${relatedField}.name`,
              `${relatedField}.value`,
              `${relatedField}.from_price`,
            ],
            filter: {
              [parentField]: { _eq: parent_id.value },
            },
            limit: -1,
          },
        },
      );

      const rows = data?.data || [];
      const originalIds = rows
        .map((row: any) => row?.[relatedField])
        .filter((value: any) => value && typeof value !== "object");
      const originalLookup = new Map<string, any>();

      if (originalIds.length > 0 && props.occupancyCollection) {
        const originalRes = await api.get(
          `/items/${props.occupancyCollection}`,
          {
            params: {
              fields: ["id", "name", "value", "from_price"],
              filter: { id: { _in: [...new Set(originalIds)] } },
              limit: -1,
            },
          },
        );
        (originalRes.data?.data || []).forEach((occupancy: any) => {
          originalLookup.set(lookupKey(occupancy.id), occupancy);
        });
      }

      rows.forEach((row: any) => {
        const related = row?.[relatedField];
        const hydratedRow =
          related &&
          typeof related !== "object" &&
          originalLookup.has(lookupKey(related))
            ? { ...row, [relatedField]: originalLookup.get(lookupKey(related)) }
            : row;
        const occupancy = normalizeOccupancyFromJunction(hydratedRow);
        addOccupancyLookup(
          occupancy.original_id ?? row[primaryKeyField],
          occupancy,
        );
      });

      return rows.length > 0;
    };

    const fetchCruiseAndRates = async () => {
      if (!parent_id.value) return;
      try {
        const cruiseRes = await api.get(
          `/items/${props.parentCollection}/${parent_id.value}`,
          {
            params: {
              fields: [
                "*",
                props.categoryOrderField,
                props.sellStatusField,
                props.sellUpdatedAtField,
                `${props.occupanciesField}.*`,
              ],
            },
          },
        );
        parentRecord.value = cruiseRes.data.data;
        sellPricesStatus.value =
          parentRecord.value[props.sellStatusField] ?? null;
        sellPricesUpdatedAt.value =
          parentRecord.value[props.sellUpdatedAtField] ?? null;
        if (Array.isArray(parentRecord.value[props.categoryOrderField])) {
          categoryOrder.value = parentRecord.value[
            props.categoryOrderField
          ].map((cat: any) => (typeof cat === "string" ? cat : cat.id || cat));
        }
        lookupData.value.occupancies = new Map();
        if (Array.isArray(parentRecord.value[props.occupanciesField])) {
          parentRecord.value[props.occupanciesField].forEach((occ: any) => {
            if (occ.id) addOccupancyLookup(occ.id, occ);
          });
        }
        if (
          props.occupancySourceMode === "junction" ||
          props.occupancySourceMode === "auto"
        ) {
          try {
            await fetchOccupanciesFromJunction();
          } catch (junctionErr) {
            if (props.occupancySourceMode === "junction") {
              console.error(
                "[CruisePricesTable] Error fetching occupancy junction collection:",
                junctionErr,
              );
            }
          }
        }
      } catch (err) {
        console.error("[CruisePricesTable] Error fetching parent record:", err);
      }
    };

    const fetchLookupData = async () => {
      if (!parent_id.value) return;
      try {
        const parentKeyField =
          props.groupByParentKeyField || props.foreignKeyField;

        const catFields = props.enableChildCategories
          ? ["id", "name", "sharedId"]
          : ["id", "cabin_categories"];
        const [baseCatRes, dateRes] = await Promise.all([
          api.get(`/items/${props.groupByCollection}`, {
            params: {
              filter: { [parentKeyField]: { _eq: parent_id.value } },
              fields: catFields,
              limit: -1,
            },
          }),
          api.get(`/items/${props.rowCollection}`, { params: { limit: -1 } }),
        ]);

        const parentCats = baseCatRes.data.data || [];

        parentCats.forEach((cat: any) =>
          lookupData.value.categories.set(String(cat.id), cat),
        );

        // Only fetch child/shared categories when enabled (hotel pattern, not cruise)
        if (props.enableChildCategories) {
          const parentCategoryIds = parentCats
            .map((cat: any) => cat.id)
            .filter(Boolean);

          if (parentCategoryIds.length) {
            const childRes = await api.get(
              `/items/${props.groupByCollection}`,
              {
                params: {
                  filter: {
                    sharedId: { _in: parentCategoryIds },
                    id: { _nin: parentCategoryIds },
                  },
                  fields: ["id", "name", "sharedId"],
                  limit: -1,
                },
              },
            );
            const childCats = childRes.data.data || [];

            childCats.forEach((cat: any) =>
              lookupData.value.categories.set(String(cat.id), cat),
            );
          }
        }

        const dates = dateRes.data.data || [];
        dates.forEach((date: any) =>
          lookupData.value.dates.set(String(date.id), date),
        );
      } catch (err) {
        console.error("[CruisePricesTable] Error fetching lookup data:", err);
      }
    };

    const fetchPriceTranslations = async (priceIds: string[]) => {
      if (!translations_id.value || priceIds.length === 0) return;
      try {
        const { data } = await api.get(
          `/items/${props.translationsCollection}`,
          {
            params: {
              filter: {
                _and: [
                  { [props.translationsFKField]: { _in: priceIds } },
                  {
                    [props.translationsLanguageField]: {
                      _eq: translations_id.value,
                    },
                  },
                ],
              },
              limit: -1,
            },
          },
        );
        const translationMap = new Map<string, any>();
        data.data.forEach((t: any) => {
          const rpId =
            typeof t[props.translationsFKField] === "object"
              ? t[props.translationsFKField].id
              : t[props.translationsFKField];
          if (rpId) translationMap.set(String(rpId), t);
        });

        items.value = items.value.map((item) => {
          const translation = translationMap.get(String(item.id));
          return {
            ...item,
            [props.sellPriceField]:
              translation?.[props.sellPriceField] ?? item[props.sellPriceField],
            _translation_id: translation?.id ?? null,
          };
        });
        originalItems.value = JSON.parse(JSON.stringify(items.value));
      } catch (err) {
        console.error(
          "[CruisePricesTable] Error fetching price translations:",
          err,
        );
      }
    };

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

        await fetchPriceTranslations(items.value.map((i) => String(i.id)));
        originalItems.value = JSON.parse(JSON.stringify(items.value));
        hasChanges.value = false;
      } catch (err) {
        console.error("[CruisePricesTable] Error fetching items:", err);
        items.value = [];
      } finally {
        loading.value = false;
      }
    };

    const persistChanges = async () => {
      if (!hasChanges.value) return;
      try {
        const changedItems = items.value.filter((item) => {
          const orig = originalItems.value.find((o) => o.id === item.id);
          return (
            orig &&
            (orig[props.sellPriceField] !== item[props.sellPriceField] ||
              orig[props.buyPriceField] !== item[props.buyPriceField])
          );
        });

        const updates: Promise<any>[] = [];

        changedItems.forEach((item) => {
          const orig = originalItems.value.find((o) => o.id === item.id);

          if (orig && orig[props.buyPriceField] !== item[props.buyPriceField]) {
            updates.push(
              api.patch(`/items/${props.relatedCollection}/${item.id}`, {
                [props.buyPriceField]: item[props.buyPriceField],
              }),
            );
          }

          if (
            orig &&
            orig[props.sellPriceField] !== item[props.sellPriceField]
          ) {
            if (item._translation_id) {
              updates.push(
                api.patch(
                  `/items/${props.translationsCollection}/${item._translation_id}`,
                  {
                    [props.sellPriceField]: item[props.sellPriceField],
                  },
                ),
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
        console.error("[CruisePricesTable] Save error:", err);
        alert("Failed to save changes.");
      }
    };

    const wait = (ms: number) =>
      new Promise((resolve) => window.setTimeout(resolve, ms));

    const fetchSellPriceJobStatus = async () => {
      if (!parent_id.value) return null;

      const { data } = await api.get(
        `/items/${props.parentCollection}/${parent_id.value}`,
        {
          params: {
            fields: [props.sellStatusField, props.sellUpdatedAtField],
          },
        },
      );

      sellPricesStatus.value = data.data?.[props.sellStatusField] ?? null;
      sellPricesUpdatedAt.value = data.data?.[props.sellUpdatedAtField] ?? null;

      return {
        status: sellPricesStatus.value,
        updatedAt: sellPricesUpdatedAt.value,
      };
    };

    const calculateSellPrices = async () => {
      if (!parent_id.value) {
        alert("Save the record first before calculating sell prices.");
        return;
      }
      if (!props.calculateSellPricesFlowId) {
        alert(
          "No flow ID configured. Set the 'Calculate Sell Prices Flow ID' in the interface options.",
        );
        return;
      }

      calculatingSellPrices.value = true;

      try {
        if (hasChanges.value) {
          saving.value = true;
          try {
            await persistChanges();
          } finally {
            saving.value = false;
          }
        }

        const requestStartedAt = Date.now();

        await api.post(`/flows/trigger/${props.calculateSellPricesFlowId}`, {
          collection: props.parentCollection,
          keys: [parent_id.value],
        });

        const timeoutMs = 60_000;
        const pollIntervalMs = 1_000;

        while (Date.now() - requestStartedAt < timeoutMs) {
          await wait(pollIntervalMs);

          const jobStatus = await fetchSellPriceJobStatus();
          const updatedAtMs = jobStatus?.updatedAt
            ? new Date(jobStatus.updatedAt).getTime()
            : null;

          if (
            jobStatus?.status === "done" &&
            updatedAtMs !== null &&
            updatedAtMs >= requestStartedAt
          ) {
            await fetchItems();
            await fetchCruiseAndRates();
            return;
          }

          if (jobStatus?.status === "failed") {
            throw new Error("Sell price calculation failed.");
          }
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

    const handleBuyPriceInput = (
      groupKey: string,
      rowId: string,
      colId: string,
      event: Event,
    ) => {
      const input = event.target as HTMLInputElement;
      const value = input.value === "" ? null : Number(input.value);

      const lookupKey = `${groupKey}|${rowId}|${colId}`;
      const cell = getCell(groupKey, rowId, colId);

      if (cell?.id !== undefined) {
        cell.buy_price = value;
        hasChanges.value = true;
      } else {
        console.warn(
          "[CruisePricesTable] cell NOT found — key mismatch. lookupKey:",
          lookupKey,
          "available keys:",
          Array.from(cellMap.value.keys()),
        );
      }
    };
    const columns = computed(() => {
      return Array.from(lookupData.value.occupancies.entries())
        .map(([id, occ]) => (occ ? { ...occ, id } : null))
        .filter(Boolean)
        .sort((a, b) => {
          if (a.value !== b.value) return (a.value || 0) - (b.value || 0);
          return a.from_price ? -1 : 1;
        });
    });

    const rows = computed(() => {
      const ids = new Set<string>();
      items.value.forEach((item) => {
        if (item[props.rowField]) ids.add(String(item[props.rowField]));
      });

      const result = Array.from(ids)
        .map((id) => lookupData.value.dates.get(id))
        .filter(Boolean)
        .sort((a, b) => {
          const aDate = a[props.rowStartDateField];
          const bDate = b[props.rowStartDateField];
          if (!aDate) return 1;
          if (!bDate) return -1;
          return new Date(aDate).getTime() - new Date(bDate).getTime();
        });

      return result;
    });

    const groupedData = computed(() => {
      if (!props.groupByField) {
        return { all: { items: items.value, rows: rows.value } };
      }

      const groups: Record<string, any> = {};

      items.value.forEach((item) => {
        const rawKey = item[props.groupByField];
        if (!rawKey) return;
        const key = String(rawKey);
        if (!lookupData.value.categories.has(key)) {
          console.warn(
            `[CruisePricesTable] Category ${key} not found in lookupData. Available keys:`,
            Array.from(lookupData.value.categories.keys()),
          );
          return;
        }
        if (!groups[key]) groups[key] = { items: [], rows: rows.value };
        groups[key].items.push(item);
      });

      return groups;
    });

    const orderedGroupedData = computed(() => {
      const groups = groupedData.value;

      if (!props.groupByField || categoryOrder.value.length === 0) {
        return groups;
      }

      const ordered: Record<string, any> = {};

      categoryOrder.value.forEach((id) => {
        if (groups[id]) ordered[id] = groups[id];
      });

      Object.keys(groups).forEach((key) => {
        if (!ordered[key]) ordered[key] = groups[key];
      });

      return ordered;
    });

    const getGroupLabel = (key: string) => {
      if (key === "ungrouped") return "Ungrouped";
      const cat = lookupData.value.categories.get(key);
      if (cat) return cat.name || cat.cabin_categories || key;
      const date = lookupData.value.dates.get(key);
      if (date) return date.name || key;
      return key;
    };

    const getRowFieldLabel = () => {
      return props.rowField
        .replace(/_id$/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const formatPrice = (value: any) => {
      if (value == null || isNaN(value)) return "—";
      return Number(value).toFixed(2);
    };

    const formatDateRange = (start?: string, end?: string) => {
      if (!start) return "";
      const format = (d: string) =>
        new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      return end ? `${format(start)} – ${format(end)}` : format(start);
    };

    const formatDateNumericRange = (start?: string, end?: string) => {
      if (!start) return "";
      const format = (d: string) => {
        if (!d || typeof d !== "string") return "";
        const parts = d.split("-");
        if (parts.length !== 3) return d;
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
      };
      return end ? `${format(start)} - ${format(end)}` : format(start);
    };

    const toggleGroup = (groupKey: string) => {
      expandedGroups.value[groupKey] = !expandedGroups.value[groupKey];
    };

    // ── WebSocket auto-refresh ────────────────────────────────────────────────

    let ws: WebSocket | null = null;
    let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const getAccessToken = async (): Promise<string | null> => {
      try {
        const resp = await api.get("/ws-token");
        return resp.data?.token ?? null;
      } catch (err) {
        console.warn("[CruisePricesTable] WS: /ws-token request failed —", err);
        return null;
      }
    };

    const connectWebSocket = async () => {
      if (!parent_id.value) return;

      const token = await getAccessToken();
      if (!token) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/websocket?access_token=${token}`;

      ws = new WebSocket(url);

      ws.onopen = () => {
        ws!.send(
          JSON.stringify({
            type: "subscribe",
            collection: props.parentCollection,
            query: { filter: { id: { _eq: parent_id.value } }, fields: ["id"] },
          }),
        );
      };

      ws.onmessage = async (event) => {
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        if (msg.type === "subscription" && msg.event === "update") {
          await fetchCruiseAndRates();
          await fetchItems();
        }
      };

      ws.onclose = (event) => {
        ws = null;
        if (event.code !== 1000) {
          wsReconnectTimer = setTimeout(connectWebSocket, 5000);
        }
      };

      ws.onerror = () => {
        console.warn("[CruisePricesTable] WS: connection error");
      };
    };

    const disconnectWebSocket = () => {
      if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
      }
      if (ws) {
        ws.close(1000, "unmounted");
        ws = null;
      }
    };

    onMounted(async () => {
      await fetchTranslationInfo();
      await Promise.all([fetchLookupData(), fetchCruiseAndRates()]);
      await fetchItems();
      connectWebSocket();
    });

    onUnmounted(() => {
      disconnectWebSocket();
    });

    watch(
      orderedGroupedData,
      (newVal) => {
        Object.keys(newVal).forEach((key) => {
          if (expandedGroups.value[key] === undefined) {
            expandedGroups.value[key] = true;
          }
        });
      },
      { immediate: true },
    );

    watch(selectedTranslationId, async () => {
      const current = availableTranslations.value.find(
        (t) => t.value === selectedTranslationId.value,
      );
      if (current) {
        translations_id.value = current.lang_id;
        if (current.exchange_rate?.key) {
          await fetchCurrencySymbols(current.exchange_rate.key);
        }
        await fetchItems();
      }
    });

    watch(
      items,
      () => {
        const changed =
          JSON.stringify(items.value) !== JSON.stringify(originalItems.value);

        hasChanges.value = changed;
      },
      { deep: true },
    );

    watch(
      () => props.primaryKey,
      async () => {
        disconnectWebSocket();
        parent_id.value = null;
        translations_id.value = null;
        await fetchTranslationInfo();
        await fetchCruiseAndRates();
        await fetchItems();
        connectWebSocket();
      },
    );

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
      getRowFieldLabel,
      formatPrice,
      formatDateRange,
      formatDateNumericRange,
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
      parentCollection: props.parentCollection,
      collection: props.collection,
    };
  },
});
</script>

<style scoped>
.cruise-prices-table {
  width: 100%;
  color: var(--theme--foreground);
  font-size: 0.9375rem;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 2rem;
  color: var(--theme--foreground-subdued);
  gap: 1.25rem;
}

.context-header {
  margin-bottom: 1rem;
}

.selector-field {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.selector-label {
  font-weight: 600;
  color: var(--theme--foreground-subdued);
  font-size: 0.875rem;
}

.save-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  background: var(--theme--warning-background);
  border: var(--theme--border-width) solid var(--theme--warning);
  border-radius: var(--theme--border-radius);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.save-bar .v-notice {
  flex: 1;
  margin: 0;
  background: transparent;
  border: none;
  color: var(--theme--warning);
}

.save-actions {
  display: flex;
  gap: 0.75rem;
}

.price-group {
  margin-bottom: 1.75rem;
  border-radius: var(--theme--border-radius);
  overflow: hidden;
  border: var(--theme--border-width) solid var(--theme--border-color);
  background: var(--theme--background-page);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--theme--background-normal);
  cursor: pointer;
  user-select: none;
  transition: background var(--fast) var(--transition);
}

.group-header:hover {
  background: color-mix(
    in srgb,
    var(--theme--background-normal),
    var(--theme--foreground-subdued) 20%
  );
}

.accordion-icon {
  color: var(--theme--foreground-subdued);
  font-size: 1.25rem;
}

.group-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--theme--foreground-accent);
  flex: 1;
}

.group-content {
  background: var(--theme--background-page);
}

.table-wrapper {
  overflow-x: auto;
}

.prices-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.prices-table th,
.prices-table td {
  border: var(--theme--border-width) solid var(--theme--border-color);
  padding: 0.75rem 1rem;
  vertical-align: middle;
}

.prices-table thead th {
  background: var(--theme--background-subdued);
  font-weight: 600;
  color: var(--theme--foreground-accent);
  font-size: 1rem;
  letter-spacing: 0.4px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.sticky-col {
  position: sticky;
  left: 0;
  z-index: 20;
  background: var(--theme--background-normal) !important;
}

.row-header {
  text-align: left !important;
  font-weight: 600;
  min-width: 180px;
  background: var(--theme--background-normal) !important;
  font-size: 1.125rem;
}

.row-label {
  text-align: left !important;
  font-weight: 500;
  background-color: var(--background-normal);
  min-width: 180px;
}

.row-label-content {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.label-col {
  min-width: 140px;
  background: var(--theme--background-subdued) !important;
  text-align: left !important;
}

.column-header {
  background: color-mix(
    in srgb,
    var(--theme--background-normal),
    var(--theme--foreground-subdued) 20%
  ) !important;
  color: var(--theme--foreground-accent) !important;
  font-weight: 600;
  min-width: 110px;
}

.column-header-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.col-name {
  font-size: 1rem !important;
}

.col-value {
  font-size: 0.8rem !important;
  opacity: 0.8;
}

.data-row:hover {
  background: var(--theme--background-normal);
}

.price-cell {
  padding: 0.5rem !important;
}

.price-cell.has-changes {
  background: var(--theme--warning-background);
  border-color: var(--theme--warning);
}

.price-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
}

.input-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--theme--foreground-subdued);
  letter-spacing: 0.4px;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.buy-label {
  color: var(--theme--foreground);
}

.sell-label {
  color: var(--theme--foreground-subdued);
}

.cell-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--form--field--input--background);
  color: var(--theme--foreground);
  font-size: 0.9375rem;
  text-align: center;
  transition: all var(--fast) var(--transition);
}

.cell-input:hover:not(:disabled) {
  border-color: var(--theme--primary);
}

.cell-input:focus {
  outline: none;
  border-color: var(--theme--primary);
  box-shadow: 0 0 0 3px var(--theme--primary-background);
}

.cell-input:disabled {
  background: var(--theme--background-subdued);
  color: var(--theme--foreground-subdued);
  opacity: 0.7;
}

.price-display {
  text-align: center;
  font-weight: 500;
}

.empty-state {
  padding: 6rem 2rem;
  text-align: center;
  color: var(--theme--foreground-subdued);
}

.empty-title {
  margin: 1rem 0 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--theme--foreground);
}

.empty-hint {
  margin: 0;
  font-size: 0.9375rem;
}

@media (max-width: 768px) {
  .save-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .save-actions {
    flex-direction: column;
  }

  .sticky-col {
    position: static;
  }
}
</style>
