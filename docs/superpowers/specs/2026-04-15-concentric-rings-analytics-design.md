# Concentric Rings — Animated Analytics Arc

**Date:** 2026-04-15
**Scope:** Replace `WellnessScoreArc` component in `components/analytics/KidsAnalytics.tsx`
**Status:** Approved

---

## Goal

Replace the existing 5-segment horseshoe arc with 6 animated concentric rings — one per pillar — powered by `react-native-reanimated` v4. Each ring draws in from 12 o'clock with staggered timing. The overall score counts up in the center as rings animate in. Interaction (tap ring → tooltip) and all surrounding UI remain unchanged.

---

## Ring Configuration

6 rings, outermost → innermost:

| # | Pillar | Color | Track opacity |
|---|--------|-------|---------------|
| 1 | Nutrition | `#A2FF86` | 10% |
| 2 | Sleep | `#B983FF` | 10% |
| 3 | Mood | `#FF8AD8` | 10% |
| 4 | Health | `#4D96FF` | 10% |
| 5 | Growth | `#FBBF24` | 10% |
| 6 | Activity | `#FF6B35` | 10% |

**Sizing** — computed from `SCREEN_W`:
- Outer radius (`r1`): `(SCREEN_W - 32) / 2 - 16`
- Each subsequent ring: `r(n) = r(n-1) - 17`
- Stroke width: `12` (track), `14` (filled arc, widens to `18` when active)
- SVG height: `SCREEN_W - 32` (full square — rings are full circles, not horseshoes)

---

## Animation

**Library:** `react-native-reanimated` v4

**Per-ring shared values:**
```ts
const ringProgress = PILLAR_ORDER.map(() => useSharedValue(0))
// 0 = fully hidden (dashoffset = circumference), 1 = fully drawn
```

**Trigger:** `useEffect` watching the active child's ID. On change, reset all to 0 then run staggered sequence.

**Sequence per ring `i`:**
```ts
ringProgress[i].value = withDelay(
  i * 150,
  withSpring(score.hasData ? score.value / 10 : 0, {
    damping: 14,
    stiffness: 90,
    mass: 0.8,
  })
)
```

**Score counter:**
```ts
const displayScore = useSharedValue(0)
// fires after last ring starts: delay = 5 * 150 = 750ms
displayScore.value = withDelay(300,
  withTiming(overall, { duration: 800, easing: Easing.out(Easing.cubic) })
)
```
Formatted via `useDerivedValue` → `useAnimatedProps` on an `AnimatedSvgText`.

**Glow:** `drop-shadow` filter on each filled `<Circle>` matching pillar color — static, not animated.

---

## SVG Structure

```
<Svg width={size} height={size}>
  <Defs>
    <!-- drop-shadow filter per pillar color -->
  </Defs>

  <!-- For each pillar (6 rings): -->
  <Circle  cx cy r  stroke={color+'1A'}  strokeWidth={12}  />  <!-- track -->
  <AnimatedCircle cx cy r
    stroke={color}
    strokeWidth={activeRing === key ? 18 : 14}
    strokeDasharray={circumference}
    animatedProps={ringAnimatedProps[i]}   <!-- controls strokeDashoffset -->
    strokeLinecap="round"
    transform="rotate(-90 cx cy)"
    filter={`url(#glow-${key})`}
  />

  <!-- Center: score + label -->
  <AnimatedSvgText animatedProps={scoreTextProps} />
  <SvgText>thriving score</SvgText>
</Svg>
```

**`animatedProps` for each ring:**
```ts
useAnimatedProps(() => ({
  strokeDashoffset: circumference * (1 - ringProgress[i].value),
}))
```

---

## Interaction

- **Tap ring area:** `Pressable` overlays (same `StyleSheet.absoluteFill` approach as today) mapped to each ring radius band
  - Hit area: annular band between `r(n) - 12` and `r(n) + 12`
  - On press: `setActivePillar(key)` — same state as current
- **Active ring:** `strokeWidth` widens from 14 → 18; other rings dim to 60% opacity
- **Tooltip:** unchanged — existing `arcTooltip` renders below SVG
- **Legend:** unchanged — existing `arcLegend` with dot + label + score

---

## Files Changed

| File | Change |
|------|--------|
| `components/analytics/KidsAnalytics.tsx` | Replace `WellnessScoreArc` function entirely |

No new files. No changes to props interface, store, or edge functions.

---

## Imports to Add

```ts
import Animated, {
  useSharedValue, useAnimatedProps, useDerivedValue,
  withDelay, withSpring, withTiming, Easing,
} from 'react-native-reanimated'
import { AnimatedCircle, AnimatedText as AnimatedSvgText } from ... // see note
```

**Note on AnimatedSvgText:** `react-native-svg` exposes `createAnimatedComponent`. Use:
```ts
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText)
```

---

## Out of Scope

- No changes to `CycleAnalytics` or `PregnancyAnalytics` arc components
- No changes to pillar detail modals
- No changes to the score calculation logic in `computeWellnessScores()`
- No loop animation — rings animate once on mount and on child switch
