# Menopause Behavior — E1 Foundation — Design

**Date:** 2026-07-25
**Status:** Approved (pre-implementation)
**Epic:** E1 of the Menopause feature (foundation / the destination behavior)

## Context

grandma.app covers the female-life journey Pre-Pregnancy(Cycle) → Pregnancy →
Kids as multi-enrollable **behaviors** (`useBehaviorStore`, `useModeStore`,
`lib/modeConfig.ts`). We are adding **Menopause** as a fourth behavior, attached
to the Cycle lineage but with its own logs and content.

The full feature decomposes into four epics:

- **E1 (this spec)** — the destination behavior: enrollment plumbing, direct
  onboarding, data model, symptom logging, home, basic analytics, Dev Panel.
- **E2** — signal engine + gentle non-clinical transition from Cycle.
- **E3** — education/content: pillars, daily content, Grandma AI context, LLM insights.
- **E4** — HRT/treatment tracking + long-term (bone/heart) health.

E1 ships as a usable standalone experience for women who onboard directly. E2–E4
build on top and are **out of scope here**.

## Clinical guardrail (non-negotiable, applies to every part of E1)

The app **must never diagnose**. It never states "you are in perimenopause/
menopause." Stage is **always self-identified by the user** and always editable.
The only computed metric is the **factual** "months since last period"; at 12
months the app *offers* a stage update the user must confirm — it never flips a
clinical label silently. Copy stays warm, inclusive, and non-prescriptive, and
points to a clinician for medical questions. (Same stance as the vaccine-tracker
reframe.)

## 1. Behavior identity

- Internal id: `menopause`. Unions extended:
  `JourneyMode` / `Behavior` → `'pre-pregnancy' | 'pregnancy' | 'kids' | 'menopause'`
  (`types/index.ts`, `store/useModeStore.ts`, `store/useBehaviorStore.ts`).
- DB: `behaviors` table CHECK constraint gains `'menopause'` (idempotent
  migration). Behavior↔DB mapping is 1:1 (`'menopause'`), unlike the
  pre-pregnancy→`'cycle'` remap; no alias needed.
- ModeSwitcher gains a 4th pill **"Menopause"** after Cycle · Expecting · Raising
  (`components/home/ModeSwitcher.tsx` `MODES` array), with the same
  enrolled/locked affordance (locked → `/onboarding/journey` add flow).
- New **mode color** token (Cycle=rose `#E58BB4`, Preg=lavender, Kids=blue) — a
  warm ember/amber, added to `constants/theme.ts` brand palette and wired into
  `getModeColor(mode, isDark)`. Exact hex confirmed with design before build;
  the plan uses a named token, never a raw literal in components.
- Boot logic (`app/_layout.tsx`) already restores enrolled behaviors from the
  `behaviors` table and coerces the active mode — it must include `menopause` in
  its allowed set.

## 2. Stage state machine

- `stage: 'peri' | 'meno' | 'post'`, stored on `profiles.menopause_stage`
  (single source of truth, alongside `last_period_date`), surfaced/editable in
  settings + onboarding.
- Factual metric: **months since last period**, derived from
  `last_period_date` (on the profile) and, for peri, the latest `period` event
  in `menopause_logs`.
- At ≥12 months with no period, the home surface shows a **non-blocking prompt**:
  "It's been 12 months since your last period — many people consider this
  menopause. Update your stage?" → user confirms (sets `meno`) or dismisses.
  Never automatic.
- `useMenopauseStore` (Zustand, mirrors the cycle store patterns) holds
  `stage`, `lastPeriodDate`, and a `hydrated` flag with `onRehydrateStorage`
  (per the project hydration-gate rule). Stage/date persist to Supabase and are
  the source of truth; the store hydrates from server on boot.

## 3. Data model — `menopause_logs`

New migration `supabase/migrations/<ts>_menopause_logs.sql`:

```
menopause_logs
  id         uuid pk default gen_random_uuid()
  user_id    uuid not null references auth.users on delete cascade
  date       date not null                       -- local date (toDateStr)
  type       text not null                        -- see taxonomy below
  value      text                                 -- free/enum text (e.g. flow level)
  severity   smallint                             -- 1..5, null for events
  notes      text
  created_at timestamptz default now()
```

- RLS enabled; owner policy `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`.
- Indexes on `user_id`, `date`, `created_at`. `ON DELETE CASCADE`.
- Ends with `NOTIFY pgrst, 'reload schema';`.
- Profile gains `last_period_date date` and `menopause_stage text` columns
  (idempotent `ADD COLUMN IF NOT EXISTS`), used by the stage machine.
- "Attached to Cycle": E1 stores its own data; E2 will seed/reference
  `cycle_logs` at transition time. No cross-table coupling in E1.

## 4. Symptom taxonomy (`lib/menopauseSymptoms.ts`)

Curated set, each logged with **severity 1–5** + optional note (mirrors the
14-symptom cycle taxonomy pattern in `lib/cycleSymptoms.ts`):

| Group | `type` values |
|---|---|
| Vasomotor | `hot_flash`, `night_sweat` |
| Sleep/energy | `sleep`, `fatigue` |
| Mood/cognitive | `low_mood`, `anxiety`, `brain_fog` |
| Physical | `joint_pain`, `headache`, `palpitations`, `weight` |
| Genitourinary | `vaginal_dryness`, `libido` |
| Peri-only event | `period` (value = flow/spotting level; no severity) · `note` |

- A `MenopauseSymptomId` union + display metadata (label, group, icon/sticker,
  optional stage relevance) live in `lib/menopauseSymptoms.ts`, with a
  `resolveSymptomId()` normalizer like the cycle one.
- Users pick which symptoms to track in onboarding; all remain available in the
  full log sheet.

## 5. Direct onboarding (`app/onboarding/menopause/`)

Warm, minimal, non-clinical flow; ephemeral `useMenopauseOnboardingStore`
(non-persisted, cleared on finish — mirrors `useCycleOnboardingStore`):

1. **Intro** — what this space is (support + tracking, not diagnosis).
2. **Stage self-select** — peri / meno / post, plain-language descriptions.
3. **Last period date** — for peri/meno; "unknown / long ago" option; skipped for post.
4. **Pick symptoms to track** — multi-select from the taxonomy.
5. **On HRT/treatment?** — simple yes/no (full HRT tracking is E4; E1 just stores the flag).
6. **Finish** — upsert `behaviors` (DB) + `profiles` (stage, last_period_date) →
   `useBehaviorStore.enroll('menopause')` → `setMode('menopause')` → clear store.

Slots into the multi-behavior onboarding queue: add `menopause` to `PRIORITY`
in `useOnboardingStore.ts`, and to the journey-selection screen.

**Deferred (not built in E1, copy stays inclusive):** surgical / medical /
premature-menopause nuance (a later "how did you get here?" field).

## 6. Menopause home (`components/home/MenopauseHome.tsx`)

Reuses existing home primitives (Quick-Log Kit, `PaperCard`, sticker system).
Mounted by the home screen when `mode === 'menopause'` (branch on `useModeStore`,
same pattern as `KidsHome`/`CycleHome`).

- **Hero:** current stage label + **"months since last period"** counter (calm,
  factual, non-diagnostic) + the 12-month stage-update prompt when applicable.
- **Quick-log row:** the user's picked symptoms → one tap → severity 1–5 sheet
  (reuse the friendly Quick-Log Kit / slider pattern; `StepSlider` for severity).
- **Today / recent** summary card of what's been logged.
- **Grandma Wisdom** card — one stage-appropriate line (static seed in E1; E3
  deepens content).
- **(Peri only)** a light "log a period" affordance (records a `period` event
  and updates `last_period_date`).

## 7. Symptom log sheet + agenda

- A log sheet (reuse `LogSheet` + the shared slider forms) for the full taxonomy:
  pick symptom → severity 1–5 → optional note → save to `menopause_logs`
  (`toDateStr(new Date())` for `date`, per the local-date rule).
- Agenda tab shows a menopause symptom **timeline** (mirrors the kids/cycle
  agenda timeline), reading `menopause_logs`.

## 8. Basic analytics (`components/analytics/MenopauseAnalytics.tsx`)

Deterministic client-side stats (mirrors `CycleAnalytics` / `lib/cycleAnalytics.ts`;
**LLM insights are E3**). Mounted in the vault tab slot (repurposed as Analytics,
exactly as Cycle does — see modeConfig below).

- **Symptom frequency + severity trend** over time (top symptoms, direction over weeks).
- **Vasomotor headline** chart — hot flash / night sweat frequency over time.
- **Sleep & mood** trend.
- **Months-since-last-period** timeline (peri).
- New `lib/menopauseAnalytics.ts` with pure hooks over the full `menopause_logs`
  history, plus a `fetchBehaviorMetrics`-style lightweight readout keyed to the
  `menopause_logs` table (extend `lib/insights.ts`'s table switch).

## 9. modeConfig (`lib/modeConfig.ts`)

Add the `menopause` entry to `MODE_CONFIGS` (TypeScript forces exhaustiveness):

- **tabs:** index(home), agenda(symptom timeline), **vault slot repurposed as
  Analytics** (`MenopauseAnalytics`), settings. **Library + Exchange hidden**
  until E3.
- **agendaTabs:** a single `symptoms` (timeline) sub-tab in E1.
- **pillars:** empty in E1 (E3 adds the pillar set).
- **aiContextLabel:** a menopause label (Grandma prompt wiring itself is E3, but
  the label constant is added here).

## 10. Dev Panel (`app/dev-panel.tsx` + `lib/devSeed.ts`) — REQUIRED in E1

So every visual/state is inspectable without real data:

- **MODE section:** add a `ModeButton target="menopause" label="Menopause"`.
- **ENROLLMENT section:** `menopause` auto-appears in the behaviors toggle list
  (it iterates the behavior union) — verify it renders and toggles.
- **New "MENOPAUSE" Section** with:
  - **Seed menopause data** button → `seedMenopauseData()` in `lib/devSeed.ts`
    (inserts several weeks of realistic symptom logs across the taxonomy + a
    couple of `period` events; wipes existing `menopause_logs` first, like
    `seedCycleData`). Include it in `seedAllData()` and `wipeAllDemoData()`.
  - **Stage picker** — buttons to force `stage` = peri / meno / post.
  - **Months-since-last-period scrubber** — quick-set `last_period_date` to
    N months ago (e.g. 3 / 6 / 12 / 14) to exercise the hero counter + the
    12-month stage-update prompt.
  - **Jump to menopause onboarding** — routes into `app/onboarding/menopause/`.
- **`repairBehaviorsFromData`** extended: `menopause_logs` present → infer
  `menopause` enrollment.

## Non-goals (E1)

- Signal engine / auto-detection / transition from Cycle (E2).
- HRT & treatment detail, bone/heart long-term health (E4).
- Menopause pillars, library content, daily content rotation, Grandma AI prompt
  context, LLM-generated insights (E3).
- Surgical/medical/premature-menopause onboarding nuance (later).
- Community forum peri/menopause topic (separate Option-B forum epic).
- Vault documents / Exchange for this mode (hidden in E1 modeConfig).

## Testing / verification

- **Unit (jest-expo):** `lib/menopauseSymptoms.ts` (id resolution/metadata);
  `lib/menopauseAnalytics.ts` (frequency/severity/trend + months-since-period math);
  stage machine 12-month boundary logic.
- **Store:** `useMenopauseStore` hydration gate flips `hydrated`.
- **Manual (simulator):** Dev Panel → seed menopause data + set each stage +
  scrub months → verify home hero counter, 12-month prompt, quick-log, analytics
  charts render in both light/dark and both design variants; run the direct
  onboarding end-to-end and confirm enrollment + pill + mode switch.
- `npm run typecheck` clean (mode/behavior union exhaustiveness will surface any
  missed switch).
- RLS: a second user cannot read another's `menopause_logs`.

## Open items to confirm during planning

- Exact mode-color hex (design) — the plan uses a named theme token; the hex can
  be tuned without touching components.
