"use strict";

const fs = require("fs");
const path = require("path");

// BOTG/Backup/backup/index.js's PROJECTS.botg.environments calls production
// "prod" (its output folder is botg/<date>/prod/), while this repo and
// CLAUDE.md call the same environment "main" — so "main" here must also
// look under the "prod" folder name.
const FOLDER_ALIASES = {
  main: ["main", "prod"],
};

function folderNamesFor(env) {
  return FOLDER_ALIASES[env] || [env];
}

/**
 * Finds existing dumps under BACKUP_ROOT/<DD-MM-YYYY>/<env>/dump_*.sql.gz —
 * the exact convention BOTG/Backup/backup/index.js already writes to. This
 * module only reads; it never triggers a new backup.
 */
function listDumpsForEnv(backupRoot, env) {
  if (!fs.existsSync(backupRoot)) return [];

  const dateFolders = fs
    .readdirSync(backupRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const dumps = [];
  for (const dateFolder of dateFolders) {
    for (const folderName of folderNamesFor(env)) {
      const envDir = path.join(backupRoot, dateFolder, folderName);
      if (!fs.existsSync(envDir)) continue;

      for (const file of fs.readdirSync(envDir)) {
        if (!file.endsWith(".sql.gz") || !file.startsWith("dump_")) continue;
        const fullPath = path.join(envDir, file);
        dumps.push({
          file,
          fullPath,
          dateFolder,
          mtime: fs.statSync(fullPath).mtime,
        });
      }
    }
  }

  return dumps.sort((a, b) => b.mtime - a.mtime);
}

// The folder a NEW dump/backup for this env should be written into — e.g.
// "main" writes to "prod" to match the existing BOTG/Backup/backup/index.js
// convention rather than creating a parallel "main" folder alongside it.
const WRITE_FOLDER_ALIASES = { main: "prod" };

function primaryFolderNameFor(env) {
  return WRITE_FOLDER_ALIASES[env] || env;
}

module.exports = { listDumpsForEnv, primaryFolderNameFor };
