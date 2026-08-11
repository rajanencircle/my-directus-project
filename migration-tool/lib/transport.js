"use strict";

const { Client } = require("ssh2");
const { execSync } = require("child_process");
const fs = require("fs");

/**
 * One interface, two backends: SSH (dev/staging/main, mirrors
 * BOTG/Backup/backup/index.js's sshConnect/sshExec/sshExecCapture/sshDownload)
 * and local `child_process` + `docker exec` (local — this machine's own
 * directus/docker-compose.yaml, no SSH involved).
 *
 * Commands themselves are responsible for prefixing `sudo` on their `docker`
 * invocations where needed (see migrate.js's `dockerBin()`) — mirroring
 * BOTG/Backup/backup/index.js's convention exactly: `sudo` only elevates the
 * `docker exec`/`docker restart` call, never the surrounding pipe/redirect,
 * so dumped files stay owned by the SSH user and are still downloadable over
 * SFTP as that same non-root user.
 */
function createTransport(envConfig, { log = console.log } = {}) {
  if (envConfig.kind === "ssh") return createSshTransport(envConfig, log);
  return createLocalTransport(envConfig, log);
}

function createSshTransport(envConfig, log) {
  let conn = null;

  function sshConnect() {
    return new Promise((resolve, reject) => {
      const c = new Client();
      c.on("ready", () => resolve(c));
      c.on("error", reject);
      c.connect({
        host: envConfig.host,
        port: envConfig.port,
        family: 4,
        username: envConfig.username,
        privateKey: envConfig.privateKey,
      });
    });
  }

  return {
    async connect() {
      log(`Connecting via SSH to ${envConfig.host} ...`);
      conn = await sshConnect();
      log("SSH connected.");
    },
    exec(cmd) {
      const full = `bash -c ${JSON.stringify(cmd)}`;
      log(`$ ${cmd}`);
      return new Promise((resolve, reject) => {
        conn.exec(full, (err, stream) => {
          if (err) return reject(err);
          let stderr = "";
          stream.resume();
          stream.stderr.on("data", (d) => (stderr += d.toString()));
          stream.on("close", (code) => {
            if (code !== 0) return reject(new Error(`Exit ${code}: ${stderr.trim()}`));
            resolve();
          });
        });
      });
    },
    execCapture(cmd) {
      const full = `bash -c ${JSON.stringify(cmd)}`;
      log(`$ ${cmd}`);
      return new Promise((resolve, reject) => {
        conn.exec(full, (err, stream) => {
          if (err) return reject(err);
          let stdout = "";
          let stderr = "";
          stream.on("data", (d) => (stdout += d.toString()));
          stream.stderr.on("data", (d) => (stderr += d.toString()));
          stream.on("close", (code) => {
            if (code !== 0) return reject(new Error(`Exit ${code}: ${stderr.trim()}`));
            resolve(stdout);
          });
        });
      });
    },
    download(remotePath, localPath) {
      log(`Downloading ${remotePath} -> ${localPath}`);
      return new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
          if (err) return reject(err);
          sftp.fastGet(remotePath, localPath, {}, (err2) => {
            if (err2) return reject(err2);
            resolve();
          });
        });
      });
    },
    upload(localPath, remotePath) {
      log(`Uploading ${localPath} -> ${remotePath}`);
      return new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
          if (err) return reject(err);
          sftp.fastPut(localPath, remotePath, {}, (err2) => {
            if (err2) return reject(err2);
            resolve();
          });
        });
      });
    },
    close() {
      if (conn) conn.end();
    },
  };
}

function createLocalTransport(_envConfig, log) {
  return {
    async connect() {
      log("Using local docker (no SSH).");
    },
    async exec(cmd) {
      log(`$ ${cmd}`);
      execSync(cmd, { stdio: "inherit", shell: "/bin/bash" });
    },
    async execCapture(cmd) {
      log(`$ ${cmd}`);
      return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], shell: "/bin/bash" }).toString();
    },
    async download(remotePath, localPath) {
      log(`Copying ${remotePath} -> ${localPath}`);
      fs.copyFileSync(remotePath, localPath);
    },
    async upload(localPath, remotePath) {
      log(`Copying ${localPath} -> ${remotePath}`);
      fs.copyFileSync(localPath, remotePath);
    },
    close() {},
  };
}

module.exports = { createTransport };
