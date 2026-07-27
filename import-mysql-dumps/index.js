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
 * Download any number of MySQL dumps and import each into its own
 * dated database, then delete the local dump file.
 *
 * Dumps are declared as numbered pairs, starting at 1, with no gaps:
 *   DUMP_1_NAME="botg_full"
 *   DUMP_1_URL="https://www.botg.de/fileadmin/bestof_full.dump"
 *   DUMP_2_NAME="botg"
 *   DUMP_2_URL="https://www.botg.de/fileadmin/bestof.dump"
 *   DUMP_3_NAME="karawane_full"
 *   DUMP_3_URL="https://www.karawane-primarix.de/downloads/karawane_full.dump"
 *   DUMP_4_NAME="karawane"
 *   DUMP_4_URL="https://www.karawane-primarix.de/downloads/karawane.dump"
 *   ... DUMP_5_*, DUMP_6_*, etc. — add as many as needed.
 *
 * Each becomes database "<DUMP_n_NAME>_<YYYYMMDD>".
 *
 * Usage:
 *   export MYSQL_HOST="127.0.0.1"       # optional, default 127.0.0.1
 *   export MYSQL_PORT="3306"            # optional, default 3306
 *   export MYSQL_USER="root"            # optional, default root
 *   export MYSQL_PASSWORD="..."         # required if server needs auth
 *
 *   node index.js              # live run
 *   node index.js --dry-run    # log intended actions, no download/import/delete
 */

const DRY_RUN = process.argv.includes("--dry-run");

const MYSQL_HOST = process.env.MYSQL_HOST || "127.0.0.1";
const MYSQL_PORT = process.env.MYSQL_PORT || "3306";
const MYSQL_USER = process.env.MYSQL_USER || "root";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "";

const DUMP_DIR = path.join(__dirname, "db-dumps");

// Only allow simple, predictable database name segments (derived from the
// DUMP_n_NAME env values + a date stamp we generate ourselves) — never build
// a SQL identifier from anything sourced externally (e.g. the dump URL).
const SAFE_NAME = /^[a-zA-Z0-9_]+$/;

// Reads DUMP_1_NAME/DUMP_1_URL, DUMP_2_NAME/DUMP_2_URL, ... stopping at the
// first missing index so the list can grow to however many dumps exist.
function loadDumpsFromEnv() {
  const dumps = [];
  const seenLabels = new Set();
  for (let i = 1; ; i++) {
    const url = process.env[`DUMP_${i}_URL`];
    if (!url) break;
    const label = process.env[`DUMP_${i}_NAME`];
    if (!label) {
      console.error(`DUMP_${i}_URL is set but DUMP_${i}_NAME is missing. Skipping DUMP_${i}.`);
      continue;
    }
    if (seenLabels.has(label)) {
      console.error(`DUMP_${i}_NAME "${label}" duplicates an earlier entry (would collide on database name). Skipping DUMP_${i}.`);
      continue;
    }
    seenLabels.add(label);
    dumps.push({ label, url, index: i });
  }
  return dumps;
}

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
  const dumps = loadDumpsFromEnv();
  if (dumps.length === 0) {
    console.error("No dumps configured. Set DUMP_1_NAME / DUMP_1_URL (and DUMP_2_*, DUMP_3_*, ...) in .env.");
    process.exit(1);
  }

  if (!DRY_RUN) fs.mkdirSync(DUMP_DIR, { recursive: true });

  const stamp = todayStamp();

  for (const { label, url, index } of dumps) {
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
      console.error(`Invalid URL in DUMP_${index}_URL: ${url}. Skipping ${label}.`);
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
