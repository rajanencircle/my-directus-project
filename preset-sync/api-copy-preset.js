#!/usr/bin/env node
/**
 * Copy layout / layout_query / layout_options from one directus_presets row to
 * a list of destination rows, via the Directus REST API (bearer token).
 *
 * Config comes from preset-sync/.env (or CLI flags to override):
 *   node api-copy-preset.js [--source-env=staging] [--dest-env=staging]
 *                            [--source-id=475] [--dest-ids=473,474,476]
 *                            [--apply] [--confirm-main]
 *
 * Defaults to a dry-run (prints the diff, writes nothing) unless --apply is
 * passed or APPLY=true is set in .env.
 */

const { PRESET_FIELDS, API_ENVS, resolveTask, logStagingChange } = require("./config");

async function fetchPreset(envCfg, id) {
  const url = `${envCfg.url}/presets/${id}?fields=id,collection,${PRESET_FIELDS.join(",")}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${envCfg.token}` } });
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  const { data } = await res.json();
  return data;
}

async function patchPreset(envCfg, id, values) {
  const url = `${envCfg.url}/presets/${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${envCfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });
  if (!res.ok) {
    throw new Error(`PATCH ${url} → ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  return res.json();
}

function pick(obj, fields) {
  return Object.fromEntries(fields.map((f) => [f, obj[f]]));
}

async function main() {
  const { sourceEnv, destEnv, sourceId, destIds, apply } = resolveTask();

  const sourceCfg = API_ENVS[sourceEnv];
  const destCfg = API_ENVS[destEnv];
  if (!sourceCfg?.url || !sourceCfg?.token) throw new Error(`No DIRECTUS_${sourceEnv.toUpperCase()}_URL/TOKEN in root .env.`);
  if (!destCfg?.url || !destCfg?.token) throw new Error(`No DIRECTUS_${destEnv.toUpperCase()}_URL/TOKEN in root .env.`);

  console.log(`Reading source preset ${sourceId} from [${sourceEnv}] ${sourceCfg.url} ...`);
  const source = await fetchPreset(sourceCfg, sourceId);
  const values = pick(source, PRESET_FIELDS);

  console.log(`\nSource values (preset ${sourceId}, collection "${source.collection}"):`);
  console.log(JSON.stringify(values, null, 2));

  console.log(`\n${apply ? "Applying" : "Dry-run — would apply"} to [${destEnv}] preset ids: ${destIds.join(", ")}\n`);

  for (const id of destIds) {
    const before = await fetchPreset(destCfg, id);
    console.log(`— preset ${id} (collection "${before.collection}") —`);
    console.log("  before:", JSON.stringify(pick(before, PRESET_FIELDS)));
    console.log("  after: ", JSON.stringify(values));

    if (apply) {
      await patchPreset(destCfg, id, values);
      console.log(`  ✅ updated ${destCfg.url}/presets/${id}`);
    }
  }

  if (apply) {
    logStagingChange({ approach: "REST API", sourceEnv, destEnv, sourceId, destIds, values });
    console.log("\nDone.");
  } else {
    console.log("\nDry-run complete — no writes made. Re-run with --apply (or APPLY=true in .env) to write.");
  }
}

main().catch((err) => {
  console.error("\n❌", err.message);
  process.exit(1);
});
