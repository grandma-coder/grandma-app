# Home Quick-Log Full Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each behavior's home "Log for today" QuickLogPicker offer every log type its Calendar can create, by expanding the quick-log catalogs and unifying each behavior's log routing into one shared router used by both calendar and home.

**Architecture:** Cycle already has a shared `CycleLogRouter` — only catalog + picker-icon entries are needed. Pregnancy's router is a private function inside `PregnancyCalendar.tsx`; extract it to `components/calendar/PregnancyLogRouter.tsx` and have both calendar + home use it. Kids has no router — extract the calendar's inline log sheets into `components/calendar/KidsLogRouter.tsx` and have both surfaces use it. New chips ship OFF by default.

**Tech Stack:** React Native 0.81, Expo SDK 54, TypeScript strict, Zustand v5, React Query v5. Design tokens from `constants/theme.ts`.

## Global Constraints

- **Design tokens only** — no hardcoded hex/radius/font. Chip/sticker glyphs come from existing `Character` / sticker components; icon hues from `useTheme().stickers`. (CLAUDE.md / DESIGN_SYSTEM.md)
- **No new log forms** — every gap type already has a form; reuse it. No form logic is written in this plan.
- **Defaults unchanged** — `DEFAULT_*_QUICK_LOG_KEYS` arrays are NOT modified. New catalog entries ship disabled by default.
- **Local dates** — home logs to today via `toDateStr(new Date())`, never `toISOString().split('T')[0]`.
- **Typecheck** with `npm run typecheck` (this repo wraps `tsc`; do NOT rely on raw `npx tsc --noEmit` line numbers — they can be stale from incremental cache; if in doubt delete `*.tsbuildinfo` first).
- **Tests** with `npm test`.
- **Work on `main`** — no worktrees/branches.
- **i18n keys go in ALL locale files, not just en.ts.** Every locale (`lib/i18n/{en,ar,de,es,fr,hi,it,ja,ko,pt-BR,tr,zh}.ts`) is typed against `TranslationKeys` (`lib/i18n/keys.ts`), so a new key must be added to the `keys.ts` type AND to every one of the 12 locale files (English fallback string is fine for non-en locales — matches the codebase convention). Adding to only `en.ts` + `keys.ts` WILL fail typecheck. Wherever a task step says "add to `lib/i18n/en.ts` + `keys.ts`", read it as "add to `keys.ts` + all 12 locale files." Prefer reusing an existing key (no new key) whenever the calendar already names the type — that avoids the locale sweep entirely.
- **Concurrent workstream is active on `main`.** Another stream commits between our tasks (e.g. `VaccineTrackerSheet`, MemoriesSheet i18n) and leaves unrelated working-tree edits (`app/daily-rewards.tsx`, `app/leaderboard.tsx`, `components/insights/InsightsScreen.tsx`). Stage ONLY your task's files; never `git add -A`. When generating a review package, a task's BASE is its commit's actual parent (`git rev-parse <commit>^`), which may be a concurrent commit, not the previous task's commit.
- **Router contracts (exact):**
  - Cycle forms: `{ date, phase, onSaved }`. `CycleLogRouter` already computes `phase`.
  - Pregnancy forms: `{ date, onSaved }` uniformly (the `nutrition`/`PregnancyMealForm` case is reconciled to `{ date, onSaved }`).
  - Kids forms: superset `{ onSaved, initialDate?, prefill?, editLog?, onSkip? }` with per-type prop stripping; `exam` is the outlier `{ behavior, childId, date, onSaved }`.

---

### Task 1: Cycle — expand quick-log catalog to full parity

**Files:**
- Modify: `lib/cycleQuickLogs.ts`

**Interfaces:**
- Consumes: existing `CycleQuickLogSheet` union + `CycleQuickLogDef` (already in this file).
- Produces: 7 new entries in `CYCLE_QUICK_LOGS` (`period_end`, `pregnancy_test`, `sex_drive`, `clots`, `weight`, `water`, `activity`). `CycleLogRouter` already routes all of these — no routing change needed.

Note: the `CycleQuickLogSheet` union currently only lists the 7 original sheets. It must widen to include the new sheet ids. `CycleLogRouter` keys off `LogType` (from `LogActivitySheet`), not this union — but `CycleTodaySummaryCard` maps `chip.sheet` → the router's `sheetType`, so the new keys must use the router's `LogType` string values: `period_end`, `pregnancy_test`, `sex_drive`, `clots`, `weight`, `water`, `activity`.

- [ ] **Step 1: Widen the sheet union + add catalog entries**

In `lib/cycleQuickLogs.ts`, replace the `CycleQuickLogSheet` type and `CYCLE_QUICK_LOGS` array:

```ts
export type CycleQuickLogSheet =
  | 'mood' | 'symptom' | 'basal_temp' | 'lh' | 'cm' | 'intercourse' | 'period_start'
  | 'period_end' | 'pregnancy_test' | 'sex_drive' | 'clots' | 'weight' | 'water' | 'activity'

export interface CycleQuickLogDef {
  key: string
  sheet: CycleQuickLogSheet
  labelKey: TranslationKey
}

export const CYCLE_QUICK_LOGS: CycleQuickLogDef[] = [
  { key: 'mood',           sheet: 'mood',           labelKey: 'cycleQuickLog_mood' },
  { key: 'symptoms',       sheet: 'symptom',        labelKey: 'cycleQuickLog_symptoms' },
  { key: 'bbt',            sheet: 'basal_temp',     labelKey: 'cycleQuickLog_bbt' },
  { key: 'lh',             sheet: 'lh',             labelKey: 'cycleQuickLog_lh' },
  { key: 'cm',             sheet: 'cm',             labelKey: 'cycleQuickLog_cm' },
  { key: 'intimacy',       sheet: 'intercourse',    labelKey: 'cycleQuickLog_intimacy' },
  { key: 'period_start',   sheet: 'period_start',   labelKey: 'cycleQuickLog_periodStart' },
  { key: 'period_end',     sheet: 'period_end',     labelKey: 'cycleCalendar_logEntry_periodEnd' },
  { key: 'pregnancy_test', sheet: 'pregnancy_test', labelKey: 'cycleCalendar_logEntry_pregTest' },
  { key: 'sex_drive',      sheet: 'sex_drive',      labelKey: 'cycleCalendar_logEntry_sexDrive' },
  { key: 'clots',          sheet: 'clots',          labelKey: 'cycleCalendar_logEntry_clots' },
  { key: 'weight',         sheet: 'weight',         labelKey: 'cycleCalendar_logEntry_weight' },
  { key: 'water',          sheet: 'water',          labelKey: 'cycleCalendar_logEntry_water' },
  { key: 'activity',       sheet: 'activity',       labelKey: 'cycleCalendar_logEntry_activity' },
]

// UNCHANGED — new chips are OFF by default.
export const DEFAULT_CYCLE_QUICK_LOG_KEYS = ['mood', 'symptoms', 'bbt', 'lh']
```

Keep the existing `cycleQuickLogByKey` helper as-is.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no NEW errors in `lib/cycleQuickLogs.ts`. (The `cycleCalendar_logEntry_*` / `cycleQuickLog_*` keys already exist — confirm each resolves; if any `labelKey` errors as not in `TranslationKey`, that key is missing and Task 1b below adds it.)

- [ ] **Step 3: Add any missing i18n label keys (only if Step 2 flagged them)**

If Step 2 reported a `labelKey` not assignable to `TranslationKey`, add that key to `lib/i18n/en.ts` and to the `TranslationKeys`/`keys.ts` type with a plain English string (e.g. `cycleQuickLog_lh: 'LH test'`). Reuse the exact `cycleCalendar_logEntry_*` strings already present when possible. If Step 2 was clean, skip this step.

- [ ] **Step 4: Commit**

```bash
git add lib/cycleQuickLogs.ts lib/i18n/en.ts lib/i18n/keys.ts
git commit -m "feat(cycle): expand home quick-log catalog to full calendar parity"
```

---

### Task 2: Cycle — render new chips in picker + summary card

**Files:**
- Modify: `components/home/cycle/CycleQuickLogPicker.tsx`
- Modify: `components/home/cycle/CycleTodaySummaryCard.tsx`

**Interfaces:**
- Consumes: the 7 new keys from `CYCLE_QUICK_LOGS` (Task 1).
- Produces: icon + done-state rendering for each new key, and `CycleTodaySummaryCard` chips that open the correct router sheet.

- [ ] **Step 1: Add picker glyphs for the new keys**

In `components/home/cycle/CycleQuickLogPicker.tsx`, extend `CYCLE_LOG_META` with the 7 new keys (add after `period_start`):

```tsx
  period_end:     { char: 'period',      hue: 'coral',  soft: 'peachSoft' },
  pregnancy_test: { char: 'ovulation',   hue: 'yellow', soft: 'yellowSoft' },
  sex_drive:      { char: 'heart',       hue: 'pink',   soft: 'pinkSoft' },
  clots:          { char: 'warning',     hue: 'coral',  soft: 'peachSoft' },
  weight:         { char: 'growth',      hue: 'peach',  soft: 'peachSoft' },
  water:          { char: 'water',       hue: 'blue',   soft: 'blueSoft' },
  activity:       { char: 'activity',    hue: 'green',  soft: 'greenSoft' },
```

Then extend the non-diffuse `stickerFor` switch with matching cases (add before `default:`):

```tsx
    case 'period_end':     return { node: <Drop size={24} fill={stickers.coral} />, soft: stickers.peachSoft }
    case 'pregnancy_test': return { node: <Drop size={24} fill={stickers.yellow} />, soft: stickers.yellowSoft }
    case 'sex_drive':      return { node: <Heart size={24} fill={stickers.pink} />, soft: stickers.pinkSoft }
    case 'clots':          return { node: <Drop size={24} fill={stickers.coral} />, soft: stickers.peachSoft }
    case 'weight':         return { node: <Drop size={24} fill={stickers.peach} />, soft: stickers.peachSoft }
    case 'water':          return { node: <Drop size={24} fill={stickers.blue} />, soft: stickers.blueSoft }
    case 'activity':       return { node: <Heart size={24} fill={stickers.green} />, soft: stickers.greenSoft }
```

(If any `char` name — e.g. `'ovulation'`, `'warning'`, `'growth'` — is not a valid `CharacterName`, substitute the closest existing one; verify against `components/characters/Characters.tsx`. `'water'`, `'heart'`, `'period'`, `'activity'` are known-valid from existing entries.)

- [ ] **Step 2: Add summary-card chips for the new keys**

In `components/home/cycle/CycleTodaySummaryCard.tsx`:

1. Read the row value for each new type from the `rows` query (the card already reads `cycle_logs` rows for the day). Add value lookups next to the existing ones (`moodValue`, `bbtValue`, …):

```tsx
  const periodEnd = rows.find((r) => r.type === 'period_end')?.value ?? null
  const pregTest = rows.find((r) => r.type === 'pregnancy_test')?.value ?? null
  const sexDrive = rows.find((r) => r.type === 'sex_drive')?.value ?? null
  const clots = rows.find((r) => r.type === 'clots')?.value ?? null
  const weight = rows.find((r) => r.type === 'weight')?.value ?? null
  const water = rows.find((r) => r.type === 'water')?.value ?? null
  const activity = rows.find((r) => r.type === 'activity')?.value ?? null
```

2. Add a chip object to the `chips` array for each new key (append after `period_start`). The `sheet` value MUST match the router's `LogType`:

```tsx
    {
      key: 'period_end', sheet: 'period_end',
      icon: diffuse ? <Character name="period" size={24} color={periodEnd ? stickers.coral : stickers.pinkSoft} /> : <Drop size={22} fill={periodEnd ? stickers.coral : stickers.pinkSoft} />,
      label: periodEnd ? '✓' : '+', done: !!periodEnd,
    },
    {
      key: 'pregnancy_test', sheet: 'pregnancy_test',
      icon: diffuse ? <Character name="ovulation" size={24} color={stickers.yellow} /> : <Drop size={22} fill={stickers.yellow} />,
      label: pregTest ? (pregTest === 'positive' ? 'Pos' : pregTest === 'negative' ? 'Neg' : '✓') : '+', done: !!pregTest,
    },
    {
      key: 'sex_drive', sheet: 'sex_drive',
      icon: diffuse ? <Character name="heart" size={24} color={sexDrive ? stickers.pink : stickers.pinkSoft} /> : <Heart size={22} fill={sexDrive ? stickers.pink : stickers.pinkSoft} />,
      label: sexDrive ?? '+', done: !!sexDrive,
    },
    {
      key: 'clots', sheet: 'clots',
      icon: diffuse ? <Character name="warning" size={24} color={stickers.coral} /> : <Drop size={22} fill={stickers.coral} />,
      label: clots ?? (clots ? '✓' : '+'), done: !!clots,
    },
    {
      key: 'weight', sheet: 'weight',
      icon: diffuse ? <Character name="growth" size={24} color={stickers.peach} /> : <Drop size={22} fill={stickers.peach} />,
      label: weight ? `${weight}` : '+', done: !!weight,
    },
    {
      key: 'water', sheet: 'water',
      icon: diffuse ? <Character name="water" size={24} color={stickers.blue} /> : <Drop size={22} fill={stickers.blue} />,
      label: water ? `${water}` : '+', done: !!water,
    },
    {
      key: 'activity', sheet: 'activity',
      icon: diffuse ? <Character name="activity" size={24} color={stickers.green} /> : <Heart size={22} fill={stickers.green} />,
      label: activity ? '✓' : '+', done: !!activity,
    },
```

3. The card's `CycleSheetType` type (top of file) and the `sheetTitle` record must include the new sheet ids. Widen `CycleSheetType` to match the router's `LogType`, and ensure tapping a chip sets `sheetType` to a value the card's `<LogSheet>`/router wiring handles. **If the card renders its own per-sheet `<LogSheet>` forms (not the shared router), extend those too** — read the card's existing sheet-rendering block and add one `<LogSheet>` per new type using the same `CycleLogForms` components (`PeriodEndForm`, `PregnancyTestForm`, `SexDriveForm`, `ClotsForm`, `WeightForm`, `WaterForm`, `ActivityForm`), each with `date={logDate} phase={phase} onSaved={onLogSaved}` matching the existing `MoodForm`/`BbtForm` blocks in that file.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no new errors. Resolve any `CharacterName` / `CycleSheetType` mismatches.

- [ ] **Step 4: Manual sanity (describe, do not automate)**

Confirm by reading the diff: each of the 7 new keys has (a) a picker glyph, (b) a summary-card chip whose `sheet` equals the router `LogType`, (c) a form that opens. No default-set change.

- [ ] **Step 5: Commit**

```bash
git add components/home/cycle/CycleQuickLogPicker.tsx components/home/cycle/CycleTodaySummaryCard.tsx
git commit -m "feat(cycle): render new quick-log chips on picker + summary card"
```

---

### Task 3: Cycle — add LH + CM to the Calendar log launcher (reverse-gap)

**Files:**
- Modify: `components/calendar/LogActivitySheet.tsx`
- Modify: `components/calendar/logStickers.tsx`
- Modify: `components/calendar/DiffuseLogTimeline.tsx`
- Verify only: `components/calendar/CycleLogRouter.tsx` (already routes `lh`/`cm`)

**Interfaces:**
- Consumes: existing `LogType` union + `LOG_ENTRIES`.
- Produces: `lh` + `cm` selectable from the cycle Calendar "+" launcher, routed by the already-capable `CycleLogRouter`.

- [ ] **Step 1: Add lh + cm to LogType + LOG_ENTRIES**

In `components/calendar/LogActivitySheet.tsx`, widen the `LogType` union to include `'lh'` and `'cm'`, and add two rows to `LOG_ENTRIES` (place after `basal_temp`):

```tsx
  { id: 'lh',           labelKey: 'cycleCalendar_logEntry_lh',           subtitleKey: 'cycleCalendar_logEntry_lhSub',           tint: 'ovulation' },
  { id: 'cm',           labelKey: 'cycleCalendar_logEntry_cm',           subtitleKey: 'cycleCalendar_logEntry_cmSub',           tint: 'symptom' },
```

The `tint` strings `'ovulation'` and `'symptom'` already exist in `components/calendar/tints.ts` (verified). If `cycleCalendar_logEntry_lh`/`_cm` (+ `Sub`) keys don't exist, add them to `lib/i18n/en.ts` + `keys.ts` (e.g. `cycleCalendar_logEntry_lh: 'LH test'`, `cycleCalendar_logEntry_lhSub: 'Ovulation predictor'`, `cycleCalendar_logEntry_cm: 'Cervical mucus'`, `cycleCalendar_logEntry_cmSub: 'Fluid consistency'`).

- [ ] **Step 2: Add lh + cm sticker cases**

In `components/calendar/logStickers.tsx`, add cases in the cycle block (after `cervical_fluid`):

```tsx
    case 'lh':             return <StickerBox size={size}><LogOvulation size={size} /></StickerBox>
    case 'cm':             return <StickerBox size={size}><LogCervicalFluid size={size} /></StickerBox>
```

In `components/calendar/DiffuseLogTimeline.tsx`, `DIFFUSE_LOG_CHARACTER` already has `lh: 'water'`; add `cm`:

```tsx
  cm: 'water',
```

- [ ] **Step 3: Verify CycleLogRouter routes lh/cm**

Read `components/calendar/CycleLogRouter.tsx` and confirm it has `<LogSheet visible={sheetType === 'lh'}>` and `'cm'` blocks (it imports `LhForm`/`CmForm` from `CycleLogForms`). If NOT present, add them mirroring the existing `BbtForm` block:

```tsx
      <LogSheet visible={sheetType === 'lh'} title={t('cycleDash_lh')} onClose={onClose}>
        <LhForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'cm'} title={t('cycleDash_cervicalMucus')} onClose={onClose}>
        <CmForm date={date} phase={phase} onSaved={onSaved} />
      </LogSheet>
```

(And add `LhForm, CmForm` to the `CycleLogForms` import if missing.)

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/calendar/LogActivitySheet.tsx components/calendar/logStickers.tsx components/calendar/DiffuseLogTimeline.tsx components/calendar/CycleLogRouter.tsx lib/i18n/en.ts lib/i18n/keys.ts
git commit -m "feat(cycle): add LH + CM to the calendar log launcher"
```

---

### Task 4: Pregnancy — extract LogFormRouter to its own shared file

**Files:**
- Create: `components/calendar/PregnancyLogRouter.tsx`
- Modify: `components/calendar/PregnancyCalendar.tsx`

**Interfaces:**
- Produces: `export function PregnancyLogRouter({ type, date, onSaved }: { type: PregnancyLogType; date: string; onSaved: () => void }): React.ReactElement | null` and `export type PregnancyLogType` (the 15-member union, renamed from the local `LogFormType`).
- Consumes (in calendar): replaces the private `LogFormRouter` + local `LogFormType`.

- [ ] **Step 1: Create the shared router file**

Create `components/calendar/PregnancyLogRouter.tsx` with the exact router body from `PregnancyCalendar.tsx:343–368`, plus the union and the imports the forms need:

```tsx
/**
 * PregnancyLogRouter — renders the matching pregnancy log form for a given
 * `type` + `date`. Extracted from PregnancyCalendar so the Calendar tab and the
 * home "Log for today" card drive the exact same 15 forms.
 */
import React from 'react'
import {
  PregnancyMoodForm, WeightLogForm, PregnancySymptomsForm, AppointmentForm,
  ExamResultForm, KickCountForm, SleepLogForm, ExerciseLogForm, KegelLogForm,
  WaterLogForm, VitaminsLogForm, NestingTaskForm, BirthPrepTaskForm,
  ContractionTimerLogForm,
} from './PregnancyLogForms'
import { PregnancyMealForm } from './PregnancyMealForm'

export type PregnancyLogType =
  | 'mood' | 'weight' | 'symptom' | 'appointment' | 'exam_result' | 'kick_count'
  | 'sleep' | 'exercise' | 'nutrition' | 'kegel' | 'water' | 'vitamins'
  | 'nesting' | 'birth_prep' | 'contraction'

export function PregnancyLogRouter({
  type, date, onSaved,
}: {
  type: PregnancyLogType
  date: string
  onSaved: () => void
}): React.ReactElement | null {
  if (type === 'mood')        return <PregnancyMoodForm date={date} onSaved={onSaved} />
  if (type === 'weight')      return <WeightLogForm date={date} onSaved={onSaved} />
  if (type === 'symptom')     return <PregnancySymptomsForm date={date} onSaved={onSaved} />
  if (type === 'appointment') return <AppointmentForm date={date} onSaved={onSaved} />
  if (type === 'exam_result') return <ExamResultForm date={date} onSaved={onSaved} />
  if (type === 'kick_count')  return <KickCountForm date={date} onSaved={onSaved} />
  if (type === 'sleep')       return <SleepLogForm date={date} onSaved={onSaved} />
  if (type === 'exercise')    return <ExerciseLogForm date={date} onSaved={onSaved} />
  if (type === 'nutrition')   return <PregnancyMealForm date={date} onSaved={onSaved} />
  if (type === 'kegel')       return <KegelLogForm date={date} onSaved={onSaved} />
  if (type === 'water')       return <WaterLogForm date={date} onSaved={onSaved} />
  if (type === 'vitamins')    return <VitaminsLogForm date={date} onSaved={onSaved} />
  if (type === 'nesting')     return <NestingTaskForm date={date} onSaved={onSaved} />
  if (type === 'birth_prep')  return <BirthPrepTaskForm date={date} onSaved={onSaved} />
  if (type === 'contraction') return <ContractionTimerLogForm date={date} onSaved={onSaved} />
  return null
}
```

Verify the import paths/names against the actual exports in `PregnancyLogForms.tsx` / `PregnancyMealForm.tsx`. Note `PregnancyMealForm` here takes `{ date, onSaved }` (the calendar's existing contract — verify the form accepts `date`; it does per the calendar call site).

- [ ] **Step 2: Use the shared router in the calendar; remove the local copy**

In `components/calendar/PregnancyCalendar.tsx`:
1. Add `import { PregnancyLogRouter, type PregnancyLogType } from './PregnancyLogRouter'`.
2. Delete the local `function LogFormRouter(...)` (lines ~343–368) and the local `type LogFormType = …` (lines ~153–157).
3. Replace all `LogFormType` references with `PregnancyLogType` (the `logForm` state at line ~1969, `LOG_FORM_TITLE` record at ~158, `QuickLogSheet.onSelect`).
4. Replace the call site (`<LogFormRouter type={logForm.type} … />`) with `<PregnancyLogRouter type={logForm.type} date={logForm.date} onSaved={handleSaved} />`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no new errors in `PregnancyCalendar.tsx` or the new file.

- [ ] **Step 4: Test — calendar logging still works**

Run: `npm test`
Expected: all pass (no behavior change; this is a pure extraction).

- [ ] **Step 5: Commit**

```bash
git add components/calendar/PregnancyLogRouter.tsx components/calendar/PregnancyCalendar.tsx
git commit -m "refactor(pregnancy): extract PregnancyLogRouter as shared calendar/home switchboard"
```

---

### Task 5: Pregnancy — route the home through the shared router

**Files:**
- Modify: `components/home/PregnancyHome.tsx`

**Interfaces:**
- Consumes: `PregnancyLogRouter` + `PregnancyLogType` (Task 4).
- Produces: the pregnancy home renders ALL 15 forms via the shared router (replaces `renderInlineForm` + `InlineLogType`).

- [ ] **Step 1: Swap the home's hand-rolled router for the shared one**

In `components/home/PregnancyHome.tsx`:
1. Add `import { PregnancyLogRouter, type PregnancyLogType } from '../calendar/PregnancyLogRouter'`.
2. Change the state type: `const [activeLog, setActiveLog] = useState<PregnancyLogType | null>(null)`.
3. Delete the local `type InlineLogType = …` (lines ~180) and delete the `renderInlineForm` function (lines ~290–314). Keep the `INLINE_LOG_TITLE_KEY` map but widen it to all `PregnancyLogType` values (add the missing keys — see Step 2).
4. Replace the `<LogSheet>` body that called `renderInlineForm()` (lines ~439–446) with:

```tsx
      <LogSheet
        visible={activeLog !== null}
        title={activeLog ? t(INLINE_LOG_TITLE_KEY[activeLog] as any) : ''}
        onClose={() => {
          setActiveLog(null)
          queryClient.invalidateQueries({ queryKey: ['pregnancy-today-logs', userId] })
          queryClient.invalidateQueries({ queryKey: ['pregnancy-latest-weight', userId] })
        }}
      >
        {activeLog !== null && (
          <PregnancyLogRouter
            type={activeLog}
            date={toDateStr(new Date())}
            onSaved={() => {
              setActiveLog(null)
              queryClient.invalidateQueries({ queryKey: ['pregnancy-today-logs', userId] })
              queryClient.invalidateQueries({ queryKey: ['pregnancy-latest-weight', userId] })
            }}
          />
        )}
      </LogSheet>
```

5. The two `onLogMetric={... setActiveLog(type as InlineLogType)}` call sites (lines ~385, ~406) become `setActiveLog(type as PregnancyLogType)`.

- [ ] **Step 2: Complete the title-key map for all 15 types**

Widen `INLINE_LOG_TITLE_KEY` to `Record<PregnancyLogType, string>` with a key per type. Reuse existing `pregnancy_logTitle_*` keys where present; for the new ones (`exam_result`, `exercise`, `nesting`, `birth_prep`, `contraction`, `weight`) add keys to `lib/i18n/en.ts` + `keys.ts` if missing (e.g. `pregnancy_logTitle_examResult: 'Log Exam Result'`). Run typecheck to discover which are missing.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no new errors. `renderInlineForm` and `InlineLogType` fully removed; unused imports pruned (the form imports the home used only for `renderInlineForm` — remove them, they now live in the router).

- [ ] **Step 4: Test**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add components/home/PregnancyHome.tsx lib/i18n/en.ts lib/i18n/keys.ts
git commit -m "refactor(pregnancy): route home logging through shared PregnancyLogRouter"
```

---

### Task 6: Pregnancy — expand quick-log catalog + picker glyphs

**Files:**
- Modify: `lib/pregnancyQuickLogs.ts`
- Modify: `components/home/pregnancy/QuickLogPicker.tsx`
- Modify: `components/home/pregnancy/TodaySummaryCard.tsx`

**Interfaces:**
- Consumes: `PregnancyLogRouter` routing (Task 5) — every new `logType` now routes.
- Produces: 9 new catalog entries + picker glyphs + summary-card pills. New chips OFF by default.

- [ ] **Step 1: Add catalog entries**

In `lib/pregnancyQuickLogs.ts`, extend `PREG_QUICK_LOGS` with the 9 gap types. Their `logType` MUST match the router's `PregnancyLogType`:

```ts
  { key: 'symptom',     logType: 'symptom',     labelKey: 'pregnancy_logTitle_symptom' },
  { key: 'exercise',    logType: 'exercise',    labelKey: 'pregnancy_logTitle_exercise' },
  { key: 'vitamins',    logType: 'vitamins',    labelKey: 'pregnancy_logTitle_vitamins' },
  { key: 'kegel',       logType: 'kegel',       labelKey: 'pregnancy_logTitle_kegel' },
  { key: 'contraction', logType: 'contraction', labelKey: 'preg_form_contraction_title', minWeek: 32 },
  { key: 'appointment', logType: 'appointment', labelKey: 'pregnancy_logTitle_appointment' },
  { key: 'exam_result', logType: 'exam_result', labelKey: 'pregnancy_logTitle_examResult' },
  { key: 'nesting',     logType: 'nesting',     labelKey: 'preg_form_nesting_title',    minWeek: 28 },
  { key: 'birth_prep',  logType: 'birth_prep',  labelKey: 'preg_form_birthPrep_title',  minWeek: 28 },
```

Use existing label keys where present; add any missing to i18n (discover via typecheck). `DEFAULT_QUICK_LOG_KEYS` stays unchanged.

- [ ] **Step 2: Add picker glyphs**

In `components/home/pregnancy/QuickLogPicker.tsx`, follow its existing key→glyph mapping pattern (read the file first) and add a glyph + hue for each of the 9 new keys, using existing `Character` names / sticker components (e.g. `symptom→activity/pink`, `exercise→activity/green`, `vitamins→medicine/lilac`, `kegel→soothe/peach`, `contraction→contraction/coral`, `appointment→checkup/blue`, `exam_result→exam/lilac`, `nesting→soothe/green`, `birth_prep→note/yellow`). Verify each `CharacterName` exists.

- [ ] **Step 3: Add summary-card pills**

In `components/home/pregnancy/TodaySummaryCard.tsx`, extend its `pillByKey` record (read the file for the exact shape) with one `Pill` per new key: icon (Character/sticker), label (value or `+`), and `done` computed from `todayLogs[<logType>]` presence. Follow the existing `mood`/`water`/`sleep` pill definitions exactly.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no new errors. Add missing i18n keys flagged.

- [ ] **Step 5: Test**

Run: `npm test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add lib/pregnancyQuickLogs.ts components/home/pregnancy/QuickLogPicker.tsx components/home/pregnancy/TodaySummaryCard.tsx lib/i18n/en.ts lib/i18n/keys.ts
git commit -m "feat(pregnancy): expand home quick-log catalog to full calendar parity"
```

---

### Task 7: Kids — extract KidsLogRouter from the calendar

**Files:**
- Create: `components/calendar/KidsLogRouter.tsx`
- Modify: `components/calendar/KidsCalendar.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type KidsLogType = 'feeding' | 'sleep' | 'wake_up' | 'health' | 'mood' | 'memory' | 'activity' | 'diaper' | 'exam'
  export interface KidsLogRouterProps {
    sheetType: KidsLogType | null
    date: string
    childId: string | null
    onClose: () => void
    onSaved: () => void
    editingLog?: EditLog | null
    routinePrefill?: RoutinePrefill | null
    onSkipRoutine?: (type: KidsLogType) => void
  }
  export function KidsLogRouter(props: KidsLogRouterProps): React.ReactElement
  ```
- Consumes (calendar): replaces the 9 inline `<LogSheet>` blocks.

- [ ] **Step 1: Create the router with all 9 sheets**

Create `components/calendar/KidsLogRouter.tsx`. Move the 9 `<LogSheet>` blocks from `KidsCalendar.tsx:3086–3128` into it verbatim, parameterized by props. The `onSkip` closures (which call `skipRoutine`) are calendar-only; expose them via the optional `onSkipRoutine` callback so the home (which passes none) renders no skip button. Structure:

```tsx
/**
 * KidsLogRouter — renders every kids LogSheet + form for a given date/child.
 * Shared by the Kids Calendar tab and the home "Log for today" card so both
 * drive the same 9 forms. Calendar passes editingLog/routinePrefill/onSkipRoutine;
 * home passes none (create-mode forms, today's date).
 */
import React from 'react'
import { LogSheet } from './LogSheet'
import { useTranslation } from '../../lib/i18n'
import {
  FeedingForm, SleepForm, WakeUpForm, HealthEventForm, KidsMoodForm,
  ActivityForm, MemoryForm, DiaperForm, type RoutinePrefill, type EditLog,
} from './KidsLogForms'
import { ExamForm } from '../exams/ExamForm'

export type KidsLogType = 'feeding' | 'sleep' | 'wake_up' | 'health' | 'mood' | 'memory' | 'activity' | 'diaper' | 'exam'

export interface KidsLogRouterProps {
  sheetType: KidsLogType | null
  date: string
  childId: string | null
  onClose: () => void
  onSaved: () => void
  editingLog?: EditLog | null
  routinePrefill?: RoutinePrefill | null
  onSkipRoutine?: (type: KidsLogType) => void
}

export function KidsLogRouter({
  sheetType, date, childId, onClose, onSaved, editingLog, routinePrefill, onSkipRoutine,
}: KidsLogRouterProps): React.ReactElement {
  const { t } = useTranslation()
  const prefill = routinePrefill ?? undefined
  const edit = editingLog ?? undefined
  const skip = (type: KidsLogType) =>
    routinePrefill?.routineId && onSkipRoutine ? () => onSkipRoutine(type) : undefined

  return (
    <>
      <LogSheet visible={sheetType === 'feeding'} title={edit ? t('kids_calendar_logSheet_editEntry') : (routinePrefill?.name ?? t('kids_calendar_logSheet_feeding'))} onClose={onClose}>
        <FeedingForm onSaved={onSaved} initialDate={date} prefill={prefill} editLog={edit} onSkip={skip('feeding')} />
      </LogSheet>
      <LogSheet visible={sheetType === 'sleep'} title={edit ? t('kids_calendar_logSheet_editEntry') : (routinePrefill?.name ?? t('kids_calendar_logSheet_sleep'))} onClose={onClose}>
        <SleepForm onSaved={onSaved} initialDate={date} prefill={prefill} editLog={edit} onSkip={skip('sleep')} />
      </LogSheet>
      <LogSheet visible={sheetType === 'wake_up'} title={routinePrefill?.name ?? t('kids_calendar_logSheet_wakeUp')} onClose={onClose}>
        <WakeUpForm onSaved={onSaved} prefill={prefill} onSkip={skip('wake_up')} />
      </LogSheet>
      <LogSheet visible={sheetType === 'health'} title={edit ? t('kids_calendar_logSheet_editEntry') : (routinePrefill?.name ?? t('kids_calendar_logSheet_health'))} onClose={onClose}>
        <HealthEventForm onSaved={onSaved} initialDate={date} prefill={prefill} editLog={edit} onSkip={skip('health')} />
      </LogSheet>
      <LogSheet visible={sheetType === 'mood'} title={edit ? t('kids_calendar_logSheet_editEntry') : (routinePrefill?.name ?? t('kids_calendar_logSheet_mood'))} onClose={onClose}>
        <KidsMoodForm onSaved={onSaved} initialDate={date} prefill={prefill} editLog={edit} onSkip={skip('mood')} />
      </LogSheet>
      <LogSheet visible={sheetType === 'activity'} title={edit ? t('kids_calendar_logSheet_editEntry') : (routinePrefill?.name ?? t('kids_calendar_logSheet_activity'))} onClose={onClose}>
        <ActivityForm onSaved={onSaved} initialDate={date} prefill={prefill} editLog={edit} onSkip={skip('activity')} />
      </LogSheet>
      <LogSheet visible={sheetType === 'memory'} title={t('kids_calendar_logSheet_memory')} onClose={onClose}>
        <MemoryForm onSaved={onSaved} initialDate={date} />
      </LogSheet>
      <LogSheet visible={sheetType === 'diaper'} title={edit ? t('kids_calendar_logSheet_editDiaper') : t('kids_calendar_logSheet_diaper')} onClose={onClose}>
        <DiaperForm onSaved={onSaved} initialDate={date} editLog={edit} />
      </LogSheet>
      <LogSheet visible={sheetType === 'exam'} title={t('kids_calendar_logSheet_exam')} onClose={onClose}>
        <ExamForm behavior="kids" childId={childId} date={date} onSaved={onSaved} />
      </LogSheet>
    </>
  )
}
```

- [ ] **Step 2: Use the router in the calendar**

In `components/calendar/KidsCalendar.tsx`, replace the 9 inline `<LogSheet>` blocks (3086–3128) with:

```tsx
      <KidsLogRouter
        sheetType={sheetType}
        date={selectedDate}
        childId={selectedChildId !== 'all' ? selectedChildId : (activeChild?.id ?? children[0]?.id ?? null)}
        onClose={closeSheet}
        onSaved={handleSaved}
        editingLog={editingLog}
        routinePrefill={routinePrefill}
        onSkipRoutine={(type) => {
          if (!routinePrefill?.routineId) return
          skipRoutine({ id: routinePrefill.routineId, child_id: routinePrefill.childId, name: routinePrefill.name ?? '', type, value: routinePrefill.value ?? null, days_of_week: [], time: routinePrefill.time ?? null, active: true })
          closeSheet()
        }}
      />
```

Add `import { KidsLogRouter } from './KidsLogRouter'`. The local `type LogType` in KidsCalendar can now be imported from the router (`import { …, type KidsLogType } from './KidsLogRouter'`) — replace `LogType` usages with `KidsLogType`, or keep the local alias `type LogType = KidsLogType`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no new errors. The `onSkip` behavior is preserved (calendar still skips routines).

- [ ] **Step 4: Test**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add components/calendar/KidsLogRouter.tsx components/calendar/KidsCalendar.tsx
git commit -m "refactor(kids): extract KidsLogRouter as shared calendar/home switchboard"
```

---

### Task 8: Kids — route the home through the shared router

**Files:**
- Modify: `components/home/KidsHome.tsx`

**Interfaces:**
- Consumes: `KidsLogRouter` + `KidsLogType` (Task 7).
- Produces: kids home renders ALL 9 forms via the router (replaces the 5 hardcoded sheets).

- [ ] **Step 1: Swap the 5 hardcoded sheets for the router**

In `components/home/KidsHome.tsx`:
1. Add `import { KidsLogRouter, type KidsLogType } from '../calendar/KidsLogRouter'`.
2. Widen state: `const [logSheetType, setLogSheetType] = useState<KidsLogType | null>(null)` (line ~764).
3. The `onLogMetric` call site (line ~2219) becomes `setLogSheetType(type as KidsLogType)`; the hero-tile setters (lines ~2205–2209) stay as-is (they pass literal valid types).
4. Replace the 5 `<LogSheet>` blocks (lines ~2772–2787) with:

```tsx
      <KidsLogRouter
        sheetType={logSheetType}
        date={toDateStr(new Date())}
        childId={child?.id ?? null}
        onClose={() => setLogSheetType(null)}
        onSaved={() => { setLogSheetType(null); if (child) loadRangeData(child, dateRange) }}
      />
```

(Home passes no `editingLog`/`routinePrefill`/`onSkipRoutine` — create-mode, today's date. Confirm `toDateStr` is imported; it's used elsewhere in the file.)

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no new errors. The now-unused per-form imports in KidsHome (`SleepForm`, `KidsMoodForm`, `FeedingForm`, `ActivityForm`, `DiaperForm`) are removed if TS flags them (they live in the router now).

- [ ] **Step 3: Test**

Run: `npm test`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add components/home/KidsHome.tsx
git commit -m "refactor(kids): route home logging through shared KidsLogRouter"
```

---

### Task 9: Kids — expand quick-log catalog + picker glyphs

**Files:**
- Modify: `lib/kidsQuickLogs.ts`
- Modify: `components/home/kids/KidsQuickLogPicker.tsx`
- Modify: `components/home/kids/KidsTodaySummaryCard.tsx`

**Interfaces:**
- Consumes: `KidsLogRouter` routing (Task 8).
- Produces: 4 new catalog entries (wake_up, health, memory, exam) with `doneTypes`, picker glyphs, and summary-card chips. New chips OFF by default.

- [ ] **Step 1: Add catalog entries**

In `lib/kidsQuickLogs.ts`, extend `KIDS_QUICK_LOGS`. `logType` MUST match `KidsLogType`; `doneTypes` are the `child_logs.type` values that mark done:

```ts
  { key: 'wake_up',  logType: 'wake_up',  labelKey: 'kids_calendar_labelWakeUp', doneTypes: ['wake_up'] },
  { key: 'health',   logType: 'health',   labelKey: 'kids_calendar_labelHealth', doneTypes: ['temperature', 'vaccine', 'medicine', 'note', 'health'] },
  { key: 'memory',   logType: 'memory',   labelKey: 'kids_calendar_labelMemory', doneTypes: ['memory'] },
  { key: 'exam',     logType: 'exam',     labelKey: 'kids_calendar_labelExam',   doneTypes: ['exam'] },
```

`DEFAULT_KIDS_QUICK_LOG_KEYS` stays unchanged.

- [ ] **Step 2: Add picker + summary-card glyphs**

- In `KidsQuickLogPicker.tsx` and `KidsTodaySummaryCard.tsx`, both use a `CHAR_FOR` map (key → `{ name: CharacterName, hue }`). Add the 4 new keys to each:

```tsx
  wake_up:  { name: 'sun',    hue: 'yellow' },
  health:   { name: 'checkup', hue: 'coral' },
  memory:   { name: 'photo',  hue: 'lilac' },
  exam:     { name: 'exam',   hue: 'green' },
```

Verify `'sun'`, `'checkup'`, `'photo'`, `'exam'` are valid `CharacterName`s (they appear in `DIFFUSE_LOG_CHARACTER`, so they should be). If any isn't, substitute the closest valid one.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no new errors. Add any missing i18n label keys (the `kids_calendar_label*` keys already exist from the calendar).

- [ ] **Step 4: Test**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add lib/kidsQuickLogs.ts components/home/kids/KidsQuickLogPicker.tsx components/home/kids/KidsTodaySummaryCard.tsx lib/i18n/en.ts lib/i18n/keys.ts
git commit -m "feat(kids): expand home quick-log catalog to full calendar parity"
```

---

### Task 10: Catalog parity tests

**Files:**
- Create: `lib/__tests__/quickLogParity.test.ts`

**Interfaces:**
- Consumes: the three catalogs + the calendar type sources.

- [ ] **Step 1: Write the parity test**

Create `lib/__tests__/quickLogParity.test.ts`. This locks parity so future calendar additions that skip the home picker are caught:

```ts
import { CYCLE_QUICK_LOGS } from '../cycleQuickLogs'
import { PREG_QUICK_LOGS } from '../pregnancyQuickLogs'
import { KIDS_QUICK_LOGS } from '../kidsQuickLogs'

describe('home quick-log catalogs reach full calendar parity', () => {
  it('cycle offers all 13 calendar log types (as sheet ids)', () => {
    const sheets = new Set(CYCLE_QUICK_LOGS.map((q) => q.sheet))
    for (const s of ['mood','symptom','basal_temp','lh','cm','intercourse','period_start','period_end','pregnancy_test','sex_drive','clots','weight','water','activity']) {
      expect(sheets.has(s as never)).toBe(true)
    }
  })

  it('pregnancy offers all 15 calendar log types', () => {
    const types = new Set(PREG_QUICK_LOGS.map((q) => q.logType))
    for (const t of ['mood','water','sleep','nutrition','weight','kick_count','symptom','exercise','vitamins','kegel','contraction','appointment','exam_result','nesting','birth_prep']) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('kids offers all 9 calendar log types', () => {
    const types = new Set(KIDS_QUICK_LOGS.map((q) => q.logType))
    for (const t of ['feeding','sleep','wake_up','health','mood','memory','activity','diaper','exam']) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('every entry has a unique key', () => {
    for (const cat of [CYCLE_QUICK_LOGS, PREG_QUICK_LOGS, KIDS_QUICK_LOGS]) {
      const keys = cat.map((q) => q.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
})
```

- [ ] **Step 2: Run the test**

Run: `npm test -- quickLogParity`
Expected: PASS (4 tests). If a `has(...)` fails, that behavior's catalog is missing a type — fix the catalog (an earlier task's gap) before proceeding.

- [ ] **Step 3: Commit**

```bash
git add lib/__tests__/quickLogParity.test.ts
git commit -m "test: lock home quick-log → calendar parity across all behaviors"
```

---

### Task 11: Full-suite verification

**Files:** none (verification only).

- [ ] **Step 1: Clean typecheck**

Run: `rm -f *.tsbuildinfo tsconfig.tsbuildinfo 2>/dev/null; npm run typecheck`
Expected: clean except the KNOWN pre-existing i18n errors unrelated to this work (`pregnancyMemories_emptyMsg`/`kidsMemories_emptyMsg` in `MemoriesSheet.tsx` + locale files, if still unresolved by a concurrent branch). No errors in any file this plan touched.

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: all pass, including `quickLogParity`.

- [ ] **Step 3: Grep — no orphaned local routers left**

Run: `grep -rn "function LogFormRouter\|renderInlineForm\|type InlineLogType\|type LogFormType" components/`
Expected: NO matches (pregnancy's local router + home's hand-roller are gone).

- [ ] **Step 4: Grep — home routing goes through shared routers**

Run: `grep -rn "PregnancyLogRouter\|KidsLogRouter\|CycleLogRouter" components/home/`
Expected: PregnancyHome imports `PregnancyLogRouter`; KidsHome imports `KidsLogRouter`; CycleHome already imports `CycleLogRouter`.

- [ ] **Step 5: Commit (only if Steps required cleanup)**

```bash
git add -A
git commit -m "chore: quick-log parity cleanup"
```

---

## Self-Review

**Spec coverage:**
- Full parity per behavior → Tasks 1–2 (cycle), 5–6 (pregnancy), 8–9 (kids). ✓
- Shared router per behavior → Cycle (pre-existing), Task 4 (extract PregnancyLogRouter), Task 7 (extract KidsLogRouter), Tasks 5 & 8 (homes consume them). ✓
- Cycle reverse-gap (LH/CM in calendar launcher) → Task 3. ✓
- Adapters for odd forms → `exam` handled in KidsLogRouter (Task 7) with its `{behavior,childId,date,onSaved}` contract; `exam_result`/`appointment`/`nesting`/`birth_prep` handled in PregnancyLogRouter (Task 4). ✓
- Defaults unchanged → every catalog task explicitly leaves `DEFAULT_*` arrays alone. ✓
- Done/green detection → kids via `doneTypes` (Task 9); cycle via row lookup (Task 2); pregnancy via `todayLogs` presence (Task 6). ✓
- Parity locked by test → Task 10. ✓
- No new forms → confirmed; all tasks reuse existing form components. ✓

**Placeholder scan:** Code steps carry real code. Steps that say "read the file for the exact shape" (picker glyph maps in Tasks 6 & 9) are because those picker files weren't fully quoted in source-gathering — the pattern is shown and the exact keys/glyphs are specified; the implementer adds them following the shown map. This is a bounded, concrete instruction, not a hand-wave.

**Type consistency:** `PregnancyLogType` (Task 4) is used identically in Tasks 5–6. `KidsLogType` (Task 7) used identically in Tasks 8–9. `CycleQuickLogSheet` widened in Task 1 matches the router `LogType` strings used as `chip.sheet` in Task 2. Catalog `logType`/`sheet` values match the router keys in every case.

**Ordering:** Router extraction (Tasks 4, 7) precedes home consumption (5, 8) precedes catalog expansion (6, 9), so each new chip has a working route the moment it appears. Cycle (1–3) is independent and first (smallest, proves the pattern). Parity test (10) after all catalogs. Verify (11) last.
