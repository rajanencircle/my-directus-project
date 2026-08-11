"use strict";

const { execSync } = require("child_process");

/**
 * Throwaway local Postgres container for dry-run previews, adapted from
 * BOTG/Backup/backup/post-process.js's disposable-container pattern. The
 * chosen source dump is restored into this container so orphan/column-parity
 * checks can run WITHOUT touching the live target — this is what makes the
 * dry run genuinely read-only against every real environment.
 */
const CONTAINER_PREFIX = "migration_tool_dryrun";

function run(cmd) {
  return execSync(cmd, { stdio: "pipe", shell: "/bin/bash" }).toString().trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForReady(containerName, user, db, log) {
  for (let i = 0; i < 30; i++) {
    try {
      run(`docker exec ${containerName} pg_isready -U ${user} -d ${db}`);
      return;
    } catch (_) {
      await sleep(1000);
    }
  }
  throw new Error(`Throwaway postgres container ${containerName} never became ready`);
}

/**
 * @param {object} pgConfig - from config.dryRunPostgresConfig()
 * @param {string} dumpGzPath - local .sql.gz path to restore into the container
 * @param {(execQuery: (sql: string) => string, containerName: string) => Promise<any>} fn
 */
async function withThrowawayPostgres(pgConfig, dumpGzPath, fn, { log = console.log } = {}) {
  const containerName = `${CONTAINER_PREFIX}_${Date.now()}`;

  log(`Starting throwaway postgres container ${containerName} ...`);
  run(
    `docker run -d --rm --name ${containerName} ` +
      `-e POSTGRES_USER=${pgConfig.user} -e POSTGRES_PASSWORD=${pgConfig.pass} -e POSTGRES_DB=${pgConfig.db} ` +
      `-p ${pgConfig.port}:5432 ${pgConfig.image}`,
  );

  try {
    await waitForReady(containerName, pgConfig.user, pgConfig.db, log);

    log(`Restoring ${dumpGzPath} into throwaway container ...`);
    execSync(
      `gunzip -c ${JSON.stringify(dumpGzPath)} | docker exec -i ${containerName} psql -U ${pgConfig.user} -d ${pgConfig.db} -v ON_ERROR_STOP=0 > /dev/null`,
      { stdio: ["inherit", "pipe", "pipe"], shell: "/bin/bash" },
    );

    const execQuery = (sql) =>
      run(
        `docker exec ${containerName} psql -U ${pgConfig.user} -d ${pgConfig.db} -t -A -c ${JSON.stringify(sql)}`,
      );

    return await fn(execQuery, containerName);
  } finally {
    log(`Removing throwaway container ${containerName} ...`);
    try {
      run(`docker rm -f ${containerName}`);
    } catch (_) {
      // already gone (--rm) — fine
    }
  }
}

module.exports = { withThrowawayPostgres };
