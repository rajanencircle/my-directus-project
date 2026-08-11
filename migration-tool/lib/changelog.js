"use strict";

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

// Per CLAUDE.md rule #3: every direct change to a live instance must be
// logged in one of these trackers.
const TARGET_LOG_DIR = {
  staging: "STAGING_CHANGES",
  dev: "DEV_CHANGES",
  main: "MAIN_CHANGES",
};

function timestampSlug() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

/**
 * Appends a dated markdown entry recording a real (non-dry-run) migration.
 * `local` writes into CHANGES_AS_DEV/LOCAL-CHANGES.md (append), matching
 * that file's existing purpose; staging/dev/main each get a new dated file
 * in their respective tracker folder.
 */
function writeChangelog(details) {
  const {
    from,
    to,
    dumpUsed,
    rollbackBackupPath,
    preserveDirectusFiles,
    directusFilesCountBefore,
    directusFilesCountAfter,
    orphanCounts,
    preserveUserTokens,
    tokenRestoreCounts,
    preserveEntityTypes,
    globalConfigRestoreCount,
  } = details;

  const body = [
    `# Data sync: ${to} <- ${from} (${timestampSlug()})`,
    "",
    `- Performed via \`migration-tool/migrate.js\``,
    `- Source dump: \`${dumpUsed}\``,
    `- Target rollback backup (revert path): \`${rollbackBackupPath}\``,
    `- Preserve target's \`directus_files\`: ${preserveDirectusFiles ? "yes (default runbook behavior)" : "no (overridden with source's files)"}`,
    `- \`directus_files\` row count — before: ${directusFilesCountBefore}, after: ${directusFilesCountAfter}`,
    orphanCounts
      ? `- Orphaned FK rows cleaned up:\n${Object.entries(orphanCounts)
          .map(([table, count]) => `  - \`${table}\`: ${count}`)
          .join("\n")}`
      : "- Orphan cleanup: skipped (directus_files was overridden, not preserved)",
    `- Preserve target's \`directus_users\` API tokens: ${preserveUserTokens ? "yes (default — keeps integrations working)" : "no (overridden with source's tokens)"}`,
    tokenRestoreCounts
      ? `- User tokens restored: ${tokenRestoreCounts.matched}/${tokenRestoreCounts.total} matched by email`
      : "- Token restore: skipped (not preserved)",
    preserveEntityTypes && preserveEntityTypes.length > 0
      ? `- Preserved \`global_configurations\` entity_type(s): ${preserveEntityTypes.join(", ")} (${globalConfigRestoreCount ?? 0} row(s) upserted from target's prior values)`
      : "- global_configurations: no entity_type selected for preservation (source dump's values used as-is)",
    "",
    `See [docs/STAGING-DEV-DATA-SYNC-RUNBOOK.md](../docs/STAGING-DEV-DATA-SYNC-RUNBOOK.md) for the underlying procedure this automates.`,
    "",
  ].join("\n");

  if (to === "local") {
    const filePath = path.join(REPO_ROOT, "CHANGES_AS_DEV", "LOCAL-CHANGES.md");
    fs.appendFileSync(filePath, `\n---\n\n${body}`);
    return filePath;
  }

  const dir = path.join(REPO_ROOT, TARGET_LOG_DIR[to]);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `DATA-SYNC-${to.toUpperCase()}-FROM-${from.toUpperCase()}-${timestampSlug()}.md`);
  fs.writeFileSync(filePath, body);
  return filePath;
}

module.exports = { writeChangelog };
