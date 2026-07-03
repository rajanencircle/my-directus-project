#!/usr/bin/env node
/**
 * Geographies Import 26-06-30 → Directus (dev)
 *
 * Imports the NEW geographies flat-list CSVs
 * (scripts/geographies_list_02-07-2026/Geographies 26-06-30/import-files/)
 * into the updated geo collections (status / media_code / is_non_geographic /
 * ISO_alpha_3_code fields, regions_countries M2M, locations_tour32.name direct field).
 *
 * Successor of scripts/import-csv.js. Key differences:
 *  - Explicit ids: CSV ids are written as Directus PKs (data is sequential 1..N,
 *    FK columns reference those same ids — no sort-based FK remapping needed)
 *  - Translations nested in the create payload (1 request per batch, not per row)
 *  - BOM-safe CSV parsing, --dry-run, env-based credentials
 *  - Clear + full reimport (new list uses a NEW id numbering — upsert is impossible)
 *
 * Usage:
 *   export DIRECTUS_URL="https://dev.content.botg.cloud"
 *   export DIRECTUS_TOKEN="..."
 *
 *   node import-geographies.js validate              # offline CSV checks only
 *   node import-geographies.js all --dry-run         # + server checks, no writes
 *   node import-geographies.js all --clear           # backup, wipe, import everything
 *   node import-geographies.js all --clear --fix-sequences
 *   node import-geographies.js countries             # single collection (target must be empty)
 *
 * Requirements: Node.js >= 18 (built-in fetch). No dependencies.
 */

"use strict";

const fs = require("fs");
const path = require("path");

// Never hardcode tokens here — this file is committed to git and leaked
// Directus tokens have had to be rotated before (see CLAUDE.md rule 4).
//   local:   export DIRECTUS_URL="http://localhost:8055"
//   dev:     export DIRECTUS_URL="https://dev.content.botg.cloud"
const CONFIG = {
  directusUrl: process.env.DIRECTUS_URL || "",
  directusToken: process.env.DIRECTUS_TOKEN || "",
};

const DATA_DIR = path.join(
  __dirname,
  "..",
  "geographies_list_02-07-2026",
  "Geographies 26-06-30",
  "import-files",
);

const BACKUP_DIR = path.join(__dirname, "backups");

const STATUS_VALUES = ["new", "active", "in review", "archived"];

// Locale columns → translations.code (en-GB only imported if the locale exists
// on the target instance — dev currently has de-DE, de-CH, nl-NL only)
const TRANSLATION_COLUMNS = [
  { csvColumn: "name_de-DE", localeCode: "de-DE" },
  { csvColumn: "name_ch-DE", localeCode: "de-CH" },
  { csvColumn: "name_nl-NL", localeCode: "nl-NL" },
  { csvColumn: "name_en-GB", localeCode: "en-GB" },
];

// =============================================================================
// Collection specs — import order matters (parents before children)
// =============================================================================
const SPECS = {
  locations_tour32: {
    csvFile: "BOTG_locations_tour32_26-06-30.csv",
    // name is a direct field now (translations junction was removed on dev)
    directFields: { name_de: { field: "name", type: "string" } },
    translations: false,
    dummy: { name: "__SEQ_FIX__" },
  },
  destinations_cluster: {
    csvFile: "BOTG_destinations_cluster_import_26-06-30.csv",
    directFields: {
      is_non_geographic: { field: "is_non_geographic", type: "boolean" },
    },
    translations: "destinations_cluster_translations",
    hasStatus: false, // no status field/column on cluster level
    dummy: {},
  },
  destinations: {
    csvFile: "BOTG_destinations_import_26-06-30.csv",
    directFields: {
      destinations_cluster_id: {
        field: "destinations_cluster_id",
        type: "fk",
        target: "destinations_cluster",
      },
      media_code: { field: "media_code", type: "string" },
      media_code_legacy_botg: {
        field: "media_code_legacy_botg",
        type: "string",
      },
      media_code_legacy_karawane: {
        field: "media_code_legacy_karawane",
        type: "string",
      },
      is_non_geographic: { field: "is_non_geographic", type: "boolean" },
    },
    translations: "destinations_translations",
    dummy: {},
  },
  countries: {
    csvFile: "BOTG_countries_import_26-06-30.csv",
    directFields: {
      destination_id: {
        field: "destination_id",
        type: "fk",
        target: "destinations",
      },
      ISO: { field: "ISO", type: "string" },
      ISO_alpha_3_code: { field: "ISO_alpha_3_code", type: "string" },
      media_code: { field: "media_code", type: "string" },
      media_code_legacy_botg: {
        field: "media_code_legacy_botg",
        type: "string",
      },
      media_code_legacy_karawane: {
        field: "media_code_legacy_karawane",
        type: "string",
      },
      cid_primarix: { field: "cid_primarix", type: "integer" },
      id_primarix: { field: "id_primarix", type: "integer" },
      cid_px_karawane: { field: "cid_px_karawane", type: "integer" },
      id_px_karawane: { field: "id_px_karawane", type: "integer" },
    },
    translations: "countries_translations",
    dummy: {},
  },
  states: {
    csvFile: "BOTG_states_import_26-06-30.csv",
    directFields: {
      country_id: { field: "country_id", type: "fk", target: "countries" },
      ISO: { field: "ISO", type: "string" },
      media_code: { field: "media_code", type: "string" },
      media_code_legacy_botg: {
        field: "media_code_legacy_botg",
        type: "string",
      },
      media_code_legacy_karawane: {
        field: "media_code_legacy_karawane",
        type: "string",
      },
    },
    translations: "states_translations",
    dummy: {},
  },
  regions: {
    csvFile: "BOTG_regions_import_26-06-30.csv",
    directFields: {
      cid_primarix: { field: "cid_primarix", type: "integer" },
      id_primarix: { field: "id_primarix", type: "integer" },
    },
    // regions ↔ countries M2M via regions_countries junction (junction field: countries_id)
    m2m: {
      csvColumn: "country_id",
      field: "country_id",
      junctionField: "countries_id",
      target: "countries",
    },
    translations: "regions_translations",
    dummy: {},
  },
  places: {
    csvFile: "BOTG_places_import_26-06-30.csv",
    directFields: {
      country_id: { field: "country_id", type: "fk", target: "countries" },
      state_id: { field: "state_id", type: "fk", target: "states" },
      region_id: { field: "region_id", type: "fk", target: "regions" },
      location_tour32: {
        field: "location_tour32",
        type: "fk",
        target: "locations_tour32",
      },
      cid_primarix: { field: "cid_primarix", type: "integer" },
      id_primarix: { field: "id_primarix", type: "integer" },
    },
    translations: "places_translations",
    dummy: {},
  },
};

const IMPORT_ORDER = [
  "locations_tour32",
  "destinations_cluster",
  "destinations",
  "countries",
  "states",
  "regions",
  "places",
];

// Deletion order: children first. DB-level cascades remove the *_translations
// rows and the regions_countries junction rows automatically.
const CLEAR_ORDER = [
  "places",
  "regions",
  "states",
  "countries",
  "destinations",
  "destinations_cluster",
  "locations_tour32",
];

const CREATE_BATCH = 50;
const DELETE_BATCH = 100;

// =============================================================================
// CSV parsing (BOM-safe, quote-aware)
// =============================================================================
function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8").replace(/^﻿/, "").trim();
  const lines = raw.split(/\r?\n/);
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const fields = splitCSVLine(line);
    const row = {};
    headers.forEach((h, i) => (row[h] = (fields[i] ?? "").trim()));
    return row;
  });
}

function splitCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

// =============================================================================
// Directus API helper
// =============================================================================
async function directusRequest(method, apiPath, body) {
  const url = `${CONFIG.directusUrl}${apiPath}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CONFIG.directusToken}`,
    },
  };
  if (body !== undefined) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`${method} ${apiPath} → HTTP ${res.status}: ${text}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

// =============================================================================
// Load + validate all CSVs (offline — no server needed)
// =============================================================================
function loadAll() {
  const data = {};
  for (const [key, spec] of Object.entries(SPECS)) {
    const file = path.join(DATA_DIR, spec.csvFile);
    if (!fs.existsSync(file)) {
      throw new Error(`CSV not found: ${file}`);
    }
    data[key] = parseCSV(file);
  }
  return data;
}

function validateAll(data) {
  const errors = [];
  const warnings = [];
  const idSets = {};

  for (const [key, rows] of Object.entries(data)) {
    const spec = SPECS[key];
    if (rows.length === 0) {
      errors.push(`${key}: CSV has no data rows`);
      continue;
    }

    // ids: present, numeric, unique
    const seen = new Set();
    for (const row of rows) {
      if (!/^\d+$/.test(row.id || "")) {
        errors.push(`${key}: invalid id "${row.id}"`);
        continue;
      }
      if (seen.has(row.id)) errors.push(`${key}: duplicate id ${row.id}`);
      seen.add(row.id);
    }
    idSets[key] = seen;

    for (const row of rows) {
      // status enum
      if (spec.hasStatus !== false && "status" in row && row.status !== "") {
        if (!STATUS_VALUES.includes(row.status)) {
          errors.push(`${key} id ${row.id}: unknown status "${row.status}"`);
        }
      }

      // typed direct fields
      for (const [csvCol, def] of Object.entries(spec.directFields || {})) {
        const val = row[csvCol];
        if (val === undefined || val === "") continue;
        if (def.type === "boolean" && val !== "true" && val !== "false") {
          errors.push(
            `${key} id ${row.id}: ${csvCol} not a boolean ("${val}")`,
          );
        }
        if (def.type === "integer" && !/^\d+$/.test(val)) {
          if (/^\d+(;\d+)+$/.test(val)) {
            warnings.push(
              `${key} id ${row.id}: ${csvCol}="${val}" is multi-valued — importing first value only`,
            );
          } else {
            errors.push(
              `${key} id ${row.id}: ${csvCol} not an integer ("${val}")`,
            );
          }
        }
        if (def.type === "fk" && !/^\d+$/.test(val)) {
          errors.push(
            `${key} id ${row.id}: ${csvCol} not a single integer FK ("${val}")`,
          );
        }
      }

      // m2m column
      if (spec.m2m) {
        const val = row[spec.m2m.csvColumn];
        if (val && !/^\d+(;\d+)*$/.test(val)) {
          errors.push(
            `${key} id ${row.id}: ${spec.m2m.csvColumn} malformed ("${val}")`,
          );
        }
      }

      // de-DE name should always exist (primary content language)
      if (spec.translations && row["name_de-DE"] === "") {
        warnings.push(`${key} id ${row.id}: empty name_de-DE`);
      }
      if (!spec.translations && "name_de" in row && row.name_de === "") {
        errors.push(`${key} id ${row.id}: empty name_de (required field)`);
      }
    }
  }

  // FK integrity against the CSV id sets (ids are imported as-is, so the
  // CSV id sets ARE the future Directus id sets)
  for (const [key, rows] of Object.entries(data)) {
    const spec = SPECS[key];
    for (const [csvCol, def] of Object.entries(spec.directFields || {})) {
      if (def.type !== "fk") continue;
      for (const row of rows) {
        const val = row[csvCol];
        if (val && !idSets[def.target].has(val)) {
          errors.push(
            `${key} id ${row.id}: ${csvCol}=${val} not found in ${def.target} CSV`,
          );
        }
      }
    }
    if (spec.m2m) {
      for (const row of rows) {
        const val = row[spec.m2m.csvColumn];
        if (!val) continue;
        for (const ref of val.split(";")) {
          if (!idSets[spec.m2m.target].has(ref.trim())) {
            errors.push(
              `${key} id ${row.id}: ${spec.m2m.csvColumn}→${ref} not found in ${spec.m2m.target} CSV`,
            );
          }
        }
      }
    }
  }

  return { errors, warnings };
}

// =============================================================================
// Payload building
// =============================================================================
function buildPayloads(key, rows, localeMap, warnings) {
  const spec = SPECS[key];
  const missingLocales = new Set();

  const payloads = rows.map((row) => {
    const id = Number(row.id);
    const payload = { id, sort: id };

    if (spec.hasStatus !== false && row.status) payload.status = row.status;

    for (const [csvCol, def] of Object.entries(spec.directFields || {})) {
      let val = row[csvCol];
      if (val === undefined || val === "") continue;

      if (def.type === "boolean") {
        payload[def.field] = val === "true";
      } else if (def.type === "integer" || def.type === "fk") {
        if (val.includes(";")) {
          warnings.push(
            `${key} id ${row.id}: ${csvCol}="${val}" → imported first value only`,
          );
          val = val.split(";")[0];
        }
        payload[def.field] = Number(val);
      } else {
        payload[def.field] = val;
      }
    }

    if (spec.m2m && row[spec.m2m.csvColumn]) {
      payload[spec.m2m.field] = row[spec.m2m.csvColumn]
        .split(";")
        .map((v) => ({ [spec.m2m.junctionField]: Number(v.trim()) }));
    }

    if (spec.translations) {
      const translations = [];
      for (const { csvColumn, localeCode } of TRANSLATION_COLUMNS) {
        const name = row[csvColumn];
        if (!name) continue;
        const localeId = localeMap[localeCode];
        if (!localeId) {
          missingLocales.add(localeCode);
          continue;
        }
        translations.push({ translations_id: localeId, name });
      }
      if (translations.length > 0) payload.translations = translations;
    }

    return payload;
  });

  for (const code of missingLocales) {
    warnings.push(
      `${key}: locale "${code}" does not exist on the target instance — its name column was skipped`,
    );
  }

  return payloads;
}

// =============================================================================
// Server operations
// =============================================================================
async function fetchLocaleMap() {
  const result = await directusRequest(
    "GET",
    "/items/translations?fields=id,code&limit=-1",
  );
  const map = {};
  for (const item of result.data || []) map[item.code] = item.id;
  return map;
}

async function fetchCount(collection) {
  const result = await directusRequest(
    "GET",
    `/items/${collection}?aggregate[count]=id`,
  );
  return Number(result.data?.[0]?.count?.id ?? result.data?.[0]?.count ?? 0);
}

async function fetchAllIds(collection) {
  const result = await directusRequest(
    "GET",
    `/items/${collection}?fields=id&limit=-1`,
  );
  return (result.data || []).map((r) => r.id);
}

async function backupCollection(key, backupDir) {
  const spec = SPECS[key];
  const fields = spec.translations ? "*,translations.*" : "*";
  const extra = spec.m2m ? `,${spec.m2m.field}.*` : "";
  const result = await directusRequest(
    "GET",
    `/items/${key}?fields=${fields}${extra}&limit=-1`,
  );
  const rows = result.data || [];
  fs.writeFileSync(
    path.join(backupDir, `${key}.json`),
    JSON.stringify(rows, null, 2),
  );
  return rows.length;
}

async function clearCollection(key) {
  const ids = await fetchAllIds(key);
  if (ids.length === 0) {
    console.log(`  ${key}: already empty`);
    return 0;
  }
  for (let i = 0; i < ids.length; i += DELETE_BATCH) {
    await directusRequest(
      "DELETE",
      `/items/${key}`,
      ids.slice(i, i + DELETE_BATCH),
    );
    process.stdout.write(
      `\r  ${key}: deleted ${Math.min(i + DELETE_BATCH, ids.length)}/${ids.length}`,
    );
  }
  console.log("");
  return ids.length;
}

async function importCollection(key, payloads) {
  let created = 0;
  for (let i = 0; i < payloads.length; i += CREATE_BATCH) {
    const batch = payloads.slice(i, i + CREATE_BATCH);
    await directusRequest("POST", `/items/${key}`, batch);
    created += batch.length;
    process.stdout.write(`\r  ${key}: created ${created}/${payloads.length}`);
  }
  console.log("");
  return created;
}

/**
 * Explicit-id inserts don't advance the Postgres autoincrement sequence, so a
 * later UI-created item can collide with an imported id. This probes the
 * sequence with id-less dummy inserts (a failed insert still advances the
 * sequence) until it returns an id above the imported max, then deletes the
 * dummies.
 */
async function fixSequence(key, maxId) {
  const spec = SPECS[key];
  const dummies = [];
  let attempts = 0;
  const cap = maxId + 500;

  while (attempts < cap) {
    attempts++;
    try {
      const result = await directusRequest("POST", `/items/${key}`, spec.dummy);
      const newId = Number(result.data.id);
      dummies.push(newId);
      if (newId > maxId) break;
    } catch (err) {
      // unique violation → sequence advanced by 1, keep going
      if (attempts % 100 === 0) {
        console.log(`  ${key}: sequence probe at ~${attempts} attempts...`);
      }
    }
  }

  if (dummies.length > 0) {
    await directusRequest("DELETE", `/items/${key}`, dummies);
  }
  const last = dummies[dummies.length - 1];
  if (last > maxId) {
    console.log(
      `  ${key}: sequence now past ${maxId} (next id ≥ ${last + 1}), ${attempts} probe(s)`,
    );
  } else {
    console.log(
      `  ${key}: WARNING — could not confirm sequence position after ${attempts} attempts`,
    );
  }
}

// =============================================================================
// Main
// =============================================================================
async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const target = args.find((a) => !a.startsWith("--"));

  const dryRun = flags.has("--dry-run");
  const clear = flags.has("--clear");
  const fixSequences = flags.has("--fix-sequences");

  const known = [...IMPORT_ORDER, "all", "validate"];
  if (!target || !known.includes(target)) {
    console.log(
      "Usage: node import-geographies.js <target> [--dry-run] [--clear] [--fix-sequences]",
    );
    console.log(`Targets: ${known.join(", ")}`);
    console.log("Env: DIRECTUS_URL, DIRECTUS_TOKEN");
    process.exit(target ? 1 : 0);
  }

  // ---- 1. Load + offline validation (always) ----
  console.log(`Data dir: ${DATA_DIR}\n`);
  const data = loadAll();
  const { errors, warnings } = validateAll(data);

  console.log("=== CSV validation ===");
  for (const [key, rows] of Object.entries(data)) {
    console.log(`  ${key.padEnd(22)} ${String(rows.length).padStart(5)} rows`);
  }
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    warnings.slice(0, 30).forEach((w) => console.log(`  ⚠ ${w}`));
    if (warnings.length > 30)
      console.log(`  ... +${warnings.length - 30} more`);
  }
  if (errors.length) {
    console.log(`\n${errors.length} ERROR(s):`);
    errors.slice(0, 50).forEach((e) => console.log(`  ✖ ${e}`));
    console.error("\nAborting — fix the CSV data first.");
    process.exit(1);
  }
  console.log("\nCSV validation passed (0 errors).");

  if (target === "validate") return;

  // ---- 2. Server checks ----
  if (!CONFIG.directusUrl || !CONFIG.directusToken) {
    console.error(
      "\nDIRECTUS_URL / DIRECTUS_TOKEN env vars are required for server operations.",
    );
    console.error("(Use the 'validate' target for offline checks.)");
    process.exit(1);
  }

  if (clear && target !== "all") {
    console.error(
      "\n--clear is only allowed with target 'all' (cascades affect child collections).",
    );
    process.exit(1);
  }

  console.log(
    `\nTarget instance: ${CONFIG.directusUrl}${dryRun ? "  [DRY RUN]" : ""}`,
  );

  const localeMap = await fetchLocaleMap();
  console.log(
    `Locales on instance: ${Object.keys(localeMap).join(", ") || "(none!)"}`,
  );
  if (!localeMap["de-DE"]) {
    console.error("Locale de-DE missing on instance — aborting.");
    process.exit(1);
  }

  const keys = target === "all" ? IMPORT_ORDER : [target];

  const counts = {};
  for (const key of CLEAR_ORDER) counts[key] = await fetchCount(key);
  console.log("\nCurrent row counts on instance:");
  for (const key of IMPORT_ORDER)
    console.log(`  ${key.padEnd(22)} ${String(counts[key]).padStart(5)}`);

  const nonEmpty = keys.filter((k) => counts[k] > 0);
  if (nonEmpty.length > 0 && !clear) {
    console.error(
      `\nNon-empty target collection(s): ${nonEmpty.join(", ")}.` +
        `\nThe new list uses a NEW id numbering — importing on top of old data is not possible.` +
        `\nRe-run with 'all --clear' to wipe and reimport (a JSON backup is written first).`,
    );
    process.exit(1);
  }

  if (dryRun) {
    console.log("\n=== DRY RUN — no writes ===");
    if (clear) {
      console.log("Would clear (child-first):");
      for (const key of CLEAR_ORDER)
        console.log(`  ${key}: ${counts[key]} row(s)`);
      console.log(
        "  NOTE: product references (hotels/tours/excursions/... .country etc.) are SET NULL," +
          "\n        product↔geo junction rows (tours_countries, cruises_destinations, ...) are CASCADE-deleted.",
      );
    }
    const runWarnings = [];
    for (const key of keys) {
      const payloads = buildPayloads(key, data[key], localeMap, runWarnings);
      const withTrans = payloads.filter((p) => p.translations).length;
      const withM2m = SPECS[key].m2m
        ? payloads.filter((p) => p[SPECS[key].m2m.field]).length
        : 0;
      console.log(
        `Would create ${key}: ${payloads.length} item(s)` +
          (SPECS[key].translations
            ? `, ${withTrans} with nested translations`
            : "") +
          (SPECS[key].m2m ? `, ${withM2m} with country M2M` : ""),
      );
      console.log(`  sample payload: ${JSON.stringify(payloads[0])}`);
    }
    runWarnings.slice(0, 10).forEach((w) => console.log(`  ⚠ ${w}`));
    if (fixSequences)
      console.log("Would fix autoincrement sequences afterwards.");
    return;
  }

  // ---- 3. Backup + clear ----
  if (clear) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(BACKUP_DIR, stamp);
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`\n=== Backup → ${backupDir} ===`);
    for (const key of IMPORT_ORDER) {
      const n = await backupCollection(key, backupDir);
      console.log(`  ${key}: ${n} row(s) backed up`);
    }

    console.log(
      "\n=== Clearing (child-first, cascades handle translations/junctions) ===",
    );
    for (const key of CLEAR_ORDER) {
      await clearCollection(key);
    }
  }

  // ---- 4. Import ----
  console.log("\n=== Importing ===");
  const runWarnings = [];
  const summary = {};
  for (const key of keys) {
    const payloads = buildPayloads(key, data[key], localeMap, runWarnings);
    summary[key] = await importCollection(key, payloads);
  }

  // ---- 5. Sequences ----
  if (fixSequences) {
    console.log("\n=== Fixing autoincrement sequences ===");
    for (const key of keys) {
      const maxId = Math.max(...data[key].map((r) => Number(r.id)));
      await fixSequence(key, maxId);
    }
  }

  // ---- 6. Summary ----
  console.log("\n=== Summary ===");
  for (const [key, n] of Object.entries(summary)) {
    console.log(`  ${key.padEnd(22)} ${String(n).padStart(5)} created`);
  }
  if (runWarnings.length) {
    console.log(`\n${runWarnings.length} warning(s):`);
    runWarnings.slice(0, 40).forEach((w) => console.log(`  ⚠ ${w}`));
    if (runWarnings.length > 40)
      console.log(`  ... +${runWarnings.length - 40} more`);
    const logFile = path.join(__dirname, `import-warnings-${Date.now()}.log`);
    fs.writeFileSync(logFile, runWarnings.join("\n"));
    console.log(`  Full list: ${logFile}`);
  }
  if (!fixSequences) {
    console.log(
      "\nNOTE: explicit-id import does not advance Postgres sequences." +
        "\nRun again with --fix-sequences (or setval via DB) before anyone creates geo items in the UI.",
    );
  }
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
