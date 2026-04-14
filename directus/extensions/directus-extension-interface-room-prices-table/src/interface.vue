<template>
  <div class="room-prices-table">
    <div v-if="loading" class="loading">
      <v-progress-circular indeterminate />
      <p class="loading-text">Loading room prices...</p>
    </div>

    <div v-else class="table-container">
      <!-- Save Bar -->
      <div v-if="hasChanges" class="save-bar">
        <v-notice type="warning">You have unsaved changes</v-notice>
        <div class="save-actions">
          <v-button @click="saveChanges" :loading="saving" :disabled="disabled">
            <v-icon name="save" small left /> Save Changes
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
          <span class="group-count">{{ group.items.length }} prices</span>
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
                      <span class="col-name">{{ col.name }}</span>
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
                      <strong>{{ row.name }}</strong>
                      <small v-if="row.start_date" class="date-range">
                        {{ formatDateRange(row.start_date, row.end_date) }}
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
                          :value="getCell(groupKey, row.id, col.id).buy_price"
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
                          @focus="$event.target.select()"
                        />
                      </div>

                      <div class="input-group sell-group">
                        <div class="readonly-value">
                          <span class="price-display">
                            {{
                              formatPrice(
                                getCellValue(
                                  group.items,
                                  row.id,
                                  col.id,
                                  "sell_price",
                                ).value,
                              )
                            }}
                          </span>
                        </div>
                      </div>
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
        <p class="empty-title">No room prices configured yet</p>
        <p class="empty-hint">
          Add price dates, room categories, and occupancies to see them here.
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted } from "vue";
import { useApi } from "@directus/extensions-sdk";

export default defineComponent({
  props: {
    value: { type: Array, default: () => [] },
    primaryKey: { type: [String, Number], default: null },
    collection: { type: String, required: true },
    field: { type: String, required: true },
    groupByField: { type: String, default: "room_category_id" },
    rowField: { type: String, default: "price_date_id" },
    columnField: { type: String, default: "occupancy_id" },
    editableFields: { type: Array, default: () => ["buy_price", "sell_price"] },
    disabled: { type: Boolean, default: false },
  },

  emits: ["input"],

  setup(props, { emit }) {
    const api = useApi();

    const loading = ref(false);
    const saving = ref(false);
    const items = ref<any[]>([]);
    const originalItems = ref<any[]>([]);
    const hasChanges = ref(false);

    const relationInfo = ref<any>(null);
    const lookupData = ref<{
      categories: Map<string, any>;
      dates: Map<string, any>;
      occupancies: Map<string, any>;
    }>({
      categories: new Map(),
      dates: new Map(),
      occupancies: new Map(),
    });

    const hotel = ref<any>(null);
    const buyCurrencySymbol = ref<string>("€");
    const sellCurrencySymbol = ref<string>("$");
    const roomCategoryOrder = ref<string[]>([]);

    // Accordion state
    const expandedGroups = ref<Record<string, boolean>>({});

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
      if (!current.id) return false;
      const original = originalItems.value.find((o) => o.id === current.id);
      return original && original.buy_price !== current.buy_price;
    };

    const fetchHotelAndRates = async () => {
      if (!props.primaryKey) return;
      try {
        const hotelRes = await api.get(
          `/items/demo_hotel/${props.primaryKey}`,
          {
            params: { fields: ["*", "room_categories"] },
          },
        );

        hotel.value = hotelRes.data.data;

        if (Array.isArray(hotel.value.room_categories)) {
          roomCategoryOrder.value = hotel.value.room_categories.map(
            (cat: any) => (typeof cat === "string" ? cat : cat.id || cat),
          );
        }

        if (hotel.value?.exchange_rate?.key) {
          const exchangeRateRes = await api.get(
            `/items/rates/${hotel.value.exchange_rate.key}`,
          );

          const [fromRes, toRes] = await Promise.all([
            api.get(
              `/items/currencies/${exchangeRateRes.data.data.from_currency}`,
            ),
            api.get(
              `/items/currencies/${exchangeRateRes.data.data.to_currency}`,
            ),
          ]);

          buyCurrencySymbol.value = fromRes?.data?.data?.symbol || "€";
          sellCurrencySymbol.value = toRes?.data?.data?.symbol || "$";
        }
      } catch (err) {
        console.error("Error fetching hotel/currencies:", err);
      }
    };

    const fetchRelationInfo = async () => {
      try {
        const { data } = await api.get("/relations");
        const relation = data.data.find(
          (r: any) =>
            r.meta?.one_collection === props.collection &&
            r.meta?.one_field === props.field,
        );

        relationInfo.value = relation
          ? {
              collection: relation.collection,
              field: relation.field,
            }
          : {
              collection: "room_prices",
              field: "hotel_id",
            };
      } catch (err) {
        console.error("Relation fetch error:", err);
        relationInfo.value = { collection: "room_prices", field: "hotel_id" };
      }
    };

    const fetchLookupData = async () => {
      try {
        const [catRes, dateRes, occRes] = await Promise.all([
          api.get("/items/room_categories", { params: { limit: -1 } }),
          api.get("/items/price_dates", { params: { limit: -1 } }),
          api.get("/items/occupancies", { params: { limit: -1 } }),
        ]);

        catRes.data.data.forEach((cat: any) =>
          lookupData.value.categories.set(cat.id, cat),
        );
        dateRes.data.data.forEach((date: any) =>
          lookupData.value.dates.set(date.id, date),
        );
        occRes.data.data.forEach((occ: any) =>
          lookupData.value.occupancies.set(occ.id, occ),
        );
      } catch (err) {
        console.error("Lookup data error:", err);
      }
    };

    const fetchItems = async () => {
      if (!props.primaryKey) return;

      loading.value = true;
      try {
        const collection = relationInfo.value?.collection || "room_prices";
        const field = relationInfo.value?.field || "hotel_id";

        const { data } = await api.get(`/items/${collection}`, {
          params: {
            filter: { [field]: { _eq: props.primaryKey } },
            limit: -1,
          },
        });

        items.value = data.data || [];
        originalItems.value = JSON.parse(JSON.stringify(items.value));
        hasChanges.value = false;
      } catch (err) {
        console.error("Items fetch error:", err);
        items.value = [];
      } finally {
        loading.value = false;
      }
    };

    const saveChanges = async () => {
      if (!hasChanges.value) return;
      saving.value = true;

      try {
        const collection = relationInfo.value?.collection || "room_prices";

        const updates = items.value
          .filter((item) => {
            const orig = originalItems.value.find((o) => o.id === item.id);
            return orig && orig.buy_price !== item.buy_price;
          })
          .map((item) =>
            api.patch(`/items/${collection}/${item.id}`, {
              buy_price: item.buy_price,
            }),
          );

        await Promise.all(updates);
        await fetchItems();
        hasChanges.value = false;
      } catch (err) {
        console.error("Save error:", err);
        alert("Failed to save changes.");
      } finally {
        saving.value = false;
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
      const cell = getCell(groupKey, rowId, colId);

      if (cell?.id !== undefined) {
        cell.buy_price = value;
        hasChanges.value = true;
      }
    };

    const columns = computed(() => {
      const ids = new Set<string>();
      items.value.forEach((item) => {
        if (item[props.columnField]) ids.add(item[props.columnField]);
      });

      return Array.from(ids)
        .map((id) => lookupData.value.occupancies.get(id))
        .filter(Boolean)
        .sort((a, b) => (a.value || 0) - (b.value || 0));
    });

    const rows = computed(() => {
      const ids = new Set<string>();
      items.value.forEach((item) => {
        if (item[props.rowField]) ids.add(item[props.rowField]);
      });

      return Array.from(ids)
        .map((id) => lookupData.value.dates.get(id))
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
        );
    });

    const groupedData = computed(() => {
      if (!props.groupByField) {
        return { all: { items: items.value, rows: rows.value } };
      }

      const groups: Record<string, any> = {};

      items.value.forEach((item) => {
        const key = item[props.groupByField] || "ungrouped";
        if (!groups[key]) groups[key] = { items: [], rows: rows.value };
        groups[key].items.push(item);
      });

      return groups;
    });

    const orderedGroupedData = computed(() => {
      const groups = groupedData.value;

      if (
        !props.groupByField ||
        props.groupByField !== "room_category_id" ||
        roomCategoryOrder.value.length === 0
      ) {
        return groups;
      }

      const ordered: Record<string, any> = {};

      roomCategoryOrder.value.forEach((id) => {
        if (groups[id]) ordered[id] = groups[id];
      });

      Object.keys(groups).forEach((key) => {
        if (!ordered[key]) ordered[key] = groups[key];
      });

      return ordered;
    });

    const getGroupLabel = (key: string) => {
      if (key === "ungrouped") return "Ungrouped";
      if (props.groupByField === "room_category_id") {
        return lookupData.value.categories.get(key)?.name || key;
      }
      if (props.groupByField === "price_date_id") {
        return lookupData.value.dates.get(key)?.name || key;
      }
      return key;
    };

    const getRowFieldLabel = () => {
      return props.rowField === "price_date_id"
        ? "Price Date"
        : "Room Category";
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

    const getCellValue = (
      groupItems: any[],
      rowId: string,
      colId: string,
      field: string,
    ) => {
      const item = groupItems.find(
        (i) => i[props.rowField] === rowId && i[props.columnField] === colId,
      );
      return { value: item?.[field] ?? "", item };
    };

    // Accordion control
    const toggleGroup = (groupKey: string) => {
      expandedGroups.value[groupKey] = !expandedGroups.value[groupKey];
    };

    onMounted(async () => {
      await fetchRelationInfo();
      await fetchLookupData();
      await fetchHotelAndRates();
      await fetchItems();

      // Expand all groups by default
      Object.keys(orderedGroupedData.value).forEach((key) => {
        expandedGroups.value[key] = true;
      });
    });

    watch(
      () => props.primaryKey,
      async () => {
        await fetchHotelAndRates();
        await fetchItems();
      },
    );

    watch(
      items,
      () => {
        hasChanges.value =
          JSON.stringify(items.value) !== JSON.stringify(originalItems.value);
      },
      { deep: true },
    );

    return {
      loading,
      saving,
      hasChanges,
      items,
      buyCurrencySymbol,
      sellCurrencySymbol,
      orderedGroupedData,
      columns,
      expandedGroups,
      getGroupLabel,
      getRowFieldLabel,
      formatPrice,
      formatDateRange,
      getCellValue,
      getCell,
      isCellModified,
      handleBuyPriceInput,
      saveChanges,
      discardChanges,
      toggleGroup,
    };
  },
});
</script>

<style scoped>
.room-prices-table {
  width: 100%;
  /* font-family: var(--theme--fonts--sans--font-family); */
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

.group-count {
  font-size: 0.8125rem;
  color: var(--theme--foreground-accent);
  background: var(--theme--background-subdued);
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
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
  /* text-transform: uppercase; */
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
  /* text-transform: uppercase; */
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
  /* font-family: var(--theme--fonts--monospace--font-family); */
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

.readonly-value {
  padding: 0.5rem 0.75rem;
  background: var(--theme--background-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme--foreground-subdued);
  /* font-family: var(--theme--fonts--monospace--font-family); */
}

.price-display {
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

/* Responsive */
@media (max-width: 768px) {
  .save-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .save-actions {
    flex-direction: column;
  }

  /* .sticky-col {
    position: static;
  } */
}
</style>
