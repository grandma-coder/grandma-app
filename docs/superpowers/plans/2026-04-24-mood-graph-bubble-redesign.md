# Mood Graph + Bubble Cluster Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SVG line chart in `MoodDetailModal` and the chip layout in `MoodDistribution` with a sticker-strip chart and soap-bubble cluster using the `MoodFace` SVG sticker component.

**Architecture:** Two new components (`MoodStickerStrip` and `MoodBubbleCluster`) are added to `components/charts/SvgCharts.tsx`, then wired into `MoodDetailModal` in `KidsHome.tsx` and `MoodDistribution` in `KidsAnalytics.tsx`. No data layer changes — existing props flow through unchanged.

**Tech Stack:** React Native, react-native-svg, `MoodFace` from `components/stickers/RewardStickers.tsx`, `MOOD_FACE_COLORS` + `moodFaceVariant` + `moodFaceFill` from `lib/moodFace.ts`, `useTheme` from `constants/theme.ts`.

---

## File Map

| File | What changes |
|---|---|
| `components/charts/SvgCharts.tsx` | Add `MoodStickerStrip` and `MoodBubbleCluster` exports |
| `components/home/KidsHome.tsx` | Replace SVG chart block in `MoodDetailModal` with `MoodStickerStrip` + `MoodBubbleCluster` |
| `components/analytics/KidsAnalytics.tsx` | Replace `MoodDistribution` chip layout with `MoodBubbleCluster` |

---

## Task 1: Add `MoodStickerStrip` to SvgCharts.tsx

The strip shows 7 (or N) day columns in a row. Logged days get a soap-bubble `MoodFace`; empty days get a dashed circle. An SVG dashed line connects logged days behind the bubbles.

**Files:**
- Modify: `components/charts/SvgCharts.tsx`

### Context you need

`MOOD_FACE_COLORS` (from `lib/moodFace.ts`) maps mood → pastel fill:
```ts
happy: '#FBEA9E', calm: '#BFE0C0', energetic: '#C5DBF3', fussy: '#FFD8B0', cranky: '#F7B8B8'
```

`moodFaceVariant(mood)` returns the `MoodVariant` string for the `MoodFace` component.  
`moodFaceFill(mood)` returns the fill hex string.  
`MoodFace` from `components/stickers/RewardStickers.tsx` renders an SVG circle face:
```tsx
<MoodFace size={32} variant="happy" fill="#FBEA9E" stroke="#141313" />
```

The existing `SvgCharts.tsx` already imports from react-native-svg (`Svg`, `Path`, `Line`, `Circle`). Add the new component after the existing `BubbleGrid` export.

- [ ] **Step 1: Add imports to SvgCharts.tsx**

Open `components/charts/SvgCharts.tsx`. At the top where other imports live, add:

```tsx
import { MoodFace } from '../stickers/RewardStickers'
import { MOOD_FACE_COLORS, moodFaceVariant, moodFaceFill } from '../../lib/moodFace'
```

- [ ] **Step 2: Add MoodStickerStrip component**

After the closing brace of the `BubbleGrid` export (around line 452), add:

```tsx
// ─── Mood Sticker Strip ────────────────────────────────────────────────────

export interface MoodStripDay {
  label: string       // e.g. 'Mon', 'W1'
  dominantMood: string | null
  intensityRatio: number  // 0–1: dominant count / total that day
}

export function MoodStickerStrip({ days }: { days: MoodStripDay[] }) {
  const { colors, isDark, radius } = useTheme()
  const BASE = 32
  const RANGE = 10
  const ST_GREEN = isDark ? '#C5DA98' : '#BDD48C'

  // Collect x-centre positions of logged days for the connecting line
  const colWidth = 100 / days.length  // percent per column — used by SVG viewBox maths
  const loggedIndices = days.map((d, i) => d.dominantMood ? i : null).filter((i) => i !== null) as number[]

  // Build SVG dashed-line path between logged columns
  // We use a fixed viewBox of (days.length * 40) x 60; each column centre = i*40+20
  const vbW = days.length * 40
  const lineY = 22  // vertical centre of bubbles in the 60-unit viewBox
  const linePath = loggedIndices.length >= 2
    ? 'M ' + loggedIndices.map((i) => `${i * 40 + 20} ${lineY}`).join(' L ')
    : null

  return (
    <View style={{ position: 'relative' }}>
      {/* Dashed connecting line behind bubbles */}
      {linePath && (
        <Svg
          width="100%"
          height={60}
          viewBox={`0 0 ${vbW} 60`}
          preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          pointerEvents="none"
        >
          <Path
            d={linePath}
            stroke={ST_GREEN}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      )}

      {/* Day columns */}
      <View style={{ flexDirection: 'row' }}>
        {days.map((day, i) => {
          const size = BASE + Math.round(day.intensityRatio * RANGE)
          const fill = day.dominantMood ? moodFaceFill(day.dominantMood) : undefined
          const variant = day.dominantMood ? moodFaceVariant(day.dominantMood) : undefined
          const stroke = isDark ? (fill ?? colors.border) : '#141313'

          return (
            <View
              key={i}
              style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10 }}
            >
              {day.dominantMood ? (
                // Soap bubble wrapper
                <View
                  style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: (fill ?? '#FBEA9E') + '40',
                    borderWidth: 1.5,
                    borderColor: (fill ?? '#FBEA9E') + '70',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    shadowColor: fill ?? '#FBEA9E',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  {/* Shine crescent */}
                  <View
                    style={{
                      position: 'absolute',
                      top: '14%',
                      left: '18%',
                      width: '30%',
                      height: '20%',
                      borderRadius: 999,
                      backgroundColor: 'rgba(255,255,255,0.5)',
                      transform: [{ rotate: '-22deg' }],
                    }}
                  />
                  <MoodFace
                    size={Math.round(size * 0.72)}
                    variant={variant!}
                    fill={fill!}
                    stroke={stroke}
                  />
                </View>
              ) : (
                // Empty day — dashed circle
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: colors.border,
                  }}
                />
              )}
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  color: day.dominantMood ? colors.textMuted : colors.textMuted + '66',
                  letterSpacing: 0.5,
                }}
              >
                {day.label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
npx tsc --noEmit 2>&1 | grep SvgCharts
```

Expected: no output (no errors in that file).

- [ ] **Step 4: Commit**

```bash
git add components/charts/SvgCharts.tsx
git commit -m "feat(charts): add MoodStickerStrip component"
```

---

## Task 2: Add `MoodBubbleCluster` to SvgCharts.tsx

A fixed-position cluster of soap bubbles — one per mood type — sized by count. The 5 possible positions are hardcoded by index (sorted largest-first).

**Files:**
- Modify: `components/charts/SvgCharts.tsx`

- [ ] **Step 1: Add MoodBubbleCluster component**

Immediately after the closing brace of `MoodStickerStrip`, add:

```tsx
// ─── Mood Bubble Cluster ───────────────────────────────────────────────────

export interface MoodBubbleItem {
  mood: string
  count: number
}

// Five fixed scatter positions (largest bubble gets index 0).
// Values are style objects applied to position: 'absolute' views.
// containerH = 200 (fixed); containerW assumed ~(screenWidth - 80) but we use % for left/right.
const BUBBLE_POSITIONS: Array<Record<string, unknown>> = [
  { alignSelf: 'center', top: 0 },           // 0: centre-top
  { left: 8, top: '40%' },                   // 1: left-mid
  { right: 8, top: '35%' },                  // 2: right-mid
  { left: '38%', bottom: 8 },                // 3: bottom-centre-left
  { left: 4, bottom: 4 },                    // 4: bottom-left
]

export function MoodBubbleCluster({ items }: { items: MoodBubbleItem[] }) {
  const { colors, isDark } = useTheme()

  const MIN_SIZE = 56
  const MAX_SIZE = 112

  const sorted = [...items]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)  // max 5 bubbles

  const maxCount = sorted[0]?.count ?? 1

  return (
    <View style={{ height: 200, position: 'relative' }}>
      {sorted.map((item, idx) => {
        const size = Math.round(MIN_SIZE + (item.count / maxCount) * (MAX_SIZE - MIN_SIZE))
        const fill = moodFaceFill(item.mood)
        const variant = moodFaceVariant(item.mood)
        const stroke = isDark ? fill : '#141313'
        const pos = BUBBLE_POSITIONS[idx] ?? BUBBLE_POSITIONS[4]
        const label = item.mood.charAt(0).toUpperCase() + item.mood.slice(1)
        const labelColor = isDark ? fill : fill  // same — the pastel fill is readable in both

        return (
          <View
            key={item.mood}
            style={[
              {
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: fill + '40',
                borderWidth: 1.5,
                borderColor: fill + '70',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                shadowColor: fill,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              },
              pos as any,
            ]}
          >
            {/* Shine crescent */}
            <View
              style={{
                position: 'absolute',
                top: '14%',
                left: '18%',
                width: '30%',
                height: '20%',
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.5)',
                transform: [{ rotate: '-22deg' }],
              }}
            />
            <MoodFace
              size={Math.round(size * 0.5)}
              variant={variant}
              fill={fill}
              stroke={stroke}
            />
            <Text
              style={{
                fontSize: 9,
                fontWeight: '700',
                color: labelColor,
                position: 'relative',
                zIndex: 1,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {label}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: labelColor,
                position: 'relative',
                zIndex: 1,
                lineHeight: 14,
              }}
            >
              {item.count}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep SvgCharts
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/charts/SvgCharts.tsx
git commit -m "feat(charts): add MoodBubbleCluster component"
```

---

## Task 3: Wire both components into MoodDetailModal (KidsHome.tsx)

Replace the existing SVG line-chart block inside `MoodDetailModal` (function at line ~2867 of `KidsHome.tsx`) with `MoodStickerStrip`, and add `MoodBubbleCluster` below the chips row.

**Files:**
- Modify: `components/home/KidsHome.tsx`

### Context you need

The modal already computes:
- `chartDays`: array of `{ date: string; label: string; dates: string[] }` (day or weekly buckets)
- `dominantPerDay`: per-bucket dominant mood info
- `moodByDay`: `Record<string, Record<string, number>>` — date → mood → count
- `moodCounts`: `Record<string, number>` — total per mood

`MoodStickerStrip` needs `days: MoodStripDay[]` where each element is:
```ts
{ label: string; dominantMood: string | null; intensityRatio: number }
```

`MoodBubbleCluster` needs `items: MoodBubbleItem[]`:
```ts
{ mood: string; count: number }[]
```

- [ ] **Step 1: Add imports**

Find the existing imports block at the top of `KidsHome.tsx`. Add `MoodStickerStrip`, `MoodBubbleCluster`, and their types to the SvgCharts import line. Find the line that currently reads something like:

```tsx
import { LineChart, BarChart, BubbleGrid, smoothPath } from '../charts/SvgCharts'
```

Replace it with:

```tsx
import { LineChart, BarChart, BubbleGrid, smoothPath, MoodStickerStrip, MoodBubbleCluster } from '../charts/SvgCharts'
import type { MoodStripDay, MoodBubbleItem } from '../charts/SvgCharts'
```

- [ ] **Step 2: Build the MoodStickerStrip data in MoodDetailModal**

Inside `MoodDetailModal`, the existing `dominantPerDay` already computes the dominant mood per bucket. Add a `stripDays` derived value right after the `dominantPerDay` computation (around line 2944 after the existing memoised `dominantPerDay` map):

```tsx
const stripDays: MoodStripDay[] = chartDays.map((day, i) => {
  const pt = dominantPerDay[i]
  if (!pt) return { label: day.label, dominantMood: null, intensityRatio: 0 }
  // intensityRatio: dominant mood count vs total moods for this bucket
  const dayData: Record<string, number> = {}
  for (const d of day.dates) {
    const dayMoods = moodByDay[d] || {}
    for (const [mood, count] of Object.entries(dayMoods)) {
      dayData[mood] = (dayData[mood] || 0) + count
    }
  }
  const bucketTotal = Object.values(dayData).reduce((a, b) => a + b, 0)
  const dominantCount = dayData[pt.mood] ?? 1
  return {
    label: day.label,
    dominantMood: pt.mood,
    intensityRatio: bucketTotal > 0 ? dominantCount / bucketTotal : 1,
  }
})
```

- [ ] **Step 3: Replace the SVG chart block with MoodStickerStrip**

In the `return` of `MoodDetailModal`, find the block that starts with:

```tsx
{/* Mood-face chart */}
<View style={[s.moodChartWrap, { backgroundColor: colors.surfaceRaised, borderRadius: radius.md }]}>
  <Svg width={chartW} height={chartH}>
```

and ends after the closing `</View>` that wraps both the `<Svg>` and the floating `MoodFace` overlay views (the block ends just before `{/* Mood count chips */}`).

Replace that entire block with:

```tsx
{/* Mood sticker strip */}
<View style={[s.moodChartWrap, { backgroundColor: colors.surfaceRaised, borderRadius: radius.md, paddingHorizontal: 4, paddingVertical: 10 }]}>
  <MoodStickerStrip days={stripDays} />
</View>
```

- [ ] **Step 4: Add MoodBubbleCluster below the chips row**

Find `{/* Summary */}` comment (around line 2987). Insert the bubble cluster between the chips row and the summary:

```tsx
{/* Mood bubble cluster */}
<MoodBubbleCluster
  items={(Object.entries(moodCounts) as [string, number][])
    .filter(([, c]) => c > 0)
    .map(([mood, count]) => ({ mood, count }))}
/>
```

Place this after the closing `</View>` of the chips row (`s.moodChipsRow`) and before the `{/* Summary */}` block.

- [ ] **Step 5: Remove now-unused chart variables**

The following variables inside `MoodDetailModal` are no longer used — remove them to avoid lint errors:

```ts
const chartW = SW - 96      // remove
const chartH = 180           // remove
const padL = 16, padR = 16, padT = 28, padB = 28   // remove
const innerW = chartW - padL - padR   // remove
const innerH = chartH - padT - padB   // remove
```

Also remove the `smoothPath` helper function defined inside the modal (the one starting `function smoothPath(pts: ...)`), and remove `MOOD_SCORE` and `MOOD_EMOJI` from constants if they're only referenced from the now-deleted chart code. Check with:

```bash
grep -n "MOOD_SCORE\|MOOD_EMOJI\|smoothPath" components/home/KidsHome.tsx
```

Only remove the ones with zero remaining references.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "KidsHome|SvgCharts"
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add components/home/KidsHome.tsx
git commit -m "feat(kids): replace mood line chart with sticker strip + bubble cluster"
```

---

## Task 4: Replace MoodDistribution in KidsAnalytics.tsx

`MoodDistribution` (line ~4034 in `KidsAnalytics.tsx`) currently renders horizontal mood chips with percentages. Replace its internals with `MoodBubbleCluster`.

**Files:**
- Modify: `components/analytics/KidsAnalytics.tsx`

### Context you need

`MoodDistribution` receives `moods: { mood: string; count: number }[]` — this maps directly to `MoodBubbleItem[]`. It is called twice:
- Line ~746: `<MoodDistribution moods={analytics.mood.dominantMoods} />`
- Line ~3197: `<MoodDistribution moods={analytics.mood.dominantMoods} />`

No call-site changes needed — only the component internals change.

- [ ] **Step 1: Add import**

Find the existing SvgCharts import in `KidsAnalytics.tsx` (line ~79):

```tsx
import { LineChart, BarChart, BubbleGrid, smoothPath } from '../charts/SvgCharts'
```

Add `MoodBubbleCluster`:

```tsx
import { LineChart, BarChart, BubbleGrid, smoothPath, MoodBubbleCluster } from '../charts/SvgCharts'
```

- [ ] **Step 2: Replace MoodDistribution body**

Find the `MoodDistribution` function (line ~4034). Replace its entire body with:

```tsx
function MoodDistribution({ moods }: { moods: { mood: string; count: number }[] }) {
  return <MoodBubbleCluster items={moods} />
}
```

The `styles.moodDistWrap`, `styles.moodChip`, `styles.moodLabel`, and `styles.moodPct` style entries in the `StyleSheet.create` at the bottom of the file can now be removed. Check first:

```bash
grep -n "moodDistWrap\|moodChip\|moodLabel\|moodPct" components/analytics/KidsAnalytics.tsx
```

Remove any entries that only appear inside the old `MoodDistribution` body.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep KidsAnalytics
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add components/analytics/KidsAnalytics.tsx
git commit -m "feat(analytics): replace MoodDistribution chips with MoodBubbleCluster"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Sticker strip — 7 day columns, soap-bubble MoodFace | Task 1 + Task 3 |
| Empty days → dashed circle | Task 1 |
| Bubble size proportional to intensity ratio | Task 1 |
| Dashed green connecting line | Task 1 |
| Light/dark fill + stroke switch | Task 1 + Task 2 |
| Shine crescent on all soap bubbles | Task 1 + Task 2 |
| Count chips unchanged structure | Not touched (already correct) |
| Summary bar unchanged | Not touched (already correct) |
| Bubble cluster — mood counts, soap bubble, MoodFace inside | Task 2 |
| Bubble size = minSize + (count/maxCount) * range | Task 2 |
| Fixed 5-position scatter layout, sorted by count | Task 2 |
| BubbleCluster wired into MoodDetailModal | Task 3 |
| MoodDistribution replaced in KidsAnalytics | Task 4 |

All requirements covered. ✓

**Placeholder scan:** No TBDs. All code blocks are complete. ✓

**Type consistency:**
- `MoodStripDay` defined in Task 1, imported as type in Task 3. ✓
- `MoodBubbleItem` defined in Task 1, used in Task 2, Task 3, Task 4. ✓
- `moodFaceVariant`, `moodFaceFill`, `MOOD_FACE_COLORS` all from `lib/moodFace.ts`. ✓
- `MoodFace` from `components/stickers/RewardStickers.tsx`, props `size/variant/fill/stroke`. ✓
