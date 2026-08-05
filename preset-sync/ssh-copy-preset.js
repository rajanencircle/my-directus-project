#!/usr/bin/env node
/**
 * Copy layout / layout_query / layout_options from one directus_presets row to
 * a list of destination rows, via SSH + `docker exec ... psql` — bypasses the
 * Directus API entirely. Same server/key pattern as
 * /Users/rajan/Documents/RAJAN/directus/BOTG/Backup/backup/index.js.
 *
 * Config comes from preset-sync/.env (or CLI flags to override):
 *   node ssh-copy-preset.js [--source-env=staging] [--dest-env=staging]
 *                           [--source-id=475] [--dest-ids=473,474,476]
 *                           [--apply] [--confirm-main]
 *
 * Defaults to a dry-run (prints the fetched values + SQL, runs nothing)
 * unless --apply is passed or APPLY=true is set in .env.
 *
 * Not available for `local` — that's a local docker-compose instance, not
 * SSH-reachable. Use api-copy-preset.js for local.
 */

const fs = require("fs");
const { Client } = require("ssh2");
const { PRESET_FIELDS, SSH_ENVS, DB_USER, DB_NAME, resolveTask, logStagingChange } = require("./config");

const SSH_KEY_PATH = process.env.SSH_KEY_PATH || "/Users/rajan/.ssh/id_ed25519";
const SSH_USERNAME = process.env.SSH_USERNAME || "functional";

function sshConnect(host) {
  const privateKey = fs.readFileSync(SSH_KEY_PATH);
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on("ready", () => resolve(conn));
    conn.on("error", reject);
    conn.connect({ host, port: 22, family: 4, username: SSH_USERNAME, privateKey });
  });
}

// Runs a remote command, optionally piping `stdin` text to it, and captures stdout/stderr.
function sshExec(conn, cmd, stdin) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = "";
      let stderr = "";
      stream.on("data", (d) => (stdout += d.toString()));
      stream.stderr.on("data", (d) => (stderr += d.toString()));
      stream.on("close", (code) => {
        if (code !== 0) return reject(new Error(`Exit ${code}: ${stderr.trim() || stdout.trim()}`));
        resolve(stdout);
      });
      if (stdin !== undefined) {
        stream.end(stdin);
      } else {
        stream.end();
      }
    });
  });
}

async function fetchPreset(conn, container, id) {
  // id is validated as an integer in config.resolveTask() before it ever reaches this string.
  const query = `SELECT row_to_json(p) FROM (SELECT id, collection, ${PRESET_FIELDS.join(", ")} FROM directus_presets WHERE id = ${id}) p;`;
  const cmd = `sudo docker exec ${container} psql -U ${DB_USER} -d ${DB_NAME} -t -A -c ${JSON.stringify(query)}`;
  const out = await sshExec(conn, cmd);
  const line = out.trim();
  if (!line) throw new Error(`No preset found with id ${id} in ${container}.`);
  return JSON.parse(line);
}

// Dollar-quoted string literals sidestep shell/SQL escaping for values coming
// out of a JSON column — the SQL text is piped over stdin, never interpolated
// into the remote shell's argv.
function buildUpdateSql(id, values) {
  const assignments = PRESET_FIELDS.map((field) => {
    const raw = values[field];
    if (raw === null || raw === undefined) return `${field} = NULL`;
    const literal = typeof raw === "string" ? raw : JSON.stringify(raw);
    const cast = field === "layout" ? "" : "::json";
    return `${field} = $presetsync$${literal}$presetsync$${cast}`;
  }).join(",\n  ");
  return `UPDATE directus_presets\nSET ${assignments}\nWHERE id = ${id};`;
}

async function runUpdate(conn, container, id, values) {
  const sql = buildUpdateSql(id, values);
  const cmd = `sudo docker exec -i ${container} psql -U ${DB_USER} -d ${DB_NAME} -v ON_ERROR_STOP=1`;
  await sshExec(conn, cmd, sql);
  return sql;
}

function pick(obj, fields) {
  return Object.fromEntries(fields.map((f) => [f, obj[f]]));
}

async function main() {
  const { sourceEnv, destEnv, sourceId, destIds, apply } = resolveTask();

  if (sourceEnv === "local" || destEnv === "local") {
    throw new Error("ssh-copy-preset.js doesn't support 'local' (not SSH-reachable) — use api-copy-preset.js instead.");
  }

  const sourceCfg = SSH_ENVS[sourceEnv];
  const destCfg = SSH_ENVS[destEnv];
  if (!sourceCfg) throw new Error(`Unknown SOURCE_ENV "${sourceEnv}" for SSH approach.`);
  if (!destCfg) throw new Error(`Unknown DEST_ENV "${destEnv}" for SSH approach.`);

  console.log(`Connecting to [${sourceEnv}] ${sourceCfg.host} via SSH ...`);
  const sourceConn = await sshConnect(sourceCfg.host);
  const destConn = destCfg.host === sourceCfg.host ? sourceConn : await sshConnect(destCfg.host);
  if (destConn !== sourceConn) console.log(`Connecting to [${destEnv}] ${destCfg.host} via SSH ...`);

  try {
    console.log(`Reading source preset ${sourceId} from [${sourceEnv}] ${sourceCfg.container} ...`);
    const source = await fetchPreset(sourceConn, sourceCfg.container, sourceId);
    const values = pick(source, PRESET_FIELDS);

    console.log(`\nSource values (preset ${sourceId}, collection "${source.collection}"):`);
    console.log(JSON.stringify(values, null, 2));

    console.log(`\n${apply ? "Applying" : "Dry-run — would apply"} to [${destEnv}] preset ids: ${destIds.join(", ")}\n`);

    for (const id of destIds) {
      const before = await fetchPreset(destConn, destCfg.container, id);
      console.log(`— preset ${id} (collection "${before.collection}") —`);
      console.log("  before:", JSON.stringify(pick(before, PRESET_FIELDS)));
      console.log("  after: ", JSON.stringify(values));

      const sql = buildUpdateSql(id, values);
      if (apply) {
        await runUpdate(destConn, destCfg.container, id, values);
        console.log(`  ✅ updated via psql on ${destCfg.container}`);
      } else {
        console.log("  SQL that would run:\n    " + sql.split("\n").join("\n    "));
      }
    }

    if (apply) {
      logStagingChange({ approach: "SSH/psql", sourceEnv, destEnv, sourceId, destIds, values });
      console.log("\nDone.");
    } else {
      console.log("\nDry-run complete — no writes made. Re-run with --apply (or APPLY=true in .env) to write.");
    }
  } finally {
    sourceConn.end();
    if (destConn !== sourceConn) destConn.end();
  }
}

main().catch((err) => {
  console.error("\n❌", err.message);
  process.exit(1);
});
