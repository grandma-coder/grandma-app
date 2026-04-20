# Profile redesign — Wave 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the cream-paper ProfileScreen from the design-system JSX (`docs/Claude design studio, .../src/more-screens.jsx:5-86`) into [app/(tabs)/settings.tsx](../../../app/(tabs)/settings.tsx), plus four shared primitives (`ProfileHero`, `BadgesStrip`, `MyJourneyPillGrid`, `StatRow`) that later waves will reuse.

**Architecture:** Four small presentational primitives in `components/ui/` and `components/profile/`, composed by a rewritten `ProfileScreen` at `app/(tabs)/settings.tsx`. The existing `MyJourneys.tsx` is replaced by `MyJourneyPillGrid`; its subtitle-generator logic is extracted to `lib/profileStatus.ts`. No new data layer — we reuse `useBehaviorStore`, `useModeStore`, `useBadgeStore`, `useChildStore`, `usePregnancyStore`, and Supabase for `care_circle` count.

**Tech Stack:** React Native 0.81, Expo Router v6, Zustand v5, TanStack Query v5, Supabase, `react-native-svg` for stickers. Design tokens live in [constants/theme.ts](../../../constants/theme.ts).

**Testing model:** This codebase doesn't ship unit tests for presentational screens. Verification is typecheck (`npx tsc --noEmit`) + manual simulator smoke-check. Each task ends with a typecheck pass and a commit. The user runs the simulator after Task 7.

**Spec:** [docs/superpowers/specs/2026-04-19-profile-redesign-wave1-design.md](../specs/2026-04-19-profile-redesign-wave1-design.md)

---

## File map

### New files
| File | Responsibility |
|------|---------------|
| `lib/profileStatus.ts` | Pure functions returning mode-aware subtitle strings (cycle day / pregnancy week / active child + age). |
| `components/ui/StatRow.tsx` | One-line row: icon circle + label + right value + chevron. Generic, used across profile + future screens. |
| `components/profile/BadgesStrip.tsx` | Paper card with "BADGES" label, "All N →" action, horizontal scroll of 58px sticker circles. |
| `components/profile/ProfileHero.tsx` | Hero block: yellow/pink sticker accents, 110px avatar circle with initial + star sticker corner, serif+italic name, mode subtitle. |
| `components/profile/MyJourneyPillGrid.tsx` | Paper card with "MY JOURNEY" label + 3-col pill grid (Trying/Pregnant/Parent), active pill in mode accent. Includes fade-transition on switch. |

### Modified files
| File | Change |
|------|--------|
| `app/(tabs)/settings.tsx` | Replace hero + section groups + `MyJourneys` mount with new primitives. Keep sign-out + version. |

### Deleted files
| File | Reason |
|------|--------|
| `components/profile/MyJourneys.tsx` | Replaced by `MyJourneyPillGrid`; status-line logic extracted to `lib/profileStatus.ts`. |

---

## Task 1 — Create `lib/profileStatus.ts`

**Files:**
- Create: `lib/profileStatus.ts`

- [ ] **Step 1: Create the file**

```ts
/**
 * profileStatus — mode-aware subtitle generator used in ProfileHero.
 *
 * Pure functions that read from Zustand stores at call time
 * and return a short human-readable status line.
 */

import { getCycleInfo, toDateStr } from './cycleLogic'
import { useChildStore } from '../store/useChildStore'
import { usePregnancyStore } from '../store/usePregnancyStore'
import type { Behavior } from '../store/useBehaviorStore'

function formatAge(birthDate: string | undefined | null): string {
  if (!birthDate) return ''
  const born = new Date(birthDate)
  if (Number.isNaN(born.getTime())) return ''
  const now = new Date()
  const months =
    (now.getFullYear() - born.getFullYear()) * 12 +
    (now.getMonth() - born.getMonth())
  if (months < 1) return 'newborn'
  if (months < 12) return `${months}m`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m > 0 ? `${y}y ${m}m` : `${y}y`
}

export function getCycleSubtitle(): string {
  // Placeholder cycle config; real logic lives in the pre-preg flow
  // and will replace this in Wave 2 when we port cycle profile.
  const d = new Date()
  d.setDate(d.getDate() - 10)
  const info = getCycleInfo({
    lastPeriodStart: toDateStr(d),
    cycleLength: 28,
    periodLength: 5,
  })
  return `Day ${info.cycleDay} · ${info.phaseLabel}`
}

export function getPregnancySubtitle(): string {
  const week = usePregnancyStore.getState().weekNumber ?? 24
  const dueDate = usePregnancyStore.getState().dueDate
  if (!dueDate) return `Week ${week}`
  const due = new Date(dueDate + 'T00:00:00')
  const dueFmt = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Week ${week} · due ${dueFmt}`
}

export function getKidsSubtitle(): string {
  const children = useChildStore.getState().children
  if (children.length === 0) return 'No children added'
  const active = useChildStore.getState().activeChildId
  const child =
    children.find((c) => c.id === active) ?? children[0]
  const age = formatAge(child.birthDate)
  return age ? `${child.name} · ${age} old` : child.name
}

export function getSubtitleFor(behavior: Behavior): string {
  switch (behavior) {
    case 'pre-pregnancy':
      return getCycleSubtitle()
    case 'pregnancy':
      return getPregnancySubtitle()
    case 'kids':
      return getKidsSubtitle()
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors introduced by the new file).

- [ ] **Step 3: Commit**

```bash
git add lib/profileStatus.ts
git commit -m "feat(profile): extract mode-aware subtitle helpers to lib/profileStatus"
```

---

## Task 2 — Create `components/ui/StatRow.tsx`

**Files:**
- Create: `components/ui/StatRow.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { useTheme } from '../../constants/theme'

interface StatRowProps {
  icon: ReactNode                // 18px sticker placed inside a 34px circle
  label: string
  value?: string
  onPress?: () => void
  isLast?: boolean               // suppress bottom border
  iconBg?: string                // default: colors.surfaceRaised
  style?: StyleProp<ViewStyle>
}

/**
 * One-line row with leading sticker-icon circle, label, right value, chevron.
 * Matches the paper-card row pattern from the redesign ProfileScreen.
 */
export function StatRow({
  icon,
  label,
  value,
  onPress,
  isLast,
  iconBg,
  style,
}: StatRowProps) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
        pressed && onPress ? { opacity: 0.7 } : null,
        style,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: iconBg ?? colors.surfaceRaised },
        ]}
      >
        {icon}
      </View>
      <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text style={[styles.value, { color: colors.textMuted }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 14, fontWeight: '500' },
  value: { fontSize: 12, fontWeight: '500' },
})
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/ui/StatRow.tsx
git commit -m "feat(ui): add StatRow primitive for paper-card menu rows"
```

---

## Task 3 — Create `components/profile/BadgesStrip.tsx`

**Files:**
- Create: `components/profile/BadgesStrip.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../constants/theme'
import * as Stickers from '../ui/Stickers'

export type StickerName =
  | 'Burst'
  | 'Heart'
  | 'Drop'
  | 'Star'
  | 'Moon'
  | 'Leaf'
  | 'Flower'
  | 'Cross'

export interface BadgeEntry {
  color: string
  sticker: StickerName
  label: string             // e.g. "day 7"
}

interface BadgesStripProps {
  badges: BadgeEntry[]      // up to 5 rendered; more scroll horizontally
  total: number             // for "All N →"
  onSeeAll?: () => void
}

/**
 * Paper card with "BADGES" header + "All N →" link, followed by a
 * horizontal row of 58px circles each containing a sticker + day label.
 */
export function BadgesStrip({ badges, total, onSeeAll }: BadgesStripProps) {
  const { colors, radius } = useTheme()

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: colors.textMuted }]}>BADGES</Text>
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={[styles.allLink, { color: colors.textMuted }]}>
            All {total} →
          </Text>
        </Pressable>
      </View>

      {badges.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View
            style={[
              styles.circle,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            ]}
          />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No badges yet
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {badges.map((b, i) => {
            const Sticker = Stickers[b.sticker] as (p: any) => JSX.Element
            return (
              <View key={i} style={styles.item}>
                <View
                  style={[
                    styles.circle,
                    {
                      backgroundColor: colors.surfaceRaised,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Sticker size={40} fill={b.color} />
                </View>
                <Text style={[styles.dayLabel, { color: colors.textMuted }]}>
                  {b.label}
                </Text>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  allLink: { fontSize: 11, fontWeight: '500' },
  scrollContent: { gap: 10, paddingRight: 10 },
  item: { alignItems: 'center' },
  circle: {
    width: 58,
    height: 58,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { fontSize: 10, marginTop: 4 },
  emptyWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 12 },
})
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/profile/BadgesStrip.tsx
git commit -m "feat(profile): add BadgesStrip horizontal card for ProfileScreen"
```

---

## Task 4 — Create `components/profile/ProfileHero.tsx`

**Files:**
- Create: `components/profile/ProfileHero.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { View, Text, StyleSheet } from 'react-native'
import { useTheme, brand } from '../../constants/theme'
import { Heart as HeartSticker, Squishy, Star as StarSticker } from '../ui/Stickers'

interface ProfileHeroProps {
  initial: string           // first letter of the name (uppercase)
  firstName: string         // serif display
  lastName?: string         // italic display (Instrument Serif feel)
  subtitle?: string         // mode-aware status line
  accentColor: string       // avatar bg (mode color)
}

/**
 * Hero block for the Profile tab: rotated sticker accents, large
 * initial-letter avatar circle with a star sticker at the corner,
 * serif + italic name, and a mode-aware subtitle.
 *
 * Source: docs/Claude design studio/src/more-screens.jsx:12-31
 */
export function ProfileHero({
  initial,
  firstName,
  lastName,
  subtitle,
  accentColor,
}: ProfileHeroProps) {
  const { colors, stickers, font } = useTheme()

  return (
    <View style={styles.root}>
      {/* Sticker accents */}
      <View style={styles.stickerLeft}>
        <Squishy w={64} h={44} fill={stickers.yellow} />
      </View>
      <View style={styles.stickerRight}>
        <HeartSticker size={40} fill={stickers.pink} />
      </View>

      {/* Avatar */}
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: accentColor,
            borderColor: colors.text,
          },
        ]}
      >
        <Text
          style={[
            styles.initial,
            { fontFamily: font.display, color: colors.text },
          ]}
          allowFontScaling={false}
        >
          {initial}
        </Text>
        <View style={styles.avatarStar}>
          <StarSticker size={38} fill={stickers.yellow} />
        </View>
      </View>

      {/* Name */}
      <View style={styles.nameRow}>
        <Text
          style={[styles.firstName, { fontFamily: font.display, color: colors.text }]}
          allowFontScaling={false}
        >
          {firstName}
        </Text>
        {lastName ? (
          <Text
            style={[
              styles.lastName,
              { fontFamily: font.italic, color: colors.text },
            ]}
            allowFontScaling={false}
          >
            {' '}
            {lastName}
          </Text>
        ) : null}
      </View>

      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    paddingTop: 8,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
  },
  stickerLeft: {
    position: 'absolute',
    top: 6,
    left: 20,
    transform: [{ rotate: '-10deg' }],
    zIndex: 0,
  },
  stickerRight: {
    position: 'absolute',
    top: 0,
    right: 28,
    transform: [{ rotate: '14deg' }],
    zIndex: 0,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 999,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  initial: { fontSize: 44, fontWeight: '600' },
  avatarStar: { position: 'absolute', bottom: -4, right: -4 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline' },
  firstName: { fontSize: 28, fontWeight: '600', letterSpacing: -0.3 },
  lastName: { fontSize: 28, fontWeight: '400', fontStyle: 'italic', letterSpacing: -0.2 },
  subtitle: { fontSize: 13, marginTop: 2, fontWeight: '500' },
})
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/profile/ProfileHero.tsx
git commit -m "feat(profile): add ProfileHero with sticker accents + initial avatar"
```

---

## Task 5 — Create `components/profile/MyJourneyPillGrid.tsx`

**Files:**
- Create: `components/profile/MyJourneyPillGrid.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useRef, useState } from 'react'
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useTheme, brand, getModeColor } from '../../constants/theme'
import { useBehaviorStore, type Behavior } from '../../store/useBehaviorStore'
import { useModeStore } from '../../store/useModeStore'

const PILL_ORDER: Array<{ behavior: Behavior; label: string }> = [
  { behavior: 'pre-pregnancy', label: 'Trying' },
  { behavior: 'pregnancy', label: 'Pregnant' },
  { behavior: 'kids', label: 'Parent' },
]

/**
 * 3-column pill grid that switches the active journey mode.
 * Replaces the row-based MyJourneys component.
 *
 * Source: docs/Claude design studio/src/more-screens.jsx:54-65
 *
 * - Enrolled + active behavior → mode-accent bg
 * - Enrolled + inactive → paper-raised bg, 0.6 opacity
 * - Not-enrolled → paper-raised bg, 0.35 opacity; tap routes to
 *   /onboarding/journey to enroll.
 */
export function MyJourneyPillGrid() {
  const { colors, radius, isDark, font } = useTheme()
  const currentBehavior = useBehaviorStore((s) => s.currentBehavior)
  const enrolled = useBehaviorStore((s) => s.enrolledBehaviors)
  const switchTo = useBehaviorStore((s) => s.switchTo)
  const setMode = useModeStore((s) => s.setMode)

  const [overlayActive, setOverlayActive] = useState(false)
  const [overlayColor, setOverlayColor] = useState(brand.primary)
  const fade = useRef(new Animated.Value(0)).current

  function handlePress(b: Behavior) {
    if (b === currentBehavior) return

    const isEnrolled = enrolled.includes(b)
    if (!isEnrolled) {
      router.push({
        pathname: '/onboarding/journey',
        params: { addMode: 'true' },
      })
      return
    }

    const accent = getModeColor(b, isDark)
    setOverlayColor(accent)
    setOverlayActive(true)

    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setOverlayActive(false))

    setTimeout(() => {
      switchTo(b)
      setMode(b)
    }, 100)
  }

  return (
    <>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      >
        <Text style={[styles.header, { color: colors.textMuted }]}>MY JOURNEY</Text>
        <View style={styles.grid}>
          {PILL_ORDER.map(({ behavior, label }) => {
            const isActive = behavior === currentBehavior
            const isEnrolled = enrolled.includes(behavior)
            const accent = getModeColor(behavior, isDark)
            return (
              <Pressable
                key={behavior}
                onPress={() => handlePress(behavior)}
                style={({ pressed }) => [
                  styles.pill,
                  {
                    backgroundColor: isActive ? accent : colors.surfaceRaised,
                    borderColor: colors.border,
                    opacity: isActive ? 1 : isEnrolled ? 0.6 : 0.35,
                  },
                  pressed && { opacity: (isActive ? 1 : 0.6) * 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.pillLabel,
                    { fontFamily: font.display, color: colors.text },
                  ]}
                  allowFontScaling={false}
                >
                  {label}
                </Text>
                {isActive ? (
                  <Text style={[styles.activeHint, { color: colors.text }]}>active</Text>
                ) : !isEnrolled ? (
                  <Text style={[styles.activeHint, { color: colors.textMuted }]}>+ add</Text>
                ) : null}
              </Pressable>
            )
          })}
        </View>
      </View>

      {overlayActive && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: overlayColor, opacity: fade, zIndex: 1000 },
          ]}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
  },
  header: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  grid: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pillLabel: { fontSize: 14, fontWeight: '600' },
  activeHint: { fontSize: 10, fontWeight: '500', marginTop: 2 },
})
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/profile/MyJourneyPillGrid.tsx
git commit -m "feat(profile): add MyJourneyPillGrid 3-col mode switcher"
```

---

## Task 6 — Port main ProfileScreen at `app/(tabs)/settings.tsx`

**Files:**
- Modify: `app/(tabs)/settings.tsx` (rewrite body; keep imports that are still used)

- [ ] **Step 1: Open the file and replace body**

Replace the entire file contents with the following. The goal is a composed screen using the new primitives; data loading (name, email, badges, care circle count) is preserved and extended.

```tsx
/**
 * Profile tab — cream-paper redesign (Wave 1).
 *
 * Hero (sticker accents + initial avatar + mode subtitle) →
 * BadgesStrip → MyJourneyPillGrid → stat rows → Sign out.
 *
 * Source: docs/Claude design studio/src/more-screens.jsx:5-86
 */

import { useCallback, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  Pressable,
  Text,
  Alert,
  StyleSheet,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Settings as SettingsIcon, LogOut } from 'lucide-react-native'
import { useTheme, brand, getModeColor } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { useChildStore } from '../../store/useChildStore'
import { useBadgeStore } from '../../store/useBadgeStore'
import { supabase } from '../../lib/supabase'
import { useTranslation } from '../../lib/i18n'
import { useDevPanel } from '../../context/DevPanelContext'
import { getSubtitleFor } from '../../lib/profileStatus'
import { ProfileHero } from '../../components/profile/ProfileHero'
import { BadgesStrip, type BadgeEntry } from '../../components/profile/BadgesStrip'
import { MyJourneyPillGrid } from '../../components/profile/MyJourneyPillGrid'
import { StatRow } from '../../components/ui/StatRow'
import {
  Heart as HeartSticker,
  Star as StarSticker,
  Leaf as LeafSticker,
  Cross as CrossSticker,
  Burst as BurstSticker,
} from '../../components/ui/Stickers'

// ─── Badge sticker mapping ─────────────────────────────────────────────────

type BadgeTheme = { color: string; sticker: BadgeEntry['sticker'] }
const BADGE_THEMES: BadgeTheme[] = [
  { color: '#F5D652', sticker: 'Burst' }, // yellow
  { color: '#F2B2C7', sticker: 'Heart' }, // pink
  { color: '#9DC3E8', sticker: 'Drop' },  // blue
  { color: '#BDD48C', sticker: 'Star' },  // green
  { color: '#C8B6E8', sticker: 'Moon' },  // lilac
]

export default function ProfileScreen() {
  const { colors, radius, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const mode = useModeStore((s) => s.mode)
  const currentBehavior = useBehaviorStore((s) => s.currentBehavior)
  const children = useChildStore((s) => s.children)
  const earnedBadges = useBadgeStore((s) => s.earnedBadges)

  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [joinedYear, setJoinedYear] = useState<number | null>(null)
  const [careCircleCount, setCareCircleCount] = useState<number>(0)

  // Dev-panel 5-tap trigger (preserved)
  const { openDevPanel } = useDevPanel()
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleHeroPress() {
    if (!__DEV__ && process.env.EXPO_PUBLIC_ENABLE_DEV_PANEL !== 'true') return
    tapCount.current += 1
    if (tapTimer.current) clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 1500)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (tapCount.current === 5) {
      tapCount.current = 0
      if (tapTimer.current) clearTimeout(tapTimer.current)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      openDevPanel()
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadProfile()
    }, [])
  )

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserEmail(session.user.email ?? null)

    const [{ data: profile }, { count }] = await Promise.all([
      supabase
        .from('profiles')
        .select('name, created_at')
        .eq('id', session.user.id)
        .single(),
      supabase
        .from('care_circle')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id),
    ])

    if (profile?.name) setUserName(profile.name)
    if (profile?.created_at) setJoinedYear(new Date(profile.created_at).getFullYear())
    setCareCircleCount(count ?? 0)
  }

  async function handleSignOut() {
    Alert.alert(t('profile_signOut'), t('profile_signOutConfirm'), [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('profile_signOut'),
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/(auth)/welcome')
        },
      },
    ])
  }

  // ─── Derived values ───────────────────────────────────────────────────────
  const nameParts = (userName ?? '').trim().split(/\s+/).filter(Boolean)
  const firstName = nameParts[0] ?? 'Hi'
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined
  const initial = (firstName[0] ?? 'I').toUpperCase()

  const behaviorForSubtitle = currentBehavior ?? 'kids'
  const subtitle = userEmail ? getSubtitleFor(behaviorForSubtitle) : ''

  const accent = getModeColor(mode, isDark)

  // Badges: pick up to 5 most recently earned
  const recentBadges: BadgeEntry[] = earnedBadges
    .slice()
    .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
    .slice(0, 5)
    .map((b, i) => {
      const theme = BADGE_THEMES[i % BADGE_THEMES.length]
      return { color: theme.color, sticker: theme.sticker, label: b.label ?? `day ${i + 7}` }
    })

  const hasChildren = children.length > 0
  const hasEmergency = false // Wave 2 wires real emergency status

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar — settings gear only (root of tab, no back) */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.push('/profile/settings')}
            style={[
              styles.gearBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            hitSlop={8}
          >
            <SettingsIcon size={16} color={colors.text} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Hero */}
        <Pressable onPress={handleHeroPress}>
          <ProfileHero
            initial={initial}
            firstName={firstName}
            lastName={lastName}
            subtitle={subtitle}
            accentColor={accent}
          />
        </Pressable>

        {/* Badges */}
        <BadgesStrip
          badges={recentBadges}
          total={earnedBadges.length}
          onSeeAll={() => router.push('/profile/badges')}
        />

        {/* Journey switcher */}
        <MyJourneyPillGrid />

        {/* Menu */}
        <View
          style={[
            styles.menuCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
            },
          ]}
        >
          <StatRow
            icon={<HeartSticker size={18} fill="#F2B2C7" />}
            label={t('profile_careCircle')}
            value={careCircleCount === 1 ? '1 person' : `${careCircleCount} people`}
            onPress={() => router.push('/profile/care-circle')}
          />
          {hasChildren && (
            <StatRow
              icon={<StarSticker size={18} fill="#F5D652" />}
              label={t('profile_memories')}
              value="—"
              onPress={() => router.push('/profile/memories')}
            />
          )}
          {hasChildren && (
            <StatRow
              icon={<LeafSticker size={18} fill="#BDD48C" />}
              label={t('profile_healthHistory')}
              value={joinedYear ? `Since ${joinedYear}` : '—'}
              onPress={() => router.push('/profile/health-history')}
            />
          )}
          <StatRow
            icon={<CrossSticker size={18} fill="#EE7B6D" />}
            label={t('profile_emergencyInsurance')}
            value={hasEmergency ? 'Ready' : 'Not set'}
            onPress={() => router.push('/profile/emergency-insurance')}
          />
          <StatRow
            icon={<BurstSticker size={18} fill="#C8B6E8" />}
            label={t('profile_subscription')}
            value="Upgrade"
            onPress={() => router.push('/paywall')}
            isLast
          />
        </View>

        {/* Sign out */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutBtn,
            { backgroundColor: colors.surface, borderRadius: radius.lg },
            pressed && { opacity: 0.7 },
          ]}
        >
          <LogOut size={18} color={brand.error} strokeWidth={2} />
          <Text style={[styles.signOutText, { color: brand.error }]}>
            {t('profile_signOut')}
          </Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.textMuted }]}>
          {t('profile_version')}
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },

  topBar: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  gearBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuCard: {
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },

  signOutBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutText: { fontSize: 15, fontWeight: '700' },

  version: { textAlign: 'center', fontSize: 12, fontWeight: '500', marginTop: 16 },
})
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

If you see errors about `earnedBadges[i].label` or `earnedAt` not existing on the badge type, check [store/useBadgeStore.ts](../../../store/useBadgeStore.ts) for the actual shape. Adjust the mapping `recentBadges` to use the real field names (e.g. `badge.name`, `badge.unlockedAt`). Do not invent properties.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/settings.tsx
git commit -m "feat(profile): port ProfileScreen to cream-paper redesign (Wave 1)"
```

---

## Task 7 — Delete `components/profile/MyJourneys.tsx`

**Files:**
- Delete: `components/profile/MyJourneys.tsx`

- [ ] **Step 1: Confirm no remaining callers**

Run: `grep -rn "from.*profile/MyJourneys" --include="*.ts" --include="*.tsx" . | grep -v node_modules`
Expected: no output (the only caller was `app/(tabs)/settings.tsx`, rewritten in Task 6).

If any caller remains, STOP. Go back and migrate that caller before deleting.

- [ ] **Step 2: Delete the file**

```bash
git rm components/profile/MyJourneys.tsx
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(profile): remove legacy MyJourneys component"
```

---

## Task 8 — Smoke test + finalize

- [ ] **Step 1: Start Metro + simulator**

Run: `npx expo start --clear`
Then press `i` to launch the iOS simulator (use the iOS 18 runtime if available so emoji/font rendering is normal — per Wave 0 notes the iOS 26 runtime has a font bug unrelated to this work).

- [ ] **Step 2: Navigate to Profile tab**

Verify visually, checking each of the Wave 1 acceptance criteria from the spec:

1. Profile screen shows hero with yellow squishy (top-left) + pink heart (top-right) stickers rotated.
2. Avatar circle uses mode accent color (purple if Pregnancy, pink if Cycle Tracking, blue if Kids).
3. Initial letter renders in Fraunces 44px inside the avatar, with a yellow star sticker at the bottom-right corner.
4. Name renders as `{first} {last}` with last word in italic Instrument Serif.
5. Subtitle line changes when you switch modes via the MY JOURNEY pills.
6. Badges card renders 5 horizontal circle badges (or empty state if none earned).
7. MY JOURNEY pills: active one has mode accent bg + "active" text; others are dim.
8. 5 stat rows render with sticker icons and navigate on tap.
9. Settings gear (top-right) navigates to `/profile/settings`.
10. Sign out still works.

If anything fails the checks, fix and re-verify (do not commit broken UI).

- [ ] **Step 3: Verify typecheck one more time**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Final no-op commit to mark wave done**

Only if Task 8 revealed fixes. Otherwise skip.

---

## Self-review notes

- **Spec coverage** — every requirement in Wave 1 spec has a task: ProfileHero (T4), BadgesStrip (T3), MyJourneyPillGrid (T5), StatRow (T2), subtitle helper (T1), screen rewrite (T6), legacy removal (T7), acceptance (T8). ✓
- **Placeholder scan** — no TBD/TODO. Gaps flagged as Wave 2 ("—" placeholder value for Memories count; `hasEmergency = false`). ✓
- **Type consistency** — `BadgeEntry.sticker` is typed as `StickerName` and used with the same union in the profile screen's `BADGE_THEMES`. `Behavior` imported consistently from `useBehaviorStore`. ✓
- **Memories row gated on `hasChildren`** — avoids showing kid-specific stats for cycle-only or pregnancy-only users.
- **Risk** — `useBadgeStore` field names may differ from assumed `earnedBadges[].label`/`earnedAt`. Task 6 Step 2 tells the engineer to inspect the store and correct the mapping. This is the one place where real field shape wasn't confirmed.
