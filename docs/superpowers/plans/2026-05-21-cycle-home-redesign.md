# Cycle (Pre-Pregnancy) Home Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the pre-pregnancy / cycle home for TTC users — replace the dark plum hero, illustrative hormones card, yellow wisdom card, and footer fertile-window strip with a compact ring hero, log-aware fertility surfaces, fixed pillar contrast, and a working "See all" link.

**Architecture:** Three vertical slices (cosmetics + pillar rebuild → real fertility logging → smart layer). Each slice ships standalone and is verifiable on TestFlight. Slices 1+2 touch no edge functions; Slice 3 extends `scan-image` with a `cycle_test` mode.

**Tech Stack:** React Native 0.81 + Expo SDK 54 + React 19, Expo Router v6, Zustand v5 (named import), TanStack React Query v5 (object syntax), Supabase Postgres + RLS + Deno edge functions, TypeScript strict, NativeWind 4 + StyleSheet, react-native-reanimated v4.

---

## Working agreements

- **User works on `main`** — do not create worktrees or feature branches.
- **Commit + push after every batch.** The PostToolUse `tsc-check` hook will block commits with TS errors; the PreToolUse `supabase-guard` hook blocks destructive SQL unless the command line begins with `# --i-know-what-im-doing`.
- **Design tokens only.** Import everything from `constants/theme.ts`. No raw hex in JSX (only in sticker SVG path strings). Cards `radius.lg` (28), buttons `radius.full` (999), inputs `radius.md` (20–24).
- **Light theme default.** No `CosmicBackground`, no `shadows.glow*`, no `GlassCard`, no Cabinet Grotesk / Satoshi.
- **`profiles.id` IS the auth user UUID.** Never `.eq('user_id', ...)` on `profiles`.
- **Local dates only.** Use `toDateStr(new Date())` from `lib/cycleLogic.ts` for any date string. Never `toISOString().split('T')[0]`.
- **Cycle log schema reality.** The `cycle_logs` table uses `(id, user_id, date, type, value, notes, created_at)` — a single text `value` column. The original spec assumed `numeric_value` / `picker_value` columns; this plan instead extends the CHECK with new `type` values and adds **only** `scan_url text` for OPK scans. BBT goes to `type='basal_temp'`, `value=<°C as string>`. LH `type='lh'`, `value='negative'|'faint'|'positive'|'peak'`. CM `type='cervical_mucus'`, `value='dry'|'sticky'|'creamy'|'watery'|'eggwhite'`. Intercourse `type='intercourse'`, `value='unprotected'|'protected'`. OPK scan `type='opk_scan'`, `value` = classification, `scan_url` = signed URL.
- **Anthropic API never called from app** — Slice 3 changes hit `supabase/functions/scan-image/index.ts` (Deno: `@ts-nocheck` + `Deno.env.get` + URL imports).
- **Reanimated**: never reach into shared values from JS without `useDerivedValue` / `runOnJS`. See `PregnancyJourneyRing.tsx` for the canonical pan-responder pattern.
- **i18n**: every user-visible string lives in `lib/i18n/keys.ts` + `lib/i18n/en.ts`. Non-English locales ship English fallbacks per the existing 7-wave pattern.

---

## File structure

### New files (Slice 1)
| File | Responsibility |
|---|---|
| `lib/cycleNudges.ts` | Static template bank + picker (`pickCycleNudge`). Slice 1 is phase-only; Slice 3 reads logs. |
| `components/home/cycle/DailyNudgeCard.tsx` | Cream-paper nudge card with rose sticker + Fraunces headline + CTA. |
| `app/cycle-pillars.tsx` | 2-column grid of 6 `prePregPillars`. |
| `components/home/cycle/CycleJourneyRing.tsx` | 170px circular ring with 28 day-stickers; left-column phase copy. |

### New files (Slice 2)
| File | Responsibility |
|---|---|
| `supabase/migrations/<ts>_cycle_signal_logs.sql` | Extends `cycle_logs.type` CHECK + adds `scan_url` column. |
| `components/calendar/CycleLogForms.tsx` | BBT spinner / LH 4-option / CM 5-option / Intercourse toggle bottom sheets. |
| `components/home/cycle/FertilitySignalsCard.tsx` | 4 tiles + 7-day BBT sparkline + 3 states. |
| `components/home/cycle/FertileWindowCard.tsx` | Big % + status pill + 7-day forecast + footer. |
| `components/home/cycle/FertileWindowModal.tsx` | Bottom sheet: countdown / forecast / quick-log / confidence / history. |
| `components/home/cycle/MoodSymptomStrip.tsx` | 32px mood face + 3–4 visible symptom chips + `+ more`. |
| `components/home/cycle/MoodSymptomPickerSheet.tsx` | Full picker sheet for symptoms. |

### Modified files
- `components/home/CycleHome.tsx` — recompose section order
- `components/home/cycle/CyclePillarsGrid.tsx` — line 54: route `'/library'` → `'/cycle-pillars'`
- `app/pillar/[id].tsx` — drop `CosmicBackground`, switch to `useTheme()` hook, sticker hero, `PillButton` chips
- `lib/cycleLogic.ts` — add `dailyFertilityCurve(cycleDay, cycleLength): number[]`
- `lib/i18n/keys.ts` + `lib/i18n/en.ts` (and 12 locales) — ~60 new cycle keys
- `components/home/cycle/CycleHomeDetailSheets.tsx` — prune hormone/wisdom/fertile bodies (kept for the `cycle` sheet only)

### Deleted files
- `components/home/cycle/YourCycleCard.tsx`
- `components/home/cycle/HormonesCard.tsx`
- `components/home/cycle/WisdomCard.tsx`
- `components/home/cycle/FertileWindowStrip.tsx`

### Slice 3 modifications
- `lib/cycleNudges.ts` — add predicate engine + 6 log-aware templates
- `components/home/cycle/FertileWindowModal.tsx` — wire confidence math
- `supabase/functions/scan-image/index.ts` — `cycle_test` mode branch
- `components/home/cycle/FertilitySignalsCard.tsx` — scan tile (extends the LH/OPK tile)

---

## Verification matrix

Each batch has a **typecheck + manual UI** verification block. Manual UI runs locally:

```bash
npx expo start --clear
# in another terminal:
npx tsc --noEmit
```

iOS simulator path: tap "Cycle" mode chip on home → exercise the affected card.

---

# Batch 0 — Preflight

Set the workspace up so every later batch can ship with `git push` + a passing typecheck.

- [ ] **Step 1: Confirm working directory is clean except for the spec/plan dir**

```bash
git status --short
```

Expected: untracked files are limited to `.claude/settings.local.json`, `docs/superpowers/`, `supabase/.temp/cli-latest`. No stray edits in `components/` or `app/`.

- [ ] **Step 2: Confirm Node + Expo toolchain healthy**

```bash
node -v          # expect v20.x or later
npx expo --version
```

If anything errors, stop and ask the user to run `npm install` before proceeding.

- [ ] **Step 3: Baseline typecheck (no edits yet)**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: any errors here are pre-existing — record them so you can tell which errors your changes introduced vs. inherited.

- [ ] **Step 4: Verify Supabase CLI is logged into the production project**

```bash
supabase projects list 2>&1 | head -10
```

Expected: the `icohpzzfpabzvwuumcct` project is visible. If not, stop and ask the user — Slice 2 needs `supabase db push`.

- [ ] **Step 5: Note the current branch + HEAD SHA so we can `git revert` cleanly if a batch goes sideways**

```bash
git rev-parse HEAD
git branch --show-current  # expect: main
```

- [ ] **Step 6: No commit in this batch.** Move on.

---

# SLICE 1 — Home cosmetics + pillar rebuild

Goal: the loudest visual gaps fixed first. **No migration. No new logging.** Each batch leaves the app in a shippable state.

---

## Batch 1 — `lib/cycleNudges.ts` template bank + i18n keys

Static template bank keyed by phase only. Slice 3 will extend it with log-aware predicates.

> **Evolution note:** Slice 1 ships `pickCycleNudge(phase: CyclePhase)`. **Batch 14** changes the signature to `pickCycleNudge(ctx: NudgeContext)` and adds 5 new templates. Don't get confused by the signature change between slices — it's intentional. `DailyNudgeCard` is updated at the same time.

**Files:**
- Create: `lib/cycleNudges.ts`
- Modify: `lib/i18n/keys.ts` (add ~15 cycle nudge keys)
- Modify: `lib/i18n/en.ts` (English values for those keys)

- [ ] **Step 1: Create `lib/cycleNudges.ts`**

```ts
/**
 * Cycle nudge template bank — picks today's headline + body + CTA based on
 * the user's cycle phase.
 *
 * v1 (Slice 1): phase-only. Slice 3 adds log-aware predicates.
 *
 * Each template has:
 *   - headlineKey:  Fraunces serif headline (one italic phrase wrapped in *…*)
 *   - bodyKey:      muted body copy
 *   - pillarId?:    pre-preg pillar id for the "Read more →" CTA
 *   - logShortcut?: log type to open ('bbt' | 'lh' | 'cm' | 'intercourse')
 */

import type { CyclePhase } from './cycleLogic'

export type CycleNudgeTemplate = {
  id: string
  headlineKey: string
  bodyKey: string
  pillarId?: string
  logShortcut?: 'bbt' | 'lh' | 'cm' | 'intercourse'
}

export const CYCLE_NUDGE_TEMPLATES: CycleNudgeTemplate[] = [
  {
    id: 'menstruation-rest',
    headlineKey: 'cycle_nudge_menstruation_headline',
    bodyKey: 'cycle_nudge_menstruation_body',
    pillarId: 'fertility',
  },
  {
    id: 'follicular-energy',
    headlineKey: 'cycle_nudge_follicular_headline',
    bodyKey: 'cycle_nudge_follicular_body',
    pillarId: 'nutrition-prep',
  },
  {
    id: 'ovulation-window',
    headlineKey: 'cycle_nudge_ovulation_headline',
    bodyKey: 'cycle_nudge_ovulation_body',
    pillarId: 'fertility',
  },
  {
    id: 'luteal-care',
    headlineKey: 'cycle_nudge_luteal_headline',
    bodyKey: 'cycle_nudge_luteal_body',
    pillarId: 'emotional-readiness',
  },
]

/** Pick today's nudge for the given phase. Phase-only in Slice 1. */
export function pickCycleNudge(phase: CyclePhase): CycleNudgeTemplate {
  switch (phase) {
    case 'menstruation': return CYCLE_NUDGE_TEMPLATES[0]
    case 'follicular':   return CYCLE_NUDGE_TEMPLATES[1]
    case 'ovulation':    return CYCLE_NUDGE_TEMPLATES[2]
    case 'luteal':       return CYCLE_NUDGE_TEMPLATES[3]
  }
}
```

- [ ] **Step 2: Add nudge keys to `lib/i18n/keys.ts`**

Locate the last `cycle_*` key in the file (search for `cycle_`) and insert these underneath:

```ts
  cycle_nudge_menstruation_headline: 'Rest is *fertility work* too',
  cycle_nudge_menstruation_body: 'Period day. Your body is starting the next cycle\'s lead follicle selection right now. Warm food, deep sleep — the work is happening even when it doesn\'t feel like it.',
  cycle_nudge_follicular_headline: 'Energy is on the *rise*',
  cycle_nudge_follicular_body: 'Estrogen is climbing. Skin, mood, libido — this is the build phase. Great window for strength work, planning, social plans.',
  cycle_nudge_ovulation_headline: 'Window *open*',
  cycle_nudge_ovulation_body: 'Peak fertility. If you\'re trying, today and the next two days are your best window of the cycle.',
  cycle_nudge_luteal_headline: 'PMS is *hormonal*, not personal',
  cycle_nudge_luteal_body: 'Progesterone is dropping. Magnesium-rich food (dark chocolate, almonds, bananas) + a walk before bed help more than you\'d think.',
  cycle_nudge_label: "TODAY'S NUDGE",
  cycle_nudge_from: 'From',
  cycle_nudge_read_more: 'Read more →',
  cycle_pillar_fertility: 'Fertility Basics',
  cycle_pillar_nutrition_prep: 'Nutrition Prep',
  cycle_pillar_emotional_readiness: 'Emotional Readiness',
  cycle_pillar_financial_planning: 'Financial Planning',
  cycle_pillar_partner_journey: 'Partner Journey',
  cycle_pillar_health_checkups: 'Health Checkups',
```

The exact location: after the existing `cycle_phase_*` block. If you can't find a `cycle_` block, append before the first `pregnancy_*` block.

- [ ] **Step 3: Add the same keys to `lib/i18n/en.ts`**

Append the same block (copying both keys and English values verbatim). Non-English locales (`ar.ts`, `de.ts`, etc.) **do not** get touched this batch — they fall back to English via the i18n resolver. The user has a separate translation workflow per `MEMORY.md`.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "cycleNudges|i18n" | head -20
```

Expected: no new errors. Pre-existing errors elsewhere are ignored.

- [ ] **Step 5: Commit**

```bash
git add lib/cycleNudges.ts lib/i18n/keys.ts lib/i18n/en.ts
git commit -m "feat(cycle): nudge template bank + i18n keys (slice 1)"
git push origin main
```

---

## Batch 2 — `DailyNudgeCard.tsx`

Cream-paper card with `TODAY'S NUDGE` label, rose sticker top-right, Fraunces serif headline (one italic phrase), muted body, footer with pillar tag + rose `Read more →`. Replaces `WisdomCard` visually — Batch 6 wires it into `CycleHome`.

**Files:**
- Create: `components/home/cycle/DailyNudgeCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
/**
 * DailyNudgeCard — full-width nudge on the cycle home.
 *
 * Replaces the legacy yellow WisdomCard with a cream-paper PaperCard.
 * In Slice 1 the picker keys off phase only; Slice 3 makes it log-aware.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Heart } from '../../ui/Stickers'
import { PaperCard } from '../../ui/PaperCard'
import { useTheme } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import type { CyclePhase } from '../../../lib/cycleLogic'
import { pickCycleNudge } from '../../../lib/cycleNudges'

interface Props {
  phase: CyclePhase
}

const PILLAR_LABEL_KEY: Record<string, string> = {
  'fertility': 'cycle_pillar_fertility',
  'nutrition-prep': 'cycle_pillar_nutrition_prep',
  'emotional-readiness': 'cycle_pillar_emotional_readiness',
  'financial-planning': 'cycle_pillar_financial_planning',
  'partner-journey': 'cycle_pillar_partner_journey',
  'health-checkups': 'cycle_pillar_health_checkups',
}

/**
 * Renders the headline with the *…* italic span as Fraunces italic.
 */
function renderHeadline(s: string, baseColor: string, accentColor: string, font: ReturnType<typeof useTheme>['font']) {
  const m = s.match(/^(.*?)\*(.+?)\*(.*)$/)
  if (!m) {
    return <Text style={{ fontFamily: font.display, fontSize: 22, color: baseColor, lineHeight: 26 }}>{s}</Text>
  }
  const [, pre, accent, post] = m
  return (
    <Text style={{ fontFamily: font.display, fontSize: 22, color: baseColor, lineHeight: 26 }}>
      {pre}
      <Text style={{ fontFamily: font.italic, color: accentColor }}>{accent}</Text>
      {post}
    </Text>
  )
}

export function DailyNudgeCard({ phase }: Props) {
  const { colors, stickers, brand, font, radius, isDark } = useTheme()
  const { t } = useTranslation()
  const nudge = pickCycleNudge(phase)
  const ink = isDark ? colors.text : '#141313'
  const accent = isDark ? '#EFA2C2' : brand.prePregnancy

  function handlePress() {
    if (nudge.pillarId) router.push(`/pillar/${nudge.pillarId}` as any)
  }

  return (
    <Pressable onPress={handlePress} accessibilityRole="button" accessibilityLabel={t('cycle_nudge_label' as any)}>
      <PaperCard radius={radius.lg} padding={16} style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>
            {t('cycle_nudge_label' as any)}
          </Text>
          <View style={[styles.stickerChip, { backgroundColor: stickers.pinkSoft, borderColor: ink }]}>
            <Heart size={18} fill={stickers.pink} />
          </View>
        </View>

        <View style={styles.body}>
          {renderHeadline(t(nudge.headlineKey as any), ink, accent, font)}
          <Text style={[styles.text, { color: colors.textMuted, fontFamily: font.body }]} numberOfLines={4}>
            {t(nudge.bodyKey as any)}
          </Text>
        </View>

        {nudge.pillarId && (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={[styles.from, { color: colors.textMuted, fontFamily: font.bodyBold }]}>
              {t('cycle_nudge_from' as any)} · {t(PILLAR_LABEL_KEY[nudge.pillarId] as any)}
            </Text>
            <Text style={[styles.cta, { color: accent, fontFamily: font.bodyBold }]}>
              {t('cycle_nudge_read_more' as any)}
            </Text>
          </View>
        )}
      </PaperCard>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  stickerChip: {
    width: 32, height: 32, borderRadius: 999, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { gap: 6, marginTop: 2 },
  text: { fontSize: 13, lineHeight: 19 },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingTop: 10, borderTopWidth: 1,
  },
  from: { fontSize: 10, letterSpacing: 1.3, textTransform: 'uppercase' },
  cta: { fontSize: 11, letterSpacing: 0.3 },
})
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "DailyNudgeCard" | head
```

Expected: no errors.

- [ ] **Step 3: Smoke test (no wiring yet)**

The component isn't mounted yet (Batch 6 wires it). Verify there's no orphan import error by listing the file:

```bash
ls -1 components/home/cycle/DailyNudgeCard.tsx
```

- [ ] **Step 4: Commit**

```bash
git add components/home/cycle/DailyNudgeCard.tsx
git commit -m "feat(cycle): DailyNudgeCard cream-paper component"
git push origin main
```

---

## Batch 3 — `app/cycle-pillars.tsx` + fix `CyclePillarsGrid` "See all"

A new 2-column index of all 6 pre-preg pillars. Then patch `CyclePillarsGrid` so the home card's "See all" link routes here instead of `/library`.

**Files:**
- Create: `app/cycle-pillars.tsx`
- Modify: `components/home/cycle/CyclePillarsGrid.tsx:54`

- [ ] **Step 1: Create `app/cycle-pillars.tsx`**

```tsx
/**
 * /cycle-pillars — index of all 6 pre-pregnancy pillars.
 *
 * Reached via the "See all" link on CyclePillarsGrid.
 * Each tile routes to /pillar/[id].
 */

import { View, ScrollView, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../constants/theme'
import { prePregPillars } from '../lib/prePregPillars'
import { getPillarSticker } from '../lib/pillarStickerMap'
import { Display, Body } from '../components/ui/Typography'

const TINT_BY_INDEX = ['greenSoft', 'lilacSoft', 'peachSoft', 'blueSoft', 'yellowSoft', 'pinkSoft'] as const

export default function CyclePillarsIndex() {
  const insets = useSafeAreaInsets()
  const { colors, stickers, font, radius, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'

  function tintFor(i: number): string {
    const key = TINT_BY_INDEX[i % TINT_BY_INDEX.length]
    return (stickers as any)[key]
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={22} color={ink} />
        </Pressable>

        <Display size={32} color={ink}>Cycle pillars</Display>
        <Text style={[styles.subtitle, { color: stickers.coral, fontFamily: font.italic }]}>
          six places to start your prep
        </Text>

        <View style={styles.grid}>
          {prePregPillars.map((p, i) => {
            const Sticker = getPillarSticker(p.id)
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/pillar/${p.id}` as any)}
                style={({ pressed }) => [
                  styles.tile,
                  { backgroundColor: tintFor(i), borderColor: colors.border, borderRadius: radius.lg },
                  pressed && { transform: [{ scale: 0.97 }], opacity: 0.95 },
                ]}
              >
                <View style={[styles.stickerChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {Sticker ? <Sticker size={28} /> : <Text style={{ fontSize: 24 }}>{p.icon}</Text>}
                </View>
                <Display size={18} color={ink}>{p.name}</Display>
                <Body size={12} color={colors.textMuted} numberOfLines={2}>
                  {p.description}
                </Body>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 4 },
  back: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 20,
  },
  subtitle: { fontSize: 16, lineHeight: 22, marginBottom: 24, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47.5%', padding: 14, borderWidth: 1,
    gap: 8, minHeight: 150, justifyContent: 'flex-start',
  },
  stickerChip: {
    width: 40, height: 40, borderRadius: 999, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
})
```

- [ ] **Step 2: Patch `CyclePillarsGrid.tsx` "See all" target**

In `components/home/cycle/CyclePillarsGrid.tsx`, find this line (currently line 54):

```tsx
        <Pressable onPress={() => router.push('/library' as any)} hitSlop={8}>
```

Replace with:

```tsx
        <Pressable onPress={() => router.push('/cycle-pillars' as any)} hitSlop={8}>
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "cycle-pillars|CyclePillarsGrid" | head
```

Expected: no errors.

- [ ] **Step 4: Manual UI test**

```bash
npx expo start --clear
```

Path: open in iOS simulator → switch to Cycle mode → scroll to Pillars section → tap "See all". Expect the new `/cycle-pillars` screen with 6 tiles. Tap any tile → routes to `/pillar/<id>` (pillar detail will still be ugly — that's Batch 4).

- [ ] **Step 5: Commit**

```bash
git add app/cycle-pillars.tsx components/home/cycle/CyclePillarsGrid.tsx
git commit -m "feat(cycle): /cycle-pillars index + fix See-all link"
git push origin main
```

---

## Batch 4 — Rebuild `app/pillar/[id].tsx`

Drop `CosmicBackground`, switch to `useTheme()` hook, sticker hero in a circular paper bubble, all titles use `colors.text` (not `textSecondary`), suggestions become rose `PillButton` instances.

**Files:**
- Modify: `app/pillar/[id].tsx` (complete rewrite — file is 165 lines, replace fully)

- [ ] **Step 1: Replace file contents**

```tsx
/**
 * Pillar detail screen — cream-paper redesign.
 *
 * Single screen for all 3 modes (pre-preg / pregnancy / kids). Renders the
 * pillar's sticker as a hero, then a list of tip cards, then a "Ask Guru
 * Grandma" suggestion section as rose pill buttons.
 */

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { Pillar } from '../../types'
import { pillars } from '../../lib/pillars'
import { prePregPillars } from '../../lib/prePregPillars'
import { pregnancyPillars } from '../../lib/pregnancyPillars'
import TipCard from '../../components/pillar/TipCard'
import { PillButton } from '../../components/ui/PillButton'
import { getPillarSticker } from '../../lib/pillarStickerMap'

export default function PillarDetail() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors, stickers, font, radius, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'

  const pillar = (
    pillars.find((p) => p.id === id)
      ?? prePregPillars.find((p) => p.id === id)
      ?? pregnancyPillars.find((p) => p.id === id)
  ) as Pillar | undefined

  if (!pillar) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ fontSize: 16, color: colors.text, fontFamily: font.body }}>
          Pillar not found
        </Text>
      </View>
    )
  }

  function handleSuggestion(suggestion: string) {
    router.push({
      pathname: '/(tabs)/library',
      params: { suggestion, pillarId: pillar!.id },
    })
  }

  const Sticker = getPillarSticker(pillar.id)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={22} color={ink} />
        </Pressable>

        <View style={styles.heroWrap}>
          <View
            style={[
              styles.stickerHero,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.full },
            ]}
          >
            {Sticker ? <Sticker size={88} /> : <Text style={{ fontSize: 56 }}>{pillar.icon}</Text>}
          </View>
        </View>

        <Text style={[styles.name, { color: ink, fontFamily: font.display }]}>{pillar.name}</Text>
        <Text style={[styles.subtitle, { color: stickers.coral, fontFamily: font.italic }]}>
          {pillar.description}
        </Text>

        <Text style={[styles.sectionTitle, { color: ink, fontFamily: font.display }]}>Tips</Text>
        {pillar.tips.map((tip, index) => (
          <TipCard key={index} label={tip.label} text={tip.text} />
        ))}

        <Text style={[styles.sectionTitle, { color: ink, fontFamily: font.display }]}>Ask Guru Grandma</Text>
        <View style={styles.chipsContainer}>
          {pillar.suggestions.map((suggestion, index) => (
            <PillButton
              key={index}
              label={suggestion}
              variant="accent"
              accentColor={isDark ? '#EFA2C2' : '#E58BB4'}
              onPress={() => handleSuggestion(suggestion)}
              style={{ alignSelf: 'flex-start' }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20 },
  back: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 20,
  },
  heroWrap: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
  stickerHero: {
    width: 132, height: 132, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 32, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 16, lineHeight: 22, marginBottom: 24 },
  sectionTitle: { fontSize: 22, marginTop: 16, marginBottom: 12 },
  chipsContainer: { flexDirection: 'column', gap: 10 },
})
```

- [ ] **Step 2: Verify `TipCard` still works on the new background**

```bash
sed -n '1,80p' components/pillar/TipCard.tsx
```

If `TipCard` references `colors.surfaceGlass` or other legacy tokens, log the issue and proceed — fixing TipCard contrast is out of this batch's scope but record it in commit notes if visible.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "pillar/\[id\]" | head
```

Expected: no errors.

- [ ] **Step 4: Manual UI test**

```bash
npx expo start --clear
```

Path: Cycle mode → Pillars grid → tap "Nutrition" tile → expect cream paper background, large sticker in a circular paper bubble, big Fraunces title in dark ink, italic coral subtitle, tips visible with readable contrast, suggestions render as rose pill buttons.

- [ ] **Step 5: Commit**

```bash
git add app/pillar/\[id\].tsx
git commit -m "feat(pillar): cream-paper rebuild, drop CosmicBackground, fix contrast"
git push origin main
```

---

## Batch 5 — `CycleJourneyRing.tsx` (170px ring hero)

A compact 2-column card. **Left column:** phase copy + sticker pill. **Right column:** 170px circular ring with 28 day-stickers laid out at `(cos((i/28)·2π − π/2)·72, sin((i/28)·2π − π/2)·72)`, today coral and enlarged, drag-to-spin + tap-to-jump via `PanResponder`.

The pan-responder math reuses the tangent-projection pattern from `PregnancyJourneyRing` (read `components/pregnancy/PregnancyJourneyRing.tsx:393-475` if you need a reference).

**Files:**
- Create: `components/home/cycle/CycleJourneyRing.tsx`

- [ ] **Step 1: Create the file**

```tsx
/**
 * CycleJourneyRing — 170px compact ring hero for the cycle home.
 *
 * 28 day-stickers around a circle. Phase-tinted fills:
 *   days 1–5    → pink-soft  🩸  menstruation
 *   days 6–12   → green-soft 🌱  follicular
 *   days 13–16  → peach-soft ✨  ovulation
 *   days 17–28  → lilac-soft 🌙  luteal
 *
 * Today's day is coral with a hard offset shadow and an enlarged sticker.
 * Tap any day to jump (Slice 1: callback only — onSelectDay).
 * Drag to spin (Slice 1: visual scrub only — committed value via onSelectDay
 * after the gesture settles; we reuse the pregnancy pan-responder pattern).
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, PanResponder, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import Animated, {
  useSharedValue, useAnimatedStyle, useDerivedValue, useAnimatedReaction,
  runOnJS, withDecay, withTiming, cancelAnimation, Easing,
} from 'react-native-reanimated'
import { useTheme } from '../../../constants/theme'
import type { CyclePhase } from '../../../lib/cycleLogic'

const SVG_SIZE = 170
const CX = SVG_SIZE / 2
const CY = SVG_SIZE / 2
const RING_R = 72
const ANCHOR_DEG = 90
const COUNT = 28

interface Props {
  /** 1-based current day in the cycle. */
  cycleDay: number
  /** Total cycle length (typically 28, clamped 21–60 upstream). */
  cycleLength: number
  /** Localized phase label, already capitalised. */
  phaseLabel: string
  /** Display-ready phase noun (e.g. "Menstruation"). */
  phase: CyclePhase
  /** Italic word in the left-column title (e.g. "quiet day"). */
  titleItalic: string
  /** Sub-line (e.g. "May 16 · Menstruation"). */
  subline: string
  /** Period progress copy (e.g. "Period day 1 of ~5"). */
  periodLine: string
  /** Tap hint copy (e.g. "↻ tap any day"). */
  hint: string
  /** Called when the user taps or scrubs to a day. */
  onSelectDay?: (day: number) => void
}

function phaseSticker(d: number): string {
  if (d <= 5) return '🩸'
  if (d <= 12) return '🌱'
  if (d <= 16) return '✨'
  return '🌙'
}

function phaseTint(d: number, st: ReturnType<typeof useTheme>['stickers']): string {
  if (d <= 5) return st.pinkSoft
  if (d <= 12) return st.greenSoft
  if (d <= 16) return st.peachSoft
  return st.lilacSoft
}

export function CycleJourneyRing({
  cycleDay, cycleLength, phaseLabel, phase, titleItalic, subline, periodLine, hint, onSelectDay,
}: Props) {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const coral = stickers.coral

  // 28-day visualization regardless of actual cycleLength — Slice 1 keeps it
  // simple; we map cycleDay/cycleLength onto the 28-step ring proportionally.
  const todayIndex = useMemo(() => {
    const ratio = (Math.max(1, Math.min(cycleLength, cycleDay)) - 1) / Math.max(1, cycleLength - 1)
    return Math.round(ratio * (COUNT - 1))
  }, [cycleDay, cycleLength])

  const initialRot = 180 - (todayIndex / COUNT) * 360
  const rotationDeg = useSharedValue(initialRot)

  const dotsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationDeg.value}deg` }],
  }))

  const [selectedIdx, setSelectedIdx] = useState(todayIndex)
  const selectedDerived = useDerivedValue(() => {
    let best = 0
    let bestDiff = Infinity
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * 360 - 90 + rotationDeg.value
      const normalized = (((a - ANCHOR_DEG) % 360) + 360) % 360
      const absDiff = normalized > 180 ? 360 - normalized : normalized
      if (absDiff < bestDiff) { bestDiff = absDiff; best = i }
    }
    return best
  })

  useAnimatedReaction(
    () => selectedDerived.value,
    (idx, prev) => {
      if (idx !== prev) runOnJS(setSelectedIdx)(idx)
    },
  )

  const snapToIndex = useCallback((idx: number) => {
    const target = 180 - (idx / COUNT) * 360
    let diff = ((target - rotationDeg.value) % 360 + 360) % 360
    if (diff > 180) diff -= 360
    cancelAnimation(rotationDeg)
    rotationDeg.value = withTiming(rotationDeg.value + diff, {
      duration: 320, easing: Easing.out(Easing.cubic),
    })
    onSelectDay?.(idx + 1)
  }, [rotationDeg, onSelectDay])

  // Tangent-projection pan responder — see PregnancyJourneyRing for the math.
  const tangentRef = useRef({ x: 0, y: 1 })
  const lastDxRef = useRef(0)
  const lastDyRef = useRef(0)
  const totalMoveRef = useRef(0)
  const initLocRef = useRef({ x: 0, y: 0 })

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        cancelAnimation(rotationDeg)
        const lx = e.nativeEvent.locationX
        const ly = e.nativeEvent.locationY
        initLocRef.current = { x: lx, y: ly }
        const rx = lx - CX
        const ry = ly - CY
        const r = Math.sqrt(rx * rx + ry * ry) || RING_R
        tangentRef.current = { x: -ry / r, y: rx / r }
        lastDxRef.current = 0
        lastDyRef.current = 0
        totalMoveRef.current = 0
      },
      onPanResponderMove: (_e, g) => {
        const ddx = g.dx - lastDxRef.current
        const ddy = g.dy - lastDyRef.current
        const arc = ddx * tangentRef.current.x + ddy * tangentRef.current.y
        const delta = (arc / RING_R) * (180 / Math.PI)
        rotationDeg.value += delta
        lastDxRef.current = g.dx
        lastDyRef.current = g.dy
        totalMoveRef.current += Math.abs(delta)
      },
      onPanResponderRelease: () => {
        if (totalMoveRef.current < 5) {
          // Tap — snap nearest day to the anchor
          const lx = initLocRef.current.x
          const ly = initLocRef.current.y
          let best = 0
          let bestDist = Infinity
          for (let i = 0; i < COUNT; i++) {
            const a = (i / COUNT) * 360 - 90 + rotationDeg.value
            const rad = a * (Math.PI / 180)
            const x = CX + RING_R * Math.cos(rad)
            const y = CY + RING_R * Math.sin(rad)
            const d2 = (x - lx) ** 2 + (y - ly) ** 2
            if (d2 < bestDist) { bestDist = d2; best = i }
          }
          snapToIndex(best)
        } else {
          // Drag — snap to nearest selected
          snapToIndex(selectedIdx)
        }
      },
    }),
  ).current

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
      <View style={styles.left}>
        <Text style={[styles.title, { color: ink, fontFamily: font.display }]}>
          a <Text style={{ fontFamily: font.italic, color: coral }}>{titleItalic}</Text>
        </Text>
        <Text style={[styles.subline, { color: colors.textMuted, fontFamily: font.body }]}>
          {subline}
        </Text>
        <Text style={[styles.periodLine, { color: colors.textMuted, fontFamily: font.body }]}>
          {periodLine}
        </Text>
        <View style={[styles.phasePill, { backgroundColor: stickers.pinkSoft, borderColor: ink }]}>
          <Text style={[styles.phasePillText, { color: ink, fontFamily: font.bodyBold }]} numberOfLines={1}>
            {phaseLabel}
          </Text>
        </View>
        <Text style={[styles.hint, { color: colors.textMuted, fontFamily: font.bodyBold }]}>
          {hint}
        </Text>
      </View>

      <View style={styles.ringWrap} {...panResponder.panHandlers}>
        <Svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
          <Circle cx={CX} cy={CY} r={RING_R} fill="none" stroke={ink} strokeOpacity={0.25} strokeWidth={0.8} />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, dotsAnimatedStyle]}>
          {Array.from({ length: COUNT }, (_, i) => {
            const angle = (i / COUNT) * 2 * Math.PI - Math.PI / 2
            const x = CX + RING_R * Math.cos(angle) - 9
            const y = CY + RING_R * Math.sin(angle) - 9
            const d = i + 1
            const isToday = i === todayIndex
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: isToday ? x - 4 : x,
                  top: isToday ? y - 4 : y,
                  width: isToday ? 26 : 18,
                  height: isToday ? 26 : 18,
                  borderRadius: 999,
                  backgroundColor: isToday ? coral : phaseTint(d, stickers),
                  borderWidth: isToday ? 2 : 1,
                  borderColor: ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: isToday ? 2 : 1,
                  ...(isToday ? { shadowColor: ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 1.5, height: 1.5 }, elevation: 3 } : null),
                }}
                pointerEvents="none"
              >
                <Text style={{ fontSize: isToday ? 13 : 10 }}>{phaseSticker(d)}</Text>
              </View>
            )
          })}
        </Animated.View>

        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.dayLabel, { color: coral, fontFamily: font.bodyBold }]}>Day</Text>
          <Text style={[styles.dayNum, { color: coral, fontFamily: font.displayBold }]}>{cycleDay}</Text>
          <Text style={[styles.dayOf, { color: colors.textMuted, fontFamily: font.bodyBold }]}>
            of {cycleLength}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  left: { flex: 1, gap: 4 },
  title: { fontSize: 24, lineHeight: 28, letterSpacing: -0.4 },
  subline: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  periodLine: { fontSize: 11, lineHeight: 16 },
  phasePill: {
    alignSelf: 'flex-start', marginTop: 8,
    borderWidth: 1.5, borderRadius: 999,
    paddingVertical: 5, paddingHorizontal: 11,
    shadowColor: '#141313', shadowOpacity: 1, shadowRadius: 0,
    shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  phasePillText: { fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase' },
  hint: { fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 10 },

  ringWrap: { width: SVG_SIZE, height: SVG_SIZE, justifyContent: 'center', alignItems: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  dayLabel: { fontSize: 8, letterSpacing: 1.8, textTransform: 'uppercase' },
  dayNum: { fontSize: 42, lineHeight: 44 },
  dayOf: { fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
})
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "CycleJourneyRing" | head
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/home/cycle/CycleJourneyRing.tsx
git commit -m "feat(cycle): CycleJourneyRing 170px ring hero component"
git push origin main
```

---

## Batch 6 — Wire Slice 1 into `CycleHome.tsx`; delete dead cards

Replace `YourCycleCard` with `CycleJourneyRing`, replace `WisdomCard` with `DailyNudgeCard`. Keep `HormonesCard` + `FertileWindowStrip` for one more batch — they're rebuilt in Slice 2.

**Files:**
- Modify: `components/home/CycleHome.tsx`
- Delete: `components/home/cycle/YourCycleCard.tsx`
- Delete: `components/home/cycle/WisdomCard.tsx`
- Modify: `components/home/cycle/CycleHomeDetailSheets.tsx` (remove the `'wisdom'` branch, keep others for now)

- [ ] **Step 1: Replace `CycleHome.tsx`**

```tsx
/**
 * CycleHome — pre-pregnancy home screen (Slice 1 of redesign).
 *
 * Section order (interim — Slice 2 will refactor further):
 *   1. HomeGreeting
 *   2. CycleJourneyRing            (replaces YourCycleCard)
 *   3. HormonesCard                (unchanged this slice — deleted in Slice 2)
 *   4. DailyNudgeCard              (replaces WisdomCard)
 *   5. FertileWindowStrip          (unchanged this slice — deleted in Slice 2)
 *   6. CyclePillarsGrid
 */

import { useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { getCycleInfo, toDateStr, type CycleConfig, type CyclePhase } from '../../lib/cycleLogic'
import { useCycleHistory } from '../../lib/cycleAnalytics'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useProfile } from '../../lib/useProfile'
import { HomeGreeting } from './HomeGreeting'
import { CycleJourneyRing } from './cycle/CycleJourneyRing'
import { HormonesCard } from './cycle/HormonesCard'
import { DailyNudgeCard } from './cycle/DailyNudgeCard'
import { FertileWindowStrip } from './cycle/FertileWindowStrip'
import { CyclePillarsGrid } from './cycle/CyclePillarsGrid'
import { CycleHomeDetailSheet, type CycleHomeDetailType } from './cycle/CycleHomeDetailSheets'

function getMicroLabel(): string {
  const d = new Date()
  const day = d.toLocaleDateString('en-US', { weekday: 'long' })
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${day.toUpperCase()} · ${date.toUpperCase()} · CYCLE`
}

function getTitleItalic(phase: CyclePhase): string {
  switch (phase) {
    case 'menstruation': return 'quiet day'
    case 'follicular':   return 'rising day'
    case 'ovulation':    return 'peak day'
    case 'luteal':       return 'soft day'
  }
}

function getSubline(info: ReturnType<typeof getCycleInfo>): string {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${today} · ${info.phaseLabel}`
}

function getPeriodLine(info: ReturnType<typeof getCycleInfo>): string {
  if (info.phase === 'menstruation') return `Period day ${info.cycleDay} of ~${info.periodLength}`
  if (info.isFertile && info.conceptionProbability === 'peak') return 'Peak today — window open'
  if (info.daysUntilOvulation > 0) return `Ovulation in ${info.daysUntilOvulation} day${info.daysUntilOvulation === 1 ? '' : 's'}`
  return `Next period in ${info.daysUntilPeriod} day${info.daysUntilPeriod === 1 ? '' : 's'}`
}

export function CycleHome() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const parentName = useJourneyStore((s) => s.parentName)
  const { data: profile } = useProfile()
  const displayName = profile?.name ?? parentName
  const { data: history, isPending: historyPending } = useCycleHistory()
  const [detailType, setDetailType] = useState<CycleHomeDetailType | null>(null)

  const cycleConfig: CycleConfig = (() => {
    const latest = history?.cycles[history.cycles.length - 1]
    const avgLen = history?.avg ?? 28
    if (latest) {
      return { lastPeriodStart: latest.startDate, cycleLength: avgLen, periodLength: 5, lutealPhase: 14 }
    }
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return { lastPeriodStart: toDateStr(d), cycleLength: 28, periodLength: 5, lutealPhase: 14 }
  })()

  const info = getCycleInfo(cycleConfig, toDateStr(new Date()))

  if (historyPending) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]} />
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingWrap}>
          <HomeGreeting name={displayName} microLabel={getMicroLabel()} />
        </View>

        <Pressable onPress={() => setDetailType('cycle')}>
          <CycleJourneyRing
            cycleDay={info.cycleDay}
            cycleLength={info.cycleLength}
            phaseLabel={info.phaseLabel}
            phase={info.phase as CyclePhase}
            titleItalic={getTitleItalic(info.phase as CyclePhase)}
            subline={getSubline(info)}
            periodLine={getPeriodLine(info)}
            hint="↻ tap any day"
          />
        </Pressable>

        <View style={styles.cardWrap}>
          <Pressable onPress={() => setDetailType('hormones')}>
            <HormonesCard cycleDay={info.cycleDay} cycleLength={info.cycleLength} />
          </Pressable>
        </View>

        <View style={styles.cardWrap}>
          <DailyNudgeCard phase={info.phase as CyclePhase} />
        </View>

        <Pressable onPress={() => setDetailType('fertile')}>
          <FertileWindowStrip cycleConfig={cycleConfig} />
        </Pressable>

        <CyclePillarsGrid />
      </ScrollView>

      <CycleHomeDetailSheet
        type={detailType}
        onClose={() => setDetailType(null)}
        cycleConfig={cycleConfig}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 120 },
  greetingWrap: { paddingHorizontal: 20, marginBottom: 12 },
  cardWrap: { paddingHorizontal: 20, marginTop: 12 },
})
```

- [ ] **Step 2: Remove the `'wisdom'` branch from `CycleHomeDetailSheets.tsx`**

In `components/home/cycle/CycleHomeDetailSheets.tsx`, locate the `CycleHomeDetailType` union (line 20):

```ts
export type CycleHomeDetailType = 'cycle' | 'hormones' | 'wisdom' | 'fertile'
```

Replace with:

```ts
export type CycleHomeDetailType = 'cycle' | 'hormones' | 'fertile'
```

Delete the `wisdom: 'Daily Wisdom',` line from the `TITLES` record, and delete the `{type === 'wisdom' && <WisdomDetail cycleConfig={cycleConfig} />}` line from the JSX. Delete the entire `function WisdomDetail({…})` body that follows. Search for `AffirmationShareModal` import — it may become unused, drop it if so (typecheck will tell you).

- [ ] **Step 3: Delete dead files**

```bash
rm components/home/cycle/YourCycleCard.tsx
rm components/home/cycle/WisdomCard.tsx
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "CycleHome|YourCycleCard|WisdomCard" | head
```

Expected: no errors. If any consumer outside `CycleHome.tsx` still references `YourCycleCard` or `WisdomCard`, update it (likely just `index.ts` re-exports — search `grep -rn "YourCycleCard\|WisdomCard" components/ app/ lib/ store/`).

- [ ] **Step 5: Manual UI test**

```bash
npx expo start --clear
```

Path: Cycle mode home → expect the 170px ring hero, the old Hormones card still there, then the new Daily Nudge cream-paper card, then the old fertile-window strip, then pillars. Tap the ring → hormones modal opens unchanged. Pull to refresh works. No flash. No crash on the Cycle tab.

- [ ] **Step 6: Commit**

```bash
git add components/home/CycleHome.tsx components/home/cycle/CycleHomeDetailSheets.tsx
git rm components/home/cycle/YourCycleCard.tsx components/home/cycle/WisdomCard.tsx
git commit -m "feat(cycle): wire ring hero + daily nudge, delete legacy cards (slice 1 done)"
git push origin main
```

**Slice 1 ships here.** The home reads natively to the cream-paper system except for the lingering Hormones card + Fertile Window strip, which Slice 2 rebuilds.

---

# SLICE 2 — Fertility Signals (real TTC tracking)

Goal: real BBT / LH / CM / intercourse logging, a new Fertile Window card + modal, mood/symptom strip. One migration extends the `cycle_logs` CHECK constraint and adds `scan_url`.

---

## Batch 7 — Migration: extend `cycle_logs.type` CHECK + add `scan_url`

**Schema reality:** `cycle_logs` already has columns `(id, user_id, date, type, value, notes, created_at)`. The existing CHECK already permits `intercourse`, `basal_temp`, `cervical_mucus`, `mood`, `symptom`. We need to **add `lh` and `opk_scan`** to that CHECK, and add a single `scan_url text` column for OPK photos.

**Files:**
- Create: `supabase/migrations/<ts>_cycle_signal_logs.sql` — where `<ts>` is generated via `date -u +%Y%m%d%H%M%S`

- [ ] **Step 1: Generate the timestamp**

```bash
date -u +%Y%m%d%H%M%S
```

Use the output (e.g. `20260521143000`) as the filename prefix.

- [ ] **Step 2: Create the migration file**

```sql
-- cycle_logs: support fertility-signal logging for TTC users.
--
-- 2026-05-21 redesign — extends the type CHECK with two new values (lh,
-- opk_scan) and adds a single scan_url column for OPK / pregnancy-test
-- photo uploads. BBT writes to existing 'basal_temp', CM writes to existing
-- 'cervical_mucus', intercourse writes to existing 'intercourse'. All four
-- carry their structured payload as plain text in the existing `value`
-- column (e.g. '36.42' for BBT, 'peak' for LH, 'eggwhite' for CM,
-- 'unprotected'/'protected' for intercourse).
--
-- RLS: existing "Users can manage own cycle_logs" policy covers the new
-- rows and column. No new policies.

-- Drop and recreate the CHECK to extend the allowed value set. The data
-- in the table is already compatible because we only ADD values.
alter table cycle_logs drop constraint if exists cycle_logs_type_check;
alter table cycle_logs add constraint cycle_logs_type_check
  check (type in (
    'period_start', 'period_end', 'ovulation', 'symptom',
    'basal_temp', 'intercourse', 'cervical_mucus', 'mood',
    'energy', 'weight', 'note',
    'lh', 'opk_scan'
  ));

alter table cycle_logs add column if not exists scan_url text;

-- Helpful index for the new tile-by-tile fetch on the Fertility Signals
-- card (queries are scoped by user + type, ordered by date desc).
create index if not exists idx_cycle_logs_user_type_date
  on cycle_logs(user_id, type, date desc);

notify pgrst, 'reload schema';
```

- [ ] **Step 3: Inspect the file**

```bash
cat supabase/migrations/<ts>_cycle_signal_logs.sql
```

Confirm the SQL is idempotent (uses `if not exists` / `drop constraint if exists`) and ends with `NOTIFY pgrst`.

- [ ] **Step 4: Apply locally if a local Supabase is running (optional)**

```bash
supabase db diff --schema public 2>&1 | head -20
```

Skip if no local Supabase. The user can apply directly to production in the next step.

- [ ] **Step 5: Push to production**

The `supabase-guard` PreToolUse hook blocks `supabase db push --linked` by default. Confirm with the user before running; if the user agrees, the override is:

```bash
# --i-know-what-im-doing
supabase db push --linked
```

Expected: the migration applies, schema reload notified.

- [ ] **Step 6: Verify the new constraint is live**

Open the Supabase Studio SQL editor for the production project and run:

```sql
select constraint_name, check_clause
from information_schema.check_constraints
where constraint_name = 'cycle_logs_type_check';
```

Expected: the clause includes `'lh'` and `'opk_scan'`. If you can't open Studio, skip — Batch 9 will hit the constraint on the first real BBT/LH save and surface any breakage immediately.

- [ ] **Step 7: Commit + push**

```bash
git add supabase/migrations/
git commit -m "feat(db): extend cycle_logs CHECK with lh/opk_scan + add scan_url"
git push origin main
```

---

## Batch 8 — `dailyFertilityCurve` helper in `lib/cycleLogic.ts`

Returns an array of conception probabilities (0–100) per day of the cycle. The Fertile Window card consumes this to render the 7-day forecast pills. Pure function, easy to unit test.

**Files:**
- Modify: `lib/cycleLogic.ts` (append a new export — do not refactor existing exports)

- [ ] **Step 1: Append to `lib/cycleLogic.ts` after the `getHydrationLevel` export**

```ts
/**
 * Daily conception probability curve for a full cycle (1-indexed days).
 *
 * Returns an array of length `cycleLength` where index 0 = day 1.
 * Values are 0–100. The peak day (ovulation) and the day before peak at ~70.
 * Calibration matches the FAM-based estimates used by the Fertile Window
 * card: peak at the two days before ovulation, sharp drop-off either side,
 * "low" baseline 5–8% during menstruation + early follicular.
 */
export function dailyFertilityCurve(cycleLength: number, lutealPhase = 14): number[] {
  const len = Math.max(21, Math.min(60, Math.round(cycleLength)))
  const ovulationDay = len - lutealPhase
  const arr: number[] = []
  for (let day = 1; day <= len; day++) {
    arr.push(probabilityForDay(day, ovulationDay))
  }
  return arr
}

function probabilityForDay(day: number, ovulationDay: number): number {
  const diff = day - ovulationDay
  // Peak: days ovulation−1 and ovulation
  if (diff === -1 || diff === 0) return 70
  // High: ovulation+1, ovulation−2
  if (diff === 1 || diff === -2) return 48
  // Medium: ovulation−3, ovulation+2
  if (diff === -3 || diff === 2) return 22
  // Low: ovulation−4, ovulation−5
  if (diff === -4 || diff === -5) return 12
  // Tail: ovulation−6 / ovulation+3 (sperm survival edge / very early luteal)
  if (diff === -6 || diff === 3) return 8
  // Baseline outside the window: 1–6% depending on phase
  if (diff < -6) return 6
  return 3
}
```

- [ ] **Step 2: Add a quick smoke test**

Create `lib/__tests__/cycleLogic.test.ts` if it doesn't exist (check first with `ls lib/__tests__/`). If the repo uses jest, this test will run; if not, the file is harmless.

```ts
import { dailyFertilityCurve } from '../cycleLogic'

describe('dailyFertilityCurve', () => {
  it('returns an entry per cycle day', () => {
    expect(dailyFertilityCurve(28)).toHaveLength(28)
    expect(dailyFertilityCurve(30)).toHaveLength(30)
  })

  it('peaks on the two days at and before ovulation', () => {
    const c = dailyFertilityCurve(28, 14)
    // ovulationDay = 28 - 14 = 14 (1-indexed). Indices: day N → c[N-1].
    expect(c[13]).toBe(70)  // day 14 (ovulation)
    expect(c[12]).toBe(70)  // day 13 (one before)
    expect(c[14]).toBe(48)  // day 15 (one after)
    expect(c[11]).toBe(48)  // day 12 (two before)
  })

  it('clamps cycle length to medical range', () => {
    expect(dailyFertilityCurve(10)).toHaveLength(21)
    expect(dailyFertilityCurve(120)).toHaveLength(60)
  })
})
```

- [ ] **Step 3: Run the test if jest is wired**

```bash
ls package.json && cat package.json | grep '"test"'
```

If a test script exists:

```bash
npm test -- --testPathPattern=cycleLogic
```

Expected: 3 passing. If jest isn't wired, skip and move on.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "cycleLogic" | head
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/cycleLogic.ts lib/__tests__/cycleLogic.test.ts
git commit -m "feat(cycle): dailyFertilityCurve helper for fertile window card"
git push origin main
```

---

## Batch 9 — `CycleLogForms.tsx`: BBT / LH / CM / Intercourse sheets

Four bottom sheets that write to `cycle_logs`. Follow the sticker-paper pattern from `components/calendar/LogForms.tsx` (read the file before writing to see the actual `saveCycleLog`/`SaveButton` shape). **No new save helper** — reuse the existing module-level `saveCycleLog(date, type, value, notes)` already in `LogForms.tsx` by exporting it. Or duplicate the 8-line helper if the existing one can't be exported without churn. Pick **duplicate** to keep this batch isolated.

**Files:**
- Create: `components/calendar/CycleLogForms.tsx`

- [ ] **Step 1: Create the file**

```tsx
/**
 * Cycle log forms — fertility signal logging for TTC.
 *
 * 4 bottom sheets matching the sticker-paper styling of LogForms.tsx /
 * PregnancyLogForms.tsx. Each writes a row to cycle_logs.
 *
 *   BBT          → type 'basal_temp', value '<°C>' e.g. '36.42'
 *   LH           → type 'lh',          value 'negative' | 'faint' | 'positive' | 'peak'
 *   CM           → type 'cervical_mucus', value 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite'
 *   Intercourse  → type 'intercourse', value 'unprotected' | 'protected'
 *
 * Saved rows invalidate the ['cycleLogs'] React Query key.
 */

import { useState } from 'react'
import { View, Text, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { PillButton } from '../ui/PillButton'

async function saveCycleLog(
  date: string,
  type: 'basal_temp' | 'lh' | 'cervical_mucus' | 'intercourse',
  value: string,
  notes?: string,
) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  const { error } = await supabase.from('cycle_logs').insert({
    user_id: session.user.id,
    date,
    type,
    value,
    notes: notes ?? null,
  })
  if (error) throw error
}

// ─── BBT ───────────────────────────────────────────────────────────────────

const BBT_MIN = 350 // 35.0 °C × 10
const BBT_MAX = 380 // 38.0 °C × 10

export function BbtForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const qc = useQueryClient()
  const [tenths, setTenths] = useState(364) // 36.4 default
  const [saving, setSaving] = useState(false)
  const ink = isDark ? colors.text : '#141313'

  function bump(delta: number) {
    setTenths((v) => Math.max(BBT_MIN, Math.min(BBT_MAX, v + delta)))
  }

  async function save() {
    setSaving(true)
    try {
      await saveCycleLog(date, 'basal_temp', (tenths / 10).toFixed(2))
      await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>BBT (morning)</Text>
      <View style={styles.bbtRow}>
        <Pressable onPress={() => bump(-5)} style={[styles.bumpBtn, { borderColor: ink, backgroundColor: colors.surface }]}>
          <Text style={{ color: ink, fontSize: 24, fontFamily: font.displayBold }}>−</Text>
        </Pressable>
        <Text style={[styles.bbtValue, { color: ink, fontFamily: font.displayBold }]}>
          {(tenths / 10).toFixed(1)}°
        </Text>
        <Pressable onPress={() => bump(5)} style={[styles.bumpBtn, { borderColor: ink, backgroundColor: colors.surface }]}>
          <Text style={{ color: ink, fontSize: 24, fontFamily: font.displayBold }}>+</Text>
        </Pressable>
      </View>
      <Text style={[styles.hint, { color: colors.textMuted, fontFamily: font.body }]}>
        Take it right after waking up — same time, same conditions.
      </Text>
      <PillButton label={saving ? 'Saving…' : 'Save'} variant="accent" accentColor={stickers.pink} onPress={save} disabled={saving} />
    </View>
  )
}

// ─── LH ────────────────────────────────────────────────────────────────────

const LH_OPTIONS: { value: 'negative' | 'faint' | 'positive' | 'peak'; label: string; tint: keyof ReturnType<typeof useTheme>['stickers'] }[] = [
  { value: 'negative', label: 'Negative', tint: 'lilacSoft' },
  { value: 'faint',    label: 'Faint',    tint: 'pinkSoft' },
  { value: 'positive', label: 'Positive', tint: 'pink' },
  { value: 'peak',     label: 'Peak',     tint: 'coral' },
]

export function LhForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, stickers, font, isDark } = useTheme()
  const qc = useQueryClient()
  const [pick, setPick] = useState<typeof LH_OPTIONS[number]['value'] | null>(null)
  const [saving, setSaving] = useState(false)
  const ink = isDark ? colors.text : '#141313'

  async function save() {
    if (!pick) return
    setSaving(true)
    try {
      await saveCycleLog(date, 'lh', pick)
      await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>LH test result</Text>
      <View style={styles.options}>
        {LH_OPTIONS.map((o) => {
          const active = pick === o.value
          return (
            <Pressable
              key={o.value}
              onPress={() => setPick(o.value)}
              style={[
                styles.option,
                {
                  backgroundColor: (stickers as any)[o.tint],
                  borderColor: active ? ink : colors.border,
                  borderWidth: active ? 2 : 1,
                },
              ]}
            >
              <Text style={{ color: o.value === 'peak' ? '#fff' : ink, fontFamily: font.bodyBold }}>{o.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <PillButton label={saving ? 'Saving…' : 'Save'} variant="accent" accentColor={stickers.pink} onPress={save} disabled={!pick || saving} />
    </View>
  )
}

// ─── CM ────────────────────────────────────────────────────────────────────

const CM_OPTIONS = [
  { value: 'dry',      label: 'Dry',         tint: 'lilacSoft' },
  { value: 'sticky',   label: 'Sticky',      tint: 'peachSoft' },
  { value: 'creamy',   label: 'Creamy',      tint: 'yellowSoft' },
  { value: 'watery',   label: 'Watery',      tint: 'blueSoft' },
  { value: 'eggwhite', label: 'Egg-white',   tint: 'greenSoft' },
] as const

export function CmForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, stickers, font, isDark } = useTheme()
  const qc = useQueryClient()
  const [pick, setPick] = useState<typeof CM_OPTIONS[number]['value'] | null>(null)
  const [saving, setSaving] = useState(false)
  const ink = isDark ? colors.text : '#141313'

  async function save() {
    if (!pick) return
    setSaving(true)
    try {
      await saveCycleLog(date, 'cervical_mucus', pick)
      await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>Cervical fluid</Text>
      <View style={styles.options}>
        {CM_OPTIONS.map((o) => {
          const active = pick === o.value
          return (
            <Pressable
              key={o.value}
              onPress={() => setPick(o.value)}
              style={[
                styles.option,
                {
                  backgroundColor: (stickers as any)[o.tint],
                  borderColor: active ? ink : colors.border,
                  borderWidth: active ? 2 : 1,
                },
              ]}
            >
              <Text style={{ color: ink, fontFamily: font.bodyBold }}>{o.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <PillButton label={saving ? 'Saving…' : 'Save'} variant="accent" accentColor={stickers.pink} onPress={save} disabled={!pick || saving} />
    </View>
  )
}

// ─── Intercourse ───────────────────────────────────────────────────────────

export function IntercourseForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, stickers, font, isDark } = useTheme()
  const qc = useQueryClient()
  const [protectedSex, setProtectedSex] = useState(false)
  const [saving, setSaving] = useState(false)
  const ink = isDark ? colors.text : '#141313'

  async function save() {
    setSaving(true)
    try {
      await saveCycleLog(date, 'intercourse', protectedSex ? 'protected' : 'unprotected')
      await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>Log intimacy</Text>
      <Pressable
        onPress={() => setProtectedSex((v) => !v)}
        style={[
          styles.toggle,
          {
            backgroundColor: protectedSex ? stickers.lilacSoft : stickers.pinkSoft,
            borderColor: ink,
          },
        ]}
      >
        <Text style={{ color: ink, fontFamily: font.bodyBold }}>
          {protectedSex ? 'Protected' : 'Unprotected'}
        </Text>
      </Pressable>
      <Text style={[styles.hint, { color: colors.textMuted, fontFamily: font.body }]}>
        We use this to mark "covered" days on the fertile window forecast.
      </Text>
      <PillButton label={saving ? 'Saving…' : 'Save'} variant="accent" accentColor={stickers.pink} onPress={save} disabled={saving} />
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: 14, paddingTop: 4 },
  label: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  bbtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginVertical: 12 },
  bumpBtn: {
    width: 48, height: 48, borderRadius: 999, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  bbtValue: { fontSize: 48, minWidth: 120, textAlign: 'center' },
  hint: { fontSize: 12, lineHeight: 17 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
  toggle: {
    alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 999, borderWidth: 1.5,
  },
})
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "CycleLogForms" | head
```

Expected: no errors. If `'coral'` is rejected from `stickers`, replace `stickers.coral` with `stickers.coral` lookup via `(stickers as any).coral` or use `brand.prePregnancy`.

- [ ] **Step 3: Commit**

```bash
git add components/calendar/CycleLogForms.tsx
git commit -m "feat(cycle): BBT / LH / CM / intercourse log forms"
git push origin main
```

---

## Batch 10 — `FertilitySignalsCard.tsx` + delete `HormonesCard`

4 tiles (BBT / LH / CM / Sex) + 7-day BBT sparkline + 3 states (filled / partial / empty). Tapping a tile opens the matching form in a `LogSheet`. Replaces `HormonesCard`.

**Files:**
- Create: `components/home/cycle/FertilitySignalsCard.tsx`
- Modify: `components/home/CycleHome.tsx` (swap HormonesCard → FertilitySignalsCard, remove `'hormones'` detail target)
- Modify: `components/home/cycle/CycleHomeDetailSheets.tsx` (drop `'hormones'` branch)
- Delete: `components/home/cycle/HormonesCard.tsx`

- [ ] **Step 1: Create the card**

```tsx
/**
 * FertilitySignalsCard — 4 signal tiles + 7-day BBT sparkline.
 *
 * Tiles: BBT 🌡️ · LH 🧪 · CM 💧 · Sex 💞
 * Tile states:
 *   - logged & on-track:  green-soft fill
 *   - peak / positive:    coral fill, white text
 *   - needs logging today: raised fill, dim icon, "+ log"
 *   - empty (first run):  all dim + first-run prompt overlay
 *
 * Tapping a tile opens the matching CycleLogForms sheet via LogSheet.
 */

import { useMemo, useState, useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { supabase } from '../../../lib/supabase'
import { toDateStr } from '../../../lib/cycleLogic'
import { PaperCard } from '../../ui/PaperCard'
import { PillButton } from '../../ui/PillButton'
import { LogSheet } from '../../calendar/LogSheet'
import { BbtForm, LhForm, CmForm, IntercourseForm } from '../../calendar/CycleLogForms'

type Tile = 'bbt' | 'lh' | 'cm' | 'intercourse'
type RecentLog = { date: string; type: string; value: string | null }

const DAYS_BACK = 7

export function FertilitySignalsCard() {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const ink = isDark ? colors.text : '#141313'
  const [openSheet, setOpenSheet] = useState<Tile | null>(null)

  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id))
  }, [])

  const today = toDateStr(new Date())
  const startD = new Date()
  startD.setDate(startD.getDate() - (DAYS_BACK - 1))
  const startISO = toDateStr(startD)

  const { data: recent = [] } = useQuery({
    queryKey: ['cycleLogs', 'signals', userId, startISO, today],
    queryFn: async (): Promise<RecentLog[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('date, type, value')
        .eq('user_id', userId)
        .in('type', ['basal_temp', 'lh', 'cervical_mucus', 'intercourse'])
        .gte('date', startISO)
        .lte('date', today)
        .order('date', { ascending: true })
      if (error) throw error
      return (data ?? []) as RecentLog[]
    },
    enabled: !!userId,
    staleTime: 0,
  })

  const todayByType = useMemo(() => {
    const map: Record<Tile, string | null> = { bbt: null, lh: null, cm: null, intercourse: null }
    for (const r of recent) {
      if (r.date !== today) continue
      if (r.type === 'basal_temp') map.bbt = r.value
      else if (r.type === 'lh') map.lh = r.value
      else if (r.type === 'cervical_mucus') map.cm = r.value
      else if (r.type === 'intercourse') map.intercourse = r.value
    }
    return map
  }, [recent, today])

  const bbtSeries = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const r of recent) {
      if (r.type !== 'basal_temp' || !r.value) continue
      const n = parseFloat(r.value)
      if (Number.isFinite(n)) byDate.set(r.date, n)
    }
    const out: { date: string; v: number | null }[] = []
    const d = new Date(startISO + 'T00:00:00')
    for (let i = 0; i < DAYS_BACK; i++) {
      const ds = toDateStr(d)
      out.push({ date: ds, v: byDate.get(ds) ?? null })
      d.setDate(d.getDate() + 1)
    }
    return out
  }, [recent, startISO])

  const filledCount = Object.values(todayByType).filter((v) => v != null).length
  const isEmpty = recent.length === 0 && filledCount === 0
  const isPeakToday = todayByType.lh === 'peak' || todayByType.cm === 'eggwhite'

  const headline = isEmpty
    ? 'Start tracking'
    : isPeakToday
    ? 'Peak today'
    : `${filledCount} of 4 logged`

  const tiles: { key: Tile; label: string; sticker: string; value: string | null }[] = [
    { key: 'bbt',         label: 'BBT', sticker: '🌡️', value: todayByType.bbt ? `${todayByType.bbt}°` : null },
    { key: 'lh',          label: 'LH',  sticker: '🧪', value: todayByType.lh },
    { key: 'cm',          label: 'CM',  sticker: '💧', value: todayByType.cm },
    { key: 'intercourse', label: 'Sex', sticker: '💞', value: todayByType.intercourse ? 'Logged' : null },
  ]

  function tileBg(t: typeof tiles[number]): string {
    if (t.key === 'lh' && t.value === 'peak') return stickers.coral
    if (t.key === 'cm' && t.value === 'eggwhite') return stickers.greenSoft
    if (t.value) return stickers.greenSoft
    return colors.surfaceRaised
  }

  function onSaved() {
    setOpenSheet(null)
    void qc.invalidateQueries({ queryKey: ['cycleLogs'] })
  }

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
      <PaperCard radius={radius.lg} padding={14}>
        <View style={styles.head}>
          <View>
            <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>
              FERTILITY SIGNALS
            </Text>
            <Text style={[styles.headline, { color: ink, fontFamily: font.display }]}>
              {headline}
            </Text>
          </View>
          <View style={[styles.sticker, { backgroundColor: stickers.pinkSoft, borderColor: ink }]}>
            <Text style={{ fontSize: 18 }}>{isPeakToday ? '✨' : '🌡️'}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {tiles.map((t) => {
            const filled = t.value != null
            const peak = (t.key === 'lh' && t.value === 'peak') || (t.key === 'cm' && t.value === 'eggwhite')
            return (
              <Pressable
                key={t.key}
                onPress={() => setOpenSheet(t.key)}
                style={[
                  styles.tile,
                  {
                    backgroundColor: tileBg(t),
                    borderColor: filled ? colors.border : colors.border,
                    opacity: filled ? 1 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 18, opacity: filled ? 1 : 0.55 }}>{t.sticker}</Text>
                <Text style={[styles.tileKey, { color: peak ? '#fff' : colors.textMuted, fontFamily: font.bodyBold }]}>
                  {t.label}
                </Text>
                <Text
                  style={[
                    styles.tileV,
                    {
                      color: peak ? '#fff' : filled ? ink : colors.textMuted,
                      fontFamily: filled ? font.display : font.body,
                      fontWeight: filled ? '700' : '400',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {filled ? (t.value as string) : '+ log'}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {!isEmpty && (
          <View style={styles.spark}>
            {bbtSeries.map((s, i) => {
              const min = Math.min(...bbtSeries.map((b) => b.v ?? 36.0))
              const max = Math.max(...bbtSeries.map((b) => b.v ?? 37.0))
              const range = Math.max(0.3, max - min)
              const h = s.v == null ? 4 : 6 + ((s.v - min) / range) * 28
              const isToday = i === DAYS_BACK - 1
              return (
                <View
                  key={s.date}
                  style={{
                    flex: 1,
                    height: h,
                    backgroundColor: isToday ? stickers.coral : stickers.pink,
                    borderRadius: 3,
                    borderWidth: 1,
                    borderColor: ink,
                    ...(isToday ? { shadowColor: ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 1, height: 1 } } : null),
                  }}
                />
              )
            })}
          </View>
        )}

        {isEmpty && (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: ink, fontFamily: font.display }]}>
              Logging today takes 30s
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textMuted, fontFamily: font.body }]}>
              Morning temp + a quick check tells us when your fertile window actually peaks — better than calendar guesses.
            </Text>
            <PillButton
              label="Log first signal"
              variant="accent"
              accentColor={stickers.pink}
              onPress={() => setOpenSheet('bbt')}
            />
          </View>
        )}
      </PaperCard>

      <LogSheet visible={openSheet === 'bbt'} title="BBT" onClose={() => setOpenSheet(null)}>
        <BbtForm date={today} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={openSheet === 'lh'} title="LH test" onClose={() => setOpenSheet(null)}>
        <LhForm date={today} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={openSheet === 'cm'} title="Cervical fluid" onClose={() => setOpenSheet(null)}>
        <CmForm date={today} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={openSheet === 'intercourse'} title="Intimacy" onClose={() => setOpenSheet(null)}>
        <IntercourseForm date={today} onSaved={onSaved} />
      </LogSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  label: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
  headline: { fontSize: 20, lineHeight: 24, marginTop: 2 },
  sticker: {
    width: 36, height: 36, borderRadius: 999, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  grid: { flexDirection: 'row', gap: 6 },
  tile: {
    flex: 1,
    borderWidth: 1, borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 2,
  },
  tileKey: { fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 },
  tileV: { fontSize: 13, lineHeight: 16 },
  spark: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 3,
    marginTop: 14, paddingTop: 12, height: 44,
    borderTopWidth: 1, borderTopColor: 'rgba(20,19,19,0.08)',
  },
  empty: { marginTop: 14, gap: 8, alignItems: 'center' },
  emptyTitle: { fontSize: 18 },
  emptyBody: { fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 },
})
```

- [ ] **Step 2: Update `CycleHome.tsx` to use the new card**

In `components/home/CycleHome.tsx`:

1. Replace the import `import { HormonesCard } from './cycle/HormonesCard'` with `import { FertilitySignalsCard } from './cycle/FertilitySignalsCard'`.
2. Replace the `<Pressable onPress={() => setDetailType('hormones')}>` block (Hormones card) with a plain `<FertilitySignalsCard />` mount (no pressable wrapper — the card owns its own log sheets).
3. Update `CycleHomeDetailType` usages so `'hormones'` is no longer a possible value (will be handled in step 3).

- [ ] **Step 3: Drop `'hormones'` from `CycleHomeDetailSheets.tsx`**

```ts
export type CycleHomeDetailType = 'cycle' | 'fertile'
```

Remove the `hormones: 'Hormones',` line from `TITLES`. Remove the `{type === 'hormones' && <HormonesDetail cycleConfig={cycleConfig} />}` JSX line. Remove the `function HormonesDetail({…})` body and the `HormonesInteractiveChart` import.

- [ ] **Step 4: Delete `HormonesCard.tsx`**

```bash
rm components/home/cycle/HormonesCard.tsx
```

- [ ] **Step 5: Typecheck + grep for stragglers**

```bash
npx tsc --noEmit 2>&1 | grep -E "Hormones|FertilitySignals" | head
grep -rn "HormonesCard\|HormonesInteractiveChart" components/ app/ lib/ 2>/dev/null
```

Expected: no errors, no remaining HormonesCard references.

- [ ] **Step 6: Manual UI test**

```bash
npx expo start --clear
```

Path: Cycle home → expect the new FertilitySignalsCard between the ring and the nudge. Empty state should appear if the user has no signal logs — tap "Log first signal" → BBT sheet opens → bump temp + Save → tile flips to green-soft with the temperature value. The 7-day sparkline appears with one filled bar.

- [ ] **Step 7: Commit**

```bash
git add components/home/cycle/FertilitySignalsCard.tsx components/home/CycleHome.tsx components/home/cycle/CycleHomeDetailSheets.tsx
git rm components/home/cycle/HormonesCard.tsx
git commit -m "feat(cycle): FertilitySignalsCard with BBT/LH/CM/Sex tiles + sparkline"
git push origin main
```

---

## Batch 11 — `FertileWindowCard.tsx` + `FertileWindowModal.tsx` + delete `FertileWindowStrip`

The card replaces the old footer strip. Reads `dailyFertilityCurve` for the 7-day forecast. The modal is the deep dive: countdown, forecast w/ legend, quick-log buttons, confidence placeholder, past windows.

**Files:**
- Create: `components/home/cycle/FertileWindowCard.tsx`
- Create: `components/home/cycle/FertileWindowModal.tsx`
- Modify: `components/home/CycleHome.tsx` (swap strip → card)
- Modify: `components/home/cycle/CycleHomeDetailSheets.tsx` (drop `'fertile'`)
- Delete: `components/home/cycle/FertileWindowStrip.tsx`

- [ ] **Step 1: Create `FertileWindowCard.tsx`**

```tsx
/**
 * FertileWindowCard — full-width card.
 *
 * Shows today's conception % + 7-day forecast pills + narrative + footer.
 * Tap → opens FertileWindowModal.
 *
 * Pill fills by % bucket (matches the design system stickers):
 *   0–14%:  surfaceRaised  (low)
 *   15–29%: pinkSoft       (mid)
 *   30–59%: pink           (high)
 *   60–100%: coral, white  (peak)
 * Today gets a 2px ink outline-offset.
 */

import { useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../../../constants/theme'
import { getCycleInfo, dailyFertilityCurve, type CycleConfig } from '../../../lib/cycleLogic'
import { PaperCard } from '../../ui/PaperCard'
import { FertileWindowModal } from './FertileWindowModal'

interface Props {
  cycleConfig: CycleConfig
}

function bucketTint(pct: number, stickers: ReturnType<typeof useTheme>['stickers'], colors: ReturnType<typeof useTheme>['colors']): { bg: string; fg: string } {
  if (pct >= 60) return { bg: stickers.coral, fg: '#fff' }
  if (pct >= 30) return { bg: stickers.pink, fg: '#141313' }
  if (pct >= 15) return { bg: stickers.pinkSoft, fg: '#141313' }
  return { bg: colors.surfaceRaised, fg: colors.textMuted }
}

function statusFor(pct: number): { label: string; tint: 'low' | 'mid' | 'high' | 'peak' } {
  if (pct >= 60) return { label: 'peak today', tint: 'peak' }
  if (pct >= 30) return { label: 'high today', tint: 'high' }
  if (pct >= 15) return { label: 'rising', tint: 'mid' }
  return { label: 'low today', tint: 'low' }
}

function narrativeFor(pct: number, daysToPeak: number): string {
  if (pct >= 60) return 'Peak fertility — this is your best window.'
  if (pct >= 30) return `Window is opening. Peak in ${daysToPeak} day${daysToPeak === 1 ? '' : 's'}.`
  if (pct >= 15) return `Estrogen is rising. Peak in about ${daysToPeak} days — start LH testing soon.`
  if (daysToPeak >= 0) return `A rising estrogen curve is on its way. Day ${daysToPeak === 0 ? 'today' : '+' + daysToPeak} is your projected peak.`
  return 'Resting phase — next fertile window starts after your period.'
}

export function FertileWindowCard({ cycleConfig }: Props) {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const [modalOpen, setModalOpen] = useState(false)
  const ink = isDark ? colors.text : '#141313'

  const info = getCycleInfo(cycleConfig)
  const curve = useMemo(
    () => dailyFertilityCurve(info.cycleLength, info.cycleLength - info.ovulationDay),
    [info.cycleLength, info.ovulationDay],
  )

  // 7-day forecast = today + 6 days forward (clamped to cycle length).
  const forecast = useMemo(() => {
    const out: { day: number; pct: number; weekday: string }[] = []
    const todayD = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(todayD)
      d.setDate(d.getDate() + i)
      const wd = d.toLocaleDateString('en-US', { weekday: 'short' })
      const day = ((info.cycleDay - 1 + i) % info.cycleLength) + 1
      out.push({ day, pct: curve[day - 1] ?? 0, weekday: wd })
    }
    return out
  }, [curve, info.cycleDay, info.cycleLength])

  const todayPct = forecast[0]?.pct ?? 0
  const status = statusFor(todayPct)
  const daysToPeak = Math.max(0, info.daysUntilOvulation)
  const narrative = narrativeFor(todayPct, daysToPeak)

  // "Best days this cycle" — the 3 highest-% days from today through the next 14 days
  const bestDays = useMemo(() => {
    const todayD = new Date()
    const arr: { date: Date; pct: number }[] = []
    for (let i = 0; i < 14; i++) {
      const d = new Date(todayD)
      d.setDate(d.getDate() + i)
      const day = ((info.cycleDay - 1 + i) % info.cycleLength) + 1
      arr.push({ date: d, pct: curve[day - 1] ?? 0 })
    }
    arr.sort((a, b) => b.pct - a.pct)
    const top3 = arr.slice(0, 3).sort((a, b) => a.date.getTime() - b.date.getTime())
    if (top3.length === 0) return ''
    const start = top3[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const end = top3[top3.length - 1].date.toLocaleDateString('en-US', { day: 'numeric' })
    return `${start} – ${end}`
  }, [curve, info.cycleDay, info.cycleLength])

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
      <Pressable onPress={() => setModalOpen(true)} accessibilityRole="button">
        <PaperCard radius={radius.lg} padding={14}>
          <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>FERTILE WINDOW</Text>

          <View style={styles.head}>
            <Text style={[styles.pct, { color: stickers.coral, fontFamily: font.displayBold }]}>
              {todayPct}<Text style={[styles.pctSmall, { color: colors.textMuted, fontFamily: font.body }]}>%</Text>
            </Text>
            <View style={[
              styles.statePill,
              {
                backgroundColor: status.tint === 'peak' ? stickers.coral : status.tint === 'high' ? stickers.pink : stickers.pinkSoft,
                borderColor: ink,
              },
            ]}>
              <Text style={{ color: status.tint === 'peak' ? '#fff' : ink, fontFamily: font.bodyBold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                {status.label}
              </Text>
            </View>
          </View>
          <Text style={[styles.narrative, { color: colors.textMuted, fontFamily: font.body }]}>
            {narrative}
          </Text>

          <View style={styles.pills}>
            {forecast.map((f, i) => {
              const isToday = i === 0
              const t = bucketTint(f.pct, stickers, colors)
              return (
                <View
                  key={i}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: t.bg,
                      borderColor: colors.border,
                      ...(isToday ? { borderColor: ink, borderWidth: 2 } : null),
                    },
                  ]}
                >
                  <Text style={{ color: t.fg, fontFamily: font.displayBold, fontSize: 13 }}>{f.pct}</Text>
                  <Text style={{ color: t.fg, fontFamily: font.body, fontSize: 8, letterSpacing: 1, opacity: 0.85, marginTop: 2, textTransform: 'uppercase' }}>
                    {f.weekday.slice(0, 3)}
                  </Text>
                </View>
              )
            })}
          </View>

          {bestDays && (
            <View style={[styles.best, { borderTopColor: colors.border }]}>
              <Text style={{ color: colors.textMuted, fontFamily: font.body, fontSize: 11 }}>
                Best days this cycle
              </Text>
              <Text style={{ color: stickers.coral, fontFamily: font.bodyBold, fontSize: 11 }}>
                {bestDays} →
              </Text>
            </View>
          )}
        </PaperCard>
      </Pressable>

      <FertileWindowModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        cycleConfig={cycleConfig}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  pct: { fontSize: 42, lineHeight: 44 },
  pctSmall: { fontSize: 14, marginLeft: 3 },
  statePill: {
    borderWidth: 1.5, borderRadius: 999,
    paddingVertical: 5, paddingHorizontal: 11,
    shadowColor: '#141313', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 },
  },
  narrative: { fontSize: 12, lineHeight: 17, marginTop: 8, marginBottom: 12 },
  pills: { flexDirection: 'row', gap: 5 },
  pill: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    borderRadius: 14, borderWidth: 1,
  },
  best: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 10, borderTopWidth: 1,
  },
})
```

- [ ] **Step 2: Create `FertileWindowModal.tsx`**

```tsx
/**
 * FertileWindowModal — bottom sheet for the FertileWindowCard.
 *
 * Sections:
 *   1. Peak in <N> days countdown
 *   2. 7-day forecast with color legend
 *   3. Log a signal today — 3 quick-log buttons (BBT / LH / CM)
 *   4. Confidence placeholder (Slice 3 wires the math)
 *   5. Past windows (last 3 cycles)
 *
 * The modal uses the LogSheet shell for consistency.
 */

import { useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useTheme } from '../../../constants/theme'
import { getCycleInfo, dailyFertilityCurve, toDateStr, type CycleConfig } from '../../../lib/cycleLogic'
import { useCycleHistory } from '../../../lib/cycleAnalytics'
import { LogSheet } from '../../calendar/LogSheet'
import { PillButton } from '../../ui/PillButton'
import { BbtForm, LhForm, CmForm } from '../../calendar/CycleLogForms'

interface Props {
  visible: boolean
  onClose: () => void
  cycleConfig: CycleConfig
}

export function FertileWindowModal({ visible, onClose, cycleConfig }: Props) {
  const { colors, stickers, font, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const [openLog, setOpenLog] = useState<'bbt' | 'lh' | 'cm' | null>(null)
  const today = toDateStr(new Date())

  const info = getCycleInfo(cycleConfig)
  const curve = useMemo(
    () => dailyFertilityCurve(info.cycleLength, info.cycleLength - info.ovulationDay),
    [info.cycleLength, info.ovulationDay],
  )
  const daysToPeak = Math.max(0, info.daysUntilOvulation)
  const ovDateLabel = info.ovulationDate
    ? new Date(info.ovulationDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : '—'

  const { data: history } = useCycleHistory()
  const pastWindows = useMemo(() => {
    const cycles = history?.cycles ?? []
    return cycles
      .slice(-3)
      .reverse()
      .map((c) => ({
        label: `Cycle ${cycles.indexOf(c) + 1}`,
        range: `${formatShort(c.startDate)} – ${formatShort(addDaysISO(c.startDate, (c.length ?? info.cycleLength) - 1))}`,
      }))
  }, [history, info.cycleLength])

  function forecast() {
    const out: { pct: number; weekday: string }[] = []
    const todayD = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(todayD)
      d.setDate(d.getDate() + i)
      const wd = d.toLocaleDateString('en-US', { weekday: 'short' })
      const day = ((info.cycleDay - 1 + i) % info.cycleLength) + 1
      out.push({ pct: curve[day - 1] ?? 0, weekday: wd })
    }
    return out
  }
  const fc = forecast()

  return (
    <LogSheet visible={visible} title="Fertile Window" onClose={onClose}>
      <ScrollView style={{ maxHeight: 600 }} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>PEAK IN</Text>
          <View style={[styles.countdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.big, { color: stickers.coral, fontFamily: font.displayBold }]}>
              {daysToPeak}<Text style={{ fontSize: 13, color: colors.textMuted, fontFamily: font.body }}> days</Text>
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: ink, fontFamily: font.bodyBold, fontSize: 13 }}>{ovDateLabel}</Text>
              <Text style={{ color: colors.textMuted, fontFamily: font.body, fontSize: 11 }}>projected ovulation</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>7-DAY FORECAST</Text>
          <View style={[styles.forecast, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.pills}>
              {fc.map((f, i) => {
                const isToday = i === 0
                const bg = f.pct >= 60 ? stickers.coral : f.pct >= 30 ? stickers.pink : f.pct >= 15 ? stickers.pinkSoft : colors.surfaceRaised
                const fg = f.pct >= 60 ? '#fff' : ink
                return (
                  <View
                    key={i}
                    style={[
                      styles.pill,
                      { backgroundColor: bg, borderColor: isToday ? ink : colors.border, borderWidth: isToday ? 2 : 1 },
                    ]}
                  >
                    <Text style={{ color: fg, fontFamily: font.displayBold, fontSize: 13 }}>{f.pct}</Text>
                    <Text style={{ color: fg, fontFamily: font.body, fontSize: 8, marginTop: 2, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {f.weekday.slice(0, 3)}
                    </Text>
                  </View>
                )
              })}
            </View>
            <View style={styles.legend}>
              <LegendItem color={colors.surfaceRaised} label="Low" />
              <LegendItem color={stickers.pinkSoft} label="Mid" />
              <LegendItem color={stickers.pink} label="High" />
              <LegendItem color={stickers.coral} label="Peak" />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>LOG A SIGNAL TODAY</Text>
          <View style={styles.qlog}>
            <QuickLog sticker="🌡️" label="BBT" onPress={() => setOpenLog('bbt')} />
            <QuickLog sticker="🧪" label="LH"  onPress={() => setOpenLog('lh')} />
            <QuickLog sticker="💧" label="CM"  onPress={() => setOpenLog('cm')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>CONFIDENCE</Text>
          <View style={[styles.conf, { backgroundColor: stickers.greenSoft, borderColor: colors.border }]}>
            <View style={[styles.confBadge, { borderColor: ink, backgroundColor: colors.surface }]}>
              <Text style={{ color: stickers.coral, fontFamily: font.displayBold, fontSize: 14 }}>—</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: ink, fontFamily: font.bodyBold, fontSize: 13 }}>Calendar-based estimate</Text>
              <Text style={{ color: colors.textMuted, fontFamily: font.body, fontSize: 11, marginTop: 3 }}>
                Add BBT + LH for the next 3 days to sharpen the forecast. Confidence math arrives in the next update.
              </Text>
            </View>
          </View>
        </View>

        {pastWindows.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>PAST WINDOWS</Text>
            <View style={[styles.history, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {pastWindows.map((w, i) => (
                <View
                  key={i}
                  style={[styles.histRow, { borderBottomColor: colors.border, borderBottomWidth: i === pastWindows.length - 1 ? 0 : 1 }]}
                >
                  <Text style={{ color: ink, fontFamily: font.bodyBold, fontSize: 13 }}>{w.label}</Text>
                  <Text style={{ color: colors.textMuted, fontFamily: font.body, fontSize: 11 }}>{w.range}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ marginTop: 8 }}>
          <PillButton label="Open full fertility log" variant="accent" accentColor={stickers.pink} onPress={onClose} />
        </View>
      </ScrollView>

      <LogSheet visible={openLog === 'bbt'} title="BBT" onClose={() => setOpenLog(null)}>
        <BbtForm date={today} onSaved={() => setOpenLog(null)} />
      </LogSheet>
      <LogSheet visible={openLog === 'lh'} title="LH" onClose={() => setOpenLog(null)}>
        <LhForm date={today} onSaved={() => setOpenLog(null)} />
      </LogSheet>
      <LogSheet visible={openLog === 'cm'} title="CM" onClose={() => setOpenLog(null)}>
        <CmForm date={today} onSaved={() => setOpenLog(null)} />
      </LogSheet>
    </LogSheet>
  )
}

function QuickLog({ sticker, label, onPress }: { sticker: string; label: string; onPress: () => void }) {
  const { colors, font, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  return (
    <PillButton
      label={`${sticker}  ${label}`}
      variant="paper"
      onPress={onPress}
      style={{ flex: 1 }}
    />
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const { colors, font } = useTheme()
  return (
    <View style={styles.legendItem}>
      <View style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: color, borderWidth: 1, borderColor: '#141313' }} />
      <Text style={{ color: colors.textMuted, fontFamily: font.bodyBold, fontSize: 9, letterSpacing: 1.1, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  )
}

function formatShort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

const styles = StyleSheet.create({
  body: { gap: 14, paddingBottom: 8 },
  section: { gap: 6 },
  label: { fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase' },
  countdown: {
    borderRadius: 18, borderWidth: 1, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  big: { fontSize: 38, lineHeight: 40 },
  forecast: { borderRadius: 18, borderWidth: 1, padding: 12 },
  pills: { flexDirection: 'row', gap: 4 },
  pill: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12 },
  legend: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(20,19,19,0.08)',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qlog: { flexDirection: 'row', gap: 6 },
  conf: {
    borderRadius: 18, borderWidth: 1, padding: 12,
    flexDirection: 'row', gap: 12, alignItems: 'center',
  },
  confBadge: {
    width: 48, height: 48, borderRadius: 999, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#141313', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 },
  },
  history: { borderRadius: 18, borderWidth: 1 },
  histRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
  },
})
```

- [ ] **Step 3: Wire into `CycleHome.tsx`**

Replace the `<Pressable onPress={() => setDetailType('fertile')}> ... <FertileWindowStrip ... /> ... </Pressable>` block with a plain `<FertileWindowCard cycleConfig={cycleConfig} />`. Update the import.

- [ ] **Step 4: Drop `'fertile'` from `CycleHomeDetailSheets.tsx`**

```ts
export type CycleHomeDetailType = 'cycle'
```

Remove `fertile: 'Fertile Window',` from `TITLES` and the corresponding JSX branch + the `FertileDetailBody` function. With only the `'cycle'` type left, the whole `CycleHomeDetailSheets` may collapse to a much smaller file — that's fine. Remove now-unused imports (`AffirmationShareModal`, etc.).

- [ ] **Step 5: Delete `FertileWindowStrip.tsx`**

```bash
rm components/home/cycle/FertileWindowStrip.tsx
```

- [ ] **Step 6: Typecheck + grep stragglers**

```bash
npx tsc --noEmit 2>&1 | grep -E "FertileWindow|CycleHomeDetail" | head
grep -rn "FertileWindowStrip" components/ app/ lib/ 2>/dev/null
```

- [ ] **Step 7: Manual UI test**

```bash
npx expo start --clear
```

Expect: big coral % at the top of the fertile window card, status pill, narrative, 7-day forecast pills with the correct gradient (low→peak), best-days footer. Tap → modal opens with countdown / forecast / quick-log / confidence placeholder / past windows. Tap a quick-log → LogSheet stack opens cleanly. Save → modal stays open, the home card invalidates and re-renders.

- [ ] **Step 8: Commit**

```bash
git add components/home/cycle/FertileWindowCard.tsx components/home/cycle/FertileWindowModal.tsx components/home/CycleHome.tsx components/home/cycle/CycleHomeDetailSheets.tsx
git rm components/home/cycle/FertileWindowStrip.tsx
git commit -m "feat(cycle): FertileWindowCard + modal with daily % forecast"
git push origin main
```

---

## Batch 12 — `MoodSymptomStrip.tsx` + `MoodSymptomPickerSheet.tsx`

Compact strip: 32px mood face + 3–4 visible symptom chips + `+` button → opens picker sheet. Writes to existing `cycle_logs.mood` and `cycle_logs.symptom`. No schema change.

**Files:**
- Create: `components/home/cycle/MoodSymptomStrip.tsx`
- Create: `components/home/cycle/MoodSymptomPickerSheet.tsx`

- [ ] **Step 1: Create `MoodSymptomPickerSheet.tsx`**

```tsx
/**
 * MoodSymptomPickerSheet — full symptom picker, opens from the strip's "+".
 * Writes one row per selected symptom to cycle_logs.
 */

import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { toDateStr } from '../../../lib/cycleLogic'
import { LogSheet } from '../../calendar/LogSheet'
import { PillButton } from '../../ui/PillButton'

const SYMPTOMS = [
  { id: 'cramps',       label: 'Cramps',       sticker: '🩸' },
  { id: 'tired',        label: 'Tired',        sticker: '😴' },
  { id: 'bloated',      label: 'Bloated',      sticker: '🎈' },
  { id: 'headache',     label: 'Headache',     sticker: '🤕' },
  { id: 'tender',       label: 'Tender',       sticker: '💔' },
  { id: 'acne',         label: 'Acne',         sticker: '🪞' },
  { id: 'nausea',       label: 'Nausea',       sticker: '🤢' },
  { id: 'craving',      label: 'Cravings',     sticker: '🍫' },
  { id: 'low-mood',     label: 'Low mood',     sticker: '☁️' },
  { id: 'restless',     label: 'Restless',     sticker: '🌪️' },
]

interface Props {
  visible: boolean
  onClose: () => void
  initialSelected?: string[]
}

export function MoodSymptomPickerSheet({ visible, onClose, initialSelected = [] }: Props) {
  const { colors, stickers, font, isDark } = useTheme()
  const qc = useQueryClient()
  const ink = isDark ? colors.text : '#141313'
  const [picked, setPicked] = useState<string[]>(initialSelected)
  const [saving, setSaving] = useState(false)

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  async function save() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const today = toDateStr(new Date())
      // Delete today's existing symptom rows (one row per symptom) to allow toggle-off behaviour.
      const { error: delErr } = await supabase
        .from('cycle_logs')
        .delete()
        .eq('user_id', session.user.id)
        .eq('type', 'symptom')
        .eq('date', today)
      if (delErr) throw delErr
      if (picked.length > 0) {
        const rows = picked.map((id) => ({
          user_id: session.user.id,
          date: today,
          type: 'symptom',
          value: id,
        }))
        const { error: insErr } = await supabase.from('cycle_logs').insert(rows)
        if (insErr) throw insErr
      }
      await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogSheet visible={visible} title="Anything today?" onClose={onClose}>
      <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={styles.body}>
        <View style={styles.grid}>
          {SYMPTOMS.map((s) => {
            const on = picked.includes(s.id)
            return (
              <Pressable
                key={s.id}
                onPress={() => toggle(s.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: on ? stickers.pinkSoft : colors.surface,
                    borderColor: on ? ink : colors.border,
                    borderWidth: on ? 2 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 14 }}>{s.sticker}</Text>
                <Text style={{ color: ink, fontFamily: font.bodyBold, fontSize: 12 }}>{s.label}</Text>
              </Pressable>
            )
          })}
        </View>
        <PillButton
          label={saving ? 'Saving…' : `Save ${picked.length} symptom${picked.length === 1 ? '' : 's'}`}
          variant="accent"
          accentColor={stickers.pink}
          onPress={save}
          disabled={saving}
        />
      </ScrollView>
    </LogSheet>
  )
}

export const ALL_SYMPTOMS = SYMPTOMS

const styles = StyleSheet.create({
  body: { gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
  },
})
```

- [ ] **Step 2: Create `MoodSymptomStrip.tsx`**

```tsx
/**
 * MoodSymptomStrip — compact full-width strip below the Daily Nudge.
 *
 * 32px mood face (today's pick) + 3–4 chips for the most-likely symptoms
 * keyed off the cycle phase + a "+" tile that opens the full picker sheet.
 *
 * Toggling a chip writes immediately to cycle_logs (no save button).
 */

import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { toDateStr, type CyclePhase } from '../../../lib/cycleLogic'
import { MoodSymptomPickerSheet, ALL_SYMPTOMS } from './MoodSymptomPickerSheet'
import { LogSheet } from '../../calendar/LogSheet'

const MOODS = [
  { id: '1', sticker: '😞' },
  { id: '2', sticker: '😕' },
  { id: '3', sticker: '😐' },
  { id: '4', sticker: '🙂' },
  { id: '5', sticker: '😄' },
]

const PHASE_DEFAULTS: Record<CyclePhase, string[]> = {
  menstruation: ['cramps', 'tired', 'bloated'],
  follicular:   ['acne', 'restless', 'craving'],
  ovulation:    ['tender', 'craving', 'restless'],
  luteal:       ['bloated', 'low-mood', 'tender'],
}

interface Props {
  phase: CyclePhase
}

export function MoodSymptomStrip({ phase }: Props) {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const qc = useQueryClient()
  const ink = isDark ? colors.text : '#141313'

  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id))
  }, [])

  const today = toDateStr(new Date())

  const { data: rows = [] } = useQuery({
    queryKey: ['cycleLogs', 'moodSym', userId, today],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('type, value')
        .eq('user_id', userId)
        .eq('date', today)
        .in('type', ['mood', 'symptom'])
      if (error) throw error
      return data ?? []
    },
    enabled: !!userId,
  })

  const [pickerOpen, setPickerOpen] = useState(false)
  const [moodSheet, setMoodSheet] = useState(false)

  const moodToday = rows.find((r) => r.type === 'mood')?.value ?? null
  const todaySymptoms = useMemo(() => rows.filter((r) => r.type === 'symptom').map((r) => r.value).filter(Boolean) as string[], [rows])

  const chipSlots = useMemo(() => {
    // Up to 4 chips: any logged-today first, then phase defaults to backfill.
    const fromLogs = todaySymptoms.slice(0, 4)
    if (fromLogs.length >= 4) return fromLogs
    const defaults = PHASE_DEFAULTS[phase].filter((d) => !fromLogs.includes(d))
    return [...fromLogs, ...defaults].slice(0, 4)
  }, [phase, todaySymptoms])

  async function toggleChip(id: string) {
    if (!userId) return
    const currentlyOn = todaySymptoms.includes(id)
    try {
      if (currentlyOn) {
        await supabase
          .from('cycle_logs')
          .delete()
          .eq('user_id', userId)
          .eq('date', today)
          .eq('type', 'symptom')
          .eq('value', id)
      } else {
        await supabase
          .from('cycle_logs')
          .insert({ user_id: userId, date: today, type: 'symptom', value: id })
      }
      await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }

  async function setMood(id: string) {
    if (!userId) return
    try {
      // Replace today's mood row (one per day)
      await supabase
        .from('cycle_logs')
        .delete()
        .eq('user_id', userId)
        .eq('date', today)
        .eq('type', 'mood')
      await supabase
        .from('cycle_logs')
        .insert({ user_id: userId, date: today, type: 'mood', value: id })
      await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
      setMoodSheet(false)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }

  const moodSticker = MOODS.find((m) => m.id === moodToday)?.sticker ?? '🙂'

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
      <View style={[
        styles.strip,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
      ]}>
        <Pressable
          onPress={() => setMoodSheet(true)}
          style={[styles.face, { backgroundColor: stickers.yellow, borderColor: ink }]}
        >
          <Text style={{ fontSize: 16 }}>{moodSticker}</Text>
        </Pressable>

        <View style={styles.chips}>
          {chipSlots.map((id) => {
            const meta = ALL_SYMPTOMS.find((s) => s.id === id)
            const on = todaySymptoms.includes(id)
            return (
              <Pressable
                key={id}
                onPress={() => toggleChip(id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: on ? stickers.pinkSoft : colors.surfaceRaised,
                    borderColor: on ? ink : colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 11, fontFamily: font.bodyBold, color: ink }}>
                  {meta?.sticker ?? ''} {meta?.label ?? id}
                </Text>
              </Pressable>
            )
          })}
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={[styles.chip, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
            hitSlop={6}
          >
            <Text style={{ fontSize: 13, color: colors.textMuted, fontFamily: font.bodyBold }}>+</Text>
          </Pressable>
        </View>
      </View>

      <MoodSymptomPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initialSelected={todaySymptoms}
      />
      <LogSheet visible={moodSheet} title="How's today?" onClose={() => setMoodSheet(false)}>
        <View style={styles.moodRow}>
          {MOODS.map((m) => {
            const active = moodToday === m.id
            return (
              <Pressable
                key={m.id}
                onPress={() => setMood(m.id)}
                style={[
                  styles.moodOpt,
                  { backgroundColor: active ? stickers.yellow : colors.surfaceRaised, borderColor: active ? ink : colors.border },
                ]}
              >
                <Text style={{ fontSize: 26 }}>{m.sticker}</Text>
              </Pressable>
            )
          })}
        </View>
      </LogSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1,
  },
  face: {
    width: 32, height: 32, borderRadius: 999, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  chips: { flex: 1, flexDirection: 'row', gap: 5, flexWrap: 'nowrap', overflow: 'hidden' },
  chip: {
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1,
  },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 6 },
  moodOpt: {
    width: 50, height: 50, borderRadius: 999, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
})
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "MoodSymptom" | head
```

- [ ] **Step 4: Commit**

```bash
git add components/home/cycle/MoodSymptomStrip.tsx components/home/cycle/MoodSymptomPickerSheet.tsx
git commit -m "feat(cycle): MoodSymptomStrip + picker sheet (immediate write)"
git push origin main
```

---

## Batch 13 — Recompose `CycleHome.tsx` to final layout, prune detail sheets

Final section order: HomeGreeting → CycleJourneyRing → thin fertile strip + stats → FertileWindowCard → FertilitySignalsCard → DailyNudgeCard → MoodSymptomStrip → CyclePillarsGrid.

**Files:**
- Modify: `components/home/CycleHome.tsx`
- Modify: `components/home/cycle/CycleHomeDetailSheets.tsx` (likely shrink to just the `cycle` sheet or delete entirely if not needed)

- [ ] **Step 1: Recompose `CycleHome.tsx`**

Replace the file with:

```tsx
/**
 * CycleHome — pre-pregnancy home (final 2026 redesign layout).
 *
 *   1. HomeGreeting
 *   2. CycleJourneyRing            (170px ring hero)
 *   3. FertileWindowCard           (today % + 7-day forecast)
 *   4. FertilitySignalsCard        (BBT/LH/CM/Sex tiles + sparkline)
 *   5. DailyNudgeCard              (phase-aware nudge)
 *   6. MoodSymptomStrip            (mood face + symptom chips)
 *   7. CyclePillarsGrid            (2×2 + See all → /cycle-pillars)
 */

import { View, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { getCycleInfo, toDateStr, type CycleConfig, type CyclePhase } from '../../lib/cycleLogic'
import { useCycleHistory } from '../../lib/cycleAnalytics'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useProfile } from '../../lib/useProfile'
import { HomeGreeting } from './HomeGreeting'
import { CycleJourneyRing } from './cycle/CycleJourneyRing'
import { FertileWindowCard } from './cycle/FertileWindowCard'
import { FertilitySignalsCard } from './cycle/FertilitySignalsCard'
import { DailyNudgeCard } from './cycle/DailyNudgeCard'
import { MoodSymptomStrip } from './cycle/MoodSymptomStrip'
import { CyclePillarsGrid } from './cycle/CyclePillarsGrid'

function getMicroLabel(): string {
  const d = new Date()
  const day = d.toLocaleDateString('en-US', { weekday: 'long' })
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${day.toUpperCase()} · ${date.toUpperCase()} · CYCLE`
}

function getTitleItalic(phase: CyclePhase): string {
  switch (phase) {
    case 'menstruation': return 'quiet day'
    case 'follicular':   return 'rising day'
    case 'ovulation':    return 'peak day'
    case 'luteal':       return 'soft day'
  }
}

function getSubline(info: ReturnType<typeof getCycleInfo>): string {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${today} · ${info.phaseLabel}`
}

function getPeriodLine(info: ReturnType<typeof getCycleInfo>): string {
  if (info.phase === 'menstruation') return `Period day ${info.cycleDay} of ~${info.periodLength}`
  if (info.isFertile && info.conceptionProbability === 'peak') return 'Peak today — window open'
  if (info.daysUntilOvulation > 0) return `Ovulation in ${info.daysUntilOvulation} day${info.daysUntilOvulation === 1 ? '' : 's'}`
  return `Next period in ${info.daysUntilPeriod} day${info.daysUntilPeriod === 1 ? '' : 's'}`
}

export function CycleHome() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const parentName = useJourneyStore((s) => s.parentName)
  const { data: profile } = useProfile()
  const displayName = profile?.name ?? parentName
  const { data: history, isPending: historyPending } = useCycleHistory()

  const cycleConfig: CycleConfig = (() => {
    const latest = history?.cycles[history.cycles.length - 1]
    const avgLen = history?.avg ?? 28
    if (latest) {
      return { lastPeriodStart: latest.startDate, cycleLength: avgLen, periodLength: 5, lutealPhase: 14 }
    }
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return { lastPeriodStart: toDateStr(d), cycleLength: 28, periodLength: 5, lutealPhase: 14 }
  })()

  const info = getCycleInfo(cycleConfig, toDateStr(new Date()))

  if (historyPending) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]} />
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingWrap}>
          <HomeGreeting name={displayName} microLabel={getMicroLabel()} />
        </View>

        <CycleJourneyRing
          cycleDay={info.cycleDay}
          cycleLength={info.cycleLength}
          phaseLabel={info.phaseLabel}
          phase={info.phase as CyclePhase}
          titleItalic={getTitleItalic(info.phase as CyclePhase)}
          subline={getSubline(info)}
          periodLine={getPeriodLine(info)}
          hint="↻ tap any day"
        />

        <FertileWindowCard cycleConfig={cycleConfig} />
        <FertilitySignalsCard />
        <View style={styles.cardWrap}>
          <DailyNudgeCard phase={info.phase as CyclePhase} />
        </View>
        <MoodSymptomStrip phase={info.phase as CyclePhase} />

        <CyclePillarsGrid />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 120 },
  greetingWrap: { paddingHorizontal: 20, marginBottom: 12 },
  cardWrap: { paddingHorizontal: 20, marginTop: 12 },
})
```

- [ ] **Step 2: Shrink or delete `CycleHomeDetailSheets.tsx`**

If the only remaining branch is `'cycle'`, decide:
- Keep it as a small sheet for the ring's tap-anywhere fallback (already wired into the ring via `onSelectDay`).
- Or remove it entirely if no one calls it anymore.

```bash
grep -rn "CycleHomeDetailSheet\|CycleHomeDetailType" components/ app/ lib/ store/
```

If the only consumer was the `CycleHome.tsx` you just rewrote (which no longer imports it), delete the file:

```bash
rm components/home/cycle/CycleHomeDetailSheets.tsx
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no new errors. If the deleted detail sheets file leaves dangling imports anywhere, the typecheck will show them — fix in place.

- [ ] **Step 4: Manual UI test (full Slice 2 acceptance)**

```bash
npx expo start --clear
```

Path: Cycle mode home → expect the final layout in order. Scroll feels right (no awkward gaps). Tap the ring (no-op or opens the detail sheet if you kept it). Tap the Fertile Window card → modal opens. Tap each Fertility Signals tile → log sheet opens. Tap each mood face → mood updates. Tap "+" on the mood strip → picker opens. Tap "See all" pillars → `/cycle-pillars`. Tap a pillar tile → new pillar detail.

- [ ] **Step 5: Commit**

```bash
git add components/home/CycleHome.tsx
git rm -f components/home/cycle/CycleHomeDetailSheets.tsx 2>/dev/null || true
git commit -m "feat(cycle): final home layout — ring → fertile → signals → nudge → mood → pillars (slice 2 done)"
git push origin main
```

**Slice 2 ships here.** TestFlight users on the cycle mode now have real TTC logging end-to-end.

---

# SLICE 3 — Smart layer (gated on user request to proceed)

These batches are independent of one another and can ship in any order. Each is small. Recommend doing them when slice 2 has been in the field for at least a day.

---

## Batch 14 — Log-aware predicates in `cycleNudges.ts` + 6 templates

**Files:**
- Modify: `lib/cycleNudges.ts`
- Modify: `components/home/cycle/DailyNudgeCard.tsx` (read logs, pass to picker)
- Modify: `lib/i18n/keys.ts` + `lib/i18n/en.ts` (6 new template strings)

- [ ] **Step 1: Extend the template type with a predicate**

Replace the contents of `lib/cycleNudges.ts` with:

```ts
import type { CyclePhase } from './cycleLogic'

export type NudgeContext = {
  phase: CyclePhase
  cycleDay: number
  hasBBTToday: boolean
  hasLHToday: boolean
  hasCMToday: boolean
  moodToday: string | null   // '1'..'5' or null
  daysLate: number           // negative if not late
  bbtShiftConfirmed: boolean
}

export type CycleNudgeTemplate = {
  id: string
  headlineKey: string
  bodyKey: string
  pillarId?: string
  logShortcut?: 'bbt' | 'lh' | 'cm' | 'intercourse'
  /** Returns true if this template applies to the given context. */
  predicate: (ctx: NudgeContext) => boolean
}

export const CYCLE_NUDGE_TEMPLATES: CycleNudgeTemplate[] = [
  // 1. Day 32+ / late
  {
    id: 'late',
    headlineKey: 'cycle_nudge_late_headline',
    bodyKey: 'cycle_nudge_late_body',
    logShortcut: 'lh',
    predicate: (c) => c.daysLate >= 2,
  },
  // 2. Day 9 / follicular / no LH yet
  {
    id: 'follicular-start-lh',
    headlineKey: 'cycle_nudge_follicular_lh_headline',
    bodyKey: 'cycle_nudge_follicular_lh_body',
    logShortcut: 'lh',
    predicate: (c) => c.phase === 'follicular' && c.cycleDay >= 8 && !c.hasLHToday,
  },
  // 3. Day 13 / high fertility / BBT logged
  {
    id: 'window-opens-tomorrow',
    headlineKey: 'cycle_nudge_window_open_headline',
    bodyKey: 'cycle_nudge_window_open_body',
    pillarId: 'fertility',
    predicate: (c) =>
      (c.phase === 'follicular' || c.phase === 'ovulation') &&
      c.cycleDay >= 12 && c.cycleDay <= 14 && c.hasBBTToday,
  },
  // 4. Day 18 / luteal / BBT shift confirmed
  {
    id: 'ovulation-confirmed',
    headlineKey: 'cycle_nudge_ovulation_confirmed_headline',
    bodyKey: 'cycle_nudge_ovulation_confirmed_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'luteal' && c.bbtShiftConfirmed,
  },
  // 5. Day 24 / luteal / low mood logged
  {
    id: 'luteal-pms',
    headlineKey: 'cycle_nudge_luteal_pms_headline',
    bodyKey: 'cycle_nudge_luteal_pms_body',
    pillarId: 'nutrition-prep',
    predicate: (c) => c.phase === 'luteal' && c.moodToday !== null && parseInt(c.moodToday) <= 2,
  },
  // 6. Day 1 / period / nothing logged — fallback for menstruation
  {
    id: 'menstruation-rest',
    headlineKey: 'cycle_nudge_menstruation_headline',
    bodyKey: 'cycle_nudge_menstruation_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'menstruation',
  },
  // Per-phase fallbacks (always last)
  {
    id: 'follicular-energy',
    headlineKey: 'cycle_nudge_follicular_headline',
    bodyKey: 'cycle_nudge_follicular_body',
    pillarId: 'nutrition-prep',
    predicate: (c) => c.phase === 'follicular',
  },
  {
    id: 'ovulation-window',
    headlineKey: 'cycle_nudge_ovulation_headline',
    bodyKey: 'cycle_nudge_ovulation_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'ovulation',
  },
  {
    id: 'luteal-care',
    headlineKey: 'cycle_nudge_luteal_headline',
    bodyKey: 'cycle_nudge_luteal_body',
    pillarId: 'emotional-readiness',
    predicate: (c) => c.phase === 'luteal',
  },
]

/** Pick the first template whose predicate matches. */
export function pickCycleNudge(ctx: NudgeContext): CycleNudgeTemplate {
  for (const t of CYCLE_NUDGE_TEMPLATES) {
    if (t.predicate(ctx)) return t
  }
  return CYCLE_NUDGE_TEMPLATES[CYCLE_NUDGE_TEMPLATES.length - 1]
}
```

- [ ] **Step 2: Update `DailyNudgeCard.tsx` to build the context**

**Breaking signature change**: in Slice 1 we called `pickCycleNudge(phase)`. From this batch on, the signature is `pickCycleNudge(ctx: NudgeContext)`. The card now reads logs to build the context.

Replace its `phase: CyclePhase` prop with `cycleConfig: CycleConfig`. Then update the call sites (`CycleHome.tsx` → `<DailyNudgeCard cycleConfig={cycleConfig} />`). Inside the card:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { getCycleInfo, toDateStr, type CycleConfig } from '../../../lib/cycleLogic'
import { pickCycleNudge, type NudgeContext } from '../../../lib/cycleNudges'

interface Props {
  cycleConfig: CycleConfig
}

export function DailyNudgeCard({ cycleConfig }: Props) {
  // ...existing useTheme + useTranslation hooks unchanged...

  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id))
  }, [])

  const info = getCycleInfo(cycleConfig)
  const today = toDateStr(new Date())

  const { data: todayRows = [] } = useQuery({
    queryKey: ['cycleLogs', 'nudge', userId, today],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('type, value')
        .eq('user_id', userId)
        .eq('date', today)
        .in('type', ['basal_temp', 'lh', 'cervical_mucus', 'mood'])
      if (error) throw error
      return data ?? []
    },
    enabled: !!userId,
  })

  // BBT shift = compare last 3 BBT readings vs prior 4
  const { data: bbtTrend = [] } = useQuery({
    queryKey: ['cycleLogs', 'bbt-trend', userId, today],
    queryFn: async () => {
      if (!userId) return []
      const startD = new Date()
      startD.setDate(startD.getDate() - 10)
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('value, date')
        .eq('user_id', userId)
        .eq('type', 'basal_temp')
        .gte('date', toDateStr(startD))
        .order('date', { ascending: true })
      if (error) throw error
      return (data ?? []).map((r) => parseFloat(r.value)).filter((n) => Number.isFinite(n))
    },
    enabled: !!userId,
  })

  const ctx: NudgeContext = useMemo(() => ({
    phase: info.phase as any,
    cycleDay: info.cycleDay,
    hasBBTToday: todayRows.some((r) => r.type === 'basal_temp'),
    hasLHToday: todayRows.some((r) => r.type === 'lh'),
    hasCMToday: todayRows.some((r) => r.type === 'cervical_mucus'),
    moodToday: todayRows.find((r) => r.type === 'mood')?.value ?? null,
    daysLate: info.cycleDay > info.cycleLength ? info.cycleDay - info.cycleLength : 0,
    bbtShiftConfirmed: detectBBTShift(bbtTrend),
  }), [info, todayRows, bbtTrend])

  const nudge = pickCycleNudge(ctx)
  // ...rest of the JSX unchanged (renders nudge.headlineKey / bodyKey / pillarId)...
}

function detectBBTShift(values: number[]): boolean {
  if (values.length < 7) return false
  const recent = values.slice(-3)
  const prior = values.slice(0, -3).slice(-4)
  if (prior.length < 3) return false
  const r = recent.reduce((a, b) => a + b, 0) / recent.length
  const p = prior.reduce((a, b) => a + b, 0) / prior.length
  return r - p >= 0.25
}
```

Then in `CycleHome.tsx`, update the call site:

```tsx
<DailyNudgeCard cycleConfig={cycleConfig} />
```

— removing the `phase={...}` prop.

- [ ] **Step 3: Add new i18n keys + values**

In `lib/i18n/keys.ts` and `lib/i18n/en.ts`, add:

```ts
  cycle_nudge_late_headline: 'You\'re a few *days late*',
  cycle_nudge_late_body: 'Not a verdict yet — but a good day to take a test if you\'ve been tracking.',
  cycle_nudge_follicular_lh_headline: 'Time to start *LH testing*',
  cycle_nudge_follicular_lh_body: 'You\'re a few days from your projected peak. Pop a test tonight or tomorrow morning.',
  cycle_nudge_window_open_headline: 'Window *opens tomorrow*',
  cycle_nudge_window_open_body: 'Your CM should turn egg-white in the next 24–48h. Watch for it.',
  cycle_nudge_ovulation_confirmed_headline: '*Ovulation confirmed*',
  cycle_nudge_ovulation_confirmed_body: 'Your temp held above the coverline for 3 days. Test in ~10 days if no period.',
  cycle_nudge_luteal_pms_headline: 'PMS is *hormonal*, not personal',
  cycle_nudge_luteal_pms_body: 'Progesterone is dropping. Magnesium-rich food + a walk before bed help more than you\'d think.',
```

- [ ] **Step 4: Typecheck + smoke test**

```bash
npx tsc --noEmit 2>&1 | grep -E "cycleNudges|DailyNudgeCard" | head
npx expo start --clear
```

- [ ] **Step 5: Commit**

```bash
git add lib/cycleNudges.ts components/home/cycle/DailyNudgeCard.tsx lib/i18n/keys.ts lib/i18n/en.ts
git commit -m "feat(cycle): log-aware nudge predicates + 6 templates"
git push origin main
```

---

## Batch 15 — Confidence math on `FertileWindowModal`

**Files:**
- Modify: `components/home/cycle/FertileWindowModal.tsx`
- Create: `lib/cycleConfidence.ts`

- [ ] **Step 1: Create `lib/cycleConfidence.ts`**

```ts
/**
 * Fertile-window confidence score.
 *
 * Inputs: cycle history + recent BBT / LH log windows.
 * Outputs: an integer 0–100 + a one-line explainer key.
 *
 * Tiers (matches the spec):
 *   60–70   calendar only (depends on cycle count)
 *   80      calendar + 7 days BBT
 *   92      calendar + 7 days BBT + 3 days LH
 *   96      BBT post-ovulation shift confirmed
 */

export type ConfidenceInputs = {
  cycleCount: number
  bbtCount7d: number
  lhCount3d: number
  shiftConfirmed: boolean
}

export type ConfidenceResult = {
  pct: number
  explainerKey: string
}

export function computeFertileConfidence(input: ConfidenceInputs): ConfidenceResult {
  if (input.shiftConfirmed) {
    return { pct: 96, explainerKey: 'cycle_conf_shift_confirmed' }
  }
  if (input.bbtCount7d >= 7 && input.lhCount3d >= 3) {
    return { pct: 92, explainerKey: 'cycle_conf_bbt_lh' }
  }
  if (input.bbtCount7d >= 7) {
    return { pct: 80, explainerKey: 'cycle_conf_bbt_only' }
  }
  // Calendar only: scales with cycle count 1 cycle → 60, 4+ cycles → 70.
  const pct = Math.min(70, 60 + (input.cycleCount - 1) * 3)
  return { pct, explainerKey: 'cycle_conf_calendar' }
}
```

- [ ] **Step 2: Wire it into the modal**

In `FertileWindowModal.tsx`, replace the placeholder Confidence section with a real one driven by:

```tsx
const { computeFertileConfidence } = require('../../../lib/cycleConfidence')  // or import
const { data: bbtRows = [] } = useQuery({ ... })  // last 7d BBT
const { data: lhRows = [] }  = useQuery({ ... })  // last 3d LH
const shiftConfirmed = detectBBTShift(bbtRows)    // helper, see step 3
const conf = computeFertileConfidence({
  cycleCount: history?.cycles.length ?? 0,
  bbtCount7d: bbtRows.length,
  lhCount3d: lhRows.length,
  shiftConfirmed,
})
```

Display `{conf.pct}%` in the badge and `t(conf.explainerKey)` in the body.

- [ ] **Step 3: Add `detectBBTShift` helper**

Append to `lib/cycleConfidence.ts`:

```ts
/** Detect a post-ovulation BBT shift in the most recent BBT readings. */
export function detectBBTShift(values: number[]): boolean {
  if (values.length < 7) return false
  const recent = values.slice(-3)
  const prior = values.slice(0, -3).slice(-4)
  if (prior.length < 3) return false
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const priorAvg = prior.reduce((a, b) => a + b, 0) / prior.length
  return recentAvg - priorAvg >= 0.25
}
```

- [ ] **Step 4: Add i18n keys**

```ts
  cycle_conf_calendar: 'Calendar-based estimate. Add BBT + LH for the next 3 days to sharpen the forecast.',
  cycle_conf_bbt_only: 'Calendar + your BBT. Add LH strips to push confidence above 90%.',
  cycle_conf_bbt_lh: 'Calendar + BBT + LH — confidence is high. Waiting on the post-ovulation temp shift to lock the peak.',
  cycle_conf_shift_confirmed: 'BBT shift confirmed. Past peak is locked. Future windows still calendar-based.',
```

- [ ] **Step 5: Typecheck + test + commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "Confidence|FertileWindowModal" | head
git add lib/cycleConfidence.ts components/home/cycle/FertileWindowModal.tsx lib/i18n/keys.ts lib/i18n/en.ts
git commit -m "feat(cycle): confidence math on fertile window modal"
git push origin main
```

---

## Batch 16 — `scan-image` edge function: `cycle_test` mode

Extend the existing `supabase/functions/scan-image/index.ts` so the same edge function classifies an OPK / pregnancy test photo. Slice 2 already has `opk_scan` permitted in the `cycle_logs.type` CHECK and a `scan_url` column.

**Files:**
- Modify: `supabase/functions/scan-image/index.ts`
- Optionally: a thin scan tile inside `FertilitySignalsCard.tsx`

- [ ] **Step 1: Read the existing edge function**

```bash
sed -n '1,80p' supabase/functions/scan-image/index.ts
```

Note the existing mode-branching pattern (the file already supports `child` + `pregnancy` modes per session memory; you'll add a `cycle_test` mode alongside).

- [ ] **Step 2: Add the `cycle_test` branch**

Inside the request handler, accept a new `mode: 'cycle_test'` value and build a Claude prompt that classifies the photo as one of:

```
Negative | Faint | Positive | Peak | Pregnant
```

Use the same `claude-sonnet-4-20250514` model and the existing `Deno.env.get('ANTHROPIC_API_KEY')` secret. Return `{ classification, confidence, scanUrl }` where `scanUrl` is a signed URL into the existing `scan-images` storage bucket.

The file MUST start with:

```ts
// @ts-nocheck — Deno Edge Function
```

— and use Deno-native imports only:

```ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
```

Never `import { ... } from '@supabase/...'` — use the URL form `https://esm.sh/@supabase/supabase-js@2`.

- [ ] **Step 3: Deploy with the no-verify-jwt flag**

The `supabase-guard` hook permits `supabase functions deploy` by default. Run:

```bash
supabase functions deploy scan-image --no-verify-jwt
```

Expected: deploy succeeds, version bumps.

- [ ] **Step 4: Wire the upload + classify call from `FertilitySignalsCard`**

Add a 5th tile (or extend the LH tile) with a camera icon. On tap, `expo-image-picker` → compress with `expo-image-manipulator` to <1MB → upload to `scan-images` bucket → call `supabase.functions.invoke('scan-image', { body: { mode: 'cycle_test', imagePath } })` → write the result to `cycle_logs` as `{ type: 'opk_scan', value: classification, scan_url: signedUrl }`.

- [ ] **Step 5: Smoke test**

Manually take a photo of any test strip in the simulator's photo library → tap the new tile → confirm classification roundtrips and the tile updates.

- [ ] **Step 6: Commit + push (no DB migration needed — Slice 2 already added the columns)**

```bash
git add supabase/functions/scan-image/index.ts components/home/cycle/FertilitySignalsCard.tsx
git commit -m "feat(cycle): scan-image cycle_test mode for OPK / pregnancy test photos"
git push origin main
```

**Slice 3 ships here.**

---

# Done

At this point:

- ✅ Cycle home matches the cream-paper system end-to-end
- ✅ TTC users can log BBT / LH / CM / Sex in under 30 seconds
- ✅ Daily Nudge speaks to the user's actual logs
- ✅ Fertile Window modal shows a real confidence score
- ✅ Pillar detail reads cleanly on cream
- ✅ `/library` is no longer a destination from cycle home
- ✅ One migration applied to prod; no other schema changes
- ✅ `scan-image` edge function classifies OPK / pregnancy test photos

---
