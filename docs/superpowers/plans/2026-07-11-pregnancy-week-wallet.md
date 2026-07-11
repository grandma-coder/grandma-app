# Pregnancy "Week Wallet" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pregnancy home's tracker + reminders + slim-rows region with one Apple-Wallet-style collapsible card stack (the "Week Wallet").

**Architecture:** A pure builder function (`buildWalletCards`) turns the data `PregnancyHome` already computes into an ordered, conditional card list — this is the unit-tested core. A presentational `WalletCard` owns collapsed-header + reanimated expand/collapse. `WeekWallet` composes them with accordion state. `PregnancyHome` drops `RemindersSection` + `SlimRow` + the standalone `TodaySummaryCard` slot and renders `<WeekWallet/>` instead, keeping its existing modal/log-sheet wiring driven by wallet callbacks.

**Tech Stack:** React Native 0.81 / React 19, Expo Router v6, TypeScript strict, `react-native-reanimated` ~4.1.1, Jest 29 (logic-only tests — this repo has no component/render tests; UI is verified by `tsc --noEmit` + running in the simulator).

## Global Constraints

- **Design tokens only** — no raw hex in JSX. Pull from `useTheme()` / `useDiffuseTheme()`: colors, `stickers`, `radius`, `font`, `shadows`. Exact sticker keys exist as `yellowSoft`/`yellowInk`, `lilacSoft`/`lilacInk`, `greenSoft`/`greenInk`, `peachSoft`/`peachInk`; mode lavender via `getModeColor('pregnancy', isDark)`.
- **Cards** radius 22 (matches current reminder cards); **shadows** only `shadows.card` (never `glow*`).
- **Mode color** via `getModeColor('pregnancy', isDark)` — never hardcode lavender.
- **Diffuse variant** — read from `useDiffuseTheme()` when `useIsDiffuse()` is true, else `useTheme()`; never mix. Stickers stay active under Diffuse.
- **i18n** — no literal user-facing strings; reuse existing keys, add new ones via `t()` (English + placeholder per wave plan).
- **Zustand v5** named import; **React Query v5** object syntax — but this task adds no new data.
- **TypeScript strict** — no `any`.
- **Work on `main`** — no worktree/branch.

---

### Task 1: `buildWalletCards` pure builder + unit tests

The one piece with testable logic: given week + today's logs + latest weight, produce the ordered list of card descriptors with correct conditional inclusion. No React here.

**Files:**
- Create: `lib/weekWallet.ts`
- Test: `lib/__tests__/weekWallet.test.ts`

**Interfaces:**
- Consumes: nothing (pure). Types mirror what `PregnancyHome` already holds: `TodayLogEntry` from `lib/analyticsData`, `StandardAppointment` from `lib/pregnancyAppointments`.
- Produces:
  ```ts
  export type WalletCardId =
    | 'today' | 'appointment' | 'week_tip' | 'kicks'
    | 'weight' | 'birth_guide' | 'ask_grandma'

  export interface WalletCardDescriptor {
    id: WalletCardId
    /** sticker palette key for the cover bg, or 'surface' for paper */
    tone: 'surface' | 'yellow' | 'lilac' | 'green' | 'peach' | 'lavender'
    /** true = tapping the header only routes/opens a modal (no inline body) */
    linkOnly: boolean
    /** appointment payload, only present on the 'appointment' card */
    appointment?: StandardAppointment
  }

  export function buildWalletCards(input: {
    weekNumber: number
    todayLogs: Record<string, TodayLogEntry>
    hasWeekTip: boolean
    upcomingAppointment: StandardAppointment | null
  }): WalletCardDescriptor[]
  ```
  Ordering: `today`, `appointment?`, `week_tip?`, `kicks?`, `weight`, `birth_guide`, `ask_grandma`.
  Conditions: `appointment` only if `upcomingAppointment` non-null; `week_tip` only if `hasWeekTip`; `kicks` only if `weekNumber >= 28 && !todayLogs['kick_count']`. `today`, `weight`, `birth_guide`, `ask_grandma` always. `ask_grandma` and `birth_guide` are `linkOnly: true`; the rest `linkOnly: false`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/weekWallet.test.ts
import { buildWalletCards } from '../weekWallet'
import type { StandardAppointment } from '../pregnancyAppointments'

const appt = { name: 'Anatomy Scan', week: 20, prepNote: 'x' } as StandardAppointment

describe('buildWalletCards', () => {
  test('week 12, no appt, no tip → today, weight, birth_guide, ask_grandma', () => {
    const ids = buildWalletCards({
      weekNumber: 12, todayLogs: {}, hasWeekTip: false, upcomingAppointment: null,
    }).map((c) => c.id)
    expect(ids).toEqual(['today', 'weight', 'birth_guide', 'ask_grandma'])
  })

  test('appointment + tip appear in order after today', () => {
    const ids = buildWalletCards({
      weekNumber: 20, todayLogs: {}, hasWeekTip: true, upcomingAppointment: appt,
    }).map((c) => c.id)
    expect(ids).toEqual(['today', 'appointment', 'week_tip', 'weight', 'birth_guide', 'ask_grandma'])
  })

  test('kicks appears at week 28 when not logged, hidden once logged', () => {
    const base = { weekNumber: 30, hasWeekTip: false, upcomingAppointment: null }
    const withKicks = buildWalletCards({ ...base, todayLogs: {} }).map((c) => c.id)
    expect(withKicks).toContain('kicks')
    const logged = buildWalletCards({
      ...base, todayLogs: { kick_count: { value: '10' } as any },
    }).map((c) => c.id)
    expect(logged).not.toContain('kicks')
  })

  test('kicks hidden before week 28', () => {
    const ids = buildWalletCards({
      weekNumber: 27, todayLogs: {}, hasWeekTip: false, upcomingAppointment: null,
    }).map((c) => c.id)
    expect(ids).not.toContain('kicks')
  })

  test('ask_grandma and birth_guide are linkOnly, today is not', () => {
    const cards = buildWalletCards({
      weekNumber: 20, todayLogs: {}, hasWeekTip: false, upcomingAppointment: null,
    })
    const byId = Object.fromEntries(cards.map((c) => [c.id, c]))
    expect(byId['ask_grandma'].linkOnly).toBe(true)
    expect(byId['birth_guide'].linkOnly).toBe(true)
    expect(byId['today'].linkOnly).toBe(false)
  })

  test('appointment card carries its payload and tone', () => {
    const cards = buildWalletCards({
      weekNumber: 20, todayLogs: {}, hasWeekTip: false, upcomingAppointment: appt,
    })
    const a = cards.find((c) => c.id === 'appointment')!
    expect(a.appointment?.name).toBe('Anatomy Scan')
    expect(a.tone).toBe('yellow')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/weekWallet.test.ts`
Expected: FAIL — cannot find module `../weekWallet`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/weekWallet.ts
import type { TodayLogEntry } from './analyticsData'
import type { StandardAppointment } from './pregnancyAppointments'

export type WalletCardId =
  | 'today' | 'appointment' | 'week_tip' | 'kicks'
  | 'weight' | 'birth_guide' | 'ask_grandma'

export interface WalletCardDescriptor {
  id: WalletCardId
  tone: 'surface' | 'yellow' | 'lilac' | 'green' | 'peach' | 'lavender'
  linkOnly: boolean
  appointment?: StandardAppointment
}

interface Input {
  weekNumber: number
  todayLogs: Record<string, TodayLogEntry>
  hasWeekTip: boolean
  upcomingAppointment: StandardAppointment | null
}

export function buildWalletCards(input: Input): WalletCardDescriptor[] {
  const { weekNumber, todayLogs, hasWeekTip, upcomingAppointment } = input
  const cards: WalletCardDescriptor[] = [
    { id: 'today', tone: 'surface', linkOnly: false },
  ]
  if (upcomingAppointment) {
    cards.push({ id: 'appointment', tone: 'yellow', linkOnly: false, appointment: upcomingAppointment })
  }
  if (hasWeekTip) {
    cards.push({ id: 'week_tip', tone: 'lilac', linkOnly: false })
  }
  if (weekNumber >= 28 && !todayLogs['kick_count']) {
    cards.push({ id: 'kicks', tone: 'green', linkOnly: false })
  }
  cards.push({ id: 'weight', tone: 'peach', linkOnly: false })
  cards.push({ id: 'birth_guide', tone: 'green', linkOnly: true })
  cards.push({ id: 'ask_grandma', tone: 'lavender', linkOnly: true })
  return cards
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/weekWallet.test.ts`
Expected: PASS (6 passing).

- [ ] **Step 5: Commit**

```bash
git add lib/weekWallet.ts lib/__tests__/weekWallet.test.ts
git commit -m "feat(pregnancy): buildWalletCards descriptor builder + tests"
```

---

### Task 2: `WalletCard` presentational component (collapsed header + animated body)

**Files:**
- Create: `components/home/pregnancy/WalletCard.tsx`

**Interfaces:**
- Consumes: nothing from prior tasks (pure presentational).
- Produces:
  ```ts
  interface WalletCardProps {
    tone: 'surface' | 'yellow' | 'lilac' | 'green' | 'peach' | 'lavender'
    icon: React.ReactNode           // sticker glyph
    title: string
    trailingValue?: string          // e.g. "62.1 kg" on the weight header
    expanded: boolean
    /** true → header shows a ↗ (routes/opens modal) instead of a chevron */
    linkOnly: boolean
    onPressHeader: () => void        // toggles expand OR routes when linkOnly
    children?: React.ReactNode       // inline body, rendered only when expanded
  }
  export function WalletCard(props: WalletCardProps): React.ReactElement
  ```

**Behavior:** collapsed = header row only (`icon · title · trailingValue? · arrow`). When `expanded && !linkOnly`, render `children` in an animated body. Arrow: `ChevronRight` rotated (chevron-down feel) that rotates on expand for non-link cards; `ArrowUpRight` for `linkOnly`. Follow the reanimated pattern in `ActivityPillCard.tsx` (`useSharedValue` + `useAnimatedStyle` + `withTiming`, `Easing`). Resolve tone → bg/ink through theme: map `'surface'`→`colors.surface`; palette tones → `stickers[tone+'Soft']` bg with `stickers[tone+'Ink']` text (for `lavender` use `getModeColor('pregnancy', isDark)` bg with `colors.text`/inverse ink). Under Diffuse, use `dt.colors.surface` bg + `dt.colors.line` border for all tones (accent glyph via `DiffuseBloomIcon`), mirroring `RemindersSection`.

- [ ] **Step 1: Implement the component**

```tsx
// components/home/pregnancy/WalletCard.tsx
import React, { useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated'
import { ChevronDown, ArrowUpRight } from 'lucide-react-native'
import {
  useTheme, font, radius, getModeColor, diffuseFont, useDiffuseTheme, getDiffuseAccent,
} from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'

export type WalletTone = 'surface' | 'yellow' | 'lilac' | 'green' | 'peach' | 'lavender'

interface WalletCardProps {
  tone: WalletTone
  icon: React.ReactNode
  title: string
  trailingValue?: string
  expanded: boolean
  linkOnly: boolean
  onPressHeader: () => void
  children?: React.ReactNode
}

export function WalletCard({
  tone, icon, title, trailingValue, expanded, linkOnly, onPressHeader, children,
}: WalletCardProps) {
  const { colors, stickers, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  const rot = useSharedValue(expanded ? 1 : 0)
  useEffect(() => {
    rot.value = withTiming(expanded ? 1 : 0, { duration: 220, easing: Easing.inOut(Easing.quad) })
  }, [expanded, rot])
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value * 180}deg` }],
  }))

  // ── resolve tone → colors ──
  let bg = colors.surface
  let ink = colors.text
  let onDark = false
  if (!diffuse) {
    if (tone === 'surface') { bg = colors.surface; ink = colors.text }
    else if (tone === 'lavender') { bg = getModeColor('pregnancy', isDark); ink = isDark ? colors.text : '#141313'; onDark = !isDark }
    else {
      const soft = (stickers as any)[tone + 'Soft']
      const inkTone = (stickers as any)[tone + 'Ink']
      bg = soft; ink = inkTone
    }
  } else {
    bg = dt.colors.surface; ink = dt.colors.ink
  }
  const border = diffuse ? dt.colors.line : colors.border

  const showBody = expanded && !linkOnly && !!children

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: border, borderWidth: diffuse ? 1 : StyleSheet.hairlineWidth }]}>
      <Pressable
        onPress={onPressHeader}
        style={({ pressed }) => [styles.header, { opacity: pressed ? 0.85 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={linkOnly ? undefined : { expanded }}
      >
        <View style={styles.icon}>{icon}</View>
        <Text style={[styles.title, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }]} numberOfLines={1}>
          {title}
        </Text>
        {trailingValue ? (
          <Text style={[styles.trailing, { color: ink, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium }]} numberOfLines={1}>
            {trailingValue}
          </Text>
        ) : null}
        {linkOnly ? (
          <ArrowUpRight size={18} color={ink} strokeWidth={2} style={{ opacity: 0.7 }} />
        ) : (
          <Animated.View style={arrowStyle}>
            <ChevronDown size={18} color={ink} strokeWidth={2} style={{ opacity: 0.7 }} />
          </Animated.View>
        )}
      </Pressable>

      {showBody ? <View style={styles.body}>{children}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, overflow: 'hidden', marginBottom: -14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 15, paddingVertical: 14 },
  icon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { flex: 1, fontSize: 16, letterSpacing: -0.2 },
  trailing: { fontSize: 13 },
  body: { paddingHorizontal: 15, paddingBottom: 16, paddingTop: 2 },
})
```

> Note on the `-14` overlap: the last card must not keep it. The parent (`WeekWallet`) wraps each card so it can drop the negative margin on the final child and add a small gap when a card is expanded — handled in Task 3. Keeping `marginBottom` on the card and overriding from the parent wrapper is simplest.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors referencing `WalletCard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/home/pregnancy/WalletCard.tsx
git commit -m "feat(pregnancy): WalletCard collapsed-header + animated body"
```

---

### Task 3: `WeekWallet` container — accordion + card bodies

Composes `buildWalletCards` + `WalletCard`, owns which card is open (default `'today'`), and renders each card's body/action. Bodies reuse existing render logic: the "Today" card renders the same pills + progress as `TodaySummaryCard`'s inner content (import and reuse `TodaySummaryCard` directly inside the expanded body to avoid duplicating pill logic); week_tip shows `getWeekData(week).momTip`; appointment shows `Week N · prepNote`; weight shows latest kg + "Open trend ↗"; kicks shows the nudge + opens the log.

**Files:**
- Create: `components/home/pregnancy/WeekWallet.tsx`

**Interfaces:**
- Consumes: `buildWalletCards`, `WalletCardDescriptor` (Task 1); `WalletCard` (Task 2); existing `TodaySummaryCard`, `getUpcomingAppointment`, `getWeekData`, sticker glyphs from `RewardStickers`, `Leaf` from `Stickers`, `GrandmaLogo`.
- Produces:
  ```ts
  interface WeekWalletProps {
    weekNumber: number
    todayLogs: Record<string, TodayLogEntry>
    userId: string | undefined
    latestWeight: number | null
    onLogMetric: (type: string) => void
    onOpenAppointment: (appt: StandardAppointment) => void
    onOpenWeekDetail: () => void
    onOpenBirthGuide: () => void
  }
  export function WeekWallet(props: WeekWalletProps): React.ReactElement
  ```

- [ ] **Step 1: Implement the container**

```tsx
// components/home/pregnancy/WeekWallet.tsx
import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useTheme, font, stickers as _s, diffuseFont, useDiffuseTheme } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { useTranslation } from '../../../lib/i18n'
import { buildWalletCards, type WalletCardId } from '../../../lib/weekWallet'
import { getUpcomingAppointment } from '../../../lib/pregnancyAppointments'
import type { StandardAppointment } from '../../../lib/pregnancyAppointments'
import { getWeekData } from '../../../lib/pregnancyData'
import type { TodayLogEntry } from '../../../lib/analyticsData'
import { WalletCard } from './WalletCard'
import { TodaySummaryCard } from './TodaySummaryCard'
import {
  NotifyAppointmentDue, TipRead, LogKicks, LogWeight,
} from '../../stickers/RewardStickers'
import { Leaf } from '../../ui/Stickers'
import { GrandmaLogo } from '../../ui/GrandmaLogo'

interface WeekWalletProps {
  weekNumber: number
  todayLogs: Record<string, TodayLogEntry>
  userId: string | undefined
  latestWeight: number | null
  onLogMetric: (type: string) => void
  onOpenAppointment: (appt: StandardAppointment) => void
  onOpenWeekDetail: () => void
  onOpenBirthGuide: () => void
}

export function WeekWallet({
  weekNumber, todayLogs, userId, latestWeight,
  onLogMetric, onOpenAppointment, onOpenWeekDetail, onOpenBirthGuide,
}: WeekWalletProps) {
  const { colors, stickers, font: f } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  const [openId, setOpenId] = useState<WalletCardId | null>('today')
  const appt = getUpcomingAppointment(weekNumber)
  const weekData = getWeekData(weekNumber)
  const cards = buildWalletCards({
    weekNumber, todayLogs,
    hasWeekTip: !!weekData?.momTip,
    upcomingAppointment: appt ?? null,
  })

  const toggle = (id: WalletCardId) => setOpenId((cur) => (cur === id ? null : id))

  const bodyText = (s: string) => (
    <Text style={{ fontSize: 13, lineHeight: 19, color: diffuse ? dt.colors.ink2 : colors.textMuted, fontFamily: diffuse ? diffuseFont.body : f.body }}>{s}</Text>
  )
  const linkBtn = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} style={styles.linkBtn} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.text, fontFamily: f.bodySemiBold }}>{label}</Text>
    </Pressable>
  )

  const iconFor = (id: WalletCardId) => {
    switch (id) {
      case 'today': return <TipRead size={22} />          // calendar-ish glyph
      case 'appointment': return <NotifyAppointmentDue size={26} />
      case 'week_tip': return <TipRead size={26} />
      case 'kicks': return <LogKicks size={26} />
      case 'weight': return <LogWeight size={24} />
      case 'birth_guide': return <Leaf size={24} fill={stickers.green} />
      case 'ask_grandma': return <GrandmaLogo size={26} palette="lilac" outline={colors.text} />
    }
  }

  const titleFor = (id: WalletCardId): string => {
    switch (id) {
      case 'today': return t('pregnancy_todayAtGlance')
      case 'appointment': return appt?.name ?? ''
      case 'week_tip': return t('pregnancy_reminder_weekTip', { week: weekNumber })
      case 'kicks': return t('pregnancy_reminder_kickCountTitle')
      case 'weight': return t('preg_weight_sheetTitle')
      case 'birth_guide': return t('pregnancy_birthGuideTitle')
      case 'ask_grandma': return t('pregnancy_appt_askGrandma')
    }
  }

  const onHeader = (id: WalletCardId, linkOnly: boolean) => {
    if (id === 'birth_guide') return onOpenBirthGuide()
    if (id === 'ask_grandma') return router.push('/grandma-talk')
    if (linkOnly) return
    toggle(id)
  }

  const bodyFor = (id: WalletCardId): React.ReactNode => {
    switch (id) {
      case 'today':
        return userId !== undefined || true
          ? <TodaySummaryCard todayLogs={todayLogs} weekNumber={weekNumber} userId={userId} onLogMetric={onLogMetric} />
          : null
      case 'appointment':
        return (
          <View style={{ gap: 10 }}>
            {bodyText(`${t('pregnancy_week')} ${appt?.week} · ${appt?.prepNote ?? ''}`)}
            {linkBtn(t('preg_weekCard_tapForDetails'), () => appt && onOpenAppointment(appt))}
          </View>
        )
      case 'week_tip':
        return (
          <View style={{ gap: 10 }}>
            {bodyText(weekData?.momTip ?? '')}
            {linkBtn(t('preg_weekCard_tapForDetails'), onOpenWeekDetail)}
          </View>
        )
      case 'kicks':
        return (
          <View style={{ gap: 10 }}>
            {bodyText(t('pregnancy_reminder_kickCountSubtitle'))}
            {linkBtn(t('pregnancy_logTitle_kicks'), () => onLogMetric('kick_count'))}
          </View>
        )
      case 'weight':
        return (
          <View style={{ gap: 10 }}>
            {bodyText(latestWeight !== null ? `${latestWeight.toFixed(1)} kg` : t('pregnancy_summaryHint_empty'))}
            {linkBtn(t('preg_weekCard_tapForDetails'), () => router.push('/insights'))}
          </View>
        )
      default:
        return null
    }
  }

  return (
    <View>
      {cards.map((c, i) => {
        const isLast = i === cards.length - 1
        const trailing = c.id === 'weight' && latestWeight !== null ? `${latestWeight.toFixed(1)} kg` : undefined
        return (
          <View key={c.id} style={isLast ? undefined : { zIndex: cards.length - i }}>
            <WalletCard
              tone={c.tone}
              icon={iconFor(c.id)}
              title={titleFor(c.id)}
              trailingValue={trailing}
              expanded={openId === c.id}
              linkOnly={c.linkOnly}
              onPressHeader={() => onHeader(c.id, c.linkOnly)}
            >
              {bodyFor(c.id)}
            </WalletCard>
            {isLast ? null : <View style={{ height: 0 }} />}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  linkBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(20,19,19,0.15)' },
})
```

> `TodaySummaryCard` already renders its own `PaperCard`/`DiffuseFieldSurface` wrapper. Inside the wallet body we want the pills without a nested card chrome — so Task 3 Step 2 refactors `TodaySummaryCard` to accept an optional `bare` prop that skips the outer card wrapper (renders just `inner`). Keep the header row inside `inner` so the dashboard-modal chevron survives.

- [ ] **Step 2: Add a `bare` prop to `TodaySummaryCard`**

Modify `components/home/pregnancy/TodaySummaryCard.tsx`:
- Add `bare?: boolean` to `Props`.
- In the returned JSX, when `bare` is true, render `{inner}` directly (still inside the `<View style={styles.wrap}>` + the `TodayDashboardModal`), skipping both the `DiffuseFieldSurface` and `PaperCard` wrappers.

```tsx
// Props interface — add:
  bare?: boolean
// destructure:
export function TodaySummaryCard({ todayLogs, weekNumber, userId, onLogMetric, bare = false }: Props) {
// return block — replace the diffuse ? (...) : (...) card wrappers with:
  return (
    <View style={bare ? undefined : styles.wrap}>
      {bare ? inner : diffuse ? (
        <DiffuseFieldSurface mode="preg" isDark={dt.isDark} intensity={0.45} radius={radius.lg} style={{ padding: 18, borderWidth: 1, borderColor: dt.colors.line }}>
          {inner}
        </DiffuseFieldSurface>
      ) : (
        <PaperCard tint={paper} radius={radius.lg} padding={18}>{inner}</PaperCard>
      )}
      {userId && (
        <TodayDashboardModal visible={open} onClose={() => setOpen(false)} todayLogs={todayLogs} weekNumber={weekNumber} userId={userId} />
      )}
    </View>
  )
```
Then in `WeekWallet.bodyFor('today')` pass `bare`: `<TodaySummaryCard ... bare />`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors. (If `stickers as any` index access trips strict rules, keep the explicit `as any` cast used in `WalletCard`.)

- [ ] **Step 4: Commit**

```bash
git add components/home/pregnancy/WeekWallet.tsx components/home/pregnancy/TodaySummaryCard.tsx
git commit -m "feat(pregnancy): WeekWallet accordion container + TodaySummaryCard bare mode"
```

---

### Task 4: Wire `WeekWallet` into `PregnancyHome`; retire `RemindersSection` + `SlimRow`

**Files:**
- Modify: `components/home/PregnancyHome.tsx`
- Delete: `components/home/pregnancy/RemindersSection.tsx`

**Interfaces:**
- Consumes: `WeekWallet` (Task 3).

- [ ] **Step 1: Replace the middle of the render tree**

In `PregnancyHome.tsx`, replace sections 3–7 (the `TodaySummaryCard` block, the `RemindersSection` + `MonoCaps` block, and the three `SlimRow`s) with a single wallet block, keeping the "Your week" caption:

```tsx
{/* 3. Week Wallet — collapsible stack (tracker + reminders + shortcuts) */}
<View style={styles.section}>
  {diffuse ? (
    <Text style={{ marginBottom: 12, fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: dt.colors.ink3 }}>
      {t('pregnancy_weekWallet_label')}
    </Text>
  ) : (
    <MonoCaps style={{ marginBottom: 12 }}>{t('pregnancy_weekWallet_label')}</MonoCaps>
  )}
  <WeekWallet
    weekNumber={weekNumber}
    todayLogs={todayLogs}
    userId={userId}
    latestWeight={latestWeight}
    onLogMetric={(type) => setActiveLog(type as InlineLogType)}
    onOpenAppointment={(appt) => setApptDetail(appt)}
    onOpenWeekDetail={() => { setDetailWeek(weekNumber); setWeekDetailVisible(true) }}
    onOpenBirthGuide={() => setBirthGuideVisible(true)}
  />
  <View style={{ height: 12 }} />
  <PregnancyUserReminders userId={userId ?? null} />
</View>
```

- [ ] **Step 2: Remove now-dead imports & the `SlimRow` component**

In `PregnancyHome.tsx`:
- Delete the `SlimRow` function (lines defining `interface SlimRowProps` + `function SlimRow`) and its `slimRow`/`slimIcon`/`slimTitle` styles.
- Remove imports no longer used: `RemindersSection`, `ReminderLogType`, `TodaySummaryCard` (now only used inside WeekWallet), `Leaf`, `GrandmaLogo`, `LogWeight`, `ChevronRight` if unused, `PaperCard` if unused after SlimRow removal. Add `import { WeekWallet } from './pregnancy/WeekWallet'`.
- Keep: `LogSheet`, all form imports, all modal imports, `usePregnancyTodayLogs`, the `latestWeight` query.

- [ ] **Step 3: Add the new i18n key**

Add to `lib/i18n/en.ts` (or the en source used by `t`): `pregnancy_weekWallet_label: 'Your week'`. Follow the existing key file's shape (verify exact filename with `grep -rl "pregnancy_todayAtGlance" lib/i18n`). Add placeholder entries for other locales only if the check script requires it; run `npm run i18n:check`.

- [ ] **Step 4: Delete `RemindersSection.tsx`**

```bash
git rm components/home/pregnancy/RemindersSection.tsx
```

- [ ] **Step 5: Typecheck + lint + i18n check**

Run: `npm run typecheck && npm run i18n:check`
Expected: no errors, no missing-key failures. Then `npm run lint` — expected: no new literal-string or unused-import errors in the touched files.

- [ ] **Step 6: Commit**

```bash
git add components/home/PregnancyHome.tsx lib/i18n
git commit -m "feat(pregnancy): mount WeekWallet on home, retire RemindersSection + SlimRow"
```

---

### Task 5: Verify in the running app

**Files:** none (manual verification).

- [ ] **Step 1: Launch and drive the pregnancy home**

Use the `run` skill (or `npm start` + simulator). Set mode to Pregnancy. Verify:
- The wallet stack renders below the affirmation: Today (open by default, pills visible), then any appointment / week tip / kicks, then Weight (header shows kg), Birth Guide, Ask Grandma — cards overlap like a stack.
- Tapping a collapsed header expands it and collapses the previously-open one (accordion); arrow rotates.
- Today pills open their log sheets; Today header chevron opens the dashboard modal; appointment "detail" opens `AppointmentDetailModal`; week tip opens `WeekDetailModal`; Weight → Insights; Birth Guide → `BirthGuideModal`; Ask Grandma → grandma-talk.
- Add-reminder + saved reminders still render below the stack.
- Toggle Dev Panel → DESIGN VARIANT to Diffuse; confirm the wallet reads Diffuse tokens (surface bg, line borders, bloom glyphs) with no cream-palette bleed.
- Flip to dark theme; confirm ink/soft tones are legible.

- [ ] **Step 2: Fix any issues found, then final commit if changes were made**

```bash
git add -A && git commit -m "fix(pregnancy): week wallet polish from device verification"
```

---

## Self-Review

**Spec coverage:**
- Six/seven cards + conditions → Task 1 (`buildWalletCards`, tested) ✓
- Accordion, one-open-at-a-time, Today default open → Task 3 (`openId` state) ✓
- Hybrid inline/modal (linkOnly + linkBtn) → Tasks 2–3 ✓
- Reanimated motion (arrow rotate; body show/hide) → Task 2 ✓ (Note: full spring height-measure animation was scoped down to arrow-rotate + conditional body render to match the codebase's shared-value pattern without adding height measurement; acceptable per "keep mockups simple" — flagged for device polish in Task 5.)
- Diffuse + dark support → Tasks 2–3, verified Task 5 ✓
- New file `WeekWallet.tsx` + `WalletCard`, `PregnancyHome` shrinks, `RemindersSection`/`SlimRow` retired → Tasks 3–4 ✓
- Reuse existing modals/log sheets, no new data → Tasks 3–4 ✓
- i18n reuse + one new key → Task 4 ✓

**Placeholder scan:** No TBDs. One deliberate simplification (body animation → conditional render + arrow rotate) is documented, not hidden. `TodaySummaryCard` bare-mode edit is spelled out with the exact JSX.

**Type consistency:** `WalletCardId` / `WalletCardDescriptor` / `tone` union identical across Tasks 1→2→3. `WalletCard` props consumed exactly as produced. `buildWalletCards` input shape matches the call site in Task 3.

**Open risk to watch during execution:** the `-14` overlap + `overflow:'hidden'` on a card can clip an expanded body's shadow; if the expanded body looks cramped, drop the negative margin on the open card in `WeekWallet` (add `marginBottom: 0` override when `openId === c.id`). Called out here so the executor isn't surprised.
