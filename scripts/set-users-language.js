/**
 * Bulk-set the `language` field (personal admin UI language) on every
 * directus_users record in a chosen environment.
 *
 * Why: Directus copies directus_settings.default_language onto each new
 * user's `language` field at creation time instead of leaving it null, so
 * flipping the project default does NOT retroactively fix existing users.
 * This script does that retroactive fix, forcing every user to the same
 * target language regardless of their current value.
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
 *   node scripts/set-users-language.js <local|dev|staging|main> [language] [--dry-run] [--yes]
 *
 *   language   defaults to "en-GB"
 *   --dry-run  show what would change, make no writes
 *   --yes      skip the interactive confirmation prompt (still required to
 *              additionally type MAIN when targeting production)
 *
 * Examples:
 *   node scripts/set-users-language.js dev en-GB --dry-run
 *   node scripts/set-users-language.js dev en-GB --yes
 *   node scripts/set-users-language.js main en-GB
 *
 * Rollback: before writing, a backup of every user's previous language is
 * saved to scripts/backups/users-language-<env>-<timestamp>.json. To revert,
 * replay that file's {id, previousLanguage} pairs back through the same
 * batch-update call this script uses.
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
    tokenEnv: "1ecR7PLJIpOZZOMUUaOERZWkKv0YT14q",
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

const LANGUAGE_CODE_RE = /^([a-z]{2,3}-[A-Z]{2,3}|auto)$/;

function parseArgs(argv) {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const envName = positional[0];
  const language = positional[1] || "en-GB";
  const dryRun = argv.includes("--dry-run");
  const skipConfirm = argv.includes("--yes");
  return { envName, language, dryRun, skipConfirm };
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
    throw new Error(
      `No URL configured for "${envName}". Set ${envConfig.urlEnv} in your shell.`,
    );
  }
  if (!token) {
    throw new Error(
      `Missing admin token. Set ${envConfig.tokenEnv} in your shell before running this script.`,
    );
  }

  return { url, token };
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
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
  const { envName, language, dryRun, skipConfirm } = parseArgs(
    process.argv.slice(2),
  );

  if (!envName) {
    console.error(
      "Usage: node scripts/set-users-language.js <local|dev|staging|main> [language] [--dry-run] [--yes]",
    );
    process.exit(1);
  }

  if (!LANGUAGE_CODE_RE.test(language)) {
    console.warn(
      `⚠️  "${language}" doesn't look like a standard locale code (e.g. en-GB) or "auto" — continuing anyway.`,
    );
  }

  const { url, token } = resolveEnvironment(envName);

  console.log(`Environment : ${envName} (${url})`);
  console.log(`Target lang : ${language}`);
  console.log(`Mode        : ${dryRun ? "DRY RUN (no writes)" : "LIVE"}`);

  const { data: users } = await directusRequest(
    url,
    token,
    "GET",
    "/users?limit=-1&fields=id,email,language,status",
  );

  const toUpdate = users.filter((u) => u.language !== language);
  const alreadySet = users.length - toUpdate.length;

  console.log(`\nTotal users        : ${users.length}`);
  console.log(`Already "${language}"  : ${alreadySet}`);
  console.log(`Will be changed    : ${toUpdate.length}`);

  if (toUpdate.length === 0) {
    console.log(
      "\nNothing to do — every user is already on the target language.",
    );
    return;
  }

  console.log("\nSample of users that will change:");
  toUpdate.slice(0, 10).forEach((u) => {
    console.log(`  - ${u.email} (${u.id}): "${u.language}" → "${language}"`);
  });
  if (toUpdate.length > 10) {
    console.log(`  ...and ${toUpdate.length - 10} more`);
  }

  if (dryRun) {
    console.log("\nDry run complete — no changes written.");
    return;
  }

  if (!skipConfirm) {
    const answer = await prompt(
      `\nThis will overwrite the language field on ${toUpdate.length} user(s) in "${envName}". Type "yes" to continue: `,
    );
    if (answer.toLowerCase() !== "yes") {
      console.log("Aborted — no changes made.");
      return;
    }
  }

  if (envName === "main") {
    const answer = await prompt(
      '\nThis is PRODUCTION. Type "MAIN" (all caps) to confirm you really mean to bulk-update production users: ',
    );
    if (answer !== "MAIN") {
      console.log("Aborted — no changes made.");
      return;
    }
  }

  const backupDir = path.join(__dirname, "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(
    backupDir,
    `users-language-${envName}-${timestamp}.json`,
  );
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      toUpdate.map((u) => ({
        id: u.id,
        email: u.email,
        previousLanguage: u.language,
      })),
      null,
      2,
    ),
  );
  console.log(`\nBackup written to ${backupPath}`);

  await directusRequest(url, token, "PATCH", "/users", {
    keys: toUpdate.map((u) => u.id),
    data: { language },
  });

  console.log(
    `\n✅ Updated ${toUpdate.length} user(s) in "${envName}" to language "${language}".`,
  );
}

main().catch((err) => {
  console.error("\nFATAL ERROR:", err.message);
  process.exit(1);
});
