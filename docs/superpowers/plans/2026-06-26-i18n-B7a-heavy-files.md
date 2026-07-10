# i18n Wave B7a — Clear Heavy Files of Residual Hardcoded Strings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate every `i18next/no-literal-string` ESLint violation from 17 high-violation files (103 down to 0 in the worst case) by wrapping remaining hardcoded strings with `t('key')` and registering new keys in the i18n system.

**Architecture:** Pure string-swap pass — no logic, styling, or RLS changes. Each file already (or nearly) has `useTranslation` wired; new keys follow the established prefix conventions (`kids_*`, `pregAnalytics_*`, `kidsAnalytics_*`, `careCircle_*`, etc.). New keys are added to `lib/i18n/keys.ts` (interface), `lib/i18n/en.ts` (English values), and all 11 locale files as English placeholders so TypeScript + the parity guard stay green throughout.

**Tech Stack:** TypeScript strict · ESLint `i18next/no-literal-string` · `lib/i18n/` (custom hook, 12 locales) · `npm run typecheck` · `npm run i18n:check`

## Global Constraints

- NEVER run `npm run lint` (hangs on worktree). Use `npx eslint <file>` only.
- NEVER touch `.claude/`, `eslint.design.config.js`, `constants/theme.ts`, `PillButton`, `StickerButton`, `SvgCharts`, or `WeekCard`.
- NEVER `git add -A`. Stage only modified source files + lib/i18n files by name.
- Do NOT run `npm start` / Metro.
- Only fix `i18next/no-literal-string` errors. Ignore all other ESLint rule errors (react/no-unescaped-entities, cannot access refs, etc.).
- Multi-sentence prose paragraphs → leave for Phase C; list them in the final report.
- TypeScript strict: no `any`, no implicit returns.
- New key naming: reuse `common_*` keys where the same English text already exists in en.ts. Otherwise use the file-feature prefix listed per task.
- All 11 locale files (`pt-BR`, `es`, `fr`, `de`, `it`, `ja`, `ko`, `zh`, `ar`, `hi`, `tr`) get the same English string as placeholder.
- After every ~4 files: run `npm run typecheck` (must be 0 errors) + `npm run i18n:check` (must print "✓ All locales in parity with en").

---

## File Structure

### Files to modify (source)
- `components/home/KidsHome.tsx` — 103 violations
- `components/analytics/PregnancyAnalytics.tsx` — 55 violations
- `components/analytics/KidsAnalytics.tsx` — 38 violations
- `app/profile/care-circle.tsx` — 33 violations
- `components/calendar/PregnancyCalendar.tsx` — 31 violations
- `components/insights/InsightsScreen.tsx` — 22 violations
- `components/analytics/CycleDetailSheets.tsx` — 22 violations
- `app/profile/health-history.tsx` — 21 violations
- `components/calendar/PregnancyLogForms.tsx` — 19 violations
- `components/home/pregnancy/WeightTrendCard.tsx` — 18 violations
- `components/calendar/KidsCalendar.tsx` — 18 violations
- `app/channel/info/[id].tsx` — 14 violations
- `components/kids/KidsJourneyRing.tsx` — 11 violations
- `components/home/pregnancy/TodayDashboardModal.tsx` — 11 violations
- `components/calendar/KidsLogForms.tsx` — 11 violations
- `app/profile/pregnancy.tsx` — 11 violations
- `app/profile/kids.tsx` — 11 violations

### Files to modify (i18n)
- `lib/i18n/keys.ts` — add all new keys to `TranslationKeys` interface
- `lib/i18n/en.ts` — add English values for all new keys
- `lib/i18n/pt-BR.ts` — English placeholder for every new key
- `lib/i18n/es.ts` — English placeholder for every new key
- `lib/i18n/fr.ts` — English placeholder for every new key
- `lib/i18n/de.ts` — English placeholder for every new key
- `lib/i18n/it.ts` — English placeholder for every new key
- `lib/i18n/ja.ts` — English placeholder for every new key
- `lib/i18n/ko.ts` — English placeholder for every new key
- `lib/i18n/zh.ts` — English placeholder for every new key
- `lib/i18n/ar.ts` — English placeholder for every new key
- `lib/i18n/hi.ts` — English placeholder for every new key
- `lib/i18n/tr.ts` — English placeholder for every new key

---

## Task 1: KidsHome.tsx (103 violations) + gate check

**Files:**
- Modify: `components/home/KidsHome.tsx`
- Modify: `lib/i18n/keys.ts`, `lib/i18n/en.ts`, all 11 locale files

**Interfaces:**
- Consumes: existing `useTranslation` import already in the file (line 67)
- Produces: zero `i18next/no-literal-string` errors from `npx eslint components/home/KidsHome.tsx`

- [ ] **Step 1: Run ESLint on the file to get exact line:col list**

```bash
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/home/KidsHome.tsx 2>&1 | grep "no-literal-string"
```

- [ ] **Step 2: Read the file to understand context around each violation**

Read `components/home/KidsHome.tsx` in full (it is large — read in chunks of 200 lines if needed, focusing on lines flagged by ESLint).

Typical patterns to fix:
- `<Text>Sleep</Text>` → `<Text>{t('kids_sleep')}</Text>`
- `title="Nap time"` prop → `title={t('kids_napTime')}`
- `label="Add meal"` → `label={t('kids_addMeal')}`
- `'No data yet'` string literal → `t('common_noData')`
- Conditional: `isLogged ? 'Done' : 'Log'` → `isLogged ? t('common_done') : t('kids_log')`

Special case — the em dash `—` at line 1880: the lint rule flags `<Text>—</Text>`. Wrap it: `<Text>{t('common_emDash')}</Text>` (add key `common_emDash: '—'` to en.ts).

- [ ] **Step 3: Add new keys to lib/i18n/keys.ts**

Open `lib/i18n/keys.ts`. After the last existing key in the file (currently `pregCal_alertDeleteLogTitle`), add a new section:

```typescript
  // ─── B7a: KidsHome ────────────────────────────────────────────────────────
  kids_sleep: string
  kids_mood: string
  kids_feeding: string
  kids_diaper: string
  kids_growth: string
  kids_vaccine: string
  kids_medicine: string
  kids_milestone: string
  kids_note: string
  kids_activity: string
  kids_log: string
  kids_logSleep: string
  kids_logMood: string
  kids_logFeeding: string
  kids_logDiaper: string
  kids_noMealsToday: string
  kids_noSleepToday: string
  kids_noLogsYet: string
  kids_addEntry: string
  kids_todaySummary: string
  kids_lastFed: string
  kids_totalSleep: string
  kids_naps: string
  kids_hours: string
  kids_min: string
  kids_leapTitle: string
  kids_leapSubtitle: string
  kids_nextVaccine: string
  kids_developmentInsight: string
  kids_momentsOfCare: string
  kids_seeHistory: string
  kids_loggedToday: string
  kids_percentile: string
  kids_weightKg: string
  kids_heightCm: string
  kids_headCm: string
  kids_bmi: string
  kids_caloriesKcal: string
  common_emDash: string
```

Note: Before adding a key, search `en.ts` for the English text to check if it already exists under a `common_*` key. Reuse existing keys wherever possible.

- [ ] **Step 4: Add English values to lib/i18n/en.ts**

```typescript
  // ─── B7a: KidsHome ────────────────────────────────────────────────────────
  kids_sleep: 'Sleep',
  kids_mood: 'Mood',
  kids_feeding: 'Feeding',
  kids_diaper: 'Diaper',
  kids_growth: 'Growth',
  kids_vaccine: 'Vaccine',
  kids_medicine: 'Medicine',
  kids_milestone: 'Milestone',
  kids_note: 'Note',
  kids_activity: 'Activity',
  kids_log: 'Log',
  kids_logSleep: 'Log Sleep',
  kids_logMood: 'Log Mood',
  kids_logFeeding: 'Log Feeding',
  kids_logDiaper: 'Log Diaper',
  kids_noMealsToday: 'No meals today',
  kids_noSleepToday: 'No sleep logged today',
  kids_noLogsYet: 'No logs yet',
  kids_addEntry: 'Add entry',
  kids_todaySummary: "Today's Summary",
  kids_lastFed: 'Last fed',
  kids_totalSleep: 'Total sleep',
  kids_naps: 'Naps',
  kids_hours: '{{n}}h',
  kids_min: '{{n}}m',
  kids_leapTitle: 'Growth Leap',
  kids_leapSubtitle: 'Development milestone',
  kids_nextVaccine: 'Next Vaccine',
  kids_developmentInsight: 'Development Insight',
  kids_momentsOfCare: 'Moments of Care',
  kids_seeHistory: 'See history',
  kids_loggedToday: 'Logged today',
  kids_percentile: '{{n}}th percentile',
  kids_weightKg: 'Weight (kg)',
  kids_heightCm: 'Height (cm)',
  kids_headCm: 'Head (cm)',
  kids_bmi: 'BMI',
  kids_caloriesKcal: 'Calories (kcal)',
  common_emDash: '—',
```

- [ ] **Step 5: Add English placeholders to all 11 locale files**

In each of `pt-BR.ts`, `es.ts`, `fr.ts`, `de.ts`, `it.ts`, `ja.ts`, `ko.ts`, `zh.ts`, `ar.ts`, `hi.ts`, `tr.ts`, add the same block with English values (translators fill later):

```typescript
  // ─── B7a: KidsHome ────────────────────────────────────────────────────────
  kids_sleep: 'Sleep',
  kids_mood: 'Mood',
  kids_feeding: 'Feeding',
  kids_diaper: 'Diaper',
  kids_growth: 'Growth',
  kids_vaccine: 'Vaccine',
  kids_medicine: 'Medicine',
  kids_milestone: 'Milestone',
  kids_note: 'Note',
  kids_activity: 'Activity',
  kids_log: 'Log',
  kids_logSleep: 'Log Sleep',
  kids_logMood: 'Log Mood',
  kids_logFeeding: 'Log Feeding',
  kids_logDiaper: 'Log Diaper',
  kids_noMealsToday: 'No meals today',
  kids_noSleepToday: 'No sleep logged today',
  kids_noLogsYet: 'No logs yet',
  kids_addEntry: 'Add entry',
  kids_todaySummary: "Today's Summary",
  kids_lastFed: 'Last fed',
  kids_totalSleep: 'Total sleep',
  kids_naps: 'Naps',
  kids_hours: '{{n}}h',
  kids_min: '{{n}}m',
  kids_leapTitle: 'Growth Leap',
  kids_leapSubtitle: 'Development milestone',
  kids_nextVaccine: 'Next Vaccine',
  kids_developmentInsight: 'Development Insight',
  kids_momentsOfCare: 'Moments of Care',
  kids_seeHistory: 'See history',
  kids_loggedToday: 'Logged today',
  kids_percentile: '{{n}}th percentile',
  kids_weightKg: 'Weight (kg)',
  kids_heightCm: 'Height (cm)',
  kids_headCm: 'Head (cm)',
  kids_bmi: 'BMI',
  kids_caloriesKcal: 'Calories (kcal)',
  common_emDash: '—',
```

- [ ] **Step 6: Apply fixes to KidsHome.tsx**

For each flagged line, replace the hardcoded string with `t('key')`. The file already has `const { t } = useTranslation()`. Common substitutions:

```tsx
// Before:
<Text>Sleep</Text>
// After:
<Text>{t('kids_sleep')}</Text>

// Before (prop):
title="Today's Summary"
// After:
title={t('kids_todaySummary')}

// Before (interpolated):
<Text>{hours}h {mins}m</Text>
// After (keep JSX interpolation, wrap label separately if needed):
<Text>{t('kids_hours', { n: hours })} {t('kids_min', { n: mins })}</Text>

// Before (em dash):
<Text style={{ fontSize: 18, fontFamily: font.display, color: ST_INK }}>—</Text>
// After:
<Text style={{ fontSize: 18, fontFamily: font.display, color: ST_INK }}>{t('common_emDash')}</Text>
```

Work through every flagged line from the ESLint output. Re-read file chunks around each flagged line number before editing.

- [ ] **Step 7: Re-run ESLint to confirm 0 no-literal-string errors**

```bash
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/home/KidsHome.tsx 2>&1 | grep "no-literal-string"
```

Expected: no output (0 matches). If any remain, fix them and repeat.

- [ ] **Step 8: Gate check — typecheck + parity**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app && npm run typecheck 2>&1 | tail -5
npm run i18n:check
```

Expected: typecheck exits 0, i18n:check prints "✓ All locales in parity with en".

---

## Task 2: PregnancyAnalytics.tsx (55) + KidsAnalytics.tsx (38)

**Files:**
- Modify: `components/analytics/PregnancyAnalytics.tsx`
- Modify: `components/analytics/KidsAnalytics.tsx`
- Modify: `lib/i18n/keys.ts`, `lib/i18n/en.ts`, all 11 locale files

**Interfaces:**
- Consumes: `useTranslation` already imported in both files
- Produces: zero `i18next/no-literal-string` from each file

- [ ] **Step 1: Get violation lists**

```bash
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/analytics/PregnancyAnalytics.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/analytics/KidsAnalytics.tsx 2>&1 | grep "no-literal-string"
```

- [ ] **Step 2: Read both files in chunks around flagged lines**

Key patterns from initial scan:
- PregnancyAnalytics: `Overall · last 7 days`, `Sleep`, `Mood`, `Nutrition, movement and hydration`, `No moods logged yet.`, `No symptoms logged yet.`, interpolated `×{s.count}`, `{b.value} · {pct}%`, `{n} · {pct}%`, `{s.count} · {pct}%`
- KidsAnalytics: similar stat labels, section headers, empty states

- [ ] **Step 3: Add new keys to lib/i18n/keys.ts**

```typescript
  // ─── B7a: PregnancyAnalytics ──────────────────────────────────────────────
  pregAnalytics_overallLast7: string
  pregAnalytics_sleep: string
  pregAnalytics_mood: string
  pregAnalytics_nutritionMovementHydration: string
  pregAnalytics_noMoodsLogged: string
  pregAnalytics_noSymptomsLogged: string
  pregAnalytics_countLabel: string
  pregAnalytics_valueAndPct: string
  pregAnalytics_symptomCountAndPct: string
  pregAnalytics_weightKg: string
  pregAnalytics_kicksPerHour: string
  pregAnalytics_contractionAvg: string
  pregAnalytics_waterGlasses: string
  pregAnalytics_exerciseMin: string
  pregAnalytics_sleepHours: string
  pregAnalytics_noWeightLogs: string
  pregAnalytics_noKickLogs: string
  pregAnalytics_noContractionLogs: string
  pregAnalytics_trend: string
  pregAnalytics_weekly: string
  pregAnalytics_daily: string
  // ─── B7a: KidsAnalytics ───────────────────────────────────────────────────
  kidsAnalytics_sleep: string
  kidsAnalytics_mood: string
  kidsAnalytics_feeding: string
  kidsAnalytics_diaper: string
  kidsAnalytics_growth: string
  kidsAnalytics_calories: string
  kidsAnalytics_noMoodsLogged: string
  kidsAnalytics_noSleepLogged: string
  kidsAnalytics_noFeedingLogged: string
  kidsAnalytics_overallLast7: string
  kidsAnalytics_countAndPct: string
  kidsAnalytics_trend: string
  kidsAnalytics_weekly: string
  kidsAnalytics_daily: string
  kidsAnalytics_avgSleep: string
  kidsAnalytics_totalFeeds: string
  kidsAnalytics_diaperChanges: string
```

- [ ] **Step 4: Add English values to lib/i18n/en.ts**

```typescript
  // ─── B7a: PregnancyAnalytics ──────────────────────────────────────────────
  pregAnalytics_overallLast7: 'Overall · last 7 days',
  pregAnalytics_sleep: 'Sleep',
  pregAnalytics_mood: 'Mood',
  pregAnalytics_nutritionMovementHydration: 'Nutrition, movement and hydration',
  pregAnalytics_noMoodsLogged: 'No moods logged yet.',
  pregAnalytics_noSymptomsLogged: 'No symptoms logged yet.',
  pregAnalytics_countLabel: '×{{count}}',
  pregAnalytics_valueAndPct: '{{value}} · {{pct}}%',
  pregAnalytics_symptomCountAndPct: '{{count}} · {{pct}}%',
  pregAnalytics_weightKg: 'Weight (kg)',
  pregAnalytics_kicksPerHour: 'Kicks/hour',
  pregAnalytics_contractionAvg: 'Avg contraction gap',
  pregAnalytics_waterGlasses: 'Water (glasses)',
  pregAnalytics_exerciseMin: 'Exercise (min)',
  pregAnalytics_sleepHours: 'Sleep (hours)',
  pregAnalytics_noWeightLogs: 'No weight logs yet.',
  pregAnalytics_noKickLogs: 'No kick count logs yet.',
  pregAnalytics_noContractionLogs: 'No contraction logs yet.',
  pregAnalytics_trend: 'Trend',
  pregAnalytics_weekly: 'Weekly',
  pregAnalytics_daily: 'Daily',
  // ─── B7a: KidsAnalytics ───────────────────────────────────────────────────
  kidsAnalytics_sleep: 'Sleep',
  kidsAnalytics_mood: 'Mood',
  kidsAnalytics_feeding: 'Feeding',
  kidsAnalytics_diaper: 'Diaper',
  kidsAnalytics_growth: 'Growth',
  kidsAnalytics_calories: 'Calories',
  kidsAnalytics_noMoodsLogged: 'No moods logged yet.',
  kidsAnalytics_noSleepLogged: 'No sleep logged yet.',
  kidsAnalytics_noFeedingLogged: 'No feeding logged yet.',
  kidsAnalytics_overallLast7: 'Overall · last 7 days',
  kidsAnalytics_countAndPct: '{{count}} · {{pct}}%',
  kidsAnalytics_trend: 'Trend',
  kidsAnalytics_weekly: 'Weekly',
  kidsAnalytics_daily: 'Daily',
  kidsAnalytics_avgSleep: 'Avg sleep',
  kidsAnalytics_totalFeeds: 'Total feeds',
  kidsAnalytics_diaperChanges: 'Diaper changes',
```

- [ ] **Step 5: Add English placeholders to all 11 locale files**

Same block with English values in each locale file. Append after the last key in each file.

- [ ] **Step 6: Fix PregnancyAnalytics.tsx**

Read file in chunks around all flagged lines and replace. Example patterns:

```tsx
// Before:
<Body size={13} color={colors.textSecondary}>Overall · last 7 days</Body>
// After:
<Body size={13} color={colors.textSecondary}>{t('pregAnalytics_overallLast7')}</Body>

// Before:
<Body size={13} color={colors.text}>Sleep</Body>
// After:
<Body size={13} color={colors.text}>{t('pregAnalytics_sleep')}</Body>

// Before:
<Text style={{ color: colors.textMuted, fontSize: 12 }}>{b.value} · {pct}%</Text>
// After:
<Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('pregAnalytics_valueAndPct', { value: b.value, pct })}</Text>

// Before:
<Text style={...}>×{s.count}</Text>
// After:
<Text style={...}>{t('pregAnalytics_countLabel', { count: s.count })}</Text>
```

- [ ] **Step 7: Fix KidsAnalytics.tsx**

Same approach — read flagged lines, replace with `t('kidsAnalytics_*')` calls.

- [ ] **Step 8: Re-run ESLint on both files**

```bash
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/analytics/PregnancyAnalytics.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/analytics/KidsAnalytics.tsx 2>&1 | grep "no-literal-string"
```

Expected: empty output for both.

- [ ] **Step 9: Gate check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app && npm run typecheck 2>&1 | tail -5
npm run i18n:check
```

Expected: 0 errors, parity green.

---

## Task 3: care-circle.tsx (33) + health-history.tsx (21)

**Files:**
- Modify: `app/profile/care-circle.tsx`
- Modify: `app/profile/health-history.tsx`
- Modify: `lib/i18n/keys.ts`, `lib/i18n/en.ts`, all 11 locale files

**Interfaces:**
- Consumes: check if `useTranslation` is already imported in each file; add if missing: `import { useTranslation } from '../../lib/i18n'` and `const { t } = useTranslation()` inside the component.
- Produces: zero `i18next/no-literal-string` from each file

- [ ] **Step 1: Get violation lists**

```bash
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/app/profile/care-circle.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/app/profile/health-history.tsx 2>&1 | grep "no-literal-string"
```

- [ ] **Step 2: Read both files in chunks around flagged lines**

Known care-circle violations include: `Resend Invite`, `Edit`, `Remove`, `Name`, `Role`, `Email address`, `Phone number`, `Permission level`, `Back`, various card titles and body text.

Known health-history violations: form labels, section headers, placeholder text, empty states.

- [ ] **Step 3: Add new keys to lib/i18n/keys.ts**

```typescript
  // ─── B7a: care-circle ─────────────────────────────────────────────────────
  careCircle_resendInvite: string
  careCircle_edit: string
  careCircle_remove: string
  careCircle_name: string
  careCircle_role: string
  careCircle_emailAddress: string
  careCircle_phoneNumber: string
  careCircle_permissionLevel: string
  careCircle_back: string
  careCircle_fullAccess: string
  careCircle_viewOnly: string
  careCircle_emergencyOnly: string
  careCircle_invitePending: string
  careCircle_activeCaregiver: string
  careCircle_addCaregiver: string
  careCircle_noCaregivers: string
  careCircle_inviteByEmail: string
  careCircle_inviteByPhone: string
  careCircle_sendInvite: string
  careCircle_inviteSent: string
  careCircle_removeConfirmTitle: string
  careCircle_removeConfirmMsg: string
  careCircle_email: string
  // ─── B7a: health-history ──────────────────────────────────────────────────
  healthHistory_bloodType: string
  healthHistory_allergies: string
  healthHistory_conditions: string
  healthHistory_medications: string
  healthHistory_noAllergies: string
  healthHistory_noConditions: string
  healthHistory_noMedications: string
  healthHistory_addAllergy: string
  healthHistory_addCondition: string
  healthHistory_addMedication: string
  healthHistory_allergyPlaceholder: string
  healthHistory_conditionPlaceholder: string
  healthHistory_medicationPlaceholder: string
  healthHistory_emergencyContacts: string
  healthHistory_noContacts: string
  healthHistory_addContact: string
  healthHistory_contactName: string
  healthHistory_contactPhone: string
  healthHistory_relationship: string
  healthHistory_primaryDoctor: string
  healthHistory_doctorName: string
  healthHistory_doctorPhone: string
  healthHistory_hospital: string
  healthHistory_insuranceId: string
```

- [ ] **Step 4: Add English values to lib/i18n/en.ts**

```typescript
  // ─── B7a: care-circle ─────────────────────────────────────────────────────
  careCircle_resendInvite: 'Resend Invite',
  careCircle_edit: 'Edit',
  careCircle_remove: 'Remove',
  careCircle_name: 'Name',
  careCircle_role: 'Role',
  careCircle_emailAddress: 'Email address',
  careCircle_phoneNumber: 'Phone number',
  careCircle_permissionLevel: 'Permission level',
  careCircle_back: 'Back',
  careCircle_fullAccess: 'Full access',
  careCircle_viewOnly: 'View only',
  careCircle_emergencyOnly: 'Emergency only',
  careCircle_invitePending: 'Invite pending',
  careCircle_activeCaregiver: 'Active caregiver',
  careCircle_addCaregiver: 'Add caregiver',
  careCircle_noCaregivers: 'No caregivers yet',
  careCircle_inviteByEmail: 'Invite by email',
  careCircle_inviteByPhone: 'Invite by phone',
  careCircle_sendInvite: 'Send invite',
  careCircle_inviteSent: 'Invite sent!',
  careCircle_removeConfirmTitle: 'Remove caregiver?',
  careCircle_removeConfirmMsg: 'This will revoke their access immediately.',
  careCircle_email: 'Email',
  // ─── B7a: health-history ──────────────────────────────────────────────────
  healthHistory_bloodType: 'Blood Type',
  healthHistory_allergies: 'Allergies',
  healthHistory_conditions: 'Conditions',
  healthHistory_medications: 'Medications',
  healthHistory_noAllergies: 'No allergies listed',
  healthHistory_noConditions: 'No conditions listed',
  healthHistory_noMedications: 'No medications listed',
  healthHistory_addAllergy: 'Add allergy',
  healthHistory_addCondition: 'Add condition',
  healthHistory_addMedication: 'Add medication',
  healthHistory_allergyPlaceholder: 'e.g. Penicillin, peanuts',
  healthHistory_conditionPlaceholder: 'e.g. Gestational diabetes',
  healthHistory_medicationPlaceholder: 'e.g. Prenatal vitamins 400mg',
  healthHistory_emergencyContacts: 'Emergency Contacts',
  healthHistory_noContacts: 'No emergency contacts',
  healthHistory_addContact: 'Add contact',
  healthHistory_contactName: 'Contact name',
  healthHistory_contactPhone: 'Phone number',
  healthHistory_relationship: 'Relationship',
  healthHistory_primaryDoctor: 'Primary Doctor',
  healthHistory_doctorName: 'Doctor name',
  healthHistory_doctorPhone: 'Doctor phone',
  healthHistory_hospital: 'Hospital',
  healthHistory_insuranceId: 'Insurance ID',
```

- [ ] **Step 5: Add English placeholders to all 11 locale files**

Append the same block (English values) to each of the 11 locale files.

- [ ] **Step 6: Fix care-circle.tsx**

Read file around each flagged line. Check if `useTranslation` is imported; if not add:
```tsx
import { useTranslation } from '../../lib/i18n'
// inside component:
const { t } = useTranslation()
```

Then replace all flagged strings with `t('careCircle_*')` calls.

- [ ] **Step 7: Fix health-history.tsx**

Same approach. Relative import path from `app/profile/` → `../../lib/i18n`.

- [ ] **Step 8: Re-run ESLint**

```bash
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/app/profile/care-circle.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/app/profile/health-history.tsx 2>&1 | grep "no-literal-string"
```

Expected: empty output for both.

- [ ] **Step 9: Gate check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app && npm run typecheck 2>&1 | tail -5
npm run i18n:check
```

---

## Task 4: PregnancyCalendar.tsx (31) + InsightsScreen.tsx (22) + CycleDetailSheets.tsx (22)

**Files:**
- Modify: `components/calendar/PregnancyCalendar.tsx`
- Modify: `components/insights/InsightsScreen.tsx`
- Modify: `components/analytics/CycleDetailSheets.tsx`
- Modify: `lib/i18n/keys.ts`, `lib/i18n/en.ts`, all 11 locale files

**Interfaces:**
- Consumes: `useTranslation` — check import in each file; add if missing
- Produces: zero `i18next/no-literal-string` from each file

- [ ] **Step 1: Get violation lists**

```bash
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/calendar/PregnancyCalendar.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/insights/InsightsScreen.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/analytics/CycleDetailSheets.tsx 2>&1 | grep "no-literal-string"
```

- [ ] **Step 2: Read each file around flagged lines**

Known CycleDetailSheets violations: `days avg`, `regular`, `Cycle {d.cycleIdx}`, `No symptoms logged yet.`, `/ 5 avg`, cycle labels.

- [ ] **Step 3: Add new keys to lib/i18n/keys.ts**

```typescript
  // ─── B7a: PregnancyCalendar extra ─────────────────────────────────────────
  pregCal_loggedThisWeek: string
  pregCal_noLogsThisWeek: string
  pregCal_addLog: string
  pregCal_selectDate: string
  pregCal_weekOf: string
  pregCal_journeyWeek: string
  pregCal_symptoms: string
  pregCal_weight: string
  pregCal_kicks: string
  pregCal_contractions: string
  pregCal_water: string
  pregCal_exercise: string
  pregCal_vitamins: string
  pregCal_kegel: string
  pregCal_nutrition: string
  pregCal_sleep: string
  pregCal_mood: string
  pregCal_appointment: string
  pregCal_note: string
  pregCal_timeline: string
  pregCal_journey: string
  // ─── B7a: InsightsScreen extra ────────────────────────────────────────────
  insights_sleepLabel: string
  insights_moodLabel: string
  insights_nutritionLabel: string
  insights_weightLabel: string
  insights_activityLabel: string
  insights_waterLabel: string
  insights_noInsightsYet: string
  insights_viewAll: string
  insights_personalized: string
  // ─── B7a: CycleDetailSheets ───────────────────────────────────────────────
  cycleDetail_daysAvg: string
  cycleDetail_regular: string
  cycleDetail_cycleN: string
  cycleDetail_noSymptomsLogged: string
  cycleDetail_outOf5Avg: string
  cycleDetail_lutealPhase: string
  cycleDetail_follicularPhase: string
  cycleDetail_ovulationPhase: string
  cycleDetail_menstrualPhase: string
  cycleDetail_avgLength: string
  cycleDetail_lastPeriod: string
  cycleDetail_nextPeriod: string
  cycleDetail_fertilityWindow: string
```

- [ ] **Step 4: Add English values to lib/i18n/en.ts**

```typescript
  // ─── B7a: PregnancyCalendar extra ─────────────────────────────────────────
  pregCal_loggedThisWeek: 'Logged this week',
  pregCal_noLogsThisWeek: 'No logs this week',
  pregCal_addLog: 'Add log',
  pregCal_selectDate: 'Select date',
  pregCal_weekOf: 'Week of',
  pregCal_journeyWeek: 'Journey · Week {{n}}',
  pregCal_symptoms: 'Symptoms',
  pregCal_weight: 'Weight',
  pregCal_kicks: 'Kicks',
  pregCal_contractions: 'Contractions',
  pregCal_water: 'Water',
  pregCal_exercise: 'Exercise',
  pregCal_vitamins: 'Vitamins',
  pregCal_kegel: 'Kegel',
  pregCal_nutrition: 'Nutrition',
  pregCal_sleep: 'Sleep',
  pregCal_mood: 'Mood',
  pregCal_appointment: 'Appointment',
  pregCal_note: 'Note',
  pregCal_timeline: 'Timeline',
  pregCal_journey: 'Journey',
  // ─── B7a: InsightsScreen extra ────────────────────────────────────────────
  insights_sleepLabel: 'Sleep',
  insights_moodLabel: 'Mood',
  insights_nutritionLabel: 'Nutrition',
  insights_weightLabel: 'Weight',
  insights_activityLabel: 'Activity',
  insights_waterLabel: 'Water',
  insights_noInsightsYet: 'No insights yet',
  insights_viewAll: 'View all',
  insights_personalized: 'Personalized for you',
  // ─── B7a: CycleDetailSheets ───────────────────────────────────────────────
  cycleDetail_daysAvg: 'days avg',
  cycleDetail_regular: 'regular',
  cycleDetail_cycleN: 'Cycle {{n}}',
  cycleDetail_noSymptomsLogged: 'No symptoms logged yet.',
  cycleDetail_outOf5Avg: '/ 5 avg',
  cycleDetail_lutealPhase: 'Luteal phase',
  cycleDetail_follicularPhase: 'Follicular phase',
  cycleDetail_ovulationPhase: 'Ovulation phase',
  cycleDetail_menstrualPhase: 'Menstrual phase',
  cycleDetail_avgLength: 'Avg length',
  cycleDetail_lastPeriod: 'Last period',
  cycleDetail_nextPeriod: 'Next period',
  cycleDetail_fertilityWindow: 'Fertility window',
```

- [ ] **Step 5: Add English placeholders to all 11 locale files**

Append the full block (with English values) to each locale file.

- [ ] **Step 6: Fix PregnancyCalendar.tsx**

For `cycleDetail_cycleN` style interpolations in CycleDetailSheets: `Cycle {d.cycleIdx}` → `{t('cycleDetail_cycleN', { n: d.cycleIdx })}`.

- [ ] **Step 7: Fix InsightsScreen.tsx**

- [ ] **Step 8: Fix CycleDetailSheets.tsx**

Key pattern: `<Body size={13} color={colors.text}>Cycle {d.cycleIdx}</Body>` → `<Body size={13} color={colors.text}>{t('cycleDetail_cycleN', { n: d.cycleIdx })}</Body>`

- [ ] **Step 9: Re-run ESLint on all three**

```bash
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/calendar/PregnancyCalendar.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/insights/InsightsScreen.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/analytics/CycleDetailSheets.tsx 2>&1 | grep "no-literal-string"
```

- [ ] **Step 10: Gate check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app && npm run typecheck 2>&1 | tail -5
npm run i18n:check
```

---

## Task 5: PregnancyLogForms.tsx (19) + WeightTrendCard.tsx (18) + KidsCalendar.tsx (18)

**Files:**
- Modify: `components/calendar/PregnancyLogForms.tsx`
- Modify: `components/home/pregnancy/WeightTrendCard.tsx`
- Modify: `components/calendar/KidsCalendar.tsx`
- Modify: `lib/i18n/keys.ts`, `lib/i18n/en.ts`, all 11 locale files

**Interfaces:**
- Consumes: `useTranslation` — check and add if missing in each file
- Produces: zero `i18next/no-literal-string` from each file

- [ ] **Step 1: Get violation lists**

```bash
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/calendar/PregnancyLogForms.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/home/pregnancy/WeightTrendCard.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/calendar/KidsCalendar.tsx 2>&1 | grep "no-literal-string"
```

- [ ] **Step 2: Read each file around flagged lines**

Known WeightTrendCard violations: `STARTING`, `GAINED`, `PACE`, `IOM TARGET · {band.label.toUpperCase()}`, `{band.low}–{band.high}`, `RECENT ENTRIES`, `WEIGHT TREND · WEEK {weekNumber}`, `kg`, `START`, `GAINED` (duplicate), `PACE` (duplicate).

- [ ] **Step 3: Add new keys to lib/i18n/keys.ts**

```typescript
  // ─── B7a: PregnancyLogForms extra ─────────────────────────────────────────
  pregLogForm_howAreYouFeeling: string
  pregLogForm_logWater: string
  pregLogForm_glassesOfWater: string
  pregLogForm_logExercise: string
  pregLogForm_minutesActive: string
  pregLogForm_logVitamins: string
  pregLogForm_vitaminsTaken: string
  pregLogForm_logKegel: string
  pregLogForm_repsCompleted: string
  pregLogForm_logNutrition: string
  pregLogForm_mealsEaten: string
  pregLogForm_addNote: string
  pregLogForm_contractionTimer: string
  pregLogForm_startTimer: string
  pregLogForm_stopTimer: string
  pregLogForm_duration: string
  pregLogForm_interval: string
  pregLogForm_intensity: string
  pregLogForm_mild: string
  pregLogForm_moderate: string
  pregLogForm_strong: string
  // ─── B7a: WeightTrendCard ─────────────────────────────────────────────────
  weightCard_starting: string
  weightCard_gained: string
  weightCard_pace: string
  weightCard_iomTarget: string
  weightCard_iomRange: string
  weightCard_recentEntries: string
  weightCard_weightTrendWeek: string
  weightCard_kg: string
  weightCard_start: string
  // ─── B7a: KidsCalendar ────────────────────────────────────────────────────
  kidsCal_loggedThisWeek: string
  kidsCal_noLogsThisWeek: string
  kidsCal_addLog: string
  kidsCal_selectDate: string
  kidsCal_today: string
  kidsCal_timeline: string
  kidsCal_food: string
  kidsCal_notes: string
  kidsCal_sleep: string
  kidsCal_mood: string
  kidsCal_feeding: string
  kidsCal_diaper: string
  kidsCal_medicine: string
  kidsCal_vaccine: string
  kidsCal_milestone: string
  kidsCal_appointment: string
  kidsCal_note: string
  kidsCal_activity: string
```

- [ ] **Step 4: Add English values to lib/i18n/en.ts**

```typescript
  // ─── B7a: PregnancyLogForms extra ─────────────────────────────────────────
  pregLogForm_howAreYouFeeling: 'How are you feeling?',
  pregLogForm_logWater: 'Log Water',
  pregLogForm_glassesOfWater: 'Glasses of water',
  pregLogForm_logExercise: 'Log Exercise',
  pregLogForm_minutesActive: 'Minutes active',
  pregLogForm_logVitamins: 'Log Vitamins',
  pregLogForm_vitaminsTaken: 'Vitamins taken',
  pregLogForm_logKegel: 'Log Kegel',
  pregLogForm_repsCompleted: 'Reps completed',
  pregLogForm_logNutrition: 'Log Nutrition',
  pregLogForm_mealsEaten: 'Meals eaten',
  pregLogForm_addNote: 'Add a note',
  pregLogForm_contractionTimer: 'Contraction Timer',
  pregLogForm_startTimer: 'Start timer',
  pregLogForm_stopTimer: 'Stop timer',
  pregLogForm_duration: 'Duration',
  pregLogForm_interval: 'Interval',
  pregLogForm_intensity: 'Intensity',
  pregLogForm_mild: 'Mild',
  pregLogForm_moderate: 'Moderate',
  pregLogForm_strong: 'Strong',
  // ─── B7a: WeightTrendCard ─────────────────────────────────────────────────
  weightCard_starting: 'STARTING',
  weightCard_gained: 'GAINED',
  weightCard_pace: 'PACE',
  weightCard_iomTarget: 'IOM TARGET · {{label}}',
  weightCard_iomRange: '{{low}}–{{high}}',
  weightCard_recentEntries: 'RECENT ENTRIES',
  weightCard_weightTrendWeek: 'WEIGHT TREND · WEEK {{week}}',
  weightCard_kg: 'kg',
  weightCard_start: 'START',
  // ─── B7a: KidsCalendar ────────────────────────────────────────────────────
  kidsCal_loggedThisWeek: 'Logged this week',
  kidsCal_noLogsThisWeek: 'No logs this week',
  kidsCal_addLog: 'Add log',
  kidsCal_selectDate: 'Select date',
  kidsCal_today: 'Today',
  kidsCal_timeline: 'Timeline',
  kidsCal_food: 'Food',
  kidsCal_notes: 'Notes',
  kidsCal_sleep: 'Sleep',
  kidsCal_mood: 'Mood',
  kidsCal_feeding: 'Feeding',
  kidsCal_diaper: 'Diaper',
  kidsCal_medicine: 'Medicine',
  kidsCal_vaccine: 'Vaccine',
  kidsCal_milestone: 'Milestone',
  kidsCal_appointment: 'Appointment',
  kidsCal_note: 'Note',
  kidsCal_activity: 'Activity',
```

- [ ] **Step 5: Add English placeholders to all 11 locale files**

- [ ] **Step 6: Fix PregnancyLogForms.tsx**

Key pattern for WeightTrendCard: the `IOM TARGET · {band.label.toUpperCase()}` must become:
```tsx
{t('weightCard_iomTarget', { label: band.label.toUpperCase() })}
```
And `{band.low}–{band.high}`:
```tsx
{t('weightCard_iomRange', { low: band.low, high: band.high })}
```

- [ ] **Step 7: Fix WeightTrendCard.tsx**

Apply the same pattern. For `WEIGHT TREND · WEEK {weekNumber}`:
```tsx
{t('weightCard_weightTrendWeek', { week: weekNumber })}
```

- [ ] **Step 8: Fix KidsCalendar.tsx**

- [ ] **Step 9: Re-run ESLint on all three**

```bash
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/calendar/PregnancyLogForms.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/home/pregnancy/WeightTrendCard.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/calendar/KidsCalendar.tsx 2>&1 | grep "no-literal-string"
```

- [ ] **Step 10: Gate check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app && npm run typecheck 2>&1 | tail -5
npm run i18n:check
```

---

## Task 6: channel/info/[id].tsx (14) + KidsJourneyRing.tsx (11) + TodayDashboardModal.tsx (11)

**Files:**
- Modify: `app/channel/info/[id].tsx`
- Modify: `components/kids/KidsJourneyRing.tsx`
- Modify: `components/home/pregnancy/TodayDashboardModal.tsx`
- Modify: `lib/i18n/keys.ts`, `lib/i18n/en.ts`, all 11 locale files

**Interfaces:**
- Consumes: `useTranslation` — check and add if missing
- Produces: zero `i18next/no-literal-string` from each file

- [ ] **Step 1: Get violation lists**

```bash
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/app/channel/info/[id].tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/kids/KidsJourneyRing.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/home/pregnancy/TodayDashboardModal.tsx 2>&1 | grep "no-literal-string"
```

- [ ] **Step 2: Read each file around flagged lines**

- [ ] **Step 3: Add new keys to lib/i18n/keys.ts**

```typescript
  // ─── B7a: channel/info ────────────────────────────────────────────────────
  channelInfo_members: string
  channelInfo_membersCount: string
  channelInfo_about: string
  channelInfo_created: string
  channelInfo_leaveChannel: string
  channelInfo_leaveConfirmTitle: string
  channelInfo_leaveConfirmMsg: string
  channelInfo_joinChannel: string
  channelInfo_noDescription: string
  channelInfo_muteNotifications: string
  channelInfo_reportChannel: string
  channelInfo_blockChannel: string
  channelInfo_privateChannel: string
  channelInfo_publicChannel: string
  // ─── B7a: KidsJourneyRing ─────────────────────────────────────────────────
  kidsRing_monthsOld: string
  kidsRing_weeksOld: string
  kidsRing_daysOld: string
  kidsRing_nextLeap: string
  kidsRing_inDays: string
  kidsRing_today: string
  kidsRing_ageLabel: string
  kidsRing_developmentPhase: string
  kidsRing_loggedToday: string
  kidsRing_streak: string
  kidsRing_days: string
  // ─── B7a: TodayDashboardModal ─────────────────────────────────────────────
  todayDash_todaysSummary: string
  todayDash_logSomething: string
  todayDash_noLogsToday: string
  todayDash_sleep: string
  todayDash_mood: string
  todayDash_weight: string
  todayDash_kicks: string
  todayDash_water: string
  todayDash_vitamins: string
  todayDash_exercise: string
  todayDash_close: string
```

- [ ] **Step 4: Add English values to lib/i18n/en.ts**

```typescript
  // ─── B7a: channel/info ────────────────────────────────────────────────────
  channelInfo_members: 'Members',
  channelInfo_membersCount: '{{count}} members',
  channelInfo_about: 'About',
  channelInfo_created: 'Created',
  channelInfo_leaveChannel: 'Leave channel',
  channelInfo_leaveConfirmTitle: 'Leave channel?',
  channelInfo_leaveConfirmMsg: 'You will stop receiving updates from this channel.',
  channelInfo_joinChannel: 'Join channel',
  channelInfo_noDescription: 'No description',
  channelInfo_muteNotifications: 'Mute notifications',
  channelInfo_reportChannel: 'Report channel',
  channelInfo_blockChannel: 'Block channel',
  channelInfo_privateChannel: 'Private',
  channelInfo_publicChannel: 'Public',
  // ─── B7a: KidsJourneyRing ─────────────────────────────────────────────────
  kidsRing_monthsOld: '{{n}} mo',
  kidsRing_weeksOld: '{{n}} wk',
  kidsRing_daysOld: '{{n}} days',
  kidsRing_nextLeap: 'Next leap',
  kidsRing_inDays: 'in {{n}} days',
  kidsRing_today: 'today',
  kidsRing_ageLabel: 'Age',
  kidsRing_developmentPhase: 'Development phase',
  kidsRing_loggedToday: 'Logged today',
  kidsRing_streak: 'day streak',
  kidsRing_days: 'days',
  // ─── B7a: TodayDashboardModal ─────────────────────────────────────────────
  todayDash_todaysSummary: "Today's Summary",
  todayDash_logSomething: 'Log something',
  todayDash_noLogsToday: 'Nothing logged yet today',
  todayDash_sleep: 'Sleep',
  todayDash_mood: 'Mood',
  todayDash_weight: 'Weight',
  todayDash_kicks: 'Kicks',
  todayDash_water: 'Water',
  todayDash_vitamins: 'Vitamins',
  todayDash_exercise: 'Exercise',
  todayDash_close: 'Close',
```

- [ ] **Step 5: Add English placeholders to all 11 locale files**

- [ ] **Step 6: Fix app/channel/info/[id].tsx**

Import path from `app/channel/info/` to i18n: `'../../../lib/i18n'`.

- [ ] **Step 7: Fix components/kids/KidsJourneyRing.tsx**

- [ ] **Step 8: Fix components/home/pregnancy/TodayDashboardModal.tsx**

- [ ] **Step 9: Re-run ESLint on all three**

```bash
npx eslint "/Users/igorcarvalhorodrigues/Projects/grandma-app/app/channel/info/[id].tsx" 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/kids/KidsJourneyRing.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/home/pregnancy/TodayDashboardModal.tsx 2>&1 | grep "no-literal-string"
```

- [ ] **Step 10: Gate check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app && npm run typecheck 2>&1 | tail -5
npm run i18n:check
```

---

## Task 7: KidsLogForms.tsx (11) + pregnancy.tsx (11) + kids.tsx (11) + first commit

**Files:**
- Modify: `components/calendar/KidsLogForms.tsx`
- Modify: `app/profile/pregnancy.tsx`
- Modify: `app/profile/kids.tsx`
- Modify: `lib/i18n/keys.ts`, `lib/i18n/en.ts`, all 11 locale files

**Interfaces:**
- Consumes: `useTranslation` — check and add if missing in each file
- Produces: zero `i18next/no-literal-string` from each file; clean final gate; commit(s)

- [ ] **Step 1: Get violation lists**

```bash
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/calendar/KidsLogForms.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/app/profile/pregnancy.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/app/profile/kids.tsx 2>&1 | grep "no-literal-string"
```

- [ ] **Step 2: Read each file around flagged lines**

Known pregnancy.tsx violations: `Open birth plan`, `Types · plan · checklist`, `Manage birth team`, `Care circle`, `Emergency card`, `Manage →`.

Known kids.tsx violations: `Sex *`, `Birth Date *`, `Blood Type`, `Country (vaccine schedule)`.

- [ ] **Step 3: Add new keys to lib/i18n/keys.ts**

```typescript
  // ─── B7a: KidsLogForms ────────────────────────────────────────────────────
  kidsLogForm_logSleep: string
  kidsLogForm_sleepDuration: string
  kidsLogForm_logMood: string
  kidsLogForm_howsTheBaby: string
  kidsLogForm_logFeeding: string
  kidsLogForm_feedingType: string
  kidsLogForm_breast: string
  kidsLogForm_bottle: string
  kidsLogForm_solid: string
  kidsLogForm_logDiaper: string
  kidsLogForm_diaperType: string
  kidsLogForm_wet: string
  kidsLogForm_dirty: string
  kidsLogForm_both: string
  // ─── B7a: profile/pregnancy ───────────────────────────────────────────────
  profPreg_openBirthPlan: string
  profPreg_birthPlanSubtitle: string
  profPreg_manageBirthTeam: string
  profPreg_careCircle: string
  profPreg_emergencyCard: string
  profPreg_manage: string
  profPreg_dueDate: string
  profPreg_currentWeek: string
  profPreg_hospital: string
  profPreg_obProvider: string
  profPreg_bloodType: string
  profPreg_groupBStrep: string
  profPreg_birthPreferences: string
  profPreg_editProfile: string
  // ─── B7a: profile/kids ────────────────────────────────────────────────────
  profKids_sex: string
  profKids_birthDate: string
  profKids_bloodType: string
  profKids_vaccineCountry: string
  profKids_name: string
  profKids_addChild: string
  profKids_editChild: string
  profKids_deleteChild: string
  profKids_deleteConfirmTitle: string
  profKids_deleteConfirmMsg: string
  profKids_noChildren: string
```

- [ ] **Step 4: Add English values to lib/i18n/en.ts**

```typescript
  // ─── B7a: KidsLogForms ────────────────────────────────────────────────────
  kidsLogForm_logSleep: 'Log Sleep',
  kidsLogForm_sleepDuration: 'Sleep duration',
  kidsLogForm_logMood: 'Log Mood',
  kidsLogForm_howsTheBaby: "How's the baby?",
  kidsLogForm_logFeeding: 'Log Feeding',
  kidsLogForm_feedingType: 'Feeding type',
  kidsLogForm_breast: 'Breast',
  kidsLogForm_bottle: 'Bottle',
  kidsLogForm_solid: 'Solid',
  kidsLogForm_logDiaper: 'Log Diaper',
  kidsLogForm_diaperType: 'Diaper type',
  kidsLogForm_wet: 'Wet',
  kidsLogForm_dirty: 'Dirty',
  kidsLogForm_both: 'Both',
  // ─── B7a: profile/pregnancy ───────────────────────────────────────────────
  profPreg_openBirthPlan: 'Open birth plan',
  profPreg_birthPlanSubtitle: 'Types · plan · checklist',
  profPreg_manageBirthTeam: 'Manage birth team',
  profPreg_careCircle: 'Care circle',
  profPreg_emergencyCard: 'Emergency card',
  profPreg_manage: 'Manage →',
  profPreg_dueDate: 'Due date',
  profPreg_currentWeek: 'Current week',
  profPreg_hospital: 'Hospital',
  profPreg_obProvider: 'OB / Midwife',
  profPreg_bloodType: 'Blood type',
  profPreg_groupBStrep: 'Group B Strep',
  profPreg_birthPreferences: 'Birth preferences',
  profPreg_editProfile: 'Edit profile',
  // ─── B7a: profile/kids ────────────────────────────────────────────────────
  profKids_sex: 'Sex *',
  profKids_birthDate: 'Birth Date *',
  profKids_bloodType: 'Blood Type',
  profKids_vaccineCountry: 'Country (vaccine schedule)',
  profKids_name: 'Name',
  profKids_addChild: 'Add child',
  profKids_editChild: 'Edit child',
  profKids_deleteChild: 'Delete child',
  profKids_deleteConfirmTitle: 'Delete child profile?',
  profKids_deleteConfirmMsg: 'This will remove all logs and data for this child.',
  profKids_noChildren: 'No children yet',
```

- [ ] **Step 5: Add English placeholders to all 11 locale files**

- [ ] **Step 6: Fix components/calendar/KidsLogForms.tsx**

- [ ] **Step 7: Fix app/profile/pregnancy.tsx**

Import path: `'../../lib/i18n'`.

- [ ] **Step 8: Fix app/profile/kids.tsx**

Import path: `'../../lib/i18n'`.

- [ ] **Step 9: Re-run ESLint on all three**

```bash
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/components/calendar/KidsLogForms.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/app/profile/pregnancy.tsx 2>&1 | grep "no-literal-string"
npx eslint /Users/igorcarvalhorodrigues/Projects/grandma-app/app/profile/kids.tsx 2>&1 | grep "no-literal-string"
```

- [ ] **Step 10: Final gate check — all 17 files**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app && npm run typecheck 2>&1 | tail -5
npm run i18n:check

npx eslint \
  components/home/KidsHome.tsx \
  components/analytics/PregnancyAnalytics.tsx \
  components/analytics/KidsAnalytics.tsx \
  app/profile/care-circle.tsx \
  components/calendar/PregnancyCalendar.tsx \
  components/insights/InsightsScreen.tsx \
  components/analytics/CycleDetailSheets.tsx \
  app/profile/health-history.tsx \
  components/calendar/PregnancyLogForms.tsx \
  components/home/pregnancy/WeightTrendCard.tsx \
  components/calendar/KidsCalendar.tsx \
  "app/channel/info/[id].tsx" \
  components/kids/KidsJourneyRing.tsx \
  components/home/pregnancy/TodayDashboardModal.tsx \
  components/calendar/KidsLogForms.tsx \
  app/profile/pregnancy.tsx \
  app/profile/kids.tsx \
  2>&1 | grep "no-literal-string" | wc -l
```

Expected: typecheck 0 errors, parity green, no-literal-string count = 0.

- [ ] **Step 11: Stage and commit (split if needed)**

Commit 1 (first 9 files — Tasks 1–4):
```bash
git add \
  components/home/KidsHome.tsx \
  components/analytics/PregnancyAnalytics.tsx \
  components/analytics/KidsAnalytics.tsx \
  app/profile/care-circle.tsx \
  components/calendar/PregnancyCalendar.tsx \
  components/insights/InsightsScreen.tsx \
  components/analytics/CycleDetailSheets.tsx \
  app/profile/health-history.tsx \
  lib/i18n/keys.ts lib/i18n/en.ts \
  lib/i18n/pt-BR.ts lib/i18n/es.ts lib/i18n/fr.ts lib/i18n/de.ts \
  lib/i18n/it.ts lib/i18n/ja.ts lib/i18n/ko.ts lib/i18n/zh.ts \
  lib/i18n/ar.ts lib/i18n/hi.ts lib/i18n/tr.ts
git commit -m "feat(i18n): B7a pt1 — clear heavy files (KidsHome, analytics, care-circle, insights)"
```

Commit 2 (remaining 8 files — Tasks 5–7):
```bash
git add \
  components/calendar/PregnancyLogForms.tsx \
  components/home/pregnancy/WeightTrendCard.tsx \
  components/calendar/KidsCalendar.tsx \
  "app/channel/info/[id].tsx" \
  components/kids/KidsJourneyRing.tsx \
  components/home/pregnancy/TodayDashboardModal.tsx \
  components/calendar/KidsLogForms.tsx \
  app/profile/pregnancy.tsx \
  app/profile/kids.tsx \
  lib/i18n/keys.ts lib/i18n/en.ts \
  lib/i18n/pt-BR.ts lib/i18n/es.ts lib/i18n/fr.ts lib/i18n/de.ts \
  lib/i18n/it.ts lib/i18n/ja.ts lib/i18n/ko.ts lib/i18n/zh.ts \
  lib/i18n/ar.ts lib/i18n/hi.ts lib/i18n/tr.ts
git commit -m "feat(i18n): B7a pt2 — clear heavy files (logforms, weightcard, calendars, profiles, channel)"
```

- [ ] **Step 12: Write report to /tmp/task-B7a-report.md**

Include per-file violation counts before→after, total keys added, any prose left for Phase C, gate check outputs, and commit hashes.

---

## Self-Review

**Spec coverage:**
- [x] All 17 files addressed with dedicated steps
- [x] Gate check (typecheck + parity) after every 4 files
- [x] Commit strategy defined (split into 2 commits)
- [x] 11 locale files explicitly named in every key-addition step
- [x] Interpolation pattern shown for dynamic strings (`{{n}}`, `{{count}}`, `{{pct}}`)
- [x] The `—` em dash edge case (line 1880 of KidsHome) handled
- [x] Import path variations accounted for per directory depth
- [x] Common key reuse instructed before adding new keys

**Placeholder scan:** No TBD/TODO/placeholder language present. All code blocks contain real content.

**Type consistency:** All key names referenced in "Fix" steps match the key names defined in "Add new keys" steps within the same task. The `common_emDash` key is defined in Task 1 and not re-referenced in later tasks.

**Important note on key counts:** The key lists above are representative based on the initial ESLint scan. The actual violation list will be longer when you run ESLint fresh — some lines produce multiple violations. When you encounter a string not covered by the pre-defined keys, add an appropriately named key in the same task's key block before using it. Follow the prefix convention for the file you are editing.
