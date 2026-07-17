const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

// ============================================================================
// sync-collection-data.js
//
// Copies field values for items in a given collection from one Directus
// environment to another (local / dev / staging / main), for:
//   - specific item ids
//   - a contiguous id range
//   - all items
//
// Modeled on scripts/data-transformer.js, but instead of transforming a
// value in place, it reads the value from a SOURCE environment and writes
// it to the same item id in a TARGET environment.
//
// All configuration is done below via constants — edit CONFIG and run:
//   node migration/sync-collection-data.js
// ============================================================================

// ------------------------------------------
// ENVIRONMENT CREDENTIALS
// ------------------------------------------
// Credentials are NEVER hardcoded here — they are read from environment
// variables. Set the ones you need before running, e.g.:
//
//   export DIRECTUS_LOCAL_URL="http://localhost:8055"
//   export DIRECTUS_LOCAL_TOKEN="..."
//   export DIRECTUS_DEV_URL="https://dev.content.botg.cloud"
//   export DIRECTUS_DEV_TOKEN="..."
//   export DIRECTUS_STAGING_URL="https://staging.content.botg.cloud"
//   export DIRECTUS_STAGING_TOKEN="..."
//   export DIRECTUS_MAIN_URL="..."
//   export DIRECTUS_MAIN_TOKEN="..."

const ENVIRONMENTS = {
  local: {
    url: process.env.DIRECTUS_LOCAL_URL,
    token: process.env.DIRECTUS_LOCAL_TOKEN,
  },
  dev: {
    url: process.env.DIRECTUS_DEV_URL,
    token: process.env.DIRECTUS_DEV_TOKEN,
  },
  staging: {
    url: process.env.DIRECTUS_STAGING_URL,
    token: process.env.DIRECTUS_STAGING_TOKEN,
  },
  main: {
    url: process.env.DIRECTUS_MAIN_URL,
    token: process.env.DIRECTUS_MAIN_TOKEN,
  },
};

// ------------------------------------------
// CONFIGURATION — edit these for each run
// ------------------------------------------
const CONFIG = {
  // Which environment to read data FROM: "local" | "dev" | "staging" | "main"
  SOURCE_ENV: "dev",

  // Which environment to write data TO: "local" | "dev" | "staging" | "main"
  TARGET_ENV: "staging",

  // Collection name, e.g. "hotels"
  COLLECTION: "agencies",

  // Field names to copy from source to target (item `id` is always the match key).
  // Set to "*" to copy ALL writable fields on the collection — this is auto-resolved
  // from the source environment's schema at runtime, excluding relational/alias
  // fields (o2m, m2m, translations, presentation-only groups, etc.) since those
  // aren't real columns and can't be copied via a simple PATCH.
  FIELDS: "*",

  // Selector — choose ONE mode:
  //   { mode: "all" }
  //   { mode: "ids", ids: [101, 102, 103] }
  //   { mode: "range", start: 1, end: 200 }
  SELECTOR: { mode: "all" },

  // If true, logs what would be written without actually PATCHing the target
  DRY_RUN: false,

  // Must be set to true in addition to SOURCE_ENV/TARGET_ENV being "main"
  // before this script will touch the main (production) environment.
  CONFIRM_MAIN: false,
};

// ============================================================================
// Directus API helper
// ============================================================================
async function directusRequest(envConfig, method, path, body) {
  const url = `${envConfig.url}${path}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${envConfig.token}`,
    },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${text}`);
  }

  if (res.status === 204) return null;

  return res.json();
}

function resolveEnv(name) {
  const config = ENVIRONMENTS[name];
  if (!config) {
    throw new Error(
      `Unknown environment "${name}". Valid options: ${Object.keys(ENVIRONMENTS).join(", ")}`,
    );
  }
  if (!config.url || !config.token) {
    throw new Error(
      `Missing credentials for "${name}". Set DIRECTUS_${name.toUpperCase()}_URL and DIRECTUS_${name.toUpperCase()}_TOKEN env vars.`,
    );
  }
  return config;
}

async function resolveFields(envConfig, collection, fields) {
  if (fields !== "*") return fields;

  const response = await directusRequest(
    envConfig,
    "GET",
    `/fields/${collection}`,
  );
  const schemaFields = response.data || [];

  const writableFields = schemaFields
    .filter((f) => {
      const special = f.meta?.special || [];
      // Exclude alias fields (o2m/m2m/translations/presentation groups, etc.) —
      // these aren't real columns and can't be copied via a simple PATCH.
      if (f.type === "alias") return false;
      if (special.includes("alias")) return false;
      if (special.includes("no-data")) return false;
      return true;
    })
    .map((f) => f.field)
    .filter((name) => name !== "id");

  console.log(
    `Resolved "*" to ${writableFields.length} writable field(s):`,
    writableFields,
  );

  return writableFields;
}

function buildItemsPath(collection, fields, selector) {
  const fieldList = ["id", ...fields].join(",");
  let path = `/items/${collection}?fields=${fieldList}&limit=-1&sort=id`;

  if (selector.mode === "ids") {
    path += `&filter[id][_in]=${selector.ids.join(",")}`;
  } else if (selector.mode === "range") {
    path += `&filter[id][_gte]=${selector.start}&filter[id][_lte]=${selector.end}`;
  } else if (selector.mode !== "all") {
    throw new Error(
      `Invalid SELECTOR.mode: "${selector.mode}". Use "all", "ids", or "range".`,
    );
  }

  return path;
}

// ============================================================================
// Core sync
// ============================================================================
async function syncCollectionData({
  sourceEnvName,
  targetEnvName,
  collection,
  fields,
  selector,
  dryRun,
  confirmMain,
}) {
  if ((sourceEnvName === "main" || targetEnvName === "main") && !confirmMain) {
    throw new Error(
      'Refusing to touch "main" without CONFIG.CONFIRM_MAIN = true. Only set that when you have been explicitly instructed to modify production.',
    );
  }

  const sourceConfig = resolveEnv(sourceEnvName);
  const targetConfig = resolveEnv(targetEnvName);

  fields = await resolveFields(sourceConfig, collection, fields);

  console.log(
    `Syncing collection "${collection}" fields [${fields.join(", ")}] from "${sourceEnvName}" → "${targetEnvName}"`,
  );
  console.log("Selector:", selector, dryRun ? "(dry run)" : "");

  const path = buildItemsPath(collection, fields, selector);
  const response = await directusRequest(sourceConfig, "GET", path);
  const items = response.data || [];

  console.log(`Fetched ${items.length} item(s) from source.`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    const patchBody = {};
    for (const field of fields) {
      patchBody[field] = item[field];
    }

    if (dryRun) {
      console.log(`[DRY RUN] Would update item ID ${item.id} with`, patchBody);
      continue;
    }

    try {
      await directusRequest(
        targetConfig,
        "PATCH",
        `/items/${collection}/${item.id}`,
        patchBody,
      );
      console.log(`[SUCCESS] Updated item ID ${item.id} in "${targetEnvName}"`);
      updatedCount++;
    } catch (error) {
      console.error(`[FAILED] Item ID ${item.id}:`, error.message || error);
      skippedCount++;
    }
  }

  console.log(
    `\nSync complete! Updated ${updatedCount} item(s), skipped ${skippedCount} item(s) out of ${items.length} fetched.`,
  );
}

// ============================================================================
// Run
// ============================================================================
(async () => {
  try {
    await syncCollectionData({
      sourceEnvName: CONFIG.SOURCE_ENV,
      targetEnvName: CONFIG.TARGET_ENV,
      collection: CONFIG.COLLECTION,
      fields: CONFIG.FIELDS,
      selector: CONFIG.SELECTOR,
      dryRun: CONFIG.DRY_RUN,
      confirmMain: CONFIG.CONFIRM_MAIN,
    });
  } catch (error) {
    console.error("Error:", error.message || error);
    process.exit(1);
  }
})();
