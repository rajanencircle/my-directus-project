#!/usr/bin/env node
/**
 * S3 → S3 file migration (staging bucket → dev bucket)
 *
 * Steps:
 *  1. (optional --clean-first) Delete all objects from the destination bucket
 *  2. List all objects in the source bucket (originals + cached variants)
 *  3. Check the destination bucket to find which objects are missing
 *  4. Server-side copy missing objects from source → destination
 *
 * Usage:
 *   node migrate.js [--dry-run] [--clean-first]
 *
 * --dry-run      Shows what would be copied/deleted without doing anything
 * --clean-first  Clears the destination bucket before copying
 */

import "dotenv/config";
import {
  S3Client,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

// =============================================================================
// Config — all values come from .env
// =============================================================================
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isCleanFirst = args.includes("--clean-first");

const C = {
  SRC_S3_BUCKET: process.env.SRC_S3_BUCKET,
  SRC_S3_PREFIX: process.env.SRC_S3_PREFIX ?? "",
  DST_S3_BUCKET: process.env.DST_S3_BUCKET,
  DST_S3_PREFIX: process.env.DST_S3_PREFIX ?? "",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
};

for (const key of [
  "SRC_S3_BUCKET",
  "DST_S3_BUCKET",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
]) {
  if (!C[key]) {
    console.error(`Missing required env var: ${key}  (add it to .env)`);
    process.exit(1);
  }
}

// =============================================================================
// S3 client — single client, same credentials work for both buckets
// =============================================================================
const s3 = new S3Client({
  region: C.AWS_REGION,
  ...(C.S3_ENDPOINT ? { endpoint: C.S3_ENDPOINT, forcePathStyle: false } : {}),
  credentials: {
    accessKeyId: C.AWS_ACCESS_KEY_ID,
    secretAccessKey: C.AWS_SECRET_ACCESS_KEY,
  },
});

function srcKey(filename) {
  return C.SRC_S3_PREFIX
    ? `${C.SRC_S3_PREFIX.replace(/\/$/, "")}/${filename}`
    : filename;
}

function dstKey(filename) {
  return C.DST_S3_PREFIX
    ? `${C.DST_S3_PREFIX.replace(/\/$/, "")}/${filename}`
    : filename;
}

// =============================================================================
// S3 helpers
// =============================================================================

// List all object keys in a bucket (handles pagination)
async function listAllObjects(bucket, prefix) {
  const keys = [];
  let continuationToken;

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ...(prefix ? { Prefix: prefix } : {}),
        ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
        MaxKeys: 1000,
      }),
    );

    for (const obj of res.Contents ?? []) {
      keys.push(obj.Key);
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

// Check if a key exists in DST bucket
async function existsInDst(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: C.DST_S3_BUCKET, Key: key }));
    return true;
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404)
      return false;
    throw err;
  }
}

// Check a batch of SRC keys against DST, returns keys missing from DST
async function findMissingKeys(srcKeys, concurrency = 10) {
  const missing = [];
  const chunks = [];
  for (let i = 0; i < srcKeys.length; i += concurrency) {
    chunks.push(srcKeys.slice(i, i + concurrency));
  }
  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(async (key) => {
        // SRC key may have a prefix; map to the DST key space
        const filename = C.SRC_S3_PREFIX
          ? key.slice(C.SRC_S3_PREFIX.replace(/\/$/, "").length + 1)
          : key;
        const dst = dstKey(filename);
        return { srcKey: key, dstKey: dst, exists: await existsInDst(dst) };
      }),
    );
    results.filter((r) => !r.exists).forEach((r) => missing.push(r));
  }
  return missing;
}

// Delete all objects from DST bucket
async function cleanDstBucket() {
  console.log(`\nCleaning destination bucket: s3://${C.DST_S3_BUCKET}/${C.DST_S3_PREFIX}`);
  const keys = await listAllObjects(
    C.DST_S3_BUCKET,
    C.DST_S3_PREFIX || undefined,
  );

  if (keys.length === 0) {
    console.log("  Destination bucket is already empty.");
    return;
  }

  console.log(`  Found ${keys.length} object(s) to delete.`);

  if (isDryRun) {
    keys.forEach((k) => console.log(`  [DRY-RUN] Would delete: ${k}`));
    return;
  }

  const CHUNK = 1000;
  let deleted = 0;
  let errors = 0;

  for (let i = 0; i < keys.length; i += CHUNK) {
    const chunk = keys.slice(i, i + CHUNK);
    const res = await s3.send(
      new DeleteObjectsCommand({
        Bucket: C.DST_S3_BUCKET,
        Delete: { Objects: chunk.map((k) => ({ Key: k })), Quiet: false },
      }),
    );
    deleted += res.Deleted?.length ?? 0;
    for (const err of res.Errors ?? []) {
      console.error(`  FAILED delete ${err.Key}: ${err.Message}`);
      errors++;
    }
  }

  console.log(`  Deleted: ${deleted}  |  Errors: ${errors}`);
}

// =============================================================================
// Main
// =============================================================================
async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`S3 → S3 migration`);
  console.log(`Source:  s3://${C.SRC_S3_BUCKET}/${C.SRC_S3_PREFIX}`);
  console.log(`Dest:    s3://${C.DST_S3_BUCKET}/${C.DST_S3_PREFIX}`);
  console.log(`Mode:    ${isDryRun ? "DRY RUN" : "LIVE"}`);
  if (isCleanFirst) console.log(`         --clean-first enabled`);
  console.log(`${"=".repeat(60)}\n`);

  // ── Step 1: clean destination bucket if requested ────────────────────────
  if (isCleanFirst) {
    await cleanDstBucket();
    console.log();
  }

  // ── Step 2: list all objects in source bucket ────────────────────────────
  console.log(
    `Step 1: Listing objects in source bucket s3://${C.SRC_S3_BUCKET}...`,
  );
  const srcKeys = await listAllObjects(
    C.SRC_S3_BUCKET,
    C.SRC_S3_PREFIX || undefined,
  );

  if (srcKeys.length === 0) {
    console.log("Source bucket is empty. Nothing to migrate.");
    return;
  }

  console.log(`  Found ${srcKeys.length} object(s):`);
  srcKeys.forEach((k) => console.log(`    ${k}`));

  // ── Step 3: find which keys are missing from DST ─────────────────────────
  console.log(
    `\nStep 2: Checking destination bucket for ${srcKeys.length} object(s)...`,
  );
  const missing = await findMissingKeys(srcKeys);

  const alreadyExists = srcKeys.length - missing.length;
  console.log(`  Already in destination: ${alreadyExists}`);
  console.log(`  Missing from destination: ${missing.length}`);

  if (missing.length === 0) {
    console.log("\nAll objects already exist in destination. Nothing to copy.");
    printSummary(srcKeys.length, alreadyExists, 0, 0);
    return;
  }

  console.log(`\n  Objects to copy:`);
  missing.forEach((m) => console.log(`    ${m.srcKey}  →  ${m.dstKey}`));

  // ── Step 4: copy missing objects SRC → DST ────────────────────────────────
  console.log(`\nStep 3: Copying ${missing.length} object(s)...`);

  if (isDryRun) {
    missing.forEach((m) =>
      console.log(`  [DRY-RUN] Would copy: ${m.srcKey}  →  ${m.dstKey}`),
    );
    printSummary(srcKeys.length, alreadyExists, missing.length, 0, true);
    return;
  }

  let copied = 0;
  let failed = 0;
  const CONCURRENCY = 10;

  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const batch = missing.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (m) => {
        try {
          await s3.send(
            new CopyObjectCommand({
              Bucket: C.DST_S3_BUCKET,
              Key: m.dstKey,
              CopySource: `${C.SRC_S3_BUCKET}/${m.srcKey}`,
            }),
          );
          console.log(`  COPIED  ${m.srcKey}`);
          copied++;
        } catch (err) {
          console.error(`  FAILED  ${m.srcKey}: ${err.message}`);
          failed++;
        }
      }),
    );
  }

  printSummary(srcKeys.length, alreadyExists, copied, failed);
}

function printSummary(total, skipped, copied, failed, dryRun = false) {
  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log(`${"=".repeat(60)}`);
  console.log(`Total objects in source:   ${total}`);
  console.log(`Already in destination:    ${skipped}`);
  console.log(`Copied:                    ${copied}`);
  if (failed > 0) console.log(`Failed:                    ${failed}`);
  if (dryRun) console.log("\n(DRY RUN — nothing was actually changed)");
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
