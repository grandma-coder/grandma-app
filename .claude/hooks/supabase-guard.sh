#!/usr/bin/env bash
# PreToolUse hook — blocks destructive Supabase commands unless an explicit
# override token `--i-know-what-im-doing` appears in the command.
# Exit 2 = block the tool call. Exit 0 = allow.

set -u

payload=$(cat)

# Extract the bash command from the tool payload
command=$(printf '%s' "$payload" | /usr/bin/python3 -c 'import json,sys
try:
  d=json.load(sys.stdin)
  print(d.get("tool_input",{}).get("command",""))
except Exception:
  pass' 2>/dev/null)

[ -z "$command" ] && exit 0

# Patterns considered destructive
patterns=(
  "supabase db reset"
  "supabase db push --linked"
  "supabase db push --db-url"
  "supabase functions delete"
  "supabase migration repair"
  "DROP TABLE"
  "DROP SCHEMA"
  "TRUNCATE "
)

matched=""
for p in "${patterns[@]}"; do
  case "$command" in
    *"$p"*) matched="$p"; break ;;
  esac
done

[ -z "$matched" ] && exit 0

# Allow if explicit override token present
case "$command" in
  *--i-know-what-im-doing*) exit 0 ;;
esac

cat >&2 <<EOF
🛑 Blocked destructive Supabase command: "$matched"

Command: $command

This hook blocks operations that can wipe data or break the remote DB.
If you really mean to run it, append --i-know-what-im-doing to the command,
or ask the user to confirm and re-run with that flag.
EOF

exit 2
