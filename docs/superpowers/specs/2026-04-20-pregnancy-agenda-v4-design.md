# Pregnancy Agenda v4 — Card Timeline + Detail Modals

**Date:** 2026-04-20
**Surface:** `app/(tabs)/agenda.tsx` (pregnancy mode only)
**Component:** `components/calendar/PregnancyCalendar.tsx`

## Goal

Replace the current 4-tab agenda (Month · Week · Journey · Appts) with a 3-tab agenda (Timeline · Journey · Appts) that uses the cream-paper sticker-card visual language already established by `ActivityPillCard` and `tints.ts`. Make Journey and Appts rows tappable with rich detail modals.

Reference: image-4 mockup — vertical timeline of pastel sticker cards, each with hour gutter on the left and a colored circle icon + title + subtitle on the right.

## Out of scope

- No data model changes, no Supabase migrations.
- No new sticker assets — reuse `components/calendar/logStickers.tsx`.
- Pre-pregnancy (`CycleCalendar`) and Kids (`KidsCalendar`) are untouched.
- No changes to log forms, routine manager, or quick-log sheet.

## Tab structure

3 tabs via the existing `SegmentedTabs`:

| Key | Label |
|-----|-------|
| `timeline` | Timeline |
| `journey` | Journey |
| `appointments` | Appts |

The current `Month` and `Week` tabs are merged into `Timeline`. The `view` state union becomes `'timeline' | 'journey' | 'appointments'`.

## Timeline tab

### Top section — week strip
Reuse the existing `AgendaWeekStrip` (already used by `KidsCalendar`). Tap a day → updates `selectedDate`. The strip shows dot indicators for days that have logs or appointments.

### Mode toggle — Cards / Hours
Sits directly under the week strip. A 2-segment pill (right-aligned, ~140px wide) with two keys: `cards` (default) and `hours`. Stored in component state (`useState<'cards' | 'hours'>('cards')`). Not persisted across sessions — opening the tab always shows Cards.

### Cards mode (default)

Section header: `formatDayLabel(selectedDate, todayStr)` (already exists). Subtitle line shows pending/logged counts.

Each row is a flex-row:
- **Left gutter (56 px):** time label `HH:MM` in `font.bodySemiBold`, color `colors.textMuted`. For all-day items (e.g. appointments without a specific time) show a small `—` or the week number `W24`.
- **Right:** an `ActivityPillCard` (existing component, no changes needed).

Rows merged from three sources, sorted by time:

1. **Routines due that day** (from `pregnancy_routines` filtered by `days_of_week` containing the selected day's weekday)
   - title: `routine.name`
   - subtitle: `Pending` (if not yet logged that day) or `Logged · {time}`
   - tint: `PREG_TINT_BY_TYPE[routine.type]`
   - icon: `logSticker(routine.type)` (40 px)
   - onPress: opens log form for `routine.type` with `selectedDate` prefilled

2. **Logged entries for that date** (from `usePregnancyCalendarLogs` already in scope)
   - title: `LOG_META[log.type].label`
   - subtitle: small summary string built from `log` fields (e.g. mood emoji + label, weight value + unit, kicks count, sleep duration). Use a switch on `log.type`.
   - tint: same as routines
   - chip: optional — `Logged` chip with `colors.success`
   - onPress: opens existing log detail popup (`setSelectedLog(log)`)

3. **Appointments due in the active week** (only show on the date matching `STANDARD_APPOINTMENTS[i].week`'s Monday, derived from due date)
   - title: `appt.name`
   - subtitle: `Week N · {prepNote (truncated to 60 chars)}`
   - tint: `appointment` (amber)
   - icon: stethoscope or check sticker depending on done state
   - onPress: opens new `AppointmentDetailModal` (see §New modals)

**Empty state:** when no rows for the selected day, render a centered cream-card with a small sticker (use `BrandStickers.Calendar` or similar) + body text "Nothing planned — tap + to log."

### Hours mode

Lift the existing day-grid renderer (the chunk inside `renderWeekView` that shows the hour grid with `+`/`-` zoom buttons and the red now-line) into a small helper `renderDayGrid()` and render it when `mode === 'hours'`. Behavior identical to today.

## Journey tab

Render a vertical list of all 40 weeks using `ActivityPillCard`. For each week:

- **icon:** a 40 px circle showing the week number, with `backgroundColor = TRIMESTER_COLOR[tri] + (isPast ? 'FF' : '20')`, text in `TRIMESTER_COLOR[tri]` (or white when filled).
- **title:** `${babySize} · ${babyLength}` (e.g. "Lemon · 8.7 cm")
- **subtitle:** first sentence of `developmentFact` (split on `. `, take `[0]`)
- **chip:** `Now` for the current week (purple), `Done` for past (green), nothing for future
- **opacity:** `1` for past/current, `0.55` for future
- **onPress:** opens `WeekDetailModal` with the full week data

Container background unchanged (`colors.bg`), spacing 12 px between cards.

## Appts tab

Render a vertical list of `STANDARD_APPOINTMENTS` using `ActivityPillCard`. The vertical timeline line (left rail) is removed — the card itself provides enough hierarchy.

For each appointment:

- **icon:** 40 px circle. Done → filled green with checkmark sticker. Next-due (within 2 weeks of `weekNumber`) → filled amber with stethoscope sticker. Future → outline with muted icon.
- **title:** `appt.name`
- **subtitle:** `Week N · {prepNote (truncated to 60 chars)}` for next-due/future. For done show `Done · Week N`.
- **chip:** `Soon` (amber) for next-due
- **tint:** `appointment` (amber pastel) for next-due, neutral surface for others
- **onPress:** opens `AppointmentDetailModal`

Footer keeps the existing `Add appointment / exam` button (the purple full-width pill).

## New modals

Both modals reuse the existing modal-sheet pattern from `PregnancyCalendar` (slide-up, transparent overlay, rounded top corners, drag handle, scrollable content, close button).

### `components/calendar/WeekDetailModal.tsx`

Props:
```ts
interface Props {
  week: PregnancyWeekData | null  // null = closed
  isCurrent: boolean
  onClose: () => void
  onOpenPillar?: (pillarId: string) => void
}
```

Sections, top to bottom:
1. Header: large week number + size + length, trimester chip
2. "Baby this week" — full `developmentFact` body
3. "What's happening to you" — pulled from `pregnancyWeeks[week].momChanges` (already exists; if a field is missing, omit the section silently)
4. "Tips this week" — bulleted list from `pregnancyWeeks[week].tips`
5. CTA pill: `Open this week's library →` (only if a matching pillar exists for the trimester)

### `components/calendar/AppointmentDetailModal.tsx`

Props:
```ts
interface Props {
  appointment: StandardAppointment | null
  isDone: boolean
  isNext: boolean
  onClose: () => void
  onMarkDone?: () => void  // creates an appointment log entry for today
  onAddToLogs?: () => void  // opens the appointment log form
}
```

Sections:
1. Header: appointment name + week badge + status chip (`Done` / `Soon` / `Upcoming`)
2. "How to prep" — full `prepNote`
3. "What to expect" — `appt.whatToExpect` (add to `STANDARD_APPOINTMENTS` data; see §Data additions)
4. "Questions to ask" — bulleted list from `appt.questions` (add to data)
5. CTA buttons: `Mark as done` (only if not done) + `Add details to logs` (always)

## Data additions

`lib/pregnancyAppointments.ts` — extend the `StandardAppointment` interface with two optional string-array fields:

```ts
interface StandardAppointment {
  // ...existing
  whatToExpect?: string  // 1-2 sentence narrative
  questions?: string[]   // 3-5 bullet questions
}
```

Backfill all 7 standard appointments with copy. The modal handles missing fields gracefully (omits sections).

`lib/pregnancyData.ts` — verify `momChanges` and `tips` fields exist on each `PregnancyWeekData`. If they don't, this is a separate task (out of scope for this spec — note in the implementation plan).

## File changes summary

| File | Change |
|------|--------|
| `components/calendar/PregnancyCalendar.tsx` | Drop `month` view, rename `week`→`timeline`, replace `renderWeekView` with `renderTimelineView` (cards + hours mode), replace `renderJourneyView` with new card-based version, replace `renderAppointmentsView` with new card-based version, wire two new modals |
| `components/calendar/WeekDetailModal.tsx` | NEW |
| `components/calendar/AppointmentDetailModal.tsx` | NEW |
| `lib/pregnancyAppointments.ts` | Extend `StandardAppointment` interface, backfill `whatToExpect` + `questions` for the 7 entries |

No changes to: stores, Supabase, edge functions, navigation, other calendar variants, log forms.

## Risks & open questions

- **`pregnancyData.ts` fields:** if `momChanges`/`tips` aren't populated on every week, the Week Detail Modal sections will be sparse. Implementation plan should verify this first and surface as a follow-up if missing.
- **Performance:** the Journey tab renders 40 cards. Existing implementation already does so without virtualization — keep the same approach (simple `.map`) since the screen scrolls fast enough on iPhone 14 baseline.
- **Bundle size:** no new dependencies.

## Done = this works

1. Pregnancy mode opens to `Timeline` tab showing today's cards with hour gutters.
2. Toggling to Hours shows the existing hour-grid view unchanged.
3. Tapping a Journey week opens a modal with development info and tips.
4. Tapping an Appts row opens a modal with prep, what to expect, questions to ask.
5. All cards use pastel tints from `tints.ts` and stickers from `logStickers.tsx` — no inline hex values.
6. Pre-pregnancy and Kids agendas are visually identical to before.
