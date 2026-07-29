---
title: "Orchestrator ledger append scripts wrote to themselves via process.argv[1]"
date: 2026-07-29
category: workflow-issues
track: bug
problem_type: workflow_issue
component: "grandma-orchestrate / ledger tooling"
resolution_type: code-fix
symptoms: "A run's ledger.jsonl froze at 18 lines even though gates U2–U10 all executed and committed; the missing gate/progress JSON lines turned up appended to the bottom of the append-*.mjs / close-run.mjs scripts instead of the ledger."
tags: [orchestrator, ledger, node, process-argv, scripting, data-loss, recovery, off-by-one]
related: [../database-issues/behavior-first-onboarding-profile-upsert.md]
---

## Problem

During the menopause E1 orchestration run, the append/close helper scripts
(`append-*.mjs`, `close-run.mjs`) never actually wrote to `ledger.jsonl`. Every gate and
progress line they emitted was appended to **the script file itself**. Combined with a
concurrent session's `git clean`, the working-tree `ledger.jsonl` reverted to and stayed at an
early 18-line state, losing the U2–U10 gate entries, the wave progress checkpoints, the final
review, and the terminal close.

## Symptoms

- `wc -l ledger.jsonl` stuck at 18 despite all 10 units completing and committing.
- Reading `append-u10.mjs` showed raw ledger JSON lines appended after its own source code.
- `ledger.mjs validate --closed` → `ERROR L18 not-closed: no terminal progress entry`.

## Root Cause

The scripts resolved the ledger path from the wrong `argv` index:

```js
const P = process.argv[1]   // ❌ this is the SCRIPT path, not the argument
```

When you run `node append-u10.mjs path/to/ledger.jsonl`:
- `process.argv[0]` = the node binary
- `process.argv[1]` = the **script** path (`append-u10.mjs`)
- `process.argv[2]` = the first **argument** (`path/to/ledger.jsonl`)

So `appendFileSync(process.argv[1], line)` appended each ledger line to the running script,
never to the ledger.

## Solution

Read the argument from `argv[2]`, and guard against a missing path so the failure is loud
instead of silently writing to the wrong file:

```js
const P = process.argv[2]   // ✅ the ledger path argument
if (!P) { console.error('usage: node <script>.mjs <ledger.jsonl>'); process.exit(1) }
```

### Recovering the corrupted ledger

The gate results were not truly lost — they were recorded in the committed per-unit review
reports under the run's `reports/` directory and in the git history (commit SHAs per unit). The
ledger was rebuilt deterministically:

1. Keep the surviving valid prefix (`readFileSync`, `JSON.parse` each line, drop the
   unparseable ones).
2. Re-emit the missing gate/progress entries from the committed `reports/review-U*.md` files
   (SHAs, results, findings, fix commits).
3. Append the terminal `progress` entry with `status:"complete"` last.
4. `node .claude/skills/grandma-orchestrate/ledger.mjs validate <ledger> --closed` → 0 errors.

Reconstructed entries were stamped `ts:"reconstructed"` so the audit trail is honest about
which lines are approximate.

## Why This Works

`argv[2]` is the first real argument under Node's convention, so `writeFileSync`/`appendFileSync`
now target the ledger. The `if (!P)` guard converts a silent mis-target into an immediate,
visible usage error. Sourcing the rebuild from committed reports (not memory) keeps the
reconstruction verifiable.

## Prevention

- **Node CLI scripts read positional args from `process.argv[2]+`, never `argv[1]`.** Prefer
  destructuring with a name: `const [, , ledgerPath] = process.argv`.
- Every script that writes to a path taken from args must **guard the arg** (`if (!path) exit(1)`)
  so a missing/mis-indexed arg fails loudly.
- When running concurrent sessions on `main`, ledger/run artifacts are vulnerable to another
  session's `git clean`/checkout. Commit run artifacts by explicit path promptly, and validate
  the ledger (`ledger.mjs validate`) after each checkpoint rather than only at close, so churn
  is caught at the checkpoint that introduced it.
- Treat the committed `reports/` directory as the durable source of truth for gate outcomes;
  the ledger is reconstructable from it.
