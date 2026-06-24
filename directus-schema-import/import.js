#!/usr/bin/env node
/**
 * Directus Additive Schema Importer
 *
 * Imports new collections/fields/relations from one or more YAML snapshot files
 * into a Directus instance WITHOUT modifying or deleting any existing schema.
 *
 * How it works:
 *   1. Fetch the current full snapshot from the target Directus instance.
 *   2. Load each YAML file and extract only NEW items (collections/fields/relations
 *      that do not yet exist in the current snapshot).
 *   3. Build a Directus-format diff with only kind:N (new) operations — no API call
 *      needed for /schema/diff, so large instance sizes are not a problem.
 *   4. Apply the diff via /schema/apply (additive only, zero risk of deletions).
 *
 * Usage (via npm scripts — run from this folder):
 *   npm run dry:excursions          # dry run, excursions YAML, local
 *   npm run dry:all                 # dry run, both YAMLs, local
 *   npm run apply:excursions        # apply excursions, local
 *   npm run staging:dry:excursions  # dry run, excursions, staging
 *
 * Usage (direct node — can run from project root or this folder):
 *   node import.js --env local --yamls ../YAMLs/excursions_schema_26-06-22_v2.yaml --dry-run
 *   node import.js --env staging --yamls ../YAMLs/excursions_schema_26-06-22_v2.yaml
 *   node import.js --url http://localhost:8055 --token abc123 --yamls ../YAMLs/file.yaml
 *
 * Config: copy .env.example to .env and fill in your tokens.
 */

"use strict";

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

// ─── ENVIRONMENT CONFIG ───────────────────────────────────────────────────────
// Tokens are loaded from .env — copy .env.example to .env to get started.
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
  const result = { env: null, url: null, token: null, yamls: [], dryRun: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--env" && args[i + 1]) result.env = args[++i];
    else if (args[i] === "--url" && args[i + 1]) result.url = args[++i];
    else if (args[i] === "--token" && args[i + 1]) result.token = args[++i];
    else if (args[i] === "--dry-run") result.dryRun = true;
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

async function apiPost(baseUrl, token, endpoint, body) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(`POST ${endpoint} → ${res.status}: ${bodyText}`);
  }
  if (res.status === 204) return { success: true };
  return res.json();
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── COLLECT NEW ITEMS ────────────────────────────────────────────────────────
// Returns only the items from the YAML snapshots that don't exist in current.
// liveCollectionNames supplements the snapshot to catch inconsistencies where
// a collection exists in the live DB but is missing from the snapshot API response.
function collectNewItems(current, importSnapshots, liveCollectionNames) {
  const snapshotCollections = new Set((current.collections || []).map((c) => c.collection));
  const existingFields = new Set((current.fields || []).map((f) => `${f.collection}.${f.field}`));
  const existingRelations = new Set((current.relations || []).map((r) => `${r.collection}.${r.field}`));

  // Union of snapshot + live: anything in either is considered "existing"
  const allExistingCollections = new Set([...snapshotCollections, ...liveCollectionNames]);

  const added = { collections: [], fields: [], relations: [] };
  const addedCollectionNames = new Set();
  const skipped = { collections: [] };

  for (const importSnap of importSnapshots) {
    // Collections: skip if in snapshot OR in live
    for (const coll of importSnap.collections || []) {
      if (!allExistingCollections.has(coll.collection)) {
        allExistingCollections.add(coll.collection);
        addedCollectionNames.add(coll.collection);
        added.collections.push(coll);
      } else if (!snapshotCollections.has(coll.collection) && liveCollectionNames.has(coll.collection)) {
        // In live but missing from snapshot — inconsistent state, skip with warning
        if (!skipped.collections.includes(coll.collection)) {
          skipped.collections.push(coll.collection);
        }
      }
    }

    for (const field of importSnap.fields || []) {
      const key = `${field.collection}.${field.field}`;
      const collectionIsNew = addedCollectionNames.has(field.collection);

      if (collectionIsNew) {
        // New collection being added — include all its fields
        if (!existingFields.has(key)) {
          existingFields.add(key);
          added.fields.push(field);
        }
      } else if (snapshotCollections.has(field.collection)) {
        // Existing collection in snapshot — add only fields missing from snapshot
        if (!existingFields.has(key)) {
          existingFields.add(key);
          added.fields.push(field);
        }
      }
      // else: collection in live but not snapshot (inconsistent) — skip field entirely
    }

    for (const rel of importSnap.relations || []) {
      const key = `${rel.collection}.${rel.field}`;
      const collectionIsNew = addedCollectionNames.has(rel.collection);

      if (collectionIsNew || snapshotCollections.has(rel.collection)) {
        if (!existingRelations.has(key)) {
          existingRelations.add(key);
          added.relations.push(rel);
        }
      }
      // else: inconsistent collection — skip relation
    }
  }

  return { added, skipped };
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── BUILD DIFF ───────────────────────────────────────────────────────────────
// Constructs a Directus schema diff payload using only kind:N (new) operations.
// Folder/group collections (schema: null) cannot be applied via /schema/apply —
// they are returned separately for creation via the Collections API.
function buildAdditiveDiff(added) {
  const regularCollections = added.collections.filter((c) => c.schema !== null);
  const folderCollections = added.collections.filter((c) => c.schema === null);

  const diff = {
    collections: regularCollections.map((coll) => ({
      collection: coll.collection,
      diff: [{ kind: "N", rhs: coll }],
    })),
    fields: added.fields.map((field) => ({
      collection: field.collection,
      field: field.field,
      diff: [{ kind: "N", rhs: field }],
    })),
    systemFields: [],
    relations: added.relations.map((rel) => ({
      collection: rel.collection,
      field: rel.field,
      related_collection: rel.related_collection,
      diff: [{ kind: "N", rhs: rel }],
    })),
  };

  return { diff, folderCollections };
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── SAVE DIFF ────────────────────────────────────────────────────────────────
function saveDiff(diffPayload, envName) {
  const backupsDir = path.join(__dirname, "..", "YAMLs", "backups");
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = path.join(backupsDir, `diff-${envName}-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(diffPayload, null, 2));
  return outPath;
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

  console.log("\n════════════════════════════════════════════════════════");
  console.log("   Directus Additive Schema Importer");
  console.log("════════════════════════════════════════════════════════");
  console.log(`  Environment : ${envName}`);
  console.log(`  Target URL  : ${url}`);
  console.log(`  Mode        : ${args.dryRun ? "DRY RUN (no changes)" : "APPLY"}`);
  console.log(`  YAMLs       : ${args.yamls.join(", ")}`);
  console.log("════════════════════════════════════════════════════════\n");

  // 1. Fetch current snapshot + live collection list (snapshot can be inconsistent)
  console.log("📥 Fetching current schema snapshot...");
  const currentResp = await apiGet(url, token, "/schema/snapshot");
  const current = currentResp.data;
  console.log(
    `   Snapshot: ${current.collections?.length || 0} collections, ` +
    `${current.fields?.length || 0} fields, ` +
    `${current.relations?.length || 0} relations`,
  );

  const liveCollResp = await apiGet(url, token, "/collections?limit=-1");
  const liveCollectionNames = new Set(
    (liveCollResp.data || []).map((c) => c.collection),
  );
  const snapshotCount = current.collections?.length || 0;
  if (liveCollectionNames.size !== snapshotCount) {
    console.log(
      `   ⚠️  Live collections (${liveCollectionNames.size}) differ from snapshot (${snapshotCount}) — will use live list as source of truth.`,
    );
  }

  // 2. Load and parse YAMLs
  const importSnapshots = [];
  for (const yamlPath of args.yamls) {
    console.log(`\n📂 Loading YAML: ${yamlPath}`);
    const content = fs.readFileSync(yamlPath, "utf-8");
    const snap = yaml.load(content);
    console.log(
      `   YAML schema: ${snap.collections?.length || 0} collections, ` +
      `${snap.fields?.length || 0} fields, ` +
      `${snap.relations?.length || 0} relations`,
    );
    importSnapshots.push(snap);
  }

  // 3. Collect only new items (additive, no modifications to existing)
  console.log("\n🔀 Identifying new items (additive only)...");
  const { added, skipped } = collectNewItems(current, importSnapshots, liveCollectionNames);

  if (skipped.collections.length > 0) {
    console.log(`\n   ⚠️  Skipped — exist in live Directus but missing from snapshot (${skipped.collections.length}):`);
    skipped.collections.forEach((c) => console.log(`      ~ ${c}`));
  }

  console.log(`\n   ✅ New collections to add (${added.collections.length}):`);
  added.collections.forEach((c) => console.log(`      + ${c.collection}`));

  console.log(`\n   ✅ New fields to add (${added.fields.length}):`);
  added.fields.forEach((f) => console.log(`      + ${f.collection}.${f.field}`));

  console.log(`\n   ✅ New relations to add (${added.relations.length}):`);
  added.relations.forEach((r) => console.log(`      + ${r.collection}.${r.field} → ${r.related_collection}`));

  if (added.collections.length === 0 && added.fields.length === 0 && added.relations.length === 0) {
    console.log("\n   ℹ️  Nothing new to add — all YAML items already exist in the target instance.");
    return;
  }

  // 4. Get schema hash from server (required by /schema/apply to prevent race conditions).
  //    Directus always hashes the CURRENT server state regardless of what target snapshot
  //    you send to /schema/diff. We send a minimal empty snapshot (same version info,
  //    zero collections/fields/relations) to avoid any payload validation errors.
  //    We discard the diff returned and use our own additive-only one.
  console.log("\n🔑 Fetching schema hash from server...");
  const minimalSnapshot = {
    version: current.version,
    directus: current.directus,
    vendor: current.vendor,
    collections: [],
    fields: [],
    relations: [],
  };
  const hashResp = await apiPost(url, token, "/schema/diff?force=true", minimalSnapshot);
  const hash = hashResp.data?.hash;
  if (!hash) {
    throw new Error("Could not retrieve schema hash from /schema/diff response.");
  }
  console.log(`   Hash: ${hash}`);

  // 5. Build additive diff (folder/group collections split out — handled separately)
  const { diff, folderCollections } = buildAdditiveDiff(added);
  const diffPayload = { hash, diff };

  // Save diff for audit trail before applying
  const diffPath = saveDiff(diffPayload, envName);
  console.log(`\n💾 Diff saved to: ${diffPath}`);

  console.log("\n📋 Diff summary (additive only, kind:N — zero deletions possible):");
  if (folderCollections.length > 0) {
    console.log(`   Folder collections (via API): ${folderCollections.length}`);
    folderCollections.forEach((c) => console.log(`      📁 ${c.collection}`));
  }
  console.log(`   Collections (schema apply)  : ${diff.collections.length}`);
  console.log(`   Fields                      : ${diff.fields.length}`);
  console.log(`   Relations                   : ${diff.relations.length}`);

  if (args.dryRun) {
    console.log("\n✅ DRY RUN complete — no changes applied.");
    console.log("   Re-run without --dry-run to apply.\n");
    return;
  }

  // 6. Create folder/group collections first via Collections API
  //    (/schema/apply crashes on schema:null collections)
  if (folderCollections.length > 0) {
    console.log(`\n📁 Creating ${folderCollections.length} folder collection(s) via Collections API...`);
    for (const coll of folderCollections) {
      await apiPost(url, token, "/collections", {
        collection: coll.collection,
        meta: coll.meta || {},
      });
      console.log(`   ✓ ${coll.collection}`);
    }
  }

  // 7. Apply schema diff for regular collections + fields + relations.
  //    Use force=true to bypass the hash check — creating folder collections above
  //    changes the live hash, and our diff is provably additive (all kind:N) so
  //    there is no risk of clobbering concurrent changes.
  console.log("\n🚀 Applying schema changes...");
  await apiPost(url, token, "/schema/apply?force=true", diffPayload);
  console.log("\n✅ Schema import complete!");
  console.log(
    `   Added: ${added.collections.length} collections, ${added.fields.length} fields, ${added.relations.length} relations\n`,
  );
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
