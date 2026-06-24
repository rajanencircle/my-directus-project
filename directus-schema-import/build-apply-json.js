#!/usr/bin/env node
/**
 * Directus "schema apply" JSON Builder
 *
 * Produces a SINGLE JSON snapshot file = the full current Directus schema PLUS
 * the new collections/fields/relations from one or more YAML files. The result
 * is a bare Directus snapshot (version/directus/vendor/collections/fields/relations)
 * that you apply directly with:
 *
 *     npx directus schema apply ./YAMLs/apply-local-<date>.json
 *
 * Because the file contains EVERYTHING currently in Directus plus the additions,
 * `schema apply` will only ADD the new items — nothing existing is deleted
 * (nothing is "missing" from the snapshot, so the diff has no deletions).
 *
 * ── Two ways to supply the current schema ──────────────────────────────────
 *
 * A) From a local snapshot file (RECOMMENDED — guarantees the apply-diff is exact,
 *    since the same DB/CLI produced it). First run:
 *
 *      npx directus schema snapshot ./YAMLs/backups/current-snapshot.json
 *      node build-apply-json.js \
 *        --snapshot ../YAMLs/backups/current-snapshot.json \
 *        --yamls ../YAMLs/excursions_schema_26-06-22_v2.yaml \
 *        --out ../YAMLs/apply-local.json
 *      npx directus schema apply ./YAMLs/apply-local.json
 *
 *    (--snapshot accepts both a bare snapshot and an API-wrapped { data: {...} } file,
 *     e.g. the repo's snapshot.json.)
 *
 * B) Live from a running Directus via the API (uses tokens from .env):
 *
 *      node build-apply-json.js --env local \
 *        --yamls ../YAMLs/excursions_schema_26-06-22_v2.yaml
 *
 * ── npm scripts ────────────────────────────────────────────────────────────
 *      npm run build:excursions       # live local fetch + excursions YAML
 *      npm run build:all              # live local fetch + both YAMLs
 *      npm run build:from-file        # use ../snapshot.json as the current schema
 *
 * Config: copy .env.example to .env and fill in your tokens (only needed for --env).
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
  const result = { env: null, url: null, token: null, snapshot: null, yamls: [], out: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--env" && args[i + 1]) result.env = args[++i];
    else if (args[i] === "--url" && args[i + 1]) result.url = args[++i];
    else if (args[i] === "--token" && args[i + 1]) result.token = args[++i];
    else if (args[i] === "--snapshot" && args[i + 1]) result.snapshot = args[++i];
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

// ─── LOAD CURRENT SNAPSHOT ───────────────────────────────────────────────────
// Returns a bare snapshot { version, directus, vendor, collections, fields, relations }.
// Accepts a local file (bare OR API-wrapped { data: {...} }) or a live API fetch.
async function loadCurrentSnapshot(args) {
  if (args.snapshot) {
    const abs = path.resolve(args.snapshot);
    if (!fs.existsSync(abs)) throw new Error(`Snapshot file not found: ${abs}`);
    console.log(`📥 Reading current schema from file: ${abs}`);
    const parsed = JSON.parse(fs.readFileSync(abs, "utf-8"));
    // Unwrap API-style { data: {...} } responses (e.g. the repo's snapshot.json)
    const snap = parsed.data && parsed.data.collections ? parsed.data : parsed;
    return { snap, liveCollectionNames: null, envName: "file" };
  }

  // Live API fetch
  let url, token, envName;
  if (args.env) {
    const envCfg = CONFIG.environments[args.env];
    if (!envCfg) {
      throw new Error(
        `Unknown environment "${args.env}". Available: ${Object.keys(CONFIG.environments).join(", ")}`,
      );
    }
    url = envCfg.url;
    token = args.token || envCfg.token;
    envName = args.env;
    if (!token) {
      throw new Error(
        `No token for environment "${args.env}". Add DIRECTUS_${args.env.toUpperCase()}_TOKEN to .env or pass --token.`,
      );
    }
  } else if (args.url && args.token) {
    url = args.url;
    token = args.token;
    envName = "custom";
  } else {
    throw new Error(
      "Provide --snapshot <file>  OR  --env <name>  OR  both --url and --token.",
    );
  }

  console.log(`📥 Fetching current schema snapshot from ${url} ...`);
  const currentResp = await apiGet(url, token, "/schema/snapshot");
  const snap = currentResp.data;

  // Also fetch live collection list to catch snapshot inconsistencies
  const liveCollResp = await apiGet(url, token, "/collections?limit=-1");
  const liveCollectionNames = new Set((liveCollResp.data || []).map((c) => c.collection));

  return { snap, liveCollectionNames, envName, url };
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── MERGE SNAPSHOTS (additive only) ─────────────────────────────────────────
function mergeSnapshots(current, importSnapshots, liveCollectionNames) {
  const snapshotCollections = new Set((current.collections || []).map((c) => c.collection));
  const existingFields = new Set((current.fields || []).map((f) => `${f.collection}.${f.field}`));
  const existingRelations = new Set((current.relations || []).map((r) => `${r.collection}.${r.field}`));

  // If no live list provided (file mode), trust the snapshot alone.
  const liveNames = liveCollectionNames || new Set();
  const allExistingCollections = new Set([...snapshotCollections, ...liveNames]);

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
    for (const coll of importSnap.collections || []) {
      if (!allExistingCollections.has(coll.collection)) {
        merged.collections.push(coll);
        allExistingCollections.add(coll.collection);
        snapshotCollections.add(coll.collection);
        addedCollectionNames.add(coll.collection);
        added.collections.push(coll.collection);
      } else if (!snapshotCollections.has(coll.collection) && liveNames.has(coll.collection)) {
        if (!skipped.collections.includes(coll.collection)) {
          skipped.collections.push(coll.collection);
        }
      }
    }

    for (const field of importSnap.fields || []) {
      const collectionIsNew = addedCollectionNames.has(field.collection);
      if (collectionIsNew || snapshotCollections.has(field.collection)) {
        const key = `${field.collection}.${field.field}`;
        if (!existingFields.has(key)) {
          merged.fields.push(field);
          existingFields.add(key);
          added.fields.push(key);
        }
      }
    }

    for (const rel of importSnap.relations || []) {
      const collectionIsNew = addedCollectionNames.has(rel.collection);
      if (collectionIsNew || snapshotCollections.has(rel.collection)) {
        const key = `${rel.collection}.${rel.field}`;
        if (!existingRelations.has(key)) {
          merged.relations.push(rel);
          existingRelations.add(key);
          added.relations.push(`${key} → ${rel.related_collection}`);
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

  // 1. Load current schema (file or live)
  const { snap: current, liveCollectionNames, envName } = await loadCurrentSnapshot(args);
  console.log(
    `   Current: ${current.collections?.length || 0} collections, ` +
    `${current.fields?.length || 0} fields, ` +
    `${current.relations?.length || 0} relations`,
  );
  if (liveCollectionNames && liveCollectionNames.size !== (current.collections?.length || 0)) {
    console.log(
      `   ⚠️  Live collections (${liveCollectionNames.size}) differ from snapshot ` +
      `(${current.collections?.length || 0}) — using live list for existence checks.`,
    );
  }

  // 2. Save a backup of the current snapshot (the "complete snapshot of current Directus")
  const backupsDir = path.join(__dirname, "..", "YAMLs", "backups");
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const currentBackupPath = path.join(backupsDir, `current-snapshot-${envName}-${ts}.json`);
  fs.writeFileSync(currentBackupPath, JSON.stringify(current, null, 2));
  console.log(`💾 Current schema backed up to: ${currentBackupPath}`);

  // 3. Load + parse YAMLs (this is the YAML → JSON conversion).
  //    Also drop a standalone .json next to each YAML for reference.
  const importSnapshots = [];
  for (const yamlPath of args.yamls) {
    console.log(`\n📂 Loading YAML: ${yamlPath}`);
    const snap = yaml.load(fs.readFileSync(yamlPath, "utf-8"));
    console.log(
      `   YAML: ${snap.collections?.length || 0} collections, ` +
      `${snap.fields?.length || 0} fields, ` +
      `${snap.relations?.length || 0} relations`,
    );
    const jsonTwin = yamlPath.replace(/\.ya?ml$/i, ".json");
    fs.writeFileSync(jsonTwin, JSON.stringify(snap, null, 2));
    console.log(`   → JSON written: ${jsonTwin}`);
    importSnapshots.push(snap);
  }

  // 4. Merge (additive only)
  console.log("\n🔀 Merging current schema + new YAML(s) (additive only)...");
  const { merged, added, skipped } = mergeSnapshots(current, importSnapshots, liveCollectionNames);

  if (skipped.collections.length > 0) {
    console.log(`\n   ⚠️  Skipped — exist in live but missing from snapshot (${skipped.collections.length}):`);
    skipped.collections.forEach((c) => console.log(`      ~ ${c}`));
  }
  console.log(`\n   + ${added.collections.length} new collections:`);
  added.collections.forEach((c) => console.log(`      ${c}`));
  console.log(`\n   + ${added.fields.length} new fields`);
  console.log(`   + ${added.relations.length} new relations`);
  console.log(
    `\n   Merged total: ${merged.collections.length} collections, ` +
    `${merged.fields.length} fields, ${merged.relations.length} relations`,
  );

  if (added.collections.length === 0 && added.fields.length === 0 && added.relations.length === 0) {
    console.log("\n   ℹ️  Nothing new to add — all YAML items already exist in the current schema.");
  }

  // 5. Write the single merged JSON, ready for `npx directus schema apply`
  const outPath = args.out
    ? path.resolve(args.out)
    : path.join(__dirname, "..", "YAMLs", `apply-${envName}-${ts}.json`);
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), "utf-8");

  console.log(`\n✅ Apply-ready JSON written to:\n   ${outPath}`);
  console.log("\n   Apply it with:");
  console.log(`     npx directus schema apply ${path.relative(path.join(__dirname, ".."), outPath)}`);
  console.log("   (run a dry run first to review the diff:)");
  console.log(`     npx directus schema apply --dry-run ${path.relative(path.join(__dirname, ".."), outPath)}\n`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
