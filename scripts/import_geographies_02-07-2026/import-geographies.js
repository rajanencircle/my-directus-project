#!/usr/bin/env node
/**
 * Geographies Import 26-06-30 → Directus
 *
 * Imports the NEW geographies flat-list CSVs
 * (scripts/geographies_list_02-07-2026/Geographies 26-06-30/import-files/)
 * into the updated geo collections (status / media_code / is_non_geographic /
 * ISO_alpha_3_code fields, regions_countries M2M, locations_tour32.name direct field).
 *
 * Environment selection follows migration/sync-collection-data.js:
 * credentials come from DIRECTUS_<ENV>_URL / DIRECTUS_<ENV>_TOKEN env vars
 * (repo-root .env is loaded via dotenv), picked with --env. Touching "main"
 * additionally requires --confirm-main.
 *
 * Modes:
 *   create (default)  First/clean load. Target collections must be empty,
 *                     or pass --clear ('all' only) to backup + wipe first.
 *                     Items are batch-POSTed with explicit CSV ids and nested
 *                     translations / regions↔countries M2M.
 *   upsert            Update-or-create against a target that already carries
 *                     the SAME id numbering (i.e. after an initial clean load).
 *                     Per row: create if the id is missing, update changed
 *                     fields if it exists, skip if identical. Translations and
 *                     M2M links are diffed and written deterministically via
 *                     their junction collections. Empty CSV cells never
 *                     overwrite existing values; `sort` is only set on create.
 *
 * Usage:
 *   node import-geographies.js validate                          # offline CSV checks
 *   node import-geographies.js all --env local --mode create --clear --fix-sequences
 *   node import-geographies.js all --env dev --mode upsert --dry-run
 *   node import-geographies.js countries --env dev --mode upsert
 *   node import-geographies.js all --env main --mode upsert --confirm-main   # only when instructed!
 *
 * Flags:
 *   --env <local|dev|staging|main>   target environment (or set DIRECTUS_URL/
 *                                    DIRECTUS_TOKEN directly and omit --env)
 *   --mode <create|upsert>           default: create
 *   --clear                          create mode + 'all' only: backup + wipe first
 *   --dry-run                        read-only preview of every action
 *   --fix-sequences                  bump Postgres autoincrement sequences after import
 *   --confirm-main                   required in addition to --env main
 *   --force                          upsert: proceed even if the target id
 *                                    numbering looks different from the CSVs
 *
 * Requirements: Node.js >= 18 (built-in fetch), dotenv (repo dependency).
 */

"use strict";

const fs = require("fs");
const path = require("path");

// Repo-root .env carries the per-environment credentials (same convention as
// migration/sync-collection-data.js); scripts/.env may carry the generic
// DIRECTUS_URL/DIRECTUS_TOKEN override. dotenv never overwrites already-set vars.
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// ------------------------------------------
// ENVIRONMENT CREDENTIALS (never hardcoded — see CLAUDE.md rule 4)
// ------------------------------------------
const ENVIRONMENTS = {
  local: {
    url: process.env.DIRECTUS_LOCAL_URL,
    token: process.env.DIRECTUS_LOCAL_TOKEN,
  },
  dev: {
    url: process.env.DIRECTUS_DEV_URL,
    token: process.env.DIRECTUS_DEV_TOKEN,
  },
  staging: {
    url: process.env.DIRECTUS_STAGING_URL,
    token: process.env.DIRECTUS_STAGING_TOKEN,
  },
  main: {
    url: process.env.DIRECTUS_MAIN_URL,
    token: process.env.DIRECTUS_MAIN_TOKEN,
  },
};

// Resolved at startup from --env (or generic DIRECTUS_URL/DIRECTUS_TOKEN).
const ENV = { name: "", url: "", token: "" };

function resolveEnv(name) {
  if (!name) {
    if (process.env.DIRECTUS_URL && process.env.DIRECTUS_TOKEN) {
      return {
        name: "custom (DIRECTUS_URL)",
        url: process.env.DIRECTUS_URL,
        token: process.env.DIRECTUS_TOKEN,
      };
    }
    throw new Error(
      "No target environment. Pass --env <local|dev|staging|main> " +
        "(reads DIRECTUS_<ENV>_URL / DIRECTUS_<ENV>_TOKEN from the repo-root .env), " +
        "or set DIRECTUS_URL and DIRECTUS_TOKEN directly.",
    );
  }
  const config = ENVIRONMENTS[name];
  if (!config) {
    throw new Error(
      `Unknown environment "${name}". Valid options: ${Object.keys(ENVIRONMENTS).join(", ")}`,
    );
  }
  if (!config.url || !config.token) {
    throw new Error(
      `Missing credentials for "${name}". Set DIRECTUS_${name.toUpperCase()}_URL and DIRECTUS_${name.toUpperCase()}_TOKEN env vars (repo-root .env).`,
    );
  }
  return { name, url: config.url, token: config.token };
}

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
// on the target instance — currently all environments have de-DE, de-CH, nl-NL only)
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
    // name is a direct field now (translations junction was removed)
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
    // regions ↔ countries M2M via regions_countries junction
    m2m: {
      csvColumn: "country_id",
      field: "country_id",
      junctionCollection: "regions_countries",
      junctionField: "countries_id",
      parentField: "regions_id",
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
const UPDATE_BATCH = 50;
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
  const url = `${ENV.url}${apiPath}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.token}`,
    },
  };
  if (body !== undefined) options.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    throw new Error(
      `${method} ${url} → network error (${err.cause?.code || err.message}). Is the instance running/reachable?`,
    );
  }
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

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
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
      if (spec.hasStatus !== false && "status" in row && row.status !== "") {
        if (!STATUS_VALUES.includes(row.status)) {
          errors.push(`${key} id ${row.id}: unknown status "${row.status}"`);
        }
      }

      for (const [csvCol, def] of Object.entries(spec.directFields || {})) {
        const val = row[csvCol];
        if (val === undefined || val === "") continue;
        if (def.type === "boolean" && val !== "true" && val !== "false") {
          errors.push(`${key} id ${row.id}: ${csvCol} not a boolean ("${val}")`);
        }
        if (def.type === "integer" && !/^\d+$/.test(val)) {
          if (/^\d+(;\d+)+$/.test(val)) {
            warnings.push(
              `${key} id ${row.id}: ${csvCol}="${val}" is multi-valued — importing first value only`,
            );
          } else {
            errors.push(`${key} id ${row.id}: ${csvCol} not an integer ("${val}")`);
          }
        }
        if (def.type === "fk" && !/^\d+$/.test(val)) {
          errors.push(`${key} id ${row.id}: ${csvCol} not a single integer FK ("${val}")`);
        }
      }

      if (spec.m2m) {
        const val = row[spec.m2m.csvColumn];
        if (val && !/^\d+(;\d+)*$/.test(val)) {
          errors.push(`${key} id ${row.id}: ${spec.m2m.csvColumn} malformed ("${val}")`);
        }
      }

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
          errors.push(`${key} id ${row.id}: ${csvCol}=${val} not found in ${def.target} CSV`);
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
          warnings.push(`${key} id ${row.id}: ${csvCol}="${val}" → imported first value only`);
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
// Server operations (shared)
// =============================================================================
async function fetchLocaleMap() {
  const result = await directusRequest("GET", "/items/translations?fields=id,code&limit=-1");
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
  const result = await directusRequest("GET", `/items/${collection}?fields=id&limit=-1`);
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
  fs.writeFileSync(path.join(backupDir, `${key}.json`), JSON.stringify(rows, null, 2));
  return rows.length;
}

async function writeBackups(keys) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(BACKUP_DIR, stamp);
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`\n=== Backup → ${backupDir} ===`);
  for (const key of keys) {
    const n = await backupCollection(key, backupDir);
    console.log(`  ${key}: ${n} row(s) backed up`);
  }
}

async function clearCollection(key) {
  const ids = await fetchAllIds(key);
  if (ids.length === 0) {
    console.log(`  ${key}: already empty`);
    return 0;
  }
  for (const batch of chunk(ids, DELETE_BATCH)) {
    await directusRequest("DELETE", `/items/${key}`, batch);
  }
  console.log(`  ${key}: deleted ${ids.length}`);
  return ids.length;
}

async function importCollection(key, payloads) {
  let created = 0;
  for (const batch of chunk(payloads, CREATE_BATCH)) {
    await directusRequest("POST", `/items/${key}`, batch);
    created += batch.length;
    process.stdout.write(`\r  ${key}: created ${created}/${payloads.length}`);
  }
  console.log("");
  return created;
}

// =============================================================================
// Upsert (update-or-create) — sync-collection-data.js CREATE_IF_MISSING logic,
// extended with change detection and deterministic junction handling.
// =============================================================================
async function fetchExistingForUpsert(key) {
  const spec = SPECS[key];
  const fields = ["id"];
  if (spec.hasStatus !== false) fields.push("status");
  for (const def of Object.values(spec.directFields || {})) fields.push(def.field);
  if (spec.translations) {
    fields.push("translations.id", "translations.translations_id", "translations.name");
  }
  if (spec.m2m) {
    fields.push(`${spec.m2m.field}.id`, `${spec.m2m.field}.${spec.m2m.junctionField}`);
  }
  const result = await directusRequest(
    "GET",
    `/items/${key}?fields=${fields.join(",")}&limit=-1`,
  );
  const map = new Map();
  for (const item of result.data || []) map.set(Number(item.id), item);
  return map;
}

/** Diff one CSV payload against the existing target item. */
function diffItem(key, payload, existing) {
  const spec = SPECS[key];
  const parentPatch = {};
  const transPatches = []; // [{id, name}] on the translations junction
  const transCreates = []; // [{<parent>_id, translations_id, name}]
  const linkAdds = []; // [{regions_id, countries_id}]
  const linkRemovals = []; // junction row ids

  // Direct scalar fields — `sort` is create-only (don't fight manual ordering),
  // and empty CSV cells (absent keys) never overwrite existing values.
  for (const [field, value] of Object.entries(payload)) {
    if (field === "id" || field === "sort" || field === "translations") continue;
    if (spec.m2m && field === spec.m2m.field) continue;
    if ((existing[field] ?? null) !== (value ?? null)) parentPatch[field] = value;
  }

  // Translations: match by locale uuid; update changed names, create missing rows.
  if (spec.translations) {
    const existingByLocale = new Map(
      (existing.translations || []).map((t) => [t.translations_id, t]),
    );
    for (const t of payload.translations || []) {
      const current = existingByLocale.get(t.translations_id);
      if (!current) {
        transCreates.push({
          [`${key}_id`]: payload.id,
          translations_id: t.translations_id,
          name: t.name,
        });
      } else if (current.name !== t.name) {
        transPatches.push({ id: current.id, name: t.name });
      }
    }
  }

  // M2M links: set-diff on country ids; adds/removals via the junction collection.
  if (spec.m2m) {
    const desired = new Set(
      (payload[spec.m2m.field] || []).map((l) => l[spec.m2m.junctionField]),
    );
    const existingLinks = existing[spec.m2m.field] || [];
    const existingSet = new Set(existingLinks.map((l) => Number(l[spec.m2m.junctionField])));
    for (const countryId of desired) {
      if (!existingSet.has(countryId)) {
        linkAdds.push({
          [spec.m2m.parentField]: payload.id,
          [spec.m2m.junctionField]: countryId,
        });
      }
    }
    for (const link of existingLinks) {
      if (!desired.has(Number(link[spec.m2m.junctionField]))) {
        linkRemovals.push(link.id);
      }
    }
  }

  const changed =
    Object.keys(parentPatch).length > 0 ||
    transPatches.length > 0 ||
    transCreates.length > 0 ||
    linkAdds.length > 0 ||
    linkRemovals.length > 0;

  return { changed, parentPatch, transPatches, transCreates, linkAdds, linkRemovals };
}

async function upsertCollection(key, payloads, { dryRun, force }) {
  const spec = SPECS[key];
  const existing = await fetchExistingForUpsert(key);

  const csvIds = new Set(payloads.map((p) => p.id));
  const stale = [...existing.keys()].filter((id) => !csvIds.has(id));
  if (stale.length > 0) {
    console.log(
      `  ${key}: ${stale.length} existing item(s) not in the CSV — left untouched (ids: ${stale.slice(0, 10).join(",")}${stale.length > 10 ? "…" : ""})`,
    );
    if (existing.size > 0 && stale.length / existing.size > 0.25 && !force) {
      throw new Error(
        `${key}: ${stale.length}/${existing.size} existing ids are not in the CSV — the target ` +
          `probably still carries a DIFFERENT id numbering (old dataset). Upserting on top would ` +
          `mix datasets. Use mode create with --clear for a clean load, or pass --force if this is intended.`,
      );
    }
  }

  const toCreate = [];
  const parentPatches = [];
  const transPatches = [];
  const transCreates = [];
  const linkAdds = [];
  const linkRemovals = [];
  let unchanged = 0;

  for (const payload of payloads) {
    const current = existing.get(payload.id);
    if (!current) {
      toCreate.push(payload);
      continue;
    }
    const diff = diffItem(key, payload, current);
    if (!diff.changed) {
      unchanged++;
      continue;
    }
    if (Object.keys(diff.parentPatch).length > 0) {
      parentPatches.push({ id: payload.id, ...diff.parentPatch });
    }
    transPatches.push(...diff.transPatches);
    transCreates.push(...diff.transCreates);
    linkAdds.push(...diff.linkAdds);
    linkRemovals.push(...diff.linkRemovals);
  }

  const updatedItems = payloads.length - toCreate.length - unchanged;
  console.log(
    `  ${key}: ${toCreate.length} to create, ${updatedItems} to update, ${unchanged} unchanged` +
      (spec.translations ? ` | translations: ${transPatches.length} rename, ${transCreates.length} add` : "") +
      (spec.m2m ? ` | links: +${linkAdds.length} / -${linkRemovals.length}` : ""),
  );

  if (dryRun) {
    if (parentPatches[0]) console.log(`    sample update: ${JSON.stringify(parentPatches[0])}`);
    if (toCreate[0]) console.log(`    sample create: ${JSON.stringify(toCreate[0])}`);
    return { created: 0, updated: 0, unchanged };
  }

  // Order: parent creates first (targets for junction rows), then parent
  // patches, then junction ops.
  for (const batch of chunk(toCreate, CREATE_BATCH)) {
    await directusRequest("POST", `/items/${key}`, batch);
  }
  for (const batch of chunk(parentPatches, UPDATE_BATCH)) {
    await directusRequest("PATCH", `/items/${key}`, batch);
  }
  if (spec.translations) {
    for (const batch of chunk(transPatches, UPDATE_BATCH)) {
      await directusRequest("PATCH", `/items/${spec.translations}`, batch);
    }
    for (const batch of chunk(transCreates, CREATE_BATCH)) {
      await directusRequest("POST", `/items/${spec.translations}`, batch);
    }
  }
  if (spec.m2m) {
    for (const batch of chunk(linkRemovals, DELETE_BATCH)) {
      await directusRequest("DELETE", `/items/${spec.m2m.junctionCollection}`, batch);
    }
    for (const batch of chunk(linkAdds, CREATE_BATCH)) {
      await directusRequest("POST", `/items/${spec.m2m.junctionCollection}`, batch);
    }
  }

  return { created: toCreate.length, updated: updatedItems, unchanged };
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
    console.log(`  ${key}: sequence now past ${maxId} (next id ≥ ${last + 1}), ${attempts} probe(s)`);
  } else {
    console.log(`  ${key}: WARNING — could not confirm sequence position after ${attempts} attempts`);
  }
}

// =============================================================================
// Main
// =============================================================================
function parseArgs(argv) {
  const flags = new Set();
  const options = {};
  let target;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--env" || arg === "--mode") {
      options[arg.slice(2)] = argv[++i];
    } else if (arg.startsWith("--")) {
      flags.add(arg);
    } else if (!target) {
      target = arg;
    }
  }
  return { target, flags, options };
}

async function main() {
  const { target, flags, options } = parseArgs(process.argv.slice(2));

  const dryRun = flags.has("--dry-run");
  const clear = flags.has("--clear");
  const fixSequences = flags.has("--fix-sequences");
  const confirmMain = flags.has("--confirm-main");
  const force = flags.has("--force");
  const mode = options.mode || "create";

  const known = [...IMPORT_ORDER, "all", "validate"];
  if (!target || !known.includes(target)) {
    console.log(
      "Usage: node import-geographies.js <target> [--env <local|dev|staging|main>] [--mode <create|upsert>]",
    );
    console.log("       [--clear] [--dry-run] [--fix-sequences] [--confirm-main] [--force]");
    console.log(`Targets: ${known.join(", ")}`);
    process.exit(target ? 1 : 0);
  }
  if (!["create", "upsert"].includes(mode)) {
    console.error(`Unknown --mode "${mode}". Use "create" or "upsert".`);
    process.exit(1);
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
    if (warnings.length > 30) console.log(`  ... +${warnings.length - 30} more`);
  }
  if (errors.length) {
    console.log(`\n${errors.length} ERROR(s):`);
    errors.slice(0, 50).forEach((e) => console.log(`  ✖ ${e}`));
    console.error("\nAborting — fix the CSV data first.");
    process.exit(1);
  }
  console.log("\nCSV validation passed (0 errors).");

  if (target === "validate") return;

  // ---- 2. Environment resolution + guards ----
  Object.assign(ENV, resolveEnv(options.env));

  if (ENV.name === "main" && !confirmMain) {
    console.error(
      '\nRefusing to touch "main" (production) without --confirm-main. ' +
        "Only pass that flag when you have been explicitly instructed to modify production.",
    );
    process.exit(1);
  }
  if (clear && mode !== "create") {
    console.error("\n--clear only applies to --mode create.");
    process.exit(1);
  }
  if (clear && target !== "all") {
    console.error("\n--clear is only allowed with target 'all' (cascades affect child collections).");
    process.exit(1);
  }

  console.log(
    `\nTarget environment: ${ENV.name} (${ENV.url})  mode: ${mode}${dryRun ? "  [DRY RUN]" : ""}`,
  );

  const localeMap = await fetchLocaleMap();
  console.log(`Locales on instance: ${Object.keys(localeMap).join(", ") || "(none!)"}`);
  if (!localeMap["de-DE"]) {
    console.error("Locale de-DE missing on instance — aborting.");
    process.exit(1);
  }

  const keys = target === "all" ? IMPORT_ORDER : [target];

  const counts = {};
  for (const key of CLEAR_ORDER) counts[key] = await fetchCount(key);
  console.log("\nCurrent row counts on instance:");
  for (const key of IMPORT_ORDER) console.log(`  ${key.padEnd(22)} ${String(counts[key]).padStart(5)}`);

  if (mode === "create") {
    const nonEmpty = keys.filter((k) => counts[k] > 0);
    if (nonEmpty.length > 0 && !clear) {
      console.error(
        `\nNon-empty target collection(s): ${nonEmpty.join(", ")}.` +
          `\nMode create needs empty collections. Options:` +
          `\n  - 'all --clear' to backup + wipe + reimport (first clean load), or` +
          `\n  - '--mode upsert' to update-or-create against an existing load with the same id numbering.`,
      );
      process.exit(1);
    }
  }

  // ---- 3. Dry run ----
  if (dryRun) {
    console.log("\n=== DRY RUN — no writes ===");
    const runWarnings = [];
    if (mode === "create" && clear) {
      console.log("Would clear (child-first):");
      for (const key of CLEAR_ORDER) console.log(`  ${key}: ${counts[key]} row(s)`);
      console.log(
        "  NOTE: product references (hotels/tours/excursions/... .country etc.) are SET NULL," +
          "\n        product↔geo junction rows (tours_countries, cruises_destinations, ...) are CASCADE-deleted.",
      );
    }
    for (const key of keys) {
      const payloads = buildPayloads(key, data[key], localeMap, runWarnings);
      if (mode === "upsert") {
        await upsertCollection(key, payloads, { dryRun: true, force });
      } else {
        const withTrans = payloads.filter((p) => p.translations).length;
        const withM2m = SPECS[key].m2m ? payloads.filter((p) => p[SPECS[key].m2m.field]).length : 0;
        console.log(
          `Would create ${key}: ${payloads.length} item(s)` +
            (SPECS[key].translations ? `, ${withTrans} with nested translations` : "") +
            (SPECS[key].m2m ? `, ${withM2m} with country M2M` : ""),
        );
        console.log(`  sample payload: ${JSON.stringify(payloads[0])}`);
      }
    }
    runWarnings.slice(0, 10).forEach((w) => console.log(`  ⚠ ${w}`));
    if (fixSequences) console.log("Would fix autoincrement sequences afterwards.");
    return;
  }

  // ---- 4. Backup (before ANY write run), then clear if requested ----
  await writeBackups(IMPORT_ORDER);

  if (clear) {
    console.log("\n=== Clearing (child-first, cascades handle translations/junctions) ===");
    for (const key of CLEAR_ORDER) {
      await clearCollection(key);
    }
  }

  // ---- 5. Import / upsert ----
  console.log(`\n=== ${mode === "upsert" ? "Upserting" : "Importing"} ===`);
  const runWarnings = [];
  const summary = {};
  for (const key of keys) {
    const payloads = buildPayloads(key, data[key], localeMap, runWarnings);
    if (mode === "upsert") {
      summary[key] = await upsertCollection(key, payloads, { dryRun: false, force });
    } else {
      summary[key] = { created: await importCollection(key, payloads), updated: 0, unchanged: 0 };
    }
  }

  // ---- 6. Sequences ----
  if (fixSequences) {
    console.log("\n=== Fixing autoincrement sequences ===");
    for (const key of keys) {
      const maxId = Math.max(...data[key].map((r) => Number(r.id)));
      await fixSequence(key, maxId);
    }
  }

  // ---- 7. Summary ----
  console.log("\n=== Summary ===");
  for (const [key, s] of Object.entries(summary)) {
    console.log(
      `  ${key.padEnd(22)} created ${String(s.created).padStart(5)}   updated ${String(s.updated).padStart(5)}   unchanged ${String(s.unchanged).padStart(5)}`,
    );
  }
  if (runWarnings.length) {
    console.log(`\n${runWarnings.length} warning(s):`);
    runWarnings.slice(0, 40).forEach((w) => console.log(`  ⚠ ${w}`));
    if (runWarnings.length > 40) console.log(`  ... +${runWarnings.length - 40} more`);
    const logFile = path.join(__dirname, `import-warnings-${Date.now()}.log`);
    fs.writeFileSync(logFile, runWarnings.join("\n"));
    console.log(`  Full list: ${logFile}`);
  }
  if (!fixSequences && Object.values(summary).some((s) => s.created > 0)) {
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
