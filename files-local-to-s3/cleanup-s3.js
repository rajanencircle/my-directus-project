#!/usr/bin/env node
/**
 * Delete specific files from S3 by filename.
 * Edit the FILES array below, then run: node cleanup-s3.js
 * Supports --dry-run to preview without deleting.
 */

import "dotenv/config";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

// ─── Files to delete ────────────────────────────────────────────────────────
const FILES = [
  "87df398a-914d-4f03-8d0f-bd445ab5046c__7abd30a2f63f675625d6888e2ed9d65992751e3c.avif",
  "337fea19-9847-4e14-aa76-be410b82feab__e9dcbd6d37cf1a1351d2786febd96ceaf3ef6132.avif",
  "374d4cf6-dfb3-46ef-9b2b-fb98b36371e1__4b6b0cbf102b42aa1ad5a87487b88a66404eff7e.jpg",
  "2ae31053-ed09-4484-87d3-7b12626d9f86__f15aa4b815722867859d2a3fa46ab50834dfc8dc.avif",
  "41a0e193-1ad7-441f-a730-f54145fc9ef1__edbfb0170ce66697b3907be835bea166f80ab462.jpg",
  "374d4cf6-dfb3-46ef-9b2b-fb98b36371e1__b37dc476720e6ebe6629cb45a73a514a4c15a01e.jpg",
  "38ac1a11-ed5f-46e7-b9a0-f5ef5069718d__e9dcbd6d37cf1a1351d2786febd96ceaf3ef6132.avif",
  "41a0e193-1ad7-441f-a730-f54145fc9ef1__e9dcbd6d37cf1a1351d2786febd96ceaf3ef6132.avif",
  "12720fd6-fca9-4f6f-af64-8f466c52789a__b37dc476720e6ebe6629cb45a73a514a4c15a01e.png",
  "cf7cbb8d-4011-40c1-8753-c2665ea61aa6.jpg",
  "87df398a-914d-4f03-8d0f-bd445ab5046c__f15aa4b815722867859d2a3fa46ab50834dfc8dc.avif",
  "12720fd6-fca9-4f6f-af64-8f466c52789a__e9dcbd6d37cf1a1351d2786febd96ceaf3ef6132.avif",
  "42849722-9130-40f8-a147-90842bd2c846__b37dc476720e6ebe6629cb45a73a514a4c15a01e.jpg",
  "374d4cf6-dfb3-46ef-9b2b-fb98b36371e1__edbfb0170ce66697b3907be835bea166f80ab462.jpg",
  "87df398a-914d-4f03-8d0f-bd445ab5046c__b37dc476720e6ebe6629cb45a73a514a4c15a01e.png",
  "b24b102c-b1b1-49c3-a596-8f0004d8c655.mp4",
  "0a54b606-d837-4eac-a762-929cf4376fe3.svg",
  "12720fd6-fca9-4f6f-af64-8f466c52789a__7abd30a2f63f675625d6888e2ed9d65992751e3c.avif",
  "ac4513aa-4d0a-4548-ac8f-f509ebc03d6b.svg",
  "7fe61f71-222c-468e-abe7-e2ecc785afac.jpg",
  "2ae31053-ed09-4484-87d3-7b12626d9f86__7abd30a2f63f675625d6888e2ed9d65992751e3c.avif",
  "eb1130d1-2670-4c01-a92d-3a999c678519__e9dcbd6d37cf1a1351d2786febd96ceaf3ef6132.avif",
  "38ac1a11-ed5f-46e7-b9a0-f5ef5069718d__4b6b0cbf102b42aa1ad5a87487b88a66404eff7e.png",
  "2ae31053-ed09-4484-87d3-7b12626d9f86__edbfb0170ce66697b3907be835bea166f80ab462.jpg",
  "eb1130d1-2670-4c01-a92d-3a999c678519__7abd30a2f63f675625d6888e2ed9d65992751e3c.avif",
  "05c3457e-aef4-46bf-8156-b1bed4d257db__f15aa4b815722867859d2a3fa46ab50834dfc8dc.avif",
  "87df398a-914d-4f03-8d0f-bd445ab5046c__4f7f2791732f0b8f33c44abe69d6e5b615ea3f17.png",
  "38ac1a11-ed5f-46e7-b9a0-f5ef5069718d__b37dc476720e6ebe6629cb45a73a514a4c15a01e.png",
  "87df398a-914d-4f03-8d0f-bd445ab5046c__589fd140dc03b11360453048b8c68765d61556b2.png",
  "38ac1a11-ed5f-46e7-b9a0-f5ef5069718d.png",
  "42849722-9130-40f8-a147-90842bd2c846__edbfb0170ce66697b3907be835bea166f80ab462.jpg",
  "7fe61f71-222c-468e-abe7-e2ecc785afac__4b6b0cbf102b42aa1ad5a87487b88a66404eff7e.jpg",
  "cf7cbb8d-4011-40c1-8753-c2665ea61aa6__5b7fe6070aa6be5d0a2013646f0ff71ed585210a.jpeg",
  "42849722-9130-40f8-a147-90842bd2c846__e9dcbd6d37cf1a1351d2786febd96ceaf3ef6132.avif",
  "42849722-9130-40f8-a147-90842bd2c846__f15aa4b815722867859d2a3fa46ab50834dfc8dc.avif",
  "cf7cbb8d-4011-40c1-8753-c2665ea61aa6__edbfb0170ce66697b3907be835bea166f80ab462.jpg",
  "cf7cbb8d-4011-40c1-8753-c2665ea61aa6__b37dc476720e6ebe6629cb45a73a514a4c15a01e.jpg",
  "41a0e193-1ad7-441f-a730-f54145fc9ef1__4b6b0cbf102b42aa1ad5a87487b88a66404eff7e.jpg",
  "2ae31053-ed09-4484-87d3-7b12626d9f86.jpg",
  "7fe61f71-222c-468e-abe7-e2ecc785afac__e9dcbd6d37cf1a1351d2786febd96ceaf3ef6132.avif",
  "337fea19-9847-4e14-aa76-be410b82feab.png",
  "42849722-9130-40f8-a147-90842bd2c846.jpg",
  "87df398a-914d-4f03-8d0f-bd445ab5046c__edbfb0170ce66697b3907be835bea166f80ab462.png",
  "05c3457e-aef4-46bf-8156-b1bed4d257db__b37dc476720e6ebe6629cb45a73a514a4c15a01e.jpg",
  "42849722-9130-40f8-a147-90842bd2c846__7abd30a2f63f675625d6888e2ed9d65992751e3c.avif",
  "12720fd6-fca9-4f6f-af64-8f466c52789a.png",
  "374d4cf6-dfb3-46ef-9b2b-fb98b36371e1.jpg",
  "05c3457e-aef4-46bf-8156-b1bed4d257db__edbfb0170ce66697b3907be835bea166f80ab462.jpg",
  "7fe61f71-222c-468e-abe7-e2ecc785afac__b37dc476720e6ebe6629cb45a73a514a4c15a01e.jpg",
  "1c72c95e-6303-4fe1-bada-b98bc4047359.jpg",
  "cf7cbb8d-4011-40c1-8753-c2665ea61aa6__7abd30a2f63f675625d6888e2ed9d65992751e3c.avif",
  "7fe61f71-222c-468e-abe7-e2ecc785afac__edbfb0170ce66697b3907be835bea166f80ab462.jpg",
  "2ae31053-ed09-4484-87d3-7b12626d9f86__4b6b0cbf102b42aa1ad5a87487b88a66404eff7e.jpg",
  "7fe61f71-222c-468e-abe7-e2ecc785afac__7abd30a2f63f675625d6888e2ed9d65992751e3c.avif",
  "38ac1a11-ed5f-46e7-b9a0-f5ef5069718d__7abd30a2f63f675625d6888e2ed9d65992751e3c.avif",
  "60883030-787d-4fc6-bf76-bc4887245627.svg",
  "38ac1a11-ed5f-46e7-b9a0-f5ef5069718d__f15aa4b815722867859d2a3fa46ab50834dfc8dc.avif",
  "cf7cbb8d-4011-40c1-8753-c2665ea61aa6__f15aa4b815722867859d2a3fa46ab50834dfc8dc.avif",
  "cf7cbb8d-4011-40c1-8753-c2665ea61aa6__e9dcbd6d37cf1a1351d2786febd96ceaf3ef6132.avif",
  "87df398a-914d-4f03-8d0f-bd445ab5046c.png",
  "2ae31053-ed09-4484-87d3-7b12626d9f86__e9dcbd6d37cf1a1351d2786febd96ceaf3ef6132.avif",
  "41a0e193-1ad7-441f-a730-f54145fc9ef1.jpg",
  "12720fd6-fca9-4f6f-af64-8f466c52789a__4b6b0cbf102b42aa1ad5a87487b88a66404eff7e.png",
  "05c3457e-aef4-46bf-8156-b1bed4d257db__e9dcbd6d37cf1a1351d2786febd96ceaf3ef6132.avif",
  "12720fd6-fca9-4f6f-af64-8f466c52789a__f15aa4b815722867859d2a3fa46ab50834dfc8dc.avif",
  "374d4cf6-dfb3-46ef-9b2b-fb98b36371e1__e9dcbd6d37cf1a1351d2786febd96ceaf3ef6132.avif",
  "2ae31053-ed09-4484-87d3-7b12626d9f86__b37dc476720e6ebe6629cb45a73a514a4c15a01e.jpg",
  "12720fd6-fca9-4f6f-af64-8f466c52789a__edbfb0170ce66697b3907be835bea166f80ab462.png",
  "05c3457e-aef4-46bf-8156-b1bed4d257db__7abd30a2f63f675625d6888e2ed9d65992751e3c.avif",
  "38ac1a11-ed5f-46e7-b9a0-f5ef5069718d__edbfb0170ce66697b3907be835bea166f80ab462.png",
  "eb1130d1-2670-4c01-a92d-3a999c678519.png",
  "de67c7be-f310-46da-aa91-5469ca06405a.svg",
  "05c3457e-aef4-46bf-8156-b1bed4d257db.jpg",
  "87df398a-914d-4f03-8d0f-bd445ab5046c__e9dcbd6d37cf1a1351d2786febd96ceaf3ef6132.avif",
];

// ────────────────────────────────────────────────────────────────────────────

const isDryRun = process.argv.includes("--dry-run");

const bucket = process.env.S3_BUCKET;
const prefix = process.env.S3_PREFIX ?? "";
const endpoint = process.env.S3_ENDPOINT;
const region = process.env.AWS_REGION;

for (const key of ["S3_BUCKET", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}  (add it to .env)`);
    process.exit(1);
  }
}

const s3 = new S3Client({
  region,
  ...(endpoint ? { endpoint, forcePathStyle: false } : {}),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function s3Key(filename) {
  return prefix ? `${prefix.replace(/\/$/, "")}/${filename}` : filename;
}

async function main() {
  console.log(`\nBucket:  s3://${bucket}/${prefix}`);
  console.log(`Files:   ${FILES.length}`);
  console.log(`Mode:    ${isDryRun ? "DRY RUN" : "LIVE DELETE"}\n`);

  if (isDryRun) {
    FILES.forEach((f) => console.log(`  would delete: ${s3Key(f)}`));
    console.log(`\n(dry run — nothing deleted)`);
    return;
  }

  // S3 DeleteObjects accepts up to 1000 keys per request
  const CHUNK = 1000;
  let deleted = 0;
  let errors = 0;

  for (let i = 0; i < FILES.length; i += CHUNK) {
    const chunk = FILES.slice(i, i + CHUNK);
    const objects = chunk.map((f) => ({ Key: s3Key(f) }));

    const res = await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: objects, Quiet: false },
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
