# Pregnancy Journey Ring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Journey tab's flat week list in `PregnancyCalendar` with an interactive rotating ring where 40 dots represent pregnancy weeks, the ring spins to reveal the selected week at the bottom anchor, and a bottom panel shows logged activities + milestone note.

**Architecture:** A new `PregnancyJourneyRing` component owns all ring state. It uses `react-native-svg` for the dot ring (rotated as an SVG `<G>` group via Reanimated's `useAnimatedProps`), `PanResponder` for drag/tap gesture detection, and Reanimated v4's `withDecay` for momentum. A `useDerivedValue` + `useAnimatedReaction` bridge updates React state when the selected week changes, triggering a React Query fetch for that week's logged activity types.

**Tech Stack:** `react-native-svg` 15.12.1, `react-native-reanimated` ~4.1.1, React Native `PanResponder`, `@tanstack/react-query` v5, Supabase (`pregnancy_logs` table), `lib/pregnancyData.ts` (`getWeekData`), `usePregnancyStore`, `useTheme`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `components/pregnancy/PregnancyJourneyRing.tsx` | **Create** | Complete ring + bottom panel component |
| `components/calendar/PregnancyCalendar.tsx` | **Modify** (line ~1636) | Replace `renderJourneyView()` body with `<PregnancyJourneyRing>` |

---

## Task 1: Create the component file with utilities

**Files:**
- Create: `components/pregnancy/PregnancyJourneyRing.tsx`

- [ ] **Step 1: Create the file with imports, constants, and pure utility functions**

```tsx
// components/pregnancy/PregnancyJourneyRing.tsx

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, PanResponder, StyleSheet,
  type GestureResponderEvent,
} from 'react-native'
import Svg, { Circle, G } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useDerivedValue,
  useAnimatedReaction,
  runOnJS,
  withDecay,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { getWeekData } from '../../lib/pregnancyData'
import { useTheme } from '../../constants/theme'

const AnimatedG = Animated.createAnimatedComponent(G)

// ─── Layout constants ────────────────────────────────────────────────────────
const SVG_SIZE = 320
const CX = SVG_SIZE / 2        // 160
const CY = SVG_SIZE / 2        // 160
const RING_R = 128
const ANCHOR_DEG = 90          // 6 o'clock = bottom

// ─── Color helpers ───────────────────────────────────────────────────────────
function triColor(w: number): string {
  if (w <= 13) return '#A2FF86'
  if (w <= 26) return '#B983FF'
  return '#FF6B35'
}

function triName(w: number): string {
  if (w <= 13) return '1st Trimester'
  if (w <= 26) return '2nd Trimester'
  return '3rd Trimester'
}

// ─── Date utilities ──────────────────────────────────────────────────────────
function getWeekDateRange(dueDate: string, week: number): { start: string; end: string } {
  const due = new Date(dueDate)
  const start = new Date(due)
  start.setDate(due.getDate() - (40 - week) * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const toISO = (d: Date) => d.toISOString().split('T')[0]
  return { start: toISO(start), end: toISO(end) }
}

function formatDateRange(dueDate: string, week: number): string {
  const { start, end } = getWeekDateRange(dueDate, week)
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(s)} – ${fmt(e)}, ${e.getFullYear()}`
}

// ─── Log type display map ────────────────────────────────────────────────────
const LOG_DISPLAY: Record<string, { label: string; color: string }> = {
  weight:      { label: 'Weight',       color: '#A2FF86' },
  mood:        { label: 'Mood',         color: '#B983FF' },
  kick:        { label: 'Kicks',        color: '#FF8AD8' },
  symptom:     { label: 'Symptom',      color: '#FF6B35' },
  sleep:       { label: 'Sleep',        color: '#4D96FF' },
  appointment: { label: 'Appt',         color: '#FBBF24' },
  exercise:    { label: 'Exercise',     color: '#A2FF86' },
  water:       { label: 'Water',        color: '#4D96FF' },
  vitamins:    { label: 'Vitamins',     color: '#FF8AD8' },
  contraction: { label: 'Contractions', color: '#FF6B35' },
}

// ─── Pre-calculated dot geometry ────────────────────────────────────────────
interface DotConfig {
  week: number
  bx: number           // base x (before group rotation)
  by: number           // base y (before group rotation)
  r: number
  fill: string
  fillOpacity: number
  strokeColor: string
  strokeWidth: number
}

function buildDotConfigs(currentWeek: number): DotConfig[] {
  return Array.from({ length: 40 }, (_, i) => {
    const w = i + 1
    const angleDeg = (i / 40) * 360 - 90
    const angleRad = angleDeg * (Math.PI / 180)
    const bx = CX + RING_R * Math.cos(angleRad)
    const by = CY + RING_R * Math.sin(angleRad)
    const col = triColor(w)
    const baseR = w <= 13 ? 5 : w <= 26 ? 6 : 7
    const isCurr = w === currentWeek
    const isPast = w < currentWeek
    const isFuture = w > currentWeek
    return {
      week: w,
      bx,
      by,
      r: isCurr ? baseR + 3 : baseR,
      fill: isFuture ? 'none' : col,
      fillOpacity: isFuture ? 0 : isPast ? 0.35 + (i / currentWeek) * 0.55 : 1,
      strokeColor: isFuture ? col : 'none',
      strokeWidth: isFuture ? 1 : 0,
    }
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles (no errors yet expected — just imports)**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
npx tsc --noEmit 2>&1 | grep "PregnancyJourneyRing"
```

Expected: one error about the file having no exports — that's fine, we'll add the component next.

---

## Task 2: Add the component shell with static SVG ring

**Files:**
- Modify: `components/pregnancy/PregnancyJourneyRing.tsx`

- [ ] **Step 1: Add the Props interface and component shell with a static ring**

Append to `components/pregnancy/PregnancyJourneyRing.tsx` after the utilities:

```tsx
// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  weekNumber: number
  dueDate: string
}

// ─── Component ───────────────────────────────────────────────────────────────
export function PregnancyJourneyRing({ weekNumber, dueDate }: Props) {
  const { colors, font } = useTheme()

  // Auth
  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id)
    })
  }, [])

  // Pre-calculate dot configs once per weekNumber change
  const dots = useMemo(() => buildDotConfigs(weekNumber), [weekNumber])

  // Initial rotation: place weekNumber at the bottom anchor
  // Week i (0-indexed) base angle = (i/40)*360 - 90
  // We want: baseAngle(weekNumber-1) + rotation = ANCHOR_DEG (90)
  // => rotation = 90 - ((weekNumber-1)/40)*360 + 90 = 180 - ((weekNumber-1)/40)*360
  const initialRot = 180 - ((weekNumber - 1) / 40) * 360
  const rotationDeg = useSharedValue(initialRot)

  // Animated props for the SVG group — rotates around ring center
  const animatedGroupProps = useAnimatedProps(() => ({
    rotation: rotationDeg.value,
    originX: CX,
    originY: CY,
  }))

  return (
    <View style={styles.container}>
      {/* ── Ring ── */}
      <View style={styles.ringWrap}>
        <Svg width={SVG_SIZE} height={SVG_SIZE}>
          {/* Faint orbit track */}
          <Circle
            cx={CX}
            cy={CY}
            r={RING_R}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1.5}
          />

          {/* Rotating dot group */}
          <AnimatedG animatedProps={animatedGroupProps}>
            {dots.map((d) => (
              <Circle
                key={d.week}
                cx={d.bx}
                cy={d.by}
                r={d.r}
                fill={d.fill}
                fillOpacity={d.fillOpacity}
                stroke={d.strokeColor}
                strokeWidth={d.strokeWidth}
              />
            ))}
          </AnimatedG>

          {/* Fixed anchor indicator — small triangle at 6 o'clock */}
          {/* Rendered as three small circles forming an arrow */}
          <Circle cx={CX} cy={CY + RING_R + 10} r={3} fill={triColor(weekNumber)} />

          {/* Fixed selection ring at anchor position */}
          <Circle
            cx={CX}
            cy={CY + RING_R}
            r={14}
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth={2}
          />
        </Svg>

        {/* Center overlay — WEEK + number */}
        <View style={styles.centerOverlay} pointerEvents="none">
          <Text style={[styles.centerLabel, { color: 'rgba(255,255,255,0.35)', fontFamily: font.bodySemiBold }]}>
            WEEK
          </Text>
          <Text style={[styles.centerNumber, { color: '#fff', fontFamily: font.displayBold ?? font.bodySemiBold }]}>
            {weekNumber}
          </Text>
          <Text style={[styles.centerStatus, { color: 'rgba(255,255,255,0.28)', fontFamily: font.bodyMedium }]}>
            YOU ARE HERE
          </Text>
        </View>
      </View>

      <Text style={[styles.hint, { color: 'rgba(255,255,255,0.18)', fontFamily: font.body }]}>
        ↺ drag to spin · tap any week
      </Text>
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  ringWrap: { alignItems: 'center', position: 'relative' },
  hint: { fontSize: 10, textAlign: 'center', marginTop: 2 },

  // Center overlay (absolute, non-interactive)
  centerOverlay: {
    position: 'absolute',
    top: 0, left: 0,
    width: SVG_SIZE,
    height: SVG_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel:  { fontSize: 11, letterSpacing: 1.5, marginBottom: 2 },
  centerNumber: { fontSize: 58, lineHeight: 62 },
  centerStatus: { fontSize: 9,  letterSpacing: 1.2, marginTop: 2 },
})
```

- [ ] **Step 2: Temporarily wire into PregnancyCalendar to visually verify**

Open `components/calendar/PregnancyCalendar.tsx`, find `renderJourneyView` (line ~1636), and replace its body temporarily:

```tsx
function renderJourneyView() {
  return (
    <PregnancyJourneyRing weekNumber={weekNumber} dueDate={dueDate} />
  )
}
```

Add the import at the top of `PregnancyCalendar.tsx` (near other component imports, around line 74):

```tsx
import { PregnancyJourneyRing } from '../pregnancy/PregnancyJourneyRing'
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
npx tsc --noEmit 2>&1 | head -40
```

Expected: No errors (or only pre-existing unrelated errors).

- [ ] **Step 4: Commit**

```bash
git add components/pregnancy/PregnancyJourneyRing.tsx components/calendar/PregnancyCalendar.tsx
git commit -m "feat(journey-ring): static SVG ring skeleton + wire into PregnancyCalendar"
```

---

## Task 3: Add PanResponder gesture + Reanimated momentum

**Files:**
- Modify: `components/pregnancy/PregnancyJourneyRing.tsx`

- [ ] **Step 1: Add gesture refs and PanResponder inside the component, above the return statement**

Inside `PregnancyJourneyRing`, after the `animatedGroupProps` declaration, add:

```tsx
  // ── Gesture tracking refs ────────────────────────────────────────────────
  const lastAngleRef     = useRef(0)
  const velocityRef      = useRef(0)
  const totalMoveRef     = useRef(0)  // accumulated degrees moved (tap detection)

  // ── Helper: angle of pointer relative to ring center ────────────────────
  const getAngle = (e: GestureResponderEvent): number => {
    const { locationX, locationY } = e.nativeEvent
    return Math.atan2(locationY - CY, locationX - CX) * (180 / Math.PI)
  }

  // ── PanResponder ──────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (e) => {
        cancelAnimation(rotationDeg)
        lastAngleRef.current = getAngle(e)
        totalMoveRef.current = 0
        velocityRef.current = 0
      },

      onPanResponderMove: (e) => {
        const angle = getAngle(e)
        let delta = angle - lastAngleRef.current
        // Normalize to avoid 180→-180 wrap jump
        if (delta > 180) delta -= 360
        if (delta < -180) delta += 360
        rotationDeg.value += delta
        velocityRef.current = delta
        lastAngleRef.current = angle
        totalMoveRef.current += Math.abs(delta)
      },

      onPanResponderRelease: (e) => {
        if (totalMoveRef.current < 3) {
          // ── Tap: find nearest dot and snap to it ──────────────────────────
          const { locationX, locationY } = e.nativeEvent
          let best: number | null = null
          let bestDist = Infinity
          for (let i = 0; i < 40; i++) {
            const baseAngleDeg = (i / 40) * 360 - 90
            const currentAngleRad = (baseAngleDeg + rotationDeg.value) * (Math.PI / 180)
            const dotX = CX + RING_R * Math.cos(currentAngleRad)
            const dotY = CY + RING_R * Math.sin(currentAngleRad)
            const dist = Math.hypot(locationX - dotX, locationY - dotY)
            if (dist < 24 && dist < bestDist) {
              bestDist = dist
              best = i
            }
          }
          if (best !== null) {
            snapToWeek(best + 1)
          }
        } else {
          // ── Drag release: apply momentum decay ────────────────────────────
          // velocity in deg/event → scale to deg/s (assuming ~60fps * 12)
          rotationDeg.value = withDecay({
            velocity: velocityRef.current * 12,
            deceleration: 0.997,
          })
        }
      },
    })
  ).current
```

- [ ] **Step 2: Add the `snapToWeek` function** (add before `panResponder`, after `totalMoveRef`):

```tsx
  const snapToWeek = useCallback(
    (w: number) => {
      // Target rotation that places week w at the bottom anchor
      const targetRot = 180 - ((w - 1) / 40) * 360
      // Travel the short way around
      let diff = targetRot - rotationDeg.value
      diff = ((diff + 180) % 360) - 180
      cancelAnimation(rotationDeg)
      rotationDeg.value = withTiming(rotationDeg.value + diff, {
        duration: 380,
        easing: Easing.out(Easing.cubic),
      })
    },
    [rotationDeg],
  )
```

- [ ] **Step 3: Attach PanResponder to the SVG wrapper View**

In the JSX, wrap the `<Svg>` element in a `<View>` with the panHandlers:

```tsx
        <View {...panResponder.panHandlers}>
          <Svg width={SVG_SIZE} height={SVG_SIZE}>
            {/* ... existing SVG content ... */}
          </Svg>
        </View>
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
npx tsc --noEmit 2>&1 | head -40
```

Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add components/pregnancy/PregnancyJourneyRing.tsx
git commit -m "feat(journey-ring): add PanResponder drag + withDecay momentum + tap-to-snap"
```

---

## Task 4: Wire selected week state via Reanimated reaction

**Files:**
- Modify: `components/pregnancy/PregnancyJourneyRing.tsx`

- [ ] **Step 1: Add `selectedWeek` state and the Reanimated derived value + reaction**

Inside `PregnancyJourneyRing`, after `rotationDeg` declaration, add:

```tsx
  const [selectedWeek, setSelectedWeek] = useState(weekNumber)

  // ── Derive selected week on the UI thread ─────────────────────────────────
  // A week is "selected" when its current angle is closest to ANCHOR_DEG (90°)
  const selectedWeekDerived = useDerivedValue(() => {
    let best = 0
    let bestDiff = Infinity
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * 360 - 90 + rotationDeg.value
      // Distance from anchor, normalized to [-180, 180]
      let diff = ((angle - ANCHOR_DEG + 180) % 360) - 180
      const absDiff = diff < 0 ? -diff : diff
      if (absDiff < bestDiff) {
        bestDiff = absDiff
        best = i
      }
    }
    return best + 1  // week number 1–40
  })

  // Bridge UI thread → JS thread: update React state when week changes
  useAnimatedReaction(
    () => selectedWeekDerived.value,
    (week, prev) => {
      if (week !== prev) runOnJS(setSelectedWeek)(week)
    },
  )
```

- [ ] **Step 2: Update the center overlay to use `selectedWeek` (not just `weekNumber`)**

Replace the center overlay `<View>` content so it shows the spinning week + correct status:

```tsx
        {/* Center overlay — WEEK + number */}
        <View style={styles.centerOverlay} pointerEvents="none">
          <Text style={[styles.centerLabel, { color: 'rgba(255,255,255,0.35)', fontFamily: font.bodySemiBold }]}>
            WEEK
          </Text>
          <Text style={[styles.centerNumber, { color: '#fff', fontFamily: font.displayBold ?? font.bodySemiBold }]}>
            {selectedWeek}
          </Text>
          <Text style={[styles.centerStatus, { color: 'rgba(255,255,255,0.28)', fontFamily: font.bodyMedium }]}>
            {selectedWeek === weekNumber
              ? 'YOU ARE HERE'
              : selectedWeek < weekNumber
              ? 'COMPLETED'
              : 'UPCOMING'}
          </Text>
        </View>
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
npx tsc --noEmit 2>&1 | head -40
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add components/pregnancy/PregnancyJourneyRing.tsx
git commit -m "feat(journey-ring): derive selectedWeek from ring rotation via Reanimated reaction"
```

---

## Task 5: Add week logs query

**Files:**
- Modify: `components/pregnancy/PregnancyJourneyRing.tsx`

- [ ] **Step 1: Add the React Query hook for logged activity types inside the component**

Inside `PregnancyJourneyRing`, after the `useAnimatedReaction` block, add:

```tsx
  // ── Logged activity types for the selected week ───────────────────────────
  const { data: weekLogTypes = [] } = useQuery({
    queryKey: ['pregnancy-week-logs', userId, selectedWeek, dueDate],
    queryFn: async (): Promise<string[]> => {
      if (!userId || !dueDate) return []
      const { start, end } = getWeekDateRange(dueDate, selectedWeek)
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('log_type')
        .eq('user_id', userId)
        .gte('log_date', start)
        .lte('log_date', end)
      if (error) throw error
      // Deduplicate: one chip per type
      return [...new Set((data ?? []).map((r: { log_type: string }) => r.log_type))]
    },
    enabled: !!userId && !!dueDate,
    staleTime: 30_000,
  })
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
npx tsc --noEmit 2>&1 | head -40
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add components/pregnancy/PregnancyJourneyRing.tsx
git commit -m "feat(journey-ring): query pregnancy_logs for selected week activity types"
```

---

## Task 6: Add bottom panel

**Files:**
- Modify: `components/pregnancy/PregnancyJourneyRing.tsx`

- [ ] **Step 1: Add bottom panel JSX after the ring hint text, inside the `container` View**

Replace the full `return` statement in `PregnancyJourneyRing` with:

```tsx
  const col = triColor(selectedWeek)
  const isCurrWeek = selectedWeek === weekNumber
  const isPastWeek = selectedWeek < weekNumber
  const weekData = getWeekData(selectedWeek)
  const statusLabel = isCurrWeek ? 'You are here' : isPastWeek ? 'Completed' : 'Upcoming'
  const dateLabel = dueDate ? formatDateRange(dueDate, selectedWeek) : '—'

  return (
    <View style={styles.container}>
      {/* ── Ring ── */}
      <View style={styles.ringWrap}>
        <View {...panResponder.panHandlers}>
          <Svg width={SVG_SIZE} height={SVG_SIZE}>
            {/* Faint orbit track */}
            <Circle
              cx={CX} cy={CY} r={RING_R}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1.5}
            />
            {/* Rotating dot group */}
            <AnimatedG animatedProps={animatedGroupProps}>
              {dots.map((d) => (
                <Circle
                  key={d.week}
                  cx={d.bx} cy={d.by} r={d.r}
                  fill={d.fill}
                  fillOpacity={d.fillOpacity}
                  stroke={d.strokeColor}
                  strokeWidth={d.strokeWidth}
                />
              ))}
            </AnimatedG>
            {/* Fixed selection ring at anchor (6 o'clock) */}
            <Circle
              cx={CX} cy={CY + RING_R} r={14}
              fill="none"
              stroke="rgba(255,255,255,0.65)"
              strokeWidth={2}
            />
            {/* Anchor dot indicator */}
            <Circle cx={CX} cy={CY + RING_R + 10} r={3} fill={col} />
          </Svg>
        </View>

        {/* Center overlay */}
        <View style={styles.centerOverlay} pointerEvents="none">
          <Text style={[styles.centerLabel, { color: 'rgba(255,255,255,0.35)', fontFamily: font.bodySemiBold }]}>
            WEEK
          </Text>
          <Text style={[styles.centerNumber, { color: '#fff', fontFamily: font.displayBold ?? font.bodySemiBold }]}>
            {selectedWeek}
          </Text>
          <Text style={[styles.centerStatus, { color: 'rgba(255,255,255,0.28)', fontFamily: font.bodyMedium }]}>
            {isCurrWeek ? 'YOU ARE HERE' : isPastWeek ? 'COMPLETED' : 'UPCOMING'}
          </Text>
        </View>
      </View>

      <Text style={[styles.hint, { color: 'rgba(255,255,255,0.18)', fontFamily: font.body }]}>
        ↺ drag to spin · tap any week
      </Text>

      {/* ── Bottom panel ── */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date range + status pill */}
        <View style={styles.dateRow}>
          <Text style={[styles.dateText, { color: col, fontFamily: font.bodySemiBold }]}>
            {dateLabel}
          </Text>
          <View style={[styles.statusPill, { borderColor: col + '44', backgroundColor: col + '18' }]}>
            <Text style={[styles.statusPillText, { color: col, fontFamily: font.bodySemiBold }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Logged this week */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: 'rgba(255,255,255,0.28)', fontFamily: font.bodySemiBold }]}>
            LOGGED THIS WEEK
          </Text>
          {weekLogTypes.length > 0 ? (
            <View style={styles.chipsRow}>
              {weekLogTypes.map((type) => {
                const display = LOG_DISPLAY[type] ?? { label: type, color: '#fff' }
                return (
                  <View
                    key={type}
                    style={[styles.chip, { borderColor: 'rgba(255,255,255,0.10)' }]}
                  >
                    <View style={[styles.chipDot, { backgroundColor: display.color }]} />
                    <Text style={[styles.chipText, { color: 'rgba(255,255,255,0.70)', fontFamily: font.bodySemiBold }]}>
                      {display.label}
                    </Text>
                  </View>
                )
              })}
            </View>
          ) : (
            <Text style={[styles.emptyLogs, { color: 'rgba(255,255,255,0.22)', fontFamily: font.body }]}>
              {isCurrWeek
                ? 'Nothing logged yet this week.'
                : isPastWeek
                ? 'No logs recorded for this week.'
                : 'Future week — nothing to log yet.'}
            </Text>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* This week milestone note */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: 'rgba(255,255,255,0.28)', fontFamily: font.bodySemiBold }]}>
            THIS WEEK
          </Text>
          <Text style={[styles.noteText, { color: 'rgba(255,255,255,0.62)', fontFamily: font.body }]}>
            {weekData.developmentFact}
          </Text>
        </View>

        {/* 40-dot progress strip */}
        <View style={styles.progressStrip}>
          {Array.from({ length: 40 }, (_, i) => {
            const w = i + 1
            const dotCol = triColor(w)
            const isSelected = w === selectedWeek
            const isCurr = w === weekNumber
            const isPast = w < weekNumber
            return (
              <View
                key={w}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: isPast || isCurr ? dotCol : 'rgba(255,255,255,0.10)',
                    opacity: isPast ? 0.45 : 1,
                    width: isCurr ? 7 : isSelected ? 6 : 5,
                    height: isCurr ? 7 : isSelected ? 6 : 5,
                    borderRadius: 4,
                    shadowColor: isCurr ? dotCol : 'transparent',
                    shadowRadius: isCurr ? 4 : 0,
                    shadowOpacity: isCurr ? 1 : 0,
                  },
                ]}
              />
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
```

- [ ] **Step 2: Add the missing styles** — add these entries to the existing `StyleSheet.create({...})`:

```tsx
  // Bottom panel
  panel:         { flex: 1 },
  panelContent:  { paddingHorizontal: 24, paddingBottom: 32, gap: 16 },

  dateRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText:      { fontSize: 13, fontWeight: '600' },
  statusPill:    { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  statusPillText:{ fontSize: 10, letterSpacing: 0.5 },

  section:       { gap: 8 },
  sectionLabel:  { fontSize: 9, letterSpacing: 1.8 },

  chipsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderRadius: 99,
    paddingVertical: 6, paddingHorizontal: 13,
  },
  chipDot:       { width: 6, height: 6, borderRadius: 3 },
  chipText:      { fontSize: 12 },
  emptyLogs:     { fontSize: 12, fontStyle: 'italic' },

  divider:       { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  noteText:      { fontSize: 14, lineHeight: 22 },

  progressStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  progressDot:   { borderRadius: 3 },
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
npx tsc --noEmit 2>&1 | head -40
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add components/pregnancy/PregnancyJourneyRing.tsx
git commit -m "feat(journey-ring): add bottom panel with date range, log chips, milestone note, progress strip"
```

---

## Task 7: Finalise PregnancyCalendar wiring + cleanup

**Files:**
- Modify: `components/calendar/PregnancyCalendar.tsx`

- [ ] **Step 1: Verify the import is already present** (added in Task 2 Step 2):

```bash
grep "PregnancyJourneyRing" /Users/igorcarvalhorodrigues/Projects/grandma-app/components/calendar/PregnancyCalendar.tsx
```

Expected output:
```
import { PregnancyJourneyRing } from '../pregnancy/PregnancyJourneyRing'
...
return (
  <PregnancyJourneyRing weekNumber={weekNumber} dueDate={dueDate} />
)
```

If the import is missing, add it near line 74:
```tsx
import { PregnancyJourneyRing } from '../pregnancy/PregnancyJourneyRing'
```

- [ ] **Step 2: Confirm `renderJourneyView` body is the ring component**

Find `renderJourneyView` (line ~1636). The body should be exactly:

```tsx
  function renderJourneyView() {
    return (
      <PregnancyJourneyRing weekNumber={weekNumber} dueDate={dueDate} />
    )
  }
```

If `dueDate` is an empty string when not set, guard it in the component (already handled by `formatDateRange` returning `'—'` when dueDate is falsy — verify this is consistent).

- [ ] **Step 3: Verify the old `ActivityPillCard` map is fully removed from `renderJourneyView`**

```bash
grep -n "pregnancyWeeks.map\|ActivityPillCard.*wkData" /Users/igorcarvalhorodrigues/Projects/grandma-app/components/calendar/PregnancyCalendar.tsx
```

Expected: no matches (the map is gone).

- [ ] **Step 4: Full TypeScript check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
npx tsc --noEmit 2>&1 | head -60
```

Expected: no new errors introduced by this feature.

- [ ] **Step 5: Final commit**

```bash
git add components/calendar/PregnancyCalendar.tsx components/pregnancy/PregnancyJourneyRing.tsx
git commit -m "feat(journey-ring): wire PregnancyJourneyRing into PregnancyCalendar Journey tab"
```

---

## Self-Review Checklist

- [x] **Spec: rotating ring with 40 dots** → Task 2 builds the static ring, Task 3 adds rotation
- [x] **Spec: selected week at bottom anchor** → `snapToWeek` + `useDerivedValue` in Tasks 3–4
- [x] **Spec: center shows only WEEK + number** → Task 2 center overlay
- [x] **Spec: drag to spin + momentum** → `PanResponder` + `withDecay` in Task 3
- [x] **Spec: tap to jump to week** → tap detection in `onPanResponderRelease` in Task 3
- [x] **Spec: date range from due date** → `getWeekDateRange` + `formatDateRange` in Task 1
- [x] **Spec: logged activities per week** → React Query over `pregnancy_logs` in Task 5
- [x] **Spec: milestone note** → `getWeekData(selectedWeek).developmentFact` in Task 6
- [x] **Spec: progress strip** → 40-dot row in Task 6
- [x] **Spec: trimester colors** → `triColor()` used throughout, T1=#A2FF86, T2=#B983FF, T3=#FF6B35
- [x] **Type consistency** — `DotConfig.bx/by`, `snapToWeek(w: number)`, `weekLogTypes: string[]` — consistent across all tasks
- [x] **No placeholders** — all code is complete and runnable
