#!/usr/bin/env bash
# Stop hook — surfaces git status at end of turn so dirty trees don't slip by.
set -u

cd /Users/igorcarvalhorodrigues/Projects/grandma-app || exit 0

status=$(git status --short 2>/dev/null)
[ -z "$status" ] && exit 0

count=$(printf '%s\n' "$status" | wc -l | tr -d ' ')

printf '📝 %s uncommitted change(s):\n%s\n' "$count" "$status" >&2

exit 0
