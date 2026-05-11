import { LANGUAGES_TO_MIGRATE } from "../config/index.js";

export function groupByTravelId(records, travelIdField = "travel_id") {
  const filtered = records.filter((r) =>
    LANGUAGES_TO_MIGRATE.includes(r.language),
  );

  const map = new Map();
  for (const record of filtered) {
    const id = record[travelIdField];
    if (!map.has(id)) {
      map.set(id, {
        [travelIdField]: id,
        name: record.name ?? "Unknown",
        languages: [],
      });
    }
    map.get(id).languages.push(record.language);
  }

  return Array.from(map.values());
}

export function normalizeSqlRow(row, productConfig) {
  const idColumn = productConfig.sql.idColumn;
  const record = {
    travel_id: row[idColumn] ?? row.travel_id,
    language: row.language,
    raw: row,
  };

  for (const [key, value] of Object.entries(row)) {
    if (key === idColumn || key === "language") continue;
    if (value !== null && value !== undefined) {
      record[key] = value;
    }
  }

  return record;
}
