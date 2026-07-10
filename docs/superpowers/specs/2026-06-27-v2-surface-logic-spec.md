# v2 Design System — Surface Logic Spec (what each surface actually does)

**Date:** 2026-06-27
**Purpose:** The missing piece. The [handoff contract](2026-06-27-v2-design-system-handoff-contract.md) defines tokens/components; the [per-screen brief](2026-06-27-v2-per-screen-design-brief.md) lists every surface to cover. **This doc gives the real anatomy + data + states of each surface**, extracted from the actual code, so Claude Design designs the *right* thing — correct fields, correct data, every state — not a guess.

Hand all three to Claude Design. This one is the source of truth for *content*.

Behavior keys: **Cycle** = `pre`, **Pregnancy** = `preg`, **Raising** = `kids`.

> Format per surface: **what it does** · **anatomy (sections/fields)** · **data (source + values)** · **states** · **interactions**. Values, enums, and units are from the code — design to these exactly.

---

## SHARED DATA MODELS (read first — every behavior references these)

**Logs are one row per entry.**
- **`cycle_logs`** (Cycle): `type` ∈ {period_start, period_end, symptom, mood, basal_temp, lh, cervical_mucus, intercourse, exam}; `value` + `notes` + `date`.
- **`pregnancy_logs`** (Pregnancy): `log_type` ∈ {mood, symptom, appointment, exam_result, kick_count, sleep, exercise, nutrition, kegel, water, vitamins, nesting, birth_prep, contraction, weight}; `value` + `notes` (often JSON) + `log_date`.
- **`child_logs`** (Kids): `type` ∈ {feeding, sleep, wake_up, diaper, health, temperature, medicine, vaccine, activity, mood, memory, milestone, photo, nutrition, growth, note}; `value` (often JSON) + `notes` + `photos[]` + `log_date` + `logged_by`.

**Enums to design against (chips/pickers must match):**
- Cycle mood: `low · down · okay · good · great`. Cycle symptoms (14): cramps, headache, bloated, fatigue, nausea, back-pain, tender-breasts, acne, insomnia, cravings, low-mood, spotting, energetic, restless. Flow: light/medium/heavy. LH: negative/faint/positive/peak. Cervical mucus: dry/sticky/creamy/watery/eggwhite.
- Pregnancy mood: excited · happy · okay · anxious · nauseous · energetic. Weight in kg. Water goal /8. Meals goal /3. Kicks gated to **week ≥ 28**.
- Kids mood (5): happy · calm · energetic · fussy · cranky. Feeding: breast (left/right/both + minutes) · bottle (ml) · solids (foods + kcal). Diaper: pee/poop/mixed (+ stool color). Activity categories (8): tummy_time, play, music, outdoor, reading, social, physical, learning.

**Phase / week / age engines:**
- Cycle phase (`lib/cycleLogic.ts`): menstruation (days 1–periodLength) → follicular → ovulation (±1 of ovulationDay) → luteal. Fertile window = ovulationDay−5 … +1. Drives every Cycle color/label.
- Pregnancy week (`lib/pregnancyData.ts` + `weekStats.ts`): week → babySize/length/weight; trimester T1 (1–13) / T2 (14–26) / T3 (27–40).
- Kids age: from birthDate → weekAge (growth leaps) / months (vaccines, growth percentiles, feeding stage).

**Per-behavior personality (from v2 design):** Cycle = Space Mono display, 4-phase palette, no doodles (closest to clinical). Pregnancy = Fraunces display + Space Mono dates, plum+cream warm set. Raising = Caveat/Patrick Hand, 6 crayon hues, full doodle set. **Body = DM Sans everywhere.**

---

# BEHAVIOR 1 — CYCLE (pre-pregnancy)

### Home: CycleHome
Sections top→bottom: HomeGreeting · CycleJourneyRingFull · DailyNudgeCard · MoodSymptomStrip · CycleTodaySummaryCard · CyclePillarsGrid.

**HomeGreeting** — phase-aware greeting. Shows phase word + italic descriptor (quiet/rising/peak/soft day) + warm one-liner. Data: `getCycleInfo()`.

**CycleJourneyRingFull** (hero) — 360° ring, one sticker per cycle day, draggable with momentum; center shows DAY + number + "of {cycleLength}". 7-day strip below (selected week). Bottom panel: status pill (TODAY/PAST/UPCOMING), FERTILITY %, NEXT PERIOD days, "THIS DAY" note. Day colors by phase (menstruation coral, follicular green, ovulation peach, luteal lilac). States: empty (no lastPeriodStart → gray "Not Tracking"), loaded, today (pulse aura). Interactions: drag ring / tap strip day → snap.

**DailyNudgeCard** — "YOUR NUDGE" + heart; templated headline w/ italic accent word; body (4-line); footer "From · {PILLAR}" + CTA (Read More / Log It). Data: phase + today's logs (basal_temp, lh, cervical_mucus, mood) + 10-day BBT trend → `pickCycleNudge()`. Empty → generic "start tracking" nudge.

**MoodSymptomStrip** — "Feeling anything today?" + mood face button (5 faces) + up to 3 symptom chips (logged today, else phase-suggested) + "more". Tap face → mood LogSheet; tap chip → toggle in DB immediately; "more" → MoodSymptomPickerSheet (14-grid). Empty: dashed face, "—".

**CycleTodaySummaryCard** — "Today at a glance" + 7 read-only chips (mood, symptoms, BBT °C, LH result, CM type, intimacy ✓, period flow) + progress bar (of 5 trackables). Tap → CycleTodayDashboardModal. States: empty/partial/full.

**CyclePillarsGrid** — 2×2 tiles (Nutrition/Hormones/Sleep/Mental) + "See all"; each soft-tint tile w/ sticker chip + title + subtitle. Tap → `/pillar/{id}`.

### Cycle modals
- **CycleTodayDashboardModal** — full day: mood hero tile · fertility-signals grid (BBT/LH/CM) · intimacy+period · symptoms chips · BBT 7-day sparkline. Empty cells = "—". Data: today's `cycle_logs` + 7-day BBT.
- **FertileWindowModal** — "Peak in {N} days" + projected ovulation date · 7-day forecast pills (fertility % + weekday, color-ramped) · 3 quick-log buttons (BBT/LH/CM) · confidence badge (% + "Calendar + BBT + LH") · past windows rows. Data: `getCycleInfo`, `dailyFertilityCurve`, `computeFertileConfidence`, `useCycleHistory`.
- **MoodSymptomPickerSheet** — 14-symptom grid, toggle, "Save {N} symptom(s)".

### Cycle charts
CyclePhaseRing · PhaseFlowChart (fertility curve, fertile band, ovulation dashed line, "you are here" marker, axes Period/Fertile·ovulation/Next period) · MoodBubbleCluster · symptom HeatmapGrid · MiniBar/MiniLine (tap → tooltip; empty < 2 pts).

### Cycle log forms (`CycleLogForms.tsx`, shared LogFormShell: title + date·phase subline + phase pill + body + SaveStickerButton in phase accent)
- **PeriodStart** — "How heavy?" 3 buttons (light/medium/heavy, drop icons) + notes. **PeriodEnd** — confirm only. **Symptoms** — phase-suggested chips + show-more → all 14; "Save {N}". **Mood** — 5 faces + notes. **BBT** — slider 35.0–38.0°C + ± buttons, big value. **LH** — 4 chips. **CM** — 5 buttons. **Intimacy** — confirm. Each disabled until required field set; spinner on save.

### Cycle analytics (CycleAnalytics)
Hero phase word + sticker + warm line · PhaseFlowChart · 4 stat tiles (avg cycle length, regularity %, PMS days, mood avg → CycleDetailSheet each) · recent cycles rows. CycleDetailSheet types: cycleLength / regularity / pms / fertile / mood (hero number + chips + MiniBarChart + history). Empty: "Log your first period…".

### Cycle pillars (`lib/prePregPillars.ts`, 5–6)
Fertility Basics · Nutrition Prep · Emotional Readiness · Financial Planning · Partner Journey · Health Checkups. Each: icon + color + tip count.

### CycleCalendar
Month grid + 3 tabs (Cycle/Checklist/Health). Week strip (phase-dot colored). Today: 7 ActivityPillCards (one per log type). "+" → LogActivitySheet (7 LogTiles) → form. Day cells show log dots; tap day → CycleDayDetail (editable list).

---

# BEHAVIOR 2 — PREGNANCY

### Home: PregnancyHome
HomeGreeting · BabyHeroCarousel · AffirmationRevealCard · TodaySummaryCard · RemindersSection (+PregnancyUserReminders) · WeightTrend slim row · BirthGuide slim row · Ask Grandma slim row. **(Note: v2 should reflect the compacted home — bare editorial affirmation + merged tracker + slim secondary rows.)**

**WeekCard** (carousel item) — top row "WEEK · {TRIMESTER}" + "a {fruit}" (italic); mega week number (zero-padded); BabyIllustration (static); LENGTH {cm} + WEIGHT {g/kg}; WeekRuler (0–51cm with position dot + value bubble); footer "{N} DAYS TO GO" + "TAP FOR DETAILS ›". 5-palette cycle by week%5 (lilac/cream/peach/coral/green). States: current (days-to-go) / past / future. Data: `getWeekData`, `getWeekStat`, `getCurrentWeekFromDueDate`.

**AffirmationRevealCard** — bare editorial (no card chrome): "DAILY AFFIRMATION" label · phrase in Instrument italic lowercase, warm coral · "Reveal today's ↗" before, "Share ↗" after. Daily RPC `get_daily_affirmation('pregnancy')` + 20 fallbacks, cached per date; reveal state persisted per date.

**TodaySummaryCard** (merged tracker) — "Today at a glance" + hint (X/5) + chevron→TodayDashboardModal. Metric pills (each tappable → log sheet): mood (face+label) · water {n}/8 · sleep {h}h · meals {n}/3 · weight {kg} · kicks (week≥28). Logged pill = green tint, unlogged = "+". Progress bar (5 core). 

**RemindersSection** — up to 4 cards: upcoming appointment (yellow, → AppointmentDetailModal) · week tip (lilac, → WeekDetailModal) · kick reminder (green, week≥28). PregnancyUserReminders = user's own list below.

### Pregnancy modals
- **WeekDetailModal** — colored hero (week mega) · "BABY'S DEVELOPMENT" bullets · "COMMON SYMPTOMS" pills · "WHAT TO PREPARE" cards → PrepDetailSheet. Data: `getWeekData`, `getWeekContent`, `getPrepGuide`.
- **TodayDashboardModal** — per-metric tiles w/ 7-day mini charts: mood, weight (start + IOM band + trend), water (bar), sleep (line + quality), nutrition. Fills missing days = 0.
- **AppointmentDetailModal** — type badge + name + "Week {w} · {timing}" + description + PREP card + WHAT TO EXPECT card + QUESTIONS list + CTAs (Schedule in Agenda / Ask Grandma).
- **BirthGuideModal** — 4 birth-type tiles (Natural green / C-Section purple / Home blue / Water pink) + 7 topic tiles (Labor Stages, Warning Signs, Hospital Bag, Pain Relief, Positions, Partner Guide, Recovery) → BirthDetailModal.
- **BirthDetailModal** — title box + sections (overview/steps/tips/warnings) + Ask Grandma. Data: `lib/birthGuideData.ts`.
- **AffirmationShareModal** — header (Close/Share) + "With background ⟷ Text only" toggle + grid of **6 clean templates** (Cream, Soft, Midnight, Lilac, Sage, Magazine) at 1080×1350; tap tile → save/share PNG; text-only = transparent. **(No sticker row, no per-tile name labels — v2 cleaned.)**
- **WeightDetailModal** — hero {kg} + status · 3 stat tiles (Starting/Gained/Pace) · 12-entry chart + IOM band · IOM target block · recent entries rows · "Open Insights". IOM bands by BMI (default 11.5–16). Status: on-track green / above coral / below peach.

### Pregnancy charts
BabyHeroCarousel illustration · PregnancyJourneyRing (40 weeks on ring, trimester-colored, tap → week) · WeightTrendCard (line + dashed IOM band + value bubble + status pill) · HealthScoreRing · MiniBar/Line.

### Pregnancy log forms (`PregnancyLogForms.tsx` + `PregnancyMealForm.tsx`)
mood (5 chips+notes) · symptoms (12 chips) · appointment (type chips + doctor + notes) · exam_result (photo→AI) · **kick_count** (big tap counter, goal 10, turns green) · sleep (hours+quality sliders) · exercise (type chips + minutes) · nutrition-simple (nutrient chips) · kegel (sets slider) · water (+/− counter, 8 droplets) · vitamins (confirm) · nesting (title+category+done) · birth_prep (title+category+dueWeek+done) · contraction (duration+interval) · weight (decimal kg) · **nutrition meal scan** (photo→`estimateFromImage`→editable foods + kcal, uploads to `pregnancy-nutrition`).

### Pregnancy pillars (`lib/pregnancyPillars.ts`)
Week by Week · Symptoms & Relief · Birth Planning · Breastfeeding Prep · Baby Gear · Partner Support · Postpartum Prep · Nutrition · Emotional Wellness. Each icon + color.

### PregnancyCalendar
4 views: Month (trimester tints, log dots, highlights) · Week (AgendaWeekStrip, expand pending/logged routines) · Journey (PregnancyJourneyRing) · Appointments (timeline). FAB → Quick Log (2-col grid of all 15 types). Tap log → LogDetailPopup (view/edit/delete).

---

# BEHAVIOR 3 — RAISING (kids)

> Largest behavior. Multi-child via `useChildStore`; CHILD_COLORS (6) per child. **New fonts (Caveat/Patrick Hand) + new doodle set = net-new design+build.**

### Home: KidsHome
HomeGreeting · child selector pill row (+N overflow) · date-range picker (Today/Yesterday/7d/30d/Custom) · 4 hero tiles (Sleep/Mood/Calories/Activities — each number + target + "Log X" + tap → detail modal) · "Set Goals" button · Growth & Development card (current leap + progress) · Growth percentile chart(s) (height/weight, P3–P97 bands + dots) · Vaccine schedule section (next due + status dots) · Milestones strip · (Goals, Reminders strip). Targets derived from child age. States per tile: empty / data; many tiles tap → their modal.

### Kids modals (14+)
- **DiaperDetailModal** — pee/poop/mixed cards (count + %) · proportion bar · daily/weekly stacked bar · stool-color chips. 
- **MoodDetailModal** — dominant mood + 5 distribution cards (happy/calm/energetic/fussy/cranky) + horizontal bars + bubble cluster.
- **SleepDetailModal** — total vs target · daily bars (actual vs target line, green/yellow) · quality breakdown.
- **HealthDetailModal** — 6-pillar health ring · recent health events (temp/medicine/vaccine) · vaccine tracker (mark given) · summary metrics.
- **ActivityDetailModal** — calorie summary + bar · activity pie · feeding breakdown (breast L/R/Both vs bottle, durations, peak times) · activity list.
- **ActivitiesDetailModal** — stats (count / active days / variety) · breakdown bars · entries list.
- **VaccineInfoModal** — name + dose · protects · why it matters · side effects · disclaimer.
- **GoalSettingModal** — sliders (sleep hours, calorie target, activity days, feeding pref) + age-based suggested defaults → `useGoalsStore`.
- **LeapDetailModal** — leap name · brain note (+ "popular theory, not validated science" disclaimer) · age range · 3-phase progress (stormy/peak/emerging) · observable signs · emerging skills · parent activities · tip.
- **RemindersModal** — filter tabs (Upcoming/Today/Overdue) + reminder cards (complete/snooze/delete) + add.
- **PillarDetailModal** — pillar score + explanation + trend chart + benchmark + tips.
- **TipDetailModal** — title + body + detail + related links.
- **RoutineComplianceModal** — weekly heatmap (done/pending/missed/off) + % + recent entries.

### Kids charts
KidsJourneyRing (multi-segment: sleep/mood/feeding/activity/health/vaccines/growth) · GrowthPercentileChart (WHO/CDC bands by sex+age, dots, latest percentile chip) · MoodBubbleCluster · VaccineTimeline · MilestoneTimeline · ActivityBreakdown pie · FeedingBreakdown · SleepQualityChart · MiniBar/Line.

### Kids log forms (`KidsLogForms.tsx`, 12+)
- **Feeding** — breast (timer, side L/R/Both, last-side suggestion) / bottle (ml) / solids (food autocomplete + AI photo scan + meal moment + appetite). Saves JSON {feedType, meal, quality, amount, side, duration, time}.
- **Sleep** — duration + quality (great/ok/restless) + naps.
- **HealthEvent** — temperature (value+unit+method) / medicine (name+dose+freq+reason) / vaccine (name+dose+site+reaction) / symptom (type+severity+duration).
- **Mood** — 5 faces.
- **Memory** — photos + caption + milestone tag + emoji.
- **Activity** — category grid (8) + duration + intensity + notes + optional photo.
- **Diaper** — pee/poop/mixed + stool color (when poop).
- **WakeUp** — wake time + mood (3) + duration.
- **Nutrition** — nutrient + amount + unit + notes.
- **Medication** — name + dosage + frequency + reason.
- **Milestone** — preset/custom + category + notes + photo.
- **Photo** — photos + caption + tags + emoji (→ `child-photos` bucket).

### Kids pillars (`lib/pillars.ts`, ~12)
Breastfeeding · Feeding · Nutrition · Vaccines · Layette · Recipes · Sleep · Health · Development · Emotions … Each: icon + tips by age range.

### Growth leaps (`lib/growthLeaps.ts`, 10): weeks 5→75, each name/desc/ageRange/brainNote/3 phases/signs/skills/activities/tip + disclaimer.

### KidsCalendar
Month + List views; child pill row; day cells = colored dots per child; tap day → detail panel + quick-log FAB arc (9 types). Tap log → detail → Edit (re-opens form prefilled) / Delete. Routine logs deduped via routineId.

### KidsAnalytics
Health score ring (6 pillars, animated) · GrandmaInsightCard · health tips (→ TipDetailModal) · 6 pillar breakdown rows (score + trend arrow + takeaway → expand chart) · growth card · routine compliance cards (→ modal) · milestone timeline. Period selector (7/30/90/Custom). Data: `useKidsAnalytics`.

---

# BEHAVIOR 4 — CAREGIVER (scoped, inherits child's behavior)

**CaregiverHome** — no-children empty state · child picker (if 2+) · identity header (role icon Nanny/Family + child name + role label) · "Log the day" CTA (only if `LOG_ACTIVITY` capability — **hidden, not disabled**, when absent) · NannyUpdatesFeed (read-only recent activity).

**CaregiverLogSheet** — simplified log (date today, time, type picker subset by permission: diaper/sleep/feeding/activity/mood/health/note); saves with `logged_by`. **Design the view-only state of every shared surface**: withheld capabilities = hidden sections, never "no permission" messages.

Capabilities: LOG_ACTIVITY, VIEW_PHOTOS, VIEW_HEALTH, VIEW_MILESTONES, VIEW_GROWTH.

---

# SHARED ACROSS ALL BEHAVIORS

(Layout identical across behaviors; only the **active behavior's accent/font** swaps.)

**Grandma Talk** — header (close/title/history) · child selector (kids) · context card (from insight) · message hero (orb + spinning sun + heart) · message cards (label "GRANDMA"/"YOU…" + FormattedText supporting **bold**/*italic*; latest grandma card = dark bg + sway flower) · suggestion chips · tall input + send + mic. States: empty (orb breathing, idle-empty) / has-messages / streaming (typing) / error. Behavior-aware responses + pillar context.

**Profile screens (12):** personal · account (email/password/sign-out/delete) · privacy (toggles) · settings (theme/notif toggles) · notifications (per-type toggles) · care-circle (invite + caregiver rows + access level + remove) · pregnancy · kids · memories (timeline) · health-history (meds/allergies/conditions) · emergency-insurance (provider/policy) · badges. Row pattern: sticker icon + label + chevron/divider.

**ProfileHero** — stickers (squishy + heart) · avatar 108 (+ star) · name (serif + italic) · subtitle · kid pills. **BadgesStrip** — "BADGES" + "All N →" + breathing badge circles (empty: "No badges yet"). **MyJourneyPillGrid** — 3 pills (Cycle/Expecting/Raising): active (accent + ink border + shadow) / enrolled-inactive (0.6) / unenrolled (0.35 "+ add"); tap → switch mode (flash overlay).

**Onboarding** — journey picker (3 behavior cards: sticker + title + subtitle; first-time = multi-select, add-mode = single) + Continue (disabled until selection). Per-behavior setup flows (cycle/pregnancy/kids).

**Connections** — ChannelCard (avatar 🔒/# + name + desc + member·category + chevron) · ThreadCard · Garage listing card + detail.

**Records/Vault** — `/exams` (list + detail) · DocumentUpload (cloud icon + camera/file buttons + "Add Record") · VaccineRecord (check circle + name + dose + date/due) · EmergencyCard.

**Care circle** — invite-caregiver (permissions selection) · accept-invite · manage-caregivers (list + permissions).

**Utility** — daily-rewards (check-in card + streak + points + badge grid + heatmap) · leaderboard · notifications inbox (sectioned by category, icon circle + title + timestamp + type pill, mark-all-read, empty state) · insights (article feed + ArticleDetailModal + InsightDetailModal) · paywall (Monthly/Annual toggle + 2 tier cards: features w/ sticker icons + price + subscribe + restore).

**Shared modals** — AvatarPickerModal (camera/file + 24-icon grid) · StickerDateModal (star accent + handle + DateTimePicker + Save in accent) · CustomRangeModal (From/To rows + pickers + Apply).

**Shared chart primitives** — LineChart (smooth bezier + area fill + optional avg line + points; niceScale; downsample >14) · MiniBarChart (baseline + dashed target + bars + tap tooltip + labels; empty placeholder) · BigChartCard (blob sticker + mono-caps label + Fraunces number + unit + chart slot) · MiniStatTile · HealthScoreRing (6 animated arcs + rim sticker chips + count-up score + breathing) · DotTimeline · HeatmapGrid · BubbleGrid.

**Shared UI primitives** — PaperCard (tint/flat/radius/padding) · PillButton (ink/paper/accent; normal/pressed translateY+2/disabled 0.55) · StickerButton (active solid + hard shadow / inactive soft tint / pressed collapse / disabled 0.45) · TextField (label + input + FieldError) · ChildPills (active solid + shadow / inactive tint) · SegmentedTabs (track + active segment fill) · EmptyState (socket + title + message + CTA) · BrandedLoader (blinking logo + typewriter label).

---

## Final instruction for Claude Design (paste verbatim)

> For every surface in this spec, design it to the **anatomy, fields, data, and states described here** — not a guess. Match every enum/value/unit (mood sets, log types, sliders ranges, /8 and /3 goals, IOM bands, percentile bands, phase colors). For each surface produce: the layout at the behavior's personality, an element manifest (every card/icon/chart/button/badge/state, zero `…etc`), all states (empty/loading/filled/error, + caregiver view-only), and the per-behavior delta.
>
> Then produce the **coverage matrix** (one row per surface, columns layout/elements/states/delta all checked) and the **icon coverage table** (every icon → keep/restyle/replace, cross-checked vs the existing sticker files). Treat any field, enum, or state in this doc that you cannot represent as an **open question**, listed explicitly — never silently drop it.
