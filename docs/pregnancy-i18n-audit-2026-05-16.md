# i18n Audit — Pregnancy Mode Components (2026-05-16)

> Coverage: ~0 / 350+ user-facing strings translated (~0%). No file in scope
> imports `useTranslation` or calls `t(...)`. Zero strings currently flow
> through the translation system. The pregnancy mode is functionally
> English-only despite the app shipping 12 + English translations.

## Wave plan

| Wave | Surfaces | ~New keys |
|---|---|---|
| 1 | Home: `PregnancyHome`, `TodaySummaryCard`, `TodayDashboardModal`, `RemindersSection`, `AffirmationRevealCard` (chrome only), `AppointmentDetailModal` | ~70 |
| 2 | Log forms + agenda: `PregnancyLogForms`, `SimplePregnancyLogForm`, `PregnancyMealForm`, `PregnancyCalendar`, `AppointmentList`, `ContractionTimer`, `KickCounter` | ~100 |
| 3 | Weight, reminders, journey ring, analytics: `WeightTrendCard`, `PregnancyUserReminders`, `PregnancyJourneyRing`, `PregnancyAnalytics` | ~80 |
| 4 | Modals, birth guide, onboarding, profile: `BirthGuideModal`, `BirthDetailModal`, `BirthTypeCard`, `WeekDetailModal`, `app/onboarding/pregnancy/*`, `app/onboarding/due-date.tsx`, `app/onboarding/baby-name.tsx`, `app/birth-plan.tsx`, `app/profile/pregnancy.tsx` | ~120 |

## Cross-cutting concerns

### Interpolation (need `{{var}}` placeholders)
- `Week N`, `N/8 glasses`, `N/total routines logged`, `In N weeks`, `N days to go`, `N kicks`, weight band ranges with `{{low}} / {{high}} / {{week}}`, `TREND · LAST N ENTRIES`

### Pluralization
The i18n engine has no plural rules. Affected: `N kicks`, `N sessions`, `N appointment(s)`, `N day(s) taken`. **Recommendation:** single-form keys with the count inline (`{{count}} kicks`) + translator note. Don't try to handle plurals in JS.

### Mode-aware branches (each branch = its own key)
- `TodaySummaryCard.summaryHint` — 4 branches
- `WeightTrendCard.statusText` — 4 branches
- `PregnancyJourneyRing.statusLabel` — 3 branches
- `BabyHeroCarousel.daysLabel` — 3 branches
- `ContractionTimer.timerLabel` — 2 branches

### Proper-noun product copy (keep "Grandma" untranslated)
- `Ask Grandma`, `Guru Grandma`, `Grandma Talk`, `grandma.app`

### Already-existing keys to reuse
`common_cancel`, `common_save`, `common_back`, `common_delete`, `common_done`,
`common_next`, `common_skip`, `pregnancy_week`, `pregnancy_dueDate`,
`pregnancy_kicks`, `pregnancy_contractions`, `pregnancy_birthPlan`,
`onboarding_letsGo`

---

## File-by-file findings

### HIGH PRIORITY — Home surfaces

#### `components/home/PregnancyHome.tsx` — ~18 strings
- `"TODAY'S ROUTINES"` (L120), `"REMINDERS"` (L419)
- `${waterCount}/8 glasses` (L242), `WEEK ${weekNumber} · ${weekdayLabel}` (L385)
- `"Questions, worries, or just need a pep talk"` (L270)
- `INLINE_LOG_TITLE` map: 11 log sheet titles (L288–298)
- `"Birth Guide"` / `"Natural · C-Section · Home · Water"` (L458–460)

#### `TodaySummaryCard.tsx` — ~12 strings
- Title `"Today at a glance"` (L113)
- 4 branches of `summaryHint` (L98–102) — each a separate key

#### `TodayDashboardModal.tsx` — ~20 strings
- Modal title `"Today's dashboard"`, every tile's "Not logged" / value branch
- Interpolated: `~${nutritionTotalCals} kcal`, `/ 8 glasses`

#### `RemindersSection.tsx` — ~4 strings
- `Week ${appt.week} · ${appt.prepNote}`, `Week ${weekNumber} tip`
- `'Log your kick count'`, `'Track 10 movements — aim to finish within 2 hours'`

#### `AffirmationRevealCard.tsx` — 5 chrome + 20 fallback affirmations
- `'DAILY AFFIRMATION'`, `'Reveal today's →'`, `'Share ↗'`, `'Come back tomorrow…'`
- 20 fallback affirmations only render when Supabase RPC fails — defer

#### `AppointmentDetailModal.tsx` — ~8 strings
- 4 branches of timing label (`'This week'`, `'Next week'`, `In ${n} weeks`, `'Overdue'`)
- `'WHAT TO EXPECT'`, `'Schedule in agenda'`, `'Ask Grandma'`

#### `WeekDetailModal.tsx` — ~6 strings
- `WEEK ${week} · ${TRI_NAMES[tri-1].toUpperCase()} TRIMESTER`
- `TRI_NAMES`: `'First'`, `'Second'`, `'Third'`
- `"BABY'S DEVELOPMENT"`, `"COMMON SYMPTOMS"`, `"WHAT TO PREPARE"`
- Prep drill-down: `'WHY NOW'` / `'HOW TO DO IT'` / `'WATCH FOR'`

### HIGH PRIORITY — Logging surfaces

#### `PregnancyLogForms.tsx` — ~60+ strings (largest file)
- Form labels and placeholders across all 15 forms
- `SYMPTOMS` array: 12 symptom labels
- `MOODS` array: 5 mood labels
- Each form's save confirmation copy

#### `ContractionTimer.tsx` — ~15 strings
- Card title + subtitle, `'CONTRACTION IN PROGRESS'` / `'READY'`, `'CONTRACTION STARTED'` / `'ENDED'`
- 5-1-1 alert + info card
- Stat labels: `'TOTAL'`, `'AVG DURATION'`, `'AVG INTERVAL'`
- `'Saving…'`, `'Save session'`, `'Reset'`

#### `KickCounter.tsx` — ~12 strings
- `'KICK COUNTER'`, `'Goal: 10 kicks in under 2 hours'`, `'START SESSION'`
- Goal banner, `'TAP FOR KICK'`, `'End Session'`, `'RECENT SESSIONS'`
- `${count} kicks` (pluralization concern)

#### `AppointmentList.tsx` — ~14 strings
- `'Add Appointment'`, `'UPCOMING'` / `'PAST'`, empty state, modal labels
- 7 type labels in `buildTypes()`: Checkup, Bloodwork, Ultrasound, Glucose Test, Fertility, Specialist, Other

#### `PregnancyCalendar.tsx` — ~40+ strings (not fully read)
- Section labels and empty states across Month/Week/Journey/Appointments tabs
- `'Routine name'`, `'Delete'` (reuse `common_delete`)

#### `SimplePregnancyLogForm.tsx` + `PregnancyMealForm.tsx` — ~20–30 strings combined
- Same log-form patterns as PregnancyLogForms.tsx

### MEDIUM PRIORITY — Periodic surfaces

#### `WeightTrendCard.tsx` — ~22 strings
- Sheet title `'Weight trend'`, stat tile subtitles `'kg pre-preg'`, `'kg total'`, `'kg/wk'`
- 4 branches of `statusText` — each with `{{low}}`, `{{high}}`, `{{week}}` interpolation
- `'TREND · LAST ${n} ENTRIES'`, empty chart state, IOM band body paragraph

#### `PregnancyUserReminders.tsx` — ~12 strings
- `'Add reminder'`, `'Set date'`, `'Set time'`, `'Save'`, `'Done'` (twice)
- `dueDateLabel` 3 branches with day interpolation

#### `PregnancyJourneyRing.tsx` — ~12 strings
- `'YOU ARE HERE'`, `'COMPLETED'`, `'UPCOMING'` (and lowercase variants)
- `'WEEK'` center label, `'↺ drag to spin · tap any week'`
- `'LENGTH'`, `'WEIGHT'`, `'THIS WEEK'`, `'LOGGED THIS WEEK'`
- 3 empty-state branches
- `LOG_DISPLAY` map: 15 log type labels
- `trimesterLabel()`: 3 strings

#### `PregnancyAnalytics.tsx` — ~50+ strings
- `PILLAR_META`: 11 pillar labels and blurbs
- Many `PaperCard title` props
- Status pills: `'On track'`, `'Almost there'`, `'Below target'`

### LOWER PRIORITY — One-shot / infrequent

#### `app/onboarding/pregnancy/index.tsx` — ~20 strings
- 7 step questions, mood/birth-place option arrays, placeholders, completion screen

#### `app/onboarding/due-date.tsx` — ~10 strings
#### `app/onboarding/baby-name.tsx` — ~8 strings
#### `app/birth-plan.tsx` — ~8 strings
#### `app/profile/pregnancy.tsx` — ~50+ strings

---

## Estimated total: ~370 keys across 20 files

Bigger than the original audit's ~100 estimate. The original count missed:
- Content arrays (symptoms, moods, pillars, options)
- Mode-conditional branches (each = separate key)
- Drilled-into prep / accordion section headers
- Profile form labels
