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
      <div class="save-bar" v-if="buttonPosition === 'top'">
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
        <div class="group-header" @click="toggleGroup(groupKey)">
          <v-icon
            :name="expandedGroups[groupKey] ? 'expand_more' : 'chevron_right'"
            class="accordion-icon"
          />
          <h3 class="group-title">{{ getGroupLabel(groupKey) }}</h3>
          <span class="group-count"></span>
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
                        formatDateNumericRange(row.start_date, row.end_date)
                      }}</strong>
                      <small class="date-range">
                        {{ formatDateRange(row.start_date, row.end_date) }}
                      </small>
                    </div>
                  </td>

                  <td class="label-col">
                    <div class="price-labels">
                      <label class="input-label buy-label">
                        <v-icon name="shopping_cart" x-small />
                        Buy ({{ defaultBuyCurrencySymbol }})
                      </label>
                      <label class="input-label sell-label">
                        <v-icon name="sell" x-small />
                        Sell ({{ defaultSellCurrencySymbol }})
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
        <p class="empty-title">No prices configured yet</p>
        <p class="empty-hint">
          Add price dates, categories, and occupancies to see them here.
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
        from_price:
          relatedRecord.from_price ??
          relatedRecord.fromPrice ??
          junctionRow?.from_price ??
          junctionRow?.fromPrice ??
          false,
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
              fields: ["id", "name", "sharedId"],
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
              fields: ["id", "name", "sharedId"],
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
        console.log(
          "[RoomPricesTable/Direct] WS: token from /ws-token:",
          token ? token.slice(0, 20) + "..." : "null",
        );
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
        console.log(
          "[RoomPricesTable/Direct] WS: skipping connect — parent_id not resolved yet",
        );
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
      console.log("[RoomPricesTable/Direct] WS: connecting to", url);

      ws = new WebSocket(url);

      // With URL token auth, no handshake needed — subscribe immediately on open
      ws.onopen = () => {
        console.log(
          "[RoomPricesTable/Direct] WS: connected and authenticated via URL token",
        );
        ws!.send(
          JSON.stringify({
            type: "subscribe",
            collection: props.parentCollection,
            query: { filter: { id: { _eq: parent_id.value } }, fields: ["id"] },
          }),
        );
        console.log(
          "[RoomPricesTable/Direct] WS: subscribe sent for",
          props.parentCollection,
          "id:",
          parent_id.value,
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
          console.log(
            "[RoomPricesTable/Direct] WS: subscription confirmed for",
            props.parentCollection,
          );
        }

        if (msg.type === "subscription" && msg.event === "update") {
          console.log(
            "[RoomPricesTable/Direct] WS: update received — refreshing table",
          );
          await fetchParentRecord();
          await fetchItems();
          console.log(
            "[RoomPricesTable/Direct] WS: refresh complete. Items loaded:",
            items.value.length,
          );
        }
      };

      ws.onclose = (event) => {
        console.log(
          "[RoomPricesTable/Direct] WS: closed (code:",
          event.code,
          ")" + (event.code !== 1000 ? " — reconnecting in 5s" : ""),
        );
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
.button-bottom {
  margin-top: 1.5rem;
}
</style>
