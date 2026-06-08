# Channels Tab Re-Skin — Cream-Paper / Sticker-Collage

**Date:** 2026-06-07
**Status:** Approved
**Scope:** Re-skin in place — single file: `components/connections/ChannelsScreen.tsx`

## Problem

The Channels tab (`ChannelsScreen`, rendered via `ChannelsTab` inside `app/connections.tsx`)
has drifted from the app's 2026 cream-paper / sticker-collage / editorial-serif
design language. Sitting directly next to the on-brand Village/Garage tab
(`GarageScreen`), the divergence is obvious.

### Specific divergences

| Element | Garage (on-brand) | Channels (drifted) |
|---|---|---|
| Header | `font.display` Fraunces serif, 36px, with subtitle | `fontWeight: '800'` sans, 24px — no serif, no subtitle |
| Accent | `getModeColor(mode, isDark)` | hardcoded `CREAM = '#F5EFE3'` + `INK = '#1A1430'` (banned legacy neon-purple ink) |
| CTAs | `PillButton` / sticker-soft circle buttons | raw cream `Pressable` "Join" pills |
| Cards | hairline border, `radius.lg` (28), `shadows.subtle` | `radius.xl`, raw `shadowColor: '#000'` |
| Empty state | illustrated sticker + Fraunces line | bare text / none |
| Member count | n/a | "0 members" everywhere → reads unlaunched |

The two worst offenders: the hardcoded `CREAM`/`INK` constants (`#1A1430` is the
banned legacy neon-purple ink per `code-style.md`), and the non-serif heading.

## Goal

Pull Channels back into the design language so it reads as the same app as the
Village tab. **Layout structure is unchanged** — header, banner carousel,
suggested horizontal row, trending / favorites / my-channels lists, search, FAB.
Only the skin changes.

## Non-goals

- No layout/structure changes (no swipe-deck, no section reordering).
- No data, store, route, or navigation changes.
- No change to suggested/trending selection logic.

## Design

### 1. Remove off-brand constants
Delete module-level `CREAM` / `INK`. Route every usage to `useTheme()` tokens and
`getModeColor(mode, isDark)` for the accent, matching Garage.

### 2. Header → editorial serif
`"Find your community"` becomes a Fraunces display title (`font.display`, ~36px,
`letterSpacing: -1`) with a warm `font.body` subtitle. Mirrors Garage's
`"The Village."` + subtitle pattern.
- Title: **"Find your\ncommunity."**
- Subtitle: *"Channels for where you are right now."*

### 3. Banner carousel
Keep behavior (auto-scroll, snap). Token fixes:
- Join pill: cream → mode-color filled (`getModeColor`).
- Rating star: `brand.accent` (orange) → `stickers.yellow`.
- Member line: use `memberLabel()` helper (see §5).

### 4. Cards (full + compact)
- `radius.xl` → `radius.lg` (28, card standard).
- Raw `shadowColor: '#000'` → `shadows.subtle`; hairline `colors.border`.
- Join pills: cream → mode-color filled pill (or sticker-soft tile consistent
  with Garage circle buttons).
- "Joined" badge: keep green, via `stickers.green` / `stickers.greenInk` tokens.
- Unread badge: cream/ink → mode color fill + `colors.surface` text.

### 5. Member count helper (new)
```ts
function memberLabel(n: number): string {
  if (n <= 0) return '✨ Be the first'
  if (n < 5)  return `New · ${n} here`
  return `${n} members`
}
```
Applied wherever a count renders (banner, full card, compact card).

### 6. Section headers + accents
- `TrendingUp` / `Star` section icons: `brand.accent` (off-palette orange) →
  `getModeColor` or `stickers.yellow`.
- Section title labels: uppercase-tracked, `font.bodySemiBold`.

### 7. Search bar
Verify tokens only: `colors.surface` bg, hairline `colors.border`, `radius.md`,
placeholder `colors.textMuted`. No structural change.

### 8. FAB
Cream-on-dark → mode-color filled circle, `colors.text` (or contrast-correct
ink) for the `Plus` icon, `shadows.cardPop`.

### 9. Empty state (new)
When no channels are available to show, render a small sticker + Fraunces line
("No channels yet" / "Be the first to start one"), echoing Garage's `DeckDone`.

## Acceptance criteria

1. No raw hex literals remain in `ChannelsScreen.tsx` JSX/style props (sticker SVG
   path files are the only allowed exception, and none live here).
2. `CREAM` and `INK` constants are deleted; no `#1A1430` / `#F5EFE3` anywhere.
3. Header uses `font.display`; accent comes from `getModeColor(mode, isDark)`.
4. Cards use `radius.lg` and an allowed shadow token (`subtle`/`card`/`cardPop`).
5. All counts pass through `memberLabel()`; "0 members" never renders verbatim.
6. Layout, carousel behavior, navigation, and data flow are unchanged.
7. Light and dark themes both read as cream-paper (no neon).

## Files touched

- `components/connections/ChannelsScreen.tsx` (only)
