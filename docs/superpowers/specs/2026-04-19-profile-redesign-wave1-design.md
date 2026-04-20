# Profile redesign — Wave 1 (foundation + main ProfileScreen)

**Date:** 2026-04-19
**Scope:** First of three waves porting the cream-paper profile redesign into the RN app.
**Out of scope:** sub-screens (Wave 2 — profile/care/memories/badges/health/emergency; Wave 3 — notifications/settings/privacy/security).

## Goal

Rework the Profile tab ([app/(tabs)/settings.tsx](../../../app/(tabs)/settings.tsx)) to match the cream-paper design defined in `docs/Claude design studio, .../src/more-screens.jsx` (ProfileScreen, lines 5–86). Add four shared UI primitives that later waves will reuse.

## Source of truth

- **ProfileScreen** → `docs/Claude design studio, new design system log and screens/src/more-screens.jsx:5-86`
- **Tokens** → `docs/Claude design studio, new design system log and screens/src/tokens.css`
- **Stickers** → `docs/Claude design studio, new design system log and screens/src/stickers.jsx`

## Visual spec summary (from JSX source)

**Header**
- Top bar: **hide the back button** on the tab root (it's the root of the profile tab, not a pushed screen) and keep only the settings gear (right 38px circle). Sub-screens will render the back button.
- Yellow Squishy sticker 64×44 at absolute `top: 6, left: 20`, rotated −10°.
- Pink Heart sticker 40px at absolute `top: 0, right: 28`, rotated 14°.
- Avatar: 110×110 circle, accent-color bg (mode-driven), 3px ink border, initial letter in Fraunces 44px (600). Yellow Star sticker 38px at `bottom: -4, right: -4` on the avatar.
- Name: Fraunces 28px (600). First word display, last word italic Instrument Serif 400.
- Subtitle (mode-aware, 13px ink-3):
  - pre: `Cycle 14 · trying · 3 mo`
  - preg: `Week 24 · due Aug 7`
  - kids: `Juno · 5 months old` (for now: show active child name + age)

**Badges card** — paper bg, radius 26, padding 16, border line.
- Row: "BADGES" mono-caps (left), "All 24 →" (right, 11px ink-3, tappable).
- Horizontal scroll: 5 × {58px circle (bg-deep, 1px line), sticker 40px inside (color-coded), "day N" label below (10px ink-3)}.

**My Journey card** — paper bg, radius 26, padding 16, border line.
- "MY JOURNEY" mono-caps label.
- 3-col grid (gap 8), each cell: radius 18, padding 10/8, bg `--accent` if active else `--bg-deep`, opacity 1 vs 0.6, label Fraunces 14 (600): `Trying / Pregnant / Parent`, tiny "active" subtext under the active cell.

**Menu list card** — paper bg, radius 26, 1 border, `overflow: hidden`. 5 rows:
| Row | Right value | Sticker |
|-----|-------------|---------|
| Care circle | `{N} people` from care_circle count | Heart (st-pink) |
| Memories | `{N} moments` from memories count (placeholder if zero) | Star (st-yellow) |
| Health history | `Since {year}` | Leaf (st-green) |
| Emergency card | `Ready` / `Not set` | Cross (st-coral) |
| Premium | `Upgrade` / `Active` | Burst points=8 (st-lilac) |

Row structure: 34×34 bg-deep circle (icon sticker 18px) + label (14px, weight 500) + right value (12px ink-3) + ChevRight (14px).

## Primitives to build

All live under `components/profile/` (new ones) or `components/ui/` (generic).

### 1. `components/profile/ProfileHero.tsx`
```ts
interface ProfileHeroProps {
  initial: string          // first letter of name
  firstName: string        // display, serif
  lastName?: string        // display italic
  subtitle?: string        // mode-aware status line
  accentColor: string      // avatar bg (mode color)
}
```
Renders: sticker accents (yellow squishy + pink heart) absolutely positioned → 110px circle with initial + star sticker corner → name row → subtitle.

### 2. `components/profile/BadgesStrip.tsx`
```ts
interface BadgesStripProps {
  badges: Array<{ color: string; sticker: StickerName; label: string }>
  total: number            // for "All N →"
  onSeeAll: () => void
}
```
Horizontal `ScrollView` card. `StickerName` = 'Burst' | 'Heart' | 'Drop' | 'Star' | 'Moon' | 'Leaf' | 'Flower' | 'Cross'. Empty state: single greyed badge "No badges yet".

### 3. `components/profile/MyJourneyPillGrid.tsx`
Replaces current `components/profile/MyJourneys.tsx`.
```ts
interface MyJourneyPillGridProps {
  active: Behavior                 // from useBehaviorStore
  onSelect: (b: Behavior) => void  // switches mode
}
```
3-col grid. Uses `useBehaviorStore` for enrolled list; non-enrolled pills show greyed with +Add. Active pill uses mode accent color.

### 4. `components/ui/StatRow.tsx`
```ts
interface StatRowProps {
  icon: ReactNode          // 18px sticker
  iconBg?: string          // default colors.bgDeep / theme.surfaceGlass
  label: string
  value?: string
  onPress?: () => void
  isLast?: boolean         // no border bottom
}
```
Generic single-line row with left icon circle + label + right value + chevron. Caller passes sticker.

## ProfileScreen changes — [app/(tabs)/settings.tsx](../../../app/(tabs)/settings.tsx)

Delete the current hero block (lines 174–223), the section groups (lines 229–258), and the MyJourneys mount (line 226). Replace with:

```tsx
<ProfileHero
  initial={userName?.[0] ?? 'I'}
  firstName={firstWord}
  lastName={restOfName}
  subtitle={modeSubtitle}
  accentColor={getModeAccent(mode, isDark)}
/>
<BadgesStrip badges={topFiveBadges} total={totalBadges} onSeeAll={() => router.push('/profile/badges')} />
<MyJourneyPillGrid active={mode} onSelect={handleSwitchMode} />
<View style={menuCardStyle}>
  <StatRow icon={<Heart/>} label="Care circle" value={`${circleCount} people`} onPress={() => router.push('/profile/care-circle')} />
  <StatRow icon={<Star/>} label="Memories" value={`${memoryCount} moments`} onPress={() => router.push('/profile/memories')} />
  <StatRow icon={<Leaf/>} label="Health history" value={`Since ${sinceYear}`} onPress={() => router.push('/profile/health-history')} />
  <StatRow icon={<Cross/>} label="Emergency card" value={emergencyStatus} onPress={() => router.push('/profile/emergency-insurance')} />
  <StatRow icon={<Burst points={8}/>} label="Premium" value={premiumStatus} onPress={() => router.push('/paywall')} isLast />
</View>
<Pressable onPress={handleSignOut}>…sign out…</Pressable>
```

The settings gear (top-right) → navigates to a new `/profile/app-settings` screen (Wave 3 builds it). For Wave 1, stub route pointing at existing `/profile/settings`.

## Data wiring

- `circleCount` → `care_circle.select('count')` filtered by user
- `memoryCount` → existing memories source (placeholder `0` if not available; Wave 2 wires it)
- `sinceYear` → `profiles.created_at` year
- `emergencyStatus` → derived from emergency card presence
- `premiumStatus` → from RevenueCat entitlement (existing in [lib/revenue.ts](../../../lib/revenue.ts))
- `topFiveBadges` → from `useBadgeStore` most-recent-5

Use React Query where async, local state where derived.

## Files touched

**New:**
- `components/profile/ProfileHero.tsx`
- `components/profile/BadgesStrip.tsx`
- `components/profile/MyJourneyPillGrid.tsx`
- `components/ui/StatRow.tsx`

**Replaced / rewritten:**
- `app/(tabs)/settings.tsx` (header + sections replaced; sign-out + version kept)
- `components/profile/MyJourneys.tsx` → **deleted** (after callers removed). Grep confirms single caller at [app/(tabs)/settings.tsx:37](../../../app/(tabs)/settings.tsx#L37).

**Unchanged:**
- All profile sub-screens (Wave 2/3).

## Acceptance — what "done" looks like

1. Profile tab visually matches `more-screens.jsx:5-86` in both light and dark themes.
2. Avatar color changes based on `useModeStore.mode`.
3. Subtitle changes based on mode (cycle day for pre / week for preg / active child for kids).
4. Tapping MY JOURNEY pills calls `useModeStore.setMode` + navigates if needed. Switching modes re-renders avatar + subtitle correctly.
5. All 5 stat rows navigate to their existing sub-screens.
6. Sign-out still works.
7. `tsc --noEmit` passes.
8. No Emoji wrapper regressions (no emoji on this screen, but confirm no broken imports).

## Out-of-scope (explicit)

- Porting sub-screen visuals — Wave 2/3.
- New `/profile/app-settings` hub — Wave 3; Wave 1 stubs the route.
- Replacing `GrandmaLogo` heart-eye asset (already done in RN app).
- `/profile/badges` wallet visual port — Wave 2.

## Risks / watchpoints

- `MyJourneys.tsx` has status-line generators (cycle / pregnancy / kids) used for per-journey subtitles. When deleting, we must move the mode-aware subtitle generator into `ProfileHero` (or a `lib/profileStatus.ts` helper).
- Mode switching from pill grid needs to update tab bar color + badge count elsewhere — existing `useModeStore.setMode` should already trigger this. Verify on switch.
- Badge count "All 24 →" — if user has <5 badges, only show the ones present; if 0, show empty-state badge.
