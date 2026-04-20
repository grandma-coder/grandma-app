# Notification Bell — Sticker + Shake Animation

**Date:** 2026-04-20
**Scope:** Make the notification bell visible on every tab, restyle it as a paper sticker, and shake it briefly each time a new notification arrives in real-time.

## Files touched

- **Refactored:** [components/ui/NotificationBell.tsx](../../../components/ui/NotificationBell.tsx)
- **Mounted in:** [app/(tabs)/agenda.tsx](../../../app/(tabs)/agenda.tsx), [app/(tabs)/vault.tsx](../../../app/(tabs)/vault.tsx)
- **Inline addition:** [app/(tabs)/settings.tsx](../../../app/(tabs)/settings.tsx) (next to existing gear)
- **Already mounted:** [app/(tabs)/index.tsx](../../../app/(tabs)/index.tsx) — verify position

## NotificationBell — visual

- 38px round paper button (matches existing `gearBtn` in profile): `bg: colors.surface`, `border: 1px colors.border`, `borderRadius: 999`
- Lucide `Bell` icon at 18px in `colors.text`
- Badge: 16px coral pill (`stickers.coral` from `useTheme()`), cream text, top-right corner

## NotificationBell — data

Unchanged from current:
- `useQuery({ queryKey: ['notification-count'], queryFn: getUnreadCount, refetchInterval: 30s })`
- Supabase realtime subscription to `notifications` table → invalidates the count query

**Channel safety:** the channel name becomes `notification-bell-${useId()}` so multiple bell instances (when more than one tab keeps state mounted) don't collide on the hard-coded channel name.

## Shake animation

- `useRef<number>(0)` keeps the previous count
- `useEffect` watching `count` → if `count > prev`, fire the shake sequence
- Sequence: `Animated.sequence` of `Animated.timing` with `useNativeDriver: true`, transforming `rotate`:
  - `0 → 15° → -15° → 10° → -10° → 5° → -5° → 0°` (decaying oscillation, total ~600ms)
- Animation does NOT fire on initial mount when count loads (we set the ref to the first observed count without triggering)

## Mounting on agenda + vault tabs

These tab screens currently just delegate to mode-specific components:

```tsx
export default function AgendaScreen() {
  const mode = useModeStore((s) => s.mode)
  if (mode === 'pre-pregnancy') return <CycleCalendar />
  if (mode === 'pregnancy') return <PregnancyCalendar />
  return <KidsCalendar />
}
```

Wrap the delegated component in a `<View style={{ flex: 1 }}>` and add an absolute-positioned bell overlay (matches the home pattern):

```tsx
return (
  <View style={{ flex: 1 }}>
    <Inner />
    <View style={{ position: 'absolute', top: insets.top + 12, right: 16, zIndex: 10 }}>
      <NotificationBell />
    </View>
  </View>
)
```

The bell sits **above** the inner screen content. Inner screens already provide their own top padding via `useSafeAreaInsets`, so the bell just floats over the safe-area gap without pushing layout.

## Settings tab inline mount

The profile tab's top bar currently has only a settings gear at the right. Add the bell to the **left of the gear** in the same row, separated by ~10px gap. Keeps the visual weight balanced and makes the bell discoverable from the most-visited screen.

## Reduce-motion

Honor `AccessibilityInfo.isReduceMotionEnabled()` — when enabled, count-increase still updates the badge but no shake plays.

## Out of scope

- Changing the Lucide Bell to an SVG sticker shape
- Tap target / haptic on shake (no haptic — too aggressive for passive notifications)
- Persistent shake while count > 0 (the user explicitly chose option C)

## Testing

- [ ] Bell appears top-right on Home, Calendar, Analytics tabs
- [ ] Bell appears next to gear on Profile tab
- [ ] Tapping bell from any tab navigates to `/notifications`
- [ ] Inserting a row in `notifications` table (via Supabase dashboard) makes the bell shake within ~1s on the active tab
- [ ] Refresh count badge on initial load does NOT trigger shake
- [ ] Reduce-motion enabled → badge still updates, no shake
- [ ] No console errors about duplicate Supabase channel subscriptions
