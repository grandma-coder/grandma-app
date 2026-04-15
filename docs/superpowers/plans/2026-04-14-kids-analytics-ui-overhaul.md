# Kids Analytics UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the KidsAnalytics pillar detail modals for Nutrition, Sleep, Mood, Health, and Activity with clearer charts and fixed data bugs.

**Architecture:** All changes are self-contained within `components/analytics/KidsAnalytics.tsx` (UI) and `lib/analyticsData.ts` (data bug fix). New chart helpers are added inline since they are too specific to belong in the shared `SvgCharts.tsx`. One new helper export (`smoothPath`) is added to `SvgCharts.tsx` so the Meals line chart can reuse the bezier logic.

**Tech Stack:** React Native, react-native-svg, NativeWind/StyleSheet, existing theme tokens from `constants/theme.ts`.

---

## Files

| File | Action | What changes |
|------|--------|-------------|
| `lib/analyticsData.ts` | Modify | Fix duplicate mood key bug — normalize mood string before use as object key |
| `components/charts/SvgCharts.tsx` | Modify | Export `smoothPath` helper so KidsAnalytics can use it |
| `components/analytics/KidsAnalytics.tsx` | Modify | Replace/remove charts and components per section below |

---

## Task 1 — Fix duplicate mood keys in analyticsData.ts

**Files:**
- Modify: `lib/analyticsData.ts:237`

The bug: mood values stored in Supabase sometimes have surrounding quote characters (e.g. `'"Happy"'`). After `.toLowerCase()` this becomes `'"happy"'`, which is a different key from `'happy'`. Both appear in `dominantMoods` and display as separate "Happy" rows in `MoodDistribution`.

- [ ] **Step 1.1 — Open the file and find the line**

Open `lib/analyticsData.ts`. Locate `buildMoodData` (around line 225). Find this block (~line 236):

```ts
const mood = (typeof log.value === 'string' ? log.value : parseValue(log.value)) as string
if (!mood || typeof mood !== 'string') continue

const moodKey = mood.toLowerCase()
```

- [ ] **Step 1.2 — Replace `moodKey` assignment**

Change the single `moodKey` line to:

```ts
const moodKey = mood.toLowerCase().trim().replace(/['"]/g, '')
```

The full updated block becomes:

```ts
const mood = (typeof log.value === 'string' ? log.value : parseValue(log.value)) as string
if (!mood || typeof mood !== 'string') continue

const moodKey = mood.toLowerCase().trim().replace(/['"]/g, '')
```

- [ ] **Step 1.3 — Verify TypeScript compiles**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors on `analyticsData.ts`.

- [ ] **Step 1.4 — Commit**

```bash
git add lib/analyticsData.ts
git commit -m "fix: normalize mood keys to strip surrounding quote chars"
```

---

## Task 2 — Export `smoothPath` from SvgCharts.tsx

**Files:**
- Modify: `components/charts/SvgCharts.tsx:36`

The `smoothPath` bezier helper is currently private. The Meals line chart in KidsAnalytics needs it.

- [ ] **Step 2.1 — Export the function**

In `components/charts/SvgCharts.tsx`, change line 36 from:

```ts
function smoothPath(pts: { x: number; y: number }[]): string {
```

to:

```ts
export function smoothPath(pts: { x: number; y: number }[]): string {
```

- [ ] **Step 2.2 — Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 2.3 — Commit**

```bash
git add components/charts/SvgCharts.tsx
git commit -m "feat: export smoothPath helper from SvgCharts"
```

---

## Task 3 — Nutrition: Eat Quality bubble chart

**Files:**
- Modify: `components/analytics/KidsAnalytics.tsx`

Replace `StackedBarChart` in the nutrition detail with `EatQualityBubbles` — three proportional circles showing Ate well / A little / Didn't eat percentages.

- [ ] **Step 3.1 — Add `EatQualityBubbles` component**

In `KidsAnalytics.tsx`, after the `StackedBarChart` function definition (around line 1847), add this new component:

```tsx
function EatQualityBubbles({
  good, little, none,
}: {
  good: number[]
  little: number[]
  none: number[]
}) {
  const { colors } = useTheme()
  const totalGood = good.reduce((a, b) => a + b, 0)
  const totalLittle = little.reduce((a, b) => a + b, 0)
  const totalNone = none.reduce((a, b) => a + b, 0)
  const total = totalGood + totalLittle + totalNone
  if (total === 0) return null

  const pctGood = Math.round((totalGood / total) * 100)
  const pctLittle = Math.round((totalLittle / total) * 100)
  const pctNone = 100 - pctGood - pctLittle

  const items = [
    { label: 'Ate well', pct: pctGood, color: brand.success },
    { label: 'A little', pct: pctLittle, color: brand.accent },
    { label: "Didn't eat", pct: pctNone, color: brand.error },
  ].filter((i) => i.pct > 0)

  const maxPct = Math.max(...items.map((i) => i.pct), 1)

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 20, paddingVertical: 16 }}>
      {items.map((item) => {
        const size = 56 + (item.pct / maxPct) * 52 // 56–108px
        return (
          <View key={item.label} style={{ alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: item.color + '20',
                borderWidth: 2, borderColor: item.color + '50',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: item.color, fontSize: size > 80 ? 20 : 16, fontWeight: '900' }}>
                {item.pct}%
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', textAlign: 'center', maxWidth: size + 8 }}>
              {item.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
```

- [ ] **Step 3.2 — Replace StackedBarChart usage in nutrition case**

In the `nutrition` case of `PillarDetail` (around line 1475), find:

```tsx
<ChartCard title="Weekly Eat Quality" onExpand={() => onFullScreen('eat_quality')}>
  <StackedBarChart good={analytics.nutrition.eatQuality.good} little={analytics.nutrition.eatQuality.little} none={analytics.nutrition.eatQuality.none} labels={analytics.nutrition.weekLabels} width={chartW} />
</ChartCard>
```

Replace with:

```tsx
<ChartCard title="Weekly Eat Quality" onExpand={() => onFullScreen('eat_quality')}>
  <EatQualityBubbles
    good={analytics.nutrition.eatQuality.good}
    little={analytics.nutrition.eatQuality.little}
    none={analytics.nutrition.eatQuality.none}
  />
</ChartCard>
```

- [ ] **Step 3.3 — Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3.4 — Commit**

```bash
git add components/analytics/KidsAnalytics.tsx
git commit -m "feat(nutrition): replace stacked bar with eat quality bubble chart"
```

---

## Task 4 — Nutrition: Meals per Day line chart with food emoji points

**Files:**
- Modify: `components/analytics/KidsAnalytics.tsx`

Replace `BarChart` (Meals per Day) with a line chart where each point is a tappable 🍽️ emoji that reveals a tooltip. Also remove the `DayDetailStrip` that follows it.

- [ ] **Step 4.1 — Add import for `smoothPath`**

At the top of `KidsAnalytics.tsx`, update the import from `SvgCharts`:

```ts
import { LineChart, BarChart, BubbleGrid } from '../charts/SvgCharts'
```

Change to:

```ts
import { LineChart, BarChart, BubbleGrid, smoothPath } from '../charts/SvgCharts'
```

- [ ] **Step 4.2 — Add `MealsLineChart` component**

After the `EatQualityBubbles` function, add:

```tsx
function MealsLineChart({
  data, labels, width,
}: {
  data: number[]
  labels: string[]
  width: number
}) {
  const { colors } = useTheme()
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const color = PILLAR_CONFIG.nutrition.color

  const leftPad = 32
  const rightPad = 16
  const topPad = 32
  const bottomPad = 8
  const svgH = 160
  const innerW = width - leftPad - rightPad
  const innerH = svgH - topPad - bottomPad

  const maxV = Math.max(...data, 1)
  const nonZeroData = data.some((v) => v > 0)

  const pts = data.map((v, i) => ({
    x: leftPad + (i / Math.max(data.length - 1, 1)) * innerW,
    y: topPad + innerH - (v / maxV) * innerH,
    v,
  }))

  const curvePath = nonZeroData ? smoothPath(pts) : ''
  const areaPath = nonZeroData
    ? curvePath + ` L ${pts[pts.length - 1].x} ${topPad + innerH} L ${pts[0].x} ${topPad + innerH} Z`
    : ''

  return (
    <View>
      <View>
        <Svg width={width} height={svgH}>
          <Defs>
            <LinearGradient id="mealsAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.18" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Area fill */}
          {nonZeroData && <Path d={areaPath} fill="url(#mealsAreaGrad)" />}

          {/* Smooth line */}
          {nonZeroData && (
            <Path d={curvePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Y-axis max label */}
          <SvgText x={leftPad - 6} y={topPad + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end">
            {maxV}
          </SvgText>
          <SvgText x={leftPad - 6} y={topPad + innerH + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end">
            0
          </SvgText>

          {/* Point circles */}
          {pts.map((p, i) => (
            <G key={i}>
              <Circle
                cx={p.x} cy={p.y} r={selectedDay === i ? 20 : 15}
                fill={selectedDay === i ? color + '30' : color + '15'}
                stroke={selectedDay === i ? color : color + '60'}
                strokeWidth={1.5}
              />
              {/* Fork & knife emoji via SvgText */}
              <SvgText x={p.x} y={p.y + 6} textAnchor="middle" fontSize={15}>
                🍽️
              </SvgText>
            </G>
          ))}
        </Svg>

        {/* Pressable overlay for each point */}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
          {pts.map((p, i) => (
            <Pressable
              key={i}
              onPress={() => setSelectedDay(selectedDay === i ? null : i)}
              style={{ position: 'absolute', left: p.x - 20, top: p.y - 20, width: 40, height: 40 }}
            />
          ))}
        </View>
      </View>

      {/* X-axis labels */}
      <View style={{ flexDirection: 'row', paddingLeft: leftPad, paddingRight: rightPad, marginTop: 4 }}>
        {labels.map((label, i) => (
          <Text
            key={i}
            style={{
              flex: 1, textAlign: 'center', fontSize: 12, fontWeight: selectedDay === i ? '800' : '600',
              color: selectedDay === i ? color : colors.textMuted,
            }}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Tap tooltip */}
      {selectedDay !== null && (
        <View style={{ backgroundColor: color + '15', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: color + '30' }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
            <Text style={{ color, fontWeight: '800' }}>{labels[selectedDay]}: </Text>
            {data[selectedDay] === 0
              ? 'No meals logged'
              : `${data[selectedDay]} meal${data[selectedDay] !== 1 ? 's' : ''} logged`}
          </Text>
        </View>
      )}
    </View>
  )
}
```

- [ ] **Step 4.3 — Replace BarChart + DayDetailStrip in nutrition case**

In the nutrition case of `PillarDetail`, find:

```tsx
<ChartCard title="Meals per Day" onExpand={() => onFullScreen('meal_freq')}>
  <BarChart data={analytics.nutrition.mealFrequency} labels={analytics.nutrition.weekLabels} color={PILLAR_CONFIG.nutrition.color} width={chartW} />
</ChartCard>
<DayDetailStrip
  labels={analytics.nutrition.weekLabels}
  values={analytics.nutrition.mealFrequency}
  unit="meals"
  color={PILLAR_CONFIG.nutrition.color}
  selected={selectedDay}
  onSelect={setSelectedDay}
  getDetail={(i) => {
    const g = analytics.nutrition.eatQuality.good[i] ?? 0
    const l = analytics.nutrition.eatQuality.little[i] ?? 0
    const n = analytics.nutrition.eatQuality.none[i] ?? 0
    const total = analytics.nutrition.mealFrequency[i] ?? 0
    return total === 0
      ? 'No meals logged'
      : `${total} meal${total !== 1 ? 's' : ''} — ${g} ate well, ${l} a little, ${n} didn't eat`
  }}
/>
```

Replace with:

```tsx
<ChartCard title="Meals per Day" onExpand={() => onFullScreen('meal_freq')}>
  <MealsLineChart
    data={analytics.nutrition.mealFrequency}
    labels={analytics.nutrition.weekLabels}
    width={chartW}
  />
</ChartCard>
```

- [ ] **Step 4.4 — Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4.5 — Commit**

```bash
git add components/analytics/KidsAnalytics.tsx
git commit -m "feat(nutrition): meals per day line chart with tappable emoji points"
```

---

## Task 5 — Nutrition: Most Logged Foods ranked list

**Files:**
- Modify: `components/analytics/KidsAnalytics.tsx`

Replace `BubbleGrid` with a numbered, ranked food list.

- [ ] **Step 5.1 — Add `rankColor` helper**

After the `scoreColor` function (around line 130), add:

```ts
function rankColor(i: number): string {
  if (i === 0) return '#FBBF24' // gold
  if (i === 1) return '#6AABF7' // silver-blue
  if (i === 2) return '#A2FF86' // green
  return '#FFFFFF66'            // muted white
}
```

- [ ] **Step 5.2 — Replace BubbleGrid in nutrition case**

In the nutrition case of `PillarDetail`, find:

```tsx
{analytics.nutrition.topFoods.length > 0 && (
  <ChartCard title="Most Logged Foods" onExpand={() => onFullScreen('top_foods')}>
    <BubbleGrid items={analytics.nutrition.topFoods.map((f, i) => ({
      label: f.label, value: f.count,
      color: [PILLAR_CONFIG.nutrition.color, PILLAR_CONFIG.health.color, PILLAR_CONFIG.mood.color, PILLAR_CONFIG.sleep.color, PILLAR_CONFIG.growth.color, '#FF6B35'][i % 6],
    }))} />
  </ChartCard>
)}
```

Replace with:

```tsx
{analytics.nutrition.topFoods.length > 0 && (
  <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
    <Text style={[styles.chartTitle, { color: colors.text }]}>Most Logged Foods</Text>
    <View style={{ gap: 0 }}>
      {analytics.nutrition.topFoods.map((food, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 14,
            paddingVertical: 12,
            borderBottomWidth: i < analytics.nutrition.topFoods.length - 1 ? StyleSheet.hairlineWidth : 0,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: rankColor(i) + '25', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: rankColor(i), fontSize: 12, fontWeight: '900' }}>#{i + 1}</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{food.label}</Text>
          <View style={{ backgroundColor: PILLAR_CONFIG.nutrition.color + '20', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 }}>
            <Text style={{ color: PILLAR_CONFIG.nutrition.color, fontSize: 14, fontWeight: '800' }}>×{food.count}</Text>
          </View>
        </View>
      ))}
    </View>
  </View>
)}
```

- [ ] **Step 5.3 — Remove unused BubbleGrid import if no longer used elsewhere**

Search the file for remaining `BubbleGrid` usage:

```bash
grep -n "BubbleGrid" components/analytics/KidsAnalytics.tsx
```

If the only remaining usages are in the `FullScreenChart` for `top_foods`, keep the import. That fullscreen modal still uses BubbleGrid — leave it as-is.

- [ ] **Step 5.4 — Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5.5 — Commit**

```bash
git add components/analytics/KidsAnalytics.tsx
git commit -m "feat(nutrition): replace food bubble grid with numbered ranking list"
```

---

## Task 6 — Sleep: Move stats to top, highlight-bar chart, remove DayDetailStrip

**Files:**
- Modify: `components/analytics/KidsAnalytics.tsx`

Three changes to the `sleep` case of `PillarDetail`:
1. Move the `statRow` (avg / quality / target) from bottom to top.
2. Replace plain `BarChart` with `HighlightBarChart` — max day gets full color + glow label; others are muted.
3. Remove `DayDetailStrip`.

- [ ] **Step 6.1 — Add `HighlightBarChart` component**

After `MealsLineChart`, add:

```tsx
function HighlightBarChart({
  data, labels, color, width = 300, height = 180,
}: {
  data: number[]
  labels: string[]
  color: string
  width?: number
  height?: number
}) {
  const { colors } = useTheme()
  if (data.length === 0) return null

  const leftPad = 40
  const rightPad = 16
  const topPad = 28
  const bottomPad = 8
  const chartW = width - leftPad - rightPad
  const chartH = height - topPad - bottomPad

  const maxV = Math.max(...data, 0.1)
  const maxIdx = data.indexOf(maxV)
  const ticks = [0, Math.round(maxV / 2), Math.round(maxV)]
  const barW = Math.min(36, chartW / data.length - 10)
  const barR = Math.min(8, barW / 3)

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="hlBarHigh" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.55" />
          </LinearGradient>
          <LinearGradient id="hlBarLow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.45" />
            <Stop offset="1" stopColor={color} stopOpacity="0.2" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {ticks.map((tick, i) => {
          const y = topPad + chartH - (tick / maxV) * chartH
          return (
            <G key={i}>
              <Line x1={leftPad} y1={y} x2={width - rightPad} y2={y} stroke={colors.border} strokeWidth={0.5} opacity={0.3} strokeDasharray={i === 0 ? undefined : '4,4'} />
              <SvgText x={leftPad - 10} y={y + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end">
                {tick}
              </SvgText>
            </G>
          )
        })}

        {/* Bars */}
        {data.map((v, i) => {
          const rawH = v > 0 ? Math.max((v / maxV) * chartH, 4) : 4
          const x = leftPad + (i + 0.5) * (chartW / data.length) - barW / 2
          const y = topPad + chartH - rawH
          const isMax = i === maxIdx && v > 0
          const rTop = rawH > barR * 2 ? barR : Math.min(rawH / 2, barR)
          const barPath = `M ${x} ${y + rawH} L ${x} ${y + rTop} Q ${x} ${y}, ${x + rTop} ${y} L ${x + barW - rTop} ${y} Q ${x + barW} ${y}, ${x + barW} ${y + rTop} L ${x + barW} ${y + rawH} Z`

          return (
            <G key={i}>
              {isMax && (
                <Path d={barPath} fill={color} opacity={0.12} transform={`translate(0, 2) scale(1.05, 1)`} />
              )}
              <Path d={barPath} fill={isMax ? 'url(#hlBarHigh)' : 'url(#hlBarLow)'} />
              {isMax && v > 0 && (
                <>
                  <Rect x={x - 4} y={y - 22} width={barW + 8} height={18} rx={4} fill={color} opacity={0.15} />
                  <SvgText x={x + barW / 2} y={y - 9} fill={color} fontSize={12} fontWeight="900" textAnchor="middle">
                    {v % 1 === 0 ? v : v.toFixed(1)}h
                  </SvgText>
                </>
              )}
              {!isMax && v > 0 && (
                <SvgText x={x + barW / 2} y={y - 6} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="middle">
                  {v % 1 === 0 ? v : v.toFixed(1)}
                </SvgText>
              )}
            </G>
          )
        })}
      </Svg>

      {/* X labels */}
      <View style={[styles.labelRow, { width, paddingLeft: leftPad, paddingRight: rightPad }]}>
        {labels.map((l, i) => (
          <Text key={i} style={[styles.label, { color: i === maxIdx && data[i] > 0 ? color : colors.textMuted, fontWeight: i === maxIdx && data[i] > 0 ? '800' : '600' }]}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  )
}
```

- [ ] **Step 6.2 — Rewrite the sleep case in PillarDetail**

In the `sleep` case of `PillarDetail` (around line 1522), replace the entire return block with:

```tsx
return analytics.sleep.hasData ? (
  <View style={styles.detailBody}>
    {/* Stats at top */}
    <View style={[styles.statRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
      <StatPill label="Avg/night" value={`${avg.toFixed(1)}h`} color={PILLAR_CONFIG.sleep.color} />
      <StatPill label="Quality" value={getBestQuality(analytics.sleep.qualityCounts)} color={brand.success} />
      <StatPill label="Target" value={`${target}h`} color={colors.textMuted} />
    </View>

    {/* Explanation */}
    <View style={[{ backgroundColor: colors.surfaceRaised, borderRadius: radius.xl, padding: 16, gap: 8 }]}>
      <Text style={[styles.detailExplain, { color: colors.text, fontWeight: '700' }]}>
        How this score works
      </Text>
      <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
        {`${childName} averaged ${avg.toFixed(1)}h/night across ${daysLogged} logged days. The target for ${getAgeLabel(ageMonths)} is ${target}h including naps. `}
        {deficit > 0.5
          ? `That's a ${deficit.toFixed(1)}h nightly deficit — consistent early bedtimes and a wind-down routine can help close this gap.`
          : `${childName} is meeting the sleep target!`}
      </Text>
      {daysOnTarget > 0 && (
        <Text style={[styles.detailExplain, { color: brand.success }]}>
          {`${daysOnTarget} of ${daysLogged} logged nights hit the ${target}h target.`}
        </Text>
      )}
      {sleepScore.trend !== 0 && (
        <Text style={[styles.detailExplain, { color: sleepScore.trend > 0 ? brand.success : brand.error }]}>
          {`Sleep ${sleepScore.trend > 0 ? '↑ improving' : '↓ declining'} ${Math.abs(sleepScore.trend)}% vs the start of the week.`}
        </Text>
      )}
      {daysLogged < 5 && (
        <Text style={[styles.detailExplain, { color: brand.accent }]}>
          {`Only ${daysLogged} days logged — log sleep daily for a more accurate score.`}
        </Text>
      )}
    </View>

    {/* Highlighted bar chart */}
    <ChartCard title="Daily Sleep Hours" onExpand={() => onFullScreen('sleep_weekly')}>
      <HighlightBarChart
        data={analytics.sleep.dailyHours}
        labels={analytics.sleep.weekLabels}
        color={PILLAR_CONFIG.sleep.color}
        width={chartW}
      />
    </ChartCard>

    {/* Sleep quality breakdown */}
    <ChartCard title="Sleep Quality Breakdown" onExpand={() => onFullScreen('sleep_quality')}>
      <SleepQualityChart counts={analytics.sleep.qualityCounts} />
    </ChartCard>
  </View>
) : <EmptyDetail pillar="sleep" />
```

- [ ] **Step 6.3 — Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6.4 — Commit**

```bash
git add components/analytics/KidsAnalytics.tsx
git commit -m "feat(sleep): stats at top, highlight-bar chart, remove day strip"
```

---

## Task 7 — Mood: Remove DayDetailStrip

**Files:**
- Modify: `components/analytics/KidsAnalytics.tsx`

- [ ] **Step 7.1 — Remove DayDetailStrip from mood case**

In the `mood` case of `PillarDetail` (around line 1588), find and remove the entire `DayDetailStrip` block:

```tsx
<DayDetailStrip
  labels={analytics.mood.weekLabels}
  values={analytics.mood.weekLabels.map((_, i) =>
    Object.values(analytics.mood.dailyCounts).reduce((sum, arr) => sum + (arr[i] ?? 0), 0)
  )}
  unit="logs"
  color={PILLAR_CONFIG.mood.color}
  selected={selectedDay}
  onSelect={setSelectedDay}
  getDetail={(i) => {
    const dayMoods = Object.entries(analytics.mood.dailyCounts)
      .filter(([, arr]) => arr[i] > 0)
      .map(([mood, arr]) => `${arr[i]} ${mood}`)
    return dayMoods.length === 0 ? 'No mood logged' : dayMoods.join(', ')
  }}
/>
```

The mood case `return` should now be:

```tsx
case 'mood':
  return analytics.mood.hasData ? (
    <View style={styles.detailBody}>
      <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
        Mood score weights: happy/calm = positive, energetic = neutral-positive, fussy/cranky = negative. More consistent logging improves accuracy.
      </Text>
      <ChartCard title="Mood Distribution This Week" onExpand={() => onFullScreen('mood_dist')}>
        <MoodDistribution moods={analytics.mood.dominantMoods} />
      </ChartCard>
      <ChartCard title="Daily Mood Tracking" onExpand={() => onFullScreen('mood_daily')}>
        <MoodDailyChart dailyCounts={analytics.mood.dailyCounts} labels={analytics.mood.weekLabels} width={chartW} />
      </ChartCard>
    </View>
  ) : <EmptyDetail pillar="mood" />
```

- [ ] **Step 7.2 — Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 7.3 — Commit**

```bash
git add components/analytics/KidsAnalytics.tsx
git commit -m "feat(mood): remove day detail strip"
```

---

## Task 8 — Health: Improved UI

**Files:**
- Modify: `components/analytics/KidsAnalytics.tsx`

Rewrite the `health` case to: (1) summary card at top showing vaccine progress + event count, (2) events grouped by type, (3) cleaner vaccine grid.

- [ ] **Step 8.1 — Add `getHealthSummary` helper**

After `getEventColor` (around line 2054), add:

```ts
function getHealthEventLabel(type: string): string {
  switch (type.toLowerCase()) {
    case 'temperature': return '🌡️ Temperature'
    case 'medicine': return '💊 Medicine'
    case 'vaccine': return '💉 Vaccine'
    case 'note': return '📝 Note'
    default: return type
  }
}
```

- [ ] **Step 8.2 — Replace the health case in PillarDetail**

In the `health` case of `PillarDetail` (around line 1619), replace the entire return block with:

```tsx
case 'health': {
  const doneVaccines = analytics.health.vaccines.filter((v) => v.done).length
  const totalVaccines = analytics.health.vaccines.length
  const vaccinePct = totalVaccines > 0 ? Math.round((doneVaccines / totalVaccines) * 100) : 0
  const totalEvents = analytics.health.weeklyFrequency.reduce((a, b) => a + b, 0)

  // Group events by type
  const eventsByType: Record<string, typeof analytics.health.recentEvents> = {}
  for (const e of analytics.health.recentEvents) {
    if (!eventsByType[e.type]) eventsByType[e.type] = []
    eventsByType[e.type].push(e)
  }

  return (
    <View style={styles.detailBody}>
      {/* Summary card */}
      <View style={[styles.statRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
        <StatPill label="Vaccines done" value={`${doneVaccines}/${totalVaccines}`} color={brand.success} />
        <StatPill label="Events this week" value={`${totalEvents}`} color={totalEvents === 0 ? brand.success : brand.accent} />
        <StatPill label="Completion" value={`${vaccinePct}%`} color={PILLAR_CONFIG.health.color} />
      </View>

      {/* Health score explanation */}
      <View style={[{ backgroundColor: colors.surfaceRaised, borderRadius: radius.xl, padding: 16, gap: 8 }]}>
        <Text style={[styles.detailExplain, { color: colors.text, fontWeight: '700' }]}>How this score works</Text>
        <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
          {`Health score = vaccine completion (60%) + low health incidents (40%). ${doneVaccines}/${totalVaccines} vaccines logged. ${totalEvents === 0 ? 'No health events this week — great!' : `${totalEvents} health event${totalEvents !== 1 ? 's' : ''} logged this week.`}`}
        </Text>
      </View>

      {/* Recent events by type */}
      {analytics.health.hasData && analytics.health.recentEvents.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Recent Events</Text>
          {Object.entries(eventsByType).map(([type, events]) => (
            <View key={type} style={{ marginBottom: 12 }}>
              <Text style={{ color: getEventColor(type), fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>
                {getHealthEventLabel(type).toUpperCase()}
              </Text>
              {events.map((e, i) => (
                <View
                  key={i}
                  style={[styles.eventRow, { borderBottomColor: i < events.length - 1 ? colors.border : 'transparent' }]}
                >
                  <View style={[styles.eventDot, { backgroundColor: getEventColor(type) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.eventLabel, { color: colors.text }]} numberOfLines={1}>{e.label}</Text>
                    <Text style={[styles.eventDate, { color: colors.textMuted }]}>{e.date}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Weekly event frequency chart */}
      {analytics.health.hasData && (
        <ChartCard title="Health Events This Week" onExpand={() => onFullScreen('health_freq')}>
          <BarChart data={analytics.health.weeklyFrequency} labels={analytics.health.weekLabels} color={PILLAR_CONFIG.health.color} width={chartW} />
        </ChartCard>
      )}

      {/* Vaccine tracker */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
        <View style={styles.row}>
          <Syringe size={20} color={PILLAR_CONFIG.health.color} strokeWidth={2} />
          <Text style={[styles.chartTitle, { color: colors.text, marginBottom: 0 }]}>Vaccine Tracker</Text>
        </View>
        {/* Progress bar */}
        <View style={{ height: 6, borderRadius: 3, marginTop: 10, marginBottom: 14, overflow: 'hidden', backgroundColor: brand.success + '20' }}>
          <View style={{ width: `${vaccinePct}%`, height: '100%', backgroundColor: brand.success, borderRadius: 3 }} />
        </View>
        <Text style={[styles.detailExplain, { color: colors.textSecondary, marginBottom: 12 }]}>
          {`${doneVaccines}/${totalVaccines} logged as completed`}
        </Text>
        <View style={styles.vaccineGrid}>
          {analytics.health.vaccines.map((v, i) => (
            <View
              key={i}
              style={[styles.vaccineChip, {
                backgroundColor: v.done ? brand.success + '15' : colors.surfaceRaised,
                borderColor: v.done ? brand.success + '40' : colors.border,
                borderRadius: radius.full,
              }]}
            >
              {v.done && <Shield size={14} color={brand.success} strokeWidth={2.5} />}
              <Text style={[styles.vaccineText, { color: v.done ? brand.success : colors.textMuted }]}>{v.name}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
```

- [ ] **Step 8.3 — Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 8.4 — Commit**

```bash
git add components/analytics/KidsAnalytics.tsx
git commit -m "feat(health): improved summary, grouped events, vaccine progress bar"
```

---

## Task 9 — Activity: Open activity ranking modal

**Files:**
- Modify: `components/analytics/KidsAnalytics.tsx`

Replace `router.push('/(tabs)/agenda')` with an inline `Modal` listing age-appropriate activity types with recommended time percentages.

- [ ] **Step 9.1 — Add `ActivityModal` component**

After `ActivitySection`, add:

```tsx
function ActivityModal({
  visible, ageMonths, childName, onClose,
}: {
  visible: boolean
  ageMonths: number
  childName: string
  onClose: () => void
}) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const ACTIVITY_COLOR = '#FF6B35'

  interface ActivityItem { rank: number; label: string; pct: number; emoji: string; tip: string }

  const activities: ActivityItem[] = ageMonths < 12
    ? [
        { rank: 1, label: 'Tummy time', pct: 35, emoji: '👶', tip: 'Builds neck, shoulder, and core strength for crawling' },
        { rank: 2, label: 'Floor play', pct: 30, emoji: '🧸', tip: 'Reaching, grasping, rolling — motor development' },
        { rank: 3, label: 'Movement & carrying', pct: 20, emoji: '🚶', tip: 'Supported sitting, bouncing, gentle movement' },
        { rank: 4, label: 'Rest & sleep', pct: 15, emoji: '😴', tip: 'Essential for brain development at this age' },
      ]
    : ageMonths < 36
    ? [
        { rank: 1, label: 'Active free play', pct: 40, emoji: '🏃', tip: 'Climbing, running, dancing — unstructured is best' },
        { rank: 2, label: 'Outdoor time', pct: 30, emoji: '🌳', tip: 'Fresh air, nature exploration, sensory play' },
        { rank: 3, label: 'Structured play', pct: 20, emoji: '🧩', tip: 'Puzzles, building, role-play — cognitive growth' },
        { rank: 4, label: 'Quiet rest', pct: 10, emoji: '📖', tip: 'Story time, calm activities between active sessions' },
      ]
    : [
        { rank: 1, label: 'Physical activity', pct: 40, emoji: '⚽', tip: 'Running, jumping, sports — at least 60 min/day' },
        { rank: 2, label: 'Outdoor play', pct: 25, emoji: '🌳', tip: 'Parks, nature, free exploration' },
        { rank: 3, label: 'Creative play', pct: 20, emoji: '🎨', tip: 'Art, building, imaginative games' },
        { rank: 4, label: 'Structured learning', pct: 15, emoji: '📚', tip: 'Reading, puzzles, educational activities' },
      ]

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalSheet, { backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: insets.bottom + 20 }]}
          onPress={() => {}}
        >
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          <View style={[styles.modalHeader, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ACTIVITY_COLOR + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={20} color={ACTIVITY_COLOR} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Activity Guide</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
                  {childName} · recommended split
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={[styles.modalClose, { backgroundColor: colors.surfaceRaised }]}>
              <X size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, gap: 12 }}>
            {activities.map((item) => (
              <View
                key={item.rank}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{item.label}</Text>
                    <Text style={{ color: ACTIVITY_COLOR, fontSize: 18, fontWeight: '900' }}>{item.pct}%</Text>
                  </View>
                  {/* Progress bar */}
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: ACTIVITY_COLOR + '15', overflow: 'hidden' }}>
                    <View style={{ width: `${item.pct}%`, height: '100%', backgroundColor: ACTIVITY_COLOR + 'CC', borderRadius: 3 }} />
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '500' }}>{item.tip}</Text>
                </View>
              </View>
            ))}

            <View style={{ backgroundColor: ACTIVITY_COLOR + '10', borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: ACTIVITY_COLOR + '25', marginTop: 4 }}>
              <Text style={{ color: ACTIVITY_COLOR, fontSize: 13, fontWeight: '700' }}>
                {ageMonths < 12
                  ? '📋 Aim for 20–30 min tummy time daily, spread across sessions.'
                  : ageMonths < 36
                  ? '📋 WHO recommends 180 min of activity/day for toddlers, spread throughout.'
                  : '📋 WHO recommends 60 min of moderate-to-vigorous activity daily for children 3+.'}
              </Text>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
```

- [ ] **Step 9.2 — Update `ActivitySection` to open the modal**

Find the existing `ActivitySection` component (around line 1383). Replace it with:

```tsx
function ActivitySection({ ageMonths, childName }: { ageMonths: number; childName: string }) {
  const { colors, radius } = useTheme()
  const [showModal, setShowModal] = useState(false)
  const ACTIVITY_COLOR = '#FF6B35'

  const target = ageMonths < 12
    ? '20–30 min tummy time & floor play daily'
    : ageMonths < 36
    ? '180 min of light active play spread throughout the day'
    : '60 min of moderate-to-vigorous physical activity daily'

  const tip = ageMonths < 12
    ? 'At this age, tummy time builds neck, shoulder, and core strength — the foundation for crawling and walking.'
    : ageMonths < 36
    ? 'Unstructured active play (climbing, running, dancing) is best. Limit screen time to build movement habits early.'
    : 'Outdoor play, swimming, dancing, or active games all count. Limit sitting time to under 1 hour at a stretch.'

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.pillarRow,
          { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => setShowModal(true)}
      >
        <View style={[styles.pillarIcon, { backgroundColor: ACTIVITY_COLOR + '15' }]}>
          <Zap size={20} color={ACTIVITY_COLOR} strokeWidth={2} />
        </View>
        <View style={styles.pillarInfo}>
          <Text style={[styles.pillarName, { color: colors.text }]}>Activity</Text>
          <Text style={[styles.pillarTakeaway, { color: colors.textMuted }]} numberOfLines={2}>{target}</Text>
          <Text style={[{ fontSize: 11, fontWeight: '500', color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>{tip}</Text>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </Pressable>

      <ActivityModal
        visible={showModal}
        ageMonths={ageMonths}
        childName={childName}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}
```

- [ ] **Step 9.3 — Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 9.4 — Commit**

```bash
git add components/analytics/KidsAnalytics.tsx
git commit -m "feat(activity): popup modal with age-appropriate activity rankings"
```

---

## Task 10 — Final cleanup and verification

- [ ] **Step 10.1 — Check for unused `DayDetailStrip` component**

If `DayDetailStrip` is no longer called anywhere, it can stay (it's internal) or be removed. Check:

```bash
grep -n "DayDetailStrip" components/analytics/KidsAnalytics.tsx
```

If only its definition remains (no call sites), remove the component definition (lines ~1742–1793) and its associated styles (`dayStrip`, `dayStripLabel`, `dayChips`, `dayChip`, `dayChipLabel`, `dayChipValue`, `dayDetail`, `dayDetailText`).

- [ ] **Step 10.2 — Check `selectedDay` state usage**

The `selectedDay` state inside `PillarDetail` was used by `DayDetailStrip` for nutrition, sleep, and mood. After removing all three strips, check if `selectedDay` and `setSelectedDay` are still referenced (they are — `MealsLineChart` manages its own internal state). Verify there are no lingering references:

```bash
grep -n "selectedDay\|setSelectedDay" components/analytics/KidsAnalytics.tsx
```

Remove the `const [selectedDay, setSelectedDay] = useState<number | null>(null)` line from `PillarDetail` (it was declared there for the strip).

- [ ] **Step 10.3 — Final TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Expected: zero errors.

- [ ] **Step 10.4 — Final commit**

```bash
git add components/analytics/KidsAnalytics.tsx
git commit -m "chore: remove unused DayDetailStrip and selectedDay state from PillarDetail"
```

---

## Self-Review Checklist

- [x] **Mood duplicate bug** — Task 1 covers the root cause fix in `analyticsData.ts`
- [x] **Nutrition bubble chart** — Task 3 adds `EatQualityBubbles`, replaces `StackedBarChart`
- [x] **Nutrition line chart + emoji points** — Task 4 adds `MealsLineChart` with tappable points, removes `DayDetailStrip`
- [x] **Nutrition food ranking list** — Task 5 replaces `BubbleGrid` with numbered list
- [x] **Sleep stats at top** — Task 6 moves `StatRow` before the chart
- [x] **Sleep highlight bar chart** — Task 6 adds `HighlightBarChart`
- [x] **Sleep DayDetailStrip removed** — Task 6 rewrites the sleep return block
- [x] **Mood DayDetailStrip removed** — Task 7
- [x] **Health improved UI** — Task 8 adds summary card, grouped events, progress bar
- [x] **Activity popup modal** — Task 9 adds `ActivityModal`, replaces router navigation
- [x] **Cleanup** — Task 10 removes dead `DayDetailStrip` code and state
