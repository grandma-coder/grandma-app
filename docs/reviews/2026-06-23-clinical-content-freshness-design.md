# Clinical Content Freshness — Design Doc

**Date:** 2026-06-23
**Status:** Design only — no code. Decision aid for a later build.
**Related:** [[Health Content Verification Audit — 2026-06-22]] · [[Health Content Fix Plan — 2026-06-23]]
**Review surface chosen:** Skeleton review queue in the **Grandma** space (Personal workspace).

---

## The problem

grandma.app ships clinical claims (vaccine schedules, fetal growth, fertility math, prenatal timing, birth guidance). Public-health guidance changes — e.g. the **Dec 2025 ACIP HepB shift** we just had to fix by hand. Today every correction is:

1. Noticed by chance (or a manual audit).
2. Edited in `lib/*.ts`.
3. Shipped via a full App Store / Play build.

We want guidance changes to be **detected automatically and routed to a human quickly**, and corrections to go live **without an app release**.

## The one hard rule (non-negotiable)

**Never auto-publish AI-generated medical changes to users.**

LLMs are confidently wrong exactly on guidance nuance (the HepB change is a perfect example — it's conditional on maternal status, and AAP actively opposes it). The audit itself says final correctness needs a licensed clinician. So the agent's job is **enrichment + routing, not deciding what's true.** The shape is always:

> **detector → review queue → human approves → publish.** Never detector → publish.

This mirrors the crash-triage pattern: Sentry catches → agent enriches → human triages → fix. Generalized here to content governance.

---

## Architecture — three tiers

### Tier 1 — Make content updatable without an app release (the foundation)

Today clinical *values* are hardcoded in `lib/*.ts`, so a number change needs an Apple build. Move the **values** (not the rendering code) into Supabase:

- New table `clinical_content` (RLS: public read, service-role write):
  - `id`, `domain` (vaccines | fetal_growth | cycle | prenatal | birth | nutrition | growth),
  - `key` (e.g. `hepb.why`, `weekStats.20.cm`, `cycleLogic.probabilityForDay.peak`),
  - `value` (jsonb — string / number / array),
  - `source_url`, `source_org`, `last_verified_at`, `clinician_signed_off` (bool),
  - `updated_at`.
- App fetches via React Query (`useQuery(['clinical-content', domain])`) with **the bundled `lib/*.ts` values as the fallback** when offline / pre-fetch. The bundled data stays the safety net; the table is the live override.
- The `SOURCES` map + `// CLINICAL-REVIEW` comments from the fix initiative become this table's seed data.

**Why first:** without it, every approved correction still needs an app release — the detector would just create a backlog you can't ship. This unblocks everything.

### Tier 2 — Drift detector (the "news from the market" part)

A **Supabase Edge Function on a schedule** (Vercel Cron or `pg_cron`, weekly or monthly):

1. For each row in `clinical_content`, fetch the cited `source_url`'s current text.
2. Call Claude (via the existing edge-function + `ANTHROPIC_API_KEY` secret pattern) with a tight prompt:
   *"Our current claim: «X». Our cited source now says: «…». Has the guidance changed? Is our claim still accurate? Return: drifted(bool), confidence, what_changed, suggested_new_value (proposal only)."*
3. Optionally a second pass: a **web search** for new guidance the cited URL wouldn't surface (e.g. "ACOG 2026 gestational diabetes screening update") — catches *new* recommendations, not just edits to old pages.
4. Output is a **proposal row**, never a publish.

Design notes:
- Use prompt caching: the per-claim system prompt + rubric is a stable prefix across all rows → cheap at scale.
- Batch in waves (don't fire 100 fetches at once — rate limits). [[when-fanning-out-research-subagents-batch-in-waves]]
- Model: Haiku for the bulk "did this drift" classification; escalate to Sonnet only for rows it flags as drifted, to write the careful what_changed summary.
- Store provenance: which source text, which run, which model — so the human reviewer can audit the agent's reasoning.

### Tier 3 — Review surface = Skeleton (Grandma space)

Flagged drift becomes **context docs in the Grandma Skeleton space** (Personal workspace), one per review cycle or one per flagged claim:

- Cron's final step calls `save_context` (or `propose_to`) into Grandma → a `Content-Review` folder.
- Each doc: the claim, current value, cited source, what the agent thinks changed, confidence, suggested new value, and a clear **"clinician: approve / reject / edit"** prompt.
- Igor (or a clinician) reviews in Skeleton, approves → the value is written to `clinical_content` with `clinician_signed_off = true` and a fresh `last_verified_at` → live via Tier 1.
- This reuses exactly the pattern already working for the audit + fix plan (both live in Grandma → Trackers).

**Why Skeleton over the internal dashboard:** zero UI to build, it's already wired + authed, and it keeps the medical-governance trail in one portable place with the audit and plan it descends from.

---

## Data flow (end to end)

```
pg_cron / Vercel Cron (weekly)
  └─► drift-detector edge fn
        ├─ fetch each claim's source_url
        ├─ Claude: drifted? confidence? what changed? (Haiku bulk → Sonnet on hits)
        ├─ web search for net-new guidance
        └─► save_context → Grandma space / Content-Review folder   ← Tier 3
                                   │
                          human (clinician) reviews in Skeleton
                                   │ approve
                                   ▼
                     UPDATE clinical_content                        ← Tier 1
                       set value, clinician_signed_off=true,
                           last_verified_at=now()
                                   │
                                   ▼
                     app React Query refetch → live, no app release
```

## Build order & rough effort

1. **Tier 1** — table + seed migration + React Query fetch-with-fallback wired into the ~14 clinical files. Medium. Unblocks live corrections immediately (would have made the 26 fixes shippable without a build).
2. **Tier 3 plumbing** — the `save_context`-to-Grandma step + the approve→update path. Small (reuses Skeleton patterns).
3. **Tier 2** — the cron + detector edge function + prompt + batching. Medium. The "intelligence."

Tier 1 alone already delivers value (hot-fix clinical content). Tier 2+3 add the proactive detection.

## Risks & guardrails

- **False sense of coverage:** if the detector silently skips rows (rate limit, dead URL), log it loudly in the review doc — a clean run must say "N claims checked, M unreachable," never imply full coverage it didn't achieve.
- **Source-URL rot:** cited URLs move (we already hit the legacy WHO URL). Detector should flag a 404 as its own review item.
- **Over-trusting the LLM summary:** the review doc shows the agent's reasoning + the raw source excerpt, so the human checks the source, not the model's paraphrase.
- **Country variance:** schedules differ by country (vaccines especially). The table needs a `country`/`region` dimension before this is truly correct for non-US users — call it out at Tier 1 schema time.

## Out of scope (for now)

- Auto-publishing anything.
- Replacing the bundled `lib/*.ts` fallback (keep it as the offline safety net forever).
- The internal-dashboard surface (Skeleton chosen instead).

---

_Design only. When ready to build, Tier 1 is the first plan._
