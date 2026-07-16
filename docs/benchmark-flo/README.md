# Flo Benchmark — Competitive Analysis for grandma.app

This folder is a **screen-by-screen teardown of the Flo iOS app** (the market-leading cycle + pregnancy tracker), used as a competitive benchmark for grandma.app.

**Why Flo?** Flo is the specialist leader in two of our three journeys — cycle/fertility (pre-pregnancy) and pregnancy. grandma.app covers the **full journey** (pre-pregnancy → pregnancy → kids 0–5y) plus a care-circle. The goal of this benchmark is **not to copy Flo**, but to (1) learn the strongest patterns from the category leader on the two journeys we share, and (2) confirm we ship a **superset** — everything Flo does well, at least as well, plus the kids journey and multi-caregiver model they don't have.

**Scope:** 310 Flo screens across 14 product areas were transcribed (text inventory, UI structure, flow & logic per screen), then cross-checked against grandma.app's actual codebase.

---

## How to read this folder

Start here, in order:

1. **`SUPERSET_GAP_AUDIT.md`** ⭐ — **the current source of truth.** Full, code-verified gap audit of every product area, with a 3-tier model (🔴 broken/misleading stubs · 🟠 absent capabilities · 🟢 where we're ahead), a phased roadmap, and the resolved product decisions (community model, PDF export, etc.). **Read this first.**
2. **`ADAPTATION_PLAN.md`** — the original Flo→grandma pattern catalog (18 sections mapping every Flo pattern to a grandma.app opportunity). Reference material behind the audit.
3. **`CROSS_CHECK_GAP_ANALYSIS.md`** — an earlier, polish-focused gap pass. **Superseded** by `SUPERSET_GAP_AUDIT.md`; kept for history.

### Raw Flo teardowns (per product area)
The `NN-*.md` files are the primary source: literal screen-by-screen documentation of Flo. Cite these when you need the exact Flo behavior behind a recommendation.

| # | Doc | Area | Screens |
|---|-----|------|---------|
| 01 | `01-onboarding-all.md` | Onboarding (splash → consent → demographics → mode branch → multi-selects → cycle entry → permissions) | 45 |
| 02 | `02-pregnancy-mode.md` | Pregnancy mode (week ring hero, symptom triage, partner tab, mode entry/exit) | 21 |
| 03 | `03-logging-taxonomy.md` | Logging taxonomy (16+ loggable categories, chip-grid UX, batch apply) | 32 |
| 04 | `04-partners.md` | Flo for Partners (invite/pair/share, what partner sees, education modules) | 22 |
| 05 | `05-health-assistant.md` | AI health assistant (templated symptom triage, liability framing) | 18 |
| 06 | `06-paywall.md` | Paywall & subscription (trial toggle, annual framing, Friends Plan, winback) | 9 |
| 07 | `07-auth.md` | Auth (Apple > Google > email, post-auth mode branching) | 7 |
| 08 | `08-home.md` | Home / Today (prediction hero, metrics, insights carousel, nav) | 27 |
| 09 | `09-calendar.md` | Calendar (phase color coding, edit mode, prediction flow, year heatmap) | 8 |
| 10 | `10-insights-content.md` | Insights & content (expert bios, articles, video, log-triggered surfacing) | 30 |
| 11 | `11-community.md` | Secret Chats / community (anonymity, polls, moderation, expert sessions) | 40 |
| 12 | `12-settings.md` | Settings, profile & account (IA, lifestyle baselines, premium toggles) | 28 |
| 13 | `13-health-report.md` | Health report (doctor-friendly PDF export, multi-cycle comparison) | 11 |
| 14 | `14-help-legal.md` | Help, about & legal (FAQ hub, privacy transparency, legal TOC) | 12 |

---

## Key takeaways (see `SUPERSET_GAP_AUDIT.md` for the full picture)

- **🔴 We ship broken trust features** — delete-account, privacy consent, notifications, and unit toggles are stubs that silently no-op. Fixing these is Phase 0 (before any new features).
- **🟠 Biggest true gaps:** no doctor PDF export, thin data/privacy suite (no DSAR/app-lock/in-app legal), community lacks a safety layer (no report/block/guidelines) and anonymity.
- **🟢 Where we already lead Flo:** full 3-journey coverage (they have no kids mode), granular care-circle roles (theirs is binary read-only), generative Guru Grandma AI (theirs is canned trees).
- **Superset wins to press:** pediatric doctor-report + growth percentiles (impossible for Flo), and an anonymous community forum *alongside* real-name care-circle chat.

---

*Benchmark captured 2026-07-15/16. Flo screens sourced via Mobbin (Mar 2024 build). Decisions of record are in `SUPERSET_GAP_AUDIT.md`.*
