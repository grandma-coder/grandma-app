#!/usr/bin/env bash
# PostToolUse hook — runs tsc --noEmit after Edit/Write on .ts/.tsx files.
# Warn-only: prints errors but never blocks the turn (exit 0 always).
# The Claude harness passes the tool-use payload as JSON on stdin.

set -u

# Read the JSON payload
payload=$(cat)

# Extract the edited file path. Edit/Write both use `file_path`.
file=$(printf '%s' "$payload" | /usr/bin/python3 -c 'import json,sys
try:
  d=json.load(sys.stdin)
  print(d.get("tool_input",{}).get("file_path",""))
except Exception:
  pass' 2>/dev/null)

# Only run on TS/TSX inside the project
case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

case "$file" in
  */node_modules/*|*/.expo/*|*/dist/*) exit 0 ;;
esac

cd /Users/igorcarvalhorodrigues/Projects/grandma-app || exit 0

# Run tsc, capture output. Warn-only — always exit 0.
output=$(npx --no-install tsc --noEmit --pretty false 2>&1)
status=$?

if [ $status -ne 0 ]; then
  # Filter to errors mentioning the edited file, fall back to first 20 lines
  filtered=$(printf '%s' "$output" | grep -F "$(basename "$file")" | head -20)
  if [ -z "$filtered" ]; then
    filtered=$(printf '%s' "$output" | head -20)
  fi
  printf '⚠️  tsc warnings after editing %s:\n%s\n' "$file" "$filtered" >&2
fi

exit 0
