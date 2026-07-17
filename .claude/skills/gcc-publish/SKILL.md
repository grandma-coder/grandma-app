---
name: gcc-publish
description: Publish a completed orchestration run — its artifacts (playbook, plan, review reports) and process data (execution ledger including reviewer-comment entries, per-gate evidence files) — to the project's configured knowledge base. Organizes under a domain-derived folder, writes each document individually with explicit space targeting, and confirms every doc landed via read-back before reporting done. Invoke after the ledger is closed (terminal progress entry written) and before capturing learnings.
---

# gcc-publish

Publish a completed orchestration run to the knowledge base. Covers the producing half of the
run's external record — the consuming half (distilling learnings) is `/ce-compound`.

## Session prerequisite (MCP reachability)

`save_context` is an MCP tool — its availability is a property of THIS session, not
of the repo, so no script can preflight it. Before the first write, confirm the tool is
actually invocable (a cheap read/list call against the `Grandma` space). Not
connected → **STOP**: tell the user to connect the skeleton MCP and rerun. Never
simulate the publish, write to a file "instead", or skip silently.

## When to run

Invoke after the run's terminal `progress` entry is written to `ledger.jsonl` and before
invoking `/ce-compound`. The ledger should be closed (`"status":"complete"|"failed"|"aborted"`)
so the published version is the final record, not a partial snapshot.

Do **not** invoke when `publish.target` is `none` — this skill is generated only for
projects with a configured knowledge base.

## What to publish

Two categories of material from `RUN_DIR`:

**(a) Artifacts** — the human-readable run outputs:
- `playbook.md` — the orchestration playbook (unit roster, wave plan, dependency graph)
- The source plan file (path from the playbook's `source_plan:` frontmatter field)
- `reports/review-final.md` — the final code-review report
- **Every per-unit review report** — `reports/review-U<n>.md` for each unit. orchestrate treats
  these as first-class run artifacts (the orchestrator owns and uniformly names them), so the
  knowledge-base copy must keep the full per-unit review evidence. Glob `reports/review-U*.md`.
  (Verify evidence is not a file — it lives in `ledger.jsonl` `checks:` entries, published below.)

**(b) Process data** — the evidence trail:
- `ledger.jsonl` — the ledger (includes all `reviewer-comment` entries from the external review
  cycle AND every verify `checks:` breakdown — these are first-class evidence, not noise). There
  No separate human-readable ledger mirror is produced; the playbook is the human-readable view.
- Any per-gate evidence files under `evidence/` that exceed the inline granularity cap

## Folder naming

Organize under: `<Domain> → <slug>`

`<Domain>` is derived from the plan's title or subject — a meaningful name for *what the run
solved* (e.g. "Performance Overview", "Auth Hardening", "Feed Reliability"). It is NOT a
fixed label like "Orchestration Runs" or "Plans". When no clear domain is derivable from the
plan title, **ask the user** for the folder name before writing anything.

## How to write

Use `save_context` with `space_id: space-90a3cabe` and `workspace_id: Personal` (guard) **per document** — this is the `Grandma` space, the ONE space this project publishes to. Never write to any other space: mixing projects' runs into a shared space is the failure this pins down. Write each document as a separate call — do NOT use a bulk organize or propose call. A bulk call that returns `applied` or `success` does not guarantee the documents were created (motivating failure: a bulk organize returned `applied` but created nothing; individual writes with read-back are the only reliable path).

Write order: artifacts first (playbook → plan → review reports), then process data
(ledger.jsonl → evidence files). This ensures the human-readable record lands before the raw evidence.

## Read-back rule (mandatory)

After all writes complete, re-query the knowledge base to confirm every document landed:
- List or search the target folder/space to verify each doc appears by name
- If any doc is missing, retry the write for that doc before reporting done
- Record the read-back result as a `side-effect-check` ledger entry:
  `{"type":"side-effect-check","action":"publish-read-back","result":"all N docs confirmed"|"retry: [doc names]",...}`

"The write tool returned success" is a claim to verify, not proof. The run is only published
when the read-back confirms every doc exists in the knowledge base.

## Ledger entry

Append a `publish` ledger entry to `ledger.jsonl` after the read-back:

```text
### FINAL · publish · <ISO timestamp>
- invocation: /gcc-publish
- result: pass | partial | fail
- space: Grandma (space-90a3cabe)
- folder: <Domain> → <slug>
- docs_written: [playbook.md, source-plan, review-final.md, review-U*.md, ledger.jsonl, ...]
- read_back: all confirmed | retry needed for [...]
- provenance: model <id>, session <id>
```

## Hard rules

- **One doc per write call.** Never use bulk organize or propose operations.
- **Always read back.** A write returning success is not proof — confirm in the knowledge base.
- **Domain-derived folder name.** Never a fixed generic label; ask when unclear.
- **One space only — `space-90a3cabe` (`Grandma`).** Every write targets
  this configured `space_id` under `workspace_id: Personal`. Never publish a run to a different space; that is
  how one project's runs bleed into another's knowledge base.
- **Ledger must be closed first.** Publish after the terminal `progress` entry, never before.
- **`reviewer-comment` entries are first-class.** The ledger's reviewer-comment entries
  (human and bot) are high-value evidence — include `ledger.jsonl` so they are preserved.
- **Do not re-open the run.** This skill is publish-only; it does not fix, re-verify, or
  re-review. Surface any gaps as notes; do not loop back to implementation gates.
