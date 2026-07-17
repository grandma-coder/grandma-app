---
name: gcc-pr
description: Use to open a PR from a feature branch. Validates branch shape (<type>/<slug>), runs pre-flight lint/typecheck, scans for restricted-area changes, assembles PR body with stack components + critical-only post-merge note, assigns the configured reviewers (), then asks before kicking off the external review cycle. Triggered by /gcc-pr or "open a PR" intent. Branches only — never worktrees.
---

# gcc-pr

Run these steps in order. Halt and surface errors at any failing step. Resume on rerun.

> **Recommended model:** `haiku` — PR assembly is mechanical (branch validation, body
> templating, reviewer assignment). When the orchestrator runs this as a subagent it dispatches
> at `haiku`; run in-session it inherits the session model.

**Universal rule:** every state-mutating step (branch ops, PR create, posting comments, invoking another command) follows the Ask → Confirm → Execute handshake: propose the action, wait for explicit confirmation, then execute. Inspection commands (`git status`, `gh pr view`) do not.

**Branches only.** Never `git worktree add`. Use `git checkout -b`, `git switch`, `git branch -m` exclusively.

## Step 1 — Branch validation

Run: `git branch --show-current`

The branch name must match the shape `<type>/<slug>` where the type prefix is any prefix the team uses (chore, bug, feature, hotfix, refactor, etc.) — no whitelist; only the shape matters.

- On `main` or `main`: do not reject blindly. Recover for the user:
  1. Ask: "You're on `<main|main>`. Give me a short slug describing this work (e.g. `fix-login-redirect`) and I'll create a branch."
  2. Ask before creating: "Run `git checkout -b <type>/<slug>` now?" (default `<type>` = `feature`, or the closest match: a bugfix → `bug`, a chore → `chore`, etc.). On confirmation create the branch with `git checkout -b`, never `git worktree`. There is no ticket system, so no ticket transition happens.
  3. Once the new branch exists with no pending changes carried over from `main`/`main` (warn and stash if there are uncommitted edits — ask before stashing), continue to Step 2.

- Branch shape mismatch (e.g., `wip-changes`): same recovery — ask for a short slug, then ask "Rename via `git branch -m <type>/<slug>`?". On confirmation rename. If they have local commits on the misnamed branch, the rename preserves them.

## Step 2 — Base validation

PR base is **always `main`**. Never offer `main` from this flow.

## Step 3 — Pre-flight checks

Detect which paths the diff touches:

```bash
git diff --name-only origin/main...HEAD
```

Run the project pre-flight:

```bash
pnpm lint
pnpm typecheck
pnpm build

```

On failure: halt PR-create, surface the errors, return user to fixing. User reruns `/gcc-pr` after fixing.

**Escape hatch:** if `/gcc-pr --draft` was invoked, open a draft PR even with failures (for WIP / early-feedback PRs).

## Step 4 — Restricted-area scan

Compare changed paths from step 3 against the project's sensitive paths (`restricted_areas`):

- migrations/** (center-owned SQL + cc_* RPCs)
- server/trpc.ts (auth/role gates) + server/context.ts
- middleware.ts (Clerk gate)
- lib/expo/** (push send/prefs/token logic)
- lib/audit.ts + admin_audit_log
- .env.* files
- .github/workflows/**
- db/** (schema + privileged client)

Restricted-area hits are surfaced to reviewers (Step 6) regardless of role — that is the real safety net.



## Step 4b — Requirement verification (advisory)

Run the `gcc-verify` skill against the branch to check the ticket's requirements
are actually met. Scope `origin/main..HEAD`, all steps.

- This is **advisory** — it never halts the PR (consistent with the gate's never-block philosophy).
- Surface the summary line and any FAIL/ERROR/SKIPPED items in the PR's "Test plan" section so reviewers see unmet AC.
- SKIPPED stack-dependent checks are expected when the stack is down; note them so a reviewer can run them manually.

If the ticket's plan has no `verify` block, note "no verify block — requirement verification skipped" and continue. Do not block on its absence.

## Step 4c — Run evidence (orchestrated branches)

If this branch came from an orchestration run, its evidence trail should reach the PR
reviewer — that is what makes the PR trustworthy at a glance instead of a wall of diff.
Check for a run directory: `ls -d docs/plans/orchestration-*<slug>* 2>/dev/null`
(most-recent match wins). When one exists with a `ledger.jsonl`:

1. **Validate first — this is a PR gate, not advisory.** Run
   `node .claude/skills/gcc-orchestrate/ledger.mjs validate <RUN_DIR>/ledger.jsonl --closed`.
   On any ERROR: **halt PR-create** (same treatment as a pre-flight failure), surface the
   validator output, and return the user to closing/repairing the ledger — an orchestrated
   PR whose evidence trail doesn't validate must not present that trail to reviewers.
2. Then extract the numbers:

```bash
node .claude/skills/gcc-orchestrate/ledger.mjs stats <RUN_DIR>/ledger.jsonl
```

and fill the PR body's **Run evidence** section from the JSON (units done/total, verify
checks, review findings fixed vs waived, reviewer-comment real vs false-positive counts,
run-dir path). If no run dir exists (hand-written branch), omit the section entirely —
never fabricate evidence.

## Step 5 — PR body assembly

Build the body and write it to a temp file (cross-platform — avoids bash heredoc / PowerShell here-string / cmd quoting differences).

Bash / zsh:
```bash
TMPBODY=$(mktemp)
```

PowerShell:
```powershell
$TMPBODY = New-TemporaryFile
```

Body template (Markdown — GitHub renders this):

```markdown
## Summary

<concise summary of what changed and why>

## Stack components touched

<auto-detected list — e.g., "engine API routes, supabase migrations, mobile gen-card">

## Test plan

- [ ] <verification step 1>
- [ ] <verification step 2>

## Run evidence

<only if an orchestration RUN_DIR exists (Step 4c); omit otherwise. Example:>
Orchestrated run — ledger-backed evidence in `<RUN_DIR>`:
- Units: <done>/<total> done, gates green (implement → verify → review per unit)
- Verify: <n> acceptance checks passed (per-AC evidence in `ledger.jsonl`)
- Review: <n> findings fixed, <n> waived-with-rationale (reports in `<RUN_DIR>/reports/`)
- Prior review rounds: <n> comments verified real → fixed, <n> false positives rejected with rationale

## Screenshots

<only if mobile files changed; remove section otherwise>

## Migration notes

<only if supabase/migrations/** changed; describe forward + rollback>

## Post-merge

This PR merges into `main`; verify there before promoting.
```

Sections that don't apply (Run evidence, Screenshots, Migration notes) are omitted.

Post-merge handling lives in step 11.

## Step 6 — Reviewer assignment

Assign the reviewer(s): `--reviewer ` ().

## Step 7 — Open PR

Ask before creating: "Ready to open the PR via `gh pr create --base main`?"

On confirmation:

```bash
gh pr create \
  --base main \
  --title "<type>: <slug> <one-line summary>" \
  --body-file <temp-body-file>
```

Add `--draft` if `/gcc-pr --draft` was invoked.

After creation, attach reviewers:

```bash
gh pr edit <PR_NUMBER> --add-reviewer <comma-separated-handles>
```

(`gh pr create` does not always reliably add reviewers in one call across versions; doing it as a separate `gh pr edit` step is safer.)

Cache the PR number for downstream steps (external review, post-merge).

## Step 8 — Ticket transition prompt (Ask → Confirm → Execute)

**No ticket system** — skip transitions; nothing to do here (kept for step-numbering parity).

## Step 9 — External review cycle

After printing the PR URL, state explicitly:

> Awaiting review from human on PR #<n>.

Do not poll silently. When the user signals review is in (or asks you to pull comments), apply Ask → Confirm → Execute:

> Would you like me to execute `/pull-pr-comments` now against PR #<n>?

On confirmation, invoke `/pull-pr-comments` with the cached PR number. The user can also run it themselves — that's fine.

## Step 10 — Output

Print the PR URL and the cached state:

```text
PR opened: https://github.com/<owner>/<repo>/pull/<n>
Stored PR ref: <n>
Awaiting external review.
```

Also list the assigned reviewers and remind: "Wait for at least one approval before merging."

## Step 11 — Post-merge (critical-only)

**No ticket system** — no post-merge ticket comment; nothing to do (kept for parity).
