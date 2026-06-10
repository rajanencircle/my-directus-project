#!/usr/bin/env node
/**
 * Directus local → S3 file migration
 *
 * Steps:
 *  1. Fetch all directus_files with storage = 'local' from the Directus API
 *  2. Check each one against S3 (HeadObject) to find what's missing
 *  3. Stream through the tar.gz archive and upload only missing files
 *  4. PATCH each uploaded file record in Directus to update storage location
 *
 * Usage:
 *   node migrate.js [--env dev|staging|prod] [--dry-run]
 *
 * --dry-run  shows what would be uploaded/patched without doing anything
 */

import "dotenv/config";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream } from "fs";
import { createGunzip } from "zlib";
import tarStream from "tar-stream";
import path from "path";
import mime from "mime-types";

// =============================================================================
// Config — all values come from .env
// =============================================================================
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");

const C = {
  DIRECTUS_URL: process.env.DIRECTUS_URL,
  DIRECTUS_TOKEN: process.env.DIRECTUS_TOKEN,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  S3_ENDPOINT: process.env.S3_ENDPOINT, // required for non-AWS (Hetzner, MinIO, R2…)
  S3_BUCKET: process.env.S3_BUCKET,
  S3_PREFIX: process.env.S3_PREFIX ?? "",
  S3_DISK_NAME: process.env.S3_DISK_NAME ?? "s3",
  TAR_PATH: process.env.TAR_PATH,
};

for (const key of [
  "DIRECTUS_URL",
  "DIRECTUS_TOKEN",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "S3_BUCKET",
  "TAR_PATH",
]) {
  if (!C[key]) {
    console.error(`Missing required env var: ${key}  (add it to .env)`);
    process.exit(1);
  }
}

// =============================================================================
// Directus API helper  (same pattern as import-csv.js / data-transformer.js)
// =============================================================================
async function directusRequest(method, urlPath, body) {
  const url = `${C.DIRECTUS_URL}${urlPath}`;
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${C.DIRECTUS_TOKEN}`,
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${urlPath} → HTTP ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Fetch all local-storage files, paginated
async function fetchLocalFiles() {
  const filter = encodeURIComponent(
    JSON.stringify({ storage: { _eq: "local" } }),
  );
  let page = 1;
  const all = [];

  while (true) {
    const result = await directusRequest(
      "GET",
      `/files?fields=id,filename_disk,filename_download,type,storage&filter=${filter}&limit=200&page=${page}`,
    );
    const items = result?.data ?? [];
    all.push(...items);
    if (items.length < 200) break;
    page++;
  }

  return all;
}

// =============================================================================
// S3 helper
// =============================================================================
const s3 = new S3Client({
  region: C.AWS_REGION,
  // S3_ENDPOINT is required for non-AWS providers (Hetzner, MinIO, Cloudflare R2, etc.)
  ...(C.S3_ENDPOINT ? { endpoint: C.S3_ENDPOINT, forcePathStyle: false } : {}),
  credentials: {
    accessKeyId: C.AWS_ACCESS_KEY_ID,
    secretAccessKey: C.AWS_SECRET_ACCESS_KEY,
  },
});

function s3Key(filename) {
  return C.S3_PREFIX
    ? `${C.S3_PREFIX.replace(/\/$/, "")}/${filename}`
    : filename;
}

async function existsInS3(filename) {
  try {
    await s3.send(
      new HeadObjectCommand({ Bucket: C.S3_BUCKET, Key: s3Key(filename) }),
    );
    return true;
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404)
      return false;
    throw err;
  }
}

// Check S3 in parallel with a concurrency cap
async function batchS3Check(filenames, concurrency = 10) {
  const missing = [];
  const chunks = [];
  for (let i = 0; i < filenames.length; i += concurrency) {
    chunks.push(filenames.slice(i, i + concurrency));
  }
  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(async (f) => ({ filename: f, exists: await existsInS3(f) })),
    );
    results.filter((r) => !r.exists).forEach((r) => missing.push(r.filename));
  }
  return missing;
}

// =============================================================================
// tar.gz streaming uploader
// Streams through the archive ONCE and uploads only files in `targetSet`
// =============================================================================
async function uploadFromTar(tarPath, targetSet, onUploaded) {
  return new Promise((resolve, reject) => {
    const results = { uploaded: [], notFound: [...targetSet] };
    const remaining = new Set(targetSet);

    const extract = tarStream.extract();

    // async handler — fully buffers each entry before uploading so the tar
    // stream stays in sync regardless of upload success/failure
    extract.on("entry", async (header, stream, next) => {
      const filename = path.basename(header.name);

      if (header.type !== "file" || !remaining.has(filename)) {
        stream.resume();
        return next();
      }

      remaining.delete(filename);

      // Buffer the full entry — ensures stream is consumed before next() is
      // called, and gives the AWS SDK a plain Buffer it always accepts
      const chunks = [];
      try {
        for await (const chunk of stream) chunks.push(chunk);
      } catch (err) {
        console.error(
          `  FAILED reading from archive ${filename}: ${err.message}`,
        );
        return next();
      }
      const buffer = Buffer.concat(chunks);

      if (isDryRun) {
        console.log(
          `  [DRY-RUN] Would upload: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`,
        );
        results.uploaded.push(filename);
        results.notFound = results.notFound.filter((f) => f !== filename);
        return next();
      }

      const contentType = mime.lookup(filename) || "application/octet-stream";

      try {
        await new Upload({
          client: s3,
          params: {
            Bucket: C.S3_BUCKET,
            Key: s3Key(filename),
            Body: buffer,
            ContentType: contentType,
          },
        }).done();

        results.uploaded.push(filename);
        results.notFound = results.notFound.filter((f) => f !== filename);
        onUploaded(filename);
      } catch (err) {
        console.error(`  FAILED upload ${filename}: ${err.message}`);
      }

      next();
    });

    extract.on("finish", () => resolve(results));
    extract.on("error", reject);

    createReadStream(path.resolve(tarPath)).pipe(createGunzip()).pipe(extract);
  });
}

// =============================================================================
// Main
// =============================================================================
async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Directus local → S3 migration`);
  console.log(`Directus: ${C.DIRECTUS_URL}`);
  console.log(`S3:       s3://${C.S3_BUCKET}/${C.S3_PREFIX}`);
  console.log(`Disk:     ${C.S3_DISK_NAME}`);
  console.log(`Archive:  ${C.TAR_PATH}`);
  console.log(`Mode:     ${isDryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`${"=".repeat(60)}\n`);

  // ── Step 1: fetch local files from Directus ──────────────────────────────
  console.log("Step 1: Fetching files with storage=local from Directus...");
  const localFiles = await fetchLocalFiles();

  if (localFiles.length === 0) {
    console.log("No files with storage=local found. Nothing to do.");
    return;
  }

  console.log(`Found ${localFiles.length} file(s) with storage=local:\n`);
  const pad = String(localFiles.length).length;
  localFiles.forEach((f, i) => {
    console.log(
      `  ${String(i + 1).padStart(pad)}. ${f.id}  ${(f.filename_disk ?? "").padEnd(50)}  [${f.storage}]`,
    );
  });

  // ── Step 2: check which are missing from S3 ──────────────────────────────
  const noFilename = localFiles.filter((f) => !f.filename_disk);
  if (noFilename.length > 0) {
    console.log(
      `\nWARNING: ${noFilename.length} file(s) have no filename_disk — skipping:`,
    );
    noFilename.forEach((f) =>
      console.log(`  - ${f.id} (type: ${f.type ?? "unknown"})`),
    );
  }

  console.log(
    `\nStep 2: Checking S3 for ${localFiles.length - noFilename.length} file(s)...`,
  );
  const diskNames = localFiles.map((f) => f.filename_disk).filter(Boolean);
  const missingDiskNames = await batchS3Check(diskNames);

  // Also need to upload transform variants for missing originals
  // (they live in the same tar.gz with uuid__hash.ext naming)
  const missingUUIDs = new Set(
    missingDiskNames.map((f) => f.split("__")[0].split(".")[0]),
  );

  // Build final list of ALL tar entries we need (originals + variants)
  // We will collect all filenames from tar that belong to missing UUIDs
  // This is done dynamically during the stream pass

  if (missingDiskNames.length === 0) {
    console.log("All files already exist in S3.");
    await patchDirectus(localFiles, []);
    return;
  }

  console.log(`\n${missingDiskNames.length} original file(s) missing from S3:`);
  missingDiskNames.forEach((f) => console.log(`  - ${f}`));

  console.log(
    `\nTarget UUIDs (originals + their cached variants will be uploaded):`,
  );
  [...missingUUIDs].forEach((id) => console.log(`  - ${id}`));

  // ── Step 3: stream tar.gz, upload missing files ───────────────────────────
  console.log(`\nStep 3: Scanning archive for matching entries...`);

  // Only collect tar entries whose UUID prefix is in missingUUIDs —
  // files in the tar that don't belong to any of these UUIDs are ignored
  const tarEntryFilter = await collectTarEntryNames(C.TAR_PATH, missingUUIDs);

  console.log(`  Found ${tarEntryFilter.length} matching entries in archive:`);
  tarEntryFilter.forEach((f) => console.log(`    ${f}`));
  console.log(`\nUploading...`);

  const uploaded = [];

  const { uploaded: uploadedFiles, notFound } = await uploadFromTar(
    C.TAR_PATH,
    tarEntryFilter,
    (filename) => {
      uploaded.push(filename);
      console.log(`  UPLOADED  ${filename}`);
    },
  );

  if (notFound.length > 0) {
    console.log(
      `\n  WARNING: ${notFound.length} file(s) not found in archive:`,
    );
    notFound.forEach((f) => console.log(`    - ${f}`));
  }

  // ── Step 4: patch Directus storage field ─────────────────────────────────
  // Only patch records whose original file was uploaded
  const uploadedUUIDs = new Set(
    uploadedFiles.map((f) => f.split("__")[0].split(".")[0]),
  );
  const filesToPatch = localFiles.filter((f) => uploadedUUIDs.has(f.id));

  await patchDirectus(localFiles, filesToPatch);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log(`${"=".repeat(60)}`);
  console.log(`Files with storage=local in Directus: ${localFiles.length}`);
  console.log(
    `Already in S3 (skipped):              ${localFiles.length - missingDiskNames.length}`,
  );
  console.log(
    `Uploaded to S3:                       ${uploadedFiles.length} files (incl. variants)`,
  );
  console.log(`Directus records patched:             ${filesToPatch.length}`);
  if (isDryRun) console.log("\n(DRY RUN — nothing was actually changed)");
}

// Scan tar headers once to collect filenames matching missingUUIDs
async function collectTarEntryNames(tarPath, missingUUIDs) {
  return new Promise((resolve, reject) => {
    const matches = [];
    const extract = tarStream.extract();

    extract.on("entry", (header, stream, next) => {
      if (header.type === "file") {
        const filename = path.basename(header.name);
        const uuid = filename.split("__")[0].split(".")[0];
        if (
          filename !== "directus-health-file" &&
          !filename.startsWith(".") &&
          missingUUIDs.has(uuid)
        ) {
          matches.push(filename);
        }
      }
      stream.resume();
      next();
    });

    extract.on("finish", () => resolve(matches));
    extract.on("error", reject);

    createReadStream(path.resolve(tarPath)).pipe(createGunzip()).pipe(extract);
  });
}

async function patchDirectus(allLocalFiles, filesToPatch) {
  if (filesToPatch.length === 0 && allLocalFiles.length > 0) {
    console.log("\nStep 4: No new uploads — skipping Directus patch.");
    return;
  }

  console.log(
    `\nStep 4: Patching ${filesToPatch.length} Directus file record(s) → storage=${C.S3_DISK_NAME}`,
  );

  let patched = 0;
  for (const file of filesToPatch) {
    if (isDryRun) {
      console.log(
        `  [DRY-RUN] Would PATCH /files/${file.id}  storage → ${C.S3_DISK_NAME}`,
      );
      continue;
    }

    try {
      await directusRequest("PATCH", `/files/${file.id}`, {
        storage: C.S3_DISK_NAME,
      });
      console.log(`  PATCHED  ${file.id}  (${file.filename_disk})`);
      patched++;
    } catch (err) {
      console.error(`  FAILED PATCH ${file.id}: ${err.message}`);
      // If the API rejects patching `storage`, print the fallback SQL
      if (err.message.includes("403") || err.message.includes("storage")) {
        console.warn(`  → API may not allow patching storage field directly.`);
        console.warn(`    Fallback SQL for this file:`);
        console.warn(
          `    UPDATE directus_files SET storage = '${C.S3_DISK_NAME}' WHERE id = '${file.id}';`,
        );
      }
    }
  }

  if (!isDryRun) {
    console.log(`\nPatched ${patched}/${filesToPatch.length} record(s).`);

    if (patched < filesToPatch.length) {
      console.log("\nFallback SQL for any failed patches:");
      const ids = filesToPatch.map((f) => `'${f.id}'`).join(",\n  ");
      console.log(
        `UPDATE directus_files\nSET storage = '${C.S3_DISK_NAME}'\nWHERE id IN (\n  ${ids}\n);`,
      );
    }
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
