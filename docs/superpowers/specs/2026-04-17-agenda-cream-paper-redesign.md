# Agenda — Cream-Paper Redesign Across All 3 Behaviors

**Date:** 2026-04-17
**Scope:** `CycleCalendar` (pre-pregnancy), `PregnancyCalendar`, `KidsCalendar`

## Goal

Align all three agenda screens with the Apr 2026 cream-paper + Fraunces mockups. Same structural shell across the 3 behaviors, different tabs / logs / accent color per mode. Keep all existing data fetching, insert logic, log forms, routines, and CRUD untouched — this is a **skin-level refactor** that replaces the outer shell and restyles the day-content presentation.

## Non-goals

- Not rewriting individual log forms (FeedingForm, PregnancySymptomsForm, etc.)
- Not changing DB schema, routine logic, or insights wiring
- Not touching the central sparkles FAB (unrelated menu, stays as-is)
- Not re-doing i18n keys (new labels inline; migration is a separate pass)

## Entry point for logging

The header "+" circle is the **only** entry point to log activities. It opens the mode's Log Activity sheet. The central sparkle FAB is a separate menu for other sections and is not touched here.

## Shared primitives (new)

### `components/calendar/SegmentedTabs.tsx`
3-option pill segmented control. Inactive = text only. Active = filled pill.
- Active bg per mode: `kids → #9EC5FF` (blue), `pregnancy → #1A1430` (ink), `pre-pregnancy → #1A1430` (ink) — matches mocks exactly
- Active text: white on ink, ink on blue
- Props: `options: {key, label}[]`, `value: string`, `onChange: (key) => void`, `activeBg?: string`, `activeFg?: string`

### `components/calendar/AgendaWeekStrip.tsx`
Horizontal week strip used by pregnancy + pre-pregnancy.
- Top row: `MONTH` small-caps on left, `Week N →` on right (tappable — jumps to month view)
- Grid: M T W T F S S with date number below, colored dots under each day for logs
- Selected day = filled circle in mode color (pink / purple)
- Today = amber background if not selected
- Props: `selectedDate`, `onSelectDate`, `dotsByDate: Record<string, string[]>`, `monthLabel`, `weekLabel`, `onWeekTap`, `modeColor`

### `components/calendar/ActivityPillCard.tsx`
Rounded pastel pill card for "Today" activity list (all 3 modes).
- Colored circle icon on left, title + subtitle middle, optional child chip right, chevron far right
- Variants: soft pastel bg (feeding=blue, sleep=purple, activity=green, mood=amber, photo=pink, medical=yellow)
- Props: `tint`, `icon`, `title`, `subtitle`, `chip?: {label, color}`, `onPress`

### `components/calendar/LogTile.tsx` + `LogTileGrid`
Pastel rounded tile for Log Activity sheet entry (kids sheet uses 3-col grid; pregnancy + pre-preg use same component with different logs).
- Icon circle on top (soft tint), label below (Fraunces-like serif weight), rounded corners ~20px
- Tile sizes equal; grid wraps 3 per row
- Props on tile: `icon`, `label`, `tint`, `onPress`

### `components/calendar/SectionHeader.tsx` (small)
"Wednesday, Apr 15" header with calendar icon + "N activities" on right. One-liner component.

## Per-calendar plan

All three share the same vertical structure:

```
<AgendaHeader title="Agenda." onFilter onAdd />   ← already exists
<SegmentedTabs />                                 ← new
[Body varies by tab]
```

### CycleCalendar (pre-pregnancy)

**Tabs:** `Cycle` | `Checklist` | `Visits` (ink active pill)

- **Cycle tab (default):**
  - `<AgendaWeekStrip>` (pink mode color)
  - "Today · Apr 17" section header
  - `<ActivityPillCard>` list for the selected date — BBT log, ovulation test, supplements, intimacy, mood, symptoms
  - Each card tap opens the matching existing LogSheet form (no change to forms themselves)
  - Phase banner retained but restyled as a soft pastel PaperCard at top of list
- **Checklist tab:** reuse existing `PrePregChecklist` component if styling matches cream-paper; otherwise wrap in PaperCard
- **Visits tab:** reuse existing `AppointmentList` component; if not cream-styled, restyle header row + cards to PaperCard / ActivityPillCard

### PregnancyCalendar

**Tabs:** `Timeline` | `Symptoms` | `Kicks` (ink active pill)
Drops current 4-tab (Month/Week/Journey/Appts) approach.

- **Timeline tab (default):**
  - `<AgendaWeekStrip>` (purple mode color) with Week N caption linking to Journey modal
  - "Today · Apr 17" section header
  - `<ActivityPillCard>` list for the selected date — pulled from `usePregnancyTodayLogs` (yoga, OB check-in, kicks, water, vitamins, etc.)
  - Existing "Journey" and "Month" views keep their logic but move behind an optional expand button inside Timeline, or get removed if redundant (confirm during impl — but default: hide them; they exist in Insights already)
- **Symptoms tab:** reuse existing symptoms log body; wrap in cream shell
- **Kicks tab:** reuse existing `KickCounter` component; wrap in cream shell
- FAB: the header "+" opens the Log Activity sheet — reuse existing `renderQuickLogSheet` grid but restyled via `<LogTileGrid>`

### KidsCalendar

**Tabs:** `Month` | `Day` | `List` (blue active pill per mocks)
Already has these tabs — only restyle.

- Restyle toggle to `<SegmentedTabs>`
- Replace hand-rolled month grid cells with the refreshed MonthGrid styling (soft pastel squares, dots below number)
- Replace "Homework time" (next-up) card with `<ActivityPillCard>`
- Replace "Today / N activities" + per-child pending rows with `<SectionHeader>` + `<ActivityPillCard>` rows
- Keep Day view (time slots) + List view (grouped by date) — only restyle typography, pill cards, dot dividers
- Log Activity sheet: replace current grid with `<LogTileGrid>` + "Manage Routines" footer row
- Individual log sheets (Feeding/Sleep/Diaper/Activity/Memory) already use `LogSheet` which is Fraunces+paper — no change needed; verify chip colors use the mock child-dot palette

## Color/style tokens

Using existing `constants/theme.ts` cream-paper tokens:
- Paper bg: `#FFFEF8`
- Canvas: `#F3ECD9`
- Ink: `#141313`
- Hairline border: `rgba(20,19,19,0.08)`
- Mode accents: `brand.prePregnancy` (pink), `brand.pregnancy` (purple), `brand.kids` (blue)
- Pastel tints (new constants in `components/calendar/tints.ts`):
  - feeding `#D9E6FF`, sleep `#E7DBFF`, activity `#D9F0DC`, mood `#FFE5C2`, photo `#FFD9DA`, medical `#FFF4C2`

## File changes

**New:**
- `components/calendar/SegmentedTabs.tsx`
- `components/calendar/AgendaWeekStrip.tsx`
- `components/calendar/ActivityPillCard.tsx`
- `components/calendar/LogTile.tsx` (exports `LogTile` + `LogTileGrid`)
- `components/calendar/SectionHeader.tsx`
- `components/calendar/tints.ts`

**Refactor (shell swap, logic preserved):**
- `components/calendar/CycleCalendar.tsx`
- `components/calendar/PregnancyCalendar.tsx`
- `components/calendar/KidsCalendar.tsx`

**Untouched:**
- `LogSheet.tsx`, `AgendaHeader.tsx` (already match)
- All `LogForms.tsx` / `PregnancyLogForms.tsx` / `KidsLogForms.tsx`
- Data hooks (`analyticsData.ts`), routines, Supabase reads/writes

## Implementation order

1. Build 5 shared primitives + tints + verify in isolation (RN preview)
2. KidsCalendar restyle (closest to mock — smallest delta, validates primitives)
3. PregnancyCalendar shell swap (new tabs, drop Month/Journey/Appts — move to Insights if not already there)
4. CycleCalendar shell swap (new tabs, week strip, activity card list)
5. Smoke-test each behavior: switch mode via ModeSwitcher → Agenda renders correctly
6. Run through each log type quickly to confirm sheets still save

## Risk & rollback

- **Risk:** removing pregnancy Journey/Appts tabs may surface data users rely on. **Mitigation:** Journey content already lives in Insights; Appts still accessible via "Visits"-style list inside Timeline. If user pushes back during review, preserve as a fourth tab.
- **Rollback:** revert the three calendar files; primitives are additive so leaving them in place causes no harm.

## Acceptance

- All 3 agenda screens match the mocks for the header, tabs, week strip / month grid, Today section, and activity cards
- Tapping any activity card opens the existing log form unchanged
- Header "+" opens a Log Activity sheet using `<LogTileGrid>`
- No regression in existing log CRUD / routines / caregiver permissions
