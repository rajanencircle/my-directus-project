// ------------------------------------------
// CONFIGURATION
// ------------------------------------------

// Uncomment the environment you want to target:

// const env = {
//   DIRECTUS_URL: "http://localhost:8055",
//   DIRECTUS_TOKEN: "OSKnNsUKU2S2bpi0niaZ_HMpLr8q5cnN",
// };

// const env = {
//   DIRECTUS_URL: "https://directus-staging-botg.func.team",
//   DIRECTUS_TOKEN: "1ecR7PLJIpOZZOMUUaOERZWkKv0YT14q",
// };

const env = {
  DIRECTUS_URL: "https://directus-prod-botg.func.team",
  DIRECTUS_TOKEN: "OSKnNsUKU2S2bpi0niaZ_HMpLr8q5cnN",
};

// const env = {
//   DIRECTUS_URL: "https://directus-dev-botg.func.team",
//   DIRECTUS_TOKEN: "QtF-MmL0PxJUPd1udylLm_lGOGtW2WES",
// };

// ------------------------------------------
// CSV FILES
// Relative paths from the project root.
// ------------------------------------------
const CSV_FILES = {
  countries:
    "geographies list/countries 20260508-7824 with iso alpha 3 code.csv",
  destinations_cluster:
    "geographies list/destinations_cluster_26-04-10 with iso alpha 3 code.csv",
};

// =============================================================================
// JOB DEFINITIONS
// =============================================================================
// Each job describes one update run:
//
//   csvFile         - key from CSV_FILES above (or an absolute/relative path)
//   collection      - Directus collection name to update
//   collectionField - field on the Directus item used to MATCH a CSV row
//   csvMatchColumn  - column in the CSV that contains the same value as collectionField
//   csvValueColumn  - column in the CSV whose value will be written to Directus
//   updateField     - field on the Directus item to WRITE the value into
//                     (can be the same as collectionField or different)
//   dryRun          - if true, log what would change but do NOT call PATCH
//
// Example: read the "countries" collection, match on its "id" field against
//          the CSV "id" column, and write the CSV "ISO_alpha_3_code" value
//          into the collection's "iso_alpha3" field.
// =============================================================================
const JOBS = [
  // {
  //   csvFile: "countries",
  //   collection: "countries",
  //   collectionField: "id", // field on Directus item used to look up the CSV row
  //   csvMatchColumn: "id", // CSV column whose value equals collectionField value
  //   csvValueColumn: "ISO_alpha_3_code", // CSV column to read the new value from
  //   updateField: "ISO_alpha_3_code", // Directus field to update
  //   dryRun: false, // ← set to false to actually write
  // },
  // Uncomment and adjust to run a second job:
  {
    csvFile: "destinations_cluster",
    collection: "destinations_cluster",
    collectionField: "id",
    csvMatchColumn: "id",
    csvValueColumn: "ISO_alpha_3_code",
    updateField: "ISO_alpha_3_code",
    dryRun: false,
  },
];

// =============================================================================
// Internals — no need to edit below this line
// =============================================================================

const fs = require("fs");
const path = require("path");

const DIRECTUS_URL = env.DIRECTUS_URL;
const DIRECTUS_TOKEN = env.DIRECTUS_TOKEN;

// ---------------------------------------------------------------------------
// Directus REST helper
// ---------------------------------------------------------------------------
async function directusRequest(method, endpoint, body) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${endpoint} → HTTP ${res.status}: ${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ---------------------------------------------------------------------------
// Minimal CSV parser
// Handles quoted fields (including commas and newlines inside quotes).
// Returns an array of objects keyed by the header row.
// ---------------------------------------------------------------------------
function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^﻿/, ""); // strip BOM
  const lines = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      if (inQuotes && raw[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch; // keep quote so field parser can detect quoted fields
      }
    } else if (ch === "\n" && !inQuotes) {
      lines.push(current.replace(/\r$/, ""));
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current.replace(/\r$/, ""));

  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = [];
    let field = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === "," && !inQ) {
        values.push(field.trim());
        field = "";
      } else {
        field += ch;
      }
    }
    values.push(field.trim());

    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

// ---------------------------------------------------------------------------
// Fetch ALL items from a collection (handles Directus pagination)
// ---------------------------------------------------------------------------
async function fetchAllItems(collection, fields) {
  const fieldList = Array.from(new Set(["id", ...fields])).join(",");
  let page = 1;
  const limit = 200;
  const all = [];

  while (true) {
    const endpoint = `/items/${collection}?fields=${fieldList}&limit=${limit}&page=${page}&sort=id`;
    const response = await directusRequest("GET", endpoint);
    const items = response?.data ?? [];
    all.push(...items);
    if (items.length < limit) break;
    page++;
  }

  return all;
}

// ---------------------------------------------------------------------------
// Core updater
// ---------------------------------------------------------------------------
async function runJob(job) {
  const {
    csvFile,
    collection,
    collectionField,
    csvMatchColumn,
    csvValueColumn,
    updateField,
    dryRun = false,
  } = job;

  // Resolve CSV path
  const csvPath = CSV_FILES[csvFile] ?? csvFile;
  const resolvedPath = path.isAbsolute(csvPath)
    ? csvPath
    : path.resolve(process.cwd(), csvPath);

  console.log("\n" + "=".repeat(70));
  console.log(`JOB: ${collection}`);
  console.log(`CSV : ${resolvedPath}`);
  console.log(
    `MATCH: item[${collectionField}] === csv[${csvMatchColumn}]  →  write csv[${csvValueColumn}] into item[${updateField}]`,
  );
  console.log(`MODE: ${dryRun ? "DRY RUN (no writes)" : "LIVE (will PATCH)"}`);
  console.log("=".repeat(70));

  // 1. Parse CSV into a lookup map: matchValue → csvRow
  if (!fs.existsSync(resolvedPath)) {
    console.error(`ERROR: CSV file not found: ${resolvedPath}`);
    return;
  }

  const csvRows = parseCSV(resolvedPath);
  console.log(`Loaded ${csvRows.length} rows from CSV.`);

  // Validate CSV columns exist
  const sampleRow = csvRows[0] ?? {};
  if (!(csvMatchColumn in sampleRow)) {
    console.error(
      `ERROR: CSV match column "${csvMatchColumn}" not found. Available columns: ${Object.keys(sampleRow).join(", ")}`,
    );
    return;
  }
  if (!(csvValueColumn in sampleRow)) {
    console.error(
      `ERROR: CSV value column "${csvValueColumn}" not found. Available columns: ${Object.keys(sampleRow).join(", ")}`,
    );
    return;
  }

  const csvLookup = new Map();
  for (const row of csvRows) {
    const key = String(row[csvMatchColumn]).trim();
    if (key) csvLookup.set(key, row);
  }
  console.log(
    `Built lookup map with ${csvLookup.size} unique entries on [${csvMatchColumn}].`,
  );

  // 2. Fetch collection items
  console.log(`\nFetching items from Directus collection "${collection}"...`);
  const items = await fetchAllItems(collection, [collectionField, updateField]);
  console.log(`Found ${items.length} items.`);

  // 3. Match and update
  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const item of items) {
    const matchValue = String(item[collectionField] ?? "").trim();
    const csvRow = csvLookup.get(matchValue);

    if (!csvRow) {
      console.warn(
        `  [NOT FOUND] Item ID ${item.id} — no CSV row where [${csvMatchColumn}] = "${matchValue}"`,
      );
      notFound++;
      continue;
    }

    const newValue = csvRow[csvValueColumn];

    if (!newValue && newValue !== 0) {
      console.log(
        `  [SKIP] Item ID ${item.id} — CSV value for [${csvValueColumn}] is empty`,
      );
      skipped++;
      continue;
    }

    const currentValue = item[updateField];
    if (String(currentValue) === String(newValue)) {
      console.log(
        `  [SKIP] Item ID ${item.id} — already "${newValue}", no change needed`,
      );
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(
        `  [DRY RUN] Item ID ${item.id} — would set [${updateField}]: "${currentValue}" → "${newValue}"`,
      );
    } else {
      await directusRequest("PATCH", `/items/${collection}/${item.id}`, {
        [updateField]: newValue,
      });
      console.log(
        `  [UPDATED] Item ID ${item.id} — [${updateField}]: "${currentValue}" → "${newValue}"`,
      );
    }

    updated++;
  }

  console.log(`\nResults for "${collection}":`);
  console.log(`  Updated  : ${updated}`);
  console.log(`  Skipped  : ${skipped} (empty value or already correct)`);
  console.log(`  Not found: ${notFound} (no matching CSV row)`);
  if (dryRun) {
    console.log(`  *** DRY RUN — no data was written ***`);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
(async () => {
  console.log(`Directus target: ${DIRECTUS_URL}`);

  for (const job of JOBS) {
    try {
      await runJob(job);
    } catch (err) {
      console.error(
        `\nFATAL error in job "${job.collection}":`,
        err.message ?? err,
      );
    }
  }

  console.log("\nAll jobs complete.");
})();
