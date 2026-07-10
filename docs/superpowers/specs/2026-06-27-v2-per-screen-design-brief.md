# v2 Design System — Per-Screen, Per-Behavior Design Brief

**Date:** 2026-06-27
**Purpose:** Force complete coverage. The [handoff contract](2026-06-27-v2-design-system-handoff-contract.md) defines the *tokens/components* shape. This brief defines the *surfaces* — every screen, modal, chart, and form, per behavior — so Claude Design designs every concrete element **in context** and can self-check that nothing (no icon, chart, popup, card) is missing.

Hand Claude Design **both** docs: the contract (what tokens/components must contain) + this brief (every surface those components must cover).

Behavior keys: **Cycle** = pre-pregnancy (`pre`), **Pregnancy** (`preg`), **Raising** = kids (`kids`).

---

## How Claude Design should use this

For **each surface** listed below, Claude Design must produce a **screen sheet** containing:

1. **Layout** — the arrangement of sections at the behavior's personality (font/color/surface from the contract).
2. **Element manifest** — an explicit list of every element on that surface: each card, each icon (named), each chart (typed), each button, each badge, each empty/loading state.
3. **States** — default, loading, empty, error, and (where relevant) caregiver/view-only.
4. **Per-behavior delta** — what differs from the same surface in another behavior (this is the whole point of v2).

A surface is "done" only when its element manifest has **zero `…etc`** — every icon named, every chart typed, every modal listed.

---

## Coverage rule (the anti-miss mechanism)

Claude Design must, at the end, produce a **coverage matrix**: rows = every surface in this brief, columns = `[layout ✓] [all elements named ✓] [all states ✓] [per-behavior delta ✓]`. Any unchecked cell is a gap to fill before handoff. This is the single most important instruction — it's what guarantees nothing is missed.

---

## BEHAVIOR 1 — CYCLE (pre-pregnancy)

Personality: clinical · precise · calm. Display = Space Mono. 4-phase palette.

### Tab surfaces
- **Home** (`CycleHome`): HomeGreeting · CycleJourneyRingFull (animated phase wheel + cycle day) · DailyNudgeCard · MoodSymptomStrip · CycleTodaySummaryCard · CyclePillarsGrid (2×2 + See all).
- **Agenda** (`CycleCalendar`): month/week view, day cells, log-tap affordance, week strip, date-range pills.
- **Library**: Grandma Talk (cycle-aware) — shared shell, cycle accent.
- **Vault → Analytics** (`CycleAnalytics`): phase-flow chart · fertility curve · mood/symptom stats · pillar collage.
- **Settings**: shared Profile + cycle row.

### Modals / popups
- CycleTodayDashboardModal · FertileWindowModal · CycleDetailSheets (mood / symptom / flow deep-dives) · LogSheet wrapper.

### Charts
- CyclePhaseRing · PhaseFlowChart (fertility curve, "you are here") · MoodBubbleCluster · symptom HeatmapGrid · MiniBar/MiniLine.

### Log forms
- Mood · Symptoms · Flow · Period · inline MoodSymptomPickerSheet.

### Pillars
- 5 (`lib/prePregPillars.ts`) — grid tile + pillar detail.

---

## BEHAVIOR 2 — PREGNANCY

Personality: warm · serif + mono dates. Display = Fraunces, dates = Space Mono. Plum + cream warm palette.

### Tab surfaces
- **Home** (`PregnancyHome`): HomeGreeting · BabyHeroCarousel (weeks 1–40, swipeable) · AffirmationRevealCard · TodaySummaryCard (merged tracker) · RemindersSection + PregnancyUserReminders · SlimRow ×3 (weight / birth guide / Ask Grandma).
- **Agenda** (`PregnancyCalendar`): week/day view, log picker, week strip.
- **Library**: Grandma Talk (pregnancy-aware).
- **Vault → Analytics** (`PregnancyAnalytics`) + Exams entry.
- **Settings**: shared Profile + week/due-date row.

### Modals / popups
- WeekDetailModal (illustration + development + trimester + deep-dives) · TodayDashboardModal (all today's logs) · AppointmentDetailModal · BirthGuideModal (4 birth-type tiles + topics) · BirthDetailModal · AffirmationShareModal (the 6 clean templates) · WeightDetailModal · LogSheet wrapper.

### Charts
- BabyHeroCarousel (illustrated size per week) · PregnancyJourneyRing (trimester) · WeightTrendCard (sparkline + target band) · MiniBar/Line (water, vitamins, kegel) · HealthScoreRing.

### Log forms (11)
- Mood · Symptoms · Appointment · KickCount · Sleep · Weight · Water · Exercise · Vitamins · Kegel · Nutrition/Meal.

### Pillars
- `lib/pregnancyPillars.ts` — analytics collage + pillar detail.

### Routes
- `/birth-plan` · `/exams` · `/pillar/[id]`.

---

## BEHAVIOR 3 — RAISING (kids)

Personality: playful · handcraft · doodles. Display = Caveat, accent = Patrick Hand. 6 crayon hues. **New fonts + new doodle icon set = real net-new work.**

### Tab surfaces
- **Home** (`KidsHome`): HomeGreeting · MultiRingProgressHero (sleep/calories/activity + range picker) · MiniMetricRings · MetricCard ×6 (Sleep · Mood · Health · Activity · Feeding · Diaper) · GrowthPercentileChart · VaccineScheduleSection · GrowthLeapCard · MilestonesStrip · GoalCard · RemindersStrip.
- **Agenda** (`KidsCalendar`): month/week, multi-child, log picker.
- **Library**: Grandma Talk (kids-aware).
- **Vault → Analytics** (`KidsAnalytics`) + Exams entry.
- **Settings**: shared Profile + kids rows.

### Modals / popups (14+)
- DiaperDetailModal · MoodDetailModal · SleepDetailModal · HealthDetailModal · ActivityDetailModal · ActivitiesDetailModal · ActivityBreakdownModal · VaccineInfoModal · GoalSettingModal · RemindersModal · LeapDetailModal · PillarDetailModal · TipDetailModal · RoutineComplianceModal · LogSheet wrapper.

### Charts
- KidsJourneyRing (multi-segment) · GrowthPercentileChart (height/weight curves) · MoodBubbleCluster · VaccineTimeline · MilestoneTimeline · ActivityBreakdown (pie) · FeedingBreakdown (breast vs bottle) · SleepQualityChart · MiniBar/Line.

### Log forms (12+)
- Mood · Sleep · Feeding (Breast L/R/Both · Bottle ml · Mixed) · Activity (Outdoor/Indoor/Screen/Sports/Learning/Tummy/Social) · Nutrition · Temperature · Medication · Milestone · Photo · Note · Diaper · Water · Vaccine · Supplement.

### Pillars
- `lib/pillars.ts` (Breastfeeding · Feeding · Sleep · Health · Development · Emotions…) — analytics grid + pillar detail.

### Routes
- `/child-picker` · `/profile/kids` · `/profile/memories` · `/profile/health-history` · `/exams` · `/pillar/[id]`.

---

## BEHAVIOR 4 — CAREGIVER (scoped view)

Personality: inherits the active child's behavior, with **view-only / permission-gated** affordances (hidden, not disabled).

- **Home** (`CaregiverHome`): CaregiverChildPicker · child identity header + role badge · "Log the day" CTA (capability-gated) · NannyUpdatesFeed.
- **Modal**: CaregiverLogSheet (simplified, permission-gated).
- Design the **view-only state** of every shared surface (no edit buttons, read-only content).

---

## SHARED ACROSS ALL BEHAVIORS

These render the same shell for every behavior; they pick up the **active behavior's accent/font** but layout is identical. Design once, show how the accent swaps.

- **Onboarding:** journey picker · cycle/* · pregnancy/* · kids/* · transition.
- **Profile/Account (12):** personal · account · privacy · settings · notifications · care-circle · pregnancy · kids · memories · health-history · emergency-insurance · badges.
- **Grandma Talk:** chat shell · message bubbles · history panel · pillar-context chips.
- **Connections:** Channels (list · detail · create · thread) · Garage (detail · create · share · profile).
- **Records/Vault:** `/exams` · DocumentUpload · DocumentSection · VaccineRecord.
- **Care circle:** accept-invite · invite-caregiver · manage-caregivers · connections.
- **Utility:** dev-panel · scan · airtag-setup · daily-rewards · leaderboard · notifications · insights (ArticleDetailModal · InsightDetailModal) · paywall.
- **Shared modals:** AvatarPickerModal · StickerDateModal · CustomRangeModal · ArticleDetailModal · InsightDetailModal.
- **Shared chart primitives:** LineChart · BarChart · HeatmapGrid · BubbleGrid · DotTimeline · HealthScoreRing · BigChartCard · MiniBar/MiniLine · MiniStatTile · PeriodSelector.

---

## The doodle-icon coverage list (must be designed for all behaviors)

Every icon used anywhere in the app must exist in the new single-stroke doodle set, stroke = behavior accent. Design each at the canonical size + state (static/animated):

heart · star · sun · cloud · rain · moon · flower · sparkle · smiley · sprout · bolt · music · house · gift · paw · rainbow · cherry · bell · check · zzz · umbrella · mug · arrow · bow · drop · leaf · bubbles · pill/medicine · cross/health · weight/scale · water-drop · kick/foot · kegel · diaper · bottle · breast · temperature · milestone · camera/photo · note · vaccine/syringe · calendar · clock · ring/progress.

(Cross-check this against `components/stickers/RewardStickers.tsx`, `components/ui/Stickers.tsx`, `components/stickers/LineIcons.tsx` — every existing icon must map to keep / restyle / replace.)

---

## Final instruction for Claude Design (paste this verbatim)

> Using the handoff contract + this per-screen brief, produce a **screen sheet for every surface listed**, grouped by behavior then shared. For each surface: (1) the layout at that behavior's personality, (2) an **element manifest** naming every card, icon, chart, button, badge, and empty/loading/error state — with **zero `…etc`**, (3) all states including caregiver view-only where relevant, (4) the per-behavior delta vs the other behaviors.
>
> Then produce a **coverage matrix**: one row per surface in the brief, columns `[layout][elements named][states][delta]`, every cell checked. Also produce an **icon coverage table** mapping every icon in the doodle list (and every existing app sticker) to keep / restyle / replace. Do not finish until every matrix cell and every icon row is resolved — list any you couldn't resolve as open questions rather than silently dropping them.
