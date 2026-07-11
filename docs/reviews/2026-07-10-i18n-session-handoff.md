# Session Handoff — Trilingual Localization (pt-BR / en / es)

**Date:** 2026-07-10 · **Branch:** `main` · **Working tree:** shared with a concurrent design-system agent ("Diffuse" reskin) — never commit its files.

---

## TL;DR

The app is now genuinely trilingual (English, Brazilian Portuguese, Spanish). Started from a mostly-hardcoded-English app; built the full i18n system, extracted ~2,650 UI keys, translated pt-BR + es to ~96% coverage, and stood up runtime translation for long-form prose. A live pt-BR device test surfaced three gap classes — all fixed.

**Current coverage:** pt-BR **2,557 translated / 94 language-neutral / 0 missing**; es **2,550 / 101 / 0**. Total registry: **2,651 keys**. Parity ✓ across all 12 locale files.

---

## What shipped this session (in order)

### Phase A — i18n system & guardrails
- **Key-parity guard** — `scripts/i18n-check.ts` + `npm run i18n:check`. Verifies every locale has all *required* keys of `en` (ignores optional `?:` keys).
- **Tolgee CLI wiring** — `.tolgeerc.json` + `scripts/i18n-export-en.ts` / `i18n-import.ts` + `npm run i18n:push|pull|sync`. NOTE: **Tolgee was never actually connected** — we translated via Claude directly instead (see below). The Tolgee scripts remain as an optional future path.
- **ESLint `no-literal-string` guard** — `eslint.config.js` (set up from scratch; project had no ESLint). Covers all `app/**` + `components/**`, excludes assets/dev/`.claude/`. Makes new hardcoded UI strings fail lint. Runs in `jsx-text-only` mode (see caveat below).

### Phase B — UI string extraction
- Extracted every user-facing literal across all 3 journey modes (pre-pregnancy, pregnancy, kids) + shared screens through `t()`. Registry grew 562 → ~2,100 keys.
- A full-surface lint-guard widening (B7) revealed a residual tail of ~729 strings the narrow per-file passes missed; cleared to ~18 (all genuine multi-sentence medical prose → Phase C).

### Phase C — Long-form prose (runtime translation, LIVE in production)
- **`content_translations` table** — migration `20260705120000`, applied to remote. `(content_key, locale)` unique, `source_hash` for cache invalidation, RLS read-for-authenticated / service-role writes only.
- **`translate-content` edge function** — deployed `--no-verify-jwt`. Claude Haiku, hash-keyed cache, preserves markdown/`{{vars}}`/clinical names, English passthrough. Smoke-tested (pt-BR round-trip + cache hit + en passthrough all pass).
- **`useTranslatedContent(contentKey, sourceText)` hook** — `lib/useTranslatedContent.ts` (+ pure resolver `lib/translatedContentResolve.ts`, 4 unit tests). Wired into: birth guide (`BirthDetailModal`), appointments (both `AppointmentDetailModal`s), `WeekDetailModal`, pillar detail (`app/pillar/[id]`).

### Language picker trimmed
- `SUPPORTED_LANGUAGES` in `store/useLanguageStore.ts` → only `en`, `pt-BR`, `es`. The other 9 moved to `UPCOMING_LANGUAGES` (hidden). Device auto-detect + persisted-but-removed language fall back to English. (Commit `5d6b061`)

### The pt-BR test bug-fix pass (the last big chunk)
A live device test in Portuguese showed mixed pt/en everywhere. Root-caused to **three classes** (full map: `docs/reviews/2026-07-06-i18n-gap-audit.md`):

1. **Untranslated placeholders (90% of it)** — ~2,300 keys were English placeholders; the AI-translate step had never run. **Fixed** with `scripts/i18n-fill-translations.ts` (batch Claude translate, preserves `{{placeholders}}`, skips brand/units/symbols, idempotent). Commits `6fa53d1` (pt-BR 2272 keys), `c13b0fd` (es 2274 keys).
2. **Hardcoded strings the guard missed** — radial "where to" menu subtitles (`_layout.tsx`, excluded from glob) + cycle-ring phase labels/notes (`return 'rising day'` — non-JSX-child literals). **Fixed** commit `cfe37f6`.
3. **Data-array values** — 45 badge names + descriptions in `BADGE_DEFS`. **Fixed** with `badgeName/badgeDesc(id, t)` resolvers + `badge_<id>_name/_desc` keys, wired the CONQUISTAS strip + badge wallet. Commit `545db75`.

---

## Key files & where things live

| Concern | Location |
|---|---|
| Key registry (types) | `lib/i18n/keys.ts` |
| Locale values | `lib/i18n/{en,pt-BR,es,…}.ts` |
| Translate hook | `lib/useTranslatedContent.ts` (+ `translatedContentResolve.ts`) |
| Parity guard | `scripts/i18n-check.ts` · `npm run i18n:check` |
| Bulk fill script | `scripts/i18n-fill-translations.ts` · `npx tsx scripts/i18n-fill-translations.ts <locale>` |
| Lint guard | `eslint.config.js` · `npm run lint` |
| Edge function | `supabase/functions/translate-content/index.ts` |
| Cache table migration | `supabase/migrations/20260705120000_content_translations.sql` |
| Bug map | `docs/reviews/2026-07-06-i18n-gap-audit.md` |

---

## How to work with this going forward

- **Add a new UI string:** add the key to `keys.ts` + `en.ts`, add English placeholder to all other locales (or the lint guard / typecheck will complain), then run `npx tsx scripts/i18n-fill-translations.ts pt-BR && npx tsx scripts/i18n-fill-translations.ts es` to fill the new keys (it's idempotent — only touches untranslated ones). Commit per language.
- **Long-form prose (a new pillar body, birth-guide topic, etc.):** wrap the render with `useTranslatedContent(stableIdKey, englishText)` — it translates at runtime + caches. No key needed.
- **Enable another language later** (e.g. French): move its entry from `UPCOMING_LANGUAGES` back into `SUPPORTED_LANGUAGES`, then run the fill script for `fr`. That's it — the locale file + engine already support it.

---

## Open / follow-up work (not done)

1. **Bug-3 long tail (low visibility):** GrandmaTalk quick-chips (~18) and growth-leap `signs`/`skills` arrays (~22) in `components/chat/GrandmaTalk.tsx` / `lib/growthLeaps.ts` / `components/home/KidsHome.tsx`. **Left deliberately** — those files are actively owned by the concurrent Diffuse design agent; touching them risked collisions. Wire them once that work settles.
2. **Harden `scripts/i18n-fill-translations.ts`:** its parser is line-anchored, so it silently drops keys when multiple keys are crammed onto one line (this happened once with `cycleRing_note_*` — caught by the parity check, fixed manually). Make the parser tolerant of multi-key lines, or normalize locale files to one-key-per-line before running.
3. **Lint guard is `jsx-text-only`** — it can't catch hardcoded strings in data arrays, `title=`/`label=` object literals, or non-JSX-child returns. Consider a targeted `mode: 'all'` pass over known data files, and add a `npm run i18n:untranslated` report (lists keys where a locale value === en value) since the guard can never detect a placeholder.
4. **Tolgee** is wired but unused. If you want human review / a translation dashboard, connect a Tolgee Cloud project (`docs/i18n-tolgee.md`); otherwise the Claude fill script is sufficient.
5. The other 9 `UPCOMING_LANGUAGES` are English placeholders. Run the fill script per language when you decide to ship any of them.

---

## Concurrent-agent note

A separate "Diffuse" design-system agent has been committing throughout (see the many `design(diffuse): …` commits interleaved with the i18n ones). It touches `theme.ts`, `PillButton`, `StickerButton`, `SvgCharts`, `KidsHome`, `KidsCalendar`, the `diffuse/` components, etc. **None of the i18n work touched those files.** If `npm run tsc` shows an error in a file you didn't change (e.g. a mid-edit `KidsCalendar.tsx`), it's likely theirs in-flight — verify before "fixing."

---

## Verification snapshot (at handoff)

- `npm run i18n:check` → ✓ All locales in parity with en
- Every i18n file: 0 tsc errors, 0 `no-literal-string` violations
- `content_translations` live on remote; `translate-content` deployed + smoke-tested
- pt-BR 2,557 translated / es 2,550 / 0 missing each
- Full SDD ledger: `.superpowers/sdd/progress.md`
