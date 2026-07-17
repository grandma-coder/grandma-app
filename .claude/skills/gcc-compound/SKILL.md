---
name: gcc-compound
description: Distill a recently solved problem or completed orchestration run into the project's solutions knowledge sink. Captures problem context, root cause, fix, and prevention strategies in structured documentation with YAML frontmatter for searchability. Uses parallel subagents for maximum efficiency. Invoke after a fix is verified or after an orchestration run closes the learning loop.
argument-hint: "[optional: brief context] [mode:headless]"
---

# gcc-compound

Coordinate multiple subagents working in parallel to document a recently solved problem,
writing structured learnings into `docs/solutions/`.

> **Recommended model:** `sonnet` — distilling learnings is medium-weight synthesis.
> The orchestrator dispatches this at `sonnet` when it runs it as a subagent.

## Cross-cutting rule: seed from orchestration runs

**When invoked after an orchestration run, seed from every `reviewer-comment` ledger entry
regardless of `type`.** A human reviewer's catch compounds exactly like a bot's. The
caught-bug + root-cause + fix triples are the highest-value learnings, alongside patterns that
worked and gotchas encountered. Do not filter by reviewer source or entry type — all
`reviewer-comment` entries with `verdict: real` and a `fixed in <sha>` action are prime
compounding material. `decision` entries (gate failures, waivers) are the second tier.

## Pattern library maintenance (orchestration close only)

When invoked at an orchestration run close (RUN_DIR exists), maintain
`docs/plans/orchestration-patterns.md` — the repo's recurring-failure library that
`gcc-orchestrate` injects into implement and review gates.
This is the ONLY writer of that file. Procedure:

Entry format (exactly this shape — `patterns.mjs lint` enforces it):

    ## P-014 · zod-parse-api-body [active]
    Rule: API route handlers must zod-parse request body before use.
    Scope: apps/*/api/**
    Evidence: DEG-1236 (2 findings), DEG-1244 (1)
    Added: 2026-07-06 · Last hit: 2026-07-06

1. **Mine the run.** From `RUN_DIR/ledger.jsonl`: every review/verify/simplify
   finding that caused a fix, every `reviewer-comment` with `verdict: real`, and
   every pattern-check `hit` recorded by the review gate.
2. **Classify PR comments.** If `RUN_DIR/outcomes.json` exists (else the PR-boundary
   join has not run — note it in the learn entry and skip this step), set each
   comment's `gate_role` (which gate should have caught it: implement|verify|review|test,
   or null for non-defect chatter) and `matched_pattern` (P-id if an ACTIVE pattern
   already covered it — that is a pattern escape). Write the file back. These two
   fields are what `analyze.mjs` scorecards as escapes.
   Then sweep PRIOR runs: scan sibling `orchestration-*/outcomes.json` files under the
   plans dir for comments still lacking `gate_role` and classify them the same way in
   the same pass — external comments land after a run closes, so each close settles the
   previous runs' debts. Note swept run dirs in the learn entry.
3. **Update evidence.** A finding matching an existing pattern → append this run to
   its `Evidence:` line and bump `Last hit:`.
4. **Propose new patterns.** A finding seen in ≥2 distinct runs (check prior runs'
   ledgers or the existing Evidence lines) becomes a new entry: next free `P-<n>`,
   kebab slug, one-sentence Rule (imperative, checkable), tightest Scope glob that
   covers the evidence, `[active]`. One-run findings stay in the ledger only.
5. **Retire.** Any active pattern with no hit in the last 10 runs → flip to
   `[retired]` (keep the block — history matters; retired patterns cost no prompt
   tokens).
6. **Enforce the cap.** Run
   `node .claude/skills/gcc-orchestrate/patterns.mjs lint docs/plans/orchestration-patterns.md`;
   fix every issue before finishing. If `docs/plans/orchestration-patterns.md` does not exist yet,
   create it (header comment + first entries) — a missing file on a repo's first
   close is expected, not an error. Over-cap means merge overlapping patterns or
   retire the weakest-evidence one BEFORE adding. The file is repo-committed:
   commit it with the run's final commit.
7. **Ledger.** Append a `learn` entry listing pattern ids added/updated/retired and
   the outcomes.json classification counts.

## Purpose

Captures problem solutions while context is fresh, creating structured documentation in
`docs/solutions/` with YAML frontmatter for searchability and future reference. Uses parallel
subagents for maximum efficiency.

**Why "compound"?** Each documented solution compounds your team's knowledge. The first time
you solve a problem takes research. Document it, and the next occurrence takes minutes.
Knowledge compounds.

## Usage

```bash
/gcc-compound                     # Document the most recent fix
/gcc-compound [brief context]     # Provide additional context hint
/gcc-compound mode:headless        # Non-interactive run for automations
/gcc-compound mode:headless [context]  # Non-interactive with context hint
```

## CONCEPTS.md bootstrap requests

If invoked specifically to create or bootstrap `CONCEPTS.md` rather than document a solved
problem, do not run the normal phases. Redirect to `ce-compound-refresh` (which handles
repo-wide concept-map creation), then exit.

## Mode Detection

Check `$ARGUMENTS` for a `mode:headless` token. Strip `mode:headless` from arguments before
treating the remainder as the brief context hint.

| Mode | When | Behavior |
|------|------|----------|
| **Interactive** (default) | No mode token | Ask Full vs Lightweight, ask about session history (Full only), prompt for Discoverability Check consent, end with "What's next?" |
| **Headless** | `mode:headless` in arguments | No blocking questions. Run Full mode without session history. Apply Discoverability Check edit silently. Skip Phase 3 specialized reviews. End with structured terminal report. |

Headless mode is for automations and skill-to-skill invocation. The doc produced is identical
to an interactive Full run — once detected, headless mode applies for the entire run.

## Pre-resolved context

**Git branch (pre-resolved):** !`git rev-parse --abbrev-ref HEAD 2>/dev/null || true`

If the line above resolved to a plain branch name, include it in the `ce-sessions` invocation
payload in Phase 1 so the orchestrator does not waste a turn deriving it.

## Support Files

Read on-demand at the step that needs them — do not bulk-load at skill start.

- `references/schema.yaml` — canonical frontmatter fields and enum values
- `references/yaml-schema.md` — category mapping from problem_type to directory
- `references/concepts-vocabulary.md` — CONCEPTS.md format and inclusion rules
- `assets/resolution-template.md` — section structure for new docs

When spawning subagents, pass relevant file contents into the task prompt.

## Execution Strategy

**In headless mode**, skip both questions and go directly to Full Mode with session history
disabled (Phase 1 step 4 omitted).

**In interactive mode**, present two options before proceeding:

```text
1. Full (recommended) — the complete compound workflow. Researches,
   cross-references, and reviews your solution to produce documentation
   that compounds your team's knowledge.

2. Lightweight — same documentation, single pass. Faster and uses
   fewer tokens, but won't detect duplicates or cross-reference
   existing docs. Best for simple fixes or long sessions nearing
   context limits.
```

Do NOT pre-select a mode or skip this prompt. Wait for the user's choice.

**If the user chooses Full** (interactive mode only), ask one follow-up question:

```text
Would you also like to search your session history for relevant
knowledge to help the Compound process? This adds time and token usage.
```

If yes, invoke `ce-sessions` in Phase 1 step 4. If no, skip it.

---

### Full Mode

<critical_requirement>
**The primary deliverable is ONE file — the final documentation.**

Phase 1 subagents return TEXT DATA to the orchestrator. They must NOT write files.
Only the orchestrator writes files. Beyond the Phase 2 solution doc, its other writes are
maintenance side effects:
- **`CONCEPTS.md`** — create or update in Phase 2.4 when a qualifying domain term surfaces.
- **A project instruction file** (AGENTS.md or CLAUDE.md) — a small edit when the
  Discoverability Check finds a gap.
</critical_requirement>

### Phase 0.5: Auto Memory Scan

Check the auto-memory block in your system prompt for notes relevant to the problem being
documented. If relevant entries are found, prepare a labeled excerpt block and pass it as
additional context to the Context Analyzer and Solution Extractor in Phase 1. Tag any
memory-sourced content incorporated into the final doc with "(auto memory [claude])".

### Phase 1: Research

**Dispatch order:**
- Launch `Context Analyzer`, `Solution Extractor`, and `Related Docs Finder` in parallel (background)
- **Then** invoke `ce-sessions` synchronously (only if user opted in)

<parallel_tasks>

#### 1. Context Analyzer
- Extracts conversation history (and orchestration run ledger if provided)
- Reads `references/schema.yaml` for enum validation and track classification
- Determines track (bug or knowledge) from problem_type
- Identifies problem type, component, and track-appropriate fields:
  - **Bug track**: symptoms, root_cause, resolution_type
  - **Knowledge track**: applies_when (symptoms/root_cause/resolution_type optional)
- Reads `references/yaml-schema.md` for category mapping into `docs/solutions/`
- Suggests a filename using the pattern `[sanitized-problem-slug].md` (no date suffix)
- Returns: YAML frontmatter skeleton (must include `category:`), category directory path,
  suggested filename, and which track applies

#### 2. Solution Extractor
- Reads `references/schema.yaml` for track classification
- Adapts output structure based on the problem_type track

  **Bug track output sections:**
  - **Problem**: 1-2 sentence description of the issue
  - **Symptoms**: Observable symptoms (error messages, behavior)
  - **What Didn't Work**: Failed investigation attempts and why they failed
  - **Solution**: The actual fix with code examples (before/after when applicable)
  - **Why This Works**: Root cause explanation and why the solution addresses it
  - **Prevention**: Strategies to avoid recurrence, best practices, and test cases

  **Knowledge track output sections:**
  - **Context**: What situation, gap, or friction prompted this guidance
  - **Guidance**: The practice, pattern, or recommendation with code examples when useful
  - **Why This Matters**: Rationale and impact of following or not following this guidance
  - **When to Apply**: Conditions or situations where this applies
  - **Examples**: Concrete before/after or usage examples

#### 3. Related Docs Finder
- Searches `docs/solutions/` for related documentation
- Identifies cross-references and links
- Finds related GitHub issues
- Flags related learning or pattern docs that may now be stale, contradicted, or overly broad
- **Assesses overlap** with the new doc across five dimensions: problem statement, root cause,
  solution approach, referenced files, and prevention rules. Score as:
  - **High**: 4-5 dimensions match — essentially the same problem solved again
  - **Moderate**: 2-3 dimensions match — same area but different angle or solution
  - **Low**: 0-1 dimensions match — related but distinct
- Returns: links, relationships, refresh candidates, and overlap assessment

  **Search strategy (grep-first):**
  1. Extract keywords from the problem context: module names, technical terms, error messages
  2. Narrow search to the matching `docs/solutions/<category>/` directory when category is clear
  3. Use Grep to pre-filter candidate files BEFORE reading content (search `title:`, `tags:`,
     `module:`, `component:` frontmatter fields)
  4. Read only frontmatter (first 30 lines) of candidates; fully read only strong/moderate matches
  5. Return distilled links and relationships, not raw file contents

  **GitHub issue search:** prefer `gh issue list --search "<keywords>" --state all --limit 5`.
  If `gh` is unavailable, skip and note it.

</parallel_tasks>

#### 4. Session History via `ce-sessions` (synchronous, after parallel block — only if user opted in)
- Skip in lightweight mode, headless mode, or when user declined
- Invoke `ce-sessions` via the Skill tool. Keep the dispatch payload tight:
  - Pre-resolved context (repo, branch) if clean
  - Time window: `7 days` unless the problem spans a longer arc
  - Problem topic: one sentence naming the concrete issue
  - Filter rule: "Only surface findings directly relevant to this specific problem"
  - Output schema: What was tried before / What didn't work / Key decisions / Related context
- Returns: structured digest from prior sessions, or "no relevant prior sessions"
- **Proceed directly to Phase 2 when it returns** — do not pause or summarize

### Phase 2: Assembly & Write

**Wait for all Phase 1 inputs before proceeding.**

1. Collect all text results from Phase 1 subagents
2. **Check the overlap assessment** from the Related Docs Finder:

   | Overlap | Action |
   |---------|--------|
   | **High** | **Update the existing doc** with fresher context rather than creating a duplicate |
   | **Moderate** | **Create the new doc** normally; flag the overlap for Phase 2.5 |
   | **Low or none** | **Create the new doc** normally |

3. **Incorporate session history findings** (if available):
   - Fold dead ends and failed approaches into **What Didn't Work** (bug) or **Context** (knowledge)
   - Use cross-session patterns to enrich **Prevention** or **Why This Matters**
   - Tag session-sourced content with "(session history)"

4. Assemble the complete markdown file. Read `assets/resolution-template.md` for section structure.
5. Validate YAML frontmatter against `references/schema.yaml`. Apply YAML-safety quoting rules
   (see `references/yaml-schema.md` > YAML Safety Rules).
6. Create directory if needed: `mkdir -p docs/solutions/[category]/`
7. Write: `docs/solutions/[category]/[filename].md`
8. **Run `python3 scripts/validate-frontmatter.py <output-path>`** to catch silent-corruption
   parser-safety issues. Exit 0 = parser-safe; exit 1 = fix named fields, re-write, re-run.
   Do not declare success while validation fails.

### Phase 2.4: Vocabulary Capture

**First, read `references/concepts-vocabulary.md`** unconditionally. Then scan the new doc
and surrounding conversation for qualifying domain terms.

- If `CONCEPTS.md` exists at repo root: add missing qualifying terms, refine existing entries
- If it does not exist and at least one qualifying term surfaced: create it

**Seed the learning's area at creation** — don't write a lone term. Scope the seed to the
modules and domain the fix touched; don't reach for repo-wide nouns.

**Refresh the coherence neighborhood** of any entry you touch — fix glossary violations and
refresh entries whose accuracy is evidenced by this learning's findings. Bounds: neighborhood
only; flag broader drift for `ce-compound-refresh` rather than editing on a guess.

If no terms qualified, record that explicitly (e.g., "Vocabulary capture: scanned, no
qualifying terms"). Do not silently skip.

**Apply edits silently in every mode** — vocabulary capture is a side effect of compounding,
not a user decision.

### Phase 2.5: Selective Refresh Check

After writing the new learning, decide whether older docs should be refreshed. `ce-compound-refresh`
is **not** a default follow-up — use it selectively when the new learning suggests an older doc
may now be inaccurate.

**Invoke or recommend `ce-compound-refresh` when:**
1. A related learning recommends an approach the new fix now contradicts
2. The new fix clearly supersedes an older documented solution
3. The work involved a refactor, migration, or dependency upgrade that likely invalidated older refs
4. The Related Docs Finder reported moderate overlap with an existing doc (consolidation opportunity)

**Do not invoke `ce-compound-refresh` when:**
1. No related docs were found
2. Related docs still appear consistent with the new learning
3. In headless mode (surface the scope hint in the terminal report instead)

When invoking, prefer the narrowest useful scope (specific file → module → category → pattern).

### Discoverability Check

After the learning is written, check whether the project's instruction files would lead an
agent to discover and search `docs/solutions/` before starting work in a documented area.

1. Identify root-level instruction files (AGENTS.md, CLAUDE.md, or both). Read the substantive
   file (ignore shims that just `@`-include the other).
2. Assess whether an agent reading the file would learn:
   - That a searchable knowledge store of documented solutions exists
   - Enough about its structure to search effectively (category organization, YAML frontmatter)
   - When to search it (before implementing features, debugging issues, or making decisions)
3. If the spirit is already met, move on.
4. If not: draft the smallest addition that communicates the three things, matching the file's
   style and density. In interactive mode, explain why it matters and get consent. In headless
   mode, apply the edit directly and surface it in the terminal report.

5. **If `CONCEPTS.md` exists, run a parallel discoverability check for it.** Same workflow.
   Skip entirely if `CONCEPTS.md` does not exist.

### Phase 3: Optional Enhancement

**Wait for Phase 2 to complete. Skip Phase 3 entirely in headless mode.**

Based on problem type, optionally invoke specialized agents:
- **performance_issue** → `ce-performance-oracle`
- **security_issue** → `ce-security-sentinel`
- **database_issue** → `ce-data-integrity-guardian`
- Any code-heavy issue → `ce-code-simplicity-reviewer`

---

### Lightweight Mode

**Single-pass alternative — same documentation, fewer tokens.**

The orchestrator performs ALL of the following in one sequential pass (no subagents):

1. **Extract from conversation**: Identify the problem and solution. Also scan the
   "user's auto-memory" block if present. Tag any memory-sourced content with "(auto memory [claude])".
   **When seeding from an orchestration run**: pull from `reviewer-comment` entries (verdict:
   real, fixed in sha) and `decision` entries in the run's ledger.
2. **Classify**: Read `references/schema.yaml` and `references/yaml-schema.md`, then determine
   track (bug vs knowledge), category, and filename.
3. **Write minimal doc**: Create `docs/solutions/[category]/[filename].md` using the appropriate
   track template from `assets/resolution-template.md`, with:
   - YAML frontmatter with track-appropriate fields
   - Bug track: Problem, root cause, solution with key code snippets, one prevention tip
   - Knowledge track: Context, guidance with key examples, one applicability note
4. **Vocabulary capture (update-only)**: if `CONCEPTS.md` exists, read
   `references/concepts-vocabulary.md`, scan and add/refine entries silently. Do not bootstrap
   or seed — defer creation to a Full run. Record the outcome.
5. **Skip Phase 3** to conserve context.

**Lightweight output:**
```text
✓ Documentation complete (lightweight mode)

File created:
- docs/solutions/[category]/[filename].md

[If discoverability check found instruction files don't surface the knowledge store:]
Tip: Your AGENTS.md/CLAUDE.md doesn't surface docs/solutions/ to agents —
a brief mention helps all agents discover these learnings.

Note: This was created in lightweight mode. For richer documentation
(cross-references, detailed prevention strategies, specialized reviews),
re-run /gcc-compound in a fresh session.
```

---

## What It Captures

- **Problem symptom**: Exact error messages, observable behavior
- **Investigation steps tried**: What didn't work and why
- **Root cause analysis**: Technical explanation
- **Working solution**: Step-by-step fix with code examples
- **Prevention strategies**: How to avoid in future
- **Cross-references**: Links to related issues and docs

## Preconditions

Problem has been solved and solution verified (for bug track). Non-trivial change
(not a simple typo or obvious one-liner). For orchestration runs: ledger is closed
(terminal `progress` entry written).

## What It Creates

**File:** `docs/solutions/[category]/[filename].md`

**Categories auto-detected from problem:**

Bug track: `build-errors/` · `test-failures/` · `runtime-errors/` · `performance-issues/`
  · `database-issues/` · `security-issues/` · `ui-bugs/` · `integration-issues/` · `logic-errors/`

Knowledge track: `architecture-patterns/` · `design-patterns/` · `tooling-decisions/`
  · `conventions/` · `workflow-issues/` · `developer-experience/` · `documentation-gaps/`
  · `best-practices/` (fallback only)

## Common Mistakes to Avoid

| Wrong | Correct |
|-------|---------|
| Subagents write intermediate files | Subagents return text data; orchestrator writes one final file |
| Research and assembly run in parallel | Research completes → then assembly runs |
| Creating a new doc when an existing doc covers the same problem | Check overlap; update when overlap is high |
| Filtering orchestration run seeds by reviewer type | Include ALL `reviewer-comment` entries regardless of source |

## Success Output

### Headless mode

```text
✓ Documentation complete (headless mode)

File: docs/solutions/<category>/<filename>.md  (created | updated)
Track: <bug | knowledge>
Category: <category>
Overlap: <none | low | moderate — see <path> | high — existing doc updated>
Instruction-file edit: <none needed | applied to <path> | gap noted, not applied>
CONCEPTS.md: <scanned, no qualifying terms | created with N entries | updated — N added, N refined>
Refresh recommendation: <none | scope hint for ce-compound-refresh>

Documentation complete
```

### Interactive mode

```text
✓ Documentation complete

Subagent Results:
  ✓ Context Analyzer: Identified <problem_type> in <module>, category: <category>/
  ✓ Solution Extractor: <N> code fixes, prevention strategies
  ✓ Related Docs Finder: <N> related issues
  [✓ Session History: N prior sessions, N failed approaches surfaced]

Files written:
- docs/solutions/<category>/<filename>.md (created | updated)
[- CONCEPTS.md (created | updated)]

This documentation will be searchable for future reference when similar
issues occur in the <module> module.

What's next?
1. Continue workflow (recommended)
2. Link related documentation
3. Update other references
4. View documentation
5. Other
```

## The Compounding Philosophy

Each documented solution compounds your team's knowledge:

1. First time you solve the problem → Research (30 min)
2. Document the solution → `docs/solutions/[category]/[filename].md` (5 min)
3. Next time similar issue occurs → Quick lookup (2 min)
4. Knowledge compounds → Team gets smarter

The producing half of the orchestration loop: what this run learned the hard way is
distilled here so the next run's `ce-learnings-researcher` (invoked by `/ce-plan`)
inherits it automatically — rather than re-deriving (or re-breaking) it.

## Auto-Invoke

Trigger phrases: "that worked" · "it's fixed" · "working now" · "problem solved"

Manual override: `/gcc-compound [context]` — document immediately without
waiting for auto-detection.

## Related Commands

- `/ce-plan` — Planning workflow (dispatches `ce-learnings-researcher` over `docs/solutions/`)
- `ce-learnings-researcher` — Searches `docs/solutions/` for applicable past learnings
- `/gcc-orchestrate` — The orchestration run that produces the seeds for this skill
