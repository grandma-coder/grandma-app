# Concentric Rings Analytics Arc — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static horseshoe arc in `WellnessScoreArc` with 6 animated concentric rings (one per pillar), each drawing in from 12 o'clock with staggered timing, powered by `react-native-reanimated` v4.

**Architecture:** Swap the SVG `<Path>`-based segments for `<Circle>` elements using `strokeDasharray`/`strokeDashoffset` — one background track circle and one `AnimatedCircle` fill per pillar. Six `useSharedValue`s drive `strokeDashoffset` via `useAnimatedProps`. The overall score fades in as an absolutely-positioned `Animated.View` over the SVG centre. Legend, tooltip, and info hint are unchanged.

**Tech Stack:** `react-native-reanimated` v4 · `react-native-svg` · React Native `StyleSheet`

---

## File Map

| File | Change |
|------|--------|
| `components/analytics/KidsAnalytics.tsx` | Add reanimated imports; replace `WellnessScoreArc` body (lines 811–978) |

No new files. No changes outside `WellnessScoreArc`.

---

### Task 1: Add reanimated imports and create animated primitives

**Files:**
- Modify: `components/analytics/KidsAnalytics.tsx` (import block, lines 16–40)

- [ ] **Step 1: Add reanimated imports**

Open `components/analytics/KidsAnalytics.tsx`. After the existing `import { useState, useEffect, useCallback } from 'react'` line, add:

```ts
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated'
```

- [ ] **Step 2: Create AnimatedCircle just below the SVG imports block**

After the `react-native-svg` import block (currently ending around line 40), add:

```ts
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
```

This must be at module scope (outside any component), right after the import block.

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
npx tsc --noEmit 2>&1 | grep KidsAnalytics
```

Expected: no output (no errors in this file).

- [ ] **Step 4: Commit**

```bash
git add components/analytics/KidsAnalytics.tsx
git commit -m "feat(analytics): add reanimated imports and AnimatedCircle primitive"
```

---

### Task 2: Replace WellnessScoreArc with concentric rings

**Files:**
- Modify: `components/analytics/KidsAnalytics.tsx` lines 811–978 (full `WellnessScoreArc` function)

- [ ] **Step 1: Replace the entire WellnessScoreArc function**

Find the block that starts with:
```ts
function WellnessScoreArc({ scores, onInfoPress }: { scores: WellnessScores; onInfoPress: () => void }) {
```
and ends with the closing `}` at line 978. Replace the entire function with:

```tsx
function WellnessScoreArc({
  scores,
  onInfoPress,
  childId,
}: {
  scores: WellnessScores
  onInfoPress: () => void
  childId: string
}) {
  const { colors, radius } = useTheme()
  const [activePillar, setActivePillar] = useState<PillarKey | null>(null)

  const size   = SCREEN_W - 32
  const cx     = size / 2
  const cy     = size / 2

  // Ring radii: evenly spaced from outer to inner, leaving room for centre text
  const outerR = size / 2 - 20
  const innerR = 44                               // keeps centre clear for score text
  const gap    = (outerR - innerR) / 5            // 5 gaps for 6 rings
  const RADII  = PILLAR_ORDER.map((_, i) => outerR - i * gap)
  const STROKE_TRACK  = 13
  const STROKE_FILL   = 15

  // One shared value per ring (0 = empty, 1 = fully drawn)
  const ringProgress = PILLAR_ORDER.map(() => useSharedValue(0))   // eslint-disable-line react-hooks/rules-of-hooks
  const scoreOpacity = useSharedValue(0)

  // Re-animate when child changes or scores update
  useEffect(() => {
    // Reset
    ringProgress.forEach((p) => { p.value = 0 })
    scoreOpacity.value = 0

    PILLAR_ORDER.forEach((key, i) => {
      const target = scores[key].hasData ? scores[key].value / 10 : 0
      ringProgress[i].value = withDelay(
        i * 150,
        withSpring(target, { damping: 14, stiffness: 90, mass: 0.8 }),
      )
    })
    // Fade in score text after last ring starts drawing
    scoreOpacity.value = withDelay(
      PILLAR_ORDER.length * 150 + 200,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }),
    )
  }, [childId, scores.overall])  // re-trigger on child switch or data refresh

  // Animated props factory — one per ring
  const ringAnimatedProps = PILLAR_ORDER.map((_, i) => {
    const circ = 2 * Math.PI * RADII[i]
    return useAnimatedProps(() => ({                                 // eslint-disable-line react-hooks/rules-of-hooks
      strokeDashoffset: circ * (1 - ringProgress[i].value),
    }))
  })

  const scoreAnimStyle = useAnimatedStyle(() => ({
    opacity: scoreOpacity.value,
    transform: [{ scale: 0.85 + 0.15 * scoreOpacity.value }],
  }))

  const hasAnyData = PILLAR_ORDER.some((k) => scores[k].hasData)
  const overall    = hasAnyData ? scores.overall : 0
  const overallC   = hasAnyData ? scoreColor(overall) : colors.textMuted

  function getPillarExplanation(key: PillarKey): string {
    const score = scores[key]
    const pct   = score.hasData ? Math.round((score.value / 10) * 100) : 0
    const explanations: Record<PillarKey, string> = {
      nutrition: `${pct}% — tracks meal frequency, eating quality, and food variety this week`,
      sleep:     `${pct}% — measures avg sleep hours vs age target, quality, and consistency`,
      mood:      `${pct}% — based on daily mood logs (happy, calm, energetic, fussy, cranky)`,
      health:    `${pct}% — reflects vaccine completion and health event frequency`,
      growth:    `${pct}% — tracks weight & height measurement regularity`,
      activity:  `${pct}% — based on active days this week and variety of activities logged`,
    }
    return score.hasData
      ? explanations[key]
      : 'No data logged yet — start logging to see progress'
  }

  return (
    <View style={styles.arcContainer}>
      {/* ── Rings SVG ── */}
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {PILLAR_ORDER.map((key, i) => {
            const r     = RADII[i]
            const circ  = 2 * Math.PI * r
            const color = PILLAR_CONFIG[key].color
            const isActive = activePillar === key

            return (
              <React.Fragment key={key}>
                {/* Background track */}
                <Circle
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={color + '1A'}
                  strokeWidth={STROKE_TRACK}
                />
                {/* Animated fill */}
                <AnimatedCircle
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={color}
                  strokeWidth={isActive ? STROKE_FILL + 4 : STROKE_FILL}
                  strokeDasharray={circ}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${cx} ${cy})`}
                  opacity={activePillar !== null && !isActive ? 0.35 : 1}
                  animatedProps={ringAnimatedProps[i]}
                />
              </React.Fragment>
            )
          })}
        </Svg>

        {/* ── Score overlay (absolutely centred over SVG) ── */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { alignItems: 'center', justifyContent: 'center' },
            scoreAnimStyle,
          ]}
          pointerEvents="none"
        >
          <Text style={{ fontSize: 46, fontWeight: '900', color: overallC, lineHeight: 50 }}>
            {hasAnyData ? overall.toFixed(1) : '—'}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 2 }}>
            thriving score
          </Text>
        </Animated.View>

        {/* ── Ring tap overlays (full-circle Pressables; outermost wins on overlap) ── */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {[...PILLAR_ORDER].reverse().map((key, revI) => {
            const i = PILLAR_ORDER.length - 1 - revI
            const r = RADII[i]
            // Square bounding box centred on cx,cy with side = 2r
            return (
              <Pressable
                key={key}
                onPress={() => setActivePillar(activePillar === key ? null : key)}
                hitSlop={0}
                style={{
                  position: 'absolute',
                  left: cx - r,
                  top:  cy - r,
                  width:  r * 2,
                  height: r * 2,
                  borderRadius: r,
                  // inner ring clears the centre — make touch transparent inside innermost
                }}
              />
            )
          })}
        </View>
      </View>

      {/* ── Legend ── */}
      <View style={styles.arcLegend}>
        {PILLAR_ORDER.map((key) => {
          const score    = scores[key]
          const isActive = activePillar === key
          return (
            <Pressable
              key={key}
              onPress={() => setActivePillar(activePillar === key ? null : key)}
              style={[
                styles.legendItem,
                isActive && {
                  backgroundColor: PILLAR_CONFIG[key].color + '18',
                  borderRadius: radius.full,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                },
              ]}
            >
              <View style={[styles.legendDot, { backgroundColor: PILLAR_CONFIG[key].color }]} />
              <Text
                style={[
                  styles.legendLabel,
                  { color: isActive ? PILLAR_CONFIG[key].color : colors.textMuted,
                    fontWeight: isActive ? '800' : '600' },
                ]}
              >
                {PILLAR_CONFIG[key].label}
                {score.hasData ? ` ${score.value.toFixed(0)}` : ''}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* ── Pillar tooltip ── */}
      {activePillar && (
        <Pressable
          onPress={() => setActivePillar(null)}
          style={[
            styles.arcTooltip,
            {
              backgroundColor: PILLAR_CONFIG[activePillar].color + '15',
              borderColor:     PILLAR_CONFIG[activePillar].color + '40',
              borderRadius: radius.xl,
            },
          ]}
        >
          <View style={styles.arcTooltipHeader}>
            <View style={[styles.arcTooltipIcon, { backgroundColor: PILLAR_CONFIG[activePillar].color + '25' }]}>
              {(() => {
                const Icon = PILLAR_CONFIG[activePillar].icon
                return <Icon size={16} color={PILLAR_CONFIG[activePillar].color} strokeWidth={2} />
              })()}
            </View>
            <Text style={[styles.arcTooltipTitle, { color: PILLAR_CONFIG[activePillar].color }]}>
              {PILLAR_CONFIG[activePillar].label}
              {' — '}
              {scores[activePillar].hasData
                ? `${scores[activePillar].value.toFixed(1)}/10`
                : 'No data'}
            </Text>
          </View>
          <Text style={[styles.arcTooltipBody, { color: colors.textSecondary }]}>
            {getPillarExplanation(activePillar)}
          </Text>
        </Pressable>
      )}

      {/* ── Info hint ── */}
      <Pressable onPress={onInfoPress} style={styles.arcInfoHint} hitSlop={12}>
        <Info size={12} color={colors.textMuted} strokeWidth={2} />
        <Text style={[styles.arcInfoText, { color: colors.textMuted }]}>
          Tap ℹ for score guide
        </Text>
      </Pressable>
    </View>
  )
}
```

- [ ] **Step 2: Add React import if not already present**

At the top of the file, check for `import React from 'react'` or `import React, { ... } from 'react'`. The new component uses `<React.Fragment>`. If React isn't imported as a default, add it:

```ts
import React, { useState, useEffect, useCallback } from 'react'
```

(Replace the existing `import { useState, useEffect, useCallback } from 'react'` line.)

- [ ] **Step 3: Update the call site — add childId prop**

Search for where `WellnessScoreArc` is used (it will be in the `KidsAnalytics` main render, roughly line 430–450). Add the `childId` prop:

```tsx
// Before:
<WellnessScoreArc scores={scores} onInfoPress={() => setShowScoreInfo(true)} />

// After:
<WellnessScoreArc
  scores={scores}
  onInfoPress={() => setShowScoreInfo(true)}
  childId={selectedChild?.id ?? ''}
/>
```

- [ ] **Step 4: Check TypeScript**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
npx tsc --noEmit 2>&1 | grep -E "error|KidsAnalytics"
```

Expected: no errors. If you see `Property 'childId' does not exist` — the call site wasn't updated. If you see `useSharedValue called conditionally` — the `ringProgress` array must be defined with a fixed-length constant, not inside a `.map()`. Fix by defining them as:

```ts
const p0 = useSharedValue(0); const p1 = useSharedValue(0)
const p2 = useSharedValue(0); const p3 = useSharedValue(0)
const p4 = useSharedValue(0); const p5 = useSharedValue(0)
const ringProgress = [p0, p1, p2, p3, p4, p5]

const ap0 = useAnimatedProps(() => { const c = 2*Math.PI*RADII[0]; return { strokeDashoffset: c*(1-p0.value) } })
const ap1 = useAnimatedProps(() => { const c = 2*Math.PI*RADII[1]; return { strokeDashoffset: c*(1-p1.value) } })
const ap2 = useAnimatedProps(() => { const c = 2*Math.PI*RADII[2]; return { strokeDashoffset: c*(1-p2.value) } })
const ap3 = useAnimatedProps(() => { const c = 2*Math.PI*RADII[3]; return { strokeDashoffset: c*(1-p3.value) } })
const ap4 = useAnimatedProps(() => { const c = 2*Math.PI*RADII[4]; return { strokeDashoffset: c*(1-p4.value) } })
const ap5 = useAnimatedProps(() => { const c = 2*Math.PI*RADII[5]; return { strokeDashoffset: c*(1-p5.value) } })
const ringAnimatedProps = [ap0, ap1, ap2, ap3, ap4, ap5]
```

And update the `useEffect` reset accordingly:
```ts
;[p0,p1,p2,p3,p4,p5].forEach((p) => { p.value = 0 })
```

- [ ] **Step 5: Commit**

```bash
git add components/analytics/KidsAnalytics.tsx
git commit -m "feat(analytics): replace horseshoe arc with animated concentric rings"
```

---

### Task 3: Fix arcContainer style for square SVG

**Files:**
- Modify: `components/analytics/KidsAnalytics.tsx` (StyleSheet near line 2579)

The old SVG used `height: size * 0.75`. The new one is square (`size × size`). The `arcContainer` style may need no change, but verify the surrounding layout doesn't clip the SVG.

- [ ] **Step 1: Check arcContainer style and update if needed**

Find:
```ts
arcContainer: { alignItems: 'center', marginTop: 8 },
```

This is fine as-is — it's just a flex wrapper. No change needed unless the square SVG overflows. If you see clipping during testing, add `overflow: 'visible'`:

```ts
arcContainer: { alignItems: 'center', marginTop: 8, overflow: 'visible' },
```

- [ ] **Step 2: Remove now-unused styles**

The old arc used `Defs`, `LinearGradient`, `Stop`, `G`, and `Path` from react-native-svg. Check the new component — if `Path`, `G`, `LinearGradient`, `Stop` are no longer used anywhere else in the file, remove them from the SVG import:

```ts
// Before (line ~30):
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  Defs,
  LinearGradient,
  Stop,
  G,
  Text as SvgText,
} from 'react-native-svg'

// After — keep only what's used (check the rest of the file first with grep):
import Svg, {
  Circle,
  Rect,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg'
```

Run the grep first to be safe:
```bash
grep -n "<Path\|<G \|<G>" components/analytics/KidsAnalytics.tsx | grep -v "//\|SlimProgress"
```

Only remove imports that have zero remaining usages.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "error|KidsAnalytics"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/analytics/KidsAnalytics.tsx
git commit -m "chore(analytics): clean up unused SVG imports after rings refactor"
```

---

### Task 4: Verify on simulator

**No code changes — visual verification only.**

- [ ] **Step 1: Start the app**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
npx expo start --ios
```

- [ ] **Step 2: Navigate to Analytics tab and verify**

Check:
1. 6 concentric rings draw in from 12 o'clock, staggered — outermost first
2. Each ring glows in its pillar color (Nutrition green, Sleep purple, Mood pink, Health blue, Growth amber, Activity orange)
3. Score fades in to the centre after rings start
4. Tapping a legend item dims other rings and shows the tooltip
5. Tapping a ring area (anywhere on the circle) selects that pillar
6. Switching child (if >1 child) resets and re-animates rings

- [ ] **Step 3: Check no layout overflow**

The SVG is now square. Verify the Analytics screen still scrolls correctly and the card below the arc ("Grandma insight") isn't pushed off-screen.

- [ ] **Step 4: Commit if any minor fixes were needed, then final commit**

```bash
git add components/analytics/KidsAnalytics.tsx
git commit -m "fix(analytics): minor visual tweaks to concentric rings layout"
```

If nothing needed fixing, skip this commit.
