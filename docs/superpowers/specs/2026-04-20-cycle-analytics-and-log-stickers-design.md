# Cycle Analytics + Log Stickers Design

**Date:** 2026-04-20
**Mode affected:** Pre-Pregnancy (cycle tracking)
**Status:** Approved by user

---

## Problem

The Pre-Pregnancy journey has three gaps:

1. **`components/analytics/CycleAnalytics.tsx`** renders 5 stat tiles (Cycle Length chart, Regular %, PMS Days, Fertile window, Mood Avg) with **fully mocked data** and **no tap/detail interactions**. A user can't drill into any metric.
2. **Individual log forms** in `components/calendar/LogForms.tsx` use generic `lucide-react-native` icons (Droplets, Thermometer, Heart) instead of the branded stickers already built in `components/calendar/logStickers.tsx`.
3. The **Log Activity sheet** in `components/calendar/CycleCalendar.tsx` needs its tiles verified against the branded-sticker system.

All other pre-pregnancy infrastructure (forms wired to Supabase `cycle_logs`, mode store, week strip, phase cards) already works — this spec only adds the analytics layer and polishes the log UI.

## Goals

- Every analytics card reads real data from `cycle_logs`.
- Every analytics card is tappable, opening a bottom sheet with deeper detail.
- Every log-related icon in cycle mode uses the brand sticker system, not lucide.
- Empty states (no user logs yet) show a friendly nudge, not "—" or zero.

## Non-goals

- Advanced charts (e.g., scatter BBT graph, symptom heatmap) — those belong on `/insights`.
- Editing/deleting past log entries from detail sheets.
- Predictive modelling beyond what `lib/cycleLogic.ts` already exposes.
- Changes to pregnancy or kids mode analytics.

---

## Architecture

### New module: `lib/cycleAnalytics.ts`

A thin analytics layer on top of Supabase `cycle_logs`. Exposes React Query v5 hooks; each hook reads the current user from `supabase.auth.getSession()` and filters `cycle_logs` by `user_id`.

```ts
// Raw log shape (existing table)
type CycleLog = {
  id: string
  user_id: string
  type: 'period_start' | 'period_end' | 'symptom' | 'mood' | 'basal_temp' | 'intercourse'
  value: string | null
  notes: string | null
  logged_at: string  // ISO date
}

// Computed shapes
type Cycle = { startDate: string; endDate: string | null; lengthDays: number | null }
type CycleHistory = { cycles: Cycle[]; avg: number | null; min: number | null; max: number | null }
type Regularity = { percent: number | null; deviations: Array<{ cycleIdx: number; delta: number }> }
type PMSStats = { avgDays: number | null; topSymptoms: Array<{ name: string; count: number }> }
type FertileWindow = {
  current: { start: string; end: string; daysLeft: number } | null
  history: Array<{ start: string; end: string }>
}
type MoodStats = {
  avgScore: number | null
  distribution: Array<{ mood: 'great' | 'good' | 'okay' | 'low' | 'energetic'; count: number }>
  recent: Array<{ mood: string; logged_at: string }>
}

// Hooks
export function useCycleHistory(): UseQueryResult<CycleHistory>
export function useRegularity(): UseQueryResult<Regularity>
export function usePMSStats(): UseQueryResult<PMSStats>
export function useFertileWindow(): UseQueryResult<FertileWindow>
export function useMoodStats(): UseQueryResult<MoodStats>
```

### Computation rules

- **Cycle**: pair each `period_start` with the next `period_start` in chronological order. Length = days between. Last open cycle has `endDate: null, lengthDays: null` (not counted in averages).
- **Avg**: mean of closed cycles' `lengthDays`. `null` if fewer than 2 `period_start` entries.
- **Regular %**: fraction of closed cycles where `|lengthDays − avg| ≤ 2`. `null` if fewer than 3 closed cycles.
- **PMS days**: for each closed cycle, count distinct days with a `symptom` entry logged in the last 7 days of the cycle. Average across closed cycles. Top symptoms = overall count across all symptom entries.
- **Fertile window**: `lib/cycleLogic.ts` already computes fertile windows from `period_start` + average length. Reuse it. `current` = fertile window containing today or the next upcoming one. `history` = last 3 past fertile windows.
- **Mood score mapping**: great=5, energetic=5, good=4, okay=3, low=2. Average over last 30 days of `mood` entries. Distribution = counts per mood id.

### Detail sheets: `components/analytics/CycleDetailSheets.tsx`

One exported `CycleDetailSheet` component + internal per-type renderers, driven by a `type` prop:

```tsx
type DetailType = 'cycleLength' | 'regularity' | 'pms' | 'fertile' | 'mood'

type Props = {
  type: DetailType | null  // null = closed
  onClose: () => void
}
```

Sheet wrapper reuses the existing `LogSheet` component (drag handle, Fraunces title, close button, paper bg, KeyboardAvoidingView). Titles:

- `cycleLength` → "Cycle Length"
- `regularity` → "Regularity"
- `pms` → "PMS Days"
- `fertile` → "Fertile Window"
- `mood` → "Mood"

Each internal renderer is a pure component that calls its corresponding hook. Loading state: ActivityIndicator centered. Empty state: sticker + short copy + "Log your first cycle" style nudge — no CTA button needed, users return to Agenda to log.

#### Content per sheet

**CycleLengthDetail**
- Large stat row: avg days (Fraunces 40px) + "days avg" label
- Min/Max chips below
- Bar chart: last 12 cycles, x-axis = "C1..Cn", y-axis = days. Colors: `stickers.pinkSoft` bars, most-recent bar `stickers.pink`.
- List of 6 most-recent cycles: date range (Apr 8 – May 6) + length badge (28d)

**RegularityDetail**
- Big percent (Fraunces 56px) + "regular" label
- Legend: green dot ≤2d, amber ≤4d, coral >4d
- List of last 10 cycles: "Cycle N" + length + deviation dot

**PMSDetail**
- Avg days stat row (Fraunces 40px + "days avg symptoms")
- Top-5 symptom ranking: each row = branded sticker (from STICKER_MAP) + name + count chip
- Uses existing Emoji/sticker mapping for symptoms (Cramps→Bolt, Headache→Burst, etc. — pick closest sticker)

**FertileDetail**
- Current window card: big date range + "N days left" + Flower sticker
- If no current window: "Next fertile window in N days" based on prediction
- "Past windows" section: last 3 as compact rows

**MoodDetail**
- Avg score stat (Fraunces 40px + "/ 5 avg")
- Distribution: 5 horizontal bars (Great..Low) with count on right, bar widths proportional to max count
- Last 7 mood entries: date + mood label + mini sticker

### Wiring in `CycleAnalytics.tsx`

Replace the 5 current mock tiles with pressable wrappers:

```tsx
const [detailType, setDetailType] = useState<DetailType | null>(null)

<Pressable onPress={() => setDetailType('cycleLength')}>
  <BigChartCard ... />
</Pressable>
// ...4 more tiles...

<CycleDetailSheet type={detailType} onClose={() => setDetailType(null)} />
```

Stat values inside the existing tiles also swap from hardcoded mocks to hook values, with fallbacks:
- Cycle length avg: `useCycleHistory().data?.avg ?? null` → "—" if null
- Regular %: `useRegularity().data?.percent ?? null`
- PMS days: `usePMSStats().data?.avgDays ?? null`
- Fertile range: `useFertileWindow().data?.current` formatted as "Apr 15–22"
- Mood avg: `useMoodStats().data?.avgScore` formatted "7.4" (scaled to 10? — reuse existing display: score*2, so 5→10, 2.5→5)

### Log UI polish

#### Log Activity sheet tiles

Audit of `CycleCalendar.tsx:LogActivitySheet` shows tiles already use `logStickers()` output. Verify each tile:
- `period_start` → Drop sticker (coral fill)
- `period_end` → CircleDashed sticker (coral stroke)
- `basal_temp` → Drop sticker (blue fill)
- `symptom` → Burst sticker (peach, 8 points)
- `mood` → Flower sticker (pink petals, yellow center)
- `intercourse` → Heart sticker (pink)

If already correct, no change. Otherwise swap to the mapping above.

#### Individual log forms (LogForms.tsx)

Replace the lucide-icon rows at the top of each form with a branded sticker chip. Pattern:

```tsx
<View style={styles.stickerRow}>
  <View style={[styles.stickerChip, { backgroundColor: tints.soft }]}>
    {/* logStickers sticker at 40px */}
  </View>
  <Text style={styles.stickerLabel}>{contextLabel}</Text>
</View>
```

Per-form sticker + label:
- PeriodStartForm → Drop (coral) + "Period started on {date}"
- PeriodEndForm → CircleDashed (coral) + "Period ended on {date}"
- SymptomsForm → Burst (peach) + "How's your body feeling?"
- MoodForm → Flower (pink/yellow) + "How's your mood today?"
- TemperatureForm → Drop (blue) + "Basal Temperature"
- IntimacyForm → Heart (pink) + "Logged for {date}"

Temperature form: keep the numeric input row as-is (Fraunces font, °C unit chip). Mood form: keep the 5-button row but allow the existing lucide icons inside each button (they work as affordances; only the header icon row changes).

---

## Data flow

```
User opens /analytics (mode = pre-preg)
  → CycleAnalytics renders 5 tiles with data from 5 hooks
  → User taps "CYCLE LENGTH" tile
  → setDetailType('cycleLength')
  → CycleDetailSheet opens with type='cycleLength'
  → CycleLengthDetail internal component calls useCycleHistory()
    (already cached by outer tile, instant)
  → Renders bar chart + list
  → User taps close → sheet dismisses
```

## Error handling

- Supabase errors: React Query's `error` state renders "Couldn't load. Pull to retry." inside the sheet. Tile itself shows "—" for the value.
- Empty state (no logs for that metric): sheet shows a sticker + "Log your first {metric} on the Agenda tab" — no crash, no zeros.
- User not authenticated: hooks return `{ data: null }` via the `enabled: !!session` pattern.

## Testing

- Manual: seed a test user with 3+ `period_start` entries, 10+ `symptom` entries, 30+ `mood` entries, 5+ `basal_temp` entries. Open analytics, verify each tile shows real data and detail sheet renders correct content.
- Empty state: fresh test user with zero logs — confirm each detail sheet shows the nudge, no errors in console.
- No automated tests: matches existing repo convention (no unit tests around analytics currently; follow project norm).

## Files touched

**New:**
- `lib/cycleAnalytics.ts`
- `components/analytics/CycleDetailSheets.tsx`

**Modified:**
- `components/analytics/CycleAnalytics.tsx` (wire hooks + pressable tiles + detail sheet state)
- `components/calendar/LogForms.tsx` (swap lucide icon rows for branded sticker chips in 6 forms)
- `components/calendar/CycleCalendar.tsx` (verify Log Activity tile stickers; only change if mismatch)

**Potentially referenced (no change):**
- `components/calendar/logStickers.tsx` (sticker → type map)
- `components/ui/Stickers.tsx` (brand sticker SVGs)
- `lib/cycleLogic.ts` (fertile window helper)
- `constants/theme.ts` (tokens)

## Out of scope / deferred

- Wiring `CycleHome.tsx` mock data (`MOCK_CYCLE_LENGTHS`, `tryingToConceive`) to real sources — separate spec.
- Checklist and Visits tabs on the Agenda screen (empty placeholders).
- `/insights` deep-chart screen.
- Editing/deleting log entries from the detail sheets.

## Acceptance criteria

1. Open Analytics tab in pre-preg mode with a seeded test user → all 5 tiles show values derived from `cycle_logs`, not constants.
2. Tap each of the 5 tiles → a bottom sheet opens with the matching title and non-empty content.
3. Close each sheet → returns to the tile grid, no state leak.
4. Fresh user with no logs → tiles show "—", sheets show the nudge empty state, no crashes.
5. Open any individual log form (Agenda → +) → its header icon row shows a branded sticker, not a lucide icon.
6. Branded sticker colors match the Log Activity sheet tiles for the same type.
