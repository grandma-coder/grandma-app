# Standardize the Month Calendar across all modes

**Date:** 2026-07-12
**Status:** Approved decisions, ready to execute
**Author:** Claude (Opus 4.8)

## Goal

Make the **full month grid** (today only in Cycle) the **standard default calendar
view** for pregnancy + kids too. Each day cell shows **up to 3 log-blob icons +
"+N" overflow**. A toggle collapses the month grid to the compact week strip.
Bottom-tab name already unified to "Calendar" (done, commit 7d27cdf).

## Approved decisions

1. **Day cell** → up to 3 Character-blob icons + "+N" overflow chip.
2. **View switch** → month grid is default; toggle collapses to week strip + timeline.
3. **Architecture** → one shared generic month grid.

## Key finding: the generic grid already exists

`DiffuseDotCalendar` (`components/ui/diffuse/DiffusePrimitives.tsx`) is already a
mode-agnostic Mon-first month grid with:
- `dayField(date) → {color, intensity}` — soft per-day bloom (additive, optional)
- `dayMarker(date) → ReactNode` — a per-day marker node (additive, optional)
- selected ring + bloom, month nav (`onMonthChange`), period dots, muted
  leading/trailing days.

Cycle already drives it via `CycleMonthGrid`. **We don't need a new grid — we
need per-mode data adapters that feed `dayMarker` a multi-icon row.**

## Plan

### Step 1 — extend `dayMarker` usage (no primitive change needed)
`dayMarker` returns a `ReactNode`, so a caller can already return a small row of
blobs + "+N". Verify the cell has vertical room for a 2-icon row under the number
(currently sized for one 11px glyph). If cramped, add an optional
`markerSlotHeight` prop to `DiffuseDotCalendar` (additive) — otherwise leave it.

### Step 2 — shared `LogMonthGrid` wrapper (new file)
`components/calendar/LogMonthGrid.tsx` — a mode-agnostic wrapper around
`DiffuseDotCalendar`:
- Props: `selectedDate`, `visibleMonth`, `onSelectDate`, `onPrev/NextMonth`,
  `logsByDate: Map<string, LogChip[]>` where `LogChip = { type, color, char }`,
  optional `dayField` (for pregnancy week-band / kids nothing).
- Renders `dayMarker(date)` = up to 3 `<Character size={9} />` blobs from that
  day's chips + a `+N` mono text when `chips.length > 3`.
- A small legend row is optional per mode (cycle keeps its phase legend in
  `CycleMonthGrid`; kids/pregnancy can omit or show a light one).

### Step 3 — per-mode log adapters
Each calendar builds `logsByDate` from its existing month-range query:
- **Kids**: `child_logs` for the visible month → map each row's `type` →
  `{color: PILLAR/log color, char: DIFFUSE_LOG_CHARACTER[type]}` (reuse the
  existing map from `DiffuseLogTimeline`).
- **Pregnancy**: `pregnancy_logs` → same shape via the same character map.
- Dedupe by type per day (so 5 feedings show one `feeding` blob, not five),
  ordered by a stable priority so the "top 3" are meaningful.

### Step 4 — view toggle (month ⇆ week) in kids + pregnancy
- Add `calView: 'month' | 'week'` state, **default `'month'`**.
- Month view → `<LogMonthGrid/>` (+ the day's timeline list below it, like cycle).
- Week view → the existing `AgendaWeekStrip` + timeline (current behavior).
- Toggle affordance: tapping the month/title header, or a small Month/Week chip
  in the header. Persist per session (not across app kills — ephemeral state ok).

### Step 5 — Cycle
Cycle already IS the month grid. Optionally refactor `CycleMonthGrid` to sit on
`LogMonthGrid` for consistency, but LOW priority — it works and the phase
legend/bloom is cycle-specific. Defer unless it drifts.

## Sequencing
1. Step 2 (LogMonthGrid) + Step 1 check — the reusable core.
2. Step 3+4 for **Kids first** (most logs/day → best test of the +N overflow).
3. Then Pregnancy.
4. Cycle refactor deferred.

## Risks / notes
- Kids/Pregnancy calendars are 4875 / 3143 lines and under active concurrent
  edits — touch by explicit path, commit each step, keep the `!diffuse` path
  untouched (these screens' week/timeline already work in cream-paper).
- The month grid is Diffuse-only (Diffuse is now default); the cream-paper path
  keeps the week strip. No need to build a cream month grid.
- Perf: one month-range query per calendar (already done for the week dots);
  dedupe-by-type keeps the icon count ≤ pillar count.

---
*Grounded in code as of 2026-07-12.*
