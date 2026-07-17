---
name: gcc-verify
description: Use after an implementation task is reported done to verify it actually satisfies its requirements (the plan's requirements / acceptance criteria). Runs deterministic asserts and an isolated LLM-judge per fuzzy check, then emits an advisory, evidence-cited pass/fail report. Never blocks. Callable on subagent return, as a pre-PR gate, or on demand via /gcc-verify <slug>.
---

# grandma-command-center Verify

Advisory verification that a change does what its requirements say. Deterministic
where mechanical, isolated-judge where fuzzy. Never blocks — it reports.

## When to run

| Caller | Diff scope | Steps |
|--------|-----------|-------|
| Subagent return (orchestrated runs) | the subagent's changes (start-ref → now) | the task's step only (`--step`) |
| Pre-PR gate (`gcc-pr`) | `origin/main..HEAD` | all |
| On-demand (`/gcc-verify <slug>`) | `origin/main..HEAD` (or working tree) | all, or `--step N` |

## Procedure

1. **Locate the plan.** Resolve the plan doc for the work (search `docs/plans/*<slug>*` and `docs/superpowers/plans/*`). If none has a `verify` block, enter **ad-hoc mode**: derive checks from the plan's requirements / acceptance criteria, run them one-shot, and set `adhoc: true` in the results (the report will mark itself ad-hoc). Never pretend a plan contract existed.

2. **Collect (deterministic).** Run:
   `node .claude/skills/gcc-verify/verify.mjs collect <plan> --diff-range <range> [--step <N>]`
   This prints JSON: `{ scope, verdicts: [...assert/error...], judges: [{id, ask, requirement, evidence}] }`.

3. **Judge (isolated, one subagent per judge item).** For EACH entry in `judges`, dispatch a fresh subagent via the Agent tool with `model: haiku` (isolated evidence-only judging is cheap — a small model is the intended default). The subagent's prompt contains ONLY: the `ask`, the `requirement`, and the `evidence` bundle (diff/files/commands). It must NOT receive the conversation, the plan's prose, or any "I did it" claim. Instruct it: *"Decide PASS or FAIL strictly from the evidence. If the evidence does not clearly support the requirement, return FAIL. One line of reasoning."* Collect each verdict as `{ step, id, requirement, verdict, detail: "judge: <reasoning>" }`.

4. **Merge.** Concatenate the assert/error `verdicts` from step 2 with the judge verdicts from step 3 into one `verdicts` array. Add `ticket`, `date` (pass it in — do not invent), `scope`, and `adhoc`.

5. **Render + surface.** Write the merged results to a temp JSON, then render to a temp file:
   `node .claude/skills/gcc-verify/verify.mjs render <results.json> > "$(mktemp)".md`
   Surface the report to the user (and, when driven by `/gcc-orchestrate`, hand
   the rendered text back so the orchestrator folds it into the ledger `checks:` breakdown). The
   verify result is durable in the **ledger**, not as a standalone `docs/plans/` file — the
   per-AC `checks:` list is the record of record. In the pre-PR caller, note unmet items for reviewers.

## Hard rules

- **Advisory only.** Never block, never edit code, never "fix" a failing check. This skill reads, runs, and reports.
- **Judge isolation is mandatory.** A judge subagent that can see the implementer's claims is worthless. Evidence-only, always.
- **Default to FAIL / SKIPPED, never silent PASS.** Uncertainty is FAIL. An unrun check is SKIPPED, never folded into PASS.
- **Never hand-pick dates.** Pass the real date (`date -u +%Y-%m-%d`) into the results; do not type a placeholder.
