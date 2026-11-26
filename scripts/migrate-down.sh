#!/usr/bin/env bash
# Roll back ONE database migration, using the matching file in backend/migrations-rollback/.
#
#   scripts/migrate-down.sh 0014            # local database (safe to try first)
#   scripts/migrate-down.sh 0014 --remote   # production: take a backup first (docs/DISASTER_RECOVERY.md)
#
# Only the newest applied migration should be rolled back, and the Worker code that needs it must be rolled back first.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <migration number, e.g. 0014> [--remote]" >&2
  exit 2
fi

number="$1"
where="${2:---local}"
case "$where" in --local|--remote) ;; *) echo "Second argument must be --local or --remote" >&2; exit 2 ;; esac

root="$(cd "$(dirname "$0")/.." && pwd)"
matches=("$root"/backend/migrations-rollback/"$number"_*.down.sql)
if [ ! -e "${matches[0]}" ]; then
  echo "No rollback file for migration $number in backend/migrations-rollback/" >&2
  exit 1
fi

if [ "$where" = "--remote" ]; then
  echo "This changes the PRODUCTION database with ${matches[0]##*/}."
  read -r -p "Type the migration number again to continue: " confirm
  [ "$confirm" = "$number" ] || { echo "Cancelled."; exit 1; }
fi

cd "$root/backend"
npx wrangler d1 execute noteburner-db "$where" --file "${matches[0]}" < /dev/null
echo "Rolled back ${matches[0]##*/}"
