---
name: gcc-orchestrate
description: Use to turn a plan, requirements doc, or prior CE session into a committed orchestration playbook, then drive implementation wave-by-wave through the project's gates — /ce-work to implement, /gcc-verify for acceptance criteria, /gcc-review for safety, per unit — ending at a /gcc-pr handoff. Asks branch vs worktree, sequential vs parallel, and per-wave vs fully-autonomous. Resumable, with an append-only execution ledger. Invoke via /gcc-orchestrate [plan/requirements/session path or <slug>].
---

# gcc-orchestrate

> **Version 2.4** (2026-07-08). Quality loop: per-repo pattern library (`patterns.mjs`,
> read by implement + review gates, written only by the learn gate), transcript-real
> gate cost (`ledger.mjs cost`), shadow probes (model A/B, `shadow: true` entries),
> PR-boundary outcomes join. Plus v2.3's simplify gate, doctor preflight (STOP on
> missing prerequisites), `hooks/ledger-guard.sh`, canonical JSON ledger schema
> enforced by `ledger.mjs` (validate / render / stats — ships in this skill's directory),
> per-gate model selection, project-scoped publish target. Version history: the
> orchestrator-builder template CHANGELOG — not carried here.

Turn a plan into an executed, gated branch. The orchestrator (this driving
session) owns sequencing, branch/worktree state, and the quality gates. Each
implementation **unit** is handed to `/ce-work`; after every unit the
orchestrator runs `/gcc-verify` and `/gcc-review` before moving on. State
lives in a committed **playbook artifact** plus an **execution ledger** so a run
is resumable AND auditable.

## When to run

| Situation | What this does |
|-----------|----------------|
| You have a plan/requirements/session and want it implemented end-to-end | Builds the playbook, executes all waves, hands off to `/gcc-pr`, publishes the run |
| A prior orchestration run was interrupted | Reads the existing playbook, skips `done` units, resumes |
| You only want the plan-of-record without executing | Run Phase 0–1, then stop at the dry-run confirm |

## Phase 0 — Resolve & normalize input

0. **Doctor preflight (STOP gate).** Run (standalone equivalent: `/gcc-doctor`):

   ```bash
   node .claude/skills/gcc-orchestrate/doctor.mjs
   ```

   Any **critical ✗** → **STOP.** Report exactly which prerequisites are missing and how
   to install them (plugin, skill, CLI, `gh auth login`); do not proceed and do not
   improvise a substitute — an inline "review" standing in for a missing review skill is
   a gate violation, not a fallback. `!` advisory items: note them and continue. `○ manual`
   items (publish MCP reachability): confirm in-session before Phase 3. Record the result
   as `"doctor":"pass"` in the run-header (step 6b).

1. **Resolve the source** from `$ARGUMENTS`:
   - A path → use it directly.
   - A slug → match the plan by filename/slug under `docs/plans/` and `docs/superpowers/plans/`.
   - Blank → auto-detect the most recent plan/brainstorm/spec under `docs/plans/`, `docs/brainstorms/`, `docs/superpowers/specs/`, and offer recent CE sessions (`/ce-sessions`). Present candidates and let the user pick.

2. **Classify the source:**
   - **Already a unit-decomposed plan** (has U-IDs / `### Task`/`### Unit` blocks) → ready for Phase 1.
   - **Requirements / brainstorm / spec / session** (no units) → **ASK** the user: *"This isn't a unit-decomposed plan yet. Run `/ce-plan` to decompose it into units (or `/ce-brainstorm` first if it's still too raw)?"* Never auto-run these — always ask, then on approval invoke the chosen skill and use its output as the plan.

3. **Resolve the work.** Derive the work identifier from a slug in the plan filename or the current branch name; there is no ticket system, so acceptance criteria come from the plan's requirements / verify blocks.

4. **Collision check.** Run `/gcc-collision <slug>`. If a teammate owns the work (assignee / open or draft PR / remote branch), surface it and **confirm** before continuing — do not start silently.

## Phase 1 — Build the playbook

1. **Parse units** from the plan. For each unit capture: id, goal, files
   (create / modify / test), declared dependencies, and the verify-block / AC
   mapping (which `### verify` block or acceptance criterion it closes).

2. **Build the dependency graph** = declared deps **plus file-overlap edges**.
   Any two units that create/modify a shared file get an implicit edge and must
   serialize relative to each other. When file ownership is ambiguous, assign the
   shared file to one unit and have the other reference it, or serialize the two.

3. **Compute waves** by topological layering of the graph. Units in the same wave
   have no dependency between them; within a wave, only units with **disjoint file
   sets** are parallel-eligible.

4. **Ask execution, isolation, and autonomy** (three questions):
   - **Execution:** sequential or parallel.
   - **Isolation:** branch (project default) or worktree.
   - **Autonomy:** per-wave checkpoints (project default) or fully-autonomous.
     Per-wave → pause for confirmation after every wave. Fully-autonomous → run
     all waves straight through to the `/gcc-pr` handoff with no per-wave pauses;
     gate failures are handled per the coupling below instead of pausing.
   - **Safety coupling — parallel ⇒ recommend worktree.** Parallel + branch is
     only safe for file-disjoint units on the shared tree, so if the user picks
     parallel + branch, restrict in-wave parallelism to disjoint-file units and
     warn. Sequential + branch is the clean default.
   - **Effect on a wave:** sequential → units run one at a time in dependency
     order; parallel → file-disjoint units in a wave run concurrently
     (worktree-isolated, then merged into the integration branch).

5. **Create the branch** from latest `main` (if not already on it):
   `git switch main && git pull && git switch -c <type>/<slug>`. In worktree
   mode, the integration branch is created here and per-unit worktrees branch off
   it at dispatch time.

6. **Create the per-run artifact directory, then write and commit the playbook.** Every
   artifact of one run lives in ONE directory — never scattered flat into `docs/plans/`
   (which mixes them with every other plan/brainstorm/review and lets each gate
   sub-skill's native filename convention leak through inconsistently). Resolve
   `RUN_DIR = docs/plans/orchestration-<slug>-<date>/` once and use it for every path
   below; `mkdir -p RUN_DIR/reports RUN_DIR/evidence` up front:

   ```text
   docs/plans/orchestration-<slug>-<date>/
     playbook.md                # the playbook (template below)
     ledger.jsonl               # the ledger — machine-auditable + resume authority (playbook.md is the human view)
     reports/                   # EVERY gate report — orchestrator-named, uniform
       review-U<n>.md   …   review-final.md
     evidence/                  # raw gate output over the granularity cap
   ```

   Write the playbook to `RUN_DIR/playbook.md` using the template below.

6b. **Seed the execution ledger** inside `RUN_DIR`: `RUN_DIR/ledger.jsonl` (one JSON object per
   event, machine-auditable — the sole ledger; the playbook's Unit status table is the human view). Write the
   **run-header v2** as the first jsonl line — ticket, branch, source_plan, `run_dir`
   (so resume and every consumer find the artifacts), execution / isolation / autonomy
   mode, model id, session id, start timestamp, AND the run denominator: `total_units`,
   the ordered `units` roster
   (e.g. `["U1","U2",...]`), and the computed `waves` array
   (`[{"wave":1,"units":["U1"]},...]`). `total_units` MUST equal `units.length` and the
   union of all `waves[].units`. Then emit one **`unit-plan`** entry per unit:
   `{"type":"unit-plan","unit":"U1","goal":...,"deps":[...],"planned_files":[...],"ac":[...]}`
   — `planned_files` from the unit's plan `files` block (the baseline for files-drift),
   `ac` from the AC / verify-block mapping captured in step 1. The playbook is the
   summary; the ledger is the **evidence trail + resume state** every gate appends to.
   Commit it with the playbook. (Canonical schema: the ledger schema section below,
   enforced by this skill's `ledger.mjs`.)

7. **Dry-run confirm.** Show the wave plan and the chosen execution / isolation /
   autonomy modes. Get explicit confirmation before executing Phase 2.

### Playbook artifact template

```markdown
---
title: Orchestration playbook — <plan title>
ticket: <slug>
source_plan: <path to the plan being executed>
execution: sequential | parallel
isolation: branch | worktree
autonomy: per-wave | autonomous
branch: <type>/<slug>
date: <YYYY-MM-DD>
status: active
---

## Dependency graph
<mermaid flowchart of unit deps, including file-overlap edges>

## Wave plan
| Wave | Units | Parallelism | File-set notes |
|------|-------|-------------|----------------|
| 1 | ... | parallel-safe / serialize | <why> |

## Unit status
| Unit | Goal | Status | Commit | Verify | Review |
|------|------|--------|--------|--------|--------|
| U1 | ... | pending | — | — | — |

## Notes
- Gate-failure pauses (per-wave) / failed + blocked units (autonomous) recorded here.
```

### Execution ledger schema (canonical — enforced by `ledger.mjs`)

**Every line is one JSON object.** The entry `type` enum is CLOSED — exactly these nine:
`run-header` · `unit-plan` · `gate` · `progress` · `decision` · `side-effect-check` ·
`reviewer-comment` · `publish` · `learn`. Never invent a type (no `"type":"ce-work"`,
no `"type":"gemini-review"` — field runs that did this broke every downstream consumer).
A gate entry's `gate` field is the ROLE (`implement` | `verify` | `review` | `test` |
`pr` | `collision` | `other`), never a skill name — the exact skill lives in `invocation`.

One **gate** entry per gate invocation (`/ce-work`, `/gcc-verify`, `/gcc-review`, standalone test). Shape:

```json
{"type":"gate","unit":"U2","gate":"verify","invocation":"/gcc-verify <slug> --step 2",
 "commit":"<sha the gate ran against>","result":"pass|fail|advisory|waived|skipped",
 "ts":"<ISO>","timing":{"started_at":"<ISO>","ended_at":"<ISO>","duration_ms":0},
 "checks":[{"ac":"<ac-id / verify-block>","kind":"deterministic-assert|llm-judge","verdict":"pass","evidence":"<test name + count / query result / file:line>"}],
 "report":"<RUN_DIR>/reports/review-U2.md",
 "files":{"attempts":1,"files_actual":["<paths from git show --stat>"],"files_drift":["+unplanned","-untouched"]},
 "raw":"<inline if ≤40 lines / ~3KB, else: see evidence/<unit>-<gate>.txt>",
 "provenance":{"model":"<id>","session":"<id>"},
 "usage":{"tokens_in":0,"tokens_out":0,"cost_usd":0,"basis":"real|floor"}}
```

Per-role field rules (validator-enforced): `report` REQUIRED for review gates (a review
with no report file under `RUN_DIR/reports/` did not happen — omit `report` for every
other role); `checks[]` REQUIRED for verify and review gates — both waived when
`result:"skipped"` (a skipped gate's evidence is the skip reason in `raw:`); `files` for implement gates
(drift = set-diff vs `unit-plan.planned_files`). Review `checks[]` items use
`{"finding":…,"severity":…,"verdict":"real|false-positive","action":"fixed in <sha> | rejected: <why>"}`.
Stamp `timing` with real timestamps (`date -u +%FT%TZ` before/after the gate).

**`progress` checkpoint entry** (emitted at each unit-done + wave boundary; the final one is terminal): `{"type":"progress","ts":"<ISO>","wave":1,"next":"<unit|null>","done":[],"failed":[],"blocked":[],"pending":[]}`. The four lists partition the full roster — `done ∪ failed ∪ blocked ∪ pending == units`. The **terminal** progress entry (ledger's last line) adds `"status":"complete"|"failed"|"aborted"`, `"end":"<ISO>"`, `"run_duration_ms":<end − header.start>`.

**Validate mechanically, don't trust discipline.** After appending each `progress`
checkpoint, run:

```bash
node .claude/skills/gcc-orchestrate/ledger.mjs validate RUN_DIR/ledger.jsonl
```

Fix any ERROR before continuing (WARNs are advisory — note them). At run close (Phase 3
step 5c) run it with `--closed`, which additionally asserts the terminal entry exists and
is the last line. Render the playbook's Unit-status table with
`node …/ledger.mjs render RUN_DIR/ledger.jsonl` — never hand-maintain the table.

Granularity cap: inline raw output up to ~40 lines / ~3KB; larger output is saved in full to `RUN_DIR/evidence/<unit>-<gate>.txt` and linked — never dropped, just relocated. For `/gcc-verify`, the `checks:` list MUST break down every AC / verify-block covered — never collapse a verify run to a single line; verify has NO report file, its `checks:` list is the durable record.

**Mechanical enforcement (recommended, one-time setup).** `hooks/ledger-guard.sh` in this
skill's directory validates `ledger.jsonl` on every Write/Edit and feeds violations straight
back to the driver — schema drift gets corrected at the write that introduced it. Wire it
once in the repo's `.claude/settings.json`:

```json
{"hooks": {"PostToolUse": [{"matcher": "Write|Edit",
  "hooks": [{"type": "command", "command": ".claude/skills/gcc-orchestrate/hooks/ledger-guard.sh"}]}]}}
```

The hook is a backstop, not a replacement — the checkpoint `validate` runs above remain
mandatory (the hook only sees writes made through the harness's file tools).

**Cost tracking (estimate).** Each gate entry records a `usage:` line. The
orchestrator is a live session and the Agent tool does not return a subagent's token usage, so
capture it best-source-first: **(1) real** — after a subagent gate, read the subagent transcript
`agent-<id>.jsonl` in the transcript dir and use its `usage` (input/output tokens) if present;
**(2) floor estimate** — otherwise `in ≈ chars(dispatch prompt + evidence sent)/4`,
`out ≈ chars(returned text + saved report + diff)/4`. The estimate undercounts the subagent's own
file reads and thinking, so it is a floor, never an upper bound — label it `basis: floor`. Cost =
`in/1e6·price_in + out/1e6·price_out` at the gate's model, from the `pricing` table
(`5`/`25` opus, `3`/`15` sonnet,
`1`/`5` haiku, `10`/`50` fable $/MTok).
Gates that run in-session (not as a subagent) inherit the session model — record its usage the
same way if the harness exposes it, else omit the line and note `usage: n/a (in-session)`.

## Phase 2 — Execution loop

For each wave, in dependency order. For each unit in the wave (serial in branch
mode / concurrent for disjoint units in parallel + worktree mode):

1. **Implement.** Dispatch `/ce-work` scoped to a **single unit** using the
   dispatch prompt template below, on the Agent tool with `model: opus`
   (the configured implement model). The branch already exists — the agent does not
   branch or open a PR.
   Before dispatching, run
   `node .claude/skills/gcc-orchestrate/patterns.mjs match docs/plans/orchestration-patterns.md <unit's planned files>`
   and paste any output into the dispatch prompt's "Known failure patterns" block —
   these are this repo's recurring, evidence-backed failure modes; the implementer
   avoids them up front instead of a reviewer catching them again. Empty output =
   omit the block. Never paste the whole patterns file — only the matched subset.

2. **Verify.** Run `/gcc-verify <slug> --step <N>` over the unit's changes
   (dispatched on the Agent tool so its judges run at `model: haiku`).
   Confirm each plan Test scenario / acceptance criterion the unit owns is satisfied. **Verify
   evidence lives in the ledger, not as a file** — fold every AC/verify-block verdict into the
   ledger entry's `checks:` list (deterministic vs judge + cited evidence + per-check verdict).
   No verify artifact file is produced. A failed acceptance criterion
   is a **gate failure** — handle it per the Gate-failure handling below (pause in
   per-wave mode; retry-then-record in fully-autonomous mode).

3. **Review.** **Run the `gcc-review` skill via a subagent dispatched on the
   Agent tool with `model: sonnet`** (the subagent invokes `gcc-review`
   over the unit's commits and returns its saved report path). This is a MANDATORY skill
   invocation, not a substitute — dispatching it as a subagent is what lets the review run on
   its own configured model. Do NOT "review inline" by reading the diff and reasoning in the
   orchestrator: that skips the skill's saved report, its Context7 library-currency checks, and
   its structured aspect coverage — the exact shortcut that lets real defects (import cycles,
   un-threaded values, cross-unit integration gaps) slip through. The skill
   auto-saves a report keyed on branch+date (so repeated invocations APPEND to one
   file); **move/rename it to `RUN_DIR/reports/review-U<n>.md`** so each unit's review
   is a discrete, uniformly-named artifact in the run dir, and cite that path in the
   ledger (step 5). Use the project's `gcc-review` skill — NOT `ce-code-review`.
   Then fix P0/P1 findings (dispatch a fix pass or fix inline) and re-verify if the
   fix changed behavior. Verify each finding against the code before acting
   (reviewer false positives are common).
   Hand the review subagent the same matched-patterns list as an explicit
   checklist: it checks the known failure modes FIRST, then does general review.
   Record each pattern check in the gate entry's `checks:` list as
   `{"pattern":"P-<n>","verdict":"clean|hit","action":"…"}` — a `hit` on an active
   pattern is a finding like any other; the learn gate uses these to update
   pattern evidence at close.

4. **Commit.** One logical commit per unit, scoped to its files with explicit
   `git add <paths>` (never `git add -A`), conventional message referencing
   <slug>. In worktree mode, merge the unit branch into the integration branch
   here; on conflict, pause and let the user resolve.

5. **Record (ledger first, then playbook).** Append an execution-ledger entry
   after EACH gate above (steps 1–4) — not just at the end — capturing the exact
   invocation, commit, result, per-check evidence, and raw output (honor the
   granularity cap; `/gcc-verify` entries break down every AC/verify-block).
   Every gate entry carries a `timing:` line (`started_at`/`ended_at`/`duration_ms`) — the orchestrator is
   a live session (not the workflow sandbox), so stamp real timestamps with
   `date -u +%FT%TZ` immediately before and after each gate.
   Price each gate from the session transcript, not char/4: run
   `node .claude/skills/gcc-orchestrate/ledger.mjs cost <transcript.jsonl> --since <started_at> --until <ended_at>`
   (transcript = the newest `~/.claude/projects/<project-slug>/*.jsonl` for this repo;
   a subagent-dispatched gate has its own transcript file — prefer it when identifiable)
   and embed the printed JSON as the gate entry's `usage:`. If no transcript is found,
   fall back to the char/4 estimate with `basis:"floor"` — never silently mix bases;
   the JSON's `basis` field already says which it is.
   The `/ce-work` entry adds
   `attempts` (1, or up to 3 under the autonomous fix loop), `files_actual` (from
   `git show --stat`/`git diff --name-only` of the unit commit), and `files_drift`
   (set-diff vs the unit's `unit-plan` `planned_files`: `+path` touched-but-unplanned,
   `-path` planned-but-untouched; empty = no drift; drift is a signal to read, not a
   gate — test files are expected drift). After the unit reaches a terminal state
   (`done`/`failed`/`blocked`) AND at each wave boundary, append a `progress` checkpoint
   entry partitioning the full roster (`done`/`failed`/`blocked`/`pending` + `next` +
   `wave`) (when a wave's final unit-done and the wave boundary coincide, emit one checkpoint, not two),
   then run `ledger.mjs validate` (see the schema section) and fix any ERROR before
   continuing. A ledger entry is required even when a gate is advisory, clean, or skipped
   (record the reason); field rules per role (review `report:`, verify `checks:`) are in
   the schema section and validator-enforced. THEN regenerate the playbook's Unit status
   table via `ledger.mjs render RUN_DIR/ledger.jsonl` — never hand-edit it, never a bare ✅.
   "It does not say to write a separate log" is not an out: the ledger is a required
   artifact, not gold-plating.

**After each wave: checkpoint (per-wave mode only).** In per-wave mode, present a
wave summary (verify + review results per unit) and ask to proceed to the next
wave. In fully-autonomous mode, write the wave summary to the ledger and continue
without pausing.

**Gate-failure handling — couples to the autonomy mode.** A gate failure is a
failed acceptance criterion in `/gcc-verify` or an unresolved P0/P1 from `/gcc-review`.
- **Per-wave mode:** **pause** the run and surface the issue — never silently
  continue (loop back to `/ce-work` with the gap, or wait for the human).
- **Fully-autonomous mode:** on the first failing gate, retry with up to **2
  additional** `/ce-work` fix-passes (so 3 implementation attempts total). If still
  failing, append a `decision` ledger entry (claim + evidence + rationale), mark
  the unit **failed** in the playbook, **skip its dependents** (mark them
  `blocked` — never build on a failed base), and continue with the remaining
  independent units. Surface every failed/blocked unit in the end-of-run report
  so it can be revisited. Autonomy speeds the run; it never lowers the bar — a
  failed gate is recorded as failed, never silently passed.

**Side-effect verification.** Any step that mutates an external system and
*reports* success — PR create, MCP write, any tool that
returns `applied`/`ok`/`success` — MUST be followed by a **read-back** that
confirms the effect actually landed (e.g. re-fetch the PR,
re-query the target store to confirm the doc exists),
recorded as a `side-effect-check` ledger entry. "The tool returned success" is a
claim to verify, not proof — treating it as done is a defect. (Motivating failure:
an MCP write returned `applied` but created nothing; a read-back
would have caught it.) "It's a side-channel, not a gated step" and "a verify
round-trip isn't warranted right now" are not outs.

**Shadow probes (model A/B on request).** When invoked with a probe request
(`probe: {gate: <role>, model: <alias>}` — from the user or from an
`analyze.mjs` downgrade recommendation), run the probed gate TWICE per unit: the
incumbent (configured model) first — its result is authoritative and drives all
decisions — then the candidate on the Agent tool at the probe model. Ledger the
candidate as a normal gate entry plus `shadow: true` and
`provenance: {model: <candidate>}` (validator-enforced); its report saves as
`reports/<role>-U<n>-shadow.md`. A shadow result never gates, never blocks, and a
shadow failure/timeout is recorded (`result: skipped`, reason in `raw:`) without
affecting the run. Comparison happens offline: `analyze.mjs probes` pairs shadow
vs incumbent and recommends promote/keep after ≥3 clean probes — the human flips
the config; the orchestrator never self-promotes a model.

### Dispatch prompt template (per unit)

> You are implementing unit **U\<N\>** of the <slug> plan. The branch
> `<type>/<slug>` already exists — work on it, do not branch or open a
> PR. Run `/ce-work` scoped to U\<N\> only.
>
> This unit runs on model **opus** (the orchestrator sets this on the
> Agent dispatch; you do not need to change it).
>
> Unit spec: \<paste U\<N\> Goal / Requirements / Dependencies / Files / Approach
> / Patterns to follow / Test scenarios / Verification from the plan\>.
>
> Honor these decisions: \<paste the relevant Key Technical Decisions from the
> plan\>.
>
> Known failure patterns for the files you touch (repo history — do not repeat these):
> \<matched patterns.mjs output, one line each; omit this block when empty\>
>
> Write the test scenarios named in the unit. Stage only the files this unit
> touches. Report the commit and which requirements/acceptance criteria it closes.
> Do not run /gcc-pr — the orchestrator owns those.

## Phase 3 — Final integration & handoff

1. **Full verify:** `/gcc-verify <slug>` over the whole branch — confirm every
   unit's AC is green in aggregate. Record the result in the `FINAL · gcc-verify`
   ledger entry's `checks:` breakdown (no separate file for this — verify evidence is
   ledger-only).
2. **Final review:** **run the `gcc-review` skill via a subagent on the Agent
   tool with `model: sonnet`** — never inline reasoning. **Scope it to what
   per-unit reviews could NOT see:** cross-unit seams (interfaces between units' files),
   merge-conflict resolutions, and files touched by more than one unit — pass that scope in
   the dispatch prompt rather than re-reviewing every already-reviewed diff hunk (per-unit
   passes covered those; re-reading the full branch duplicates spend without new coverage).
   Relocate its report to `RUN_DIR/reports/review-final.md` and cite the path in the
   `FINAL` review gate entry. Resolve P0/P1 findings before handoff. This final pass is
   required even when every per-unit review was clean.
3. **Optional proof:** if the plan defines a build/test/e2e proof, run it now.
4. **Overview + manual test:** recap the diff; for an engineer,
   run the stack and sanity-check a flow.
5. **Hand off to `/gcc-pr`** — never auto-open the PR. In worktree mode, first
   confirm every unit branch is merged into the **integration branch** and remove
   the per-unit worktrees; `/gcc-pr` runs against that integration branch (it is
   branch-only and rejects worktrees). The PR sub-skill owns branch validation,
   pre-flight lint/typecheck, restricted-area scan, reviewer assignment per role.

5b. **External review cycle — record it.** After `/gcc-pr` opens the
   PR, wait for each registered reviewer. Each reviewer is an **independent outside view** —
   they surface genuine insights AND false positives, both high-signal. For EACH comment from
   ANY reviewer below, append a `reviewer-comment` ledger entry: the reviewer id + file:line +
   claim + severity; your verdict (`real` | `false-positive`) **verified against the code
   first** (a misread of `createServerClient`/RLS or a hoisted local is a classic
   false positive); the action (`fixed in <sha>` | `rejected: <rationale>`); and the reply
   posted (always @-mention the reviewer).
   
   - **human** (human, via pr-comments+threads) — for a `human` reviewer, NEVER
     auto-resolve a thread without confirmation; for a bot, resolve once addressed.
   
   A blanket "addressed all comments" is NOT acceptable — one entry per comment, each with its
   evidence and outcome. Resolving comments is itself side-effecting (commits + replies) →
   apply the read-back rule. Loop until the round is clean or remaining comments are recorded
   as rejected-with-rationale.

5c. **Close the ledger.** After the run's units are all terminal (and the review round
   is recorded), append the **terminal `progress`** entry as the ledger's last line:
   `{"type":"progress","status":"complete"|"failed"|"aborted","end":"<ISO>","run_duration_ms":<end − header.start>,"done":[...],"failed":[...],"blocked":[...],"pending":[],"next":null,"cost_estimate":{"by_gate":{"U1:implement":<usd>,...},"total_usd":<sum>,"basis":"real"|"floor"}}`.
   `cost_estimate.basis` is `real` only if every gate's usage came from a transcript; if any gate
   fell back to the char/4 floor, the run basis is `floor`.
   `complete` only when every unit is `done`; `failed` if any unit ended failed/blocked.
   Then run `node .claude/skills/gcc-orchestrate/ledger.mjs validate RUN_DIR/ledger.jsonl --closed`
   — a run is not closed until this exits 0.
   Do this **before** the publish so the published ledger is closed.

6. **Publish the run** (built-in final step, not a manual afterthought).
   Publish the whole run to the target space: **(a)** the artifacts
   (playbook, plan, baseline, review report), **(b)** the process data (the
   execution ledger — including its `reviewer-comment` entries — + per-gate evidence
   files). Folder: `<Domain> → <slug>`, where `<Domain>` is a meaningful name for
   *what the run solved*, derived from the plan's title/subject — NOT a fixed label
   (e.g. "Performance Overview", "Auth Hardening", "Feed Reliability"). When no
   clear domain is derivable, ask the user for the folder name. Write with
   `save_context` using an explicit `space_id` (+ `workspace_id` guard) per doc.
   This publish is a
   side-effecting step → apply the read-back rule above: confirm every doc landed
   in the space before reporting it done.

7. **Capture learnings (`/ce-compound`) — closes the compounding loop.** After the
   handoff and publish, invoke `/ce-compound` to distill the run's REUSABLE learnings into
   `docs/solutions/`. Seed it from every `reviewer-comment` entry regardless of source (so a
   human review compounds like a bot catch), plus the ledger's `decision`
   entries — the bugs caught + their root cause + the fix are the
   highest-value learnings, alongside patterns that worked and gotchas (e.g. "an
   Inngest dedup marker must be written inside `step.run` or replay misses it";
   "monitoring must fail open, never throw into the request path"; "throttle/rollup
   keys must be low-cardinality"). This is the producing half of the loop: the next
   run's `/ce-plan` dispatches `ce-learnings-researcher` over `docs/solutions/`, so
   what this run learned the hard way is surfaced automatically next time instead of
   re-derived (or re-broken). Skip only when the run produced no reusable lesson
   (pure mechanical change); record the skip + reason in the ledger.

   Note on the *consuming* half: the pull fires inside `/ce-plan` (Phase 0 step 2
   routes brainstorms/requirements through it). When orchestrate is handed an
   already-decomposed plan and skips `/ce-plan`, no learnings pull happens — if the
   plan touches a domain with `docs/solutions/` history, consult
   `ce-learnings-researcher` before Phase 2 so the run starts from prior art.

## Resumability

**The `.jsonl` ledger is the resume state — not the prose playbook table.**
Re-running `/gcc-orchestrate` on the same ticket:

1. Locates the run directory `docs/plans/orchestration-<slug>-<date>/` and reads its
   `ledger.jsonl`. The `run-header` gives `run_dir`, the `units` roster, `total_units`,
   and `waves`. No header ⇒ not a resumable run; start fresh. (Legacy runs may have a
   flat `…-ledger.jsonl` in `docs/plans/`; read it if present.)
2. Classifies each unit by replaying its gate entries: **`done`** ⇔ it has a passing
   `ce-work` + a passing `verify` + a `review` entry carrying a `report:`
   path with P0/P1 findings resolved or absent; **`failed`/`blocked`** ⇔ a `decision` entry says so; otherwise **`pending`**
   (a unit with `ce-work` but no `verify` is pending and re-runs from its first
   missing gate).
3. Cross-checks against the last `progress` entry; the replayed classification wins on
   conflict (append-only ⇒ latest gate event is ground truth) — log divergence as a
   note, don't hard-stop.
4. Resumes at the last `progress.next`, else the first `pending` unit in wave order.
   At most one unit's work is lost.
5. Regenerates the playbook `.md` `Unit status` table via
   `node .claude/skills/gcc-orchestrate/ledger.mjs render` (its `classify()`
   implements exactly this replay). The `.md` is a render of the ledger; it is never read
   back as the resume authority. Run `ledger.mjs validate` first — a ledger that fails
   validation must be repaired (or the run restarted) before resuming from it.

## Hard rules

- **No run starts without a passing doctor.** Phase 0 step 0 (`doctor.mjs`) must report
  zero critical ✗ before any other work. A missing prerequisite skill is a STOP, never a
  license to improvise a substitute inline.
- **The orchestrator drives; agents implement.** Each unit goes through
  `/ce-work`. The orchestrator never skips a gate to save time.
- **Every unit is gated.** No unit is "done" until `/ce-work` reports complete
  AND `/gcc-verify` passes its scenarios AND `/gcc-review` is clean (or its
  findings are fixed) AND each gate's evidence is captured in the execution ledger.
  Advisory tools never auto-block — the orchestrator enforces the bar by pausing on
  unresolved P0/P1. A playbook ✅ without a backing ledger entry does NOT count as done.
- **`/gcc-review` is invoked, never simulated.** The `gcc-review` gate (per unit
  AND the final pass) MUST be a real skill invocation — dispatched as a subagent on the Agent
  tool at `model: sonnet` — that produces a saved
  report, relocated to `RUN_DIR/reports/review-<unit>.md`, and the ledger entry MUST
  cite that path. Reasoning over the diff "inline" instead of running the skill is a
  gate violation: it forfeits the skill's saved report, Context7 currency checks, and
  structured aspect coverage — the very things that catch the defects per-unit
  eyeballing misses. No report file ⇒ the review did not happen.
- **One per-run artifact directory; the orchestrator owns the artifact layout of everything
  it delegates.** Everything a run produces — playbook, `ledger.jsonl`, every review report,
  evidence — lives under `RUN_DIR = docs/plans/orchestration-<slug>-<date>/`, never scattered flat into
  `docs/plans/`.
- **The ledger is validated, not trusted.** `ledger.mjs validate` after every progress
  checkpoint; `--closed` at run end; the playbook table is `ledger.mjs render` output. The
  canonical schema (closed type enum, gate roles) is the schema section above — a run whose
  ledger fails validation is not auditable and not resumable.
- **Evidence over assertion.** Every gate verdict must be backed by a ledger entry
  containing the actual invocation + raw evidence — never a bare checkmark or a
  "trust me" summary. `/gcc-verify` entries break down per AC; reviewer comments get
  one `reviewer-comment` entry each. The ledger is a required artifact, not optional
  gold-plating.
- **Cost figures are labeled estimates.** The per-gate `usage:` line and the
  run `cost_estimate` are a *floor* unless every gate's usage came from a real transcript
  (`basis: real`). Never present a floor estimate as an exact bill — the char/4 fallback
  undercounts subagent-internal tokens.
- **The jsonl is the resume authority.** Resume reads `…-ledger.jsonl` (run-header
  roster + replayed gate/`progress` entries), never the prose `Unit status` table. The
  playbook `.md` is a rendered view of the ledger and is regenerated from it — a unit's
  done/failed/pending state is whatever the jsonl says, not what the table says.
- **Verify side-effects.** A tool returning success is not proof. After any external
  mutation (PR / publish), read it back to confirm it landed before claiming
  done; record a `side-effect-check` entry.
- **Verify reviewer findings before fixing.** Every reviewer finding is checked against the code
  first — fix real ones, reject false positives with a recorded rationale + reply.
- **Close the learning loop.** A non-trivial run ends by producing a `docs/solutions/`
  learning via `/ce-compound` (Phase 3 step 7), seeded from the ledger's caught
  mistakes — so the next run's `ce-learnings-researcher` (via `/ce-plan`) inherits
  them. A run that consumes prior learnings but produces none leaves the loop open.
- **Branch is the default; parallel needs worktree.** Honor the user's choice;
  apply the parallel ⇒ worktree safety coupling.
- **Explicit staging only.** Never `git add -A`. Stage the unit's files by path.
- **Never auto-open the PR.** Hand off to `/gcc-pr`.
- The pattern library (docs/plans/orchestration-patterns.md) is maintained ONLY by the learn gate at
  run close — gates read it (`patterns.mjs match`), never write it mid-run. Before
  reading, `node .claude/skills/gcc-orchestrate/patterns.mjs lint docs/plans/orchestration-patterns.md` must pass; a
  broken block is skipped and reported, never hand-repaired mid-run.

## Edge cases

- **No plan found / blank with nothing to detect** → ask for a path or to run
  `/ce-brainstorm` → `/ce-plan` first.
- **Plan has no verify blocks** → `/gcc-verify` runs ad-hoc from the plan's requirements; note
  `adhoc: true` in the wave summary.
- **Cyclic dependency among units** → stop and report the cycle; do not guess an
  order.
- **Merge conflict (parallel + worktree merge-back)** → pause the wave, surface
  the conflict, let the user resolve before continuing.
- **Collision detected** → warn + confirm; do not start silently.
