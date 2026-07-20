# Home quick-log picker → full calendar parity

**Date:** 2026-07-19
**Status:** Approved, ready for implementation plan

## Problem

Each behavior home has a "Log for today" card whose **QuickLogPicker** ("What do
you want to track?") lets the user choose which log chips appear. But each picker
only offers a small subset of the log types the **Calendar** tab can create. A
user can't put many perfectly-valid daily signals on their home card, even though
the forms already exist.

Every missing log type **already has a built, reusable form**. This is a
*registration + routing* gap, not new-form work.

### The gap (audited across all 3 behaviors)

| Behavior | Home picker today | Calendar offers | Missing from home |
|---|---|---|---|
| **Pregnancy** | 6: mood, water, sleep, nutrition, weight, kicks | 15 | **9**: symptom, appointment, exam_result, kegel, vitamins, exercise, nesting, birth_prep, contraction |
| **Kids** | 5: sleep, mood, feeding, activity, diaper | 9 | **4**: wake_up, health, memory, exam |
| **Cycle** | 7: mood, symptoms, bbt, lh, cm, intimacy, period_start | 13 | **7**: period_end, pregnancy_test, sex_drive, clots, weight, water, activity |

Plus one **reverse gap** in Cycle: `lh` + `cm` appear on the home picker but the
Calendar's own "+" launcher (`LogActivitySheet`) can't reach them.

## Decisions (locked)

1. **Full parity** — each home picker offers EVERY calendar log type for its
   behavior. Mental model: *home picker = calendar catalog*.
2. **Include the odd ones with adapters** — `exam` (different form contract /
   separate module) and event-style logs (appointment, nesting, birth_prep,
   pregnancy_test, memory) are wired too, adding a small adapter where the form
   contract differs.
3. **Keep current small defaults** — the default-enabled set stays the current
   core per behavior; new items are available in the picker but **OFF by default**
   so the home card stays clean out of the box.
4. **Fix the cycle reverse-gap** — add `lh` + `cm` to the calendar's
   `LogActivitySheet`. (Leave the dead `OvulationForm` alone — out of scope.)

## Architecture — the crux: unify routing per behavior

The three homes route a chosen `logType` → its form **very differently** today.
Full parity requires each home to route the full type set. The clean way (and the
way that prevents this drift from recurring) is: **one shared log-router per
behavior, used by BOTH the calendar and the home** — the pattern Cycle already
uses.

| Behavior | Router today | Plan |
|---|---|---|
| **Cycle** | `components/calendar/CycleLogRouter.tsx` — standalone, already shared by home + calendar, routes all 13 types | **Nothing to refactor.** Just add catalog entries; routing is automatic. |
| **Pregnancy** | `LogFormRouter` is a *private local function* inside `PregnancyCalendar.tsx` (line 343), `{type, date, onSaved}`, NOT exported. Home hand-rolls its own `<LogSheet>` blocks via `setActiveLog`. | **Extract** it to `components/calendar/PregnancyLogRouter.tsx` (mirror `CycleLogRouter`). Calendar imports it; home replaces its hand-rolled sheets with it. |
| **Kids** | No router — 9 inline `<LogSheet visible={sheetType === …}>` blocks in `KidsCalendar.tsx` (lines 3088–3120), full type set. Home has a hardcoded union `'sleep'\|'mood'\|'feeding'\|'activity'\|'diaper'` + 5 sheets. | **Extract** to `components/calendar/KidsLogRouter.tsx`. Calendar + home both use it. |

### Router extraction contract

- **PregnancyLogRouter** — props `{ type: InlineLogType | null, date: string, onSaved: () => void, onClose: () => void }`. Body = the existing `LogFormRouter` switch, verbatim. `exam_result` keeps its existing `ExamResultForm`→`ExamForm` delegation. Calendar keeps passing what it passes today; home passes the same.
- **KidsLogRouter** — props `{ sheetType: KidsLogType | null, date: string, childId: string, onClose: () => void, onSaved: () => void, editingLog?: …, routinePrefill?: … }`. The calendar's blocks reference `editingLog` and `routinePrefill` for edit/prefill flows; these become **optional** props so the home (which passes neither) renders create-mode forms unchanged. `exam` keeps its `ExamForm` contract (childId/behavior/date/onSaved) inside the router — the adapter lives in one place.

Keeping the routers behind each home's existing `onLogMetric(logType)` contract
means the blast radius is contained: the summary cards don't change how they call
logging; only what the home *does* with the type changes.

## Per-behavior work

### Cycle (smallest)
- `lib/cycleQuickLogs.ts` — add 7 entries: `period_end`, `pregnancy_test`,
  `sex_drive`, `clots`, `weight`, `water`, `activity` (each maps to its existing
  `CycleQuickLogSheet` / form).
- `components/home/cycle/CycleQuickLogPicker.tsx` + `CycleTodaySummaryCard.tsx` —
  icon/sticker + label mapping for the new keys (chips render via the existing
  chip map; add cases).
- `components/calendar/LogActivitySheet.tsx` — add `lh` + `cm` to `LOG_ENTRIES`
  (+ `LogType`) so the calendar "+" reaches them. `CycleLogRouter` already routes
  them.
- Routing: **automatic** (CycleLogRouter already handles all types).

### Pregnancy (medium)
- `lib/pregnancyQuickLogs.ts` — add 9 entries (symptom, appointment, exam_result,
  kegel, vitamins, exercise, nesting, birth_prep, contraction). Preserve existing
  `minWeek` gating; gate any week-specific ones (e.g. contraction/nesting/
  birth_prep) with sensible `minWeek` if the calendar gates them.
- Extract `LogFormRouter` → `components/calendar/PregnancyLogRouter.tsx`; update
  `PregnancyCalendar.tsx` to import it.
- `components/home/PregnancyHome.tsx` — replace `setActiveLog`-driven hand-rolled
  `<LogSheet>` blocks with `<PregnancyLogRouter>`.
- `components/home/pregnancy/QuickLogPicker.tsx` — icon/label for new keys.

### Kids (medium)
- `lib/kidsQuickLogs.ts` — add 4 entries (wake_up, health, memory, exam) with
  their `doneTypes`.
- Extract kids calendar routing → `components/calendar/KidsLogRouter.tsx`; update
  `KidsCalendar.tsx` to use it.
- `components/home/KidsHome.tsx` — replace the hardcoded `logSheetType` union + 5
  `<LogSheet>` blocks with `<KidsLogRouter>` (widen the type it tracks to the full
  `KidsLogType`).
- `components/home/kids/KidsQuickLogPicker.tsx` — icon/label for new keys.

## Done/green state for new chips

Each summary card tints a chip green when that signal is "logged today". The
detection differs per behavior and must be extended for the new chips:

- **Kids** — `KidsQuickLogDef.doneTypes: string[]` already exists; each new entry
  declares which `child_logs.type` values mark it done (e.g. `health` →
  `['temperature','vaccine','medicine','note']` since HealthEventForm branches;
  `memory` → `['memory']`; `wake_up` → `['wake_up']`; `exam` → `['exam']`).
- **Cycle** — the card detects done by presence of a `cycle_logs` row of the
  matching `type` for the day. New chips map to their row type (e.g. `weight` →
  `weight`, `water` → `water`, `activity` → `activity`, `sex_drive` → `sex_drive`,
  `clots` → `clots`, `pregnancy_test` → `pregnancy_test`, `period_end` →
  `period_end`). Add each to the card's row-lookup so it lights green.
- **Pregnancy** — same presence-based detection against `pregnancy_logs.log_type`.
  New chips map to their log_type (symptom, exercise, vitamins, kegel,
  contraction, etc.). Event-style logs (appointment, exam_result, nesting,
  birth_prep) still light green when a matching row exists for the day; that's
  acceptable (they're "did I log this today" signals like the rest).

## i18n

Reuse existing label keys where they exist (the calendar already labels every log
type). Add picker labels only where a key is genuinely missing; no new *strings*
should be needed for types the calendar already names.

## Explicitly out of scope (YAGNI)

- **No new log forms** — all exist and are reused.
- **Dead `OvulationForm`** stays unwired.
- **No default-set changes** — new items ship OFF by default.
- **No calendar UX change** beyond adding cycle LH/CM to the launcher.
- **No redesign of the picker or summary card** — this is catalog + routing only.

## Success criteria

- Each behavior's QuickLogPicker lists every log type its Calendar can create
  (preg 15, kids 9, cycle 13).
- Enabling any new chip on the home card opens the correct, fully-functional log
  form (same form the calendar uses), writes the same row, and marks done/green.
- Cycle Calendar "+" can reach LH + CM.
- New users still see the current small default chip set (nothing enabled that
  wasn't before).
- One shared router per behavior; no divergent hand-rolled log-sheet lists between
  calendar and home.
- Typecheck clean; existing tests green.
