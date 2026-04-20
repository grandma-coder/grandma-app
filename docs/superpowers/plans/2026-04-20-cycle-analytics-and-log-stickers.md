# Cycle Analytics + Log Stickers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire real Supabase-backed analytics into `CycleAnalytics.tsx`, add tap-to-detail bottom sheets for each stat card, and replace lucide icon rows in every cycle log form with branded stickers.

**Architecture:** Add a `lib/cycleAnalytics.ts` data module with 5 React Query v5 hooks reading the `cycle_logs` Supabase table (columns: `user_id`, `date`, `type`, `value`, `notes`, `created_at`). A new `components/analytics/CycleDetailSheets.tsx` wraps the existing `LogSheet` shell and renders a type-switched detail body. `CycleAnalytics.tsx` wraps each stat tile in `Pressable` and swaps mock constants for hook values. `LogForms.tsx` replaces lucide `iconRow`s with a new branded-sticker chip pattern.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript strict, Zustand v5, React Query v5, Supabase JS client, `react-native-svg`, existing `constants/theme.ts` tokens, existing `components/ui/Stickers.tsx` brand sticker SVGs, existing `components/calendar/logStickers.tsx` type-to-sticker map.

---

## File Structure

**Files created:**
- `lib/cycleAnalytics.ts` — all analytics computation + React Query hooks
- `components/analytics/CycleDetailSheets.tsx` — 5 detail-sheet renderers + unified `CycleDetailSheet` wrapper
- `components/calendar/LogFormSticker.tsx` — shared sticker+label header row used across all 6 log forms

**Files modified:**
- `components/analytics/CycleAnalytics.tsx` — replace mock constants with hooks, wrap tiles in `Pressable`, mount `CycleDetailSheet`
- `components/calendar/LogForms.tsx` — replace 5 lucide `iconRow` blocks with `LogFormSticker`, add sticker header to `SymptomsForm` and `MoodForm` (which don't currently have one), remove unused lucide imports

**Files read but NOT modified:**
- `components/calendar/logStickers.tsx` (sticker map, reused)
- `components/calendar/LogSheet.tsx` (bottom-sheet shell, reused)
- `lib/cycleLogic.ts` (fertile-window helper, reused)
- `constants/theme.ts` (tokens, reused)
- `supabase/schema.sql` (schema reference only)

---

## Conventions to follow

- **React Query v5 object syntax:** `useQuery({ queryKey, queryFn, enabled, staleTime })`
- **Zustand v5 named import:** `import { create } from 'zustand'` (not touched here, noted for consistency)
- **Supabase filter:** always filter by `user_id` client-side even though RLS enforces it
- **Design tokens:** `useTheme()` for `colors`, `stickers`, `radius`, `spacing`, `font`
- **Typography:** `Display` from `components/ui/Typography.tsx` for Fraunces headings, `Body` for DM Sans text
- **Dark/light:** always check `isDark` when picking raw hex; prefer theme tokens
- **Commits:** one commit per task at the end of that task. Commit body references the task.
- **No tests:** the repo has no unit-test harness for analytics (verified via `grep`); follow the project norm and rely on manual + type-check verification. Each task ends with a TypeScript verification step.

---

## Task 1: Scaffold `lib/cycleAnalytics.ts` with types + raw fetch

**Files:**
- Create: `lib/cycleAnalytics.ts`

- [ ] **Step 1: Create the file with types + raw fetch helper**

```ts
// lib/cycleAnalytics.ts
/**
 * Cycle Analytics — reads cycle_logs and computes derived stats for the
 * pre-pregnancy analytics screen (CycleAnalytics + detail sheets).
 *
 * All hooks return React Query results. Empty states resolve to `null`
 * values so the UI can show a "Log your first cycle" nudge.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

// ─── Raw row shape ────────────────────────────────────────────────────────

export interface CycleLogRow {
  id: string
  user_id: string
  date: string                 // YYYY-MM-DD
  type:
    | 'period_start'
    | 'period_end'
    | 'ovulation'
    | 'symptom'
    | 'basal_temp'
    | 'intercourse'
    | 'cervical_mucus'
    | 'mood'
    | 'energy'
    | 'weight'
    | 'note'
  value: string | null
  notes: string | null
  created_at: string
}

// ─── Fetch ────────────────────────────────────────────────────────────────

async function fetchCycleLogs(): Promise<CycleLogRow[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from('cycle_logs')
    .select('id, user_id, date, type, value, notes, created_at')
    .eq('user_id', session.user.id)
    .order('date', { ascending: true })

  if (error) throw error
  return (data ?? []) as CycleLogRow[]
}

/** Base hook — all 5 stat hooks read the same cached list. */
export function useCycleLogs() {
  return useQuery({
    queryKey: ['cycleLogs'],
    queryFn: fetchCycleLogs,
    staleTime: 2 * 60 * 1000,
  })
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no new errors in `lib/cycleAnalytics.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/cycleAnalytics.ts
git commit -m "feat(analytics): scaffold cycleAnalytics data module with base fetch"
```

---

## Task 2: Add `useCycleHistory` hook

**Files:**
- Modify: `lib/cycleAnalytics.ts` (append)

- [ ] **Step 1: Append cycle-history computation + hook**

Append to `lib/cycleAnalytics.ts`:

```ts
// ─── Cycle History ────────────────────────────────────────────────────────

export interface Cycle {
  startDate: string        // YYYY-MM-DD (period_start date)
  endDate: string | null   // next period_start - 1 day, null if current open cycle
  lengthDays: number | null
}

export interface CycleHistory {
  cycles: Cycle[]
  avg: number | null
  min: number | null
  max: number | null
}

function computeCycleHistory(logs: CycleLogRow[]): CycleHistory {
  const starts = logs
    .filter((l) => l.type === 'period_start')
    .map((l) => l.date)
    .sort()

  if (starts.length === 0) return { cycles: [], avg: null, min: null, max: null }

  const cycles: Cycle[] = starts.map((startDate, i) => {
    const next = starts[i + 1]
    if (!next) return { startDate, endDate: null, lengthDays: null }
    const a = new Date(startDate + 'T00:00:00')
    const b = new Date(next + 'T00:00:00')
    const length = Math.round((b.getTime() - a.getTime()) / 86400000)
    const endDate = new Date(b.getTime() - 86400000)
    const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
    return { startDate, endDate: endStr, lengthDays: length }
  })

  const closed = cycles.filter((c) => c.lengthDays !== null).map((c) => c.lengthDays as number)
  if (closed.length === 0) return { cycles, avg: null, min: null, max: null }

  const avg = Math.round(closed.reduce((a, b) => a + b, 0) / closed.length)
  return { cycles, avg, min: Math.min(...closed), max: Math.max(...closed) }
}

export function useCycleHistory() {
  const { data: logs, ...rest } = useCycleLogs()
  return {
    ...rest,
    data: logs ? computeCycleHistory(logs) : undefined,
  }
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/cycleAnalytics.ts
git commit -m "feat(analytics): add useCycleHistory hook"
```

---

## Task 3: Add `useRegularity` hook

**Files:**
- Modify: `lib/cycleAnalytics.ts` (append)

- [ ] **Step 1: Append regularity computation**

Append:

```ts
// ─── Regularity ───────────────────────────────────────────────────────────

export interface Regularity {
  percent: number | null
  deviations: Array<{ cycleIdx: number; delta: number; lengthDays: number }>
}

export function useRegularity() {
  const { data: history, ...rest } = useCycleHistory()
  if (!history) return { ...rest, data: undefined }

  const closed = history.cycles
    .map((c, idx) => ({ c, idx }))
    .filter(({ c }) => c.lengthDays !== null)

  if (closed.length < 3 || history.avg === null) {
    return { ...rest, data: { percent: null, deviations: [] } satisfies Regularity }
  }

  const deviations = closed.map(({ c, idx }) => ({
    cycleIdx: idx + 1,
    delta: Math.abs((c.lengthDays as number) - (history.avg as number)),
    lengthDays: c.lengthDays as number,
  }))

  const regularCount = deviations.filter((d) => d.delta <= 2).length
  const percent = Math.round((regularCount / closed.length) * 100)

  return { ...rest, data: { percent, deviations } satisfies Regularity }
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/cycleAnalytics.ts
git commit -m "feat(analytics): add useRegularity hook"
```

---

## Task 4: Add `usePMSStats` hook

**Files:**
- Modify: `lib/cycleAnalytics.ts` (append)

- [ ] **Step 1: Append PMS stats**

Append:

```ts
// ─── PMS Stats ────────────────────────────────────────────────────────────

export interface PMSStats {
  avgDays: number | null
  topSymptoms: Array<{ name: string; count: number }>
}

function computePMSStats(logs: CycleLogRow[], history: CycleHistory): PMSStats {
  const symptomLogs = logs.filter((l) => l.type === 'symptom')

  // Top symptoms — split comma-separated values (SymptomsForm saves them joined)
  const counts = new Map<string, number>()
  for (const log of symptomLogs) {
    if (!log.value) continue
    for (const raw of log.value.split(',')) {
      const name = raw.trim()
      if (!name) continue
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }
  const topSymptoms = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Avg PMS days: for each closed cycle, count distinct dates with a symptom log
  // in the last 7 days of the cycle.
  const closedCycles = history.cycles.filter((c) => c.lengthDays !== null && c.endDate !== null)
  if (closedCycles.length === 0) return { avgDays: null, topSymptoms }

  let totalPmsDays = 0
  for (const cycle of closedCycles) {
    const end = new Date(cycle.endDate as string + 'T00:00:00')
    const pmsStart = new Date(end.getTime() - 6 * 86400000) // last 7 days inclusive
    const pmsSet = new Set<string>()
    for (const log of symptomLogs) {
      const d = new Date(log.date + 'T00:00:00')
      if (d >= pmsStart && d <= end) pmsSet.add(log.date)
    }
    totalPmsDays += pmsSet.size
  }

  const avgDays = Math.round((totalPmsDays / closedCycles.length) * 10) / 10

  return { avgDays, topSymptoms }
}

export function usePMSStats() {
  const { data: logs, ...rest } = useCycleLogs()
  const { data: history } = useCycleHistory()
  if (!logs || !history) return { ...rest, data: undefined }
  return { ...rest, data: computePMSStats(logs, history) }
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/cycleAnalytics.ts
git commit -m "feat(analytics): add usePMSStats hook"
```

---

## Task 5: Add `useFertileWindow` hook

**Files:**
- Modify: `lib/cycleAnalytics.ts` (append)

- [ ] **Step 1: Append fertile-window stats**

Append:

```ts
// ─── Fertile Window ───────────────────────────────────────────────────────

import { getCycleInfo, toDateStr } from './cycleLogic'

export interface FertileWindow {
  current: { start: string; end: string; daysLeft: number } | null
  history: Array<{ start: string; end: string; cycleIdx: number }>
}

function formatFromCycleDay(cycleStart: string, dayOffset: number): string {
  const d = new Date(cycleStart + 'T00:00:00')
  d.setDate(d.getDate() + dayOffset)
  return toDateStr(d)
}

export function useFertileWindow() {
  const { data: history, ...rest } = useCycleHistory()
  if (!history || history.cycles.length === 0) {
    return { ...rest, data: { current: null, history: [] } satisfies FertileWindow }
  }

  const avgLen = history.avg ?? 28
  const today = toDateStr(new Date())
  const latestCycle = history.cycles[history.cycles.length - 1]

  const info = getCycleInfo(
    { lastPeriodStart: latestCycle.startDate, cycleLength: avgLen },
    today
  )

  const currentStart = formatFromCycleDay(latestCycle.startDate, info.fertileStart - 1)
  const currentEnd = formatFromCycleDay(latestCycle.startDate, info.fertileEnd - 1)
  const todayD = new Date(today + 'T00:00:00')
  const endD = new Date(currentEnd + 'T00:00:00')
  const daysLeft = Math.max(0, Math.round((endD.getTime() - todayD.getTime()) / 86400000))

  const current = { start: currentStart, end: currentEnd, daysLeft }

  const pastWindows = history.cycles
    .slice(-4, -1) // last 3 closed cycles
    .filter((c) => c.lengthDays !== null)
    .map((c, i) => ({
      start: formatFromCycleDay(c.startDate, (c.lengthDays as number) - 14 - 5 - 1),
      end: formatFromCycleDay(c.startDate, (c.lengthDays as number) - 14 + 1 - 1),
      cycleIdx: history.cycles.indexOf(c) + 1,
    }))

  return { ...rest, data: { current, history: pastWindows } satisfies FertileWindow }
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/cycleAnalytics.ts
git commit -m "feat(analytics): add useFertileWindow hook"
```

---

## Task 6: Add `useMoodStats` hook

**Files:**
- Modify: `lib/cycleAnalytics.ts` (append)

- [ ] **Step 1: Append mood stats**

Append:

```ts
// ─── Mood Stats ───────────────────────────────────────────────────────────

export type MoodId = 'great' | 'energetic' | 'good' | 'okay' | 'low'

export interface MoodStats {
  /** 0–5 scale. Display as `*2` for "out of 10" if UI needs it. */
  avgScore: number | null
  distribution: Array<{ mood: MoodId; count: number }>
  recent: Array<{ mood: MoodId; date: string }>
}

const MOOD_SCORES: Record<MoodId, number> = {
  great: 5,
  energetic: 5,
  good: 4,
  okay: 3,
  low: 2,
}
const MOOD_ORDER: MoodId[] = ['great', 'energetic', 'good', 'okay', 'low']

export function useMoodStats() {
  const { data: logs, ...rest } = useCycleLogs()
  if (!logs) return { ...rest, data: undefined }

  const moodLogs = logs.filter((l) => l.type === 'mood' && l.value)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)

  const recent30 = moodLogs.filter((l) => new Date(l.date + 'T00:00:00') >= thirtyDaysAgo)

  const validMoods = recent30
    .map((l) => l.value as MoodId)
    .filter((m): m is MoodId => m in MOOD_SCORES)

  const avgScore =
    validMoods.length > 0
      ? Math.round((validMoods.reduce((a, m) => a + MOOD_SCORES[m], 0) / validMoods.length) * 10) / 10
      : null

  const counts = new Map<MoodId, number>()
  MOOD_ORDER.forEach((m) => counts.set(m, 0))
  for (const l of moodLogs) {
    const m = l.value as MoodId
    if (m in MOOD_SCORES) counts.set(m, (counts.get(m) ?? 0) + 1)
  }
  const distribution = MOOD_ORDER.map((mood) => ({ mood, count: counts.get(mood) ?? 0 }))

  const recent = moodLogs
    .slice(-7)
    .reverse()
    .map((l) => ({ mood: l.value as MoodId, date: l.date }))
    .filter((r) => r.mood in MOOD_SCORES)

  return {
    ...rest,
    data: { avgScore, distribution, recent } satisfies MoodStats,
  }
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/cycleAnalytics.ts
git commit -m "feat(analytics): add useMoodStats hook"
```

---

## Task 7: Scaffold `CycleDetailSheet` wrapper

**Files:**
- Create: `components/analytics/CycleDetailSheets.tsx`

- [ ] **Step 1: Create wrapper + empty body**

```tsx
// components/analytics/CycleDetailSheets.tsx
/**
 * CycleDetailSheets — tap-through detail for each CycleAnalytics stat tile.
 *
 * One exported `CycleDetailSheet` driven by a `type` prop; each type has its
 * own internal body component that calls the matching cycleAnalytics hook.
 */

import { View, Text, ActivityIndicator, StyleSheet, ScrollView } from 'react-native'
import { useTheme } from '../../constants/theme'
import { LogSheet } from '../calendar/LogSheet'
import { Body } from '../ui/Typography'

export type CycleDetailType =
  | 'cycleLength'
  | 'regularity'
  | 'pms'
  | 'fertile'
  | 'mood'

interface Props {
  type: CycleDetailType | null
  onClose: () => void
}

const TITLES: Record<CycleDetailType, string> = {
  cycleLength: 'Cycle Length',
  regularity: 'Regularity',
  pms: 'PMS Days',
  fertile: 'Fertile Window',
  mood: 'Mood',
}

export function CycleDetailSheet({ type, onClose }: Props) {
  const visible = type !== null
  const title = type ? TITLES[type] : ''

  return (
    <LogSheet visible={visible} title={title} onClose={onClose}>
      <ScrollView
        style={{ maxHeight: 540 }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {type === 'cycleLength' && <CycleLengthDetail />}
        {type === 'regularity' && <RegularityDetail />}
        {type === 'pms' && <PMSDetail />}
        {type === 'fertile' && <FertileDetail />}
        {type === 'mood' && <MoodDetail />}
      </ScrollView>
    </LogSheet>
  )
}

// ─── Placeholder bodies (filled in by later tasks) ────────────────────────

function CycleLengthDetail() { return <Loading /> }
function RegularityDetail() { return <Loading /> }
function PMSDetail() { return <Loading /> }
function FertileDetail() { return <Loading /> }
function MoodDetail() { return <Loading /> }

// ─── Shared UI helpers ────────────────────────────────────────────────────

function Loading() {
  const { colors } = useTheme()
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  )
}

export function EmptyState({ copy }: { copy: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.center}>
      <Body size={14} color={colors.textMuted} align="center">{copy}</Body>
    </View>
  )
}

export function ErrorState() {
  const { colors } = useTheme()
  return (
    <View style={styles.center}>
      <Body size={14} color={colors.textMuted} align="center">
        Couldn't load. Please try again.
      </Body>
    </View>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: 8,
    gap: 16,
  },
  center: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/analytics/CycleDetailSheets.tsx
git commit -m "feat(analytics): scaffold CycleDetailSheet wrapper"
```

---

## Task 8: Implement `CycleLengthDetail`

**Files:**
- Modify: `components/analytics/CycleDetailSheets.tsx`

- [ ] **Step 1: Replace the `CycleLengthDetail` placeholder**

Add imports at the top of the file (merge with existing imports):

```tsx
import { useCycleHistory } from '../../lib/cycleAnalytics'
import { MiniBarChart } from './shared/MiniCharts'
import { Display } from '../ui/Typography'
```

Replace the `function CycleLengthDetail() { return <Loading /> }` placeholder with:

```tsx
function CycleLengthDetail() {
  const { colors, stickers, font } = useTheme()
  const { data, isLoading, error } = useCycleHistory()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.avg === null || data.cycles.length === 0) {
    return <EmptyState copy="Log your first period to start tracking cycle length." />
  }

  const last12 = data.cycles
    .filter((c) => c.lengthDays !== null)
    .slice(-12)
  const values = last12.map((c) => c.lengthDays as number)
  const labels = last12.map((_, i) => `C${i + 1}`)

  const recentCycles = [...data.cycles].reverse().slice(0, 6)

  return (
    <View style={{ gap: 18 }}>
      <View style={detailStyles.heroRow}>
        <Display size={40} color={colors.text}>{data.avg}</Display>
        <Text style={[detailStyles.heroUnit, { color: colors.textMuted, fontFamily: font.body }]}>days avg</Text>
      </View>

      <View style={detailStyles.minMaxRow}>
        <StatChip label="MIN" value={`${data.min}d`} tint={stickers.blueSoft} />
        <StatChip label="MAX" value={`${data.max}d`} tint={stickers.pinkSoft} />
        <StatChip label="CYCLES" value={String(values.length)} tint={stickers.yellowSoft} />
      </View>

      <View>
        <Text style={[detailStyles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          LAST {values.length} CYCLES
        </Text>
        <MiniBarChart data={values} labels={labels} color={stickers.pink} />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[detailStyles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          HISTORY
        </Text>
        {recentCycles.map((c, i) => (
          <View
            key={c.startDate}
            style={[detailStyles.historyRow, { borderColor: colors.borderLight }]}
          >
            <Body size={13} color={colors.text}>
              {formatRange(c.startDate, c.endDate)}
            </Body>
            <Body size={13} color={colors.textSecondary}>
              {c.lengthDays ? `${c.lengthDays}d` : '—'}
            </Body>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Shared detail helpers ────────────────────────────────────────────────

function StatChip({ label, value, tint }: { label: string; value: string; tint: string }) {
  const { colors, font } = useTheme()
  return (
    <View style={[detailStyles.statChip, { backgroundColor: tint, borderColor: colors.border }]}>
      <Text style={[detailStyles.statLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{label}</Text>
      <Text style={[detailStyles.statValue, { color: colors.text, fontFamily: font.display }]}>{value}</Text>
    </View>
  )
}

function formatRange(start: string, end: string | null): string {
  const s = formatShort(start)
  if (!end) return `${s} – now`
  return `${s} – ${formatShort(end)}`
}

function formatShort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const detailStyles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  heroUnit: {
    fontSize: 14,
    paddingBottom: 6,
  },
  minMaxRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/analytics/CycleDetailSheets.tsx
git commit -m "feat(analytics): implement CycleLengthDetail body"
```

---

## Task 9: Implement `RegularityDetail`

**Files:**
- Modify: `components/analytics/CycleDetailSheets.tsx`

- [ ] **Step 1: Add import + replace `RegularityDetail` placeholder**

Add to imports:
```tsx
import { useRegularity } from '../../lib/cycleAnalytics'
```

Replace the placeholder:

```tsx
function RegularityDetail() {
  const { colors, stickers, font } = useTheme()
  const { data, isLoading, error } = useRegularity()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.percent === null) {
    return <EmptyState copy="We need at least 3 complete cycles to measure regularity." />
  }

  return (
    <View style={{ gap: 18 }}>
      <View style={detailStyles.heroRow}>
        <Display size={56} color={colors.text}>{data.percent}%</Display>
        <Text style={[detailStyles.heroUnit, { color: colors.textMuted, fontFamily: font.body }]}>regular</Text>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[detailStyles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          LEGEND
        </Text>
        <View style={regStyles.legendRow}>
          <LegendDot color={stickers.green} text="≤ 2 days" />
          <LegendDot color={stickers.yellow} text="≤ 4 days" />
          <LegendDot color={stickers.coral} text="> 4 days" />
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[detailStyles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          PER-CYCLE DEVIATION
        </Text>
        {data.deviations.slice(-10).map((d) => {
          const dotColor =
            d.delta <= 2 ? stickers.green : d.delta <= 4 ? stickers.yellow : stickers.coral
          return (
            <View
              key={d.cycleIdx}
              style={[detailStyles.historyRow, { borderColor: colors.borderLight }]}
            >
              <View style={regStyles.rowLeft}>
                <View style={[regStyles.dot, { backgroundColor: dotColor }]} />
                <Body size={13} color={colors.text}>Cycle {d.cycleIdx}</Body>
              </View>
              <Body size={13} color={colors.textSecondary}>
                {d.lengthDays}d · {d.delta === 0 ? 'on avg' : `±${d.delta}d`}
              </Body>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function LegendDot({ color, text }: { color: string; text: string }) {
  const { colors, font } = useTheme()
  return (
    <View style={regStyles.legendItem}>
      <View style={[regStyles.dot, { backgroundColor: color }]} />
      <Text style={{ fontSize: 12, color: colors.textMuted, fontFamily: font.body }}>{text}</Text>
    </View>
  )
}

const regStyles = StyleSheet.create({
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/analytics/CycleDetailSheets.tsx
git commit -m "feat(analytics): implement RegularityDetail body"
```

---

## Task 10: Implement `PMSDetail`

**Files:**
- Modify: `components/analytics/CycleDetailSheets.tsx`

- [ ] **Step 1: Add imports + replace placeholder**

Add imports:
```tsx
import { usePMSStats } from '../../lib/cycleAnalytics'
import { Burst } from '../ui/Stickers'
```

Replace placeholder:

```tsx
function PMSDetail() {
  const { colors, stickers, font } = useTheme()
  const { data, isLoading, error } = usePMSStats()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || (data.avgDays === null && data.topSymptoms.length === 0)) {
    return <EmptyState copy="Log symptoms on the Agenda tab to start tracking PMS trends." />
  }

  const maxCount = data.topSymptoms[0]?.count ?? 1

  return (
    <View style={{ gap: 18 }}>
      {data.avgDays !== null && (
        <View style={detailStyles.heroRow}>
          <Display size={40} color={colors.text}>{data.avgDays}</Display>
          <Text style={[detailStyles.heroUnit, { color: colors.textMuted, fontFamily: font.body }]}>
            days of symptoms / cycle
          </Text>
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Text style={[detailStyles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          TOP SYMPTOMS
        </Text>
        {data.topSymptoms.length === 0 ? (
          <Body size={13} color={colors.textMuted}>No symptoms logged yet.</Body>
        ) : (
          data.topSymptoms.map((s) => {
            const pct = (s.count / maxCount) * 100
            return (
              <View key={s.name} style={pmsStyles.symptomRow}>
                <View style={pmsStyles.symptomLeft}>
                  <View style={[pmsStyles.chip, { backgroundColor: stickers.peachSoft, borderColor: colors.border }]}>
                    <Burst size={20} fill={stickers.peach} points={8} wobble={0.2} />
                  </View>
                  <Body size={14} color={colors.text}>{s.name}</Body>
                </View>
                <View style={pmsStyles.symptomRight}>
                  <View style={[pmsStyles.bar, { width: `${pct}%`, backgroundColor: stickers.peachSoft }]} />
                  <Body size={13} color={colors.textSecondary}>{s.count}</Body>
                </View>
              </View>
            )
          })
        )}
      </View>
    </View>
  )
}

const pmsStyles = StyleSheet.create({
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  symptomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  symptomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 120,
  },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    height: 8,
    borderRadius: 4,
    flex: 1,
    maxWidth: 80,
  },
})
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/analytics/CycleDetailSheets.tsx
git commit -m "feat(analytics): implement PMSDetail body"
```

---

## Task 11: Implement `FertileDetail`

**Files:**
- Modify: `components/analytics/CycleDetailSheets.tsx`

- [ ] **Step 1: Add imports + replace placeholder**

Add imports:
```tsx
import { useFertileWindow } from '../../lib/cycleAnalytics'
import { Flower } from '../ui/Stickers'
```

Replace placeholder:

```tsx
function FertileDetail() {
  const { colors, stickers, font } = useTheme()
  const { data, isLoading, error } = useFertileWindow()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || !data.current) {
    return <EmptyState copy="Log your last period to see your fertile window predictions." />
  }

  return (
    <View style={{ gap: 18 }}>
      <View style={[fertStyles.currentCard, { backgroundColor: stickers.pinkSoft, borderColor: colors.border }]}>
        <View style={fertStyles.currentChip}>
          <Flower size={40} petal={stickers.pink} center={stickers.yellow} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[detailStyles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
            THIS CYCLE
          </Text>
          <Display size={22} color={colors.text}>
            {formatShort(data.current.start)} – {formatShort(data.current.end)}
          </Display>
          <Body size={13} color={colors.textSecondary}>
            {data.current.daysLeft > 0
              ? `${data.current.daysLeft} day${data.current.daysLeft === 1 ? '' : 's'} left`
              : 'Window closed'}
          </Body>
        </View>
      </View>

      {data.history.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={[detailStyles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
            PAST WINDOWS
          </Text>
          {data.history.map((w) => (
            <View
              key={w.cycleIdx}
              style={[detailStyles.historyRow, { borderColor: colors.borderLight }]}
            >
              <Body size={13} color={colors.text}>Cycle {w.cycleIdx}</Body>
              <Body size={13} color={colors.textSecondary}>
                {formatShort(w.start)} – {formatShort(w.end)}
              </Body>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const fertStyles = StyleSheet.create({
  currentCard: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
  },
  currentChip: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#FFFEF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/analytics/CycleDetailSheets.tsx
git commit -m "feat(analytics): implement FertileDetail body"
```

---

## Task 12: Implement `MoodDetail`

**Files:**
- Modify: `components/analytics/CycleDetailSheets.tsx`

- [ ] **Step 1: Add imports + replace placeholder**

Add imports:
```tsx
import { useMoodStats, type MoodId } from '../../lib/cycleAnalytics'
```

Replace placeholder:

```tsx
const MOOD_LABELS: Record<MoodId, string> = {
  great: 'Great',
  energetic: 'Energetic',
  good: 'Good',
  okay: 'Okay',
  low: 'Low',
}

function MoodDetail() {
  const { colors, stickers, font } = useTheme()
  const { data, isLoading, error } = useMoodStats()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.avgScore === null) {
    return <EmptyState copy="Log your mood on the Agenda tab to see mood trends." />
  }

  const maxCount = Math.max(1, ...data.distribution.map((d) => d.count))

  return (
    <View style={{ gap: 18 }}>
      <View style={detailStyles.heroRow}>
        <Display size={40} color={colors.text}>{data.avgScore}</Display>
        <Text style={[detailStyles.heroUnit, { color: colors.textMuted, fontFamily: font.body }]}>/ 5 avg</Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[detailStyles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          DISTRIBUTION
        </Text>
        {data.distribution.map((row) => {
          const pct = (row.count / maxCount) * 100
          return (
            <View key={row.mood} style={moodStyles.row}>
              <Body size={13} color={colors.text} style={{ width: 80 }}>
                {MOOD_LABELS[row.mood]}
              </Body>
              <View style={moodStyles.barTrack}>
                <View style={[moodStyles.barFill, { width: `${pct}%`, backgroundColor: stickers.pink }]} />
              </View>
              <Body size={13} color={colors.textSecondary} style={{ width: 30, textAlign: 'right' }}>
                {row.count}
              </Body>
            </View>
          )
        })}
      </View>

      {data.recent.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={[detailStyles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
            LAST {data.recent.length} ENTRIES
          </Text>
          {data.recent.map((r, i) => (
            <View
              key={`${r.date}-${i}`}
              style={[detailStyles.historyRow, { borderColor: colors.borderLight }]}
            >
              <Body size={13} color={colors.text}>{formatShort(r.date)}</Body>
              <Body size={13} color={colors.textSecondary}>{MOOD_LABELS[r.mood]}</Body>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const moodStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: 'transparent',
  },
  barFill: {
    height: 10,
    borderRadius: 5,
  },
})
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/analytics/CycleDetailSheets.tsx
git commit -m "feat(analytics): implement MoodDetail body"
```

---

## Task 13: Wire `CycleAnalytics.tsx` to hooks + detail sheets

**Files:**
- Modify: `components/analytics/CycleAnalytics.tsx`

- [ ] **Step 1: Rewrite CycleAnalytics with hooks + Pressable tiles**

Replace the entire file with:

```tsx
/**
 * CycleAnalytics — 2026 redesign (cream-paper sticker-collage)
 *
 * Lean overview matching the reference AnalyticsScreen (feature-screens.jsx):
 *   1. Hero title + period selector
 *   2. BigChartCard — last N cycles (bars)
 *   3. 2x2 MiniStatTile grid (Regular, PMS days, Fertile, Mood avg)
 *
 * Each tile is tappable → opens CycleDetailSheet.
 */

import { useState, useMemo } from 'react'
import { View, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '../../constants/theme'
import { AnalyticsHeader } from './shared/AnalyticsHeader'
import { AnalyticsTitle } from './shared/AnalyticsTitle'
import { PeriodSelector, type Period } from './shared/PeriodSelector'
import { BigChartCard } from './shared/BigChartCard'
import { MiniStatTile } from './shared/MiniStatTile'
import { MiniBarChart } from './shared/MiniCharts'
import { Moon, Burst, Flower, Heart } from '../ui/Stickers'
import {
  useCycleHistory,
  useRegularity,
  usePMSStats,
  useFertileWindow,
  useMoodStats,
} from '../../lib/cycleAnalytics'
import { CycleDetailSheet, type CycleDetailType } from './CycleDetailSheets'

export function CycleAnalytics() {
  const { colors, stickers } = useTheme()
  const insets = useSafeAreaInsets()
  const [period, setPeriod] = useState<Period>('month')
  const [detailType, setDetailType] = useState<CycleDetailType | null>(null)

  const { data: history } = useCycleHistory()
  const { data: regularity } = useRegularity()
  const { data: pms } = usePMSStats()
  const { data: fertile } = useFertileWindow()
  const { data: mood } = useMoodStats()

  const cycleValues = useMemo(() => {
    const closed = history?.cycles.filter((c) => c.lengthDays !== null) ?? []
    return closed.slice(-7).map((c) => c.lengthDays as number)
  }, [history])

  const cycleLabels = useMemo(
    () => cycleValues.map((_, i) => `C${i + 1}`),
    [cycleValues]
  )

  const avgLabel = history?.avg ?? '—'
  const regularLabel = regularity?.percent !== null && regularity?.percent !== undefined ? `${regularity.percent}%` : '—'
  const pmsLabel = pms?.avgDays !== null && pms?.avgDays !== undefined ? String(pms.avgDays) : '—'
  const fertileLabel = formatFertile(fertile?.current)
  const moodLabel = mood?.avgScore !== null && mood?.avgScore !== undefined ? String(mood.avgScore) : '—'

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AnalyticsHeader hide />
        <AnalyticsTitle primary="Your cycle," italic="in detail." />
        <PeriodSelector value={period} onChange={setPeriod} showCustom={false} />

        <Pressable onPress={() => setDetailType('cycleLength')}>
          <BigChartCard
            label={`CYCLE LENGTH (LAST ${cycleValues.length || 0})`}
            value={String(avgLabel)}
            unit="days avg"
            blobColor={stickers.pinkSoft}
          >
            <MiniBarChart
              data={cycleValues}
              labels={cycleLabels}
              color={stickers.pink}
            />
          </BigChartCard>
        </Pressable>

        <View style={styles.grid}>
          <View style={styles.row}>
            <Pressable style={styles.pressable} onPress={() => setDetailType('regularity')}>
              <MiniStatTile
                label="REGULAR"
                value={regularLabel}
                sticker={<Moon size={28} fill={stickers.lilac} />}
                tint={stickers.lilacSoft}
              />
            </Pressable>
            <Pressable style={styles.pressable} onPress={() => setDetailType('pms')}>
              <MiniStatTile
                label="PMS DAYS"
                value={pmsLabel}
                sticker={<Burst size={28} fill={stickers.coral} points={8} />}
                tint={stickers.pinkSoft}
              />
            </Pressable>
          </View>
          <View style={styles.row}>
            <Pressable style={styles.pressable} onPress={() => setDetailType('fertile')}>
              <MiniStatTile
                label="FERTILE"
                value={fertileLabel}
                sticker={<Flower size={28} petal={stickers.pink} center={stickers.yellow} />}
                tint={stickers.yellowSoft}
              />
            </Pressable>
            <Pressable style={styles.pressable} onPress={() => setDetailType('mood')}>
              <MiniStatTile
                label="MOOD AVG"
                value={moodLabel}
                sticker={<Heart size={28} fill={stickers.pink} />}
                tint={stickers.greenSoft}
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <CycleDetailSheet type={detailType} onClose={() => setDetailType(null)} />
    </View>
  )
}

function formatFertile(current: { start: string; end: string } | null | undefined): string {
  if (!current) return '—'
  const s = new Date(current.start + 'T00:00:00')
  const e = new Date(current.end + 'T00:00:00')
  const month = s.toLocaleDateString('en-US', { month: 'short' })
  return `${month} ${s.getDate()}–${e.getDate()}`
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: 0 },
  grid: {
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  pressable: {
    flex: 1,
  },
})
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/analytics/CycleAnalytics.tsx
git commit -m "feat(analytics): wire CycleAnalytics to real hooks + detail sheets"
```

---

## Task 14: Create shared `LogFormSticker` header component

**Files:**
- Create: `components/calendar/LogFormSticker.tsx`

- [ ] **Step 1: Create the shared component**

```tsx
// components/calendar/LogFormSticker.tsx
/**
 * LogFormSticker — header row for bottom-sheet log forms.
 * Shows a branded sticker in a paper chip with a pastel halo + label.
 */

import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../constants/theme'
import { logSticker } from './logStickers'

interface Props {
  /** Log type that maps to a sticker (see logStickers.tsx) */
  type: string
  /** Label shown next to the sticker */
  label: string
  /** Optional pastel halo tint; defaults to surface */
  tint?: string
}

export function LogFormSticker({ type, label, tint }: Props) {
  const { colors, isDark, font } = useTheme()
  const haloTint = tint ?? colors.surfaceRaised

  return (
    <View style={[styles.row, { backgroundColor: haloTint, borderColor: colors.border }]}>
      <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {logSticker(type, 32, isDark)}
      </View>
      <Text
        style={[styles.label, { color: colors.text, fontFamily: font.bodySemiBold }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  chip: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    flex: 1,
  },
})
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/calendar/LogFormSticker.tsx
git commit -m "feat(calendar): add shared LogFormSticker header component"
```

---

## Task 15: Swap lucide icon rows for `LogFormSticker` in all 6 forms

**Files:**
- Modify: `components/calendar/LogForms.tsx`

This task replaces the entire `LogForms.tsx` because multiple non-contiguous sections change (imports, 6 form bodies, styles) and a full rewrite is clearer than 8 separate edits.

- [ ] **Step 1: Replace the file contents**

```tsx
/**
 * Cycle Log Forms — 6 bottom sheet forms for cycle tracking.
 *
 * Each form saves to Supabase cycle_logs table.
 * Forms: PeriodStart, PeriodEnd, Symptoms, Mood, Temperature, Intimacy
 */

import { useState } from 'react'
import { View, Text, TextInput, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native'
import {
  Smile,
  Frown,
  Meh,
  Laugh,
  Zap,
  Check,
} from 'lucide-react-native'
import { useTheme, stickers as stickersLight, stickersDark } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { LogFormSticker } from './LogFormSticker'

// ─── Shared save helper ────────────────────────────────────────────────────

async function saveCycleLog(
  date: string,
  type: string,
  value?: string | null,
  notes?: string
) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { error } = await supabase.from('cycle_logs').insert({
    user_id: session.user.id,
    date,
    type,
    value: value ?? null,
    notes: notes ?? null,
  })
  if (error) throw error
}

// ─── Period Start Form ─────────────────────────────────────────────────────

export function PeriodStartForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const s = isDark ? stickersDark : stickersLight

  async function save() {
    setSaving(true)
    try {
      await saveCycleLog(date, 'period_start', null, notes || undefined)
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="period_start"
        label={`Period started on ${formatDate(date)}`}
        tint={s.pinkSoft}
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} />
    </View>
  )
}

// ─── Period End Form ───────────────────────────────────────────────────────

export function PeriodEndForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { isDark } = useTheme()
  const [saving, setSaving] = useState(false)
  const s = isDark ? stickersDark : stickersLight

  async function save() {
    setSaving(true)
    try {
      await saveCycleLog(date, 'period_end')
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="period_end"
        label={`Period ended on ${formatDate(date)}`}
        tint={s.pinkSoft}
      />
      <SaveButton onPress={save} saving={saving} />
    </View>
  )
}

// ─── Symptoms Form ─────────────────────────────────────────────────────────

const SYMPTOMS = [
  'Cramps', 'Headache', 'Bloating', 'Fatigue', 'Nausea',
  'Back pain', 'Breast tenderness', 'Acne', 'Insomnia', 'Cravings',
]

export function SymptomsForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const [selected, setSelected] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const s = isDark ? stickersDark : stickersLight

  function toggle(sym: string) {
    setSelected((prev) =>
      prev.includes(sym) ? prev.filter((x) => x !== sym) : [...prev, sym]
    )
  }

  async function save() {
    if (selected.length === 0) return
    setSaving(true)
    try {
      await saveCycleLog(date, 'symptom', selected.join(', '), notes || undefined)
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="symptom"
        label="How's your body feeling today?"
        tint={s.peachSoft}
      />
      <View style={styles.chipGrid}>
        {SYMPTOMS.map((sym) => {
          const active = selected.includes(sym)
          return (
            <Pressable
              key={sym}
              onPress={() => toggle(sym)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primaryTint : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              {active && <Check size={12} color={colors.primary} strokeWidth={3} />}
              <Text style={[styles.chipText, { color: active ? colors.primary : colors.text }]}>{sym}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Additional notes"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={selected.length === 0} />
    </View>
  )
}

// ─── Mood Form ─────────────────────────────────────────────────────────────

const MOODS = [
  { id: 'great', icon: Laugh, label: 'Great' },
  { id: 'good', icon: Smile, label: 'Good' },
  { id: 'okay', icon: Meh, label: 'Okay' },
  { id: 'low', icon: Frown, label: 'Low' },
  { id: 'energetic', icon: Zap, label: 'Energetic' },
]

export function MoodForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const [mood, setMood] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const s = isDark ? stickersDark : stickersLight

  async function save() {
    if (!mood) return
    setSaving(true)
    try {
      await saveCycleLog(date, 'mood', mood, notes || undefined)
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="mood"
        label="How's your mood today?"
        tint={s.yellowSoft}
      />
      <View style={styles.moodRow}>
        {MOODS.map((m) => {
          const Icon = m.icon
          const active = mood === m.id
          return (
            <Pressable
              key={m.id}
              onPress={() => setMood(m.id)}
              style={[
                styles.moodBtn,
                {
                  backgroundColor: active ? colors.primaryTint : colors.surface,
                  borderRadius: radius.lg,
                },
              ]}
            >
              <Icon size={24} color={active ? colors.primary : colors.textMuted} strokeWidth={2} />
              <Text style={[styles.moodLabel, { color: active ? colors.primary : colors.textMuted }]}>{m.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="How are you feeling?"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!mood} />
    </View>
  )
}

// ─── Temperature Form ──────────────────────────────────────────────────────

export function TemperatureForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const [temp, setTemp] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const s = isDark ? stickersDark : stickersLight

  async function save() {
    if (!temp) return
    setSaving(true)
    try {
      await saveCycleLog(date, 'basal_temp', temp, notes || undefined)
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="basal_temp"
        label="Basal Temperature"
        tint={s.blueSoft}
      />
      <View style={[styles.tempRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
        <TextInput
          value={temp}
          onChangeText={setTemp}
          placeholder="36.5"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={[styles.tempInput, { color: colors.text }]}
        />
        <Text style={[styles.tempUnit, { color: colors.textSecondary }]}>°C</Text>
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!temp} />
    </View>
  )
}

// ─── Intimacy Form ─────────────────────────────────────────────────────────

export function IntimacyForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const s = isDark ? stickersDark : stickersLight

  async function save() {
    setSaving(true)
    try {
      await saveCycleLog(date, 'intercourse', 'yes', notes || undefined)
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="intercourse"
        label={`Intimacy logged for ${formatDate(date)}`}
        tint={s.pinkSoft}
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} />
    </View>
  )
}

// ─── Shared Save Button ────────────────────────────────────────────────────

function SaveButton({ onPress, saving, disabled }: { onPress: () => void; saving: boolean; disabled?: boolean }) {
  const { colors, radius } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={saving || disabled}
      style={({ pressed }) => [
        styles.saveBtn,
        { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: disabled ? 0.4 : 1 },
        pressed && !disabled && { transform: [{ scale: 0.98 }], opacity: 0.9 },
      ]}
    >
      {saving ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <Text style={styles.saveBtnText}>Save</Text>
      )}
    </Pressable>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  form: {
    gap: 16,
    paddingBottom: 8,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
    fontWeight: '500',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  tempInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'Fraunces_600SemiBold',
  },
  tempUnit: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Verify `stickersDark` is exported from theme**

Run: `grep -n "export.*stickersDark" constants/theme.ts`
Expected: at least one line matches (export found).

If not found, the earlier audit noted stickers imports in logStickers.tsx: `import { stickers as stickersLight, stickersDark } from '../../constants/theme'`. This confirms the symbol exists. If grep fails, check for named-export pattern and adjust the import in Step 1 to match existing convention.

- [ ] **Step 4: Commit**

```bash
git add components/calendar/LogForms.tsx
git commit -m "feat(calendar): swap lucide icons for branded stickers in all cycle log forms"
```

---

## Task 16: Manual QA pass + final commit

**Files:** none modified (manual verification)

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: no new errors across the project.

- [ ] **Step 2: Start dev server and test on a seeded account**

Run: `npx expo start`

Manual steps (on an iOS simulator):
1. Sign in with a test account that has ≥3 `period_start` entries, ≥10 `symptom` entries, ≥30 `mood` entries.
2. Switch mode to Pre-Pregnancy.
3. Tap Analytics tab → verify all 5 tiles show values from the test data (not static mocks).
4. Tap **Cycle Length** tile → bottom sheet opens with "Cycle Length" title, avg number, min/max chips, bar chart, history list. Close → returns cleanly.
5. Tap **Regular** tile → sheet opens with percent, legend, per-cycle rows. Close.
6. Tap **PMS Days** tile → sheet opens with avg days, top symptoms list with Burst stickers. Close.
7. Tap **Fertile** tile → sheet opens with current window card (Flower sticker) + past windows list. Close.
8. Tap **Mood Avg** tile → sheet opens with avg score, distribution bars, last entries. Close.
9. Open Agenda tab → tap the `+` button to open Log Activity sheet. Verify 6 tiles show branded stickers (Drop/Burst/Flower/Heart/Drop/CircleDashed).
10. Open each individual log: Temperature, Symptoms, Mood, Intimacy, Period start, Period end. Verify each shows a `LogFormSticker` header row (pastel halo + sticker chip + label) instead of a generic lucide icon.
11. Sign in with a fresh test account that has zero cycle logs. Verify each detail sheet shows its empty-state copy ("Log your first period…" etc.) without crashing.

- [ ] **Step 3: If any issues, fix inline and commit the fix(es) as separate small commits, then re-run Step 2.**

- [ ] **Step 4: If all passes, final commit (if any cleanup made)**

If anything was fixed during QA:
```bash
git add <files>
git commit -m "fix(analytics): QA pass fixes"
```

If nothing changed, skip — the implementation is complete.

---

## Self-Review Checklist

**Spec coverage:**
- Goal 1 (analytics read real data): Tasks 1–6, 13 ✓
- Goal 2 (tap → detail sheet): Tasks 7–13 ✓
- Goal 3 (branded stickers on log UI): Tasks 14–15 ✓
- Empty states: handled in each detail task (Tasks 8–12) ✓

**Type consistency:**
- `CycleDetailType` defined in Task 7 and imported in Task 13 ✓
- `MoodId` exported from `lib/cycleAnalytics` in Task 6, imported in Task 12 ✓
- `useCycleHistory` / `useRegularity` / `usePMSStats` / `useFertileWindow` / `useMoodStats` names match across tasks ✓
- `CycleHistory` shape (`cycles`, `avg`, `min`, `max`) consistent across Tasks 2, 3, 5, 8, 13 ✓

**Placeholders:**
- Every step contains the actual code/command, no TBDs ✓
- Task 15 replaces the whole file (not "similar to Task N") ✓

**No hidden dependencies:**
- `stickersDark` import in Task 15 — Task 15 Step 3 verifies it exists ✓
- `Body`, `Display` from `../ui/Typography` — already used across the codebase ✓
- `useSafeAreaInsets` — already imported in `CycleAnalytics.tsx` today ✓
