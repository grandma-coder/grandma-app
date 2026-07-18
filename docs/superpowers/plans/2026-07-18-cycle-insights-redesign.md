# Cycle Insights Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the pre-pregnancy Cycle analytics surface and its detail sheets up to Pregnancy Insights visual caliber by reusing pregnancy's shared design primitives, and rename the pre-pregnancy tab from "Analytics" to "Insights".

**Architecture:** Extract two presentational helpers (`Section`, `MoodStrip`) from `PregnancyAnalytics.tsx` into `components/analytics/shared/` so both surfaces share them. Then rebuild the Diffuse render path of `CycleAnalytics.tsx` on those primitives + existing shared charts (`GlowAreaLine`, `DiffuseStatCard`, `BeadedThread`), add two cycle-native titled sections, and upgrade `CycleDetailSheets.tsx` from `LogSheet` to `DiffuseSheet` with richer charts. The cream/current variant and all data hooks are untouched.

**Tech Stack:** React Native 0.81 + Expo SDK 54, TypeScript strict, react-native-svg, Zustand v5, React Query v5, NativeWind. Diffuse theme via `useDiffuseTheme()`; design tokens from `constants/theme.ts`. Jest for pure-logic tests (`lib/__tests__/`); visual components verified via iOS simulator (no component-render test harness exists — this is intentional per the design system).

## Global Constraints

- **Diffuse variant only.** All new UI targets the `useIsDiffuse()` === true branch. Never modify the cream/current branch behavior. Two full render paths coexist in these files; edit only the Diffuse one unless a step says otherwise.
- **Design tokens only** — no raw hex/radius/font/shadow literals in JSX. Diffuse values from `useDiffuseTheme()` / `diffuseFont` / `getDiffuseAccent`. Only exception: SVG path strings in sticker/illustration files (not touched here).
- **No new user-facing string may be hardcoded.** Every visible label goes through `t()` with a key added to `lib/i18n/en.ts` (English-first; translation waves fill later). Run `npm run i18n:check` after adding keys.
- **Keep the per-phase accent.** Screen accent = `PHASE_ACCENT[info.phase]` under Diffuse (menstruation=coral, follicular=green, ovulation=pink, luteal=lilac). Do NOT collapse to a single mode accent. (Note: the CURRENT code sets `accent = diffuse ? getDiffuseAccent('pre-pregnancy') : PHASE_ACCENT[phase]` — this plan changes Diffuse to also use the phase accent. See Task 4.)
- **profiles.id = auth UUID**, local dates via `toDateStr` — not relevant to this UI work but standing repo rules.
- **Verification per task:** `npm run typecheck` must be clean except the known pre-existing error `KidsHome.tsx: Cannot find name 'resolveSex'`. Treat only NEW type errors as failures.
- **Commit per task.** User works directly on `main`, no worktrees/branches.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `components/analytics/shared/Section.tsx` | **New.** Titled, tappable, chevron'd section wrapper (Diffuse + current aware). | 1 |
| `components/analytics/shared/MoodStrip.tsx` | **New.** Row of mood blobs + day labels. Normalized `{date,value}[]` prop. | 3 |
| `lib/moodTrend.ts` | **New.** Pure mapper: cycle `MoodId` + date rows → `MoodStrip`'s `{date,value}[]`. Unit-tested. | 2 |
| `components/analytics/PregnancyAnalytics.tsx` | Remove local `Section` + `MoodTrendStrip`; import shared. No visual change. | 1, 3 |
| `components/analytics/CycleAnalytics.tsx` | Hero chart → GlowAreaLine; grid → DiffuseStatCard; add 2 Sections; phase accent; pass accent to sheet. | 4–7 |
| `components/analytics/CycleDetailSheets.tsx` | Diffuse → DiffuseSheet; cycleLength/bbt chart upgrades; accent threading; metric-tile restyle. | 8–9 |
| `lib/i18n/en.ts` | New string keys for section titles + sheet chips. | 5, 6, 8 |
| `lib/modeConfig.ts` | Rename `Analytics` → `Insights` (line 51). | 10 |

---

## Task 1: Extract `Section` into shared/

**Files:**
- Create: `components/analytics/shared/Section.tsx`
- Modify: `components/analytics/PregnancyAnalytics.tsx` (remove local `Section` function ~lines 804–841; add import)

**Interfaces:**
- Produces: `export function Section({ title, subtitle, onPress, children }: { title: string; subtitle?: string; onPress?: () => void; children: React.ReactNode }): JSX.Element`

- [ ] **Step 1: Create the shared file** — copy the `Section` function body verbatim from `PregnancyAnalytics.tsx` (currently ~lines 804–841) into a new file. It uses `useTheme`, `useIsDiffuse`, `useDiffuseTheme`, `diffuseFont`, `ChevronRight` from `lucide-react-native`. Include all needed imports.

```tsx
import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { useTheme, diffuseFont, useDiffuseTheme } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'

export function Section({
  title, subtitle, onPress, children,
}: {
  title: string
  subtitle?: string
  onPress?: () => void
  children: React.ReactNode
}) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [{ opacity: pressed && onPress ? 0.7 : 1 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display, letterSpacing: -0.3 }}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={diffuse
                ? { fontSize: 10, color: dt.colors.ink3, fontFamily: diffuseFont.mono, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }
                : { fontSize: 12, color: colors.textMuted, fontFamily: font.bodyMedium, marginTop: 2 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {onPress ? <ChevronRight size={16} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={diffuse ? 1.6 : 2} /> : null}
        </View>
      </Pressable>
      {children}
    </View>
  )
}
```

> Verify the relative import depth: `shared/` is `components/analytics/shared/`, so `constants/theme` is `../../../constants/theme` and `DiffuseKit` is `../../ui/diffuse/DiffuseKit`. Confirm against a sibling file (`BigChartCard.tsx`) before finalizing paths.

- [ ] **Step 2: Remove the local `Section` from PregnancyAnalytics** — delete the local `function Section(...)` definition and add `import { Section } from './shared/Section'` near the other shared imports (~line 63–69).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean except the known `KidsHome.tsx resolveSex` error. No new errors referencing `Section`.

- [ ] **Step 4: Visual smoke — pregnancy Insights unchanged** — in the simulator (pregnancy mode), open Insights and confirm the Mood Trend / Hydration / Nutrition / Movement / Top Symptoms section headers still render with title + subtitle + chevron exactly as before. (See Appendix A for the mode-switch procedure.)

- [ ] **Step 5: Commit**

```bash
git add components/analytics/shared/Section.tsx components/analytics/PregnancyAnalytics.tsx
git commit -m "refactor(analytics): extract Section wrapper into shared/"
```

---

## Task 2: Pure mood-trend mapper (`lib/moodTrend.ts`) — TDD

This isolates the only real logic in the MoodStrip extraction (normalizing cycle's `MoodId`/date rows into the strip's shape) so it can be unit-tested, keeping the component purely presentational.

**Files:**
- Create: `lib/moodTrend.ts`
- Test: `lib/__tests__/moodTrend.test.ts`

**Interfaces:**
- Produces: `export interface MoodStripDatum { date: string; value: string | null }`
- Produces: `export function cycleMoodToStrip(rows: { date: string; mood: string | null }[]): MoodStripDatum[]` — maps cycle rows 1:1 to strip data (renames `mood`→`value`, passes date through). Trivial today but the seam where any future MoodId→expression remap lives.
- Produces: `export function pregMoodToStrip(rows: { log_date: string; value: string | null }[]): MoodStripDatum[]` — maps `log_date`→`date`.

- [ ] **Step 1: Write the failing test**

```ts
import { cycleMoodToStrip, pregMoodToStrip } from '../moodTrend'

describe('moodTrend mappers', () => {
  it('cycleMoodToStrip renames mood→value, keeps date', () => {
    expect(cycleMoodToStrip([{ date: '2026-07-01', mood: 'good' }]))
      .toEqual([{ date: '2026-07-01', value: 'good' }])
  })
  it('cycleMoodToStrip passes null mood through', () => {
    expect(cycleMoodToStrip([{ date: '2026-07-02', mood: null }]))
      .toEqual([{ date: '2026-07-02', value: null }])
  })
  it('pregMoodToStrip renames log_date→date', () => {
    expect(pregMoodToStrip([{ log_date: '2026-07-03', value: 'okay' }]))
      .toEqual([{ date: '2026-07-03', value: 'okay' }])
  })
  it('both return empty array for empty input', () => {
    expect(cycleMoodToStrip([])).toEqual([])
    expect(pregMoodToStrip([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- moodTrend`
Expected: FAIL — cannot find module `../moodTrend`.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface MoodStripDatum {
  date: string
  value: string | null
}

export function cycleMoodToStrip(
  rows: { date: string; mood: string | null }[],
): MoodStripDatum[] {
  return rows.map((r) => ({ date: r.date, value: r.mood }))
}

export function pregMoodToStrip(
  rows: { log_date: string; value: string | null }[],
): MoodStripDatum[] {
  return rows.map((r) => ({ date: r.log_date, value: r.value }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- moodTrend`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/moodTrend.ts lib/__tests__/moodTrend.test.ts
git commit -m "feat(analytics): pure mood-trend mappers for shared MoodStrip"
```

---

## Task 3: Extract `MoodStrip` into shared/

**Files:**
- Create: `components/analytics/shared/MoodStrip.tsx`
- Modify: `components/analytics/PregnancyAnalytics.tsx` (remove local `MoodTrendStrip` ~lines 873–904; update the call site ~line 567 and import)

**Interfaces:**
- Consumes: `MoodStripDatum` from `lib/moodTrend`, `pregMoodToStrip` (Task 2).
- Produces: `export function MoodStrip({ data }: { data: MoodStripDatum[] }): JSX.Element` — renders up to the last 12 entries as mood blobs (Diffuse: `Character name="mood"`) / MoodFace (current) + short-day label.

- [ ] **Step 1: Create the shared file** — move the `MoodTrendStrip` body into `MoodStrip.tsx`, changing its prop type from `{ log_date; value }[]` to `MoodStripDatum[]` (`{ date; value }[]`) and referencing `e.date` instead of `e.log_date`. Keep `shortDay` (copy the helper in, or import if it's exported elsewhere — it is defined locally in PregnancyAnalytics, so copy it).

```tsx
import React from 'react'
import { View, Text } from 'react-native'
import { useTheme, diffuseFont, useDiffuseTheme } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { Character } from '../../characters/Characters'
import { MoodFace } from '../../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill, moodExpression, moodBlobFill } from '../../../lib/moodFace'
import type { MoodStripDatum } from '../../../lib/moodTrend'

function shortDay(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)
  } catch {
    return ''
  }
}

export function MoodStrip({ data }: { data: MoodStripDatum[] }) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const entries = data.slice(-12)
  return (
    <View style={[
      { borderRadius: 24, borderWidth: 1, padding: 16 },
      diffuse
        ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }
        : { backgroundColor: colors.surface, borderColor: 'rgba(20,19,19,0.10)' },
    ]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {entries.map((e, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 4 }}>
            {diffuse ? (
              <Character name="mood" size={28} face={moodExpression(e.value ?? undefined)} color={moodBlobFill(e.value ?? undefined)} />
            ) : (
              <MoodFace size={28} variant={moodFaceVariant(e.value ?? undefined)} fill={moodFaceFill(e.value ?? undefined)} />
            )}
            <Text style={diffuse
              ? { fontSize: 9, color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.4 }
              : { fontSize: 9, color: colors.textMuted, fontFamily: font.bodyMedium }}>
              {shortDay(e.date)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
```

> The original `MoodTrendStrip` used a `styles.moodStripCard` / `styles.moodStripRow` StyleSheet. Reproduce those inline (as above: radius 24, border, padding 16; row space-between) — confirm the exact values against `PregnancyAnalytics.tsx` styles before finalizing, and match them so pregnancy looks identical.

- [ ] **Step 2: Update PregnancyAnalytics** — remove the local `MoodTrendStrip`; add `import { MoodStrip } from './shared/MoodStrip'` and `import { pregMoodToStrip } from '../../lib/moodTrend'`; change the call site from `<MoodTrendStrip data={moodTrend} />` to `<MoodStrip data={pregMoodToStrip(moodTrend)} />`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean except known `KidsHome` error.

- [ ] **Step 4: Visual smoke — pregnancy mood strip unchanged** — pregnancy Insights → "Mood Trend" section renders the blob row + day letters identically to before.

- [ ] **Step 5: Commit**

```bash
git add components/analytics/shared/MoodStrip.tsx components/analytics/PregnancyAnalytics.tsx
git commit -m "refactor(analytics): extract MoodStrip into shared/, feed via mapper"
```

---

## Task 4: Cycle surface — phase-accent + hero chart → GlowAreaLine

**Files:**
- Modify: `components/analytics/CycleAnalytics.tsx` (accent derivation ~line 103; the trend `Pressable`/`flowCard` block ~lines 191–211; delete or bypass the local `CycleLengthTrend` for the Diffuse path)

**Interfaces:**
- Consumes: `GlowAreaLine` from `./shared/MiniCharts` — signature `GlowAreaLine({ data: number[]; color: string; color2?: string; height?; width?; labels?; unit? })`.
- Consumes: existing `history.cycles`, `history.avg`, `PHASE_ACCENT`, `info.phase`.

- [ ] **Step 1: Switch Diffuse accent to per-phase** — change line ~103 from
  `const accent = diffuse ? getDiffuseAccent('pre-pregnancy', dt.isDark) : PHASE_ACCENT[info.phase]`
  to
  `const accent = PHASE_ACCENT[info.phase]`
  so both variants use the live phase hue. (`getDiffuseAccent` import may become unused — remove it if so to keep typecheck/lint clean.)

- [ ] **Step 2: Replace the hero trend chart for Diffuse** — in the `flowCard` block, keep the outer `Pressable` + card + header row (kicker `cycleAnalytics_lengthTrendTitle` + avg read). Replace the `<CycleLengthTrend .../>` child, for the Diffuse path only, with `GlowAreaLine` fed the closed cycle lengths:

```tsx
// inside the flowCard, replacing the chart child under Diffuse:
{diffuse ? (
  <GlowAreaLine
    data={(history?.cycles ?? [])
      .filter((c) => c.lengthDays != null)
      .slice(-8)
      .map((c) => c.lengthDays as number)}
    color={accent}
  />
) : (
  <CycleLengthTrend
    cycles={history?.cycles ?? []}
    avg={history?.avg ?? null}
    color={accent}
  />
)}
```

> Keep `CycleLengthTrend` intact — the current/cream path still uses it. Only the Diffuse branch swaps to `GlowAreaLine`.
> Empty state: if fewer than 2 closed cycles, `GlowAreaLine` receives <2 points. Verify it degrades gracefully (renders a flat/empty chart, no crash). If it throws or looks broken, guard with the same `closed.length < 2` check the current trend uses and render the existing "Log a few periods…" copy instead.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean except known `KidsHome` error.

- [ ] **Step 4: Visual check — Diffuse cycle hero** — simulator in pre-pregnancy/Cycle mode (Appendix A), Insights tab:
  - Hero trend card shows the glow-area line in the phase accent (luteal → lilac).
  - Title/avg read intact. No clipping. Test light + dark.

- [ ] **Step 5: Commit**

```bash
git add components/analytics/CycleAnalytics.tsx
git commit -m "feat(cycle): phase-accent Diffuse + GlowAreaLine hero trend"
```

---

## Task 5: Cycle surface — stat grid → DiffuseStatCard

**Files:**
- Modify: `components/analytics/CycleAnalytics.tsx` (`GridTile` component + the `styles.grid` block ~lines 216–283)

**Interfaces:**
- Consumes: `DiffuseStatCard` from `../ui/diffuse/DiffusePrimitives` — accepts `{ label, value, sub?, icon?, iconNoBloom?, accent?, accent2?, onPress?, flex?, style? }`.

- [ ] **Step 1: Route GridTile through DiffuseStatCard under Diffuse** — modify the `GridTile` component so its Diffuse branch renders a `DiffuseStatCard` (label = the sub-copy uppercased or a short label, value = the stat value, icon = the existing `diffuseIcon`, accent = phase accent), with a half-width wrap style. Keep the current-variant branch as-is.

```tsx
// GridTile, Diffuse branch:
if (diffuse) {
  return (
    <DiffuseStatCard
      label={sub.toUpperCase()}
      value={value === '—' ? undefined : value}
      emptyLabel="—"
      icon={diffuseIcon}
      iconNoBloom
      accent={accent}
      onPress={onPress}
      style={{ width: '47%', flexGrow: 1 }}
    />
  )
}
// ...existing current-variant Pressable below unchanged
```

> `GridTile` must receive the phase `accent` — add an `accent: string` prop and pass it from every call site (all 8 tiles get the same screen accent). `DiffuseStatCard`'s `label` shows as the mono eyebrow and `value` as the serif number — this inverts cycle's current "value big, sub small" into pregnancy's "label eyebrow, value big" which is the intended parity. Confirm the sub-copy reads well as an uppercase eyebrow; if a sub is a full sentence (e.g. "opens in 3 days"), keep it as the `sub` prop instead and use a short static `label`. Decide per tile — see note.

- [ ] **Step 2: Set per-tile labels** — pregnancy tiles use short labels (`KICKS / DAY`, `SLEEP`). Give each cycle tile a short static label key and move the warm human copy to `sub`:
  - length → label `cycleAnalytics_tileLabel_length` ("CYCLE LENGTH"), sub = existing lengthSub
  - regularity → `cycleAnalytics_tileLabel_regularity` ("REGULARITY"), sub = regularSub
  - fertile → `cycleAnalytics_tileLabel_fertile` ("FERTILE WINDOW"), sub = fertileSub
  - bbt → `cycleAnalytics_tileLabel_bbt` ("BASAL TEMP"), sub = bbtSub
  - mucus → `cycleAnalytics_tileLabel_mucus` ("CERVICAL MUCUS"), sub = mucusSub
  - pms → `cycleAnalytics_tileLabel_pms` ("SYMPTOM DAYS"), sub = pmsSub
  - mood → `cycleAnalytics_tileLabel_mood` ("MOOD"), sub = moodSub
  - intercourse → `cycleAnalytics_tileLabel_intercourse` ("INTIMACY"), sub = intercourseSub

  Add all 8 keys to `lib/i18n/en.ts`.

- [ ] **Step 3: i18n check**

Run: `npm run i18n:check`
Expected: no missing-key errors for the new `cycleAnalytics_tileLabel_*` keys.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: clean except known `KidsHome` error.

- [ ] **Step 5: Visual check — Diffuse cycle grid** — grid tiles now read as `DiffuseStatCard`s (eyebrow label + serif value + soft bloom), wrap two-per-row, phase accent, blob icons intact, all tappable. Light + dark.

- [ ] **Step 6: Commit**

```bash
git add components/analytics/CycleAnalytics.tsx lib/i18n/en.ts
git commit -m "feat(cycle): stat grid uses DiffuseStatCard for pregnancy parity"
```

---

## Task 6: Cycle surface — add two titled sections

**Files:**
- Modify: `components/analytics/CycleAnalytics.tsx` (insert sections between grid and `RecentCyclesCard` ~line 285; imports)
- Modify: `lib/i18n/en.ts` (section titles/subtitles)

**Interfaces:**
- Consumes: `Section` (Task 1), `MoodStrip` (Task 3), `cycleMoodToStrip` (Task 2), `BeadedThread` from `./shared/MiniCharts` (`{ data: number[]; color; accent?; labels?; height?; showValues? }`), the `bbt` and `mood` data already fetched (`useBBTStats`, `useMoodStats`).
- Note: `CycleAnalytics` already calls `useBBTStats()` (`bbt`) and `useMoodStats()` (`mood`). Reuse those — do NOT add new hooks. Confirm `mood` exposes recent per-day rows; if `useMoodStats` only returns aggregates, use its `recent` array (seen in `MoodDetail`: `data.recent` with `{ date, mood }`).

- [ ] **Step 1: Add imports** — `import { Section } from './shared/Section'`, `import { MoodStrip } from './shared/MoodStrip'`, `import { cycleMoodToStrip } from '../../lib/moodTrend'`, and add `BeadedThread` to the existing `./shared/MiniCharts` import.

- [ ] **Step 2: Insert the two gated sections** (Diffuse only — wrap in `{diffuse && (...)}` since these use Diffuse charts) before `<RecentCyclesCard>`:

```tsx
{diffuse && bbt?.series && bbt.series.length >= 2 && (
  <Section
    title={t('cycleAnalytics_section_rhythm_title')}
    subtitle={t('cycleAnalytics_section_rhythm_sub')}
    onPress={() => setDetailType('bbt')}
  >
    <BeadedThread
      data={bbt.series.map((s) => s.temp)}
      color={accent}
      accent={accent}
    />
  </Section>
)}

{diffuse && mood?.recent && mood.recent.length > 0 && (
  <Section
    title={t('cycleAnalytics_section_mood_title')}
    subtitle={t('cycleAnalytics_section_mood_sub')}
    onPress={() => setDetailType('mood')}
  >
    <MoodStrip data={cycleMoodToStrip(mood.recent.map((r) => ({ date: r.date, mood: r.mood })))} />
  </Section>
)}
```

> Verify the exact shape of `bbt.series` items (`{ temp, cycleDay }` per `BBTDetail`) and `mood.recent` items (`{ date, mood }` per `MoodDetail`) in `lib/cycleAnalytics.ts` before wiring; adjust the `.map` accessors to match. If `BeadedThread` expects a specific value range, pass raw temps (it auto-scales like the other MiniCharts — confirm by reading its impl at `MiniCharts.tsx:864`).

- [ ] **Step 3: Add i18n keys** to `lib/i18n/en.ts`:
  - `cycleAnalytics_section_rhythm_title`: "This Cycle's Rhythm"
  - `cycleAnalytics_section_rhythm_sub`: "Basal temperature, day by day"
  - `cycleAnalytics_section_mood_title`: "Mood This Cycle"
  - `cycleAnalytics_section_mood_sub`: "How you've felt recently"

- [ ] **Step 4: i18n + typecheck**

Run: `npm run i18n:check && npm run typecheck`
Expected: no missing keys; typecheck clean except known `KidsHome` error.

- [ ] **Step 5: Visual check** — with BBT + mood logs present, both sections appear between grid and recent cycles, tappable (→ correct sheet), phase accent. With NO bbt/mood logs, neither section renders (no empty cards). Verify both states (seed data if needed via dev tools).

- [ ] **Step 6: Commit**

```bash
git add components/analytics/CycleAnalytics.tsx lib/i18n/en.ts
git commit -m "feat(cycle): add Rhythm (BBT) + Mood titled sections"
```

---

## Task 7: Cycle surface — thread phase accent into the detail sheet + recent-cycles polish

**Files:**
- Modify: `components/analytics/CycleAnalytics.tsx` (the `<CycleDetailSheet>` render ~line 294; `RecentCyclesCard` spacing)

**Interfaces:**
- Produces (consumed by Task 8): `CycleDetailSheet` gains an `accent?: string` prop. When omitted it falls back to today's behavior.

- [ ] **Step 1: Pass accent to the sheet** — change `<CycleDetailSheet type={detailType} onClose={() => setDetailType(null)} />` to `<CycleDetailSheet type={detailType} accent={accent} onClose={() => setDetailType(null)} />`. (The prop is added in Task 8; this step wires the caller — order tasks so 8 lands before this compiles, OR add the optional prop signature in Task 8 first. Recommended execution order: do Task 8 before Task 7's step 1, or combine. See note.)

> **Execution note:** Task 8 adds the `accent` prop to `CycleDetailSheet`. To keep every commit typecheck-clean, execute **Task 8 before Task 7**, or fold Task 7 Step 1 into Task 8. The plan lists them separately for reviewability; the implementer should sequence 8→7 or merge.

- [ ] **Step 2: Recent-cycles spacing polish** — align `RecentCyclesCard`'s `marginTop`/internal spacing to the new `Section` rhythm (Sections use `marginTop: 24`). Set the recent card's container `marginTop` to 24 for visual consistency. No structural change.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean except known `KidsHome` error (assuming Task 8 done first).

- [ ] **Step 4: Visual check** — spacing between grid → sections → recent cycles is even; tapping any tile opens a sheet tinted with the phase accent (verified fully in Task 9).

- [ ] **Step 5: Commit**

```bash
git add components/analytics/CycleAnalytics.tsx
git commit -m "feat(cycle): thread phase accent to detail sheet; align recent-cycles spacing"
```

---

## Task 8: Detail sheets — DiffuseSheet shell + accent prop

**Files:**
- Modify: `components/analytics/CycleDetailSheets.tsx` (`CycleDetailSheet` wrapper ~lines 36–71; add `accent` prop; per-type chip)
- Modify: `lib/i18n/en.ts` (chip strings)

**Interfaces:**
- Consumes: `DiffuseSheet` from `../ui/diffuse/DiffusePrimitives` — `{ visible, title, onClose, children, chip?, right?, scroll? }`.
- Produces: `CycleDetailSheet({ type, accent, onClose })` — Diffuse renders inside `DiffuseSheet`; current renders inside `LogSheet` (unchanged). An `accent` value is provided via React context or prop-drill to each body (see Step 3).

- [ ] **Step 1: Add `accent` prop + chip map** — extend `Props` with `accent?: string`. Add a per-type chip label map (short eyebrow):

```tsx
const CHIPS: Record<CycleDetailType, string> = {
  cycleLength: t('cycleDetail_chip_rhythm'),   // "RHYTHM"
  regularity:  t('cycleDetail_chip_steadiness'),// "STEADINESS"
  pms:         t('cycleDetail_chip_symptoms'),  // "SYMPTOMS"
  fertile:     t('cycleDetail_chip_window'),    // "WINDOW"
  mood:        t('cycleDetail_chip_feeling'),   // "FEELING"
  bbt:         t('cycleDetail_chip_thermal'),   // "THERMAL"
  mucus:       t('cycleDetail_chip_signs'),     // "SIGNS"
  intercourse: t('cycleDetail_chip_timing'),    // "TIMING"
}
```

- [ ] **Step 2: Branch the shell on Diffuse** — when `useIsDiffuse()`, render the body inside `DiffuseSheet` (title = existing `TITLES[type]`, `chip={CHIPS[type]}`); else keep `LogSheet` exactly as today. Both render the same `{type === ...}` body switch.

```tsx
const diffuse = useIsDiffuse()
// ...
if (diffuse) {
  return (
    // Pass the raw `accent` through as-is; each body's usePhaseAccent() supplies
    // the getDiffuseAccent fallback when accent is null. Do NOT compute the
    // fallback here (the wrapper shouldn't need useDiffuseTheme just for that).
    <DiffuseSheet visible={visible} title={title} chip={type ? CHIPS[type] : undefined} onClose={onClose}>
      <AccentContext.Provider value={accent ?? null}>
        {bodySwitch}
      </AccentContext.Provider>
    </DiffuseSheet>
  )
}
return (
  <LogSheet visible={visible} title={title} onClose={onClose}>
    <ScrollView ...>{bodySwitch}</ScrollView>
  </LogSheet>
)
```

- [ ] **Step 3: Provide accent to bodies via context** — add a module-level `const AccentContext = React.createContext<string | null>(null)` and a `function usePhaseAccent()` hook that returns `useContext(AccentContext) ?? getDiffuseAccent('pre-pregnancy', dt.isDark)`. Bodies that currently call `getDiffuseAccent('pre-pregnancy', dt.isDark)` inline switch to `usePhaseAccent()`. This avoids prop-drilling into all 8 bodies.

> This is a presentational context, no data. Keep it local to `CycleDetailSheets.tsx`.

- [ ] **Step 4: Add chip i18n keys** — add the 8 `cycleDetail_chip_*` keys to `lib/i18n/en.ts`.

- [ ] **Step 5: i18n + typecheck**

Run: `npm run i18n:check && npm run typecheck`
Expected: no missing keys; typecheck clean except known `KidsHome` error.

- [ ] **Step 6: Visual check** — every cycle tile now opens a `DiffuseSheet` (taller, eyebrow chip, handle) in Diffuse; content still correct. Current variant still uses `LogSheet`.

- [ ] **Step 7: Commit**

```bash
git add components/analytics/CycleDetailSheets.tsx lib/i18n/en.ts
git commit -m "feat(cycle): detail sheets use DiffuseSheet shell + phase accent context"
```

---

## Task 9: Detail sheets — chart upgrades + metric-tile restyle

**Files:**
- Modify: `components/analytics/CycleDetailSheets.tsx` (`CycleLengthDetail`, `BBTDetail`, `StatChip`)

**Interfaces:**
- Consumes: `GlowAreaLine`, `BeadedThread` from `./shared/MiniCharts`; `DiffuseMetricTile` from `../ui/diffuse/DiffusePrimitives`; `usePhaseAccent` (Task 8).

- [ ] **Step 1: cycleLength chart → GlowAreaLine (Diffuse)** — in `CycleLengthDetail`, the Diffuse path swaps `MiniBarChart` for `GlowAreaLine`:

```tsx
{diffuse ? (
  <GlowAreaLine data={values} color={usePhaseAccent()} />
) : (
  <MiniBarChart data={values} labels={labels} color={stickers.pink} />
)}
```

- [ ] **Step 2: bbt chart → BeadedThread (Diffuse)** — in `BBTDetail`, Diffuse path swaps `MiniLineChart` for `BeadedThread`:

```tsx
{diffuse ? (
  <BeadedThread data={temps} color={usePhaseAccent()} accent={usePhaseAccent()} labels={labels} showValues />
) : (
  <MiniLineChart data={temps} labels={labels} color={stickers.pink} unit={degLabel} />
)}
```

- [ ] **Step 3: StatChip → DiffuseMetricTile look (Diffuse)** — in `StatChip`, the Diffuse branch renders a `DiffuseMetricTile` (`value`, `label`) instead of the custom box; current branch unchanged. `DiffuseMetricTile` signature: `{ value, label, icon?, highlighted?, style? }`.

```tsx
if (diffuse) {
  return <DiffuseMetricTile value={value} label={label} style={{ flex: 1 }} />
}
// existing current-variant chip below
```

- [ ] **Step 4: Replace inline accent calls** — anywhere in these bodies still calling `getDiffuseAccent('pre-pregnancy', dt.isDark)` for chart/bar hues, switch to `usePhaseAccent()` so the sheet matches the surface phase accent.

- [ ] **Step 5: i18n + typecheck**

Run: `npm run i18n:check && npm run typecheck`
Expected: clean except known `KidsHome` error.

- [ ] **Step 6: Visual check** — open cycleLength sheet → glow-area chart in phase accent; bbt sheet → beaded thread; stat chips read as metric tiles. All other sheets (regularity/pms/fertile/mood/mucus/intercourse) still render, with bars/dots now in phase accent. Light + dark.

- [ ] **Step 7: Commit**

```bash
git add components/analytics/CycleDetailSheets.tsx
git commit -m "feat(cycle): detail-sheet chart upgrades (GlowAreaLine, BeadedThread) + metric tiles"
```

---

## Task 10: Tab rename

**Files:**
- Modify: `lib/modeConfig.ts:51`

- [ ] **Step 1: Rename the label** — change `vault: { visible: true, label: 'Analytics', icon: 'bar-chart-outline' }` to `label: 'Insights'`.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean except known `KidsHome` error.

- [ ] **Step 3: Visual check** — pre-pregnancy mode, bottom tab bar reads "Insights" (matching pregnancy/kids).

- [ ] **Step 4: Commit**

```bash
git add lib/modeConfig.ts
git commit -m "feat(cycle): rename pre-pregnancy tab Analytics -> Insights"
```

---

## Task 11: Full-screen verification pass (light + dark, both variants)

**Files:** none (verification only)

- [ ] **Step 1: Diffuse cycle Insights, light** — hero glow chart, DiffuseStatCard grid, both sections (with seeded data), recent cycles, all in luteal/phase accent. No clipping, no empty cards for no-data states.
- [ ] **Step 2: Diffuse cycle Insights, dark** — repeat; confirm tokens flip correctly, no invisible text.
- [ ] **Step 3: Every tile → sheet** — open all 8 (7 non-TTC + intercourse if TTC) detail sheets; each is a DiffuseSheet with chip, phase accent, correct data, cycleLength/bbt charts upgraded.
- [ ] **Step 4: Pregnancy Insights regression** — confirm Section headers + Mood strip still render identically (shared extraction didn't break pregnancy).
- [ ] **Step 5: Current/cream variant regression** — flip Dev Panel → DESIGN VARIANT to `current`; confirm cycle analytics still renders on the old components (GridTile, CycleLengthTrend, LogSheet) with no errors.
- [ ] **Step 6: Final typecheck + tests**

Run: `npm run typecheck && npm test -- moodTrend`
Expected: typecheck clean except known `KidsHome` error; moodTrend tests pass.

- [ ] **Step 7: No commit** — verification only. If any issue found, fix in the owning task's file and commit with a `fix(cycle):` message.

---

## Appendix A — Simulator mode-switching (unblock from prior session)

The prior session was blocked switching the sim to Cycle mode. Resolve before Task 4's visual checks:
- Journey mode lives in `useModeStore` (persisted via AsyncStorage). `ModeSwitcher` (on the Home screen) calls `setMode`.
- **If the UI trigger can't be found:** ask the user how they switch modes, OR set mode directly for testing via the Dev Panel (if it exposes a mode control), OR temporarily default the store to `'pre-pregnancy'` during dev (revert before commit). Confirm the chosen method with the user — this was an explicit prior blocker.
- Confirm the persisted mode is `pre-pregnancy` and the bottom tab shows the cycle/Insights surface before running visual checks.

## Self-Review notes (addressed)

- **Spec coverage:** §1 extraction → Tasks 1–3; §2 surface → Tasks 4–7; §3 sheets → Tasks 8–9; §4 rename → Task 10; risks (i18n, empty states, sim verification) → i18n steps throughout, gating in Task 6, Appendix A + Task 11.
- **Type consistency:** `MoodStripDatum`/`cycleMoodToStrip`/`pregMoodToStrip` (Task 2) consumed consistently in Tasks 3, 6. `accent` prop on `CycleDetailSheet` (Task 7↔8) — flagged execution order 8→7. `usePhaseAccent` defined Task 8, used Task 9.
- **Placeholder scan:** no TBD/TODO; every code step shows code; verification steps give exact commands + expected output.
- **Known caveat:** several steps say "confirm exact shape/values against the current file before finalizing" — these are deliberate guards for verbatim-copy fidelity (extraction) and hook-shape assumptions, not placeholders; the concrete code to write is fully specified.
