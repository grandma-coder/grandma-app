#!/bin/sh
# PostToolUse hook: validate any ledger.jsonl the agent just wrote.
# Wire-up snippet lives in this skill's SKILL.md ("Mechanical enforcement").
# Exit 2 feeds the validator's findings straight back to the driver — schema
# drift is corrected at the write that introduced it, not at the postmortem.
input=$(cat)
path=$(printf '%s' "$input" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);process.stdout.write(j.tool_input?.file_path||"")}catch{}})')
case "$path" in
  */ledger.jsonl)
    out=$(node "$(dirname "$0")/../ledger.mjs" validate "$path" 2>&1)
    if [ $? -ne 0 ]; then
      echo "LEDGER SCHEMA VIOLATION — fix the entry you just wrote before continuing:" >&2
      echo "$out" >&2
      exit 2
    fi
    ;;
esac
exit 0
