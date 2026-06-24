#!/usr/bin/env node
/**
 * Directus Schema YAML Merger
 *
 * Fetches the current Directus schema snapshot and merges one or more YAML files
 * into it, producing a single combined YAML file that you can apply manually.
 *
 * Because the output contains EVERYTHING currently in Directus PLUS the new
 * collections/fields/relations, applying it via `directus schema apply` (or the
 * Directus UI) will NOT delete any existing data — nothing is "missing" from it.
 *
 * Usage (via npm scripts — run from this folder):
 *   npm run merge:excursions          # merge excursions YAML with local snapshot
 *   npm run merge:all                 # merge both YAMLs with local snapshot
 *   npm run staging:merge:excursions  # merge using staging snapshot
 *
 * Usage (direct node):
 *   node merge-yaml.js --env local --yamls ../YAMLs/excursions_schema_26-06-22_v2.yaml
 *   node merge-yaml.js --env local --yamls ../YAMLs/excursions_schema_26-06-22_v2.yaml ../YAMLs/tours_schema_26-06-22.yaml
 *   node merge-yaml.js --env local --yamls ../YAMLs/file.yaml --out ../YAMLs/my-merged.yaml
 *
 * Config: copy .env.example to .env and fill in your tokens.
 */

"use strict";

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

// ─── ENVIRONMENT CONFIG ───────────────────────────────────────────────────────
const CONFIG = {
  environments: {
    local: {
      url: process.env.DIRECTUS_LOCAL_URL || "http://localhost:8055",
      token: process.env.DIRECTUS_LOCAL_TOKEN || "",
    },
    staging: {
      url: process.env.DIRECTUS_STAGING_URL || "https://directus-staging-botg.func.team",
      token: process.env.DIRECTUS_STAGING_TOKEN || "",
    },
    production: {
      url: process.env.DIRECTUS_PROD_URL || "",
      token: process.env.DIRECTUS_PROD_TOKEN || "",
    },
  },
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── ARG PARSING ─────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { env: null, url: null, token: null, yamls: [], out: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--env" && args[i + 1]) result.env = args[++i];
    else if (args[i] === "--url" && args[i + 1]) result.url = args[++i];
    else if (args[i] === "--token" && args[i + 1]) result.token = args[++i];
    else if (args[i] === "--out" && args[i + 1]) result.out = args[++i];
    else if (args[i] === "--yamls") {
      while (args[i + 1] && !args[i + 1].startsWith("--")) {
        result.yamls.push(args[++i]);
      }
    }
  }

  return result;
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── HTTP HELPERS ─────────────────────────────────────────────────────────────
async function apiGet(baseUrl, token, endpoint) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${endpoint} → ${res.status}: ${body}`);
  }
  return res.json();
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── MERGE SNAPSHOTS ─────────────────────────────────────────────────────────
// Merges import snapshots into the current snapshot — additive only.
// liveCollectionNames supplements the snapshot to catch inconsistencies where
// a collection exists in the live DB but is missing from the snapshot API response.
function mergeSnapshots(current, importSnapshots, liveCollectionNames) {
  const snapshotCollections = new Set((current.collections || []).map((c) => c.collection));
  const existingFields = new Set((current.fields || []).map((f) => `${f.collection}.${f.field}`));
  const existingRelations = new Set((current.relations || []).map((r) => `${r.collection}.${r.field}`));

  // Union of snapshot + live for collection existence checks
  const allExistingCollections = new Set([...snapshotCollections, ...liveCollectionNames]);

  const merged = {
    version: current.version,
    directus: current.directus,
    vendor: current.vendor,
    collections: [...(current.collections || [])],
    fields: [...(current.fields || [])],
    relations: [...(current.relations || [])],
  };

  const added = { collections: [], fields: [], relations: [] };
  const skipped = { collections: [] };
  const addedCollectionNames = new Set();

  for (const importSnap of importSnapshots) {
    // Collections
    for (const coll of importSnap.collections || []) {
      if (!allExistingCollections.has(coll.collection)) {
        merged.collections.push(coll);
        allExistingCollections.add(coll.collection);
        snapshotCollections.add(coll.collection);
        addedCollectionNames.add(coll.collection);
        added.collections.push(coll.collection);
      } else if (!snapshotCollections.has(coll.collection) && liveCollectionNames.has(coll.collection)) {
        if (!skipped.collections.includes(coll.collection)) {
          skipped.collections.push(coll.collection);
        }
      }
    }

    // Fields: include if collection is new OR collection exists in snapshot and field is new
    for (const field of importSnap.fields || []) {
      const collectionIsNew = addedCollectionNames.has(field.collection);
      if (collectionIsNew || snapshotCollections.has(field.collection)) {
        const key = `${field.collection}.${field.field}`;
        if (!existingFields.has(key)) {
          merged.fields.push(field);
          existingFields.add(key);
          added.fields.push(`${field.collection}.${field.field}`);
        }
      }
      // else: inconsistent collection (live but not snapshot) — skip
    }

    // Relations: same logic
    for (const rel of importSnap.relations || []) {
      const collectionIsNew = addedCollectionNames.has(rel.collection);
      if (collectionIsNew || snapshotCollections.has(rel.collection)) {
        const key = `${rel.collection}.${rel.field}`;
        if (!existingRelations.has(key)) {
          merged.relations.push(rel);
          existingRelations.add(key);
          added.relations.push(`${rel.collection}.${rel.field} → ${rel.related_collection}`);
        }
      }
    }
  }

  return { merged, added, skipped };
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();

  let url, token, envName;

  if (args.env) {
    const envCfg = CONFIG.environments[args.env];
    if (!envCfg) {
      console.error(
        `❌ Unknown environment "${args.env}". Available: ${Object.keys(CONFIG.environments).join(", ")}`,
      );
      process.exit(1);
    }
    url = envCfg.url;
    token = args.token || envCfg.token;
    envName = args.env;
    if (!token) {
      console.error(`❌ No token for environment "${args.env}".`);
      console.error(`   Add DIRECTUS_${args.env.toUpperCase()}_TOKEN to your .env file.`);
      console.error(`   Or pass --token <value> directly.`);
      process.exit(1);
    }
  } else if (args.url && args.token) {
    url = args.url;
    token = args.token;
    envName = "custom";
  } else {
    console.error("❌ Provide --env <name>  OR  both --url <url> and --token <token>.");
    console.error("   Also required: --yamls <file1.yaml> [file2.yaml ...]");
    process.exit(1);
  }

  if (args.yamls.length === 0) {
    console.error("❌ No YAML files specified. Use --yamls <file1> [file2 ...]");
    process.exit(1);
  }

  for (const yamlPath of args.yamls) {
    if (!fs.existsSync(yamlPath)) {
      console.error(`❌ YAML file not found: ${yamlPath}`);
      process.exit(1);
    }
  }

  // Resolve output path
  const ts = new Date().toISOString().slice(0, 10);
  const outPath = args.out || path.join(__dirname, "..", "YAMLs", `merged-${envName}-${ts}.yaml`);

  console.log("\n════════════════════════════════════════════════════════");
  console.log("   Directus Schema YAML Merger");
  console.log("════════════════════════════════════════════════════════");
  console.log(`  Environment : ${envName}`);
  console.log(`  Source URL  : ${url}`);
  console.log(`  YAMLs       : ${args.yamls.join(", ")}`);
  console.log(`  Output      : ${outPath}`);
  console.log("════════════════════════════════════════════════════════\n");

  // 1. Fetch current snapshot
  console.log("📥 Fetching current schema snapshot...");
  const currentResp = await apiGet(url, token, "/schema/snapshot");
  const current = currentResp.data;
  console.log(
    `   Snapshot: ${current.collections?.length || 0} collections, ` +
    `${current.fields?.length || 0} fields, ` +
    `${current.relations?.length || 0} relations`,
  );

  // Also fetch live collection list to catch snapshot inconsistencies
  const liveCollResp = await apiGet(url, token, "/collections?limit=-1");
  const liveCollectionNames = new Set(
    (liveCollResp.data || []).map((c) => c.collection),
  );
  if (liveCollectionNames.size !== (current.collections?.length || 0)) {
    console.log(
      `   ⚠️  Live collections (${liveCollectionNames.size}) differ from snapshot (${current.collections?.length || 0}) — using live list for existence checks.`,
    );
  }

  // 2. Load and parse YAMLs
  const importSnapshots = [];
  for (const yamlPath of args.yamls) {
    console.log(`\n📂 Loading YAML: ${yamlPath}`);
    const content = fs.readFileSync(yamlPath, "utf-8");
    const snap = yaml.load(content);
    console.log(
      `   YAML: ${snap.collections?.length || 0} collections, ` +
      `${snap.fields?.length || 0} fields, ` +
      `${snap.relations?.length || 0} relations`,
    );
    importSnapshots.push(snap);
  }

  // 3. Merge
  console.log("\n🔀 Merging (additive only)...");
  const { merged, added, skipped } = mergeSnapshots(current, importSnapshots, liveCollectionNames);

  if (skipped.collections.length > 0) {
    console.log(`\n   ⚠️  Skipped — exist in live but missing from snapshot (${skipped.collections.length}):`);
    skipped.collections.forEach((c) => console.log(`      ~ ${c}`));
  }

  console.log(`\n   + ${added.collections.length} new collections:`);
  added.collections.forEach((c) => console.log(`      ${c}`));

  console.log(`\n   + ${added.fields.length} new fields:`);
  added.fields.forEach((f) => console.log(`      ${f}`));

  console.log(`\n   + ${added.relations.length} new relations:`);
  added.relations.forEach((r) => console.log(`      ${r}`));

  console.log(`\n   Merged total: ${merged.collections.length} collections, ${merged.fields.length} fields, ${merged.relations.length} relations`);

  if (added.collections.length === 0 && added.fields.length === 0 && added.relations.length === 0) {
    console.log("\n   ℹ️  Nothing new to add — all YAML items already exist.");
  }

  // 4. Write merged YAML
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const yamlStr = yaml.dump(merged, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });

  fs.writeFileSync(outPath, yamlStr, "utf-8");

  console.log(`\n✅ Merged YAML written to:\n   ${outPath}`);
  console.log("\n   This file contains the full current schema PLUS your new additions.");
  console.log("   You can safely apply it via `directus schema apply` without losing anything.\n");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
