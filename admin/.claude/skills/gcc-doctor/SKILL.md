---
name: gcc-doctor
description: Use to check whether the gcc orchestration family is fully set up on this machine — all prerequisite skills/plugins installed, CLIs on PATH, gh authenticated, config valid. Run before the first orchestration in a new session or machine, after plugin updates, or when a gate skill errors mid-run. Invoke via /gcc-doctor.
---

# gcc-doctor

Setup preflight for the `gcc-*` orchestration family — the same check
`/gcc-orchestrate` runs automatically at Phase 0, exposed as a
standalone command (think `claude doctor`, scoped to this repo's orchestration setup).

## Run it

From the repo root:

```bash
node .claude/skills/gcc-orchestrate/doctor.mjs
```

(`--json` for machine output; optional first arg = alternate config path.)

## Read the output

| Mark | Level | Meaning |
|------|-------|---------|
| ✓ | — | prerequisite present |
| ✗ | critical | missing — **orchestration must not start** until fixed |
| ! | advisory | missing but the family degrades gracefully (note it, continue) |
| ○ | manual | not script-checkable — confirm yourself in this session (e.g. MCP reachability) |

Exit code 0 = all critical checks pass; 1 = at least one critical ✗.

## Fix what it finds

| Failing check | Remedy |
|---------------|--------|
| `skill:<name>` (external, e.g. ce-work) | install/enable the plugin that provides it (e.g. the compound-engineering plugin), or correct the slot in `.claude/skills/orchestrate.config.json` |
| `skill:gcc-*` (family member) | regenerate the family via `/orchestrator-builder` — a member was deleted or renamed |
| `config-slot:*` / `config-parse` | fix `.claude/skills/orchestrate.config.json` (compare against the slot schema), or regenerate |
| `file:*/ledger.mjs` etc. | family files missing — regenerate via `/orchestrator-builder` |
| `cli:gh` | install it and re-run |
| `auth:gh` | `gh auth login` |
| `mcp:save_context` (manual) | confirm the skeleton MCP is connected in this session before a publish; connect it if not |

## Hard rules

- **Report, then stop.** This skill diagnoses; it never auto-installs plugins, edits config,
  or mutates anything. Present the remedies and let the user act.
- **A critical ✗ means orchestration is blocked.** If the user asks to orchestrate anyway,
  restate the doctor STOP rule: a missing gate skill is never a license to improvise an
  inline substitute.
- Re-run after every fix until it prints `DOCTOR: PASS`.
