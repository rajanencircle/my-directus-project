/**
 * Move existing directus_files into the new canonical destination-cluster folders,
 * based on each file's `destination` -> `destinations.destinations_cluster_id` ->
 * `directus_folders.destinations_cluster` join.
 *
 * Why: the media library's existing folder tree (BILDERARCHIV BOTG/KARAWANE > BILDER >
 * region subfolders) was imported as-is from the legacy FotoWare source system. Going
 * forward, the "Destination Upload" flow auto-assigns new uploads to one canonical
 * folder per destinations_cluster (see directus/extensions/media-bundle's UploadModal.vue
 * + useDestinationFolderResolver.ts) instead of that legacy tree. This script does the
 * one-time backfill for files that already exist, moving them out of the legacy tree
 * into the matching canonical cluster folder. It only touches files whose `destination`
 * resolves to a cluster that has exactly one canonical folder — anything ambiguous or
 * unresolvable is left untouched and reported, never guessed.
 *
 * Requirements: Node.js 18+ (built-in fetch)
 *
 * Credentials (never hardcoded — set these in your shell before running):
 *   DIRECTUS_LOCAL_TOKEN     (URL defaults to http://localhost:8055, override with DIRECTUS_LOCAL_URL)
 *   DIRECTUS_DEV_TOKEN       (URL defaults to https://dev.content.botg.cloud, override with DIRECTUS_DEV_URL)
 *   DIRECTUS_STAGING_TOKEN   (URL defaults to https://staging.content.botg.cloud, override with DIRECTUS_STAGING_URL)
 *   DIRECTUS_MAIN_URL + DIRECTUS_MAIN_TOKEN   (production — no default URL, both must be set explicitly)
 *
 * Usage:
 *   node scripts/migrate-media-to-destination-cluster-folders.js <local|dev|staging|main> [--dry-run] [--yes]
 *
 *   --dry-run  show what would move, make no writes (default — pass --yes to actually write)
 *   --yes      skip the interactive confirmation prompt (still required to
 *              additionally type MAIN when targeting production)
 *
 * Examples:
 *   node scripts/migrate-media-to-destination-cluster-folders.js staging --dry-run
 *   node scripts/migrate-media-to-destination-cluster-folders.js staging --yes
 *
 * Rollback: before writing, a backup of every moved file's previous `folder` value is
 * saved to scripts/backups/media-folder-migration-<env>-<timestamp>.json. To revert,
 * replay that file's {id, previousFolder} pairs back through the same batch-update
 * call this script uses (group by previousFolder, one PATCH per group).
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const ENVIRONMENTS = {
  local: {
    urlEnv: "DIRECTUS_LOCAL_URL",
    tokenEnv: "DIRECTUS_LOCAL_TOKEN",
    defaultUrl: "http://localhost:8055",
  },
  dev: {
    urlEnv: "DIRECTUS_DEV_URL",
    tokenEnv: "DIRECTUS_DEV_TOKEN",
    defaultUrl: "https://dev.content.botg.cloud",
  },
  staging: {
    urlEnv: "DIRECTUS_STAGING_URL",
    tokenEnv: "DIRECTUS_STAGING_TOKEN",
    defaultUrl: "https://staging.content.botg.cloud",
  },
  main: {
    urlEnv: "DIRECTUS_MAIN_URL",
    tokenEnv: "DIRECTUS_MAIN_TOKEN",
    defaultUrl: "https://content.botg.cloud",
  },
};

function parseArgs(argv) {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const envName = positional[0];
  const dryRun = argv.includes("--dry-run") || !argv.includes("--yes");
  const skipConfirm = argv.includes("--yes");
  return { envName, dryRun, skipConfirm };
}

function resolveEnvironment(envName) {
  const envConfig = ENVIRONMENTS[envName];
  if (!envConfig) {
    throw new Error(
      `Unknown environment "${envName}". Must be one of: ${Object.keys(ENVIRONMENTS).join(", ")}`,
    );
  }

  const url = process.env[envConfig.urlEnv] || envConfig.defaultUrl;
  const token = process.env[envConfig.tokenEnv];

  if (!url) {
    throw new Error(`No URL configured for "${envName}". Set ${envConfig.urlEnv} in your shell.`);
  }
  if (!token) {
    throw new Error(
      `Missing admin token. Set ${envConfig.tokenEnv} in your shell before running this script.`,
    );
  }

  return { url, token };
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function directusRequest(url, token, method, endpoint, body) {
  const res = await fetch(`${url}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${endpoint} → HTTP ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function main() {
  const { envName, dryRun, skipConfirm } = parseArgs(process.argv.slice(2));

  if (!envName) {
    console.error(
      "Usage: node scripts/migrate-media-to-destination-cluster-folders.js <local|dev|staging|main> [--dry-run] [--yes]",
    );
    process.exit(1);
  }

  const { url, token } = resolveEnvironment(envName);

  console.log(`Environment : ${envName} (${url})`);
  console.log(`Mode        : ${dryRun ? "DRY RUN (no writes)" : "LIVE"}`);

  // 1. Canonical destination-cluster folders: clusterId -> folderId (skip ambiguous clusters).
  const { data: folders } = await directusRequest(
    url,
    token,
    "GET",
    "/folders?limit=-1&fields=id,name,destinations_cluster",
  );
  const clusterFolders = new Map(); // clusterId -> [folderId, ...]
  for (const f of folders) {
    if (f.destinations_cluster == null) continue;
    const clusterId = typeof f.destinations_cluster === "object" ? f.destinations_cluster.id : f.destinations_cluster;
    const list = clusterFolders.get(clusterId) ?? [];
    list.push(f.id);
    clusterFolders.set(clusterId, list);
  }

  const ambiguousClusters = [...clusterFolders.entries()].filter(([, ids]) => ids.length > 1);
  if (ambiguousClusters.length > 0) {
    console.warn(
      `\n⚠️  ${ambiguousClusters.length} cluster(s) have more than one folder — skipping files for these clusters:`,
    );
    for (const [clusterId, ids] of ambiguousClusters) {
      console.warn(`  - cluster ${clusterId}: folders ${ids.join(", ")}`);
    }
  }
  const clusterToFolder = new Map(
    [...clusterFolders.entries()].filter(([, ids]) => ids.length === 1).map(([clusterId, ids]) => [clusterId, ids[0]]),
  );

  if (clusterToFolder.size === 0) {
    console.error("\nNo unambiguous canonical destination-cluster folders found — nothing to do.");
    return;
  }

  // 2. Every file with a destination set.
  const { data: files } = await directusRequest(
    url,
    token,
    "GET",
    "/files?limit=-1&fields=id,folder,destination.destinations_cluster_id",
  );

  const noDestination = files.filter((f) => f.destination == null);
  const withDestination = files.filter((f) => f.destination != null);
  const noCluster = withDestination.filter((f) => f.destination.destinations_cluster_id == null);
  const resolvable = withDestination.filter((f) => f.destination.destinations_cluster_id != null);

  const toMove = [];
  const unmatchedCluster = [];
  for (const f of resolvable) {
    const clusterId =
      typeof f.destination.destinations_cluster_id === "object"
        ? f.destination.destinations_cluster_id.id
        : f.destination.destinations_cluster_id;
    const targetFolder = clusterToFolder.get(clusterId);
    if (!targetFolder) {
      unmatchedCluster.push({ id: f.id, clusterId });
      continue;
    }
    const currentFolder = typeof f.folder === "object" ? f.folder?.id ?? null : f.folder;
    if (currentFolder !== targetFolder) {
      toMove.push({ id: f.id, previousFolder: currentFolder, targetFolder });
    }
  }

  console.log(`\nTotal files                        : ${files.length}`);
  console.log(`No destination set (skipped)       : ${noDestination.length}`);
  console.log(`Destination has no cluster (skipped): ${noCluster.length}`);
  console.log(`Cluster has no canonical folder yet : ${unmatchedCluster.length}`);
  console.log(`Already in the right folder         : ${resolvable.length - toMove.length - unmatchedCluster.length}`);
  console.log(`Will be moved                       : ${toMove.length}`);

  if (unmatchedCluster.length > 0) {
    const clusters = [...new Set(unmatchedCluster.map((f) => f.clusterId))];
    console.warn(`\n⚠️  Clusters with files but no canonical folder yet: ${clusters.join(", ")}`);
  }

  if (toMove.length === 0) {
    console.log("\nNothing to move.");
    return;
  }

  // Group by target folder for batch PATCH calls.
  const byTarget = new Map();
  for (const m of toMove) {
    const list = byTarget.get(m.targetFolder) ?? [];
    list.push(m);
    byTarget.set(m.targetFolder, list);
  }

  console.log("\nSample of files that will move:");
  toMove.slice(0, 10).forEach((m) => {
    console.log(`  - ${m.id}: folder ${m.previousFolder ?? "(none)"} → ${m.targetFolder}`);
  });
  if (toMove.length > 10) console.log(`  ...and ${toMove.length - 10} more`);

  if (dryRun) {
    console.log("\nDry run complete — no changes written. Pass --yes to actually move these files.");
    return;
  }

  if (!skipConfirm) {
    const answer = await prompt(
      `\nThis will move ${toMove.length} file(s) into their canonical destination-cluster folder in "${envName}". Type "yes" to continue: `,
    );
    if (answer.toLowerCase() !== "yes") {
      console.log("Aborted — no changes made.");
      return;
    }
  }

  if (envName === "main") {
    const answer = await prompt(
      '\nThis is PRODUCTION. Type "MAIN" (all caps) to confirm you really mean to bulk-move production media: ',
    );
    if (answer !== "MAIN") {
      console.log("Aborted — no changes made.");
      return;
    }
  }

  const backupDir = path.join(__dirname, "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `media-folder-migration-${envName}-${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(toMove, null, 2));
  console.log(`\nBackup written to ${backupPath}`);

  for (const [targetFolder, group] of byTarget) {
    await directusRequest(url, token, "PATCH", "/files", {
      keys: group.map((m) => m.id),
      data: { folder: targetFolder },
    });
    console.log(`  ✓ Moved ${group.length} file(s) into folder ${targetFolder}`);
  }

  console.log(`\n✅ Moved ${toMove.length} file(s) in "${envName}" into their canonical destination-cluster folder.`);
}

main().catch((err) => {
  console.error("\nFATAL ERROR:", err.message);
  process.exit(1);
});
