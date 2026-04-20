# Profile Sticker Idle Animations — Design

**Date:** 2026-04-20
**Scope:** Profile tab ([app/(tabs)/settings.tsx](../../../app/(tabs)/settings.tsx))

## Goal

Give the profile page stickers a subtle idle "personality" so the screen feels alive without being distracting. Applies to:

1. **Badges strip** — the row of circular sticker badges under the hero
2. **Menu rows** — the sticker next to each row (Care Circle, Kids Profile, Memories, Health History, Emergency & Insurance, Notifications, Account Security, Data & Privacy, Subscription)

Hero accents (yellow pill + pink heart decorating the avatar) are **out of scope**.

## Per-Sticker Motion

Each sticker shape gets a different micro-motion, looping continuously. All motions are transform-only so `useNativeDriver: true` is safe — no JS-thread work per frame.

| Sticker | Motion | Amplitude | Duration |
|---------|--------|-----------|----------|
| Heart   | Scale heartbeat: 1.0 → 1.08 → 0.98 → 1.0 | scale ±8% | 1600ms |
| Star    | Gentle rotate + twinkle scale pulse | rot ±4°, scale ±5% | 3000ms |
| Leaf    | Sway — rotate side-to-side | rot ±6° | 2600ms |
| Drop    | Vertical bob with slight bottom squash | translateY ±2px, scaleY ±3% | 2000ms |
| Burst   | Slow full rotation | 0 → 360° | 8000ms |
| Flower  | Wobble on stem | rot ±8° | 3000ms |
| Moon    | Slow rotational breathe | rot ±3° | 4000ms |
| Cross   | Subtle scale breathe (kept calm — medical) | scale ±5% | 2000ms |

## Implementation

### New file: `components/ui/AnimatedSticker.tsx`

Single wrapper component. Props:

```ts
type StickerType = 'Heart' | 'Star' | 'Leaf' | 'Drop' | 'Burst' | 'Flower' | 'Moon' | 'Cross'

interface Props {
  type: StickerType
  size?: number
  fill?: string
  // Flower-specific
  petal?: string
  center?: string
}
```

Internals:
- `Animated.Value` created per instance with `useRef`
- `useEffect` starts `Animated.loop()` with the motion config for `type`
- A random phase offset (0–duration ms) applied on mount so multiple instances don't pulse in unison
- Renders the matching sticker inside an `Animated.View` with the correct `transform` array
- Cleans up the loop on unmount (`animation.stop()`)

### Reduce-motion accessibility

`AnimatedSticker` checks `AccessibilityInfo.isReduceMotionEnabled()` on mount (and listens for changes). When enabled, skips the loop and renders the plain sticker — no transform.

### Call-site edits

- [app/(tabs)/settings.tsx:237-292](../../../app/(tabs)/settings.tsx) — replace the 9 `<XSticker .../>` icons in the menu `<View style={styles.menuCard}>` with `<AnimatedSticker type="X" .../>`
- [components/profile/BadgesStrip.tsx](../../../components/profile/BadgesStrip.tsx) — replace the sticker render inside each badge circle with `AnimatedSticker`

No changes to `Stickers.tsx` — the base sticker components remain pure presentational.

## Performance Notes

- Max ~14 concurrent animated stickers on this screen (5 badges + 9 menu rows)
- All transforms are GPU-driven via native driver; measured impact should be negligible at 60fps
- Random phase offsets spread peak frames across the timeline

## Out of Scope

- Press/tap animations (row bounce on tap) — not requested
- Entrance animations (pop-in on scroll) — not requested
- Hero sticker accents
- Haptics tied to motion cycles

## Testing

Manual checklist:
- [ ] Profile tab opens, all stickers visible and animating subtly
- [ ] No two Hearts (or any two of the same type) pulse in lockstep
- [ ] Toggle reduce-motion in iOS Settings → stickers freeze as static shapes
- [ ] Background the app, foreground — animations still running, no leak
- [ ] Scroll the menu fast — no jank, no dropped frames
