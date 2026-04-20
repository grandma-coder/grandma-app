# Notifications Inbox — Cream-Paper Redesign

**Date:** 2026-04-20
**Scope:** [app/notifications.tsx](../../../app/notifications.tsx) only

## Goal

Bring the notifications inbox in line with the cream-paper sticker-collage design system. The screen is the only one that still uses the legacy purple/neon palette and bold sans-serif header. Functionality (filter, mark read, navigation, refresh, grouping) stays identical — this is a visual restyle.

Out of scope: `app/profile/notifications.tsx` (preferences/toggles screen).

## Layout

### Top bar

Replace the current header (`Bell icon · "Notifications" · neon-red badge · "Mark all read"`) with:

- 38px round paper back button (matches `ScreenHeader.backBtn`)
- Title: **"Notifications"** rendered with `Display` (Fraunces, ~28px, ink color), inline coral count pill after it (`bg: stickers.coral`, cream text, ~22×16px)
- Right: "Mark all read" — `CheckCheck` icon + DM Sans 500 label, ink color (not purple)
- Bottom hairline `colors.border`

### Filter pills row

- Same horizontal layout, same data
- Pill shape: paper bg, hairline border, radius `999`, height ~32px
- **Inactive:** `bg: paper`, `border: line`, label ink-3
- **Active:** same shape, border = current mode accent (`getModeColor(mode, isDark)`), label ink
- Count circle inside pill: `bg: charcoal-soft` (use a low-opacity ink), text cream, 18px

### Section headers ("TODAY" / "YESTERDAY" / date)

- `MonoCaps` (DM Sans 500, 1.2px tracking, 11px, ink-3)
- Padding: 20px horizontal, 14px top, 8px bottom
- Sticky behavior preserved

### Notification rows

Each date group's rows are wrapped in a single paper card:

- Card: `bg: paper`, `border: 1px line`, `radius: r.md` (20px), `marginHorizontal: 16`, `marginBottom: 14`
- Internal hairline divider between rows (`colors.border`, marginLeft: 70 to align past icon)
- Row padding: 14px vertical, 16px horizontal, gap 12px
- Pressed state: opacity 0.7

Inside each row:

- **Icon circle**: 42px, `bg: <stickerSoft>`, `border: 1px <sticker>` (same hue, lower opacity), Lucide icon recolored to `<sticker>`
- **Title**: DM Sans 600, 15px, ink — `numberOfLines={1}` preserved
- **Body**: DM Sans 400, 14px, ink-3, lineHeight 20, `numberOfLines={2}`
- **Footer row**: timestamp (DM Sans 400, 12px, ink-4) ↔ category label (DM Sans 700, 11px, uppercase, `<sticker>` color, 0.5 letterSpacing)
- **Unread**: row bg shifts to `paper-2` (a slightly darker tint), and a 8px dot appears top-right in the row body using the row's sticker color

### Empty state

- 72px paper circle (border, no fill) with `Bell` icon in ink-3
- Title: DM Sans 700, 18px, ink, centered
- Subtext: DM Sans 400, 14px, ink-3, centered
- 40px horizontal padding, 80px bottom padding

### Loader

- Keep `BrandedLoader` centered

## Color remap (type → sticker)

```ts
type StickerKey = 'coral' | 'green' | 'peach' | 'yellow' | 'lilac' | 'blue' | 'pink'

const TYPE_TO_STICKER: Record<string, StickerKey> = {
  // wellness
  wellness_drop:    'coral',
  wellness_improve: 'green',
  missing_data:     'peach',
  // routines
  routine_reminder: 'lilac',
  routine_missed:   'peach',
  // health
  health_alert:     'coral',
  vaccine_due:      'blue',
  // goals
  goal_achieved:    'green',
  goal_missed:      'peach',
  streak:           'yellow',
  streak_broken:    'coral',
  // insights
  insight:          'lilac',
  milestone:        'yellow',
  daily_summary:    'blue',
  weekly_report:    'lilac',
  // community
  mention:          'lilac',
  reply:            'lilac',
  like:             'pink',
  channel:          'blue',
  // care circle
  care_circle_invite:   'pink',
  care_circle_accepted: 'pink',
  // other
  reminder: 'yellow',
}
// default → 'lilac'
```

The `getTypeConfig` function changes from returning hex strings to returning `{ icon, stickerKey, category }`. Components resolve the actual color via `useTheme()` so light/dark sticker variants work automatically.

## Theme tokens needed

`stickers` and `stickersDark` are already exported from `constants/theme.ts`. The component reads from `useTheme()` plus picks light/dark variant via `isDark`. Soft tints come from `<key>Soft` (e.g., `coralSoft` doesn't exist — for coral use coral itself with `+ '22'` opacity, since the design tokens don't include a coral soft variant).

## Implementation notes

- Keep `SectionList` — sections still grouped by date
- Replace inline styles using `colors.primary`, `colors.primaryTint`, `brand.error` with sticker palette + ink tokens
- Keep `getTypeConfig` signature similar but return sticker key not raw hex; resolve at render time
- Wrap rows of each section into a paper card (use `renderSectionHeader` for caps + `renderItem` keyed to the index inside the section to draw correct top/bottom radius); easiest path is a custom `renderSection` via `SectionList` ItemSeparator + first/last detection
- Title font: `Display` from `Typography.tsx` at size 26 (smaller than default 40 to fit)

## Out of scope

- Preferences screen (`app/profile/notifications.tsx`)
- Notification engine logic (`lib/notificationEngine.ts`)
- Push notification delivery
- New notification types

## Testing

Manual checklist:
- [ ] Light + dark theme both look correct
- [ ] Active filter pill picks up the current journey accent color (pre/preg/kids)
- [ ] Unread rows have visibly different bg + accent dot
- [ ] Mark all read clears unread state visually
- [ ] Tap navigation still routes correctly per type
- [ ] Pull-to-refresh still works
- [ ] Empty state renders for filters with no items
- [ ] Loader renders before data arrives
