const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config({ path: path.resolve(__dirname, ".env"), override: true });

const PRESET_FIELDS = ["layout", "layout_query", "layout_options"];

const API_ENVS = {
  local: { url: process.env.DIRECTUS_LOCAL_URL, token: process.env.DIRECTUS_LOCAL_TOKEN },
  dev: { url: process.env.DIRECTUS_DEV_URL, token: process.env.DIRECTUS_DEV_TOKEN },
  staging: { url: process.env.DIRECTUS_STAGING_URL, token: process.env.DIRECTUS_STAGING_TOKEN },
  main: { url: process.env.DIRECTUS_MAIN_URL, token: process.env.DIRECTUS_MAIN_TOKEN },
};

// Host/container map for the SSH approach. Hosts match dev.content.botg.cloud /
// staging.content.botg.cloud (verified via DNS) and the same map already used in
// /Users/rajan/Documents/RAJAN/directus/BOTG/Backup/backup/index.js.
// `local` is intentionally excluded — it's a local docker-compose instance, not SSH-reachable.
const SSH_ENVS = {
  dev: { host: "138.199.214.118", container: "directus-dev-database-1" },
  staging: { host: "91.99.101.100", container: "directus-staging-database-1" },
  main: { host: "128.140.14.141", container: "directus-prod-database-1" },
};

const DB_USER = "directus";
const DB_NAME = "directus";

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(raw);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

function boolFrom(value, fallback = false) {
  if (value === undefined) return fallback;
  return ["true", "1", "yes"].includes(String(value).toLowerCase());
}

// CLI flags win over .env, so one-off overrides don't require editing the file.
function resolveTask() {
  const args = parseArgs(process.argv.slice(2));

  const sourceEnv = args["source-env"] || process.env.SOURCE_ENV;
  const destEnv = args["dest-env"] || process.env.DEST_ENV || sourceEnv;
  const sourceId = args["source-id"] || process.env.SOURCE_PRESET_ID;
  const destIdsRaw = args["dest-ids"] || process.env.DEST_PRESET_IDS;
  const apply = args["apply"] !== undefined ? true : boolFrom(process.env.APPLY, false);
  const confirmMain = args["confirm-main"] !== undefined ? true : boolFrom(process.env.CONFIRM_MAIN, false);

  if (!sourceEnv || !destEnv) {
    throw new Error("Missing SOURCE_ENV / DEST_ENV (set in preset-sync/.env or pass --source-env/--dest-env).");
  }
  if (!sourceId) {
    throw new Error("Missing SOURCE_PRESET_ID (set in preset-sync/.env or pass --source-id).");
  }
  if (!destIdsRaw) {
    throw new Error("Missing DEST_PRESET_IDS (set in preset-sync/.env or pass --dest-ids).");
  }

  const sourceIdNum = Number.parseInt(sourceId, 10);
  const destIds = String(destIdsRaw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number.parseInt(s, 10));

  if (!Number.isInteger(sourceIdNum)) throw new Error(`SOURCE_PRESET_ID must be an integer, got "${sourceId}".`);
  if (destIds.some((n) => !Number.isInteger(n))) {
    throw new Error(`DEST_PRESET_IDS must be a comma-separated list of integers, got "${destIdsRaw}".`);
  }
  if (destIds.includes(sourceIdNum)) {
    // eslint-disable-next-line no-console
    console.warn(`⚠️  Source id ${sourceIdNum} is also in the destination list — that write is a no-op.`);
  }

  if (destEnv === "main" && !confirmMain) {
    throw new Error("DEST_ENV=main requires CONFIRM_MAIN=true (or --confirm-main) — refusing to touch main by accident.");
  }

  return { sourceEnv, destEnv, sourceId: sourceIdNum, destIds, apply };
}

function logStagingChange({ approach, sourceEnv, destEnv, sourceId, destIds, values }) {
  if (destEnv !== "staging") return;

  const fs = require("fs");
  const trackerDir = path.resolve(__dirname, "../STAGING_CHANGES");
  const stamp = new Date().toISOString().slice(0, 10);
  const file = path.join(trackerDir, `PRESET-LAYOUT-COPY-${stamp}.md`);

  const entry = `
## ${new Date().toISOString()} — preset layout/layout_query/layout_options copy (${approach})

- **Source:** \`${sourceEnv}\` preset id \`${sourceId}\`
- **Destinations:** \`${destEnv}\` preset ids ${destIds.map((id) => `\`${id}\``).join(", ")}
- **Fields copied:** \`layout\`, \`layout_query\`, \`layout_options\` (nothing else touched)
- **Copied values:**
  \`\`\`json
  ${JSON.stringify(values, null, 2).split("\n").join("\n  ")}
  \`\`\`
- **Revert:** re-run \`preset-sync\` with each destination id's own prior values above restored as the source (capture them again from a preset of the same type if unsure), or manually PATCH \`/presets/{id}\` with the previous \`layout\`/\`layout_query\`/\`layout_options\`.
`;

  fs.mkdirSync(trackerDir, { recursive: true });
  fs.appendFileSync(file, entry);
  // eslint-disable-next-line no-console
  console.log(`📝 Logged staging change → ${path.relative(process.cwd(), file)}`);
}

module.exports = { PRESET_FIELDS, API_ENVS, SSH_ENVS, DB_USER, DB_NAME, resolveTask, logStagingChange };
