<template>
  <div class="room-prices-table">
    <div v-if="loading" class="loading">
      <v-progress-circular indeterminate />
      <p class="loading-text">Loading prices...</p>
    </div>
    <div v-else>
      <!-- Save Bar -->
      <!-- <div v-if="hasChanges" class="save-bar">
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
      </div> -->
      <!-- Save Bar -->
      <div class="save-bar button-top" v-if="buttonPosition === 'top'">
        <v-button
          @click="calculateSellPrices"
          :loading="calculatingSellPrices"
          :disabled="disabled || saving || loading || !parent_id || !hasChanges"
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
              <col
                v-for="col in columns"
                :key="'cg-' + col.id"
                class="col-price"
              />
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
                        >(<v-icon
                          :name="fromPriceSymbol"
                          small
                          class="from-price-icon"
                        />)</span
                      >
                    </span>
                  </div>
                </th>
                <th v-for="col in columns" :key="col.id" class="column-header">
                  {{ col.name }}
                  [{{ col.value }}]
                  <span
                    v-if="fromPriceSymbol && col.from_price"
                    class="from-price-wrapper"
                    >(<v-icon
                      :name="fromPriceSymbol"
                      small
                      class="from-price-icon"
                    />)</span
                  >
                </th>
              </tr>
            </thead>
            <TransitionGroup tag="tbody" name="row-cascade">
              <tr
                v-for="(row, rowIndex) in expandedGroups[groupKey]
                  ? group.rows
                  : []"
                :key="`${groupKey}|${row.id}`"
                class="data-row"
                :style="{ '--row-index': Math.min(Number(rowIndex), 8) }"
              >
                <td class="row-label sticky-col">
                  <div class="row-label-content">
                    <strong
                      v-if="row?.name && !isDateRangeName(row.name)"
                      class="date-name"
                      >{{ row.name }}
                    </strong>
                    <small class="date-range">
                      {{ formatDateRange(row.start_date, row.end_date) }}
                      <span
                        v-if="
                          fromPriceSymbol &&
                          rowFromPriceField &&
                          row[rowFromPriceField]
                        "
                        class="from-price-wrapper"
                        >(<v-icon
                          :name="fromPriceSymbol"
                          small
                          class="from-price-icon"
                        />)</span
                      >
                    </small>
                  </div>
                </td>
                <td class="label-col">
                  <div class="price-labels">
                    <label class="input-label buy-label">
                      <v-icon name="shopping_cart" x-small />
                      {{ buyLabel || "Buy" }} ({{ defaultBuyCurrencySymbol }})
                    </label>
                    <label class="input-label sell-label">
                      <v-icon name="sell" x-small />
                      {{ sellLabel || "Sell" }} ({{
                        defaultSellCurrencySymbol
                      }})
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
                    <input
                      :value="getCell(groupKey, row.id, col.id)[buyPriceField]"
                      type="number"
                      step="0.01"
                      class="cell-input"
                      placeholder="0.00"
                      :disabled="disabled"
                      @input="
                        handleBuyPriceInput(groupKey, row.id, col.id, $event)
                      "
                      @focus="($event.target as HTMLInputElement).select()"
                    />
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
            </TransitionGroup>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="items.length === 0" class="empty-state-card">
        <v-icon name="inbox" large class="empty-icon" />
        <p class="empty-title">
          {{ emptyStateTitle || "No prices configured yet" }}
        </p>
        <p class="empty-hint">
          {{
            emptyStateHint ||
            "Add price dates, categories, and occupancies to see them here."
          }}
        </p>
      </div>

      <div class="save-bar button-bottom" v-if="buttonPosition === 'bottom'">
        <v-button
          @click="calculateSellPrices"
          :loading="calculatingSellPrices"
          :disabled="disabled || saving || loading || !parent_id || !hasChanges"
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
import { isValid, parse } from "date-fns";

export default defineComponent({
  props: {
    label: { type: String, default: null },
    buttonPosition: { type: String, default: "bottom" },
    value: { type: Array, default: () => [] },
    primaryKey: { type: [String, Number], default: null },
    collection: { type: String, required: true },
    field: { type: String, required: true },
    groupByField: { type: String, default: "room_category_id" },
    rowField: { type: String, default: "price_date_id" },
    columnField: { type: String, default: "room_occupancy_id" },
    editableFields: { type: Array, default: () => ["buy_price"] },
    disabled: { type: Boolean, default: false },
    values: { type: Object, default: () => ({}) },
    calculateSellPricesFlowId: { type: String, default: "" },
    // Related collection (prices)
    relatedCollection: { type: String, default: "room_prices" },
    foreignKeyField: { type: String, default: "hotel_id" },
    buyPriceField: { type: String, default: "buy_price" },
    sellPriceField: { type: String, default: "sell_price" },
    // Parent record
    parentCollection: { type: String, default: "hotels" },
    parentKeyField: { type: String, default: "" },
    occupanciesField: { type: String, default: "room_occupancies" },
    occupancySourceMode: { type: String, default: "auto" },
    occupancyJunctionCollection: {
      type: String,
      default: "hotels_occupancies",
    },
    occupancyJunctionPrimaryKeyField: { type: String, default: "id" },
    occupancyJunctionParentField: { type: String, default: "hotels_id" },
    occupancyJunctionRelatedField: { type: String, default: "occupancies_id" },
    occupancyCollection: { type: String, default: "occupancies" },
    categoryOrderField: { type: String, default: "room_categories" },
    groupByCollection: { type: String, default: "room_categories" },
    rowCollection: { type: String, default: "price_dates" },
    sellStatusField: { type: String, default: "sell_prices_status" },
    sellUpdatedAtField: { type: String, default: "sell_prices_updated_at" },
    // Currency (display only — no exchange rate lookup in direct mode)
    defaultBuyCurrencySymbol: { type: String, default: "€" },
    defaultSellCurrencySymbol: { type: String, default: "$" },
    fromPriceSymbol: { type: String, default: "" },
    groupFromPriceField: { type: String, default: "price_start" },
    occupancyFromPriceField: { type: String, default: "from_price" },
    rowFromPriceField: { type: String, default: "from_price" },
    occupancySortField: { type: String, default: "value" },
    rowSortField: { type: String, default: "start_date" },
    groupSortField: { type: String, default: "" },
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
    const parentRecord = ref<any>(null);
    const roomCategoryOrder = ref<string[]>([]);
    const sellPricesStatus = ref<string | null>(null);
    const sellPricesUpdatedAt = ref<string | null>(null);
    const expandedGroups = ref<Record<string, boolean>>({});

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
        props.occupancyJunctionRelatedField || "occupancies_id";
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
        from_price: props.occupancyFromPriceField
          ? (relatedRecord[props.occupancyFromPriceField] ??
            junctionRow?.[props.occupancyFromPriceField] ??
            false)
          : false,
      };
    };

    // ── Resolve parent ID ────────────────────────────────────────────────────

    const resolveParentId = () => {
      if (props.primaryKey && props.primaryKey !== "+") {
        parent_id.value = props.primaryKey as string;
        return;
      }
      // New record — try URL fallback
      const pathParts = window.location.pathname.split("/");
      const idx = pathParts.indexOf(props.parentCollection);
      if (idx !== -1 && pathParts[idx + 1] && pathParts[idx + 1] !== "+") {
        parent_id.value = pathParts[idx + 1];
      }
    };

    // ── Fetch parent record (occupancies + category order) ───────────────────

    const fetchOccupanciesFromJunction = async () => {
      if (!parent_id.value || !props.occupancyJunctionCollection) return false;

      const primaryKeyField = props.occupancyJunctionPrimaryKeyField || "id";
      const parentField =
        props.occupancyJunctionParentField || props.foreignKeyField;
      const relatedField =
        props.occupancyJunctionRelatedField || "occupancies_id";

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
              ...(props.occupancyFromPriceField
                ? [`${relatedField}.${props.occupancyFromPriceField}`]
                : []),
              ...(props.occupancySortField &&
              props.occupancySortField !== "value"
                ? [`${relatedField}.${props.occupancySortField}`]
                : []),
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
              fields: [
                "id",
                "name",
                "value",
                ...(props.occupancyFromPriceField
                  ? [props.occupancyFromPriceField]
                  : []),
                ...(props.occupancySortField &&
                props.occupancySortField !== "value"
                  ? [props.occupancySortField]
                  : []),
              ],
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
        addOccupancyLookup(row[primaryKeyField], occupancy);
      });

      return rows.length > 0;
    };

    const fetchParentRecord = async () => {
      if (!parent_id.value) return;
      try {
        const { data } = await api.get(
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
        parentRecord.value = data.data;
        sellPricesStatus.value =
          parentRecord.value[props.sellStatusField] ?? null;
        sellPricesUpdatedAt.value =
          parentRecord.value[props.sellUpdatedAtField] ?? null;

        if (Array.isArray(parentRecord.value[props.categoryOrderField])) {
          roomCategoryOrder.value = parentRecord.value[
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
                "[RoomPricesTable/Direct] Error fetching occupancy junction collection:",
                junctionErr,
              );
            }
          }
        }
      } catch (err) {
        console.error(
          "[RoomPricesTable/Direct] Error fetching parent record:",
          err,
        );
      }
    };

    // ── Fetch lookup data (categories + row labels) ──────────────────────────

    const fetchLookupData = async () => {
      if (!parent_id.value) return;
      try {
        const [catRes, dateRes] = await Promise.all([
          api.get(`/items/${props.groupByCollection}`, {
            params: {
              filter: { hotel_id: { _eq: parent_id.value } },
              fields: [
                "id",
                "name",
                "sharedId",
                ...(props.groupFromPriceField
                  ? [props.groupFromPriceField]
                  : []),
                ...(props.groupSortField &&
                !["id", "name", "sharedId", props.groupFromPriceField].includes(
                  props.groupSortField,
                )
                  ? [props.groupSortField]
                  : []),
              ],
              limit: -1,
            },
          }),
          api.get(`/items/${props.rowCollection}`, { params: { limit: -1 } }),
        ]);

        const parentCats = catRes.data.data || [];
        parentCats.forEach((cat: any) =>
          lookupData.value.categories.set(cat.id, cat),
        );

        const parentCategoryIds = parentCats
          .map((cat: any) => cat.id)
          .filter(Boolean);
        if (parentCategoryIds.length) {
          const childRes = await api.get(`/items/${props.groupByCollection}`, {
            params: {
              filter: {
                sharedId: { _in: parentCategoryIds },
                id: { _nin: parentCategoryIds },
              },
              fields: [
                "id",
                "name",
                "sharedId",
                ...(props.groupFromPriceField
                  ? [props.groupFromPriceField]
                  : []),
                ...(props.groupSortField &&
                !["id", "name", "sharedId", props.groupFromPriceField].includes(
                  props.groupSortField,
                )
                  ? [props.groupSortField]
                  : []),
              ],
              limit: -1,
            },
          });
          (childRes.data.data || []).forEach((cat: any) =>
            lookupData.value.categories.set(cat.id, cat),
          );
        }

        dateRes.data.data.forEach((date: any) =>
          lookupData.value.dates.set(date.id, date),
        );
      } catch (err) {
        console.error(
          "[RoomPricesTable/Direct] Error fetching lookup data:",
          err,
        );
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
        originalItems.value = JSON.parse(JSON.stringify(items.value));
        hasChanges.value = false;
      } catch (err) {
        console.error("[RoomPricesTable/Direct] Error fetching items:", err);
        items.value = [];
      } finally {
        loading.value = false;
      }
    };

    // ── Persist changes ──────────────────────────────────────────────────────

    const persistChanges = async () => {
      if (!hasChanges.value) return;
      try {
        const updates: Promise<any>[] = [];
        items.value.forEach((item) => {
          const orig = originalItems.value.find((o) => o.id === item.id);
          if (!orig) return;
          const buyChanged =
            orig[props.buyPriceField] !== item[props.buyPriceField];
          const sellChanged =
            orig[props.sellPriceField] !== item[props.sellPriceField];
          if (buyChanged || sellChanged) {
            const patch: Record<string, any> = {};
            if (buyChanged)
              patch[props.buyPriceField] = item[props.buyPriceField];
            if (sellChanged)
              patch[props.sellPriceField] = item[props.sellPriceField];
            updates.push(
              api.patch(`/items/${props.relatedCollection}/${item.id}`, patch),
            );
          }
        });
        await Promise.all(updates);
        await fetchItems();
        hasChanges.value = false;
      } catch (err) {
        console.error("[RoomPricesTable/Direct] Save error:", err);
        alert("Failed to save changes.");
      }
    };

    const discardChanges = () => {
      items.value = JSON.parse(JSON.stringify(originalItems.value));
      hasChanges.value = false;
    };

    // ── Sell price flow ──────────────────────────────────────────────────────

    const wait = (ms: number) =>
      new Promise((resolve) => window.setTimeout(resolve, ms));

    const fetchSellPriceJobStatus = async () => {
      if (!parent_id.value) return null;
      const { data } = await api.get(
        `/items/${props.parentCollection}/${parent_id.value}`,
        {
          params: { fields: [props.sellStatusField, props.sellUpdatedAtField] },
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
        while (Date.now() - requestStartedAt < timeoutMs) {
          await wait(1_000);
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
            await fetchParentRecord();
            return;
          }
          if (jobStatus?.status === "failed")
            throw new Error("Sell price calculation failed.");
        }
        throw new Error("Sell price calculation timed out.");
      } catch (err) {
        alert("Failed to calculate sell prices.");
      } finally {
        calculatingSellPrices.value = false;
      }
    };

    // ── Input handlers ───────────────────────────────────────────────────────

    const handleBuyPriceInput = (
      groupKey: string,
      rowId: string,
      colId: string,
      event: Event,
    ) => {
      const value = (event.target as HTMLInputElement).value;
      const cell = getCell(groupKey, rowId, colId);
      if (cell?.id !== undefined) {
        cell[props.buyPriceField] = value === "" ? null : Number(value);
        hasChanges.value = true;
      }
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

    const getCell = (groupKey: string, rowId: string, colId: string) =>
      cellMap.value.get(`${groupKey}|${rowId}|${colId}`) || {};

    const isCellModified = (groupKey: string, rowId: string, colId: string) => {
      const current = getCell(groupKey, rowId, colId);
      if (!current.id) return false;
      const original = originalItems.value.find((o) => o.id === current.id);
      return (
        original &&
        (original[props.buyPriceField] !== current[props.buyPriceField] ||
          original[props.sellPriceField] !== current[props.sellPriceField])
      );
    };

    // ── Computed table data ──────────────────────────────────────────────────

    const columns = computed(() => {
      const sf = props.occupancySortField || "value";
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
      const sf = props.rowSortField || "start_date";
      return Array.from(ids)
        .map((id) => lookupData.value.dates.get(id))
        .filter(Boolean)
        .sort((a, b) => {
          const aVal = a[sf];
          const bVal = b[sf];
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          const aNum = Number(aVal);
          const bNum = Number(bVal);
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          const aDate = new Date(aVal).getTime();
          const bDate = new Date(bVal).getTime();
          if (!isNaN(aDate) && !isNaN(bDate)) return aDate - bDate;
          return String(aVal).localeCompare(String(bVal));
        });
    });

    const groupedData = computed(() => {
      if (!props.groupByField)
        return { all: { items: items.value, rows: rows.value } };
      const groups: Record<string, any> = {};
      items.value.forEach((item) => {
        const key = item[props.groupByField];
        if (!key) return;
        if (!lookupData.value.categories.has(key)) return;
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
          .forEach((key) => {
            ordered[key] = groups[key];
          });
        return ordered;
      }
      if (!props.groupByField || roomCategoryOrder.value.length === 0)
        return groups;
      const ordered: Record<string, any> = {};
      roomCategoryOrder.value.forEach((id) => {
        if (groups[id]) ordered[id] = groups[id];
      });
      Object.keys(groups).forEach((key) => {
        if (!ordered[key]) ordered[key] = groups[key];
      });
      return ordered;
    });

    // ── Label helpers ────────────────────────────────────────────────────────

    const getGroupLabel = (key: string) => {
      if (key === "ungrouped") return "Ungrouped";
      return (
        lookupData.value.categories.get(key)?.name ||
        lookupData.value.dates.get(key)?.name ||
        key
      );
    };

    const getGroupFromPrice = (key: string): boolean => {
      if (!props.groupFromPriceField) return false;
      return !!lookupData.value.categories.get(key)?.[
        props.groupFromPriceField
      ];
    };

    const getRowFieldLabel = () =>
      props.rowField
        .replace(/_id$/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    // ── Format helpers ───────────────────────────────────────────────────────

    const formatPrice = (value: any) => {
      if (value == null || isNaN(value)) return "—";
      return Number(value).toFixed(2);
    };

    const formatDateRange = (start?: string, end?: string) => {
      if (!start) return "";
      const fmt = (d: string) =>
        new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
    };

    const isDateRangeName = (name: string): boolean => {
      const parts = name.split(/\s*[-–]\s*/);
      if (parts.length !== 2) return false;
      const ref = new Date(2000, 0, 1);
      return parts.every((p) => isValid(parse(p.trim(), "dd.MM.yyyy", ref)));
    };

    const formatDateNumericRange = (start?: string, end?: string) => {
      if (!start) return "";
      const fmt = (d: string) => {
        if (!d || typeof d !== "string") return "";
        const parts = d.split("-");
        return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : d;
      };
      return end ? `${fmt(start)} - ${fmt(end)}` : fmt(start);
    };

    const toggleGroup = (groupKey: string) => {
      expandedGroups.value[groupKey] = !expandedGroups.value[groupKey];
    };

    // ── Lifecycle ────────────────────────────────────────────────────────────

    // ── WebSocket auto-refresh ───────────────────────────────────────────────

    let ws: WebSocket | null = null;
    let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const getAccessToken = async (): Promise<string | null> => {
      try {
        const resp = await api.get("/ws-token");
        const token = resp.data?.token ?? null;

        return token;
      } catch (err) {
        console.warn(
          "[RoomPricesTable/Direct] WS: /ws-token request failed —",
          err,
        );
        return null;
      }
    };

    const connectWebSocket = async () => {
      if (!parent_id.value) {
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        console.warn(
          "[RoomPricesTable/Direct] WS: cannot connect — no token returned from /ws-token",
        );
        return;
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/websocket?access_token=${token}`;

      ws = new WebSocket(url);

      // With URL token auth, no handshake needed — subscribe immediately on open
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

        if (msg.type === "subscription" && msg.status === "ok") {
        }

        if (msg.type === "subscription" && msg.event === "update") {
          await fetchParentRecord();
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
        console.warn("[RoomPricesTable/Direct] WS: connection error");
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
      resolveParentId();
      await Promise.all([fetchLookupData(), fetchParentRecord()]);
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
          if (expandedGroups.value[key] === undefined)
            expandedGroups.value[key] = true;
        });
      },
      { immediate: true },
    );

    watch(
      () => props.primaryKey,
      async () => {
        disconnectWebSocket();
        parent_id.value = null;
        resolveParentId();
        await fetchParentRecord();
        await fetchItems();
        connectWebSocket();
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
      calculatingSellPrices,
      hasChanges,
      items,
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
      isDateRangeName,
      getGroupFromPrice,
      parent_id,
      buyPriceField: props.buyPriceField,
      sellPriceField: props.sellPriceField,
    };
  },
});
</script>

<style scoped>
.room-prices-table {
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
.price-group {
  margin-bottom: 1rem;
  border-radius: var(--theme--border-radius);
  overflow: hidden;
  border: var(--theme--border-width) solid var(--theme--border-color);
}
.table-wrapper {
  overflow-x: auto;
}
.prices-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
  table-layout: fixed;
}
col.col-label {
  width: 220px;
}
col.col-price-type {
  width: 110px;
}
col.col-price {
  width: 120px;
}
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
  background: color-mix(
    in srgb,
    var(--theme--background-subdued),
    var(--theme--foreground-subdued) 15%
  );
}
.group-header-inner {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.accordion-icon {
  color: var(--theme--primary);
  flex-shrink: 0;
  transition: transform 0.2s ease;
}
.accordion-icon.is-expanded {
  transform: rotate(180deg);
}
.group-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme--primary);
  white-space: nowrap;
}
.column-header {
  background: var(--theme--background-subdued);
  color: var(--theme--primary);
  font-weight: 600;
  font-size: 14px;
  text-align: center;
  min-width: 100px;
  white-space: nowrap;
}
.sticky-col {
  position: sticky;
  left: 0;
  z-index: 10;
}
.row-label {
  background: var(--theme--background-normal);
  text-align: left;
  font-weight: 500;
  width: 220px;
  min-width: 160px;
}
.row-label-content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.date-range {
  color: var(--theme--foreground-subdued);
  font-weight: 400;
  font-size: 0.75rem;
}
.date-name {
  color: var(--theme--foreground-accent);
  font-weight: 600;
  font-size: 0.75rem;
}
.label-col {
  background: var(--theme--banner--title--foreground);
  text-align: left;
  width: 110px;
  min-width: 100px;
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
.price-cell {
  background: var(--theme--background-normal);
  padding: 0.5rem !important;
  min-width: 100px;
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
.button-bottom {
  margin-top: 1rem;
  margin-bottom: 0;
}
.button-top {
  margin-top: 0;
  margin-bottom: 1rem;
}
.row-cascade-enter-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1);
  transition-delay: calc(var(--row-index) * 30ms);
}
.row-cascade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.row-cascade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.row-cascade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
.from-price-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 0.1em;
  white-space: nowrap;
}
.from-price-icon {
  color: var(--theme--primary);
  vertical-align: middle;
  flex-shrink: 0;
}
@media (max-width: 768px) {
  .sticky-col {
    position: static;
  }
}
</style>
