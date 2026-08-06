# directus_revisions Disk Size Investigation — 2026-08-06

**Type:** Config change (`RETENTION_BATCH`) + ongoing investigation, both `directus-dev` and `directus-staging`
**Environments:** `directus-dev` (`vm-directus-botg-dev`, `/opt/directus-dev`), `directus-staging` (`vm-directus-botg-staging`, `/opt/directus-staging`)
**Status:** Diagnosis in progress. One config change applied (see below). No schema/data changes made.

## Summary

Investigating why `directus_revisions` is consuming disproportionate disk space:

| | dev | staging |
|---|---|---|
| `directus_revisions` total size | 12 GB | 3.5 GB |
| main table | 298 MB | 211 MB |
| indexes | 64 MB | 77 MB |
| TOAST | 12 GB | 3.2 GB |
| TOAST dead tuples | 0 | 0 |
| row count | 1,163,596 | 1,437,067 |
| oldest revision | 2026-07-27 | 2026-08-03 |
| root disk free (`df -h /`) | 11 GB (86% used) | 29 GB (61% used) |
| `pgdumps/` size | 39 GB (79 backups) | not checked |

`REVISIONS_RETENTION=10d` is working correctly on both hosts (oldest revision matches the window). TOAST dead-tuple count of 0 on both hosts indicates this is **not** classic dead-row bloat (autovacuum has already reclaimed what it can) — most of the size is real TOASTed JSON revision-delta data, roughly ~10.6 KB/row average on dev. Root cause under investigation: identifying which collection(s) generate the largest deltas via `pg_column_size(delta)` grouped by collection.

## Config change applied

`RETENTION_BATCH` changed from `1000` to `50000` in `.env` on **[dev / staging — confirm which]**, then `docker compose up -d --force-recreate directus` to apply.

- Before: `RETENTION_BATCH=1000` (confirmed via `docker exec ... env`)
- After: `RETENTION_BATCH=50000`
- Rationale: testing whether retention was batch-limited (i.e. a backlog of over-retention rows the 5-min cron couldn't clear at batch=1000).
- Caveat noted at the time: oldest revision on both hosts is already within the retention window (no backlog), so this change was expected to likely show **no measurable effect** on row count/size — this is a diagnostic test, not an assumed fix.
- Revert: `sed -i 's/^RETENTION_BATCH=.*/RETENTION_BATCH=1000/' .env && docker compose up -d --force-recreate directus`

## Next steps (not yet done)

1. Re-check `directus_revisions` size/row-count ~1hr after the batch change on both hosts to confirm whether it moved anything.
2. Run per-collection breakdown (`pg_column_size(delta)` grouped by `collection`) to find the actual biggest contributor(s).
3. Check `directus_collections.accountability` to see which collections have revisions enabled at all.
4. Based on findings, decide between: disabling `accountability` on high-churn/large-JSON collections, shortening `REVISIONS_RETENTION`, and/or a one-off `VACUUM FULL directus_revisions` (tempered expectations — dead_tup=0 means it won't shrink as dramatically as a naive bloat read would suggest).
5. On dev specifically: prune old `pgdumps` backups (keep last ~7) — separate, unrelated to `directus_revisions` but the most urgent lever for the 86%-full disk.

Source chat with initial (later revised) diagnosis: `chats/chatgpt-pg-data.txt`.
