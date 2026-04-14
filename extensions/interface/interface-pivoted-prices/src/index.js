import InterfaceComponent from "./interface.vue";

export default {
  id: "pivoted-o2m-prices",
  name: "Pivoted O2M Prices",
  icon: "pivot_table",
  description:
    "One-to-Many table with pivot: group by category, rows = dates, columns = occupancies, editable values",
  component: InterfaceComponent,
  // options: [
  //   {
  //     field: "groupBy",
  //     name: "Group by (field path)",
  //     type: "string",
  //     meta: {
  //       interface: "input",
  //       width: "half",
  //       note: "Example: room_category_id.name",
  //     },
  //     default: "room_category_id.name",
  //   },
  //   {
  //     field: "rowField",
  //     name: "Rows (field path)",
  //     type: "string",
  //     meta: {
  //       interface: "input",
  //       width: "half",
  //       note: "Example: price_date_id.name",
  //     },
  //     default: "price_date_id.name",
  //   },
  //   {
  //     field: "columnField",
  //     name: "Columns (field path)",
  //     type: "string",
  //     meta: {
  //       interface: "input",
  //       width: "half",
  //       note: "Example: occupancy_id.name",
  //     },
  //     default: "occupancy_id.name",
  //   },
  //   {
  //     field: "valueFields",
  //     name: "Value fields (comma separated)",
  //     type: "string",
  //     meta: {
  //       interface: "input",
  //       width: "half",
  //       note: "Example: buy_price,sell_price",
  //     },
  //     default: "buy_price,sell_price",
  //   },
  //   {
  //     field: "rowSort",
  //     name: "Sort rows by",
  //     type: "string",
  //     meta: {
  //       interface: "input",
  //       width: "half",
  //       note: "Example: price_date_id.start_date",
  //     },
  //     default: "price_date_id.start_date",
  //   },
  //   {
  //     field: "columnSort",
  //     name: "Sort columns by",
  //     type: "string",
  //     meta: {
  //       interface: "input",
  //       width: "half",
  //       note: "Example: occupancy_id.value",
  //     },
  //     default: "occupancy_id.value",
  //   },
  // ],
  options: null,
  types: ["alias", "uuid", "string"],
  groups: ["o2m", "relational"],
};
