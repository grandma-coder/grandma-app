# Split Health Overview → Vaccine Tracker + Health Tracker — Design Spec

**Date:** 2026-07-19
**Status:** Approved design → ready for implementation plan
**Author:** Igor + Claude (brainstorm session)

---

## 0. Context

Today the Kids wallet "Health & Care" card opens a single `HealthDetailModal` (`components/home/KidsHome.tsx:5452`) titled **"Health Overview"** that crams together: Sleep quality · Growth percentile charts · Latest growth · Activity overview (Activities/Calories/feeding) · Allergies · Medications · Vaccine Schedule. It tries to be everything and reads as a grab-bag.

**Decision:** split it into **two focused trackers**, each with its own Kids wallet card:

1. **Vaccine Tracker** — the vaccine schedule/timeline only.
2. **Health Tracker** (new) — the medical-record side: allergies, medications, growth, and insights from exams.

Daily-metric sections (Sleep, Activity/Calories/feeding) are **dropped from both** — they already live on the Kids home stat tiles + analytics, so they're redundant here.

---

## 1. Goals

1. **Vaccine Tracker** = vaccine schedule only, in its own sheet, opened by a dedicated "Vaccines" wallet card.
2. **Health Tracker** (new) = allergies + medications + growth (latest + percentile charts) + exam insights, in its own sheet, opened by a "Health" wallet card.
3. **Drop** Sleep + Activity/Calories/feeding from these sheets entirely (home/analytics already cover them).
4. **Two Kids wallet cards** replace the single `health` card: `vaccines` + `health`.
5. Reuse the existing sheet shell (Diffuse + cream) and existing data/handlers — no new backend for the moved sections. The only net-new content is **exam insights**, sourced from the existing `exams` table.

### Non-goals

- No new AI edge function. Exam insights are a **simple readout** of existing `exams` data (recent exams + flagged findings + "See all exams" link), not an AI-generated summary. (AI summary is a possible future follow-up.)
- No change to how vaccines are stored/marked (`kids_vaccine_schedule` table + existing `onSetVaccineDate` / `onMarkVaccineGiven` handlers).
- No change to the caregiver-sharing model (both cards flow through the existing `visibleCards` filter; `health` is already a shareable card id, `vaccines` becomes a new one — see §6).
- Pregnancy/Cycle wallets are out of scope (this is a Kids-only surface).

---

## 2. The two sheets

### 2.1 VaccineTrackerSheet
- **Title:** `t('kids_vaccines_title')` = "Vaccines" · child-name chip.
- **Content:** the Vaccine Schedule section exactly as it renders today (milestone timeline: Birth / 1–2 months / 2 months …, each with dose rows, `0/1 · DUE SOON`, per-dose "Set date →" and mark-given). Preserve the existing `scheduledVaccines`, `onSetVaccineDate`, `onMarkVaccineGiven`, and the empty state (`kids_home_vaccine_schedule_empty`).
- **Nothing else.**

### 2.2 HealthTrackerSheet (new)
- **Title:** `t('kids_health_title')` = "Health" · child-name chip.
- **Sections (in order):**
  1. **Growth** — Latest growth (weight/height tiles) + the `GrowthPercentileChart`s (weight/height/head), gated as today (`child.sex` known + growth data + birthDate). Moved verbatim from the current modal.
  2. **Allergies** — the allergy chips + "+ Add" (routes to `/profile/kids`). Moved verbatim.
  3. **Medications** — the medications list (only when non-empty). Moved verbatim.
  4. **Exam insights** *(new)* — see §3.
- **Dropped:** Sleep card, Activity overview (Activities/Calories/feeding/total-volume), and their `activityBreakdown` sub-sheet.

### 2.3 Retire `HealthDetailModal`
The current `HealthDetailModal` is replaced by the two sheets. Its props split:
- Vaccine sheet needs: `child`, `childColor`, `scheduledVaccines`, `onSetVaccineDate`, `onMarkVaccineGiven`.
- Health sheet needs: `child`, `childColor`, `healthHistory` (for growth), and the new exam-insights query.
- Sleep/activity/feeding/calories props are **removed** (no longer rendered).

Both Diffuse and cream branches must be reproduced for each new sheet (the current modal has both; don't drop the cream path).

---

## 3. Exam insights (the only net-new content)

**Data source:** the existing `exams` table (`supabase/migrations/20260422000000_exams.sql`) — `title`, `result`, `notes`, `exam_date`, per `child_id`, plus AI-extracted structured fields (`testName`, `result`, `referenceRange`, flagged findings). Kids exams are scoped `behavior='kids'` + `child_id`.

**Readout (simple, no AI call):**
- **Recent exams** — the 2–3 most recent exams for the active child (title + date + result snippet).
- **Flagged findings** — surface any exam that carries flagged/abnormal findings (the `[id]` screen already renders "Flagged findings:" — reuse that same field). Show a small warning-toned row per flagged exam.
- **Empty state** — "No exams yet" + a "Log an exam" affordance.
- **"See all exams →"** — routes to `/exams?behavior=kids` (the existing exams screen).

**Implementation:** a `useKidsExamInsights(childId)` React Query hook in `lib/examData.ts` (or a thin wrapper over the existing exams query) returning `{ recent: Exam[]; flagged: Exam[] }`. Reuse the existing `Exam` type + fetch; do not add a table or edge function.

---

## 4. Wallet cards

Replace the single kids `health` card with **two** cards in `lib/kidsWallet.ts`:
- `vaccines` — tone e.g. `blue`, `linkOnly: true`. Icon: a vaccine/syringe Character (e.g. `Character name="vaccine"` if it exists, else the existing health-tree/shield glyph used for vaccines today).
- `health` — tone `green`, `linkOnly: true`. Icon: `Character name="health"` (heart), as today.

Order: keep them adjacent where `health` sits today (`essentials · goals · health · exams …` → `essentials · goals · vaccines · health · exams …`, or health then vaccines — pick one and update the builder test).

`KidsWallet.tsx` wiring:
- Add `showVaccines` + `showHealthTracker` state (or one `activeSheet`), open the matching sheet from `onHeader`.
- Add `iconFor` / `titleFor` / `softFor` cases for both `vaccines` and `health`.
- Render `<VaccineTrackerSheet/>` + `<HealthTrackerSheet/>`.
- The existing `onOpenHealth` callback (from `KidsHome`) splits into `onOpenVaccines` + `onOpenHealth` (or the sheets move into `KidsWallet` and own their state — preferred, since they're self-contained given the data props).

**Builder test** (`lib/__tests__/kidsWallet.test.ts`) updates to expect the new card id(s) in order.

---

## 5. i18n

New keys (added to `keys.ts` + all 13 locales, English fallback):
- `kids_vaccines_title` = "Vaccines"
- `kids_health_title` = "Health"
- `kids_health_exams_section` = "Exam insights"
- `kids_health_exams_empty` = "No exams logged yet."
- `kids_health_exams_seeAll` = "See all exams"
- `kids_health_exams_flagged` = "Flagged findings"
- `wallet_vaccines_title` = "Vaccines" (wallet card label; may reuse `kids_vaccines_title`)

Existing keys reused: `kids_home_health_vaccine_schedule`, `kids_home_vaccine_schedule_empty`, `kids_home_health_allergies`, `kids_home_health_medications`, `kids_home_health_latest_growth`, `kids_home_health_weight_label`, `kids_home_health_height_label`.

**Retired keys** (no longer rendered — leave in place to avoid churn, or remove in a cleanup): `kids_home_health_activity_overview`, `kids_home_health_activities_label`, `kids_home_health_sleep_quality_label`, `kids_home_health_calories_label`, `kids_home_health_feedings_label`, `kids_home_health_feeds_label`, `kids_home_health_total_volume`, `kids_home_health_overview_title`. (Keep for now; flag for a later i18n sweep.)

---

## 6. Caregiver sharing

- `health` is already a shareable card id in `lib/caregiverCards.ts` (`CAREGIVER_CARDS.kids`, tier `child-health`). Add `vaccines` there too (tier `child-health`).
- Update `roleDefaultCards` if vaccines should be in any default set (nanny/family). Recommend: `vaccines` NOT in defaults (medical), consistent with `health` not being in the nanny default today.
- The `KidsWallet` already filters `displayedIds` through `visibleCardIds` — both cards flow through it automatically once added to the vocabulary.
- PHI note: allergies/medications/growth/exams are PHI. They already only render for a caregiver with the emergency/edit_child grant via the boot RPC masking (allergies/medications come off `child`, which is masked). Exam insights query must respect RLS (the `exams` table has its own RLS) — do NOT bypass it; the query runs under the caregiver's session and returns nothing if unauthorized.

---

## 7. Build order (for the plan)

1. **Exam insights data** — `useKidsExamInsights(childId)` in `lib/examData.ts` (+ a pure mapper unit-tested; recent + flagged split).
2. **VaccineTrackerSheet** — extract the vaccine-schedule render (both Diffuse + cream) into its own component; wire vaccine props.
3. **HealthTrackerSheet** — new component: growth + allergies + medications (moved) + exam-insights section (both branches).
4. **Wallet builder** — split `health` → `vaccines` + `health` in `lib/kidsWallet.ts` (+ test).
5. **KidsWallet wiring** — icon/title/soft/onHeader for both; render both sheets; retire `onOpenHealth`→ two openers (or sheet-owned state).
6. **Retire `HealthDetailModal`** — remove it + the sleep/activity props threading from `KidsHome`; drop the `activityBreakdown` sub-sheet.
7. **caregiverCards** — add `vaccines` to the kids vocabulary.
8. **i18n** — new keys across 13 locales.
9. **Verify** — typecheck + tests (wallet builder test, exam-insights mapper test) + manual walk via dev.

---

## 8. Risks / notes

- **Concurrent session churn:** `KidsHome.tsx`, `KidsWallet.tsx`, `lib/kidsWallet.ts`, i18n are all hot files another session edits. Implement in **small per-file commits** and stage by explicit path (a `git checkout` on main wiped uncommitted work earlier this session — commit frequently).
- `HealthDetailModal` is large and has both Diffuse + cream branches; the split must preserve both. Extract carefully; verify the cream path isn't dropped.
- Sleep/activity props removed from the modal must also be removed from the call site in `KidsHome` to avoid unused-var / dead-data — but check nothing else consumes those computed values.
