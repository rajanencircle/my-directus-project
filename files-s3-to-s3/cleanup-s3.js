#!/usr/bin/env node
/**
 * Delete ALL objects from the destination (dev) S3 bucket.
 * Useful for cleaning the dev bucket before a fresh migration.
 *
 * Usage:
 *   node cleanup-s3.js [--dry-run]
 *
 * --dry-run  Lists what would be deleted without removing anything
 */

import "dotenv/config";
import readline from "readline";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "yes");
    });
  });
}

const isDryRun = process.argv.includes("--dry-run");

for (const key of ["DST_S3_BUCKET", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}  (add it to .env)`);
    process.exit(1);
  }
}

const bucket = process.env.DST_S3_BUCKET;
const prefix = process.env.DST_S3_PREFIX ?? "";
const endpoint = process.env.S3_ENDPOINT;
const region = process.env.AWS_REGION;

const s3 = new S3Client({
  region,
  ...(endpoint ? { endpoint, forcePathStyle: false } : {}),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// List all objects in the bucket (paginated)
async function listAllObjects() {
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

async function main() {
  console.log(`\nBucket: s3://${bucket}/${prefix}`);
  console.log(`Mode:   ${isDryRun ? "DRY RUN" : "LIVE DELETE"}\n`);

  const keys = await listAllObjects();

  if (keys.length === 0) {
    console.log("Bucket is already empty. Nothing to delete.");
    return;
  }

  console.log(`Found ${keys.length} object(s):\n`);
  keys.forEach((k) => console.log(`  ${k}`));

  if (isDryRun) {
    console.log(`\n(DRY RUN — ${keys.length} object(s) would be deleted)`);
    return;
  }

  const ok = await confirm(`\nDelete all ${keys.length} object(s) from s3://${bucket}?`);
  if (!ok) {
    console.log("Aborted.");
    process.exit(0);
  }

  const CHUNK = 1000;
  let deleted = 0;
  let errors = 0;

  for (let i = 0; i < keys.length; i += CHUNK) {
    const chunk = keys.slice(i, i + CHUNK);
    const res = await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk.map((k) => ({ Key: k })), Quiet: false },
      }),
    );

    for (const obj of res.Deleted ?? []) {
      console.log(`  DELETED  ${obj.Key}`);
      deleted++;
    }
    for (const err of res.Errors ?? []) {
      console.error(`  FAILED   ${err.Key}: ${err.Message}`);
      errors++;
    }
  }

  console.log(`\nDeleted: ${deleted}  |  Errors: ${errors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
