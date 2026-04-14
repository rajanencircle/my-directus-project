<template>
  <div class="pivoted-o2m">
    <v-notice v-if="!relatedCollection" center icon="block">
      This interface must be used on a One-to-Many (O2M / alias) field
    </v-notice>

    <div v-else class="content">
      <v-button small secondary @click="refresh">↻ Refresh</v-button>

      <div v-if="loading" class="loading">Loading data...</div>
      <div v-else-if="error" class="error">{{ error }}</div>

      <div v-else>
        <div v-for="group in grouped" :key="group.key" class="group-section">
          <h4 class="group-title">{{ group.title || "(no group)" }}</h4>

          <table class="pivot-table">
            <thead>
              <tr>
                <th rowspan="2" class="row-header">Price Date</th>
                <th
                  v-for="col in group.columns"
                  :key="col.id"
                  :colspan="valueFields.length"
                  class="column-header"
                >
                  {{ col.display }}
                </th>
              </tr>
              <tr>
                <template v-for="col in group.columns" :key="col.id">
                  <th
                    v-for="vf in valueFields"
                    :key="`${col.id}-${vf}`"
                    class="sub-header"
                  >
                    {{ vf.replace("_", " ") }}
                  </th>
                </template>
              </tr>
            </thead>
            <tbody>
              <!-- <tr v-for="row in group.rows" :key="row.id">
                <td class="row-cell">{{ row.display }}</td>
                <td
                  v-for="col in group.columns"
                  v-for="vf in valueFields"
                  :key="`${row.id}-${col.id}-${vf}`"
                  class="value-cell"
                >
                  <input
                    v-if="group.matrix[row.id]?.[col.id]"
                    v-model.number="group.matrix[row.id][col.id][vf]"
                    type="number"
                    step="0.01"
                    min="0"
                    class="price-input"
                    @blur="
                      saveValue(
                        group.matrix[row.id][col.id].id,
                        vf,
                        group.matrix[row.id][col.id][vf],
                      )
                    "
                  />
                  <span v-else class="missing">—</span>
                </td>
              </tr> -->
              <tr v-for="row in group.rows" :key="row.id">
                <td class="row-cell">{{ row.display }}</td>

                <template v-for="col in group.columns" :key="col.id">
                  <td
                    v-for="vf in valueFields"
                    :key="`${row.id}-${col.id}-${vf}`"
                    class="value-cell"
                  >
                    <input
                      v-if="group.matrix[row.id]?.[col.id]"
                      v-model.number="group.matrix[row.id][col.id][vf]"
                      type="number"
                      step="0.01"
                      min="0"
                      class="price-input"
                      @blur="
                        saveValue(
                          group.matrix[row.id][col.id].id,
                          vf,
                          group.matrix[row.id][col.id][vf],
                        )
                      "
                    />
                    <span v-else class="missing">—</span>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useApi, useRelationsStore } from "@directus/extensions-sdk";

const props = defineProps({
  collection: String,
  field: String,
  primaryKey: [String, Number],
  value: Array, // the array of related primary keys (O2M delivers this)
  relatedPrimaryKeyField: String,
  relation: Object,
  options: Object,
});

const api = useApi();
const relationsStore = useRelationsStore();

const loading = ref(false);
const error = ref(null);
const items = ref([]); // flat list of room_prices with relations

// Options with defaults
const groupByPath = computed(
  () => props.options?.groupBy || "room_category_id.name",
);
const rowPath = computed(() => props.options?.rowField || "price_date_id.name");
const columnPath = computed(
  () => props.options?.columnField || "occupancy_id.name",
);
const valueFields = computed(() =>
  (props.options?.valueFields || "buy_price,sell_price")
    .split(",")
    .map((s) => s.trim()),
);
const rowSortPath = computed(
  () => props.options?.rowSort || "price_date_id.start_date",
);
const columnSortPath = computed(
  () => props.options?.columnSort || "occupancy_id.value",
);

const relatedCollection = computed(() => {
  return props.relation?.o2m?.collection || null;
});

const getNested = (obj, path) => {
  if (!path) return null;
  return path
    .split(".")
    .reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
};

const getDisplay = (item, path) => {
  const base = path.split(".")[0];
  const related = item[base];
  if (!related) return "—";

  if (base === "price_date_id") {
    return `${related.name || ""} (${related.start_date} – ${related.end_date})`.trim();
  }
  if (base === "occupancy_id") {
    return `${related.name || ""} (${related.value || "?"})`.trim();
  }
  if (base === "room_category_id") {
    return related.name || "—";
  }
  return getNested(item, path) ?? "—";
};

const grouped = computed(() => {
  if (!items.value.length) return [];

  const map = new Map();

  items.value.forEach((item) => {
    const groupKey = getNested(item, groupByPath.value) ?? "(no group)";
    const groupTitle = getDisplay(item, groupByPath.value);

    if (!map.has(groupKey)) {
      map.set(groupKey, {
        key: groupKey,
        title: groupTitle,
        rows: [],
        columns: [],
        rowMap: new Map(),
        colMap: new Map(),
        matrix: {}, // rowId → colId → { id, buy_price, sell_price, ... }
      });
    }

    const g = map.get(groupKey);

    // Row
    const rowId = getNested(item, rowPath.value.split(".")[0] + ".id");
    if (rowId && !g.rowMap.has(rowId)) {
      g.rowMap.set(rowId, {
        id: rowId,
        display: getDisplay(item, rowPath.value),
        sortValue: getNested(item, rowSortPath.value) || "",
      });
    }

    // Column
    const colId = getNested(item, columnPath.value.split(".")[0] + ".id");
    if (colId && !g.colMap.has(colId)) {
      g.colMap.set(colId, {
        id: colId,
        display: getDisplay(item, columnPath.value),
        sortValue: getNested(item, columnSortPath.value) || 0,
      });
    }

    // Matrix
    if (rowId && colId) {
      if (!g.matrix[rowId]) g.matrix[rowId] = {};
      g.matrix[rowId][colId] = {
        id: item.id,
        ...valueFields.value.reduce(
          (acc, f) => ({ ...acc, [f]: item[f] ?? null }),
          {},
        ),
      };
    }
  });

  return Array.from(map.values()).map((g) => {
    g.rows = Array.from(g.rowMap.values()).sort((a, b) => {
      if (a.sortValue instanceof Date && b.sortValue instanceof Date)
        return a.sortValue - b.sortValue;
      return String(a.sortValue).localeCompare(String(b.sortValue));
    });
    g.columns = Array.from(g.colMap.values()).sort((a, b) => {
      const va = Number(a.sortValue) || 0;
      const vb = Number(b.sortValue) || 0;
      return va - vb;
    });
    return g;
  });
});

const loadData = async () => {
  if (!relatedCollection.value || !props.primaryKey) return;

  loading.value = true;
  error.value = null;

  try {
    const pkField = props.relatedPrimaryKeyField || "id";

    const res = await api.get(`/items/${relatedCollection.value}`, {
      params: {
        filter: { hotel_id: { _eq: props.primaryKey } },
        fields: [
          "*",
          "room_category_id.*",
          "price_date_id.*",
          "occupancy_id.*",
        ].join(","),
        limit: -1,
      },
    });

    items.value = res.data.data || [];
  } catch (err) {
    error.value =
      "Could not load related items: " + (err.message || "Unknown error");
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const saveValue = async (id, field, newValue) => {
  if (!id) return;
  try {
    await api.patch(`/items/${relatedCollection.value}/${id}`, {
      [field]: newValue,
    });
    // optimistic update already done via v-model
  } catch (err) {
    console.error("Save failed", err);
    // You can add toast / revert here
  }
};

const refresh = () => loadData();

watch(() => props.primaryKey, loadData, { immediate: true });
</script>

<style scoped>
.pivoted-o2m {
  padding: 8px;
}
.group-section {
  margin-bottom: 32px;
}
.group-title {
  margin: 0 0 12px;
  font-size: 1.2em;
  color: var(--theme--primary);
}
.pivot-table {
  border-collapse: collapse;
  width: 100%;
}
th,
td {
  border: 1px solid var(--theme--border-subtle);
  padding: 8px 12px;
  text-align: center;
}
.row-header {
  background: #f5f5f5;
  font-weight: bold;
}
.column-header {
  background: #e8f0fe;
  font-weight: 600;
}
.sub-header {
  background: #f0f4f8;
  font-size: 0.9em;
  text-transform: capitalize;
}
.row-cell {
  background: #fafafa;
  font-weight: 500;
  text-align: left;
}
.value-cell {
  background: white;
}
.price-input {
  width: 90px;
  text-align: right;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px 6px;
}
.missing {
  color: #aaa;
  font-style: italic;
}
.loading,
.error {
  padding: 16px;
  text-align: center;
  color: var(--theme--danger);
}
</style>
