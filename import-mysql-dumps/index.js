const { execFileSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { pipeline } = require("stream/promises");

// Auto-load .env from this script's folder so `node index.js` works without
// needing `node --env-file=.env` on the command line. Requires Node >=20.12.
try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}

/**
 * Download BOTG + Karawane Primarix MySQL dumps and import each into its own
 * dated database, then delete the local dump file.
 *
 * Usage:
 *   export BOTG_DUMP_URL="https://www.botg.de/fileadmin/bestof_full.dump"
 *   export KARAWANE_DUMP_URL="https://www.karawane-primarix.de/downloads/karawane.dump"
 *   export MYSQL_HOST="127.0.0.1"       # optional, default 127.0.0.1
 *   export MYSQL_PORT="3306"            # optional, default 3306
 *   export MYSQL_USER="root"            # optional, default root
 *   export MYSQL_PASSWORD="..."         # required if server needs auth
 *
 *   node import-mysql-dumps.js              # live run
 *   node import-mysql-dumps.js --dry-run    # log intended actions, no download/import/delete
 */

const DRY_RUN = process.argv.includes("--dry-run");

const MYSQL_HOST = process.env.MYSQL_HOST || "127.0.0.1";
const MYSQL_PORT = process.env.MYSQL_PORT || "3306";
const MYSQL_USER = process.env.MYSQL_USER || "root";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "";

const DUMP_DIR = path.join(__dirname, "db-dumps");

// name prefix, source env var
const DUMPS = [
  { label: "botg", urlEnv: "BOTG_DUMP_URL" },
  { label: "karawane", urlEnv: "KARAWANE_DUMP_URL" },
];

// Only allow simple, predictable database name segments (derived from the
// fixed DUMPS labels + a date stamp we generate ourselves) — never build a
// SQL identifier from anything sourced externally (e.g. the dump URL).
const SAFE_NAME = /^[a-zA-Z0-9_]+$/;

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function mysqlEnv() {
  // Pass password via MYSQL_PWD instead of -p flag so it never shows up in `ps`.
  return { ...process.env, MYSQL_PWD: MYSQL_PASSWORD };
}

function mysqlArgs(extra) {
  return ["-h", MYSQL_HOST, "-P", MYSQL_PORT, "-u", MYSQL_USER, ...extra];
}

function logCmd(bin, args) {
  console.log(`> ${bin} ${args.join(" ")}`);
}

function downloadDump(url, destFile) {
  const args = ["-fL", "--retry", "3", "-o", destFile, url];
  logCmd("curl", args);
  if (DRY_RUN) return;
  execFileSync("curl", args, { stdio: "inherit" });
}

function createDatabase(dbName) {
  const sql = `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4;`;
  const args = mysqlArgs(["-e", sql]);
  logCmd(
    "mysql",
    args.map((a) => (a === sql ? '"<create-db-sql>"' : a)),
  );
  if (DRY_RUN) return;
  execFileSync("mysql", args, { stdio: "inherit", env: mysqlEnv() });
}

async function importDump(dbName, localFile) {
  const args = mysqlArgs([dbName]);
  console.log(`> gunzip < ${localFile} | mysql ${args.join(" ")}`);
  if (DRY_RUN) return;

  // Dumps are downloaded gzip-compressed (despite the .dump extension) —
  // decompress in-stream into mysql's stdin rather than writing the
  // uncompressed SQL to disk first.
  const child = spawn("mysql", args, {
    stdio: ["pipe", "inherit", "inherit"],
    env: mysqlEnv(),
  });

  const exitPromise = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`mysql import failed for database "${dbName}" (exit code ${code})`));
    });
  });

  await Promise.all([
    pipeline(fs.createReadStream(localFile), zlib.createGunzip(), child.stdin),
    exitPromise,
  ]);
}

async function main() {
  if (!DRY_RUN) fs.mkdirSync(DUMP_DIR, { recursive: true });

  const stamp = todayStamp();

  for (const { label, urlEnv } of DUMPS) {
    const url = process.env[urlEnv];
    if (!url) {
      console.error(`Missing ${urlEnv} env var. Skipping ${label}.`);
      continue;
    }

    const dbName = `${label}_${stamp}`;
    if (!SAFE_NAME.test(dbName)) {
      console.error(
        `Refusing unsafe database name "${dbName}". Skipping ${label}.`,
      );
      continue;
    }

    let ext = ".dump";
    try {
      ext = path.extname(new URL(url).pathname) || ".dump";
    } catch (e) {
      console.error(`Invalid URL in ${urlEnv}: ${url}. Skipping ${label}.`);
      continue;
    }
    const localFile = path.join(DUMP_DIR, `${label}_${stamp}${ext}`);

    console.log(`\n=== ${label} -> database "${dbName}" ===`);

    try {
      // 1. Download
      downloadDump(url, localFile);

      // 2. Create database
      createDatabase(dbName);

      // 3. Import dump into the new database
      await importDump(dbName, localFile);

      // 4. Delete local dump file
      if (DRY_RUN) {
        console.log(`> rm ${localFile}`);
      } else {
        fs.rmSync(localFile, { force: true });
        console.log(`Deleted local dump: ${localFile}`);
      }

      console.log(`Done: ${label} imported into "${dbName}".`);
    } catch (err) {
      console.error(`Failed processing ${label}: ${err.message}`);
      // Keep the local dump file on failure so it can be inspected/retried,
      // rather than silently deleting a dump that never imported.
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
