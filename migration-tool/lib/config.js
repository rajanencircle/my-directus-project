"use strict";

const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const ENV_KEYS = ["dev", "staging", "main", "local"];
const PRODUCTION_ENVIRONMENTS = ["main"];

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required .env var ${name} — copy migration-tool/.env.example to migration-tool/.env and fill it in.`,
    );
  }
  return value;
}

function optional(name, fallback) {
  return process.env[name] || fallback;
}

function buildRemoteConfig(prefix) {
  return {
    kind: "ssh",
    host: required(`${prefix}_SSH_HOST`),
    port: parseInt(optional(`${prefix}_SSH_PORT`, "22"), 10),
    username: required(`${prefix}_SSH_USER`),
    privateKey: fs.readFileSync(required(`${prefix}_SSH_KEY_PATH`)),
    dbContainer: required(`${prefix}_DB_CONTAINER`),
    directusContainer: required(`${prefix}_DIRECTUS_CONTAINER`),
    dbUser: required(`${prefix}_DB_USER`),
    dbName: required(`${prefix}_DB_NAME`),
  };
}

function buildLocalConfig() {
  return {
    kind: "local",
    dbContainer: required("LOCAL_DB_CONTAINER"),
    directusContainer: required("LOCAL_DIRECTUS_CONTAINER"),
    dbUser: required("LOCAL_DB_USER"),
    dbName: required("LOCAL_DB_NAME"),
  };
}

function loadEnvironment(env) {
  if (!ENV_KEYS.includes(env)) {
    throw new Error(`Unknown environment "${env}" — expected one of ${ENV_KEYS.join(", ")}`);
  }
  if (env === "local") return buildLocalConfig();
  return buildRemoteConfig(env.toUpperCase());
}

function backupRoot() {
  return required("BACKUP_ROOT");
}

function dryRunPostgresConfig() {
  return {
    image: optional("DRYRUN_PG_IMAGE", "postgres:15-alpine"),
    port: parseInt(optional("DRYRUN_PG_PORT", "65433"), 10),
    user: optional("DRYRUN_PG_USER", "directus"),
    pass: optional("DRYRUN_PG_PASS", "directus"),
    db: optional("DRYRUN_PG_DB", "directus"),
  };
}

module.exports = {
  ENV_KEYS,
  PRODUCTION_ENVIRONMENTS,
  loadEnvironment,
  backupRoot,
  dryRunPostgresConfig,
};
