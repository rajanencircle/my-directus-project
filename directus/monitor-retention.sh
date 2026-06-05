#!/usr/bin/env bash
#
# monitor-retention.sh — track whether Directus data-retention is pruning the
# log tables (directus_activity / directus_revisions / directus_operations).
#
# Retention (RETENTION_* env vars) runs a cron job that DELETEs old rows.
# DELETE shrinks ROW COUNT but NOT the on-disk file — only VACUUM reclaims disk.
# This script logs both, with the delta since the previous check, so you can
# confirm pruning is happening without opening psql yourself.
#
# Usage:
#   ./monitor-retention.sh              # take one snapshot, append to log, print it
#   ./monitor-retention.sh --watch      # loop forever, one snapshot every 5 min
#   ./monitor-retention.sh --watch 600  # loop, custom interval in seconds
#   ./monitor-retention.sh --vacuum     # one-time VACUUM FULL to reclaim disk (locks tables)
#
# Log file: ./retention-monitor.log  (human-readable)
#           ./retention-monitor.csv  (machine-readable, one row per check)

set -euo pipefail

cd "$(dirname "$0")"

# --- config -----------------------------------------------------------------
DB_SERVICE="database"
DB_USER="$(grep -E '^DB_USER=' .env | head -1 | cut -d= -f2- | tr -d '"'"'"'' )"
DB_NAME="$(grep -E '^DB_DATABASE=' .env | head -1 | cut -d= -f2- | tr -d '"'"'"'' )"
DB_USER="${DB_USER:-directus}"
DB_NAME="${DB_NAME:-directus}"

LOG_FILE="./retention-monitor.log"
CSV_FILE="./retention-monitor.csv"
TABLES=("directus_activity" "directus_revisions" "directus_operations")

# --- helpers ----------------------------------------------------------------
psql_q() {
  # Run a query quietly inside the db container; -A -t = unaligned, tuples-only.
  docker compose exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -A -t -F$'\t' -c "$1" 2>/dev/null
}

snapshot() {
  # Emits one tab-separated line per table: name<TAB>rows<TAB>size_bytes<TAB>dead_tuples
  local in_list
  in_list=$(printf "'%s'," "${TABLES[@]}"); in_list="${in_list%,}"
  psql_q "
    SELECT c.relname,
           c.reltuples::bigint,
           pg_total_relation_size(c.oid),
           COALESCE(s.n_dead_tup, 0)
    FROM pg_class c
    LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
    WHERE c.relname IN ($in_list)
    ORDER BY c.relname;"
}

human_size() {
  # bytes -> human readable
  local b=$1
  if   (( b >= 1073741824 )); then printf "%.1f GB" "$(echo "$b/1073741824" | bc -l)"
  elif (( b >= 1048576 ));    then printf "%.1f MB" "$(echo "$b/1048576" | bc -l)"
  elif (( b >= 1024 ));       then printf "%.1f KB" "$(echo "$b/1024" | bc -l)"
  else printf "%d B" "$b"; fi
}

last_csv_val() { # $1=table $2=column(rows|bytes) -> previous logged value or empty
  [[ -f "$CSV_FILE" ]] || return 0
  awk -F, -v t="$1" -v col="$2" '
    $2==t { if(col=="rows") v=$3; else if(col=="bytes") v=$4 }
    END { print v }' "$CSV_FILE"
}

check_once() {
  local ts; ts="$(date '+%Y-%m-%d %H:%M:%S')"
  local snap; snap="$(snapshot)"

  if [[ -z "$snap" ]]; then
    echo "[$ts] ERROR: could not query database (is the '$DB_SERVICE' container up?)" | tee -a "$LOG_FILE"
    return 1
  fi

  [[ -f "$CSV_FILE" ]] || echo "timestamp,table,rows,bytes,dead_tuples" > "$CSV_FILE"

  echo "[$ts] retention check" | tee -a "$LOG_FILE"
  while IFS=$'\t' read -r tbl rows bytes dead; do
    [[ -z "$tbl" ]] && continue
    local prev_rows prev_bytes drows dbytes
    prev_rows="$(last_csv_val "$tbl" rows)"
    prev_bytes="$(last_csv_val "$tbl" bytes)"
    drows=""; dbytes=""
    [[ -n "$prev_rows"  ]] && drows="$(( rows  - prev_rows ))"
    [[ -n "$prev_bytes" ]] && dbytes="$(( bytes - prev_bytes ))"

    local line
    line="$(printf "  %-22s rows=%-10s size=%-9s dead=%-9s" \
            "$tbl" "$rows" "$(human_size "$bytes")" "$dead")"
    if [[ -n "$drows" ]]; then
      local sign="+"; (( drows < 0 )) && sign=""
      line+="  Δrows=${sign}${drows}"
    fi
    echo "$line" | tee -a "$LOG_FILE"

    echo "$ts,$tbl,$rows,$bytes,$dead" >> "$CSV_FILE"
  done <<< "$snap"
}

vacuum_full() {
  echo "Running VACUUM FULL VERBOSE on log tables (this LOCKS each table while it runs)..."
  for t in "${TABLES[@]}"; do
    echo ">> VACUUM FULL $t"
    docker compose exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -c "VACUUM (FULL, VERBOSE, ANALYZE) $t;"
  done
  echo "Done. Disk space reclaimed."
}

# --- main -------------------------------------------------------------------
case "${1:-}" in
  --vacuum) vacuum_full ;;
  --watch)
    interval="${2:-300}"
    echo "Watching every ${interval}s — logging to $LOG_FILE (Ctrl-C to stop)."
    while true; do
      check_once || true
      sleep "$interval"
    done
    ;;
  ""|--once) check_once ;;
  *) echo "Usage: $0 [--once | --watch [seconds] | --vacuum]"; exit 1 ;;
esac
