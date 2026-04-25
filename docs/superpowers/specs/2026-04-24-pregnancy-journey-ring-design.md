# Pregnancy Journey Ring — Design Spec

**Date:** 2026-04-24
**Screen:** `app/(tabs)/agenda.tsx` → `PregnancyCalendar` → Journey tab
**Replaces:** Current flat list of 40 `ActivityPillCard` week rows

---

## Overview

Replace the Journey tab's scrollable week list with an interactive rotating ring — 40 dots arranged in a circle, one per pregnancy week. The user drags/spins the ring; the selected week snaps to a bottom anchor (6 o'clock). The center shows only the week number. Everything else (date range, logged activities, milestone note) appears in a scrollable panel below the ring.

Inspired by the Clue moon-phase ring interaction pattern.

---

## Layout

```
┌─────────────────────────────┐
│  Agenda.           🔔  +    │  ← existing header
│  [Timeline] [Journey] [Appts]│  ← existing tab bar
│                             │
│      ○ ○ ● ○ ○              │
│    ○           ○            │
│  ○   WEEK        ○          │  ← rotating ring (canvas)
│  ○    19          ○         │
│    ○           ○            │
│      ○ ○ ▲ ○ ○              │  ← anchor indicator
│    ↺ drag to spin · tap     │  ← hint
│─────────────────────────────│
│  Apr 28 – May 4, 2025  [Now]│  ← date range + status pill
│                             │
│  LOGGED THIS WEEK           │
│  ● Weight  ● Kick  ● Mood   │  ← log chips
│                             │
│  ────────────────           │
│                             │
│  THIS WEEK                  │
│  Baby can hear sounds from  │  ← milestone note
│  outside the womb…          │
│                             │
│  ●●●●●●●●●●●●●●●○○○○○       │  ← 40-dot progress strip
└─────────────────────────────┘
```

---

## Component: `PregnancyJourneyRing`

New component at `components/pregnancy/PregnancyJourneyRing.tsx`.

Replaces the `renderJourneyView()` function body inside `PregnancyCalendar.tsx`.

### Ring (Canvas / Reanimated)

**Geometry**
- 40 dots placed on a circle, evenly spaced at `(i / 40) * 2π`
- Ring radius: ~130px (scales with screen width)
- Canvas size: full component width × ~300px
- Anchor position: 6 o'clock (bottom center)

**Dot appearance**
- Color by trimester: T1 (weeks 1–13) `#A2FF86`, T2 (14–26) `#B983FF`, T3 (27–40) `#FF6B35`
- Size grows slightly with week number (baby growing): T1 base 5px, T2 6px, T3 7px
- Selected week: +5px radius, white border ring, glow shadow
- Current week: +3px radius, continuous pulse animation
- Past weeks: filled, opacity fades from 35% → 95% across T1
- Future weeks: outline-only, 13% opacity

**Center content (inside ring)**
- "WEEK" micro-label
- Big week number (58px serif)
- Status micro-label: "YOU ARE HERE" / "COMPLETED" / "UPCOMING"

**Anchor indicator**
- Small triangle chevron pointing up at 6 o'clock position, trimester color

### Interaction

**Drag to spin**
- Track pointer/touch angle relative to ring center
- Apply angular delta to `rotation` state on each move event
- Momentum: on release, carry `velocity` with friction factor `0.93` per frame
- Snap: on each frame, find which week orb is closest to anchor angle → that becomes `selectedWeek`

**Tap to jump**
- On pointer-up with low velocity, find nearest orb within 22px hit radius
- Animate `rotation` to snap that week to anchor (cubic ease-out, 380ms)

**React Native implementation**
- Use `react-native-reanimated` v3 + `react-native-gesture-handler` `PanGestureHandler` (both bundled with Expo SDK 54)
- `rotation` as a `useSharedValue`; `selectedWeek` derived via `runOnJS` callback on each frame
- Draw dots using `react-native-svg` `<Circle>` and `<G transform>` elements — rotation applied as SVG transform on the group, avoiding per-frame JS bridge calls
- The center text (week number, labels) rendered as React Native `<Text>` overlaid via `position: absolute` on top of the SVG, updated via `selectedWeek` state

### Bottom Panel

Scrollable `ScrollView` below the ring. Updates whenever `selectedWeek` changes.

**Date range row**
- Computed from `usePregnancyStore` due date: `weekStart = dueDate - (40 - week) * 7 days`
- Format: `"Apr 14 – Apr 20, 2025"` in trimester color
- Status pill: "You are here" / "Completed" / "Upcoming" with trimester color border/bg

**Logged this week section**
- Label: `LOGGED THIS WEEK`
- Query `child_logs` filtered by `child_id` + date range for this week
- Each distinct log type rendered as a chip with colored dot: Weight, Kick, Mood, Symptom, Appt
- Empty states: "Nothing logged yet this week." / "No logs recorded." / "Future week."

**Divider**

**This week section**
- Label: `THIS WEEK`
- Static milestone text from `pregnancyData.ts` (`developmentFact` field, possibly trimmed to 2 sentences)

**Progress strip**
- 40 mini dots, same trimester colors
- Past: 55% opacity, current: full + glow, selected (if future): 66% opacity, future: 10% opacity

---

## Data Sources

| Data | Source |
|------|--------|
| Current week number | `usePregnancyStore().weekNumber` |
| Due date | `usePregnancyStore().dueDate` |
| Week milestone text | `lib/pregnancyData.ts` → `getWeekData(w).developmentFact` |
| Logged activities | Supabase query: `child_logs` where `child_id` + `created_at` within week date range |
| Active child | `useChildStore().activeChild` |

---

## Animations

| Animation | Trigger | Details |
|-----------|---------|---------|
| Ring spin | Drag | Real-time rotation, momentum on release |
| Snap to week | Release / tap | Cubic ease-out, 380ms |
| Current week pulse | Continuous | Scale ripple, opacity 0→0.6, 2.4s loop |
| Bottom panel update | Week change | Instant (no animation needed) |

---

## Files Changed

| File | Change |
|------|--------|
| `components/pregnancy/PregnancyJourneyRing.tsx` | **New** — full component |
| `components/calendar/PregnancyCalendar.tsx` | Replace `renderJourneyView()` body with `<PregnancyJourneyRing />` |
| `lib/pregnancyData.ts` | No change — data already exists |

---

## Out of Scope

- Pre-pregnancy and Kids modes — not affected
- Timeline and Appts tabs — not affected
- The ring does not navigate to a week detail modal on tap (kept simple; can add later)
- No haptic feedback in this iteration (can add later)
