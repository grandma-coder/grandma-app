# Pregnancy Home — "Week Wallet" collapsible card stack

**Date:** 2026-07-11
**Mode:** Pregnancy home only
**Supersedes the middle of:** `2026-06-26-pregnancy-home-compact-design.md` (the stacked tracker + reminders + slim-rows region)

## Problem

On the pregnancy home, everything below the affirmation is a run of disconnected
blocks: the `TodaySummaryCard` tracker, then `RemindersSection` (anatomy scan /
week tip / kick nudge as separate cards), then `PregnancyUserReminders`, then
three `SlimRow`s (Weight, Birth Guide, Ask Grandma). They don't read as one
system — they're "not cool" (user's words). We want a single cohesive surface.

## Solution

Replace that region with **one Apple-Wallet-style collapsible stack** — the
"Week Wallet". Cards are stacked vertically, each collapsed to a single header
row (glyph · title · open-arrow) and overlapping ~14px so it reads as a physical
stack. Tapping a header expands that card inline; rich cards also launch the
existing detail modal.

The stack has **up to seven cards** (three are conditional), so the visible
count varies by week and log state — e.g. early weeks with no upcoming
appointment and no kick tracking show four.

Visual reference: Apple Wallet / the "Explore Vacancies" stacked-card screen the
user shared. Styling stays 100% within the cream-paper / sticker system
(`DESIGN_SYSTEM.md`) and honors the Diffuse variant.

### The cards

Cards render in this order; three are conditional (shown in the Condition
column). Each header is
`glyph · title · arrow`, background from the sticker palette.

| # | Card | Cover bg | Condition | Expanded / open behavior |
|---|------|----------|-----------|--------------------------|
| 1 | 🗓️ **Today at a glance** | `surface` (paper) | always | Expands inline to the log pills (mood/water/sleep/meals/weight[/kicks]) + progress bar. Each pill opens its log sheet. Header chevron → `TodayDashboardModal`. **Open by default.** |
| 2 | 📅 **Appointment** (e.g. Anatomy Scan) | `yellow` | `getUpcomingAppointment(week)` returns one | Expands to name + `Week N · prepNote` preview. "↗ Open detail" → `AppointmentDetailModal`. |
| 3 | 🔖 **Week N tip** | `lilacSoft` | `getWeekData(week).momTip` exists | Expands inline to the full tip text. "↗" → `WeekDetailModal` for that week. |
| 4 | 🦵 **Kick counter** | `greenSoft` | `week >= 28 && !todayLogs['kick_count']` | Expands to the nudge; opens the `kick_count` log sheet. |
| 5 | ⚖️ **Weight trend** | `peach` | always | Header trailing value = latest logged kg. Expands to a mini sparkline. "↗" → `/insights`. |
| 6 | 🍃 **Birth Guide** | `green` | always (matches current SlimRow — no gate today) | "↗" → `BirthGuideModal`. |
| 7 | 👁️ **Ask Grandma** | `lavender` | always | "↗" → `/grandma-talk`. |

> Cards 2–4 are today's `RemindersSection` items; 5–7 are today's `SlimRow`s;
> 1 is `TodaySummaryCard`'s pills. Nothing new is fetched — this is a
> re-presentation of data already on the screen.

### Interaction & motion

- **Accordion:** at most one card expanded at a time. Tapping a collapsed header
  expands it and collapses the previously-open one. Tapping the open header
  collapses it (zero-open is valid). "Today" starts open.
- **"Open detail" vs inline (the approved hybrid):** light cards (today pills,
  week tip, weight sparkline, kick nudge) show their content inline. Rich cards
  (appointment, birth guide, week detail) show a short inline preview **and** an
  "↗" affordance that launches the existing modal. Ask Grandma has no inline
  body — its header arrow routes directly.
- **Motion:** `react-native-reanimated` (already a dependency). Animate body
  height + opacity with a spring on expand/collapse; rotate the header arrow
  ⌄↔⌃. Keep collapsed overlap ~14px; spacing relaxes around the open card.
- **Diffuse:** the wallet reads from `useDiffuseTheme()` when the variant is
  active and `useTheme()` otherwise — identical to the components it absorbs.
  Stickers/glyphs stay active under Diffuse (they're the icon system).

### Technical shape

- **New file** `components/home/pregnancy/WeekWallet.tsx`:
  - `WeekWallet` — the stack container. Owns `openId` state (which card is open,
    default `'today'`). Builds the ordered card list from the same inputs
    `PregnancyHome` already computes (`weekNumber`, `todayLogs`, `userId`,
    `latestWeight`) and the same helpers (`getUpcomingAppointment`,
    `getWeekData`). Receives callbacks for the actions it can't own
    (`onLogMetric`, `onOpenAppointment`, `onOpenWeekDetail`, `onOpenBirthGuide`,
    routing to insights/grandma-talk).
  - `WalletCard` — presentational: collapsed header (glyph, title, optional
    trailing value, arrow) + optional expandable body via a render prop /
    children; owns the reanimated expand/collapse given an `expanded` prop.
- **`PregnancyHome.tsx`** shrinks to: greeting → `BabyHeroCarousel` →
  `AffirmationRevealCard` → `<WeekWallet …/>` → `<PregnancyUserReminders/>`.
  The `activeLog` / `LogSheet` / modal wiring stays in `PregnancyHome` and is
  driven by `WeekWallet`'s callbacks (the modals are already hosted there).
- **Retired once absorbed:** `RemindersSection.tsx` and the inline `SlimRow`
  helper in `PregnancyHome`. `TodaySummaryCard` is either reused inside card #1
  or its pill/progress render is lifted into the wallet — decided at plan time
  based on how cleanly it factors; the `TodayDashboardModal` link is preserved
  either way.
- **i18n:** reuse existing keys (`pregnancy_todayAtGlance`,
  `pregnancy_reminder_weekTip`, `preg_weight_sheetTitle`,
  `pregnancy_birthGuideTitle`, `pregnancy_appt_askGrandma`, etc.). Any new label
  (e.g. a "Your week" section caption, "Open detail") goes through `t()` with a
  new key, English + placeholder for the other locales per the i18n wave plan.

### Design tokens (no raw hex)

- Card radius `radius.lg` (28) or the 22 used by current reminder cards — match
  the reminder-card radius for continuity.
- Backgrounds from `stickers.*` / `stickers.*Soft`; text from
  `colors` / `stickers.*Ink`; arrows/dividers from `colors.border`.
- Shadows: `shadows.card` only (never `glow*`).
- Mode color via `getModeColor('pregnancy', isDark)` where an accent is needed.

## Non-goals

- No change to the hero carousel or the affirmation card.
- No change to `PregnancyUserReminders` (add-reminder + saved list stay below).
- No new data, tables, or edge functions — pure presentation refactor.
- Kids / pre-pregnancy homes are untouched (pregnancy-only for now; the pattern
  could be ported later but that's a separate spec).
- No `care`-mode or Diffuse-primitive work (out of current migration phase).

## Success criteria

- The region below the affirmation is one wallet stack of the cards above,
  collapsed by default except "Today".
- Tapping headers expands/collapses with spring motion, one open at a time.
- Every action reachable before is still reachable (log sheets, all four
  modals, insights, grandma-talk).
- Passes the `DESIGN_SYSTEM.md` §5 checklist and works in light, dark, and
  Diffuse variants.
- `RemindersSection` and `SlimRow` are removed with no dead imports left.
