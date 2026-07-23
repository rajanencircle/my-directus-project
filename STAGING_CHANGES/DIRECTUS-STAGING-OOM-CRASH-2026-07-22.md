# Directus Staging Container OOM Crash — 2026-07-22

**Type:** Incident report (no schema/data change made to fix — infra/config recommendations only)
**Environment:** `directus-staging` (`vm-directus-botg-staging`, `/opt/directus-staging`)
**Status:** Container manually restarted and confirmed running again. Root cause identified. Preventive fixes NOT yet applied — see Recommendations.

## Summary

The `directus-staging-directus-1` container was killed by the Linux kernel OOM-killer during a large media import run and stayed down for ~15 hours (PM2 exhausted its auto-restart attempts and gave up). It was discovered dead, diagnosed, and manually restarted by the user.

## Timeline

**Timezone reference** (confirmed live on 2026-07-23 ~08:08 UTC by checking `date`/`Get-Date` on all three machines simultaneously):

| Machine | Timezone | Local time at check | UTC equivalent |
|---|---|---|---|
| Mac (user's machine, Gmail viewed here) | IST (UTC+5:30) | Thu 2026-07-23 13:38:14 | 2026-07-23 08:08:14 UTC |
| `vm-directus-botg-staging` (Ubuntu, staging server — source of all log timestamps below) | UTC | Thu 2026-07-23 08:08:44 UTC | 2026-07-23 08:08:44 UTC |
| Windows server running the media import (`D:\Migration\media-import-full`) | CEST (UTC+2) | Donnerstag, 23. Juli 2026, 10:08:24 | 2026-07-23 08:08:24 UTC |

All container/kernel/Postgres log timestamps below are the staging server's native **UTC**. The completion email was read on the Mac in **IST**. CEST is included as the media-import service's own local time, since that's the clock its logs/scheduling would use.

| Time (UTC) | Time (CEST, import-server local) | Event |
|---|---|---|
| 2026-07-21 14:28:00 | 2026-07-21 16:28:00 | `directus-staging-directus-1` container (re)started (`StartedAt`) |
| 2026-07-22 ~09:00–21:00 (client-reported) | ~11:00–23:00 | Media import (`botg-media-import-service` / `media-import-full`) running from client's local Windows server against staging, processing ~40,000 file records |
| 2026-07-22 08:52–14:06 (repeated) | 10:52–16:06 | Recurring non-fatal Postgres errors during import (see below) — some rows fail, import continues |
| 2026-07-22 14:50:12 | 16:50:12 | PM2 log: `App [directus:0] exited with code [0] via signal [SIGKILL]` — PM2 retries 3→2→1→0, then gives up: `PM2 successfully stopped` |
| 2026-07-22 14:50:34 | 16:50:34 | Kernel OOM-killer invoked (triggered by `cloudflared` requesting memory) and kills the Directus `node` process — highest RSS process on the host at the time |
| 2026-07-22 15:43 (21:13 IST, per email as viewed on Mac) | 17:43 | Client's import service reports **completion**, exit code 0 — this is ~53 minutes *after* the OOM kill, confirming the import kept running against a dead Directus for most of that time before finishing/giving up |
| 2026-07-23 ~03:00–05:00 (approx., 12–14 hrs after crash) | ~05:00–07:00 | User discovers `docker ps` missing the `directus` container entirely; investigation begins (exact time not captured — approximate window based on session start) |
| 2026-07-23 02:02:10 | 04:02:10 | First Postgres checkpoint log line after the restart (container brought back up) |

## Root Cause

**Confirmed via `docker inspect`:**
```
OOMKilled=true ExitCode=2 FinishedAt=2026-07-22T14:50:20.767710473Z StartedAt=2026-07-21T14:28:00.31233422Z
```

**Confirmed via kernel log (`dmesg -T`):**
```
[Wed Jul 22 14:50:34 2026] cloudflared invoked oom-killer: gfp_mask=0x140cca(GFP_HIGHUSER_MOVABLE|__GFP_COMP), order=0, oom_score_adj=0
[Wed Jul 22 14:50:34 2026] oom-kill:constraint=CONSTRAINT_NONE,...,task=node /directus/,pid=3249605,uid=1000
[Wed Jul 22 14:50:34 2026] Out of memory: Killed process 3249605 (node /directus/) total-vm:16647280kB, anon-rss:3260616kB, file-rss:128kB, shmem-rss:0kB, UID:1000
```

- The Directus Node process had grown to **~3.1 GB resident memory (anon-rss)** at kill time.
- The OOM-killer scan was actually *triggered* by `cloudflared` asking for more memory — but the kernel chose to kill Directus because it was the largest memory consumer on the host (`global_oom`, `CONSTRAINT_NONE` — this was a **host-wide** memory shortage, not a per-container cgroup limit).
- **`docker-compose.yml` sets no memory limits** on any service (`directus`, `database`, `cache`) — nothing bounds how much RAM Directus can claim, so it was free to grow until the whole host ran out.
- This coincides with the client's bulk media import (40,000 records: file uploads + immediate metadata `PATCH` per file), a sustained sequential-heavy workload against a single Directus instance — a highly plausible driver of the steady memory growth (Node/Directus not shedding memory between large `POST /files` + `PATCH /files/:id` cycles, GC pressure, or query result buffering).

**Why it stayed down 15 hours:** PM2 (running inside the Directus container) attempted 4 restarts (retries 3→2→1→0) within seconds, all presumably failing immediately again under the same memory pressure or in the general shutdown of that OOM event, then stopped trying entirely (`PM2 successfully stopped`). No external supervisor (systemd, `docker-compose restart: always`, healthcheck-based restart) existed to catch this — `docker-compose.yml` has no `restart:` policy on the `directus` service, so once PM2 gave up, the container just sat exited.

## Secondary issue found in logs (not the crash cause, but real data loss)

Throughout the import window (08:52–14:06), Postgres repeatedly rejected writes to `directus_files` and `junction_directus_files_translations_2` with two distinct, recurring errors:

1. **`value too long for type character varying(255)`**
   Hit on inserts to `junction_directus_files_translations_2.caption_i18n` and updates to multiple `directus_files` columns (`alt_text`, `company_name`, `original_filename`, `fotoware_original_path`, `fotoware_archive`, `photographer`, `resolution_dpi`, `media_sizes_cm`, `color_space`, etc.). Source metadata from FotoWare/Primarix exceeds the 255-char column limit on these fields.

2. **`invalid byte sequence for encoding "UTF8": 0x00`**
   Null bytes (`\x00`) present in incoming string values — Postgres `text`/`varchar` columns cannot store null bytes. Hit `directus_files` fields and, notably, also hit `directus_flows.flow_manager_last_run_message` at one point (14:06:40), meaning stray null-byte data can even corrupt unrelated flow-manager bookkeeping writes if it ends up in the same transaction/batch path.

These errors align with the `failed=20` count in the import-service completion email (`processed=40000, uploaded=33996, existing=6003, failed=20`). They are transactional/row-level failures, not crashes — the import kept going — but they mean **20 file records did not get their metadata correctly written** and need to be identified and re-processed.

## Current State

- Container `directus-staging-directus-1` was manually started by the user after diagnosis; confirmed present in `docker ps` again.
- Disk space and DB connection checks came back clean (not the cause):
  - `df -h`: root filesystem 50% used (36G/75G), plenty of headroom.
  - `uploads/`: 92M, `data/database/`: 617M — small, not a disk-exhaustion issue.
  - No `too many connections` / connection-exhaustion errors found in `directus-staging-database-1` logs.
- No fix has been applied yet — this document is diagnosis + recommendations only.

## Recommendations (not yet implemented)

1. **Set container memory limits** in `/opt/directus-staging/docker-compose.yml` for the `directus` service (e.g. `mem_limit:` or Compose v2 `deploy.resources.limits.memory`), sized against actual host RAM (check with `free -h` first). This won't prevent Directus running out of memory under heavy load, but it stops a single container from taking the **entire host** down via `cloudflared` and any other services sharing the box.
2. **Add a `restart` policy** (`restart: unless-stopped` or `on-failure`) to the `directus` service in `docker-compose.yml`, so Docker itself restarts the container if PM2's internal restart budget is exhausted — the container should not be able to sit dead for 15 hours unnoticed.
3. **Add basic uptime alerting** on staging (e.g. a simple healthcheck ping/cron hitting `/server/health` or `/server/ping`) so a crash is caught within minutes, not discovered incidentally the next morning.
4. **Throttle/paginate the media import** (`botg-media-import-service` / `media-import-full`) — e.g. batch with delays or a concurrency cap — instead of hammering `POST /files` + `PATCH /files/:id` back-to-back for 40k records in one continuous run, to reduce sustained memory pressure on Directus during large imports.
5. **Sanitize import payloads before writing to Directus**, in the import service itself:
   - Strip `\x00` null bytes from all string fields before sending.
   - Truncate or pre-validate any field against its known `varchar(255)` limit (or log-and-skip with a clear reason) instead of letting Postgres reject the row silently into the container log.
6. **Reconcile the 20 failed records**: cross-reference the import service's failure log (if it captures per-item failures) against the `value too long` / `invalid byte sequence` occurrences above, and re-run those specific records after fix #5 is in place.

## Raw log excerpt reference

Full raw terminal capture (container inspect, kernel OOM log, `df -h`, Postgres error log excerpts) preserved by the user in the repo at `directus-staging-crashed.txt` (repo root, untracked) for reference alongside this report.
