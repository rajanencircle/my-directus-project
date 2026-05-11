#!/usr/bin/env node
/**
 * Multi-Profile CSV → Directus Import Script
 *
 * Imports CSV data into any configured Directus collection with translation support
 * and foreign key resolution (mapping numeric CSV IDs to Directus UUIDs).
 *
 * Usage:
 *   node scripts/import-csv.js destinations_cluster
 *   node scripts/import-csv.js destinations
 *   node scripts/import-csv.js countries
 *   ... (etc.)
 *
 * Requirements: Node.js >= 18 (uses built-in fetch)
 *
 * Features:
 * - Automatic UUID generation (Directus API handles this)
 * - FK resolution: maps CSV numeric IDs to existing/newly-created UUIDs
 * - Multi-locale translation support with locale code mapping (ch-DE → de-CH)
 * - Quoted CSV field handling
 * - Optional clear-before-import
 */

"use strict";

const fs = require("fs");

// local
const CONFIG = {
  directusUrl: "http://localhost:8055",
  directusToken: "2cpd1MiSahgbSQqyu_pUfz0MK8BJOjqV",
};

// // staging
// const CONFIG = {
//   directusUrl: "https://cms.staging-5em2ouy-sxbqtq6mu5vgm.de-2.platformsh.site",
//   directusToken: "-m5y_u_LpB62rOXFN0np1hnHpA1uOgRw",
// };

// // dev
// const CONFIG = {
//   directusUrl: "https://cms.dev-54ta5gq-sxbqtq6mu5vgm.de-2.platformsh.site",
//   directusToken: "ojKBg1_90-3NgGPXpFL04G257Wu-VxYE",
// };

// =============================================================================
// PROFILES — one per CSV/collection pair
// =============================================================================
const PROFILES = {
  destinations_cluster: {
    csvFile: "./geographies list/destinations_cluster_26-04-10.csv",
    collection: "destinations_cluster",
    translationsCollection: "destinations_cluster_translations",
    parentFkField: "destinations_cluster_id",
    localeFkField: "translations_id",

    mainFields: {
      id: "id",
      short_code: "short_code", // uncomment if field exists
    },

    foreignKeys: {},

    translationColumns: [
      // { csvColumn: "name_en-GB", localeCode: "en-GB", field: "name" },
      { csvColumn: "name_de-DE", localeCode: "de-DE", field: "name" },
      { csvColumn: "name_ch-DE", localeCode: "de-CH", field: "name" },
      { csvColumn: "name_nl-NL", localeCode: "nl-NL", field: "name" },
    ],

    clearBeforeImport: false,
  },

  destinations: {
    csvFile: "./geographies list/destinations_26-04-10.csv",
    collection: "destinations",
    translationsCollection: "destinations_translations",
    parentFkField: "destinations_id",
    localeFkField: "translations_id",

    mainFields: {
      id: "id",
      destinations_cluster_id: "destinations_cluster_id",
      short_code: "short_code",
    },

    foreignKeys: {
      destinations_cluster_id: {
        csvColumn: "destinations_cluster_id",
        targetCollection: "destinations_cluster",
        targetField: "sort",
        directusField: "destinations_cluster_id",
        optional: false,
      },
    },

    translationColumns: [
      // { csvColumn: "name_en-GB", localeCode: "en-GB", field: "name" },
      { csvColumn: "name_de-DE", localeCode: "de-DE", field: "name" },
      { csvColumn: "name_ch-DE", localeCode: "de-CH", field: "name" },
      { csvColumn: "name_nl-NL", localeCode: "nl-NL", field: "name" },
    ],

    clearBeforeImport: false,
  },

  countries: {
    csvFile: "./geographies list/countries_26-04-10.csv",
    collection: "countries",
    translationsCollection: "countries_translations",
    parentFkField: "countries_id",
    localeFkField: "translations_id",

    mainFields: {
      id: "id",
      destination_id: "destination_id",
      cid_primarix: "cid_primarix",
      id_primarix: "id_primarix",
      cid_px_karawane: "cid_px_karawane",
      id_px_karawane: "id_px_karawane",
      ISO: "ISO",
    },

    foreignKeys: {
      destination_id: {
        csvColumn: "destination_id",
        targetCollection: "destinations",
        targetField: "sort",
        directusField: "destination_id",
        optional: true,
      },
    },

    translationColumns: [
      // { csvColumn: "name_en-GB", localeCode: "en-GB", field: "name" },
      { csvColumn: "name_de-DE", localeCode: "de-DE", field: "name" },
      { csvColumn: "name_ch-DE", localeCode: "de-CH", field: "name" },
      { csvColumn: "name_nl-NL", localeCode: "nl-NL", field: "name" },
    ],

    clearBeforeImport: false,
  },

  regions: {
    csvFile: "./geographies list/regions_26-04-10.csv",
    collection: "regions",
    translationsCollection: "regions_translations",
    parentFkField: "regions_id",
    localeFkField: "translations_id",

    mainFields: {
      id: "id",
      country_id: "country_id",
      cid_primarix: "cid_primarix",
      id_primarix: "id_primarix",
    },

    m2mFields: {
      country_id: {
        csvColumn: "country_id",
        junctionField: "countries_geo_id",
      },
    },

    foreignKeys: {},

    translationColumns: [
      // { csvColumn: "name_en-GB", localeCode: "en-GB", field: "name" },
      { csvColumn: "name_de-DE", localeCode: "de-DE", field: "name" },
      { csvColumn: "name_ch-DE", localeCode: "de-CH", field: "name" },
      { csvColumn: "name_nl-NL", localeCode: "nl-NL", field: "name" },
    ],

    clearBeforeImport: true,
  },

  states: {
    csvFile: "./geographies list/states_26-04-10.csv",
    collection: "states",
    translationsCollection: "states_translations",
    parentFkField: "states_id",
    localeFkField: "translations_id",

    mainFields: {
      id: "id",
      country_id: "country_id",
      ISO: "ISO",
    },

    foreignKeys: {
      country_id: {
        csvColumn: "country_id",
        targetCollection: "countries",
        targetField: "sort",
        directusField: "country_id",
        optional: false,
      },
    },

    translationColumns: [
      // { csvColumn: "name_en-GB", localeCode: "en-GB", field: "name" },
      { csvColumn: "name_de-DE", localeCode: "de-DE", field: "name" },
      { csvColumn: "name_ch-DE", localeCode: "de-CH", field: "name" },
      { csvColumn: "name_nl-NL", localeCode: "nl-NL", field: "name" },
    ],

    clearBeforeImport: false,
  },

  places: {
    csvFile: "./geographies list/places_26-04-10.csv",
    collection: "places",
    translationsCollection: "places_translations",
    parentFkField: "places_id",
    localeFkField: "translations_id",

    mainFields: {
      id: "id",
      location_tour32: "location_tour32",
      country_id: "country_id",
      state_id: "state_id",
      region_id: "region_id",
      cid_primarix: "cid_primarix",
      id_primarix: "id_primarix",
    },

    foreignKeys: {
      location_tour32: {
        csvColumn: "location_tour32",
        targetCollection: "locations_tour32",
        targetField: "id",
        directusField: "location_tour32",
        optional: true,
      },
      country_id: {
        csvColumn: "country_id",
        targetCollection: "countries",
        targetField: "id",
        directusField: "country_id",
        optional: false,
      },
      state_id: {
        csvColumn: "state_id",
        targetCollection: "states",
        targetField: "id",
        directusField: "state_id",
        optional: true,
      },
      region_id: {
        csvColumn: "region_id",
        targetCollection: "regions",
        targetField: "id",
        directusField: "region_id",
        optional: true,
      },
    },

    translationColumns: [
      // { csvColumn: "name_en-GB", localeCode: "en-GB", field: "name" },
      { csvColumn: "name_de-DE", localeCode: "de-DE", field: "name" },
      { csvColumn: "name_ch-DE", localeCode: "de-CH", field: "name" },
      { csvColumn: "name_nl-NL", localeCode: "nl-NL", field: "name" },
    ],

    clearBeforeImport: true,
  },

  locations_tour32: {
    csvFile: "./geographies list/locations_tour32_26-03-04.csv",
    collection: "locations_tour32",
    translationsCollection: "locations_tour32_translations",
    parentFkField: "locations_tour32_id",
    localeFkField: "translations_id",

    mainFields: {
      id: "id",
    },

    foreignKeys: {},

    translationColumns: [
      { csvColumn: "name_de", localeCode: "de-DE", field: "name" },
    ],

    clearBeforeImport: false,
  },

  occupancies: {
    csvFile: "./data/hotels_rooms_occupancies.csv",
    collection: "occupancies",
    translationsCollection: "occupancies_translations",
    parentFkField: "occupancies_id",
    localeFkField: "translations_id",

    mainFields: {
      name: "name",
      value: "value",
      from_price: "from_price",
    },

    foreignKeys: {},

    translationColumns: [
      { csvColumn: "name_de-DE", localeCode: "de-DE", field: "occupancy" },
      { csvColumn: "name_ch-DE", localeCode: "de-CH", field: "occupancy" },
      { csvColumn: "name_nl-NL", localeCode: "nl-NL", field: "occupancy" },
    ],

    clearBeforeImport: true,
  },

  cruises_types: {
    csvFile: "./data/cruises_types.csv",
    collection: "cruises_types",
    translationsCollection: "cruises_types_translations",
    parentFkField: "cruises_types_id",
    localeFkField: "translations_id",

    mainFields: {
      cid_primarix: "cid_primarix",
      id_primarix: "id_primarix",
    },

    foreignKeys: {},

    translationColumns: [
      { csvColumn: "name_de-DE", localeCode: "de-DE", field: "cruise_type" },
      { csvColumn: "name_ch-DE", localeCode: "de-CH", field: "cruise_type" },
      // { csvColumn: "name_nl-NL", localeCode: "nl-NL", field: "cruise_type" },
      // { csvColumn: "name_en-GB", localeCode: "en-GB", field: "cruise_type" },
    ],

    clearBeforeImport: true,
  },
};

// =============================================================================
// CSV Parser
// =============================================================================
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);

  return lines
    .slice(1)
    .map((line) => {
      if (!line.trim()) return null;
      const values = splitCSVLine(line);
      const row = {};
      headers.forEach((h, i) => {
        row[h] = values[i] !== undefined ? values[i] : "";
      });
      return row;
    })
    .filter(Boolean);
}

function splitCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// =============================================================================
// Directus API Helper
// =============================================================================
async function directusRequest(method, path, body) {
  const url = `${CONFIG.directusUrl}${path}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CONFIG.directusToken}`,
    },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${text}`);
  }

  if (res.status === 204) return null;

  return res.json();
}

// =============================================================================
// FK Resolution Cache
// =============================================================================
const fkMappingCache = {};

async function buildFKMapping(targetCollection, targetField) {
  const cacheKey = `${targetCollection}:${targetField}`;
  if (fkMappingCache[cacheKey]) {
    return fkMappingCache[cacheKey];
  }

  const result = await directusRequest(
    "GET",
    `/items/${targetCollection}?fields=id,${targetField}&limit=-1`,
  );
  const items = result.data || [];

  const mapping = {};
  items.forEach((item) => {
    const csvValue = item[targetField];
    if (csvValue !== null && csvValue !== undefined) {
      mapping[csvValue] = item.id;
    }
  });

  fkMappingCache[cacheKey] = mapping;
  return mapping;
}

// =============================================================================
// Clear Collection
// =============================================================================
async function clearCollection(profile) {
  console.log(`  Fetching existing ${profile.collection} IDs...`);
  const result = await directusRequest(
    "GET",
    `/items/${profile.collection}?fields=id&limit=-1`,
  );
  const ids = (result.data || []).map((r) => r.id);

  if (ids.length === 0) {
    console.log("  Nothing to delete.");
    return;
  }

  console.log(`  Deleting ${ids.length} translation record(s)...`);
  const filter = encodeURIComponent(
    JSON.stringify({ [profile.parentFkField]: { _in: ids } }),
  );
  const transResult = await directusRequest(
    "GET",
    `/items/${profile.translationsCollection}?fields=id&filter=${filter}&limit=-1`,
  );
  const transIds = (transResult.data || []).map((r) => r.id);
  if (transIds.length > 0) {
    await directusRequest(
      "DELETE",
      `/items/${profile.translationsCollection}`,
      transIds,
    );
    console.log(`  Deleted ${transIds.length} translation record(s).`);
  }

  console.log(`  Deleting ${ids.length} ${profile.collection} record(s)...`);
  await directusRequest("DELETE", `/items/${profile.collection}`, ids);
  console.log("  Done clearing.");
}

// =============================================================================
// Main Import Function
// =============================================================================
async function importCollection(profileName, localeMap) {
  if (!PROFILES[profileName]) {
    throw new Error(
      `Unknown profile: ${profileName}. Available: ${Object.keys(PROFILES).join(", ")}`,
    );
  }

  const profile = PROFILES[profileName];

  console.log(`\n=== Importing ${profileName} ===`);
  console.log(`CSV file   : ${profile.csvFile}`);
  console.log(`Collection : ${profile.collection}`);
  console.log("");

  // 1. Parse CSV
  const rows = parseCSV(profile.csvFile);
  if (rows.length === 0) {
    console.error("No data rows found in CSV. Aborting.");
    process.exit(1);
  }
  console.log(`Parsed ${rows.length} row(s) from CSV.`);

  // 2. Clear if requested
  if (profile.clearBeforeImport) {
    console.log("\nClearing existing data...");
    await clearCollection(profile);
  }

  // 3. Build FK mappings (if needed)
  const fkMappings = {};
  for (const [csvField, fkConfig] of Object.entries(profile.foreignKeys)) {
    console.log(
      `\nBuilding FK mapping for ${csvField} (${fkConfig.targetCollection}/${fkConfig.targetField})...`,
    );
    fkMappings[csvField] = await buildFKMapping(
      fkConfig.targetCollection,
      fkConfig.targetField,
    );
  }

  // 4. Import rows
  let itemsCreated = 0;
  let translationsCreated = 0;
  const warnings = [];

  console.log("\nImporting...");

  for (const row of rows) {
    // a. Build main item payload with FK resolution
    const mainPayload = {};

    for (const [csvCol, fieldName] of Object.entries(profile.mainFields)) {
      const val = row[csvCol];
      if (val !== undefined && val !== "") {
        mainPayload[fieldName] = isNaN(val) || val === "" ? val : Number(val);
      }
    }

    // Handle m2mFields (e.g. regions_geo -> country_id)
    if (profile.m2mFields) {
      for (const [directusField, m2mConfig] of Object.entries(
        profile.m2mFields,
      )) {
        const csvValue = row[m2mConfig.csvColumn];
        if (csvValue) {
          const ids = csvValue
            .split(";")
            .map((v) => Number(v.trim()))
            .filter((v) => !isNaN(v));
          if (ids.length > 0) {
            mainPayload[directusField] = ids.map((id) => ({
              [m2mConfig.junctionField]: id,
            }));
          }
        }
      }
    }

    // Resolve FKs
    for (const [csvField, fkConfig] of Object.entries(profile.foreignKeys)) {
      const csvValue = row[fkConfig.csvColumn];

      if (csvValue === undefined || csvValue === "") {
        if (!fkConfig.optional) {
          warnings.push(
            `Row ${row.id}: missing required FK ${fkConfig.csvColumn}`,
          );
          break;
        }
        continue;
      }

      const fkMapping = fkMappings[csvField];
      const resolvedUUID = fkMapping[csvValue];

      if (!resolvedUUID) {
        if (fkConfig.optional) {
          warnings.push(
            `Row ${row.id}: FK ${fkConfig.csvColumn}=${csvValue} not found (optional, skipped)`,
          );
          continue;
        } else {
          warnings.push(
            `Row ${row.id}: FK ${fkConfig.csvColumn}=${csvValue} not found (required)`,
          );
          break;
        }
      }

      mainPayload[fkConfig.directusField] = resolvedUUID;
    }

    // b. Create main item
    let newItem;
    try {
      const createResult = await directusRequest(
        "POST",
        `/items/${profile.collection}`,
        mainPayload,
      );
      newItem = createResult.data;
      itemsCreated++;
    } catch (err) {
      warnings.push(
        `Row ${JSON.stringify(row)}: failed to create item — ${err.message}`,
      );
      continue;
    }

    // c. Create translation records
    if (newItem && profile.translationColumns.length > 0) {
      console.log("newItem", newItem);
      for (const colDef of profile.translationColumns) {
        console.log("colDef", colDef);

        const value = row[colDef.csvColumn];
        console.log("value", value);

        if (value === undefined || value === "") {
          continue;
        }

        const localeUUID = localeMap[colDef.localeCode];
        console.log("localeUUID", localeUUID);

        if (!localeUUID) {
          warnings.push(
            `Item ${newItem.id}: locale "${colDef.localeCode}" not found — skipped`,
          );
          continue;
        }

        const transPayload = {
          [profile.parentFkField]: newItem.id,
          [profile.localeFkField]: localeUUID,
          [colDef.field]: value,
        };
        console.log("transPayload", transPayload);

        try {
          await directusRequest(
            "POST",
            `/items/${profile.translationsCollection}`,
            transPayload,
          );
          translationsCreated++;
        } catch (err) {
          warnings.push(
            `Item ${newItem.id} locale ${colDef.localeCode}: failed — ${err.message}`,
          );
        }
      }
    }
  }

  // 5. Summary
  console.log("\n=== Summary ===");
  console.log(`✅ Created ${itemsCreated} item(s) in ${profile.collection}`);
  if (profile.translationColumns.length > 0) {
    console.log(
      `✅ Created ${translationsCreated} translation record(s) in ${profile.translationsCollection}`,
    );
  }
  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} warning(s):`);
    warnings.slice(0, 10).forEach((w) => console.log(`   - ${w}`));
    if (warnings.length > 10) {
      console.log(`   ... and ${warnings.length - 10} more`);
    }
  } else {
    console.log("✅ No warnings");
  }

  return itemsCreated;
}

// =============================================================================
// Main Entry Point
// =============================================================================
async function main() {
  const profileName = process.argv[2];

  if (!profileName) {
    console.error("Usage: node import-csv.js <profileName>");
    console.error("Available profiles:");
    Object.keys(PROFILES).forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }

  console.log("=== Directus Multi-Collection CSV Import ===");

  // Fetch locale map once
  console.log("\nFetching locale UUIDs...");
  const locResult = await directusRequest(
    "GET",
    "/items/translations?fields=id,code&limit=-1",
  );
  const locales = locResult.data || [];
  const localeMap = Object.fromEntries(locales.map((l) => [l.code, l.id]));
  console.log(
    `Found ${locales.length} locale(s): ${Object.keys(localeMap).join(", ")}`,
  );

  // Import
  await importCollection(profileName, localeMap);
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});
