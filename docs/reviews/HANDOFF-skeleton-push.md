# HANDOFF — Push the Health Audit to Skeleton (Grandma space)

**Status:** Audit 100% done and on disk. Only the Skeleton push remains — it's blocked because the Skeleton MCP server disconnected mid-push. Reconnect Skeleton, then run the single `save_context` call below.

---

## First action in the new session

1. **Confirm Skeleton is connected** — call `mcp__claude_ai_Skeleton__ping`. If the tool isn't even available (deferred-tool list empty for Skeleton), the MCP server is still offline → tell Igor to reconnect it before continuing.
2. **Set the destination** (substrate writes are space-scoped):
   - `set_active_workspace` → **Personal** (pass `workspace_id: "personal"`)
   - `set_active_space` → **Grandma**, id `space-90a3cabe`
3. **Push the doc** via `save_context` (see exact params below). This prompts Igor for approval on the Key device — that's expected; just propose it.
4. Mark done once approved.

---

## The push — exact `save_context` call

- **title:** `Health Content Verification Audit — 2026-06-22`
- **folder:** `Trackers`  _(Igor chose this — sits alongside "Pre-Friends-Test — Fix Tracker")_
- **space_id:** `space-90a3cabe`
- **kind:** `markdown`
- **content:** the full body = the frontmatter block below **+** the entire contents of
  [`docs/reviews/2026-06-22-health-content-verification-audit.md`](2026-06-22-health-content-verification-audit.md)
  (read that file fresh and prepend the frontmatter — don't retype the audit from memory).

Frontmatter to prepend (matches the Grandma/Skeleton space convention):

```
---
type: journal
status: active
scope: team
authored_at: "2026-06-22"
authored_by: Claude Code
related: [[Pre-Friends-Test — Fix Tracker]]
---
```

> Igor's earlier choices, already settled — don't re-ask:
> - Format = **context doc** (`save_context`), not file upload.
> - Location = **Trackers/** folder.

If `save_context` rejects the `folder` arg, save to the space root and then move it, or just save at root and note it — don't block on folder placement.

---

## What's already done (context, no action needed)

- **Audit complete:** all **10 clinical domains** verified against WHO/CDC/ACOG/AAP/NICE/ASRM + peer-reviewed literature, ~110 claims. Source-of-truth doc: `docs/reviews/2026-06-22-health-content-verification-audit.md` (349 lines, **untracked — do NOT commit** per original handoff).
- **Headline findings:** 2 WRONG (high), both Pregnancy — glucose-test "fast 8h" instruction (`pregnancyInsights.ts:58`, contradicts the app's own correct text) and conception-probability curve peaking at 70% vs published ~27–33% (`cycleLogic.ts:400–415`). Plus high discrepancies: fetal-length crown-rump/crown-heel splice, HepB unconditional "birth dose," Wonder Weeks growth-leaps presented as fact. Gold-standard files (sourced + disclaimed): `growthStandards.ts` and the `lib/birthGuide/` modules. No dangerously-lax warning-sign thresholds.
- **It was a READ-ONLY audit** — no clinical data files edited. Any fixes are a later, separately-approved pass (the doc's "Recommended fixes" section is the backlog, 26 items by severity).
- **Two domains** (birth-guide, kids-nutrition) hit a session-token limit mid-run and were gap-filled in a follow-up pass — both LOW risk. Doc is complete, no fabricated coverage.

## Repo state
- Branch `main`, work directly on main (no worktrees).
- `git status`: ` M .claude/settings.json`, ` M store/useVaultStore.ts`, `?? docs/reviews/` — all pre-existing/expected. Don't stage `.claude/settings.json` or commit `docs/reviews/` unless Igor asks.

## After the push
- Optional: a memory sweep was deferred this session (the Stop hook asked for one, but Skeleton — which `save_memory` needs — is offline). One candidate cross-project learning worth saving once Skeleton is back: **"when fanning out web-research subagents in a Workflow, batch them in waves of ~3 with awaits between waves — firing 10+ at once trips a transient server-side rate limit."** `get_memory` first to dedupe.
