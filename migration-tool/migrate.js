#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const inquirer = require("inquirer");

const config = require("./lib/config");
const { createTransport } = require("./lib/transport");
const { listDumpsForEnv, primaryFolderNameFor } = require("./lib/dumps");
const { withThrowawayPostgres } = require("./lib/local-postgres");
const { writeChangelog } = require("./lib/changelog");

const SCRATCH_DIR = path.join(__dirname, ".tmp");

function log(msg) {
  console.log(`  ${new Date().toISOString()}  ${msg}`);
}
function warn(msg) {
  console.log(`  ${new Date().toISOString()}  ⚠️  ${msg}`);
}
function ok(msg) {
  console.log(`  ${new Date().toISOString()}  ✅ ${msg}`);
}

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function dateFolder() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}

// `sudo` only ever elevates the `docker` call itself (never a surrounding
// pipe/redirect) — matches BOTG/Backup/backup/index.js's convention exactly
// so dump files stay owned by the SSH user, not root, and remain
// SFTP-downloadable. `local` needs no sudo at all.
function dockerBin(envConfig) {
  return envConfig.kind === "local" ? "docker" : "sudo docker";
}

// ── Dump a live container's DB to a local .sql.gz file (rollback backups) ──
async function backupContainerToLocalFile(transport, envConfig, localFilePath) {
  const dumpCmd = `${dockerBin(envConfig)} exec ${envConfig.dbContainer} pg_dump -U ${envConfig.dbUser} ${envConfig.dbName} | gzip`;

  if (envConfig.kind === "local") {
    await transport.exec(`${dumpCmd} > ${JSON.stringify(localFilePath)}`);
    return;
  }

  const remoteTmp = `/tmp/mt_backup_${ts()}.sql.gz`;
  await transport.exec(`${dumpCmd} > ${remoteTmp}`);
  await transport.download(remoteTmp, localFilePath);
  await transport.exec(`rm -f ${remoteTmp}`);
}

// ── Export directus_files (data-only) from a live container ───────────────
async function exportDirectusFilesToLocalFile(transport, envConfig, localFilePath) {
  const dumpCmd = `${dockerBin(envConfig)} exec ${envConfig.dbContainer} pg_dump -U ${envConfig.dbUser} -d ${envConfig.dbName} --data-only --table=directus_files`;

  if (envConfig.kind === "local") {
    await transport.exec(`${dumpCmd} > ${JSON.stringify(localFilePath)}`);
    return;
  }

  const remoteTmp = `/tmp/mt_files_${ts()}.sql`;
  await transport.exec(`${dumpCmd} > ${remoteTmp}`);
  await transport.download(remoteTmp, localFilePath);
  await transport.exec(`rm -f ${remoteTmp}`);
}

// ── Push a local file into a container via psql, transparently over SSH ───
async function psqlFileIntoContainer(transport, envConfig, localFilePath, { gunzip = false } = {}) {
  const psql = `${dockerBin(envConfig)} exec -i ${envConfig.dbContainer} psql -U ${envConfig.dbUser} -d ${envConfig.dbName} -v ON_ERROR_STOP=1`;
  const cat = gunzip ? "gunzip -c" : "cat";

  if (envConfig.kind === "local") {
    await transport.exec(`${cat} ${JSON.stringify(localFilePath)} | ${psql}`);
    return;
  }

  const remoteTmp = `/tmp/mt_load_${ts()}${gunzip ? ".sql.gz" : ".sql"}`;
  await transport.upload(localFilePath, remoteTmp);
  await transport.exec(`${cat} ${remoteTmp} | ${psql}`);
  await transport.exec(`rm -f ${remoteTmp}`);
}

async function psqlQuery(transport, envConfig, sql) {
  return transport.execCapture(
    `${dockerBin(envConfig)} exec ${envConfig.dbContainer} psql -U ${envConfig.dbUser} -d ${envConfig.dbName} -t -A -c ${JSON.stringify(sql)}`,
  );
}

async function psqlQueryPiped(transport, envConfig, sql) {
  // for local, avoids nested quoting headaches — writes the query to a temp
  // file rather than trying to shell-escape a large multi-line SQL string.
  const tmpFile = path.join(SCRATCH_DIR, `q_${ts()}.sql`);
  fs.writeFileSync(tmpFile, sql);
  try {
    if (envConfig.kind === "local") {
      return transport.execCapture(
        `${dockerBin(envConfig)} exec -i ${envConfig.dbContainer} psql -U ${envConfig.dbUser} -d ${envConfig.dbName} -t -A -F'|' < ${JSON.stringify(tmpFile)}`,
      );
    }
    const remoteTmp = `/tmp/mt_query_${ts()}.sql`;
    await transport.upload(tmpFile, remoteTmp);
    const out = await transport.execCapture(
      `${dockerBin(envConfig)} exec -i ${envConfig.dbContainer} psql -U ${envConfig.dbUser} -d ${envConfig.dbName} -t -A -F'|' < ${remoteTmp}`,
    );
    await transport.exec(`rm -f ${remoteTmp}`);
    return out;
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

// ── Column list helper ─────────────────────────────────────────────────
async function liveColumns(transport, envConfig, table) {
  const out = await psqlQuery(
    transport,
    envConfig,
    `SELECT string_agg(column_name, ',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_name='${table}';`,
  );
  return out.trim().split(",").filter(Boolean);
}

// ── Dynamic FK discovery pointing at directus_files ─────────────────────
const FK_DISCOVERY_QUERY = `
SELECT tc.table_name || '|' || kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'directus_files'
ORDER BY 1,2;
`.trim();

// directus_users.avatar has no DB-level FK constraint (nullable, no
// foreign_key_table set) but is still a real Directus relation — see
// docs/STAGING-DEV-DATA-SYNC-RUNBOOK.md step 8.
const KNOWN_APP_LEVEL_RELATIONS = [{ table: "directus_users", column: "avatar" }];

async function discoverDirectusFilesReferences(queryFn) {
  const raw = await queryFn(FK_DISCOVERY_QUERY);
  const pairs = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [table, column] = l.split("|");
      return { table, column };
    });

  for (const known of KNOWN_APP_LEVEL_RELATIONS) {
    if (!pairs.some((p) => p.table === known.table && p.column === known.column)) {
      pairs.push(known);
    }
  }
  return pairs;
}

// M2M junction tables to directus_files consistently use this column name —
// those rows get DELETEd on orphan. Everything else is a single-value FK on
// a real entity row, which gets UPDATEd to NULL instead. See runbook step 10.
function isJunctionColumn(column) {
  return column === "directus_files_id";
}

function orphanCountSql({ table, column }) {
  return `SELECT '${table}.${column}', count(*) FROM "${table}" a WHERE a."${column}" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a."${column}");`;
}

function orphanCleanupSql({ table, column }) {
  if (isJunctionColumn(column)) {
    return `DELETE FROM "${table}" a WHERE a."${column}" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = a."${column}");`;
  }
  return `UPDATE "${table}" SET "${column}" = NULL WHERE "${column}" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM directus_files f WHERE f.id = "${table}"."${column}");`;
}

async function reportOrphans(queryFn, references) {
  const sql = references.map(orphanCountSql).join("\n");
  const raw = await queryFn(sql);
  const counts = {};
  raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, count] = line.split("|");
      counts[key] = parseInt(count, 10);
    });
  return counts;
}

// ── User token preservation ──────────────────────────────────────────────
// directus_users.token holds static API tokens in plaintext (unlike the
// bcrypt-hashed password column) — client integrations authenticate with
// these directly, so wiping the target must not silently rotate them.
// Preserved by matching on email (ids can differ between independently-
// seeded environments); a user with no match in the source dump just has
// no update applied — harmless, since that user doesn't exist post-restore.

function sqlStringLiteral(v) {
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function fetchPreservableUserTokens(transport, envConfig) {
  const raw = await psqlQueryPiped(
    transport,
    envConfig,
    "SELECT email, token FROM directus_users WHERE token IS NOT NULL AND email IS NOT NULL;",
  );
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [email, token] = l.split("|");
      return { email, token };
    });
}

// RETURNING+count so the identical statement can either preview (run inside
// the disposable throwaway container) or apply for real (run against the
// live target) — both cases, it performs the UPDATE.
function buildTokenRestoreSql(tokenRows) {
  const values = tokenRows.map((r) => `(${sqlStringLiteral(r.email)}, ${sqlStringLiteral(r.token)})`).join(",\n    ");
  return [
    "WITH updated AS (",
    "  UPDATE directus_users u SET token = v.token",
    "  FROM (VALUES",
    `    ${values}`,
    "  ) AS v(email, token)",
    "  WHERE u.email = v.email AND u.token IS DISTINCT FROM v.token",
    "  RETURNING u.email",
    ")",
    "SELECT count(*) FROM updated;",
  ].join("\n");
}

// ── global_configurations preservation, by entity_type ──────────────────
// global_configurations is a flat key/value settings table (ai-api tokens,
// directus-url base_url, botg-api keys, etc.) — `entity` is unique per row,
// `entity_type` groups related rows (e.g. all "ai-api" rows). Unlike
// directus_files, nothing else has an FK into this table (verified via the
// `relations` MCP tool — only its own user_created/user_updated point OUT
// to directus_users), so a simple upsert-by-entity is enough: no orphan
// reconciliation needed. NULL is written for a value field when the
// original was NULL/empty, per sqlValueLiteral below.

function sqlValueLiteral(v) {
  return v === null || v === undefined || v === "" ? "NULL" : sqlStringLiteral(v);
}

async function fetchGlobalConfigEntityTypes(transport, envConfig) {
  const raw = await psqlQueryPiped(
    transport,
    envConfig,
    "SELECT DISTINCT entity_type FROM global_configurations WHERE entity_type IS NOT NULL ORDER BY entity_type;",
  );
  return raw.split("\n").map((l) => l.trim()).filter(Boolean);
}

async function fetchGlobalConfigRows(transport, envConfig, entityTypes) {
  if (entityTypes.length === 0) return [];
  const inList = entityTypes.map(sqlStringLiteral).join(", ");
  const raw = await psqlQueryPiped(
    transport,
    envConfig,
    `SELECT entity, entity_type, key, value FROM global_configurations WHERE entity_type IN (${inList}) AND entity IS NOT NULL;`,
  );
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [entity, entity_type, key, value] = l.split("|");
      return { entity, entity_type, key, value };
    });
}

// RETURNING+count, same shape as buildTokenRestoreSql — upserts by the
// unique `entity` column so the target's preserved row wins regardless of
// whether the source dump also had a row with that same entity name.
function buildGlobalConfigRestoreSql(rows) {
  const values = rows
    .map(
      (r) =>
        `(${sqlStringLiteral(r.entity)}, ${sqlStringLiteral(r.entity_type)}, ${sqlValueLiteral(r.key)}, ${sqlValueLiteral(r.value)})`,
    )
    .join(",\n    ");
  return [
    "WITH upserted AS (",
    "  INSERT INTO global_configurations (entity, entity_type, key, value)",
    "  VALUES",
    `    ${values}`,
    "  ON CONFLICT (entity) DO UPDATE SET",
    "    entity_type = EXCLUDED.entity_type,",
    "    key = EXCLUDED.key,",
    "    value = EXCLUDED.value",
    "  RETURNING entity",
    ")",
    "SELECT count(*) FROM upserted;",
  ].join("\n");
}

// ── Prompts ────────────────────────────────────────────────────────────
async function promptEnvironment(message, exclude) {
  const choices = config.ENV_KEYS.filter((e) => e !== exclude);
  const { env } = await inquirer.prompt([
    { type: "list", name: "env", message, choices },
  ]);
  return env;
}

async function promptDump(env, backupRoot) {
  const dumps = listDumpsForEnv(backupRoot, env);
  if (dumps.length === 0) {
    console.log(
      `\nNo dumps found for [${env}] under ${backupRoot}.\n` +
        `Run the BOTG/Backup tool first:\n` +
        `  cd "/Users/rajan/Documents/RAJAN/directus/BOTG/Backup" && npm run backup\n` +
        `(select project "botg", environment "${env}", type "Database dump")\n`,
    );
    return null;
  }

  const { dumpPath } = await inquirer.prompt([
    {
      type: "list",
      name: "dumpPath",
      message: `Select a dump for [${env}] (newest first):`,
      choices: dumps.map((d) => ({
        name: `${d.dateFolder}/${d.file}  (${d.mtime.toISOString()})`,
        value: d.fullPath,
      })),
    },
  ]);
  return dumpPath;
}

async function promptPreserveFiles(to) {
  const { preserve } = await inquirer.prompt([
    {
      type: "confirm",
      name: "preserve",
      message: `Preserve [${to}]'s current directus_files (recommended — keeps its real S3-linked media rows)?`,
      default: true,
    },
  ]);
  return preserve;
}

async function promptPreserveTokens(to) {
  const { preserve } = await inquirer.prompt([
    {
      type: "confirm",
      name: "preserve",
      message: `Preserve [${to}]'s current directus_users API tokens (recommended — keeps its integrations working instead of overwriting with the source's tokens)?`,
      default: true,
    },
  ]);
  return preserve;
}

async function promptPreserveGlobalConfig(to, entityTypes) {
  if (entityTypes.length === 0) return [];
  const { selected } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selected",
      message: `Select global_configurations entity_type(s) to preserve from [${to}] (its current rows win over the source's for these types — all checked by default):`,
      choices: entityTypes.map((t) => ({ name: t, value: t, checked: true })),
    },
  ]);
  return selected;
}

async function promptMode() {
  const { mode } = await inquirer.prompt([
    {
      type: "list",
      name: "mode",
      message: "Mode:",
      choices: [
        { name: "Dry run (preview only, touches no live target)", value: "dry-run" },
        { name: "Execute (performs the real migration)", value: "execute" },
      ],
      default: 0,
    },
  ]);
  return mode;
}

async function confirmExecute(from, to) {
  const { typedEnv } = await inquirer.prompt([
    {
      type: "input",
      name: "typedEnv",
      message: `This REPLACES [${to}]'s entire database with [${from}]'s dump and cannot be undone without the rollback backup. Type "${to}" to confirm:`,
    },
  ]);
  if (typedEnv.trim() !== to) return false;

  if (config.PRODUCTION_ENVIRONMENTS.includes(to)) {
    warn(`[${to}] is PRODUCTION.`);
    const { typedPhrase } = await inquirer.prompt([
      { type: "input", name: "typedPhrase", message: `Type exactly: CONFIRM PRODUCTION MIGRATION` },
    ]);
    if (typedPhrase.trim() !== "CONFIRM PRODUCTION MIGRATION") return false;
  }

  return true;
}

// ── Dry run ────────────────────────────────────────────────────────────
async function runDryRun({ from, to, dumpPath, preserve, preserveTokens, preserveEntityTypes, toTransport, toConfig }) {
  log(`Exporting [${to}]'s current directus_files (read-only) ...`);
  const targetFilesExport = path.join(SCRATCH_DIR, `dryrun_target_files_${ts()}.sql`);
  await exportDirectusFilesToLocalFile(toTransport, toConfig, targetFilesExport);

  const targetFilesCountRaw = await psqlQuery(
    toTransport,
    toConfig,
    "SELECT count(*) FROM directus_files;",
  );
  const targetFilesCount = parseInt(targetFilesCountRaw.trim(), 10);

  let userTokens = [];
  if (preserveTokens) {
    log(`Exporting [${to}]'s current user tokens (read-only) ...`);
    userTokens = await fetchPreservableUserTokens(toTransport, toConfig);
    log(`[${to}] has ${userTokens.length} user token(s) that would be preserved.`);
  }

  let globalConfigRows = [];
  if (preserveEntityTypes.length > 0) {
    log(`Exporting [${to}]'s global_configurations rows for entity_type(s): ${preserveEntityTypes.join(", ")} (read-only) ...`);
    globalConfigRows = await fetchGlobalConfigRows(toTransport, toConfig, preserveEntityTypes);
    log(`[${to}] has ${globalConfigRows.length} global_configurations row(s) that would be preserved.`);
  }

  const pg = config.dryRunPostgresConfig();

  await withThrowawayPostgres(
    pg,
    dumpPath,
    async (execQuery, containerName) => {
      ok(`Source dump restored into throwaway container.`);

      const sourceFilesCountRaw = execQuery("SELECT count(*) FROM directus_files;");
      const sourceFilesCount = parseInt(sourceFilesCountRaw.trim(), 10);
      log(`Source dump's directus_files rows: ${sourceFilesCount}`);
      log(`Target [${to}]'s current directus_files rows: ${targetFilesCount}`);

      if (!preserve) {
        ok(`Override mode selected — target would end up with the source's ${sourceFilesCount} directus_files rows as-is. No orphan reconciliation needed.`);
      } else {
        // Compare column lists between what the dump defines and what the
        // throwaway (= post-restore schema) actually has.
        const throwawayColumns = execQuery(
          "SELECT string_agg(column_name, ',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_name='directus_files';",
        )
          .trim()
          .split(",");
        const targetLiveColumns = await liveColumns(toTransport, toConfig, "directus_files");
        const colsMatch =
          throwawayColumns.length === targetLiveColumns.length &&
          throwawayColumns.every((c, i) => c === targetLiveColumns[i]);

        if (!colsMatch) {
          warn(
            `directus_files column mismatch between source dump and [${to}] — a real run's directus_files swap (step 7) would need manual adjustment.\n` +
              `  Dump/restored schema columns: ${throwawayColumns.join(", ")}\n` +
              `  [${to}] live columns:          ${targetLiveColumns.join(", ")}`,
          );
        } else {
          ok(`directus_files columns match between source dump and [${to}] — the swap can proceed as-is.`);
        }

        log(`Simulating the directus_files swap inside the throwaway container ...`);
        execQuery("BEGIN;");
        execQuery("SET session_replication_role = replica;");
        execQuery("DELETE FROM directus_files;");
        // load target's export
        const loadCmd = `docker exec -i ${containerName} psql -U ${pg.user} -d ${pg.db} -v ON_ERROR_STOP=0`;
        execSync(`cat ${JSON.stringify(targetFilesExport)} | ${loadCmd}`, {
          stdio: ["inherit", "pipe", "pipe"],
          shell: "/bin/bash",
        });
        execQuery("SET session_replication_role = origin;");
        execQuery("COMMIT;");

        const afterCountRaw = execQuery("SELECT count(*) FROM directus_files;");
        log(`directus_files rows after simulated swap: ${afterCountRaw.trim()} (should match [${to}]'s current ${targetFilesCount})`);

        const references = await discoverDirectusFilesReferences((sql) => execQuery(sql));
        log(`Discovered ${references.length} FK/relation(s) pointing at directus_files: ${references.map((r) => `${r.table}.${r.column}`).join(", ")}`);

        const orphanCounts = await reportOrphans((sql) => execQuery(sql), references);
        console.log("\n  Orphan preview (rows that WOULD be deleted/nulled on a real run):");
        for (const [key, count] of Object.entries(orphanCounts)) {
          console.log(`    ${count > 0 ? "⚠️ " : "   "} ${key}: ${count}`);
        }
      }

      if (preserveTokens && userTokens.length > 0) {
        const matchedRaw = execQuery(buildTokenRestoreSql(userTokens));
        const matched = parseInt(matchedRaw.trim(), 10);
        log(`Token preview: ${matched}/${userTokens.length} preserved token(s) match a user email in [${from}]'s dump.`);
        if (matched < userTokens.length) {
          warn(`${userTokens.length - matched} preserved token(s) have no matching email in [${from}]'s dump — those users don't exist there, so no update would apply on a real run (harmless).`);
        }
      } else if (preserveTokens) {
        log(`[${to}] has no user tokens to preserve.`);
      }

      if (preserveEntityTypes.length > 0) {
        if (globalConfigRows.length === 0) {
          log(`No global_configurations rows found for entity_type(s) ${preserveEntityTypes.join(", ")} on [${to}] — nothing to preserve.`);
        } else {
          try {
            const upsertedRaw = execQuery(buildGlobalConfigRestoreSql(globalConfigRows));
            log(`global_configurations preview: ${upsertedRaw.trim()} row(s) would be upserted into [${from}]'s restored schema for entity_type(s): ${preserveEntityTypes.join(", ")}.`);
          } catch (err) {
            warn(`Could not preview global_configurations restore against [${from}]'s dump (${err.message}) — the table may not exist there.`);
          }
        }
      }
    },
    { log },
  );

  console.log("\n✅ Dry run complete. Nothing on any live environment was modified beyond the read-only exports above.\n");
}

// ── Execute ────────────────────────────────────────────────────────────
async function runExecute({ from, to, dumpPath, preserve, preserveTokens, preserveEntityTypes, toTransport, toConfig, backupRoot }) {
  const today = dateFolder();
  const destDir = path.join(backupRoot, today, primaryFolderNameFor(to));
  fs.mkdirSync(destDir, { recursive: true });

  log(`Taking rollback backup of [${to}] before touching anything ...`);
  const rollbackPath = path.join(destDir, `pre-migration-rollback_${ts()}.sql.gz`);
  await backupContainerToLocalFile(toTransport, toConfig, rollbackPath);
  ok(`Rollback backup saved: ${rollbackPath}`);

  let targetFilesExport = null;
  let targetFilesCountBefore = null;
  if (preserve) {
    log(`Exporting [${to}]'s current directus_files ...`);
    targetFilesExport = path.join(SCRATCH_DIR, `target_files_${ts()}.sql`);
    await exportDirectusFilesToLocalFile(toTransport, toConfig, targetFilesExport);
    const raw = await psqlQuery(toTransport, toConfig, "SELECT count(*) FROM directus_files;");
    targetFilesCountBefore = parseInt(raw.trim(), 10);
    ok(`[${to}] directus_files count before: ${targetFilesCountBefore}`);
  }

  let userTokens = [];
  if (preserveTokens) {
    log(`Exporting [${to}]'s current user tokens ...`);
    userTokens = await fetchPreservableUserTokens(toTransport, toConfig);
    ok(`Found ${userTokens.length} user token(s) to preserve.`);
  }

  let globalConfigRows = [];
  if (preserveEntityTypes.length > 0) {
    log(`Exporting [${to}]'s global_configurations rows for entity_type(s): ${preserveEntityTypes.join(", ")} ...`);
    globalConfigRows = await fetchGlobalConfigRows(toTransport, toConfig, preserveEntityTypes);
    ok(`Found ${globalConfigRows.length} global_configurations row(s) to preserve.`);
  }

  log(`Wiping [${to}]'s public schema and restoring [${from}]'s dump ...`);
  await psqlQueryPiped(toTransport, toConfig, "DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await psqlFileIntoContainer(toTransport, toConfig, dumpPath, { gunzip: dumpPath.endsWith(".gz") });
  ok(`Restore complete.`);

  let orphanCounts = null;
  let directusFilesCountAfter = null;

  if (preserve) {
    log(`Restoring [${to}]'s real directus_files rows ...`);
    const swapScript = [
      "BEGIN;",
      "SET session_replication_role = replica;",
      "DELETE FROM directus_files;",
      fs.readFileSync(targetFilesExport, "utf8"),
      "SET session_replication_role = origin;",
      "COMMIT;",
    ].join("\n");
    const swapFile = path.join(SCRATCH_DIR, `swap_${ts()}.sql`);
    fs.writeFileSync(swapFile, swapScript);
    await psqlFileIntoContainer(toTransport, toConfig, swapFile, { gunzip: false });
    fs.unlinkSync(swapFile);

    const afterRaw = await psqlQuery(toTransport, toConfig, "SELECT count(*) FROM directus_files;");
    directusFilesCountAfter = parseInt(afterRaw.trim(), 10);
    if (directusFilesCountAfter !== targetFilesCountBefore) {
      warn(`directus_files count after swap (${directusFilesCountAfter}) does not match before (${targetFilesCountBefore}) — investigate before continuing.`);
    } else {
      ok(`directus_files restored: ${directusFilesCountAfter} rows.`);
    }

    log(`Discovering FK/relations pointing at directus_files ...`);
    const references = await discoverDirectusFilesReferences((sql) => psqlQueryPiped(toTransport, toConfig, sql));
    log(`Found ${references.length}: ${references.map((r) => `${r.table}.${r.column}`).join(", ")}`);

    const reportedCounts = await reportOrphans((sql) => psqlQueryPiped(toTransport, toConfig, sql), references);
    console.log("\n  Orphan report:");
    for (const [key, count] of Object.entries(reportedCounts)) {
      console.log(`    ${count > 0 ? "⚠️ " : "   "} ${key}: ${count}`);
    }

    const totalOrphans = Object.values(reportedCounts).reduce((a, b) => a + b, 0);
    if (totalOrphans > 0) {
      const { proceedCleanup } = await inquirer.prompt([
        { type: "confirm", name: "proceedCleanup", message: `Delete/null these ${totalOrphans} orphaned rows now?`, default: true },
      ]);
      if (!proceedCleanup) {
        warn(`Skipping orphan cleanup — [${to}] will have dangling directus_files references until this is run manually.`);
        orphanCounts = reportedCounts;
      } else {
        const cleanupSql = ["BEGIN;", ...references.map(orphanCleanupSql), "COMMIT;"].join("\n");
        await psqlQueryPiped(toTransport, toConfig, cleanupSql);

        log(`Verifying cleanup ...`);
        const verifyCounts = await reportOrphans((sql) => psqlQueryPiped(toTransport, toConfig, sql), references);
        const remaining = Object.values(verifyCounts).reduce((a, b) => a + b, 0);
        if (remaining > 0) {
          warn(`${remaining} orphaned row(s) still remain after cleanup — investigate before trusting [${to}]'s media references.`);
        } else {
          ok(`All orphan checks now return 0.`);
        }
        orphanCounts = reportedCounts;
      }
    } else {
      ok(`No orphaned references found.`);
      orphanCounts = reportedCounts;
    }

    fs.unlinkSync(targetFilesExport);
  } else {
    const afterRaw = await psqlQuery(toTransport, toConfig, "SELECT count(*) FROM directus_files;");
    directusFilesCountAfter = parseInt(afterRaw.trim(), 10);
  }

  let tokenRestoreCounts = null;
  if (preserveTokens) {
    if (userTokens.length === 0) {
      ok(`No user tokens needed restoring.`);
      tokenRestoreCounts = { matched: 0, total: 0 };
    } else {
      log(`Restoring [${to}]'s user tokens ...`);
      const matchedRaw = await psqlQueryPiped(toTransport, toConfig, buildTokenRestoreSql(userTokens));
      const matched = parseInt(matchedRaw.trim(), 10);
      tokenRestoreCounts = { matched, total: userTokens.length };
      if (matched < userTokens.length) {
        warn(`${userTokens.length - matched} preserved token(s) had no matching email in [${from}]'s dump — those users don't exist post-restore, token not applied.`);
      }
      ok(`Restored ${matched}/${userTokens.length} user token(s).`);
    }
  }

  let globalConfigRestoreCount = null;
  if (preserveEntityTypes.length > 0) {
    if (globalConfigRows.length === 0) {
      ok(`No global_configurations rows needed restoring for entity_type(s): ${preserveEntityTypes.join(", ")}.`);
      globalConfigRestoreCount = 0;
    } else {
      log(`Restoring [${to}]'s global_configurations rows for entity_type(s): ${preserveEntityTypes.join(", ")} ...`);
      try {
        const upsertedRaw = await psqlQueryPiped(toTransport, toConfig, buildGlobalConfigRestoreSql(globalConfigRows));
        globalConfigRestoreCount = parseInt(upsertedRaw.trim(), 10);
        ok(`Upserted ${globalConfigRestoreCount}/${globalConfigRows.length} global_configurations row(s).`);
      } catch (err) {
        warn(`Failed to restore global_configurations rows (${err.message}) — [${to}]'s ${preserveEntityTypes.join(", ")} config now reflects [${from}]'s dump instead. Investigate and reapply manually if needed.`);
      }
    }
  }

  log(`Restarting [${to}]'s Directus container ...`);
  await toTransport.exec(`${dockerBin(toConfig)} restart ${toConfig.directusContainer}`);
  ok(`Restarted.`);

  const changelogPath = writeChangelog({
    from,
    to,
    dumpUsed: dumpPath,
    rollbackBackupPath: rollbackPath,
    preserveDirectusFiles: preserve,
    directusFilesCountBefore: preserve ? targetFilesCountBefore : "n/a (overridden)",
    directusFilesCountAfter,
    orphanCounts,
    preserveUserTokens: preserveTokens,
    tokenRestoreCounts,
    preserveEntityTypes,
    globalConfigRestoreCount,
  });
  ok(`Change logged: ${changelogPath}`);

  console.log(`\n✅ Migration complete: [${to}] <- [${from}]. Verify in the browser before trusting it fully.\n`);
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log("╔═══════════════════════════════╗");
  console.log("║   Directus env data-sync migration tool   ║");
  console.log("╚════════════════════════════════╝\n");
  console.log(`Environments: ${config.ENV_KEYS.join(", ")}. Production (${config.PRODUCTION_ENVIRONMENTS.join(", ")}) requires typed confirmation + phrase.\n`);

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const backupRoot = config.backupRoot();

  const to = await promptEnvironment("Target environment (will be OVERWRITTEN):", null);

  const toConfig = config.loadEnvironment(to);
  const toTransport = createTransport(toConfig, { log });

  try {
    await toTransport.connect();

    const from = await promptEnvironment("Source environment (dump to migrate from):", to);

    const dumpPath = await promptDump(from, backupRoot);
    if (!dumpPath) return;

    const preserve = await promptPreserveFiles(to);
    const preserveTokens = await promptPreserveTokens(to);

    const entityTypes = await fetchGlobalConfigEntityTypes(toTransport, toConfig);
    const preserveEntityTypes = await promptPreserveGlobalConfig(to, entityTypes);

    const mode = await promptMode();

    if (mode === "dry-run") {
      await runDryRun({ from, to, dumpPath, preserve, preserveTokens, preserveEntityTypes, toTransport, toConfig });
      return;
    }

    const confirmed = await confirmExecute(from, to);
    if (!confirmed) {
      warn("Confirmation did not match — aborting. No changes made.");
      return;
    }

    await runExecute({ from, to, dumpPath, preserve, preserveTokens, preserveEntityTypes, toTransport, toConfig, backupRoot });
  } finally {
    toTransport.close();
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
